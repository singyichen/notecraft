"""Lab 4 LTspice 結果出圖，輸出到 public/note-images/ec-week10-ltspice/。

用法（在 simulations/lab4 目錄）：../lab1/.venv/bin/python plot.py
需要先用 ../tools/run-lt.sh lab4-*.cir 產生 .raw。
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
from ltraw import read_ac, read_raw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week10-ltspice')
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


def ac(name):
    return read_ac(os.path.join(HERE, name))


def win(s, t0):
    m = s['time'] >= t0
    return {k: v[m] for k, v in s.items()}


pred = {}

# ── 實驗一、二的時域波形 ──────────────────────────────────────────────────────
f, (a, b) = fig(11.4, 4.3, 2)
for axis, name, title, av in [
    (a, 'lab4-exp1-noninv-tran.raw', '實驗一 非反相放大器 $A_v=1+R_2/R_1=+3$', 3.0),
    (b, 'lab4-exp2-inv-tran.raw', '實驗二 反相放大器 $A_v=-R_2/R_1=-2$', -2.0),
]:
    s = win(raw(name)[1][0], 1e-3)
    t = (s['time'] - s['time'][0]) * 1e3
    axis.plot(t, s['V(vin)'], color=INK2, label='$V_{in}$')
    axis.plot(t, s['V(vo)'], color=S1 if av > 0 else S2, label='$V_{out}$')
    axis.set_xlim(0, 2), axis.set_ylim(-15, 15)
    axis.axhline(14.6, color=GRID, ls='--', lw=1.2)
    axis.axhline(-14.6, color=GRID, ls='--', lw=1.2)
    axis.set_xlabel('時間（ms）'), axis.set_ylabel('電壓（V）'), axis.set_title(title)
    axis.legend(loc='upper right', ncol=2)
    key = 'exp1' if av > 0 else 'exp2'
    pred[key] = dict(vin_pp=float(np.ptp(s['V(vin)'])), vo_pp=float(np.ptp(s['V(vo)'])),
                     vo_max=float(s['V(vo)'].max()), vo_min=float(s['V(vo)'].min()))
    pred[key]['av'] = pred[key]['vo_pp'] / pred[key]['vin_pp'] * (1 if av > 0 else -1)
a.text(0.04, 0.06, '虛線＝模型的輸出飽和邊界 ±14.6 V', transform=a.transAxes, color=INK2, fontsize=9.5)
save(f, 'lab4-waveforms')

# ── 頻率響應：兩種組態的閉迴路增益與 −3 dB 頻寬 ────────────────────────────
f, (a,) = fig(10.4, 4.4)
for name, label, col in [('lab4-exp1-noninv-ac.raw', '非反相 $A_v=+3$', S1),
                         ('lab4-exp2-inv-ac.raw', '反相 $A_v=-2$', S2)]:
    s = ac(name)[1][0]
    fr, g = s['frequency'], np.abs(s['V(vo)'])
    a.plot(fr, g, color=col, label=label)
    mid = float(np.interp(1e3, fr, g))
    i = int(np.argmax(g < mid / np.sqrt(2)))
    f3 = float(np.interp(mid / np.sqrt(2), [g[i], g[i - 1]], [fr[i], fr[i - 1]]))
    a.plot([f3], [mid / np.sqrt(2)], 'o', color=col, ms=6)
    dy = -26 if 'noninv' in name else -46
    a.annotate('$f_{-3dB}$ = %.0f kHz' % (f3 / 1e3), (f3, mid / np.sqrt(2)),
               textcoords='offset points', xytext=(-12, dy), color=col, fontsize=9.5, ha='right')
    key = 'exp1' if 'noninv' in name else 'exp2'
    pred[key].update(av_1k=mid, f3db=f3, av_1meg=float(np.interp(1e6, fr, g)), gbw=mid * f3)
a.axvline(1e3, color=INK2, ls=':', lw=1.4)
a.axvline(1e6, color=INK2, ls=':', lw=1.4)
a.text(1.2e3, 4.2, '講義的 1 kHz', color=INK2, fontsize=9.5)
a.text(8.3e5, 4.2, '問題 3 的 1 MHz', color=INK2, fontsize=9.5, ha='right')
a.set_xscale('log'), a.set_yscale('log'), a.set_xlim(10, 1e7), a.set_ylim(0.05, 5)
a.set_xlabel('頻率（Hz）'), a.set_ylabel('閉迴路增益（倍）')
a.set_title('閉迴路增益隨頻率下滑：1 kHz 還是平的，1 MHz 已經掉到 1 倍以下')
a.legend(loc='lower left')
save(f, 'lab4-bode')

# ── 講義問題 3：同一個 1 MHz，大訊號撞迴轉率、小訊號只是衰減 ──────────────
f, (a, b) = fig(11.4, 4.3, 2)
s = win(raw('lab4-q3-1MHz-tran.raw')[1][0], 6e-6)
t = (s['time'] - s['time'][0]) * 1e6
a.plot(t, s['V(vo)'] * 1e3, color=S2, label='$V_{out}$')
a.axhline(0, color=GRID, lw=1.2)
a.set_xlim(0, 3), a.set_ylim(-275, 90)
a.set_xlabel('時間（µs）'), a.set_ylabel('輸出電壓（mV）')
a.set_title('1 MHz、4 V 峰值：輸出只剩 0.19 V$_{pp}$ 的三角波')
a.text(0.03, 0.035, '輸入是 ±4 V 的正弦波（超出本圖上下界）\n理想輸出應為 ±8 V；最大斜率 0.50 V/µs ＝ 規格書迴轉率',
       transform=a.transAxes, color=INK2, fontsize=9.5)
a.legend(loc='upper right')
pred['q3_large'] = dict(vo_pp=float(np.ptp(s['V(vo)'])), vin_pp=float(np.ptp(s['V(vin)'])),
                        slew=float(np.abs(np.gradient(s['V(vo)'], s['time'])).max()))
pred['q3_large']['av'] = pred['q3_large']['vo_pp'] / pred['q3_large']['vin_pp']
s = win(raw('lab4-q3-1MHz-small.raw')[1][0], 6e-6)
t = (s['time'] - s['time'][0]) * 1e6
b.plot(t, s['V(vin)'] * 1e3, color=INK2, label='$V_{in}$ 50 mV 峰值')
b.plot(t, s['V(vo)'] * 1e3, color=S1, label='$V_{out}$')
b.set_xlim(0, 3), b.set_ylim(-78, 78), b.set_xlabel('時間（µs）'), b.set_ylabel('電壓（mV）')
b.set_title('1 MHz、50 mV 峰值：還是正弦波，只是振幅剩 0.58 倍')
b.legend(loc='lower center', ncol=2, fontsize=9.5)
pred['q3_small'] = dict(vo_pp=float(np.ptp(s['V(vo)'])), vin_pp=float(np.ptp(s['V(vin)'])),
                        slew=float(np.abs(np.gradient(s['V(vo)'], s['time'])).max()))
pred['q3_small']['av'] = pred['q3_small']['vo_pp'] / pred['q3_small']['vin_pp']
save(f, 'lab4-slew-vs-bandwidth')

# ── 輸入振幅掃描：非反相組態幾伏開始削平 ─────────────────────────────────────
st = raw('lab4-exp1-amp-sweep.raw')[1]
amps = 1 + 0.5 * np.arange(len(st))        # 對齊網表的 .step param A 1 7.5 0.5（峰值）
rows = []
for amp, s in zip(amps, st):
    s = win(s, 1.5e-3)
    rows.append((amp, float(np.ptp(s['V(vo)'])), float(s['V(vo)'].max())))
pred['sweep'] = rows
f, (a,) = fig(10.0, 4.2)
x = [r[0] * 2 for r in rows]
a.plot(x, [r[1] for r in rows], 'o-', color=S1, label='LTspice 實際輸出')
a.plot(x, [3 * v for v in x], '--', color=INK2, lw=1.5, label='理想 $3\\times V_{in}$')
a.axvline(8, color=S3, ls=':', lw=1.8)
a.text(8.2, 6, '講義設定 8 V$_{pp}$\n（Ampl: 4 ＝ 4 V 峰值）', color=S3, fontsize=9.5, va='bottom')
a.axhline(29.2, color=GRID, ls='--', lw=1.2)
a.text(13.9, 30.1, '模型的輸出擺幅上限 ≈ 29.2 V$_{pp}$', color=INK2, fontsize=9.5, ha='right')
a.set_xlabel('輸入振幅（V$_{pp}$）'), a.set_ylabel('輸出振幅（V$_{pp}$）')
a.set_title('非反相組態：輸入超過 9 V$_{pp}$ 之後輸出就貼著電源軌不動了')
a.set_ylim(0, 36), a.legend(loc='upper left')
save(f, 'lab4-clipping')

# ── 數值 ────────────────────────────────────────────────────────────────────
n, st = raw('lab4-offset.raw')
s = st[0]
pred['offset'] = dict(no_comp=float(s['V(vo1)'][0]) * 1e3, with_comp=float(s['V(vo2)'][0]) * 1e3)
n, st = raw('lab4-bonus-unity.raw')
s = st[0]
pred['unity'] = [(float(a0), float(v)) for a0, v in zip(s['a0'], s['V(vo)'])]

print('── Lab 4 LTspice 預報值（uA741 Boyle macromodel，±15 V）─────────────')
for k, t in [('exp1', '實驗一 非反相 Av=+3'), ('exp2', '實驗二 反相 Av=-2')]:
    p = pred[k]
    print('%s：Vin %.3f Vpp → Vout %.3f Vpp，實測 Av=%+.4f，峰值 %+.2f / %+.2f V'
          % (t, p['vin_pp'], p['vo_pp'], p['av'], p['vo_max'], p['vo_min']))
    print('      1 kHz 增益 %.4f、f-3dB %.0f kHz、GBW %.0f kHz、1 MHz 增益 %.3f'
          % (p['av_1k'], p['f3db'] / 1e3, p['gbw'] / 1e3, p['av_1meg']))
for k, t in [('q3_large', '問題 3 大訊號 1 MHz 4 Vpk'), ('q3_small', '問題 3 小訊號 1 MHz 50 mVpk')]:
    p = pred[k]
    print('%s：Vout %.4f Vpp，|Av|=%.3f，最大斜率 %.3f V/µs' % (t, p['vo_pp'], p['av'], p['slew'] / 1e6))
print('輸出直流偏移：+ 端直接接地 %.2f mV；加補償電阻 R3=R1//R2=66.7k %.3f mV'
      % (pred['offset']['no_comp'], pred['offset']['with_comp']))
print('削平門檻：', ' '.join('%.0fVpp→%.1f' % (r[0] * 2, r[1]) for r in rows))
print('Bonus 單位增益 A_cl = A0/(1+A0)：', ' '.join('A0=%g→%.6f' % (a, v) for a, v in pred['unity']))


# ── 記錄簿要用的預報值（build_record_xlsx.py 讀這份）────────────────────────
AMP_VPP = [round(2 + k, 1) for k in range(14)]            # 2～15 V_pp
FREQ = [100, 1e3, 1e4, 5e4, 1e5, 2e5, 5e5, 1e6]


def _sweep_pp(name, t0=2e-3):
    out = []
    for s in raw(name)[1]:
        m = s['time'] >= t0
        out.append(float(np.ptp(s['V(vo)'][m])))
    return out


cache = {'amp_Vpp': AMP_VPP, 'freq': FREQ,
         'exp1_vo_pp': _sweep_pp('lab4-exp1-amp-sweep.raw'),
         'exp2_vo_pp': _sweep_pp('lab4-exp2-amp-sweep.raw')}
for key, name in (('exp1', 'lab4-exp1-noninv-ac.raw'), ('exp2', 'lab4-exp2-inv-ac.raw')):
    s = ac(name)[1][0]
    fr, gc = s['frequency'], s['V(vo)']
    cache[key + '_av_f'] = [float(np.interp(x, fr, np.abs(gc))) for x in FREQ]
    cache[key + '_ph_f'] = [float(np.degrees(np.angle(np.interp(x, fr, gc)))) for x in FREQ]
cache['offset_mV'] = pred['offset']
cache['unity'] = pred['unity']
with open(os.path.join(HERE, 'ltspice-pred.json'), 'w', encoding='utf-8') as fh:
    json.dump(cache, fh, ensure_ascii=False, indent=1)
print('寫出 ltspice-pred.json（記錄簿的預報欄讀這份）')
