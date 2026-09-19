import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Activity,
  CircuitBoard,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  ListChecks,
  Play,
  RotateCcw,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * EDA 模擬流程 × 手算對照。
 *
 * 核心洞察：模擬器不會告訴你「你的假設錯了」，它只忠實算出數字；那句提醒只能
 * 靠手算先建立的直覺補上。兩條路徑的價值全部集中在最後一步「讀波形並驗證
 * 工作區假設」的互相對帳——所以雙向虛線與「互相檢查」標籤刻意留到第 5 步
 * 才浮現，逼讀者先走過前四步、再看見收斂點。
 *
 * 版面採 CSS Grid 節點卡片（中文一律 DOM）＋ 節點間極小手繪 SVG 箭頭 icon，
 * 不用一張大 SVG 塞中文，避免中文被裁切或字級被整體縮小。
 */

const GRID_COLS = 'grid-cols-[108px_20px_108px_20px_108px_20px_108px_20px_108px]'

type Step = {
  order: number
  icon: LucideIcon
  title: string
  sub?: string
}

const STEPS: Step[] = [
  { order: 1, icon: CircuitBoard, title: '畫電路圖', sub: 'schematic' },
  { order: 2, icon: FileText, title: '產生網表', sub: 'netlist' },
  { order: 3, icon: ListChecks, title: '選擇分析類型' },
  { order: 4, icon: Play, title: '執行模擬' },
  { order: 5, icon: Activity, title: '讀波形', sub: '驗證工作區假設' },
]

const ANALYSIS_TYPES: { icon: LucideIcon; label: string }[] = [
  { icon: Gauge, label: '直流工作點分析' },
  { icon: Activity, label: '暫態分析' },
  { icon: Waves, label: '交流頻率響應分析' },
]

/* ── 小元件 ────────────────────────────────────────────────── */

function LaneLabel({ tone, children }: { tone: 'muted' | 'brand'; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-[var(--tracking-wide)] text-[var(--text-muted)]">
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          tone === 'brand' ? 'bg-[var(--blue-500)]' : 'bg-[var(--neutral-400)]',
        )}
      />
      {children}
    </div>
  )
}

function RefCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-center text-sm font-semibold text-[var(--neutral-600)]">
      {children}
    </div>
  )
}

function LongArrow() {
  return (
    <svg width="100%" height={20} viewBox="0 0 276 20" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1={2} y1={10} x2={262} y2={10} stroke="var(--neutral-400)" strokeWidth={2} />
      <path d="M260 4 L274 10 L260 16 Z" fill="var(--neutral-400)" />
    </svg>
  )
}

function StepArrow({ achieved }: { achieved: boolean }) {
  const color = achieved ? 'var(--blue-500)' : 'var(--neutral-300)'
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" className="transition-colors duration-200">
      <line x1={1} y1={8} x2={10} y2={8} stroke={color} strokeWidth={2} />
      <path d="M9 3 L15 8 L9 13 Z" fill={color} />
    </svg>
  )
}

function NodeCard({ step, achieved }: { step: Step; achieved: boolean }) {
  const Icon = step.icon
  return (
    <div
      className={clsx(
        'flex min-h-[92px] w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border px-2 py-2 text-center transition-colors duration-200',
        achieved
          ? 'border-[var(--border-brand)] bg-[var(--surface-brand-soft)]'
          : 'border-[var(--border-subtle)] bg-[var(--surface-card)]',
      )}
    >
      <span
        className={clsx(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-200',
          achieved ? 'bg-[var(--blue-600)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-600)]',
        )}
      >
        {step.order}
      </span>
      <Icon
        size={18}
        strokeWidth={1.8}
        className={clsx(
          'shrink-0 transition-colors duration-200',
          achieved ? 'text-[var(--blue-600)]' : 'text-[var(--text-muted)]',
        )}
      />
      <span
        className={clsx(
          'text-sm font-semibold leading-tight transition-colors duration-200',
          achieved ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)]',
        )}
      >
        {step.title}
      </span>
      {step.sub && (
        <span className="text-[11px] leading-tight text-[var(--text-muted)]">{step.sub}</span>
      )}
    </div>
  )
}

/* ── 主元件 ────────────────────────────────────────────────── */

export default function EcWeek2EdaFlow() {
  const shouldReduceMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(1)

  const goPrev = () => setActiveStep((s) => Math.max(1, s - 1))
  const goNext = () => setActiveStep((s) => Math.min(5, s + 1))
  const reset = () => setActiveStep(1)

  const currentTitle = STEPS.find((s) => s.order === activeStep)?.title ?? ''

  return (
    <div className="not-prose flex flex-col gap-5">
      <p aria-live="polite" className="sr-only">
        目前進度：第 {activeStep} 步，{currentTitle}
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[620px] flex-col gap-2">
          <LaneLabel tone="muted">手算路徑（對照參考）</LaneLabel>

          {/* Row 1：手算路徑，灰階、不隨 activeStep 變色 */}
          <div className={clsx('grid items-center', GRID_COLS)}>
            <div className="col-[1/4] flex items-center justify-center">
              <RefCard>簡化模型</RefCard>
            </div>
            <div className="col-[4/9] flex items-center px-1">
              <LongArrow />
            </div>
            <div className="col-[9/10] flex items-center justify-center">
              <RefCard>建立直覺</RefCard>
            </div>
          </div>

          {/* Row 2：垂直連接槽，僅 activeStep===5 時浮現雙向虛線＋「互相檢查」 */}
          <div className={clsx('grid h-10', GRID_COLS)}>
            <div className="relative col-[9/10] flex items-center justify-center">
              <AnimatePresence initial={false}>
                {activeStep === 5 && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scaleY: 0.6 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.6 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex items-center justify-center"
                  >
                    <svg width={16} height={40} viewBox="0 0 16 40" aria-hidden="true">
                      <line
                        x1={8}
                        y1={4}
                        x2={8}
                        y2={36}
                        stroke="var(--orange-600)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                      <path d="M8 0 L3 8 L13 8 Z" fill="var(--orange-600)" />
                      <path d="M8 40 L3 32 L13 32 Z" fill="var(--orange-600)" />
                    </svg>
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--orange-600)] px-2 py-0.5 text-[10px] font-bold text-white">
                      互相檢查
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <LaneLabel tone="brand">模擬流程</LaneLabel>

          {/* Row 3：主流程 5 節點 */}
          <div className={clsx('grid items-center', GRID_COLS)}>
            {STEPS.flatMap((step, i) => {
              const nodeEl = (
                <div key={`node-${step.order}`} className="flex items-center justify-center">
                  <NodeCard step={step} achieved={step.order <= activeStep} />
                </div>
              )
              if (i === STEPS.length - 1) return [nodeEl]
              const nextAchieved = STEPS[i + 1].order <= activeStep
              const arrowEl = (
                <div key={`arrow-${step.order}`} className="flex items-center justify-center">
                  <StepArrow achieved={nextAchieved} />
                </div>
              )
              return [nodeEl, arrowEl]
            })}
          </div>

          {/* Row 4：分析類型子項，activeStep >= 3 時浮現 */}
          <div className={clsx('grid', GRID_COLS)}>
            <div className="col-[3/8] flex items-center justify-center">
              <AnimatePresence initial={false}>
                {activeStep >= 3 && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full overflow-hidden"
                  >
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2">
                      {ANALYSIS_TYPES.map((a) => (
                        <span
                          key={a.label}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--surface-brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-brand)]"
                        >
                          <a.icon size={14} strokeWidth={2} />
                          {a.label}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* 控制列 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={activeStep === 1}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-sm font-semibold text-[var(--text-body)] transition-colors duration-200 hover:border-[var(--border-brand)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          上一步
        </button>

        <div className="flex items-center gap-1.5" role="group" aria-label="流程步驟">
          {STEPS.map((step) => (
            <button
              key={step.order}
              type="button"
              aria-current={activeStep === step.order ? 'step' : undefined}
              aria-label={`前往第 ${step.order} 步：${step.title}`}
              onClick={() => setActiveStep(step.order)}
              className={clsx(
                'h-2.5 w-2.5 cursor-pointer rounded-full transition-colors duration-200',
                step.order <= activeStep ? 'bg-[var(--blue-600)]' : 'bg-[var(--neutral-300)]',
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={activeStep === 5}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-sm font-semibold text-[var(--text-body)] transition-colors duration-200 hover:border-[var(--border-brand)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40"
        >
          下一步
          <ChevronRight size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={reset}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text-body)]"
        >
          <RotateCcw size={14} strokeWidth={2} />
          重置
        </button>
      </div>
    </div>
  )
}
