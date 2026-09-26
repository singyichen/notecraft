#!/usr/bin/env python3
"""產生實驗課當天用的資料記錄簿 measured/Lab1-數據記錄.xlsx。

預報欄直接讀 LTspice 的 .raw，所以和筆記裡的數字同源；改了網表重跑本腳本即可。
黃底 = 當天要填的格子，其他欄位都是公式或預報值，填完數據圖就會自己更新。

用法：cd simulations/lab1 && .venv/bin/python build_record_xlsx.py
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
from ltraw import read_raw, stats  # noqa: E402

OUT = os.path.join(HERE, 'measured', 'Lab1-數據記錄.xlsx')

FONT = 'Arial'
FILL_IN = PatternFill('solid', fgColor='FFF2CC')     # 當天要填
FILL_HD = PatternFill('solid', fgColor='D9E2F3')     # 表頭
BLUE = Font(name=FONT, color='0000FF')               # 寫死的輸入（模擬值／講義值）
BLACK = Font(name=FONT)
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
NOTE = Font(name=FONT, size=9, color='808080')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def head(ws, row, labels, widths=None):
    for i, t in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=t)
        c.font = BOLD
        c.fill = FILL_HD
        c.border = BOX
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30


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


# ── 讀 LTspice 預報值 ────────────────────────────────────────────────────────
def lt_dc(fname, vnode, iscale, targets, inverted=False):
    _, st = read_raw(os.path.join(HERE, fname))
    s = st[0]
    vs, v, i = s['Vs'], s[vnode], s['I(D1)'] * iscale
    if inverted:
        i = -i
    idx = [int(np.argmin(np.abs(vs - t))) for t in targets]
    return [float(v[k]) for k in idx], [float(i[k]) for k in idx]


def lt_ac(fname, node, sub=None):
    _, st = read_raw(os.path.join(HERE, fname))
    s = st[0]
    sig = s[node] - s[sub] if sub else s[node]
    return stats(s['time'], sig)


def lt_steps(fname, node):
    _, st = read_raw(os.path.join(HERE, fname))
    return [stats(s['time'], s[node]) for s in st]


VS1 = [round(0.1 * k, 1) for k in range(1, 21)]
VS2 = list(range(1, 21))
LT1_VD, LT1_I = lt_dc('lab1-exp1-forward.raw', 'V(a)', 1e3, VS1)
LT2_VD, LT2_I = lt_dc('lab1-exp2-reverse.raw', 'V(k)', 1e9, VS2, inverted=True)
E3IN, E3OUT = lt_ac('lab1-exp3-halfwave.raw', 'V(in)'), lt_ac('lab1-exp3-halfwave.raw', 'V(out)')
E4IN = lt_ac('lab1-exp4-bridge.raw', 'V(a)', 'V(b)')
E4OUT = lt_ac('lab1-exp4-bridge.raw', 'V(p)')
E3RC = lt_steps('lab1-exp3-halfwave-rc.raw', 'V(out)')
E4RC = lt_steps('lab1-exp4-bridge-rc.raw', 'V(p)')

wb = Workbook()

# ── 說明 ────────────────────────────────────────────────────────────────────
ws = wb.active
ws.title = '說明'
title_block(ws, 'Lab 1 二極體實驗　數據記錄簿',
            '電子學實作系列第 3 週．App_Lab1.pdf 四個實驗．當天用筆電直接填', 6)
rows = [
    ('怎麼用', ''),
    ('1', '每個實驗一張工作表，只要填**黃底**的格子，其他欄位都是公式或預報值，不要覆蓋。'),
    ('2', '填一列，右邊的計算欄與下面的圖就會跟著更新；不必等全部填完才看得到對照。'),
    ('3', '藍色字是寫死的輸入：講義規格或 LTspice 模擬結果。黑色字是公式。'),
    ('4', '每張工作表下方都有圖，橫軸縱軸已經設好，實測與預報畫在同一張上直接對照。'),
    ('5', '當天上傳 E3 之前先存一份 xlsx；回家要跑 plot_measured.py 的話，把實驗一、二的'),
    ('', '　　前三欄另存成 measured/lab1-exp1-forward.csv、lab1-exp2-reverse.csv（逗號分隔）。'),
    ('', ''),
    ('填寫範例（實驗一）', ''),
]
r = 4
for a, b in rows:
    ws.cell(row=r, column=1, value=a).font = BOLD if a in ('怎麼用', '填寫範例（實驗一）') else BLACK
    ws.cell(row=r, column=2, value=b).font = BLACK
    r += 1
head(ws, r, ['Vs (V)', '實測 V_D (V)', '實測 I (mA)', '→ V_R (V)', '→ I 計算 (mA)', '→ 差異 (%)'],
     widths=[16, 16, 16, 14, 16, 14])
put(ws, r + 1, 1, 0.6, font=BLUE, fmt='0.0')
put(ws, r + 1, 2, 0.552, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 3, 0.05, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 4, 0.048, fmt='0.000')
put(ws, r + 1, 5, 0.048, fmt='0.000')
put(ws, r + 1, 6, -0.04, fmt='0.0%')
ws.cell(row=r + 2, column=1,
        value='↑ 這一列只是示範格式（電表讀 0.552 V／0.05 mA 就這樣填），正式表裡沒有這一列。').font = NOTE
ws.cell(row=r + 4, column=1, value='資料來源').font = BOLD
ws.cell(row=r + 5, column=1,
        value='預報欄由 simulations/lab1/*.raw（LTspice，真實 1N4007 模型）以 build_record_xlsx.py 產生；'
              '講義規格出自 App_Lab1.pdf。').font = NOTE
ws.sheet_view.showGridLines = False

# ── 實驗一：順偏 ────────────────────────────────────────────────────────────
ws = wb.create_sheet('實驗一 順偏')
title_block(ws, '實驗一：順偏導通電壓（Forward Bias: Knee Voltage）',
            '講義第 6 頁：Vs 每次加 0.1 V，記錄 V_D 與 I，畫出 I-V 特性曲線找導通電壓', 9)
ws['A4'] = '限流電阻 R (Ω)'
ws['A4'].font = BOLD
put(ws, 4, 2, 1000, font=BLUE, fmt='0')
ws['C4'] = '← 講義第 6 頁指定；改這一格，右邊的 I 計算欄會跟著變'
ws['C4'].font = NOTE

HDR1 = ['Vs (V)', '實測 V_D (V)', '實測 I (mA)\n【電表】', 'V_R = Vs − V_D (V)',
        'I = V_R / R (mA)', '電表 vs 計算\n差異 (%)', 'LTspice V_D (V)', 'LTspice I (mA)',
        'V_D 誤差 (%)']
head(ws, 6, HDR1, widths=[10, 14, 14, 16, 15, 14, 15, 15, 14])
r0 = 7
for k, vs in enumerate(VS1):
    r = r0 + k
    put(ws, r, 1, vs, font=BLUE, fmt='0.0')
    put(ws, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 3, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 4, f'=IF(B{r}="","",A{r}-B{r})', fmt='0.000')
    put(ws, r, 5, f'=IF(B{r}="","",(A{r}-B{r})/$B$4*1000)', fmt='0.000')
    put(ws, r, 6, f'=IF(OR(C{r}="",E{r}="",E{r}=0),"",(C{r}-E{r})/E{r})', fmt='0.0%')
    put(ws, r, 7, round(LT1_VD[k], 4), font=BLUE, fmt='0.000')
    put(ws, r, 8, round(LT1_I[k], 5), font=BLUE, fmt='0.000')
    put(ws, r, 9, f'=IF(OR(B{r}="",G{r}=0),"",(B{r}-G{r})/G{r})', fmt='0.0%')
rN = r0 + len(VS1) - 1
ws.cell(row=rN + 2, column=1,
        value='G、H 欄：LTspice 1N4007（lab1-exp1-forward.raw）在同一組 Vs 的模擬值，當預報用。'
              'F 欄兩者差太多通常是電表接成並聯。').font = NOTE

ch = ScatterChart()
ch.title = '實驗一 I-V 特性曲線：實測 vs LTspice 預報'
ch.style = 2
ch.x_axis.title = 'V_D (V)'
ch.y_axis.title = 'I (mA)'
ch.height, ch.width = 9, 17
s = Series(Reference(ws, min_col=3, min_row=r0, max_row=rN), Reference(ws, min_col=2, min_row=r0, max_row=rN),
           title='實測（電表）')
s.marker = Marker(symbol='circle', size=6)
s.graphicalProperties.line.noFill = True
ch.series.append(s)
s2 = Series(Reference(ws, min_col=8, min_row=r0, max_row=rN), Reference(ws, min_col=7, min_row=r0, max_row=rN),
            title='LTspice 1N4007（預報）')
s2.marker = Marker(symbol='none')
ch.series.append(s2)
ws.add_chart(ch, f'K6')

ch2 = ScatterChart()
ch2.title = '實驗一 V_D 對 Vs：過了導通電壓就幾乎不再上升'
ch2.style = 2
ch2.x_axis.title = 'Vs (V)'
ch2.y_axis.title = 'V_D (V)'
ch2.height, ch2.width = 9, 17
sa = Series(Reference(ws, min_col=2, min_row=r0, max_row=rN), Reference(ws, min_col=1, min_row=r0, max_row=rN),
            title='實測')
sa.marker = Marker(symbol='circle', size=6)
sa.graphicalProperties.line.noFill = True
ch2.series.append(sa)
sb = Series(Reference(ws, min_col=7, min_row=r0, max_row=rN), Reference(ws, min_col=1, min_row=r0, max_row=rN),
            title='LTspice')
sb.marker = Marker(symbol='none')
ch2.series.append(sb)
ws.add_chart(ch2, 'K25')

# ── 實驗二：逆偏 ────────────────────────────────────────────────────────────
ws = wb.create_sheet('實驗二 逆偏')
title_block(ws, '實驗二：逆偏（Reverse Bias）',
            '講義第 12 頁：Vs 每次加 1 V，記錄 V_D 與漏電流；電流表要用 µA 檔', 8)
ws['A4'] = 'datasheet 漏電流上限 (µA)'
ws['A4'].font = BOLD
put(ws, 4, 2, 5, font=BLUE, fmt='0.0')
ws['C4'] = '← 1N4007 datasheet 的 I_R 上限，圖上會畫成一條水平參考線'
ws['C4'].font = NOTE

HDR2 = ['Vs (V)', '實測 V_D (V)', '實測 I (µA)', 'Vs − V_D (V)',
        'LTspice V_D (V)', 'LTspice I (nA)', 'LTspice I (µA)', 'datasheet 上限 (µA)']
head(ws, 6, HDR2, widths=[10, 14, 14, 14, 15, 15, 15, 17])
r0 = 7
for k, vs in enumerate(VS2):
    r = r0 + k
    put(ws, r, 1, vs, font=BLUE, fmt='0')
    put(ws, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 3, None, fill=FILL_IN, fmt='0.000')
    put(ws, r, 4, f'=IF(B{r}="","",A{r}-B{r})', fmt='0.000')
    put(ws, r, 5, round(LT2_VD[k], 4), font=BLUE, fmt='0.000')
    put(ws, r, 6, round(LT2_I[k], 4), font=BLUE, fmt='0.000')
    put(ws, r, 7, f'=F{r}/1000', fmt='0.00000')
    put(ws, r, 8, '=$B$4', fmt='0.0')
rN = r0 + len(VS2) - 1
ws.cell(row=rN + 2, column=1,
        value='D 欄接近 0 代表電源加多少、二極體就吃多少，電阻上沒有壓降——逆偏接對了。'
              '實測電流若落在 0.1–2 µA，多半是電表 10 MΩ 輸入阻抗分走的，不是二極體漏電流。').font = NOTE

ch = ScatterChart()
ch.title = '實驗二 V_D 對 Vs：逆偏時 V_D 幾乎等於 Vs'
ch.style = 2
ch.x_axis.title = 'Vs (V)'
ch.y_axis.title = 'V_D (V)'
ch.height, ch.width = 9, 17
s = Series(Reference(ws, min_col=2, min_row=r0, max_row=rN), Reference(ws, min_col=1, min_row=r0, max_row=rN),
           title='實測')
s.marker = Marker(symbol='circle', size=6)
s.graphicalProperties.line.noFill = True
ch.series.append(s)
s2 = Series(Reference(ws, min_col=5, min_row=r0, max_row=rN), Reference(ws, min_col=1, min_row=r0, max_row=rN),
            title='LTspice')
s2.marker = Marker(symbol='none')
ch.series.append(s2)
ws.add_chart(ch, 'J6')

ch2 = ScatterChart()
ch2.title = '實驗二 漏電流對 Vs：實測、LTspice 與 datasheet 上限'
ch2.style = 2
ch2.x_axis.title = 'Vs (V)'
ch2.y_axis.title = 'I (µA)'
ch2.height, ch2.width = 9, 17
for col, name, mk in [(3, '實測', True), (7, 'LTspice 1N4007', False), (8, 'datasheet 上限 5 µA', False)]:
    sx = Series(Reference(ws, min_col=col, min_row=r0, max_row=rN),
                Reference(ws, min_col=1, min_row=r0, max_row=rN), title=name)
    sx.marker = Marker(symbol='circle' if mk else 'none', size=6)
    if mk:
        sx.graphicalProperties.line.noFill = True
    ch2.series.append(sx)
ws.add_chart(ch2, 'J25')


# ── 實驗三、四共用的純量表 ──────────────────────────────────────────────────
# 每一列是 (區段, 量測項目, LTspice 預報, 理想公式值, 說明, 數字格式)。
# 區段獨立成一欄，資料列才會連續——長條圖的資料範圍與類別範圍必須等長。
def scalar_sheet(name, title, sub, items, extras, note, chart_title):
    ws = wb.create_sheet(name)
    title_block(ws, title, sub, 7)
    head(ws, 4, ['區段', '量測項目', '實測', '預報（LTspice）', '理想公式', '誤差 (%)', '說明'],
         widths=[26, 26, 12, 16, 14, 12, 56])
    r0 = 5
    idx = {}
    for k, (sec, label, lt, ideal, memo, fmt) in enumerate(items):
        r = r0 + k
        idx[label if label not in idx else f'{label}#{r}'] = r
        idx[f'{sec}|{label}'] = r
        put(ws, r, 1, sec)
        put(ws, r, 2, label)
        put(ws, r, 3, None, fill=FILL_IN, fmt=fmt)
        put(ws, r, 4, lt, font=BLUE, fmt=fmt)
        put(ws, r, 5, ideal, font=BLUE, fmt=fmt)
        put(ws, r, 6, f'=IF(OR(C{r}="",D{r}=""),"",IF(D{r}=0,"",(C{r}-D{r})/D{r}))', fmt='0.0%')
        put(ws, r, 7, memo, font=NOTE)
    rN = r0 + len(items) - 1

    r = rN + 2
    for label, formula, lt, ideal, memo in extras(idx):
        put(ws, r, 1, '推算值')
        c = put(ws, r, 2, label); c.font = BOLD
        put(ws, r, 3, formula, fmt='0.0%')
        put(ws, r, 4, lt, font=BLUE, fmt='0.0%')
        put(ws, r, 5, ideal, font=BLUE, fmt='0.0%')
        put(ws, r, 6, f'=IF(OR(C{r}="",D{r}=""),"",IF(D{r}=0,"",(C{r}-D{r})/D{r}))', fmt='0.0%')
        put(ws, r, 7, memo, font=NOTE)
        r += 1
    ws.cell(row=r + 1, column=1, value=note).font = NOTE

    ch = BarChart()
    ch.type = 'col'
    ch.title = chart_title
    ch.style = 10
    ch.y_axis.title = '電壓 (V)'
    ch.height, ch.width = 10, 22
    ch.add_data(Reference(ws, min_col=3, max_col=4, min_row=4, max_row=rN), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=2, min_row=r0, max_row=rN))
    ws.add_chart(ch, 'A' + str(r + 3))
    return ws, idx


PI2 = 3.141592653589793 ** 2
E3_VP, E4_VP = 4.3, 1.1          # 理想輸出峰值：5 − 0.7、2.5 − 2×0.7

e3_items = [
    ('輸入 V_in', 'V_peak (V)', round(E3IN['peak'], 3), 5.0, '示波器 CH1 的 Maximum；10 Vpp 正弦的峰值', '0.000'),
    ('輸入 V_in', 'V_rms (V)', round(E3IN['rms'], 3), round(5 / 2 ** .5, 3), 'CH1 的 AC RMS；V_p / √2', '0.000'),
    ('輸出 無 C（第 18 頁）', 'V_peak (V)', round(E3OUT['peak'], 3), E3_VP, 'CH2 的 Maximum；理想 = 5 − V_D,on，用 0.7 V 估', '0.000'),
    ('輸出 無 C（第 18 頁）', 'V_rms (V)', round(E3OUT['rms'], 3), round(E3_VP / 2, 3), 'CH2 的 DC RMS；理想半波 V_p / 2（V_p 取理想輸出峰值 4.3 V）', '0.000'),
    ('輸出 無 C（第 18 頁）', 'V_avg (V)', round(E3OUT['avg'], 3), round(E3_VP / 3.141592653589793, 3), 'CH2 的 Average；理想半波 V_p / π', '0.000'),
    ('輸出 加 1 µF（第 20 頁）', 'V_peak (V)', round(E3RC[0]['peak'], 3), None, '峰值幾乎不變，變的是谷底', '0.000'),
    ('輸出 加 1 µF（第 20 頁）', 'V_rms (V)', round(E3RC[0]['rms'], 3), None, 'CH2 的 DC RMS。加了電容就不再是理想半波，V_p/2 不適用，所以理想欄留空', '0.000'),
    ('輸出 加 1 µF（第 20 頁）', 'V_avg (V)', round(E3RC[0]['avg'], 3), None, 'CH2 的 Average。漣波越小這一格越靠近 V_peak', '0.000'),
    ('輸出 加 1 µF（第 20 頁）', '漣波 V_R (V)', round(E3RC[0]['ripple'], 3), 7.2, '峰谷差。線性近似 V_p/(R·C·f) 在 1 µF 已失效，理想欄僅供對照', '0.000'),
]


def e3_extras(idx):
    a, m = idx['輸出 無 C（第 18 頁）|V_avg (V)'], idx['輸出 無 C（第 18 頁）|V_rms (V)']
    ac, mc = idx['輸出 加 1 µF（第 20 頁）|V_avg (V)'], idx['輸出 加 1 µF（第 20 頁）|V_rms (V)']
    return [('整流效率 η = V_avg² / V_rms²（無 C）',
             f'=IF(OR(C{a}="",C{m}="",C{m}=0),"",C{a}^2/C{m}^2)',
             round(E3OUT['avg'] ** 2 / E3OUT['rms'] ** 2, 4), round(4 / PI2, 4),
             f'填好第 {a} 列的 V_avg 與第 {m} 列的 V_rms 就會自己算；理想半波上限 4/π² = 40.5%'),
            ('整流效率 η（加 1 µF）',
             f'=IF(OR(C{ac}="",C{mc}="",C{mc}=0),"",C{ac}^2/C{mc}^2)',
             round(E3RC[0]['avg'] ** 2 / E3RC[0]['rms'] ** 2, 4), None,
             f'同一條定義套在第 {ac}、{mc} 列。濾波把 V_avg 推向 V_rms，效率因此大幅拉高；4/π² 是「沒有濾波」的上限，不能拿來比這一列')]


ws3, idx3 = scalar_sheet(
    '實驗三 半波', '實驗三：半波整流器（Half-wave Rectifier）',
    '講義第 18、20 頁：60 Hz、10 Vpp、1N4007、R = 10 kΩ、C = 1 µF',
    e3_items, e3_extras,
    '預報欄來自 lab1-exp3-halfwave.raw 與 lab1-exp3-halfwave-rc.raw（1 µF 那一步）。'
    '理想欄一律以理想輸出峰值 4.3 V 代入公式，所以和預報欄有系統性的差。',
    '實驗三：實測 vs LTspice 預報')

e4_items = [
    ('輸入 V_in（A–B）', 'V_peak (V)', round(E4IN['peak'], 3), 2.5, '5 Vpp 正弦的峰值。接地陷阱見筆記，不能兩支探棒同時跨輸入與輸出', '0.000'),
    ('輸入 V_in（A–B）', 'V_rms (V)', round(E4IN['rms'], 3), round(2.5 / 2 ** .5, 3), 'V_p / √2', '0.000'),
    ('輸出 無 C（第 25 頁）', 'V_peak (V)', round(E4OUT['peak'], 3), E4_VP, '理想 = 2.5 − 2×V_D,on，用 0.7 V 估', '0.000'),
    ('輸出 無 C（第 25 頁）', 'V_rms (V)', round(E4OUT['rms'], 3), round(E4_VP / 2 ** .5, 3), '理想全波 V_p′ / √2（V_p′ 取理想輸出峰值 1.1 V）', '0.000'),
    ('輸出 無 C（第 25 頁）', 'V_avg (V)', round(E4OUT['avg'], 3), round(2 * E4_VP / 3.141592653589793, 3), '理想全波 2V_p′ / π', '0.000'),
    ('輸出 加 1 µF（第 26 頁）', 'V_peak (V)', round(E4RC[0]['peak'], 3), None, 'Tinkercad 跑不動這一版，波形以示波器實測為準', '0.000'),
    ('輸出 加 1 µF（第 26 頁）', '漣波 V_R (V)', round(E4RC[0]['ripple'], 3), round(E4_VP / (2 * 10000 * 1e-6 * 60), 3), '理想 V_p′/(2·R_L·C·f)', '0.000'),
    ('輸出 加齊納（第 27 頁）', 'V_peak (V)', round(E4OUT['peak'], 3), None, '預報 = 和沒接齊納時相同：5 Vpp 下輸出峰值只有約 1.5 V，遠低於任何常見 V_Z，齊納不會導通', '0.000'),
    ('輸出 加齊納（第 27 頁）', 'V_drop (V)', None, None, '講義要記的「V_in < V_Z 期間的落差」。齊納沒導通就沒有削平，照實記錄觀察到的值', '0.000'),
]


def e4_extras(idx):
    a, m = idx['輸出 無 C（第 25 頁）|V_avg (V)'], idx['輸出 無 C（第 25 頁）|V_rms (V)']
    vp, vr = idx['輸出 加 1 µF（第 26 頁）|V_peak (V)'], idx['輸出 加 1 µF（第 26 頁）|漣波 V_R (V)']
    return [
        ('整流效率 η = V_avg² / V_rms²',
         f'=IF(OR(C{a}="",C{m}="",C{m}=0),"",C{a}^2/C{m}^2)',
         round(E4OUT['avg'] ** 2 / E4OUT['rms'] ** 2, 4), round(8 / PI2, 4),
         f'填好第 {a} 列的 V_avg 與第 {m} 列的 V_rms 就會自己算；理想全波上限 8/π² = 81.1%'),
        ('漣波比 V_R / V_p（加 1 µF）',
         f'=IF(OR(C{vr}="",C{vp}="",C{vp}=0),"",C{vr}/C{vp})',
         round(E4RC[0]['ripple'] / E4RC[0]['peak'], 4), round((E4_VP / (2 * 10000 * 1e-6 * 60)) / E4_VP, 4),
         f'講義要記的 Ratio 欄＝第 {vr} 列 ÷ 第 {vp} 列；設計準則 5–10%，1 µF 遠遠不夠'),
    ]


ws4, idx4 = scalar_sheet(
    '實驗四 橋式', '實驗四：全波橋式整流器與齊納穩壓（Full-wave Bridge / Zener）',
    '講義第 25–27 頁：60 Hz、5 Vpp、四顆 1N4007、R_L = 10 kΩ、C = 1 µF',
    e4_items, e4_extras,
    '預報欄來自 lab1-exp4-bridge.raw 與 lab1-exp4-bridge-rc.raw。齊納那一版的 LTspice 檔用的是'
    '講義第 24 頁的概念電路（±10 V、V_Z = 6.8 V），和第 27 頁的 5 Vpp 條件不同，所以不拿它當預報值。',
    '實驗四：實測 vs LTspice 預報')

for s in wb.worksheets:
    if s.title.startswith('實驗一') or s.title.startswith('實驗二'):
        s.freeze_panes = 'A7'

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print('wrote', OUT)

# ── 順便產生實驗三、四的純文字記錄範本 ──────────────────────────────────────
# 實驗一、二的量測是 I-V 掃描，範本是逐列的 CSV；實驗三、四量的是幾個純量，
# 範本就照 Excel 工作表的形狀輸出，填完可餵給 plot_measured.py --exp 3／4 畫對照圖。
import csv as _csv


def dump_csv(path, items, extras_rows):
    with open(path, 'w', newline='', encoding='utf-8') as fh:
        w = _csv.writer(fh)
        w.writerow(['區段', '量測項目', '實測', '預報_LTspice', '理想公式'])
        for sec, label, lt, ideal, _memo, _fmt in items:
            w.writerow([sec, label, '', '' if lt is None else lt, '' if ideal is None else ideal])
        for sec, label, lt, ideal in extras_rows:
            w.writerow([sec, label, '', lt, ideal])
    print('wrote', path)


dump_csv(os.path.join(HERE, 'measured', 'lab1-exp3-halfwave.csv'), e3_items,
         [('推算值', '整流效率 η（無 C）', round(E3OUT['avg'] ** 2 / E3OUT['rms'] ** 2, 4), round(4 / PI2, 4)),
          ('推算值', '整流效率 η（加 1 µF）', round(E3RC[0]['avg'] ** 2 / E3RC[0]['rms'] ** 2, 4), None)])
dump_csv(os.path.join(HERE, 'measured', 'lab1-exp4-bridge.csv'), e4_items,
         [('推算值', '整流效率 η', round(E4OUT['avg'] ** 2 / E4OUT['rms'] ** 2, 4), round(8 / PI2, 4)),
          ('推算值', '漣波比 V_R / V_p', round(E4RC[0]['ripple'] / E4RC[0]['peak'], 4),
           round((E4_VP / (2 * 10000 * 1e-6 * 60)) / E4_VP, 4))])
