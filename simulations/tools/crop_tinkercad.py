#!/usr/bin/env python3
"""把 Tinkercad 的整頁截圖裁成筆記用的圖：去掉右側元件面板與上方工具列的空白。

來源是 `.claude/skills/lab-workflow/scripts/tinkercad/work/out/`（daemon 的輸出目錄，
不進版控），輸出到 `public/note-images/ec-week<N>-tinkercad/`。

裁切方式不是寫死座標，而是找出「非背景」像素的範圍再往外留白——Tinkercad 的畫布
會隨設計大小縮放，寫死一定會切到東西。右側元件面板固定從 x≈1165 開始，先切掉。

用法：simulations/lab1/.venv/bin/python simulations/tools/crop_tinkercad.py
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(
    HERE, '..', '..', '.claude', 'skills', 'lab-workflow', 'scripts', 'tinkercad', 'work', 'out'))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'note-images'))

PANEL_X = 1148          # 右側元件面板的左緣（連收合箭頭一起切掉）
TOP_Y = 100             # 工具列以下才是畫布
PAD = 16

JOBS = [
    ('lab4-exp1-bb-fit.png', 'ec-week10-tinkercad/lab4-exp1-tinkercad.png'),
    ('lab4-exp1-sch-fit.png', 'ec-week10-tinkercad/lab4-exp1-schematic.png'),
    ('lab4-exp2-bb.png', 'ec-week10-tinkercad/lab4-exp2-tinkercad.png'),
    ('lab4-exp2-sch.png', 'ec-week10-tinkercad/lab4-exp2-schematic.png'),
    ('lab5-exp1-bb.png', 'ec-week11-tinkercad/lab5-exp1-tinkercad.png'),
    ('lab5-exp1-sch.png', 'ec-week11-tinkercad/lab5-exp1-schematic.png'),
    ('lab5-exp2-bb.png', 'ec-week11-tinkercad/lab5-exp2-tinkercad.png'),
    ('lab5-exp2-sch.png', 'ec-week11-tinkercad/lab5-exp2-schematic.png'),
    ('lab5-exp3-bb.png', 'ec-week11-tinkercad/lab5-exp3-tinkercad.png'),
    ('lab5-exp3-sch.png', 'ec-week11-tinkercad/lab5-exp3-schematic.png'),
]


def crop_one(src: str, dst: str, schematic: bool = False) -> tuple[int, int]:
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(int)
    work = a[TOP_Y:, :PANEL_X]
    if schematic:
        # 線路圖視圖的「縮放至符合」是把整張圖框塞滿，電路本身只佔中間一小塊。
        # 用綠色的接線當錨點抓電路的範圍，再往外放寬，圖框與標題欄就不會進來。
        g = (work[:, :, 1] - work[:, :, 0] > 25) & (work[:, :, 1] - work[:, :, 2] > 25)
        ys, xs = np.nonzero(g)
        if len(ys):
            m = 95
            return _save(im, max(0, xs.min() - m), min(PANEL_X, xs.max() + m),
                         max(0, ys.min() - m) + TOP_Y, min(a.shape[0], ys.max() + m + TOP_Y), dst)
    bg = np.median(work.reshape(-1, 3), axis=0)
    # 和背景色差超過 10 的就算「有東西」
    mask = (np.abs(work - bg).sum(axis=2) > 10)
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        raise SystemExit(f'{src}：整張都是背景色，裁不出東西')
    x0 = max(0, xs.min() - PAD)
    x1 = min(PANEL_X, xs.max() + PAD)
    y0 = max(0, ys.min() - PAD) + TOP_Y
    y1 = min(a.shape[0], ys.max() + PAD + TOP_Y)
    return _save(im, x0, x1, y0, y1, dst)


def _save(im, x0, x1, y0, y1, dst) -> tuple[int, int]:
    out = im.crop((int(x0), int(y0), int(x1), int(y1)))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)
    return out.size


def main() -> int:
    if not os.path.isdir(SRC):
        print(f'找不到 {SRC}（daemon 的輸出目錄）', file=sys.stderr)
        return 1
    for name, rel in JOBS:
        src = os.path.join(SRC, name)
        if not os.path.exists(src):
            print(f'跳過（沒有這張）：{name}', file=sys.stderr)
            continue
        w, h = crop_one(src, os.path.join(ROOT, rel), schematic=rel.endswith('-schematic.png'))
        print(f'寫出 {rel}  {w}x{h}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
