"""Minimal LTspice .raw reader (binary, real flags) -> dict of numpy arrays, split into steps."""
import re, struct, numpy as np

def read_raw(path):
    b = open(path, 'rb').read()
    enc = 'utf-16-le' if b[1:2] == b'\x00' else 'latin-1'
    key = 'Binary:\n'.encode(enc)
    i = b.find(key)
    header = b[:i].decode(enc)
    data = b[i + len(key):]
    nvars = int(re.search(r'No\. Variables:\s+(\d+)', header).group(1))
    npts = int(re.search(r'No\. Points:\s+(\d+)', header).group(1))
    names = [l.split('\t')[2] for l in header.split('\nVariables:\n')[1].strip('\n').split('\n')]
    dbl = 'double' in re.search(r'Flags:(.*)', header).group(1)
    if dbl:
        arr = np.frombuffer(data, dtype='<f8', count=npts * nvars).reshape(npts, nvars)
        cols = {names[k]: arr[:, k].copy() for k in range(nvars)}
    else:
        rec = np.dtype([('x', '<f8')] + [(f'v{k}', '<f4') for k in range(1, nvars)])
        arr = np.frombuffer(data, dtype=rec, count=npts)
        cols = {names[0]: arr['x'].astype(float)}
        for k in range(1, nvars): cols[names[k]] = arr[f'v{k}'].astype(float)
    x = np.abs(cols[names[0]]); cols[names[0]] = x
    # split into steps where the sweep variable restarts
    starts = [0] + [k for k in range(1, npts) if x[k] < x[k - 1] - 1e-15 * 0 and x[k] <= x[0] + 1e-12] if npts > 1 else [0]
    starts = sorted(set(starts))
    steps = []
    for s, e in zip(starts, starts[1:] + [npts]):
        steps.append({n: v[s:e] for n, v in cols.items()})
    return names, steps

def stats(t, v, f=60, cycles=2):
    """peak / rms / avg over the last `cycles` periods (time-weighted)."""
    T = cycles / f; m = t >= t[-1] - T
    tt, vv = t[m], v[m]
    w = np.diff(tt); vm = (vv[1:] + vv[:-1]) / 2
    avg = np.sum(vm * w) / np.sum(w); rms = np.sqrt(np.sum(vm**2 * w) / np.sum(w))
    return dict(peak=vv.max(), min=vv.min(), rms=rms, avg=avg, ripple=vv.max() - vv.min())

if __name__ == '__main__':
    import sys, json
    out = {}
    n, st = read_raw('lab1-exp1-forward.raw'); s = st[0]
    vd, idd = s['V(a)'], s['I(D1)'] * 1e3
    out['exp1'] = dict(names=n, points=len(vd), Vs_max=float(s['Vs'].max()), VD_at_Vs2=float(vd[-1]), I_mA_at_Vs2=float(idd[-1]),
                       VD_at_I0p1mA=float(np.interp(0.1, idd, vd)), VD_at_I1mA=float(np.interp(1.0, idd, vd)))
    n, st = read_raw('lab1-exp2-reverse.raw'); s = st[0]
    out['exp2'] = dict(names=n, VD_at_Vs20=float(-s['V(k)'][-1]), I_uA_at_Vs20=float(s['I(D1)'][-1] * 1e6))
    n, st = read_raw('lab1-exp2-reverse-bv.raw'); s = st[0]
    i = np.abs(s['I(D1)']); k = np.argmax(i > 1e-3)
    out['exp2bv'] = dict(Vs_at_1mA=float(s['Vs'][k]), VD_at_1mA=float(-s['V(k)'][k]))
    n, st = read_raw('lab1-rc-review.raw'); s = st[0]
    out['rc'] = dict(names=n, vin=stats(s['time'], s['V(in)'], 20, 2), vout=stats(s['time'], s['V(out)'], 20, 2))
    n, st = read_raw('lab1-exp3-halfwave.raw'); s = st[0]
    out['exp3'] = dict(names=n, vin=stats(s['time'], s['V(in)']), vout=stats(s['time'], s['V(out)']))
    n, st = read_raw('lab1-exp3-halfwave-rc.raw')
    out['exp3rc'] = dict(nsteps=len(st), steps=[stats(s['time'], s['V(out)']) for s in st])
    n, st = read_raw('lab1-exp4-bridge.raw'); s = st[0]
    out['exp4'] = dict(names=n, vin=stats(s['time'], s['V(a)'] - s['V(b)']), vout=stats(s['time'], s['V(p)']))
    n, st = read_raw('lab1-exp4-bridge-rc.raw')
    out['exp4rc'] = dict(nsteps=len(st), steps=[stats(s['time'], s['V(p)']) for s in st])
    n, st = read_raw('lab1-exp4-zener.raw'); s = st[0]
    out['exp4z'] = dict(names=n, vin=stats(s['time'], s['V(a)'] - s['V(b)']), vout=stats(s['time'], s['V(out)']), vp=stats(s['time'], s['V(p)']))
    print(json.dumps(out, indent=1, default=float))
