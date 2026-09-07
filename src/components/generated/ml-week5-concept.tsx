/**
 * 核心洞察：Matplotlib 的坑多半來自「層級」與「介面」被混為一談。
 * Figure 是整張畫布、Axes 才是一整張有座標軸的子圖（不是一條軸）；
 * 狀態式介面（plt.xxx）靠一個看不見的「目前這張圖（gca）」隱含轉接，
 * 物件導向介面（ax.xxx）則每次都明確指名——多子圖一多，前者就容易畫錯地方。
 * 而挑哪個繪圖函式，判準永遠是「想回答什麼問題」，不是函式好不好記。
 */

import {
  CircleHelp,
  Frame as FrameIcon,
  GitCompare,
  TrendingUp,
  CircleDot,
  BarChart3,
  Grid3x3,
  Waves,
  ArrowUpDown,
  LayoutGrid,
  Search,
  Presentation,
  TriangleAlert,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'

/* ---------- 共用小元件 ---------- */

interface SectionBadgeProps {
  x: number
  y: number
  n: number
  title: string
  Icon: LucideIcon
}

function SectionBadge({ x, y, n, title, Icon }: SectionBadgeProps) {
  return (
    <g>
      <circle cx={x + 9} cy={y} r={9} fill="var(--blue-600)" />
      <text
        x={x + 9}
        y={y + 4}
        fontSize={10.5}
        fontWeight={700}
        fill="#ffffff"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {n}
      </text>
      <foreignObject x={x + 26} y={y - 9} width={18} height={18}>
        <Icon size={16} color="var(--text-strong)" />
      </foreignObject>
      <text
        x={x + 48}
        y={y + 5}
        fontSize={14}
        fontWeight={700}
        fill="var(--text-strong)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
    </g>
  )
}

interface TagChipProps {
  x: number
  y: number
  text: string
  align?: 'start' | 'middle' | 'end'
}

function TagChip({ x, y, text, align = 'start' }: TagChipProps) {
  const w = text.length * 8.4 + 12
  const rx = align === 'middle' ? x - w / 2 : align === 'end' ? x - w : x
  return (
    <g>
      <rect x={rx} y={y - 11} width={w} height={15} rx={4} fill="var(--surface-page)" opacity={0.95} />
      <text
        x={x}
        y={y}
        fontSize={9.5}
        fontWeight={600}
        fill="var(--neutral-600)"
        textAnchor={align}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

/** 從目標點到標籤位置的細引線，末端一個小圓點釘在元件上 */
interface LeaderProps {
  tx: number
  ty: number
  lx: number
  ly: number
  text: string
  align?: 'start' | 'middle' | 'end'
}

function Leader({ tx, ty, lx, ly, text, align = 'start' }: LeaderProps) {
  return (
    <g>
      <line x1={tx} y1={ty} x2={lx} y2={ly} stroke="var(--neutral-400)" strokeWidth={1} />
      <circle cx={tx} cy={ty} r={2} fill="var(--neutral-500)" />
      <TagChip x={lx} y={ly} text={text} align={align} />
    </g>
  )
}

/* ---------- 決策帶：判斷節點 / 函式卡 / 收束色塊 ---------- */

interface RootQNodeProps {
  x: number
  y: number
  w: number
  h: number
}

function RootQNode({ x, y, w, h }: RootQNodeProps) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--neutral-100)" stroke="var(--neutral-300)" />
      <foreignObject x={cx - 9} y={y + 14} width={18} height={18}>
        <CircleHelp size={18} color="var(--neutral-700)" />
      </foreignObject>
      <text
        x={cx}
        y={y + 48}
        fontSize={12.5}
        fontWeight={700}
        fill="var(--text-strong)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        想回答
      </text>
      <text
        x={cx}
        y={y + 64}
        fontSize={12.5}
        fontWeight={700}
        fill="var(--text-strong)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        什麼問題？
      </text>
    </g>
  )
}

interface FuncCardProps {
  x: number
  y: number
  w: number
  h: number
  Icon: LucideIcon
  question: string[]
  func: string[]
  note?: string[]
  accent: string
  bg: string
}

function FuncCard({ x, y, w, h, Icon, question, func, note, accent, bg }: FuncCardProps) {
  const cx = x + w / 2
  let cursorY = y + 30
  const questionStartY = cursorY
  cursorY = questionStartY + question.length * 13 + 8
  const funcStartY = cursorY
  cursorY = funcStartY + func.length * 13 + 6
  const noteStartY = cursorY

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={bg} stroke="var(--border-subtle)" />
      <foreignObject x={x + 12} y={y + 10} width={17} height={17}>
        <Icon size={17} color={accent} />
      </foreignObject>
      {question.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={questionStartY + i * 13}
          fontSize={10.5}
          fill="var(--text-body)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
      {func.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={funcStartY + i * 13}
          fontSize={11.5}
          fontWeight={700}
          fill={accent}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {line}
        </text>
      ))}
      {note?.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={noteStartY + i * 11}
          fontSize={8.5}
          fill="var(--text-muted)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

interface SummaryBlockProps {
  x: number
  y: number
  w: number
  h: number
  Icon: LucideIcon
  title: string
  desc: string[]
  fill: string
}

function SummaryBlock({ x, y, w, h, Icon, title, desc, fill }: SummaryBlockProps) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} />
      <foreignObject x={cx - 10} y={y + 12} width={20} height={20}>
        <Icon size={20} color="#ffffff" />
      </foreignObject>
      <text
        x={cx}
        y={y + 48}
        fontSize={13}
        fontWeight={700}
        fill="#ffffff"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
      {desc.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={y + 66 + i * 13}
          fontSize={9.5}
          fill="#ffffff"
          opacity={0.9}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

/* ---------- 主元件 ---------- */

export default function MlWeek5Concept() {
  /* ===== ① 左區：Figure / Axes 容器解剖 ===== */
  const figBox = { x: 40, y: 60, w: 420, h: 430 }
  const axes1 = { x: 60, y: 96, w: 380, h: 175 }
  const axes2 = { x: 60, y: 286, w: 380, h: 175 }

  const a1Plot = { left: 95, right: 430, top: 106, bottom: 255 }
  const a1Points: Array<[number, number]> = [
    [95, 220],
    [150, 150],
    [205, 190],
    [260, 120],
    [315, 160],
    [370, 100],
    [430, 140],
  ]
  const a1PolyPoints = a1Points.map(([px, py]) => `${px},${py}`).join(' ')
  const a1AnnotateTarget = a1Points[2]

  const a2Plot = { left: 95, right: 390, top: 296, bottom: 445 }
  const a2ErrPoints: Array<{ x: number; y: number; err: number }> = [
    { x: 140, y: 380, err: 22 },
    { x: 210, y: 340, err: 14 },
    { x: 280, y: 360, err: 30 },
    { x: 350, y: 320, err: 18 },
  ]
  const cbar = { x: 400, y: 296, w: 14, h: 149 }

  /* ===== ② 右區：兩套介面呼叫路徑 ===== */
  const colW = 130
  const colGap = 30
  const colX = [555, 555 + colW + colGap, 555 + (colW + colGap) * 2]
  const rowA = { y: 108, h: 56 }
  const rowB = { y: 300, h: 56 }

  /* ===== ③ 下方決策帶 ===== */
  const dCols = [40, 235, 430, 625, 820]
  const dRow1Y = 780
  const dRow2Y = 950
  const dCardH = 110
  const dCardW = 180
  const dRow1CenterY = dRow1Y + dCardH / 2
  const dRow2CenterY = dRow2Y + dCardH / 2

  return (
    <div className="not-prose w-full max-w-6xl mx-auto">
      <svg
        viewBox="0 0 1040 1090"
        width="100%"
        role="img"
        aria-label="Matplotlib 圖形解剖與繪圖選型示意圖。左區：Figure 是整張畫布，內含兩個 Axes 子圖，
          各自標出座標軸與刻度、折線／散點、誤差棒、圖例、色條、標註文字與箭頭所在的層級。
          右區：狀態式介面 plt.plot()／plt.title() 以虛線先經過隱含的『目前這張圖（gca）』才連到某個 Axes，
          物件導向介面 fig, ax = plt.subplots() 則以實線直接連到明確指名的 ax；多子圖情境下狀態式介面容易畫錯地方。
          下方決策帶：依想回答的問題選函式，從折線、散點、直方圖、二維密度、等高線、不確定性到 Seaborn 統計繪圖，
          最終收束為『探索式：畫給自己，快而多，可丟棄』與『解釋式：畫給別人，一圖一結論』兩種心態。"
      >
        <defs>
          <marker id="mw5-arrow-solid" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--blue-600)" />
          </marker>
          <marker id="mw5-arrow-dashed" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="mw5-arrow-neutral" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--neutral-400)" />
          </marker>
          <linearGradient id="mw5-cbar" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--blue-100)" />
            <stop offset="100%" stopColor="var(--blue-700)" />
          </linearGradient>
        </defs>

        {/* ============ ① 左區：Figure / Axes 容器解剖 ============ */}
        <SectionBadge x={20} y={30} n={1} title="Figure／Axes 容器解剖" Icon={FrameIcon} />

        <rect
          x={figBox.x}
          y={figBox.y}
          width={figBox.w}
          height={figBox.h}
          rx={12}
          fill="var(--neutral-50)"
          stroke="var(--neutral-300)"
          strokeWidth={1.5}
        />
        <TagChip x={figBox.x + 12} y={figBox.y + 20} text="Figure（整張畫布）" />

        {/* Axes 1 */}
        <rect
          x={axes1.x}
          y={axes1.y}
          width={axes1.w}
          height={axes1.h}
          rx={8}
          fill="var(--surface-card)"
          stroke="var(--neutral-300)"
        />
        <TagChip x={axes1.x + 10} y={axes1.y + 16} text="Axes 1（一整張子圖）" />

        {/* 座標軸與刻度 */}
        <line x1={a1Plot.left} y1={a1Plot.top} x2={a1Plot.left} y2={a1Plot.bottom} stroke="var(--neutral-500)" strokeWidth={1.5} />
        <line x1={a1Plot.left} y1={a1Plot.bottom} x2={a1Plot.right} y2={a1Plot.bottom} stroke="var(--neutral-500)" strokeWidth={1.5} />
        {[0, 1, 2, 3].map((i) => {
          const tx = a1Plot.left + ((a1Plot.right - a1Plot.left) / 3) * i
          return <line key={`a1xt-${i}`} x1={tx} y1={a1Plot.bottom} x2={tx} y2={a1Plot.bottom + 4} stroke="var(--neutral-500)" strokeWidth={1} />
        })}
        {[0, 1, 2].map((i) => {
          const ty = a1Plot.top + ((a1Plot.bottom - a1Plot.top) / 2) * i
          return <line key={`a1yt-${i}`} x1={a1Plot.left - 4} y1={ty} x2={a1Plot.left} y2={ty} stroke="var(--neutral-500)" strokeWidth={1} />
        })}

        {/* 折線／散點 */}
        <polyline points={a1PolyPoints} fill="none" stroke="var(--blue-500)" strokeWidth={2} />
        {a1Points.map(([px, py]) => (
          <circle key={`a1p-${px}-${py}`} cx={px} cy={py} r={3} fill="var(--blue-600)" />
        ))}

        {/* 圖例 legend */}
        <rect x={350} y={110} width={70} height={30} rx={4} fill="var(--surface-card)" stroke="var(--neutral-300)" />
        <rect x={358} y={118} width={10} height={3} fill="var(--blue-500)" />
        <text x={372} y={122} fontSize={8} fill="var(--text-body)" style={{ fontFamily: 'var(--font-sans)' }}>
          y = f(x)
        </text>
        <text x={385} y={132} fontSize={8} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          legend
        </text>

        {/* 標註 annotation：文字 + 箭頭指向資料點 */}
        <line
          x1={140}
          y1={225}
          x2={a1AnnotateTarget[0] - 3}
          y2={a1AnnotateTarget[1] - 3}
          stroke="var(--neutral-600)"
          strokeWidth={1.2}
          markerEnd="url(#mw5-arrow-neutral)"
        />
        <text x={132} y={233} fontSize={9} fill="var(--neutral-600)" textAnchor="end" style={{ fontFamily: 'var(--font-sans)' }}>
          annotation
        </text>

        {/* 座標軸標籤 */}
        <Leader tx={a1Plot.left + 15} ty={a1Plot.bottom + 4} lx={a1Plot.left + 20} ly={a1Plot.bottom + 20} text="座標軸與刻度" />
        <Leader tx={315} ty={160} lx={250} ly={112} text="折線／散點" align="middle" />

        {/* Axes 2 */}
        <rect
          x={axes2.x}
          y={axes2.y}
          width={axes2.w}
          height={axes2.h}
          rx={8}
          fill="var(--surface-card)"
          stroke="var(--neutral-300)"
        />
        <TagChip x={axes2.x + 10} y={axes2.y + 16} text="Axes 2（另一張子圖）" />

        <line x1={a2Plot.left} y1={a2Plot.top} x2={a2Plot.left} y2={a2Plot.bottom} stroke="var(--neutral-500)" strokeWidth={1.5} />
        <line x1={a2Plot.left} y1={a2Plot.bottom} x2={a2Plot.right} y2={a2Plot.bottom} stroke="var(--neutral-500)" strokeWidth={1.5} />

        {/* 誤差棒 errorbar */}
        {a2ErrPoints.map((p) => (
          <g key={`err-${p.x}`}>
            <line x1={p.x} y1={p.y - p.err / 2} x2={p.x} y2={p.y + p.err / 2} stroke="var(--neutral-400)" strokeWidth={1.5} />
            <line x1={p.x - 5} y1={p.y - p.err / 2} x2={p.x + 5} y2={p.y - p.err / 2} stroke="var(--neutral-400)" strokeWidth={1.5} />
            <line x1={p.x - 5} y1={p.y + p.err / 2} x2={p.x + 5} y2={p.y + p.err / 2} stroke="var(--neutral-400)" strokeWidth={1.5} />
            <circle cx={p.x} cy={p.y} r={3} fill="var(--blue-600)" />
          </g>
        ))}
        <Leader tx={280} ty={345} lx={220} ly={318} text="誤差棒 errorbar" align="middle" />

        {/* 色條 colorbar */}
        <rect x={cbar.x} y={cbar.y} width={cbar.w} height={cbar.h} fill="url(#mw5-cbar)" stroke="var(--neutral-300)" />
        <text x={cbar.x + cbar.w / 2} y={cbar.y - 6} fontSize={8} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          高
        </text>
        <text x={cbar.x + cbar.w / 2} y={cbar.y + cbar.h + 12} fontSize={8} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          低
        </text>
        <Leader tx={cbar.x + cbar.w / 2} ty={cbar.y + cbar.h + 12} lx={cbar.x - 8} ly={cbar.y + cbar.h + 30} text="色條 colorbar" align="end" />

        {/* 洞察 callout */}
        <rect x={40} y={502} width={420} height={68} rx={10} fill="var(--surface-accent-soft)" />
        <foreignObject x={54} y={514} width={18} height={18}>
          <Lightbulb size={18} color="var(--orange-700)" />
        </foreignObject>
        <text x={80} y={528} fontSize={11.5} fontWeight={700} fill="var(--orange-700)" style={{ fontFamily: 'var(--font-sans)' }}>
          Figure 是整張畫布，
        </text>
        <text x={54} y={546} fontSize={11.5} fontWeight={700} fill="var(--orange-700)" style={{ fontFamily: 'var(--font-sans)' }}>
          Axes 是「一整張有座標軸的子圖」，不是一條軸。
        </text>
        <text x={54} y={562} fontSize={10} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          最常被誤解的層級關係，先分清楚再談兩套介面。
        </text>

        {/* ============ ② 右區：兩套介面呼叫路徑對照 ============ */}
        <SectionBadge x={540} y={30} n={2} title="兩套介面的呼叫路徑對照" Icon={GitCompare} />

        {/* 圖例：虛線 vs 實線 */}
        <line x1={780} y1={26} x2={810} y2={26} stroke="var(--neutral-400)" strokeWidth={2} strokeDasharray="4 3" />
        <text x={816} y={30} fontSize={9.5} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          隱含（gca）
        </text>
        <line x1={780} y1={44} x2={810} y2={44} stroke="var(--blue-600)" strokeWidth={2} />
        <text x={816} y={48} fontSize={9.5} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          明確指名（ax）
        </text>

        {/* Row A：狀態式介面（虛線） */}
        <text x={555} y={92} fontSize={11} fontWeight={700} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          狀態式（pyplot）
        </text>
        <rect x={colX[0]} y={rowA.y} width={colW} height={rowA.h} rx={8} fill="var(--neutral-50)" stroke="var(--neutral-300)" />
        <text x={colX[0] + colW / 2} y={rowA.y + 24} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          plt.plot()
        </text>
        <text x={colX[0] + colW / 2} y={rowA.y + 40} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          plt.title()
        </text>

        <line
          x1={colX[0] + colW}
          y1={rowA.y + rowA.h / 2}
          x2={colX[1]}
          y2={rowA.y + rowA.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd="url(#mw5-arrow-dashed)"
        />

        <rect
          x={colX[1]}
          y={rowA.y}
          width={colW}
          height={rowA.h}
          rx={8}
          fill="var(--neutral-50)"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text x={colX[1] + colW / 2} y={rowA.y + 24} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          目前這張圖
        </text>
        <text x={colX[1] + colW / 2} y={rowA.y + 40} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          （隱含 gca）
        </text>

        <line
          x1={colX[1] + colW}
          y1={rowA.y + rowA.h / 2}
          x2={colX[2]}
          y2={rowA.y + rowA.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd="url(#mw5-arrow-dashed)"
        />

        <rect x={colX[2]} y={rowA.y} width={colW} height={rowA.h} rx={8} fill="var(--surface-card)" stroke="var(--neutral-300)" />
        <text x={colX[2] + colW / 2} y={rowA.y + 24} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
          某個 Axes
        </text>
        <text x={colX[2] + colW / 2} y={rowA.y + 40} fontSize={9} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
          （不確定是哪個）
        </text>

        {/* 多子圖警告 */}
        <rect x={555} y={176} width={450} height={46} rx={8} fill="var(--warning-50)" />
        <foreignObject x={567} y={190} width={16} height={16}>
          <TriangleAlert size={16} color="var(--warning-500)" />
        </foreignObject>
        <text x={590} y={195} fontSize={10} fontWeight={600} fill="var(--warning-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          多子圖情境：狀態式介面在多個 Axes 下容易畫錯地方，
        </text>
        <text x={590} y={210} fontSize={10} fontWeight={600} fill="var(--warning-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          因為「目前這張圖」是看不見的全域變數。
        </text>

        {/* Row B：物件導向介面（實線） */}
        <text x={555} y={280} fontSize={11} fontWeight={700} fill="var(--blue-700)" style={{ fontFamily: 'var(--font-sans)' }}>
          物件導向（OO）
        </text>
        <rect x={colX[0]} y={rowB.y} width={colW} height={rowB.h} rx={8} fill="var(--blue-50)" stroke="var(--blue-500)" />
        <text x={colX[0] + colW / 2} y={rowB.y + 24} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--blue-700)" style={{ fontFamily: 'var(--font-mono)' }}>
          fig, ax =
        </text>
        <text x={colX[0] + colW / 2} y={rowB.y + 40} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--blue-700)" style={{ fontFamily: 'var(--font-mono)' }}>
          plt.subplots()
        </text>

        <line
          x1={colX[0] + colW}
          y1={rowB.y + rowB.h / 2}
          x2={colX[1]}
          y2={rowB.y + rowB.h / 2}
          stroke="var(--blue-600)"
          strokeWidth={2}
          markerEnd="url(#mw5-arrow-solid)"
        />

        <rect x={colX[1]} y={rowB.y} width={colW} height={rowB.h} rx={8} fill="var(--blue-50)" stroke="var(--blue-500)" />
        <text x={colX[1] + colW / 2} y={rowB.y + 24} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--blue-700)" style={{ fontFamily: 'var(--font-mono)' }}>
          ax.plot()
        </text>
        <text x={colX[1] + colW / 2} y={rowB.y + 40} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--blue-700)" style={{ fontFamily: 'var(--font-mono)' }}>
          ax.set_title()
        </text>

        <line
          x1={colX[1] + colW}
          y1={rowB.y + rowB.h / 2}
          x2={colX[2]}
          y2={rowB.y + rowB.h / 2}
          stroke="var(--blue-600)"
          strokeWidth={2}
          markerEnd="url(#mw5-arrow-solid)"
        />

        <rect x={colX[2]} y={rowB.y} width={colW} height={rowB.h} rx={8} fill="var(--blue-600)" />
        <text x={colX[2] + colW / 2} y={rowB.y + 24} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="#ffffff" style={{ fontFamily: 'var(--font-sans)' }}>
          指名的 ax
        </text>
        <text x={colX[2] + colW / 2} y={rowB.y + 40} fontSize={9} textAnchor="middle" fill="#ffffff" opacity={0.85} style={{ fontFamily: 'var(--font-sans)' }}>
          （明確、可重複用）
        </text>

        <text x={555} y={372} fontSize={9.5} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
          判準：圖裡有幾個 Axes？一旦畫圖被包成可重複呼叫的函式，
        </text>
        <text x={555} y={388} fontSize={9.5} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
          就該換成物件導向、明確指名 ax。
        </text>

        {/* ============ ③ 下方決策帶 ============ */}
        <SectionBadge x={20} y={670} n={3} title="繪圖選型：從「想回答什麼問題」出發" Icon={LayoutGrid} />

        {/* Row 1 */}
        <line x1={dCols[0] + dCardW} y1={dRow1CenterY} x2={dCols[4] + dCardW} y2={dRow1CenterY} stroke="var(--neutral-300)" strokeWidth={2} />
        <RootQNode x={dCols[0]} y={dRow1Y} w={dCardW} h={dCardH} />
        <FuncCard
          x={dCols[1]}
          y={dRow1Y}
          w={dCardW}
          h={dCardH}
          Icon={TrendingUp}
          question={['隨序列變化的趨勢']}
          func={['plt.plot']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <FuncCard
          x={dCols[2]}
          y={dRow1Y}
          w={dCardW}
          h={dCardH}
          Icon={CircleDot}
          question={['兩變數關係，想用大小／', '顏色多編碼變數']}
          func={['plt.scatter']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <FuncCard
          x={dCols[3]}
          y={dRow1Y}
          w={dCardW}
          h={dCardH}
          Icon={BarChart3}
          question={['單變數分布']}
          func={['plt.hist']}
          note={['bin 寬度是關鍵旋鈕：', '太寬壓雙峰、太窄全雜訊']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <FuncCard
          x={dCols[4]}
          y={dRow1Y}
          w={dCardW}
          h={dCardH}
          Icon={Grid3x3}
          question={['雙變數密度']}
          func={['hist2d／hexbin／KDE']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />

        {/* 換行連接線 */}
        <path
          d={`M${dCols[4] + dCardW},${dRow1CenterY} L${dCols[4] + dCardW + 15},${dRow1CenterY} L${dCols[4] + dCardW + 15},${dRow2CenterY} L${dCols[0]},${dRow2CenterY}`}
          fill="none"
          stroke="var(--neutral-300)"
          strokeWidth={2}
          markerEnd="url(#mw5-arrow-neutral)"
        />

        {/* Row 2 */}
        <FuncCard
          x={dCols[0]}
          y={dRow2Y}
          w={dCardW}
          h={dCardH}
          Icon={Waves}
          question={['網格上的函數場']}
          func={['contour／contourf']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <FuncCard
          x={dCols[1]}
          y={dRow2Y}
          w={dCardW}
          h={dCardH}
          Icon={ArrowUpDown}
          question={['要呈現不確定性']}
          func={['errorbar／fill_between']}
          accent="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <FuncCard
          x={dCols[2]}
          y={dRow2Y}
          w={dCardW}
          h={dCardH}
          Icon={LayoutGrid}
          question={['一次掃多欄位或', '做統計摘要']}
          func={['Seaborn（pairplot／', 'jointplot／FacetGrid）']}
          accent="var(--orange-700)"
          bg="var(--orange-50)"
        />
        <SummaryBlock
          x={dCols[3]}
          y={dRow2Y}
          w={dCardW}
          h={dCardH}
          Icon={Search}
          title="探索式"
          desc={['畫給自己：快而多，', '可丟棄']}
          fill="var(--blue-600)"
        />
        <SummaryBlock
          x={dCols[4]}
          y={dRow2Y}
          w={dCardW}
          h={dCardH}
          Icon={Presentation}
          title="解釋式"
          desc={['畫給別人：', '一圖一結論']}
          fill="var(--orange-600)"
        />
      </svg>
    </div>
  )
}
