#!/usr/bin/env python3
"""Lab 2 第二部分（CE 放大器）：在 Tinkercad 麵包板圖上疊出電流路徑與訊號路徑。

用法（專案根目錄）：
    python3 simulations/lab2/annotate_ce_current.py

輸入：public/note-images/ec-week6-tinkercad/lab2-exp3-breadboard-zoom.png（784×568）
輸出：同資料夾的 lab2-exp3-breadboard-current.png（原圖保留不覆蓋）

座標以原圖 1 倍尺寸為單位，直接取自 Tinkercad 的 DOM（不是手量）：
第 1 欄 x = 74、欄距 24.5；− 軌 y = 72、+ 軌 y = 97；
上半部 j/i/h/g/f = 170/195/219/244/268，下半部 e/c/b/a = 342/391/416/440。

畫法原語在 ../tools/current_overlay.py，規範見
`.claude/skills/lab-workflow/references/current-path-overlay.md`。
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
from current_overlay import (  # noqa: E402
    BLUE, BLUE_TXT, GREEN_TXT, badge, compose, f, label, path,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_DIR = os.path.join(ROOT, "public", "note-images", "ec-week6-tinkercad")
SRC = os.path.join(IMG_DIR, "lab2-exp3-breadboard-zoom.png")
OUT = os.path.join(IMG_DIR, "lab2-exp3-breadboard-current.png")

SCALE = 2.0
PAD = (20, 110, 600, 110)          # 左 上 右 下
CROP = (0, 0, 700, 568)            # 裁掉右側 Tinkercad 的元件面板

COL1, STEP = 74.0, 24.5
RAIL_MINUS, RAIL_PLUS = 72, 97
ROW = {"j": 170, "i": 195, "h": 219, "g": 244, "f": 268,
       "e": 342, "d": 367, "c": 391, "b": 416, "a": 440}


def cx(n):                          # 第 n 欄的 x
    return COL1 + STEP * (n - 1)


def P(hole):                        # "I10" → 座標
    return (cx(int(hole[1:])), ROW[hole[0].lower()])


# ── 路徑 A：直流集極電流 + 軌 → RC1 → 集極 → 射極 → RE1 → − 軌 ──────────────
LOOP_C = [
    (cx(15), RAIL_PLUS), P("H15"), P("I15"),          # + 軌 → 跳線 → RC1 右腳
    P("I11"),                                          # RC1：i15 → i11（集極節點）
    (cx(11), ROW["f"]),                                # 沿第 11 欄下到集極腳 f11
    (cx(9), ROW["f"]),                                 # 電晶體內部：集極 → 射極
    (cx(9), ROW["g"]),                                 # 射極節點（第 9 欄）
    P("G5"),                                           # RE1：g9 → g5
    (cx(5), ROW["j"]), (cx(5), RAIL_MINUS),            # 跳線 j5 → − 軌
]

# ── 路徑 B：分壓器電流 + 軌 → R1 → 基極 → R2 → − 軌 ────────────────────────
LOOP_B = [
    (cx(6), RAIL_PLUS), P("I6"), P("J6"),              # + 軌 → 跳線 → R1 左腳
    P("J10"),                                          # R1：j6 → j10（基極節點）
    (cx(10), ROW["h"]),                                # 沿第 10 欄到 h10
    P("H14"),                                          # R2：h10 → h14
    (cx(14), ROW["g"]), (cx(14), RAIL_MINUS),          # 跳線 g14 → − 軌
]

# ── 路徑 C：訊號鏈（虛線，交流才走得通）──────────────────────────────────
SIG_IN = [
    P("A2"), P("C2"),                                  # 訊號源進第 2 欄
    P("C6"),                                           # RS1：c2 → c6
    P("B6"), P("B7"),                                  # C1：b6 → b7
    P("E7"), (cx(7), 305), (cx(10) + 6, 305), (cx(10) + 6, ROW["i"]), P("I10"),
]
SIG_OUT = [
    (cx(11), ROW["g"]), P("G12"),                      # C2：g11 → g12
    (cx(12), ROW["j"]), P("J16"),                      # RL1：j12 → j16
    (cx(16), ROW["i"]), (cx(16), RAIL_MINUS),
]
# C3 旁路：射極 → C3 → − 軌
BYPASS = [(cx(9), ROW["h"]), P("H8"), (cx(8), ROW["f"]), (cx(8) - 7, ROW["f"]),
          (cx(8) - 7, RAIL_MINUS)]

BADGES = [
    ("1", (cx(15), RAIL_PLUS - 16)),
    ("2", ((cx(15) + cx(11)) / 2, ROW["i"] - 16)),
    ("3", (cx(11) + 13, ROW["f"] - 22)),
    ("4", (cx(10), ROW["f"] + 30)),
    ("5", (cx(9) - 13, ROW["g"] - 14)),
    ("6", ((cx(9) + cx(5)) / 2, ROW["g"] + 18)),
    ("7", (cx(5) - 14, RAIL_MINUS + 14)),
    ("8", ((cx(6) + cx(10)) / 2, ROW["j"] - 16)),
    ("9", ((cx(10) + cx(14)) / 2, ROW["h"] + 18)),
    ("10", (cx(6), ROW["b"] - 20)),
    ("11", (cx(8) - 20, ROW["h"] - 18)),
    ("12", ((cx(12) + cx(16)) / 2, ROW["j"] - 16)),
]


def painter(canvas, d, T):
    t = lambda pts: [T(p) for p in pts]  # noqa: E731
    path(d, t(LOOP_C), w=11, arrow_min=60, arrow_size=19)
    path(d, t(LOOP_B), w=11, arrow_min=60, arrow_size=19)
    path(d, t(BYPASS), col=BLUE, w=8, dash=True, arrows=False)
    path(d, t(SIG_IN), col=BLUE, w=8, dash=True, arrows=False)
    path(d, t(SIG_OUT), col=BLUE, w=8, dash=True, arrows=False)

    fb, fs, ft = f(23), f(26), f(31)
    for s, p in BADGES:
        badge(d, T(p), s, fb, r=16)

    label(d, T((cx(1), -46)),
          "CE 放大器：綠色＝直流偏壓電流（三用電表量得到）、藍色虛線＝訊號路徑（只有交流走得通）",
          ft, GREEN_TXT)
    label(d, T((712, 10)),
          "直流（綠）\n"
          "1 ＋軌 12 V 經跳線進 RC1\n"
          "2 RC1 100 Ω：壓降只有 0.5 V\n"
          "3 集極 第 11 欄 ≈ 11.5 V\n"
          "4 電晶體內部 C→E（受基極控制）\n"
          "5 射極 第 9 欄 ≈ 5.2 V\n"
          "6 RE1 1 kΩ 定出 I_E ≈ 5.2 mA\n"
          "7 回 −軌，迴路閉合\n"
          "8 R1／R2 各 10 kΩ → 基極 ≈ 5.9 V\n"
          "9 分壓器自己吃掉約 0.6 mA",
          fs)
    label(d, T((712, 330)),
          "交流（藍虛線）\n"
          "10 訊號源 → RS1 → C1 → 基極\n"
          "　　C1 擋住直流，只讓訊號疊上去\n"
          "11 C3 把射極對交流接地\n"
          "　　拿掉它增益從 5.5 掉到 0.1\n"
          "12 集極 → C2 → RL1 → 地\n"
          "　　C2 擋住集極的 11.5 V 直流",
          fs, BLUE_TXT)
    label(d, T((cx(1), ROW["a"] + 72)),
          "注意：這張圖只用來確認接線與儀器接法。Tinkercad 的求解器跑不動這個電路\n"
          "（接上函數波產生器後電源會被拉到限流），所有讀值一律以 LTspice 為準。",
          fs)


if __name__ == "__main__":
    compose(SRC, OUT, painter, scale=SCALE, pad=PAD, crop=CROP)
    print("wrote", OUT)
