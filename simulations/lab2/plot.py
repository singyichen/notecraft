"""Lab 2 LTspice 結果出圖（dataviz 參考色票、淺色底），輸出到 public/note-images/ec-week6-ltspice/。

用法（在 simulations/lab2 目錄）：../lab1/.venv/bin/python plot.py
需要先用 ../tools/run-lt.sh lab2-*.cir 產生 .raw。
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
OUT = os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week6-ltspice')
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


def raw(name):
    return read_raw(os.path.join(HERE, name))


# 1. 輸出特性曲線族：IC 對 VCE，四個 VBB 一條線；疊上 VCC = 15 V 的直流負載線
n, st = raw('lab2-exp1-curves.raw')
vbbs = [1.5, 2.0, 2.2, 2.4]
cols = [INK2, S1, S3, S2]
f, (a,) = fig(10, 4.6)
summary = []
for s, vbb, c in zip(st, vbbs, cols):
    vce, ic = s['V(c)'], s['I(RC)'] * 1e3
    a.plot(vce, ic, color=c)
    ic15 = ic[-1]
    summary.append((vbb, ic15, s['V(b)'][-1]))
    dy = {1.5: -12, 2.0: 10}.get(vbb, 6)
    a.annotate(f'$V_{{BB}}$ = {vbb} V：{ic15:.2f} mA', (vce[-1], ic15), xytext=(-6, dy), textcoords='offset points',
               ha='right', color=INK, fontsize=9.5)
vcc = 15.0
a.plot([0, vcc], [vcc / 1.0, 0], color=INK2, linestyle='--', linewidth=1.2)
a.annotate('直流負載線 $V_{CC}$ = 15 V、$R_C$ = 1 kΩ\n$I_{C(sat)}$ = 15 mA、$V_{CE(cutoff)}$ = 15 V', (6.0, 9.0), color=INK2, fontsize=9.5)
a.set_xlabel('$V_{CE}$ (V)')
a.set_ylabel('$I_C$ (mA)')
a.set_xlim(0, 15.5)
a.set_ylim(0, 15.5)
a.set_title('實驗一：分壓偏壓的輸出特性曲線族（2N2222，$R_1$ 10 kΩ、$R_2$ 4.7 kΩ、$R_C$ 1 kΩ）', loc='left')
save(f, 'exp1-output-curves')

# 2. VBB 掃描：IC、IB、VBE 對 VBB（固定 VCC = 15 V），看 ON/OFF 門檻
n, st = raw('lab2-exp1-vbb-sweep.raw')
s = st[0]
vbb, ic, vbe, vce = s['VBB'], s['I(RC)'] * 1e3, s['V(b)'], s['V(c)']
ib = -s['Ib(Q1)'] * 1e6 if 'Ib(Q1)' in s else (s['I(R1)'] - s['I(R2)']) * 1e6
f, (a, b) = fig(11, 4.2, 2)
a.plot(vbb, ic, color=S1)
for v in vbbs:
    y = float(np.interp(v, vbb, ic))
    a.scatter([v], [y], s=36, color=S1, zorder=3, edgecolor=SURF, linewidth=1.5)
    a.annotate(f'{v} V → {y:.2f} mA', (v, y), xytext=(6, -2), textcoords='offset points', color=INK, fontsize=9)
a.set_xlabel('$V_{BB}$ (V)')
a.set_ylabel('$I_C$ (mA)')
a.set_title('$V_{CC}$ = 15 V 固定：1.5 V 截止、2 V 起導通、2.4 V 約 4.9 mA', loc='left')
a.set_xlim(0, 3)
b.plot(vbb, vbe, color=S2)
b.plot(vbb, vbb * 4.7 / 14.7, color=INK2, linestyle='--', linewidth=1.2)
b.set_xlabel('$V_{BB}$ (V)')
b.set_ylabel('電壓 (V)')
b.set_title('$V_{BE}$ 被鉗在 0.6–0.7 V；虛線是沒有電晶體時的分壓 $V_{TH}$', loc='left')
b.legend(['$V_{BE}$（LTspice）', '$V_{TH}$ = 0.32 $V_{BB}$'], loc='upper left')
b.set_xlim(0, 3)
b.set_ylim(0, 1.0)
save(f, 'exp1-vbb-sweep')

# 3. 實驗二：單電源 15 V 的工作點（.op 的 .raw 只有一點）
n, st = raw('lab2-exp2-op.raw')
s = st[0]
val = lambda k: float(np.atleast_1d(s[k])[0])  # noqa: E731
op = {
    'I_R1_mA': val('I(R1)') * 1e3, 'I_R2_mA': val('I(R2)') * 1e3, 'IB_uA': val('Ib(Q1)') * 1e6,
    'IC_mA': val('Ic(Q1)') * 1e3, 'VB': val('V(b)'), 'VC': val('V(c)'),
}
op['beta_forced'] = op['IC_mA'] * 1e3 / op['IB_uA']
print('exp2 op (VBB = VCC = 15 V):', {k: round(v, 3) for k, v in op.items()})

# 4. CE 放大器：四組 .step 的輸入／輸出波形
n, st = raw('lab2-exp3-ce-amp.raw')
labels = ['$R_{C1}$ 100 Ω，有 $C_3$', '$R_{C1}$ 1 kΩ，有 $C_3$', '$R_{C1}$ 100 Ω，無 $C_3$', '$R_{C1}$ 1 kΩ，無 $C_3$']
f, axs = plt.subplots(2, 2, figsize=(11, 6.4), dpi=160)
gains = []
for ax, s, lab in zip(axs.ravel(), st, labels):
    t = (s['time'] - s['time'].min()) * 1e6
    m = t >= 100
    vs, vo = s['V(s)'], s['V(out)']
    pp = lambda x: x[m].max() - x[m].min()  # noqa: E731
    g = pp(vo) / pp(vs)
    gains.append((lab, g, vo[m].max(), vo[m].min()))
    ax.plot(t[m] - 100, vs[m] * 1e3, color=INK2, linewidth=1.2)
    ax.plot(t[m] - 100, vo[m] * 1e3, color=S1)
    ax.set_title(f'{lab}：$|A_v|$ ≈ {g:.1f}', loc='left', fontsize=10.5)
    ax.set_xlabel('時間 (µs)')
    ax.set_ylabel('mV')
    ax.set_xlim(0, 300)
axs[0, 0].legend(['$V_s$（100 mVpp）', '$V_{out}$'], loc='upper right', fontsize=9)
f.suptitle('第二部分：CE 放大器（2N2222、$V_{CC}$ 12 V、10 kHz）— 旁路電容與集極電阻各自決定什麼', x=0.01, ha='left', fontsize=12, color=INK)
save(f, 'exp3-ce-amp-waveforms')
for lab, g, mx, mn in gains:
    print(f'CE {lab}: |Av| = {g:.2f}, Vout max {mx*1e3:.0f} mV / min {mn*1e3:.0f} mV')
for vbb, ic15, vbe in summary:
    print(f'exp1 VBB={vbb}: IC(15 V)={ic15:.3f} mA, VBE={vbe:.3f} V')


# 5. Bonus：為什麼光加大 C3 到不了 Av = 20，以及兩種設計的時域比較
import re  # noqa: E402


def meas(logfile, tag):
    """從 .log 撈 .meas 的 dB 值，轉回倍率。"""
    blk = open(os.path.join(HERE, logfile), encoding='latin-1').read().split('Measurement: ' + tag)[1]
    blk = blk.split('Measurement:')[0]
    return [10 ** (float(v) / 20) for v in re.findall(r'\(([-\d.]+)dB', blk)]


c3_list = [1, 4.7, 10, 22, 47, 100, 220, 470, 1000]
av_c3 = meas('lab2-bonus-c3-ac.log', 'av10k')
f, (a, b) = fig(11, 4.3, 2)
a.semilogx(c3_list, av_c3, color=S1, marker='o', markersize=5)
a.axhline(20, color=S2, linestyle='--', linewidth=1.2)
a.axhline(av_c3[-1], color=INK2, linestyle=':', linewidth=1.2)
a.annotate(f'天花板 {av_c3[-1]:.1f}（$R_{{C1}}$ = 100 Ω 擋住的）', (1.6, av_c3[-1] + 0.7), color=INK2, fontsize=9.5)
a.annotate('目標 $A_v$ = 20', (1.6, 20.6), color=S2, fontsize=9.5)
a.annotate('講義給的 1 µF\n只有 5.6', (1.05, 6.4), color=INK, fontsize=9.5)
a.set_xlabel('$C_3$ (µF，對數刻度)')
a.set_ylabel('$|A_v|$ @ 10 kHz')
a.set_ylim(0, 24)
a.set_title('只加大 $C_3$：5.6 → 16.6 就停住，到不了 20', loc='left')

n, st = raw('lab2-bonus-design.raw')
s1 = st[0]
n, st = raw('lab2-bonus-degen.raw')
s2 = st[0]
for s_, col in ((s1, S2), (s2, S1)):
    t = (s_['time'] - s_['time'].min()) * 1e6
    m = t >= t.max() - 300
    b.plot(t[m] - t[m].min(), s_['V(out)'][m] * 1e3, color=col)
t = (s1['time'] - s1['time'].min()) * 1e6
m = t >= t.max() - 300
b.plot(t[m] - t[m].min(), s1['V(s)'][m] * 1e3 * 10, color=INK2, linewidth=1.1)
b.set_xlabel('時間 (µs)')
b.set_ylabel('mV')
b.set_ylim(-1500, 1750)
b.set_title('同樣 100 mVpp 輸入：全旁路上下不對稱 31%，留 22 Ω 剩 1.6%', loc='left', fontsize=11)
b.legend(['$R_{C1}$ 120 Ω、全旁路（$|A_v|$ 16.1）', '$R_{C1}$ 620 Ω、留 22 Ω（$|A_v|$ 20.1）', '$V_s$ ×10（參考）'],
         loc='upper right', fontsize=8.5)
save(f, 'bonus-av20-design')
print('bonus: |Av| 對 C3 =', [round(v, 2) for v in av_c3])
