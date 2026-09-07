import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { clsx } from 'clsx'

/**
 * 「同一批散點，四種演算法對『一群』的定義」切換元件。
 * 60 個點的座標固定寫死、四種模式共用同一批點，只有「群」的畫法（邊界／樹／
 * 雜訊標記／等高線）隨模式切換。核心洞察：換一個對「群」的定義，同一批資料就
 * 會得到完全不同的答案。
 */

type Cluster = 'A' | 'B' | 'C' | 'noise'
type Mode = 'kmeans' | 'hierarchical' | 'dbscan' | 'gmm'

interface Point {
  x: number
  y: number
  cluster: Cluster
}

// ──────────────────────────────────────────────
// 固定資料：三團球狀點雲 + 兩團之間的少數離群點（座標寫死，四模式共用）
// ──────────────────────────────────────────────

const POINTS: Point[] = [
  { x: 133.3, y: 343.7, cluster: 'A' },
  { x: 120.6, y: 344.1, cluster: 'A' },
  { x: 119.8, y: 259.8, cluster: 'A' },
  { x: 121.8, y: 384.1, cluster: 'A' },
  { x: 170.9, y: 335.8, cluster: 'A' },
  { x: 202.2, y: 375.2, cluster: 'A' },
  { x: 129.9, y: 246.6, cluster: 'A' },
  { x: 182.1, y: 324.2, cluster: 'A' },
  { x: 112.3, y: 299.7, cluster: 'A' },
  { x: 133.3, y: 316, cluster: 'A' },
  { x: 206, y: 331, cluster: 'A' },
  { x: 139.5, y: 379.5, cluster: 'A' },
  { x: 177.3, y: 384.2, cluster: 'A' },
  { x: 91.8, y: 344.4, cluster: 'A' },
  { x: 176.2, y: 302.5, cluster: 'A' },
  { x: 111.7, y: 296.2, cluster: 'A' },
  { x: 119.1, y: 314.7, cluster: 'A' },
  { x: 200.6, y: 288.8, cluster: 'A' },
  { x: 129.3, y: 294.3, cluster: 'A' },
  { x: 206.4, y: 275.9, cluster: 'A' },
  { x: 189.8, y: 309.5, cluster: 'A' },
  { x: 265.9, y: 273.3, cluster: 'B' },
  { x: 344.9, y: 244.9, cluster: 'B' },
  { x: 332.3, y: 348, cluster: 'B' },
  { x: 329.6, y: 225.8, cluster: 'B' },
  { x: 334.6, y: 221.3, cluster: 'B' },
  { x: 326.4, y: 237.4, cluster: 'B' },
  { x: 306.2, y: 276.4, cluster: 'B' },
  { x: 393.2, y: 235.6, cluster: 'B' },
  { x: 268, y: 229.2, cluster: 'B' },
  { x: 349.5, y: 237.8, cluster: 'B' },
  { x: 351.1, y: 259.3, cluster: 'B' },
  { x: 306.9, y: 275.1, cluster: 'B' },
  { x: 397.3, y: 272.6, cluster: 'B' },
  { x: 259.2, y: 259.4, cluster: 'B' },
  { x: 357.9, y: 248.7, cluster: 'B' },
  { x: 319.5, y: 257.3, cluster: 'B' },
  { x: 316, y: 251.4, cluster: 'B' },
  { x: 291.4, y: 219.2, cluster: 'B' },
  { x: 297.7, y: 248.3, cluster: 'B' },
  { x: 276.5, y: 274.2, cluster: 'B' },
  { x: 492, y: 351, cluster: 'C' },
  { x: 494.4, y: 330.3, cluster: 'C' },
  { x: 504.3, y: 306.9, cluster: 'C' },
  { x: 484.2, y: 316.2, cluster: 'C' },
  { x: 483.5, y: 339.8, cluster: 'C' },
  { x: 474.4, y: 321.7, cluster: 'C' },
  { x: 545.5, y: 370.5, cluster: 'C' },
  { x: 492.5, y: 305.4, cluster: 'C' },
  { x: 546.1, y: 340.2, cluster: 'C' },
  { x: 499.2, y: 317.9, cluster: 'C' },
  { x: 526.1, y: 354.1, cluster: 'C' },
  { x: 469.1, y: 324, cluster: 'C' },
  { x: 447.7, y: 378.8, cluster: 'C' },
  { x: 462.6, y: 384.3, cluster: 'C' },
  { x: 179.7, y: 296.2, cluster: 'noise' },
  { x: 216.9, y: 297.9, cluster: 'noise' },
  { x: 247, y: 295.9, cluster: 'noise' },
  { x: 278.3, y: 290.5, cluster: 'noise' },
  { x: 289.6, y: 273.4, cluster: 'noise' },
]

// 三團的真實形心（由固定點資料算出，供 k-means / 高斯混合模型使用）
const CENTROIDS: Record<'A' | 'B' | 'C', { x: number; y: number }> = {
  A: { x: 151.1, y: 321.4 },
  B: { x: 321.2, y: 254.8 },
  C: { x: 494.4, y: 338.7 },
}

const CLUSTER_COLOR: Record<'A' | 'B' | 'C', string> = {
  A: '#4f46e5',
  B: '#059669',
  C: '#a16207',
}
const NOISE_COLOR = '#94a3b8'

const MODE_META: Record<Mode, { label: string; accent: string; note: string }> = {
  kmeans: { label: 'K-means', accent: 'var(--blue-500)', note: '群 ＝ 離中心最近的一票點' },
  hierarchical: { label: '階層式分群', accent: 'var(--orange-500)', note: '群 ＝ 由下而上合併出來的子樹' },
  dbscan: { label: 'DBSCAN', accent: 'var(--blue-300)', note: '群 ＝ 密度夠高的連通區域' },
  gmm: { label: '高斯混合模型', accent: 'var(--warning-500)', note: '群 ＝ 屬於每一群的機率' },
}

const MODE_ORDER: Mode[] = ['kmeans', 'hierarchical', 'dbscan', 'gmm']

// ──────────────────────────────────────────────
// 幾何 / 計算輔助
// ──────────────────────────────────────────────

function dist2(p: { x: number; y: number }, q: { x: number; y: number }): number {
  return (p.x - q.x) ** 2 + (p.y - q.y) ** 2
}

/** k-means 式「最近中心」判定：不管原始標籤，永遠取距離最近的形心 */
function nearestCentroidLabel(p: Point): 'A' | 'B' | 'C' {
  const dA = dist2(p, CENTROIDS.A)
  const dB = dist2(p, CENTROIDS.B)
  const dC = dist2(p, CENTROIDS.C)
  if (dA <= dB && dA <= dC) return 'A'
  if (dB <= dC) return 'B'
  return 'C'
}

const SIGMA = 68

/** 高斯混合模型式「軟分群」：對三個形心做 softmax，得到屬於各群的機率 */
function softmaxWeights(p: { x: number; y: number }): [number, number, number] {
  const centers: Array<{ x: number; y: number }> = [CENTROIDS.A, CENTROIDS.B, CENTROIDS.C]
  const scores = centers.map((c) => Math.exp(-dist2(p, c) / (2 * SIGMA * SIGMA)))
  const sum = scores[0] + scores[1] + scores[2]
  return [scores[0] / sum, scores[1] / sum, scores[2] / sum]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function blendColor(weights: [number, number, number]): string {
  const colors = [hexToRgb(CLUSTER_COLOR.A), hexToRgb(CLUSTER_COLOR.B), hexToRgb(CLUSTER_COLOR.C)]
  const r = Math.round(weights[0] * colors[0][0] + weights[1] * colors[1][0] + weights[2] * colors[2][0])
  const g = Math.round(weights[0] * colors[0][1] + weights[1] * colors[1][1] + weights[2] * colors[2][1])
  const b = Math.round(weights[0] * colors[0][2] + weights[1] * colors[1][2] + weights[2] * colors[2][2])
  return `rgb(${r}, ${g}, ${b})`
}

// GMM 示範用的標註點：軟分群下明顯出現「兩群都沾一點機率」的離群點
const GMM_HIGHLIGHT: Point = { x: 216.9, y: 297.9, cluster: 'noise' }
const gmmHighlightWeights = softmaxWeights(GMM_HIGHLIGHT)
const gmmPctA = Math.round(gmmHighlightWeights[0] * 100)
const gmmPctB = Math.round(gmmHighlightWeights[1] * 100)

// k-means 邊界線（三個形心兩兩之間的中垂線，裁到畫布範圍內做示意）
const KMEANS_BOUNDARIES: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
  { x1: 166.9, y1: 150, x2: 305.4, y2: 450 },
  { x1: 490.6, y1: 150, x2: 325.0, y2: 450 },
]

// GMM 橢圓等高線參數（由三團的共變異數推得，A、B 刻意重疊，C 獨立）
const GMM_ELLIPSES: Array<{ id: 'A' | 'B' | 'C'; cx: number; cy: number; rx: number; ry: number; angle: number }> = [
  { id: 'A', cx: 151.1, cy: 321.4, rx: 98.0, ry: 90.4, angle: 69.8 },
  { id: 'B', cx: 321.2, cy: 254.8, rx: 95.8, ry: 70.7, angle: 176.6 },
  { id: 'C', cx: 494.4, cy: 338.7, rx: 61.7, ry: 54.5, angle: 165.7 },
]

// DBSCAN 示意用的核心點與鄰域半徑 ε
const DBSCAN_CORE = { x: 133.3, y: 343.7 }
const DBSCAN_EPSILON = 55

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// ──────────────────────────────────────────────
// 元件
// ──────────────────────────────────────────────

export default function MlWeek15FourDefinitions() {
  const shouldReduceMotion = useReducedMotion()
  const [mode, setMode] = useState<Mode>('kmeans')
  const meta = MODE_META[mode]
  const fadeDuration = shouldReduceMotion ? 0 : 0.24

  return (
    <div className="not-prose space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {MODE_ORDER.map((m) => {
          const active = m === mode
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={active}
              className={clsx(
                'rounded-md border px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors',
                active ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
              style={active ? { background: MODE_META[m].accent } : undefined}
            >
              {MODE_META[m].label}
            </button>
          )
        })}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '640 / 460', background: 'var(--surface-sunken)' }}
      >
        <svg
          viewBox="0 0 640 460"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
        >
          {/* 基底：所有點的固定位置（淡灰），任何模式下都不移動 */}
          <g>
            {POINTS.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--neutral-300)" />
            ))}
          </g>

          <AnimatePresence mode="wait">
            {mode === 'kmeans' && (
              <motion.g
                key="kmeans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fadeDuration, ease: 'easeOut' }}
              >
                {KMEANS_BOUNDARIES.map((b, i) => (
                  <line
                    key={i}
                    x1={b.x1}
                    y1={b.y1}
                    x2={b.x2}
                    y2={b.y2}
                    stroke="var(--neutral-400)"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                  />
                ))}
                {POINTS.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4} fill={CLUSTER_COLOR[nearestCentroidLabel(p)]} />
                ))}
                {(['A', 'B', 'C'] as const).map((c) => (
                  <polygon
                    key={c}
                    points={starPoints(CENTROIDS[c].x, CENTROIDS[c].y, 13, 5.5)}
                    fill={CLUSTER_COLOR[c]}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                ))}
              </motion.g>
            )}

            {mode === 'hierarchical' && (
              <motion.g
                key="hierarchical"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fadeDuration, ease: 'easeOut' }}
              >
                {/* 樹狀圖：A、B 先合併，再與 C 合併成一棵樹（示意，非逐點畫出） */}
                <line x1={151.1} y1={170} x2={151.1} y2={110} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={321.2} y1={170} x2={321.2} y2={110} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={151.1} y1={110} x2={321.2} y2={110} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={236.15} y1={110} x2={236.15} y2={50} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={494.4} y1={170} x2={494.4} y2={50} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={236.15} y1={50} x2={494.4} y2={50} stroke="var(--orange-500)" strokeWidth={2} />
                <line x1={365.28} y1={50} x2={365.28} y2={26} stroke="var(--orange-500)" strokeWidth={2} />
                {/* 橫切一刀：在此高度切下去，三條分支尚未合併，得到 k = 3 群 */}
                <line x1={90} y1={140} x2={550} y2={140} stroke="var(--neutral-500)" strokeWidth={1.5} strokeDasharray="6 4" />
                <circle cx={151.1} cy={140} r={3} fill="var(--neutral-500)" />
                <circle cx={321.2} cy={140} r={3} fill="var(--neutral-500)" />
                <circle cx={494.4} cy={140} r={3} fill="var(--neutral-500)" />
                {POINTS.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={p.cluster === 'noise' ? CLUSTER_COLOR[nearestCentroidLabel(p)] : CLUSTER_COLOR[p.cluster]}
                  />
                ))}
              </motion.g>
            )}

            {mode === 'dbscan' && (
              <motion.g
                key="dbscan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fadeDuration, ease: 'easeOut' }}
              >
                <circle
                  cx={DBSCAN_CORE.x}
                  cy={DBSCAN_CORE.y}
                  r={DBSCAN_EPSILON}
                  fill="none"
                  stroke="var(--blue-300)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle cx={DBSCAN_CORE.x} cy={DBSCAN_CORE.y} r={3} fill="var(--blue-300)" stroke="#ffffff" strokeWidth={1} />
                {POINTS.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={p.cluster === 'noise' ? NOISE_COLOR : CLUSTER_COLOR[p.cluster]}
                  />
                ))}
              </motion.g>
            )}

            {mode === 'gmm' && (
              <motion.g
                key="gmm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fadeDuration, ease: 'easeOut' }}
              >
                {GMM_ELLIPSES.map((e) => (
                  <ellipse
                    key={e.id}
                    cx={e.cx}
                    cy={e.cy}
                    rx={e.rx}
                    ry={e.ry}
                    transform={`rotate(${e.angle} ${e.cx} ${e.cy})`}
                    fill={CLUSTER_COLOR[e.id]}
                    fillOpacity={0.08}
                    stroke={CLUSTER_COLOR[e.id]}
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                  />
                ))}
                {POINTS.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4} fill={blendColor(softmaxWeights(p))} />
                ))}
                <circle
                  cx={GMM_HIGHLIGHT.x}
                  cy={GMM_HIGHLIGHT.y}
                  r={7}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <circle
                  cx={GMM_HIGHLIGHT.x}
                  cy={GMM_HIGHLIGHT.y}
                  r={7}
                  fill="none"
                  stroke="var(--neutral-600)"
                  strokeWidth={1}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      <div className="flex items-start gap-2 rounded-md px-3 py-2" style={{ background: 'var(--surface-sunken)' }}>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.accent }} />
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
          <strong style={{ color: 'var(--text-strong)' }}>{meta.label}</strong>
          <span className="mx-1" style={{ color: 'var(--text-muted)' }}>
            ——
          </span>
          {meta.note}
        </p>
      </div>

      <p className="min-h-[2.5rem] text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {mode === 'kmeans' &&
          '星形為三個中心；虛線為兩兩中心的中垂線構成的邊界，每個點依最近中心上色——邊界必然是直線。'}
        {mode === 'hierarchical' &&
          '上方為合併示意的樹狀圖，縱軸為合併距離；橫切虛線落在此高度時，三條分支都還沒合併，即為 k = 3 群。'}
        {mode === 'dbscan' &&
          '虛線圓圈示意半徑 ε 的鄰域；三團正確分出，游離在兩團之間的離群點被標成灰色的雜訊，不硬塞進任何一群。'}
        {mode === 'gmm' &&
          `白圈標出的點：軟分群給出約 ${gmmPctA}% 屬 A、${gmmPctB}% 屬 B（屬 C 的機率趨近 0），而非非黑即白的硬分配。`}
      </p>
    </div>
  )
}
