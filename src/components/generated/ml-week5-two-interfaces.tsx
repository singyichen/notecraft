import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowDown, Check, TriangleAlert, LayoutGrid, Globe, Target } from 'lucide-react'
import clsx from 'clsx'

/**
 * 兩套 Matplotlib 介面的呼叫路徑對照。
 * 核心洞察：只有一個 Axes 時，狀態式跟物件導向殊途同歸；
 * 一旦有多個 Axes，狀態式的 gca() 是個看不見的全域變數，
 * 會默默畫到「最後一次被建立/觸碰的子圖」，而不是你以為的那一格。
 */

type Scenario = 'single' | 'multi'
type Tone = 'neutral' | 'ok' | 'warn'

interface NodeDef {
  code: string
  sub?: string
  tone: Tone
  dashed?: boolean
}

const TONE_BOX: Record<Tone, string> = {
  neutral: 'border-neutral-200 bg-neutral-50',
  ok: 'border-[var(--success-500)] bg-[var(--success-50)]',
  warn: 'border-[var(--warning-500)] bg-[var(--warning-50)]',
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-neutral-700',
  ok: 'text-[var(--success-500)]',
  warn: 'text-[var(--warning-500)]',
}

const TONE_SUB: Record<Tone, string> = {
  neutral: 'text-neutral-400',
  ok: 'text-[var(--success-500)]',
  warn: 'text-[var(--warning-500)]',
}

function CallNode({ code, sub, tone, dashed }: NodeDef) {
  return (
    <div
      className={clsx(
        'w-full rounded-lg border px-2.5 py-2 text-center',
        dashed ? 'border-dashed' : 'border-solid',
        TONE_BOX[tone],
      )}
    >
      <p className={clsx('break-words font-mono text-[11px] font-semibold leading-snug', TONE_TEXT[tone])}>
        {code}
      </p>
      {sub && <p className={clsx('mt-0.5 text-[10px] leading-snug', TONE_SUB[tone])}>{sub}</p>}
    </div>
  )
}

function Connector() {
  return (
    <div className="flex justify-center py-0.5">
      <ArrowDown size={13} className="text-neutral-300" />
    </div>
  )
}

interface AxesBoxDef {
  id: string
  label: string
  pointedBy: string
  tone: Tone
}

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'single', label: '單一 Axes' },
  { id: 'multi', label: '多子圖（2x1）' },
]

const METHOD_PAIRS: { state: string; oop: string }[] = [
  { state: 'plt.plot()', oop: 'ax.plot()' },
  { state: 'plt.title()', oop: 'ax.set_title()' },
  { state: 'plt.xlabel()', oop: 'ax.set_xlabel()' },
  { state: 'plt.xlim()', oop: 'ax.set_xlim()' },
]

export default function MlWeek5TwoInterfaces() {
  const [scenario, setScenario] = useState<Scenario>('single')
  const shouldReduceMotion = useReducedMotion()
  const isMulti = scenario === 'multi'

  const stateNodes: NodeDef[] = [
    { code: 'plt.plot()', tone: 'neutral' },
    {
      code: 'gca()',
      sub: '隱含 · 看不見的全域狀態',
      tone: isMulti ? 'warn' : 'ok',
      dashed: true,
    },
    isMulti
      ? { code: 'Axes[1]（最後建立/觸碰的子圖）', tone: 'warn' }
      : { code: '唯一的作圖區', tone: 'ok' },
  ]

  const oopNodes: NodeDef[] = [
    { code: 'fig, ax = plt.subplots()', tone: 'neutral' },
    { code: 'ax', sub: '明確 · 指名把手', tone: 'ok' },
    isMulti ? { code: 'ax[0].plot() 指名的 Axes', tone: 'ok' } : { code: 'ax.plot() 指名的 Axes', tone: 'ok' },
  ]

  const axesBoxes: AxesBoxDef[] = isMulti
    ? [
        { id: 'ax0', label: 'Axes[0]', pointedBy: '物件導向精準指到', tone: 'ok' },
        { id: 'ax1', label: 'Axes[1]', pointedBy: '狀態式 gca() 也指到這裡', tone: 'warn' },
      ]
    : [{ id: 'ax0', label: '唯一的 Axes', pointedBy: '兩套寫法都指到這裡', tone: 'ok' }]

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' as const }
  const swapVariants = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } }

  return (
    <div className="not-prose w-full max-w-3xl mx-auto space-y-4">
      {/* 情境切換 */}
      <div className="flex justify-center gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenario(s.id)}
            aria-pressed={scenario === s.id}
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              scenario === s.id
                ? 'border-transparent bg-[var(--action-secondary)] text-white'
                : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 兩欄呼叫路徑對照 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0 space-y-1.5 rounded-lg border border-neutral-200 bg-white p-2.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-blue-700">
            <Globe size={12} className="shrink-0" />
            <span className="truncate">狀態式（MATLAB 風格）</span>
          </p>
          {stateNodes.map((n, i) => (
            <div key={i}>
              <CallNode {...n} />
              {i < stateNodes.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        <div className="min-w-0 space-y-1.5 rounded-lg border border-neutral-200 bg-white p-2.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-orange-700">
            <Target size={12} className="shrink-0" />
            <span className="truncate">物件導向</span>
          </p>
          {oopNodes.map((n, i) => (
            <div key={i}>
              <CallNode {...n} />
              {i < oopNodes.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      </div>

      {/* 小畫布示意圖 */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          <LayoutGrid size={11} />
          Figure 畫布
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={scenario}
            layout
            initial={swapVariants.initial}
            animate={swapVariants.animate}
            exit={swapVariants.exit}
            transition={transition}
            className="space-y-1.5"
          >
            {axesBoxes.map((box) => (
              <div
                key={box.id}
                className={clsx(
                  'flex items-center justify-between gap-2 rounded-md border px-3 py-2',
                  TONE_BOX[box.tone],
                )}
              >
                <span className={clsx('font-mono text-xs font-semibold', TONE_TEXT[box.tone])}>{box.label}</span>
                <span className={clsx('text-right text-[10px] leading-snug', TONE_SUB[box.tone])}>
                  {box.pointedBy}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 結論列 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scenario}
          initial={swapVariants.initial}
          animate={swapVariants.animate}
          exit={swapVariants.exit}
          transition={transition}
          className={clsx(
            'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium leading-relaxed',
            isMulti
              ? 'border-[var(--warning-500)] bg-[var(--warning-50)] text-[var(--warning-500)]'
              : 'border-[var(--success-500)] bg-[var(--success-50)] text-[var(--success-500)]',
          )}
        >
          {isMulti ? (
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={15} className="mt-0.5 shrink-0" />
          )}
          <span>
            {isMulti
              ? '多個 Axes 時，狀態式會畫到你以為之外的地方——gca() 默默指向最後一次建立/觸碰的子圖。'
              : '只有一個 Axes 時，兩套寫法結果相同——gca() 恰好就是唯一的那一個。'}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* 方法名對照 */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[280px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-blue-50 px-3 py-1.5 text-left font-bold text-blue-700">狀態式</th>
              <th className="bg-orange-50 px-3 py-1.5 text-left font-bold text-orange-700">物件導向</th>
            </tr>
          </thead>
          <tbody>
            {METHOD_PAIRS.map((row, i) => (
              <tr key={row.state} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                <td className="px-3 py-1.5 font-mono text-neutral-700">{row.state}</td>
                <td className="px-3 py-1.5 font-mono text-neutral-700">{row.oop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-[10px] leading-snug text-neutral-400">
        多半只差一個 set_ 前綴，混著抄就會出錯。
      </p>
    </div>
  )
}
