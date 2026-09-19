"""Render Lab 1 LTspice results as PNG charts (dataviz reference palette, light surface)."""
import numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from ltraw import read_raw, stats
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'note-images', 'ec-week3-ltspice')
os.makedirs(OUT, exist_ok=True)

SURF, INK, INK2, GRID = '#fcfcfb', '#0b0b0b', '#52514e', '#e6e5e1'
S1, S2, S3 = '#2a78d6', '#eb6834', '#1baf7a'
plt.rcParams.update({'font.family': ['Helvetica Neue', 'Arial', 'PingFang TC', 'Heiti TC', 'sans-serif'], 'font.size': 11,
    'axes.edgecolor': GRID, 'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2, 'axes.titlecolor': INK,
    'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': 1, 'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': SURF, 'axes.facecolor': SURF, 'legend.frameon': False, 'lines.linewidth': 2, 'lines.solid_joinstyle': 'round', 'lines.solid_capstyle': 'round'})
plt.rcParams['font.family'] = ['PingFang TC', 'Heiti TC', 'Helvetica Neue', 'Arial', 'sans-serif']

def fig(w=10, h=4.2, ncols=1):
    f, axs = plt.subplots(1, ncols, figsize=(w, h), dpi=160)
    return f, (axs if ncols > 1 else [axs])

def endlabel(ax, x, y, text, color):
    ax.annotate(text, (x[-1], y[-1]), xytext=(6, 0), textcoords='offset points', va='center', color=INK, fontsize=10,
                bbox=dict(boxstyle='round,pad=0.15', fc=SURF, ec='none'))

def save(f, name):
    f.tight_layout(); f.savefig(f'{OUT}/{name}.png', facecolor=SURF); plt.close(f)

# 1. forward I-V
n, st = read_raw('lab1-exp1-forward.raw'); s = st[0]
vd, i_ma, vs = s['V(a)'], s['I(D1)'] * 1e3, s['Vs']
f, (a, b) = fig(11, 4.2, 2)
a.plot(vd, i_ma, color=S1); a.set_xlabel('$V_D$ (V)'); a.set_ylabel('$I_D$ (mA)'); a.set_title('順偏 I-V：1N4007 + 1 kΩ，Vs 0→2 V', loc='left')
k1 = float(np.interp(1.0, i_ma, vd)); a.scatter([k1], [1.0], s=40, color=S1, zorder=3, edgecolor=SURF, linewidth=1.5)
a.annotate(f'1 mA 時 $V_D$ = {k1:.2f} V', (k1, 1.0), xytext=(-120, 10), textcoords='offset points', color=INK, fontsize=10)
a.set_xlim(0, 0.65)
b.plot(vs, vd, color=S1); b.plot(vs, vs - vd, color=S2)
endlabel(b, vs, vd, '$V_D$', S1); endlabel(b, vs, vs - vd, '$V_R$', S2)
b.set_xlabel('$V_s$ (V)'); b.set_ylabel('電壓 (V)'); b.set_title('電源每加 0.1 V，多出來的落在電阻上', loc='left'); b.set_xlim(0, 2.3)
b.legend(['$V_D$ 二極體', '$V_R$ 電阻'], loc='upper left')
save(f, 'exp1-forward-iv')

# 2. reverse
n, st = read_raw('lab1-exp2-reverse.raw'); s = st[0]
n2, st2 = read_raw('lab1-exp2-reverse-bv.raw'); s2 = st2[0]
f, (a, b) = fig(11, 4.2, 2)
a.plot(-s['V(k)'], -s['I(D1)'] * 1e9, color=S1); a.set_xlabel('逆向電壓 $-V_D$ (V)'); a.set_ylabel('逆向電流 (nA)'); a.set_title('逆偏 0→20 V：漏電流只有 0.1 nA 量級', loc='left')
b.plot(-s2['V(k)'], -s2['I(D1)'] * 1e3, color=S2); b.set_xlabel('逆向電壓 $-V_D$ (V)'); b.set_ylabel('逆向電流 (mA)'); b.set_title('掃到 1200 V：1000 V 才崩潰（實驗室量不到）', loc='left')
save(f, 'exp2-reverse-iv')

# 3. RC review
n, st = read_raw('lab1-rc-review.raw'); s = st[0]
t, m = s['time'], s['time'] >= 0.15
f, (a,) = fig(10, 4)
a.plot(t[m] * 1e3, s['V(in)'][m], color=S1); a.plot(t[m] * 1e3, s['V(out)'][m], color=S2)
a.set_xlabel('時間 (ms)'); a.set_ylabel('電壓 (V)'); a.set_title('RC 複習：20 Hz、100 Ω、1 mF，交流被壓到 8%，直流 3 V 通過', loc='left')
a.legend(['$V_{in}$', '$V_{out}$'], loc='upper right', ncol=2); a.set_ylim(1.5, 4.5)
save(f, 'rc-review')

# 4. half-wave
n, st = read_raw('lab1-exp3-halfwave.raw'); s = st[0]; t = s['time'] * 1e3
f, (a,) = fig(10, 4)
a.plot(t, s['V(in)'], color=S1); a.plot(t, s['V(out)'], color=S2)
st_out = stats(s['time'], s['V(out)'])
a.set_xlabel('時間 (ms)'); a.set_ylabel('電壓 (V)'); a.set_title(f"半波整流：輸出峰值 {st_out['peak']:.2f} V（輸入 5 V 減二極體壓降）", loc='left')
a.legend(['$V_{in}$', '$V_{out}$'], loc='upper right', ncol=2); a.set_xlim(0, 50)
save(f, 'exp3-halfwave')

n, st = read_raw('lab1-exp3-halfwave-rc.raw')
f, (a,) = fig(10, 4.2)
labels = ['C = 1 µF', 'C = 10 µF', 'C = 100 µF']; cols = [S1, S2, S3]
for s, lab, c in zip(st, labels, cols):
    m = s['time'] >= 2.95; a.plot((s['time'][m] - 2.95) * 1e3, s['V(out)'][m], color=c)
m = st[0]['time'] >= 2.95; a.plot((st[0]['time'][m] - 2.95) * 1e3, st[0]['V(in)'][m], color=INK2, linewidth=1, alpha=0.5)
rip = [stats(s['time'], s['V(out)'])['ripple'] for s in st]
a.legend([f'{l}，漣波 {r:.2f} V' for l, r in zip(labels, rip)] + ['$V_{in}$'], loc='lower right', ncol=2)
a.set_xlabel('時間 (ms，穩態後的 50 ms)'); a.set_ylabel('電壓 (V)'); a.set_title('半波整流加濾波電容：電容越大漣波越小', loc='left'); a.set_ylim(-5.5, 5.5)
save(f, 'exp3-halfwave-rc')

# 5. bridge
n, st = read_raw('lab1-exp4-bridge.raw'); s = st[0]; t = s['time'] * 1e3
f, (a,) = fig(10, 4)
a.plot(t, s['V(a)'] - s['V(b)'], color=S1); a.plot(t, s['V(p)'], color=S2)
st_out = stats(s['time'], s['V(p)'])
a.set_xlabel('時間 (ms)'); a.set_ylabel('電壓 (V)'); a.set_title(f"全波橋式整流：輸出峰值 {st_out['peak']:.2f} V（輸入 2.5 V 減兩個二極體壓降）", loc='left')
a.legend(['$V_{in}$', '$V_{out}$'], loc='upper right', ncol=2); a.set_xlim(0, 50)
save(f, 'exp4-bridge')

n, st = read_raw('lab1-exp4-bridge-rc.raw')
f, (a,) = fig(10, 4.2)
for s, lab, c in zip(st, labels, cols):
    m = s['time'] >= 2.95; a.plot((s['time'][m] - 2.95) * 1e3, s['V(p)'][m], color=c)
rip = [stats(s['time'], s['V(p)'])['ripple'] for s in st]
a.legend([f'{l}，漣波 {r:.2f} V' for l, r in zip(labels, rip)], loc='lower right', ncol=3)
a.set_xlabel('時間 (ms，穩態後的 50 ms)'); a.set_ylabel('電壓 (V)'); a.set_title('橋式整流加濾波電容：同樣的電容，漣波是半波的一半', loc='left'); a.set_ylim(0, 1.8)
save(f, 'exp4-bridge-rc')

# 6. zener
n, st = read_raw('lab1-exp4-zener.raw'); s = st[0]; t = s['time'] * 1e3
f, (a,) = fig(10, 4.2)
a.plot(t, s['V(a)'] - s['V(b)'], color=INK2, linewidth=1, alpha=0.5); a.plot(t, s['V(p)'], color=S1); a.plot(t, s['V(out)'], color=S2)
a.set_xlabel('時間 (ms)'); a.set_ylabel('電壓 (V)'); a.set_title('橋式整流加齊納穩壓（±10 V、Rlimit 1 kΩ、Vz 6.8 V）：峰值被削平在 6.8 V', loc='left')
a.legend(['$V_{in}$', '橋式輸出 $V_p$', '穩壓後 $V_{out}$'], loc='upper right', ncol=3); a.set_xlim(0, 50); a.set_ylim(-11, 11)
save(f, 'exp4-zener')
print('done')
