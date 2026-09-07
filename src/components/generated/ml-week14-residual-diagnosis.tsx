import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import {
  Target,
  Layers,
  Waves,
  Search,
  LineChart,
  Gauge,
  Wrench,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * 殘差診斷互動元件：三種殘差形狀（離群值 / 共線性過擬合 / 結構性彎曲），
 * 讀者切換後看對應的散點圖、殘差圖與處方，並以四步驟迴圈收斂「先看殘差再選模型」的核心洞察。
 * 散點與殘差的座標皆由同一組數學關係推導（殘差 = 實際值 - 擬合值），
 * 確保兩張圖在視覺上互相呼應而非各自捏造。
 */

// ---------- 小工具 ----------

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

// 固定種子的簡易 PRNG（mulberry32），確保 SSR / CSR 產出完全一致，不會有 hydration mismatch
function mulberry32(seed: number): () => number {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- 幾何常數（viewBox 寬度 620，符合 <=660 限制）----------

const X0 = 54
const X1 = 606
const PW = X1 - X0

const S_TOP = 14
const S_BASE = 138 // 散點圖基線
const S_RANGE = S_BASE - S_TOP

const R_TOP = 14
const R_MID = 74 // 殘差圖零線
const R_BASE = 134
const R_RANGE = R_MID - R_TOP

const toX = (t: number): number => X0 + t * PW
const scatterY = (v: number): number => clamp(S_BASE - v * S_RANGE, 6, 152)
const residualY = (r: number): number => clamp(R_MID - r * R_RANGE, 6, 142)

function buildCurvePath(fn: (t: number) => number, toY: (v: number) => number, steps = 48): string {
  const parts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = toX(t).toFixed(1)
    const y = toY(fn(t)).toFixed(1)
    parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`)
  }
  return parts.join(' ')
}

// ---------- 資料型別 ----------

interface Dot {
  cx: number
  cy: number
  color: string
  r: number
}

interface LineSpec {
  d: string
  color: string
  dashed?: boolean
}

interface ShapeDef {
  id: 'outlier' | 'collinear' | 'nonlinear'
  tabLabel: string
  title: string
  icon: LucideIcon
  scatterDots: Dot[]
  scatterLines: LineSpec[]
  residualDots: Dot[]
  residualTrend?: LineSpec
  legend: { color: string; label: string }[]
  prescriptionTitle: string
  prescriptionBody: string
}

// ---------- 三種情境的資料建構（散點與殘差以同一組函式推導，互相對應）----------

function buildOutlierShape(): ShapeDef {
  const rng = mulberry32(7)
  const scatterDots: Dot[] = []
  const residualDots: Dot[] = []

  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const noise = (rng() - 0.5) * 0.16
    const v = clamp(t + noise, 0.04, 0.96)
    scatterDots.push({ cx: toX(t), cy: scatterY(v), color: 'var(--blue-500)', r: 3.4 })
    const resid = (v - t) * 1.6
    residualDots.push({ cx: toX(t), cy: residualY(resid), color: 'var(--blue-500)', r: 3 })
  }

  const outlierTs = [0.2, 0.5, 0.82]
  const outlierOffsets = [0.62, -0.58, 0.55]
  outlierTs.forEach((t, i) => {
    const v = t + outlierOffsets[i]
    scatterDots.push({ cx: toX(t), cy: scatterY(v), color: 'var(--danger-500)', r: 4.4 })
    const resid = (v - t) * 1.05
    residualDots.push({ cx: toX(t), cy: residualY(resid), color: 'var(--danger-500)', r: 4 })
  })

  return {
    id: 'outlier',
    tabLabel: '1・離群值',
    title: '少數點殘差特別大',
    icon: Target,
    scatterDots,
    scatterLines: [{ d: `M${toX(0)} ${scatterY(0)} L${toX(1)} ${scatterY(1)}`, color: 'var(--blue-700)' }],
    residualDots,
    legend: [
      { color: 'var(--blue-500)', label: '內群點：多數殘差在零線附近' },
      { color: 'var(--danger-500)', label: '離群點：殘差極大、把回歸線拉歪' },
    ],
    prescriptionTitle: 'RANSAC',
    prescriptionBody: '隨機抽子集配線，以內群點投票，離群點不參與最終擬合。',
  }
}

function buildCollinearShape(): ShapeDef {
  const rng = mulberry32(23)
  const curve = (t: number) => 0.5 + 0.36 * Math.sin(t * 9.5)
  const scatterDots: Dot[] = []
  const residualDots: Dot[] = []

  for (let i = 0; i <= 9; i++) {
    const t = i / 9
    const noise = (rng() - 0.5) * 0.02
    const v = clamp(curve(t) + noise, 0.03, 0.97)
    scatterDots.push({ cx: toX(t), cy: scatterY(v), color: 'var(--blue-500)', r: 3 })
    const resid = clamp((v - curve(t)) * 3, -1, 1)
    residualDots.push({ cx: toX(t), cy: residualY(resid), color: 'var(--blue-500)', r: 2.8 })
  }

  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8
    const noise = (rng() - 0.5) * 0.75
    const v = clamp(curve(t) + noise, 0.03, 0.97)
    scatterDots.push({ cx: toX(t), cy: scatterY(v), color: 'var(--orange-500)', r: 3.8 })
    const resid = clamp(v - curve(t), -1, 1)
    residualDots.push({ cx: toX(t), cy: residualY(resid), color: 'var(--orange-500)', r: 3.6 })
  }

  return {
    id: 'collinear',
    tabLabel: '2・共線性／過擬合',
    title: '訓練殘差小、測試殘差大',
    icon: Layers,
    scatterDots,
    scatterLines: [{ d: buildCurvePath(curve, scatterY), color: 'var(--blue-300)', dashed: true }],
    residualDots,
    legend: [
      { color: 'var(--blue-500)', label: '訓練點：幾乎完美貼合扭曲曲線' },
      { color: 'var(--orange-500)', label: '測試點：散得很開' },
    ],
    prescriptionTitle: '正則化',
    prescriptionBody: 'Ridge（L2）／Lasso（L1）／Elastic Net 三選一；細節見本頁的正則化視覺化元件。',
  }
}

function buildNonlinearShape(): ShapeDef {
  const rng = mulberry32(41)
  const hump = (t: number) => 0.85 - 3.4 * (t - 0.5) * (t - 0.5)
  const lineV = 0.55
  const scatterDots: Dot[] = []
  const residualDots: Dot[] = []

  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const noise = (rng() - 0.5) * 0.08
    const v = clamp(hump(t) + noise, 0.02, 0.98)
    scatterDots.push({ cx: toX(t), cy: scatterY(v), color: 'var(--blue-500)', r: 3.4 })
    const resid = (v - lineV) * 1.3
    residualDots.push({ cx: toX(t), cy: residualY(resid), color: 'var(--blue-500)', r: 3 })
  }

  const residualTrendD = buildCurvePath((t) => (hump(t) - lineV) * 1.3, residualY, 40)

  return {
    id: 'nonlinear',
    tabLabel: '3・結構性彎曲',
    title: '殘差沿零線呈明顯的曲線波動',
    icon: Waves,
    scatterDots,
    scatterLines: [
      { d: `M${toX(0)} ${scatterY(lineV)} L${toX(1)} ${scatterY(lineV)}`, color: 'var(--danger-500)', dashed: true },
    ],
    residualDots,
    residualTrend: { d: residualTrendD, color: 'var(--warning-500)' },
    legend: [
      { color: 'var(--blue-500)', label: '資料點：本身是彎的' },
      { color: 'var(--danger-500)', label: '硬配的直線' },
    ],
    prescriptionTitle: '先撐開特徵空間',
    prescriptionBody:
      '先試多項式／基底函數迴歸（仍是線性模型，特徵空間被撐開，需搭配正則化）；仍不理想再換決策樹迴歸或隨機森林迴歸。',
  }
}

const SHAPES: ShapeDef[] = [buildOutlierShape(), buildCollinearShape(), buildNonlinearShape()]

// ---------- 子元件 ----------

function ShapePanels({ shape }: { shape: ShapeDef }) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-[var(--text-strong)]">{shape.title}</div>

      <div>
        <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">散點圖・實際值與擬合線</div>
        <svg viewBox="0 0 620 160" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="散點圖">
          <rect x={40} y={4} width={580} height={150} rx={10} fill="var(--neutral-50)" />
          <line x1={X0} y1={S_BASE} x2={X1} y2={S_BASE} stroke="var(--border-subtle)" strokeWidth={1} />
          <line x1={X0} y1={S_TOP} x2={X0} y2={S_BASE} stroke="var(--border-subtle)" strokeWidth={1} />
          {shape.scatterLines.map((ln, i) => (
            <path
              key={i}
              d={ln.d}
              fill="none"
              stroke={ln.color}
              strokeWidth={2}
              strokeDasharray={ln.dashed ? '5 4' : undefined}
              strokeLinecap="round"
            />
          ))}
          {shape.scatterDots.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.color} fillOpacity={0.88} />
          ))}
        </svg>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">殘差圖・誤差分布</div>
        <svg viewBox="0 0 620 148" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="殘差圖">
          <rect x={40} y={4} width={580} height={140} rx={10} fill="var(--neutral-50)" />
          <line x1={X0} y1={R_TOP} x2={X0} y2={R_BASE} stroke="var(--border-subtle)" strokeWidth={1} />
          <line
            x1={X0}
            y1={R_MID}
            x2={X1}
            y2={R_MID}
            stroke="var(--neutral-400)"
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
          {shape.residualTrend && (
            <path
              d={shape.residualTrend.d}
              fill="none"
              stroke={shape.residualTrend.color}
              strokeWidth={1.6}
              strokeOpacity={0.7}
            />
          )}
          {shape.residualDots.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.color} fillOpacity={0.88} />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-body)]">
        {shape.legend.map((l, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--orange-700)]">
          <Wrench size={14} />
          處方：{shape.prescriptionTitle}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-body)]">{shape.prescriptionBody}</p>
      </div>
    </div>
  )
}

interface LoopStep {
  n: number
  label: string
  hint: string
  icon: LucideIcon
}

const LOOP_STEPS: LoopStep[] = [
  { n: 1, label: '探索資料', hint: '散佈圖矩陣、相關係數矩陣', icon: Search },
  { n: 2, label: 'OLS 配基準線', hint: '先配一條線性基準', icon: LineChart },
  { n: 3, label: '看指標與殘差圖', hint: 'MSE／MAE／R²，訓練 vs 測試', icon: Gauge },
]

function LoopStrip({ shape, reduce }: { shape: ShapeDef; reduce: boolean }) {
  return (
    <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
      <div className="text-xs font-medium text-[var(--text-muted)]">診斷迴圈</div>
      <div className="flex flex-wrap items-center gap-y-2">
        {LOOP_STEPS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.n} className="flex items-center gap-1">
              <div className="flex min-w-[92px] flex-col items-start gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-strong)]">
                  <Icon size={12} className="text-[var(--blue-500)]" />
                  {s.n}. {s.label}
                </div>
                <div className="text-[10px] leading-snug text-[var(--text-muted)]">{s.hint}</div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-[var(--neutral-400)]" />
            </div>
          )
        })}
        <motion.div
          key={reduce ? 'static-step4' : shape.id}
          initial={reduce ? false : { scale: 0.94, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex min-w-[92px] flex-col items-start gap-0.5 rounded-[var(--radius-md)] border-2 border-[var(--orange-500)] bg-[var(--orange-50)] px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange-700)]">
            <Wrench size={12} />
            4. 對症下藥
          </div>
          <div className="text-[10px] leading-snug text-[var(--orange-700)]">{shape.prescriptionTitle}</div>
        </motion.div>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
        <RotateCcw size={12} />
        回到第 2 步：重新配線，再看一次指標與殘差圖
      </div>
    </div>
  )
}

// ---------- 主元件 ----------

export default function MlWeek14ResidualDiagnosis() {
  const reduce = useReducedMotion() ?? false
  const [activeId, setActiveId] = useState<ShapeDef['id']>('outlier')
  const shape = useMemo(() => SHAPES.find((s) => s.id === activeId) ?? SHAPES[0], [activeId])

  return (
    <div className="not-prose mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="殘差形狀切換">
        {SHAPES.map((s) => {
          const active = s.id === activeId
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(s.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-[var(--blue-500)] bg-[var(--blue-50)] text-[var(--blue-700)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)]',
              )}
            >
              <Icon size={14} />
              {s.tabLabel}
            </button>
          )
        })}
      </div>

      {reduce ? (
        <ShapePanels shape={shape} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={shape.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ShapePanels shape={shape} />
          </motion.div>
        </AnimatePresence>
      )}

      <LoopStrip shape={shape} reduce={reduce} />
    </div>
  )
}
