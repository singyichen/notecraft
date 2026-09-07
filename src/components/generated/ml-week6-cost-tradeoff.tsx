import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { MousePointerClick, ArrowLeftRight } from 'lucide-react'

/**
 * 「訓練成本 vs 預測成本」二維定位圖。
 * 核心洞察：KNN 訓練免費、預測昂貴；核 SVM 訓練昂貴、預測便宜——
 * 成本會從哪一端付出去，決定它適不適合你的場景。
 */

type Level = '低' | '中' | '高'

type LinearKnob = {
  key: string
  label: string
  kind: 'linear'
  min: number
  max: number
  step: number
  default: number
}
type LogKnob = {
  key: string
  label: string
  kind: 'log'
  steps: number[]
  default: number
}
type Knob = LinearKnob | LogKnob

type ClassifierId =
  | 'perceptron'
  | 'logreg'
  | 'linear-svm'
  | 'decision-tree'
  | 'rbf-svm'
  | 'random-forest'
  | 'knn'

interface Classifier {
  id: ClassifierId
  order: number
  name: string
  trainLabel: Level
  predictLabel: Level
  x: number
  y: number
  highlight: boolean
  knobs: Knob[]
}

const LOG_C_STEPS = [0.001, 0.01, 0.1, 1, 10, 100]
const LOG_GAMMA_STEPS = [0.001, 0.01, 0.1, 1, 10]
const LOG_ETA_STEPS = [0.001, 0.01, 0.05, 0.1, 0.5, 1]

const CLASSIFIERS: Classifier[] = [
  {
    id: 'perceptron',
    order: 1,
    name: '感知器 / Adaline',
    trainLabel: '低',
    predictLabel: '低',
    x: 20,
    y: 288,
    highlight: false,
    knobs: [
      { key: 'perceptron.eta', label: '學習率 η (eta)', kind: 'log', steps: LOG_ETA_STEPS, default: 0.01 },
      { key: 'perceptron.n_iter', label: '迭代次數 (n_iter)', kind: 'linear', min: 10, max: 500, step: 10, default: 100 },
    ],
  },
  {
    id: 'logreg',
    order: 2,
    name: '邏輯斯迴歸',
    trainLabel: '低',
    predictLabel: '低',
    x: 20,
    y: 318,
    highlight: false,
    knobs: [{ key: 'logreg.C', label: '正則化強度 C', kind: 'log', steps: LOG_C_STEPS, default: 1 }],
  },
  {
    id: 'linear-svm',
    order: 3,
    name: '線性 SVM',
    trainLabel: '中',
    predictLabel: '低',
    x: 310,
    y: 292,
    highlight: false,
    knobs: [{ key: 'linear-svm.C', label: '正則化強度 C', kind: 'log', steps: LOG_C_STEPS, default: 1 }],
  },
  {
    id: 'decision-tree',
    order: 4,
    name: '決策樹',
    trainLabel: '中',
    predictLabel: '低',
    x: 310,
    y: 320,
    highlight: false,
    knobs: [{ key: 'decision-tree.max_depth', label: '樹深上限 max_depth', kind: 'linear', min: 1, max: 20, step: 1, default: 5 }],
  },
  {
    id: 'rbf-svm',
    order: 5,
    name: 'RBF 核 SVM',
    trainLabel: '高',
    predictLabel: '低',
    x: 600,
    y: 310,
    highlight: true,
    knobs: [
      { key: 'rbf-svm.C', label: '正則化強度 C', kind: 'log', steps: LOG_C_STEPS, default: 1 },
      { key: 'rbf-svm.gamma', label: '核函數寬度 gamma', kind: 'log', steps: LOG_GAMMA_STEPS, default: 0.1 },
    ],
  },
  {
    id: 'random-forest',
    order: 6,
    name: '隨機森林',
    trainLabel: '高',
    predictLabel: '中',
    x: 600,
    y: 170,
    highlight: false,
    knobs: [
      { key: 'random-forest.n_estimators', label: '樹的數量 n_estimators', kind: 'linear', min: 10, max: 500, step: 10, default: 100 },
      { key: 'random-forest.max_depth', label: '樹深上限 max_depth', kind: 'linear', min: 1, max: 20, step: 1, default: 5 },
    ],
  },
  {
    id: 'knn',
    order: 7,
    name: 'k 近鄰（KNN）',
    trainLabel: '低',
    predictLabel: '高',
    x: 20,
    y: 30,
    highlight: true,
    knobs: [{ key: 'knn.k', label: 'k（n_neighbors）', kind: 'linear', min: 1, max: 50, step: 1, default: 5 }],
  },
]

const DEFAULT_VALUES: Record<string, number> = Object.fromEntries(
  CLASSIFIERS.flatMap((c) => c.knobs.map((k) => [k.key, k.default])),
)

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n)
  const s = n.toFixed(3)
  return s.replace(/0+$/, '').replace(/\.$/, '')
}

// 座標系（viewBox 620x350，寬度未超過 660 上限）
const AXIS_X = { x1: 14, x2: 606, y: 328 }
const AXIS_Y = { y1: 14, y2: 328, x: 14 }
const X_TICKS = [20, 310, 600]
const Y_TICKS = [310, 170, 30]

export default function MlWeek6CostTradeoff() {
  const reduce = useReducedMotion() ?? false
  const [selectedId, setSelectedId] = useState<ClassifierId | null>(null)
  const [values, setValues] = useState<Record<string, number>>(DEFAULT_VALUES)

  const selected = CLASSIFIERS.find((c) => c.id === selectedId) ?? null

  const select = (id: ClassifierId) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const onKeyActivate = (id: ClassifierId) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select(id)
    }
  }

  const setKnobValue = (key: string, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const knn = CLASSIFIERS.find((c) => c.id === 'knn')!
  const rbf = CLASSIFIERS.find((c) => c.id === 'rbf-svm')!

  return (
    <div className="not-prose max-w-[640px] mx-auto space-y-4">
      {/* ── 標題 ── */}
      <div className="flex items-center justify-between">
        <h4 className="m-0 text-sm font-semibold text-[var(--text-strong)]">訓練成本 vs 預測成本</h4>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--orange-600)]">
          <ArrowLeftRight size={13} />
          <span>KNN 與 RBF 核 SVM：相反的取捨</span>
        </div>
      </div>

      {/* ── 散點圖 ── */}
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-between py-[10px] text-xs text-[var(--text-muted)] text-right shrink-0 w-6">
          <span>高</span>
          <span>中</span>
          <span>低</span>
        </div>
        <div className="flex-1 min-w-0">
          <svg viewBox="0 0 620 350" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="七個分類器的訓練成本與預測成本定位圖">
            {/* 參考格線（中刻度） */}
            <line x1={310} y1={AXIS_Y.y1} x2={310} y2={AXIS_X.y} stroke="var(--neutral-200)" strokeWidth={1} strokeDasharray="3 4" />
            <line x1={AXIS_X.x1} y1={170} x2={AXIS_X.x2} y2={170} stroke="var(--neutral-200)" strokeWidth={1} strokeDasharray="3 4" />

            {/* 軸線 */}
            <line x1={AXIS_Y.x} y1={AXIS_Y.y1} x2={AXIS_Y.x} y2={AXIS_Y.y2} stroke="var(--neutral-400)" strokeWidth={1.5} />
            <line x1={AXIS_X.x1} y1={AXIS_X.y} x2={AXIS_X.x2} y2={AXIS_X.y} stroke="var(--neutral-400)" strokeWidth={1.5} />

            {/* 刻度 */}
            {X_TICKS.map((x) => (
              <line key={`xt-${x}`} x1={x} y1={AXIS_X.y} x2={x} y2={AXIS_X.y + 6} stroke="var(--neutral-400)" strokeWidth={1.5} />
            ))}
            {Y_TICKS.map((y) => (
              <line key={`yt-${y}`} x1={AXIS_Y.x - 6} y1={y} x2={AXIS_Y.x} y2={y} stroke="var(--neutral-400)" strokeWidth={1.5} />
            ))}

            {/* KNN <-> RBF SVM 相反取捨連線 */}
            <line
              x1={knn.x}
              y1={knn.y}
              x2={rbf.x}
              y2={rbf.y}
              stroke="var(--orange-500)"
              strokeWidth={1.5}
              strokeDasharray="7 6"
              opacity={0.55}
            />

            {/* 資料點 */}
            {CLASSIFIERS.map((c) => {
              const isSelected = selectedId === c.id
              const baseR = c.highlight ? 12 : 9
              const fill = c.highlight ? 'var(--orange-500)' : 'var(--neutral-400)'
              const stroke = c.highlight ? 'var(--orange-700)' : 'var(--neutral-600)'
              return (
                <g
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`選取 ${c.name}`}
                  aria-pressed={isSelected}
                  className="cursor-pointer outline-none"
                  onClick={() => select(c.id)}
                  onKeyDown={onKeyActivate(c.id)}
                >
                  {isSelected && (
                    <motion.circle
                      cx={c.x}
                      cy={c.y}
                      r={baseR + 6}
                      fill="none"
                      stroke="var(--blue-500)"
                      strokeWidth={2}
                      initial={reduce ? undefined : { opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
                      style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                    />
                  )}
                  <motion.circle
                    cx={c.x}
                    cy={c.y}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    initial={false}
                    animate={{ r: isSelected ? baseR + 2 : baseR }}
                    transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
                  />
                  <text
                    x={c.x}
                    y={c.y + 3.5}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {c.order}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <div className="flex justify-between text-xs text-[var(--text-muted)] pl-8 pr-1">
        <span>低</span>
        <span>中</span>
        <span>高</span>
      </div>
      <div className="flex justify-between text-xs text-[var(--text-muted)] pl-8 pr-1 -mt-2">
        <span className="italic">訓練成本 →</span>
        <span className="italic">（縱軸為預測成本 ↑）</span>
      </div>

      {/* ── 圖例 ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {CLASSIFIERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => select(c.id)}
            className="flex items-center gap-2 text-left text-xs px-1.5 py-1 rounded-[var(--radius-sm)] transition-colors"
            style={{
              background: selectedId === c.id ? 'var(--blue-50)' : 'transparent',
              color: 'var(--text-body)',
            }}
            aria-pressed={selectedId === c.id}
          >
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white shrink-0"
              style={{ background: c.highlight ? 'var(--orange-500)' : 'var(--neutral-400)' }}
            >
              {c.order}
            </span>
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>

      {/* ── 調參旋鈕面板（固定高度，避免版面跳動） ── */}
      <div className="h-[210px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div
              key={selected.id}
              initial={reduce ? undefined : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h5 className="m-0 text-sm font-semibold text-[var(--text-strong)]">{selected.name}</h5>
                <span className="text-xs text-[var(--text-muted)]">
                  訓練 {selected.trainLabel} · 預測 {selected.predictLabel}
                </span>
              </div>
              <div className="space-y-3">
                {selected.knobs.map((knob) => {
                  const value = values[knob.key] ?? knob.default
                  return (
                    <div key={knob.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-body)]">{knob.label}</span>
                        <span className="font-semibold text-[var(--blue-700)]">{fmtNum(value)}</span>
                      </div>
                      {knob.kind === 'linear' ? (
                        <input
                          type="range"
                          min={knob.min}
                          max={knob.max}
                          step={knob.step}
                          value={value}
                          onChange={(e) => setKnobValue(knob.key, Number(e.target.value))}
                          className="w-full accent-[var(--blue-600)]"
                          aria-label={knob.label}
                        />
                      ) : (
                        <input
                          type="range"
                          min={0}
                          max={knob.steps.length - 1}
                          step={1}
                          value={Math.max(0, knob.steps.indexOf(value))}
                          onChange={(e) => setKnobValue(knob.key, knob.steps[Number(e.target.value)])}
                          className="w-full accent-[var(--blue-600)]"
                          aria-label={knob.label}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={reduce ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
              className="h-full flex flex-col items-center justify-center text-center gap-2 text-[var(--text-muted)]"
            >
              <MousePointerClick size={20} />
              <p className="m-0 text-xs leading-relaxed">
                點選上方任一個分類器（圖上的點或下方圖例），
                <br />
                查看它的主要調參旋鈕。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="m-0 text-xs text-[var(--text-muted)] leading-relaxed">
        座標軸為相對量級（低 / 中 / 高），非真實數值。旋鈕僅示意各分類器主要的調參項與其典型範圍，滑動不會實際訓練模型。
      </p>
    </div>
  )
}
