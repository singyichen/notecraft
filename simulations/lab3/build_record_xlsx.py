#!/usr/bin/env python3
"""產生實驗課當天用的資料記錄簿 measured/Lab3-數據記錄.xlsx。

講義的五個量測都有一張表：第一部分的實驗一～四（特性曲線、轉移曲線、導通電阻、
LED 開關）與第二部分的共源級放大器，另附一張照講義版面排好、可直接貼進報告的
「交報告用」分頁。助教公告（11/7 六）當天至少要做完實驗一與實驗二。

**只有必做的實驗一、二按 Lab 1／Lab 2 的慣例加密到 0.5 V 一階**（實驗一 0～15 V 共 31 點、
實驗二 0～5 V 共 11 點＋抬頭段 24 列加密掃描）；
實驗三、四與第二部分維持講義版面的點數（選做，表格照樣給，做到哪填到哪）。

版面比照 Lab 1／Lab 2 的記錄簿：電壓逐列排、每組一個欄組、輸入欄（黃底）在左、
計算欄與模擬對照欄在右、相對偏差欄、凍結窗格、圖表放資料區右側（不壓到檢查表）、
每張表下方一份當天拍照檢查表。

預報欄的來源：
- 實驗一、二：直接讀 LTspice 的 .raw（含元件端 V_DS／V_GS）；.raw 不在時（.raw 不進
  版控）改讀 ltspice-pred.json。
- 實驗三～第二部分：讀 ltspice-pred.json（抄自對應網表的模擬結果，與筆記同源）。
讀到 .raw 時會順手把實驗一、二的數字寫回 ltspice-pred.json。

黃底 = 當天要填的格子，其他欄位都是公式或預報值，填完數據圖就會自己更新。

用法：cd simulations/lab3 && ../lab1/.venv/bin/python build_record_xlsx.py
      --update  讀舊檔裡已填的黃底格，按「分頁＋欄組＋電壓＋欄名」對應搬到新版後重產
                （不是按列號搬，所以加密後的新列不會錯位）
      --force   直接覆蓋，不保留舊檔內容（確定舊檔沒有資料時才用）
      不給旗標時檔案已存在就不動它。
"""
import json
import os
import shutil
import sys

from openpyxl import Workbook, load_workbook
from openpyxl.chart import Reference, ScatterChart, Series
from openpyxl.chart.marker import Marker
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'measured', 'Lab3-數據記錄.xlsx')
PRED_JSON = os.path.join(HERE, 'ltspice-pred.json')

FONT = 'Arial'
IN_RGB = ('FFF2CC', '00FFF2CC')
HD_RGB = ('D9E2F3', '00D9E2F3')
GP_RGB = ('EDF1F9', '00EDF1F9')
FILL_IN = PatternFill('solid', fgColor='FFF2CC')     # 當天要填
FILL_HD = PatternFill('solid', fgColor='D9E2F3')     # 表頭
FILL_GP = PatternFill('solid', fgColor='EDF1F9')     # 欄組標題
BLUE = Font(name=FONT, color='0000FF')               # 寫死的輸入（講義規格、模擬值）
BLACK = Font(name=FONT)
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
NOTE = Font(name=FONT, size=9, color='808080')
WARN = Font(name=FONT, size=9, bold=True, color='C00000')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MARK = '1F4E79'   # 實測點的顏色；點要明確給填色與邊線，否則 LibreOffice 重算存檔會把它寫成 noFill 而隱形
MARK2 = 'C00000'
# 同一張圖上有三、四組實測點，每組給一個顏色，否則圖例分不出來誰是誰
MARKS = ['1F4E79', 'C00000', '2E7D32', 'F28C28']

# ── 量測級距 ────────────────────────────────────────────────────────────────
# 實驗一、二（必做）：比照 Lab 1／Lab 2 記錄簿的做法，電壓從 0 起、每 0.5 V 一點。
# 講義第 7／9 頁只印了前兩列、其餘留白，那是版面不是點數上限。
VGS_GROUPS = [0.0, 2.0, 4.0, 6.0]                      # 實驗一：四組 V_GS 電源設定
# 實驗一掃到 15 V：V_GS = 6 V 那條的膝點在 3.8 V，只掃到 5 V 的話飽和段只剩 1.2 V，
# 看不出「平」這件事（而輸出特性曲線要看的就是這個）。元件完全撐得住——15 V 時
# 元件只分到 11.4 V × 3.6 mA = 41 mW，2N7000 的 P_D 上限是 400 mW；R1 只吃 13 mW。
VDS_ROWS = [round(0.5 * k, 1) for k in range(31)]      # 實驗一：0～15 V，每 0.5 V，共 31 點
VDS_GROUPS = [1.0, 3.0, 5.0]                           # 實驗二：三組 V_DS 電源設定
VGS_ROWS = [round(0.5 * k, 1) for k in range(11)]      # 實驗二：0～5 V，每 0.5 V，共 11 點
# 講義印好的那幾列（「交報告用」的摘要就取這幾點，和完整表並存）
VDS_HANDOUT = [1.0, 2.0, 3.0, 4.0, 5.0]
VGS_HANDOUT = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0]
# 加密掃描（求 V_th 用）：預填 BS170 的抬頭段當起點，當天照粗掃的結果整欄改掉
FINE_START, FINE_STEP, FINE_N = 1.90, 0.05, 24
FINE_ROWS = [round(FINE_START + FINE_STEP * k, 2) for k in range(FINE_N)]
# 選做的三張表維持講義版面
RON_VGS = [5.0, 10.0, 3.0, 4.0, 6.0, 8.0]
SW_VGS = [0.5, 1.0, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0]
SW_VDD = 8.0
R1_EXP1 = 1000.0                                       # 源極取樣電阻
R1_EXP2 = 100.0                                        # 汲極取樣電阻
# 外插取點的預設門檻（可在表上改）
FINE_LO_MA = 0.5          # 低於這個電流的點雜訊太大，不進迴歸
FINE_PLATEAU = 0.7        # I_D 超過「平台高度」的七成就當作已被 R1 限流

# ── 讀 LTspice 預報值 ────────────────────────────────────────────────────────
with open(PRED_JSON, encoding='utf-8') as fh:
    P = json.load(fh)


def _from_raw():
    """.raw 在的時候以它為準，並把實驗一、二的數字寫回快取。

    實驗一的 R1 串在源極，所以除了 I_D 還要把元件端的 V_DS、V_GS 一起抄出來
    （= V(d) − V(s) 與 V(g) − V(s)）：報告要畫的是元件端的橫軸，不是電源設定值。
    實驗二源極接地，V(d) 本身就是元件的 V_DS。
    """
    f1 = os.path.join(HERE, 'lab3-exp1-curves.raw')
    f2 = os.path.join(HERE, 'lab3-exp2-transfer.raw')
    if not (os.path.exists(f1) and os.path.exists(f2)):
        return False
    import numpy as np
    sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', 'tools')))
    from ltraw import read_raw
    _, e1 = read_raw(f1)
    _, e2 = read_raw(f2)
    # +0.0 把 -0.0 正規化成 0.0：V_DS = 0 那一列的電流是 -1e-17 等級，直接 round 會留下
    # 「-0.000」，表格與筆記看起來像量到負電流。
    ip = lambda xs, x, y: [round(float(v), 4) + 0.0 for v in np.interp(xs, x, y)]  # noqa: E731
    P['exp1_id_mA'] = [ip(VDS_ROWS, s['VDS'], -s['I(VDS)'] * 1e3) for s in e1]
    P['exp1_vds_dev'] = [ip(VDS_ROWS, s['VDS'], s['V(d)'] - s['V(s)']) for s in e1]
    P['exp1_vgs_dev'] = [ip(VDS_ROWS, s['VDS'], s['V(g)'] - s['V(s)']) for s in e1]
    P['exp2_id_mA'] = [ip(VGS_ROWS, s['VGS'], -s['I(VDS)'] * 1e3) for s in e2]
    P['exp2_vd'] = [ip(VGS_ROWS, s['VGS'], s['V(d)']) for s in e2]
    P['exp2_fine_vgs'] = FINE_ROWS
    P['exp2_fine_id_mA'] = [ip(FINE_ROWS, s['VGS'], -s['I(VDS)'] * 1e3) for s in e2]
    with open(PRED_JSON, 'w', encoding='utf-8') as fh:
        json.dump(P, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    return True


SRC_RAW = _from_raw()
missing = [k for k in ('exp1_id_mA', 'exp1_vds_dev', 'exp1_vgs_dev',
                       'exp2_id_mA', 'exp2_vd', 'exp2_fine_id_mA') if k not in P]
if missing:
    sys.exit(f'ltspice-pred.json 缺少 {missing}；請先跑 ../tools/run-lt.sh lab3-*.cir 再執行本腳本。')
for k in ('exp1_id_mA', 'exp1_vds_dev', 'exp1_vgs_dev'):
    if len(P[k][0]) != len(VDS_ROWS):
        sys.exit(f'{k} 有 {len(P[k][0])} 點、表格要 {len(VDS_ROWS)} 點：.raw 不在，快取是舊級距的，'
                 f'請先跑 ../tools/run-lt.sh lab3-exp1-curves.cir lab3-exp2-transfer.cir。')
for k in ('exp2_id_mA', 'exp2_vd'):
    if len(P[k][0]) != len(VGS_ROWS):
        sys.exit(f'{k} 有 {len(P[k][0])} 點、表格要 {len(VGS_ROWS)} 點（同上，請重跑 LTspice）。')
if P.get('exp2_fine_vgs') != FINE_ROWS:
    sys.exit('exp2_fine_vgs 與目前的加密掃描階梯不一致，請重跑 LTspice 產生 .raw 後再執行。')

PRED1, PRED2 = P['exp1_id_mA'], P['exp2_id_mA']
VDS_DEV, VGS_DEV, VD2 = P['exp1_vds_dev'], P['exp1_vgs_dev'], P['exp2_vd']
FINE_ID = P['exp2_fine_id_mA']
OP, AC = P['exp5_op'], P['exp5_ac']
GM_MODEL = P['exp5_small_signal']['gm_model_mA_V']
RO_MODEL = P['exp5_small_signal']['ro_Mohm']
GM_EFF = P['exp5_small_signal']['gm_eff_mA_V']


# ── 樣式小工具 ──────────────────────────────────────────────────────────────
def dot_series(ys, xs, title, color=MARK, symbol='circle'):
    """只畫點、不畫線的實測序列。"""
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol=symbol, size=7)
    s.marker.graphicalProperties.solidFill = color
    s.marker.graphicalProperties.line.solidFill = color
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


def note(ws, row, text, col=1, font=NOTE):
    ws.cell(row=row, column=col, value=text).font = font


def dev(meas, pred):
    """相對偏差公式：任一邊空白或預報為 0（截止區）時留白。"""
    return f'=IF(OR({meas}="",{pred}="",{pred}=0),"",({meas}-{pred})/{pred})'


def chart_y(src, gate):
    """圖表用的 y 值：量測格還空著就回 #N/A，讓圖「跳過」這一點而不是畫一個 0。

    直接拿 IF(...,"",...) 餵圖表會被 Excel／LibreOffice 當成 0，未量到的點會變成
    一排貼在零軸上的假資料；#N/A 才是「沒有這一點」。作者真的填 0 時 gate 不等於
    空字串，照樣會畫在 0 上。
    """
    return f'=IF({gate}="",NA(),{src})'


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
        ws.cell(row=row, column=col + k).fill = FILL_GP
    return c


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
    ch.x_axis.axPos, ch.y_axis.axPos = 'b', 'l'
    # LibreOffice／Excel 都會在「只有一條序列有資料」時把另一軸畫到奇怪的位置，
    # 明確要求顯示座標軸與刻度。
    ch.x_axis.delete, ch.y_axis.delete = False, False
    return ch


def printable(ws, last_col, last_row, landscape=True):
    """列印範圍：只框資料區與檢查表（圖放在資料區右邊，不進列印範圍）。"""
    ws.print_area = f'A1:{get_column_letter(last_col)}{last_row}'
    ws.page_setup.orientation = 'landscape' if landscape else 'portrait'
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0


# ── 舊檔的資料搬移（--update）────────────────────────────────────────────────
# 作者會直接在記錄簿裡填數據，而這次把實驗一、二從講義的 5／6 列加密到 11 列，
# 列號整個位移。所以搬移一律按「分頁＋欄組標題＋該列的電壓＋欄名」比對，不按列號；
# 對不上的格子會列出來而不是默默丟掉。
def _rgb(cell):
    f = cell.fill
    if f is None or f.fill_type != 'solid':
        return None
    return getattr(f.start_color, 'rgb', None)


def _norm(v):
    """列標籤正規化：數字一律寫成最短十進位（3.0 與 3 都變 "3"，0.50 變 "0.5"）。

    不正規化的話，openpyxl 從舊檔讀回來的 3 與新檔記憶體裡的 3.0 會被當成不同的列，
    搬移就會整組漏掉。
    """
    if v is None or v == '':
        return ''
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, (int, float)):
        return f'{float(v):g}'
    return str(v).strip()


def _left_label(ws, row, col):
    """同一列往左找第一個非空的文字，當成這個輸入格的標籤。"""
    for c in range(col - 1, 0, -1):
        v = ws.cell(row=row, column=c).value
        if isinstance(v, str) and v.strip() and not v.startswith('='):
            return v.strip()
    return ''


def _merged_left(ws, row, col):
    """合併儲存格只有左上角有值，往左找。"""
    for c in range(col, 0, -1):
        v = ws.cell(row=row, column=c).value
        if v not in (None, ''):
            return str(v).strip()
    return ''


def _contiguous(ws, hdr, row, col):
    """這個格子真的屬於 hdr 那張表嗎：中間每一列在同一欄都要有框線。

    不檢查的話，表格下方幾列之外的孤立輸入格（例如「V_in 峰值」）會被硬套上
    上面那張表的欄名，表格一改欄名就對不上、搬移時漏掉。
    """
    for rr in range(hdr + 1, row):
        if ws.cell(row=rr, column=col).border.left.style is None:
            return False
    return True


def scan_inputs(ws):
    """回傳 {語意鍵: (row, col)}：這張表所有黃底輸入格。

    語意鍵 = (欄組標題, 列標籤, 欄名)。在表格裡（上方有表頭列）的格子用
    「欄組＋列的第一欄值＋欄名」；孤立的輸入格（取樣電阻、元件值）用左邊的標籤。
    """
    hdr_rows = []
    for row in ws.iter_rows():
        if sum(1 for c in row if _rgb(c) in HD_RGB) >= 3:
            hdr_rows.append(row[0].row)
    out = {}
    for row in ws.iter_rows():
        for cell in row:
            if _rgb(cell) not in IN_RGB:
                continue
            above = [h for h in hdr_rows if h < cell.row]
            hdr = max(above) if above else None
            colname = ws.cell(row=hdr, column=cell.column).value if hdr else None
            if hdr is not None and _contiguous(ws, hdr, cell.row, cell.column) \
                    and isinstance(colname, str) and colname.strip():
                grp = ''
                if hdr - 1 >= 1 and any(_rgb(c) in GP_RGB for c in ws[hdr - 1]):
                    grp = _merged_left(ws, hdr - 1, cell.column)
                a = ws.cell(row=cell.row, column=1).value
                rowlab = _norm(a)
                if rowlab.startswith('='):          # 公式列不可靠，退回左邊標籤
                    rowlab = _left_label(ws, cell.row, cell.column)
                key = (grp, rowlab, colname.strip())
            else:
                key = ('', _left_label(ws, cell.row, cell.column), '')
            out.setdefault(key, (cell.row, cell.column))
    return out


def harvest(path):
    """讀舊檔，回傳 {(分頁, 語意鍵): 值}（只收真的有值的黃底格）。"""
    old = load_workbook(path, data_only=False)
    got = {}
    for ws in old:
        if ws.title == '說明':        # 說明頁的黃底格只是填寫範例，不是資料
            continue
        for key, (r, c) in scan_inputs(ws).items():
            v = ws.cell(row=r, column=c).value
            if v not in (None, ''):
                got[(ws.title, key)] = v
    return got


def replay(wb, got):
    """把舊值寫回新活頁簿對得上的格子；回傳 (搬移數, 對不上的鍵)。"""
    moved, lost = 0, []
    index = {}
    for ws in wb:
        if ws.title == '說明':
            continue
        for key, rc in scan_inputs(ws).items():
            index[(ws.title, key)] = (ws, rc)
    for k, v in sorted(got.items(), key=lambda kv: str(kv[0])):
        if k in index:
            ws, (r, c) = index[k]
            ws.cell(row=r, column=c, value=v)
            moved += 1
        else:
            lost.append((k, v))
    return moved, lost


wb = Workbook()

# ── 說明 ────────────────────────────────────────────────────────────────────
ws = wb.active
ws.title = '說明'
title_block(ws, 'Lab 3 MOSFET 實驗　數據記錄簿',
            '電子學實作系列第 9 週（11/7 六）．App_Lab3.pdf．五張記錄表＋交報告用．當天用筆電直接填', 7)
rows = [
    ('這份活頁簿的範圍', ''),
    ('已加密', f'實驗一：V_DS 電源 {VDS_ROWS[0]:g}～{VDS_ROWS[-1]:g} V、每 0.5 V 一點，{len(VDS_ROWS)} 點 × 4 組'),
    ('', f'　　實驗二：V_GS 電源 {VGS_ROWS[0]:g}～{VGS_ROWS[-1]:g} V、每 0.5 V 一點，{len(VGS_ROWS)} 點 × 3 組，'
         f'另加抬頭段 {FINE_N} 列加密掃描'),
    ('', '　　（取樣方式比照 Lab 1／Lab 2 的記錄簿：電壓逐列排；上限各自由本實驗的電路決定，見「量測注意」）'),
    ('未加密', '選做的實驗三、四與第二部分：維持講義版面的點數，表格照樣給，做到哪填到哪'),
    ('', ''),
    ('助教最低要求（必做）', ''),
    ('實驗一', '至少量一條導通的 I_D-V_DS 曲線，填表並畫出 I_D-V_DS 關係圖'),
    ('實驗二', '至少量一條導通的 I_D-V_GS 曲線，填表、畫圖並求出臨界電壓 V_th'),
    ('', ''),
    ('為了看清曲線「建議」補量（不是助教規定）', ''),
    ('實驗一', f'V_GS = 4 V 與 6 V 兩組各 {len(VDS_ROWS)} 點：兩條都導通，才看得出膝點往右移、飽和段是平的'),
    ('', '　　時間不夠時：0～6 V 照 0.5 V 一階（兩個膝點都在這裡），6～15 V 改成 1 V 一階就好'),
    ('', '　　V_GS = 0 V 那組量 3～5 點就好，當作「截止區電流為零」的證據'),
    ('', '　　V_GS = 2 V 這組「可能完全不導通」——2N7000 的 V_GS(th) 規格是 0.8～3.0 V，'),
    ('', '　　手上那顆若是 2.8 V 就整條貼零。先在 V_DS = 5 V 試一格，有電流才值得量完'),
    ('實驗二', f'V_DS = 5 V 那組 {len(VGS_ROWS)} 點（抬頭段最明顯）＋ 加密掃描；V_DS = 1／3 V 有時間再補'),
    ('', ''),
    ('怎麼用', ''),
    ('1', '每個實驗一張工作表，只要填黃底的格子，其他欄位都是公式或預報值，不要覆蓋。'),
    ('2', '填一列，右邊的計算欄、相對偏差與右側的圖就會跟著更新；不必等全部填完才看得到對照。'),
    ('3', '藍色字是寫死的輸入：講義規格或 LTspice 模擬結果。黑色字是公式。'),
    ('4', '電流一律由取樣電阻的壓降換算（I_D = V_R1 / R1），三用電表全程留在電壓檔；'),
    ('', '　　取樣電阻值寫在每張表最上面，開工前用三用電表量一次、改成實測值，換算欄會跟著動。'),
    ('5', '圖放在每張表資料區的右側（實驗一在 AR 欄起、實驗二在 AG 欄起），不會壓到下面的檢查表。'),
    ('6', '空著的量測格在圖上會被跳過（不是畫成 0）；真的量到 0 就填 0，圖上會正常畫在零軸。'),
    ('7', '實驗二最下面算出的 V_th 會自動帶到第二部分；沒量到時自動退回 LTspice 的 '
          f'{P["vth_model"]:g} V。'),
    ('8', '「交報告用」分頁同時給「講義版面的摘要」與「完整數據表」，摘要的取點方式寫在該頁。'),
    ('9', '離開實驗室前跑一次每張工作表下方的「當天拍照檢查表」。'),
    ('', ''),
    ('量測注意', ''),
    ('實驗一', 'R1 串在「源極」：電源讀數 V_GS、V_DS 都含 R1 壓降，不等於元件端點電壓。'),
    ('', f'　　掃到 {VDS_ROWS[-1]:g} V 是因為 V_GS = 6 V 那條的膝點在 3.8 V，只掃到 5 V 的話飽和段只剩 1.2 V，'),
    ('', '　　看不出「平」這件事。元件撐得住：15 V 時元件分到 11.4 V × 3.6 mA = 41 mW（上限 400 mW），'),
    ('', '　　R1 只吃 13 mW（1/4 W 的電阻）。膝點之後電流幾乎不動，那幾格讀得很快。'),
    ('', '　　表上已幫你算出 V_GS 元件 與 V_DS 元件 兩欄，報告要畫元件端的圖就用這兩欄。'),
    ('實驗一的圖', '右側有三張圖，意思不同，不要交錯：'),
    ('', '　　圖 1「固定閘極電源設定」= 你真正量到的東西（橫軸 = V_DS 電源設定值）。'),
    ('', '　　圖 2 換成元件端橫軸，但同一條線上的 V_GS 元件 一直在變（見圖 3），'),
    ('', '　　　　所以它不是教科書那種「固定 V_GS 的輸出特性曲線」，是自偏壓軌跡。'),
    ('', '　　圖 3 畫 V_GS 元件 沿掃描的漂移，就是用來證明圖 2 的 V_GS 不是定值。'),
    ('', '　　真要畫固定元件 V_GS 的曲線，只有兩條路：源極接地（就是實驗二的接法），'),
    ('', '　　　　或每一點都回頭調閘極電源，讓 V_GS 電源 − V_R1 維持同一個值。'),
    ('實驗二', 'R1 串在「汲極」、源極接地：電源讀數 V_GS 就是元件真正的 V_GS，量到的 V_D 就是元件的 V_DS。'),
    ('', f'　　V_GS 一過 3 V 電流就被 R1 鎖在 V_DS/100 Ω（5 V 組約 48 mA），R1 要吃掉約 '
          f'{4.8 ** 2 / 100:.2f} W，'),
    ('', '　　而零件表給的是 1/4 W——整個平台段都在額定上，不是只有最後一格。量完一格就把'),
    ('', '　　V_GS 轉回 0，電阻燙手就先停。上限停在 5 V 是因為平台不含元件資訊，再往上只是加熱。'),
    ('求 V_th 的流程', '① 先用粗掃表（0.5 V 一階）找出電流在哪兩格之間跳起來；'),
    ('', '② 回到那一段，用 0.05～0.1 V 一階重掃，填進「加密掃描」區（V_GS 欄預填的是'),
    ('', '　　BS170 的 1.90～3.05 V，當天照自己的元件整欄改掉）；'),
    ('', '③ 加密到「可用」的點至少有三、四個（電流落在門檻與平台之間）才去外插；'),
    ('', '④ 外插結果為正不代表取點正確——要看旁邊的合理性檢查與 √I_D 圖是否成直線。'),
    ('實驗三', 'CH2 改成定電流 10 mA：電流限制設 10 mA、電壓上限設 2～3 V（整圈只需約 1.05 V），'),
    ('', '　　確認面板 CC 指示燈亮起再量。不要把電壓旋到最大——CC 沒生效時整個電壓會壓在元件上。'),
    ('', '　　V_R1 應恆為 1 V 左右；若 CC 燈不亮或讀數亂跳，請助教幫忙設電源，不要自己加大電壓。'),
    ('實驗四', 'LED 平邊短腳（陰極）朝汲極；R1 串在源極，所以同樣量 R1 壓降換算 I_D'),
    ('第二部分', '先量直流（訊號產生器關掉），V_D 在 4～9 V 之間再接訊號；兩通道地夾都接電路的地'),
    ('元件', '2N7000 規格書的 V_GS(th) 範圍是 0.8～3.0 V；LTspice 用的是 BS170（同族替身，'),
    ('', f'　　V_to = {P["vth_model"]:g} V），只拿來對形狀與量級，不是你那顆的值'),
    ('', ''),
    ('填寫範例（實驗一，V_GS 電源 = 4 V、V_DS 電源設定 3 V）', ''),
]
r = 4
for a, b in rows:
    bold = a in ('這份活頁簿的範圍', '助教最低要求（必做）', '怎麼用', '量測注意',
                 '為了看清曲線「建議」補量（不是助教規定）') or a.startswith('填寫範例')
    ws.cell(row=r, column=1, value=a).font = BOLD if bold else BLACK
    ws.cell(row=r, column=2, value=b).font = BLACK
    r += 1
head(ws, r, ['V_DS 設定 (V)', '實測 V_R1 (V)', '→ I_D (mA)', '→ V_GS 元件 (V)', '→ V_DS 元件 (V)',
             'LTspice I_D (mA)', '→ 相對偏差 (%)'],
     widths=[16, 16, 14, 16, 16, 16, 14])
ex_vr1 = 1.62
ex_pred = PRED1[2][VDS_ROWS.index(3.0)]
put(ws, r + 1, 1, 3.0, font=BLUE, fmt='0.0')
put(ws, r + 1, 2, ex_vr1, fill=FILL_IN, fmt='0.000')
put(ws, r + 1, 3, ex_vr1, fmt='0.000')
put(ws, r + 1, 4, 4.0 - ex_vr1, fmt='0.000')
put(ws, r + 1, 5, 3.0 - ex_vr1, fmt='0.000')
put(ws, r + 1, 6, ex_pred, font=BLUE, fmt='0.000')
put(ws, r + 1, 7, (ex_vr1 - ex_pred) / ex_pred, fmt='0.0%')
note(ws, r + 2, '↑ 這一列只是示範格式（量到 R1 兩端 1.62 V 就只填這一格，其餘自動算），正式表裡沒有這一列。')
note(ws, r + 3, '相對偏差 = (實測 − LTspice) / LTspice。截止區預報是 0，那幾格留白是正常的。')
ws.cell(row=r + 5, column=1, value='資料來源').font = BOLD
note(ws, r + 6, '預報欄由 simulations/lab3/build_record_xlsx.py 產生：實驗一、二讀 LTspice .raw（含元件端 '
                'V_DS／V_GS；.raw 不在時讀 ltspice-pred.json），實驗三～第二部分讀 ltspice-pred.json；'
                f'模型是 BS170（V_to = {P["vth_model"]:g} V）。')
note(ws, r + 7, '表格欄位出自 App_Lab3.pdf 第 7、9、10、12、20 頁；講義只印了前一兩列，其餘留白——'
                '那是版面不是點數上限，實驗一、二的級距改照 Lab 1／Lab 2 的做法由 0 V 起、每 0.5 V 一點。')
note(ws, r + 8, '改了網表要重跑 ../tools/run-lt.sh 與本腳本，預報欄才會同步；'
                '換了電阻值只改表上那一格不會動到預報欄（預報是該電阻條件下的模擬值）。')
ws.column_dimensions['A'].width = 24
ws.column_dimensions['B'].width = 16
ws.sheet_view.showGridLines = False
# 說明頁的長句寫在 A 欄、往右溢出，列印範圍要留到 N 欄才不會被切掉
printable(ws, 14, r + 8, landscape=False)


# ── 實驗一：輸出特性曲線 ─────────────────────────────────────────────────────
ws1 = wb.create_sheet('實驗一 特性曲線')
title_block(ws1, '實驗一　輸出特性曲線 I_D-V_DS（講義第 6–7 頁）．必做',
            f'R1 = 1 kΩ 串在源極．V_DS 電源 {VDS_ROWS[0]:g}～{VDS_ROWS[-1]:g} V、每 0.5 V 一點（{len(VDS_ROWS)} 點）．'
            '填 R1 壓降，I_D 與元件端電壓自動換算．V_GS = 0 V 那組全是 0 是正常的（截止區）', 14)
R_ROW = 4                     # 取樣電阻值（可改，所有換算欄跟著動）
HDR = 6                       # 欄組標題列
SUB = 7                       # 欄名列
R0 = 8                        # 第一列資料
RN = R0 + len(VDS_ROWS) - 1
RCELL1 = '$B$4'
G1 = 8                        # 每組欄數
H1 = 35                       # 圖表用欄位的起始欄
CH1COL = 44                   # 圖表錨點欄（AR）

ws1.cell(row=R_ROW, column=1, value='源極取樣電阻 R1 (Ω)').font = BOLD
put(ws1, R_ROW, 2, R1_EXP1, fill=FILL_IN, fmt='0')
note(ws1, R_ROW, '← 講義指定 1 kΩ；開工前量一次改成實測值，所有 I_D 與元件電壓欄會跟著變'
                 '（藍色的 LTspice 欄不會動——那是 1 kΩ 條件下的模擬值）', col=3)
note(ws1, 5, '→ 右側 AR 欄起有三張圖：①電源設定橫軸（你真正量到的）②元件端橫軸（自偏壓軌跡，'
             '不是固定 V_GS 的輸出特性曲線）③V_GS 元件 沿掃描的漂移。差別見「說明」分頁。')

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
    col_head(ws1, SUB, c0 + 5, 'LTspice V_DS 元件 (V)', width=12)
    col_head(ws1, SUB, c0 + 6, 'LTspice V_GS 元件 (V)', width=12)
    col_head(ws1, SUB, c0 + 7, '相對偏差 (%)', width=10)
ws1.row_dimensions[SUB].height = 34

# 圖表用欄位（#N/A 版本），放資料區右邊、獨立一塊
group_head(ws1, HDR, H1, 2 * len(VGS_GROUPS), '圖表用（公式，不要填；量測格空著時回 #N/A，圖就跳過該點）')
for g, vgs in enumerate(VGS_GROUPS):
    col_head(ws1, SUB, H1 + 2 * g, f'圖 I_D（V_GS={vgs:g}V）', width=14)
    col_head(ws1, SUB, H1 + 2 * g + 1, f'圖 V_GS 元件（V_GS={vgs:g}V）', width=14)

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
        put(ws1, r, c0 + 5, VDS_DEV[g][i], font=BLUE, fmt='0.000')
        put(ws1, r, c0 + 6, VGS_DEV[g][i], font=BLUE, fmt='0.000')
        put(ws1, r, c0 + 7, dev(idc, f'{get_column_letter(c0 + 4)}{r}'), fmt='0.0%')
        put(ws1, r, H1 + 2 * g, chart_y(idc, vr1), fmt='0.000')
        put(ws1, r, H1 + 2 * g + 1, chart_y(f'{get_column_letter(c0 + 2)}{r}', vr1), fmt='0.000')

rn = RN + 2
note(ws1, rn, '助教的最低要求是「至少一條導通的」。建議量 V_GS = 4 V 與 6 V 兩組（兩條都確定導通）；'
              'V_GS = 0 V 那組量 3～5 點當截止證據就好。', font=BOLD)
note(ws1, rn + 1, 'V_GS = 2 V 這組可能整條貼零：2 V 只比 BS170 的 V_to 低一點（預報只有十幾 µA），'
                  '而 2N7000 的 V_GS(th) 規格範圍是 0.8～3.0 V——手上那顆偏高就完全不導通，偏低就很導通。'
                  '先在 V_DS = 5 V 試一格再決定要不要量完，不要先假設它會導通。')
note(ws1, rn + 2, '只要量 R1 的壓降這一個電壓就夠：汲極直接接在 CH2 上，V_D 必定等於電源設定值，'
                  '所以元件真正的 V_GS 與 V_DS 都可以由 V_R1 減出來（右邊兩欄已自動算好）。')
note(ws1, rn + 3, 'V_GS = 6 V 在低 V_DS 時每加 0.5 V 電流約多 0.5 mA，那是 1 kΩ 的斜率、'
                  '不是元件的三極管電阻；曲線要到 V_DS 設定約 3.8 V 之後才轉平（V_GS = 4 V 的膝點在約 1.8 V）。')
note(ws1, rn + 4, '膝點之後那一長段幾乎是水平線（LTspice 從 8 V 到 15 V 只多十幾 µA）——那正是'
                  '「飽和區是電流源」的證據，也是掃到 15 V 的理由。讀數不會動，那幾格很快。')
note(ws1, rn + 5, '圖 2（元件端橫軸）只是把同一組數據換了橫軸，不會讓 V_GS 元件 變成定值：'
                  '同一條線上 V_GS 元件 從設定值一路掉到 2.3～2.4 V（圖 3 就是畫這件事）。'
                  '所以圖 2 要標成「自偏壓軌跡」，不能當成教科書的固定 V_GS 輸出特性曲線交出去。', font=WARN)
note(ws1, rn + 6, '想要真正固定元件 V_GS 的輸出特性曲線：要嘛把源極接地（那就是實驗二的電路），'
                  '要嘛每換一個 V_DS 就回頭微調 CH1，讓 V_GS 電源 − V_R1 維持同一個目標值（逐點迭代）。'
                  '講義的電路沒有要求做到這件事，結報把限制寫清楚即可。')

xs_set = Reference(ws1, min_col=1, min_row=R0, max_row=RN)
ch1 = scatter('圖 1　I_D-V_DS（固定閘極電源設定；這是實際量到的東西）', 'V_DS 電源設定 (V)', 'I_D (mA)')
for g, vgs in enumerate(VGS_GROUPS):
    c0 = 2 + g * G1
    ch1.series.append(dot_series(Reference(ws1, min_col=H1 + 2 * g, min_row=R0, max_row=RN),
                                 xs_set, f'實測 V_GS 設定={vgs:g}V', color=MARKS[g % len(MARKS)]))
    ch1.series.append(line_series(Reference(ws1, min_col=c0 + 4, min_row=R0, max_row=RN),
                                  xs_set, f'LTspice V_GS 設定={vgs:g}V'))
ws1.add_chart(ch1, f'{get_column_letter(CH1COL)}{HDR}')

ch2 = scatter('圖 2　I_D-V_DS（元件端橫軸；自偏壓軌跡，V_GS 元件 沿線在變）',
              'V_DS 元件 (V)', 'I_D (mA)')
for g, vgs in enumerate(VGS_GROUPS):
    c0 = 2 + g * G1
    ch2.series.append(dot_series(Reference(ws1, min_col=H1 + 2 * g, min_row=R0, max_row=RN),
                                 Reference(ws1, min_col=c0 + 3, min_row=R0, max_row=RN),
                                 f'實測 V_GS 設定={vgs:g}V', color=MARKS[g % len(MARKS)]))
    ch2.series.append(line_series(Reference(ws1, min_col=c0 + 4, min_row=R0, max_row=RN),
                                  Reference(ws1, min_col=c0 + 5, min_row=R0, max_row=RN),
                                  f'LTspice V_GS 設定={vgs:g}V'))
ws1.add_chart(ch2, f'{get_column_letter(CH1COL)}{HDR + 21}')

ch3 = scatter('圖 3　V_GS 元件 沿掃描的漂移（圖 2 不是固定 V_GS 的證據）',
              'V_DS 電源設定 (V)', 'V_GS 元件 (V)', h=9)
for g, vgs in enumerate(VGS_GROUPS):
    c0 = 2 + g * G1
    ch3.series.append(dot_series(Reference(ws1, min_col=H1 + 2 * g + 1, min_row=R0, max_row=RN),
                                 xs_set, f'實測 V_GS 設定={vgs:g}V', color=MARKS[g % len(MARKS)]))
    ch3.series.append(line_series(Reference(ws1, min_col=c0 + 6, min_row=R0, max_row=RN),
                                  xs_set, f'LTspice V_GS 設定={vgs:g}V'))
ws1.add_chart(ch3, f'{get_column_letter(CH1COL)}{HDR + 42}')

end1 = checklist(ws1, rn + 8, [
    ('至少一條導通曲線填完', f'建議 V_GS = 4 V 或 6 V，{len(VDS_ROWS)} 個 V_DS 都量'),
    ('V_GS = 2 V 試過一格並記下結果', '導通或不導通都要寫進結報（元件離散度的證據）'),
    ('V_GS = 0 V 的截止證據 1 張', 'R1 壓降接近 0 的電表畫面'),
    ('接線照片 1 張', '看得到 R1 在源極、CH1 接閘極、CH2 接汲極'),
    ('圖 1 截圖', '收工前確認點的形狀：先上升、後變平'),
    ('圖 3 看過一眼', 'V_GS 元件 真的在掉，才知道圖 2 要怎麼標'),
])
ws1.freeze_panes = f'B{R0}'
ws1.sheet_view.showGridLines = False
printable(ws1, 1 + G1 * len(VGS_GROUPS), end1)


# ── 實驗二：轉移特性曲線 ─────────────────────────────────────────────────────
ws2 = wb.create_sheet('實驗二 轉移曲線')
title_block(ws2, '實驗二　轉移特性曲線 I_D-V_GS 與臨界電壓（講義第 8–9 頁）．必做',
            f'R1 = 100 Ω 串在汲極、源極接地．V_GS 電源 {VGS_ROWS[0]:g}～{VGS_ROWS[-1]:g} V、每 0.5 V 一點（{len(VGS_ROWS)} 點）'
            '＋抬頭段加密掃描．填汲極對地電壓 V_D 或 R1 壓降，I_D 自動換算', 14)
RCELL2 = '$B$4'
G2 = 6
H2 = 21                       # 圖表用欄位
FCHART = 24                   # 加密掃描的圖表用欄（列印範圍外）
REF2 = 25                     # LTspice 抬頭段參考區
CH2COL = 33                   # 圖表錨點欄（AG）
RN2 = R0 + len(VGS_ROWS) - 1

ws2.cell(row=R_ROW, column=1, value='汲極取樣電阻 R1 (Ω)').font = BOLD
put(ws2, R_ROW, 2, R1_EXP2, fill=FILL_IN, fmt='0')
note(ws2, R_ROW, '← 講義指定 100 Ω；開工前量一次改成實測值，所有 I_D 換算欄會跟著變'
                 '（藍色的 LTspice 欄不會動——那是 100 Ω 條件下的模擬值）', col=3)
note(ws2, 5, '→ 右側 AG 欄起有兩張圖（粗掃的 I_D-V_GS、加密掃描的 √I_D-V_GS）；'
             'Y 欄起是 LTspice 抬頭段的參考曲線。')

col_head(ws2, SUB, 1, 'V_GS 設定 (V)', width=14)
ws2.cell(row=HDR, column=1).border = BOX
for g, vds in enumerate(VDS_GROUPS):
    c0 = 2 + g * G2
    group_head(ws2, HDR, c0, G2, f'V_DS 設定 = {vds:g} V')
    col_head(ws2, SUB, c0, '實測 V_D (V)', width=12)
    col_head(ws2, SUB, c0 + 1, '實測 V_R1 (V)', width=12)
    col_head(ws2, SUB, c0 + 2, 'I_D (mA)', width=11)
    col_head(ws2, SUB, c0 + 3, 'LTspice I_D (mA)', width=12)
    col_head(ws2, SUB, c0 + 4, 'LTspice V_D (V)', width=12)
    col_head(ws2, SUB, c0 + 5, '相對偏差 (%)', width=10)
ws2.row_dimensions[SUB].height = 34

group_head(ws2, HDR, H2, len(VDS_GROUPS), '圖表用（公式，不要填；空著回 #N/A）')
for g, vds in enumerate(VDS_GROUPS):
    col_head(ws2, SUB, H2 + g, f'圖 I_D（V_DS={vds:g}V）', width=14)

for i, vgs in enumerate(VGS_ROWS):
    r = R0 + i
    put(ws2, r, 1, vgs, fmt='0.0', align='center')
    for g, vds in enumerate(VDS_GROUPS):
        c0 = 2 + g * G2
        put(ws2, r, c0, None, fill=FILL_IN, fmt='0.000')
        put(ws2, r, c0 + 1, None, fill=FILL_IN, fmt='0.000')
        vd = f'{get_column_letter(c0)}{r}'
        vr1 = f'{get_column_letter(c0 + 1)}{r}'
        idc = f'{get_column_letter(c0 + 2)}{r}'
        # lab2 的做法：優先用直接量到的 R1 壓降，沒填時才用 (V_DS − V_D) 減出來
        put(ws2, r, c0 + 2,
            f'=IF({vr1}<>"",{vr1}/{RCELL2}*1000,IF({vd}<>"",({vds}-{vd})/{RCELL2}*1000,""))',
            fmt='0.000')
        put(ws2, r, c0 + 3, PRED2[g][i], font=BLUE, fmt='0.000')
        put(ws2, r, c0 + 4, VD2[g][i], font=BLUE, fmt='0.000')
        put(ws2, r, c0 + 5, dev(idc, f'{get_column_letter(c0 + 3)}{r}'), fmt='0.0%')
        # 兩欄任一有值就算量到了
        put(ws2, r, H2 + g, f'=IF(AND({vd}="",{vr1}=""),NA(),{idc})', fmt='0.000')

# LTspice 抬頭段參考（給 √I_D 圖當對照線）
group_head(ws2, HDR, REF2, 1 + 2 * len(VDS_GROUPS),
           'LTspice 抬頭段參考（BS170；不是你那顆元件的值）')
col_head(ws2, SUB, REF2, 'V_GS (V)', width=10)
for g, vds in enumerate(VDS_GROUPS):
    col_head(ws2, SUB, REF2 + 1 + 2 * g, f'I_D @{vds:g}V (mA)', width=12)
    col_head(ws2, SUB, REF2 + 2 + 2 * g, f'√I_D @{vds:g}V', width=11)
for i, vgs in enumerate(FINE_ROWS):
    r = R0 + i
    put(ws2, r, REF2, vgs, font=BLUE, fmt='0.00', align='center')
    for g in range(len(VDS_GROUPS)):
        v = FINE_ID[g][i]
        put(ws2, r, REF2 + 1 + 2 * g, v, font=BLUE, fmt='0.000')
        put(ws2, r, REF2 + 2 + 2 * g, round(v ** 0.5, 4) if v > 0 else None,
            font=BLUE, fmt='0.000')
REFN = R0 + len(FINE_ROWS) - 1

rc = RN2 + 2
note(ws2, rc, '兩欄電壓量其中一個就夠，兩個都量是為了當場對帳：V_D + V_R1 應該等於該組的 V_DS 設定值，'
              '對不起來就是有一次量錯。I_D 欄優先用 V_R1，沒填時自動改用 (V_DS − V_D)/R1。')
note(ws2, rc + 1, '源極已接地，所以 V_D 就是元件真正的 V_DS、電源設定的 V_GS 就是元件真正的 V_GS，不用再減。'
                  '這是實驗二和實驗一最關鍵的差別：只有這個接法的橫軸才是元件自己的 V_GS。')
note(ws2, rc + 2, f'三組的平台高度約等於 V_DS / {R1_EXP2:g} Ω（約 '
                  f'{"／".join(f"{v / R1_EXP2 * 1000:.0f}" for v in VDS_GROUPS)} mA），'
                  '那是 R1 在限流、不是元件飽和；要讀的資訊全在抬頭那一段。')
note(ws2, rc + 3, f'V_GS 一過 3 V 電流就被 R1 鎖在 V_DS/100 Ω（5 V 組約 48 mA），R1 要吃掉約 '
                  f'{4.8 ** 2 / R1_EXP2:.2f} W，而零件表給的是 1/4 W——整個平台段都在額定上，'
                  '不是只有最後一格。量完一格就把 V_GS 轉回 0，電阻燙手就先停。'
                  '上限停在 5 V 是因為平台不含元件資訊（高度只由 R1 決定），再往上只是加熱，'
                  '和實驗一掃到 15 V 的理由剛好相反。', font=WARN)
note(ws2, rc + 4, '0.5 V 一階在抬頭段只會落到一兩個點（預報在 2.0→2.5 V 之間從 0.02 mA 跳到 6 mA），'
                  '所以求 V_th 一定要用下面的加密掃描。')

# ── 加密掃描（求 V_th）──────────────────────────────────────────────────────
rf = RN2 + 8
ws2.cell(row=rf, column=1, value='加密掃描（求 V_th 用）').font = BOLD
ws2.cell(row=rf + 1, column=1, value='選用的 V_DS 電源設定 (V)').font = BOLD
put(ws2, rf + 1, 2, 5.0, fill=FILL_IN, fmt='0.0')
note(ws2, rf + 1, '← 建議用 5 V 那組（抬頭段最陡、落點最多）；換組就改這一格', col=3)
ws2.cell(row=rf + 2, column=1, value='迴歸採用的 I_D 下限 (mA)').font = BOLD
put(ws2, rf + 2, 2, FINE_LO_MA, fill=FILL_IN, fmt='0.00')
note(ws2, rf + 2, '← 低於這個電流的點雜訊太大，不進迴歸', col=3)
ws2.cell(row=rf + 3, column=1, value='視為 R1 限流平台的 I_D 比例').font = BOLD
put(ws2, rf + 3, 2, FINE_PLATEAU, fill=FILL_IN, fmt='0.00')
note(ws2, rf + 3, '← I_D 超過「平台高度 × 這個比例」就當作已被 R1 限流，不進迴歸', col=3)
VDSSEL = f'$B${rf + 1}'
LOMA = f'$B${rf + 2}'
PLAT = f'$B${rf + 3}'

FHDR = rf + 5
FSUB = rf + 6
F0 = FSUB + 1
FN = F0 + FINE_N - 1
group_head(ws2, FHDR, 1, 9, '加密掃描（0.05～0.1 V 一階；V_GS 欄預填 BS170 的抬頭段，當天整欄改成自己的範圍）')
for j, (t, w) in enumerate([('V_GS 設定 (V)', 14), ('實測 V_D (V)', 13), ('實測 V_R1 (V)', 13),
                            ('I_D (mA)', 11), ('√I_D', 10), ('平台比', 10), ('取點判定', 22),
                            ('迴歸用 V_GS', 12), ('迴歸用 √I_D', 12)], start=1):
    col_head(ws2, FSUB, j, t, width=w)
# 圖表用的 #N/A 欄放到列印範圍外（X 欄），不然空白的活頁簿印出來會是一排 #N/A
col_head(ws2, FSUB, FCHART, '圖用 √I_D', width=12)
ws2.row_dimensions[FSUB].height = 30
for i, vgs in enumerate(FINE_ROWS):
    r = F0 + i
    put(ws2, r, 1, vgs, fill=FILL_IN, fmt='0.00', align='center')
    put(ws2, r, 2, None, fill=FILL_IN, fmt='0.000')
    put(ws2, r, 3, None, fill=FILL_IN, fmt='0.000')
    put(ws2, r, 4, f'=IF(A{r}="","",IF(C{r}<>"",C{r}/{RCELL2}*1000,'
                   f'IF(AND(B{r}<>"",{VDSSEL}<>""),({VDSSEL}-B{r})/{RCELL2}*1000,"")))', fmt='0.000')
    put(ws2, r, 5, f'=IF(OR(D{r}="",NOT(ISNUMBER(D{r}))),"",IF(D{r}<=0,"",SQRT(D{r})))', fmt='0.000')
    put(ws2, r, 6, f'=IF(OR(D{r}="",NOT(ISNUMBER(D{r})),{VDSSEL}=""),"",'
                   f'D{r}/({VDSSEL}/{RCELL2}*1000))', fmt='0.00')
    put(ws2, r, 7, f'=IF(OR(D{r}="",NOT(ISNUMBER(D{r}))),"",'
                   f'IF(D{r}<0,"電流為負，量錯了",'
                   f'IF(D{r}=0,"零電流（還在截止區）",'
                   f'IF(F{r}>{PLAT},"平台（被 R1 限流）",'
                   f'IF(D{r}<{LOMA},"電流太小（雜訊大）","可用")))))')
    put(ws2, r, 8, f'=IF(G{r}="可用",A{r},"")', fmt='0.00')
    put(ws2, r, 9, f'=IF(G{r}="可用",E{r},"")', fmt='0.000')
    put(ws2, r, FCHART, f'=IF(E{r}="",NA(),E{r})', fmt='0.000')
note(ws2, FN + 1, '做法：① 先看上面的粗掃表在哪兩格之間跳起來；② 回到那一段，把這一欄的 V_GS 整欄改成'
                  '0.05～0.1 V 一階（例如粗掃在 1.5→2.0 V 之間跳，就改成 1.50 起、0.05 一階）；'
                  '③ 一路補到「取點判定」出現三、四個以上「可用」為止。')
note(ws2, FN + 2, '不要假設每顆 2N7000 都在同一個電壓導通（規格 0.8～3.0 V）：預填的 '
                  f'{FINE_ROWS[0]:.2f}～{FINE_ROWS[-1]:.2f} V 是 BS170 的範圍，只是起點。')

# ── 臨界電壓 V_th：兩點外插 ＋ 加密掃描全段迴歸，兩種方法互相對帳 ────────────
rv = FN + 4
ws2.cell(row=rv, column=1, value='臨界電壓 V_th（平方根外插）').font = BOLD
head(ws2, rv + 1, ['項目', '量測點 1', '量測點 2', '結果', '說明'],
     widths=[26, 13, 13, 26, 52], height=22)
RG, RI = rv + 2, rv + 3                 # V_GS 列、I_D 列
g1, i1 = f'B{RG}', f'B{RI}'
g2, i2 = f'C{RG}', f'C{RI}'
labels = ['V_GS (V)', 'I_D (mA)', '√I_D', '平台比（I_D / 平台高度）', '取點判定']
for k, lab in enumerate(labels):
    put(ws2, rv + 2 + k, 1, lab)
put(ws2, RG, 2, None, fill=FILL_IN, fmt='0.00')
put(ws2, RG, 3, None, fill=FILL_IN, fmt='0.00')
put(ws2, RI, 2, None, fill=FILL_IN, fmt='0.000')
put(ws2, RI, 3, None, fill=FILL_IN, fmt='0.000')
for col in ('B', 'C'):
    put(ws2, rv + 4, 2 if col == 'B' else 3,
        f'=IF(OR({col}{RI}="",NOT(ISNUMBER({col}{RI}))),"",IF({col}{RI}<=0,"",SQRT({col}{RI})))',
        fmt='0.000')
    put(ws2, rv + 5, 2 if col == 'B' else 3,
        f'=IF(OR({col}{RI}="",NOT(ISNUMBER({col}{RI}))),"",IF({VDSSEL}="","",'
        f'{col}{RI}/({VDSSEL}/{RCELL2}*1000)))', fmt='0.00')
    put(ws2, rv + 6, 2 if col == 'B' else 3,
        f'=IF(OR({col}{RI}="",NOT(ISNUMBER({col}{RI}))),"",'
        f'IF({col}{RI}<0,"電流為負",IF({col}{RI}=0,"零電流",'
        f'IF({col}{rv + 5}>{PLAT},"平台",IF({col}{RI}<{LOMA},"太小","可用")))))')
PT1, PT2 = f'B{rv + 6}', f'C{rv + 6}'

# 兩點外插：空白就空白，其餘逐項攔截（負電流、零電流、同電流、同 V_GS、順序顛倒）
TWO = f'D{RG}'
put(ws2, RG, 4,
    f'=IF(OR({g1}="",{i1}="",{g2}="",{i2}=""),"",'
    f'IF(NOT(AND(ISNUMBER({g1}),ISNUMBER({g2}),ISNUMBER({i1}),ISNUMBER({i2}))),"四格都要填數字",'
    f'IF(OR({i1}<0,{i2}<0),"電流不可為負（量錯或探棒反接）",'
    f'IF(OR({i1}=0,{i2}=0),"電流為 0 的點不能用（還在截止區）",'
    f'IF({g1}={g2},"兩點的 V_GS 不可相同",'
    f'IF({i1}={i2},"兩點的 I_D 相同，算不出斜率（級距要拉開）",'
    f'IF(({g2}-{g1})*({i2}-{i1})<0,"順序不對：V_GS 較大的點電流必須較大",'
    f'IFERROR({g1}-({g2}-{g1})/(SQRT({i2})-SQRT({i1}))*SQRT({i1}),"算不出來，請檢查兩點")))))))',
    fmt='0.000')
note(ws2, RG, '← 兩點外插：V_th = V_GS1 − (V_GS2−V_GS1)/(√I_D2−√I_D1) × √I_D1', col=5)

# 合理性檢查：結果為正不代表取點正確，所以把「在不在抬頭段」一起檢查並寫明
put(ws2, RI, 4,
    f'=IF({TWO}="","",IF(NOT(ISNUMBER({TWO})),"先修正左邊的輸入",'
    f'IF({TWO}<=0,"V_th ≤ 0 → 兩點取在 R1 限流平台上了，重挑",'
    f'IF({TWO}>=MIN({g1},{g2}),"V_th 不可能 ≥ 取點的 V_GS，重挑",'
    f'IF(OR({PT1}<>"可用",{PT2}<>"可用"),"有一點不在抬頭段（看上面的取點判定），重挑",'
    f'"數值合理——但「為正」不等於符合平方律，還要看 √I_D 圖那一段是不是直線")))))')
note(ws2, RI, '← 合理性檢查（只檢查取點位置，不保證平方律成立）', col=5)

REGX = f'$H${F0}:$H${FN}'
REGY = f'$I${F0}:$I${FN}'
REG = f'D{rv + 4}'
put(ws2, rv + 4, 4,
    f'=IF(COUNT({REGY})<2,"加密掃描裡「可用」的點不到 2 個",'
    f'IFERROR(-INTERCEPT({REGY},{REGX})/SLOPE({REGY},{REGX}),"迴歸失敗（點太集中？）"))', fmt='0.000')
note(ws2, rv + 4, '← 加密掃描中所有「可用」點的 √I_D-V_GS 最小平方擬合，外插到 x 軸（比兩點穩）', col=5)
put(ws2, rv + 5, 4, f'=COUNT({REGY})', fmt='0')
note(ws2, rv + 5, '← 迴歸用了幾個點（少於 3 個就只是兩點外插的另一種寫法）', col=5)
put(ws2, rv + 6, 4,
    f'=IF(OR(NOT(ISNUMBER({TWO})),NOT(ISNUMBER({REG}))),"",'
    f'IF(ABS({TWO}-{REG})>0.1,"兩種方法差 "&TEXT(ABS({TWO}-{REG}),"0.000")&" V：取點可能不在同一段直線上",'
    f'"兩種方法一致（差 "&TEXT(ABS({TWO}-{REG}),"0.000")&" V）"))')
note(ws2, rv + 6, '← 兩種方法對帳', col=5)

RVTH = rv + 7
put(ws2, RVTH, 1, 'V_th 採用值 (V)', font=BOLD)
# 採用值只收「合理」的結果：必須是正數，而且小於所有導通取點的 V_GS。
# 不加這一層的話，兩點取在平台上算出的 −69 V 會被原封不動餵給第二部分的 g_m 公式。
OK_REG = f'AND(ISNUMBER({REG}),{REG}>0,{REG}<MIN($H${F0}:$H${FN}))'
OK_TWO = f'AND(ISNUMBER({TWO}),{TWO}>0,{TWO}<MIN({g1},{g2}))'
put(ws2, RVTH, 4,
    f'=IF({OK_REG},{REG},IF({OK_TWO},{TWO},{P["vth_model"]}))', fmt='0.000')
VTH_REF = f"'實驗二 轉移曲線'!$D${RVTH}"       # 第二部分會引用
put(ws2, RVTH, 5,
    f'=IF({OK_REG},"來源：加密掃描迴歸值",IF({OK_TWO},"來源：兩點外插值",'
    f'"來源：LTspice 模型值 {P["vth_model"]:g} V（還沒有合理的實測 V_th，不可當量測值寫進報告）"))',
    font=BOLD)
note(ws2, RVTH + 3, '← 第二部分自動引用「V_th 採用值」這一格。優先用迴歸值，其次兩點值；'
                    '兩個都不合理（負數、或大於取點的 V_GS）時退回模擬值，只是讓第二部分的公式先能算。')
put(ws2, RVTH + 1, 1, 'LTspice BS170 的 V_to (V)')
put(ws2, RVTH + 1, 4, P['vth_model'], font=BLUE, fmt='0.000')
note(ws2, RVTH + 1, '← 模擬用的替身元件，不是你那顆的值，只拿來對量級', col=5)
put(ws2, RVTH + 2, 1, '2N7000 規格書 V_GS(th) 範圍 (V)')
put(ws2, RVTH + 2, 4, '0.8 ～ 3.0', font=BLUE, align='center')
note(ws2, RVTH + 2, '← 量到 1.2 V 或 2.8 V 都算正常，不要以為接錯', col=5)
note(ws2, RVTH + 5, '平方根外插的前提：兩點都要在飽和區的平方律段。這個電路的 V_DS 元件 就是 V_D，'
                    '飽和條件是 V_D > V_GS − V_th；抬頭段的 V_D 還有好幾伏，條件自動成立，'
                    '真正要避開的是上面那條「被 R1 限流的平台」。')
note(ws2, RVTH + 6, '原始量測值一律留在表上（V_D／V_R1 兩欄），不要用 LTspice 的值代填空格；'
                    '沒量到就讓它空著，圖會跳過那一點。')

# ── 圖 ──────────────────────────────────────────────────────────────────────
xs2 = Reference(ws2, min_col=1, min_row=R0, max_row=RN2)
chA = scatter('I_D-V_GS 轉移特性曲線（粗掃 0.5 V 一階）', 'V_GS (V)（源極接地，等於元件 V_GS）',
              'I_D (mA)')
for g, vds in enumerate(VDS_GROUPS):
    c0 = 2 + g * G2
    chA.series.append(dot_series(Reference(ws2, min_col=H2 + g, min_row=R0, max_row=RN2),
                                 xs2, f'實測 V_DS={vds:g}V', color=MARKS[g % len(MARKS)]))
    chA.series.append(line_series(Reference(ws2, min_col=c0 + 3, min_row=R0, max_row=RN2),
                                  xs2, f'LTspice V_DS={vds:g}V'))
ws2.add_chart(chA, f'{get_column_letter(CH2COL)}{HDR}')

chB = scatter('√I_D-V_GS（加密掃描；把直線段外插到 x 軸就是 V_th）', 'V_GS (V)', '√I_D (√mA)', h=10)
chB.series.append(dot_series(Reference(ws2, min_col=FCHART, min_row=F0, max_row=FN),
                             Reference(ws2, min_col=1, min_row=F0, max_row=FN), '實測（加密掃描）'))
for g, vds in enumerate(VDS_GROUPS):
    chB.series.append(line_series(Reference(ws2, min_col=REF2 + 2 + 2 * g, min_row=R0, max_row=REFN),
                                  Reference(ws2, min_col=REF2, min_row=R0, max_row=REFN),
                                  f'LTspice V_DS={vds:g}V'))
ws2.add_chart(chB, f'{get_column_letter(CH2COL)}{HDR + 21}')

end2 = checklist(ws2, RVTH + 8, [
    ('至少一條導通曲線填完', f'建議 V_DS = 5 V，{len(VGS_ROWS)} 個 V_GS 都量'),
    ('加密掃描有三、四個以上「可用」', '0.05～0.1 V 一階；V_th 外插要用'),
    ('合理性檢查沒有要你重挑', '顯示「重挑」就換兩個在抬頭段的點'),
    ('兩點值與迴歸值差在 0.1 V 內', '差太多代表取點跨到別的段了'),
    ('√I_D 圖的直線段看過一眼', '不是直線就不符合平方律，結報要寫出來'),
    ('I_D-V_GS 圖截圖', '收工前確認：先平、再陡升、再被 R1 壓平'),
])
ws2.freeze_panes = f'B{R0}'
ws2.sheet_view.showGridLines = False
printable(ws2, 1 + G2 * len(VDS_GROUPS), end2)


# ── 實驗三：導通電阻（選做，維持講義版面的點數）─────────────────────────────
ws3 = wb.create_sheet('實驗三 導通電阻')
title_block(ws3, '實驗三　導通電阻 R_on（講義第 10 頁）．有空再做',
            'CH2 改成定電流 10 mA（電流限制 10 mA、電壓上限 2～3 V，確認 CC 燈亮）、CH1 = V_GS．'
            '量 V_DS（毫伏等級），R_on = V_DS / I_D', 10)
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
    put(ws3, r, 6, f'=IF(OR(E{r}="",D{r}=0),"",E{r}/D{r})', fmt='0.00')
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
note(ws3, r + 2, '電源怎麼設：先把輸出關掉，電流限制轉到 10 mA，電壓上限只需 2～3 V（整圈約 1.05 V 就夠），'
                 '再開輸出並確認面板 CC 指示燈亮起。', font=BOLD)
note(ws3, r + 3, '不要把電壓旋到最大：若 CC 沒生效（接觸不良、線沒接好），整個電壓會直接壓在元件上，'
                 '32 V 會打穿閘極氧化層。CC 燈不亮或讀數亂跳時先把輸出關掉，請助教幫忙設電源。', font=WARN)
note(ws3, r + 4, 'V_R1 應該恆為 1 V 左右（10 mA × 100 Ω），不隨 V_GS 變——這是 CC 模式有生效的最快判準。'
                 'V_DS 量到伏特等級代表元件還沒完全導通或電源沒進 CC 模式。')
note(ws3, r + 5, '講義第 10 頁圖上的 0.0014 V（= 0.14 Ω）任何 2N7000 都做不到；規格書是 V_GS = 10 V 時典型 1.2 Ω、'
                 '上限 5.3 Ω，和 LTspice 同一個量級。')
ch = scatter('R_on - V_GS（I_D 固定 10 mA）', 'V_GS (V)', 'R_on (Ω)', h=9)
xs = Reference(ws3, min_col=1, min_row=RON0, max_row=RONN)
ch.series.append(dot_series(Reference(ws3, min_col=6, min_row=RON0, max_row=RONN), xs, '實測'))
ch.series.append(dot_series(Reference(ws3, min_col=8, min_row=RON0, max_row=RONN), xs, 'LTspice',
                            color='F28C28', symbol='triangle'))
ws3.add_chart(ch, f'L{RON0}')
end3 = checklist(ws3, r + 7, [
    ('電源 CC 指示燈亮著的照片 1 張', '證明 CH2 真的在定電流模式'),
    ('電壓上限的設定值也拍到', '結報要寫「限流 10 mA、上限 2～3 V」'),
    ('V_GS = 5 V 的 V_DS 電表畫面', '毫伏檔，探棒直接點元件腳'),
    ('V_GS = 10 V 的 V_DS 電表畫面', '講義問題 3 要用'),
])
ws3.freeze_panes = f'B{RON0}'
ws3.sheet_view.showGridLines = False
printable(ws3, 10, end3)


# ── 實驗四：LED 開關（選做，維持講義版面的點數）─────────────────────────────
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
ch = scatter(f'LED 電流 I_D - V_GS（V_DD = {SW_VDD:g} V）', 'V_GS 設定 (V)', 'I_D (mA)')
xs = Reference(ws4, min_col=1, min_row=SW0, max_row=SWN)
ch.series.append(dot_series(Reference(ws4, min_col=4, min_row=SW0, max_row=SWN), xs, '實測 R1 = 100 Ω'))
ch.series.append(line_series(Reference(ws4, min_col=9, min_row=SW0, max_row=SWN), xs, 'LTspice R1 = 100 Ω'))
ch.series.append(dot_series(Reference(ws4, min_col=13, min_row=SW0, max_row=SWN), xs, '實測 R1 = 200 Ω',
                            color=MARK2, symbol='triangle'))
ch.series.append(line_series(Reference(ws4, min_col=15, min_row=SW0, max_row=SWN), xs, 'LTspice R1 = 200 Ω'))
ws4.add_chart(ch, f'R{HDR}')
end4 = checklist(ws4, r, [
    ('LED 暗與亮各 1 張照片', '同一個角度拍，報告要放亮度對比'),
    ('LED 方向照片 1 張', '平邊短腳（陰極）朝汲極'),
    ('V_GS = 6 V 的 V_R1 與 V_LED 電表畫面', '算 I_D 與 LED 電阻用'),
    ('（選做）200 Ω 版本同一組照片', '講義問題 4'),
])
ws4.freeze_panes = f'B{SW0}'
ws4.sheet_view.showGridLines = False
printable(ws4, 16, end4)


# ── 第二部分：共源級放大器（選做，維持講義版面）──────────────────────────────
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
note(ws5, 4, '← 先填標稱值；開工前用三用電表各量一次改成實測值'
             '（藍色的 LTspice 欄是標稱值條件下的模擬，不會跟著動）', col=3)
note(ws5, 10, '← 零件表只有 50 kΩ ×2、沒有 30 kΩ；若當天只拿得到 50 kΩ 就改成 50，LTspice 增益會從 8.7 掉到 6.3',
     col=3)
put(ws5, 11, 1, 'V_th 採用值 (V)')
put(ws5, 11, 2, f'=IF(ISNUMBER({VTH_REF}),{VTH_REF},{P["vth_model"]})', fmt='0.000')
note(ws5, 11, f'← 自動帶入實驗二的 V_th（迴歸優先）；實驗二沒做完時退回 LTspice 的 '
              f'{P["vth_model"]:g} V，只為了讓下面的公式能算', col=3)
VTH = '$B$11'
RD = f'({PC["R3"]}*{PC["R4"]}/({PC["R3"]}+{PC["R4"]}))'      # 汲極交流負載 R3 ∥ R4 (kΩ)
RS = f'({PC["R6"]}*{PC["R7"]}/({PC["R6"]}+{PC["R7"]}))'      # 源極交流電阻 R6 ∥ R7 (kΩ)

r = 13
ws5.cell(row=r, column=1, value='一、直流工作點（訊號產生器先關掉，用三用電表對地量）').font = BOLD
head(ws5, r + 1, ['量', '理論（手算）', '實測', 'LTspice 預報', '相對偏差 (%)', '算式／備註'],
     widths=[30, 14, 14, 14, 13, 62])
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
    ('V_GS − V_th（過驅動，V）', 'in', f'=IF(C{D0 + 3}="","",C{D0 + 3}-{VTH})', round(OP['VGS'] - P['vth_model'], 3),
     '決定要用哪個公式算 g_m：≥ 0.2 V 才算強反轉、平方律可用'),
    ('工作區', None,
     # 先看有沒有電流（V_S < 0.1 V ≈ I_D < 1 µA 才算截止），不直接拿 V_GS 比 V_th：
     # SPICE Level 3 模型帶 NFS（次臨界），V_GS 低於 V_to 時仍有電流，預報的工作點正是這樣。
     f'=IF(OR(C{D0 + 1}="",C{D0 + 3}="",C{D0 + 4}=""),"",IF(C{D0 + 1}<0.1,"截止",'
     f'IF(C{D0 + 4}<=0.1,"三極管（V_DS 太小）",'
     f'IF(C{D0 + 6}>=0.2,"飽和（強反轉）",'
     f'IF(C{D0 + 4}>MAX(C{D0 + 6},0.1),"飽和（弱反轉／次臨界）","三極管")))))',
     '飽和（弱反轉）',
     '弱反轉時飽和的判準不是 V_DS > V_GS − V_th（那會是負數、恆成立），而是 V_DS 大於約 0.1 V（幾個 kT/q）'),
    ('g_m = 2 I_D / (V_GS − V_th) (mA/V)', 'in',
     f'=IF(OR(C{D0 + 5}="",C{D0 + 6}=""),"",IF(C{D0 + 6}<0.2,'
     f'"過驅動 < 0.2 V：弱反轉，平方律公式不適用（見下方 AC 回推）",'
     f'2*C{D0 + 5}/1000/C{D0 + 6}))', '不適用（弱反轉）',
     '講義提示用 I_D 量測值推；這個偏壓點過驅動只有約 −0.1 V，公式會爆大或變負'),
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
ROW_OD = D0 + 6               # 過驅動
ROW_GM = DN                   # 手算 g_m
note(ws5, DN + 1, '理論欄自己手算後填（講義表格要 V_GS、V_DS、g_m 的 theory 值）。V_G 由分壓直接算好了。')
note(ws5, DN + 2, '量到 V_D ≈ V_S、示波器沒有輸出時先不要懷疑接線：多半是手上那顆 V_th 偏低，元件掉進三極管區。'
                  '把 R2 換小或 R3 換成 100 kΩ，並把這段寫進結報。')
r = DN + 4
ws5.cell(row=r, column=1, value='LTspice 在這個工作點上的小訊號參數（模型值，供對照用）').font = BOLD
ss = [
    ('模型 g_m（數值微分 dI_D/dV_GS）', GM_MODEL, 'mA/V',
     'lab3-exp5-gm.cir：把三個節點釘在 .op 的解上掃閘極。這是模型真正的 g_m'),
    ('模型 r_o（數值微分 dV_DS/dI_D）', RO_MODEL, 'MΩ',
     'lab3-exp5-ro.cir。r_o 和 R3∥R4 同一量級，所以簡化公式會高估增益約 2%'),
    ('有效 g_m（由模擬增益回推）', GM_EFF, 'mA/V',
     '把 |A_v| = 8.72 代進回推式得到的「等效」值；它已經把 r_o 的分流吸收進去，不是元件的 g_m'),
]
head(ws5, r + 1, ['小訊號參數', '值', '單位', '怎麼來的'], widths=[30, 14, 10, 62], height=22)
for k, (lab, v, unit, memo) in enumerate(ss):
    rr = r + 2 + k
    put(ws5, rr, 1, lab)
    put(ws5, rr, 2, v, font=BLUE, fmt='0.000')
    put(ws5, rr, 3, unit, align='center')
    put(ws5, rr, 4, memo, font=NOTE)
SSN = r + 2 + len(ss)
note(ws5, SSN, f'預報工作點的 V_GS = {OP["VGS"]:.3f} V 比模型的 V_to = {P["vth_model"]:g} V 還低 '
               f'{(P["vth_model"] - OP["VGS"]) * 1000:.0f} mV：元件靠弱反轉（次臨界）電流導通，'
               '不是強反轉的平方律。所以 2I_D/(V_GS − V_th) 在這裡沒有意義（分母是負的）。', font=WARN)
note(ws5, SSN + 1, '回推式與增益式是同一條式子的兩種寫法，所以「回推出 g_m 再代回去算出同樣的增益」'
                   '不是獨立驗證。真正的對照是：拿模型的 g_m '
                   f'{GM_MODEL:g} mA/V 代進簡化式得 |A_v| ≈ '
                   f'{GM_MODEL * 230.769 / (1 + GM_MODEL * 23.077):.2f}，'
                   f'把 r_o = {RO_MODEL:g} MΩ 一起算得 ≈ 8.75，模擬的 .ac 是 {abs(AC["av"]):g}。')

r = SSN + 3
ws5.cell(row=r, column=1,
         value='二、電壓增益（V_in = 0.05 sin(2π·1000·t)，示波器 CH1 量輸入、CH2 量 R4 上的輸出）').font = BOLD
put(ws5, r + 1, 1, 'V_in 峰值 (mV)')
put(ws5, r + 1, 2, 50.0, fill=FILL_IN, fmt='0.0')
note(ws5, r + 1, '← 講義 50 mV 峰值；示波器量到的實際輸入峰值填這裡（峰對峰值要除以 2）', col=3)
VIN = f'$B${r + 1}'
head(ws5, r + 2, ['量', '理論（由 g_m 算）', '實測', 'LTspice 預報', '相對偏差 (%)', '算式／備註'])
A0 = r + 3
GM_TH = f'$B${ROW_GM}'        # 手算 g_m（mA/V）
gain = lambda gm: f'{gm}*{RD}/(1+{gm}*{RS})'   # noqa: E731  |A_v| = g_m R_D' / (1 + g_m R_S')，g_m 用 mA/V、電阻用 kΩ
AVM = f'C{A0 + 1}'
DENOM = f'({RD}-ABS({AVM})*{RS})'
ac = [
    ('V_out 峰值 (mV)', f'=IF(OR({GM_TH}="",NOT(ISNUMBER({GM_TH}))),"",{gain(GM_TH)}*{VIN})',
     None, AC['vout_peak_mV'], 'R4 兩端；峰對峰值要除以 2'),
    ('A_v = −V_out / V_in', f'=IF(OR({GM_TH}="",NOT(ISNUMBER({GM_TH}))),"",-{gain(GM_TH)})',
     f'=IF(C{A0}="","",-C{A0}/{VIN})', AC['av'],
     "|A_v| = g_m(R3∥R4) / [1 + g_m(R6∥R7)]；負號代表反相"),
    ('g_m（由實測增益回推，mA/V）', '—',
     f'=IF(OR({AVM}="",NOT(ISNUMBER({AVM}))),"",'
     f'IF({DENOM}<=0,"增益超過 "&TEXT({RD}/{RS},"0.0")&" 倍：回推式無解（源極退化的上限），檢查 R 值或是否誤量源極",'
     f'ABS({AVM})/{DENOM}))',
     GM_EFF, "把增益式反解：g_m = |A_v| / [R_D′ − |A_v|·R_S′]，R_D′ = R3∥R4、R_S′ = R6∥R7"),
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
AN_ = A0 + len(ac) - 1
note(ws5, AN_ + 1, '回推出來的 g_m 只是「讓簡化式對上實測增益」的有效值，裡面已經包含 r_o 的分流與量測誤差；'
                   '它不能再代回同一條式子當成理論驗證（那是同一條方程式的兩個方向）。'
                   '要驗理論就和上面的模型 g_m 比。', font=WARN)
note(ws5, AN_ + 2, f'回推式的前提：元件在飽和區、r_o ≫ R3∥R4、C3 在 1 kHz 已近似短路。'
                   f'源極退化讓 |A_v| 的上限是 R_D′/R_S′ ≈ {230.769 / 23.077:.1f} 倍（g_m → ∞ 時），'
                   '量到比這個大就是量錯或 C3 沒接好。')

r = AN_ + 4
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
end5 = checklist(ws5, rr + 2, [
    ('直流工作點三個電壓的電表畫面', 'V_G、V_S、V_D 對地'),
    ('示波器 V_in／V_out 同畫面截圖', '看得到反相與兩通道的峰值讀數'),
    ('元件實測值都改好', 'R1～R7 的實測電阻，增益公式用這幾格'),
    ('（選做）旁路／Bonus 版本的波形截圖', '講義問題 3 與 Bonus'),
])
ws5.freeze_panes = 'B13'
ws5.sheet_view.showGridLines = False
printable(ws5, 7, end5)


# ── 交報告用：講義版面的摘要 ＋ 完整數據 ─────────────────────────────────────
ws6 = wb.create_sheet('交報告用')
title_block(ws6, '交報告用表格（版面照 App_Lab3.pdf 第 7、9、10、12、20 頁）',
            '數字由各表帶過來；空白代表當天沒量。摘要是講義印好的那幾列，完整數據在它下面，兩個都留', 8)


def link(sheet, cell, fmt, unit):
    ref = f"'{sheet}'!{cell}"
    tail = f'&" {unit}"' if unit else ''
    return f'=IF({ref}="","",TEXT({ref},"{fmt}"){tail})'


def exp1_blocks(r, rows_list):
    """實驗一的四組，照講義 2×2 排。回傳下一個空列。"""
    for gi, vgs in enumerate(VGS_GROUPS):
        base_r = r + (gi // 2) * (len(rows_list) + 3)
        base_c = 1 + (gi % 2) * 3
        group_head(ws6, base_r, base_c, 2, f'V_GS = {vgs:g} V')
        col_head(ws6, base_r + 1, base_c, 'V_DS (experimental setting)', width=26)
        col_head(ws6, base_r + 1, base_c + 1, 'I_D (measure)', width=16)
        src_c = get_column_letter(2 + gi * G1 + 1)
        for i, vds in enumerate(rows_list):
            rr = base_r + 2 + i
            put(ws6, rr, base_c, f'{vds:g} V', align='center')
            put(ws6, rr, base_c + 1,
                link('實驗一 特性曲線', f'{src_c}{R0 + VDS_ROWS.index(vds)}', '0.000', 'mA'),
                align='center')
    return r + 2 * (len(rows_list) + 3)


def exp2_blocks(r, rows_list):
    """實驗二的三組，照講義上下排。回傳下一個空列。"""
    for gi, vds in enumerate(VDS_GROUPS):
        base_r = r + gi * (len(rows_list) + 3)
        group_head(ws6, base_r, 1, 2, f'V_DS = {vds:g} V')
        col_head(ws6, base_r + 1, 1, 'V_GS (experimental setting)')
        col_head(ws6, base_r + 1, 2, 'I_D (measure)')
        src_c = get_column_letter(2 + gi * G2 + 2)
        for i, vgs in enumerate(rows_list):
            rr = base_r + 2 + i
            put(ws6, rr, 1, f'{vgs:g} V', align='center')
            put(ws6, rr, 2,
                link('實驗二 轉移曲線', f'{src_c}{R0 + VGS_ROWS.index(vgs)}', '0.000', 'mA'),
                align='center')
    return r + len(VDS_GROUPS) * (len(rows_list) + 3)


r = 4
ws6.cell(row=r, column=1,
         value='1. Circuit schematic (characteristic curve, I_D-V_DS)　—　講義版面的摘要').font = BOLD
note(ws6, r + 1, f'摘要只取講義印好的級距 V_DS = {"／".join(f"{v:g}" for v in VDS_HANDOUT)} V 五點；'
                 f'當天實際量的是 {VDS_ROWS[0]:g}～{VDS_ROWS[-1]:g} V、每 0.5 V 共 {len(VDS_ROWS)} 點，完整表在第 1b 節。')
r = exp1_blocks(r + 2, VDS_HANDOUT) + 1
ws6.cell(row=r, column=1,
         value=f'1b. 實驗一完整數據（V_DS {VDS_ROWS[0]:g}～{VDS_ROWS[-1]:g} V，每 0.5 V，共 {len(VDS_ROWS)} 點）').font = BOLD
note(ws6, r + 1, '報告的 I_D-V_DS 圖要用這一份；若要畫元件端橫軸的版本，V_DS 元件 那一欄在'
                 '「實驗一 特性曲線」分頁（並記得標成自偏壓軌跡）。')
r = exp1_blocks(r + 2, VDS_ROWS) + 1

ws6.cell(row=r, column=1,
         value='2. Circuit schematic (transfer curve, I_D-V_GS)　—　講義版面的摘要').font = BOLD
note(ws6, r + 1, f'摘要只取講義印好的級距 V_GS = {"／".join(f"{v:g}" for v in VGS_HANDOUT)} V 六點；'
                 f'當天實際量的是 {VGS_ROWS[0]:g}～{VGS_ROWS[-1]:g} V、每 0.5 V 共 {len(VGS_ROWS)} 點（另有抬頭段加密掃描），'
                 '完整表在第 2b 節。')
r = exp2_blocks(r + 2, VGS_HANDOUT) + 1
ws6.cell(row=r, column=1,
         value=f'2b. 實驗二完整數據（V_GS {VGS_ROWS[0]:g}～{VGS_ROWS[-1]:g} V，每 0.5 V，共 {len(VGS_ROWS)} 點）').font = BOLD
note(ws6, r + 1, '求 V_th 用的加密掃描逐點數據留在「實驗二 轉移曲線」分頁下半部，'
                 '報告附上那一段與 √I_D 圖即可。')
r = exp2_blocks(r + 2, VGS_ROWS) + 1

ws6.cell(row=r, column=1, value='2c. Threshold voltage（由加密掃描外插）').font = BOLD
for j, t in enumerate(['V_th (two-point)', 'V_th (regression)', 'V_th (adopted)',
                       'LTspice BS170 V_to'], start=1):
    col_head(ws6, r + 1, j, t, width=20)
put(ws6, r + 2, 1, link('實驗二 轉移曲線', f'$D${RG}', '0.000', 'V'), align='center')
put(ws6, r + 2, 2, link('實驗二 轉移曲線', f'$D${rv + 4}', '0.000', 'V'), align='center')
put(ws6, r + 2, 3, link('實驗二 轉移曲線', f'$D${RVTH}', '0.000', 'V'), align='center')
put(ws6, r + 2, 4, f'{P["vth_model"]:.3f} V', font=BLUE, align='center')
note(ws6, r + 3, '外插算不出來時那一格會帶出提示字串（例如「兩點取在平台上了」），那就不要貼進報告。')

r += 5
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
        put(ws6, r + 2, j, f"=IF('{S5}'!C{D0 + 7}=\"\",\"\",'{S5}'!C{D0 + 7})", align='center')
    else:
        put(ws6, r + 2, j, link(S5, *s), align='center')
ws6.row_dimensions[r + 1].height = 30

r += 4
ws6.cell(row=r, column=1,
         value='6. Common-source amplifier: voltage gain (V_GS = 0.05 sin(2π·1000·t), V_DD = 15 V)').font = BOLD
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
note(ws6, r + 5, 'g_m (calculation) 是由實測增益回推的有效值，不是獨立量到的 g_m——報告裡要註明。')
for col in 'DEF':
    ws6.column_dimensions[col].width = 16
ws6.sheet_view.showGridLines = False
printable(ws6, 8, r + 5, landscape=False)

# 公式格由 Excel / LibreOffice 開啟時重新計算，避免預覽器沿用舊快取值。
wb.calculation.calcMode = 'auto'
wb.calculation.fullCalcOnLoad = True
wb.calculation.forceFullCalc = True

os.makedirs(os.path.dirname(OUT), exist_ok=True)
exists = os.path.exists(OUT)
if exists and not ({'--force', '--update'} & set(sys.argv)):
    # 作者會直接在這個檔裡填數據、調格式，所以預設不覆蓋。
    sys.exit(f'{OUT} 已存在，未覆蓋（裡面可能有作者填的數據與格式）。\n'
             f'  --update  保留已填的黃底格（按分頁＋欄組＋電壓＋欄名對應）後重產\n'
             f'  --force   直接丟掉舊檔重產')
moved, lost = 0, []
if exists and '--update' in sys.argv:
    got = harvest(OUT)
    moved, lost = replay(wb, got)
    shutil.copy2(OUT, OUT + '.bak')
    print(f'舊檔備份到 {OUT}.bak')
    print(f'舊檔有值的黃底格 {len(got)} 個，搬移 {moved} 個。')
    for k, v in lost:
        print(f'  ⚠ 對不上、沒有搬移：{k} = {v!r}')
wb.save(OUT)
print('wrote', OUT, '（實驗一、二預報來自', '.raw）' if SRC_RAW else 'ltspice-pred.json）')
print(f'  實驗一：{len(VGS_GROUPS)} 組 V_GS × {len(VDS_ROWS)} 點 V_DS'
      f'（{VDS_ROWS[0]:g}～{VDS_ROWS[-1]:g} V，每 0.5 V）')
print(f'  實驗二：{len(VDS_GROUPS)} 組 V_DS × {len(VGS_ROWS)} 點 V_GS'
      f'（{VGS_ROWS[0]:g}～{VGS_ROWS[-1]:g} V，每 0.5 V）＋ 加密掃描 {FINE_N} 列')
