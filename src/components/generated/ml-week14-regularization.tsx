/**
 * 核心洞察：L1 與 L2 的差別在於「壓成 0」還是「只壓小」——
 * 前者（Lasso）順手幫你選特徵，後者（Ridge）保留全部但都不極端。
 * 拖動強度滑桿：Ridge 的八根長條一起變矮，Lasso／Elastic Net 則由小到大
 * 依序歸零（灰色＋打叉＋「已淘汰」標記），讓兩種正則化的行為差異被直接看見。
 */

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Scissors, Minimize2, SlidersHorizontal } from 'lucide-react'

type MethodId = 'ridge' | 'lasso' | 'elastic'

const FEATURES = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8'] as const
const ORIGINAL: number[] = [4.2, -3.1, 2.8, 0.9, -0.6, 0.4, -0.3, 0.15]

const METHOD_IDS: MethodId[] = ['ridge', 'lasso', 'elastic']

const METHOD_FINAL: Record<MethodId, number[]> = {
  ridge: [2.6, -1.9, 1.7, 0.55, -0.36, 0.24, -0.18, 0.09],
  lasso: [3.1, -2.2, 1.9, 0.3, 0, 0, 0, 0],
  elastic: [2.8, -2.0, 1.8, 0.42, -0.15, 0, 0, 0],
}

const METHOD_LABEL: Record<MethodId, string> = {
  ridge: 'Ridge（L2）',
  lasso: 'Lasso（L1）',
  elastic: 'Elastic Net',
}

const METHOD_COLOR: Record<MethodId, string> = {
  ridge: 'var(--blue-500)',
  lasso: 'var(--orange-500)',
  elastic: 'var(--blue-300)',
}

/** 同一方法內，會被壓成 0 的係數依原始絕對值由小到大排序，
 *  分配一個 0~1 的強度門檻——越小的係數越早歸零。 */
function computeThresholds(original: number[], final: number[]): Array<number | null> {
  const zeroIndices = final.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1)
  const ranked = [...zeroIndices].sort((a, b) => Math.abs(original[a]) - Math.abs(original[b]))
  const thresholds: Array<number | null> = original.map(() => null)
  const n = ranked.length
  ranked.forEach((idx, rank) => {
    thresholds[idx] = n <= 1 ? 0.4 : 0.3 + 0.6 * (rank / (n - 1))
  })
  return thresholds
}

const THRESHOLDS: Record<MethodId, Array<number | null>> = {
  ridge: computeThresholds(ORIGINAL, METHOD_FINAL.ridge),
  lasso: computeThresholds(ORIGINAL, METHOD_FINAL.lasso),
  elastic: computeThresholds(ORIGINAL, METHOD_FINAL.elastic),
}

/** 強度 0 = 原始 OLS，強度 1 = 該方法給定的最終結果；
 *  目標為 0 的係數在門檻之後直接夾到 0（Lasso / Elastic Net 的「歸零」），
 *  其餘係數對原始值與最終值線性內插（Ridge 的「等比例壓小」）。 */
function valueAt(index: number, method: MethodId, strength: number): number {
  const original = ORIGINAL[index]
  const target = METHOD_FINAL[method][index]
  const threshold = THRESHOLDS[method][index]
  if (target === 0 && threshold !== null) {
    if (strength >= threshold) return 0
    return original * (1 - strength / threshold)
  }
  return original + strength * (target - original)
}

function fmt(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (rounded === 0) return '0.00'
  return rounded.toFixed(2)
}

const VB_W = 620
const VB_H = 172
const BASELINE = 96
const PX_PER_UNIT = 20
const BAR_W = 18
const BAR_GAP = 5
const GROUP_W = VB_W / FEATURES.length
const SLOT_OFFSET = (GROUP_W - (BAR_W * 2 + BAR_GAP)) / 2
const ZERO_EPSILON = 0.02

interface BarRect {
  y: number
  height: number
}

function barRect(value: number): BarRect {
  if (Math.abs(value) < ZERO_EPSILON) {
    return { y: BASELINE - 1, height: 2 }
  }
  const height = Math.abs(value) * PX_PER_UNIT
  return { y: value >= 0 ? BASELINE - height : BASELINE, height }
}

export default function MlWeek14Regularization() {
  const prefersReducedMotion = useReducedMotion()
  const [method, setMethod] = useState<MethodId>('lasso')
  const [strength, setStrength] = useState(0.6)

  const methodColor = METHOD_COLOR[method]
  const transition = { duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' as const }

  const bars = FEATURES.map((label, i) => {
    const original = ORIGINAL[i]
    const current = valueAt(i, method, strength)
    return { label, original, current, isZero: Math.abs(current) < ZERO_EPSILON }
  })

  return (
    <div className="not-prose w-full max-w-xl mx-auto space-y-4">
      {/* 三選一切換 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="選擇正則化方法">
        {METHOD_IDS.map((id) => {
          const active = method === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              aria-pressed={active}
              className="flex-1 min-w-[104px] rounded-md px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                background: active ? 'var(--surface-brand-soft)' : 'transparent',
                border: `1.5px solid ${active ? METHOD_COLOR[id] : 'var(--border-subtle)'}`,
                color: active ? METHOD_COLOR[id] : 'var(--neutral-500)',
              }}
            >
              {METHOD_LABEL[id]}
            </button>
          )
        })}
      </div>

      {/* 強度滑桿 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--neutral-500)' }}>
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} />
            正則化強度
          </span>
          <span className="font-mono" style={{ color: 'var(--text-strong)' }}>
            {Math.round(strength * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          aria-label="正則化強度，數值越大代表懲罰越強"
          className="w-full"
          style={{ accentColor: methodColor }}
        />
        <div className="flex justify-between text-[11px]" style={{ color: 'var(--neutral-400)' }}>
          <span>弱（接近原始 OLS）</span>
          <span>強</span>
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--neutral-500)' }}>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: 'var(--neutral-200)', border: '1px solid var(--neutral-300)' }}
          />
          原始 OLS 係數
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: methodColor }} />
          {METHOD_LABEL[method]} 目前結果
        </span>
      </div>

      {/* 長條圖：八個特徵，正負係數分居零線上下 */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="八個特徵的係數長條圖，淺灰為原始 OLS 係數，彩色為目前正則化方法在目前強度下的係數；被壓成 0 的長條會變灰並打上叉號"
      >
        <line x1={0} y1={BASELINE} x2={VB_W} y2={BASELINE} stroke="var(--neutral-300)" strokeWidth={1} />
        {bars.map((bar, i) => {
          const gx = i * GROUP_W + SLOT_OFFSET
          const cx = gx + BAR_W + BAR_GAP
          const ghost = barRect(bar.original)
          const cur = barRect(bar.current)
          const fill = bar.isZero ? 'var(--neutral-400)' : methodColor
          return (
            <g key={bar.label}>
              <rect
                x={gx}
                y={ghost.y}
                width={BAR_W}
                height={ghost.height}
                rx={2}
                fill="var(--neutral-200)"
                stroke="var(--neutral-300)"
                strokeWidth={1}
              />
              <motion.rect
                x={cx}
                width={BAR_W}
                rx={2}
                animate={{ y: cur.y, height: cur.height, fill }}
                transition={transition}
              />
              {bar.isZero && (
                <motion.g
                  stroke="var(--neutral-500)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  transition={transition}
                >
                  <line x1={cx + BAR_W / 2 - 4} y1={BASELINE - 4} x2={cx + BAR_W / 2 + 4} y2={BASELINE + 4} />
                  <line x1={cx + BAR_W / 2 - 4} y1={BASELINE + 4} x2={cx + BAR_W / 2 + 4} y2={BASELINE - 4} />
                </motion.g>
              )}
            </g>
          )
        })}
      </svg>

      {/* 特徵標籤／數值／已淘汰標記（DOM，避免中文塞進 SVG text） */}
      <div className="flex" style={{ marginTop: -8 }}>
        {bars.map((bar) => (
          <div key={bar.label} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--neutral-500)' }}>
              {bar.label}
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: bar.isZero ? 'var(--neutral-400)' : methodColor }}
            >
              {fmt(bar.current)}
            </span>
            <span
              className="text-[9.5px] px-1.5 rounded leading-[14px] whitespace-nowrap"
              style={{
                background: 'var(--danger-50)',
                color: 'var(--danger-500)',
                visibility: bar.isZero ? 'visible' : 'hidden',
              }}
            >
              已淘汰
            </span>
          </div>
        ))}
      </div>

      {/* 底部對照 */}
      <div
        className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs pt-3"
        style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--neutral-600)' }}
      >
        <span className="flex items-center gap-1.5">
          <Scissors size={13} style={{ color: 'var(--orange-600)' }} />
          L1（Lasso）會歸零——順手做了特徵選擇
        </span>
        <span className="flex items-center gap-1.5">
          <Minimize2 size={13} style={{ color: 'var(--blue-600)' }} />
          L2（Ridge）只壓小——保留全部特徵
        </span>
      </div>
    </div>
  )
}
