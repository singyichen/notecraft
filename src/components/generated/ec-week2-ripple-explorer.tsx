import { useMemo, useState, useCallback } from 'react';
import { TriangleAlert, CircleCheck } from 'lucide-react';

interface SimPoint {
  t: number;
  vin: number;
  vout: number;
  diodeOn: boolean;
}

interface Region {
  start: number;
  end: number;
  on: boolean;
}

const VP = 5;
const F_IN = 60;
const V_DON = 0.7;
const T_PERIOD = 1 / F_IN;
const N_STEPS = 360;

function capFromPos(pos: number): number {
  // 0.1 uF -- 1000 uF, log scale
  return 0.1 * Math.pow(10, (pos / 100) * 4);
}

function rlFromPos(pos: number): { ohm: number; noLoad: boolean } {
  if (pos >= 100) return { ohm: Infinity, noLoad: true };
  // 100 ohm -- 1e6 ohm, log scale
  return { ohm: 100 * Math.pow(10, (pos / 99) * 4), noLoad: false };
}

function formatCap(uF: number): string {
  if (uF < 10) return `${uF.toFixed(2)} μF`;
  if (uF < 100) return `${uF.toFixed(1)} μF`;
  return `${uF.toFixed(0)} μF`;
}

function formatOhm(ohm: number, noLoad: boolean): string {
  if (noLoad) return '無負載（∞）';
  if (ohm >= 1000) return `${(ohm / 1000).toFixed(ohm >= 10000 ? 0 : 1)} kΩ`;
  return `${ohm.toFixed(0)} Ω`;
}

function formatVoltage(v: number): string {
  return `${v.toFixed(v < 1 ? 3 : 2)} V`;
}

function formatTau(seconds: number, noLoad: boolean): string {
  if (noLoad || !isFinite(seconds)) return '∞';
  if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(1)} μs`;
  if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
  return `${seconds.toFixed(2)} s`;
}

function runSimulation(cUf: number, rlOhm: number, noLoad: boolean): SimPoint[] {
  const cF = cUf * 1e-6;
  const dt = (3 * T_PERIOD) / N_STEPS;
  const points: SimPoint[] = [];
  let vout = 0;
  for (let i = 0; i <= N_STEPS; i++) {
    const t = i * dt;
    const vin = VP * Math.sin(2 * Math.PI * F_IN * t);
    const candidate = vin - V_DON;
    let diodeOn: boolean;
    if (candidate > vout) {
      vout = candidate;
      diodeOn = true;
    } else {
      diodeOn = false;
      if (!noLoad) {
        vout = vout * Math.exp(-dt / (rlOhm * cF));
      }
    }
    vout = Math.max(vout, 0);
    points.push({ t, vin, vout, diodeOn });
  }
  return points;
}

// plot geometry inside a 640x260 viewBox
const X0 = 44;
const X1 = 588;
const Y0 = 20;
const Y1 = 210;
const V_MAX = 5.6;

function xScale(t: number): number {
  return X0 + (t / (3 * T_PERIOD)) * (X1 - X0);
}

function yScale(v: number): number {
  return Y1 - (Math.max(v, 0) / V_MAX) * (Y1 - Y0);
}

function buildPath(points: SimPoint[], key: 'vin' | 'vout'): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.t).toFixed(2)} ${yScale(p[key]).toFixed(2)}`)
    .join(' ');
}

export default function EcWeek2RippleExplorer(): JSX.Element {
  const [cPos, setCPos] = useState(25);
  const [rPos, setRPos] = useState(50);

  const handleCChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCPos(Number(e.target.value));
  }, []);
  const handleRChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRPos(Number(e.target.value));
  }, []);

  const cUf = useMemo(() => capFromPos(cPos), [cPos]);
  const { ohm: rlOhm, noLoad } = useMemo(() => rlFromPos(rPos), [rPos]);

  const points = useMemo(() => runSimulation(cUf, rlOhm, noLoad), [cUf, rlOhm, noLoad]);

  const lastStart = 2 * T_PERIOD;
  const lastPeriod = useMemo(() => points.filter((p) => p.t >= lastStart), [points]);

  const stats = useMemo(() => {
    const cF = cUf * 1e-6;
    let peak = lastPeriod[0];
    let trough = lastPeriod[0];
    for (const p of lastPeriod) {
      if (p.vout > peak.vout) peak = p;
      if (p.vout < trough.vout) trough = p;
    }
    const vrActual = peak.vout - trough.vout;
    const il = noLoad ? 0 : (VP - V_DON) / rlOhm;
    const vrFormula = noLoad ? 0 : il / (cF * F_IN);
    const relDiff = !noLoad && vrFormula > 1e-6 ? Math.abs(vrActual - vrFormula) / vrFormula : null;
    const tau = noLoad ? Infinity : rlOhm * cF;
    const vrOverVp = vrActual / VP;
    return { peak, trough, vrActual, il, vrFormula, relDiff, tau, vrOverVp };
  }, [lastPeriod, cUf, rlOhm, noLoad]);

  const regions = useMemo(() => {
    const regs: Region[] = [];
    for (const p of lastPeriod) {
      const last = regs[regs.length - 1];
      if (last && last.on === p.diodeOn) {
        last.end = p.t;
      } else {
        regs.push({ start: p.t, end: p.t, on: p.diodeOn });
      }
    }
    return regs;
  }, [lastPeriod]);

  const chargeRegion = useMemo(
    () => regions.filter((r) => r.on).sort((a, b) => b.end - b.start - (a.end - a.start))[0],
    [regions]
  );
  const dischargeRegion = useMemo(
    () => regions.filter((r) => !r.on).sort((a, b) => b.end - b.start - (a.end - a.start))[0],
    [regions]
  );

  const vinPath = useMemo(() => buildPath(points, 'vin'), [points]);
  const voutPath = useMemo(() => buildPath(points, 'vout'), [points]);

  const arrowX = X1 + 14;
  const arrowY1 = yScale(stats.peak.vout);
  const arrowY2 = yScale(stats.trough.vout);

  const showLinearWarning = stats.relDiff !== null && stats.relDiff > 0.2;
  const exceedsGuideline = stats.vrOverVp > 0.1;

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="relative w-full aspect-[640/260]">
        <svg
          viewBox="0 0 640 260"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="半波整流器加濾波電容的漣波波形"
          className="absolute inset-0"
        >
          {/* last-period background shading */}
          {regions.map((r, i) => (
            <rect
              key={`region-${i}`}
              x={xScale(r.start)}
              y={Y0}
              width={Math.max(xScale(r.end) - xScale(r.start), 0.5)}
              height={Y1 - Y0}
              fill={r.on ? 'var(--blue-50)' : 'var(--surface-sunken)'}
            />
          ))}

          {/* divider marking start of the analysis period */}
          <line
            x1={xScale(lastStart)}
            y1={Y0}
            x2={xScale(lastStart)}
            y2={Y1}
            stroke="var(--border-default)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />

          {/* axes */}
          <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="var(--border-subtle)" strokeWidth={1} />
          <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="var(--border-subtle)" strokeWidth={1} />

          {[0, T_PERIOD, 2 * T_PERIOD, 3 * T_PERIOD].map((t, i) => (
            <text
              key={`xt-${i}`}
              x={xScale(t)}
              y={Y1 + 14}
              fontSize={9}
              fill="var(--neutral-400)"
              textAnchor="middle"
            >
              {i === 0 ? '0' : `${i}T`}
            </text>
          ))}
          {[0, VP].map((v, i) => (
            <text
              key={`yt-${i}`}
              x={X0 - 6}
              y={yScale(v) + 3}
              fontSize={9}
              fill="var(--neutral-400)"
              textAnchor="end"
            >
              {v === 0 ? '0' : `${v}V`}
            </text>
          ))}

          {/* Vin / Vout waveforms */}
          <path d={vinPath} fill="none" stroke="var(--neutral-300)" strokeWidth={1.5} />
          <path d={voutPath} fill="none" stroke="var(--blue-600)" strokeWidth={2.5} strokeLinejoin="round" />

          {/* VR double-headed arrow (geometry only) */}
          <line
            x1={arrowX}
            y1={arrowY1}
            x2={arrowX}
            y2={arrowY2}
            stroke="var(--neutral-600)"
            strokeWidth={1.25}
          />
          <polygon
            points={`${arrowX - 3},${arrowY1 + 5} ${arrowX + 3},${arrowY1 + 5} ${arrowX},${arrowY1}`}
            fill="var(--neutral-600)"
          />
          <polygon
            points={`${arrowX - 3},${arrowY2 - 5} ${arrowX + 3},${arrowY2 - 5} ${arrowX},${arrowY2}`}
            fill="var(--neutral-600)"
          />
        </svg>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1 right-1 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-card)]/90 px-2 py-1 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-[2px] w-3 bg-[var(--neutral-300)]" />
              輸入 Vin
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-[2px] w-3 bg-[var(--blue-600)]" />
              輸出 Vout
            </span>
          </div>

          {chargeRegion && (
            <span
              style={{
                left: `${((xScale(chargeRegion.start) + xScale(chargeRegion.end)) / 2 / 640) * 100}%`,
                top: '6%',
              }}
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--blue-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--blue-600)]"
            >
              充電
            </span>
          )}
          {dischargeRegion && (
            <span
              style={{
                left: `${((xScale(dischargeRegion.start) + xScale(dischargeRegion.end)) / 2 / 640) * 100}%`,
                top: '90%',
              }}
              className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--neutral-200)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-600)]"
            >
              放電
            </span>
          )}

          <span
            style={{
              left: `${(arrowX / 640) * 100}%`,
              top: `${((arrowY1 + arrowY2) / 2 / 260) * 100}%`,
            }}
            className="absolute translate-x-1 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-[var(--neutral-600)]"
          >
            VR
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-slider" className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>濾波電容 C</span>
            <span className="font-semibold tabular-nums text-[var(--text-strong)]">{formatCap(cUf)}</span>
          </label>
          <input
            id="c-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={cPos}
            onChange={handleCChange}
            aria-label="濾波電容 C，0.1 微法拉到 1000 微法拉，對數刻度"
            className="w-full accent-[var(--blue-600)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-slider" className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>負載電阻 RL</span>
            <span className="font-semibold tabular-nums text-[var(--text-strong)]">{formatOhm(rlOhm, noLoad)}</span>
          </label>
          <input
            id="r-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={rPos}
            onChange={handleRChange}
            aria-label="負載電阻 RL，100 歐姆到無負載，對數刻度"
            className="w-full accent-[var(--blue-600)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">時間常數 τ = RL·C</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {formatTau(stats.tau, noLoad)}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">漣波電壓 VR</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            估算 {formatVoltage(stats.vrFormula)} / 實際 {formatVoltage(stats.vrActual)}
          </div>
          {showLinearWarning && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--warning-500)]">
              <TriangleAlert size={12} className="shrink-0" />
              線性近似已不成立
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">VR / Vp</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {(stats.vrOverVp * 100).toFixed(1)}%
          </div>
          {exceedsGuideline ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--danger-500)]">
              <TriangleAlert size={12} className="shrink-0" />
              超出設計準則
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--success-500)]">
              <CircleCheck size={12} className="shrink-0" />
              在設計準則內
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
