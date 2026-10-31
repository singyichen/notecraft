"""在 Lab 3 的三張麵包板接線圖上疊出電流實際流動路徑。

原圖由 `draw_breadboard.py` 產生，**不覆蓋**；輸出一律加 `-current` 後綴。
畫法原語全部來自 `simulations/tools/current_overlay.py`：
  綠實線 = 電流走的路、綠虛線 = 封裝內部看不到的那一段、
  紅三角 = 方向、紅底白字圓圈 = 下方逐步說明的列、藍虛線 = 電壓表量測線（不分流）。

用法：simulations/lab1/.venv/bin/python simulations/lab3/annotate_current_path.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))
sys.path.insert(0, os.path.join(HERE, "..", "lab2"))

import draw_real_breadboard as bb  # noqa: E402
from current_overlay import (  # noqa: E402
    BLUE, BLUE_TXT, GREEN, GREEN_DASH, GREEN_TXT, RED, badge, compose, f, label, path,
)

DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week9-breadboard")

# 常用孔位（和 draw_breadboard.py 同一套幾何）
C_S, C_G, C_D, C_GND, C_SUP, C_BLK = 30, 31, 32, 16, 44, 54
Y = {r: bb.hole(1, r)[1] for r in "jihgfedcba"}
RAIL_M = bb.hole(1, "-")[1]
POST_CH2P = (470 + 54 + 3 * 90, 120 + 158 + 8)
POST_CH2M = (470 + 54 + 2 * 90, 120 + 158 + 8)
LANE_CH2P, LANE_GND2 = 306, 324
METER_RED = (1450 + 72, 140 + 132 + 8)
METER_BLK = (1450 + 244 - 72, 140 + 132 + 8)
LANE_MRED, LANE_MBLK = 380, 398


PAD = (0, 0, 0, 150)       # 下方加留白放圖例，不壓到接線表


def heading(canvas, d, txt):
    label(d, (canvas.size[0] // 2, 944), txt, f(26), GREEN_TXT, align="center")
    label(d, (60, 1240), LEGEND, f(22))


def gate_note(d):
    """閘極是氧化層隔開的電容，穩態下沒有電流——圖上那條黃跳線不在迴路裡。"""
    label(d, (bb.cx(4), Y["c"]),
          "第 31 欄那條黃跳線（閘極）不在迴路上：\n閘極被氧化層隔開，穩態下不走電流，\n它只決定通道開多大。",
          f(21), BLUE_TXT)


def h(col, row):
    return bb.hole(col, row)


def hrun(d, xa, xb, y, skip=None, w=13):
    """沿某一列的水平段。skip=(x0, x1) 會讓開元件本體，本體兩側各畫一段、各有一個箭頭。"""
    if skip is None:
        path(d, [(xa, y), (xb, y)], w=w)
        return
    x0, x1 = (skip if xa < xb else (skip[1], skip[0]))
    path(d, [(xa, y), (x0, y)], w=w, arrow_min=40)
    path(d, [(x1, y), (xb, y)], w=w, arrow_min=40)


def through_package(x_in, x_out):
    """汲極 → 源極：封裝內部那一段，原圖畫不出來，用綠虛線補。"""
    return [(x_in, Y["f"]), (x_in, Y["f"] + 30), (x_out, Y["f"] + 30), (x_out, Y["f"])]


def supply_return(d, col_gnd):
    """接地端 → −軌 → 電源 CH2−，回到電源負端，把迴路閉上。"""
    xg = h(col_gnd, "j")[0]
    path(d, [h(col_gnd, "j"), (xg - 14, 508), (xg, RAIL_M)], w=13)
    path(d, [(xg, RAIL_M), (h(12, "-")[0], RAIL_M)], w=13)
    path(d, [h(12, "-"), (h(12, "-")[0], LANE_GND2), (POST_CH2M[0], LANE_GND2), POST_CH2M],
         w=11)


def supply_out(d, col_sup):
    """電源 CH2+ → 板上進線欄的 j 孔。"""
    xs = h(col_sup, "j")[0]
    path(d, [POST_CH2P, (POST_CH2P[0], LANE_CH2P), (xs, LANE_CH2P), (xs, h(col_sup, "j")[1])],
         w=11)


def voltmeter(d, col_red, row_red):
    """電表的兩條線改標成藍虛線：並聯、只量電位差、不分流。"""
    xr, yr = h(col_red, row_red)
    path(d, [METER_RED, (METER_RED[0], LANE_MRED), (xr, LANE_MRED), (xr, yr)],
         col=BLUE, w=7, dash=True, period=24, arrows=False)
    xb, yb = h(C_BLK, "-")
    path(d, [METER_BLK, (METER_BLK[0], LANE_MBLK), (xb, LANE_MBLK), (xb, yb)],
         col=BLUE, w=7, dash=True, period=24, arrows=False)


LEGEND = ("綠實線＝電流走的迴路，紅三角＝方向，紅底白字＝下方逐步說明的列編號。\n"
          "綠虛線是 TO-92 封裝裡看不到的那一段（汲極 → 通道 → 源極）。\n"
          "藍虛線是電表的兩條線：並聯在節點與地之間，只量電位差、不分流。")


# ── 實驗一 ───────────────────────────────────────────────────────
def exp1(canvas, d, T):
    fn = f(26)
    heading(canvas, d,
          "實驗一的電流：V_GS = 4 V、V_DS = 5 V 時 I_D ≈ 1.67 mA（LTspice 預報）",)
    gate_note(d)

    supply_out(d, C_SUP)
    xd = h(C_D, "f")[0]
    xsu = h(C_SUP, "j")[0]
    path(d, [h(C_SUP, "j"), h(C_SUP, "h")], w=13, arrows=False)
    path(d, [h(C_SUP, "h"), (xsu - 10, Y["h"] - 9), (xd + 10, Y["h"] - 9), h(C_D, "h")], w=13)
    path(d, [h(C_D, "h"), h(C_D, "f")], w=13, arrows=False)
    path(d, through_package(xd, h(C_S, "f")[0]), col=GREEN_DASH, w=13, dash=True)
    xs = h(C_S, "f")[0]
    path(d, [h(C_S, "f"), h(C_S, "i")], w=13, arrows=False)
    xg = h(C_GND, "i")[0]
    mid = (xs + xg) / 2
    path(d, [h(C_S, "i"), (xs - 14, Y["i"] - 10)], w=13, arrows=False)
    hrun(d, xs - 14, xg + 14, Y["i"] - 10, skip=(mid + 42, mid - 42))
    path(d, [(xg + 14, Y["i"] - 10), h(C_GND, "i")], w=13, arrows=False)
    path(d, [h(C_GND, "i"), h(C_GND, "j")], w=13, arrows=False)
    supply_return(d, C_GND)
    voltmeter(d, C_S, "g")

    for i, xy in enumerate([
        (xsu, 306), (xsu, (Y["j"] + Y["h"]) / 2), ((xsu + xd) / 2, Y["h"] - 9),
        (xd + 26, Y["f"] + 30), (mid + 110, Y["i"] - 10), (xg - 7, 508),
        (h(12, "-")[0], LANE_GND2),
    ]):
        badge(d, xy, str(i + 1), fn)


# ── 實驗二／三 ───────────────────────────────────────────────────
def exp2(canvas, d, T):
    fn = f(26)
    heading(canvas, d,
          "實驗二的電流：V_GS = 3 V、V_DS = 5 V 時 I_D ≈ 31 mA，幾乎全被 R1 的 100 Ω 限住",)
    gate_note(d)

    supply_out(d, C_SUP)
    xsu, xd, xs = h(C_SUP, "i")[0], h(C_D, "i")[0], h(C_S, "f")[0]
    path(d, [h(C_SUP, "j"), h(C_SUP, "i")], w=13, arrows=False)
    mid2 = (xsu + xd) / 2
    path(d, [h(C_SUP, "i"), (xsu - 14, Y["i"] - 10)], w=13, arrows=False)
    hrun(d, xsu - 14, xd + 14, Y["i"] - 10, skip=(mid2 + 42, mid2 - 42))
    path(d, [(xd + 14, Y["i"] - 10), h(C_D, "i")], w=13, arrows=False)
    path(d, [h(C_D, "i"), h(C_D, "f")], w=13, arrows=False)
    path(d, through_package(h(C_D, "f")[0], xs), col=GREEN_DASH, w=13, dash=True)
    path(d, [h(C_S, "f"), h(C_S, "j")], w=13, arrows=False)
    supply_return(d, C_S)
    voltmeter(d, C_D, "h")

    for i, xy in enumerate([
        (xsu, 306), (mid2 + 110, Y["i"] - 10), (xd, (Y["h"] + Y["f"]) / 2),
        (h(C_D, "f")[0] + 26, Y["f"] + 30), (xs, (Y["g"] + Y["j"]) / 2),
        (xs - 7, 508), (h(12, "-")[0], LANE_GND2),
    ]):
        badge(d, xy, str(i + 1), fn)


# ── 實驗四 ───────────────────────────────────────────────────────
def exp4(canvas, d, T):
    fn = f(26)
    heading(canvas, d,
          "實驗四的電流：V_GS = 3 V 時 I_D ≈ 5.3 mA，LED 亮；V_GS 低於約 2.3 V 整圈電流幾乎是 0",)
    gate_note(d)

    C_A = C_SUP - 4           # LED 陽極那一欄
    supply_out(d, C_SUP)
    xsu, xa, xd = h(C_SUP, "g")[0], h(C_A, "g")[0], h(C_D, "h")[0]
    path(d, [h(C_SUP, "j"), h(C_SUP, "g")], w=13, arrows=False)
    path(d, [h(C_SUP, "g"), (xsu - 10, Y["g"] - 9), (xa + 10, Y["g"] - 9), h(C_A, "g")], w=13)
    path(d, [h(C_A, "g"), h(C_A, "h")], w=13, arrows=False)
    mled = (h(C_A, "h")[0] + h(C_D, "h")[0]) / 2
    path(d, [h(C_A, "h"), (xa - 12, Y["h"] - 12)], w=13, arrows=False)
    hrun(d, xa - 12, xd + 12, Y["h"] - 12, skip=(mled + 34, mled - 34))
    path(d, [(xd + 12, Y["h"] - 12), h(C_D, "h")], w=13, arrows=False)
    path(d, [h(C_D, "h"), h(C_D, "f")], w=13, arrows=False)
    xs = h(C_S, "f")[0]
    path(d, through_package(h(C_D, "f")[0], xs), col=GREEN_DASH, w=13, dash=True)
    path(d, [h(C_S, "f"), h(C_S, "i")], w=13, arrows=False)
    xg = h(C_GND, "i")[0]
    midr = (xs + xg) / 2
    path(d, [h(C_S, "i"), (xs - 14, Y["i"] - 10)], w=13, arrows=False)
    hrun(d, xs - 14, xg + 14, Y["i"] - 10, skip=(midr + 42, midr - 42))
    path(d, [(xg + 14, Y["i"] - 10), h(C_GND, "i")], w=13, arrows=False)
    path(d, [h(C_GND, "i"), h(C_GND, "j")], w=13, arrows=False)
    supply_return(d, C_GND)
    voltmeter(d, C_S, "g")

    for i, xy in enumerate([
        (xsu, 306), ((xsu + xa) / 2, Y["g"] - 9), (mled + 70, Y["h"] - 12),
        (xd, (Y["h"] + Y["f"]) / 2), (h(C_D, "f")[0] + 26, Y["f"] + 30),
        (midr + 110, Y["i"] - 10), (h(12, "-")[0], LANE_GND2),
    ]):
        badge(d, xy, str(i + 1), fn)


def main():
    for name, painter in (("lab3-exp1-breadboard", exp1),
                          ("lab3-exp2-breadboard", exp2),
                          ("lab3-exp4-breadboard", exp4)):
        src = os.path.join(DIR, name + ".png")
        out = os.path.join(DIR, name + "-current.png")
        compose(src, out, painter, pad=PAD)
        print("  ", os.path.normpath(out))


if __name__ == "__main__":
    main()
