/**
 * 核心洞察：前向傳播與反向傳播用的是「同一組權重」——前向沿 W 把訊號往前送
 * （x -> z_h -> a_h -> z_out -> a_out），反向就沿 Wᵀ 把責任往回送
 * （delta_out -> ×Wᵀ -> delta_h），兩者互為轉置、方向相反。反向每退一層都在
 * 重複同一個小動作：乘權重轉置、再乘該層激活函數的導數。這張圖用同一副網路
 * 骨架、兩種色系與相反箭頭，讓這個「同一組權重、雙向資料流」的關係可以被
 * 播放 / 手動切換出來，並在動畫關閉時仍靠靜態標註看懂兩個方向。
 */

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

type Mode = 'forward' | 'backward'
type LayerKey = 'input' | 'hidden' | 'output'
type EdgeKey = 'A' | 'B'

interface StepDef {
  formula: string
  desc: string
  litNodes: LayerKey[]
  litEdges: EdgeKey[]
  showLoss?: boolean
}

const FORWARD_STEPS: StepDef[] = [
  { formula: 'x', desc: '輸入 784 維像素向量 x（版面只畫少數代表節點，其餘以省略號表示）。', litNodes: ['input'], litEdges: [] },
  { formula: 'z_h = x · W_hᵀ + b_h', desc: '輸入沿權重 W_h 送到隱藏層，得到隱藏層的淨輸入 z_h。', litNodes: [], litEdges: ['A'] },
  { formula: 'a_h = sigmoid(z_h)', desc: '過 sigmoid 得到隱藏層激活值 a_h——這 50 個值可以想成自己長出來的「筆畫偵測器」。', litNodes: ['hidden'], litEdges: [] },
  { formula: 'z_out = a_h · W_outᵀ + b_out', desc: 'a_h 再沿權重 W_out 送到輸出層，得到 10 個淨輸入 z_out。', litNodes: [], litEdges: ['B'] },
  { formula: 'a_out = sigmoid(z_out)', desc: '過 sigmoid 得到 10 個介於 0–1 的預測機率，最大值就是預測類別。', litNodes: ['output'], litEdges: [] },
  { formula: 'L = MSE(a_out, y_onehot)', desc: '標籤先 one-hot 編碼，再與 a_out 逐元素相減取均方誤差，把「錯得多離譜」濃縮成一個數字。', litNodes: ['output'], litEdges: [], showLoss: true },
]

const BACKWARD_STEPS: StepDef[] = [
  { formula: 'delta_out = (a_out − y) ⊙ sigmoid′(z_out)', desc: '損失對輸出激活值的偏導 × sigmoid 導數，這是輸出層每個神經元該扛的責任。', litNodes: ['output'], litEdges: [], showLoss: true },
  { formula: 'ΔW_out = delta_out · a_hᵀ', desc: '輸出層權重的梯度＝下游責任 × 上游送進來的訊號強度 a_h。', litNodes: ['output'], litEdges: ['B'] },
  { formula: 'delta_out · W_out（轉置回送）', desc: '把責任乘上「同一組」輸出層權重的轉置 W_outᵀ，沿原本的連線往回送到隱藏層——前向用 W，反向用 Wᵀ。', litNodes: [], litEdges: ['B'] },
  { formula: 'delta_h = (delta_out·W_out) ⊙ sigmoid′(z_h)', desc: '再乘上隱藏層自己 sigmoid 的導數，得到隱藏層責任 delta_h——同一個小動作在這裡又重複一次。', litNodes: ['hidden'], litEdges: [] },
  { formula: 'ΔW_h = delta_h · xᵀ', desc: '隱藏層權重的梯度＝責任 × 輸入 x，剩下 W -= learning_rate × grad 就是梯度下降。', litNodes: ['hidden'], litEdges: ['A'] },
]

const FORWARD_COLOR = 'var(--blue-500)'
const FORWARD_COLOR_DARK = 'var(--blue-700)'
const BACKWARD_COLOR = 'var(--orange-500)'
const BACKWARD_COLOR_DARK = 'var(--orange-700)'

const INPUT_X = 110
const HIDDEN_X = 460
const OUTPUT_X = 810

const INPUT_REAL_Y = [40, 110, 180, 320, 390]
const INPUT_ELLIPSIS_Y = 250
const HIDDEN_REAL_Y = [40, 100, 160, 280, 340, 400]
const HIDDEN_ELLIPSIS_Y = 220
const OUTPUT_Y = Array.from({ length: 10 }, (_, i) => 30 + i * 42)

interface Edge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  sample: boolean
}

function buildEdges(xa: number, ya: number[], xb: number, yb: number[]): Edge[] {
  const edges: Edge[] = []
  ya.forEach((y1, i) => {
    yb.forEach((y2, j) => {
      edges.push({ id: `${i}-${j}`, x1: xa, y1, x2: xb, y2, sample: i === 0 && j === 0 })
    })
  })
  return edges
}

function NodeCircle({
  x,
  y,
  r,
  lit,
  mode,
  label,
  reduced,
}: {
  x: number
  y: number
  r: number
  lit: boolean
  mode: Mode
  label?: string
  reduced: boolean
}) {
  const color = mode === 'forward' ? FORWARD_COLOR : BACKWARD_COLOR
  const colorDark = mode === 'forward' ? FORWARD_COLOR_DARK : BACKWARD_COLOR_DARK
  return (
    <g>
      <motion.circle
        cx={x}
        cy={y}
        fill={lit ? color : 'var(--neutral-100)'}
        stroke={lit ? colorDark : 'var(--neutral-400)'}
        strokeWidth={lit ? 2 : 1.5}
        animate={{ r: lit && !reduced ? [r, r + 2, r] : r }}
        transition={lit && !reduced ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.24, ease: 'easeOut' }}
      />
      {label !== undefined && (
        <text
          x={x}
          y={y + 4}
          fontSize={12}
          fontWeight={700}
          textAnchor="middle"
          fill={lit ? '#ffffff' : 'var(--neutral-600)'}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

function EllipsisMark({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y + 5} fontSize={16} textAnchor="middle" fill="var(--neutral-400)">
      ⋮
    </text>
  )
}

function EdgeLine({ edge, active, mode, reduced }: { edge: Edge; active: boolean; mode: Mode; reduced: boolean }) {
  const color = mode === 'forward' ? FORWARD_COLOR : BACKWARD_COLOR
  if (edge.sample && active && !reduced) {
    return (
      <motion.line
        x1={edge.x1}
        y1={edge.y1}
        x2={edge.x2}
        y2={edge.y2}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="7 6"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -39 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    )
  }
  return (
    <line
      x1={edge.x1}
      y1={edge.y1}
      x2={edge.x2}
      y2={edge.y2}
      stroke={active ? color : 'var(--neutral-300)'}
      strokeWidth={active ? 1.6 : 1}
      opacity={active ? 0.7 : 0.16}
    />
  )
}

function EdgeGroupBadge({
  x,
  y,
  active,
  mode,
  label,
  staticLabel,
}: {
  x: number
  y: number
  active: boolean
  mode: Mode
  label: string
  staticLabel: string
}) {
  const isForward = mode === 'forward'
  const color = active ? (isForward ? FORWARD_COLOR_DARK : BACKWARD_COLOR_DARK) : 'var(--neutral-400)'
  const bg = active ? (isForward ? 'var(--surface-brand-soft)' : 'var(--surface-accent-soft)') : 'var(--surface-page)'
  const text = active ? label : staticLabel
  const w = Math.max(60, text.length * 7 + 28)
  return (
    <foreignObject x={x - w / 2} y={y - 13} width={w} height={26}>
      <div
        className="flex h-full items-center justify-center gap-1 rounded-full text-[11px] font-mono font-semibold"
        style={{ background: bg, color, border: `1px solid ${active ? color : 'var(--border-subtle)'}` }}
      >
        {isForward ? (active ? '→' : '') : active ? '←' : ''}
        <span>{text}</span>
      </div>
    </foreignObject>
  )
}

export default function MlWeek10Concept() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const [mode, setMode] = useState<Mode>('forward')
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  const steps = mode === 'forward' ? FORWARD_STEPS : BACKWARD_STEPS
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  // 自動循環：跑完一段方向的所有步驟後，切換到另一個方向重新開始。
  // 尊重 prefers-reduced-motion：關閉動態效果時完全停用自動播放計時器。
  useEffect(() => {
    if (!playing || shouldReduceMotion) return
    const isLast = stepIndex >= steps.length - 1
    const delay = isLast ? 2200 : 1400
    const timer = setTimeout(() => {
      if (isLast) {
        setMode((m) => (m === 'forward' ? 'backward' : 'forward'))
        setStepIndex(0)
      } else {
        setStepIndex((i) => i + 1)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [playing, shouldReduceMotion, mode, stepIndex, steps.length])

  function switchMode(next: Mode) {
    setMode(next)
    setStepIndex(0)
  }

  function goNext() {
    setStepIndex((i) => {
      if (i + 1 < steps.length) return i + 1
      setMode((m) => (m === 'forward' ? 'backward' : 'forward'))
      return 0
    })
  }

  function goPrev() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  const inputEdges = useMemo(() => buildEdges(INPUT_X, INPUT_REAL_Y, HIDDEN_X, HIDDEN_REAL_Y), [])
  const outputEdges = useMemo(() => buildEdges(HIDDEN_X, HIDDEN_REAL_Y, OUTPUT_X, OUTPUT_Y), [])

  const isInputLit = step.litNodes.includes('input')
  const isHiddenLit = step.litNodes.includes('hidden')
  const isOutputLit = step.litNodes.includes('output')
  const isEdgeALit = step.litEdges.includes('A')
  const isEdgeBLit = step.litEdges.includes('B')

  // 範例：真值標籤是 3，預測機率在 3 最高、8 次之——呼應摘要裡「這比較像 3 還是 8」的例子。
  const predicted = [0.02, 0.01, 0.03, 0.62, 0.03, 0.02, 0.01, 0.02, 0.22, 0.02]
  const trueLabel = 3
  const mse = useMemo(() => {
    const sum = predicted.reduce((acc, p, i) => acc + (p - (i === trueLabel ? 1 : 0)) ** 2, 0)
    return sum / predicted.length
  }, [])

  const modeColor = mode === 'forward' ? FORWARD_COLOR : BACKWARD_COLOR
  const modeColorDark = mode === 'forward' ? FORWARD_COLOR_DARK : BACKWARD_COLOR_DARK

  const edgeALabel = mode === 'forward' ? 'z_h' : isEdgeALit ? 'ΔW_h' : 'W_h'
  const edgeBLabel = mode === 'forward' ? 'z_out' : isEdgeBLit ? 'ΔW_out / Wᵀ' : 'W_out'

  return (
    <div className="not-prose w-full max-w-4xl mx-auto space-y-4">
      {/* 控制列 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchMode('forward')}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'forward' ? FORWARD_COLOR : 'var(--surface-sunken)',
              color: mode === 'forward' ? '#ffffff' : 'var(--text-body)',
            }}
          >
            前向傳播
          </button>
          <button
            type="button"
            onClick={() => switchMode('backward')}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'backward' ? BACKWARD_COLOR : 'var(--surface-sunken)',
              color: mode === 'backward' ? '#ffffff' : 'var(--text-body)',
            }}
          >
            反向傳播
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            aria-label="上一步"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: 'var(--surface-sunken)', color: 'var(--text-body)' }}
          >
            <ChevronLeft size={16} />
          </button>
          {!shouldReduceMotion && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? '暫停自動播放' : '開始自動播放'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: 'var(--surface-sunken)', color: 'var(--text-body)' }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            aria-label="下一步"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'var(--surface-sunken)', color: 'var(--text-body)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {shouldReduceMotion && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          已依系統設定關閉自動播放與動態效果，請用上方按鈕手動切換方向與步驟；靜態標註已能呈現兩個方向的差異。
        </p>
      )}

      {/* 步驟進度點 */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`跳到第 ${i + 1} 步`}
            onClick={() => setStepIndex(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === stepIndex ? 20 : 8,
              background: i === stepIndex ? modeColorDark : 'var(--neutral-200)',
            }}
          />
        ))}
      </div>

      {/* 網路骨架 + 損失面板 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 ${OUTPUT_X + 70} 470`}
            width="100%"
            role="img"
            aria-label="三層神經網路：輸入層 784 像素（代表節點）、隱藏層 50 個神經元（代表節點）、輸出層 10 個類別 0 到 9。前向傳播時訊號由左往右流動，依序算出 z_h、a_h、z_out、a_out 並算出與標籤比對的 MSE 損失；反向傳播時責任由右往左流動，沿同一組權重的轉置送回，依序算出 delta_out、往回乘 W 轉置、算出 delta_h，兩個方向互為轉置。"
          >
            {/* 邊 */}
            {inputEdges.map((e) => (
              <EdgeLine key={e.id} edge={e} active={isEdgeALit} mode={mode} reduced={shouldReduceMotion} />
            ))}
            {outputEdges.map((e) => (
              <EdgeLine key={e.id} edge={e} active={isEdgeBLit} mode={mode} reduced={shouldReduceMotion} />
            ))}

            {/* 邊群組標籤（前向顯示量、反向顯示梯度；未啟用時顯示共用權重名稱） */}
            <EdgeGroupBadge
              x={(INPUT_X + HIDDEN_X) / 2}
              y={235}
              active={isEdgeALit}
              mode={mode}
              label={edgeALabel}
              staticLabel="W_h"
            />
            <EdgeGroupBadge
              x={(HIDDEN_X + OUTPUT_X) / 2}
              y={219}
              active={isEdgeBLit}
              mode={mode}
              label={edgeBLabel}
              staticLabel="W_out"
            />

            {/* 節點 */}
            {INPUT_REAL_Y.map((y, i) => (
              <NodeCircle key={i} x={INPUT_X} y={y} r={13} lit={isInputLit} mode={mode} reduced={shouldReduceMotion} />
            ))}
            <EllipsisMark x={INPUT_X} y={INPUT_ELLIPSIS_Y} />

            {HIDDEN_REAL_Y.map((y, i) => (
              <NodeCircle key={i} x={HIDDEN_X} y={y} r={14} lit={isHiddenLit} mode={mode} reduced={shouldReduceMotion} />
            ))}
            <EllipsisMark x={HIDDEN_X} y={HIDDEN_ELLIPSIS_Y} />

            {OUTPUT_Y.map((y, i) => (
              <NodeCircle
                key={i}
                x={OUTPUT_X}
                y={y}
                r={13}
                lit={isOutputLit}
                mode={mode}
                label={String(i)}
                reduced={shouldReduceMotion}
              />
            ))}

            {/* 欄標題 */}
            <text x={INPUT_X} y={20} fontSize={12.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
              輸入層
            </text>
            <text x={INPUT_X} y={440} fontSize={10.5} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              784 像素（代表節點）
            </text>
            <text x={HIDDEN_X} y={20} fontSize={12.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
              隱藏層
            </text>
            <text x={HIDDEN_X} y={440} fontSize={10.5} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              50 個神經元（代表節點）
            </text>
            <text x={OUTPUT_X} y={20} fontSize={12.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
              輸出層
            </text>
            <text x={OUTPUT_X} y={440} fontSize={10.5} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              10 個類別 0–9
            </text>
          </svg>
        </div>

        {/* 損失面板：預測機率 vs one-hot 標籤 */}
        <div
          className="lg:w-48 shrink-0 rounded-xl p-3 space-y-2"
          style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
            預測機率 a_out vs 標籤
          </p>
          <div className="space-y-1">
            {predicted.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="w-3 text-[10px] font-mono text-right"
                  style={{ color: i === trueLabel ? modeColorDark : 'var(--text-muted)', fontWeight: i === trueLabel ? 700 : 400 }}
                >
                  {i}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--neutral-200)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p * 100}%`,
                      background: i === trueLabel ? modeColorDark : 'var(--neutral-400)',
                      transition: shouldReduceMotion ? 'none' : 'width 0.3s ease-out',
                    }}
                  />
                </div>
                {i === trueLabel && (
                  <span className="text-[9px] font-semibold" style={{ color: modeColorDark }}>
                    y=1
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] font-mono pt-1 border-t" style={{ color: 'var(--text-body)', borderColor: 'var(--border-subtle)' }}>
            MSE ≈ {mse.toFixed(3)}
          </p>
        </div>
      </div>

      {/* 目前步驟說明（動態文字面板） */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${stepIndex}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="rounded-xl p-3 space-y-1"
          style={{ background: mode === 'forward' ? 'var(--surface-brand-soft)' : 'var(--surface-accent-soft)', border: `1px solid ${modeColor}` }}
        >
          <p className="text-sm font-mono font-semibold" style={{ color: modeColorDark }}>
            {step.formula}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-body)' }}>
            {step.desc}
          </p>
        </motion.div>
      </AnimatePresence>
      <div aria-live="polite" className="sr-only">
        {mode === 'forward' ? '前向傳播' : '反向傳播'}：{step.formula}。{step.desc}
      </div>

      {/* 常駐核心洞察，不隨步驟消失 */}
      <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeftRight size={14} className="mt-0.5 shrink-0" />
        <p>
          核心洞察：前向傳播沿 <span className="font-mono">W</span> 把訊號往前送，反向傳播沿同一組權重的轉置 <span className="font-mono">Wᵀ</span> 把責任往回送——兩者共用一份參數，方向相反、角色互補。
        </p>
      </div>
    </div>
  )
}
