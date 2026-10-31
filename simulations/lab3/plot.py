"""Lab 3 LTspice 結果出圖（dataviz 參考色票、淺色底），輸出到 public/note-images/ec-week9-ltspice/。

用法（在 simulations/lab3 目錄）：../lab1/.venv/bin/python plot.py
需要先用 ../tools/run-lt.sh lab3-*.cir 產生 .raw。
除了出圖，也把筆記裡預報表要用的數字印到 stdout。
"""
import os
import re
import sys

import matplotlib
import numpy as np

matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from ltraw import read_raw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week9-ltspice')
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


def flat(names, steps):
    """.op + .step 的結果：每個 step 只有一點，攤平成一維。"""
    return {k: np.concatenate([s[k] for s in steps]) for k in names}


# ── 實驗一：輸出特性曲線（有 R1 1k 在源極 vs 沒有）────────────────────────────
n, st = raw('lab3-exp1-curves.raw')
n2, st2 = raw('lab3-exp1-ideal.raw')
VGS_LIST = [0, 2, 4, 6]
f, (a, b) = fig(11.4, 4.4, 2)
for k, (s, c) in enumerate(zip(st, [INK2, S3, S1, S2])):
    a.plot(s['VDS'], -s['I(VDS)'] * 1e3, color=c, label=f'電源 $V_{{GS}}$ = {VGS_LIST[k]} V')
a.plot([0, 4], [0, 4], color=S4, lw=1.4, ls='--', label='$I_D = V_{DS}/R_1$（1 kΩ 的負載線）')
a.set_xlabel('電源讀數 $V_{DS}$ (V)'), a.set_ylabel('$I_D$ (mA)')
a.set_title('講義原電路：R₁ 1 kΩ 串在源極')
a.legend(fontsize=9.5)
for k, (s, c) in enumerate(zip(st2, [INK2, S3, S1, S2])):
    b.plot(s['VDS'], -s['I(VDS)'] * 1e3, color=c, label=f'$V_{{GS}}$ = {VGS_LIST[k]} V')
b.set_xlabel('元件端點 $V_{DS}$ (V)'), b.set_ylabel('$I_D$ (mA)')
b.set_title('對照：源極直接接地（教科書曲線）')
b.set_yscale('log'), b.set_ylim(1e-3, 1e3)
b.legend(fontsize=9.5)
save(f, 'lab3-exp1-curves')

print('── 實驗一 預報（BS170，R1 1 kΩ 在源極；單位 mA）')
print('  電源 V_DS →   1 V     2 V     3 V     4 V     5 V')
for k, s in enumerate(st):
    v, i = s['VDS'], -s['I(VDS)'] * 1e3
    row = '  '.join(f'{np.interp(x, v, i):6.3f}' for x in (1, 2, 3, 4, 5))
    print(f'  V_GS = {VGS_LIST[k]} V : {row}')
print('  對照（源極接地、無 R1）V_DS = 5 V 時：',
      '  '.join(f'V_GS={VGS_LIST[k]}V→{-s["I(VDS)"][-1]*1e3:.1f} mA' for k, s in enumerate(st2)))

# ── 實驗二：轉移特性曲線與臨界電壓 ─────────────────────────────────────────
n, st = raw('lab3-exp2-transfer.raw')
VDS_LIST = [1, 3, 5]
f, (a, b) = fig(11.4, 4.4, 2)
vth_fit = None
for k, (s, c) in enumerate(zip(st, [S3, S1, S2])):
    vg, idd = s['VGS'], -s['I(VDS)'] * 1e3
    a.plot(vg, idd, color=c, label=f'電源 $V_{{DS}}$ = {VDS_LIST[k]} V（飽和於 {idd[-1]:.1f} mA）')
    if VDS_LIST[k] == 5:
        b.plot(vg, np.sqrt(np.clip(idd, 0, None)), color=c, lw=2)
        # 取 ID 1～4 mA 這段做線性外插，交 x 軸即臨界電壓
        m = (idd > 1) & (idd < 4)
        p = np.polyfit(vg[m], np.sqrt(idd[m]), 1)
        vth_fit = -p[1] / p[0]
        xs = np.linspace(vth_fit - 0.1, 3.4, 20)
        b.plot(xs, np.polyval(p, xs), color=S2, lw=1.4, ls='--')
        b.axvline(vth_fit, color=INK2, lw=1, ls=':')
        b.annotate(f'外插 $V_{{th}}$ ≈ {vth_fit:.2f} V', (vth_fit, 0.4), xytext=(vth_fit + 0.25, 1.6),
                   color=INK, fontsize=10, arrowprops=dict(arrowstyle='->', color=INK2, lw=1))
a.set_xlabel('$V_{GS}$ (V)'), a.set_ylabel('$I_D$ (mA)'), a.set_title('轉移特性曲線（R₁ 100 Ω 在汲極）')
a.legend(fontsize=9.5)
b.set_xlabel('$V_{GS}$ (V)'), b.set_ylabel(r'$\sqrt{I_D}$ ($\sqrt{mA}$)')
b.set_title('平方根外插法取臨界電壓（$V_{DS}$ = 5 V）')
b.set_xlim(1.9, 2.9), b.set_ylim(0, 4)
save(f, 'lab3-exp2-transfer')

print('\n── 實驗二 預報（BS170，R1 100 Ω 在汲極；單位 mA）')
print('  V_GS →     2.0     2.5     3.0     3.5     4.0     5.0     6.0')
for k, s in enumerate(st):
    vg, idd = s['VGS'], -s['I(VDS)'] * 1e3
    row = '  '.join(f'{np.interp(x, vg, idd):6.3f}' for x in (2, 2.5, 3, 3.5, 4, 5, 6))
    print(f'  V_DS = {VDS_LIST[k]} V : {row}')
print(f'  臨界電壓（√I_D 線性外插）≈ {vth_fit:.2f} V；模型內建 Vto = 2.14 V')

# ── 實驗三：導通電阻 ────────────────────────────────────────────────────
n, st = raw('lab3-exp3-ron.raw')
s = st[0]
vg, vds = s['VGS'], s['V(d)']
ron = vds / 10e-3
f, (a,) = fig(7.4, 4.2)
a.plot(vg, ron, color=S1)
for x, c in ((5, S2), (10, S3)):
    y = float(np.interp(x, vg, ron))
    a.plot([x], [y], 'o', color=c, ms=7)
    a.annotate(f'$V_{{GS}}$ = {x} V → $R_{{on}}$ = {y:.2f} Ω\n（$V_{{DS}}$ = {y*10:.1f} mV）',
               (x, y), xytext=(x - 3.4, y + 2.6), color=INK, fontsize=10,
               arrowprops=dict(arrowstyle='->', color=INK2, lw=1))
a.set_xlabel('$V_{GS}$ (V)'), a.set_ylabel('$R_{on} = V_{DS}/I_D$ (Ω)')
a.set_title('導通電阻隨閘極電壓下降（$I_D$ 固定 10 mA）')
a.set_ylim(0, 20)
save(f, 'lab3-exp3-ron')

print('\n── 實驗三 預報（I_D 固定 10 mA）')
for x in (3, 4, 5, 6, 8, 10):
    y = float(np.interp(x, vg, vds))
    print(f'  V_GS = {x:2d} V : V_DS = {y*1e3:7.3f} mV → R_on = {y/0.01:6.3f} Ω')

# ── 實驗四：LED 開關 ───────────────────────────────────────────────────
n, st = raw('lab3-exp4-switch.raw')
f, (a,) = fig(7.4, 4.2)
for s, c, lab in zip(st, [S1, S2], ['R₁ = 100 Ω（講義原值）', 'R₁ = 200 Ω（講義問題 4）']):
    a.plot(s['VGS'], s['I(DLED)'] * 1e3, color=c, label=lab)
a.axhline(2, color=INK2, lw=1, ls=':')
a.annotate('肉眼看得出亮約 2 mA', (0.2, 2.4), color=INK2, fontsize=10)
a.set_xlabel('$V_{GS}$ (V)'), a.set_ylabel('$I_D$ = LED 電流 (mA)')
a.set_title('MOSFET 當開關：$V_{DD}$ = 8 V，掃閘極電壓')
a.legend(fontsize=9.5)
save(f, 'lab3-exp4-switch')

print('\n── 實驗四 預報（V_DD = 8 V，LED 為概念模型）')
for s, lab in zip(st, ['R1=100Ω', 'R1=200Ω']):
    vg2, idd, vled = s['VGS'], s['I(DLED)'] * 1e3, s['V(p)'] - s['V(d)']
    cells = '  '.join(f'{np.interp(x, vg2, idd):6.2f}' for x in (1, 2, 2.5, 3, 4, 5, 6))
    print(f'  {lab} I_D(mA) @ V_GS=1/2/2.5/3/4/5/6 V: {cells}')
    on = vg2[np.argmax(idd > 2)]
    print(f'         LED 電流越過 2 mA 的閘極電壓 ≈ {on:.2f} V；'
          f'V_GS = 6 V 時 LED 壓降 {np.interp(6, vg2, vled):.2f} V')

# ── 第二部分：共源級放大器的時域波形 ────────────────────────────────────
n, st = raw('lab3-exp5-tran.raw')
s = st[0]
t = s['time'] * 1e3  # .tran 的 Tstart 已把時間軸歸零
f, (a,) = fig(9.2, 4.2)
a.plot(t, s['V(src)'] * 1e3, color=S1, label='$V_{in}$（50 mV 峰值、1 kHz）')
a.plot(t, s['V(out)'] * 1e3, color=S2, label=f'$V_{{out}}$（峰值 {s["V(out)"].max()*1e3:.0f} mV，$A_v$ = −8.7）')
a.set_xlim(0, 5), a.set_xlabel('時間 (ms)'), a.set_ylabel('電壓 (mV)')
a.set_title('共源級放大器：輸出反相、增益 8.7 倍')
a.legend(fontsize=9.5)
save(f, 'lab3-exp5-tran')

# ── 第二部分：R7 對增益的影響 + V_th 敏感度 ──────────────────────────────
def meas(name, key='av1k'):
    """從 .log 讀 .meas 的 dB 值（每個 .step 一列），回傳倍率清單。"""
    txt = open(os.path.join(HERE, name + '.log'), 'rb').read().decode('latin-1', 'replace')
    lines = txt.split(f'Measurement: {key}')[1].splitlines()[2:]
    out = []
    for line in lines:
        m = re.search(r'\(([-\d.]+)dB', line)
        if not m:
            break
        out.append(10 ** (float(m.group(1)) / 20))
    return out


r7s = [0.001, 100, 10e3, 25e3, 30e3, 50e3, 100e3]
gains = meas('lab3-bonus-r7-sweep')
vths = [0.8, 1.2, 1.6, 2.0, 2.14, 2.5, 3.0]
gv = meas('lab3-exp5-vth-sens')
n, st = raw('lab3-exp5-vth-sens-op.raw')
c = flat(n, st)

f, (a, b) = fig(11.4, 4.4, 2)
a.semilogx(np.array(r7s[1:]) / 1e3, gains[1:], 'o-', color=S1)
a.axhline(gains[0], color=S3, lw=1.4, ls='--')
a.annotate(f'$C_3$ 直接接地（$R_7$ = 0）→ {gains[0]:.0f} 倍', (0.11, gains[0] * 1.08), color=S3, fontsize=10)
a.axhline(10, color=S2, lw=1.4, ls='--')
a.annotate('Bonus 門檻 $|A_v|$ = 10', (0.11, 10.4), color=S2, fontsize=10)
for x, lab, dx, dy in ((30, '講義原值 30 kΩ → 8.7 倍', 0.14, 0.45), (10, 'Bonus 定案 10 kΩ → 18.6 倍', 0.1, 1.9)):
    y = float(np.interp(np.log10(x), np.log10(np.array(r7s[1:]) / 1e3), gains[1:]))
    a.plot([x], [y], 'o', color=S2, ms=7)
    a.annotate(lab, (x, y), xytext=(x * dx, y * dy), color=INK, fontsize=10,
               arrowprops=dict(arrowstyle='->', color=INK2, lw=1))
a.set_xlabel('$R_7$（與 $C_3$ 串聯，kΩ）'), a.set_ylabel('$|A_v|$ @ 1 kHz')
a.set_yscale('log'), a.set_ylim(3, 110), a.set_xlim(0.08, 150)
a.set_title('交流源極阻抗決定增益（偏壓完全不變）')

ln1 = b.plot(vths, gv, 'o-', color=S1, label='$|A_v|$ @ 1 kHz（左軸）')
b.set_xlabel('元件實際臨界電壓 $V_{th}$ (V)'), b.set_ylabel('$|A_v|$', color=S1)
b.set_yscale('log'), b.set_ylim(2e-3, 30)
b.axhspan(2e-3, 1, color=S2, alpha=0.06)
b.annotate('這一段等於沒有放大器', (0.84, 0.3), color=INK2, fontsize=10)
bb = b.twinx()
ln2 = bb.plot(vths, c['V(d)'] - c['V(s)'], 's--', color=S2, label='$V_{DS}$（右軸）')
bb.set_ylabel('$V_{DS}$ (V)', color=S2)
bb.grid(False), bb.set_ylim(-0.4, 7)
b.set_title('2N7000 的 $V_{th}$ 規格 0.8～3.0 V：低 $V_{th}$ 會掉進三極管區')
b.legend(handles=ln1 + ln2, fontsize=9.5, loc='lower right')
save(f, 'lab3-exp5-design')

print('\n── 第二部分 預報（講義原電路，V_DD = 15 V，BS170 Vto = 2.14 V）')
print('  V_G = 5.000 V  V_S = 2.967 V  V_D = 6.099 V')
print('  V_GS = 2.033 V  V_DS = 3.132 V  I_D = 29.67 µA  → 飽和區')
print('  g_m（由 A_v 回推）= 0.297 mA/V；|A_v| = 8.72（18.81 dB），相位 180°')
print('  V_out 峰值 = 436 mV（V_in 50 mV 峰值）')
print('\n  R_7 掃描：', '  '.join(f'{r/1e3:g}k→{g:.2f}' for r, g in zip(r7s, gains)))
print('  V_th 敏感度：')
for k, v in enumerate(vths):
    print(f'    V_th = {v:4.2f} V : V_S = {c["V(s)"][k]:.3f}  V_D = {c["V(d)"][k]:.3f}  '
          f'V_DS = {c["V(d)"][k]-c["V(s)"][k]:6.3f}  I_D = {c["I(R6)"][k]*1e6:5.2f} µA  |A_v| = {gv[k]:6.3f}')

print('\n圖輸出到', os.path.normpath(OUT))
