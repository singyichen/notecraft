"""畫出 Lab 4 兩個實驗在**實體麵包板**上的接線圖。

幾何與配色沿用 Lab 2 的 `draw_real_breadboard.py`（同一塊 60 欄全尺寸板），
運放專用的原語（DIP-8、電源／產生器／示波器面板、跨溝槽跳線）在
`simulations/tools/opamp_board.py`。

版面規則（第一版踩到的教訓）：
  - 儀器一律接在板子**上半部或上方電源軌**，鬆線往上走，不穿過整塊板
  - 晶片下半部的節點（腳 2、腳 3）先用跳線拉到旁邊的欄，再跨溝槽拉上來
  - 兩張圖的元件位置完全一樣，只有三條跳線不同

輸出到 public/note-images/ec-week10-breadboard/：
  lab4-exp1-breadboard.png   實驗一：非反相放大器
  lab4-exp2-breadboard.png   實驗二：反相放大器

用法：simulations/lab1/.venv/bin/python simulations/lab4/draw_breadboard.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))

import opamp_board as ob  # noqa: E402
from opamp_board import bb  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week10-breadboard")

C_CHIP = 26                 # DIP-8 最左欄（腳 1／8）
C_M = 21                    # 「−」節點延伸到這一欄（下半部跳過來、再跨溝槽上去）
C_R1 = 14                   # R1 遠端那一欄（上半部）
C_P = 33                    # 「+」節點延伸到這一欄（上半部）
C_VP, C_GND_T = 6, 8        # 上方 ＋軌／−軌 的電源接線欄
C_VN = 57                   # 下方 −軌 的接線欄
C_GND_B = 2                 # 下方 ＋軌（共地延伸）的接線欄

BANDS_100K = ["棕", "黑", "黑", "橙", "棕"]
BANDS_200K = ["紅", "黑", "黑", "橙", "棕"]

X_LEFT_A, X_LEFT_B = 52, 76     # 板子左側兩條垂直走廊
X_RIGHT = 1726                  # 板子右側垂直走廊
LANE = dict(ch1m=360, ch2p=382, ch2m=404, gen_gnd=338, sc_gnd=316)


def path(d, pts, color, width=6):
    bb.wire(d, pts, color, width=width)


def to_rail(d, post, col, rail, color, lane, side=None):
    px, py = post
    rx, ry = bb.hole(col, rail)
    if side == "L":
        pts = [(px, py), (px, lane), (X_LEFT_B, lane), (X_LEFT_B, ry), (rx, ry)]
    elif side == "R":
        pts = [(px, py), (px, lane), (X_RIGHT, lane), (X_RIGHT, ry), (rx, ry)]
    else:
        pts = [(px, py), (px, lane), (rx, lane), (rx, ry)]
    path(d, pts, color)
    bb.plug(d, (rx, ry))


def ground_bridge(d):
    """上方 −軌（共地）→ 下方 ＋軌，讓下半部也有一條地。"""
    x1, y1 = bb.hole(C_GND_B, "-")
    x2, y2 = bb.hole(C_GND_B, "+b")
    path(d, [(x1, y1), (X_LEFT_A, y1), (X_LEFT_A, y2), (x2, y2)], bb.WIRE_BLACK)
    bb.plug(d, (x1, y1))
    bb.plug(d, (x2, y2))
    bb.badge(d, (X_LEFT_A - 10, (y1 + y2) / 2), "共地", size=13, fill=bb.INK2, anchor="rm")


def power(d, posts):
    to_rail(d, posts["ch1+"], C_VP, "+", bb.WIRE_RED, LANE["ch2m"], side="L")
    to_rail(d, posts["ch1-"], C_GND_T, "-", bb.WIRE_BLACK, LANE["ch1m"])
    to_rail(d, posts["ch2-"], C_VN, "-b", bb.WIRE_ORANGE, LANE["ch2p"], side="R")


def chip_and_shared(d):
    """兩張圖共用的板上接線。"""
    ob.dip8(d, C_CHIP)
    ob.dip8_labels(d, C_CHIP)
    bb.jumper(d, C_CHIP + 1, "j", "+")              # 腳 7 → ＋軌（+15 V）
    ob.jumper_b(d, C_CHIP + 3, "a", "-b")           # 腳 4 → 下−軌（−15 V）
    ob.jump(d, C_CHIP + 1, "b", C_M, "b")           # 腳 2 → 第 21 欄（下半部）
    ob.trough_jumper(d, C_M, "e", C_M, "f")         # 第 21 欄跨溝槽
    ob.jump(d, C_CHIP + 2, "c", C_P, "c", bow=18)   # 腳 3 → 第 33 欄（下半部）
    ob.trough_jumper(d, C_P, "e", C_P, "f")         # 第 33 欄跨溝槽
    bb.resistor(d, C_M, C_R1, "i", BANDS_100K)      # R1：「−」節點 ←→ 第 14 欄
    bb.resistor(d, C_M, C_CHIP + 2, "g", BANDS_200K)  # R2：「−」節點 ←→ 腳 6


def legend(d, x, y):
    bb.text(d, (x, y), "線的顏色", size=16, fill=bb.INK)
    for i, (col, s) in enumerate([
        (bb.WIRE_RED, "+15 V（上方 ＋軌）"), (bb.WIRE_ORANGE, "−15 V（下方 −軌）"),
        (bb.WIRE_BLACK, "0 V 共地"), (bb.WIRE_YELLOW, "板上跳線"),
        (bb.MEAS_RED, "訊號產生器蕊線"), ((250, 214, 90), "示波器 CH1 = V_in"),
        ((110, 212, 250), "示波器 CH2 = V_out"),
    ]):
        yy = y + 32 + i * 28
        d.line([(x, yy), (x + 34, yy)], fill=col, width=7)
        bb.text(d, (x + 46, yy), s, size=14, fill=bb.INK2, anchor="lm")


def fig(exp: int):
    img, d = bb.new_canvas()
    if exp == 1:
        bb.title(
            d, "Lab 4 實驗一：非反相放大器（uA741，R1 = 100 kΩ、R2 = 200 kΩ，A_v = +3）",
            "訊號直接進腳 3（非反相端），R1 從腳 2 接到地、R2 從腳 2 接到腳 6。\n"
            "上方「−」軌＝共地，上方「＋」軌＝+15 V，下方「−」軌＝−15 V，下方「＋」軌是從共地拉過來的第二條地。")
    else:
        bb.title(
            d, "Lab 4 實驗二：反相放大器（uA741，R1 = 100 kΩ、R2 = 200 kΩ，A_v = −2）",
            "和實驗一同一塊板、元件位置一模一樣，只改三條跳線：第 33 欄（腳 3）改接地、\n"
            "第 14 欄（R1 左端）改吃訊號，示波器 CH1 也跟著移到第 14 欄。")

    sup = ob.psu_bipolar(d, 56, 128)
    fg = ob.fgen(d, 500, 128, [("CH1", "1.000 kHz", "正弦波，Ampl 8.00 Vpp（＝4 V 峰值）")],
                 two_ch=False)
    sc = ob.scope(d, 960, 128, "示波器 Keysight EDUX1052G",
                  "CH1 = V_in（2 V/格）", "CH2 = V_out（5 V/格）")

    bb.draw_board(d)
    power(d, sup)
    ground_bridge(d)
    chip_and_shared(d)

    if exp == 1:
        bb.jumper(d, C_R1, "j", "-")          # R1 左端接地
        c_in, r_ch1 = C_P, "i"                # 訊號進「+」節點（第 33 欄）
        bb.badge(d, (bb.cx(C_R1) - 18, bb.hole(1, "j")[1]), "R1 左端接地",
                 size=13, fill=bb.INK2, anchor="rm")
    else:
        bb.jumper(d, C_P, "j", "-")           # 腳 3 接地
        c_in, r_ch1 = C_R1, "h"               # 訊號進 R1 左端（第 14 欄）
        bb.badge(d, (bb.cx(C_P) + 18, bb.hole(1, "j")[1]), "腳 3 接地",
                 size=13, fill=bb.INK2, anchor="lm")

    # 訊號產生器：蕊線插進輸入節點最上面那一列、地線接上方 −軌
    ob.lead(d, c_in, "j", fg[("ch1", "+")], bb.MEAS_RED, 404, free_dx=-52)
    to_rail(d, fg[("ch1", "-")], 20, "-", bb.WIRE_BLACK, LANE["gen_gnd"])
    # 示波器
    ob.lead(d, c_in, r_ch1, sc["ch1"], (250, 214, 90), 380, free_dx=52)
    ob.lead(d, C_CHIP + 2, "j", sc["ch2"], (110, 212, 250), 404, free_dx=52)
    to_rail(d, sc["gnd"], 46, "-", bb.WIRE_BLACK, LANE["sc_gnd"])

    legend(d, 1430, 128)

    rows = [
        ("uA741", "第 26–29 欄，缺口朝左、橫跨溝槽", "下排 e 列左到右＝腳 1/2/3/4；上排 f 列＝腳 8/7/6/5"),
        ("腳 7 → ＋軌", "跳線：第 27 欄 j 列 → 上方 ＋軌", "V+ = +15 V"),
        ("腳 4 → 下−軌", "跳線：第 29 欄 a 列 → 下方 −軌", "V− = −15 V"),
        ("腳 2 → 第 21 欄", "跳線：第 27 欄 b 列 → 第 21 欄 b 列", "把「−」節點拉離晶片"),
        ("第 21 欄跨溝槽", "跳線：第 21 欄 e 列 → f 列", "同一欄的上下半部不相通，要自己接起來"),
        ("腳 3 → 第 33 欄", "跳線：第 28 欄 c 列 → 第 33 欄 c 列", "把「+」節點拉離晶片"),
        ("第 33 欄跨溝槽", "跳線：第 33 欄 e 列 → f 列", "同上"),
        ("R1 100 kΩ", "上半部 i 列，第 21 欄 → 第 14 欄", "棕黑黑橙棕"),
        ("R2 200 kΩ", "上半部 g 列，第 21 欄 → 第 28 欄", "紅黑黑橙棕；回授：「−」節點 ←→ 腳 6 輸出"),
        ("示波器 CH2", "第 28 欄 j 列（＝腳 6 那一欄）", "腳 6 與 f–j 五個孔同一節點，直接夾最上面那個"),
    ]
    rows += ([("第 14 欄接地", "跳線：第 14 欄 j 列 → 上方 −軌", "實驗一：R1 的另一端是地"),
              ("訊號蕊線", "第 33 欄 j 列（＝腳 3）", "實驗一：非反相端直接吃訊號"),
              ("示波器 CH1", "第 33 欄 i 列", "量的就是腳 3 的電壓")]
             if exp == 1 else
             [("第 33 欄接地", "跳線：第 33 欄 j 列 → 上方 −軌", "實驗二：非反相端務必接地，不可懸空"),
              ("訊號蕊線", "第 14 欄 j 列（＝R1 左端）", "實驗二：反相端的輸入阻抗就是這顆 R1"),
              ("示波器 CH1", "第 14 欄 h 列", "量的是 R1 左端，不是腳 2")])
    y = 972
    bb.text(d, (60, y - 34), "接線清單（照這個順序插，插完一條打一個勾）", size=17, fill=bb.INK)
    bb.table(d, 60, y, ["元件／線", "插在哪", "備註"], [300, 440, 700], rows)

    bb.callout(d, (60, 1424),
               "通電前先確認：① 電源輸出先關掉再接線；② uA741 缺口朝左，別插反；③ 訊號產生器的地、電源的 0 V、\n"
               "示波器的地夾全部是同一點；④ 開電源後先用電表量腳 7 與腳 4 對地，應該是 +15 V 與 −15 V，再接訊號。",
               size=15)
    return img


def main() -> int:
    bb.H = 1540
    os.makedirs(OUT_DIR, exist_ok=True)
    for n in (1, 2):
        p = os.path.normpath(os.path.join(OUT_DIR, f"lab4-exp{n}-breadboard.png"))
        fig(n).save(p)
        print("寫出", p)
    missing = bb.check_glyphs()
    if missing:
        print("字型缺字（會變成空心方框）：", " ".join(missing), file=sys.stderr)
        return 1
    print("字型檢查：全部可畫")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
