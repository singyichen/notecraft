#!/usr/bin/env python3
"""從 App_Lab4_5.pdf 截出第 19、20 頁的「理論」區塊到 public/note-images/ec-week11-handout/。

這三張要連**左半的公式**一起截——筆記的圖說在講「紅字那一行」「括號裡那個 1 + R3/R4」
「兩個括號分別是…權重」，只截右半的電路圖的話讀者看不到在講什麼（2026-11-16 修正）。

第 21／22／23 頁的三張電路圖（lab5-exp*-schematic.png）是手動裁的，不由這支腳本管。

用法：cd simulations/lab5 && ../lab1/.venv/bin/python crop_handout.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.normpath(os.path.join(
    HERE, '..', '..', 'src', 'content', 'notes', '_references',
    '電子學實作系列', '第九週', 'App_Lab4_5.pdf'))
OUT = os.path.normpath(os.path.join(
    HERE, '..', '..', 'public', 'note-images', 'ec-week11-handout'))

DPI = 200

# (輸出檔名, 頁碼, 裁切框 left/top/right/bottom，以 200 dpi 的 2667×1500 為基準)
CROPS = [
    ('lab5-invsum-theory', 19, (185, 295, 2430, 760)),    # 第 19 頁上半：反相加法器
    ('lab5-sum-theory', 19, (185, 835, 2430, 1320)),      # 第 19 頁下半：同相加法器
    ('lab5-sub-theory', 20, (185, 295, 2445, 1180)),      # 第 20 頁：減法器
]


def render(page: int, tmp: str) -> Image.Image:
    prefix = os.path.join(tmp, f'p{page}')
    subprocess.run(['pdftoppm', '-png', '-r', str(DPI), '-f', str(page), '-l', str(page),
                    PDF, prefix], check=True)
    hits = [f for f in os.listdir(tmp) if f.startswith(f'p{page}-') and f.endswith('.png')]
    if len(hits) != 1:
        raise RuntimeError(f'第 {page} 頁算出 {len(hits)} 個檔，預期 1 個')
    return Image.open(os.path.join(tmp, hits[0])).convert('RGB')


def main() -> int:
    if not os.path.exists(PDF):
        print(f'找不到講義：{PDF}', file=sys.stderr)
        return 1
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        cache: dict[int, Image.Image] = {}
        for name, page, box in CROPS:
            if page not in cache:
                cache[page] = render(page, tmp)
            im = cache[page]
            if im.size != (2667, 1500):
                raise RuntimeError(f'第 {page} 頁算出 {im.size}，裁切框是照 (2667, 1500) 訂的')
            path = os.path.join(OUT, f'{name}.png')
            im.crop(box).save(path)
            print('寫出', os.path.relpath(path, os.path.join(HERE, '..', '..')), im.crop(box).size)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
