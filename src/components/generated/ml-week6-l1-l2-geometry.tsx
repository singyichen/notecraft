import { useState } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { Circle, Diamond, X } from 'lucide-react'

/**
 * L1 vs L2 正則化的幾何直覺：為什麼菱形（L1）容易產生稀疏解，圓（L2）不會。
 * 核心洞察：差別不在「懲罰多重」，而在約束區域有沒有角——
 * 菱形的角剛好長在座標軸上，等高線一擴張就容易先碰到角，某個權重就變成 0；
 * 圓沒有角，兩個權重只會一起縮小，幾乎不會剛好落在軸上。
 */

interface Point {
  w1: number
  w2: number
}

// 未正則化 MSE 最佳點（兩側共用），以及 5 段 lambda 對應的約束半徑
const R = [3.6, 2.8, 2.1, 1.5, 1.0]

const L2_POINTS: Point[] = [
  { w1: 2.6, w2: 1.4 }, // idx0：區域尚未收緊，解 = 未正則化最佳點
  { w1: 2.47, w2: 1.32 }, // idx1，落在半徑 2.8 圓上
  { w1: 1.85, w2: 0.99 }, // idx2，半徑 2.1
  { w1: 1.32, w2: 0.71 }, // idx3，半徑 1.5
  { w1: 0.88, w2: 0.47 }, // idx4，半徑 1.0 —— w1、w2 皆不為 0
]

const L1_POINTS: Point[] = [
  { w1: 2.6, w2: 1.4 }, // idx0
  { w1: 1.65, w2: 1.15 }, // idx1，落在菱形邊 w1+w2=2.8 上
  { w1: 1.55, w2: 0.55 }, // idx2，w1+w2=2.1
  { w1: 1.5, w2: 0.0 }, // idx3，w1+w2=1.5 —— 首次命中角，w2=0！
  { w1: 1.0, w2: 0.0 }, // idx4，w1+w2=1.0，仍卡在 w1 軸上
]

// 以 (2.60, 1.40) 為中心的同心橢圓，模擬 MSE 等高線（兩側共用同一組）
const CONTOUR_SCALES = [0.3, 0.55, 0.8, 1.05]
const CONTOUR_CENTER = { w1: 2.6, w2: 1.4 }
const CONTOUR_A = 1.6
const CONTOUR_B = 0.9

const ORIGIN_PX = { x: 150, y: 150 }
const SCALE = 30 // 1 個 math 單位 = 30px

function toPx(p: Point): { x: number; y: number } {
  return { x: ORIGIN_PX.x + p.w1 * SCALE, y: ORIGIN_PX.y - p.w2 * SCALE }
}

function fmt(n: number): string {
  return n.toFixed(2)
}

interface AxesProps {
  strokeAxis: string
  labelW1: string
  labelW2: string
}

function Axes({ strokeAxis }: AxesProps) {
  return (
    <g stroke={strokeAxis} strokeWidth={1}>
      {/* w1 軸 */}
      <line x1={10} y1={150} x2={290} y2={150} />
      <polygon points="290,150 282,146 282,154" fill={strokeAxis} stroke="none" />
      {/* w2 軸 */}
      <line x1={150} y1={290} x2={150} y2={10} />
      <polygon points="150,10 146,18 154,18" fill={strokeAxis} stroke="none" />
      <text x={278} y={142} fontSize={11} fill={strokeAxis} stroke="none">
        w1
      </text>
      <text x={158} y={20} fontSize={11} fill={strokeAxis} stroke="none">
        w2
      </text>
    </g>
  )
}

function Contours() {
  return (
    <g fill="none" stroke="var(--neutral-400)" strokeWidth={1}>
      {CONTOUR_SCALES.map((s, i) => {
        const c = toPx(CONTOUR_CENTER)
        const rx = CONTOUR_A * SCALE * s + 4
        const ry = CONTOUR_B * SCALE * s + 4
        return <ellipse key={i} cx={c.x} cy={c.y} rx={rx} ry={ry} />
      })}
    </g>
  )
}

interface RegionProps {
  radiusPx: number
  fill: string
  stroke: string
  reduce: boolean
  shape: 'circle' | 'diamond'
}

function Region({ radiusPx, fill, stroke, reduce, shape }: RegionProps) {
  if (shape === 'circle') {
    return (
      <motion.circle
        cx={ORIGIN_PX.x}
        cy={ORIGIN_PX.y}
        fill={fill}
        fillOpacity={0.45}
        stroke={stroke}
        strokeWidth={1.5}
        initial={false}
        animate={{ r: radiusPx }}
        transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
      />
    )
  }
  // 菱形四頂點座標以 motion 補間
  const top = `${ORIGIN_PX.x},${ORIGIN_PX.y - radiusPx}`
  const right = `${ORIGIN_PX.x + radiusPx},${ORIGIN_PX.y}`
  const bottom = `${ORIGIN_PX.x},${ORIGIN_PX.y + radiusPx}`
  const left = `${ORIGIN_PX.x - radiusPx},${ORIGIN_PX.y}`
  const points = `${top} ${right} ${bottom} ${left}`
  return (
    <motion.polygon
      fill={fill}
      fillOpacity={0.45}
      stroke={stroke}
      strokeWidth={1.5}
      initial={false}
      animate={{ points }}
      transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
    />
  )
}

interface SolutionPointProps {
  point: Point
  fill: string
  reduce: boolean
}

function SolutionPoint({ point, fill, reduce }: SolutionPointProps) {
  const px = toPx(point)
  return (
    <motion.circle
      r={6}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
      initial={false}
      animate={{ cx: px.x, cy: px.y }}
      transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
    />
  )
}

export default function MlWeek6L1L2Geometry() {
  const reduce = useReducedMotion() ?? false
  const [idx, setIdx] = useState(0)

  const l2Point = L2_POINTS[idx]
  const l1Point = L1_POINTS[idx]
  const radiusPx = R[idx] * SCALE
  const zeroed = L1_POINTS[idx].w2 === 0

  return (
    <div className="not-prose max-w-[640px] mx-auto space-y-4">
      {/* 兩個並排的權重空間 */}
      <div className="grid grid-cols-2 gap-3">
        {/* L2 面板 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Circle size={14} className="text-[var(--blue-600)]" />
            <span className="text-xs font-semibold text-[var(--text-strong)]">L2 正則化</span>
          </div>
          <svg
            viewBox="0 0 300 300"
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="L2 正則化的權重空間：圓形約束區域"
          >
            <Axes strokeAxis="var(--neutral-400)" labelW1="w1" labelW2="w2" />
            <Contours />
            <Region
              shape="circle"
              radiusPx={radiusPx}
              fill="var(--blue-100)"
              stroke="var(--blue-500)"
              reduce={reduce}
            />
            <SolutionPoint point={l2Point} fill="var(--blue-700)" reduce={reduce} />
          </svg>
        </div>

        {/* L1 面板 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Diamond size={14} className="text-[var(--orange-600)]" />
            <span className="text-xs font-semibold text-[var(--text-strong)]">L1 正則化</span>
          </div>
          <svg
            viewBox="0 0 300 300"
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="L1 正則化的權重空間：菱形約束區域"
          >
            <Axes strokeAxis="var(--neutral-400)" labelW1="w1" labelW2="w2" />
            <Contours />
            <Region
              shape="diamond"
              radiusPx={radiusPx}
              fill="var(--orange-100)"
              stroke="var(--orange-500)"
              reduce={reduce}
            />
            <SolutionPoint point={l1Point} fill="var(--orange-600)" reduce={reduce} />
          </svg>
        </div>
      </div>

      {/* 數值面板（固定高度） */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">目前解</span>
          <span
            className="text-sm tabular-nums text-[var(--blue-700)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            w1 = {fmt(l2Point.w1)}, w2 = {fmt(l2Point.w2)}
          </span>
        </div>
        <div className="h-16 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 flex flex-col justify-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">目前解</span>
          <span
            className="text-sm tabular-nums text-[var(--orange-600)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            w1 = {fmt(l1Point.w1)}, w2 = {fmt(l1Point.w2)}
          </span>
          <AnimatePresence initial={false}>
            {zeroed && (
              <motion.span
                key="badge"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
                className="inline-flex w-fit items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--danger-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--danger-500)]"
              >
                <X size={11} />
                w2 = 0，特徵被剔除
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 共用 lambda 滑桿 */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="正則化強度"
        />
        <p className="m-0 text-xs text-[var(--text-muted)]">
          正則化強度：第 {idx + 1} / 5 段
        </p>
      </div>

      <p className="m-0 text-xs text-[var(--text-muted)] leading-relaxed">
        此圖為幾何直覺示意，座標與半徑為手動設計以呈現「角 vs 無角」的效果，非真實最佳化數值輸出。
      </p>
    </div>
  )
}
