#!/usr/bin/env python3
"""產生實驗課當天用的資料記錄簿 measured/Lab3-數據記錄.xlsx。

講義的五個量測都有一張表：第一部分的實驗一～四（特性曲線、轉移曲線、導通電阻、
LED 開關）與第二部分的共源級放大器，另附一張照講義版面排好、可直接貼進報告的
「交報告用」分頁。助教公告（11/7 六）當天至少要做完實驗一與實驗二，其餘行有餘力
再做——這只寫在「說明」與各表標題，表格本身全部都給。版面比照 Lab 2 的記錄簿：
說明頁有編號步驟、填寫範例與資料來源；每張表有相對偏差欄、凍結窗格與當天拍照檢查表。

預報欄的來源：
- 實驗一、二：直接讀 LTspice 的 .raw；.raw 不在時（.raw 不進版控）改讀 ltspice-pred.json。
- 實驗三～第二部分：讀 ltspice-pred.json（抄自對應網表的模擬結果，與筆記同源）。
讀到 .raw 時會順手把實驗一、二的數字寫回 ltspice-pred.json。

黃底 = 當天要填的格子，其他欄位都是公式或預報值，填完數據圖就會自己更新。

用法：cd simulations/lab3 && uv run --with openpyxl --with numpy python build_record_xlsx.py
      （檔案已存在時不覆蓋，加 --force 才重產）
"""
import json
import os
import sys

from openpyxl import Workbook
from openpyxl.chart import Reference, ScatterChart, Series
from openpyxl.chart.marker import Marker
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'measured', 'Lab3-數據記錄.xlsx')
PRED_JSON = os.path.join(HERE, 'ltspice-pred.json')

FONT = 'Arial'
FILL_IN = PatternFill('solid', fgColor='FFF2CC')     # 當天要填
FILL_HD = PatternFill('solid', fgColor='D9E2F3')     # 表頭
FILL_GP = PatternFill('solid', fgColor='EDF1F9')     # 欄組標題
BLUE = Font(name=FONT, color='0000FF')               # 寫死的輸入（講義規格、模擬值）
BLACK = Font(name=FONT)
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
NOTE = Font(name=FONT, size=9, color='808080')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MARK = '1F4E79'   # 實測點的顏色；點要明確給填色與邊線，否則 LibreOffice 重算存檔會把它寫成 noFill 而隱形

# 講義第 7 頁／第 9 頁的表格級距（前兩列是講義印好的，後面幾列講義留白）
VGS_GROUPS = [0.0, 2.0, 4.0, 6.0]                    # 實驗一：四組 V_GS
VDS_ROWS = [1.0, 2.0, 3.0, 4.0, 5.0]                 # 實驗一：每組五列 V_DS
VDS_GROUPS = [1.0, 3.0, 5.0]                         # 實驗二：三組 V_DS
VGS_ROWS = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0]            # 實驗二：每組六列 V_GS（粗掃，先找抬頭位置）
FINE_N = 10                                          # 加密掃描的列數（找 V_th 用）
R1_EXP1 = 1000.0                                     # 源極取樣電阻
R1_EXP2 = 100.0                                      # 汲極取樣電阻
RON_VGS = [5.0, 10.0, 3.0, 4.0, 6.0, 8.0]            # 實驗三：講義 5 V、問題 3 的 10 V，其餘選做
SW_VGS = [0.5, 1.0, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0]    # 實驗四：講義印好 0.5／1 V，其餘講義留白
SW_VDD = 8.0

# ── 讀 LTspice 預報值 ────────────────────────────────────────────────────────
with open(PRED_JSON, encoding='utf-8') as fh:
    P = json.load(fh)


def _from_raw():
    """.raw 在的時候以它為準，並把實驗一、二的數字寫回快取。"""
    f1 = os.path.join(HERE, 'lab3-exp1-curves.raw')
    f2 = os.path.join(HERE, 'lab3-exp2-transfer.raw')
    if not (os.path.exists(f1) and os.path.exists(f2)):
        return False
    import numpy as np
    sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', 'tools')))
    from ltraw import read_raw
    _, e1 = read_raw(f1)
    _, e2 = read_raw(f2)
    P['exp1_id_mA'] = [[round(float(np.interp(x, s['VDS'], -s['I(VDS)'] * 1e3)), 4) for x in VDS_ROWS]
                       for s in e1]
    P['exp2_id_mA'] = [[round(float(np.interp(x, s['VGS'], -s['I(VDS)'] * 1e3)), 4) for x in VGS_ROWS]
                       for s in e2]
    with open(PRED_JSON, 'w', encoding='utf-8') as fh:
        json.dump(P, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    return True


SRC_RAW = _from_raw()
PRED1, PRED2 = P['exp1_id_mA'], P['exp2_id_mA']
OP, AC = P['exp5_op'], P['exp5_ac']


# ── 樣式小工具 ──────────────────────────────────────────────────────────────
def dot_series(ys, xs, title):
    """只畫點、不畫線的實測序列。"""
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol='circle', size=7)
    s.marker.graphicalProperties.solidFill = MARK
    s.marker.graphicalProperties.line.solidFill = MARK
    s.graphicalProperties.line.noFill = True
    s.smooth = False
    return s


def line_series(ys, xs, title):
    # smooth=False：LibreOffice 預設會把折線畫成平滑曲線，V_GS = 6 V 那條會在 4.5 V
    # 附近出現不存在的凸起與回落，看起來像量錯。
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol='none')
    s.smooth = False
    return s


def put(ws, row, col, value, *, font=BLACK, fill=None, fmt=None, align=None):
    # 黃底輸入格若尚未量測，明確存成空字串型儲存格。
    # 某些 Excel 相容預覽器會把「數值型但沒有值」的儲存格誤顯示成 0。
    if value is None and fill is FILL_IN:
        value = ''
    c = ws.cell(row=row, column=col, value=value)
    c.font = font
    c.border = BOX
    if fill:
        c.fill = fill
    if fmt:
        c.number_format = fmt
    if align:
        c.alignment = Alignment(horizontal=align, vertical='center')
    return c


def note(ws, row, text, col=1):
    ws.cell(row=row, column=col, value=text).font = NOTE


def dev(meas, pred):
    """相對偏差公式：任一邊空白或預報為 0（截止區）時留白。"""
    return f'=IF(OR({meas}="",{pred}="",{pred}=0),"",({meas}-{pred})/{pred})'


def title_block(ws, title, subtitle, span):
    ws['A1'] = title
    ws['A1'].font = TITLE
    ws['A2'] = subtitle
    ws['A2'].font = NOTE
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=span)


def group_head(ws, row, col, span, text):
    """欄組標題（例如「V_GS = 4 V」），橫跨該組所有欄。"""
    c = ws.cell(row=row, column=col, value=text)
    c.font = BOLD
    c.fill = FILL_GP
    c.border = BOX
    c.alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + span - 1)
    for k in range(1, span):
        ws.cell(row=row, column=col + k).border = BOX


def col_head(ws, row, col, text, width=None):
    c = ws.cell(row=row, column=col, value=text)
    c.font = BOLD
    c.fill = FILL_HD
    c.border = BOX
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    if width:
        ws.column_dimensions[get_column_letter(col)].width = width
    return c


def head(ws, row, labels, widths=None, height=30, col=1):
    for i, t in enumerate(labels, start=col):
        col_head(ws, row, i, t)
    if widths:
        for i, w in enumerate(widths, start=col):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = height


def checklist(ws, row, items, col=1):
    """當天拍照檢查表：每個實驗一張，放在該工作表的資料區下方。回傳下一個空列。"""
    ws.cell(row=row, column=col, value='當天拍照檢查表（離開實驗室前逐項打勾）').font = BOLD
    row += 1
    for i, t in enumerate(['要留的證據', '打勾', '備註'], start=col):
        col_head(ws, row, i, t)
    row += 1
    for label, memo in items:
        put(ws, row, col, label)
        put(ws, row, col + 1, None, fill=FILL_IN)
        put(ws, row, col + 2, memo, font=NOTE)
        row += 1
    return row


def scatter(title, xt, yt, h=10, w=18):
    ch = ScatterChart()
    ch.title, ch.x_axis.title, ch.y_axis.title = title, xt, yt
    ch.height, ch.width, ch.style = h, w, 2
    return ch


wb = Workbook()

# ── 說明 ────────────────────────────────────────────────────────────────────
ws = wb.active
ws.title = '說明'
title_block(ws, 'Lab 3 MOSFET 實驗　數據記錄簿',
            '電子學實作系列第 9 週（11/7 六）．App_Lab3.pdf．兩個部分五張記錄表．當天用筆電直接填', 7)
rows = [
    ('助教公告的當天範圍', ''),
    ('必做', '實驗一 I_D-V_DS：至少量一條導通的（V_GS = 2／4／6 V 擇一以上），填表並畫 I_D-V_DS 關係圖'),
    ('必做', '實驗二 I_D-V_GS：至少量一條導通的（V_DS = 3／5 V 擇一以上），填表並畫 I_D-V_GS 關係圖'),
    ('有空再做', '實驗三 導通電阻、實驗四 LED 開關、第二部分 共源級放大器——表格都已備好，做到哪填到哪'),
    ('', ''),
    ('怎麼用', ''),
    ('1', '每個實驗一張工作表，只要填黃底的格子，其他欄位都是公式或預報值，不要覆蓋。'),
    ('2', '填一列，右邊的計算欄、相對偏差與下面的圖就會跟著更新；不必等全部填完才看得到對照。'),
    ('3', '藍色字是寫死的輸入：講義規格或 LTspice 模擬結果。黑色字是公式。'),
    ('4', '電流一律由取樣電阻的壓降換算（I_D = V_R1 / R1），三用電表全程留在電壓檔；'),
    ('', '　　取樣電阻值寫在每張表最上面，開工前用三用電表量一次、改成實測值，換算欄會跟著動。'),
    ('5', '實驗二最下面算出的 V_th 會自動帶到第二部分，用來判斷工作區與算 g_m；沒量到時改用 LTspice 的 2.14 V。'),
    ('6', '「交報告用」分頁已照講義第 7／9／10／12／20 頁的版面排好，數字由各表帶過來，直接複製貼進報告。'),
    ('7', '離開實驗室前跑一次每張工作表下方的「當天拍照檢查表」。'),
    ('', ''),
    ('量測注意', ''),
    ('實驗一', 'R1 串在「源極」：電源讀數 V_GS、V_DS 都含 R1 壓降，不等於元件端點電壓'),
    ('實驗二', 'R1 串在「汲極」、源極接地：電源讀數 V_GS 就是元件真正的 V_GS'),
    ('實驗三', 'CH2 改成定電流 10 mA（CC 模式、電壓開到最大）；V_DS 是毫伏等級，探棒直接壓在元件腳上'),
    ('實驗四', 'LED 平邊短腳（陰極）朝汲極；R1 串在源極，所以同樣量 R1 壓降換算 I_D'),
    ('第二部分', '先量直流（訊號產生器關掉），V_D 在 4～9 V 之間再接訊號；兩通道地夾都接電路的地'),
    ('元件', '2N7000 規格書的 V_GS(th) 範圍是 0.8～3.0 V；LTspice 用的是 BS170（同族替身），只拿來對形狀與量級'),
    ('', ''),
    ('填寫範例（實驗一，V_GS = 4 V、V_DS 設定 3 V）', ''),
]
r = 4
for a, b in rows:
    bold = a in ('助教公告的當天範圍', '怎麼用', '量測注意') or a.startswith('填寫範例')
    ws.cell(row=r, column=1, value=a).font = BOLD if bold else BLACK
    ws.cell(row=r, column=2, value=b).font = BLACK
    r += 1
head(ws, r, ['V_DS 設定 (V)', '實測 V_R1 (V)', '→ I_D (mA)', '→ V_GS 元件 (V)', '→ V_DS 元件 (V)',
             'LTspice I_D (mA)', '→ 相對偏差 (%)'],
     widths=[16, 16, 14, 16, 16, 16, 14])
ex_vr1 = 1.62
put(ws, r + 1, 1, 3.0, font=BLUE, fmt='0.0')
put(ws, r + 1, 2, ex_vr1, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 3, ex_vr1, fmt='0.000')
put(ws, r + 1, 4, 4.0 - ex_vr1, fmt='0.000')
put(ws, r + 1, 5, 3.0 - ex_vr1, fmt='0.000')
put(ws, r + 1, 6, PRED1[2][2], font=BLUE, fmt='0.000')
put(ws, r + 1, 7, (ex_vr1 - PRED1[2][2]) / PRED1[2][2], fmt='0.0%')
note(ws, r + 2, '↑ 這一列只是示範格式（量到 R1 兩端 1.62 V 就只填這一格，其餘自動算），正式表裡沒有這一列。')
note(ws, r + 3, '相對偏差 = (實測 − LTspice) / LTspice。截止區預報是 0，那幾格留白是正常的。')
ws.cell(row=r + 5, column=1, value='資料來源').font = BOLD
note(ws, r + 6, '預報欄由 simulations/lab3/build_record_xlsx.py 產生：實驗一、二讀 LTspice .raw（不在時讀 '
                'ltspice-pred.json），實驗三～第二部分讀 ltspice-pred.json；模型是 BS170（Vto = 2.14 V）。')
note(ws, r + 7, '量測級距與表格欄位出自 App_Lab3.pdf 第 7、9、10、12、20 頁；講義留白的列由筆記第 9 週補上。')
ws.column_dimensions['A'].width = 18
ws.column_dimensions['B'].width = 16
ws.sheet_view.showGridLines = False


# ── 實驗一：輸出特性曲線 ─────────────────────────────────────────────────────
ws1 = wb.create_sheet('實驗一 特性曲線')
title_block(ws1, '實驗一　輸出特性曲線 I_D-V_DS（講義第 6–7 頁）．必做',
            'R1 = 1 kΩ 串在源極．填 R1 壓降，I_D 自動換算．V_GS = 0 V 那組全是 0 是正常的（截止區）', 14)
R_ROW = 4                     # 取樣電阻值（可改，所有換算欄跟著動）
HDR = 6                       # 欄組標題列
SUB = 7                       # 欄名列
R0 = 8                        # 第一列資料
RN = R0 + len(VDS_ROWS) - 1
RCELL1 = '$B$4'
G1 = 6                        # 每組欄數

ws1.cell(row=R_ROW, column=1, value='源極取樣電阻 R1 (Ω)').font = BOLD
put(ws1, R_ROW, 2, R1_EXP1, fill=FILL_IN, fmt='0')
note(ws1, R_ROW, '← 講義指定 1 kΩ；開工前量一次改成實測值，所有 I_D 與元件電壓欄會跟著變', col=3)

col_head(ws1, SUB, 1, 'V_DS 設定 (V)', width=14)
ws1.cell(row=HDR, column=1).border = BOX
for g, vgs in enumerate(VGS_GROUPS):
    c0 = 2 + g * G1
    group_head(ws1, HDR, c0, G1, f'V_GS 設定 = {vgs:g} V')
    col_head(ws1, SUB, c0, '實測 V_R1 (V)', width=12)
    col_head(ws1, SUB, c0 + 1, 'I_D = V_R1/R1 (mA)', width=13)
    col_head(ws1, SUB, c0 + 2, 'V_GS 元件 (V)', width=11)
    col_head(ws1, SUB, c0 + 3, 'V_DS 元件 (V)', width=11)
    col_head(ws1, SUB, c0 + 4, 'LTspice I_D (mA)', width=12)
    col_head(ws1, SUB, c0 + 5, '相對偏差 (%)', width=10)
ws1.row_dimensions[SUB].height = 30

for i, vds in enumerate(VDS_ROWS):
    r = R0 + i
    put(ws1, r, 1, vds, fmt='0.0', align='center')
    for g, vgs in enumerate(VGS_GROUPS):
        c0 = 2 + g * G1
        put(ws1, r, c0, None, fill=FILL_IN, fmt='0.000')
        vr1 = f'{get_column_letter(c0)}{r}'
        idc = f'{get_column_letter(c0 + 1)}{r}'
        put(ws1, r, c0 + 1, f'=IF({vr1}="","",{vr1}/{RCELL1}*1000)', fmt='0.000')
        put(ws1, r, c0 + 2, f'=IF({vr1}="","",{vgs}-{vr1})', fmt='0.000')
        put(ws1, r, c0 + 3, f'=IF({vr1}="","",$A{r}-{vr1})', fmt='0.000')
        put(ws1, r, c0 + 4, PRED1[g][i], font=BLUE, fmt='0.000')
        put(ws1, r, c0 + 5, dev(idc, f'{get_column_letter(c0 + 4)}{r}'), fmt='0.0%')

rn = RN + 2
note(ws1, rn, '助教只要求至少一條導通的（V_GS = 2／4／6 V 擇一以上）；'
              'V_GS = 0 V 那組建議還是量一次，當作「截止區電流為零」的證據。')
note(ws1, rn + 1, 'V_GS = 6 V 在低 V_DS 時每加 1 V 電流約多 1 mA，那是 1 kΩ 的斜率、不是元件的三極管電阻。')
note(ws1, rn + 2, '只要量 R1 的壓降這一個電壓就夠：汲極直接接在 CH2 上，V_D 必定等於電源設定值，'
                  '所以元件真正的 V_GS 與 V_DS 都可以由 V_R1 減出來（右邊兩欄已自動算好）。')
note(ws1, rn + 3, '報告要畫「元件端」的特性曲線時，橫軸用 V_DS 元件 那一欄，不是最左邊的電源設定值。')

ch1 = scatter('I_D - V_DS 輸出特性曲線', 'V_DS 電源設定 (V)', 'I_D (mA)')
xs1 = Reference(ws1, min_col=1, min_row=R0, max_row=RN)
for g, vgs in enumerate(VGS_GROUPS):
    c0 = 2 + g * G1
    ch1.series.append(dot_series(Reference(ws1, min_col=c0 + 1, min_row=R0, max_row=RN),
                                 xs1, f'實測 V_GS={vgs:g}V'))
    ch1.series.append(line_series(Reference(ws1, min_col=c0 + 4, min_row=R0, max_row=RN),
                                  xs1, f'LTspice V_GS={vgs:g}V'))
ws1.add_chart(ch1, f'A{rn + 5}')
checklist(ws1, rn + 27, [
    ('至少一條導通曲線填完', 'V_GS = 2／4／6 V 擇一以上，五個 V_DS 都量'),
    ('V_GS = 0 V 的截止證據 1 張', 'R1 壓降接近 0 的電表畫面'),
    ('接線照片 1 張', '看得到 R1 在源極、CH1 接閘極、CH2 接汲極'),
    ('I_D-V_DS 圖截圖', '收工前確認點的形狀：先上升、後變平'),
])
ws1.freeze_panes = f'B{R0}'
ws1.sheet_view.showGridLines = False


# ── 實驗二：轉移特性曲線 ─────────────────────────────────────────────────────
ws2 = wb.create_sheet('實驗二 轉移曲線')
title_block(ws2, '實驗二　轉移特性曲線 I_D-V_GS 與臨界電壓（講義第 8–9 頁）．必做',
            'R1 = 100 Ω 串在汲極、源極接地．填汲極對地電壓 V_D 或 R1 壓降，I_D 自動換算', 14)
RCELL2 = '$B$4'
G2 = 5
ws2.cell(row=R_ROW, column=1, value='汲極取樣電阻 R1 (Ω)').font = BOLD
put(ws2, R_ROW, 2, R1_EXP2, fill=FILL_IN, fmt='0')
note(ws2, R_ROW, '← 講義指定 100 Ω；開工前量一次改成實測值，所有 I_D 換算欄會跟著變', col=3)

col_head(ws2, SUB, 1, 'V_GS 設定 (V)', width=14)
ws2.cell(row=HDR, column=1).border = BOX
RN2 = R0 + len(VGS_ROWS) - 1
for g, vds in enumerate(VDS_GROUPS):
    c0 = 2 + g * G2
    group_head(ws2, HDR, c0, G2, f'V_DS 設定 = {vds:g} V')
    col_head(ws2, SUB, c0, '實測 V_D (V)', width=12)
    col_head(ws2, SUB, c0 + 1, '實測 V_R1 (V)', width=12)
    col_head(ws2, SUB, c0 + 2, 'I_D (mA)', width=11)
    col_head(ws2, SUB, c0 + 3, 'LTspice (mA)', width=12)
    col_head(ws2, SUB, c0 + 4, '相對偏差 (%)', width=10)
ws2.row_dimensions[SUB].height = 30

for i, vgs in enumerate(VGS_ROWS):
    r = R0 + i
    put(ws2, r, 1, vgs, fmt='0.0', align='center')
    for g, vds in enumerate(VDS_GROUPS):
        c0 = 2 + g * G2
        put(ws2, r, c0, None, fill=FILL_IN, fmt='0.000')
        put(ws2, r, c0 + 1, None, fill=FILL_IN, fmt='0.000')
        vd = f'{get_column_letter(c0)}{r}'
        vr1 = f'{get_column_letter(c0 + 1)}{r}'
        # lab2 的做法：優先用直接量到的 R1 壓降，沒填時才用 (V_DS − V_D) 減出來
        put(ws2, r, c0 + 2,
            f'=IF({vr1}<>"",{vr1}/{RCELL2}*1000,IF({vd}<>"",({vds}-{vd})/{RCELL2}*1000,""))',
            fmt='0.000')
        put(ws2, r, c0 + 3, PRED2[g][i], font=BLUE, fmt='0.000')
        put(ws2, r, c0 + 4, dev(f'{get_column_letter(c0 + 2)}{r}', f'{get_column_letter(c0 + 3)}{r}'),
            fmt='0.0%')

rc = RN2 + 2
note(ws2, rc, '兩欄電壓量其中一個就夠，兩個都量是為了當場對帳：V_D + V_R1 應該等於該組的 V_DS 設定值，'
              '對不起來就是有一次量錯。I_D 欄優先用 V_R1，沒填時自動改用 (V_DS − V_D)/R1。')
note(ws2, rc + 1, '源極已接地，所以 V_D 就是元件真正的 V_DS、電源設定的 V_GS 就是元件真正的 V_GS，不用再減。'
                  '抬頭段（V_GS 2～3 V）預報變化很陡，相對偏差大是正常的，看形狀就好。')

# 加密掃描：粗掃看出在哪裡抬頭之後，回到那一段用 0.1～0.2 V 一階重掃，
# 才有兩個落在平方律直線上的點可以外插 V_th。級距當天自己填。
rf = RN2 + 5
ws2.cell(row=rf, column=1, value='加密掃描（找 V_th 用）').font = BOLD
note(ws2, rf, '選用的 V_DS (V) →', col=3)
put(ws2, rf, 4, None, fill=FILL_IN, fmt='0.0')
rf += 1
for j, t in enumerate(['V_GS 設定 (V)', 'V_D 量測 (V)', 'I_D (mA)', '√I_D'], start=1):
    col_head(ws2, rf, j, t)
F0 = rf + 1
FN = F0 + FINE_N - 1
vds_cell = f'$D${rf - 1}'
for i in range(FINE_N):
    r = F0 + i
    put(ws2, r, 1, None, fill=FILL_IN, fmt='0.00')
    put(ws2, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws2, r, 3,
        f'=IF(OR(A{r}="",B{r}="",{vds_cell}=""),"",({vds_cell}-B{r})/{RCELL2}*1000)', fmt='0.000')
    put(ws2, r, 4, f'=IF(C{r}="","",SQRT(C{r}))', fmt='0.000')
note(ws2, FN + 1, '做法：先看粗掃表在哪一格之間跳起來，回到那一段用 0.1～0.2 V 一階重掃十點；'
                  '√I_D 欄若呈一條直線就代表那幾點在平方律上，可以拿來外插。')

# 臨界電壓：平方根外插（挑兩個在抬頭段、電流 1～5 mA 之間的點）
rv = FN + 3
ws2.cell(row=rv, column=1, value='臨界電壓 V_th（平方根外插）').font = BOLD
rv += 1
for j, t in enumerate(['', '量測點 1', '量測點 2', '外插結果'], start=1):
    col_head(ws2, rv, j, t)
for k, (lab, fmt) in enumerate([('V_GS (V)', '0.00'), ('I_D (mA)', '0.000')]):
    rr = rv + 1 + k
    put(ws2, rr, 1, lab)
    put(ws2, rr, 2, None, fill=FILL_IN, fmt=fmt)
    put(ws2, rr, 3, None, fill=FILL_IN, fmt=fmt)
g1, i1, g2, i2 = f'B{rv + 1}', f'B{rv + 2}', f'C{rv + 1}', f'C{rv + 2}'
put(ws2, rv + 1, 4,
    f'=IF(OR({g1}="",{i1}="",{g2}="",{i2}=""),"",'
    f'{g1}-({g2}-{g1})/(SQRT({i2})-SQRT({i1}))*SQRT({i1}))', fmt='0.000')
VTH_REF = f"'實驗二 轉移曲線'!$D${rv + 1}"       # 第二部分會引用
ws2.cell(row=rv + 1, column=5, value='← V_th (V)，第二部分會自動引用').font = BOLD
put(ws2, rv + 2, 4, P['vth_model'], font=BLUE, fmt='0.000')
note(ws2, rv + 2, '← LTspice（BS170）的 V_to', col=5)
# 防呆：兩點若取在被 R1 限流的平台上，外插會得到負值或大於量測點的荒謬結果
put(ws2, rv + 3, 4,
    f'=IF(D{rv + 1}="","",IF(OR(D{rv + 1}<0,D{rv + 1}>MIN({g1},{g2})),'
    f'"兩點取在平台上了，重挑","合理"))')
note(ws2, rv + 3, '← 合理性檢查', col=5)
note(ws2, rv + 4, '兩個點都要取自上面的加密掃描、且落在抬頭段（建議 I_D 在 1～5 mA 之間）。'
                  '取到被 R1 限流的平台（I_D 接近 V_DS/100 Ω）會算出負的 V_th。')
note(ws2, rv + 5, '三組的平台高度約等於 V_DS / 100 Ω，那是 R1 在限流、不是元件飽和；要讀的資訊全在抬頭那一段。')

ch2 = scatter('I_D - V_GS 轉移特性曲線', 'V_GS (V)', 'I_D (mA)')
xs2 = Reference(ws2, min_col=1, min_row=R0, max_row=RN2)
for g, vds in enumerate(VDS_GROUPS):
    c0 = 2 + g * G2
    ch2.series.append(dot_series(Reference(ws2, min_col=c0 + 2, min_row=R0, max_row=RN2),
                                 xs2, f'實測 V_DS={vds:g}V'))
    ch2.series.append(line_series(Reference(ws2, min_col=c0 + 3, min_row=R0, max_row=RN2),
                                  xs2, f'LTspice V_DS={vds:g}V'))
ws2.add_chart(ch2, f'A{rv + 7}')

ch3 = scatter('√I_D - V_GS（加密掃描；直線段外插到 x 軸就是 V_th）', 'V_GS (V)', '√I_D (√mA)', h=9)
ch3.series.append(dot_series(Reference(ws2, min_col=4, min_row=F0, max_row=FN),
                             Reference(ws2, min_col=1, min_row=F0, max_row=FN), '加密掃描'))
ws2.add_chart(ch3, f'L{rv + 7}')
checklist(ws2, rv + 29, [
    ('至少一條導通曲線填完', 'V_DS = 3／5 V 擇一以上，六個 V_GS 都量'),
    ('加密掃描十點', '抬頭段 0.1～0.2 V 一階；V_th 外插要用'),
    ('V_th 合理性檢查顯示「合理」', '顯示「重挑」就換兩個在抬頭段的點'),
    ('I_D-V_GS 圖截圖', '收工前確認：先平、再陡升、再被 R1 壓平'),
])
ws2.freeze_panes = f'B{R0}'
ws2.sheet_view.showGridLines = False


# ── 實驗三：導通電阻 ────────────────────────────────────────────────────────
ws3 = wb.create_sheet('實驗三 導通電阻')
title_block(ws3, '實驗三　導通電阻 R_on（講義第 10 頁）．有空再做',
            'CH2 改成定電流 10 mA（CC 模式）、CH1 = V_GS．量 V_DS（毫伏等級），R_on = V_DS / I_D', 10)
ws3.cell(row=R_ROW, column=1, value='汲極串聯電阻 R1 (Ω)').font = BOLD
put(ws3, R_ROW, 2, R1_EXP2, fill=FILL_IN, fmt='0')
note(ws3, R_ROW, '← 與實驗二同一塊板；R1 對 I_D 沒影響（定電流源），只用來確認 CC 模式有生效', col=3)
head(ws3, 6, ['V_GS 設定 (V)', 'CC 電流讀值 (mA)', '實測 V_R1 (V)', '→ 採用的 I_D (mA)', '實測 V_DS (mV)',
              '→ R_on (Ω)', 'LTspice V_DS (mV)', 'LTspice R_on (Ω)', '相對偏差 (%)', '備註'],
     widths=[14, 14, 13, 15, 14, 12, 15, 14, 12, 40])
RON0 = 7
for i, vgs in enumerate(RON_VGS):
    r = RON0 + i
    put(ws3, r, 1, vgs, font=BLUE, fmt='0.0', align='center')
    put(ws3, r, 2, None, fill=FILL_IN, fmt='0.00')
    put(ws3, r, 3, None, fill=FILL_IN, fmt='0.000')
    # 優先用電源面板的 CC 讀值；沒抄就用 R1 壓降換算；都沒有就當作講義的 10 mA
    put(ws3, r, 4, f'=IF(B{r}<>"",B{r},IF(C{r}<>"",C{r}/$B$4*1000,10))', fmt='0.00')
    put(ws3, r, 5, None, fill=FILL_IN, fmt='0.0')
    put(ws3, r, 6, f'=IF(E{r}="","",E{r}/D{r})', fmt='0.00')
    vds_lt = P['exp3_vds_mV'][f'{vgs:g}']
    put(ws3, r, 7, vds_lt, font=BLUE, fmt='0.0')
    put(ws3, r, 8, round(vds_lt / 10, 2), font=BLUE, fmt='0.00')
    put(ws3, r, 9, dev(f'F{r}', f'H{r}'), fmt='0.0%')
    memo = {5.0: '講義指定', 10.0: '講義問題 3：與 5 V 比較'}.get(vgs, '選做：多量幾點可以畫 R_on-V_GS 曲線')
    put(ws3, r, 10, memo, font=NOTE)
RONN = RON0 + len(RON_VGS) - 1
r = RONN + 2
put(ws3, r, 1, 'R_on(10 V) / R_on(5 V)', font=BOLD)
put(ws3, r, 6, f'=IF(OR(F{RON0}="",F{RON0 + 1}=""),"",F{RON0 + 1}/F{RON0})', fmt='0.00')
put(ws3, r, 8, round(P['exp3_vds_mV']['10'] / P['exp3_vds_mV']['5'], 2), font=BLUE, fmt='0.00')
note(ws3, r, '← 問題 3 的證據：V_GS 越高、通道越厚，R_on 降到約三分之一', col=10)
note(ws3, r + 2, 'V_R1 應該恆為 1 V 左右（10 mA × 100 Ω），不隨 V_GS 變——這是 CC 模式有生效的最快判準。'
                 'V_DS 量到伏特等級代表元件還沒完全導通或電源沒進 CC 模式。')
note(ws3, r + 3, '講義第 10 頁圖上的 0.0014 V（= 0.14 Ω）任何 2N7000 都做不到；規格書是 V_GS = 10 V 時典型 1.2 Ω、'
                 '上限 5.3 Ω，和 LTspice 同一個量級。')
ch = scatter('R_on - V_GS（I_D 固定 10 mA）', 'V_GS (V)', 'R_on (Ω)', h=9)
xs = Reference(ws3, min_col=1, min_row=RON0, max_row=RONN)
ch.series.append(dot_series(Reference(ws3, min_col=6, min_row=RON0, max_row=RONN), xs, '實測'))
ch.series.append(dot_series(Reference(ws3, min_col=8, min_row=RON0, max_row=RONN), xs, 'LTspice'))
ch.series[1].marker.symbol = 'triangle'
ch.series[1].marker.graphicalProperties.solidFill = 'F28C28'
ch.series[1].marker.graphicalProperties.line.solidFill = 'F28C28'
ws3.add_chart(ch, f'A{r + 5}')
checklist(ws3, r + 25, [
    ('電源 CC 指示燈亮著的照片 1 張', '證明 CH2 真的在定電流模式'),
    ('V_GS = 5 V 的 V_DS 電表畫面', '毫伏檔，探棒直接點元件腳'),
    ('V_GS = 10 V 的 V_DS 電表畫面', '講義問題 3 要用'),
])
ws3.freeze_panes = 'B7'
ws3.sheet_view.showGridLines = False


# ── 實驗四：LED 開關 ────────────────────────────────────────────────────────
ws4 = wb.create_sheet('實驗四 LED 開關')
title_block(ws4, '實驗四　MOSFET 當開關點亮 LED（講義第 11–12 頁）．有空再做',
            f'V_DD = {SW_VDD:g} V 經 LED 接汲極、R1 串在源極．填 R1 壓降與 LED 兩端電壓，I_D、LED 電阻自動算', 16)
ws4.cell(row=R_ROW, column=1, value='源極電阻 R1 (Ω)').font = BOLD
put(ws4, R_ROW, 2, 100.0, fill=FILL_IN, fmt='0')
ws4.cell(row=R_ROW, column=3, value='問題 4 用的 R1 (Ω)').font = BOLD
put(ws4, R_ROW, 4, 200.0, fill=FILL_IN, fmt='0')
note(ws4, R_ROW, '← 開工前各量一次改成實測值', col=5)
V4 = 'D'           # 問題 4 電阻的儲存格欄
G4A, G4B = 2, 11   # 兩組的起始欄
group_head(ws4, HDR, G4A, 9, 'R1 = 100 Ω（講義原值）')
group_head(ws4, HDR, G4B, 6, 'R1 = 200 Ω（講義問題 4，選做）')
ws4.cell(row=HDR, column=1).border = BOX
col_head(ws4, SUB, 1, 'V_GS 設定 (V)', width=13)
for k, (t, w) in enumerate([('實測 V_R1 (V)', 12), ('實測 V_LED (V)', 12), ('I_D = V_R1/R1 (mA)', 13),
                            ('V_GS 元件 (V)', 11), ('V_DS 元件 (V)', 11), ('LED 電阻 (Ω)', 11),
                            ('亮／暗', 9), ('LTspice I_D (mA)', 12), ('相對偏差 (%)', 10)]):
    col_head(ws4, SUB, G4A + k, t, width=w)
for k, (t, w) in enumerate([('實測 V_R1 (V)', 12), ('實測 V_LED (V)', 12), ('I_D (mA)', 11),
                            ('亮／暗', 9), ('LTspice I_D (mA)', 12), ('相對偏差 (%)', 10)]):
    col_head(ws4, SUB, G4B + k, t, width=w)
ws4.row_dimensions[SUB].height = 30
SW0 = R0
for i, vgs in enumerate(SW_VGS):
    r = SW0 + i
    put(ws4, r, 1, vgs, fmt='0.0', align='center')
    # R1 = 100 Ω 組
    put(ws4, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws4, r, 3, None, fill=FILL_IN, fmt='0.000')
    put(ws4, r, 4, f'=IF(B{r}="","",B{r}/$B$4*1000)', fmt='0.00')
    put(ws4, r, 5, f'=IF(B{r}="","",A{r}-B{r})', fmt='0.000')
    put(ws4, r, 6, f'=IF(OR(B{r}="",C{r}=""),"",{SW_VDD}-C{r}-B{r})', fmt='0.000')
    put(ws4, r, 7, f'=IF(OR(C{r}="",D{r}="",D{r}=0),"",C{r}/D{r}*1000)', fmt='0')
    put(ws4, r, 8, None, fill=FILL_IN, align='center')
    put(ws4, r, 9, P['exp4_id_mA']['100'][f'{vgs:g}'], font=BLUE, fmt='0.00')
    put(ws4, r, 10, dev(f'D{r}', f'I{r}'), fmt='0.0%')
    # R1 = 200 Ω 組
    put(ws4, r, 11, None, fill=FILL_IN, fmt='0.000')
    put(ws4, r, 12, None, fill=FILL_IN, fmt='0.000')
    put(ws4, r, 13, f'=IF(K{r}="","",K{r}/${V4}$4*1000)', fmt='0.00')
    put(ws4, r, 14, None, fill=FILL_IN, align='center')
    put(ws4, r, 15, P['exp4_id_mA']['200'][f'{vgs:g}'], font=BLUE, fmt='0.00')
    put(ws4, r, 16, dev(f'M{r}', f'O{r}'), fmt='0.0%')
SWN = SW0 + len(SW_VGS) - 1
r = SWN + 2
note(ws4, r, '講義印好的只有 0.5 V 與 1 V 兩列，其餘留白；2～3 V 是 LED 從暗到亮的區段，這幾列最有資訊量。'
             '亮／暗填「暗／微亮／亮」即可。')
note(ws4, r + 1, 'V_DS 元件 = V_DD − V_LED − V_R1。V_GS = 3 V 時預報 V_DS 還有約 5.3 V（仍在飽和區），'
                 '要再往上拉才會進三極管區當「全開」的開關——結報值得寫一句。')
r += 3
ws4.cell(row=r, column=1, value='重點對照').font = BOLD
head(ws4, r + 1, ['量', '實測', 'LTspice 預報', '相對偏差 (%)', '備註'], height=22)
pairs = [
    ('LED 開始亮的 V_GS (V)', None, P['exp4_on_vgs']['100'], '目測第一次看得出亮的那一格；LTspice 以 I_D > 2 mA 判定'),
    ('V_GS = 6 V 時的 I_D (mA)', f'=D{SWN}', P['exp4_id_mA']['100']['6'], '由上表帶過來'),
    ('V_GS = 6 V 時的 V_LED (V)', f'=IF(C{SWN}="","",C{SWN})', P['exp4_vled_at6']['100'],
     'LED 是概念模型，壓降以當天那顆為準'),
    ('200 Ω：LED 開始亮的 V_GS (V)', None, P['exp4_on_vgs']['200'], '問題 4：電阻加倍，開始亮的點往右移'),
    ('200 Ω：V_GS = 6 V 時的 I_D (mA)', f'=M{SWN}', P['exp4_id_mA']['200']['6'], '問題 4：電流約減半、LED 變暗'),
]
for k, (lab, f, lt, memo) in enumerate(pairs):
    rr = r + 2 + k
    put(ws4, rr, 1, lab)
    if f:
        put(ws4, rr, 2, f, fmt='0.00')
    else:
        put(ws4, rr, 2, None, fill=FILL_IN, fmt='0.00')
    put(ws4, rr, 3, lt, font=BLUE, fmt='0.00')
    put(ws4, rr, 4, dev(f'B{rr}', f'C{rr}'), fmt='0.0%')
    put(ws4, rr, 5, memo, font=NOTE)
ws4.column_dimensions['A'].width = 30
r = r + 2 + len(pairs) + 1
ch = scatter('LED 電流 I_D - V_GS（V_DD = 8 V）', 'V_GS 設定 (V)', 'I_D (mA)')
xs = Reference(ws4, min_col=1, min_row=SW0, max_row=SWN)
ch.series.append(dot_series(Reference(ws4, min_col=4, min_row=SW0, max_row=SWN), xs, '實測 R1 = 100 Ω'))
ch.series.append(line_series(Reference(ws4, min_col=9, min_row=SW0, max_row=SWN), xs, 'LTspice R1 = 100 Ω'))
ch.series.append(dot_series(Reference(ws4, min_col=13, min_row=SW0, max_row=SWN), xs, '實測 R1 = 200 Ω'))
ch.series[2].marker.symbol = 'triangle'
ch.series.append(line_series(Reference(ws4, min_col=15, min_row=SW0, max_row=SWN), xs, 'LTspice R1 = 200 Ω'))
ws4.add_chart(ch, f'A{r}')
checklist(ws4, r + 22, [
    ('LED 暗與亮各 1 張照片', '同一個角度拍，報告要放亮度對比'),
    ('LED 方向照片 1 張', '平邊短腳（陰極）朝汲極'),
    ('V_GS = 6 V 的 V_R1 與 V_LED 電表畫面', '算 I_D 與 LED 電阻用'),
    ('（選做）200 Ω 版本同一組照片', '講義問題 4'),
])
ws4.freeze_panes = f'B{SW0}'
ws4.sheet_view.showGridLines = False


# ── 第二部分：共源級放大器 ──────────────────────────────────────────────────
ws5 = wb.create_sheet('第二部分 共源放大器')
title_block(ws5, '第二部分　共源級放大器的工作點與電壓增益（講義第 19–20 頁）．有空再做',
            'V_DD = 15 V．閘極分壓 R1/R2、汲極 R3、源極 R6（交流路徑另經 C3 接 R7）、負載 R4．先量直流再接訊號', 7)
ws5['A3'] = '元件實測值'
ws5['A3'].font = BOLD
parts = [('V_DD (V)', 15.0, '0.00'), ('R1 (kΩ)', 100.0, '0.0'), ('R2 (kΩ)', 50.0, '0.0'),
         ('R3 (kΩ)', 300.0, '0.0'), ('R4 (kΩ)', 1000.0, '0.0'), ('R6 (kΩ)', 100.0, '0.0'),
         ('R7 (kΩ)', 30.0, '0.0')]
PC = {}
for k, (lab, v, fmt) in enumerate(parts):
    rr = 4 + k
    put(ws5, rr, 1, lab)
    put(ws5, rr, 2, v, fill=FILL_IN, fmt=fmt)
    PC[lab.split()[0]] = f'$B${rr}'
note(ws5, 4, '← 先填標稱值；開工前用三用電表各量一次改成實測值', col=3)
note(ws5, 10, '← 零件表只有 50 kΩ ×2、沒有 30 kΩ；若當天只拿得到 50 kΩ 就改成 50，LTspice 增益會從 8.7 掉到 6.3',
     col=3)
put(ws5, 11, 1, 'V_th 採用值 (V)')
put(ws5, 11, 2, f'=IF({VTH_REF}="",{P["vth_model"]},{VTH_REF})', fmt='0.000')
note(ws5, 11, '← 自動帶入實驗二外插的 V_th；實驗二沒做完時用 LTspice 的 2.14 V', col=3)
VTH = '$B$11'
RD = f'({PC["R3"]}*{PC["R4"]}/({PC["R3"]}+{PC["R4"]}))'      # 汲極交流負載 R3 ∥ R4 (kΩ)
RS = f'({PC["R6"]}*{PC["R7"]}/({PC["R6"]}+{PC["R7"]}))'      # 源極交流電阻 R6 ∥ R7 (kΩ)

r = 13
ws5.cell(row=r, column=1, value='一、直流工作點（訊號產生器先關掉，用三用電表對地量）').font = BOLD
head(ws5, r + 1, ['量', '理論（手算）', '實測', 'LTspice 預報', '相對偏差 (%)', '算式／備註'],
     widths=[26, 14, 14, 14, 13, 58])
D0 = r + 2
dc = [
    ('V_G (V)', f'={PC["V_DD"]}*{PC["R2"]}/({PC["R1"]}+{PC["R2"]})', None, OP['VG'],
     '分壓決定、與元件無關；量到不是 5 V 就先查 R1、R2'),
    ('V_S (V)', 'in', None, OP['VS'], '源極對地'),
    ('V_D (V)', 'in', None, OP['VD'], '汲極對地；4～9 V 之間工作點才可用'),
    ('V_GS = V_G − V_S (V)', 'in', f'=IF(OR(C{D0}="",C{D0 + 1}=""),"",C{D0}-C{D0 + 1})', OP['VGS'],
     '講義表格要的 V_GS (measure)'),
    ('V_DS = V_D − V_S (V)', 'in', f'=IF(OR(C{D0 + 1}="",C{D0 + 2}=""),"",C{D0 + 2}-C{D0 + 1})', OP['VDS'],
     '講義表格要的 V_DS (measure)'),
    ('I_D = V_S / R6 (µA)', 'in', f'=IF(C{D0 + 1}="","",C{D0 + 1}/{PC["R6"]}*1000)', OP['ID_uA'],
     '閘極不吃電流，流過 R6 的就是 I_D'),
    ('工作區', None,
     # 先看有沒有電流（V_S < 0.1 V ≈ I_D < 1 µA 才算截止），不直接拿 V_GS 比 V_th：
     # LTspice 的 Level 3 模型在 V_GS 低於 V_to 時仍有次臨界電流，預報的工作點正是這樣。
     f'=IF(OR(C{D0 + 1}="",C{D0 + 3}="",C{D0 + 4}=""),"",IF(C{D0 + 1}<0.1,"截止",'
     f'IF(C{D0 + 4}>MAX(C{D0 + 3}-{VTH},0),IF(C{D0 + 3}<{VTH},"飽和（次臨界）","飽和"),"三極管")))',
     '飽和', '有電流且 V_DS > V_GS − V_th 即飽和；V_GS 低於 V_th 仍有電流時標「次臨界」'),
    ('g_m = 2 I_D / (V_GS − V_th) (mA/V)', 'in',
     f'=IF(OR(C{D0 + 5}="",C{D0 + 3}=""),"",IF(C{D0 + 3}-{VTH}<=0.05,"不適用，看下方 AC 回推",'
     f'2*C{D0 + 5}/1000/(C{D0 + 3}-{VTH})))', OP['gm_mA_V'],
     '講義提示用 I_D 量測值推；V_GS − V_th 不到 0.05 V 時公式失效（見下方說明）'),
]
for k, (lab, th, meas, lt, memo) in enumerate(dc):
    rr = D0 + k
    put(ws5, rr, 1, lab)
    if th == 'in':
        put(ws5, rr, 2, None, fill=FILL_IN, fmt='0.000')
    elif th:
        put(ws5, rr, 2, th, fmt='0.000')
    else:
        put(ws5, rr, 2, '—', align='center')
    if meas:
        put(ws5, rr, 3, meas, fmt='0.000')
    else:
        put(ws5, rr, 3, None, fill=FILL_IN, fmt='0.000')
    put(ws5, rr, 4, lt, font=BLUE, fmt='0.000')
    if isinstance(lt, str):
        put(ws5, rr, 5, '—', align='center')
    else:
        put(ws5, rr, 5, dev(f'C{rr}', f'D{rr}'), fmt='0.0%')
    put(ws5, rr, 6, memo, font=NOTE)
DN = D0 + len(dc) - 1
ROW_GM = DN
note(ws5, DN + 1, '理論欄自己手算後填（講義表格要 V_GS、V_DS、g_m 的 theory 值）。V_G 由分壓直接算好了。')
note(ws5, DN + 2, '量到 V_D ≈ V_S、示波器沒有輸出時先不要懷疑接線：多半是手上那顆 V_th 偏低，元件掉進三極管區。'
                  '把 R2 換小或 R3 換成 100 kΩ，並把這段寫進結報。')
note(ws5, DN + 3, 'LTspice 的 g_m 0.297 mA/V 是由增益回推的有效值。預報工作點 V_GS = 2.03 V 其實比模型的 V_to = 2.14 V 還低，'
                  '元件靠次臨界電流導通；V_GS 貼著 V_th 時平方律 2I_D/(V_GS − V_th) 會爆大或變負，'
                  '這時 g_m 以 AC 表的「由實測增益回推」為準，對不起來是理論模型的極限、不是量錯。')

r = DN + 5
ws5.cell(row=r, column=1, value='二、電壓增益（V_in = 0.05 sin(2π·1000·t)，示波器 CH1 量輸入、CH2 量 R4 上的輸出）').font = BOLD
put(ws5, r + 1, 1, 'V_in 峰值 (mV)')
put(ws5, r + 1, 2, 50.0, fill=FILL_IN, fmt='0.0')
note(ws5, r + 1, '← 講義 50 mV 峰值；示波器量到的實際輸入峰值填這裡（峰對峰值要除以 2）', col=3)
VIN = f'$B${r + 1}'
head(ws5, r + 2, ['量', '理論（由 g_m 算）', '實測', 'LTspice 預報', '相對偏差 (%)', '算式／備註'])
A0 = r + 3
GM_TH = f'B{ROW_GM}'          # 手算 g_m（mA/V）
gain = lambda gm: f'{gm}*{RD}/(1+{gm}*{RS})'   # noqa: E731  |A_v| = g_m R_D' / (1 + g_m R_S')，g_m 用 mA/V、電阻用 kΩ
ac = [
    ('V_out 峰值 (mV)', f'=IF({GM_TH}="","",{gain(GM_TH)}*{VIN})', None, AC['vout_peak_mV'],
     'R4 兩端；峰對峰值要除以 2'),
    ('A_v = −V_out / V_in', f'=IF({GM_TH}="","",-{gain(GM_TH)})',
     f'=IF(C{A0}="","",-C{A0}/{VIN})', AC['av'],
     '|A_v| = g_m(R3∥R4) / [1 + g_m(R6∥R7)]；負號代表反相'),
    ('g_m（由實測增益回推，mA/V）', '—',
     f'=IF(C{A0 + 1}="","",ABS(C{A0 + 1})/({RD}-ABS(C{A0 + 1})*{RS}))', OP['gm_mA_V'],
     '把上面的增益公式反解：g_m = |A_v| / [R_D′ − |A_v|·R_S′]'),
    ('相位差 (°)', 180, None, 180, '輸出與輸入上下顛倒；同相代表量到源極或示波器開了反相'),
]
for k, (lab, th, meas, lt, memo) in enumerate(ac):
    rr = A0 + k
    put(ws5, rr, 1, lab)
    put(ws5, rr, 2, th, fmt='0.000' if not isinstance(th, int) else '0', align='center' if th == '—' else None)
    if meas:
        put(ws5, rr, 3, meas, fmt='0.000')
    else:
        put(ws5, rr, 3, None, fill=FILL_IN, fmt='0.0')
    put(ws5, rr, 4, lt, font=BLUE, fmt='0.000')
    put(ws5, rr, 5, dev(f'C{rr}', f'D{rr}'), fmt='0.0%')
    put(ws5, rr, 6, memo, font=NOTE)
AN = A0 + len(ac) - 1

r = AN + 2
ws5.cell(row=r, column=1, value='三、選做：講義問題 3 與 Bonus 的增益對照').font = BOLD
head(ws5, r + 1, ['組態', 'V_in 峰值 (mV)', '實測 V_out 峰值 (mV)', '→ |A_v| 實測', 'LTspice |A_v|', '相對偏差 (%)'])
put(ws5, r + 1, 7, '削頂？反相？', font=BOLD, fill=FILL_HD)
ws5.cell(row=r + 1, column=7).alignment = Alignment(horizontal='center', vertical='center')
ws5.column_dimensions['G'].width = 16
opts = [
    ('講義原值（R7 = 30 kΩ）', abs(AC['av'])),
    ('問題 3：R6 並聯電容（全旁路）', abs(AC['av_bypass_R6'])),
    ('Bonus：R7 改 10 kΩ', abs(AC['av_bonus_R7_10k'])),
]
for k, (lab, lt) in enumerate(opts):
    rr = r + 2 + k
    put(ws5, rr, 1, lab)
    put(ws5, rr, 2, None, fill=FILL_IN, fmt='0.0')
    put(ws5, rr, 3, None, fill=FILL_IN, fmt='0.0')
    put(ws5, rr, 4, f'=IF(OR(B{rr}="",C{rr}=""),"",C{rr}/B{rr})', fmt='0.00')
    put(ws5, rr, 5, lt, font=BLUE, fmt='0.00')
    put(ws5, rr, 6, dev(f'D{rr}', f'E{rr}'), fmt='0.0%')
    put(ws5, rr, 7, None, fill=FILL_IN)
rr = r + 2 + len(opts)
note(ws5, rr, '全旁路時增益約 70 倍，50 mV 輸入會讓輸出要 3.5 V 峰值、超過往下只剩約 3.1 V 的擺幅，必削頂；'
              '要量這一列請把 V_in 降到 30 mV 峰值以下。Bonus 要求 |A_v| > 10 且反相，R7 = 10 kΩ 給 18.6 倍。')
checklist(ws5, rr + 2, [
    ('直流工作點三個電壓的電表畫面', 'V_G、V_S、V_D 對地'),
    ('示波器 V_in／V_out 同畫面截圖', '看得到反相與兩通道的峰值讀數'),
    ('元件實測值都改好', 'R1～R7 的實測電阻，增益公式用這幾格'),
    ('（選做）旁路／Bonus 版本的波形截圖', '講義問題 3 與 Bonus'),
])
ws5.freeze_panes = 'B13'
ws5.sheet_view.showGridLines = False


# ── 交報告用：照講義第 7／9／10／12／20 頁的版面 ─────────────────────────────
ws6 = wb.create_sheet('交報告用')
title_block(ws6, '交報告用表格（版面照 App_Lab3.pdf 第 7、9、10、12、20 頁）',
            '數字由各表帶過來；空白代表當天沒量。直接整塊複製貼進報告', 8)


def link(sheet, cell, fmt, unit):
    ref = f"'{sheet}'!{cell}"
    tail = f'&" {unit}"' if unit else ''
    return f'=IF({ref}="","",TEXT({ref},"{fmt}"){tail})'


r = 4
ws6.cell(row=r, column=1, value='1. Circuit schematic (characteristic curve, I_D-V_DS)').font = BOLD
r += 1
# 2×2 四個區塊，和講義排法一樣
for gi, vgs in enumerate(VGS_GROUPS):
    base_r = r + (gi // 2) * (len(VDS_ROWS) + 3)
    base_c = 1 + (gi % 2) * 3
    group_head(ws6, base_r, base_c, 2, f'V_GS = {vgs:g} V')
    col_head(ws6, base_r + 1, base_c, 'V_DS (experimental setting)', width=26)
    col_head(ws6, base_r + 1, base_c + 1, 'I_D (measure)', width=16)
    src_c = get_column_letter(2 + gi * G1 + 1)
    for i, vds in enumerate(VDS_ROWS):
        rr = base_r + 2 + i
        put(ws6, rr, base_c, f'{vds:g} V', align='center')
        put(ws6, rr, base_c + 1, link('實驗一 特性曲線', f'{src_c}{R0 + i}', '0.000', 'mA'), align='center')

r = r + 2 * (len(VDS_ROWS) + 3) + 1
ws6.cell(row=r, column=1, value='2. Circuit schematic (transfer curve, I_D-V_GS)').font = BOLD
r += 1
for gi, vds in enumerate(VDS_GROUPS):
    base_r = r + gi * (len(VGS_ROWS) + 3)
    group_head(ws6, base_r, 1, 2, f'V_DS = {vds:g} V')
    col_head(ws6, base_r + 1, 1, 'V_GS (experimental setting)')
    col_head(ws6, base_r + 1, 2, 'I_D (measure)')
    src_c = get_column_letter(2 + gi * G2 + 2)
    for i, vgs in enumerate(VGS_ROWS):
        rr = base_r + 2 + i
        put(ws6, rr, 1, f'{vgs:g} V', align='center')
        put(ws6, rr, 2, link('實驗二 轉移曲線', f'{src_c}{R0 + i}', '0.000', 'mA'), align='center')

r = r + len(VDS_GROUPS) * (len(VGS_ROWS) + 3) + 1
ws6.cell(row=r, column=1, value='3. Circuit schematic (turn-on resistance)').font = BOLD
group_head(ws6, r + 1, 1, 2, 'V_GS = 5 V and I_D = 10 mA')
col_head(ws6, r + 2, 1, 'V_DS (measure)')
col_head(ws6, r + 2, 2, 'R_on (calculation)')
put(ws6, r + 3, 1, f"=IF('實驗三 導通電阻'!E{RON0}=\"\",\"\","
                   f"TEXT('實驗三 導通電阻'!E{RON0}/1000,\"0.0000\")&\" V\")", align='center')
put(ws6, r + 3, 2, link('實驗三 導通電阻', f'F{RON0}', '0.00', 'Ohm'), align='center')

r += 6
ws6.cell(row=r, column=1, value='4. Circuit schematic (switch)').font = BOLD
group_head(ws6, r + 1, 1, 3, f'V_DS = {SW_VDD:g} V')
for j, t in enumerate(['V_GS (experimental setting)', 'I_D (measure)', 'LED performance'], start=1):
    col_head(ws6, r + 2, j, t)
ws6.column_dimensions['C'].width = 18
for i, vgs in enumerate(SW_VGS):
    rr = r + 3 + i
    put(ws6, rr, 1, f'{vgs:g} V', align='center')
    put(ws6, rr, 2, link('實驗四 LED 開關', f'D{SW0 + i}', '0.00', 'mA'), align='center')
    put(ws6, rr, 3, f"=IF('實驗四 LED 開關'!H{SW0 + i}=\"\",\"Dark / Bright\",'實驗四 LED 開關'!H{SW0 + i})",
        align='center')

r = r + 3 + len(SW_VGS) + 1
ws6.cell(row=r, column=1, value='5. Common-source amplifier: operation point (V_DD = 15 V)').font = BOLD
heads = ['V_GS (theory)', 'V_GS (measure)', 'V_DS (theory)', 'V_DS (measure)', 'Operation region',
         'g_m (theory)']
for j, t in enumerate(heads, start=1):
    col_head(ws6, r + 1, j, t)
S5 = '第二部分 共源放大器'
src = [(f'B{D0 + 3}', '0.000', 'V'), (f'C{D0 + 3}', '0.000', 'V'), (f'B{D0 + 4}', '0.000', 'V'),
       (f'C{D0 + 4}', '0.000', 'V'), None, (f'B{ROW_GM}', '0.000', 'mS')]
for j, s in enumerate(src, start=1):
    if s is None:
        put(ws6, r + 2, j, f"=IF('{S5}'!C{D0 + 6}=\"\",\"\",'{S5}'!C{D0 + 6})", align='center')
    else:
        put(ws6, r + 2, j, link(S5, *s), align='center')
ws6.row_dimensions[r + 1].height = 30

r += 4
ws6.cell(row=r, column=1, value='6. Common-source amplifier: voltage gain (V_GS = 0.05 sin(2π·1000·t), V_DD = 15 V)').font = BOLD
heads = ['V_out (Max.) (theory)', 'V_out (measure)', 'A_v (Max.) (theory)', 'A_v (calculation)',
         'g_m (calculation)']
for j, t in enumerate(heads, start=1):
    col_head(ws6, r + 1, j, t)
src = [(f'B{A0}', '0.0', 'mV'), (f'C{A0}', '0.0', 'mV'), (f'B{A0 + 1}', '0.00', ''),
       (f'C{A0 + 1}', '0.00', ''), (f'C{A0 + 2}', '0.000', 'mS')]
for j, s in enumerate(src, start=1):
    put(ws6, r + 2, j, link(S5, *s), align='center')
ws6.row_dimensions[r + 1].height = 30
note(ws6, r + 4, '講義 g_m 的單位寫 Ohm⁻¹；表中 mS = mA/V = 10⁻³ Ω⁻¹。')
for col in 'DEF':
    ws6.column_dimensions[col].width = 16
ws6.sheet_view.showGridLines = False

# 公式格由 Excel / LibreOffice 開啟時重新計算，避免預覽器沿用舊快取值。
wb.calculation.calcMode = 'auto'
wb.calculation.fullCalcOnLoad = True
wb.calculation.forceFullCalc = True

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if os.path.exists(OUT) and '--force' not in sys.argv:
    # 作者會直接在這個檔裡填數據、調格式，所以預設不覆蓋；要重產範本加 --force。
    sys.exit(f'{OUT} 已存在，未覆蓋（裡面可能有作者填的數據與格式）。確定要重產請加 --force。')
wb.save(OUT)
print('wrote', OUT, '（實驗一、二預報來自', '.raw）' if SRC_RAW else 'ltspice-pred.json）')
