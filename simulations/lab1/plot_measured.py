"""Lab 1 實驗一：把實測（或 Tinkercad）的順偏 I-V 數據疊到 LTspice 1N4007 曲線上，並用兩種準則算導通電壓。

用法（在 simulations/lab1/ 執行）：
    .venv/bin/python plot_measured.py measured/lab1-exp1-forward.csv
    .venv/bin/python plot_measured.py measured/lab1-exp1-forward.csv measured/lab1-exp1-tinkercad.csv --out ../../public/note-images/ec-week3-measured

CSV 欄位（表頭必填，順序不拘）：Vs, VD, I_mA。I_mA 留空時用 (Vs - VD) / 1 kΩ 補；一列 Vs 或 VD 空白就跳過。
輸出：<out>/exp1-forward-overlay.png，以及印在終端機的導通電壓對照表（Markdown）。
"""
import argparse, csv, os, sys
import numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
from ltraw import read_raw

R_OHM = 1000.0
SURF, INK, INK2, GRID = '#fcfcfb', '#0b0b0b', '#52514e', '#e6e5e1'
S1, S2, S3, S4 = '#2a78d6', '#eb6834', '#1baf7a', '#8b5cf6'
plt.rcParams.update({'font.family': ['Heiti TC', 'Hiragino Sans', 'Arial Unicode MS', 'Helvetica Neue', 'Arial', 'sans-serif'], 'font.size': 11,
    'axes.edgecolor': GRID, 'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2, 'axes.titlecolor': INK,
    'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': 1, 'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': SURF, 'axes.facecolor': SURF, 'legend.frameon': False, 'lines.linewidth': 2})


def read_csv(path):
    """回傳 (label, Vs, VD, I_mA)；I_mA 空白時用歐姆定律補。"""
    vs, vd, im = [], [], []
    with open(path, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit(f'{path}: 沒有資料列')
    cols = {k.strip().lower(): k for k in rows[0].keys()}
    for want in ('vs', 'vd'):
        if want not in cols:
            sys.exit(f'{path}: 缺少欄位 {want}（表頭要有 Vs, VD, I_mA）')
    for r in rows:
        try:
            a, b = float(r[cols['vs']]), float(r[cols['vd']])
        except (TypeError, ValueError):
            continue
        c = r.get(cols.get('i_ma', ''), '')
        try:
            c = float(c)
        except (TypeError, ValueError):
            c = (a - b) / R_OHM * 1e3
        vs.append(a); vd.append(b); im.append(c)
    label = os.path.splitext(os.path.basename(path))[0].replace('lab1-exp1-', '')
    return label, np.array(vs), np.array(vd), np.array(im)


def knee_threshold(vd, i_ma, i_th=1.0):
    """準則一：固定電流門檻——電流第一次到 i_th (mA) 時的 V_D（線性內插）。資料沒到門檻回傳 nan。"""
    o = np.argsort(i_ma)
    if i_ma.max() < i_th:
        return float('nan')
    return float(np.interp(i_th, i_ma[o], vd[o]))


def knee_tangent(vd, i_ma, frac=0.5):
    """準則二：切線交點——取電流 > frac·I_max 的點做直線擬合，外推到 I = 0 的 V_D；同時回傳斜率倒數（動態電阻 Ω）。"""
    m = i_ma > frac * i_ma.max()
    if m.sum() < 2:
        return float('nan'), float('nan')
    a, b = np.polyfit(vd[m], i_ma[m], 1)
    return float(-b / a), float(1e3 / a)


def read_csv_reverse(path):
    """實驗二：欄位 Vs, VD, I_uA；I_uA 空白就跳過該列（逆偏沒有可靠的歐姆定律反推）。回傳 (label, Vs, VD, I_uA)。"""
    vs, vd, iu = [], [], []
    with open(path, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit(f'{path}: 沒有資料列')
    cols = {k.strip().lower(): k for k in rows[0].keys()}
    for want in ('vs', 'vd', 'i_ua'):
        if want not in cols:
            sys.exit(f'{path}: 缺少欄位 {want}（表頭要有 Vs, VD, I_uA）')
    for r in rows:
        try:
            a, b, c = float(r[cols['vs']]), float(r[cols['vd']]), float(r[cols['i_ua']])
        except (TypeError, ValueError):
            continue
        vs.append(a); vd.append(abs(b)); iu.append(abs(c))
    label = os.path.splitext(os.path.basename(path))[0].replace('lab1-exp2-', '')
    return label, np.array(vs), np.array(vd), np.array(iu)


def main_reverse(args):
    """實驗二：逆偏漏電流疊在 LTspice 曲線上（對數軸），加上 DMM 10 MΩ 輸入阻抗與 datasheet 上限兩條參考線。"""
    _, st = read_raw(args.raw); s = st[0]
    lt_v, lt_i = s['V(k)'], -s['I(D1)'] * 1e6   # 逆向電壓 (V)、逆向電流 (µA)
    m = lt_v > 0.05; lt_v, lt_i = lt_v[m], lt_i[m]
    series = []
    for p, c in zip(args.csv, (S2, S3, S4)):
        label, vs, vd, iu = read_csv_reverse(p)
        if len(vs) == 0:
            print(f'{p}: 沒有完整的列（Vs, VD, I_uA 都要有值），跳過'); continue
        series.append((label, vs, vd, iu, c))

    f, (a, b) = plt.subplots(1, 2, figsize=(11, 4.4), dpi=160)
    vgrid = np.linspace(0.5, 20, 200)
    a.plot(lt_v, lt_i, color=S1, label='LTspice 1N4007 漏電流')
    a.plot(vgrid, vgrid / 10e6 * 1e6, color=INK2, linewidth=1, linestyle='--', label='DMM 10 MΩ 輸入阻抗分走的電流 $V/10\\,\\mathrm{M\\Omega}$')
    a.axhline(5.0, color=S4, linewidth=1, linestyle=':', label='datasheet 上限 5 µA（1000 V、25 °C）')
    for label, vs, vd, iu, c in series:
        pos = iu > 0
        a.plot(vd[pos], iu[pos], 'o', color=c, label=label, markersize=5, markeredgecolor=SURF, markeredgewidth=0.8)
        b.plot(vs, vd, 'o', color=c, label=label, markersize=5, markeredgecolor=SURF, markeredgewidth=0.8)
    a.set_yscale('log'); a.set_ylim(1e-5, 20); a.set_xlim(0, 21)
    a.set_xlabel('逆向電壓 $-V_D$ (V)'); a.set_ylabel('逆向電流 (µA，對數)'); a.set_title('逆偏漏電流：實測點多半落在 DMM 那條線附近', loc='left')
    a.legend(loc='center right', fontsize=8.5)
    b.plot([0, 20], [0, 20], color=S1, label='$V_D = V_s$（電阻上沒有壓降）'); b.set_xlim(0, 21); b.set_ylim(0, 21)
    b.set_xlabel('$V_s$ (V)'); b.set_ylabel('$-V_D$ (V)'); b.set_title('逆偏：電源加多少，二極體就吃多少', loc='left'); b.legend(loc='upper left')
    f.tight_layout(); f.savefig(os.path.join(args.out, 'exp2-reverse-overlay.png'), facecolor=SURF); plt.close(f)

    print('| 資料 | 20 V 附近的逆向電流 | 換算等效電阻 $V/I$ | 和 DMM 10 MΩ 線的比較 | $V_D / V_s$ 平均 |')
    print('| --- | --- | --- | --- | --- |')
    k = int(np.argmin(np.abs(lt_v - 20)))
    print(f'| LTspice 1N4007 | {lt_i[k] * 1e3:.3g} nA | {20 / lt_i[k] / 1e6 * 1e6:.3g} MΩ | 小 4 個數量級 | 1.000 |')
    for label, vs, vd, iu, c in series:
        j = int(np.argmax(vs)); i20 = iu[j]
        if i20 > 0:
            req = vd[j] / (i20 * 1e-6) / 1e6; dmm = vd[j] / 10e6 * 1e6
            cmp_ = '幾乎就是電壓表的電流' if 0.5 <= i20 / dmm <= 2 else ('比電壓表的電流大，二極體或接觸真的在漏' if i20 > 2 * dmm else '比 DMM 線還小，多半是電流表解析度')
            print(f'| {label} | {i20:.3g} µA（{vs[j]:g} V） | {req:.3g} MΩ | {cmp_} | {np.mean(vd / vs):.3f} |')
        else:
            print(f'| {label} | 讀值為 0（{vs[j]:g} V） | 量不到 | 低於電流表解析度 | {np.mean(vd / vs):.3f} |')
    print(f'\n圖：{os.path.join(args.out, "exp2-reverse-overlay.png")}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv', nargs='+', help='實測或 Tinkercad 的 CSV（可多個）')
    ap.add_argument('--exp', type=int, default=1, choices=(1, 2), help='1 = 順偏（預設），2 = 逆偏')
    ap.add_argument('--out', default=os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week3-measured'))
    ap.add_argument('--raw', default=None, help='LTspice .raw，預設依 --exp 選 lab1-exp1-forward.raw 或 lab1-exp2-reverse.raw')
    ap.add_argument('--threshold', type=float, default=1.0, help='準則一的電流門檻 (mA)，預設 1 mA')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    if args.raw is None:
        args.raw = os.path.join(HERE, 'lab1-exp1-forward.raw' if args.exp == 1 else 'lab1-exp2-reverse.raw')
    if args.exp == 2:
        return main_reverse(args)

    _, st = read_raw(args.raw); s = st[0]
    lt_vd, lt_i, lt_vs = s['V(a)'], s['I(D1)'] * 1e3, s['Vs']
    series = [('LTspice 1N4007', lt_vs, lt_vd, lt_i, S1, '-')]
    for p, c in zip(args.csv, (S2, S3, S4)):
        label, vs, vd, im = read_csv(p)
        series.append((label, vs, vd, im, c, 'o'))

    f, (a, b) = plt.subplots(1, 2, figsize=(11, 4.4), dpi=160)
    rows = []
    for label, vs, vd, im, c, mk in series:
        if mk == '-':
            a.plot(vd, im, color=c, label=label); b.plot(vs, vd, color=c, label=label)
        else:
            a.plot(vd, im, mk, color=c, label=label, markersize=5, markeredgecolor=SURF, markeredgewidth=0.8)
            b.plot(vs, vd, mk, color=c, label=label, markersize=5, markeredgecolor=SURF, markeredgewidth=0.8)
        k1 = knee_threshold(vd, im, args.threshold); k2, rd = knee_tangent(vd, im)
        rows.append((label, k1, k2, rd, float(im.max())))
        if not np.isnan(k2):
            xs = np.array([k2, vd.max()]); a.plot(xs, (xs - k2) * 1e3 / rd, color=c, linewidth=1, alpha=0.5, linestyle='--')
    a.set_xlabel('$V_D$ (V)'); a.set_ylabel('$I$ (mA)'); a.set_title('順偏 I-V：實測點疊在 LTspice 曲線上（虛線＝切線外推）', loc='left')
    a.set_xlim(0, max(0.75, max(sr[2].max() for sr in series) + 0.05)); a.legend(loc='upper left')
    b.set_xlabel('$V_s$ (V)'); b.set_ylabel('$V_D$ (V)'); b.set_title('電源每加 0.1 V，$V_D$ 停在哪裡', loc='left'); b.legend(loc='lower right')
    f.tight_layout(); f.savefig(os.path.join(args.out, 'exp1-forward-overlay.png'), facecolor=SURF); plt.close(f)

    print(f'| 資料 | 準則一：$I = {args.threshold:g}$ mA 時的 $V_D$ | 準則二：切線交點 | 陡段動態電阻 | 最大電流 |')
    print('| --- | --- | --- | --- | --- |')
    for label, k1, k2, rd, imax in rows:
        f1 = '資料未達門檻' if np.isnan(k1) else f'{k1:.3f} V'
        f2 = '點數不足' if np.isnan(k2) else f'{k2:.3f} V'
        f3 = '' if np.isnan(rd) else f'{rd:.0f} Ω'
        print(f'| {label} | {f1} | {f2} | {f3} | {imax:.2f} mA |')
    print(f'\n圖：{os.path.join(args.out, "exp1-forward-overlay.png")}')


if __name__ == '__main__':
    main()
