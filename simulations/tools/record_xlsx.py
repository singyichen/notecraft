"""Lab 4／Lab 5 數據記錄簿的共用樣式與小工具。

配色與規則沿用 Lab 1–3 的記錄簿：
  黃底 = 當天要填的格子；藍字 = 寫死的規格或模擬預報；其餘是公式。
  每張表下方一份當天拍照檢查表；凍結窗格固定在表頭下方。

兩個踩過的坑（Lab 3 的 README 有完整記錄，這裡只留護欄）：
  1. Excel 重存後填色會從 6 碼變成 8 碼 ARGB，比對一律取後六碼。
  2. 公式少一個括號時 LibreOffice 會自動補、Excel 會判定檔案毀損並丟掉那一格，
     所以 `check_formulas()` 在寫檔前先把每條公式的括號與引號數過一遍，不過就中止。
"""
from __future__ import annotations

from openpyxl.chart import Reference, ScatterChart, Series
from openpyxl.chart.marker import Marker
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

FONT = 'Arial'
IN_RGB = 'FFF2CC'
FILL_IN = PatternFill('solid', fgColor='FFF2CC')     # 當天要填
FILL_HD = PatternFill('solid', fgColor='D9E2F3')     # 表頭
FILL_GP = PatternFill('solid', fgColor='EDF1F9')     # 欄組標題
FILL_OK = PatternFill('solid', fgColor='E2EFDA')     # 檢查通過的提示列
BLUE = Font(name=FONT, color='0000FF')
BLACK = Font(name=FONT)
BOLD = Font(name=FONT, bold=True)
TITLE = Font(name=FONT, bold=True, size=14)
NOTE = Font(name=FONT, size=9, color='808080')
WARN = Font(name=FONT, size=9, bold=True, color='C00000')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MARKS = ['1F4E79', 'C00000', '2E7D32', 'F28C28']


def put(ws, row, col, value, *, font=BLACK, fill=None, fmt=None, align=None, border=True):
    if value is None and fill is FILL_IN:
        value = ''
    c = ws.cell(row=row, column=col, value=value)
    c.font = font
    if border:
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


def title_block(ws, title, subtitle, span):
    ws['A1'] = title
    ws['A1'].font = TITLE
    ws['A2'] = subtitle
    ws['A2'].font = NOTE
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=span)


def head(ws, row, labels, widths=None, height=32, col=1):
    """表頭列。labels 可以是字串或 (字串, 欄寬)。"""
    for i, lab in enumerate(labels):
        c = put(ws, row, col + i, lab, font=BOLD, fill=FILL_HD, align='center')
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        if widths:
            ws.column_dimensions[get_column_letter(col + i)].width = widths[i]
    ws.row_dimensions[row].height = height
    return row + 1


def group_head(ws, row, col, span, text):
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


def dev(meas, pred):
    """相對偏差：任一邊空白或預報為 0 時留白。"""
    return f'=IF(OR({meas}="",{pred}="",{pred}=0),"",({meas}-{pred})/{pred})'


def gated(src, gate):
    """圖表用的 y 值：量測格還空著就回 #N/A，讓圖跳過這一點而不是畫一個 0。"""
    return f'=IF({gate}="",NA(),{src})'


def checklist(ws, row, items, col=1):
    put(ws, row, col, '當天拍照／存檔檢查表', font=BOLD, fill=FILL_HD)
    put(ws, row, col + 1, '打勾', font=BOLD, fill=FILL_HD, align='center')
    put(ws, row, col + 2, '說明', font=BOLD, fill=FILL_HD)
    for i, (what, why) in enumerate(items):
        r = row + 1 + i
        put(ws, r, col, what)
        put(ws, r, col + 1, None, fill=FILL_IN, align='center')
        put(ws, r, col + 2, why, font=NOTE)
    return row + 1 + len(items)


def dot_series(ys, xs, title, color=MARKS[0], symbol='circle'):
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol=symbol, size=7)
    s.marker.graphicalProperties.solidFill = color
    s.marker.graphicalProperties.line.solidFill = color
    s.graphicalProperties.line.noFill = True
    s.smooth = False
    return s


def line_series(ys, xs, title):
    s = Series(ys, xs, title=title)
    s.marker = Marker(symbol='none')
    s.smooth = False
    return s


def scatter(title, xt, yt, h=9.5, w=17):
    ch = ScatterChart()
    ch.title = title
    ch.x_axis.title = xt
    ch.y_axis.title = yt
    ch.height, ch.width = h, w
    ch.style = 13
    ch.x_axis.delete = False
    ch.y_axis.delete = False
    return ch


def ref(ws, col, r0, r1):
    return Reference(ws, min_col=col, min_row=r0, max_row=r1)


def printable(ws, last_col, last_row, landscape=True):
    ws.print_area = f'A1:{get_column_letter(last_col)}{last_row}'
    ws.page_setup.orientation = 'landscape' if landscape else 'portrait'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def check_formulas(wb):
    """寫檔前的自檢：每條公式的括號與引號必須成對（見模組 docstring 的坑 2）。"""
    bad = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                v = c.value
                if not (isinstance(v, str) and v.startswith('=')):
                    continue
                stripped, inq, depth = [], False, 0
                for ch in v:
                    if ch == '"':
                        inq = not ch or not inq
                        continue
                    if inq:
                        continue
                    stripped.append(ch)
                if inq:
                    bad.append((ws.title, c.coordinate, '引號沒有成對', v))
                    continue
                for ch in stripped:
                    if ch == '(':
                        depth += 1
                    elif ch == ')':
                        depth -= 1
                        if depth < 0:
                            break
                if depth != 0:
                    bad.append((ws.title, c.coordinate, f'括號差 {depth}', v))
    return bad
