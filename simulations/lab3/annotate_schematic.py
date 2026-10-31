"""在講義第 19 頁的共源級放大器原理圖上疊出電流路徑（直流偏壓、交流訊號各一張）。

底圖是從 `App_Lab3.pdf` 第 19 頁裁下來的白底電路圖，原圖不覆蓋；
輸出 `-current`（直流）與 `-ac-current`（交流）兩張。

用法：simulations/lab1/.venv/bin/python simulations/lab3/annotate_schematic.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))

from current_overlay import (  # noqa: E402
    BLUE_TXT, GREEN, GREEN_DASH, GREEN_TXT, RED, badge, blocker, compose, f, label, path,
)

DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week11-handout")
BASE = os.path.join(DIR, "lab3-exp5-schematic.png")

# 底圖上量到的主要導線（1978 x 1056）
TOP, DRAIN, GATE, SRC, BOT = 96, 371, 499, 584, 881
X_IN, X_DIV, X_M, X_R7, X_OUT, X_VDD = 273, 809, 1128, 1388, 1644, 1808
VDD_HI, VDD_LO = 435, 545        # 電源符號圓圈上下緣
X_GATE_PIN = 1050
C_IN = (632, GATE)               # 輸入耦合電容（講義標 C3，Bonus 圖標 C1）
C_OUT = (1290, DRAIN)            # 輸出耦合電容（C2）
C_BYP = (1250, SRC)              # 源極旁路電容（講義重複標成 C2，Bonus 圖是 C3）
PAD = (0, 0, 0, 300)
W = 14
R_TOP = (168, 264)               # R1／R3 鋸齒的上下緣
R_BOT = (668, 764)               # R2／R6 鋸齒的上下緣
R_OUT = (596, 792)               # R4 鋸齒


def vrun(d, x, y1, y2, skip, w=W):
    """垂直段，讓開電阻本體；本體上下各畫一段、各有一個箭頭。"""
    path(d, [(x, y1), (x, skip[0])], w=w, arrow_min=50)
    path(d, [(x, skip[1]), (x, y2)], w=w, arrow_min=50)


def dc(canvas, d, T):
    fn, fs = f(30), f(24)
    label(d, (canvas.size[0] // 2, 1078),
          "直流偏壓：兩圈電流，電容全部斷路（LTspice 預報 V_G = 5.00 V、V_S = 2.97 V、V_D = 6.10 V）",
          f(28), GREEN_TXT, align="center")

    # 迴路 A：V_DD → R3 → 通道 → R6 → 回電源（I_D ≈ 30 µA）
    path(d, [(X_VDD, VDD_HI), (X_VDD, TOP), (X_M, TOP)], w=W)
    vrun(d, X_M, TOP, DRAIN, R_TOP)
    path(d, [(X_M, DRAIN), (X_M, SRC)], col=GREEN_DASH, w=W, dash=True, period=30)
    vrun(d, X_M, SRC, BOT, R_BOT)
    path(d, [(X_M, BOT), (X_VDD, BOT), (X_VDD, VDD_LO)], w=W)

    # 迴路 B：V_DD → R1 → R2 → 回電源（分壓電流 ≈ 100 µA）
    path(d, [(X_VDD, TOP), (X_DIV, TOP)], w=10)
    vrun(d, X_DIV, TOP, GATE, R_TOP, w=10)
    vrun(d, X_DIV, GATE, BOT, R_BOT, w=10)
    path(d, [(X_DIV, BOT), (X_M, BOT)], w=10)

    for xy in (C_IN, C_OUT, C_BYP):
        blocker(d, xy, size=34)
    label(d, (X_GATE_PIN - 330, GATE - 150),
          "閘極這一段沒有電流，\nV_G 只由 R1、R2 分壓決定", fs, BLUE_TXT)

    for i, xy in enumerate([(X_VDD, (TOP + VDD_HI) // 2), (X_M, 310),
                            (X_M + 78, 420), (X_M, 812),
                            ((X_M + X_VDD) // 2, BOT)]):
        badge(d, xy, str(i + 1), fn, r=26)
    badge(d, (X_DIV, 310), "A", fn, r=26)
    badge(d, (X_DIV, 812), "B", fn, r=26)

    label(d, (60, 1140),
          "綠實線＝電流走的路，綠虛線＝MOSFET 通道內部，紅三角＝方向，紅叉＝三顆電容在直流下都是斷路、不參與偏壓。\n"
          "粗的那一圈是汲極電流 I_D ≈ 30 µA（編號 1–5）；細的那一圈是閘極分壓電流 15 V / 150 kΩ = 100 µA（A、B）。\n"
          "兩圈都回到 V_DD 的負端，所以電源總電流約 130 µA——這也是當天電源供應器該讀到的值。", fs)


def ac(canvas, d, T):
    fn, fs = f(30), f(24)
    label(d, (canvas.size[0] // 2, 1078),
          "交流小訊號（1 kHz）：三顆電容變成短路、V_DD 變成交流地，訊號才走得通",
          f(28), GREEN_TXT, align="center")

    # 輸入：訊號源 → R5 → C1 → 閘極
    path(d, [(X_IN, 700), (X_IN, GATE), (X_GATE_PIN, GATE)], w=W)
    # 輸出：汲極 → C2 → R4 → 地 → 回訊號源
    path(d, [(X_M, DRAIN), (X_OUT, DRAIN)], w=W)
    vrun(d, X_OUT, DRAIN, BOT, R_OUT)
    path(d, [(X_OUT, BOT), (X_IN, BOT), (X_IN, 790)], w=W)
    # 源極端：R6 與 R7+C3 並聯後的交流阻抗
    path(d, [(X_M, SRC), (X_R7, SRC), (X_R7, BOT)], col=GREEN_DASH, w=10, dash=True, period=30)

    label(d, (C_IN[0] - 200, GATE - 190),
          "C1（講義標 C3）把直流 5 V 的閘極\n和訊號產生器隔開，1 kHz 下阻抗只有 159 Ω", fs, GREEN_TXT)
    label(d, (1410, 150), "C2 把 6.1 V 的直流擋掉，\n只讓交流進 R4", fs, GREEN_TXT)
    label(d, (60, 920),
          "C3（講義標 C2）＋R7 30 kΩ 只在交流時接通：\n交流源極阻抗 = 100 k ∥ 30 k = 23.1 kΩ\n"
          "→ A_v = −g_m(R3∥R4) / (1 + g_m × 23.1 k) = −8.7", fs, GREEN_TXT)
    label(d, (1330, 930),
          "V_DD 是固定電壓，交流看起來就是地——\nR3 的上端等於接地，R4 也是", fs, BLUE_TXT)

    for i, xy in enumerate([((X_IN + X_GATE_PIN) // 2 - 180, GATE),
                            ((X_M + X_OUT) // 2 + 120, DRAIN), (X_OUT, 500),
                            ((X_IN + X_OUT) // 2, BOT)]):
        badge(d, xy, str(i + 1), fn, r=26)

    label(d, (60, 1140),
          "綠實線＝訊號電流，綠虛線＝源極那一端只有一部分被旁路掉（這就是增益只有 8.7 的原因）。\n"
          "輸出與輸入反相：閘極電位上升 → 通道電流變大 → R3 的壓降變大 → 汲極電位下降。", fs)


def main():
    for out, painter in (("lab3-exp5-schematic-current", dc),
                         ("lab3-exp5-schematic-ac-current", ac)):
        compose(BASE, os.path.join(DIR, out + ".png"), painter, pad=PAD)


if __name__ == "__main__":
    main()
