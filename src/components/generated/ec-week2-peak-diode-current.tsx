import { useId, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

// ---- fixed physical constants (Example 3-28) ----
const VP = 4.5; // V
const IL = 8.49; // A

// ---- SVG geometry (viewBox 640x320) ----
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const X_LEFT = 80;
const X_RIGHT = 620;
const THETA_MIN_DEG = 35;
const THETA_MAX_DEG = 100;

const TOP_Y_TOP = 24;
const TOP_Y_BOTTOM = 140;
const BOTTOM_Y_TOP = 170;
const BOTTOM_Y_BOTTOM = 290;

const V_DOMAIN_MIN = 2.2;
const V_DOMAIN_MAX = 4.7;

const NUM_SAMPLES = 130;

const SLIDER_MIN = 1;
const SLIDER_MAX = 20;
const SLIDER_STEP = 0.1;

function angleToX(deg: number): number {
  return (
    X_LEFT +
    ((deg - THETA_MIN_DEG) / (THETA_MAX_DEG - THETA_MIN_DEG)) * (X_RIGHT - X_LEFT)
  );
}

function topValueToY(v: number): number {
  return (
    TOP_Y_BOTTOM -
    ((v - V_DOMAIN_MIN) / (V_DOMAIN_MAX - V_DOMAIN_MIN)) * (TOP_Y_BOTTOM - TOP_Y_TOP)
  );
}

function bottomValueToY(v: number, idMax: number): number {
  return BOTTOM_Y_BOTTOM - (v / idMax) * (BOTTOM_Y_BOTTOM - BOTTOM_Y_TOP);
}

interface Sample {
  deg: number;
  vin: number;
  vout: number;
  id: number;
}

function computeDerived(ratioPercent: number) {
  const ratio = ratioPercent / 100;
  const theta1 = Math.asin(1 - ratio); // rad
  const theta1Deg = (theta1 * 180) / Math.PI;
  const cosTheta1 = Math.cos(theta1);
  const windowFraction = (Math.PI / 2 - theta1) / (2 * Math.PI);
  const ip = IL * (1 + 2 * Math.PI * Math.sqrt(2 / ratio));

  const samples: Sample[] = [];
  const step = (THETA_MAX_DEG - THETA_MIN_DEG) / NUM_SAMPLES;
  for (let i = 0; i <= NUM_SAMPLES; i++) {
    const deg = THETA_MIN_DEG + i * step;
    const rad = (deg * Math.PI) / 180;
    const vin = VP * Math.sin(rad);
    let vout: number;
    let id: number;
    if (rad < theta1) {
      vout = VP * Math.sin(theta1);
      id = 0;
    } else if (rad <= Math.PI / 2) {
      vout = VP * Math.sin(rad);
      id = IL + (ip - IL) * (Math.cos(rad) / cosTheta1);
    } else {
      vout = VP;
      id = 0;
    }
    samples.push({ deg, vin, vout, id: Math.max(id, 0) });
  }

  const idMax = Math.max(100, Math.ceil((ip * 1.15) / 10) * 10);

  return { ratio, theta1Deg, windowFraction, ip, samples, idMax };
}

function formatNumber(v: number, digits: number): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function EcWeek2PeakDiodeCurrent() {
  const [ratioPercent, setRatioPercent] = useState(2.2);
  const sliderId = useId();

  const { theta1Deg, windowFraction, ip, samples, idMax } = useMemo(
    () => computeDerived(ratioPercent),
    [ratioPercent]
  );

  const vinPoints = samples
    .map((s) => `${angleToX(s.deg).toFixed(2)},${topValueToY(s.vin).toFixed(2)}`)
    .join(' ');
  const voutPoints = samples
    .map((s) => `${angleToX(s.deg).toFixed(2)},${topValueToY(s.vout).toFixed(2)}`)
    .join(' ');

  const idBaselineY = bottomValueToY(0, idMax);
  const idAreaPath =
    `M ${angleToX(THETA_MIN_DEG).toFixed(2)},${idBaselineY.toFixed(2)} ` +
    samples
      .map(
        (s) =>
          `L ${angleToX(s.deg).toFixed(2)},${bottomValueToY(s.id, idMax).toFixed(2)}`
      )
      .join(' ') +
    ` L ${angleToX(THETA_MAX_DEG).toFixed(2)},${idBaselineY.toFixed(2)} Z`;

  const ilY = bottomValueToY(IL, idMax);
  const theta1X = angleToX(theta1Deg);

  const anchor22Pos = ((2.2 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const anchor10Pos = ((10 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  const exceedsGuideline = ratioPercent > 10;

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="二極體峰值電流示意圖：上方為電壓波形局部放大，下方為二極體電流尖峰"
        >
          {/* theta1 dashed vertical line spanning both panels */}
          <line
            x1={theta1X}
            y1={TOP_Y_TOP}
            x2={theta1X}
            y2={BOTTOM_Y_BOTTOM}
            stroke="var(--neutral-400)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={theta1X + 4}
            y={TOP_Y_TOP + 10}
            fontSize={11}
            fill="var(--neutral-500)"
          >
            {'θ1'}
          </text>

          {/* top panel: voltage */}
          <line
            x1={X_LEFT}
            y1={TOP_Y_BOTTOM}
            x2={X_RIGHT}
            y2={TOP_Y_BOTTOM}
            stroke="var(--border-subtle)"
            strokeWidth={1}
          />
          <polyline
            points={vinPoints}
            fill="none"
            stroke="var(--neutral-300)"
            strokeWidth={1.5}
          />
          <polyline
            points={voutPoints}
            fill="none"
            stroke="var(--blue-600)"
            strokeWidth={2.5}
          />

          {/* bottom panel: diode current */}
          <line
            x1={X_LEFT}
            y1={BOTTOM_Y_BOTTOM}
            x2={X_RIGHT}
            y2={BOTTOM_Y_BOTTOM}
            stroke="var(--border-subtle)"
            strokeWidth={1}
          />
          <path d={idAreaPath} fill="var(--danger-50)" stroke="var(--danger-500)" strokeWidth={1.5} />
          <line
            x1={X_LEFT}
            y1={ilY}
            x2={X_RIGHT}
            y2={ilY}
            stroke="var(--neutral-400)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <text x={X_RIGHT - 40} y={ilY - 6} fontSize={11} fill="var(--neutral-500)">
            IL
          </text>

          {/* axis ticks (degrees) */}
          {[35, 50, 65, 80, 100].map((deg) => (
            <g key={deg}>
              <line
                x1={angleToX(deg)}
                y1={BOTTOM_Y_BOTTOM}
                x2={angleToX(deg)}
                y2={BOTTOM_Y_BOTTOM + 4}
                stroke="var(--neutral-400)"
                strokeWidth={1}
              />
              <text
                x={angleToX(deg)}
                y={BOTTOM_Y_BOTTOM + 16}
                fontSize={10}
                fill="var(--neutral-400)"
                textAnchor="middle"
              >
                {deg}
                {'°'}
              </text>
            </g>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <span
            className="absolute text-xs font-medium text-[var(--text-muted)]"
            style={{
              left: `${(X_LEFT / VIEW_WIDTH) * 100}%`,
              top: `${((TOP_Y_TOP - 16) / VIEW_HEIGHT) * 100}%`,
            }}
          >
            電壓波形（局部放大）
          </span>
          <span
            className="absolute text-xs font-medium text-[var(--text-muted)]"
            style={{
              left: `${(X_LEFT / VIEW_WIDTH) * 100}%`,
              top: `${((BOTTOM_Y_TOP - 16) / VIEW_HEIGHT) * 100}%`,
            }}
          >
            二極體電流 ID 尖峰
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--neutral-300)]" />
          Vin（輸入電壓）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full bg-[var(--blue-600)]" />
          Vout（輸出，含漣波）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[var(--danger-500)]" />
          ID（二極體尖峰電流）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full border-t-2 border-dashed border-[var(--neutral-400)]" />
          IL（平均負載電流）
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        為聚焦峰值電流概念，示意圖忽略 V<sub>D,on</sub> 位移。
      </p>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={sliderId}
          className="text-sm font-medium text-[var(--text-strong)]"
        >
          漣波比 VR/Vp：{formatNumber(ratioPercent, 1)}%
        </label>
        <input
          id={sliderId}
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={ratioPercent}
          onChange={(e) => setRatioPercent(Number(e.target.value))}
          aria-label="漣波比 VR 除以 Vp，範圍 1% 至 20%"
          className="w-full accent-[var(--blue-600)]"
        />
        <div className="relative h-8 w-full">
          <div
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${anchor22Pos}%` }}
          >
            <span className="h-2 w-px bg-[var(--blue-600)]" />
            <span className="mt-0.5 whitespace-nowrap text-[11px] text-[var(--blue-600)]">
              2.2%：Ip {'≈'} 517 A
            </span>
          </div>
          <div
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${anchor10Pos}%` }}
          >
            <span className="h-2 w-px bg-[var(--warning-500)]" />
            <span className="mt-0.5 whitespace-nowrap text-[11px] text-[var(--warning-500)]">
              10%：設計準則上限
            </span>
          </div>
        </div>
      </div>

      {exceedsGuideline && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--warning-500)] bg-[var(--warning-50)] px-3 py-2 text-xs text-[var(--warning-500)]">
          <TriangleAlert size={14} className="shrink-0" />
          目前漣波比已超過 10% 設計準則上限
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">導通窗口佔週期</div>
          <div className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {formatNumber(windowFraction * 100, 2)}%
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">Ip / IL 倍率</div>
          <div className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {formatNumber(ip / IL, 1)}{'×'}
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="text-xs text-[var(--text-muted)]">Ip（Example 3-28）</div>
          <div className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {formatNumber(ip, 0)} A
          </div>
        </div>
      </div>
    </div>
  );
}
