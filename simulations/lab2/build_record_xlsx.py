#!/usr/bin/env python3
"""產生實驗課當天用的資料記錄簿 measured/Lab2-數據記錄.xlsx。

預報欄直接讀 LTspice 的 .raw，所以和筆記裡的數字同源；改了網表重跑本腳本即可。
黃底 = 當天要填的格子，其他欄位都是公式或預報值，填完數據圖就會自己更新。

用法：cd simulations/lab2 && ../lab1/.venv/bin/python build_record_xlsx.py   # 檔案已存在時不覆蓋，加 --force 才重產
"""
import os
import sys

import numpy as np
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference, ScatterChart, Series
from openpyxl.chart.marker import Marker
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', 'tools')))
from ltraw import read_raw  # noqa: E402

OUT = os.path.join(HERE, 'measured', 'Lab2-數據記錄.xlsx')

FONT = 'Arial'
FILL_IN = PatternFill('solid', fgColor='FFF2CC')     # 當天要填
FILL_HD = PatternFill('solid', fgColor='D9E2F3')     # 表頭
FILL_GP = PatternFill('solid', fgColor='EDF1F9')     # 欄組標題
BLUE = Font(name=FONT, color='0000FF')               # 寫死的輸入（模擬值／講義值）
BLACK = Font(name=FONT)
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
NOTE = Font(name=FONT, size=9, color='808080')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MARK = '1F4E79'   # 實測點的顏色；點要明確給填色與邊線，否則 LibreOffice 重算存檔會把它寫成 noFill 而隱形

VBBS = [1.5, 2.0, 2.2, 2.4]
VCCS = [round(0.5 * k, 1) for k in range(0, 31)]     # 0、0.5、1 … 15 V（助教投影片的級距）
RC = 1000.0
R1, R2 = 10000.0, 4700.0


def dot_series(ys, xs, title):
    """只畫點、不畫線的實測序列。"""
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol='circle', size=7)
    s.marker.graphicalProperties.solidFill = MARK
    s.marker.graphicalProperties.line.solidFill = MARK
    s.graphicalProperties.line.noFill = True
    return s


def line_series(ys, xs, title):
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol='none')
    return s


def head(ws, row, labels, widths=None, height=30):
    for i, t in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=t)
        c.font = BOLD
        c.fill = FILL_HD
        c.border = BOX
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = height


def put(ws, row, col, value, *, font=BLACK, fill=None, fmt=None):
    c = ws.cell(row=row, column=col, value=value)
    c.font = font
    c.border = BOX
    if fill:
        c.fill = fill
    if fmt:
        c.number_format = fmt
    return c


def title_block(ws, title, subtitle, span):
    ws['A1'] = title
    ws['A1'].font = TITLE
    ws['A2'] = subtitle
    ws['A2'].font = NOTE
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=span)


def checklist(ws, row, items, col=1):
    """當天拍照檢查表：每個實驗一張，放在該工作表的資料區下方。回傳下一個空列。"""
    c = ws.cell(row=row, column=col, value='當天拍照檢查表（離開實驗室前逐項打勾）')
    c.font = BOLD
    row += 1
    for i, t in enumerate(['要留的證據', '打勾', '備註'], start=col):
        h = ws.cell(row=row, column=i, value=t)
        h.font = BOLD
        h.fill = FILL_HD
        h.border = BOX
        h.alignment = Alignment(horizontal='center', vertical='center')
    row += 1
    for label, memo in items:
        put(ws, row, col, label)
        put(ws, row, col + 1, None, fill=FILL_IN)
        put(ws, row, col + 2, memo, font=NOTE)
        row += 1
    return row


# ── 讀 LTspice 預報值 ────────────────────────────────────────────────────────
def op_vals(fname):
    """.op（可含 .step）的 raw：回傳每個 step 一個 dict。"""
    _, st = read_raw(os.path.join(HERE, fname))
    s = st[0]
    n = len(np.atleast_1d(s['V(b)']))
    return [{k: float(np.atleast_1d(v)[i]) for k, v in s.items()} for i in range(n)]


# 實驗一：四條 VBB 曲線，取助教級距上的 IC 與 VCE
_, CURVES = read_raw(os.path.join(HERE, 'lab2-exp1-curves.raw'))
EXP1 = []
for s in CURVES:
    vcc_axis = s['VCC']
    EXP1.append({
        'ic': [float(np.interp(v, vcc_axis, s['I(RC)'])) * 1e3 for v in VCCS],
        'vce': [float(np.interp(v, vcc_axis, s['V(c)'])) for v in VCCS],
        'vbe': float(np.interp(15.0, vcc_axis, s['V(b)'])),
    })

# 實驗二：VBB = VCC = 15 V 的工作點
E2 = op_vals('lab2-exp2-op.raw')[0]
E2 = {
    'i_r1': E2['I(R1)'] * 1e3, 'i_r2': E2['I(R2)'] * 1e3, 'ib': E2['Ib(Q1)'] * 1e3,
    'ic': E2['Ic(Q1)'] * 1e3, 'vbe': E2['V(b)'], 'vce': E2['V(c)'],
}
E2['beta'] = E2['ic'] / E2['ib']

# 第二部分：CE 放大器的工作點（RC1 100 Ω／1 kΩ）與四組增益
CEOP = op_vals('lab2-exp3-ce-amp-op.raw')
CEOP = [{'vb': d['V(b)'], 've': d['V(e)'], 'vc': d['V(c)'], 'vce': d['V(c)'] - d['V(e)'],
         'ic': d['Ic(Q1)'] * 1e3, 'ib': d['Ib(Q1)'] * 1e6} for d in CEOP]

_, CESTEPS = read_raw(os.path.join(HERE, 'lab2-exp3-ce-amp.raw'))
CE_LABELS = ['RC1 100 Ω、有 C3', 'RC1 1 kΩ、有 C3', 'RC1 100 Ω、無 C3', 'RC1 1 kΩ、無 C3']
CE_GAIN = []
for s in CESTEPS:
    t = s['time'] - s['time'].min()
    m = t >= 100e-6
    pp = lambda x: float(x[m].max() - x[m].min())  # noqa: E731
    CE_GAIN.append(pp(s['V(out)']) / pp(s['V(s)']))

# Bonus：穩健版定案設計
_, BN = read_raw(os.path.join(HERE, 'lab2-bonus-degen.raw'))
s = BN[0]
t = s['time'] - s['time'].min()
m = t >= t.max() - 3e-4
BONUS_AV = float((s['V(out)'][m].max() - s['V(out)'][m].min()) / (s['V(s)'][m].max() - s['V(s)'][m].min()))
BONUS_OP = op_vals('lab2-bonus-degen-op.raw')[0]

wb = Workbook()

# ── 說明 ────────────────────────────────────────────────────────────────────
ws = wb.active
ws.title = '說明'
title_block(ws, 'Lab 2 BJT 實驗　數據記錄簿',
            '電子學實作系列第 6 週．App_Lab2.pdf．兩個部分三張記錄表．當天用筆電直接填', 6)
rows = [
    ('怎麼用', ''),
    ('1', '每個實驗一張工作表，只要填**黃底**的格子，其他欄位都是公式或預報值，不要覆蓋。'),
    ('2', '填一列，右邊的計算欄與下面的圖就會跟著更新；不必等全部填完才看得到對照。'),
    ('3', '藍色字是寫死的輸入：講義規格或 LTspice 模擬結果。黑色字是公式。'),
    ('4', '實驗一要量四組 VBB × 31 個 VCC；時間不夠時先把 2.2 V 與 2.4 V 兩組量完，'),
    ('', '　　這兩組才看得出主動區的平坦段，1.5 V 那組全程截止、量五點確認就好。'),
    ('5', 'I_C 一律由集極電阻的壓降換算（I_C = V_RC / R_C）——講義第 8 頁與第 9 頁都是這樣要求的，'),
    ('', '　　兩個實驗都不必把電流表串進集極迴路，三用電表全程留在電壓檔。'),
    ('6', '離開實驗室前跑一次每張工作表下方的「當天拍照檢查表」。'),
    ('', ''),
    ('填寫範例（實驗一，VBB = 2.4 V）', ''),
]
r = 4
for a, b in rows:
    ws.cell(row=r, column=1, value=a).font = BOLD if a.startswith(('怎麼用', '填寫範例')) else BLACK
    ws.cell(row=r, column=2, value=b).font = BLACK
    r += 1
head(ws, r, ['V_CC (V)', '實測 V_CE (V)', '實測 V_RC (V)', '→ I_C (mA)', 'LTspice I_C (mA)', '→ 差異 (%)'],
     widths=[14, 16, 16, 14, 18, 14])
put(ws, r + 1, 1, 10.0, font=BLUE, fmt='0.0')
put(ws, r + 1, 2, 2.33, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 3, 7.67, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 4, 7.67, fmt='0.000')
put(ws, r + 1, 5, round(EXP1[3]['ic'][20], 3), font=BLUE, fmt='0.000')
put(ws, r + 1, 6, 0.58, fmt='0.0%')
ws.cell(row=r + 2, column=1,
        value='↑ 這一列只是示範格式（Tinkercad 在 VBB 2.4 V／VCC 10 V 讀到 2.33 V 與 7.67 mA 就這樣填），'
              '正式表裡沒有這一列。').font = NOTE
ws.cell(row=r + 4, column=1, value='資料來源').font = BOLD
ws.cell(row=r + 5, column=1,
        value='預報欄由 simulations/lab2/*.raw（LTspice，內建 2N2222 模型）以 build_record_xlsx.py 產生；'
              '量測級距出自助教的「Lab 2 實驗量測項目」投影片。').font = NOTE
ws.sheet_view.showGridLines = False

# ── 實驗一：輸出特性曲線 ────────────────────────────────────────────────────
ws = wb.create_sheet('實驗一 特性曲線')
title_block(ws, '實驗一：BJT 偏壓與輸出特性曲線（BJT Biasing & Characteristic Curve）',
            '講義第 7–8 頁 Table 1：四組 V_BB，各自把 V_CC 從 0 掃到 15 V，記 V_CE 與 I_C', 17)
ws['A4'] = '集極電阻 R_C (Ω)'
ws['A4'].font = BOLD
put(ws, 4, 2, RC, font=BLUE, fmt='0')
ws['C4'] = '← 講義指定 1 kΩ；改這一格，所有 I_C 計算欄會跟著變'
ws['C4'].font = NOTE

# 每組 VBB 先記一次 V_BE 與 ON/OFF
ws['E4'] = '各組的預報值（實測 V_BE 與 ON/OFF 填在下面各組的標題列，比照講義 Table 1）'
ws['E4'].font = BOLD
head(ws, 5, [''] * 4 + ['V_BB (V)', 'LTspice V_BE (V)', 'LTspice I_C @ 15 V (mA)', 'ON/OFF（預期）'], height=20)
for k, vbb in enumerate(VBBS):
    r = 6 + k
    put(ws, r, 5, vbb, font=BLUE, fmt='0.0')
    put(ws, r, 6, round(EXP1[k]['vbe'], 3), font=BLUE, fmt='0.000')
    put(ws, r, 7, round(EXP1[k]['ic'][-1], 3), font=BLUE, fmt='0.000')
    put(ws, r, 8, 'OFF' if EXP1[k]['ic'][-1] < 0.01 else 'ON', font=BLUE)

HROW = 11
for k, vbb in enumerate(VBBS):
    base = 2 + 5 * k
    c = ws.cell(row=HROW, column=base, value=f'V_BB = {vbb} V　V_BE =')
    c.font = BOLD
    c.fill = FILL_GP
    c.alignment = Alignment(horizontal='center')
    ws.merge_cells(start_row=HROW, start_column=base, end_row=HROW, end_column=base + 2)
    put(ws, HROW, base + 3, None, fill=FILL_IN, fmt='0.000')          # 實測 V_BE
    put(ws, HROW, base + 4, None, fill=FILL_IN)                       # ON / OFF
    ws.cell(row=HROW, column=base + 4).alignment = Alignment(horizontal='center')
    for j in range(5):
        ws.cell(row=HROW, column=base + j).border = BOX
head(ws, HROW + 1,
     ['V_CC (V)'] + ['實測 V_CE (V)', '實測 V_RC (V)', 'I_C = V_RC/R_C (mA)',
                     'LTspice V_CE (V)', 'LTspice I_C (mA)'] * 4,
     widths=[10] + [13, 13, 15, 15, 15] * 4, height=34)
R0 = HROW + 2
for i, vcc in enumerate(VCCS):
    r = R0 + i
    put(ws, r, 1, vcc, font=BLUE, fmt='0.0')
    for k in range(4):
        base = 2 + 5 * k
        cl = get_column_letter(base + 1)
        put(ws, r, base, None, fill=FILL_IN, fmt='0.000')
        put(ws, r, base + 1, None, fill=FILL_IN, fmt='0.000')
        cv = get_column_letter(base)        # 實測 V_CE
        put(ws, r, base + 2,
            f'=IF({cl}{r}<>"",{cl}{r}/$B$4*1000,'
            f'IF({cv}{r}<>"",($A{r}-{cv}{r})/$B$4*1000,""))', fmt='0.000')
        put(ws, r, base + 3, round(EXP1[k]['vce'][i], 4), font=BLUE, fmt='0.000')
        put(ws, r, base + 4, round(EXP1[k]['ic'][i], 4), font=BLUE, fmt='0.000')
RN = R0 + len(VCCS) - 1
ws.cell(row=HROW - 1, column=2,
        value='↓ 各組標題列右邊兩個黃格：左邊填該組量到的 V_BE、右邊填 ON 或 OFF（對應講義 Table 1 的區塊標題）').font = NOTE
ws.cell(row=RN + 2, column=1,
        value='I_C 的分子必須是「集極電阻兩端的壓降」V_RC，不是集極對地電位。'
              '本電路射極接地，所以 V_CE 就是集極對地電位，兩者的關係是 V_RC = V_CC − V_CE。').font = NOTE
ws.cell(row=RN + 3, column=1,
        value='因此兩欄只要量一欄就夠：I_C 欄會優先用 V_RC；沒填 V_RC 時自動改用 (V_CC − V_CE) / R_C。'
              '兩欄都量的好處是可以當場對帳——V_CE + V_RC 應該等於 V_CC，對不起來就是有一次量錯了。').font = NOTE
nxt = checklist(ws, RN + 5, [
    ('麵包板全景照 1 張', '看得出 R1／R2／RC 各插在第幾欄、電晶體三腳的 E／B／C 方向'),
    ('電表接線特寫 1 張', '左表跨 B-E、中表跨 C-E、右表串在 VCC 與 RC 之間'),
    ('兩台電源面板各 1 張', 'V_BB 與 V_CC 的設定值要和記錄表對得上'),
    ('四組 V_BB 的 V_BE 都記到', '導通後 V_BE 幾乎不動，沒記到就無法回答「ON/OFF 怎麼判定」'),
    ('特性曲線當場畫一次', '四條線要看得出平坦的主動區；不平坦代表還沒離開飽和區'),
])

ch = ScatterChart()
ch.title = '實驗一：輸出特性曲線 I_C–V_CE（實測 vs LTspice）'
ch.style = 2
ch.x_axis.title = 'V_CE (V)'
ch.y_axis.title = 'I_C (mA)'
ch.height, ch.width = 11, 20
for k, vbb in enumerate(VBBS):
    base = 2 + 5 * k
    ch.series.append(dot_series(Reference(ws, min_col=base + 2, min_row=R0, max_row=RN),
                                Reference(ws, min_col=base, min_row=R0, max_row=RN), f'實測 {vbb} V'))
for k, vbb in enumerate(VBBS):
    base = 2 + 5 * k
    ch.series.append(line_series(Reference(ws, min_col=base + 4, min_row=R0, max_row=RN),
                                 Reference(ws, min_col=base + 3, min_row=R0, max_row=RN),
                                 f'LTspice {vbb} V'))
ws.add_chart(ch, f'{get_column_letter(23)}{HROW}')

# ── 實驗二：電流增益 β ──────────────────────────────────────────────────────
ws = wb.create_sheet('實驗二 beta')
title_block(ws, '實驗二：電流增益 β 的量測（Table 2）',
            '講義第 9–10 頁：V_BB = V_CC = 15 V，量 R1／R2 壓降求 I_B（KCL），量 R_C 壓降求 I_C', 7)
ws['A3'] = '電源設定值'
ws['A3'].font = BOLD
for j, (lab, v) in enumerate((('V_BB (V)', 15), ('V_CC (V)', 15))):
    put(ws, 3, 2 + j * 2, lab)
    put(ws, 3, 3 + j * 2, v, fill=FILL_IN, fmt='0.00')
ws['A4'] = '電阻實測值 (Ω)'
ws['A4'].font = BOLD
for j, (lab, v) in enumerate((('R1', R1), ('R2', R2), ('R_C', RC))):
    put(ws, 4, 2 + j * 2, lab)
    put(ws, 4, 3 + j * 2, v, fill=FILL_IN, fmt='0')
ws.cell(row=5, column=1,
        value='↑ 這五格是助教在 Table 2 旁邊特別要求記錄的（V_BB、V_CC、R_C、R1、R2）。'
              '電阻先填的是標稱值，開工前用三用電表各量一次改成實測值——±5% 的色環電阻常差到幾百歐姆，'
              '下面所有電流與 β 都是用這三格算的。').font = NOTE

head(ws, 6, ['量測項目', '實測', '單位', '算式', 'LTspice 預報', '差異 (%)', '備註'],
     widths=[26, 14, 10, 30, 16, 12, 34])
items = [
    ('R1 兩端壓降 V_R1', 'V', None, round(15 - E2['vbe'], 3), '量 V_BB 對基極'),
    ('R2 兩端壓降 V_R2', 'V', None, round(E2['vbe'], 3), '等於 V_BE（R2 與 B-E 並聯）'),
    ('R_C 兩端壓降 V_RC', 'V', None, round(15 - E2['vce'], 3), '量 V_CC 對集極'),
    ('V_CE', 'V', None, round(E2['vce'], 3),
     '直接量集極對地，不要用 V_CC − V_RC 相減（兩個 15 V 量級的數相減，誤差會和待測值同級）'),
    ('I_R1 = V_R1 / R1', 'mA', '=IF(B7="","",B7/$C$4*1000)', round(E2['i_r1'], 3), '流進基極節點的總電流'),
    ('I_R2 = V_R2 / R2', 'mA', '=IF(B8="","",B8/$E$4*1000)', round(E2['i_r2'], 3), '被 R2 分掉、沒進基極的那一份'),
    ('I_B = I_R1 − I_R2', 'mA', '=IF(OR(B7="",B8=""),"",B11-B12)', round(E2['ib'], 3), 'KCL：講義第 9 頁第 3 步'),
    ('I_C = V_RC / R_C', 'mA', '=IF(B9="","",B9/$G$4*1000)', round(E2['ic'], 3), '不必串電流表就能得到'),
    ('β_calculate = I_C / I_B', '—', '=IF(OR(B13="",B13=0,B14=""),"",B14/B13)', round(E2['beta'], 2),
     '這是「強迫 β」，飽和時遠小於真正的 β'),
    ('β_measure（三用電表 hFE 檔）', '—', None, None,
     '助教把 Table 2 的 β_Meas 欄劃掉了，這格不抄進 Table 2，但仍要量——它是問題 1 的證據'),
]
r = 7
for label, unit, formula, lt, memo in items:
    put(ws, r, 1, label)
    if formula:
        put(ws, r, 2, formula, fmt='0.000')
    else:
        put(ws, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 3, unit)
    put(ws, r, 4, formula if formula else '', font=NOTE)
    put(ws, r, 5, lt, font=BLUE, fmt='0.000')
    put(ws, r, 6, f'=IF(OR(B{r}="",E{r}="",E{r}=0),"",(B{r}-E{r})/E{r})', fmt='0.0%')
    put(ws, r, 7, memo, font=NOTE)
    r += 1
ws.cell(row=r + 1, column=1,
        value='β_calculate 與 β_measure 差很多是正常的，原因就是講義問題 1 的答案：'
              '這個偏壓把電晶體推進飽和區，I_C 被 R_C 限制住，不再等於 β × I_B。').font = NOTE
ROW_IR1, ROW_BETA = 11, 15          # items 由 r=7 起算：11–14 是四個電流、15 是 β_calculate
ch = BarChart()
ch.type, ch.style = 'col', 10
ch.title = '實驗二：四個電流的實測 vs LTspice 預報'
ch.y_axis.title = '電流 (mA)'
ch.height, ch.width = 9, 17
ch.add_data(Reference(ws, min_col=2, min_row=ROW_IR1, max_row=ROW_IR1 + 3), titles_from_data=False)
ch.add_data(Reference(ws, min_col=5, min_row=ROW_IR1, max_row=ROW_IR1 + 3), titles_from_data=False)
ch.set_categories(Reference(ws, min_col=1, min_row=ROW_IR1, max_row=ROW_IR1 + 3))
ch.series[0].tx = None
ws.add_chart(ch, 'I6')

ch = BarChart()
ch.type, ch.style = 'col', 10
ch.title = 'β：板子上算出來的 vs 電表 hFE 檔量到的'
ch.y_axis.title = 'β'
ch.height, ch.width = 9, 17
ch.add_data(Reference(ws, min_col=2, min_row=ROW_BETA, max_row=ROW_BETA + 1), titles_from_data=False)
ch.set_categories(Reference(ws, min_col=1, min_row=ROW_BETA, max_row=ROW_BETA + 1))
ws.add_chart(ch, 'I25')

checklist(ws, r + 3, [
    ('四個壓降都量到', 'V_R1、V_R2、V_RC、V_CE（V_CE 要直接量，不要相減）'),
    ('五個設定值都記下', 'V_BB、V_CC 與 R1／R2／R_C 的實測值，助教要求'),
    ('Table 2 三欄填完', '講義 Table 2 只要 I_B、I_C、β_calculate（β_Meas 已被助教劃掉）'),
    ('電晶體 hFE 讀值照片 1 張', '拔下來插 hFE 座量到的 β，寫自己的記錄表、不抄進 Table 2'),
    ('飽和的證據 1 張', 'V_CE 只剩幾十 mV 的電表畫面'),
])

# ── 第二部分：CE 放大器 ─────────────────────────────────────────────────────
ws = wb.create_sheet('第二部分 CE 放大器')
title_block(ws, '第二部分：共射放大器的電壓增益（Common Emitter Amplifier）',
            '講義第 16–22 頁：V_CC 12 V、輸入 10 kHz／100 mVpp，量直流工作點與四種組合的增益', 7)

ws['A4'] = '一、直流工作點（訊號源先關掉，用三用電表量）'
ws['A4'].font = BOLD
head(ws, 5, ['節點', '實測 (V)', 'LTspice R_C1 = 100 Ω', 'LTspice R_C1 = 1 kΩ', '差異 (%)', '備註', ''],
     widths=[22, 14, 22, 22, 12, 40, 10])
dc_rows = [('V_B（基極對地）', 'vb', '分壓器給的 6 V 附近'),
           ('V_E（射極對地）', 've', '約 V_B − 0.7'),
           ('V_C（集極對地）', 'vc', 'R_C1 越大這裡越低'),
           ('V_CE = V_C − V_E', 'vce', '小於 1 V 就代表快飽和，訊號會削波')]
r = 6
for label, key, memo in dc_rows:
    put(ws, r, 1, label)
    put(ws, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 3, round(CEOP[0][key], 3), font=BLUE, fmt='0.000')
    put(ws, r, 4, round(CEOP[1][key], 3), font=BLUE, fmt='0.000')
    put(ws, r, 5, f'=IF(OR(B{r}="",C{r}=0),"",(B{r}-C{r})/C{r})', fmt='0.0%')
    put(ws, r, 6, memo, font=NOTE)
    r += 1
put(ws, r, 1, 'I_C = (V_CC − V_C) / R_C1')
put(ws, r, 2, '=IF(B8="","",(12-B8)/100*1000)', fmt='0.000')
put(ws, r, 3, round(CEOP[0]['ic'], 3), font=BLUE, fmt='0.000')
put(ws, r, 4, round(CEOP[1]['ic'], 3), font=BLUE, fmt='0.000')
put(ws, r, 5, None)
put(ws, r, 6, '單位 mA；式子裡的 100 要跟著實際用的 R_C1 改', font=NOTE)

r += 2
ws.cell(row=r, column=1, value='二、電壓增益（示波器雙通道：CH1 接 V_s、CH2 接 V_out）').font = BOLD
r += 1
head(ws, r, ['組合', '實測 V_s (mVpp)', '實測 V_out (mVpp)', '|A_v| = V_out / V_s', 'LTspice |A_v|',
             '差異 (%)', '波形有沒有削平／反相？'],
     widths=[22, 18, 18, 18, 16, 12, 30])
r += 1
first = r
for k, lab in enumerate(CE_LABELS):
    put(ws, r, 1, lab)
    put(ws, r, 2, None, fill=FILL_IN, fmt='0.0')
    put(ws, r, 3, None, fill=FILL_IN, fmt='0.0')
    put(ws, r, 4, f'=IF(OR(B{r}="",B{r}=0,C{r}=""),"",C{r}/B{r})', fmt='0.00')
    put(ws, r, 5, round(CE_GAIN[k], 2), font=BLUE, fmt='0.00')
    put(ws, r, 6, f'=IF(OR(D{r}="",E{r}=0),"",(D{r}-E{r})/E{r})', fmt='0.0%')
    put(ws, r, 7, None, fill=FILL_IN)
    r += 1
gain_first, gain_last = first, r - 1
ch = BarChart()
ch.type, ch.style = 'col', 10
ch.title = '第二部分：四種組合的電壓增益（實測 vs LTspice）'
ch.y_axis.title = '|A_v|'
ch.height, ch.width = 9, 19
ch.add_data(Reference(ws, min_col=4, min_row=gain_first, max_row=gain_last), titles_from_data=False)
ch.add_data(Reference(ws, min_col=5, min_row=gain_first, max_row=gain_last), titles_from_data=False)
ch.set_categories(Reference(ws, min_col=1, min_row=gain_first, max_row=gain_last))
ws.add_chart(ch, 'I12')

ws.cell(row=r, column=1,
        value='四種組合都量，講義問題 1（拿掉 C3）與問題 3（R_C1 換 1 kΩ）的答案就直接讀得出來。'
              'R_C1 = 1 kΩ 那兩列特別注意輸出有沒有一邊被削平。').font = NOTE

r += 2
ws.cell(row=r, column=1, value=f'三、Bonus：把增益設計成 A_v = 20（LTspice 驗證 {BONUS_AV:.1f}）').font = BOLD
r += 1
head(ws, r, ['元件', '定案值', '為什麼', '實測 (V 或 mVpp)', 'LTspice', '', ''],
     widths=[22, 16, 46, 20, 16, 10, 10])
r += 1
bonus_rows = [
    ('R_C1', '620 Ω', '增益正比於集極端總電阻；620 Ω 剛好把 |A_v| 拉到 20', None, None),
    ('R_E1a（不旁路）', '22 Ω', '留一小段不被旁路，增益改由電阻比決定，對 β 與溫度不敏感', None, None),
    ('R_E1b（被旁路）', '1 kΩ', '直流偏壓照舊由它決定，工作點不動', None, None),
    ('C3', '100 µF', '10 kHz 時容抗 0.16 Ω，遠小於 R_E1a，才算真的旁路掉', None, None),
    ('C1、C2', '1 µF', '耦合電容維持講義原值即可，截止頻率遠低於 10 kHz', None, None),
    ('V_B / V_E / V_C', '—', '工作點', None,
     f"{BONUS_OP['V(b)']:.2f} / {BONUS_OP['V(e)']:.2f} / {BONUS_OP['V(c)']:.2f} V"),
    ('實測 |A_v|', '—', '目標 20，±10% 以內都算達標', None, round(BONUS_AV, 2)),
]
for label, val, why, meas, lt in bonus_rows:
    put(ws, r, 1, label)
    put(ws, r, 2, val, font=BLUE)
    put(ws, r, 3, why, font=NOTE)
    put(ws, r, 4, meas, fill=FILL_IN)
    put(ws, r, 5, lt, font=BLUE)
    r += 1
ws.cell(row=r, column=1,
        value='只把 C3 加大是不夠的：R_C1 = 100 Ω 時無論 C3 多大，|A_v| 最多只到 16.6。'
              '詳見筆記「Bonus：把增益設計成 20」一節。').font = NOTE

checklist(ws, r + 2, [
    ('示波器雙軌畫面 4 張', '四種組合各一張，CH1／CH2 同時入鏡才看得出反相'),
    ('削波的那張要放大', 'R_C1 = 1 kΩ 的輸出，削平的一邊要看得清楚'),
    ('直流工作點電表照片 1 張', 'V_B、V_E、V_C 三個讀值'),
    ('Bonus 電路的接線照與波形各 1 張', '元件值改了要拍，結報要對照'),
])

# ── 交報告用：完全照講義 Table 1 的版面 ─────────────────────────────────────
# 講義只要 5 列，主表是助教級距的 31 列。這張用 INDEX/MATCH 從主表抓，
# 改 H 欄的取樣點就整張跟著變，抄進報告時不必再挑數字。
ws = wb.create_sheet('交報告用 Table 1')
title_block(ws, 'Table 1（交報告用版面）',
            '欄位與版面照 App_Lab2.pdf 第 8 頁；數值自動從「實驗一 特性曲線」工作表抓，不要直接在這裡填', 6)
SRC = "'實驗一 特性曲線'"
MAIN_R0, MAIN_RN = R0, RN
SAMPLES = [1, 2, 5, 10, 15]

ws['H5'] = '取樣的 V_CC (V)'
ws['H5'].font = BOLD
ws['H5'].fill = FILL_HD
ws['H5'].border = BOX
ws.column_dimensions['H'].width = 16
for i, v in enumerate(SAMPLES):
    put(ws, 6 + i, 8, v, font=BLUE, fmt='0.0')
ws.cell(row=11, column=8, value='↑ 想換成別的 V_CC 就改這五格').font = NOTE

for k, vbb in enumerate(VBBS):
    col = 1 + 3 * (k % 2)                      # 左區塊 A–B、右區塊 D–E
    top = 5 + 9 * (k // 2)
    base = 2 + 5 * k                           # 主表該組的第一欄
    vce_col = get_column_letter(base)
    ic_col = get_column_letter(base + 2)
    vbe_cell = f'{get_column_letter(base + 3)}${HROW}'
    onoff_cell = f'{get_column_letter(base + 4)}${HROW}'
    c = ws.cell(row=top, column=col,
                value=f'="V_BB = {vbb} V 、 V_BE = "&IF({SRC}!{vbe_cell}="","____",'
                      f'TEXT({SRC}!{vbe_cell},"0.000"))&" V 、 "&IF({SRC}!{onoff_cell}="","ON/OFF",'
                      f'{SRC}!{onoff_cell})')
    c.font = Font(name=FONT, bold=True, color='FFFFFF')
    c.fill = PatternFill('solid', fgColor='3C7FB1')
    c.alignment = Alignment(horizontal='center', vertical='center')
    c.border = BOX
    ws.merge_cells(start_row=top, start_column=col, end_row=top, end_column=col + 1)
    ws.cell(row=top, column=col + 1).border = BOX
    head_cells = ['V_CE (experimental setting)', 'I_C (measure)  ( = V_C / R_C )']
    for j, t in enumerate(head_cells):
        h = ws.cell(row=top + 1, column=col + j, value=t)
        h.font = BOLD
        h.fill = FILL_HD
        h.border = BOX
        h.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        ws.column_dimensions[get_column_letter(col + j)].width = 30
    ws.row_dimensions[top + 1].height = 30
    for i in range(len(SAMPLES)):
        r = top + 2 + i
        m = f'MATCH($H${6 + i},{SRC}!$A${MAIN_R0}:$A${MAIN_RN},0)'
        put(ws, r, col,
            f'=IFERROR(INDEX({SRC}!${vce_col}${MAIN_R0}:${vce_col}${MAIN_RN},{m}),"")', fmt='0.000')
        put(ws, r, col + 1,
            f'=IFERROR(INDEX({SRC}!${ic_col}${MAIN_R0}:${ic_col}${MAIN_RN},{m}),"")', fmt='0.000')

ws.cell(row=23, column=1,
        value='I_C 的單位是 mA（講義表頭寫 A，抄進報告時記得換算或標註單位）。').font = NOTE
ws.cell(row=24, column=1,
        value='區塊標題的 V_BE 與 ON/OFF 會跟著「實驗一 特性曲線」各組標題列的黃格自動帶過來。').font = NOTE
ws.sheet_view.showGridLines = False
wb.move_sheet('交報告用 Table 1', offset=-2)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if os.path.exists(OUT) and '--force' not in sys.argv:
    # 作者會直接在這個檔裡填數據、調格式，所以預設不覆蓋；要重產範本加 --force。
    sys.exit(f'{OUT} 已存在，未覆蓋（裡面可能有作者填的數據與格式）。確定要重產請加 --force。')
wb.save(OUT)
print('wrote', OUT)
