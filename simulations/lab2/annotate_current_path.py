#!/usr/bin/env python3
"""Lab 2 實驗一／二：在 Tinkercad 麵包板圖上疊出「電流實際流動路徑」。

用法（專案根目錄）：
    python3 simulations/lab2/annotate_current_path.py

輸入：public/note-images/ec-week6-tinkercad/lab2-exp1-breadboard.png（VBB 2.4 V、VCC 10 V，主動區，
      電表 1／2 量 V_BE／V_CE、電表 3 是串在集極的電流表）
      public/note-images/ec-week6-tinkercad/lab2-exp2-breadboard.png（VBB = VCC = 15 V，飽和區，
      三台都是電壓檔，照講義第 9 頁量 V_R1／V_R2／V_RC，集極迴路沒有電流表）
輸出：同資料夾的 *-current.png（原圖保留不覆蓋）

兩張圖的麵包板座標系統相同（欄距、列高一樣），但量測接法不同，所以各有一個 painter：
exp1 用 paint_exp1()、exp2 用 paint_exp2()。
畫法原語在 ../tools/current_overlay.py，規範見
`.claude/skills/lab-workflow/references/current-path-overlay.md`。
座標全部以「原圖 1 倍尺寸」（880×500）為單位：欄距 13 px、第 1 欄 x = 241、j 列 y = 273。
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

SCALE = 2.6
PAD = (20, 120, 320, 20)      # 左 上 右 下


def colx(n):                  # 麵包板第 n 欄的 x（電源軌的孔與主區同欄對齊）
    return 241 + 13 * (n - 1)


RAIL_MINUS, RAIL_PLUS = 220.5, 233.5
ROW = {"j": 273, "i": 286, "h": 299, "g": 312, "f": 325}

# 端子（原圖座標）
VBB_P, VBB_N = (93, 307), (108, 307)
VCC_P, VCC_N = (753, 307), (768, 307)
V1_RED, V1_BLK = (287, 83), (273, 83)      # 左表：V_BE
V2_RED, V2_BLK = (430, 83), (416, 83)      # 中表：V_CE
A_RED, A_BLK = (574, 83), (560, 83)        # 右表：I_C（串聯）

# ---- 迴路 A：基極電路 VBB(+) → + 軌 → R1 → 基極 → 射極 → − 軌 → VBB(−) ----
LOOP_A = [
    VBB_P, (93, 352), (203, 352), (203, RAIL_PLUS), (colx(1), RAIL_PLUS),
    (colx(6), RAIL_PLUS), (colx(6), ROW["j"]), (colx(6), ROW["i"]),
    (colx(10), ROW["i"]),                                  # R1：i6 → i10（基極節點）
    (colx(10), ROW["f"]),                                  # 沿第 10 欄下到基極腳 f10
    (colx(9), ROW["f"]),                                   # 電晶體內部：基極 → 射極 f9
    (colx(9), ROW["j"]), (colx(9), RAIL_MINUS),            # 射極跳線 j9 → − 軌
    (colx(2), RAIL_MINUS), (254, 191), (191, 191), (191, 337), (108, 337), VBB_N,
]
# 分支：基極節點 → R2 → h14 → − 軌（與迴路 A 在 − 軌會合）
BRANCH_R2 = [
    (colx(10), ROW["i"]), (colx(10), ROW["j"]), (colx(14), ROW["j"]),   # R2：j10 → j14
    (colx(14), RAIL_MINUS),                                            # 跳線 h14 → − 軌（經過 j14 孔）
    (colx(9), RAIL_MINUS),
]
# ---- 迴路 B：集極電路 VCC(+) → j15 → RC → 集極 → 射極 → − 軌 → VCC(−) ----
# 2026-10-20：兩個實驗的第三台表都已改成電壓檔並聯，集極迴路不再串電流表。
LOOP_B = [
    VCC_P, (755, 347), (849, 347), (849, 154), (427, 154),
    (colx(15), ROW["j"]), (colx(15), ROW["g"]),
    (colx(11), ROW["g"]),                                  # RC：g15 → g11（集極節點）
    (colx(11), ROW["f"]),                                  # 集極腳 f11
    (colx(9), ROW["f"]),                                   # 電晶體內部：集極 → 射極 f9
    (colx(9), ROW["j"]), (colx(9), RAIL_MINUS),
    (colx(30), RAIL_MINUS), (618, 191), (670, 191), (670, 337), (768, 337), VCC_N,
]
# 電壓表量測線（只量電位差、不分流）
V1_PATH_R = [V1_RED, (287, 135), (364.5, 135), (364.5, ROW["h"]), (colx(10), ROW["h"])]
V1_PATH_B = [V1_BLK, (273, 142), (280, 142), (280, RAIL_MINUS)]
V2_PATH_R = [V2_RED, (430, 135), (377.5, 135), (377.5, ROW["h"]), (colx(11), ROW["h"])]
V2_PATH_B = [V2_BLK, (416, 142), (436, 142), (436, RAIL_MINUS)]
# 實驗一的第三台表：V_RC（i15 ↔ i11），折點取自 Tinkercad 實際走線
E1_M3_R = [A_RED, (568, 163), (433, 170), (colx(15), ROW["i"])]
E1_M3_B = [A_BLK, (551, 179), (375, 187), (colx(11), ROW["i"])]
E1_PROBES = (V1_PATH_R, V1_PATH_B, V2_PATH_R, V2_PATH_B, E1_M3_R, E1_M3_B)

BADGES = [
    ("1", (93, 332)), ("2", (262, 254)), ("3", (322, 304)), ("4", (384, 257)),
    ("5", (318, 352)), ("6", (330, 252)), ("7", (191, 264)),
    ("8", (753, 332)), ("9", (714, 154)), ("10", (397, 338)), ("11", (670, 264)),
]
# ---- 實驗二的三台電壓表：V_R1（+ 軌 ↔ h10）、V_R2 ＝ V_BE（g10 ↔ − 軌）、V_RC（i15 ↔ h11）
E2_M1_R = [V1_RED, (287, 183), (colx(3), 183), (colx(3), RAIL_PLUS)]
E2_M1_B = [V1_BLK, (279, 197), (363, 197), (colx(10), ROW["h"])]
E2_M2_R = [V2_RED, (426, 174), (352, 174), (colx(10), ROW["g"])]
E2_M2_B = [V2_BLK, (419, 139), (433, 145), (colx(16), RAIL_MINUS)]
E2_M3_R = [A_RED, (576, 166), (430, 166), (colx(15), ROW["i"])]
E2_M3_B = [A_BLK, (555, 183), (colx(11), 183), (colx(11), ROW["h"])]
E2_PROBES = (E2_M1_R, E2_M1_B, E2_M2_R, E2_M2_B, E2_M3_R, E2_M3_B)


def painter_factory(title, left_note, right_note, mid_note, bottom_note, probes):
    def paint(canvas, d, T):
        big, small, num = f(36), f(28), f(28)
        W = canvas.size[0]
        path(d, [T(p) for p in LOOP_A])
        path(d, [T(p) for p in BRANCH_R2], w=10)
        path(d, [T(p) for p in LOOP_B])
        for pts in probes:
            path(d, [T(p) for p in pts], col=BLUE, w=6, dash=True, period=22, arrows=False)
        for t, p in BADGES:
            badge(d, T(p), t, num)
        label(d, (W // 2, 26), title, big, GREEN_TXT, align="center")
        label(d, T((6, 128)), left_note, small, BLUE_TXT)
        label(d, (W - 16, T((0, 128))[1]), right_note, small, GREEN_TXT, align="right")
        label(d, T((470, 410)), mid_note, small)
        label(d, T((6, 420)), bottom_note, small)
    return paint


def main():
    compose(
        os.path.join(IMG_DIR, "lab2-exp1-breadboard.png"),
        os.path.join(IMG_DIR, "lab2-exp1-breadboard-current.png"),
        painter_factory(
            "實驗一：VBB 2.4 V／VCC 10 V，三台電表都用電壓檔（1–7 基極迴路、8–11 集極迴路）",
            "左表 V_BE：684 mV（h10 ↔ − 軌）\n中表 V_CE：2.33 V（h11 ↔ − 軌）\n藍虛線只量電位差，不分流",
            "右表 V_RC：7.67 V（i15 ↔ i11）\nI_C ＝ V_RC / R_C ＝ 7.67 mA\n集極迴路沒有串電流表",
            "電晶體轉了 180°、三腳插 f9／f10／f11\n腳位以 Tinkercad 懸停提示為準，實體元件請查 datasheet",
            "VBB 供應 172 µA：其中 146 µA 走 R2 到地、只有約 26 µA 進基極\n集極卻有 7.67 mA ＝ 基極電流被放大約 300 倍（Tinkercad 通用模型，不是 2N2222A）",
            E1_PROBES,
        ),
        scale=SCALE, pad=PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab2-exp2-breadboard.png"),
        os.path.join(IMG_DIR, "lab2-exp2-breadboard-current.png"),
        painter_factory(
            "實驗二：VBB = VCC = 15 V，三台電表都用電壓檔量壓降（講義第 9 頁的做法）",
            "左表 V_R1：14.3 V（+ 軌 ↔ h10）\n中表 V_R2 ＝ V_BE：714 mV（g10 ↔ − 軌）\n藍虛線只量電位差，不分流",
            "右表 V_RC：15.0 V（i15 ↔ h11）\nI_C ＝ V_RC / R_C ＝ 15.0 mA\n集極迴路沒有電流表",
            "I_B ＝ V_R1/R1 − V_R2/R2\n＝ 1.43 mA − 0.152 mA ≈ 1.28 mA",
            "β_forced ＝ I_C / I_B ＝ 15.0 / 1.28 ≈ 11.7，遠小於正常 β\n→ 這就是講義問題 1 的答案：Table 2 的工作點在飽和區",
            E2_PROBES,
        ),
        scale=SCALE, pad=PAD,
    )
    print("written:", os.path.join(IMG_DIR, "lab2-exp1-breadboard-current.png"))
    print("written:", os.path.join(IMG_DIR, "lab2-exp2-breadboard-current.png"))


if __name__ == "__main__":
    main()
