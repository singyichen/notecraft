import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Radio } from 'lucide-react';

// P 側 / 電洞語意的橘色刻意不用專案的 --orange-* token：該 token 字面色其實是 emerald
// 綠（見 tokens.css 的歷史命名說明），與筆記正文的橘色語意衝突，故沿用
// ec-week1-pn-junction.tsx 的慣例，改用 Tailwind 內建、未被本專案覆寫的 amber-500 / amber-600。

// --- 固定參數（Example 2-15 / 2-16）---
const V0 = 0.73; // 內建電位 (V)
const CJ0 = 0.265; // 零偏壓接面電容密度 (fF/um^2)
const AREA = 2000; // 接面面積 (um^2)
const L_NH = 11.9; // 電感 (nH)

interface CapVcoResult {
  /** 逆偏電壓 VR，負值 (V) */
  vr: number;
  /** 接面電容密度 (fF/um^2) */
  cj: number;
  /** 總電容 (fF) */
  c: number;
  /** 共振頻率 (GHz) */
  fresGHz: number;
  /** 空乏區寬度佔長條總寬的百分比，clamp 在 30-60 */
  depletionPct: number;
}

/**
 * 由逆偏深度 magnitude（0-2，正值）推算接面電容與 LC 共振頻率。
 *
 * 單位換算：
 * - fF -> F：乘 1e-15
 * - nH -> H：乘 1e-9
 * - Hz -> GHz：除 1e9
 *
 * Cj(VR) = Cj0 / sqrt(1 - VR/V0)          [VR <= 0]
 * C(VR)  = Cj(VR) * AREA                  [fF]
 * fres   = 1 / (2*pi*sqrt(L * C))         [Hz，L/C 換算成 H / F 後代入]
 *
 * 端點驗算：magnitude=0 -> Cj=0.265, C=530fF, fres~2.00GHz
 *           magnitude=2 -> Cj~0.137, C~274fF, fres~2.79GHz
 */
function calcCapVco(magnitude: number): CapVcoResult {
  const vr = -magnitude;
  const depletionRatio = Math.sqrt(1 - vr / V0);
  const cj = CJ0 / depletionRatio; // fF/um^2
  const c = cj * AREA; // fF

  const cFarad = c * 1e-15; // fF -> F
  const lHenry = L_NH * 1e-9; // nH -> H
  const fresHz = 1 / (2 * Math.PI * Math.sqrt(lHenry * cFarad));
  const fresGHz = fresHz / 1e9; // Hz -> GHz

  const depletionPct = Math.min(60, Math.max(30, 30 * depletionRatio));

  return { vr, cj, c, fresGHz, depletionPct };
}

// 頻率標尺：x 40 對應 2.0 GHz，x 600 對應 2.8 GHz（560px / 0.8GHz）
const SCALE_X_MIN = 40;
const SCALE_X_MAX = 600;
const SCALE_GHZ_MIN = 2.0;
const SCALE_GHZ_MAX = 2.8;

function ghzToX(ghz: number): number {
  const ratio = (ghz - SCALE_GHZ_MIN) / (SCALE_GHZ_MAX - SCALE_GHZ_MIN);
  const x = SCALE_X_MIN + ratio * (SCALE_X_MAX - SCALE_X_MIN);
  return Math.min(SCALE_X_MAX, Math.max(SCALE_X_MIN, x));
}

const GHZ_TICKS = [2.0, 2.2, 2.4, 2.6, 2.8];

// 投影片參考端點（不隨 slider 動）：VR=0 -> 2.00GHz、VR=-2V -> 2.78GHz
const REFERENCE_POINTS = [
  { magnitude: 0, label: 'VR=0 → 2.00 GHz' },
  { magnitude: 2, label: 'VR=−2V → 2.78 GHz' },
];

export default function EcWeek1JunctionCapVco() {
  const [magnitude, setMagnitude] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.3;

  const result = useMemo(() => calcCapVco(magnitude), [magnitude]);
  const sidePct = (100 - result.depletionPct) / 2;
  const indicatorX = ghzToX(result.fresGHz);

  const referenceXs = useMemo(
    () => REFERENCE_POINTS.map((p) => ({ ...p, x: ghzToX(calcCapVco(p.magnitude).fresGHz) })),
    [],
  );

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* 參數來源列 */}
      <div className="text-[11px] text-neutral-400">
        參數（Example 2-15／2-16）：V0 = 730 mV、Cj0 = 0.265 fF/μm²、面積 = 2000
        μm²、L = 11.9 nH
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>逆偏深度 |VR|</span>
          <span className="font-medium text-neutral-800">
            VR = −{magnitude.toFixed(1)} V
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={magnitude}
          onChange={(e) => setMagnitude(Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="逆偏深度"
        />
      </div>

      {/* 接面長條 */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full h-16 rounded-xl overflow-hidden flex border border-neutral-200">
          <motion.div
            className="h-full bg-blue-500"
            animate={{ width: `${sidePct}%` }}
            transition={{ duration }}
          />
          <motion.div
            className="h-full bg-neutral-400"
            animate={{ width: `${result.depletionPct}%` }}
            transition={{ duration }}
          />
          <motion.div
            className="h-full bg-amber-500"
            animate={{ width: `${sidePct}%` }}
            transition={{ duration }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-600">N 型（電子）</span>
          <span className="text-neutral-500">空乏區（介電層）</span>
          <span className="text-amber-600">P 型（電洞）</span>
        </div>
      </div>

      {/* 數值卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500 mb-1">接面電容 Cⱼ</div>
          <div className="text-sm font-medium text-neutral-800">
            {result.cj.toFixed(3)} fF/μm²
          </div>
          <div className="mt-1 text-[10px] text-neutral-400">
            Cⱼ = Cⱼ₀ / √(1 − VR/V0)
          </div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500 mb-1">總電容 C</div>
          <div className="text-sm font-medium text-neutral-800">{result.c.toFixed(0)} fF</div>
          <div className="mt-1 text-[10px] text-neutral-400">C = Cⱼ × 2000 μm²</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <Radio size={14} className="text-blue-600" />
            共振頻率 fres
          </div>
          <div className="text-sm font-medium text-neutral-800">
            {result.fresGHz.toFixed(2)} GHz
          </div>
          <div className="mt-1 text-[10px] text-neutral-400">
            fres = 1 / (2π√(LC))，L = 11.9 nH
          </div>
        </div>
      </div>

      {/* 頻率標尺 */}
      <div className="flex flex-col gap-1">
        <svg
          viewBox="0 0 640 100"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="共振頻率標尺"
        >
          <line
            x1={SCALE_X_MIN}
            y1={50}
            x2={SCALE_X_MAX}
            y2={50}
            stroke="var(--neutral-300)"
            strokeWidth={2}
          />
          {GHZ_TICKS.map((ghz) => (
            <line
              key={ghz}
              x1={ghzToX(ghz)}
              y1={44}
              x2={ghzToX(ghz)}
              y2={56}
              stroke="var(--neutral-300)"
              strokeWidth={2}
            />
          ))}
          {referenceXs.map((ref) => (
            <g key={ref.magnitude}>
              <line
                x1={ref.x}
                y1={20}
                x2={ref.x}
                y2={80}
                stroke="var(--neutral-400)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <circle cx={ref.x} cy={50} r={3} fill="var(--neutral-400)" />
            </g>
          ))}
          <motion.circle
            r={6}
            fill="var(--blue-600)"
            cy={50}
            animate={{ cx: indicatorX }}
            transition={{ duration }}
          />
        </svg>
        <div className="relative h-4 text-[10px] text-neutral-500">
          {GHZ_TICKS.map((ghz) => (
            <span
              key={ghz}
              className="absolute -translate-x-1/2"
              style={{ left: `${(ghzToX(ghz) / 640) * 100}%` }}
            >
              {ghz.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative h-4 text-[11px] text-neutral-500">
          {referenceXs.map((ref) => (
            <span
              key={ref.magnitude}
              className={`absolute ${ref.magnitude === 0 ? '' : '-translate-x-full'}`}
              style={{ left: `${(ref.x / 640) * 100}%` }}
            >
              {ref.label}
            </span>
          ))}
        </div>
      </div>

      {/* 結論列 */}
      <div className="rounded-md bg-blue-50 text-blue-800 text-sm p-3">
        空乏區就是電容的介電層——逆偏越深、板間距越寬、電容越小、頻率越高，手機頻率合成器就靠這招調台。
      </div>
    </div>
  );
}
