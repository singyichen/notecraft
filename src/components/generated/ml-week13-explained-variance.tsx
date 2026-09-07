/**
 * 核心洞察：不用先決定要留幾維，看累積解釋變異在哪裡跨過 90%–95% 再決定。
 * 長條是「這一個主成分自己貢獻多少」，階梯線是「加總到目前為止貢獻多少」——
 * 兩條 90%／95% 參考線標出「大概留幾個就夠」的甜蜜點：這組資料第 7 個主成分
 * 跨過 90%，第 8 個跨過 95%，之後每多留一個主成分邊際貢獻都很小。
 */

import type { CSSProperties } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'

interface VarianceDatum {
  pc: number
  individual: number
  cumulative: number
}

// 自行編寫的一組遞減比例，共 10 個主成分
const INDIVIDUAL = [0.32, 0.21, 0.14, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.015]
const CUMULATIVE = [0.32, 0.53, 0.67, 0.77, 0.84, 0.89, 0.93, 0.96, 0.985, 1.0]

const DATA: VarianceDatum[] = INDIVIDUAL.map((individual, i) => ({
  pc: i + 1,
  individual,
  cumulative: CUMULATIVE[i],
}))

// 累積解釋變異首次達到 90% / 95% 的主成分（依上方資料手動核對，非動態搜尋，避免臨界值誤判）
const FIRST_90_PC = 7
const FIRST_95_PC = 8

function pctLabel(v: number): string {
  return `${Math.round(v * 100)}%`
}

function pcTick(v: number): string {
  return `PC${v}`
}

function ExplainedVarianceTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload as VarianceDatum | undefined
  if (!datum) return null

  return (
    <div
      className="rounded-md px-3 py-2 text-xs leading-snug"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--text-body)',
        maxWidth: 150,
      }}
    >
      <p className="font-semibold" style={{ color: 'var(--text-strong)' }}>
        第 {datum.pc} 個主成分
      </p>
      <p>個別貢獻 {pctLabel(datum.individual)}</p>
      <p>累積貢獻 {pctLabel(datum.cumulative)}</p>
    </div>
  )
}

interface LegendItemProps {
  swatchStyle: CSSProperties
  label: string
}

function LegendItem({ swatchStyle, label }: LegendItemProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-body)' }}>
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={swatchStyle} />
      {label}
    </span>
  )
}

export default function MlWeek13ExplainedVariance() {
  return (
    <div className="not-prose w-full max-w-2xl mx-auto space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        橫軸：主成分（PC1–PC10）　縱軸：解釋變異比例
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={DATA} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="pc"
            tickFormatter={pcTick}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={pctLabel}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={ExplainedVarianceTooltip} cursor={{ fill: 'var(--surface-sunken)' }} />
          <ReferenceLine
            y={0.9}
            stroke="var(--warning-500)"
            strokeDasharray="4 3"
            label={{ value: '90%', position: 'insideTopRight', fontSize: 10, fill: 'var(--warning-500)' }}
          />
          <ReferenceLine
            y={0.95}
            stroke="var(--danger-500)"
            strokeDasharray="4 3"
            label={{ value: '95%', position: 'insideTopRight', fontSize: 10, fill: 'var(--danger-500)' }}
          />
          <ReferenceDot
            x={FIRST_90_PC}
            y={CUMULATIVE[FIRST_90_PC - 1]}
            r={5}
            fill="var(--warning-500)"
            stroke="var(--surface-card)"
            strokeWidth={1.5}
          />
          <ReferenceDot
            x={FIRST_95_PC}
            y={CUMULATIVE[FIRST_95_PC - 1]}
            r={5}
            fill="var(--danger-500)"
            stroke="var(--surface-card)"
            strokeWidth={1.5}
          />
          <Bar dataKey="individual" fill="var(--blue-500)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line
            type="stepAfter"
            dataKey="cumulative"
            stroke="var(--orange-600)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--orange-600)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        <LegendItem swatchStyle={{ background: 'var(--blue-500)' }} label="長條：個別解釋變異" />
        <LegendItem swatchStyle={{ background: 'var(--orange-600)' }} label="階梯線：累積解釋變異" />
        <LegendItem swatchStyle={{ background: 'var(--warning-500)' }} label="第 7 個成分跨過 90%" />
        <LegendItem swatchStyle={{ background: 'var(--danger-500)' }} label="第 8 個成分跨過 95%" />
      </div>
    </div>
  )
}
