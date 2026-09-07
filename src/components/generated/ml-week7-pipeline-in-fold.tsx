/**
 * 核心洞察：pipeline 的價值不是少寫幾行，而是讓「fit 只能看訓練段」變成
 * 結構上做不到違反。上排的 k = 5 條狀圖讓讀者先選定「現在是第幾折」，
 * 下排被放大的 pipeline 容器裡，同一組補缺值／one-hot／標準化／模型，
 * 對訓練段永遠是實線的 fit + transform，對驗證段永遠只有虛線的
 * transform、並明白標出「不 fit」——不是靠自律記得，而是每個階段的
 * 兩條路徑天生就長得不一樣。
 */

import { useState } from 'react'
import { useReducedMotion, motion } from 'motion/react'
import {
  PaintBucket,
  ToggleLeft,
  Scale,
  Brain,
  ArrowRight,
  Ban,
  type LucideIcon,
} from 'lucide-react'

const FOLD_COUNT = 5

interface Stage {
  label: string
  tech: string
  Icon: LucideIcon
}

const STAGES: Stage[] = [
  { label: '補缺值', tech: 'SimpleImputer', Icon: PaintBucket },
  { label: 'one-hot', tech: 'OneHotEncoder', Icon: ToggleLeft },
  { label: '標準化', tech: 'StandardScaler', Icon: Scale },
  { label: '模型', tech: 'LogisticRegression', Icon: Brain },
]

const VIEW_W = 620
const BAR_X = 62
const BAR_W = 526
const BAR_H = 28
const ROW_STEP = 36
const START_Y = 14
const VIEW_H = START_Y + FOLD_COUNT * ROW_STEP + 10

function rowTop(index: number): number {
  return START_Y + index * ROW_STEP
}

export default function MlWeek7PipelineInFold() {
  const [currentFold, setCurrentFold] = useState(1)
  const shouldReduceMotion = useReducedMotion()

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: 'easeOut' as const }

  return (
    <div className="not-prose w-full space-y-5">
      {/* ───────── 上區：k = 5 fold 條狀圖 ───────── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          K = 5 交叉驗證：選擇現在是第幾折
        </p>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`k 等於 5 的交叉驗證條狀圖，目前選取第 ${currentFold} 折，該折為驗證段，其餘四折為訓練段`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {Array.from({ length: FOLD_COUNT }, (_, i) => {
            const foldNumber = i + 1
            const isCurrent = foldNumber === currentFold
            const top = rowTop(i)
            return (
              <g key={foldNumber}>
                <circle
                  cx={30}
                  cy={top + BAR_H / 2}
                  r={13}
                  fill={isCurrent ? 'var(--info-500)' : 'var(--neutral-100)'}
                  stroke={isCurrent ? 'var(--info-500)' : 'var(--border-subtle)'}
                  strokeWidth={1}
                />
                <text
                  x={30}
                  y={top + BAR_H / 2 + 4}
                  fontSize={12}
                  fontWeight={700}
                  textAnchor="middle"
                  fill={isCurrent ? '#ffffff' : 'var(--neutral-500)'}
                >
                  {foldNumber}
                </text>
                <rect
                  x={BAR_X}
                  y={top}
                  width={BAR_W}
                  height={BAR_H}
                  rx={8}
                  fill={isCurrent ? 'var(--info-500)' : 'var(--success-50)'}
                  stroke={isCurrent ? 'var(--info-500)' : 'var(--success-300)'}
                  strokeWidth={1}
                />
                <text
                  x={BAR_X + BAR_W / 2}
                  y={top + BAR_H / 2 + 4}
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                  fill={isCurrent ? '#ffffff' : 'var(--success-500)'}
                >
                  {isCurrent ? '驗證段（本折）' : '訓練段'}
                </text>
              </g>
            )
          })}

          <motion.rect
            x={BAR_X - 6}
            width={BAR_W + 12}
            height={BAR_H + 8}
            rx={11}
            fill="none"
            stroke="var(--info-500)"
            strokeWidth={2.5}
            animate={{ y: rowTop(currentFold - 1) - 4 }}
            transition={transition}
          />
        </svg>
      </div>

      {/* fold 切換按鈕 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="切換目前的 fold">
        {Array.from({ length: FOLD_COUNT }, (_, i) => {
          const foldNumber = i + 1
          const isCurrent = foldNumber === currentFold
          return (
            <button
              key={foldNumber}
              type="button"
              onClick={() => setCurrentFold(foldNumber)}
              aria-pressed={isCurrent}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                isCurrent
                  ? { background: 'var(--info-500)', color: '#ffffff' }
                  : {
                      background: 'var(--neutral-50)',
                      color: 'var(--neutral-600)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              第 {foldNumber} 折
            </button>
          )
        })}
      </div>

      {/* ───────── 下區：被放大的當前 fold 內部 pipeline ───────── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          第 {currentFold} 折內部的 pipeline
        </p>

        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-wrap items-stretch gap-3">
            {STAGES.map((stage, i) => (
              <div key={stage.label} className="flex items-stretch gap-3">
                <div
                  className="w-40 shrink-0 rounded-md p-3"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <stage.Icon size={16} color="var(--blue-500)" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
                        {stage.label}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--neutral-500)', fontFamily: 'var(--font-mono)' }}>
                        {stage.tech}
                      </p>
                    </div>
                  </div>

                  {/* 訓練段：實線 = fit + transform */}
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <svg width={18} height={10} viewBox="0 0 18 10" aria-hidden="true">
                      <line x1={0} y1={5} x2={13} y2={5} stroke="var(--success-500)" strokeWidth={2} />
                      <path d="M11,2 L16,5 L11,8 Z" fill="var(--success-500)" />
                    </svg>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--success-500)' }}>
                      訓練段：fit + transform
                    </span>
                  </div>

                  {/* 驗證段：虛線 = 只有 transform，並標「不 fit」 */}
                  <div className="flex items-center gap-1.5">
                    <svg width={18} height={10} viewBox="0 0 18 10" aria-hidden="true">
                      <line
                        x1={0}
                        y1={5}
                        x2={13}
                        y2={5}
                        stroke="var(--info-500)"
                        strokeWidth={2}
                        strokeDasharray="3 2.5"
                      />
                      <path d="M11,2 L16,5 L11,8 Z" fill="var(--info-500)" />
                    </svg>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--info-500)' }}>
                      驗證段：只 transform
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Ban size={10} color="var(--info-500)" />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--info-500)' }}>
                      不 fit（第 {currentFold} 折）
                    </span>
                  </div>
                </div>

                {i < STAGES.length - 1 && (
                  <div className="flex items-center" aria-hidden="true">
                    <ArrowRight size={16} color="var(--neutral-400)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]" style={{ color: 'var(--neutral-500)' }}>
          <div className="flex items-center gap-1.5">
            <svg width={18} height={10} viewBox="0 0 18 10" aria-hidden="true">
              <line x1={0} y1={5} x2={18} y2={5} stroke="var(--success-500)" strokeWidth={2} />
            </svg>
            <span>實線 = fit + transform</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width={18} height={10} viewBox="0 0 18 10" aria-hidden="true">
              <line x1={0} y1={5} x2={18} y2={5} stroke="var(--info-500)" strokeWidth={2} strokeDasharray="3 2.5" />
            </svg>
            <span>虛線 = 只有 transform</span>
          </div>
        </div>
      </div>
    </div>
  )
}
