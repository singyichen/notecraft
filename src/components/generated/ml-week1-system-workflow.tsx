/**
 * 核心洞察：建立 ML 系統不是「訓練完就結束」的一次性流程，而是「評估不理想
 * → 繞回調整、甚至換演算法」的迴圈；No Free Lunch 定理正是這個迴圈存在的
 * 理由——沒有一個演算法能在所有情境穩贏，所以步驟③常態性地要重跑、要比較。
 *
 * 互動：五步驟環狀排列，讀者用上一步／下一步或點步驟圓點推進。推進到步驟④
 * 時浮現「評估結果如何？」的兩個按鈕；點「不理想」第一次畫出④→⑤的虛線
 * 迴圈箭頭並讓 step 跳回 5，第二次改畫④→③的虛線迴圈箭頭並讓 step 跳回 3，
 * 之後在兩者間循環，模擬反覆迭代。
 *
 * 版面：viewBox 640x360（內文欄實測最窄 583px），五節點取五角形座標，
 * 迴圈虛線走節點外側避免與主線交叉；NFL 對照條形改在 DOM 呈現（非真實資料，
 * 純示意），字級不隨 SVG 縮放。
 */

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Database,
  Gauge,
  Wand2,
  ClipboardCheck,
  SlidersHorizontal,
  Repeat,
  RotateCcw,
  Shuffle,
  Check,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

const VBW = 640
const VBH = 360

type StepId = 1 | 2 | 3 | 4 | 5
type LoopPhase = 'to5' | 'to3' | null

interface StepDef {
  id: StepId
  lines: [string, string]
  Icon: LucideIcon
}

const STEPS: StepDef[] = [
  { id: 1, lines: ['① 選特徵', '收集樣本'], Icon: Database },
  { id: 2, lines: ['② 選效能', '指標'], Icon: Gauge },
  { id: 3, lines: ['③ 選演算法', '訓練模型'], Icon: Wand2 },
  { id: 4, lines: ['④ 評估模型', '（驗證集）'], Icon: ClipboardCheck },
  { id: 5, lines: ['⑤ 調整超參數', '／換演算法'], Icon: SlidersHorizontal },
]

const POS: Record<StepId, { cx: number; cy: number }> = {
  1: { cx: 320, cy: 55 },
  2: { cx: 486, cy: 138 },
  3: { cx: 423, cy: 272 },
  4: { cx: 217, cy: 272 },
  5: { cx: 154, cy: 138 },
}

const NODE_W = 126
const NODE_H = 64
const SEQUENCE: Array<[StepId, StepId]> = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
]

/** 找出從節點外框邊界、朝另一節點方向延伸的交點，讓連線不壓在節點文字上。 */
function edgePoint(from: { cx: number; cy: number }, to: { cx: number; cy: number }) {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  if (dx === 0 && dy === 0) return { x: from.cx, y: from.cy }
  const scaleX = dx !== 0 ? NODE_W / 2 / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? NODE_H / 2 / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  return { x: from.cx + dx * scale, y: from.cy + dy * scale }
}

// 迴圈虛線路徑：走節點外側，避免與主序列直線交叉
const PATH_TO_5 = 'M154,272 Q30,205 91,138'
const PATH_TO_3 = 'M217,304 Q320,350 423,304'
const LOOP_TO_5_ICON = { x: 68, y: 197 }
const LOOP_TO_3_ICON = { x: 312, y: 319 }

interface ScenarioBar {
  name: string
  pct: number
}
interface Scenario {
  key: string
  label: string
  bars: ScenarioBar[]
  best: string
}

const BAR_COLORS: Record<string, string> = {
  X: 'var(--blue-500)',
  Y: 'var(--orange-500)',
  Z: 'var(--blue-300)',
}

const SCENARIOS: Scenario[] = [
  {
    key: 'A',
    label: '資料情境 A',
    bars: [
      { name: 'X', pct: 88 },
      { name: 'Y', pct: 52 },
      { name: 'Z', pct: 38 },
    ],
    best: 'X',
  },
  {
    key: 'B',
    label: '資料情境 B',
    bars: [
      { name: 'X', pct: 42 },
      { name: 'Y', pct: 90 },
      { name: 'Z', pct: 58 },
    ],
    best: 'Y',
  },
  {
    key: 'C',
    label: '資料情境 C',
    bars: [
      { name: 'X', pct: 48 },
      { name: 'Y', pct: 36 },
      { name: 'Z', pct: 92 },
    ],
    best: 'Z',
  },
]

function Node({ def, active }: { def: StepDef; active: boolean }) {
  const shouldReduce = useReducedMotion()
  const { cx, cy } = POS[def.id]
  const x = cx - NODE_W / 2
  const y = cy - NODE_H / 2
  const color = active ? '#ffffff' : 'var(--neutral-700)'
  const Icon = def.Icon

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: active ? 1.04 : 1 }}
      transition={{ duration: shouldReduce ? 0 : 0.2, ease: 'easeOut' }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill={active ? 'var(--blue-600)' : 'var(--neutral-100)'}
      />
      <foreignObject x={cx - 9} y={y + 10} width={18} height={18}>
        <Icon size={18} color={color} />
      </foreignObject>
      <text
        x={cx}
        y={y + 42}
        fontSize={12.5}
        fontWeight={600}
        fill={color}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {def.lines[0]}
      </text>
      <text
        x={cx}
        y={y + 57}
        fontSize={12.5}
        fontWeight={600}
        fill={color}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {def.lines[1]}
      </text>
    </motion.g>
  )
}

function IterationPill({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold"
      style={{
        padding: '2px 10px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--orange-500)',
        color: '#ffffff',
      }}
    >
      已迭代 {count} 輪
    </span>
  )
}

export default function MlWeek1SystemWorkflow() {
  const shouldReduce = useReducedMotion()
  const [step, setStep] = useState<StepId>(1)
  const [loopPhase, setLoopPhase] = useState<LoopPhase>(null)
  const [loopCount, setLoopCount] = useState(0)
  const [completed, setCompleted] = useState(false)

  const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))
  const goNext = () => setStep((s) => (s < 5 ? ((s + 1) as StepId) : s))

  const handleGood = () => setCompleted(true)
  const handleBad = () => {
    setCompleted(false)
    setLoopCount((c) => c + 1)
    if (loopPhase === 'to5') {
      setLoopPhase('to3')
      setStep(3)
    } else {
      setLoopPhase('to5')
      setStep(5)
    }
  }

  const pathTransition = { duration: shouldReduce ? 0 : 0.3, ease: 'easeOut' as const }
  const pathInitial = shouldReduce ? false : { pathLength: 0, opacity: 0 }
  const iconInitial = shouldReduce ? false : { opacity: 0 }

  return (
    <div className="not-prose w-full space-y-6" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* 標題與控制列 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="text-sm font-bold leading-snug"
            style={{ color: 'var(--text-strong)' }}
          >
            建立 ML 系統：反覆迭代的工作流程
          </h3>
          {loopCount > 0 && <IterationPill count={loopCount} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: step === 1 ? 'var(--text-muted)' : 'var(--text-body)',
              background: 'var(--surface-card)',
              opacity: step === 1 ? 0.5 : 1,
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            上一步
          </button>

          <div className="flex items-center gap-1.5" role="group" aria-label="跳至步驟">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={step === s.id}
                aria-label={`步驟 ${s.id}`}
                className="text-[11px] font-bold transition-colors"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-pill)',
                  background: step === s.id ? 'var(--blue-600)' : 'var(--neutral-100)',
                  color: step === s.id ? '#ffffff' : 'var(--neutral-600)',
                }}
              >
                {s.id}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={step === 5}
            className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: step === 5 ? 'var(--text-muted)' : 'var(--text-body)',
              background: 'var(--surface-card)',
              opacity: step === 5 ? 0.5 : 1,
              cursor: step === 5 ? 'not-allowed' : 'pointer',
            }}
          >
            下一步
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 主流程圖 */}
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="建立機器學習系統的五步驟迴圈：選特徵收集樣本、選效能指標、選演算法訓練模型、評估模型效能、調整超參數或換演算法，依序連接；評估後若表現不理想會繞回調整超參數、甚至繞回換演算法，形成反覆迭代的迴圈。"
      >
        <defs>
          <marker id="wf-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="wf-loop-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--blue-500)" />
          </marker>
        </defs>

        {/* 主序列：實線箭頭 1→2→3→4→5 */}
        {SEQUENCE.map(([a, b]) => {
          const p1 = edgePoint(POS[a], POS[b])
          const p2 = edgePoint(POS[b], POS[a])
          return (
            <line
              key={`${a}-${b}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--neutral-400)"
              strokeWidth={2}
              markerEnd="url(#wf-arrow)"
            />
          )
        })}

        {/* 迴圈虛線：④→⑤ 或 ④→③，依 loopPhase 動態畫出 */}
        <AnimatePresence>
          {loopPhase === 'to5' && (
            <motion.g key="loop-to5">
              <motion.path
                d={PATH_TO_5}
                fill="none"
                stroke="var(--blue-500)"
                strokeWidth={2}
                strokeDasharray="4 4"
                markerEnd="url(#wf-loop-arrow)"
                initial={pathInitial}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={pathTransition}
              />
              <motion.g
                initial={iconInitial}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={pathTransition}
              >
                <circle cx={LOOP_TO_5_ICON.x + 8} cy={LOOP_TO_5_ICON.y + 8} r={12} fill="var(--surface-page)" />
                <foreignObject x={LOOP_TO_5_ICON.x} y={LOOP_TO_5_ICON.y} width={16} height={16}>
                  <RotateCcw size={16} color="var(--blue-600)" />
                </foreignObject>
              </motion.g>
            </motion.g>
          )}
          {loopPhase === 'to3' && (
            <motion.g key="loop-to3">
              <motion.path
                d={PATH_TO_3}
                fill="none"
                stroke="var(--blue-500)"
                strokeWidth={2}
                strokeDasharray="2 6"
                markerEnd="url(#wf-loop-arrow)"
                initial={pathInitial}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={pathTransition}
              />
              <motion.g
                initial={iconInitial}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={pathTransition}
              >
                <circle cx={LOOP_TO_3_ICON.x + 8} cy={LOOP_TO_3_ICON.y + 8} r={12} fill="var(--surface-page)" />
                <foreignObject x={LOOP_TO_3_ICON.x} y={LOOP_TO_3_ICON.y} width={16} height={16}>
                  <Shuffle size={16} color="var(--blue-600)" />
                </foreignObject>
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* 中心提示 */}
        <foreignObject x={320 - 10} y={148} width={20} height={20}>
          <Repeat size={20} color="var(--neutral-400)" />
        </foreignObject>
        <text
          x={320}
          y={183}
          fontSize={11.5}
          fontWeight={600}
          fill="var(--neutral-400)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          反覆優化迴圈
        </text>

        {/* 節點本體畫在連線之上 */}
        {STEPS.map((s) => (
          <Node key={s.id} def={s} active={step === s.id} />
        ))}
      </svg>

      {/* 步驟④：評估結果如何？ */}
      {step === 4 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {completed ? (
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--success-50)',
                color: 'var(--success-500)',
              }}
            >
              <Check size={14} />
              表現理想，模型可以部署
            </span>
          ) : (
            <>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-body)' }}>
                評估結果如何？
              </span>
              <button
                type="button"
                onClick={handleGood}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--action-primary)',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                <Check size={14} />
                表現理想，完成
              </button>
              <button
                type="button"
                onClick={handleBad}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--surface-card)',
                  color: 'var(--blue-600)',
                  border: '1.5px solid var(--blue-500)',
                }}
              >
                {loopPhase === 'to5' ? <Shuffle size={14} /> : <RotateCcw size={14} />}
                表現不理想，調整
              </button>
            </>
          )}
        </div>
      )}

      {/* No Free Lunch 定理小面板 */}
      <div
        className="space-y-4"
        style={{
          background: 'var(--surface-sunken)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
        }}
      >
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
          No Free Lunch 定理：沒有萬能演算法
        </h4>

        <div className="grid grid-cols-3 gap-4">
          {SCENARIOS.map((scenario, sIdx) => (
            <div key={scenario.key} className="flex flex-col items-center">
              <div className="flex items-end gap-1.5 h-14">
                {scenario.bars.map((bar, bIdx) => (
                  <div key={bar.name} className="flex flex-col items-center justify-end h-full">
                    <motion.div
                      initial={shouldReduce ? false : { height: 0 }}
                      animate={{ height: `${bar.pct}%` }}
                      transition={{
                        duration: shouldReduce ? 0 : 0.32,
                        ease: 'easeOut',
                        delay: shouldReduce ? 0 : (sIdx * 3 + bIdx) * 0.05,
                      }}
                      style={{
                        width: 15,
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        background: BAR_COLORS[bar.name],
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1">
                {scenario.bars.map((bar) => (
                  <span
                    key={bar.name}
                    className="text-[11px] text-center"
                    style={{ width: 15, color: 'var(--text-muted)' }}
                  >
                    {bar.name}
                  </span>
                ))}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {scenario.label}
              </p>
              <p
                className="text-[12px] font-semibold"
                style={{ color: BAR_COLORS[scenario.best] }}
              >
                最佳：演算法 {scenario.best}
              </p>
            </div>
          ))}
        </div>

        <p
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: 'var(--text-body)' }}
        >
          <ArrowUp size={14} style={{ color: 'var(--blue-600)' }} />
          這就是為什麼步驟③通常要比較多種演算法
        </p>
      </div>
    </div>
  )
}
