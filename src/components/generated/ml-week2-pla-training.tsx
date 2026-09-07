/**
 * 核心洞察：PLA 每一步只用「一個答錯的樣本」把決策邊界推一小步——這個推法
 * 在線性可分資料上有數學保證（Novikoff 定理）一定會停下來，但在 XOR 這種
 * 資料上，推力會永遠自相矛盾、邊界只會原地打轉。差別不在演算法夠不夠聰明，
 * 而在資料本身能不能被一條直線切開。
 *
 * 驗證（已依規劃書手算比對，元件用同一套通用演算法重現，未寫死結果表）：
 * - 線性可分：第1步誤判 n1，w(0,0)->(2,-1) b0->-1；第2步誤判 n2，
 *   w->(-1,1) b->-2；第3步誤判 n3，w->(2,2) b->-3；更新後重掃 10 點
 *   全部正確分類 -> 收斂。
 * - XOR：第1步誤判 q2 w(0,0)->(-1,1) b0->-1；第2步誤判 q3 w->(0,0) b->-2
 *   （此時 w 為零向量，退化為常數輸出）；第3步誤判 q4 w->(-1,-1) b->-1；
 *   第4步誤判 q1 w->(0,0) b->0，與初始狀態 (0,0,0) 完全相同 -> 偵測到週期。
 *
 * 互動：頂部 toggle 切換兩個資料集（各自重置狀態）。散佈圖用手寫 SVG，
 * 決策邊界用 motion.line 平滑轉向新位置，誤判樣本outline 一次性光環動畫。
 * 「下一步」以巡覽指標（cyclic pointer）找下一個誤判樣本並立即更新；
 * 線性可分資料集用「即時誤判數 === 0」判斷收斂，XOR 資料集用歷史狀態
 * key 字串比對判斷是否回到曾經出現過的狀態（週期性震盪），兩套判斷邏輯
 * 不共用同一個 flag。
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, TriangleAlert, RotateCcw } from 'lucide-react'

interface DataPoint {
  id: string
  x1: number
  x2: number
  y: 1 | -1
}

interface Domain {
  min: number
  max: number
}

type DatasetKey = 'separable' | 'xor'

const SEPARABLE_POINTS: DataPoint[] = [
  { id: 'p1', x1: 3, x2: 1, y: 1 },
  { id: 'p2', x1: 1, x2: 3, y: 1 },
  { id: 'p3', x1: 4, x2: 3, y: 1 },
  { id: 'p4', x1: 0, x2: 4, y: 1 },
  { id: 'p5', x1: 2, x2: 2, y: 1 },
  { id: 'n1', x1: -2, x2: 1, y: -1 },
  { id: 'n2', x1: 3, x2: -2, y: -1 },
  { id: 'n3', x1: -3, x2: -1, y: -1 },
  { id: 'n4', x1: 1, x2: -2, y: -1 },
  { id: 'n5', x1: -1, x2: 1, y: -1 },
]

const XOR_POINTS: DataPoint[] = [
  { id: 'q1', x1: 1, x2: 1, y: 1 },
  { id: 'q2', x1: 1, x2: -1, y: -1 },
  { id: 'q3', x1: -1, x2: 1, y: -1 },
  { id: 'q4', x1: -1, x2: -1, y: 1 },
]

const DOMAINS: Record<DatasetKey, Domain> = {
  separable: { min: -5, max: 5 },
  xor: { min: -2, max: 2 },
}

const POINTS: Record<DatasetKey, DataPoint[]> = {
  separable: SEPARABLE_POINTS,
  xor: XOR_POINTS,
}

const DATASET_LABEL: Record<DatasetKey, string> = {
  separable: '線性可分',
  xor: '線性不可分（XOR）',
}

const PANEL_X = 40
const PANEL_Y = 20
const PANEL_W = 480
const PANEL_H = 320
const INITIAL_KEY = '0,0,0'

function classify(w: [number, number], b: number, p: DataPoint): 1 | -1 {
  const z = w[0] * p.x1 + w[1] * p.x2 + b
  return z >= 0 ? 1 : -1
}

function findNextMisclassified(
  points: DataPoint[],
  w: [number, number],
  b: number,
  startIndex: number
): { point: DataPoint; idx: number } | null {
  for (let i = 0; i < points.length; i++) {
    const idx = (startIndex + i) % points.length
    const point = points[idx]
    if (classify(w, b, point) !== point.y) return { point, idx }
  }
  return null
}

function scaleX(x1: number, domain: Domain): number {
  return PANEL_X + ((x1 - domain.min) / (domain.max - domain.min)) * PANEL_W
}

function scaleY(x2: number, domain: Domain): number {
  return PANEL_Y + PANEL_H - ((x2 - domain.min) / (domain.max - domain.min)) * PANEL_H
}

/** 解出決策邊界 w1*x1+w2*x2+b=0 與資料 domain 方框四邊的交點；w 接近零向量時回傳 null。 */
function computeBoundaryEndpoints(
  w: [number, number],
  b: number,
  domain: Domain
): [{ x1: number; x2: number }, { x1: number; x2: number }] | null {
  const [w1, w2] = w
  const eps = 1e-9
  if (Math.abs(w1) + Math.abs(w2) < eps) return null
  const { min, max } = domain
  const candidates: { x1: number; x2: number }[] = []

  if (Math.abs(w2) > eps) {
    for (const x1 of [min, max]) {
      const x2 = -(w1 * x1 + b) / w2
      if (x2 >= min - 1e-6 && x2 <= max + 1e-6) candidates.push({ x1, x2 })
    }
  }
  if (Math.abs(w1) > eps) {
    for (const x2 of [min, max]) {
      const x1 = -(w2 * x2 + b) / w1
      if (x1 >= min - 1e-6 && x1 <= max + 1e-6) candidates.push({ x1, x2 })
    }
  }

  const unique: { x1: number; x2: number }[] = []
  for (const c of candidates) {
    if (!unique.some((u) => Math.abs(u.x1 - c.x1) < 1e-6 && Math.abs(u.x2 - c.x2) < 1e-6)) {
      unique.push(c)
    }
  }
  if (unique.length < 2) return null
  return [unique[0], unique[1]]
}

export default function MlWeek2PlaTraining() {
  const shouldReduce = useReducedMotion()
  const [dataset, setDataset] = useState<DatasetKey>('separable')
  const [w, setW] = useState<[number, number]>([0, 0])
  const [b, setB] = useState(0)
  const [pointerIndex, setPointerIndex] = useState(0)
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const [stepCount, setStepCount] = useState(0)
  const [history, setHistory] = useState<string[]>([INITIAL_KEY])
  const [cycleDetected, setCycleDetected] = useState(false)

  const domain = DOMAINS[dataset]
  const points = POINTS[dataset]

  const misclassifiedCount = useMemo(
    () => points.filter((p) => classify(w, b, p) !== p.y).length,
    [points, w, b]
  )
  const converged = dataset === 'separable' && misclassifiedCount === 0

  const resetTo = (target: DatasetKey) => {
    setDataset(target)
    setW([0, 0])
    setB(0)
    setPointerIndex(0)
    setActivePointId(null)
    setStepCount(0)
    setHistory([INITIAL_KEY])
    setCycleDetected(false)
  }

  const handleNext = () => {
    const found = findNextMisclassified(points, w, b, pointerIndex)
    if (!found) return
    const { point, idx } = found
    const newW: [number, number] = [w[0] + point.y * point.x1, w[1] + point.y * point.x2]
    const newB = b + point.y

    setW(newW)
    setB(newB)
    setPointerIndex((idx + 1) % points.length)
    setActivePointId(point.id)
    setStepCount((c) => c + 1)

    if (dataset === 'xor') {
      const newKey = `${newW[0]},${newW[1]},${newB}`
      if (history.includes(newKey)) setCycleDetected(true)
      setHistory((h) => [...h, newKey])
    }
  }

  const nextDisabled = dataset === 'separable' ? converged : false

  const boundary = computeBoundaryEndpoints(w, b, domain)
  const activePoint = points.find((p) => p.id === activePointId) ?? null

  const originX = scaleX(0, domain)
  const originY = scaleY(0, domain)
  const ticks = [domain.min, 0, domain.max]

  const lineTransition = { duration: shouldReduce ? 0 : 0.36, ease: 'easeOut' as const }
  const ringInitial = shouldReduce ? false : { r: 10, opacity: 0.8 }
  const ringAnimate = shouldReduce ? { r: 14, opacity: 0.9 } : { r: [10, 15, 14], opacity: [0.9, 0.6, 0.9] }
  const badgeInitial = shouldReduce ? { opacity: 0 } : { opacity: 0, y: -6 }

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* 頂部：資料集切換 */}
      <div className="flex items-center gap-2">
        {(['separable', 'xor'] as DatasetKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => resetTo(key)}
            aria-pressed={dataset === key}
            className="text-[13px] font-medium transition-colors"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: dataset === key ? '1.5px solid var(--blue-500)' : '1px solid var(--border-subtle)',
              background: dataset === key ? 'var(--blue-50, #eef2ff)' : 'var(--surface-card)',
              color: dataset === key ? 'var(--blue-600)' : 'var(--text-body)',
            }}
          >
            {DATASET_LABEL[key]}
          </button>
        ))}
      </div>

      {/* 散佈圖 + 決策邊界 */}
      <div className="relative">
        <svg
          viewBox="0 0 560 380"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`感知器學習演算法在${DATASET_LABEL[dataset]}資料集上的訓練走查，顯示目前決策邊界與誤判樣本`}
        >
          <rect
            x={PANEL_X}
            y={PANEL_Y}
            width={PANEL_W}
            height={PANEL_H}
            rx={12}
            fill="var(--surface-sunken)"
            stroke="var(--border-subtle)"
            strokeWidth={1}
          />

          {/* 座標軸 */}
          <line
            x1={originX}
            y1={PANEL_Y}
            x2={originX}
            y2={PANEL_Y + PANEL_H}
            stroke="var(--border-default)"
            strokeWidth={1.5}
          />
          <line
            x1={PANEL_X}
            y1={originY}
            x2={PANEL_X + PANEL_W}
            y2={originY}
            stroke="var(--border-default)"
            strokeWidth={1.5}
          />

          {/* 軸刻度標籤 */}
          {ticks.map((t) => (
            <text
              key={`tx-${t}`}
              x={scaleX(t, domain)}
              y={PANEL_Y + PANEL_H + 14}
              fontSize={11}
              fill="var(--text-muted)"
              textAnchor="middle"
            >
              {t}
            </text>
          ))}
          {ticks
            .filter((t) => t !== 0)
            .map((t) => (
              <text
                key={`ty-${t}`}
                x={PANEL_X - 8}
                y={scaleY(t, domain) + 4}
                fontSize={11}
                fill="var(--text-muted)"
                textAnchor="end"
              >
                {t}
              </text>
            ))}

          {/* 決策邊界 */}
          {boundary ? (
            <motion.line
              x1={scaleX(boundary[0].x1, domain)}
              y1={scaleY(boundary[0].x2, domain)}
              animate={{
                x2: scaleX(boundary[1].x1, domain),
                y2: scaleY(boundary[1].x2, domain),
              }}
              x2={scaleX(boundary[1].x1, domain)}
              y2={scaleY(boundary[1].x2, domain)}
              initial={false}
              transition={lineTransition}
              stroke="var(--orange-500)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : (
            <text
              x={PANEL_X + PANEL_W / 2}
              y={PANEL_Y + PANEL_H / 2}
              fontSize={12}
              fill="var(--text-muted)"
              textAnchor="middle"
            >
              此步驟 w 為零向量，分類器暫時退化為常數輸出
            </text>
          )}

          {/* 誤判光環 */}
          {activePoint && (
            <motion.circle
              key={`${activePoint.id}-${stepCount}`}
              cx={scaleX(activePoint.x1, domain)}
              cy={scaleY(activePoint.x2, domain)}
              initial={ringInitial}
              animate={ringAnimate}
              transition={{ duration: shouldReduce ? 0 : 0.6, ease: 'easeOut' }}
              fill="none"
              stroke="var(--warning-500)"
              strokeWidth={2}
            />
          )}

          {/* 資料點 */}
          {points.map((p) => (
            <circle
              key={p.id}
              cx={scaleX(p.x1, domain)}
              cy={scaleY(p.x2, domain)}
              r={8}
              fill={p.y === 1 ? 'var(--blue-500)' : 'var(--neutral-700)'}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </svg>

        {/* 徽章 */}
        <div className="absolute top-2 right-2">
          <AnimatePresence>
            {converged && (
              <motion.span
                key="converged-badge"
                initial={badgeInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduce ? 0 : 0.2 }}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--success-50)',
                  color: 'var(--success-500)',
                }}
              >
                <Check size={14} />
                已收斂
              </motion.span>
            )}
            {dataset === 'xor' && cycleDetected && (
              <motion.span
                key="cycle-badge"
                initial={badgeInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduce ? 0 : 0.2 }}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--warning-50)',
                  color: 'var(--warning-500)',
                }}
              >
                <TriangleAlert size={14} />
                無法收斂（週期性震盪）
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 控制列 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={nextDisabled}
          className="text-[14px] font-medium transition-colors"
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: nextDisabled ? 'var(--neutral-200)' : 'var(--action-primary)',
            color: nextDisabled ? 'var(--text-muted)' : '#ffffff',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          下一步
        </button>
        <button
          type="button"
          onClick={() => resetTo(dataset)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors"
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)',
            color: 'var(--text-body)',
          }}
        >
          <RotateCcw size={14} />
          重置本資料集
        </button>
        <span className="text-[13px]" style={{ color: 'var(--text-body)' }}>
          第 {stepCount} 步 · 本輪誤判數 {misclassifiedCount} / {points.length}
        </span>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block"
            style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue-500)' }}
          />
          類別 +1
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block"
            style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--neutral-700)' }}
          />
          類別 −1
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block" style={{ width: 14, height: 2, background: 'var(--orange-500)' }} />
          目前決策邊界
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block"
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: '1.5px solid var(--warning-500)',
            }}
          />
          本次誤判樣本
        </span>
      </div>
    </div>
  )
}
