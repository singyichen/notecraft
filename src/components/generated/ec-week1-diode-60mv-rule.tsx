import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
} from 'recharts'

// ── physics ──────────────────────────────────────────────────────────────
// 曲線公式用「單一接面」的 IS（取自投影片 Example 2-17 的單一接面值）。
// 注意：投影片 Example 2-18 的兩個參考點（0.3V→3.63pA、0.8V→816μA）是「並聯」
// 後的官方值（相當於 2·IS），與這裡的公式 IS 脫鉤——那兩點只當固定標註用，
// 不拿來反推或校正 IS，避免把兩種不同電路條件的數字混在一起。
const IS = 1.77e-17 // A，單一接面飽和電流
const VT = 0.026 // V，熱電壓（26 mV）

function diodeCurrent(vd: number): number {
  return IS * (Math.exp(vd / VT) - 1)
}

interface DataPoint {
  vd: number
  id: number
}

const VD_MIN = 0.01 // 刻意跳過 0，避免 ID = 0 在 log 軸上無法繪出
const VD_MAX = 0.85
const VD_STEP = 0.01

function buildData(): DataPoint[] {
  const points: DataPoint[] = []
  for (let i = 0; i <= Math.round((VD_MAX - VD_MIN) / VD_STEP); i++) {
    const vd = Math.round((VD_MIN + i * VD_STEP) * 1000) / 1000
    points.push({ vd, id: diodeCurrent(vd) })
  }
  return points
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

/** log 軸的固定刻度：以 pA/nA/μA/mA 十的整數次方為主 */
const LOG_TICKS = [1e-12, 1e-9, 1e-6, 1e-3]

function formatLogTick(value: number): string {
  return formatAutoUnit(value)
}

// ── component ────────────────────────────────────────────────────────────

type ScaleMode = 'linear' | 'log'

export default function EcWeek1DiodeMvRule() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear')
  const [vd, setVd] = useState(0.7)

  const data = useMemo(() => buildData(), [])

  const currentId = diodeCurrent(vd)
  const idAfterBump = diodeCurrent(vd + 0.06)

  return (
    <div className="not-prose flex flex-col gap-4">
      {/* 刻度切換 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--neutral-600)]">Y 軸刻度</span>
        <div className="inline-flex rounded-[var(--radius-pill,9999px)] bg-[var(--neutral-100)] p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setScaleMode('linear')}
            aria-pressed={scaleMode === 'linear'}
            className="rounded-[var(--radius-pill,9999px)] px-3 py-1 font-medium transition-colors"
            style={
              scaleMode === 'linear'
                ? { background: 'var(--blue-500)', color: '#fff' }
                : { color: 'var(--neutral-700)' }
            }
          >
            線性刻度
          </button>
          <button
            type="button"
            onClick={() => setScaleMode('log')}
            aria-pressed={scaleMode === 'log'}
            className="rounded-[var(--radius-pill,9999px)] px-3 py-1 font-medium transition-colors"
            style={
              scaleMode === 'log'
                ? { background: 'var(--blue-500)', color: '#fff' }
                : { color: 'var(--neutral-700)' }
            }
          >
            對數刻度
          </button>
        </div>
      </div>

      {/* 圖表 */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart key={scaleMode} data={data} margin={{ top: 16, right: 16, bottom: 28, left: 64 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
          <XAxis
            dataKey="vd"
            type="number"
            domain={[0, 0.85]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8]}
            tickFormatter={(v: number) => `${v.toFixed(1)} V`}
            tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
            label={{ value: 'VD (V)', position: 'insideBottom', offset: -18, fill: 'var(--neutral-600)', fontSize: 12 }}
          />
          <YAxis
            scale={scaleMode === 'log' ? 'log' : 'linear'}
            domain={scaleMode === 'log' ? [1e-13, 'auto'] : [0, 'auto']}
            ticks={scaleMode === 'log' ? LOG_TICKS : undefined}
            tickFormatter={formatLogTick}
            allowDataOverflow
            tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
            width={56}
            label={{ value: 'ID', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--neutral-600)', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [formatAutoUnit(value), 'ID']}
            labelFormatter={(label: number) => `VD = ${label.toFixed(2)} V`}
            contentStyle={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--neutral-200)',
              fontSize: 12,
            }}
          />
          <Line
            dataKey="id"
            stroke="var(--blue-500)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <ReferenceLine x={vd} stroke="var(--neutral-400)" strokeDasharray="3 3" />
          <ReferenceDot
            x={0.3}
            y={3.63e-12}
            r={4}
            fill="var(--orange-500)"
            stroke="#fff"
            strokeWidth={1.5}
            isFront
            label={{ value: 'Ex 2-18', position: 'top', fill: 'var(--orange-600)', fontSize: 11 }}
          />
          <ReferenceDot x={0.8} y={8.16e-4} r={4} fill="var(--orange-500)" stroke="#fff" strokeWidth={1.5} isFront />
          <ReferenceDot x={vd} y={currentId} r={5} fill="var(--blue-950)" stroke="#fff" strokeWidth={2} isFront />
        </LineChart>
      </ResponsiveContainer>

      {/* VD slider */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-body)]">二極體電壓 VD</span>
          <span className="font-semibold text-[var(--blue-600)]">{vd.toFixed(2)} V</span>
        </div>
        <input
          type="range"
          min={0.3}
          max={0.85}
          step={0.01}
          value={vd}
          onChange={(e) => setVd(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="二極體電壓 VD（V）"
        />
      </div>

      {/* 數值卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">目前 VD</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{vd.toFixed(2)} V</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">目前 ID</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{formatAutoUnit(currentId)}</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">+60 mV 後的 ID</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">
            {formatAutoUnit(idAfterBump)}
            <span className="ml-1 text-xs font-normal text-[var(--neutral-500)]">（≈ 10 倍）</span>
          </div>
        </div>
      </div>

      {/* 固定小字與結論 */}
      <div className="text-xs text-[var(--neutral-600)]">
        電壓只差 500 mV，電流差 8 個數量級（Example 2-18：300 mV → 3.63 pA，800 mV → 816 μA）。
      </div>
      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--blue-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        指數曲線在對數座標下是直線，斜率固定為 VT·ln10 ≈ 60 mV／decade——這是估算二極體工作點最常用的捷徑。
      </div>
    </div>
  )
}
