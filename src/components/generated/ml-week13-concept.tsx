/**
 * 核心洞察：PCA、LDA、t-SNE 用的是同一團二維散點雲，差別只在「往哪個方向看」。
 * PCA 找的是資料本身伸展最開的方向（不看標籤，方向與資料形狀有關）；
 * LDA 找的是把兩類分得最開、同類擠得最緊的方向（用標籤，方向可能與 PCA
 * 完全不同角度）；t-SNE 則放棄找一條直線軸，只在乎「原本是鄰居的，投影後
 * 還是鄰居」，所以團塊之間的距離與大小本身不具意義。下區的決策分支收斂到
 * 同一句話：要放進模型 pipeline 就用 PCA／LDA，只是要用眼睛看分群就用 t-SNE。
 */

import {
  CircleHelp,
  Shapes,
  Tag,
  Eye,
  Ban,
  Spline,
  Layers,
  Workflow,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

/* ---------- 幾何：同一團二維散點雲，兩個固定方向 ---------- */

const RAD = Math.PI / 180
// PCA 方向：資料整體伸展最開的方向
const ANGLE_TOTAL_DEG = -15
// LDA 方向：把兩類分得最開的方向 —— 與 PCA 方向刻意差 90 度
const ANGLE_CLASS_DEG = 75

const cosTotal = Math.cos(ANGLE_TOTAL_DEG * RAD)
const sinTotal = Math.sin(ANGLE_TOTAL_DEG * RAD)
const cosClass = Math.cos(ANGLE_CLASS_DEG * RAD)
const sinClass = Math.sin(ANGLE_CLASS_DEG * RAD)

// 固定常數陣列（非亂數，確保每次 render 座標相同）
const T_VALUES = [-70, -52, -35, -17, 0, 17, 35, 52, 70]
const PERP_A = [-6, 5, -4, 7, -3, 4, -5, 6, -2]
const PERP_B = [4, -5, 6, -3, 5, -6, 3, -4, 2]

interface DataPoint {
  t: number // 在 PCA 方向上的座標
  s: number // 在 LDA 方向上的座標
  x: number
  y: number
}

function buildPoints(sBase: number, perp: number[]): DataPoint[] {
  return T_VALUES.map((t, i) => {
    const s = sBase + perp[i]
    const x = t * cosTotal + s * cosClass
    const y = t * sinTotal + s * sinClass
    return { t, s, x, y }
  })
}

// 類別中心沿 LDA 方向分開 ±25，沿 PCA 方向的伸展（-70..70）遠大於此，
// 所以「資料整體變異最大的方向」仍是 PCA 方向，而非兩類中心連線方向。
const CLASS_A: DataPoint[] = buildPoints(-25, PERP_A)
const CLASS_B: DataPoint[] = buildPoints(25, PERP_B)

function toSvg(x: number, y: number, cx: number, cy: number, scale: number) {
  return { x: cx + x * scale, y: cy - y * scale }
}

/* ---------- 共用小元件 ---------- */

function ScatterPoint({ x, y, cls }: { x: number; y: number; cls: 'A' | 'B' }) {
  if (cls === 'A') {
    return <circle cx={x} cy={y} r={4} fill="var(--blue-500)" stroke="var(--blue-700)" strokeWidth={0.75} />
  }
  const s = 5.2
  return (
    <polygon
      points={`${x},${y - s} ${x - s},${y + s * 0.8} ${x + s},${y + s * 0.8}`}
      fill="var(--orange-500)"
      stroke="var(--orange-700)"
      strokeWidth={0.75}
    />
  )
}

interface BadgeProps {
  x: number
  y: number
  text: string
  bg: string
  color: string
  Icon: LucideIcon
}

function Badge({ x, y, text, bg, color, Icon }: BadgeProps) {
  const w = text.length * 12.5 + 30
  return (
    <g>
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} fill={bg} />
      <foreignObject x={x - w / 2 + 8} y={y - 7} width={14} height={14}>
        <Icon size={14} color={color} />
      </foreignObject>
      <text
        x={x - w / 2 + 27}
        y={y + 4}
        fontSize={11}
        fontWeight={600}
        fill={color}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

interface DecisionNodeProps {
  x: number
  y: number
  w: number
  h: number
  lines: string[]
}

function DecisionNode({ x, y, w, h, lines }: DecisionNodeProps) {
  const cx = x + w / 2
  const textStartY = lines.length === 1 ? y + h / 2 + 5 : y + h / 2 - 4
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="var(--neutral-100)" />
      <foreignObject x={cx - 8} y={y + 8} width={16} height={16}>
        <CircleHelp size={16} color="var(--neutral-700)" />
      </foreignObject>
      {lines.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={textStartY + i * 14}
          fontSize={12.5}
          fontWeight={600}
          fill="var(--neutral-700)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

interface EdgeLabelProps {
  x: number
  y: number
  text: string
}

function EdgeLabel({ x, y, text }: EdgeLabelProps) {
  const w = text.length * 12 + 8
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={16} fill="var(--surface-page)" opacity={0.92} />
      <text
        x={x}
        y={y}
        fontSize={11}
        fill="var(--neutral-600)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

interface LeafBoxProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  subtitle?: string
  notes: string[]
  bg: string
  color: string
  Icon: LucideIcon
}

function LeafBox({ x, y, w, h, title, subtitle, notes, bg, color, Icon }: LeafBoxProps) {
  const notesStartY = y + (subtitle ? 50 : 42)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={bg} />
      <foreignObject x={x + 12} y={y + 10} width={16} height={16}>
        <Icon size={16} color={color} />
      </foreignObject>
      <text x={x + 34} y={y + 22} fontSize={13.5} fontWeight={700} fill={color} style={{ fontFamily: 'var(--font-sans)' }}>
        {title}
      </text>
      {subtitle && (
        <text x={x + 34} y={y + 36} fontSize={10.5} fill={color} opacity={0.8} style={{ fontFamily: 'var(--font-sans)' }}>
          {subtitle}
        </text>
      )}
      {notes.map((line, i) => (
        <text
          key={line}
          x={x + 12}
          y={notesStartY + i * 13}
          fontSize={10.5}
          fill="var(--text-muted)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

/* ---------- 上區：PCA / LDA / t-SNE 三格對照 ---------- */

const PANEL_Y = 16
const PANEL_H = 284
const PANEL_W = 260
const PLOT_SCALE = 1.05

function PcaPanel({ x0 }: { x0: number }) {
  const cx = x0 + PANEL_W / 2
  const cy = PANEL_Y + 165
  const axisLen = 100
  const p1 = toSvg(-axisLen * cosTotal, -axisLen * sinTotal, cx, cy, PLOT_SCALE)
  const p2 = toSvg(axisLen * cosTotal, axisLen * sinTotal, cx, cy, PLOT_SCALE)
  const tickHalf = 5

  return (
    <g>
      <rect x={x0} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={12} fill="var(--neutral-50)" stroke="var(--border-subtle)" />
      <text x={cx} y={PANEL_Y + 22} fontSize={14} fontWeight={700} fill="var(--text-strong)" textAnchor="middle" style={{ fontFamily: 'var(--font-serif)' }}>
        PCA：最大化總變異
      </text>

      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--neutral-600)" strokeWidth={2} markerStart="url(#w13-arrow-start-neutral)" markerEnd="url(#w13-arrow-end-neutral)" />

      {[...CLASS_A, ...CLASS_B].map((pt, i) => {
        const proj = toSvg(pt.t * cosTotal, pt.t * sinTotal, cx, cy, PLOT_SCALE)
        const tick = {
          p1: toSvg(pt.t * cosTotal - tickHalf * cosClass, pt.t * sinTotal - tickHalf * sinClass, cx, cy, PLOT_SCALE),
          p2: toSvg(pt.t * cosTotal + tickHalf * cosClass, pt.t * sinTotal + tickHalf * sinClass, cx, cy, PLOT_SCALE),
        }
        return (
          <line
            key={`pca-tick-${i}`}
            x1={tick.p1.x}
            y1={tick.p1.y}
            x2={tick.p2.x}
            y2={tick.p2.y}
            stroke="var(--neutral-400)"
            strokeWidth={1.4}
            opacity={0.85}
          />
        )
      })}

      {/* 兩個代表點的虛線投影，示範「點 -> 軸上落點」 */}
      {[CLASS_A[4], CLASS_B[4]].map((pt, i) => {
        const from = toSvg(pt.x, pt.y, cx, cy, PLOT_SCALE)
        const to = toSvg(pt.t * cosTotal, pt.t * sinTotal, cx, cy, PLOT_SCALE)
        return (
          <line
            key={`pca-proj-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--neutral-500)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )
      })}

      {[...CLASS_A].map((pt, i) => {
        const p = toSvg(pt.x, pt.y, cx, cy, PLOT_SCALE)
        return <ScatterPoint key={`a-${i}`} x={p.x} y={p.y} cls="A" />
      })}
      {[...CLASS_B].map((pt, i) => {
        const p = toSvg(pt.x, pt.y, cx, cy, PLOT_SCALE)
        return <ScatterPoint key={`b-${i}`} x={p.x} y={p.y} cls="B" />
      })}

      <text x={cx} y={PANEL_Y + 242} fontSize={10.5} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        投影落點散布在整條軸上
      </text>
      <Badge x={cx} y={PANEL_Y + 265} text="不看標籤（unsupervised）" bg="var(--neutral-100)" color="var(--neutral-700)" Icon={Shapes} />
    </g>
  )
}

function LdaPanel({ x0 }: { x0: number }) {
  const cx = x0 + PANEL_W / 2
  const cy = PANEL_Y + 165
  const axisLen = 58
  const p1 = toSvg(-axisLen * cosClass, -axisLen * sinClass, cx, cy, PLOT_SCALE)
  const p2 = toSvg(axisLen * cosClass, axisLen * sinClass, cx, cy, PLOT_SCALE)
  const tickHalf = 5

  // S_W：類內離散（只標示類 A 這一簇的寬度），偏移到軸的一側
  const swS1 = -31
  const swS2 = -18
  const swOffset = 14
  const swP1 = toSvg(swS1 * cosClass + swOffset * cosTotal, swS1 * sinClass + swOffset * sinTotal, cx, cy, PLOT_SCALE)
  const swP2 = toSvg(swS2 * cosClass + swOffset * cosTotal, swS2 * sinClass + swOffset * sinTotal, cx, cy, PLOT_SCALE)
  const swMid = toSvg(((swS1 + swS2) / 2) * cosClass + (swOffset + 14) * cosTotal, ((swS1 + swS2) / 2) * sinClass + (swOffset + 14) * sinTotal, cx, cy, PLOT_SCALE)

  // S_B：類間距離（兩類中心的距離），偏移到軸的另一側
  const sbS1 = -25
  const sbS2 = 25
  const sbOffset = -18
  const sbP1 = toSvg(sbS1 * cosClass + sbOffset * cosTotal, sbS1 * sinClass + sbOffset * sinTotal, cx, cy, PLOT_SCALE)
  const sbP2 = toSvg(sbS2 * cosClass + sbOffset * cosTotal, sbS2 * sinClass + sbOffset * sinTotal, cx, cy, PLOT_SCALE)
  const sbMid = toSvg(0 * cosClass + (sbOffset - 16) * cosTotal, 0 * sinClass + (sbOffset - 16) * sinTotal, cx, cy, PLOT_SCALE)

  return (
    <g>
      <rect x={x0} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={12} fill="var(--neutral-50)" stroke="var(--border-subtle)" />
      <text x={cx} y={PANEL_Y + 22} fontSize={14} fontWeight={700} fill="var(--text-strong)" textAnchor="middle" style={{ fontFamily: 'var(--font-serif)' }}>
        LDA：最大化類間距離 ÷ 類內離散
      </text>

      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--orange-600)" strokeWidth={2} markerStart="url(#w13-arrow-start-accent)" markerEnd="url(#w13-arrow-end-accent)" />

      {[...CLASS_A, ...CLASS_B].map((pt, i) => {
        const tick = {
          p1: toSvg(pt.s * cosClass - tickHalf * cosTotal, pt.s * sinClass - tickHalf * sinTotal, cx, cy, PLOT_SCALE),
          p2: toSvg(pt.s * cosClass + tickHalf * cosTotal, pt.s * sinClass + tickHalf * sinTotal, cx, cy, PLOT_SCALE),
        }
        return (
          <line
            key={`lda-tick-${i}`}
            x1={tick.p1.x}
            y1={tick.p1.y}
            x2={tick.p2.x}
            y2={tick.p2.y}
            stroke="var(--orange-400)"
            strokeWidth={1.4}
            opacity={0.85}
          />
        )
      })}

      {/* S_W 括號 */}
      <line x1={swP1.x} y1={swP1.y} x2={swP2.x} y2={swP2.y} stroke="var(--orange-700)" strokeWidth={1.3} markerStart="url(#w13-arrow-start-accent)" markerEnd="url(#w13-arrow-end-accent)" />
      <text x={swMid.x} y={swMid.y} fontSize={9.5} fill="var(--orange-700)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        (S_W 類內散布)
      </text>

      {/* S_B 括號 */}
      <line x1={sbP1.x} y1={sbP1.y} x2={sbP2.x} y2={sbP2.y} stroke="var(--orange-700)" strokeWidth={1.3} markerStart="url(#w13-arrow-start-accent)" markerEnd="url(#w13-arrow-end-accent)" />
      <text x={sbMid.x} y={sbMid.y} fontSize={9.5} fill="var(--orange-700)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        (S_B 類間距離)
      </text>

      {[...CLASS_A].map((pt, i) => {
        const p = toSvg(pt.x, pt.y, cx, cy, PLOT_SCALE)
        return <ScatterPoint key={`a-${i}`} x={p.x} y={p.y} cls="A" />
      })}
      {[...CLASS_B].map((pt, i) => {
        const p = toSvg(pt.x, pt.y, cx, cy, PLOT_SCALE)
        return <ScatterPoint key={`b-${i}`} x={p.x} y={p.y} cls="B" />
      })}

      <text x={cx} y={PANEL_Y + 242} fontSize={10.5} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        投影落點分兩群：類內窄、類間寬
      </text>
      <Badge x={cx} y={PANEL_Y + 265} text="用標籤（supervised）" bg="var(--orange-50)" color="var(--orange-700)" Icon={Tag} />
    </g>
  )
}

function TsnePanel({ x0 }: { x0: number }) {
  const cx = x0 + PANEL_W / 2
  const topCy = PANEL_Y + 80
  const topScale = 0.5

  const topA = CLASS_A.map((pt) => toSvg(pt.x, pt.y, cx, topCy, topScale))
  const topB = CLASS_B.map((pt) => toSvg(pt.x, pt.y, cx, topCy, topScale))

  const neighborPairs = [0, 1, 2, 3, 4, 5, 6, 7]

  const blobACx = x0 + 92
  const blobBCx = x0 + 168
  const blobCy = PANEL_Y + 178
  const blobR = 30

  const dotOffsets: Array<[number, number]> = [
    [-11, -9],
    [7, -12],
    [-8, 4],
    [10, 6],
    [0, 12],
    [-3, -3],
    [12, -2],
    [-12, 10],
    [3, 12],
  ]

  return (
    <g>
      <rect x={x0} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={12} fill="var(--neutral-50)" stroke="var(--border-subtle)" />
      <text x={cx} y={PANEL_Y + 22} fontSize={14} fontWeight={700} fill="var(--text-strong)" textAnchor="middle" style={{ fontFamily: 'var(--font-serif)' }}>
        t-SNE：保留局部鄰近結構
      </text>

      {/* 原始資料：只連鄰居，不畫直線軸 */}
      {neighborPairs.map((i) => (
        <line key={`na-${i}`} x1={topA[i].x} y1={topA[i].y} x2={topA[i + 1].x} y2={topA[i + 1].y} stroke="var(--blue-400)" strokeWidth={1} opacity={0.6} />
      ))}
      {neighborPairs.map((i) => (
        <line key={`nb-${i}`} x1={topB[i].x} y1={topB[i].y} x2={topB[i + 1].x} y2={topB[i + 1].y} stroke="var(--orange-400)" strokeWidth={1} opacity={0.6} />
      ))}
      {topA.map((p, i) => (
        <ScatterPoint key={`ta-${i}`} x={p.x} y={p.y} cls="A" />
      ))}
      {topB.map((p, i) => (
        <ScatterPoint key={`tb-${i}`} x={p.x} y={p.y} cls="B" />
      ))}
      <text x={cx} y={PANEL_Y + 120} fontSize={10.5} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        鄰居連線：原本靠近的點
      </text>

      <line x1={cx} y1={PANEL_Y + 128} x2={cx} y2={PANEL_Y + 142} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#w13-arrow-end-neutral)" />

      {/* 投影後的二維團塊配置：只保留局部鄰居關係，位置與間距不代表真實距離 */}
      <circle cx={blobACx} cy={blobCy} r={blobR} fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth={1.3} strokeDasharray="4 3" />
      <circle cx={blobBCx} cy={blobCy} r={blobR} fill="var(--orange-50)" stroke="var(--orange-300)" strokeWidth={1.3} strokeDasharray="4 3" />

      {dotOffsets.map((d, i) => {
        const x = blobACx + d[0]
        const y = blobCy + d[1]
        return <ScatterPoint key={`ba-${i}`} x={x} y={y} cls="A" />
      })}
      {dotOffsets.map((d, i) => {
        const x = blobBCx + d[0] * 0.9
        const y = blobCy + d[1] * 0.9
        return <ScatterPoint key={`bb-${i}`} x={x} y={y} cls="B" />
      })}

      <line x1={blobACx + blobR} y1={blobCy - 40} x2={blobBCx - blobR} y2={blobCy - 40} stroke="var(--neutral-400)" strokeWidth={1.3} strokeDasharray="2 3" markerStart="url(#w13-arrow-start-neutral)" markerEnd="url(#w13-arrow-end-neutral)" />

      <foreignObject x={cx - 8} y={PANEL_Y + 218} width={16} height={16}>
        <Ban size={16} color="var(--warning-500)" />
      </foreignObject>
      <text x={cx} y={PANEL_Y + 246} fontSize={11} fontWeight={600} fill="var(--warning-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        團塊間距離無意義
      </text>

      <Badge x={cx} y={PANEL_Y + 265} text="僅供視覺化，非 transform" bg="var(--warning-50)" color="var(--warning-500)" Icon={Eye} />
    </g>
  )
}

/* ---------- 下區：決策分支 ---------- */

function ExplainedVarianceMini({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const values = [42, 66, 79, 87, 92, 96, 100]
  const barW = 16
  const gap = 6
  const baseY = y + h - 16
  const maxBarH = h - 44
  const startX = x + 16

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--surface-card)" stroke="var(--border-subtle)" />
      <foreignObject x={x + 10} y={y + 8} width={14} height={14}>
        <BarChart3 size={14} color="var(--blue-600)" />
      </foreignObject>
      <text x={x + 28} y={y + 19} fontSize={11.5} fontWeight={700} fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
        累積解釋變異量（PCA）
      </text>

      {/* 90-95% 標示帶 */}
      <rect
        x={startX - 4}
        y={baseY - (95 / 100) * maxBarH}
        width={values.length * (barW + gap)}
        height={((95 - 90) / 100) * maxBarH}
        fill="var(--blue-500)"
        opacity={0.14}
      />

      {values.map((v, i) => {
        const bh = (v / 100) * maxBarH
        const bx = startX + i * (barW + gap)
        const reached = v >= 90
        return (
          <rect
            key={`bar-${v}`}
            x={bx}
            y={baseY - bh}
            width={barW}
            height={bh}
            rx={2}
            fill={reached ? 'var(--blue-600)' : 'var(--blue-300)'}
          />
        )
      })}
      <line x1={x + 8} y1={baseY} x2={x + w - 8} y2={baseY} stroke="var(--neutral-300)" strokeWidth={1} />

      <text x={x + w / 2} y={y + h - 2} fontSize={9.8} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        累積達 90–95% 即可決定保留幾維
      </text>
    </g>
  )
}

export default function MlWeek13Concept() {
  const svgW = 860
  const svgH = 830

  const p1x0 = 20
  const p2x0 = 300
  const p3x0 = 580

  const root = { x: 330, y: 340, w: 200, h: 50 }
  const rootCx = root.x + root.w / 2
  const rootBottom = root.y + root.h

  const hasLabelQ = { x: 40, y: 470, w: 200, h: 50 }
  const hasLabelQCx = hasLabelQ.x + hasLabelQ.w / 2

  const ldaLeaf = { x: 20, y: 600, w: 170, h: 90 }
  const pcaLeaf = { x: 210, y: 600, w: 170, h: 90 }
  const tsneLeaf = { x: 420, y: 600, w: 190, h: 100 }
  const manifoldLeaf = { x: 640, y: 600, w: 200, h: 100 }

  const ldaCx = ldaLeaf.x + ldaLeaf.w / 2
  const pcaCx = pcaLeaf.x + pcaLeaf.w / 2
  const tsneCx = tsneLeaf.x + tsneLeaf.w / 2
  const manifoldCx = manifoldLeaf.x + manifoldLeaf.w / 2

  const variancePanel = { x: 190, y: 715, w: 210, h: 100 }

  return (
    <div className="not-prose w-full max-w-4xl mx-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        role="img"
        aria-label="三種降維方法的目標對照與選型決策圖。上區用同一團二維散點雲比較 PCA（找資料整體變異最大的方向，不看標籤）、LDA（找類間距離除以類內離散最大的方向，用標籤，方向與 PCA 明顯不同）、t-SNE（不畫直線軸，只保留鄰居連線，投影後團塊之間的距離不具意義）。下區是決策分支：要餵給後續模型且有標籤用 LDA（上限 c 減 1 維），沒有標籤用 PCA（可 fit 與 transform，能放進 pipeline，並附上累積解釋變異階梯圖，達 90 到 95 趴即可決定保留幾維）；只是要畫圖看分群用 t-SNE（只有 fit_transform，無法套用到新資料）；資料明顯是彎的則用流形學習 Isomap 或 LLE。"
      >
        <defs>
          <marker id="w13-arrow-end-neutral" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="w13-arrow-start-neutral" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="w13-arrow-end-accent" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--orange-600)" />
          </marker>
          <marker id="w13-arrow-start-accent" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--orange-600)" />
          </marker>
          <marker id="w13-arrow-end-neutral2" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* ---- 上區：三格對照 ---- */}
        <PcaPanel x0={p1x0} />
        <LdaPanel x0={p2x0} />
        <TsnePanel x0={p3x0} />

        <text x={svgW / 2} y={326} fontSize={12} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          同一團資料，三種方法各自看往不同方向 —— 選型依據下方決策
        </text>

        {/* ---- 下區：決策分支 ---- */}
        <line x1={rootCx} y1={rootBottom} x2={hasLabelQCx} y2={hasLabelQ.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w13-arrow-end-neutral2)" />
        <EdgeLabel x={(rootCx + hasLabelQCx) / 2 - 6} y={425} text="餵給後續模型" />

        <line x1={rootCx} y1={rootBottom} x2={tsneCx} y2={tsneLeaf.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w13-arrow-end-neutral2)" />
        <EdgeLabel x={(rootCx + tsneCx) / 2} y={460} text="只是要畫圖看分群" />

        <line x1={rootCx} y1={rootBottom} x2={manifoldCx} y2={manifoldLeaf.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w13-arrow-end-neutral2)" />
        <EdgeLabel x={(rootCx + manifoldCx) / 2} y={540} text="資料是彎的、線性壓不好" />

        <line x1={hasLabelQCx} y1={hasLabelQ.y + hasLabelQ.h} x2={ldaCx} y2={ldaLeaf.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w13-arrow-end-neutral2)" />
        <EdgeLabel x={(hasLabelQCx + ldaCx) / 2 - 4} y={560} text="有" />

        <line x1={hasLabelQCx} y1={hasLabelQ.y + hasLabelQ.h} x2={pcaCx} y2={pcaLeaf.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w13-arrow-end-neutral2)" />
        <EdgeLabel x={(hasLabelQCx + pcaCx) / 2 + 8} y={560} text="沒有" />

        <line x1={pcaCx} y1={pcaLeaf.y + pcaLeaf.h} x2={variancePanel.x + variancePanel.w / 2} y2={variancePanel.y} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#w13-arrow-end-neutral2)" />

        <DecisionNode {...root} lines={['要拿降維結果做什麼？']} />
        <DecisionNode {...hasLabelQ} lines={['有標籤嗎？']} />

        <LeafBox
          {...ldaLeaf}
          title="LDA"
          notes={['上限 c－1 維']}
          bg="var(--blue-50)"
          color="var(--blue-700)"
          Icon={Layers}
        />
        <LeafBox
          {...pcaLeaf}
          title="PCA"
          notes={['可 fit / transform，', '能放進 pipeline']}
          bg="var(--neutral-100)"
          color="var(--neutral-700)"
          Icon={Workflow}
        />
        <LeafBox
          {...tsneLeaf}
          title="t-SNE"
          notes={['只有 fit_transform，', '無法套用到新資料，', '故不能當前處理']}
          bg="var(--warning-50)"
          color="var(--warning-500)"
          Icon={Eye}
        />
        <LeafBox
          {...manifoldLeaf}
          title="流形學習"
          subtitle="Isomap / LLE"
          notes={['對鄰居數、雜訊敏感，', '同樣無法套用到新資料']}
          bg="var(--orange-50)"
          color="var(--orange-700)"
          Icon={Spline}
        />

        <ExplainedVarianceMini {...variancePanel} />
      </svg>
    </div>
  )
}
