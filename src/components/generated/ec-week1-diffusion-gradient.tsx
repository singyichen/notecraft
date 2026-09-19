import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'

type Mode = 'linear' | 'exponential'

// ── physics（全部正規化：L = 1、N = 1） ─────────────────────────────────────

/** 指數衰減長度，取一個能在 [0,1] 區間內明顯衰減的值 */
const LD = 0.3

interface DataPoint {
  x: number
  n: number
  jAbs: number
}

const X_MIN = 0
const X_MAX = 1
const X_STEP = 0.02

/** n(x)：線性態從 1 直線降到 0；指數態 n = exp(-x/Ld) */
function concentrationAt(mode: Mode, x: number): number {
  return mode === 'linear' ? 1 - x : Math.exp(-x / LD)
}

/**
 * |Jn(x)|：正比於 |dn/dx|。
 * 線性態斜率固定 = 1/L → 電流處處相等（常數 1）。
 * 指數態 dn/dx 的絕對值正比於 n(x) 本身，因此曲線形狀與 n(x) 相同
 * ——這是刻意保留的物理事實（擴散電流看斜率，指數分布的斜率又正比於自身），不是誤植。
 */
function currentAt(mode: Mode, x: number): number {
  return mode === 'linear' ? 1 : Math.exp(-x / LD)
}

function buildData(mode: Mode): DataPoint[] {
  const points: DataPoint[] = []
  for (let i = 0; i <= Math.round((X_MAX - X_MIN) / X_STEP); i++) {
    const x = X_MIN + i * X_STEP
    points.push({ x, n: concentrationAt(mode, x), jAbs: currentAt(mode, x) })
  }
  return points
}

function xAxisTick(value: number): string {
  return value === 0 ? '0' : 'L'
}

function nAxisTick(value: number): string {
  return value === 0 ? '0' : 'N'
}

function jAxisTick(value: number): string {
  return value === 0 ? '0' : 'J₀'
}

export default function EcWeek1DiffusionGradient() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const [mode, setMode] = useState<Mode>('linear')
  const [xPos, setXPos] = useState(0.3)

  const data = useMemo(() => buildData(mode), [mode])

  const localSlopePercent = Math.round(currentAt(mode, xPos) * 100)
  const localCurrentPercent = localSlopePercent

  return (
    <div className="not-prose flex flex-col gap-4">
      {/* 切換鈕 */}
      <div className="inline-flex w-fit gap-1 rounded-[var(--radius-md)] bg-[var(--neutral-100)] p-1">
        <button
          type="button"
          onClick={() => setMode('linear')}
          className="rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            mode === 'linear'
              ? { background: 'var(--blue-500)', color: '#fff' }
              : { background: 'transparent', color: 'var(--neutral-700)' }
          }
        >
          線性梯度
        </button>
        <button
          type="button"
          onClick={() => setMode('exponential')}
          className="rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            mode === 'exponential'
              ? { background: 'var(--blue-500)', color: '#fff' }
              : { background: 'transparent', color: 'var(--neutral-700)' }
          }
        >
          指數梯度
        </button>
      </div>

      {/* 兩張並排小圖，固定 2 欄、總寬 <= 640px，不用 breakpoint */}
      <div className="grid max-w-[620px] grid-cols-2 gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--orange-600)]">
            <span className="inline-block h-[9px] w-[9px] rounded-sm bg-[var(--orange-500)]" />
            電子濃度 n(x)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 32 }}>
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={xAxisTick}
                tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
              />
              <YAxis
                domain={[0, 1.05]}
                ticks={[0, 1]}
                tickFormatter={nAxisTick}
                tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
              />
              <Area
                dataKey="n"
                stroke="var(--orange-500)"
                fill="var(--orange-500)"
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={!shouldReduceMotion}
                animationDuration={300}
                animationEasing="ease-out"
              />
              <ReferenceLine x={xPos} stroke="var(--neutral-400)" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--blue-500)]">
            <span className="inline-block h-[9px] w-[9px] rounded-sm bg-[var(--blue-500)]" />
            擴散電流 |J<sub>n</sub>(x)|
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 32 }}>
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={xAxisTick}
                tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
              />
              <YAxis
                domain={[0, 1.05]}
                ticks={[0, 1]}
                tickFormatter={jAxisTick}
                tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
              />
              <Line
                dataKey="jAbs"
                stroke="var(--blue-500)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!shouldReduceMotion}
                animationDuration={300}
                animationEasing="ease-out"
              />
              <ReferenceLine x={xPos} stroke="var(--neutral-400)" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* x 位置 slider */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-body)]">位置 x / L</span>
          <span className="font-semibold text-[var(--blue-600)]">{Math.round(xPos * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={xPos}
          onChange={(e) => setXPos(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="位置 x / L"
        />
      </div>

      {/* 讀數卡 */}
      <div className="grid max-w-[620px] grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--surface-card)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">位置 x/L</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{Math.round(xPos * 100)}%</div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--surface-card)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">當地斜率 |dn/dx|</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{localSlopePercent}%</div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--surface-card)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">當地電流 |J<sub>n</sub>|</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{localCurrentPercent}%</div>
        </div>
      </div>

      {/* 固定結論 */}
      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--blue-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        電流看的是斜率（dn/dx），不是高度（n）——線性分布斜率處處相同，所以電流處處相等。
      </div>
    </div>
  )
}
