#!/usr/bin/env python3
"""把 kicad-cli 匯出的 SVG 依內容邊界框裁切（重設 viewBox / width / height）。
用法：svg_crop.py in.svg out.svg [margin_mm]"""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
margin = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
s = open(src, encoding='utf-8').read()
m = re.search(r'width="([\d.]+)mm" height="([\d.]+)mm" viewBox="([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+)"', s)
w_mm, h_mm, vx, vy, vw, vh = map(float, m.groups())
unit = vw / w_mm  # viewBox 單位每 mm
xs, ys = [], []
for d in re.findall(r'\sd="([^"]+)"', s):
    nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
    xs += nums[0::2]; ys += nums[1::2]
for cx, cy in re.findall(r'<circle[^>]*cx="([\d.\-]+)"[^>]*cy="([\d.\-]+)"', s):
    xs.append(float(cx)); ys.append(float(cy))
# 背景矩形會涵蓋整頁，排除掉等於整頁大小的 rect
x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
mg = margin * unit
x0 -= mg; y0 -= mg; x1 += mg; y1 += mg
new = 'width="%.3fmm" height="%.3fmm" viewBox="%.2f %.2f %.2f %.2f"' % ((x1-x0)/unit, (y1-y0)/unit, x0, y0, x1-x0, y1-y0)
s = s[:m.start()] + new + s[m.end():]
# 背景矩形改成覆蓋新的 viewBox
s = re.sub(r'(<rect[^>]*?)x="[\d.\-]+" y="[\d.\-]+" width="[\d.\-]+" height="[\d.\-]+"',
           lambda mm: mm.group(1) + 'x="%.2f" y="%.2f" width="%.2f" height="%.2f"' % (x0, y0, x1-x0, y1-y0), s, count=1)
open(dst, 'w', encoding='utf-8').write(s)
print('cropped to %.1f x %.1f mm' % ((x1-x0)/unit, (y1-y0)/unit))
