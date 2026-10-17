import { useMemo, useState } from 'react'

// ── physics（Ch 4 投影片）──────────────────────────────────────────────────
// p.28：主動區 I_C 與 V_CE 無關，只是 V_BE 的指數函數。
// p.29 Example 4-8：I_S = 5e-17 A，V_BE = 700/750/800 mV → 24.6 µA / 169 µA / 1.153 mA。
// p.30：g_m ≜ dI_C/dV_BE = I_C/V_T。p.31：I_C = 1 mA、V_T = 26 mV → g_m = 38.5 mS（滑桿預設點）。
const VT = 0.026 // V，熱電壓（p.31）
const IS = 5e-17 // A，p.29 Example 4-8 所用飽和電流

/** V_BE(I_C)，I_C 以安培為單位（p.30 指數方程式反解） */
function vbeOf(icAmp: number): number {
  return VT * Math.log(icAmp / IS)
}

/** I_C(V_BE)，回傳安培（p.28 I_C ≈ I_S·exp(V_BE/V_T)） */
function icOf(vbe: number): number {
  return IS * Math.exp(vbe / VT)
}

// ── number formatting（禁止 emoji） ─────────────────────────────────────
interface UnitFormat {
  mantissa: string
  unit: string
}

/** 依數值大小自動選 pA / nA / μA / mA，取 mantissa 落在 [1, 1000) 的最大單位 */
function toAutoUnit(value: number): UnitFormat {
  const abs = Math.abs(value)
  if (abs >= 1e-3) return { mantissa: (value / 1e-3).toFixed(2), unit: 'mA' }
  if (abs >= 1e-6) return { mantissa: (value / 1e-6).toFixed(2), unit: 'μA' }
  if (abs >= 1e-9) return { mantissa: (value / 1e-9).toFixed(2), unit: 'nA' }
  return { mantissa: (value / 1e-12).toFixed(2), unit: 'pA' }
}

function formatAutoUnit(value: number): string {
  const { mantissa, unit } = toAutoUnit(value)
  return `${mantissa} ${unit}`
}

// ── SVG 繪圖範圍 ────────────────────────────────────────────────────────
const X_MIN = 0.675 // V_BE 下界 (V)
const X_MAX = 0.82 // V_BE 上界 (V)
const Y_MAX_MA = 2.3 // I_C 上界 (mA)
const PLOT_LEFT = 64
const PLOT_RIGHT = 620
const PLOT_TOP = 24
const PLOT_BOTTOM = 260

function scaleX(vbe: number): number {
  return PLOT_LEFT + ((vbe - X_MIN) / (X_MAX - X_MIN)) * (PLOT_RIGHT - PLOT_LEFT)
}

function scaleY(icMa: number): number {
  return PLOT_BOTTOM - (icMa / Y_MAX_MA) * (PLOT_BOTTOM - PLOT_TOP)
}

/** 指數曲線取樣，I_C 超過 Y_MAX_MA 即停止繪製 */
function buildCurvePoints(): Array<{ x: number; y: number }> {
  const STEPS = 140
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= STEPS; i++) {
    const vbe = X_MIN + (i / STEPS) * (X_MAX - X_MIN)
    const icMa = icOf(vbe) * 1e3
    if (icMa > Y_MAX_MA) break
    points.push({ x: scaleX(vbe), y: scaleY(icMa) })
  }
  return points
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** Example 4-8 的三個參考點（p.29），單位 mA */
const EXAMPLE_POINTS: Array<{ vbe: number; icMa: number }> = [
  { vbe: 0.7, icMa: 0.0246 },
  { vbe: 0.75, icMa: 0.169 },
  { vbe: 0.8, icMa: 1.153 },
]

const ICS_MIN_MA = 0.02
const ICS_MAX_MA = 2.0
const ICS_DEFAULT_MA = 1.0 // p.31：I_C = 1 mA、g_m = 38.5 mS

// 教學用示範擺幅，非講義給定數值
const SWING_VOLTS_PEAK = 0.005 // ±5 mV

export default function EcWeek4Gm() {
  const [icBiasMa, setIcBiasMa] = useState(ICS_DEFAULT_MA)

  const curvePoints = useMemo(() => buildCurvePoints(), [])
  const curvePath = useMemo(() => pointsToPath(curvePoints), [curvePoints])

  const icBiasAmp = icBiasMa * 1e-3
  const vbeQ = vbeOf(icBiasAmp)
  const gmMaPerV = icBiasMa / VT // p.30：g_m = I_C/V_T（mA/V 數值與 mS 相同）
  const deltaIcPeakToPeakAmp = gmMaPerV * 1e-3 * 2 * SWING_VOLTS_PEAK

  // 切線端點：g_m 為斜率，I_C = 0 處精確落在 vbeQ − V_T（p.30 的線性近似）
  let leftVbe = vbeQ - VT
  let leftIcMa = 0
  if (leftVbe < X_MIN) {
    leftVbe = X_MIN
    leftIcMa = icBiasMa + gmMaPerV * (leftVbe - vbeQ)
  }

  let rightVbe = vbeQ + (Y_MAX_MA - icBiasMa) / gmMaPerV
  let rightIcMa = Y_MAX_MA
  if (rightVbe > X_MAX) {
    rightVbe = X_MAX
    rightIcMa = icBiasMa + gmMaPerV * (rightVbe - vbeQ)
  }

  const qX = scaleX(vbeQ)
  const qY = scaleY(icBiasMa)
  const tangentX1 = scaleX(leftVbe)
  const tangentY1 = scaleY(leftIcMa)
  const tangentX2 = scaleX(rightVbe)
  const tangentY2 = scaleY(rightIcMa)

  const yTicks = [0, 0.5, 1, 1.5, 2]
  const xTicks = [0.7, 0.75, 0.8]

  return (
    <div className="not-prose flex flex-col gap-4">
      <svg
        viewBox="0 0 640 300"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`I_C–V_BE 指數曲線，偏壓點在 V_BE = ${vbeQ.toFixed(3)} V、I_C = ${icBiasMa.toFixed(
          2
        )} mA，該點切線斜率（g_m）為 ${gmMaPerV.toFixed(1)} mA/V`}
      >
        {/* 格線 */}
        {yTicks.map((t) => (
          <line
            key={`gy-${t}`}
            x1={PLOT_LEFT}
            y1={scaleY(t)}
            x2={PLOT_RIGHT}
            y2={scaleY(t)}
            stroke="var(--neutral-200)"
            strokeWidth={1}
          />
        ))}
        {xTicks.map((t) => (
          <line
            key={`gx-${t}`}
            x1={scaleX(t)}
            y1={PLOT_TOP}
            x2={scaleX(t)}
            y2={PLOT_BOTTOM}
            stroke="var(--neutral-200)"
            strokeWidth={1}
          />
        ))}

        {/* 軸線 */}
        <line
          x1={PLOT_LEFT}
          y1={PLOT_BOTTOM}
          x2={PLOT_RIGHT}
          y2={PLOT_BOTTOM}
          stroke="var(--neutral-300)"
          strokeWidth={1.5}
        />
        <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} stroke="var(--neutral-300)" strokeWidth={1.5} />

        {/* 刻度文字 */}
        {yTicks.map((t) => (
          <text
            key={`ylabel-${t}`}
            x={PLOT_LEFT - 8}
            y={scaleY(t) + 3}
            textAnchor="end"
            fontSize={11}
            fill="var(--neutral-500)"
          >
            {t.toFixed(1)}
          </text>
        ))}
        {xTicks.map((t) => (
          <text
            key={`xlabel-${t}`}
            x={scaleX(t)}
            y={PLOT_BOTTOM + 16}
            textAnchor="middle"
            fontSize={11}
            fill="var(--neutral-500)"
          >
            {t.toFixed(2)}
          </text>
        ))}

        {/* 軸標題 */}
        <text x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={292} textAnchor="middle" fontSize={12} fill="var(--neutral-600)">
          V<tspan baselineShift="sub" fontSize={9}>BE</tspan> (V)
        </text>
        <text
          x={16}
          y={(PLOT_TOP + PLOT_BOTTOM) / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--neutral-600)"
          transform={`rotate(-90 16 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
        >
          I<tspan baselineShift="sub" fontSize={9}>C</tspan> (mA)
        </text>

        {/* 指數曲線 */}
        <path d={curvePath} fill="none" stroke="var(--blue-500)" strokeWidth={2} />

        {/* Example 4-8 參考點 */}
        {EXAMPLE_POINTS.map((p) => (
          <circle key={`ex-${p.vbe}`} cx={scaleX(p.vbe)} cy={scaleY(p.icMa)} r={3} fill="var(--neutral-400)" />
        ))}
        <text
          x={scaleX(EXAMPLE_POINTS[0].vbe) - 6}
          y={scaleY(EXAMPLE_POINTS[0].icMa) - 8}
          textAnchor="end"
          fontSize={11}
          fill="var(--neutral-500)"
        >
          Example 4-8
        </text>

        {/* 切線 */}
        <line x1={tangentX1} y1={tangentY1} x2={tangentX2} y2={tangentY2} stroke="var(--orange-500)" strokeWidth={2} />

        {/* Q 點虛線落到兩軸 */}
        <line
          x1={qX}
          y1={qY}
          x2={qX}
          y2={PLOT_BOTTOM}
          stroke="var(--neutral-400)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line
          x1={PLOT_LEFT}
          y1={qY}
          x2={qX}
          y2={qY}
          stroke="var(--neutral-400)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={qX} cy={qY} r={5} fill="var(--neutral-900)" stroke="var(--surface-card)" strokeWidth={2} />
      </svg>

      {/* 偏壓電流滑桿 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-body)]">集極偏壓電流 I<sub>C</sub></span>
          <span className="font-semibold text-[var(--blue-600)]">{icBiasMa.toFixed(2)} mA</span>
        </div>
        <input
          type="range"
          min={ICS_MIN_MA}
          max={ICS_MAX_MA}
          step={0.01}
          value={icBiasMa}
          onChange={(e) => setIcBiasMa(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="集極偏壓電流 I_C（mA）"
        />
      </div>

      {/* 讀數卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">目前集極電流 I<sub>C</sub></div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{icBiasMa.toFixed(2)} mA</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">切線斜率 g<sub>m</sub></div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{gmMaPerV.toFixed(1)} mA/V</div>
          <div className="mt-0.5 text-xs text-[var(--neutral-500)]">= {gmMaPerV.toFixed(1)} 毫西門子 mS</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">±5 mV 擺幅下的 I<sub>C</sub> 擺幅</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{formatAutoUnit(deltaIcPeakToPeakAmp)}</div>
          <div className="mt-0.5 text-xs text-[var(--neutral-500)]">峰對峰，教學示範用擺幅</div>
        </div>
      </div>

      {/* 結論 */}
      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--blue-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        偏壓電流開到 {icBiasMa.toFixed(2)} mA，曲線斜率（也就是 g<sub>m</sub>）達到 {gmMaPerV.toFixed(1)} mA/V——電流越大、曲線越陡、轉電壓為電流的能力越強，但代價是耗電也跟著變大。
      </div>
    </div>
  )
}
