"""在 Lab 4 的兩張麵包板接線圖上疊出「電流實際流動路徑」。

接線圖只說明「接在哪」，這兩張才說明「為什麼會動」：
運放的輸入端幾乎不吃電流，所以整條訊號電流是從訊號源（或輸出）出發，
走完 R1 與 R2 之後回到地或回到輸出——晶片本身只是把輸出電位推到
「讓腳 2 與腳 3 等電位」的那個值，電流是電源供應的。

座標直接從 `draw_breadboard.py` 的欄列取，不用在像素上量。
輸出到 public/note-images/ec-week10-breadboard/（原名加 -current）。

用法：simulations/lab1/.venv/bin/python simulations/lab4/annotate_current_path.py
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools"))

import current_overlay as co  # noqa: E402
import draw_breadboard as db  # noqa: E402
from opamp_board import bb  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "..", "public", "note-images", "ec-week10-breadboard")

SUP = (235, 140, 45, 235)        # 電源電流
SUP_TXT = (176, 86, 10, 255)
CROP = (82, 404, 1700, 936)
SCALE = 1.25
PAD = (0, 196, 0, 700)

H = bb.hole
CH = db.C_CHIP


def title(d, T, s, sub):
    co.text(d, T((CROP[0] + 16, CROP[1] - 150)), s, co.f(44), co.INK)
    d.multiline_text(T((CROP[0] + 16, CROP[1] - 92)), sub, font=co.f(30),
                     fill=(70, 70, 70, 255), spacing=12)


def notes(d, T, rows, y0=72, step=124):
    """圖下方的逐步說明。rows 是 [(編號, 顏色, 標題, 內文), ...]"""
    big, small = co.f(32), co.f(27)
    x = T((CROP[0] + 40, 0))[0]
    y = T((0, CROP[3]))[1] + y0
    for i, (n, col, head, body) in enumerate(rows):
        yy = y + i * step
        co.badge(d, (x, yy), n, co.f(30), r=27)
        co.text(d, (x + 52, yy - 20), head, big, col)
        d.multiline_text((x + 52, yy + 24), body, font=small,
                         fill=(60, 60, 60, 255), spacing=9)


def exp1(canvas, d, T):
    big, small = co.f(30), co.f(27)
    title(d, T, "Lab 4 實驗一 非反相放大器：電流實際怎麼流",
          "輸入端不吃電流，所以「R1 與 R2 那一串」是一條獨立的分壓支路；\n"
          "晶片做的事只是把輸出推到讓腳 2 的電位等於腳 3 的電位（虛短路）。")

    # ① 訊號進腳 3：幾乎沒有電流
    co.path(d, [T(H(33, "j")), T(H(33, "f")), T(H(33, "c")), T(H(28, "c")), T(H(28, "e"))],
            col=co.GREEN_DASH, w=11, dash=True, arrows=False)
    co.blocker(d, T(H(31, "c")), size=26)
    co.badge(d, T((H(33, "j")[0] + 54, H(33, "j")[1] - 34)), "1", big, r=27)

    # ② 回授支路：輸出 → R2 → 「−」節點 → R1 → 地
    pts = [H(28, "f"), H(28, "g"), H(21, "g"), H(21, "i"), H(14, "i"), H(14, "j"), H(14, "-")]
    co.path(d, [T(p) for p in pts], col=co.GREEN, w=13)
    co.badge(d, T((H(24, "g")[0], H(24, "g")[1] - 44)), "2", big, r=27)
    co.badge(d, T((H(17, "i")[0], H(17, "i")[1] - 44)), "3", big, r=27)

    # ③ 電源電流
    co.path(d, [T(H(6, "+")), T(H(27, "+")), T(H(27, "j")), T(H(27, "f"))], col=SUP, w=11)
    co.path(d, [T(H(29, "e")), T(H(29, "a")), T(H(29, "-b")), T(H(57, "-b"))], col=SUP, w=11)
    co.badge(d, T((H(27, "+")[0] - 70, H(27, "+")[1] - 6)), "4", big, r=27)

    # 虛短路標記
    co.label(d, T((H(36, "d")[0], H(36, "c")[1])),
             "虛短路：腳 2 的電位被回授推到和腳 3 一樣\n"
             "→ R1 上的壓降就是 V_in，I = V_in / R1", small, co.GREEN_TXT)

    notes(d, T, [
        ("1", co.GREEN_TXT, "訊號進腳 3，但幾乎不出電流",
         "uA741 的輸入偏壓電流典型 80 nA，比下面那條支路的 40 µA 小 500 倍。\n"
         "所以訊號源看到的負載幾乎是無限大——這就是「非反相組態輸入阻抗很高」的意思。"),
        ("2", co.GREEN_TXT, "真正的電流在 R2 → R1 這一串上",
         "輸出端把 V_out 加在「R2 + R1」兩顆串聯的電阻上，電流 I = V_out / (R1+R2)。\n"
         "V_out 峰值 12 V → I = 12 / 300 k = 40 µA 峰值。這股電流不經過訊號源。"),
        ("3", co.GREEN_TXT, "R1 上的壓降必須等於 V_in",
         "I 流過 R1 產生 40 µA × 100 k = 4 V，剛好等於 V_in 的峰值——\n"
         "因為回授逼著腳 2 等於腳 3。把這句話反過來寫就是 V_out = (1 + R2/R1)·V_in = 3 V_in。"),
        ("4", SUP_TXT, "輸出的電流是電源給的，不是訊號源給的",
         "腳 7 從 +15 V 軌吃電流、腳 4 回到 −15 V 軌；輸出端推出去的電流從這裡來。\n"
         "所以電源的 0 V、訊號產生器的地、示波器的地夾一定要是同一點，否則回路不完整。"),
    ])


def exp2(canvas, d, T):
    big, small = co.f(30), co.f(27)
    title(d, T, "Lab 4 實驗二 反相放大器：電流實際怎麼流",
          "這次是一股電流從頭走到尾：訊號源 → R1 → 虛接地 → R2 → 輸出。\n"
          "中途沒有任何一條岔路進到晶片裡，所以 R1 與 R2 上的電流完全相同。")

    pts = [H(14, "j"), H(14, "i"), H(21, "i"), H(21, "g"), H(28, "g"), H(28, "f")]
    co.path(d, [T(p) for p in pts], col=co.GREEN, w=13)
    co.badge(d, T((H(17, "i")[0], H(17, "i")[1] - 44)), "1", big, r=27)
    co.badge(d, T((H(21, "f")[0] - 10, H(21, "f")[1] + 30)), "2", big, r=27)
    co.badge(d, T((H(24, "g")[0], H(24, "g")[1] - 44)), "3", big, r=27)

    # 腳 3 接地、不吃電流
    co.path(d, [T(H(33, "j")), T(H(33, "f")), T(H(33, "c")), T(H(28, "c")), T(H(28, "e"))],
            col=co.GREEN_DASH, w=11, dash=True, arrows=False)
    co.blocker(d, T(H(31, "c")), size=26)
    co.badge(d, T((H(33, "j")[0] + 54, H(33, "j")[1] - 34)), "4", big, r=27)

    co.path(d, [T(H(6, "+")), T(H(27, "+")), T(H(27, "j")), T(H(27, "f"))], col=SUP, w=11)
    co.path(d, [T(H(29, "e")), T(H(29, "a")), T(H(29, "-b")), T(H(57, "-b"))], col=SUP, w=11)
    co.badge(d, T((H(27, "+")[0] - 70, H(27, "+")[1] - 6)), "5", big, r=27)

    co.label(d, T((H(36, "d")[0], H(36, "c")[1])),
             "虛接地：腳 3 接地，所以腳 2 也被推到 0 V\n"
             "→ R1 的壓降就是 V_in，R2 的壓降就是 −V_out", small, co.GREEN_TXT)

    notes(d, T, [
        ("1", co.GREEN_TXT, "電流由訊號源決定：I = V_in / R1",
         "腳 2 被回授釘在 0 V，所以 R1 兩端的電壓就是 V_in 本身。\n"
         "V_in 峰值 4 V → I = 4 / 100 k = 40 µA 峰值。訊號源看到的負載就是這顆 R1。"),
        ("2", co.GREEN_TXT, "到了第 21 欄，電流沒有岔路可走",
         "往晶片走的那條路輸入阻抗太高（偏壓電流只有 80 nA），等於斷路；\n"
         "剩下唯一的出口是 R2。這就是「反相組態的輸入電流全部流進回授電阻」。"),
        ("3", co.GREEN_TXT, "同一股電流流過 R2，產生輸出電壓",
         "V_out = 0 − I·R2 = −40 µA × 200 k = −8 V 峰值，所以 A_v = −R2/R1 = −2。\n"
         "負號不是算出來的符號遊戲：電流從虛接地點流向輸出，輸出端必須比 0 V 低。"),
        ("4", co.GREEN_TXT, "腳 3 那條線只負責定電位，不走電流",
         "它把非反相端固定在 0 V。如果忘了接地，腳 3 會浮動，輸出直接貼到某一條電源軌。"),
        ("5", SUP_TXT, "輸出的電流一樣由電源供應",
         "和實驗一完全相同：腳 7 吃 +15 V、腳 4 回 −15 V。訊號源只出了 40 µA。"),
    ])


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    for n, painter in ((1, exp1), (2, exp2)):
        base = os.path.normpath(os.path.join(OUT_DIR, f"lab4-exp{n}-breadboard.png"))
        out = os.path.normpath(os.path.join(OUT_DIR, f"lab4-exp{n}-breadboard-current.png"))
        co.compose(base, out, painter, scale=SCALE, pad=PAD, crop=CROP, bg=(252, 252, 250))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
