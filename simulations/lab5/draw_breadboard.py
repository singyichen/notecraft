"""畫出 Lab 5 三個實驗在**實體麵包板**上的接線圖。

幾何與配色沿用 Lab 2 的 `draw_real_breadboard.py`，運放原語在
`simulations/tools/opamp_board.py`，走線規則與 Lab 4 相同
（儀器一律接上半部或上方電源軌，鬆線往上走，不穿過整塊板）。

三張圖的重點：
  實驗一 反相加法器：兩顆輸入電阻都落在「−」節點（第 21 欄），一顆走上半部、
                      一顆走下半部，第 8 欄再跨溝槽拉上來。
  實驗二 同相加法器 與 實驗三 減法器：**元件位置完全一樣**，只有第 14 欄與
                      第 46 欄的「接地／吃訊號」對調。

輸出到 public/note-images/ec-week11-breadboard/：
  lab5-exp1-breadboard.png   實驗一：反相加法器
  lab5-exp2-breadboard.png   實驗二：同相加法器
  lab5-exp3-breadboard.png   實驗三：減法器

用法：simulations/lab1/.venv/bin/python simulations/lab5/draw_breadboard.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))

import opamp_board as ob  # noqa: E402
from opamp_board import bb  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week11-breadboard")

C_CHIP = 26                 # DIP-8 最左欄（腳 1／8）
C_M = 21                    # 「−」節點延伸欄
C_P = 33                    # 「+」節點延伸欄
C_L1, C_L2 = 14, 8          # 「−」側兩個遠端欄（上半部）
C_R1, C_R2 = 40, 46         # 「+」側兩個遠端欄（上半部）
C_VP, C_GND_T = 6, 2        # 上方 ＋軌／−軌 的電源接線欄
C_VN = 57                   # 下方 −軌 的接線欄
C_GND_B = 60                # 下方 ＋軌（共地延伸）的接線欄

B10K = ["棕", "黑", "黑", "紅", "棕"]

X_LEFT_B = 76
X_RIGHT_A, X_RIGHT_B = 1726, 1760
LANE = dict(vp=404, gnd=360, vn=382, g1=338, g2=316)

YEL = (250, 214, 90)
CYA = (110, 212, 250)
GEN1 = bb.MEAS_RED
GEN2 = (150, 60, 190)


def path(d, pts, color, width=6):
    bb.wire(d, pts, color, width=width)


def to_rail(d, post, col, rail, color, lane, side=None):
    px, py = post
    rx, ry = bb.hole(col, rail)
    if side == "L":
        pts = [(px, py), (px, lane), (X_LEFT_B, lane), (X_LEFT_B, ry), (rx, ry)]
    elif side == "R":
        pts = [(px, py), (px, lane), (X_RIGHT_A, lane), (X_RIGHT_A, ry), (rx, ry)]
    else:
        pts = [(px, py), (px, lane), (rx, lane), (rx, ry)]
    path(d, pts, color)
    bb.plug(d, (rx, ry))


def ground_bridge(d):
    """上方 −軌（共地）→ 下方 ＋軌，從板子右側繞過去。"""
    x1, y1 = bb.hole(C_GND_B, "-")
    x2, y2 = bb.hole(C_GND_B, "+b")
    path(d, [(x1, y1), (X_RIGHT_B, y1), (X_RIGHT_B, y2), (x2, y2)], bb.WIRE_BLACK)
    bb.plug(d, (x1, y1))
    bb.plug(d, (x2, y2))
    bb.badge(d, (X_RIGHT_B + 10, (y1 + y2) / 2), "共地", size=13, fill=bb.INK2, anchor="lm")


def power(d, posts):
    to_rail(d, posts["ch1+"], C_VP, "+", bb.WIRE_RED, LANE["vp"], side="L")
    to_rail(d, posts["ch1-"], C_GND_T, "-", bb.WIRE_BLACK, LANE["gnd"], side="L")
    to_rail(d, posts["ch2-"], C_VN, "-b", bb.WIRE_ORANGE, LANE["vn"], side="R")


def chip_and_shared(d):
    ob.dip8(d, C_CHIP)
    ob.dip8_labels(d, C_CHIP)
    bb.jumper(d, C_CHIP + 1, "j", "+")              # 腳 7 → ＋軌
    ob.jumper_b(d, C_CHIP + 3, "a", "-b")           # 腳 4 → 下−軌
    ob.jump(d, C_CHIP + 1, "b", C_M, "b")           # 腳 2 → 第 21 欄
    ob.trough_jumper(d, C_M, "e", C_M, "f")
    ob.jump(d, C_CHIP + 2, "c", C_P, "c", bow=18)   # 腳 3 → 第 33 欄
    ob.trough_jumper(d, C_P, "e", C_P, "f")
    bb.resistor(d, C_M, C_CHIP + 2, "g", B10K)      # 回授電阻：「−」節點 ←→ 腳 6


def legend(d, x, y, rows):
    bb.text(d, (x, y), "線的顏色", size=16, fill=bb.INK)
    for i, (col, s) in enumerate(rows):
        yy = y + 32 + i * 28
        d.line([(x, yy), (x + 34, yy)], fill=col, width=7)
        bb.text(d, (x + 46, yy), s, size=14, fill=bb.INK2, anchor="lm")


SPEC = {
    1: dict(
        title="Lab 5 實驗一：反相加法器（uA741，四顆電阻全是 10 kΩ）",
        sub="兩路訊號各經一顆 10 kΩ 進同一個虛接地點，所以 V_out = −(V_in1 + V_in2)。\n"
            "第 21 欄是「−」節點：一顆輸入電阻走上半部、一顆走下半部，第 8 欄再跨溝槽把 V_in2 拉到板子上面。",
        amp1="2 V 峰值（4.00 Vpp）", amp2="3 V 峰值（6.00 Vpp）",
        ch1_label="CH1 = V_in1（1 V/格）", ch2_label="CH2 = V_out（2 V/格）"),
    2: dict(
        title="Lab 5 實驗二：同相加法器（uA741，四顆電阻全是 10 kΩ）",
        sub="兩路訊號在「+」端先分壓成平均值，再被 1 + R3/R4 = 2 倍放大回來，所以 V_out = V_in1 + V_in2，而且同相。\n"
            "和實驗三是**同一塊板、同樣的元件位置**，只有第 14 欄與第 46 欄的接法對調。",
        amp1="2 V 峰值（4.00 Vpp）", amp2="3 V 峰值（6.00 Vpp）",
        ch1_label="CH1 = V_in1（1 V/格）", ch2_label="CH2 = V_out（2 V/格）"),
    3: dict(
        title="Lab 5 實驗三：減法器（uA741，四顆電阻全是 10 kΩ）",
        sub="V_in1 走「+」端、V_in2 走「−」端，兩路權重剛好相消，所以 V_out = V_in1 − V_in2。\n"
            "和實驗二是**同一塊板、同樣的元件位置**：把第 14 欄從接地改成吃 V_in2、第 46 欄從吃訊號改成接地，就變成減法器。",
        amp1="5 V 峰值（10.00 Vpp）", amp2="2 V 峰值（4.00 Vpp）",
        ch1_label="CH1 = V_in1（2 V/格）", ch2_label="CH2 = V_out（1 V/格）"),
}


def fig(exp: int):
    sp = SPEC[exp]
    img, d = bb.new_canvas()
    bb.title(d, sp["title"], sp["sub"])

    sup = ob.psu_bipolar(d, 56, 128)
    fg = ob.fgen(d, 500, 128,
                 [("CH1 → V_in1", "1.000 kHz", sp["amp1"]),
                  ("CH2 → V_in2", "1.000 kHz", sp["amp2"])],
                 two_ch=True)
    sc = ob.scope(d, 1000, 128, "示波器 Keysight EDUX1052G",
                  sp["ch1_label"], sp["ch2_label"])

    bb.draw_board(d)
    power(d, sup)
    ground_bridge(d)
    chip_and_shared(d)

    if exp == 1:
        bb.resistor(d, C_M, C_L2, "c", B10K)                 # R1：下半部，「−」節點 ←→ 第 8 欄
        bb.resistor(d, C_M, C_L1, "i", B10K)                 # R2：上半部，「−」節點 ←→ 第 14 欄
        ob.trough_jumper(d, C_L2, "e", C_L2, "f")
        bb.jumper(d, C_P, "j", "-")                          # 「+」節點接地
        bb.badge(d, (bb.cx(C_P) + 18, bb.hole(1, "j")[1]), "「+」端接地",
                 size=13, fill=bb.INK2, anchor="lm")
        c1, c2 = C_L2, C_L1
    else:
        bb.resistor(d, C_M, C_L1, "i", B10K)                 # 「−」側遠端電阻 → 第 14 欄
        bb.resistor(d, C_P, C_R1, "i", B10K)                 # 「+」側遠端電阻 → 第 40 欄
        bb.resistor(d, C_P, C_R2, "b", B10K)                 # 下半部，「+」節點 ←→ 第 46 欄
        ob.trough_jumper(d, C_R2, "e", C_R2, "f")
        if exp == 2:
            bb.jumper(d, C_L1, "j", "-")
            bb.badge(d, (bb.cx(C_L1) - 18, bb.hole(1, "j")[1]), "第 14 欄接地",
                     size=13, fill=bb.INK2, anchor="rm")
            c1, c2 = C_R1, C_R2
        else:
            bb.jumper(d, C_R2, "j", "-")
            bb.badge(d, (bb.cx(C_R2) + 18, bb.hole(1, "j")[1]), "第 46 欄接地",
                     size=13, fill=bb.INK2, anchor="lm")
            c1, c2 = C_R1, C_L1

    # 訊號產生器兩個通道
    ob.lead(d, c1, "j", fg[("ch1", "+")], GEN1, 404, free_dx=-52)
    ob.lead(d, c2, "j", fg[("ch2", "+")], GEN2, 380, free_dx=52)
    to_rail(d, fg[("ch1", "-")], 18, "-", bb.WIRE_BLACK, LANE["g1"])
    to_rail(d, fg[("ch2", "-")], 24, "-", bb.WIRE_BLACK, LANE["g2"])
    # 示波器
    ob.lead(d, c1, "h", sc["ch1"], YEL, 356, free_dx=52)
    ob.lead(d, C_CHIP + 2, "j", sc["ch2"], CYA, 404, free_dx=52)
    to_rail(d, sc["gnd"], 50, "-", bb.WIRE_BLACK, LANE["g2"])

    legend(d, 1460, 128, [
        (bb.WIRE_RED, "+15 V（上方 ＋軌）"), (bb.WIRE_ORANGE, "−15 V（下方 −軌）"),
        (bb.WIRE_BLACK, "0 V 共地"), (bb.WIRE_YELLOW, "板上跳線"),
        (GEN1, "產生器 CH1 = V_in1"), (GEN2, "產生器 CH2 = V_in2"),
        (YEL, "示波器 CH1"), (CYA, "示波器 CH2 = V_out"),
    ])

    rows = [
        ("uA741", "第 26–29 欄，缺口朝左、橫跨溝槽", "下排 e 列左到右＝腳 1/2/3/4；上排 f 列＝腳 8/7/6/5"),
        ("腳 7 → ＋軌", "跳線：第 27 欄 j 列 → 上方 ＋軌", "V+ = +15 V"),
        ("腳 4 → 下−軌", "跳線：第 29 欄 a 列 → 下方 −軌", "V− = −15 V"),
        ("腳 2 → 第 21 欄", "跳線：第 27 欄 b 列 → 第 21 欄 b 列", "第 21 欄＝「−」節點"),
        ("第 21 欄跨溝槽", "跳線：第 21 欄 e 列 → f 列", "同一欄的上下半部不相通"),
        ("腳 3 → 第 33 欄", "跳線：第 28 欄 c 列 → 第 33 欄 c 列", "第 33 欄＝「+」節點"),
        ("第 33 欄跨溝槽", "跳線：第 33 欄 e 列 → f 列", "同上"),
        ("回授 10 kΩ", "上半部 g 列，第 21 欄 → 第 28 欄", "棕黑黑紅棕；「−」節點 ←→ 腳 6"),
        ("示波器 CH2", "第 28 欄 j 列（＝腳 6 那一欄）", "輸出一律在這裡量"),
    ]
    if exp == 1:
        rows += [
            ("輸入 10 kΩ（下）", "下半部 c 列，第 21 欄 → 第 8 欄", "第 8 欄＝V_in1"),
            ("輸入 10 kΩ（上）", "上半部 i 列，第 21 欄 → 第 14 欄", "第 14 欄＝V_in2"),
            ("第 8 欄跨溝槽", "跳線：第 8 欄 e 列 → f 列", "把 V_in1 拉到板子上面好接線"),
            ("「+」端接地", "跳線：第 33 欄 j 列 → 上方 −軌", "腳 3 務必接地，不可懸空"),
            ("產生器 CH1／CH2", "第 8 欄 j 列／第 14 欄 j 列", "兩個 BNC 的地在機器內部已相通，接一條就夠"),
            ("示波器 CH1", "第 8 欄 h 列", "量 V_in1；要看 V_in2 再把探棒移到第 14 欄"),
        ]
    else:
        rows += [
            ("「−」側 10 kΩ", "上半部 i 列，第 21 欄 → 第 14 欄", "實驗二＝R4（接地）；實驗三＝R3（吃 V_in2）"),
            ("「+」側 10 kΩ（上）", "上半部 i 列，第 33 欄 → 第 40 欄", "第 40 欄＝V_in1"),
            ("「+」側 10 kΩ（下）", "下半部 b 列，第 33 欄 → 第 46 欄", "實驗二＝吃 V_in2；實驗三＝接地"),
            ("第 46 欄跨溝槽", "跳線：第 46 欄 e 列 → f 列", "把第 46 欄拉到板子上面"),
            ("接地那一欄", "跳線：第 %d 欄 j 列 → 上方 −軌" % (C_L1 if exp == 2 else C_R2),
             "實驗二接第 14 欄、實驗三接第 46 欄，就差這一條"),
            ("產生器 CH1／CH2", "第 40 欄 j 列／第 %d 欄 j 列" % (C_R2 if exp == 2 else C_L1),
             "兩個 BNC 的地在機器內部已相通，接一條就夠"),
            ("示波器 CH1", "第 40 欄 h 列", "量 V_in1；要看 V_in2 再把探棒移過去"),
        ]
    y = 972
    bb.text(d, (60, y - 34), "接線清單（照這個順序插，插完一條打一個勾）", size=17, fill=bb.INK)
    bb.table(d, 60, y, ["元件／線", "插在哪", "備註"], [300, 470, 700], rows)

    bb.callout(d, (60, 1500),
               "通電前先確認：① 電源輸出先關掉再接線；② uA741 缺口朝左；③ 產生器兩個通道要同頻率同相位\n"
               "（AFG-2225 按 [Utility] → Channel Coupling 打開，或兩台都用 1 kHz 再用示波器對相位）；\n"
               "④ 開電源後先量腳 7／腳 4 對地是不是 +15 V／−15 V，再接訊號。", size=15)
    return img


def main() -> int:
    bb.H = 1640
    os.makedirs(OUT_DIR, exist_ok=True)
    for n in (1, 2, 3):
        p = os.path.normpath(os.path.join(OUT_DIR, f"lab5-exp{n}-breadboard.png"))
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
