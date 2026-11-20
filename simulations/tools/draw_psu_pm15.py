"""畫一張「一台 GPE-3323 做出 ±15 V」的說明圖。

Lab 4、Lab 5 的運放電路都要雙電源。教室那台是三組輸出的 GPE-3323，
按面板的 Series 鍵切到串聯追蹤（series tracking）之後，機器內部會把
CH1− 與 CH2+ 接起來（顯示器左下角出現 SER），所以只要三條線：

  CH1+ → 麵包板的 +15 V 軌 → 腳 7
  CH1− → 0 V 共地軌（這一點就是兩個電源的交界）
  CH2− → −15 V 軌 → 腳 4

繪圖原語沿用 lab2 的 draw_real_breadboard（配色、字型、wire/plug/callout），
但這張圖不畫整塊麵包板，自己開一張畫布。

輸出：public/note-images/ec-gear/gpe3323-pm15v.png
用法：simulations/lab1/.venv/bin/python simulations/tools/draw_psu_pm15.py
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "lab2"))

import draw_real_breadboard as bb  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "public", "note-images", "ec-gear",
                   "gpe3323-pm15v.png")

W, H = 1500, 820
RED = (200, 60, 60)
BLK = (50, 50, 50)
GREEN = (118, 238, 168)
PANEL_BG = (236, 236, 233)

PX, PY, PW, PH = 60, 150, 640, 320       # 電源面板
LANE = (556, 590, 624)                    # 三條線往下走的高度
X_TURN = (746, 780, 814)                  # 各自轉上去的垂直走廊
RAIL_X0 = 852
RAIL_X1 = {"+15": 1440, "0": 1140, "-15": 1440}
RAIL_Y = {"+15": 236, "0": 300, "-15": 560}
CHIP_X, CHIP_Y, CHIP_W, CHIP_H = 1120, 384, 232, 120


def display(d, x, y, w, h, volts, amps):
    d.rounded_rectangle([x, y, x + w, y + h], radius=6,
                        fill=(26, 34, 30), outline=(92, 92, 92))
    bb.text(d, (x + 14, y + h / 2), volts, size=23, fill=GREEN, anchor="lm")
    bb.text(d, (x + w - 14, y + h / 2), amps, size=17, fill=(96, 170, 120),
            anchor="rm")


def key(d, x, y, label, active=False):
    w, h = 118, 40
    d.rounded_rectangle([x, y, x + w, y + h], radius=6,
                        fill=(250, 250, 248) if active else (214, 214, 210),
                        outline=bb.WARN if active else (170, 170, 166),
                        width=3 if active else 1)
    bb.text(d, (x + w / 2, y + h / 2), label, size=15,
            fill=bb.WARN if active else bb.INK2, anchor="mm")
    return x + w


def panel(d):
    d.rounded_rectangle([PX, PY, PX + PW, PY + PH], radius=12,
                        fill=PANEL_BG, outline=(176, 176, 172), width=2)
    bb.text(d, (PX + 20, PY + 16), "直流電源 GW Instek GPE-3323", size=17,
            fill=bb.INK)

    # SER 指示
    d.rounded_rectangle([PX + PW - 104, PY + 14, PX + PW - 20, PY + 44],
                        radius=5, fill=(26, 34, 30), outline=(92, 92, 92))
    bb.text(d, (PX + PW - 62, PY + 29), "SER", size=17, fill=GREEN, anchor="mm")

    display(d, PX + 20, PY + 56, 300, 46, "15.000 V", "0.000 A")
    bb.text(d, (PX + 334, PY + 79), "CH1（Master，電壓由這顆旋鈕定）", size=14,
            fill=bb.INK2, anchor="lm")
    display(d, PX + 20, PY + 112, 300, 46, "15.000 V", "0.000 A")
    bb.text(d, (PX + 334, PY + 135), "CH2（Slave，自動跟著 CH1）", size=14,
            fill=bb.INK2, anchor="lm")

    kx = PX + 20
    for lab, on in (("Independent", False), ("Series", True), ("Parallel", False)):
        kx = key(d, kx, PY + 176, lab, on) + 14
    # 端子（紅黑紅黑）
    posts = {}
    order = (("ch1+", "CH1+", RED), ("ch1-", "CH1−", BLK),
             ("ch2+", "CH2+", RED), ("ch2-", "CH2−", BLK))
    for i, (k, lab, col) in enumerate(order):
        cx = PX + 92 + i * 150
        cy = PY + PH
        d.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], fill=col,
                  outline=(30, 30, 30), width=2)
        bb.text(d, (cx, cy - 30), lab, size=15, fill=bb.INK, anchor="mm")
        posts[k] = (cx, cy + 10)

    # CH1− ←→ CH2+ 的內部連接（虛線，畫在面板裡）
    ax, ay = posts["ch1-"]
    bx, by = posts["ch2+"]
    yy = PY + PH - 46
    for seg in range(int((bx - ax) // 16)):
        x0 = ax + seg * 16
        d.line([(x0, yy), (x0 + 9, yy)], fill=(120, 120, 124), width=3)
    d.line([(ax, yy), (ax, ay - 14)], fill=(120, 120, 124), width=3)
    d.line([(bx, yy), (bx, by - 14)], fill=(120, 120, 124), width=3)
    bb.badge(d, ((ax + bx) / 2, yy - 20), "機器內部已接，不必自己拉跳線",
             size=14, fill=bb.INK2, anchor="mm")
    return posts


def rail(d, kind, label, color, note):
    y, x1 = RAIL_Y[kind], RAIL_X1[kind]
    d.rounded_rectangle([RAIL_X0, y - 15, x1, y + 15], radius=8,
                        fill=(252, 252, 250), outline=color, width=3)
    bb.text(d, (RAIL_X0 + 18, y), label, size=17, fill=color, anchor="lm")
    bb.text(d, (x1 - 18, y), note, size=14, fill=bb.INK2, anchor="rm")


def dip8(d):
    x, y, w, h = CHIP_X, CHIP_Y, CHIP_W, CHIP_H
    pins = {}
    for i in range(4):                      # 下排：腳 1、2、3、4
        px = x + 34 + i * 54
        d.rectangle([px - 9, y + h, px + 9, y + h + 20], fill=(168, 168, 172))
        pins[i + 1] = (px, y + h + 20)
    for i in range(4):                      # 上排：腳 8、7、6、5
        px = x + 34 + i * 54
        d.rectangle([px - 9, y - 20, px + 9, y], fill=(168, 168, 172))
        pins[8 - i] = (px, y - 20)
    d.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=(58, 58, 62),
                        outline=(96, 96, 100), width=2)
    d.pieslice([x - 16, y + h / 2 - 16, x + 16, y + h / 2 + 16], 270, 90,
               fill=bb.BG, outline=(96, 96, 100), width=2)
    bb.text(d, (x + w / 2 + 10, y + h / 2), "uA741", size=17,
            fill=(235, 235, 232), anchor="mm")
    bb.text(d, (x - 26, y + h / 2), "缺口朝左", size=14,
            fill=bb.INK2, anchor="rm")
    for n, (px, py) in pins.items():
        off = -14 if py < y else 14
        bb.text(d, (px, py + off), str(n), size=13, fill=bb.INK2, anchor="mm")
    return pins


def main():
    img = Image.new("RGB", (W, H), bb.BG)
    d = ImageDraw.Draw(img)

    bb.title(d, "一台 GPE-3323 做出 ±15 V",
             "按 Series 鍵切到串聯追蹤，機器內部把 CH1− 與 CH2+ 接起來——只要三條線，"
             "不必自己在端子之間拉跳線。\n"
             "CH1− 那一點就是 0 V：往上看是 +15 V，往下看是 −15 V。")

    posts = panel(d)
    rail(d, "+15", "+15 V 軌", RED, "麵包板上方「＋」軌")
    rail(d, "0", "0 V 共地軌", (60, 110, 200), "")
    bb.text(d, (RAIL_X0 + 18, RAIL_Y["0"] + 38),
            "腳 3、訊號源、示波器的地都回這一條", size=13,
            fill=bb.INK2, anchor="lm")
    rail(d, "-15", "−15 V 軌", BLK, "麵包板下方「−」軌")
    pins = dip8(d)

    routes = (("ch1+", "+15", RED, LANE[0], X_TURN[0]),
              ("ch1-", "0", BLK, LANE[1], X_TURN[1]),
              ("ch2-", "-15", BLK, LANE[2], X_TURN[2]))
    for k, kind, color, lane, turn in routes:
        px, py = posts[k]
        ry = RAIL_Y[kind]
        bb.wire(d, [(px, py - 10), (px, lane), (turn, lane),
                    (turn, ry), (RAIL_X0 + 6, ry)], color, width=7)
        bb.plug(d, (px, py - 10))

    # 電源軌 → 腳 7（上方＋軌往下）、−15 V 軌 → 腳 4（下方軌往上）
    p7x, p7y = pins[7]
    bb.wire(d, [(p7x, RAIL_Y["+15"] + 15), (p7x, p7y)], RED, width=6)
    p4x, p4y = pins[4]
    bb.wire(d, [(p4x, RAIL_Y["-15"] - 15), (p4x, p4y)], BLK, width=6)
    bb.badge(d, (p7x + 16, (RAIL_Y["+15"] + p7y) / 2), "腳 7 = V+",
             size=14, fill=bb.INK, anchor="lm")
    bb.badge(d, (p4x + 48, p4y - 42), "腳 4 = V−",
             size=14, fill=bb.INK, anchor="lm")

    bb.callout(d, (70, 684),
               "通電前：兩個通道的電流限制都轉到 0.1 A 左右。\n"
               "通電後先用電表量腳 7、腳 4 對 0 V 軌，讀到 +15／−15 才接訊號。\n"
               "改接線、換模式前一律先按 Output 關輸出。", size=15, color=bb.WARN)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT)
    missing = bb.check_glyphs()
    print("寫出", os.path.relpath(OUT, os.path.join(HERE, "..", "..")))
    if missing:
        print("字型缺字：", "".join(missing))


if __name__ == "__main__":
    main()
