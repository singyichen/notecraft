"""畫出 Lab 2 第一部分（實驗一＋實驗二）在**實體麵包板**上的接線圖與量測圖。

和 `annotate_current_path.py` 不同：那支是在 Tinkercad 截圖上疊圖，這支是從零畫一塊
和實驗室那塊同規格的全尺寸麵包板（60 欄、上下兩組電源軌、上排 j–f／下排 e–a），
因為 Tinkercad 用的是 30 欄小板，孔位對不上當天手上的板子。

幾何與配色參照 Lab 1 當天拍的照片（`_outputs/lab1/photos/`）：
  - 全尺寸板，上下各一組電源軌，每組是「−」在上、「＋」在下
  - 電源用鱷魚夾夾住插在軌上的單芯線（紅＝＋、橘／黑＝−）
  - 板上跳線是黃色單芯線，電阻是藍色本體的 1% 金屬皮膜
  - 電表沒有探針，是把一條鬆的橘色單芯線插進孔，再用鱷魚夾夾住線的另一端

版面規則（上一版重疊的教訓）：
  - 元件橫跨十幾欄、節點之間拉開，標籤不擠在同一塊
  - 電晶體本體朝溝槽掛（和 Tinkercad 版同一個擺法），讓 g–i–j 三列全空出來給電表
  - 儀器端子畫在面板下緣，導線由左到右單調排列，彼此不交叉
  - 字型沒有的字一律不用（unicode 下標、⚠），全部寫成 R1 / RC / V_CE

輸出到 public/note-images/ec-week6-breadboard/：
  lab2-part1-breadboard.png      接線圖（接在哪）
  lab2-part1-measure-exp1.png    實驗一：電表夾哪兩點
  lab2-part1-measure-exp2.png    實驗二：四筆壓降各夾哪兩點

用法：simulations/lab1/.venv/bin/python simulations/lab2/draw_real_breadboard.py
"""
from __future__ import annotations

import os
import sys
from PIL import Image, ImageDraw, ImageFont

FONT_CJK = "/System/Library/Fonts/STHeiti Medium.ttc"
OUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..",
    "public", "note-images", "ec-week6-breadboard",
)

# ── 配色 ──────────────────────────────────────────────────────────
BG = (247, 247, 245)
BOARD = (252, 252, 250)
BOARD_EDGE = (205, 205, 200)
TROUGH = (238, 238, 235)
HOLE = (72, 72, 72)
HOLE_RING = (226, 226, 221)
RAIL_BLUE = (60, 110, 200)
RAIL_RED = (225, 110, 120)
INK = (25, 25, 25)
INK2 = (95, 95, 95)
INK3 = (140, 140, 138)
WIRE_YELLOW = (235, 200, 40)
WIRE_RED = (205, 45, 45)
WIRE_ORANGE = (235, 140, 45)
WIRE_BLACK = (50, 50, 50)
LEAD = (152, 152, 157)
RES_BODY = (58, 108, 188)
TO92 = (40, 40, 42)
CALL = (20, 20, 20)
ACCENT = (0, 110, 190)
MEAS_RED = (200, 35, 35)
MEAS_BLK = (40, 40, 40)
PANEL = (255, 255, 255)
PANEL_EDGE = (192, 192, 187)
WARN = (170, 35, 35)

BAND = {
    "黑": (25, 25, 25), "棕": (120, 72, 30), "紅": (200, 35, 35),
    "橙": (235, 130, 30), "黃": (240, 205, 40), "綠": (40, 150, 70),
    "藍": (40, 90, 190), "紫": (130, 60, 170), "灰": (140, 140, 140),
    "白": (245, 245, 245), "金": (200, 165, 70),
}

# ── 板子幾何 ──────────────────────────────────────────────────────
P = 26
X0 = 120
NCOL = 60
ROWS_UP = ["j", "i", "h", "g", "f"]
ROWS_LO = ["e", "d", "c", "b", "a"]

Y_BOARD_TOP = 420
Y_RAIL_T_M = 452
Y_RAIL_T_P = 478
Y_NUM_T = 506
Y_UP = {r: 536 + i * P for i, r in enumerate(ROWS_UP)}       # j=536 … f=640
Y_TROUGH_A, Y_TROUGH_B = 654, 686
Y_LO = {r: 700 + i * P for i, r in enumerate(ROWS_LO)}       # e=700 … a=804
Y_NUM_B = 832
Y_RAIL_B_M = 860
Y_RAIL_B_P = 886
Y_BOARD_BOT = 918

W, H = 1860, 1320

_FONTS: dict[int, ImageFont.FreeTypeFont] = {}
_SEEN: set[str] = set()


def f(sz: int) -> ImageFont.FreeTypeFont:
    if sz not in _FONTS:
        _FONTS[sz] = ImageFont.truetype(FONT_CJK, sz)
    return _FONTS[sz]


def cx(col: float) -> float:
    return X0 + (col - 1) * P


def hole(col: float, row: str) -> tuple[float, float]:
    """某個孔的畫布座標。row 用 'j'…'a'，或 '-'/'+' 上方電源軌、'-b'/'+b' 下方。"""
    if row == "-":
        return cx(col), Y_RAIL_T_M
    if row == "+":
        return cx(col), Y_RAIL_T_P
    if row == "-b":
        return cx(col), Y_RAIL_B_M
    if row == "+b":
        return cx(col), Y_RAIL_B_P
    return cx(col), (Y_UP[row] if row in Y_UP else Y_LO[row])


# ── 文字（統一入口，順便記下用過的字以便檢查字型缺字） ──────────────
def text(d, xy, s, size=15, fill=INK, anchor=None, align="left", spacing=6):
    _SEEN.update(s)
    if "\n" in s:
        d.multiline_text(xy, s, font=f(size), fill=fill, align=align, spacing=spacing)
    else:
        d.text(xy, s, font=f(size), fill=fill, anchor=anchor)


def check_glyphs() -> list[str]:
    """回報目前字型畫不出來的字（會變成空心方框）。"""
    from fontTools.ttLib import TTCollection
    font = TTCollection(FONT_CJK).fonts[0]
    cmap = font.getBestCmap()
    return sorted(c for c in _SEEN if ord(c) not in cmap and c not in " \n\t")


# ── 基本繪圖 ──────────────────────────────────────────────────────
def draw_hole(d, x, y, r=4.4):
    d.ellipse([x - r - 1.6, y - r - 1.6, x + r + 1.6, y + r + 1.6], fill=HOLE_RING)
    d.rectangle([x - r, y - r, x + r, y + r], fill=HOLE)


def draw_board(d):
    d.rounded_rectangle([88, Y_BOARD_TOP, cx(NCOL) + 34, Y_BOARD_BOT],
                        radius=10, fill=BOARD, outline=BOARD_EDGE, width=2)

    for ym, yp, ytop, ybot in ((Y_RAIL_T_M, Y_RAIL_T_P, Y_RAIL_T_M - 22, Y_RAIL_T_P + 20),
                               (Y_RAIL_B_M, Y_RAIL_B_P, Y_RAIL_B_M - 20, Y_RAIL_B_P + 22)):
        d.line([(cx(1) - 8, ytop), (cx(NCOL) + 8, ytop)], fill=RAIL_BLUE, width=3)
        d.line([(cx(1) - 8, ybot), (cx(NCOL) + 8, ybot)], fill=RAIL_RED, width=3)
        for xx in (cx(1) - 26, cx(NCOL) + 26):
            text(d, (xx, ytop), "−", size=19, fill=RAIL_BLUE, anchor="mm")
            text(d, (xx, ybot), "+", size=19, fill=RAIL_RED, anchor="mm")
        c = 1.6
        while c < NCOL:
            for k in range(5):
                if c + k * 0.95 > NCOL:
                    break
                for yy in (ym, yp):
                    draw_hole(d, cx(c + k * 0.95), yy, r=4.0)
            c += 5.7

    d.rectangle([92, Y_TROUGH_A, cx(NCOL) + 30, Y_TROUGH_B], fill=TROUGH)

    for row in ROWS_UP + ROWS_LO:
        for col in range(1, NCOL + 1):
            draw_hole(d, *hole(col, row))

    for col in [1] + list(range(5, NCOL + 1, 5)):
        for yy in (Y_NUM_T, Y_NUM_B):
            text(d, (cx(col), yy), str(col), size=15, fill=INK2, anchor="mm")
    for row in ROWS_UP + ROWS_LO:
        y = hole(1, row)[1]
        for xx in (cx(1) - 26, cx(NCOL) + 26):
            text(d, (xx, y), row, size=15, fill=INK2, anchor="mm")


def wire(d, pts, color, width=7):
    d.line([(x + 2, y + 3) for x, y in pts], fill=(214, 214, 210), width=width, joint="curve")
    d.line(pts, fill=color, width=width, joint="curve")


def plug(d, xy, r=4.0):
    """插進孔的金屬頭。"""
    x, y = xy
    d.ellipse([x - r, y - r, x + r, y + r], fill=(130, 130, 136))


def jumper(d, col, row, rail, lane_dx=0):
    """黃色跳線：板上某孔 ←→ 上方電源軌。繞過欄號列、不壓在孔上。"""
    (xh, yh), (xr, yr) = hole(col, row), hole(col, rail)
    xm = xh + lane_dx
    wire(d, [(xh, yh), (xm, Y_NUM_T + 2), (xr, yr)], WIRE_YELLOW)
    plug(d, (xh, yh))
    plug(d, (xr, yr))


def resistor(d, col_a, col_b, row, bands):
    """臥式電阻：兩端引腳彎進孔，本體置中。"""
    (xa, ya), (xb, yb) = hole(col_a, row), hole(col_b, row)
    mid = (xa + xb) / 2
    body_half = 42
    lift = 10
    d.line([(xa, ya), (xa + 14, ya - lift), (mid - body_half, ya - lift)], fill=LEAD, width=4)
    d.line([(xb, yb), (xb - 14, yb - lift), (mid + body_half, yb - lift)], fill=LEAD, width=4)
    top, bot = ya - lift - 11, ya - lift + 11
    d.rounded_rectangle([mid - body_half, top, mid + body_half, bot], radius=9, fill=RES_BODY)
    n = len(bands)
    span = body_half * 2 - 22
    for i, nm in enumerate(bands):
        bx = mid - body_half + 11 + (span / (n - 1)) * i if n > 1 else mid
        d.rectangle([bx - 3.2, top + 2, bx + 3.2, bot - 2], fill=BAND[nm])
    plug(d, (xa, ya))
    plug(d, (xb, yb))
    return mid, top


def to92(d, col_e, row):
    """TO-92：三隻腳插在 col_e…col_e+2 的同一列，本體朝溝槽掛下去。"""
    xs = [hole(col_e + k, row)[0] for k in range(3)]
    y = hole(col_e, row)[1]
    for x in xs:
        d.line([(x, y), (x, y + 14)], fill=LEAD, width=4)
        plug(d, (x, y))
    bx0, bx1 = xs[0] - 14, xs[2] + 14
    by0, by1 = y + 14, y + 14 + 52
    d.rectangle([bx0, by0, bx1, by1 - 16], fill=TO92)
    d.pieslice([bx0, by1 - 46, bx1, by1], 0, 180, fill=TO92)
    d.line([(bx0, by0 + 1), (bx1, by0 + 1)], fill=(100, 100, 103), width=2)
    text(d, ((bx0 + bx1) / 2, (by0 + by1) / 2 - 2), "2N\n2222A", size=13,
         fill=(236, 236, 236), anchor=None, align="center", spacing=2)
    return by1


def to92_label(d, col_e, row):
    """腳位字母標在 f 與 g 兩列之間的空隙，白底，不壓到任何孔。"""
    y = hole(col_e, row)[1]
    for k, t in enumerate("EBC"):
        x = hole(col_e + k, row)[0]
        badge(d, (x, y - 13), t, size=14, fill=MEAS_RED, anchor="mm", pad=3)


def badge(d, xy, s, size=15, fill=CALL, anchor="lm", bg=(252, 252, 250), pad=6):
    """板子上的小標籤：白底 + 文字，避免壓在孔上看不清。"""
    _SEEN.update(s)
    fo = f(size)
    x, y = xy
    bb = d.textbbox((0, 0), s, font=fo)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    if anchor[0] == "l":
        x0 = x
    elif anchor[0] == "r":
        x0 = x - w
    else:
        x0 = x - w / 2
    y0 = y - h / 2
    d.rounded_rectangle([x0 - pad, y0 - pad - 2, x0 + w + pad, y0 + h + pad + 2],
                        radius=5, fill=bg, outline=(222, 222, 217))
    d.text((x0 - bb[0], y0 - bb[1]), s, font=fo, fill=fill)


def callout(d, xy, s, size=15, color=CALL, fill=PANEL, edge=PANEL_EDGE, pad=10, align="left"):
    _SEEN.update(s)
    fo = f(size)
    x, y = xy
    bb = d.multiline_textbbox((0, 0), s, font=fo, align=align, spacing=7)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([x - pad, y - pad, x + w + pad, y + h + pad + 4],
                        radius=8, fill=fill, outline=edge, width=2)
    d.multiline_text((x, y - bb[1]), s, font=fo, fill=color, align=align, spacing=7)
    return x + w + pad, y + h + pad + 4


def title(d, main, sub):
    text(d, (60, 32), main, size=31, fill=INK)
    text(d, (60, 80), sub, size=16, fill=INK2, spacing=7)


def table(d, x, y, headers, widths, rows, head_color=INK2, first_col_ink=INK):
    """簡單表格：標題列 + 分隔線 + 內容。回傳最後一列的 y。"""
    xs, acc = [], x
    for w in widths:
        xs.append(acc)
        acc += w
    for xx, t in zip(xs, headers):
        text(d, (xx, y), t, size=15, fill=head_color, anchor="lm")
    d.line([(x - 6, y + 14), (acc - 20, y + 14)], fill=(205, 205, 200), width=2)
    yy = y
    for i, r in enumerate(rows):
        yy = y + 40 + i * 30
        for xx, t in zip(xs, r):
            text(d, (xx, yy), t, size=15,
                 fill=first_col_ink if xx == x else INK2, anchor="lm")
    return yy


# ── 儀器面板（端子一律在下緣，導線往下走就不會打結） ─────────────────
def supply(d, x, y, ch1, ch2):
    w, h = 376, 158
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(236, 236, 233),
                        outline=(176, 176, 172), width=2)
    text(d, (x + 16, y + 12), "直流電源 GW Instek GPE-3323（Independent 模式）",
         size=14, fill=INK2)
    for i, (lab, val) in enumerate((("CH1 = V_BB", ch1), ("CH2 = V_CC", ch2))):
        yy = y + 40 + i * 44
        d.rounded_rectangle([x + 16, yy, x + 158, yy + 36], radius=5,
                            fill=(26, 34, 30), outline=(92, 92, 92))
        text(d, (x + 87, yy + 18), val, size=19, fill=(118, 238, 168), anchor="mm")
        text(d, (x + 170, yy + 18), lab, size=15, fill=INK2, anchor="lm")
    # 四個端子，由左到右：CH1+ CH1− CH2− CH2+
    posts = {}
    order = [("ch1+", "CH1+", (200, 60, 60)), ("ch1-", "CH1−", (50, 50, 50)),
             ("ch2-", "CH2−", (50, 50, 50)), ("ch2+", "CH2+", (200, 60, 60))]
    for i, (key, lab, col) in enumerate(order):
        px = x + 54 + i * 90
        d.ellipse([px - 11, y + h - 11, px + 11, y + h + 11], fill=col,
                  outline=(30, 30, 30))
        text(d, (px, y + h - 26), lab, size=13, fill=INK2, anchor="mm")
        posts[key] = (px, y + h + 8)
    return posts


def meter(d, x, y, reading, caption):
    w, h = 244, 132
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(232, 232, 228),
                        outline=(172, 172, 167), width=2)
    d.rounded_rectangle([x + 16, y + 14, x + w - 16, y + 66], radius=5, fill=(203, 214, 198))
    text(d, (x + w / 2, y + 40), reading, size=26, fill=(28, 34, 28), anchor="mm")
    text(d, (x + w / 2, y + 86), "GDM-532　直流電壓檔", size=13, fill=INK2, anchor="mm")
    text(d, (x + w / 2, y - 16), caption, size=16, fill=INK, anchor="mm")
    red = (x + 72, y + h + 8)
    blk = (x + w - 72, y + h + 8)
    for (px, py), col, lab in ((red, (200, 60, 60), "紅"), (blk, (50, 50, 50), "黑")):
        d.ellipse([px - 11, py - 19, px + 11, py + 3], fill=col, outline=(30, 30, 30))
        text(d, (px, py + 18), lab, size=13, fill=INK2, anchor="mm")
    return red, blk


def clip(d, xy, angle_right=True, color=(150, 150, 155)):
    """鱷魚夾：夾住一條鬆線的末端。"""
    x, y = xy
    s = 1 if angle_right else -1
    d.polygon([(x, y - 9), (x + s * 34, y - 5), (x + s * 34, y + 5), (x, y + 9)],
              fill=color, outline=(110, 110, 115))
    d.line([(x + s * 6, y - 2), (x + s * 30, y - 2)], fill=(95, 95, 100), width=2)
    d.ellipse([x + s * 30 - 5, y - 5, x + s * 30 + 5, y + 5], fill=(120, 120, 126))


def lead_from_hole(d, col, row, to_xy, color, lane_y, free_dx=56):
    """照 Lab 1 的做法：一條鬆線插在孔裡、末端露出來，再用鱷魚夾夾住接到儀器。"""
    hx, hy = hole(col, row)
    tip = (hx + free_dx, lane_y)
    wire(d, [(hx, hy), (hx + free_dx * 0.45, (hy + lane_y) / 2), tip], WIRE_ORANGE, width=5)
    plug(d, (hx, hy))
    clip(d, tip, angle_right=True)
    cx_, cy_ = tip[0] + 34, tip[1]
    wire(d, [(cx_, cy_), ((cx_ + to_xy[0]) / 2, to_xy[1] - 34), to_xy], color, width=5)


# ── 這塊板子的孔位（實驗一與實驗二共用，接線完全一樣） ──────────────
C_VBB = 18        # V_BB 從 ＋軌 跳進板上的欄
C_E, C_B, C_C = 30, 31, 32
C_R2G = 42        # R2 下端接地的欄
C_VCC = 45        # V_CC 進線的欄（R_C 另一端）
C_BLK = 56        # 電表黑線固定夾在 −軌 的這一欄

BANDS_10K = ["棕", "黑", "黑", "紅", "棕"]
BANDS_4K7 = ["黃", "紫", "黑", "棕", "棕"]
BANDS_1K = ["棕", "黑", "黑", "棕", "棕"]


def draw_circuit(d, pinout=True):
    jumper(d, C_VBB, "j", "+", lane_dx=-14)
    jumper(d, C_E, "j", "-", lane_dx=-14)
    jumper(d, C_R2G, "j", "-", lane_dx=14)

    m1 = resistor(d, C_VBB, C_B, "i", BANDS_10K)
    m2 = resistor(d, C_B, C_R2G, "h", BANDS_4K7)
    m3 = resistor(d, C_C, C_VCC, "g", BANDS_1K)
    to92(d, C_E, "f")
    if pinout:
        to92_label(d, C_E, "f")

    # R1 的標籤往上多讓一點：量測圖會有一條引線沿著 j 列走過它底下
    for (mx, my), name, dx, dy in ((m1, "R1", 0, -26), (m2, "R2", -58, -12),
                                   (m3, "RC", 60, -12)):
        badge(d, (mx + dx, my + dy), name, size=15, anchor="mm")


def node_marks(d):
    """三個節點標在下半區空白處：外側欄走得最深，三條引線一起向右折，彼此不交叉。"""
    y_body = Y_LO["e"] + 16
    x_turn = cx(35)
    specs = [
        (C_C, Y_LO["c"], "集極 C ＝ 第 32 欄（RC 的一端）", ACCENT),
        (C_B, Y_LO["b"], "基極 B ＝ 第 31 欄（R1 與 R2 的接點）", ACCENT),
        (C_E, Y_LO["a"], "射極 E ＝ 第 30 欄（跳線直接接地）", INK2),
    ]
    for col, ydepth, s, color in specs:
        x = cx(col)
        d.line([(x, y_body), (x, ydepth), (x_turn, ydepth)], fill=color, width=2, joint="curve")
        d.ellipse([x - 5, y_body - 5, x + 5, y_body + 5], fill=color)
        badge(d, (x_turn + 12, ydepth), s, size=15, fill=color, anchor="lm")


def tag(d, col, row, t, color, dx=0, dy=0):
    x, y = hole(col, row)
    x, y = x + dx, y + dy
    r = 12
    d.ellipse([x - r, y - r, x + r, y + r], fill=color, outline=(255, 255, 255), width=2)
    text(d, (x, y - 1), t, size=14, fill=(255, 255, 255), anchor="mm")


def new_canvas():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)


# ── 圖一：接線圖 ──────────────────────────────────────────────────
def fig_wiring():
    img, d = new_canvas()
    title(d, "Lab 2 第一部分：實體麵包板接線（實驗一與實驗二共用同一塊板）",
          "全尺寸麵包板：60 欄，上排 j–f、下排 e–a，上下各一組電源軌（每組「−」在外側、「＋」在內側）。\n"
          "上方「−」軌當共地、上方「＋」軌送 V_BB；V_CC 不走電源軌，直接用一條線進第 45 欄。")

    posts = supply(d, 60, 158, "02.400", "10.000")
    draw_board(d)
    draw_circuit(d)
    node_marks(d)

    # 電源四條線：端子由左到右、目標也由左到右，彼此不交叉
    targets = [
        ("ch1+", hole(7, "+"), WIRE_RED, "CH1+ → ＋軌"),
        ("ch1-", hole(10, "-"), WIRE_BLACK, "CH1− → −軌"),
        ("ch2-", hole(13, "-"), WIRE_BLACK, "CH2− → −軌"),
    ]
    for i, (key, tgt, col, lab) in enumerate(targets):
        px, py = posts[key]
        lane = 372 + i * 0
        wire(d, [(px, py), (px, lane), (tgt[0], lane + 14), tgt], col, width=6)
        plug(d, tgt)
    px, py = posts["ch2+"]
    wire(d, [(px, py), (px, 392), (cx(C_VCC) - 18, 392), hole(C_VCC, "j")], WIRE_RED, width=6)
    plug(d, hole(C_VCC, "j"))

    text(d, (cx(7) - 20, 410), "CH1+ 進「＋」軌＝V_BB", size=14, fill=CALL, anchor="rm")
    text(d, (cx(13) + 20, 410), "CH1− 與 CH2− 一起夾「−」軌＝共地", size=14, fill=CALL, anchor="lm")
    text(d, (cx(C_VCC) - 28, 376), "CH2+ 直接進 j45（RC 的另一端）＝V_CC",
         size=14, fill=CALL, anchor="rm")

    callout(d, (980, 168),
            "為什麼 V_CC 不也走電源軌？\n"
            "板子上方只有一組「＋」軌，已經給了 V_BB。\n"
            "下方那組要橫跨整塊板才接得到上排，不如把 CH2+ 直接夾進 j45。\n\n"
            "兩路的負端一定要一起夾在同一條「−」軌上。漏掉這一步，\n"
            "兩個迴路各自浮接，電表量到的電壓沒有共同參考點。")

    callout(d, (494, 176),
            "元件（藍色本體是 1% 金屬皮膜，色環五圈）\n"
            "　R1　10 kΩ　棕 黑 黑 紅 棕\n"
            "　R2　4.7 kΩ　黃 紫 黑 棕 棕\n"
            "　RC　1 kΩ　　棕 黑 黑 棕 棕\n"
            "　Q1　2N2222A（TO-92）\n"
            "跳線用黃色單芯線，電源與電表用鱷魚夾夾住插在孔裡的線。")

    y = 952
    text(d, (60, y), "接線順序（照這個順序插，每插一條就對一次欄號）", size=19, fill=INK)
    table(d, 66, y + 42,
          ["", "插什麼", "為什麼"],
          [40, 400, 420],
          [(str(i + 1), a, b) for i, (a, b) in enumerate([
              ("CH1− 與 CH2− 兩條線都夾進上方「−」軌", "共地。漏掉這條整個電路不會動"),
              ("CH1+ 夾進上方「＋」軌", "這一路是 V_BB"),
              ("黃跳線：＋軌 → j18", "把 V_BB 帶到板上"),
              ("R1 10 kΩ 橫插 i18 → i31", "分壓上臂"),
              ("R2 4.7 kΩ 橫插 h31 → h42", "分壓下臂；第 31 欄就是基極節點"),
              ("黃跳線：j42 → −軌", "R2 下端接地"),
              ("2N2222A 插在 f30／f31／f32", "平面朝自己、由左到右 E–B–C，本體朝溝槽掛"),
              ("黃跳線：j30 → −軌", "射極接地"),
              ("RC 1 kΩ 橫插 g32 → g45", "一端集極、一端 V_CC"),
              ("CH2+ 夾一條線插進 j45", "這一路是 V_CC"),
          ])])

    _, y_next = callout(d, (1010, y + 42),
            "同一欄的 f–j 五個孔在板子內部是連通的，所以：\n"
            "　　第 18 欄 ＝ V_BB　　第 31 欄 ＝ 基極　　第 45 欄 ＝ V_CC\n"
            "　　第 30 欄 ＝ 射極　　第 32 欄 ＝ 集極\n\n"
            "每一欄都還有兩三個孔空著，等一下電表就插那裡——\n"
            "量電壓完全不必拔任何元件，也不必剪線。\n"
            "電晶體本體朝溝槽掛，g、h、i、j 四列才不會被擋住。")

    callout(d, (1010, y_next + 26),
            "注意　2N2222A 的腳位以手上那顆的 datasheet 為準。TO-92 常見是\n"
            "「平面朝自己、由左到右 E–B–C」，但有些產地的 PN2222A 剛好相反。\n"
            "插反了 B–E 接面會變成逆偏，整張表都會量到 0。",
            color=WARN, edge=(225, 180, 180))
    return img


# ── 圖二：實驗一量測 ──────────────────────────────────────────────
def fig_measure_exp1():
    img, d = new_canvas()
    title(d, "Lab 2 實驗一：電表夾在哪（V_BB 固定一組，V_CC 從 0 V 每次加 0.5 V 掃到 15 V）",
          "只有一支 GDM-532，一次只能量一個電壓。好消息是這個實驗幾乎不用移表——\n"
          "射極接地，集極對地的電位就是 V_CE，整組 31 個點都夾同樣兩點。")

    draw_board(d)
    draw_circuit(d, pinout=False)
    node_marks(d)

    red, blk = meter(d, 1310, 170, "2.330 V", "整組掃描都夾著不動")
    lead_from_hole(d, C_C, "i", red, MEAS_RED, lane_y=352, free_dx=64)
    lead_from_hole(d, C_BLK, "-", blk, MEAS_BLK, lane_y=378, free_dx=40)
    tag(d, C_C, "i", "1", MEAS_RED)
    tag(d, C_BLK, "-", "1", MEAS_BLK)

    tag(d, C_B, "j", "2", (190, 120, 0))
    d.line([(cx(C_B) - 14, Y_UP["j"]), (cx(24), Y_UP["j"])], fill=(190, 120, 0), width=2)
    badge(d, (cx(24) - 8, Y_UP["j"]), "量 V_BE 時紅線改插這裡（j31）", size=15,
          fill=(165, 105, 0), anchor="rm")

    y = 952
    text(d, (60, y), "量測清單", size=19, fill=INK)
    table(d, 66, y + 42,
          ["量什麼", "紅線插哪", "黑線插哪", "什麼時候量", "為什麼這樣接"],
          [190, 230, 210, 260, 420],
          [("1　V_CE", "i32（集極欄）", "上方「−」軌", "每個 V_CC 都要",
            "射極接地，集極對地的電位就是 V_CE"),
           ("2　V_BE", "j31（基極欄）", "上方「−」軌", "每換一組 V_BB 量一次",
            "R2 和 B–E 接面並聯，這一點就是 V_BE"),
           ("　　V_CC", "不必量", "—", "直接抄電源面板",
            "面板那個數字就是 V_CC"),
           ("　　I_C", "不必量", "—", "填表時自動算",
            "I_C ＝（V_CC − V_CE）÷ 1 kΩ")])

    callout(d, (66, y + 206),
            "想直接量 RC 的壓降：紅線改插 h45（V_CC 端）、黑線改插 h32（集極）。\n"
            "實驗一量一個就夠（V_CE ＋ V_RC ＝ V_CC），記錄簿兩欄都留著是為了當場對帳。")

    callout(d, (1010, y + 206),
            "注意　轉盤一定要在直流電壓檔，兩條線並聯跨在待測的兩點之間。\n"
            "轉到電流檔再並聯上去，等於拿電表當導線把電路短路，會燒保險絲。",
            color=WARN, edge=(225, 180, 180))
    return img


# ── 圖三：實驗二量測 ──────────────────────────────────────────────
def fig_measure_exp2():
    img, d = new_canvas()
    title(d, "Lab 2 實驗二：四筆壓降輪流量（V_BB ＝ V_CC ＝ 15.0 V，接線完全不動）",
          "和實驗一同一塊板、同一組接線，只把兩台電源都轉到 15 V。\n"
          "一支表量四個地方，1 → 4 依序夾，每量完一筆就記一筆；I_B 是算出來的，不是量出來的。")

    draw_board(d)
    draw_circuit(d, pinout=False)
    node_marks(d)

    red, blk = meter(d, 1310, 170, "0.750 V", "一支表輪流量四筆")
    lead_from_hole(d, C_B, "j", red, MEAS_RED, lane_y=352, free_dx=64)
    lead_from_hole(d, C_BLK, "-", blk, MEAS_BLK, lane_y=378, free_dx=40)

    # 四組夾點：紅在上、黑在下，分散在不同列避免疊在一起
    marks = [
        (C_VBB, "h", "1", MEAS_RED), (C_B, "g", "1", MEAS_BLK),
        (C_B, "j", "2", MEAS_RED), (C_BLK, "-", "2", MEAS_BLK),
        (C_VCC, "h", "3", MEAS_RED), (C_C, "h", "3", MEAS_BLK),
        (C_C, "i", "4", ACCENT), (C_BLK - 4, "-", "4", ACCENT),
    ]
    for col, row, t, c in marks:
        tag(d, col, row, t, c)

    y = 952
    text(d, (60, y), "四筆量測（接線完全不動，只移電表那兩條線）", size=19, fill=INK)
    table(d, 66, y + 42,
          ["順序／量什麼", "紅線插哪", "黑線插哪", "LTspice 預報", "拿來算什麼"],
          [250, 250, 250, 220, 340],
          [("1　V_R1", "h18（V_BB 欄）", "g31（基極欄）", "14.25 V", "I_R1 ＝ V_R1 ÷ 10 kΩ"),
           ("2　V_R2（＝ V_BE）", "j31（基極欄）", "上方「−」軌", "0.750 V", "I_R2 ＝ V_R2 ÷ 4.7 kΩ"),
           ("3　V_RC", "h45（V_CC 欄）", "h32（集極欄）", "14.95 V", "I_C ＝ V_RC ÷ 1 kΩ"),
           ("4　V_CE", "i32（集極欄）", "上方「−」軌", "0.054 V", "判斷在不在飽和區")])

    callout(d, (66, y + 206),
            "I_B 用 KCL 算：I_B ＝ I_R1 − I_R2，再用 β ＝ I_C ÷ I_B。\n"
            "全程不必把電流表串進任何迴路——串電流表要先把線拔開，\n"
            "拔錯一次整組數據就得重量。")

    callout(d, (1010, y + 206),
            "注意　第 4 筆要直接量，不可以拿 V_CC 減 V_RC。\n"
            "兩個 15 V 量級的數相減，誤差和待測的 0.05 V 同一個數量級，\n"
            "三位半顯示會直接給你 0，看起來像飽和其實是量錯。",
            color=WARN, edge=(225, 180, 180))
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, fn in (("lab2-part1-breadboard", fig_wiring),
                     ("lab2-part1-measure-exp1", fig_measure_exp1),
                     ("lab2-part1-measure-exp2", fig_measure_exp2)):
        p = os.path.normpath(os.path.join(OUT_DIR, name + ".png"))
        fn().save(p)
        print("寫出", p)
    missing = check_glyphs()
    if missing:
        print("字型缺字（會變成空心方框）：", " ".join(missing), file=sys.stderr)
        return 1
    print("字型檢查：全部可畫")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
