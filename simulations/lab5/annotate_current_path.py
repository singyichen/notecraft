"""在 Lab 5 的三張麵包板接線圖上疊出「電流實際流動路徑」。

三個電路的重點各不相同：
  實驗一 反相加法器：兩股電流在虛接地點匯合，之後一起流過回授電阻——
                      「相加」這件事是電流在節點上相加，不是電壓疊在一起。
  實驗二 同相加法器：「+」端兩顆電阻之間自己有一股電流在跑（兩個訊號源互相灌），
                      分壓出來的平均值才是運放看到的輸入。
  實驗三 減法器　　：上下兩路各自成立，輸出是兩路效果相減。

座標直接從 `draw_breadboard.py` 的欄列取。
輸出到 public/note-images/ec-week11-breadboard/（原名加 -current）。

用法：simulations/lab1/.venv/bin/python simulations/lab5/annotate_current_path.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))

import current_overlay as co  # noqa: E402
import draw_breadboard as db  # noqa: E402
from opamp_board import bb  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week11-breadboard")

SUP = (235, 140, 45, 235)
SUP_TXT = (176, 86, 10, 255)
BLUE2 = (40, 110, 230, 235)
BLUE2_TXT = (30, 80, 200, 255)
CROP = (82, 404, 1700, 936)
SCALE = 1.25
PAD = (0, 196, 0, 600)

H = bb.hole


def title(d, T, s, sub):
    co.text(d, T((CROP[0] + 16, CROP[1] - 150)), s, co.f(44), co.INK)
    d.multiline_text(T((CROP[0] + 16, CROP[1] - 92)), sub, font=co.f(30),
                     fill=(70, 70, 70, 255), spacing=12)


def notes(d, T, rows, y0=72, step=124):
    big, small = co.f(32), co.f(27)
    x = T((CROP[0] + 40, 0))[0]
    y = T((0, CROP[3]))[1] + y0
    for i, (n, col, head, body) in enumerate(rows):
        yy = y + i * step
        co.badge(d, (x, yy), n, co.f(30), r=27)
        co.text(d, (x + 52, yy - 20), head, big, col)
        d.multiline_text((x + 52, yy + 24), body, font=small,
                         fill=(60, 60, 60, 255), spacing=9)


def supply_path(d, T, n, big):
    co.path(d, [T(H(6, "+")), T(H(27, "+")), T(H(27, "j")), T(H(27, "f"))], col=SUP, w=11)
    co.path(d, [T(H(29, "e")), T(H(29, "a")), T(H(29, "-b")), T(H(57, "-b"))], col=SUP, w=11)
    co.badge(d, T((H(27, "+")[0] - 70, H(27, "+")[1] - 6)), n, big, r=27)


def dead_input(d, T, col_node, n, big):
    """從某個節點進晶片輸入腳、但幾乎不走電流的那條虛線。"""
    if col_node == db.C_P:
        pts = [H(33, "j"), H(33, "f"), H(33, "c"), H(28, "c"), H(28, "e")]
        blk = H(31, "c")
    else:
        pts = [H(21, "j"), H(21, "f"), H(21, "b"), H(27, "b"), H(27, "e")]
        blk = H(24, "b")
    co.path(d, [T(p) for p in pts], col=co.GREEN_DASH, w=11, dash=True, arrows=False)
    co.blocker(d, T(blk), size=26)
    co.badge(d, T((pts[0][0] + 54, pts[0][1] - 34)), n, big, r=27)


def exp1(canvas, d, T):
    big, small = co.f(30), co.f(27)
    title(d, T, "Lab 5 實驗一 反相加法器：兩股電流在虛接地點相加",
          "「加法」不是兩個電壓疊在一起，是兩股電流在同一個節點上匯流。\n"
          "每一路的電流只由自己那一路的電壓與電阻決定，因為那一點被運放釘在 0 V。")

    # 第 8 欄（V_in1）→ 下半部 10k → 「−」節點
    p1 = [H(8, "j"), H(8, "f"), H(8, "c"), H(21, "c"), H(21, "b"), H(21, "f"), H(21, "g")]
    co.path(d, [T(p) for p in p1], col=co.GREEN, w=13)
    co.badge(d, T((H(14, "c")[0], H(14, "c")[1] + 44)), "1", big, r=27)
    # 第 14 欄（V_in2）→ 上半部 10k → 「−」節點
    p2 = [H(14, "j"), H(14, "i"), H(21, "i"), H(21, "g")]
    co.path(d, [T(p) for p in p2], col=BLUE2, w=13)
    co.badge(d, T((H(17, "i")[0], H(17, "i")[1] - 44)), "2", big, r=27)
    # 匯合後流過回授電阻
    p3 = [H(21, "g"), H(28, "g"), H(28, "f")]
    co.path(d, [T(p) for p in p3], col=(170, 40, 160, 235), w=15)
    co.badge(d, T((H(24, "g")[0], H(24, "g")[1] - 46)), "3", big, r=27)

    supply_path(d, T, "4", big)
    co.label(d, T((H(36, "d")[0], H(36, "c")[1])),
             "虛接地：腳 3 接地，腳 2 也被推到 0 V\n"
             "I1 = V_in1/10k、I2 = V_in2/10k，彼此完全不干涉", small, co.GREEN_TXT)

    notes(d, T, [
        ("1", co.GREEN_TXT, "第一路：I1 = V_in1 / 10 kΩ",
         "V_in1 峰值 2 V → I1 = 200 µA 峰值。這一路走下半部那顆電阻。\n"
         "注意 I1 只看 V_in1 和自己那顆 10 kΩ，完全不受另一路影響。"),
        ("2", BLUE2_TXT, "第二路：I2 = V_in2 / 10 kΩ",
         "V_in2 峰值 3 V → I2 = 300 µA 峰值，走上半部那顆電阻。\n"
         "兩路之所以互不干擾，是因為第 21 欄被釘在 0 V，像一面牆隔開兩邊。"),
        ("3", (140, 30, 130, 255), "匯合：I1 + I2 全部流進回授電阻",
         "運放輸入不吃電流，所以節點上的電流必須守恆：I_f = I1 + I2 = 500 µA 峰值。\n"
         "V_out = 0 − I_f × 10 k = −5 V 峰值，正好是 −(V_in1 + V_in2)。"),
        ("4", SUP_TXT, "輸出的 500 µA 由電源提供",
         "腳 7 吃 +15 V、腳 4 回 −15 V。訊號產生器只出了各自那一路的電流。"),
    ])


def exp2(canvas, d, T):
    big, small = co.f(30), co.f(27)
    title(d, T, "Lab 5 實驗二 同相加法器：「+」端先分壓，再被放大回來",
          "這個電路的「+」端兩顆電阻之間真的有電流在跑——兩個訊號源互相灌。\n"
          "分壓出來的平均值 (V_in1+V_in2)/2 才是運放看到的輸入，再乘上 1 + R3/R4 = 2。")

    # 「+」端：V_in1（第 40 欄）→ 10k → 第 33 欄 → 10k → V_in2（第 46 欄）
    p1 = [H(40, "j"), H(40, "i"), H(33, "i"), H(33, "f"), H(33, "c"),
          H(33, "b"), H(46, "b"), H(46, "f"), H(46, "j")]
    co.path(d, [T(p) for p in p1], col=co.GREEN, w=13)
    co.badge(d, T((H(36, "i")[0], H(36, "i")[1] - 46)), "1", big, r=27)
    co.badge(d, T((H(40, "b")[0], H(40, "b")[1] + 44)), "2", big, r=27)
    # 「−」端回授支路：輸出 → 10k → 第 21 欄 → 10k → 第 14 欄 → 地
    p2 = [H(28, "f"), H(28, "g"), H(21, "g"), H(21, "i"), H(14, "i"), H(14, "j"), H(14, "-")]
    co.path(d, [T(p) for p in p2], col=BLUE2, w=13)
    co.badge(d, T((H(24, "g")[0], H(24, "g")[1] - 46)), "3", big, r=27)

    supply_path(d, T, "4", big)
    co.label(d, T((H(2, "a")[0], H(2, "c")[1])),
             "運放把腳 2 推到和腳 3 一樣的電位\n"
             "→ 右邊分壓多少，左邊的回授分壓就得配合", small, co.GREEN_TXT)

    notes(d, T, [
        ("1", co.GREEN_TXT, "「+」端不是加法，是分壓",
         "兩顆 10 kΩ 串在 V_in1 與 V_in2 之間，中點電位 = (V_in1 + V_in2)/2。\n"
         "V_in1 = 2 V、V_in2 = 3 V 的瞬間，腳 3 只有 2.5 V——不是 5 V。"),
        ("2", co.GREEN_TXT, "這一串上真的有電流",
         "I = (V_in1 − V_in2) / 20 kΩ，從電位高的那一路流向低的那一路\n"
         "（圖上畫的是 V_in1 > V_in2 的瞬間）。所以這兩路會互相負載，這是它和反相加法器最大的差別。"),
        ("3", BLUE2_TXT, "「−」端那一串負責把 2.5 V 放大回 5 V",
         "回授逼著腳 2 = 腳 3 = 2.5 V，而腳 2 是 V_out 經 10 k／10 k 分壓的中點，\n"
         "所以 V_out = 2 × 2.5 = 5 V。整體 V_out = 2 × (V_in1+V_in2)/2 = V_in1 + V_in2。"),
        ("4", SUP_TXT, "輸出電流一樣由電源供應",
         "若把 R3／R4 換成別的比值，增益就不再是 2，加法關係也就不成立了。"),
    ])


def exp3(canvas, d, T):
    big, small = co.f(30), co.f(27)
    title(d, T, "Lab 5 實驗三 減法器：上下兩路各自成立，輸出是兩者相減",
          "V_in1 走「+」端、經分壓後被同相放大；V_in2 走「−」端、被反相放大。\n"
          "四顆電阻都相等時兩路的權重剛好一樣大、符號相反，結果就是 V_in1 − V_in2。")

    # 「+」端：V_in1（第 40 欄）→ 10k → 第 33 欄 → 10k → 第 46 欄 → 地
    p1 = [H(40, "j"), H(40, "i"), H(33, "i"), H(33, "f"), H(33, "c"),
          H(33, "b"), H(46, "b"), H(46, "f"), H(46, "j"), H(46, "-")]
    co.path(d, [T(p) for p in p1], col=co.GREEN, w=13)
    co.badge(d, T((H(36, "i")[0], H(36, "i")[1] - 46)), "1", big, r=27)
    # 「−」端：V_in2（第 14 欄）→ 10k → 第 21 欄 → 10k → 輸出
    p2 = [H(14, "j"), H(14, "i"), H(21, "i"), H(21, "g"), H(28, "g"), H(28, "f")]
    co.path(d, [T(p) for p in p2], col=BLUE2, w=13)
    co.badge(d, T((H(17, "i")[0], H(17, "i")[1] - 46)), "2", big, r=27)
    co.badge(d, T((H(24, "g")[0], H(24, "g")[1] - 46)), "3", big, r=27)

    supply_path(d, T, "4", big)
    co.label(d, T((H(2, "a")[0], H(2, "c")[1])),
             "腳 3 的電位 = V_in1 / 2（兩顆 10 kΩ 分壓）\n"
             "腳 2 被推到同一個電位，剩下的全交給回授那顆電阻", small, co.GREEN_TXT)

    notes(d, T, [
        ("1", co.GREEN_TXT, "「+」路：先被砍一半",
         "V_in1 經 10 k／10 k 分壓到地，腳 3 只拿到 V_in1 / 2 = 2.5 V（V_in1 = 5 V 時）。\n"
         "這一串上有電流 I = V_in1 / 20 k = 250 µA 峰值，從訊號源流到地。"),
        ("2", BLUE2_TXT, "「−」路：和反相放大器一模一樣",
         "腳 2 被推到 2.5 V，所以 10 kΩ 上的壓降是 V_in2 − 2.5 V。\n"
         "V_in2 = 2 V 的瞬間電流是 (2 − 2.5)/10 k = −50 µA，方向是從腳 2 流向訊號源。"),
        ("3", (140, 30, 130, 255), "回授電阻把兩路的結果湊成差值",
         "V_out = 2.5 − (−50 µA × 10 k) = 2.5 + 0.5 = 3 V = V_in1 − V_in2。\n"
         "同相那一路被砍一半、又被放大兩倍，淨效果剛好是 +1 倍——這就是四顆電阻要相等的理由。"),
        ("4", SUP_TXT, "電阻配對不準，共模就漏出來",
         "四顆電阻只要有一顆差 1%，兩端接同一個訊號時輸出就會有 25 mV 峰值\n"
         "（CMRR 掉到 46 dB），這也是講義問題 1 問的「輸出為什麼不是 0」。"),
    ])


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    for n, painter in ((1, exp1), (2, exp2), (3, exp3)):
        base = os.path.normpath(os.path.join(OUT_DIR, f"lab5-exp{n}-breadboard.png"))
        out = os.path.normpath(os.path.join(OUT_DIR, f"lab5-exp{n}-breadboard-current.png"))
        co.compose(base, out, painter, scale=SCALE, pad=PAD, crop=CROP, bg=(252, 252, 250))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
