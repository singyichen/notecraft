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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv', nargs='+', help='實測或 Tinkercad 的 CSV（可多個）')
    ap.add_argument('--out', default=os.path.join(HERE, '..', '..', 'public', 'note-images', 'ec-week3-measured'))
    ap.add_argument('--raw', default=os.path.join(HERE, 'lab1-exp1-forward.raw'))
    ap.add_argument('--threshold', type=float, default=1.0, help='準則一的電流門檻 (mA)，預設 1 mA')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

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
