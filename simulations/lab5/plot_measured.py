"""Lab 5 結報用的對照圖：LTspice（當天實際條件）的輸出波形，疊上當天示波器量到的波峰／波谷。

條件就是 11/21 真正跑的那一組：Vin1 = 示波器 Gen Out 的 100 Hz 正弦（振幅與偏移照實測），
Vin2 = GPE-3323 CH3 的 +5 V 直流。網表是 lab5-meas-exp{1,2,3}.cir。

用法（在 simulations/lab5）：../lab1/.venv/bin/python plot_measured.py
"""
import os
import sys

import matplotlib
import numpy as np

matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from ltraw import read_raw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week11-ltspice')
os.makedirs(OUT, exist_ok=True)

SURF, INK, INK2, GRID = '#fcfcfb', '#0b0b0b', '#52514e', '#e6e5e1'
S1, S2, S3 = '#2a78d6', '#eb6834', '#1baf7a'
plt.rcParams.update({
    'font.family': ['Heiti TC', 'Arial Unicode MS', 'Arial', 'sans-serif'], 'font.size': 10,
    'axes.edgecolor': GRID, 'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2,
    'axes.titlecolor': INK, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': 1,
    'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': SURF, 'axes.facecolor': SURF, 'legend.frameon': False, 'lines.linewidth': 1.8,
    'axes.unicode_minus': False,
})

CASES = [
    ('lab5-meas-exp1', '實驗一　反相加法器', (-2.65, -6.75)),
    ('lab5-meas-exp2', '實驗二　同相加法器', (7.21, 2.87)),
    ('lab5-meas-exp3', '實驗三　減法器', (0.20, -10.30)),
]

fig, axes = plt.subplots(1, 3, figsize=(12.6, 3.5))
for ax, (name, title, meas) in zip(axes, CASES):
    _, steps = read_raw(os.path.join(HERE, name + '.raw'))
    s = steps[0]
    t = s['time']
    m = t >= t.max() - 0.020                      # 最後兩個週期
    ms = (t[m] - t[m][0]) * 1000.0
    ax.plot(ms, s['V(vin1)'][m], color=S3, lw=1.3, ls='--', label='$V_{in1}$（LTspice）')
    ax.plot(ms, s['V(vo)'][m], color=S1, label='$V_{out}$（LTspice）')
    for i, y in enumerate(meas):
        ax.axhline(y, color=S2, lw=1.2, ls=':', label='實測波峰／波谷' if i == 0 else None)
        ax.annotate(f'{y:+.2f} V', xy=(ms[-1], y), xytext=(-2, 2), textcoords='offset points',
                    ha='right', va='bottom', fontsize=8.5, color=S2)
    ax.set_title(title, fontsize=11, pad=8)
    ax.set_xlabel('時間（ms）')
    ax.set_xlim(0, ms[-1])
axes[0].set_ylabel('電壓（V）')
h, l = axes[0].get_legend_handles_labels()
fig.legend(h, l, loc='lower center', ncol=3, fontsize=9.5, bbox_to_anchor=(0.5, 0.0))
fig.tight_layout(rect=(0, 0.07, 1, 1))
p = os.path.join(OUT, 'lab5-meas-compare.png')
fig.savefig(p, dpi=170)
print('wrote', os.path.abspath(p))
