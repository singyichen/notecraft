"""在既有的接線圖／原理圖上疊畫「電流實際流動路徑」的共用繪圖原語。

各週的 `simulations/<lab>/annotate_*.py` 只放座標與標籤文字，畫法一律從這裡取，
輸出才會長得一樣。用法與畫法規範見
`.claude/skills/lab-workflow/references/current-path-overlay.md`。

    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
    from current_overlay import compose, path, badge, label, f, GREEN, BLUE

座標一律用「原圖 1 倍尺寸」定義，`compose()` 負責裁切、放大、加留白，並把 T() 交給
painter 換算成畫布座標——調位置只要改原圖座標，不必管輸出解析度。
"""
from __future__ import annotations

import math

from PIL import Image, ImageDraw, ImageFont

# macOS 沒有 Noto Sans CJK Bold，用 Heiti TC Medium（字重接近 semibold）
FONT_CJK = "/Library/Fonts/STHeiti Medium.ttc"

GREEN = (0, 170, 90, 235)        # 電流路徑（實線：原圖上畫得出來的那段）
GREEN_DASH = (0, 165, 85, 215)   # 電流路徑（虛線：原圖省略掉、要補畫的那段）
GREEN_TXT = (0, 120, 60, 255)
RED = (220, 0, 0, 255)           # 方向箭頭、步驟編號
BLUE = (40, 110, 230, 230)       # 電壓表量測線（不分流，一律虛線）
BLUE_TXT = (30, 80, 200, 255)
INK = (20, 20, 20, 255)
BOX_FILL = (255, 255, 255, 228)
BOX_LINE = (120, 120, 120, 255)


def f(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_CJK, size)


def text(d, xy, s, font, fill, anchor=None, bold=False):
    """Heiti TC 沒有粗體字重。筆畫簡單的數字補一圈 stroke 加重；
    中文字補 stroke 會讓密集筆畫糊成一團，改用大一級的字級。"""
    d.text(xy, s, font=font, fill=fill, anchor=anchor,
           stroke_width=1 if bold else 0, stroke_fill=fill)


def arrow(d, a, b, size=26):
    """在 a→b 這段的中點畫一個指向前進方向的紅色三角形。"""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    d.polygon(
        [
            (mx + size * math.cos(ang), my + size * math.sin(ang)),
            (mx + size * math.cos(ang + 2.5), my + size * math.sin(ang + 2.5)),
            (mx + size * math.cos(ang - 2.5), my + size * math.sin(ang - 2.5)),
        ],
        fill=RED,
    )


def path(d, pts, col=GREEN, w=13, dash=False, period=26,
         arrows=True, arrow_min=90, arrow_size=26):
    """折線。每一段長度超過 arrow_min 就在中點補一個方向箭頭。

    想讓某一段多一個箭頭，就在那段中間多插一個轉折點把它切成兩段
    （例如把電流表放在回程正中間時，就用該點把回程切兩半）。
    """
    for a, b in zip(pts, pts[1:]):
        if dash:
            L = math.dist(a, b)
            n = max(1, int(L // period))
            for i in range(0, n, 2):
                t0, t1 = i / n, min(1.0, (i + 1) / n)
                d.line(
                    [
                        (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0),
                        (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1),
                    ],
                    fill=col, width=w,
                )
        else:
            d.line([a, b], fill=col, width=w)
        if arrows and math.dist(a, b) > arrow_min:
            arrow(d, a, b, arrow_size)
    if not dash:  # 轉角補圓點，避免直角接縫露出缺口
        r = w / 2 - 0.5
        for x, y in pts[1:-1]:
            d.ellipse((x - r, y - r, x + r, y + r), fill=col)


def badge(d, xy, t, font, r=22):
    """紅底白字的步驟編號。"""
    x, y = xy
    d.ellipse([x - r, y - r, x + r, y + r], fill=RED)
    text(d, (x, y - 1), t, font, (255, 255, 255, 255), anchor="mm", bold=True)


def meter(d, xy, sym, font, col, r=48):
    """原圖沒畫出來的儀器符號：白底圓圈 + Ⓐ／Ⓥ。"""
    x, y = xy
    d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 255), outline=col, width=7)
    text(d, (x, y - 2), sym, font, col, anchor="mm", bold=True)


def blocker(d, xy, size=34, col=RED):
    """紅色 ✕：標「這裡被擋住，電流過不去」（逆偏的二極體、沒導通的那半週）。
    先描一圈白邊，壓在深色元件（例如二極體本體）上才看得見。"""
    x, y = xy
    for w, c in ((size * 0.55, (255, 255, 255, 235)), (size * 0.34, col)):
        for dx, dy in ((1, 1), (1, -1)):
            d.line([(x - size * dx, y - size * dy), (x + size * dx, y + size * dy)],
                   fill=c, width=int(w))


def label(d, xy, s, font, col=INK, align="left"):
    """白底灰框標籤，`\\n` 換行。xy 是文字左上角；
    align='right' 時 xy[0] 當右緣，align='center' 時當中心（標題用這個）。"""
    x, y = xy
    if align == "right":
        x -= d.multiline_textbbox((0, 0), s, font=font)[2]
    elif align == "center":
        x -= d.multiline_textbbox((0, 0), s, font=font)[2] // 2
    b = d.multiline_textbbox((x, y), s, font=font)
    d.rectangle([b[0] - 10, b[1] - 8, b[2] + 10, b[3] + 8], fill=BOX_FILL, outline=BOX_LINE)
    d.multiline_text((x, y), s, font=font, fill=col)
    return b


def compose(base_path, out_path, painter, scale=1, pad=(0, 0, 0, 0), crop=None, bg=None):
    """讀原圖 →（裁切）→ 放大 → 加留白 → 交給 painter 疊圖 → 存檔。

    painter(canvas, draw, T)：T(原圖座標) 回傳畫布座標。
    pad 是 (左, 上, 右, 下)；留白的底色預設取原圖左上角的顏色，接得沒有縫。
    """
    src = Image.open(base_path).convert("RGB")
    x0, y0 = (crop[0], crop[1]) if crop else (0, 0)
    if crop:
        src = src.crop(crop)
    w, h = src.size
    img = src.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    ml, mt, mr, mb = pad
    canvas = Image.new("RGB", (img.size[0] + ml + mr, img.size[1] + mt + mb),
                       bg or src.getpixel((1, 1)))
    canvas.paste(img, (ml, mt))

    def T(p):
        return (ml + (p[0] - x0) * scale, mt + (p[1] - y0) * scale)

    canvas = canvas.convert("RGBA")
    d = ImageDraw.Draw(canvas, "RGBA")
    painter(canvas, d, T)
    canvas.convert("RGB").save(out_path)
    print(f"寫出 {out_path}  {canvas.size[0]}x{canvas.size[1]}")
