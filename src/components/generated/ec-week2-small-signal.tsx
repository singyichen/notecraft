import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Zap, Activity, TrendingUp, Gauge } from 'lucide-react'

// ── 二極體指數模型 ───────────────────────────────────────────────────────
// IS/VT 與 ec-week2-lab-iv-measurement 刻意取不同數值（那邊為量測情境用
// IS=1e-9 對齊約 0.35–0.40V 膝點），這裡沿用 ec-week2-diode-models 的
// IS=2e-14，VD=0.7V 時 I≈9.8mA，方便與同週其他元件的直覺對照。
const IS = 2e-14
const VT = 0.026

function idAmps(vd: number): number {
  return IS * (Math.exp(vd / VT) - 1)
}

function slopeAmpsPerVolt(vd: number): number {
  return (IS / VT) * Math.exp(vd / VT)
}

// ── 繪圖座標 ─────────────────────────────────────────────────────────────

const PLOT_LEFT = 64
const PLOT_RIGHT = 616
const PLOT_TOP = 24
const PLOT_BOTTOM = 260
const VD_MAX = 0.8
const I_MAX_MA = 12

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function scaleX(vd: number): number {
  return PLOT_LEFT + (vd / VD_MAX) * (PLOT_RIGHT - PLOT_LEFT)
}

function scaleY(iMa: number): number {
  return PLOT_BOTTOM - (iMa / I_MAX_MA) * (PLOT_BOTTOM - PLOT_TOP)
}

// 固定取樣的 IV 曲線，只算一次；VD 每 0.005 V 取一點，超出可視電流範圍時
// 沿 y 方向裁切（曲線本身不隨偏壓點變動）。
const CURVE_POINTS = (() => {
  const pts: string[] = []
  for (let vd = 0; vd <= VD_MAX + 1e-9; vd += 0.005) {
    const iMa = clamp(idAmps(vd) * 1000, 0, I_MAX_MA)
    pts.push(`${scaleX(vd).toFixed(1)},${scaleY(iMa).toFixed(1)}`)
  }
  return pts.join(' ')
})()

const X_TICKS = [0, 0.2, 0.4, 0.6, 0.8]
const Y_TICKS = [0, 4, 8, 12]

// ── 切線的線段裁切（Liang-Barsky）───────────────────────────────────────
// 切線在偏壓點附近陡峭時，端點很容易落在可視電流範圍之外；這裡沿切線方向
// 反解出真正跨出邊界的那個點，而不是把 y 水平夾住（那樣會扭曲切線方向）。

interface DomainPoint {
  vd: number
  iMa: number
}

function clipSegmentToDomain(
  p0: DomainPoint,
  p1: DomainPoint,
  vdMin: number,
  vdMax: number,
  iMin: number,
  iMax: number,
): [DomainPoint, DomainPoint] | null {
  const dx = p1.vd - p0.vd
  const dy = p1.iMa - p0.iMa
  let t0 = 0
  let t1 = 1
  const checks: Array<[number, number]> = [
    [-dx, p0.vd - vdMin],
    [dx, vdMax - p0.vd],
    [-dy, p0.iMa - iMin],
    [dy, iMax - p0.iMa],
  ]
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null
    } else {
      const r = q / p
      if (p < 0) {
        if (r > t1) return null
        if (r > t0) t0 = r
      } else {
        if (r < t0) return null
        if (r < t1) t1 = r
      }
    }
  }
  return [
    { vd: p0.vd + t0 * dx, iMa: p0.iMa + t0 * dy },
    { vd: p0.vd + t1 * dx, iMa: p0.iMa + t1 * dy },
  ]
}

// ── 讀數格式化（依量級切單位）───────────────────────────────────────────

function formatCurrent(amps: number): string {
  const abs = Math.abs(amps)
  if (abs < 1e-6) return `${(amps * 1e9).toFixed(2)} nA`
  if (abs < 1e-3) return `${(amps * 1e6).toFixed(2)} µA`
  if (abs < 1) return `${(amps * 1e3).toFixed(2)} mA`
  return `${amps.toFixed(3)} A`
}

function formatConductance(siemens: number): string {
  const abs = Math.abs(siemens)
  if (abs < 1e-3) return `${(siemens * 1e6).toFixed(2)} µS`
  if (abs < 1) return `${(siemens * 1e3).toFixed(2)} mS`
  return `${siemens.toFixed(3)} S`
}

function formatResistance(ohms: number): string {
  const abs = Math.abs(ohms)
  if (abs < 1) return `${(ohms * 1e3).toFixed(2)} mΩ`
  if (abs < 1e3) return `${ohms.toFixed(1)} Ω`
  if (abs < 1e6) return `${(ohms / 1e3).toFixed(2)} kΩ`
  return `${(ohms / 1e6).toFixed(2)} MΩ`
}

// ── 讀數卡片 ─────────────────────────────────────────────────────────────

interface ReadoutCardProps {
  icon: ReactNode
  label: string
  value: string
}

function ReadoutCard({ icon, label, value }: ReadoutCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-[var(--neutral-200)] bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="font-mono text-sm font-semibold text-[var(--blue-700)]">{value}</div>
    </div>
  )
}

export default function EcWeek2SmallSignal() {
  const [vd, setVd] = useState(0.55)

  const idA = idAmps(vd)
  const slopeS = slopeAmpsPerVolt(vd)
  const rdOhm = 1 / slopeS
  const idMa = idA * 1000
  const slopeMaPerV = slopeS * 1000

  const biasCx = scaleX(vd)
  const biasCy = scaleY(clamp(idMa, 0, I_MAX_MA))

  const tangent = useMemo(() => {
    const vdA = Math.max(0, vd - 0.05)
    const vdB = Math.min(VD_MAX, vd + 0.05)
    const iA = idMa + slopeMaPerV * (vdA - vd)
    const iB = idMa + slopeMaPerV * (vdB - vd)
    return clipSegmentToDomain({ vd: vdA, iMa: iA }, { vd: vdB, iMa: iB }, 0, VD_MAX, 0, I_MAX_MA)
  }, [vd, idMa, slopeMaPerV])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setVd(Number(e.target.value))
  }

  return (
    <div className="not-prose flex flex-col gap-5 max-w-2xl">
      <div className="w-full">
        <svg
          viewBox="0 0 640 340"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="二極體指數 IV 曲線與偏壓點切線"
        >
          {/* 軸線 */}
          <line
            x1={PLOT_LEFT}
            y1={PLOT_TOP}
            x2={PLOT_LEFT}
            y2={PLOT_BOTTOM}
            stroke="var(--neutral-400)"
            strokeWidth={1.5}
          />
          <line
            x1={PLOT_LEFT}
            y1={PLOT_BOTTOM}
            x2={PLOT_RIGHT}
            y2={PLOT_BOTTOM}
            stroke="var(--neutral-400)"
            strokeWidth={1.5}
          />

          {/* x 刻度 */}
          {X_TICKS.map((t) => (
            <g key={`x-${t}`}>
              <line
                x1={scaleX(t)}
                y1={PLOT_BOTTOM}
                x2={scaleX(t)}
                y2={PLOT_BOTTOM + 5}
                stroke="var(--neutral-400)"
                strokeWidth={1.5}
              />
              <text
                x={scaleX(t)}
                y={PLOT_BOTTOM + 18}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {t.toFixed(1)}
              </text>
            </g>
          ))}
          <text x={PLOT_RIGHT} y={PLOT_BOTTOM + 34} textAnchor="end" fontSize={11} fill="var(--text-muted)">
            V_D (V)
          </text>

          {/* y 刻度 */}
          {Y_TICKS.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={PLOT_LEFT - 5}
                y1={scaleY(t)}
                x2={PLOT_LEFT}
                y2={scaleY(t)}
                stroke="var(--neutral-400)"
                strokeWidth={1.5}
              />
              <text
                x={PLOT_LEFT - 10}
                y={scaleY(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {t}
              </text>
            </g>
          ))}
          <text x={PLOT_LEFT} y={PLOT_TOP - 8} textAnchor="start" fontSize={11} fill="var(--text-muted)">
            I_D (mA)
          </text>

          {/* 固定曲線 */}
          <polyline
            points={CURVE_POINTS}
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 切線段：零延遲，不套 motion */}
          {tangent && (
            <line
              x1={scaleX(tangent[0].vd)}
              y1={scaleY(tangent[0].iMa)}
              x2={scaleX(tangent[1].vd)}
              y2={scaleY(tangent[1].iMa)}
              stroke="var(--orange-500)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}

          {/* 偏壓點：零延遲，不套 motion */}
          <circle cx={biasCx} cy={biasCy} r={7} fill="var(--blue-700)" stroke="#fff" strokeWidth={2} />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="vd-bias-slider" className="text-[13px] font-medium text-[var(--text-body)]">
          偏壓點電壓 VD
        </label>
        <input
          id="vd-bias-slider"
          type="range"
          min={0.3}
          max={0.75}
          step={0.001}
          value={vd}
          onChange={handleChange}
          aria-label="偏壓點電壓拖曳滑桿"
          className="w-full accent-[var(--blue-600)]"
        />
      </div>

      <div className="grid grid-cols-4 gap-3" aria-live="polite">
        <ReadoutCard icon={<Zap size={14} color="currentColor" />} label="VD" value={`${vd.toFixed(3)} V`} />
        <ReadoutCard icon={<Activity size={14} color="currentColor" />} label="ID" value={formatCurrent(idA)} />
        <ReadoutCard
          icon={<TrendingUp size={14} color="currentColor" />}
          label="斜率"
          value={formatConductance(slopeS)}
        />
        <ReadoutCard icon={<Gauge size={14} color="currentColor" />} label="r_d" value={formatResistance(rdOhm)} />
      </div>

      <p className="text-xs text-[var(--text-muted)]">r_d ≈ V_T ⁄ I_D</p>
    </div>
  )
}
