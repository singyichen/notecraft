/**
 * 核心洞察：格狀搜尋的浪費不在「試得不夠多」，而在它被迫在每個維度上都試
 * 同樣多次——但真正重要的超參數通常只有少數幾個。這裡固定 25 個點的身分
 * （id 0..24），切換三個分頁時同一批 motion.circle 被重新排布到新策略的
 * 座標／半徑／顏色：格狀把預算平均灑在 5×5 網格；隨機在 C（真正重要的那
 * 一軸）取樣密度高得多；逐次減半則進一步把資源不平均地導向表現好的候選。
 * 三軸座標全部寫死為字面陣列，不使用 Math.random / Date.now。
 */

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight } from 'lucide-react'

type StrategyId = 'grid' | 'random' | 'halving'
type HalvingRound = 1 | 2 | 3

interface LatticePoint {
  c: number
  g: number
}

interface PointVisual {
  cExp: number
  gExp: number
  r: number
  opacity: number
  fill: string
  stroke: string
}

// ──────────────────────────────────────────────────────────────
// 座標系：兩軸皆 log 尺度，指數範圍 -3..3
// ──────────────────────────────────────────────────────────────

const PLOT_X0 = 48
const PLOT_X1 = 624
const PLOT_Y0 = 16
const PLOT_Y1 = 364

function logToX(exp: number): number {
  return PLOT_X0 + ((exp + 3) / 6) * (PLOT_X1 - PLOT_X0)
}

function logToY(exp: number): number {
  return PLOT_Y1 - ((exp + 3) / 6) * (PLOT_Y1 - PLOT_Y0)
}

const BEST_BAND_MIN_EXP = 1.5
const BEST_BAND_MAX_EXP = 3

const TICKS: { exp: number; label: string }[] = [
  { exp: -3, label: '0.001' },
  { exp: -1.5, label: '0.03' },
  { exp: 0, label: '1' },
  { exp: 1.5, label: '30' },
  { exp: 3, label: '1000' },
]

// ──────────────────────────────────────────────────────────────
// 三種策略的固定座標（字面陣列，人工排定，非亂數）
// ──────────────────────────────────────────────────────────────

const AXIS_LEVELS: number[] = [-3, -1.5, 0, 1.5, 3]

// 格狀搜尋：5x5 規則交叉，id = i*5+j（i 對應 C、j 對應 gamma）
const GRID_POINTS: LatticePoint[] = Array.from({ length: 25 }, (_, id) => ({
  c: AXIS_LEVELS[Math.floor(id / 5)],
  g: AXIS_LEVELS[id % 5],
}))

// 隨機搜尋：同 25 個點身分，C 指數取 25 個相異值（覆蓋 -3..3），
// gamma 指數各自獨立。座標手動排定、看似散亂但固定。
const RANDOM_POINTS: LatticePoint[] = [
  { c: -2.8, g: 1.8 },
  { c: -1.9, g: -2.4 },
  { c: 0.4, g: 0.3 },
  { c: 2.1, g: -0.7 },
  { c: -0.6, g: 2.9 },
  { c: 1.7, g: -1.5 },
  { c: -2.3, g: 0.6 },
  { c: 0.9, g: -2.9 },
  { c: 2.7, g: 1.2 },
  { c: -1.2, g: -0.2 },
  { c: 1.3, g: 2.4 },
  { c: -0.1, g: -1.8 },
  { c: 2.4, g: 0.9 },
  { c: -2.6, g: -0.5 },
  { c: 0.7, g: 1.5 },
  { c: 1.9, g: -2.1 },
  { c: -0.9, g: 2.7 },
  { c: 2.9, g: -1.1 },
  { c: -1.6, g: 0.1 },
  { c: 0.2, g: -2.6 },
  { c: 1.1, g: 1.9 },
  { c: -2.1, g: -0.9 },
  { c: 2.6, g: 2.1 },
  { c: -0.4, g: -1.3 },
  { c: 1.5, g: 0.5 },
]

// 逐次減半：只有 25 點池中的前 16 個身分（id 0..15）被納入第一輪，
// 其餘 9 個身分（id 16..24）在這個分頁全程隱藏（opacity 0）。
const HALVING_POOL: LatticePoint[] = [
  { c: -2.7, g: -2.5 }, // 0
  { c: -1.8, g: 1.9 }, // 1
  { c: -0.6, g: -0.8 }, // 2
  { c: 0.3, g: 2.6 }, // 3
  { c: 1.1, g: -1.7 }, // 4
  { c: -2.2, g: 0.5 }, // 5
  { c: 2.0, g: -2.9 }, // 6
  { c: -0.9, g: 2.2 }, // 7
  { c: 1.6, g: 1.0 }, // 8
  { c: -2.9, g: -0.3 }, // 9
  { c: 0.8, g: 2.8 }, // 10
  { c: 2.6, g: -1.2 }, // 11
  { c: -1.3, g: -2.1 }, // 12
  { c: 2.3, g: 0.7 }, // 13
  { c: -0.2, g: -2.6 }, // 14
  { c: 2.9, g: 2.4 }, // 15
]

// 第二輪存活者：第一輪 16 點中 C 指數偏高（較接近最佳帶）的一半
const ROUND2_SURVIVOR_IDS: number[] = [15, 11, 13, 6, 8, 4, 10, 3]
// 第三輪存活者：第二輪 8 點中 C 指數最高、最接近最佳帶的一半
const ROUND3_SURVIVOR_IDS: number[] = [15, 11, 13, 6]

const CANDIDATES_BY_ROUND: Record<HalvingRound, number> = { 1: 16, 2: 8, 3: 4 }
const RESOURCE_BY_ROUND: Record<HalvingRound, number> = { 1: 1, 2: 2, 3: 4 }

const ELIMINATED_FILL = 'var(--neutral-300)'

function isInBand(cExp: number): boolean {
  return cExp >= BEST_BAND_MIN_EXP
}

function activeFill(cExp: number): { fill: string; stroke: string } {
  return isInBand(cExp)
    ? { fill: 'var(--orange-400)', stroke: 'var(--blue-700)' }
    : { fill: 'var(--neutral-400)', stroke: 'var(--neutral-600)' }
}

function getPointState(id: number, strategy: StrategyId, round: HalvingRound): PointVisual {
  if (strategy === 'grid') {
    const p = GRID_POINTS[id]
    const tone = activeFill(p.c)
    return { cExp: p.c, gExp: p.g, r: 5, opacity: 1, ...tone }
  }

  if (strategy === 'random') {
    const p = RANDOM_POINTS[id]
    const tone = activeFill(p.c)
    return { cExp: p.c, gExp: p.g, r: 5, opacity: 1, ...tone }
  }

  // strategy === 'halving'
  if (id >= HALVING_POOL.length) {
    const fallback = GRID_POINTS[id]
    return { cExp: fallback.c, gExp: fallback.g, r: 0, opacity: 0, fill: ELIMINATED_FILL, stroke: ELIMINATED_FILL }
  }

  const p = HALVING_POOL[id]

  if (round === 1) {
    const tone = activeFill(p.c)
    return { cExp: p.c, gExp: p.g, r: 4, opacity: 1, ...tone }
  }

  if (round === 2) {
    if (ROUND2_SURVIVOR_IDS.includes(id)) {
      const tone = activeFill(p.c)
      return { cExp: p.c, gExp: p.g, r: 6, opacity: 1, ...tone }
    }
    return { cExp: p.c, gExp: p.g, r: 2, opacity: 0.15, fill: ELIMINATED_FILL, stroke: ELIMINATED_FILL }
  }

  // round === 3
  if (ROUND3_SURVIVOR_IDS.includes(id)) {
    const tone = activeFill(p.c)
    return { cExp: p.c, gExp: p.g, r: 9, opacity: 1, ...tone }
  }
  return { cExp: p.c, gExp: p.g, r: 2, opacity: 0.15, fill: ELIMINATED_FILL, stroke: ELIMINATED_FILL }
}

const POINT_IDS: number[] = Array.from({ length: 25 }, (_, i) => i)

const STRATEGY_TABS: { id: StrategyId; label: string }[] = [
  { id: 'grid', label: '格狀搜尋' },
  { id: 'random', label: '隨機搜尋' },
  { id: 'halving', label: '逐次減半搜尋' },
]

const COST_ROWS: { id: StrategyId; label: string; cost: number }[] = [
  { id: 'grid', label: '格狀搜尋', cost: 100 },
  { id: 'random', label: '隨機搜尋', cost: 100 },
  { id: 'halving', label: '逐次減半搜尋', cost: 48 },
]
const MAX_COST = 100

// ──────────────────────────────────────────────────────────────
// 小元件：圖例
// ──────────────────────────────────────────────────────────────

function LegendDot({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, opacity }} />
      <span>{label}</span>
    </span>
  )
}

function LegendBand({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-4"
        style={{ background: 'var(--blue-50)', border: '1px dashed var(--blue-200)', borderRadius: 2 }}
      />
      <span>{label}</span>
    </span>
  )
}

// ──────────────────────────────────────────────────────────────
// 主元件
// ──────────────────────────────────────────────────────────────

export default function MlWeek7SearchStrategies() {
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = !!shouldReduceMotion

  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('grid')
  const [halvingRound, setHalvingRound] = useState<HalvingRound>(1)

  const handleTabClick = (id: StrategyId) => {
    setActiveStrategy(id)
    if (id === 'halving') setHalvingRound(1)
  }

  const handleNextRound = () => {
    setHalvingRound((r) => (r < 3 ? ((r + 1) as HalvingRound) : r))
  }

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }

  const bandX = logToX(BEST_BAND_MIN_EXP)
  const bandWidth = logToX(BEST_BAND_MAX_EXP) - bandX

  const strategyLabel = STRATEGY_TABS.find((t) => t.id === activeStrategy)?.label ?? ''

  return (
    <div className="not-prose mx-auto flex max-w-[640px] flex-col gap-4" style={{ minHeight: 560 }}>
      {/* 1. 分頁列 */}
      <div
        role="tablist"
        aria-label="超參數搜尋策略切換"
        className="flex gap-1 p-1"
        style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}
      >
        {STRATEGY_TABS.map((tab) => {
          const isActive = tab.id === activeStrategy
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab.id)}
              className="flex-1 px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--surface-brand-soft)' : 'transparent',
                color: isActive ? 'var(--text-brand)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 2. SVG 散佈圖 */}
      <svg
        viewBox="0 0 640 400"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${strategyLabel}：在 C 與 gamma 的二維超參數空間中，同樣 25 次評估的分佈方式`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {/* 最佳區域：C 指數 >= 1.5 的垂直帶狀區，橫跨全部 gamma */}
        <rect
          x={bandX}
          y={PLOT_Y0}
          width={bandWidth}
          height={PLOT_Y1 - PLOT_Y0}
          rx={4}
          fill="var(--blue-50)"
          stroke="var(--blue-200)"
          strokeDasharray="4 3"
        />

        {/* 座標軸 */}
        <line x1={PLOT_X0} y1={PLOT_Y1} x2={PLOT_X1} y2={PLOT_Y1} stroke="var(--neutral-300)" strokeWidth={1} />
        <line x1={PLOT_X0} y1={PLOT_Y0} x2={PLOT_X0} y2={PLOT_Y1} stroke="var(--neutral-300)" strokeWidth={1} />

        {TICKS.map((t) => (
          <g key={t.exp}>
            <line
              x1={logToX(t.exp)}
              y1={PLOT_Y1}
              x2={logToX(t.exp)}
              y2={PLOT_Y1 + 6}
              stroke="var(--neutral-400)"
              strokeWidth={1}
            />
            <text
              x={logToX(t.exp)}
              y={PLOT_Y1 + 20}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fill="var(--text-muted)"
            >
              {t.label}
            </text>
            <line
              x1={PLOT_X0 - 6}
              y1={logToY(t.exp)}
              x2={PLOT_X0}
              y2={logToY(t.exp)}
              stroke="var(--neutral-400)"
              strokeWidth={1}
            />
            <text
              x={PLOT_X0 - 10}
              y={logToY(t.exp) + 4}
              textAnchor="end"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fill="var(--text-muted)"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* 軸標籤 */}
        <text x={(PLOT_X0 + PLOT_X1) / 2} y={396} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text-body)">
          C
        </text>
        <text
          x={14}
          y={(PLOT_Y0 + PLOT_Y1) / 2}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--text-body)"
          transform={`rotate(-90 14 ${(PLOT_Y0 + PLOT_Y1) / 2})`}
        >
          gamma
        </text>

        {/* 25 個持久的點身分 */}
        {POINT_IDS.map((id) => {
          const state = getPointState(id, activeStrategy, halvingRound)
          return (
            <motion.circle
              key={id}
              initial={false}
              animate={{
                cx: logToX(state.cExp),
                cy: logToY(state.gExp),
                r: state.r,
                opacity: state.opacity,
                fill: state.fill,
                stroke: state.stroke,
              }}
              transition={transition}
              strokeWidth={1.25}
            />
          )
        })}
      </svg>

      {/* 3. 圖例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <LegendBand label="最佳區域" />
        <LegendDot color="var(--neutral-400)" label="一般候選" />
        <LegendDot color="var(--orange-400)" label="命中最佳區域" />
        {activeStrategy === 'halving' && <LegendDot color="var(--neutral-300)" label="已淘汰" opacity={0.6} />}
      </div>

      {/* 4. 逐次減半專屬控制列（固定高度，避免切分頁跳動） */}
      <div className="flex items-center justify-between" style={{ height: 36 }}>
        {activeStrategy === 'halving' ? (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', fontFamily: 'var(--font-mono)' }}>
              第 {halvingRound} 輪．{CANDIDATES_BY_ROUND[halvingRound]} 個候選．每個資源 {RESOURCE_BY_ROUND[halvingRound]}×
            </span>
            <button
              type="button"
              onClick={handleNextRound}
              disabled={halvingRound === 3}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: 'var(--action-secondary)', color: '#ffffff', borderRadius: 'var(--radius-md)' }}
            >
              下一輪
              <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      {/* 5. 成本比較列 */}
      <div className="flex flex-col gap-2">
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          總評估成本（1 次全資源評估 = 4 單位）
        </span>
        {COST_ROWS.map((row) => (
          <div key={row.id} className="flex items-center gap-3">
            <span
              className="w-24 shrink-0 text-xs font-medium"
              style={{ color: row.id === activeStrategy ? 'var(--text-brand)' : 'var(--text-body)' }}
            >
              {row.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(row.cost / MAX_COST) * 100}%`, background: 'var(--blue-500)' }}
              />
            </div>
            <span
              className="w-8 shrink-0 text-right"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-strong)' }}
            >
              {row.cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
