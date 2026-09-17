import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Hourglass, CircleCheck, TriangleAlert, Play, RotateCcw } from 'lucide-react'

// ── geometry ─────────────────────────────────────────────────────────────

const PLOT_LEFT = 56
const PLOT_RIGHT = 584
const PLOT_TOP = 36
const PLOT_BOTTOM = 268
const W_MIN = -3.3
const W_MAX = 3.3
const L_MAX = W_MAX * W_MAX

function scaleX(w: number): number {
  return PLOT_LEFT + ((w - W_MIN) / (W_MAX - W_MIN)) * (PLOT_RIGHT - PLOT_LEFT)
}

function scaleY(loss: number): number {
  return PLOT_BOTTOM - (loss / L_MAX) * (PLOT_BOTTOM - PLOT_TOP)
}

const CURVE_POINTS = (() => {
  const pts: string[] = []
  for (let w = W_MIN; w <= W_MAX + 1e-9; w += 0.1) {
    const x = scaleX(w)
    const y = scaleY(w * w)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})()

const MIN_X = scaleX(0)

// ── band logic ───────────────────────────────────────────────────────────

type Band = 'slow' | 'smooth' | 'diverge'

const START_W = -2.4

// 三段各自寫死的位移序列（單位：w），不是同一條真實梯度下降公式跑出來的，
// 而是刻意設計成三種清楚可辨的行為。
const SEQUENCES: Record<Band, number[]> = {
  slow: [-2.04, -1.734, -1.474, -1.253, -1.065, -0.905, -0.769, -0.654],
  smooth: [-1.2, -0.6, -0.3, -0.15, -0.075, -0.0375, -0.01875, -0.009375],
  diverge: [1.7, -2.5, 3.2, -4.6],
}

function computeBand(eta: number): Band {
  if (eta < 0.1) return 'slow'
  if (eta <= 0.6) return 'smooth'
  return 'diverge'
}

interface BandInfo {
  label: string
  hint: string
  badgeBg: string
  badgeText: string
}

const BAND_INFO: Record<Band, BandInfo> = {
  slow: {
    label: '收斂太慢',
    hint: '每一步都在縮小，但 8 步後仍離最低點有段距離。',
    badgeBg: 'var(--neutral-100)',
    badgeText: 'var(--neutral-600)',
  },
  smooth: {
    label: '平滑收斂',
    hint: '穩定地一步步變小，幾步之內就收斂到曲線底部。',
    badgeBg: 'var(--orange-50)',
    badgeText: 'var(--orange-600)',
  },
  diverge: {
    label: '發散',
    hint: '每一步都比前一步彈得更遠，數值持續暴增，已飛出可視範圍。',
    badgeBg: 'var(--danger-50)',
    badgeText: 'var(--danger-500)',
  },
}

interface Point {
  x: number
  y: number
  w: number
  loss: number
  isExit: boolean
}

function computePoint(band: Band, index: number): Point {
  const seq = SEQUENCES[band]
  const lastIndex = seq.length - 1
  const clampedIndex = Math.min(index, lastIndex)
  const w = clampedIndex < 0 ? START_W : seq[clampedIndex]
  const loss = w * w
  const isExit = band === 'diverge' && clampedIndex === lastIndex
  const x = scaleX(w)
  // 一般座標落在繪圖區內不受影響；發散最後一步刻意讓 y 貼齊上緣，
  // x 則允許超出 viewBox（由 SVG 預設的 overflow: hidden 自然裁切），
  // 造成「飛出畫面」的視覺效果，同時數值列仍顯示真實的暴增後 L(w)。
  const y = Math.min(Math.max(scaleY(loss), 6), 314)
  return { x, y, w, loss, isExit }
}

const TRAIL_OPACITIES = [0.22, 0.42, 0.62]

export default function MlWeek3LearningRateSlider() {
  const shouldReduceMotion = useReducedMotion() ?? false

  const [eta, setEta] = useState(0.3)
  const [stepIndex, setStepIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)

  const band = useMemo(() => computeBand(eta), [eta])
  const info = BAND_INFO[band]
  const sequence = SEQUENCES[band]
  const lastIndex = sequence.length - 1

  // 逐步播放：每 550ms 前進一步，走到序列末端就停止。
  useEffect(() => {
    if (!playing || shouldReduceMotion) return
    if (stepIndex >= lastIndex) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      setStepIndex((i) => i + 1)
    }, 550)
    return () => window.clearTimeout(timer)
  }, [playing, stepIndex, lastIndex, shouldReduceMotion])

  function handleEtaChange(e: ChangeEvent<HTMLInputElement>) {
    setEta(Number(e.target.value))
    setPlaying(false)
    setStepIndex(-1)
  }

  function startPlayback() {
    if (shouldReduceMotion) return
    setStepIndex(-1)
    setPlaying(true)
  }

  const effectiveIndex = shouldReduceMotion ? lastIndex : stepIndex
  const currentPoint = computePoint(band, effectiveIndex)

  const trailIndices = [lastIndex - 3, lastIndex - 2, lastIndex - 1].filter((i) => i >= -1)

  const hasStarted = stepIndex > -1 || playing
  const buttonLabel = shouldReduceMotion ? '已顯示最終狀態' : hasStarted ? '重新開始' : '開始'
  const stepLabel = effectiveIndex === -1 ? '起始點' : `第 ${effectiveIndex + 1} 步`

  return (
    <div className="not-prose flex flex-col gap-5 max-w-2xl">
      {/* 控制列：滑桿 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="eta-slider" className="text-[13px] font-medium text-[var(--text-body)]">
            學習率 η
          </label>
          <span className="text-[13px] font-semibold tabular-nums text-[var(--blue-700)]">
            {eta.toFixed(2)}
          </span>
        </div>
        <input
          id="eta-slider"
          type="range"
          min={0.01}
          max={1.2}
          step={0.01}
          value={eta}
          onChange={handleEtaChange}
          onMouseUp={startPlayback}
          onTouchEnd={startPlayback}
          className="w-full accent-[var(--blue-600)]"
        />
      </div>

      {/* 狀態徽章 + 文字提示 + 開始按鈕 */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-[13px] font-semibold"
          style={{ background: info.badgeBg, color: info.badgeText }}
        >
          {band === 'slow' && <Hourglass size={16} color="currentColor" />}
          {band === 'smooth' && <CircleCheck size={16} color="currentColor" />}
          {band === 'diverge' && <TriangleAlert size={16} color="currentColor" />}
          {info.label}
        </span>
        <span className="text-[13px] text-[var(--text-muted)] flex-1 min-w-[160px]">{info.hint}</span>
        <button
          type="button"
          onClick={startPlayback}
          disabled={shouldReduceMotion}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-pill)] text-[13px] font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'var(--action-primary)' }}
        >
          {hasStarted ? <RotateCcw size={14} color="currentColor" /> : <Play size={14} color="currentColor" />}
          {buttonLabel}
        </button>
      </div>

      {/* 損失曲線 */}
      <div className="relative w-full">
        <svg
          viewBox="0 0 640 320"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="損失曲線與學習率演示"
        >
          {/* 全域最小值虛線 */}
          <line
            x1={MIN_X}
            y1={PLOT_TOP}
            x2={MIN_X}
            y2={PLOT_BOTTOM}
            stroke="var(--neutral-300)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={MIN_X}
            y={PLOT_TOP - 12}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-muted)"
          >
            Global loss minimum
          </text>

          {/* 拋物線 */}
          <polyline
            points={CURVE_POINTS}
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* reduced-motion：最後幾步的殘影軌跡 */}
          {shouldReduceMotion &&
            trailIndices.map((idx, i) => {
              const p = computePoint(band, idx)
              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill="var(--blue-300)"
                  opacity={TRAIL_OPACITIES[i] ?? 0.4}
                />
              )
            })}

          {/* 小球 */}
          {shouldReduceMotion ? (
            <circle cx={currentPoint.x} cy={currentPoint.y} r={9} fill="var(--blue-600)" stroke="#fff" strokeWidth={2} />
          ) : (
            <motion.circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={9}
              fill="var(--blue-600)"
              stroke="#fff"
              strokeWidth={2}
              animate={{ cx: currentPoint.x, cy: currentPoint.y }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}
        </svg>

        {/* 發散截斷提示 */}
        {currentPoint.isExit && (
          <div
            className="absolute flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium pointer-events-none"
            style={
              currentPoint.w < 0
                ? { left: '3%', top: '5%', background: 'var(--danger-50)', color: 'var(--danger-500)' }
                : { right: '3%', top: '5%', background: 'var(--danger-50)', color: 'var(--danger-500)' }
            }
          >
            <TriangleAlert size={14} color="currentColor" />
            超出可視範圍，持續發散
          </div>
        )}
      </div>

      {/* 數值列 */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] tabular-nums">
        <span>{stepLabel}</span>
        <span>
          L(w) = {currentPoint.loss.toFixed(3)}
        </span>
      </div>
    </div>
  )
}
