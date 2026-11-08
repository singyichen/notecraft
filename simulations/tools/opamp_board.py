"""Lab 4／Lab 5 的麵包板繪圖原語：DIP-8 運放、函數波產生器、示波器面板、下半部跳線。

幾何與配色沿用 `simulations/lab2/draw_real_breadboard.py`（同一塊 60 欄全尺寸板），
這裡只補運放實驗才需要的東西。import 時會把 lab2 那支模組掛成 `bb`。

DIP-8 的擺法：缺口朝左、本體橫跨中央溝槽。
  下半部（列 e，由左到右）：腳 1、2、3、4
  上半部（列 f，由左到右）：腳 8、7、6、5
uA741 的腳位：1／5 = 偏移歸零，2 = 反相輸入，3 = 非反相輸入，4 = V−，
6 = 輸出，7 = V+，8 = 空腳。
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "lab2"))

import draw_real_breadboard as bb  # noqa: E402

DIP_BODY = (58, 58, 62)
DIP_EDGE = (96, 96, 100)
PIN_INK = (205, 45, 45)
BNC_RED = (200, 60, 60)
BNC_BLK = (50, 50, 50)

# uA741 腳位 → (欄偏移, 列)
UA741 = {
    1: (0, "e"), 2: (1, "e"), 3: (2, "e"), 4: (3, "e"),
    5: (3, "f"), 6: (2, "f"), 7: (1, "f"), 8: (0, "f"),
}
PIN_NAME = {1: "1", 2: "2 −", 3: "3 +", 4: "4 V−", 5: "5", 6: "6 out", 7: "7 V+", 8: "8"}


def pin(col0: int, n: int) -> tuple[int, str]:
    """晶片最左欄是 col0 時，第 n 腳的（欄, 列）。"""
    dc, row = UA741[n]
    return col0 + dc, row


def dip8(d, col0: int, name: str = "uA741") -> dict[int, tuple[int, str]]:
    """畫一顆橫跨溝槽的 DIP-8，回傳腳位對照表。"""
    x_l = bb.cx(col0) - 15
    x_r = bb.cx(col0 + 3) + 15
    y_t, y_b = bb.Y_TROUGH_A - 8, bb.Y_TROUGH_B + 8
    for n in range(1, 9):
        c, row = pin(col0, n)
        x, y = bb.hole(c, row)
        y_in = y_t if row == "f" else y_b
        d.line([(x, y), (x, y_in)], fill=bb.LEAD, width=5)
        bb.plug(d, (x, y))
    d.rounded_rectangle([x_l, y_t, x_r, y_b], radius=4, fill=DIP_BODY, outline=DIP_EDGE, width=2)
    # 缺口（朝左）
    d.pieslice([x_l - 9, (y_t + y_b) / 2 - 9, x_l + 9, (y_t + y_b) / 2 + 9], 270, 90,
               fill=bb.BOARD, outline=DIP_EDGE)
    bb.text(d, ((x_l + x_r) / 2 + 6, (y_t + y_b) / 2 - 1), name, size=13,
            fill=(238, 238, 238), anchor="mm")
    return {n: pin(col0, n) for n in range(1, 9)}


def dip8_labels(d, col0: int, pins=(2, 3, 4, 6, 7)):
    """在晶片外側標腳號（上半部標在 g 列之上，下半部標在 d 列之下），不壓孔。"""
    for n in pins:
        c, row = pin(col0, n)
        x, y = bb.hole(c, row)
        dy = -15 if row == "f" else 15
        bb.badge(d, (x, y + dy), PIN_NAME[n], size=13, fill=PIN_INK, anchor="mm", pad=3)


def jumper_b(d, col, row, rail, lane_dx=0):
    """黃色跳線：下半部某孔 ←→ 下方電源軌（繞過下方欄號列）。"""
    (xh, yh), (xr, yr) = bb.hole(col, row), bb.hole(col, rail)
    xm = xh + lane_dx
    bb.wire(d, [(xh, yh), (xm, bb.Y_NUM_B - 2), (xr, yr)], bb.WIRE_YELLOW)
    bb.plug(d, (xh, yh))
    bb.plug(d, (xr, yr))


def trough_jumper(d, col_lo, row_lo, col_up, row_up, color=None):
    """跨中央溝槽的跳線：下半部某孔 ←→ 上半部某孔。"""
    (x1, y1), (x2, y2) = bb.hole(col_lo, row_lo), bb.hole(col_up, row_up)
    bb.wire(d, [(x1, y1), (x1, (y1 + y2) / 2), (x2, (y1 + y2) / 2), (x2, y2)],
            color or bb.WIRE_ORANGE)
    bb.plug(d, (x1, y1))
    bb.plug(d, (x2, y2))


def jump(d, c1, r1, c2, r2, color=None, bow=0):
    """同半部的兩孔之間拉一條跳線；bow 是中段往外凸的像素（避開其他元件）。"""
    (x1, y1), (x2, y2) = bb.hole(c1, r1), bb.hole(c2, r2)
    mid = ((x1 + x2) / 2, (y1 + y2) / 2 + bow)
    bb.wire(d, [(x1, y1), mid, (x2, y2)], color or bb.WIRE_YELLOW)
    bb.plug(d, (x1, y1))
    bb.plug(d, (x2, y2))


def fgen(d, x, y, rows, title="訊號產生器 GW Instek AFG-2225", two_ch=True):
    """函數波產生器面板。rows 是 [(通道, 讀值, 說明), ...]；回傳 {('ch1','+'): (x,y), ...}。"""
    w = 420
    h = 118 + 46 * len(rows)
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(236, 236, 233),
                        outline=(176, 176, 172), width=2)
    bb.text(d, (x + 16, y + 12), title, size=14, fill=bb.INK2)
    for i, (ch, val, note) in enumerate(rows):
        yy = y + 40 + i * 46
        d.rounded_rectangle([x + 16, yy, x + 186, yy + 38], radius=5,
                            fill=(26, 34, 30), outline=(92, 92, 92))
        bb.text(d, (x + 101, yy + 19), val, size=18, fill=(118, 238, 168), anchor="mm")
        bb.text(d, (x + 198, yy + 11), ch, size=14, fill=bb.INK, anchor="lm")
        bb.text(d, (x + 198, yy + 29), note, size=13, fill=bb.INK2, anchor="lm")
    posts = {}
    order = [("ch1", "CH1 蕊", "CH1 地"), ("ch2", "CH2 蕊", "CH2 地")]
    n = 2 if two_ch else 1
    for i in range(n):
        key, lr, lb = order[i]
        for j, (lab, col) in enumerate(((lr, BNC_RED), (lb, BNC_BLK))):
            px = x + 70 + i * 196 + j * 84
            d.ellipse([px - 11, y + h - 11, px + 11, y + h + 11], fill=col,
                      outline=(30, 30, 30))
            bb.text(d, (px, y + h - 28), lab, size=13, fill=bb.INK2, anchor="mm")
            posts[(key, "+" if j == 0 else "-")] = (px, y + h + 8)
    return posts


def scope(d, x, y, caption, ch1, ch2):
    """示波器面板（Keysight EDUX1052G）：兩支探棒，棒尖與地夾各一個端子。"""
    w, h = 392, 178
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(232, 232, 228),
                        outline=(172, 172, 167), width=2)
    d.rounded_rectangle([x + 16, y + 34, x + w - 16, y + h - 42], radius=5, fill=(18, 22, 20))
    bb.text(d, (x + w / 2, y + 17), caption, size=14, fill=bb.INK2, anchor="mm")
    bb.text(d, (x + 28, y + 50), ch1, size=14, fill=(250, 214, 90), anchor="lm")
    bb.text(d, (x + 28, y + 72), ch2, size=14, fill=(110, 212, 250), anchor="lm")
    bb.text(d, (x + 28, y + 94), "量完按 [Meas] 讀 Pk-Pk、再用\n[Save/Recall] 把畫面存進 USB",
            size=12, fill=(176, 176, 176))
    posts = {}
    for i, (key, lab, col) in enumerate((("ch1", "CH1 棒尖", (250, 214, 90)),
                                         ("gnd", "共用地夾", (50, 50, 50)),
                                         ("ch2", "CH2 棒尖", (110, 212, 250)))):
        px = x + 66 + i * 130
        d.ellipse([px - 11, y + h - 11, px + 11, y + h + 11], fill=col, outline=(30, 30, 30))
        bb.text(d, (px, y + h - 26), lab, size=13, fill=bb.INK2, anchor="mm")
        posts[key] = (px, y + h + 8)
    return posts


def lead(d, col, row, to_xy, color, lane_y, free_dx=56):
    """鬆線插孔 → 鱷魚夾 → 儀器端子。整條用同一個顏色，顏色就代表那一路訊號。"""
    hx, hy = bb.hole(col, row)
    tip = (hx + free_dx, lane_y)
    bb.wire(d, [(hx, hy), (hx + free_dx * 0.5, (hy + lane_y) / 2), tip], color, width=5)
    bb.plug(d, (hx, hy))
    bb.clip(d, tip, angle_right=free_dx >= 0)
    cx_, cy_ = tip[0] + (34 if free_dx >= 0 else -34), tip[1]
    bb.wire(d, [(cx_, cy_), ((cx_ + to_xy[0]) / 2, (to_xy[1] + cy_) / 2), to_xy], color, width=5)


def rail_bridge(d, col_a, col_b, rail_a, rail_b, color=None):
    """兩條電源軌之間的連線（例如把上方 −軌 的共地接到下方 ＋軌）。"""
    (x1, y1), (x2, y2) = bb.hole(col_a, rail_a), bb.hole(col_b, rail_b)
    bb.wire(d, [(x1, y1), (x1 - 46, y1), (x1 - 46, y2), (x2, y2)], color or bb.WIRE_BLACK, width=6)
    bb.plug(d, (x1, y1))
    bb.plug(d, (x2, y2))


def psu_bipolar(d, x, y, v="15.000"):
    """GPE-3323 串聯成 ±15 V 的面板：CH1+ = +15 V、CH1−＝CH2+ = 0 V、CH2− = −15 V。"""
    w, h = 400, 176
    d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=(236, 236, 233),
                        outline=(176, 176, 172), width=2)
    bb.text(d, (x + 16, y + 12), "直流電源 GW Instek GPE-3323（Independent 模式）",
            size=14, fill=bb.INK2)
    for i, lab in enumerate(("CH1 → +15 V", "CH2 → −15 V")):
        yy = y + 40 + i * 44
        d.rounded_rectangle([x + 16, yy, x + 158, yy + 36], radius=5,
                            fill=(26, 34, 30), outline=(92, 92, 92))
        bb.text(d, (x + 87, yy + 18), v, size=19, fill=(118, 238, 168), anchor="mm")
        bb.text(d, (x + 170, yy + 18), lab, size=15, fill=bb.INK2, anchor="lm")
    bb.text(d, (x + 16, y + 132), "CH1− 與 CH2+ 用一條短線串起來，那一點就是 0 V 共地",
            size=13, fill=bb.WARN)
    posts = {}
    order = [("ch1+", "CH1+", (200, 60, 60)), ("ch1-", "CH1−", (50, 50, 50)),
             ("ch2+", "CH2+", (200, 60, 60)), ("ch2-", "CH2−", (50, 50, 50))]
    for i, (key, lab, col) in enumerate(order):
        px = x + 58 + i * 96
        d.ellipse([px - 11, y + h - 11, px + 11, y + h + 11], fill=col, outline=(30, 30, 30))
        bb.text(d, (px, y + h - 26), lab, size=13, fill=bb.INK2, anchor="mm")
        posts[key] = (px, y + h + 8)
    # CH1− ←→ CH2+ 的串聯短線
    (ax, ay), (bx2, by2) = posts["ch1-"], posts["ch2+"]
    bb.wire(d, [(ax, ay), (ax, ay + 26), (bx2, by2 + 26), (bx2, by2)], bb.WIRE_BLACK, width=5)
    return posts
