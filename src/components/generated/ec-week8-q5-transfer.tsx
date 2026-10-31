import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

const VIEWBOX_W = 320;
const VIEWBOX_H = 220;
const LEFT = 50;
const RIGHT = 306;
const TOP = 16;
const BOTTOM = 186;

const R1_MIN = 100;
const R1_MAX = 10000;

function formatOhm(ohm: number): string {
  if (ohm >= 1000) {
    return `${(ohm / 1000).toFixed(ohm >= 10000 ? 0 : 1)} kΩ`;
  }
  return `${Math.round(ohm)} Ω`;
}

function formatImax(amps: number): string {
  if (amps >= 1e-3) {
    const mA = amps * 1000;
    return `${mA >= 10 ? mA.toFixed(1) : mA.toFixed(2)} mA`;
  }
  return `${Math.round(amps * 1e6)} µA`;
}

type Anno = {
  x: number;
  y: number;
  text: string;
  className: string;
};

function AnnotationLayer({ items }: { items: Anno[] }) {
  return (
    <>
      {items.map((item, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute whitespace-nowrap text-[10px] sm:text-[11px] font-medium ${item.className}`}
          style={{
            left: `${(item.x / VIEWBOX_W) * 100}%`,
            top: `${(item.y / VIEWBOX_H) * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {item.text}
        </div>
      ))}
    </>
  );
}

function VoltageDrivenChart() {
  const annotations: Anno[] = [
    { x: 189.1, y: 150, text: 'Vth = VB + VD,on = 1.8 V', className: 'text-orange-600' },
    { x: 250, y: 80, text: '斉率 = 1/R1', className: 'text-neutral-600' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-neutral-800">(a) 電壓駆動：I_R1 vs. Vin</h4>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="電壓駆動電路的 I_R1 與 Vin 關係圖，在 Vin 超過 1.8V 後電流持續上升"
        >
          <rect
            x={LEFT}
            y={TOP}
            width={RIGHT - LEFT}
            height={BOTTOM - TOP}
            fill="none"
            stroke="var(--neutral-300)"
          />
          {/* x=0 reference */}
          <line x1={123.1} y1={TOP} x2={123.1} y2={BOTTOM} stroke="var(--neutral-200)" strokeDasharray="3 3" />
          {/* guide to kink */}
          <line x1={189.1} y1={186} x2={189.1} y2={150} stroke="var(--orange-300)" strokeDasharray="2 2" />
          {/* main polyline */}
          <polyline
            points="50,186 189.1,186 306,34.9"
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={189.1} cy={186} r={4} fill="var(--surface-card)" stroke="var(--orange-500)" strokeWidth={2} />

          {/* x ticks */}
          <text x={50} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">-2</text>
          <text x={123.1} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">0</text>
          <text x={189.1} y={198} fontSize={9} fill="var(--orange-600)" fontFamily="var(--font-mono)" textAnchor="middle">1.8</text>
          <text x={306} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">5</text>

          {/* y ticks */}
          <text x={44} y={189} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">0</text>
          <text x={44} y={146.5} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">0.5</text>
          <text x={44} y={104} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">1</text>
          <text x={44} y={61.5} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">1.5</text>
          <text x={44} y={19} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">2</text>

          <text x={178} y={210} fontSize={9} fill="var(--text-muted)" textAnchor="middle">Vin (V)</text>
          <text x={18} y={101} fontSize={9} fill="var(--text-muted)" textAnchor="middle" transform="rotate(-90 18 101)">I_R1 (×Imax)</text>
        </svg>
        <AnnotationLayer items={annotations} />
      </div>
      <p className="text-xs text-neutral-500 text-center">
        二極體放行 R1 的電流：導通後電流持續上升
      </p>
    </div>
  );
}

function CurrentDrivenChart() {
  const annotations: Anno[] = [
    { x: 90, y: 65, text: '斉率 = 1', className: 'text-neutral-600' },
    { x: 242, y: 34, text: '封頂 = 1.8 V / R1', className: 'text-orange-600' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-neutral-800">(b) 電流駆動：I_R1 vs. Iin</h4>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="電流駆動電路的 I_R1 與 Iin 關係圖，超過 1 倍 Imax 後電流被二極體封頂"
        >
          <rect
            x={LEFT}
            y={TOP}
            width={RIGHT - LEFT}
            height={BOTTOM - TOP}
            fill="none"
            stroke="var(--neutral-300)"
          />
          {/* zero reference lines, spanning full plot box */}
          <line x1={114} y1={TOP} x2={114} y2={BOTTOM} stroke="var(--neutral-200)" strokeDasharray="3 3" />
          <line x1={LEFT} y1={101} x2={RIGHT} y2={101} stroke="var(--neutral-200)" strokeDasharray="3 3" />
          {/* main polyline */}
          <polyline
            points="50,186 178,16 306,16"
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={178} cy={16} r={4} fill="var(--surface-card)" stroke="var(--orange-500)" strokeWidth={2} />

          {/* x ticks */}
          <text x={50} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">-1</text>
          <text x={114} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">0</text>
          <text x={178} y={198} fontSize={9} fill="var(--orange-600)" fontFamily="var(--font-mono)" textAnchor="middle">1</text>
          <text x={242} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">2</text>
          <text x={306} y={198} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="middle">3</text>

          {/* y ticks */}
          <text x={44} y={189} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">-1</text>
          <text x={44} y={104} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">0</text>
          <text x={44} y={19} fontSize={9} fill="var(--text-muted)" fontFamily="var(--font-mono)" textAnchor="end">1</text>

          <text x={178} y={210} fontSize={9} fill="var(--text-muted)" textAnchor="middle">Iin (×Imax)</text>
          <text x={18} y={101} fontSize={9} fill="var(--text-muted)" textAnchor="middle" transform="rotate(-90 18 101)">I_R1 (×Imax)</text>
        </svg>
        <AnnotationLayer items={annotations} />
      </div>
      <p className="text-xs text-neutral-500 text-center">
        二極體接管超額電流：R1 的電流被封頂
      </p>
    </div>
  );
}

export default function EcWeek8Q5Transfer() {
  const [sliderPos, setSliderPos] = useState(50);
  const r1 = R1_MIN * Math.pow(R1_MAX / R1_MIN, sliderPos / 100);
  const imax = 1.8 / r1;

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VoltageDrivenChart />
        <CurrentDrivenChart />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="r1-slider" className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
          <SlidersHorizontal size={14} className="text-neutral-500" />
          R1（对數刻度）：<span className="font-mono text-neutral-800">{formatOhm(r1)}</span>
        </label>
        <input
          id="r1-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="flex-1 min-w-[140px] accent-[var(--blue-600)]"
          aria-label="R1 電阻值，对數刻度，100 Ω 到 10 kΩ"
        />
        <span
          aria-live="polite"
          className="rounded-pill bg-blue-50 px-2.5 py-1 text-xs font-mono font-medium text-blue-700"
        >
          Imax = 1.8 V / R1 = {formatImax(imax)}
        </span>
      </div>
      <p className="sr-only">
        拖動 R1 滑桿時，兩張圖的折線形狀不會改変，只有縦軸代表的真實電流數值會変。
      </p>
    </div>
  );
}
