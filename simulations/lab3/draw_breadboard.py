"""畫出 Lab 3 第一部分三種接法在**實體麵包板**上的接線圖。

幾何與配色直接沿用 Lab 2 的 `draw_real_breadboard.py`（同一塊全尺寸 60 欄板、
同一套配色與儀器面板），這裡只放 Lab 3 自己的孔位與標籤。2N7000 是 TO-92 包裝，
平面朝自己、腳朝下時由左到右是 **S（源極）／G（閘極）／D（汲極）**，與 2N2222A 的
E／B／C 不同，配方表與圖上都標出來。

輸出到 public/note-images/ec-week11-breadboard/：
  lab3-exp1-breadboard.png    實驗一：R1 1 kΩ 串在**源極**（輸出特性曲線）
  lab3-exp2-breadboard.png    實驗二／三：R1 100 Ω 串在**汲極**、源極直接接地
  lab3-exp4-breadboard.png    實驗四：LED 開關（LED 在汲極、R1 100 Ω 在源極）

用法：simulations/lab1/.venv/bin/python simulations/lab3/draw_breadboard.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "lab2"))

import draw_real_breadboard as bb  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week11-breadboard")

# ── 這三張圖共用的孔位 ────────────────────────────────────────────
C_S, C_G, C_D = 30, 31, 32      # 2N7000 的三隻腳（源極／閘極／汲極）
C_GND = 16                      # 接地側跳線的欄
C_SUP = 44                      # V_DS／V_DD 進線的欄
C_BLK = 54                      # 電表黑線固定夾在 −軌 的這一欄

BANDS_1K = ["棕", "黑", "黑", "棕", "棕"]
BANDS_100 = ["棕", "黑", "黑", "黑", "棕"]

# 儀器與板子之間的水平走廊（面板端子在 y≈286／290，板子上緣 420）
LANE_CH2P, LANE_GND, LANE_GND2, LANE_CH1P = 306, 324, 342, 360
LANE_MRED, LANE_MBLK = 380, 398

LED_RED = (214, 52, 52)
LED_DARK = (150, 28, 28)


def to92_7000(d, col_s, row):
    """TO-92 的 2N7000，本體朝溝槽掛下去；腳位 S／G／D。"""
    xs = [bb.hole(col_s + k, row)[0] for k in range(3)]
    y = bb.hole(col_s, row)[1]
    for x in xs:
        d.line([(x, y), (x, y + 14)], fill=bb.LEAD, width=4)
        bb.plug(d, (x, y))
    bx0, bx1 = xs[0] - 14, xs[2] + 14
    by0, by1 = y + 14, y + 14 + 52
    d.rectangle([bx0, by0, bx1, by1 - 16], fill=bb.TO92)
    d.pieslice([bx0, by1 - 46, bx1, by1], 0, 180, fill=bb.TO92)
    d.line([(bx0, by0 + 1), (bx1, by0 + 1)], fill=(100, 100, 103), width=2)
    bb.text(d, ((bx0 + bx1) / 2, (by0 + by1) / 2 - 2), "2N\n7000", size=13,
            fill=(236, 236, 236), align="center", spacing=2)
    for k, t in enumerate("SGD"):
        bb.badge(d, (xs[k], y - 13), t, size=14, fill=bb.MEAS_RED, anchor="mm", pad=3)


def led(d, col_k, col_a, row):
    """LED：col_k 是陰極（短腳、平邊），col_a 是陽極（長腳）。本體畫成紅色圓頭。"""
    (xk, yk), (xa, ya) = bb.hole(col_k, row), bb.hole(col_a, row)
    mid = (xk + xa) / 2
    lift = 12
    half = 34
    d.line([(xk, yk), (xk + 12, yk - lift), (mid - half, yk - lift)], fill=bb.LEAD, width=4)
    d.line([(xa, ya), (xa - 12, ya - lift), (mid + half, ya - lift)], fill=bb.LEAD, width=4)
    top, bot = yk - lift - 14, yk - lift + 14
    d.rounded_rectangle([mid - half, top, mid + half, bot], radius=13, fill=LED_RED)
    d.rectangle([mid - half, top, mid - half + 9, bot], fill=LED_DARK)
    bb.plug(d, (xk, yk))
    bb.plug(d, (xa, ya))
    return mid, top


def row_jumper(d, col_a, col_b, row, color=None, lift=9):
    """板上同一列兩欄之間的跳線（稍微抬起來，不壓在中間的孔上）。"""
    (xa, ya), (xb, yb) = bb.hole(col_a, row), bb.hole(col_b, row)
    bb.wire(d, [(xa, ya), (xa + 10, ya - lift), (xb - 10, yb - lift), (xb, yb)],
            color or bb.WIRE_YELLOW)
    bb.plug(d, (xa, ya))
    bb.plug(d, (xb, yb))
    return (xa + xb) / 2, ya - lift


def supply3(d, x, y, ch2_label="CH2 = V_DS"):
    """GPE-3323 面板：CH1 = V_GS、CH2 = V_DS／V_DD。端子一律在下緣。"""
    w, h = 376, 158
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(236, 236, 233),
                        outline=(176, 176, 172), width=2)
    bb.text(d, (x + 16, y + 12), "直流電源 GW Instek GPE-3323（Independent 模式）",
            size=14, fill=bb.INK2)
    for i, lab in enumerate(("CH1 = V_GS", ch2_label)):
        yy = y + 40 + i * 44
        d.rounded_rectangle([x + 16, yy, x + 158, yy + 36], radius=5,
                            fill=(26, 34, 30), outline=(92, 92, 92))
        bb.text(d, (x + 87, yy + 18), "0.00 V", size=19, fill=(118, 238, 168), anchor="mm")
        bb.text(d, (x + 170, yy + 18), lab, size=15, fill=bb.INK2, anchor="lm")
    posts = {}
    order = [("ch1+", "CH1+", (200, 60, 60)), ("ch1-", "CH1−", (50, 50, 50)),
             ("ch2-", "CH2−", (50, 50, 50)), ("ch2+", "CH2+", (200, 60, 60))]
    for i, (key, lab, col) in enumerate(order):
        px = x + 54 + i * 90
        d.ellipse([px - 11, y + h - 11, px + 11, y + h + 11], fill=col,
                  outline=(30, 30, 30))
        bb.text(d, (px, y + h - 26), lab, size=13, fill=bb.INK2, anchor="mm")
        posts[key] = (px, y + h + 8)
    return posts


def rails(d, ch2_label="CH2 = V_DS"):
    """兩台電源：CH1 = V_GS 走 ＋軌，CH2 = V_DS 用一條鬆線直接進 C_SUP 欄，
    兩台的 − 共接 −軌。面板端子由左到右是 CH1+ CH1− CH2− CH2+。"""
    posts = supply3(d, 470, 120, ch2_label)
    x1, y1 = bb.hole(6, "+")
    bb.wire(d, [posts["ch1+"], (posts["ch1+"][0], LANE_CH1P), (x1, LANE_CH1P), (x1, y1)],
            bb.WIRE_RED, width=5)
    bb.plug(d, (x1, y1))
    for key, col, lane in (("ch1-", 10, LANE_GND), ("ch2-", 12, LANE_GND2)):
        xx, yy = bb.hole(col, "-")
        bb.wire(d, [posts[key], (posts[key][0], lane), (xx, lane), (xx, yy)],
                bb.WIRE_BLACK, width=5)
        bb.plug(d, (xx, yy))
    xs, ys = bb.hole(C_SUP, "j")
    bb.wire(d, [posts["ch2+"], (posts["ch2+"][0], LANE_CH2P), (xs, LANE_CH2P), (xs, ys)],
            bb.WIRE_RED, width=5)
    bb.plug(d, (xs, ys))
    return posts


def meter_across(d, col_red, row_red, caption, reading):
    """萬用表：紅線插在板上某孔、黑線固定夾在 −軌，量的是該節點對地電壓。"""
    red, blk = bb.meter(d, 1450, 140, reading, caption)
    xr, yr = bb.hole(col_red, row_red)
    bb.wire(d, [red, (red[0], LANE_MRED), (xr, LANE_MRED), (xr, yr)],
            bb.MEAS_RED, width=5)
    bb.plug(d, (xr, yr))
    xb, yb = bb.hole(C_BLK, "-")
    bb.wire(d, [blk, (blk[0], LANE_MBLK), (xb, LANE_MBLK), (xb, yb)],
            bb.MEAS_BLK, width=5)
    bb.plug(d, (xb, yb))


def legend(d, rows):
    bb.table(d, 60, 1010, ["元件／接線", "插在哪裡", "為什麼"], [340, 460, 860], rows)


def save(img, name):
    os.makedirs(OUT_DIR, exist_ok=True)
    img.save(os.path.join(OUT_DIR, name + ".png"))
    print("  ", os.path.normpath(os.path.join(OUT_DIR, name + ".png")))


def fig_exp1():
    img, d = bb.new_canvas()
    bb.title(d, "Lab 3 實驗一：輸出特性曲線的接線（R1 1 kΩ 串在「源極」）",
             "2N7000 的 S／G／D 插在第 30／31／32 欄；R1 的左端與 −軌 共地。\n"
             "電源讀到的 V_GS、V_DS 都含 R1 的壓降，不等於元件端點電壓——這就是實驗一要先看懂的地方。")
    bb.draw_board(d)
    rails(d)

    bb.jumper(d, C_G, "j", "+", lane_dx=14)
    bb.jumper(d, C_GND, "j", "-", lane_dx=-14)
    m1 = bb.resistor(d, C_GND, C_S, "i", BANDS_1K)
    bb.badge(d, (m1[0], m1[1] - 26), "R1 1 kΩ", size=15, anchor="mm")
    row_jumper(d, C_D, C_SUP, "h")
    to92_7000(d, C_S, "f")

    meter_across(d, C_S, "g", "電表量 R1 上的壓降 → I_D = V / 1 kΩ", "0.000 V")

    legend(d, [
        ("2N7000", "f30（S）／f31（G）／f32（D）", "本體朝溝槽掛，讓 g–j 列空出來給跳線與電表"),
        ("R1 1 kΩ", "i16 ←→ i30", "右端就是源極節點（同一欄 f–j 相通），左端跳線接地"),
        ("黃跳線", "j16 → −軌", "R1 的接地端"),
        ("黃跳線", "j31 → ＋軌", "閘極吃 CH1（V_GS）"),
        ("黃跳線", "h32 → h44", "汲極拉到第 44 欄，讓 CH2 的鬆線離閘極遠一點"),
        ("電表紅／黑", "g30 ／ −軌 第 54 欄", "量 R1 壓降；除以 1 kΩ 就是 I_D，不必把電表串進迴路"),
    ])
    save(img, "lab3-exp1-breadboard")


def fig_exp2():
    img, d = bb.new_canvas()
    bb.title(d, "Lab 3 實驗二／三：轉移特性曲線與導通電阻的接線（R1 100 Ω 串在「汲極」）",
             "和實驗一只差一件事：電阻從源極搬到汲極，源極直接跳線接地。\n"
             "源極一接地，電源讀到的 V_GS 就是元件真正的 V_GS——這是實驗二能量出臨界電壓的前提。")
    bb.draw_board(d)
    rails(d)

    bb.jumper(d, C_G, "j", "+", lane_dx=14)
    bb.jumper(d, C_S, "j", "-", lane_dx=-14)
    m1 = bb.resistor(d, C_D, C_SUP, "i", BANDS_100)
    bb.badge(d, (m1[0], m1[1] - 26), "R1 100 Ω", size=15, anchor="mm")
    to92_7000(d, C_S, "f")

    meter_across(d, C_D, "h", "電表量汲極對地電壓 V_D（= 元件的 V_DS）", "0.000 V")

    legend(d, [
        ("2N7000", "f30（S）／f31（G）／f32（D）", "位置與實驗一完全相同，只有外圍接線換"),
        ("黃跳線", "j30 → −軌", "源極直接接地，V_GS 就是電源讀數"),
        ("黃跳線", "j31 → ＋軌", "閘極吃 CH1（V_GS），掃描級距 0.5 V"),
        ("R1 100 Ω", "i32 ←→ i44", "串在汲極；V_DS(電源) − V_D = I_D × 100 Ω"),
        ("CH2 紅線", "j44", "V_DS 進線；實驗三改接定電流源（見筆記說明）"),
        ("電表紅／黑", "h32 ／ −軌 第 54 欄", "源極已接地，所以這一點量到的就是元件的 V_DS"),
    ])
    save(img, "lab3-exp2-breadboard")


def fig_exp4():
    img, d = bb.new_canvas()
    bb.title(d, "Lab 3 實驗四：MOSFET 當開關點亮 LED 的接線（V_DD = 8 V）",
             "LED 串在汲極、R1 100 Ω 回到源極。LED 的長腳（陽極）朝電源、平邊短腳（陰極）朝汲極。\n"
             "插反不會壞，但完全不亮也沒有電流——看到 I_D 一直是 0 就先檢查這裡。")
    bb.draw_board(d)
    rails(d, "CH2 = V_DD")

    bb.jumper(d, C_G, "j", "+", lane_dx=14)
    bb.jumper(d, C_GND, "j", "-", lane_dx=-14)
    m1 = bb.resistor(d, C_GND, C_S, "i", BANDS_100)
    bb.badge(d, (m1[0], m1[1] - 26), "R1 100 Ω", size=15, anchor="mm")
    mk = led(d, C_D, C_SUP - 4, "h")
    bb.badge(d, (mk[0], mk[1] - 24), "LED", size=15, anchor="mm", fill=LED_DARK)
    row_jumper(d, C_SUP - 4, C_SUP, "g")
    to92_7000(d, C_S, "f")

    meter_across(d, C_S, "g", "電表量 R1 上的壓降 → I_D = V / 100 Ω", "0.000 V")

    legend(d, [
        ("2N7000", "f30（S）／f31（G）／f32（D）", "位置不變"),
        ("LED", "h32（陰極、平邊）←→ h40（陽極、長腳）", "電流由陽極進、陰極出；插反就完全不亮"),
        ("黃跳線", "g40 → g44", "LED 陽極拉到 CH2（V_DD = 8 V）"),
        ("R1 100 Ω", "i16 ←→ i30", "串在源極，順便當電流取樣電阻"),
        ("黃跳線", "j16 → −軌 ／ j31 → ＋軌", "R1 接地；閘極吃 CH1（V_GS），0.5 V 一階往上掃"),
        ("電表紅／黑", "g30 ／ −軌 第 54 欄", "量 R1 壓降；LED「看起來亮」大約落在 2 mA"),
    ])
    save(img, "lab3-exp4-breadboard")


def main():
    print("輸出：")
    fig_exp1()
    fig_exp2()
    fig_exp4()
    missing = bb.check_glyphs()
    if missing:
        print("字型缺字：", missing)


if __name__ == "__main__":
    main()
