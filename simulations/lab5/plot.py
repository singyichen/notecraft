"""Lab 5 LTspice 結果出圖，輸出到 public/note-images/ec-week11-ltspice/。

用法（在 simulations/lab5 目錄）：../lab1/.venv/bin/python plot.py
需要先用 ../tools/run-lt.sh lab5-*.cir 產生 .raw。
除了出圖，也把筆記預報表要用的數字印到 stdout。
"""
import json
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
S1, S2, S3, S4 = '#2a78d6', '#eb6834', '#1baf7a', '#8b5cf6'
plt.rcParams.update({
    'font.family': ['PingFang TC', 'Heiti TC', 'Helvetica Neue', 'Arial', 'sans-serif'], 'font.size': 11,
    'axes.edgecolor': GRID, 'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2, 'axes.titlecolor': INK,
    'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': 1, 'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': SURF, 'axes.facecolor': SURF, 'legend.frameon': False, 'lines.linewidth': 2,
    'lines.solid_joinstyle': 'round', 'lines.solid_capstyle': 'round', 'axes.unicode_minus': False,
})


def fig(w=10, h=4.2, ncols=1):
    f, axs = plt.subplots(1, ncols, figsize=(w, h), dpi=160)
    return f, (axs if ncols > 1 else [axs])


def save(f, name):
    f.tight_layout()
    f.savefig(f'{OUT}/{name}.png', facecolor=SURF)
    plt.close(f)


def win(name, t0=1e-3, step=0):
    s = read_raw(os.path.join(HERE, name))[1][step]
    m = s['time'] >= t0
    return {k: v[m] for k, v in s.items()}


def pk(s, k):
    return float(np.ptp(s[k])) / 2


pred = {}

# ── 三個實驗的波形（三欄）────────────────────────────────────────────────────
specs = [
    ('lab5-exp1-invsum-tran.raw', '實驗一 反相加法器\n$V_{out}=-(V_{in1}+V_{in2})$', S2, 'exp1'),
    ('lab5-exp2-sum-tran.raw', '實驗二 同相加法器\n$V_{out}=V_{in1}+V_{in2}$', S1, 'exp2'),
    ('lab5-exp3-sub-tran.raw', '實驗三 減法器\n$V_{out}=V_{in1}-V_{in2}$', S3, 'exp3'),
]
f, axs = fig(13.8, 4.4, 3)
for axis, (name, title, col, key) in zip(axs, specs):
    s = win(name)
    t = (s['time'] - s['time'][0]) * 1e3
    axis.plot(t, s['V(vin1)'], color=INK2, lw=1.6, ls='--', label='$V_{in1}$')
    axis.plot(t, s['V(vin2)'], color=S4, lw=1.6, ls=':', label='$V_{in2}$')
    axis.plot(t, s['V(vo)'], color=col, label='$V_{out}$')
    axis.set_xlim(0, 2), axis.set_ylim(-8.4, 8.4)
    axis.set_xlabel('時間（ms）'), axis.set_title(title)
    axis.legend(loc='lower center', ncol=3, fontsize=9.5)
    pred[key] = dict(vin1=pk(s, 'V(vin1)'), vin2=pk(s, 'V(vin2)'), vo=pk(s, 'V(vo)'),
                     vo_pp=float(np.ptp(s['V(vo)'])))
axs[0].set_ylabel('電壓（V）')
save(f, 'lab5-waveforms')

# ── 講義問題 1：共模輸入下電阻誤差怎麼漏出來 ────────────────────────────────
tols = [0, 0.5, 1, 5]
f, (a, b) = fig(11.6, 4.3, 2)
cm = []
for k, (tol, col) in enumerate(zip(tols, [INK2, S1, S3, S2])):
    s = win('lab5-exp3-cm.raw', step=k)
    t = (s['time'] - s['time'][0]) * 1e3
    a.plot(t, s['V(vo)'] * 1e3, color=col, label='$R_4$ 誤差 %.1f%%' % tol)
    amp = pk(s, 'V(vo)')
    cm.append((tol, amp, 5.0 / amp if amp > 0 else float('inf')))
a.set_xlim(0, 2), a.set_ylim(-175, 195)
a.set_xlabel('時間（ms）'), a.set_ylabel('輸出電壓（mV）')
a.set_title('兩端接同一個 5 V 峰值訊號，理想輸出應為 0')
a.legend(loc='upper right', ncol=2, fontsize=9.5)
x = [t for t, _, _ in cm[1:]]
b.plot(x, [20 * np.log10(r) for _, _, r in cm[1:]], 'o-', color=S2)
for tol, amp, r in cm[1:]:
    dx, ha = (-8, 'right') if tol >= 5 else (8, 'left')
    b.annotate('%.0f dB' % (20 * np.log10(r)), (tol, 20 * np.log10(r)),
               textcoords='offset points', xytext=(dx, 8), color=INK2, fontsize=9.5, ha=ha)
b.set_xlabel('單一顆電阻的誤差（%）'), b.set_ylabel('共模拒斥比 CMRR（dB）')
b.set_title('CMRR 由電阻配對決定，不是由 op amp 決定')
b.set_ylim(25, 60), b.set_xlim(0, 5.6)
b.text(0.5, 27, 'uA741 自己的 CMRR 規格是 90 dB；\n1% 電阻就把整體拉到 46 dB',
       color=INK2, fontsize=9.5)
save(f, 'lab5-cmrr')
pred['cm'] = cm

# ── 講義問題 2 與 Bonus ──────────────────────────────────────────────────────
f, (a, b) = fig(11.6, 4.3, 2)
s = win('lab5-q2-weights.raw')
t = (s['time'] - s['time'][0]) * 1e3
a.plot(t, s['V(vin1)'], color=INK2, lw=1.6, ls='--', label='$V_{in1}$ 2 V 峰值')
a.plot(t, s['V(vin2)'], color=S4, lw=1.6, ls=':', label='$V_{in2}$ 3 V 峰值')
a.plot(t, s['V(vo)'], color=S2, label='$V_{out}$')
a.set_xlim(0, 2), a.set_ylim(-10, 10), a.set_xlabel('時間（ms）'), a.set_ylabel('電壓（V）')
a.set_title('問題 2：權重 3 與 0.5（$R_f$=30k、$R_1$=10k、$R_2$=60k）')
a.legend(loc='lower center', ncol=3, fontsize=9.5)
pred['q2'] = dict(vin1=pk(s, 'V(vin1)'), vin2=pk(s, 'V(vin2)'), vo=pk(s, 'V(vo)'))

s = win('lab5-bonus-mono.raw')
t = (s['time'] - s['time'][0]) * 1e3
b.plot(t, s['V(vl)'], color=INK2, lw=1.6, ls='--', label='L 聲道 4 V 峰值')
b.plot(t, s['V(vr)'], color=S4, lw=1.6, ls=':', label='R 聲道 3 V 峰值（差 90°）')
b.plot(t, s['V(vmono)'], color=S3, label='單聲道輸出')
b.set_xlim(0, 2), b.set_ylim(-6, 6), b.set_xlabel('時間（ms）')
b.set_title('Bonus：$a=b=0.5$，輸出 2.5 V 峰值不超過任一路輸入')
b.legend(loc='lower center', ncol=3, fontsize=9.5)
pred['bonus'] = dict(l=pk(s, 'V(vl)'), r=pk(s, 'V(vr)'), stage1=pk(s, 'V(vm1)'), mono=pk(s, 'V(vmono)'))
save(f, 'lab5-question2-bonus')

# ── 偏移 ────────────────────────────────────────────────────────────────────
s = read_raw(os.path.join(HERE, 'lab5-offset.raw'))[1][0]
pred['offset'] = {k: float(s['V(vo%d)' % k][0]) * 1e3 for k in (1, 2, 3)}

print('── Lab 5 LTspice 預報值（uA741 Boyle macromodel，±15 V，1 kHz）─────────')
for k, t in [('exp1', '實驗一 反相加法器'), ('exp2', '實驗二 同相加法器'), ('exp3', '實驗三 減法器')]:
    p = pred[k]
    print('%s：Vin1 %.3f Vpk、Vin2 %.3f Vpk → Vout %.4f Vpk（%.4f Vpp）'
          % (t, p['vin1'], p['vin2'], p['vo'], p['vo_pp']))
print('問題 1 共模：', ' '.join('誤差%.1f%%→%.1f mVpk / CMRR %.0f dB' % (t, a * 1e3, 20 * np.log10(r))
                                for t, a, r in pred['cm']))
p = pred['q2']
print('問題 2：Vout %.4f Vpk（理論 3×%.1f + 0.5×%.1f = %.2f）' % (p['vo'], p['vin1'], p['vin2'],
                                                                 3 * p['vin1'] + 0.5 * p['vin2']))
p = pred['bonus']
print('Bonus：第一級 %.4f Vpk、第二級 %.4f Vpk（兩路輸入最大 %.1f V）' % (p['stage1'], p['mono'], max(p['l'], p['r'])))
print('輸入接地時的輸出偏移：反相加法器 %+.3f mV、同相加法器 %+.3f mV、減法器 %+.3f mV'
      % (pred['offset'][1], pred['offset'][2], pred['offset'][3]))


# ── 記錄簿要用的預報值（build_record_xlsx.py 讀這份）────────────────────────
A2 = [0, 1, 2, 3, 4, 5]


def _sweep_pp(name, t0=2e-3):
    out = []
    for s in read_raw(os.path.join(HERE, name))[1]:
        m = s['time'] >= t0
        out.append(float(np.ptp(s['V(vo)'][m])))
    return out


cache = {'a2': A2}
for key, name, fix in (('exp1', 'lab5-exp1-sweep.raw', 2),
                       ('exp2', 'lab5-exp2-sweep.raw', 2),
                       ('exp3', 'lab5-exp3-sweep.raw', 5)):
    cache[key + '_vo_pp'] = _sweep_pp(name)
    cache[key + '_fix'] = fix
cache['cm'] = [[t, a, 20 * float(np.log10(r))] for t, a, r in pred['cm'][1:]]
cache['offset_mV'] = pred['offset']
with open(os.path.join(HERE, 'ltspice-pred.json'), 'w', encoding='utf-8') as fh:
    json.dump(cache, fh, ensure_ascii=False, indent=1)
print('寫出 ltspice-pred.json（記錄簿的預報欄讀這份）')
