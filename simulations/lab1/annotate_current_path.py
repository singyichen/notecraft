#!/usr/bin/env python3
"""Lab 1 實驗一：在 Tinkercad 麵包板圖與原理圖上疊出「電流實際流動路徑」。

用法（專案根目錄）：
    python3 simulations/lab1/annotate_current_path.py

輸入：public/note-images/ec-week3-tinkercad/lab1-exp1-breadboard.png
      public/note-images/ec-week3-tinkercad/lab1-exp1-schematic.png
輸出：同資料夾的 *-current.png（原圖保留不覆蓋）

畫法原語在 ../tools/current_overlay.py，規範與量座標的方法見
`.claude/skills/lab-workflow/references/current-path-overlay.md`。
本檔只放座標與標籤文字，全部以「原圖 1 倍尺寸」為單位。
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
from current_overlay import (  # noqa: E402
    BLUE, BLUE_TXT, GREEN_DASH, GREEN_TXT, badge, blocker, compose, f, label, meter, path,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_DIR = os.path.join(ROOT, "public", "note-images", "ec-week3-tinkercad")

# --------------------------------------------------------------------------
# 麵包板圖：原圖 920x700
# --------------------------------------------------------------------------
BB_SCALE = 2
BB_PAD = (20, 110, 260, 20)      # 左 上 右 下


def colx(n):                      # 麵包板第 n 欄的 x
    return 310.4 + 19.08 * (n - 1)


ROW_J, ROW_I, ROW_H = 376.7, 395.0, 414.0
RAIL_MINUS, RAIL_PLUS = 302.0, 319.0

# 主迴路：電源(+) → +軌 → 黃跳線 → 二極體 → 電阻 → 電流表紅棒
BB_MAIN = [
    (106, 433), (106, 488), (264, 488), (264, 319), (332, 319),
    (colx(5), RAIL_PLUS), (colx(5), ROW_J), (colx(5), ROW_I),
    (colx(9), ROW_I),
    (colx(9), ROW_H), (colx(13), ROW_H),
    (colx(13), ROW_J), (colx(13), 225), (652, 225), (680, 205), (680, 105),
]
# 回程：電流表黑棒 → −軌 → 電源(−)
BB_RETURN = [
    (660, 105), (660, 225), (616, 258), (616, RAIL_MINUS),
    (313, RAIL_MINUS), (246, RAIL_MINUS), (246, 467), (127, 467), (127, 433),
]
# 電壓表兩條量測線（並聯跨在二極體兩端，幾乎不分流）
BB_VOLT_RED = [(319, 105), (319, 212), (350, 232), (350, RAIL_PLUS)]
BB_VOLT_BLK = [(296.5, 105), (296.5, 245), (455, 255), (463, 292), (463, ROW_J)]

BB_BADGES = [
    ("1", (106, 470)), ("2", (358, RAIL_PLUS)), ("3", (colx(5), 340)),
    ("4", (425, 437)), ("5", (501, 437)), ("6", (680, 160)),
    ("7", (616, 270)), ("8", (246, 400)),
]


def paint_breadboard(canvas, d, T):
    big, small, num = f(36), f(30), f(30)
    W = canvas.size[0]

    path(d, [T(p) for p in BB_MAIN])
    path(d, [T(p) for p in BB_RETURN])
    # 電流表內部：兩支探棒之間補一段虛線，表示電流確實穿過表內
    path(d, [T((680, 95)), T((660, 95))], dash=True, w=10, period=14, arrows=False)

    path(d, [T(p) for p in BB_VOLT_RED], col=BLUE, w=6, dash=True, period=22, arrows=False)
    path(d, [T(p) for p in BB_VOLT_BLK], col=BLUE, w=6, dash=True, period=22, arrows=False)

    for t, p in BB_BADGES:
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "電流 I：電源(+) → 二極體 → 1 kΩ 電阻 → 電流表 → 電源(−)", big, GREEN_TXT, align="center")
    label(d, T((6, 128)),
          "左表：電壓表(V)\n量二極體兩端壓降\n(內阻極大，幾乎不分流)", small, BLUE_TXT)
    label(d, (W - 16, T((0, 148))[1]),
          "右表：電流表(A)\n串聯在迴路中\n量到的就是 I", small, GREEN_TXT, align="right")
    label(d, T((565, 424)), "電阻 棕黑紅金 = 1 kΩ ±5%", small)
    label(d, T((300, 468)), "二極體順偏：陽極在第 5 欄，陰極(灰帶)在第 9 欄", small)


# --------------------------------------------------------------------------
# 原理圖：原圖 360x190，先裁切有內容的區域再放大
# --------------------------------------------------------------------------
SCH_CROP = (8, 22, 344, 190)
SCH_K = 4.4
SCH_PAD = (0, 120, 0, 420)

SCH_Y = 137.0                    # 主幹線
SCH_RET_Y = 205.0                # 補畫的電流表迴路（落在下方留白，原圖裡沒有這條線）
SCH = {
    "r_open": 22.5, "r_left": 38.75, "r_right": 68.75,
    "d_cath": 160.0, "d_anod": 192.5,
    "hump_l": 219.5, "hump_y": 76.25, "hump_r": 251.0,
    "bat_l": 287.5, "bat_open": 325.0,
}
# 實線：電池正極 → P1+ 節點 → D1 陽極 → 陰極 → R1（Tinkercad 有畫出來的部分）
SCH_SOLID = [
    (SCH["bat_l"], SCH_Y), (SCH["hump_r"], SCH_Y), (SCH["hump_r"], SCH["hump_y"]),
    (SCH["hump_l"], SCH["hump_y"]), (SCH["hump_l"], SCH_Y),
    (SCH["d_anod"], SCH_Y), (SCH["d_cath"], SCH_Y), (SCH["r_right"], SCH_Y),
    (SCH["r_left"], SCH_Y), (SCH["r_open"], SCH_Y),
]
SCH_MID = (SCH["r_open"] + SCH["bat_open"]) / 2     # 電流表擺在回程的正中間
# 虛線：原理圖省略的電流表迴路
SCH_DASH = [
    (SCH["r_open"], SCH_Y), (SCH["r_open"], SCH_RET_Y),
    (SCH_MID, SCH_RET_Y),                            # 切成兩段，兩段各得一個方向箭頭
    (SCH["bat_open"], SCH_RET_Y), (SCH["bat_open"], SCH_Y),
]
SCH_AMMETER = (SCH_MID, SCH_RET_Y)
SCH_VOLT = (176.0, 48.0)
SCH_VOLT_L, SCH_VOLT_R = 140.0, 212.0   # 兩支探棒落在 D1 兩側的主幹線上


def paint_schematic(canvas, d, T):
    big, note = f(38), f(32)
    W, H = canvas.size

    path(d, [T(p) for p in SCH_SOLID], w=14, arrow_min=60, arrow_size=30)
    path(d, [T(p) for p in SCH_DASH], col=GREEN_DASH, w=14, dash=True, period=28,
         arrow_min=60, arrow_size=30)
    meter(d, T(SCH_AMMETER), "A", f(60), GREEN_TXT)

    # 電壓表 Ⓥ：並聯跨在 D1 兩端，只量壓降
    vx, vy = T(SCH_VOLT)
    lx, rx = T((SCH_VOLT_L, 0))[0], T((SCH_VOLT_R, 0))[0]
    wy = T((0, SCH_Y))[1]
    rv = 44
    path(d, [(lx, wy), (lx, vy), (vx - rv, vy)], col=BLUE, w=7, dash=True, period=24, arrows=False)
    path(d, [(rx, wy), (rx, vy), (vx + rv, vy)], col=BLUE, w=7, dash=True, period=24, arrows=False)
    meter(d, (vx, vy), "V", f(56), BLUE_TXT, r=rv)

    label(d, (30, 26),
          "電流方向：P1(+) → D1 陽極 → D1 陰極 → R1 → 電流表 → P1(−)", big, GREEN_TXT)
    label(d, (W - 16, T((0, 52))[1]), "P1 左邊長板 = 正極(+)", note, align="right")
    label(d, (900, 796), "D1：右=陽極，左(短槓)=陰極\n順偏導通", note)
    label(d, (30, H - 250),
          "虛線綠色：Tinkercad 原理圖沒畫出電表，所以 R1 左端和 P1(−) 看起來沒接上；\n"
          "實際上電流是經過麵包板上的電流表(A)回到電源負極，迴路是完整的。", note, GREEN_TXT)
    label(d, (30, H - 120),
          "藍色虛線：電壓表(V) 並聯在 D1 兩端，只量壓降，幾乎沒有電流。", note, BLUE_TXT)


# --------------------------------------------------------------------------
# 實驗二 逆偏：原圖 920x705（和實驗一同一張板子，只把二極體翻面）
# 迴路仍然是通的，但二極體擋住電流，整圈只剩 nA 級的逆向飽和電流 → 全部畫細虛線
# --------------------------------------------------------------------------
E2_SCALE = 2
E2_PAD = (20, 110, 280, 20)


def colx2(n):
    return 318.6 + 18.67 * (n - 1)


E2_J, E2_I, E2_H = 381.0, 400.7, 419.0
E2_MINUS, E2_PLUS = 306.0, 325.0

E2_MAIN = [
    (107.3, 436.7), (107.3, 491.7), (271.7, 491.7), (271.7, 325.7), (336.7, 325),
    (colx2(5), E2_PLUS), (colx2(5), E2_J), (colx2(5), E2_I),
    (colx2(9), E2_I),
    (colx2(9), E2_H), (colx2(13), E2_H),
    (colx2(13), E2_J), (colx2(13), 226), (660, 226), (684, 208), (684, 104),
]
E2_RETURN = [
    (664, 104), (664, 230), (617.5, 258), (617.5, E2_MINUS),
    (320.7, E2_MINUS), (251.7, E2_MINUS), (251.7, 471.7), (127.3, 471.7), (127.3, 436.7),
]
E2_VOLT_RED = [(322, 104), (322, 217.5), (355, 235), (355, E2_PLUS)]
E2_VOLT_BLK = [(302, 104), (302, 252.5), (459, 258), (467.5, 295), (467.5, E2_J)]

E2_BADGES = [
    ("1", (107.3, 474)), ("2", (365, E2_PLUS)), ("3", (colx2(5), 346)),
    ("4", (431, 441)), ("5", (506, 441)), ("6", (684, 160)),
    ("7", (617.5, 274)), ("8", (251.7, 405)),
]


def paint_e2_breadboard(canvas, d, T):
    big, small, num = f(36), f(30), f(30)
    W = canvas.size[0]

    faint = dict(col=GREEN_DASH, w=9, dash=True, period=24, arrow_min=90, arrow_size=20)
    path(d, [T(p) for p in E2_MAIN], **faint)
    path(d, [T(p) for p in E2_RETURN], **faint)
    path(d, [T((684, 95)), T((664, 95))], col=GREEN_DASH, w=8, dash=True, period=12, arrows=False)
    blocker(d, T((431, E2_I)), size=16)

    path(d, [T(p) for p in E2_VOLT_RED], col=BLUE, w=6, dash=True, period=22, arrows=False)
    path(d, [T(p) for p in E2_VOLT_BLK], col=BLUE, w=6, dash=True, period=22, arrows=False)

    for t, p in E2_BADGES:
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "電流 I ≈ 0：迴路是通的，但二極體逆偏把電流擋掉了", big, GREEN_TXT, align="center")
    label(d, T((6, 128)),
          "左表：電壓表(V)\n紅棒在 + 軌＝陰極\n讀到 +Vs = 10.0 V", small, BLUE_TXT)
    label(d, (W - 16, T((0, 146))[1]),
          "右表：電流表(A)\n讀 0.00 A：不是沒接好，\n是 I 小到電表看不到\n(LTspice 算出約 0.1 nA)", small, GREEN_TXT,
          align="right")
    label(d, T((575, 424)),
          "1 kΩ 上幾乎沒有壓降：VR = I·R ≈ 0\n所以 VD = Vs − VR ≈ Vs，電壓表才會讀到 10.0 V", small)
    label(d, T((300, 472)),
          "二極體逆偏：色環(陰極)改插第 5 欄，正極送到陰極 → 空乏區變寬、不導通；紅叉就是電流被擋住的位置", small)


# --------------------------------------------------------------------------
# 實驗二 原理圖：原圖 440x200
# --------------------------------------------------------------------------
E2S_CROP = (25, 12, 420, 200)
E2S_K = 3.7
E2S_PAD = (0, 120, 0, 420)

E2S_Y = 148.3
E2S_RET_Y = 215.0
E2S = {
    "r_open": 39.3, "r_left": 60.0, "r_right": 96.0,
    "d_anod": 201.7, "d_cath": 239.3,
    "hump_l": 273.3, "hump_y": 76.7, "hump_r": 310.7,
    "bat_l": 351.7, "bat_open": 398.3,
}
E2S_SOLID = [
    (E2S["bat_l"], E2S_Y), (E2S["hump_r"], E2S_Y), (E2S["hump_r"], E2S["hump_y"]),
    (E2S["hump_l"], E2S["hump_y"]), (E2S["hump_l"], E2S_Y),
    (E2S["d_cath"], E2S_Y), (E2S["d_anod"], E2S_Y), (E2S["r_right"], E2S_Y),
    (E2S["r_left"], E2S_Y), (E2S["r_open"], E2S_Y),
]
E2S_MID = (E2S["r_open"] + E2S["bat_open"]) / 2
E2S_DASH = [
    (E2S["r_open"], E2S_Y), (E2S["r_open"], E2S_RET_Y),
    (E2S_MID, E2S_RET_Y),
    (E2S["bat_open"], E2S_RET_Y), (E2S["bat_open"], E2S_Y),
]
E2S_VOLT = (185.0, 55.0)
E2S_VOLT_L, E2S_VOLT_R = 150.0, 258.0


def paint_e2_schematic(canvas, d, T):
    big, note = f(38), f(32)
    W, H = canvas.size

    faint = dict(col=GREEN_DASH, w=10, dash=True, period=24, arrow_min=60, arrow_size=24)
    path(d, [T(p) for p in E2S_SOLID], **faint)
    path(d, [T(p) for p in E2S_DASH], **faint)
    meter(d, T((E2S_MID, E2S_RET_Y)), "A", f(60), GREEN_TXT)
    blocker(d, T(((E2S["d_anod"] + E2S["d_cath"]) / 2, E2S_Y)), size=34)

    vx, vy = T(E2S_VOLT)
    lx, rx = T((E2S_VOLT_L, 0))[0], T((E2S_VOLT_R, 0))[0]
    wy = T((0, E2S_Y))[1]
    rv = 44
    path(d, [(lx, wy), (lx, vy), (vx - rv, vy)], col=BLUE, w=7, dash=True, period=24, arrows=False)
    path(d, [(rx, wy), (rx, vy), (vx + rv, vy)], col=BLUE, w=7, dash=True, period=24, arrows=False)
    meter(d, (vx, vy), "V", f(56), BLUE_TXT, r=rv)

    label(d, (30, 26),
          "逆偏：P1(+) 送到 D1 陰極 → 二極體不導通 → 整圈 I ≈ 0", big, GREEN_TXT)
    label(d, (W - 16, T((0, 55))[1]), "P1 左邊長板 = 正極(+)", note, align="right")
    label(d, T((222, 180)), "D1 翻面：左＝陽極，右(短槓)＝陰極\n陰極接正極 → 逆偏", note)
    label(d, (30, H - 250),
          "整圈畫成細虛線，代表「路是通的、但幾乎沒有電流」；紅叉是電流被擋住的位置。\n"
          "與實驗一唯一的差別就是 D1 轉了 180°，其餘接線完全沒動。", note, GREEN_TXT)
    label(d, (30, H - 120),
          "藍色虛線：電壓表(V) 仍並聯在 D1 兩端，這次讀到的是幾乎整個 Vs。", note, BLUE_TXT)


# --------------------------------------------------------------------------
# 實驗三 半波整流：原圖 875x705（交流電路，正負半週各畫一張）
# --------------------------------------------------------------------------
E3_SCALE = 2
E3_PAD = (20, 110, 20, 20)


def colx3(n):
    return 374.5 + 15.54 * (n - 1)


E3_J, E3_I, E3_H = 435.0, 452.3, 468.3
E3_MINUS, E3_PLUS = 374.0, 388.3
E3_FG_P, E3_FG_N = (157.3, 482.7), (174.0, 482.7)

# 正半週的迴路：FG(+) → +軌 → 黃跳線 → 二極體 → 10kΩ → 黑跳線 → −軌 → FG(−)
E3_LOOP = [
    E3_FG_P, (157.3, 525), (336.7, 525), (336.7, 389.3), (374.5, E3_PLUS),
    (colx3(5), E3_PLUS), (colx3(5), E3_J), (colx3(5), E3_I),
    (colx3(9), E3_I),
    (colx3(9), E3_H), (colx3(13), E3_H),
    (colx3(13), E3_J), (colx3(13), E3_MINUS),
    (390, E3_MINUS), (321.7, E3_MINUS), (321.7, 510), (174, 510), E3_FG_N,
]
# 示波器探棒（量電壓，不分流）
E3_CH1_BLK = [(204, 292.7), (204, 345), (405.6, 345), (405.6, E3_MINUS)]
E3_CH1_RED = [(220.7, 292.7), (220.7, 323), (421, 323), (421, E3_PLUS)]
E3_CH2_BLK = [(610, 293.3), (610, 340), (670, 355), (670, E3_MINUS)]
E3_CH2_RED = [(626.7, 293.3), (626.7, 323.3), (501.7, 323.3), (501.7, 370), (499, E3_J)]

E3_BADGES = [
    ("1", (157.3, 505)), ("2", (400, E3_PLUS)), ("3", (colx3(5), 412)),
    ("4", (468, 500)), ("5", (530, 500)), ("6", (colx3(13), 410)),
    ("7", (480, E3_MINUS)), ("8", (321.7, 450)),
]


def e3_scopes(d, T):
    for pts in (E3_CH1_BLK, E3_CH1_RED, E3_CH2_BLK, E3_CH2_RED):
        path(d, [T(p) for p in pts], col=BLUE, w=6, dash=True, period=22, arrows=False)


def paint_e3_pos(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    path(d, [T(p) for p in E3_LOOP], w=12, arrow_min=70, arrow_size=24)
    e3_scopes(d, T)
    for t, p in E3_BADGES:
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "正半週：訊號產生器(+) → 二極體順偏導通 → 10 kΩ 負載 → 回 (−)", big, GREEN_TXT, align="center")
    label(d, T((16, 548)),
          "左示波器＝Vin：探棒跨在 + 軌與 − 軌\n量到的是完整的 60 Hz 正弦波", small, BLUE_TXT)
    label(d, T((16, 612)),
          "右示波器＝Vout：探棒跨在負載兩端\n只剩正半週那一座座山丘，這就是「半波」", small, BLUE_TXT)
    label(d, T((360, 560)),
          "二極體順偏：陽極第 5 欄、陰極(灰帶)第 9 欄\n電流只能由第 5 欄流向第 9 欄", small)
    label(d, T((612, 492)), "10 kΩ 負載\n第 13 欄靠黑跳線回 − 軌", small)


def paint_e3_neg(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    # 這半週整圈都沒有電流：細虛線、且不畫方向箭頭（有箭頭會讓人以為還有電流在跑）
    faint = dict(col=GREEN_DASH, w=9, dash=True, period=24, arrows=False)
    path(d, [T(p) for p in reversed(E3_LOOP)], **faint)
    blocker(d, T((468, E3_I)), size=14)
    e3_scopes(d, T)
    # 編號與正半週那張完全相同，兩張才能逐段對照（差別只在④被紅叉擋住）
    for t, q in E3_BADGES:
        badge(d, T(q), t, num)

    label(d, (W // 2, 26),
          "負半週：訊號產生器極性反過來 → 二極體逆偏 → 負載上沒有電流", big, GREEN_TXT, align="center")
    label(d, T((16, 548)),
          "左示波器＝Vin：畫面上低於 0 V 的那半就是這半週\n訊號產生器照樣輸出，和二極體導不導通無關", small, BLUE_TXT)
    label(d, T((16, 612)),
          "右示波器＝Vout：山丘之間那段貼著 0 V 的平線就是這半週\n負載上沒有電流 → VR = I·R = 0", small, BLUE_TXT)
    label(d, T((360, 560)),
          "現在第 9 欄的電位比第 5 欄高 → 二極體逆偏\n紅叉處把電流擋掉，整圈只剩 nA 級的漏電流", small)
    label(d, T((612, 492)), "10 kΩ 負載\n這半週沒有電流流過", small)


# --------------------------------------------------------------------------
# 實驗三 加 1 µF 濾波電容：原圖 875x705（同一塊板，g 列第 9、10 欄多一顆電容）
# 充電與放電是兩條不同的迴路，照 current-path-overlay.md 的規則分成兩張圖
# --------------------------------------------------------------------------
E3_G = 483.0

E3_TRUNK = [
    E3_FG_P, (157.3, 525), (336.7, 525), (336.7, 389.3), (374.5, E3_PLUS),
    (colx3(5), E3_PLUS), (colx3(5), E3_J), (colx3(5), E3_I),
    (colx3(9), E3_I),
]
E3_BR_LOAD = [
    (colx3(9), E3_I), (colx3(9), E3_H), (colx3(13), E3_H),
    (colx3(13), E3_J), (colx3(13), E3_MINUS),
]
E3_BR_CAP = [
    (colx3(9), E3_I), (colx3(9), E3_G), (colx3(10), E3_G),
    (colx3(10), E3_J), (colx3(10), E3_MINUS),
]
E3_RAIL_BACK = [
    (colx3(13), E3_MINUS), (colx3(10), E3_MINUS), (390, E3_MINUS),
    (321.7, E3_MINUS), (321.7, 510), (174, 510), E3_FG_N,
]
# 放電：電容自己驅動負載的區域迴路，完全不經過訊號產生器
E3_DISCHARGE = [
    (colx3(9), E3_G), (colx3(9), E3_H), (colx3(13), E3_H),
    (colx3(13), E3_J), (colx3(13), E3_MINUS),
    (colx3(10), E3_MINUS), (colx3(10), E3_J), (colx3(10), E3_G),
]


def paint_e3_charge(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    for pts in (E3_TRUNK, E3_BR_LOAD, E3_BR_CAP, E3_RAIL_BACK):
        path(d, [T(p) for p in pts], w=12, arrow_min=70, arrow_size=24)
    e3_scopes(d, T)
    # 編號沿著電流走：產生器 → 跳線 → 二極體 → 分成兩路 → 回 − 軌
    for t, p in (("1", (157.3, 505)), ("2", (colx3(5), 412)), ("3", (colx3(6.5), E3_G)),
                 ("4", (colx3(11.6), E3_G)), ("5", (colx3(8.3), 512)),
                 ("6", (colx3(11.5), E3_MINUS))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "充電（Vin 高於電容電壓）：二極體導通，一路餵負載、一路把電容充起來", big, GREEN_TXT, align="center")
    label(d, T((16, 545)),
          "① 訊號產生器(+)出發，上 + 軌\n"
          "② 黃跳線把 + 軌搬進第 5 欄\n"
          "③ 二極體順偏導通，第 9 欄成為輸出節點\n"
          "④ 一路往右流過 10 kΩ 負載到第 13 欄\n"
          "⑤ 另一路往下把 1 µF 電容充到接近峰值\n"
          "⑥ 兩路都經第 10、13 欄的黑跳線回 − 軌\n"
          "電容與負載並聯：兩者跨在同一組節點上", small)
    label(d, T((604, 424)), "右示波器：峰值附近\n輸出跟著 Vin 往上爬", small, BLUE_TXT)


def paint_e3_discharge(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    # 訊號產生器那一整圈（含黃跳線與二極體）在放電期間沒有電流：細虛線、不畫箭頭
    faint = dict(col=GREEN_DASH, w=9, dash=True, period=24, arrows=False)
    path(d, [T(p) for p in reversed(E3_TRUNK)], **faint)
    path(d, [T(p) for p in reversed(E3_RAIL_BACK[1:])], **faint)
    blocker(d, T((468, E3_I)), size=14)
    path(d, [T(p) for p in E3_DISCHARGE], w=12, arrow_min=70, arrow_size=24)
    e3_scopes(d, T)
    for t, p in (("1", (colx3(6.5), E3_G)), ("2", (colx3(8.3), 512)),
                 ("3", (colx3(11.6), E3_G)), ("4", (colx3(11.5), E3_MINUS))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "放電（Vin 低於電容電壓）：二極體截止，改由電容一個人供應負載", big, GREEN_TXT, align="center")
    label(d, T((16, 545)),
          "① Vin 掉到比電容還低 → 二極體逆偏截止（紅叉）\n"
          "② 電容放電，把電荷從第 9 欄送出來\n"
          "③ 電流仍由第 9 欄流向第 13 欄，方向和充電時一樣\n"
          "④ 經 − 軌與第 10 欄的黑跳線回到電容另一腳\n"
          "細虛線那一圈這時候沒有電流：二極體把訊號產生器斷開了\n"
          "放電快慢由 RC = 10 kΩ × 1 µF = 10 ms 決定。半波整流兩個峰值\n"
          "之間要撐將近一整個週期(16.7 ms)，比 τ 還長，所以輸出會從約\n"
          "4.3 V 掉到約 1.3 V 才被下個峰值補回——這段下降就是漣波，\n"
          "而且很明顯", small)
    label(d, T((604, 424)), "右示波器：峰值之後\n輸出沿著放電斜坡緩緩下降", small, BLUE_TXT)


# --------------------------------------------------------------------------
# 實驗四 全波橋式整流：原圖 985x745
# 節點：A = 第 5 欄、B = 第 17 欄（交流輸入兩端）
#       P（輸出 +）= 第 9、13 欄 → + 軌；N（輸出 −）= 第 1、21 欄 → − 軌
#       負載 10 kΩ 在 h 列第 25 → 29 欄；齊納版多一顆在 f 列第 25 → 29 欄
# 正負半週導通的是不同兩顆二極體，但負載上的電流方向兩張圖一樣——這就是全波
# --------------------------------------------------------------------------
E4_SCALE = 2
E4_PAD = (20, 110, 20, 20)


def colx4(n):
    return 406.7 + 16.53 * (n - 1)


E4_J, E4_I, E4_H, E4_G, E4_F = 454.5, 470.75, 488.0, 504.5, 521.5
E4_MINUS, E4_PLUS = 388.0, 405.0
E4_FG_A, E4_FG_B = (161, 652.5), (180, 652.5)

E4_WIRE_A = [E4_FG_A, (161, 697.5), (335, 697.5), (335, 535), (colx4(5), 535), (colx4(5), E4_G)]
E4_WIRE_B = [E4_FG_B, (180, 722.5), (360, 722.5), (360, 560), (colx4(17), 560), (colx4(17), E4_G)]
E4_LOAD = [(colx4(25), E4_PLUS), (colx4(25), E4_H), (colx4(29), E4_H), (colx4(29), E4_MINUS)]

# 四顆二極體的本體中心，用來擺紅叉與編號標籤。
# 編號一律用「講義編號」（見筆記的節點表），不是 Tinkercad 依放置順序給的自動編號。
E4_D2 = ((colx4(1) + colx4(5)) / 2, E4_I)      # 陽極 N(第1欄) → 陰極 A(第5欄)，負半週導通
E4_D3 = ((colx4(5) + colx4(9)) / 2, E4_J)      # 陽極 A(第5欄) → 陰極 P(第9欄)，正半週導通
E4_D4 = ((colx4(13) + colx4(17)) / 2, E4_J)    # 陽極 B(第17欄) → 陰極 P(第13欄)，負半週導通
E4_D1 = ((colx4(17) + colx4(21)) / 2, E4_I)    # 陽極 N(第21欄) → 陰極 B(第17欄)，正半週導通

# 四顆二極體的編號標籤：擺在同一顆二極體隔壁那一列的空孔上，不壓到導線
E4_DLABELS = [
    ("D3", (colx4(7.1), E4_I + 7)), ("D2", (colx4(2.6), E4_J - 2)),
    ("D4", (colx4(15.1), E4_I + 7)), ("D1", (colx4(18.9), E4_J - 2)),
]

# 正半週：A 為正 → D3、D1 導通
E4_POS = E4_WIRE_A + [
    (colx4(5), E4_J), (colx4(9), E4_J), (colx4(9), E4_PLUS),
] + E4_LOAD[:1] + E4_LOAD[1:] + [
    (colx4(21), E4_MINUS), (colx4(21), E4_I), (colx4(17), E4_I), (colx4(17), E4_G),
] + list(reversed(E4_WIRE_B))[1:]
# 負半週：B 為正 → D4、D2 導通
E4_NEG = E4_WIRE_B + [
    (colx4(17), E4_J), (colx4(13), E4_J), (colx4(13), E4_PLUS),
] + E4_LOAD + [
    (colx4(1), E4_MINUS), (colx4(1), E4_I), (colx4(5), E4_I), (colx4(5), E4_G),
] + list(reversed(E4_WIRE_A))[1:]

E4_CH1_RED = [(colx4(5), 302), (colx4(5), E4_H)]
E4_CH1_BLK = [(492, 302), (492, 355), (colx4(17), 360), (colx4(17), E4_H)]
E4_CH2_BLK = [(808, 302), (808, 340), (colx4(23), 355), (colx4(23), E4_MINUS)]
E4_CH2_RED = [(825, 302), (825, 340), (colx4(26), 360), (colx4(26), E4_PLUS)]


def e4_scopes(d, T):
    for pts in (E4_CH1_RED, E4_CH1_BLK, E4_CH2_BLK, E4_CH2_RED):
        path(d, [T(p) for p in pts], col=BLUE, w=6, dash=True, period=22, arrows=False)


def e4_diode_labels(d, T):
    tag = f(26)
    for t, p in E4_DLABELS:
        x, y = T(p)
        label(d, (x, y - 17), t, tag, align="center")


def e4_common(d, T, small):
    e4_diode_labels(d, T)
    label(d, T((14, 292)),
          "左示波器＝Vin：探棒跨在 A(第 5 欄) 與 B(第 17 欄)\n量的是訊號產生器原本的正弦波", small, BLUE_TXT)
    label(d, T((14, 366)),
          "右示波器＝Vout：探棒跨在 + 軌與 − 軌\n正負兩個半週都被翻成正的，所以頻率變兩倍", small, BLUE_TXT)


def paint_e4_pos(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    path(d, [T(p) for p in E4_POS], w=12, arrow_min=70, arrow_size=24)
    for c in (E4_D2, E4_D4):
        blocker(d, T(c), size=15)
    e4_scopes(d, T)
    for t, p in (("1", (161, 675)), ("2", (E4_D3[0], E4_F)), ("3", (colx4(10.3), E4_PLUS)),
                 ("4", (838, E4_F)), ("5", (colx4(28), E4_MINUS)), ("6", (E4_D1[0], E4_F))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "正半週：A 端(第 5 欄)為正 → D3、D1 導通", big, GREEN_TXT, align="center")
    label(d, T((14, 30)),
          "① 訊號產生器的 A 端(深藍線)出發，走溝槽進第 5 欄\n"
          "② D3 導通：第 5 欄 → 第 9 欄\n"
          "③ 紅跳線把第 9 欄併到 + 軌，這裡就是輸出的 +\n"
          "④ 沿 + 軌到第 25 欄，由左向右流過 10 kΩ 負載\n"
          "⑤ 第 29 欄的黑跳線回 − 軌，這裡是輸出的 −\n"
          "⑥ D1 導通：第 21 欄 → 第 17 欄，回到 B 端", small)
    e4_common(d, T, small)
    label(d, T((400, 600)),
          "另外兩顆(D2、D4)這半週逆偏，畫上紅叉：\n"
          "四顆二極體永遠是「對角線兩顆一起導通」", small)


def paint_e4_neg(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    path(d, [T(p) for p in E4_NEG], w=12, arrow_min=70, arrow_size=24)
    for c in (E4_D3, E4_D1):
        blocker(d, T(c), size=15)
    e4_scopes(d, T)
    for t, p in (("1", (180, 690)), ("2", (E4_D4[0], E4_F)), ("3", (colx4(14.3), E4_PLUS)),
                 ("4", (838, E4_F)), ("5", (600, E4_MINUS)), ("6", (E4_D2[0], E4_F))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "負半週：B 端(第 17 欄)為正 → D4、D2 導通", big, GREEN_TXT, align="center")
    label(d, T((14, 30)),
          "① 換 B 端(淺藍線)為正，走溝槽進第 17 欄\n"
          "② D4 導通：第 17 欄 → 第 13 欄\n"
          "③ 紅跳線把第 13 欄併到 + 軌——還是同一個輸出 +\n"
          "④ 負載上的電流仍然由左向右，方向和正半週完全一樣\n"
          "⑤ 第 29 欄回 − 軌，沿 − 軌一路走到第 1 欄\n"
          "⑥ D2 導通：第 1 欄 → 第 5 欄，回到 A 端", small)
    e4_common(d, T, small)
    label(d, T((400, 600)),
          "和正半週比一比：輸入端的極性反了，換另外兩顆導通，\n"
          "但負載上的箭頭方向沒變——這就是「全波」的意思", small)


# 齊納穩壓版：多一顆稽納二極體並聯在負載上（f 列第 25 → 29 欄，色環端在第 25 欄）
E4Z_BRANCH = [(colx4(25), E4_H), (colx4(25), E4_F), (colx4(29), E4_F), (colx4(29), E4_H)]


def paint_e4_zener(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    path(d, [T(p) for p in E4_POS], w=12, arrow_min=70, arrow_size=24)
    for c in (E4_D2, E4_D4):
        blocker(d, T(c), size=15)
    path(d, [T(p) for p in E4Z_BRANCH], col=GREEN_DASH, w=9, dash=True, period=24, arrows=False)
    blocker(d, T(((colx4(25) + colx4(29)) / 2, E4_F)), size=15)
    e4_scopes(d, T)
    for t, p in (("1", (E4_D3[0], 435)), ("2", (838, E4_H - 14)),
                 ("3", (colx4(23.6), E4_F))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "加了齊納，但這組參數下它沒崩潰：輸出和沒加時一模一樣", big, GREEN_TXT, align="center")
    label(d, T((14, 30)),
          "① 橋式的電流路徑和上一張完全相同（畫的是正半週）\n"
          "② 電流照樣全部流過 10 kΩ 負載\n"
          "③ 齊納並聯在負載上、色環(陰極)朝第 25 欄＝輸出 +，\n"
          "　 也就是逆偏——這是穩壓該有的接法\n"
          "但 5 Vpp 經橋式後峰值只剩約 1.1 V，遠低於齊納的崩潰\n"
          "電壓，所以它一直沒導通，這條支路畫成細虛線加紅叉。", small)
    e4_common(d, T, small)
    label(d, T((400, 600)),
          "判斷接反了沒有：齊納若插反會變順偏，輸出被箝在約 0.5 V 的平頂，\n"
          "連輸入正弦都會被削成梯形。現在兩台示波器都正常 → 方向是對的", small)


# --------------------------------------------------------------------------
# 實驗四 第 26 頁 橋式 + 1 µF 濾波電容：底圖 lab1-exp4-breadboard-rc.png
# 這張底圖是在 Full-Wave Bridge Rectifier 的「複本」上放 1 µF 電容後截的，
# 裁切與縮放刻意對齊 lab1-exp4-breadboard.png，所以 colx4()／E4_* 全部沿用。
# Tinkercad 的求解器跑不動這個電路（見筆記提醒框），所以截圖時沒有開模擬，
# 兩台示波器與產生器面板是空白的——這是刻意的，不是漏截。
#   第 25 欄 = P（紅跳線 g25 → + 軌）、第 26 欄經黑跳線 g26 → − 軌 = N
#   電容跨在 f25、f26 → 和 h25–h29 的 10 kΩ 並聯
# --------------------------------------------------------------------------
E4RC_CAP_F = (colx4(25), E4_F)          # 電容接 P 的那一腳
E4RC_CAP_N = (colx4(26), E4_F)          # 電容接 N 的那一腳

# 主幹：訊號產生器 A 端 → D3 → 第 9 欄 → + 軌 → 第 25 欄（分歧點）
E4RC_TRUNK = E4_WIRE_A + [
    (colx4(5), E4_J), (colx4(9), E4_J), (colx4(9), E4_PLUS), (colx4(25), E4_PLUS),
]
E4RC_BR_LOAD = [(colx4(25), E4_PLUS), (colx4(25), E4_H),
                (colx4(29), E4_H), (colx4(29), E4_MINUS)]
E4RC_BR_CAP = [(colx4(25), E4_PLUS), E4RC_CAP_F, E4RC_CAP_N,
               (colx4(26), E4_G), (colx4(27), E4_MINUS)]
# 兩路在 − 軌會合 → D1 → 回 B 端
E4RC_RETURN = [(colx4(29), E4_MINUS), (colx4(27), E4_MINUS), (colx4(21), E4_MINUS),
               (colx4(21), E4_I), (colx4(17), E4_I), (colx4(17), E4_G)] \
    + list(reversed(E4_WIRE_B))[1:]
# 放電：電容 → 負載 → − 軌 → 黑跳線 → 電容另一腳，完全不經過訊號產生器
E4RC_LOOP = [E4RC_CAP_F, (colx4(25), E4_H), (colx4(29), E4_H), (colx4(29), E4_MINUS),
             (colx4(27), E4_MINUS), (colx4(26), E4_G), E4RC_CAP_N]

E4RC_NOTE = ("這張底圖沒有開模擬（兩台示波器與產生器面板因此是空白的）：\n"
             "Tinkercad 的求解器跑不動「橋式 + 電容」，接線擺得出來、但波形不能信。\n"
             "波形請看 CircuitJS 連結與 LTspice 圖。")


def paint_e4rc_charge(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    for pts in (E4RC_TRUNK, E4RC_BR_LOAD, E4RC_BR_CAP, E4RC_RETURN):
        path(d, [T(p) for p in pts], w=12, arrow_min=70, arrow_size=24)
    for c in (E4_D2, E4_D4):
        blocker(d, T(c), size=15)
    e4_diode_labels(d, T)
    for t, p in (("1", (161, 675)), ("2", (E4_D3[0], E4_F)), ("3", (620, E4_PLUS)),
                 ("4", (colx4(27.6), E4_G)), ("5", (colx4(23.2), E4_F)),
                 ("6", (E4_D1[0], E4_F))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "充電（正半週）：D3、D1 導通，電流到第 25 欄分成兩路——一路餵負載、一路充電容",
          big, GREEN_TXT, align="center")
    label(d, T((14, 30)),
          "① 訊號產生器 A 端(第 5 欄)出發\n"
          "② D3 導通：第 5 欄 → 第 9 欄 → 紅跳線上 + 軌\n"
          "③ 沿 + 軌到第 25 欄＝輸出的 +（節點 P）\n"
          "④ 一路往右流過 h 列 10 kΩ 到第 29 欄\n"
          "⑤ 另一路往下充 f 列第 25、26 欄的 1 µF 電容\n"
          "⑥ 兩路回 − 軌會合 → D1 → B 端（D2、D4 逆偏）", small)
    label(d, T((14, 300)),
          "電容與負載跨在同一組節點(P、N)上 → 並聯。\n"
          "負半週也會充電，換成 D4、D2 導通，\n"
          "但流進電容的方向一模一樣——所以全波是每半週充一次。", small, GREEN_TXT)
    label(d, T((400, 600)), E4RC_NOTE, small)


def paint_e4rc_discharge(canvas, d, T):
    big, small, num = f(36), f(29), f(30)
    W = canvas.size[0]

    faint = dict(col=GREEN_DASH, w=9, dash=True, period=24, arrows=False)
    for pts in (E4RC_TRUNK, E4RC_RETURN,
                [(colx4(25), E4_PLUS), (colx4(25), E4_H)],
                [(colx4(27), E4_MINUS), (colx4(21), E4_MINUS)]):
        path(d, [T(p) for p in pts], **faint)
    for c in (E4_D1, E4_D2, E4_D3, E4_D4):
        blocker(d, T(c), size=15)
    path(d, [T(p) for p in E4RC_LOOP], w=12, arrow_min=70, arrow_size=24)
    e4_diode_labels(d, T)
    for t, p in (("1", (E4_D3[0], E4_F)), ("2", (colx4(23.2), E4_F)),
                 ("3", (colx4(27.6), E4_G)), ("4", (colx4(28), E4_MINUS))):
        badge(d, T(p), t, num)

    label(d, (W // 2, 26),
          "放電：四顆二極體全部截止，改由電容一個人供應負載", big, GREEN_TXT, align="center")
    label(d, T((14, 30)),
          "① Vin 掉到比電容還低 → 四顆二極體全部逆偏（紅叉）\n"
          "② 電容把存起來的電荷從第 25 欄放出來\n"
          "③ 電流仍由左向右流過 10 kΩ，方向和充電時一樣\n"
          "④ 經 − 軌與第 26 欄的黑跳線回到電容另一腳\n"
          "細虛線那一圈這時候沒有電流，所以不畫方向箭頭", small)
    label(d, T((14, 270)),
          "放電只需要撐半個週期（全波的峰值間隔約 8.3 ms），\n"
          "所以同樣的 RC，漣波約是半波的一半。", small, GREEN_TXT)
    label(d, T((400, 600)), E4RC_NOTE, small)


def main():
    compose(
        os.path.join(IMG_DIR, "lab1-exp1-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp1-breadboard-current.png"),
        paint_breadboard, scale=BB_SCALE, pad=BB_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp1-schematic.png"),
        os.path.join(IMG_DIR, "lab1-exp1-schematic-current.png"),
        paint_schematic, scale=SCH_K, pad=SCH_PAD, crop=SCH_CROP, bg=(255, 255, 255),
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp2-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp2-breadboard-current.png"),
        paint_e2_breadboard, scale=E2_SCALE, pad=E2_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp2-schematic.png"),
        os.path.join(IMG_DIR, "lab1-exp2-schematic-current.png"),
        paint_e2_schematic, scale=E2S_K, pad=E2S_PAD, crop=E2S_CROP, bg=(255, 255, 255),
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp3-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-current.png"),
        paint_e3_pos, scale=E3_SCALE, pad=E3_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp3-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-neg-current.png"),
        paint_e3_neg, scale=E3_SCALE, pad=E3_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-rc.png"),
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-rc-charge-current.png"),
        paint_e3_charge, scale=E3_SCALE, pad=E3_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-rc.png"),
        os.path.join(IMG_DIR, "lab1-exp3-breadboard-rc-discharge-current.png"),
        paint_e3_discharge, scale=E3_SCALE, pad=E3_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp4-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp4-breadboard-current.png"),
        paint_e4_pos, scale=E4_SCALE, pad=E4_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp4-breadboard.png"),
        os.path.join(IMG_DIR, "lab1-exp4-breadboard-neg-current.png"),
        paint_e4_neg, scale=E4_SCALE, pad=E4_PAD,
    )
    compose(
        os.path.join(IMG_DIR, "lab1-exp4-breadboard-zener.png"),
        os.path.join(IMG_DIR, "lab1-exp4-breadboard-zener-current.png"),
        paint_e4_zener, scale=E4_SCALE, pad=E4_PAD,
    )
    for out, painter in (("lab1-exp4-breadboard-rc-charge-current.png", paint_e4rc_charge),
                         ("lab1-exp4-breadboard-rc-discharge-current.png", paint_e4rc_discharge)):
        compose(os.path.join(IMG_DIR, "lab1-exp4-breadboard-rc.png"),
                os.path.join(IMG_DIR, out), painter, scale=E4_SCALE, pad=E4_PAD)


if __name__ == "__main__":
    main()


