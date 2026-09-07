import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Maximize2, EyeOff, Tags, ArrowLeftRight, Waypoints, Info } from 'lucide-react'

/**
 * 「同一團散點，三種降維方法在最大化什麼」互動切換元件。
 * 40 個固定座標點（不隨模式改變）分成兩類，整體點雲最長軸方向（PCA）
 * 刻意與最能分開兩類的方向（LDA）錯開，藉此呈現兩者本質不同：
 * PCA 只看總變異、不看標籤；LDA 看類間/類內比值、需要標籤。
 * t-SNE 則放棄「軸」的概念，改以鄰居關係呈現局部結構。
 */

type Mode = 'pca' | 'lda' | 'tsne'
type Cls = 'a' | 'b'
interface Pt {
  x: number
  y: number
  cls: Cls
}

// ── 固定資料：40 個二維散點座標（SVG px，viewBox 0 0 640 360）──
// 兩類的類內散布方向（PCA 軸，約 29.7°）與類間分開方向（LDA 軸，約 108.1°）
// 相差約 78°，是本圖刻意設計的「錯開」。
const A_PX: [number, number][] = [
  [192.2, 300.0], [201.6, 297.6], [221.4, 281.8], [231.1, 301.2], [249.4, 298.9],
  [262.8, 283.2], [269.7, 259.4], [284.4, 271.1], [302.4, 253.8], [303.8, 258.4],
  [307.2, 232.6], [340.2, 244.1], [346.0, 256.3], [367.9, 225.6], [376.9, 247.6],
  [378.6, 222.2], [399.8, 239.4], [419.7, 208.6], [432.3, 205.8], [455.6, 238.2],
]
const B_PX: [number, number][] = [
  [161.5, 158.1], [176.3, 144.2], [174.7, 142.2], [194.7, 154.2], [221.6, 139.5],
  [223.4, 148.8], [242.1, 156.6], [246.0, 133.4], [278.2, 135.2], [296.5, 159.4],
  [298.6, 123.8], [326.4, 133.3], [314.1, 121.3], [338.0, 133.5], [338.0, 100.5],
  [349.4, 101.5], [356.5, 93.6], [383.0, 87.4], [405.0, 94.2], [415.4, 59.0],
]

const POINTS: Pt[] = [
  ...A_PX.map(([x, y]) => ({ x, y, cls: 'a' as const })),
  ...B_PX.map(([x, y]) => ({ x, y, cls: 'b' as const })),
]

// 整體點雲重心（也是 meanA/meanB 的中點，兩類樣本數相等）
const CENTER = { x: 302.1, y: 191.1 }
const MEAN_A = { x: 317.2, y: 256.3 }
const MEAN_B = { x: 287.0, y: 126.0 }

// 資料座標系的角度（非 CSS rotate 角度，用來算投影腳點）
const PCA_ANGLE_DEG = 29.7
// CSS/SVG rotate 是順時針、y 軸朝下，換算後等於 -資料角度
const PCA_ROTATE = -29.7
const LDA_ROTATE = -108.11
const ARROW_HALF_LEN = 150

function toPixelDir(dataAngleDeg: number) {
  const r = (dataAngleDeg * Math.PI) / 180
  return { x: Math.cos(r), y: -Math.sin(r) }
}
const PCA_DHAT = toPixelDir(PCA_ANGLE_DEG)

function footOnAxis(p: { x: number; y: number }) {
  const vx = p.x - CENTER.x
  const vy = p.y - CENTER.y
  const t = vx * PCA_DHAT.x + vy * PCA_DHAT.y
  return { x: CENTER.x + t * PCA_DHAT.x, y: CENTER.y + t * PCA_DHAT.y }
}
const PCA_PROJECTIONS = POINTS.map((p) => ({ from: p, to: footOnAxis(p) }))

// k=1 最近鄰圖（t-SNE 模式用），純粹依實際像素距離計算，資料本身仍是上面寫死的座標
function buildNearestNeighborEdges(points: Pt[]): [number, number][] {
  const seen = new Set<string>()
  const edges: [number, number][] = []
  points.forEach((p, i) => {
    let bestJ = -1
    let bestD = Infinity
    points.forEach((q, j) => {
      if (i === j) return
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      if (d < bestD) {
        bestD = d
        bestJ = j
      }
    })
    if (bestJ < 0) return
    const key = i < bestJ ? `${i}-${bestJ}` : `${bestJ}-${i}`
    if (!seen.has(key)) {
      seen.add(key)
      edges.push(i < bestJ ? [i, bestJ] : [bestJ, i])
    }
  })
  return edges
}
const NEIGHBOR_EDGES = buildNearestNeighborEdges(POINTS)

// S_W（類內散布，沿 PCA 方向量測 class A 的展開範圍）
const SW_P1 = { x: 238.3, y: 333.5 }
const SW_P2 = { x: 423.1, y: 228.1 }
const SW_CAP1 = [{ x: 241.3, y: 338.7 }, { x: 235.3, y: 328.3 }]
const SW_CAP2 = [{ x: 426.1, y: 233.3 }, { x: 420.1, y: 222.9 }]
const SW_LABEL = { x: 338.6, y: 296.5 }

// S_B（類間距離，兩類重心的直線距離）
const SB_CAP_A = [{ x: 323.1, y: 255.0 }, { x: 311.4, y: 257.7 }]
const SB_CAP_B = [{ x: 292.9, y: 124.7 }, { x: 281.2, y: 127.4 }]
const SB_LABEL = { x: 306.0, y: 103.0 }

// t-SNE 投影後示意團塊（與主散點區座標系無關，純示意；主散點最右只到 x=455.6，
// 這裡故意畫在 x>478 的空白角落，不會與真實資料點重疊）
const TSNE_CLUSTERS: { cx: number; cy: number; rx: number; ry: number; dots: [number, number, Cls][] }[] = [
  {
    cx: 26, cy: 26, rx: 24, ry: 22,
    dots: [[18, 20, 'a'], [30, 14, 'a'], [40, 26, 'a'], [14, 34, 'a'], [28, 40, 'b']],
  },
  {
    cx: 106, cy: 24, rx: 24, ry: 20,
    dots: [[95, 18, 'b'], [108, 12, 'b'], [120, 24, 'b'], [90, 32, 'b'], [112, 36, 'a']],
  },
  {
    cx: 61, cy: 60, rx: 16, ry: 14,
    dots: [[60, 55, 'a'], [68, 60, 'b'], [56, 64, 'a']],
  },
]

const CLASS_A_COLOR = 'var(--blue-600)'
const CLASS_B_COLOR = 'var(--orange-500)'

function PointMark({ p, i }: { p: Pt; i: number }) {
  if (p.cls === 'a') {
    return <circle key={i} cx={p.x} cy={p.y} r={5} fill={CLASS_A_COLOR} fillOpacity={0.85} />
  }
  return (
    <polygon
      key={i}
      points={`${p.x},${p.y - 6} ${p.x - 5.5},${p.y + 4.5} ${p.x + 5.5},${p.y + 4.5}`}
      fill={CLASS_B_COLOR}
      fillOpacity={0.85}
    />
  )
}

const TABS: { id: Mode; label: string; heading: string }[] = [
  { id: 'pca', label: 'PCA', heading: '主成分分析（PCA）' },
  { id: 'lda', label: 'LDA', heading: '線性判別分析（LDA）' },
  { id: 'tsne', label: 't-SNE', heading: 't-SNE' },
]

export default function MlWeek13ThreeObjectives() {
  const reduce = useReducedMotion() ?? false
  const [mode, setMode] = useState<Mode>('pca')
  const [axisMode, setAxisMode] = useState<'pca' | 'lda'>('pca')

  function selectMode(next: Mode) {
    setMode(next)
    if (next === 'pca' || next === 'lda') setAxisMode(next)
  }

  const rotateDeg = axisMode === 'pca' ? PCA_ROTATE : LDA_ROTATE
  const activeHeading = TABS.find((t) => t.id === mode)?.heading ?? ''
  const fade = { duration: reduce ? 0 : 0.25, ease: 'easeOut' as const }

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-4">
      <p className="m-0 text-sm text-[var(--text-muted)]">
        同一批 40 個樣本點，座標從未改變——切換方法只是換一套「看它的角度」。
      </p>

      {/* 切換 tab */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectMode(t.id)}
            aria-pressed={mode === t.id}
            className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
            style={{
              background: mode === t.id ? 'var(--blue-700)' : 'var(--neutral-100)',
              color: mode === t.id ? '#fff' : 'var(--text-body)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 標題 + 圖例 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--text-strong)]">{activeHeading}</div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx={6} cy={6} r={5} fill={CLASS_A_COLOR} />
            </svg>
            類別 A
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <polygon points="6,1 1,11 11,11" fill={CLASS_B_COLOR} />
            </svg>
            類別 B
          </span>
        </div>
      </div>

      {/* 主圖 */}
      <svg
        viewBox="0 0 640 360"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="散點圖：切換 PCA、LDA、t-SNE 呈現不同投影方式"
      >
        {/* t-SNE 專屬：分隔線 + 右上角示意團塊 */}
        <AnimatePresence>
          {mode === 'tsne' && (
            <motion.g
              key="tsne-inset"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <line x1={468} y1={10} x2={468} y2={350} stroke="var(--neutral-200)" strokeWidth={1} strokeDasharray="4 4" />
              <g transform="translate(478, 14)">
                {TSNE_CLUSTERS.map((c, ci) => (
                  <g key={ci}>
                    <ellipse
                      cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
                      fill="none" stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="4 3"
                    />
                    {c.dots.map(([dx, dy, cls], di) =>
                      cls === 'a' ? (
                        <circle key={di} cx={dx} cy={dy} r={3.2} fill={CLASS_A_COLOR} fillOpacity={0.85} />
                      ) : (
                        <polygon
                          key={di}
                          points={`${dx},${dy - 3.6} ${dx - 3.3},${dy + 2.7} ${dx + 3.3},${dy + 2.7}`}
                          fill={CLASS_B_COLOR}
                          fillOpacity={0.85}
                        />
                      ),
                    )}
                  </g>
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* t-SNE 鄰居連線 */}
        <AnimatePresence>
          {mode === 'tsne' && (
            <motion.g
              key="neighbor-edges"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {NEIGHBOR_EDGES.map(([i, j], k) => (
                <line
                  key={k}
                  x1={POINTS[i].x} y1={POINTS[i].y}
                  x2={POINTS[j].x} y2={POINTS[j].y}
                  stroke="var(--neutral-400)"
                  strokeWidth={1.3}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* PCA 投影虛線 */}
        <AnimatePresence>
          {mode === 'pca' && (
            <motion.g
              key="pca-proj"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {PCA_PROJECTIONS.map((pr, i) => (
                <g key={i}>
                  <line
                    x1={pr.from.x} y1={pr.from.y} x2={pr.to.x} y2={pr.to.y}
                    stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="2.5 3"
                  />
                  <circle cx={pr.to.x} cy={pr.to.y} r={2.2} fill="var(--blue-400)" />
                </g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* LDA：S_W / S_B 括號 */}
        <AnimatePresence>
          {mode === 'lda' && (
            <motion.g
              key="lda-brackets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {/* S_W：class A 沿 PCA 方向的展開範圍 */}
              <line x1={SW_P1.x} y1={SW_P1.y} x2={SW_P2.x} y2={SW_P2.y} stroke="var(--blue-400)" strokeWidth={2} />
              <line x1={SW_CAP1[0].x} y1={SW_CAP1[0].y} x2={SW_CAP1[1].x} y2={SW_CAP1[1].y} stroke="var(--blue-400)" strokeWidth={2} />
              <line x1={SW_CAP2[0].x} y1={SW_CAP2[0].y} x2={SW_CAP2[1].x} y2={SW_CAP2[1].y} stroke="var(--blue-400)" strokeWidth={2} />
              <text x={SW_LABEL.x} y={SW_LABEL.y} fontSize={13} fontWeight={700} fill="var(--blue-600)">S_W</text>

              {/* S_B：兩類重心距離 */}
              <line x1={MEAN_A.x} y1={MEAN_A.y} x2={MEAN_B.x} y2={MEAN_B.y} stroke="var(--orange-600)" strokeWidth={2} />
              <line x1={SB_CAP_A[0].x} y1={SB_CAP_A[0].y} x2={SB_CAP_A[1].x} y2={SB_CAP_A[1].y} stroke="var(--orange-600)" strokeWidth={2} />
              <line x1={SB_CAP_B[0].x} y1={SB_CAP_B[0].y} x2={SB_CAP_B[1].x} y2={SB_CAP_B[1].y} stroke="var(--orange-600)" strokeWidth={2} />
              <text x={SB_LABEL.x} y={SB_LABEL.y} fontSize={13} fontWeight={700} fill="var(--orange-700)">S_B</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* 40 個固定散點——三種模式下位置完全不動 */}
        {POINTS.map((p, i) => (
          <PointMark key={i} p={p} i={i} />
        ))}

        {/* 旋轉軸箭頭：PCA <-> LDA 之間旋轉；t-SNE 時淡出 */}
        <motion.g
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
          animate={{ rotate: rotateDeg, opacity: mode === 'tsne' ? 0 : 1 }}
          transition={{
            rotate: { duration: reduce ? 0 : 0.4, ease: 'easeOut' },
            opacity: { duration: reduce ? 0 : 0.25, ease: 'easeOut' },
          }}
        >
          <line
            x1={CENTER.x - ARROW_HALF_LEN} y1={CENTER.y}
            x2={CENTER.x + ARROW_HALF_LEN} y2={CENTER.y}
            stroke="var(--blue-700)" strokeWidth={2.5}
          />
          <polygon
            points={`${CENTER.x + ARROW_HALF_LEN - 16},${CENTER.y - 5} ${CENTER.x + ARROW_HALF_LEN - 16},${CENTER.y + 5} ${CENTER.x + ARROW_HALF_LEN + 2},${CENTER.y}`}
            fill="var(--blue-700)"
          />
        </motion.g>
        <circle cx={CENTER.x} cy={CENTER.y} r={3} fill="var(--neutral-500)" />
      </svg>

      {/* 標註面板：固定最小高度，切換時不跳動 */}
      <div className="min-h-[104px] rounded-[var(--radius-lg)] p-3.5" style={{ background: 'var(--surface-sunken)' }}>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'pca' && (
            <motion.div
              key="pca-note"
              initial={reduce ? undefined : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={fade}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--blue-700)]">
                <Maximize2 size={15} />
                <span>最大化總變異</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                <EyeOff size={15} className="shrink-0 text-[var(--text-muted)]" />
                <span>不看標籤（unsupervised）——只在乎點雲整體散得最開的方向</span>
              </div>
            </motion.div>
          )}
          {mode === 'lda' && (
            <motion.div
              key="lda-note"
              initial={reduce ? undefined : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={fade}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--orange-700)]">
                <ArrowLeftRight size={15} />
                <span>最大化 類間距離 S_B ÷ 類內離散 S_W</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                <Tags size={15} className="shrink-0 text-[var(--text-muted)]" />
                <span>用標籤（supervised），最多只能降到 c − 1 維（c 為類別數）</span>
              </div>
            </motion.div>
          )}
          {mode === 'tsne' && (
            <motion.div
              key="tsne-note"
              initial={reduce ? undefined : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={fade}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--blue-700)]">
                <Waypoints size={15} />
                <span>保留局部鄰近結構</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                <Info size={15} className="shrink-0 text-[var(--text-muted)]" />
                <span>右上角是投影後的團塊示意——團塊之間的距離無意義，只有「誰跟誰在同一團」才有意義</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
