/**
 * 核心洞察：同一批資料，換一個對「群」的定義就會得到完全不同的答案——
 * k-means 用「離哪個中心最近」畫出直線邊界，只認得到球狀群；階層式分群
 * 由下而上一路合併成樹，橫切一刀才決定 k；DBSCAN 只問密度夠不夠高、
 * 連通就算一群，形狀可以任意彎曲、也容得下雜訊；GMM 則放棄非黑即白的
 * 硬指派，回答「這點屬於每一群各自的機率」。四格用的是彼此呼應但形狀
 * 刻意不同的散點（k-means / 階層式為球狀簇，DBSCAN 為交錯月牙），
 * 座標一律取固定常數，不引入亂數。
 */

import type { ReactNode } from 'react'
import { Target, GitBranch, Waypoints, Blend, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Point = [number, number]

// ---------------------------------------------------------------------------
// 共用幾何工具（純函式，皆為決定性計算，不涉及隨機）
// ---------------------------------------------------------------------------

function starPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function circumcenter(a: Point, b: Point, c: Point): Point {
  const [ax, ay] = a
  const [bx, by] = b
  const [cx, cy] = c
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  const ux =
    ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
  return [ux, uy]
}

/** 從外心出發、沿 AB 中垂線方向、朝遠離 other 那側延伸的射線終點。 */
function bisectorRayEnd(a: Point, b: Point, other: Point, origin: Point, length: number): Point {
  let dx = b[1] - a[1]
  let dy = -(b[0] - a[0])
  const norm = Math.hypot(dx, dy) || 1
  dx /= norm
  dy /= norm
  const toOther: Point = [other[0] - origin[0], other[1] - origin[1]]
  if (dx * toOther[0] + dy * toOther[1] > 0) {
    dx = -dx
    dy = -dy
  }
  return [origin[0] + dx * length, origin[1] + dy * length]
}

function elbowPath(childX: number, childY: number, parentX: number, parentY: number): string {
  return `M ${childX},${childY} V ${parentY} H ${parentX}`
}

// ---------------------------------------------------------------------------
// 版面元件
// ---------------------------------------------------------------------------

interface PanelCardProps {
  title: string
  icon: LucideIcon
  insight: string
  children: ReactNode
}

function PanelCard({ title, icon: Icon, insight, children }: PanelCardProps) {
  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
        <Icon size={15} style={{ color: 'var(--text-strong)' }} />
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>
          {title}
        </span>
      </div>
      {children}
      <p
        className="text-[11px] leading-snug"
        style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-sans)' }}
      >
        {insight}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// (1) k-means —— 直線邊界（中垂線）＋ 星形中心
// ---------------------------------------------------------------------------

const KMEANS_CENTERS: Point[] = [
  [72, 60],
  [196, 55],
  [130, 168],
]

const KMEANS_CLUSTER_A: Point[] = [
  [52, 45],
  [78, 42],
  [95, 55],
  [85, 75],
  [60, 80],
  [45, 65],
  [70, 62],
]
const KMEANS_CLUSTER_B: Point[] = [
  [175, 40],
  [205, 35],
  [220, 55],
  [210, 75],
  [185, 70],
  [170, 58],
  [198, 52],
]
const KMEANS_CLUSTER_C: Point[] = [
  [108, 150],
  [135, 145],
  [155, 158],
  [150, 180],
  [120, 188],
  [100, 172],
  [128, 168],
]

const KMEANS_COLORS = ['var(--blue-500)', 'var(--orange-500)', 'var(--blue-300)']

function KMeansSvg() {
  const [a, b, c] = KMEANS_CENTERS
  const origin = circumcenter(a, b, c)
  const rayLen = 170
  const rayAB = bisectorRayEnd(a, b, c, origin, rayLen)
  const rayBC = bisectorRayEnd(b, c, a, origin, rayLen)
  const rayCA = bisectorRayEnd(c, a, b, origin, rayLen)
  const clusters = [KMEANS_CLUSTER_A, KMEANS_CLUSTER_B, KMEANS_CLUSTER_C]

  return (
    <svg
      viewBox="0 0 260 200"
      width="100%"
      className="h-auto"
      role="img"
      aria-label="k-means：三團球狀點各自配一個星形中心，中心之間的中垂線構成直線邊界"
    >
      <line x1={origin[0]} y1={origin[1]} x2={rayAB[0]} y2={rayAB[1]} stroke="var(--neutral-400)" strokeWidth={1.5} />
      <line x1={origin[0]} y1={origin[1]} x2={rayBC[0]} y2={rayBC[1]} stroke="var(--neutral-400)" strokeWidth={1.5} />
      <line x1={origin[0]} y1={origin[1]} x2={rayCA[0]} y2={rayCA[1]} stroke="var(--neutral-400)" strokeWidth={1.5} />

      {clusters.map((cluster, ci) =>
        cluster.map(([x, y], pi) => (
          <circle key={`k-${ci}-${pi}`} cx={x} cy={y} r={4.5} fill={KMEANS_COLORS[ci]} opacity={0.85} />
        )),
      )}

      {KMEANS_CENTERS.map((center, i) => (
        <polygon
          key={`star-${i}`}
          points={starPath(center[0], center[1], 10, 4.2)}
          fill={KMEANS_COLORS[i]}
          stroke="#ffffff"
          strokeWidth={1.2}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// (2) 階層式分群 —— 真的樹狀圖（dendrogram）＋ 橫切虛線
// ---------------------------------------------------------------------------

const HIER_LEAVES: Point[] = [
  [30, 112],
  [70, 112],
  [110, 112],
  [150, 112],
  [190, 112],
  [230, 112],
]
const HIER_M1: Point = [50, 88]
const HIER_M2: Point = [130, 72]
const HIER_M3: Point = [210, 56]
const HIER_M4: Point = [90, 36]
const HIER_ROOT: Point = [150, 16]
const HIER_CUT_Y = 25

// 橫切在 y=25 只切過 M4-Root、M3-Root 兩條邊，得到 {葉0-3} 與 {葉4-5} 兩群
const HIER_GROUP_OF_LEAF = [0, 0, 0, 0, 1, 1]
const HIER_GROUP_COLORS = ['var(--blue-500)', 'var(--orange-500)']

const HIER_SCATTER: Point[] = [
  [34, 165],
  [66, 180],
  [112, 170],
  [148, 188],
  [192, 175],
  [226, 190],
]

function HierarchicalSvg() {
  const edges: [number, number, number, number][] = [
    [HIER_LEAVES[0][0], HIER_LEAVES[0][1], HIER_M1[0], HIER_M1[1]],
    [HIER_LEAVES[1][0], HIER_LEAVES[1][1], HIER_M1[0], HIER_M1[1]],
    [HIER_LEAVES[2][0], HIER_LEAVES[2][1], HIER_M2[0], HIER_M2[1]],
    [HIER_LEAVES[3][0], HIER_LEAVES[3][1], HIER_M2[0], HIER_M2[1]],
    [HIER_LEAVES[4][0], HIER_LEAVES[4][1], HIER_M3[0], HIER_M3[1]],
    [HIER_LEAVES[5][0], HIER_LEAVES[5][1], HIER_M3[0], HIER_M3[1]],
    [HIER_M1[0], HIER_M1[1], HIER_M4[0], HIER_M4[1]],
    [HIER_M2[0], HIER_M2[1], HIER_M4[0], HIER_M4[1]],
    [HIER_M4[0], HIER_M4[1], HIER_ROOT[0], HIER_ROOT[1]],
    [HIER_M3[0], HIER_M3[1], HIER_ROOT[0], HIER_ROOT[1]],
  ]

  return (
    <svg
      viewBox="0 0 260 215"
      width="100%"
      className="h-auto"
      role="img"
      aria-label="階層式分群：六個葉點由下而上合併成樹狀圖，一條水平虛線橫切得到兩群，下方是對應的散點"
    >
      {edges.map(([x1, y1, x2, y2], i) => (
        <path key={`edge-${i}`} d={elbowPath(x1, y1, x2, y2)} fill="none" stroke="var(--neutral-400)" strokeWidth={1.5} />
      ))}

      <line
        x1={8}
        y1={HIER_CUT_Y}
        x2={252}
        y2={HIER_CUT_Y}
        stroke="var(--warning-500)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <text x={236} y={HIER_CUT_Y - 5} fontSize={10} fill="var(--warning-500)" style={{ fontFamily: 'var(--font-sans)' }}>
        k=2
      </text>

      {[HIER_M1, HIER_M2, HIER_M3, HIER_M4, HIER_ROOT].map((node, i) => (
        <circle key={`node-${i}`} cx={node[0]} cy={node[1]} r={2.6} fill="var(--neutral-500)" />
      ))}

      {HIER_LEAVES.map(([x, y], i) => (
        <circle key={`leaf-${i}`} cx={x} cy={y} r={4} fill={HIER_GROUP_COLORS[HIER_GROUP_OF_LEAF[i]]} />
      ))}

      {HIER_SCATTER.map(([x, y], i) => (
        <circle
          key={`scatter-${i}`}
          cx={x}
          cy={y}
          r={4.5}
          fill={HIER_GROUP_COLORS[HIER_GROUP_OF_LEAF[i]]}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// (3) DBSCAN —— 交錯月牙 ＋ 雜訊 ＋ ε 鄰域
// ---------------------------------------------------------------------------

const DBSCAN_MOON_A: Point[] = [
  [28, 120],
  [45, 85],
  [68, 62],
  [95, 50],
  [122, 48],
  [148, 58],
  [168, 80],
  [182, 108],
]
const DBSCAN_MOON_B: Point[] = [
  [70, 120],
  [88, 148],
  [112, 165],
  [140, 172],
  [168, 168],
  [192, 152],
  [210, 128],
  [222, 102],
]
const DBSCAN_NOISE: Point[] = [
  [12, 45],
  [245, 55],
  [15, 180],
  [248, 185],
  [130, 15],
]
const DBSCAN_EPS_CENTER: Point = [95, 50]
const DBSCAN_EPS_R = 20

function DbscanSvg() {
  return (
    <svg
      viewBox="0 0 260 200"
      width="100%"
      className="h-auto"
      role="img"
      aria-label="DBSCAN：兩條交錯月牙形點雲被正確分成兩群，外圍幾點塗灰標成雜訊，並畫出半徑 epsilon 的鄰域小圓"
    >
      {DBSCAN_MOON_A.map(([x, y], i) => (
        <circle key={`ma-${i}`} cx={x} cy={y} r={4.5} fill="var(--blue-500)" opacity={0.85} />
      ))}
      {DBSCAN_MOON_B.map(([x, y], i) => (
        <circle key={`mb-${i}`} cx={x} cy={y} r={4.5} fill="var(--orange-500)" opacity={0.85} />
      ))}
      {DBSCAN_NOISE.map(([x, y], i) => (
        <circle key={`n-${i}`} cx={x} cy={y} r={3.5} fill="var(--neutral-400)" />
      ))}

      <circle
        cx={DBSCAN_EPS_CENTER[0]}
        cy={DBSCAN_EPS_CENTER[1]}
        r={DBSCAN_EPS_R}
        fill="none"
        stroke="var(--blue-700)"
        strokeWidth={1.3}
        strokeDasharray="4 3"
      />
      <text
        x={DBSCAN_EPS_CENTER[0] + DBSCAN_EPS_R + 4}
        y={DBSCAN_EPS_CENTER[1] + 4}
        fontSize={11}
        fontWeight={600}
        fill="var(--blue-700)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        ε
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// (4) 高斯混合模型（GMM）—— 傾斜重疊橢圓 ＋ 漸層歸屬色
// ---------------------------------------------------------------------------

const GMM_CLUSTER_A: Point[] = [
  [48, 75],
  [62, 60],
  [45, 100],
  [75, 105],
  [90, 65],
  [55, 115],
]
const GMM_CLUSTER_B: Point[] = [
  [205, 130],
  [220, 110],
  [198, 150],
  [178, 125],
  [215, 95],
  [190, 155],
]
const GMM_OVERLAP: Point[] = [
  [128, 95],
  [145, 102],
  [118, 112],
  [152, 88],
  [135, 115],
]

function GmmSvg() {
  return (
    <svg
      viewBox="0 0 260 200"
      width="100%"
      className="h-auto"
      role="img"
      aria-label="高斯混合模型：兩個傾斜且互相重疊的橢圓等高線，重疊區的點用漸層色表示同時屬於兩群的機率"
    >
      <defs>
        <linearGradient id="mw15-gmm-mix" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--blue-500)" />
          <stop offset="100%" stopColor="var(--orange-500)" />
        </linearGradient>
      </defs>

      <g transform="rotate(-22 95 95)">
        <ellipse cx={95} cy={95} rx={72} ry={34} fill="none" stroke="var(--blue-500)" strokeWidth={1} opacity={0.5} />
        <ellipse cx={95} cy={95} rx={50} ry={22} fill="none" stroke="var(--blue-500)" strokeWidth={1.3} opacity={0.8} />
      </g>
      <g transform="rotate(18 170 110)">
        <ellipse cx={170} cy={110} rx={68} ry={32} fill="none" stroke="var(--orange-500)" strokeWidth={1} opacity={0.5} />
        <ellipse cx={170} cy={110} rx={46} ry={20} fill="none" stroke="var(--orange-500)" strokeWidth={1.3} opacity={0.8} />
      </g>

      {GMM_CLUSTER_A.map(([x, y], i) => (
        <circle key={`ga-${i}`} cx={x} cy={y} r={4.5} fill="var(--blue-500)" opacity={0.85} />
      ))}
      {GMM_CLUSTER_B.map(([x, y], i) => (
        <circle key={`gb-${i}`} cx={x} cy={y} r={4.5} fill="var(--orange-500)" opacity={0.85} />
      ))}
      {GMM_OVERLAP.map(([x, y], i) => (
        <circle key={`go-${i}`} cx={x} cy={y} r={5} fill="url(#mw15-gmm-mix)" stroke="#ffffff" strokeWidth={0.8} />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// 底部選型提示帶
// ---------------------------------------------------------------------------

const SELECTION_HINTS: { cond: string; algo: string }[] = [
  { cond: '球狀且大小相近', algo: 'k-means' },
  { cond: '想看階層或不想先決定 k', algo: '階層式分群' },
  { cond: '形狀不規則且有離群點', algo: 'DBSCAN' },
  { cond: '群會重疊且需要信心度', algo: 'GMM' },
]

function SelectionHintBar() {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--surface-sunken)' }}>
      <p
        className="text-[12px] font-semibold mb-2 leading-snug"
        style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}
      >
        同一批資料，換一個對「群」的定義，就得到完全不同的答案——從資料形狀反推演算法：
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SELECTION_HINTS.map((item) => (
          <div
            key={item.algo}
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}
          >
            <span>{item.cond}</span>
            <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-accent)' }}>
              {item.algo}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主元件
// ---------------------------------------------------------------------------

export default function MlWeek15Concept() {
  return (
    <div className="not-prose w-full max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PanelCard title="k-means" icon={Target} insight="群 ＝ 離中心最近的一票點">
          <KMeansSvg />
        </PanelCard>
        <PanelCard title="階層式分群" icon={GitBranch} insight="群 ＝ 由下而上合併出來的子樹">
          <HierarchicalSvg />
        </PanelCard>
        <PanelCard title="DBSCAN" icon={Waypoints} insight="群 ＝ 密度夠高的連通區域">
          <DbscanSvg />
        </PanelCard>
        <PanelCard title="高斯混合模型（GMM）" icon={Blend} insight="群 ＝ 屬於每一群的機率">
          <GmmSvg />
        </PanelCard>
      </div>
      <SelectionHintBar />
    </div>
  )
}
