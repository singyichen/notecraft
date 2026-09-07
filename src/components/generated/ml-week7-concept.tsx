/**
 * 核心洞察：資料洩漏不是「做錯了某個步驟」，而是「步驟做對了但時機錯了」——
 * 同一組補缺值／one-hot／標準化，發生在切分之前就會偷看到測試資料，發生在
 * 每個 fold 內部、只對訓練部分 fit，才是誠實的估計。這張圖把「時機」畫成
 * 唯一的差異變數：上排的容器用虛線＋警示色，強調它在切分前就跑過一次；
 * 下排的容器用實線＋成功色，並拆出兩條入口——訓練部分走 fit、驗證部分只走
 * transform——讓「fit 的作用範圍只在 fold 內的訓練資料」這件事一眼可見。
 */

import {
  TriangleAlert,
  CheckCircle2,
  Lock,
  GitBranch,
  RefreshCw,
  BarChart3,
  Check,
  type LucideIcon,
} from 'lucide-react'

interface FlowNodeProps {
  x: number
  y: number
  w: number
  h: number
  lines: string[]
  bg: string
  color: string
  Icon?: LucideIcon
  iconColor?: string
  fontSize?: number
  fontWeight?: number
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
}

function FlowNode({
  x,
  y,
  w,
  h,
  lines,
  bg,
  color,
  Icon,
  iconColor,
  fontSize = 12,
  fontWeight = 600,
  stroke,
  strokeWidth,
  strokeDasharray,
}: FlowNodeProps) {
  const cx = x + w / 2
  const hasIcon = !!Icon
  const lineGap = fontSize + 3
  const textBlockH = lines.length * lineGap
  const baseY = hasIcon ? y + 22 : y + h / 2 - textBlockH / 2 + fontSize
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={bg}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
      {hasIcon && Icon && (
        <foreignObject x={cx - 8} y={y + 8} width={16} height={16}>
          <Icon size={16} color={iconColor ?? color} />
        </foreignObject>
      )}
      {lines.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={baseY + i * lineGap}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fill={color}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

interface ChipProps {
  x: number
  y: number
  w: number
  h: number
  label: string
  bg: string
  color: string
}

function Chip({ x, y, w, h, label, bg, color }: ChipProps) {
  const cx = x + w / 2
  const cy = y + h / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={bg} stroke={color} strokeWidth={1} />
      <text
        x={cx}
        y={cy + 3.5}
        fontSize={9.5}
        fontWeight={700}
        fill={color}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
    </g>
  )
}

interface ArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  marker: string
  dashed?: boolean
  strokeWidth?: number
}

function Arrow({ x1, y1, x2, y2, color, marker, dashed, strokeWidth = 2 }: ArrowProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={`url(#${marker})`}
    />
  )
}

interface CaptionProps {
  x: number
  y: number
  lines: string[]
  color: string
  fontSize?: number
  anchor?: 'start' | 'middle' | 'end'
}

function Caption({ x, y, lines, color, fontSize = 9.5, anchor = 'start' }: CaptionProps) {
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={line}
          x={x}
          y={y + i * (fontSize + 3)}
          fontSize={fontSize}
          fill={color}
          textAnchor={anchor}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </>
  )
}

const topChips = [
  { label: '補缺值', x: 186 },
  { label: 'one-hot', x: 274 },
  { label: '標準化', x: 362 },
]

const bottomChips = [
  { label: '補缺值', x: 330 },
  { label: 'one-hot', x: 404 },
  { label: '標準化', x: 478 },
  { label: '模型', x: 552 },
]

export default function MlWeek7Concept() {
  return (
    <div className="not-prose w-full max-w-4xl mx-auto">
      <svg
        viewBox="0 0 1000 750"
        width="100%"
        role="img"
        aria-label="資料洩漏發生在哪裡的流程對比圖。上排：會洩漏的做法——整份原始資料直接跑補缺值、one-hot、標準化（此時轉換器已經看過全部資料，包含之後才要當測試集的部分），才切出 train/test 與 k 個 fold，導致交叉驗證分數虛高。下排：正確做法——原始資料先切出一份 test 留到最後，訓練集再切成 k 折，每一折內部各自跑一次完整 pipeline（補缺值、one-hot、標準化、模型），轉換器只用該折的訓練部分 fit、對驗證部分只做 transform，k 個分數取平均與標準差之後，最後才用一次 test 確認，得到誠實的估計。右側圖例比較兩種做法的分數：虛高的交叉驗證分數約 95%，誠實的交叉驗證分數約 82%。"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <defs>
          <marker id="mw7-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="mw7-arrow-danger" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--danger-500)" />
          </marker>
          <marker id="mw7-arrow-success" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--success-500)" />
          </marker>
          <marker id="mw7-arrow-info" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--info-500)" />
          </marker>
        </defs>

        {/* ───────── 上排：會洩漏的做法 ───────── */}
        <rect x={20} y={20} width={760} height={260} rx={20} fill="var(--danger-50)" />
        <foreignObject x={44} y={32} width={18} height={18}>
          <TriangleAlert size={18} color="var(--danger-500)" />
        </foreignObject>
        <text x={68} y={47} fontSize={15} fontWeight={700} fill="var(--danger-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          會洩漏的做法
        </text>
        <text x={44} y={68} fontSize={11.5} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          前處理在切分之前就做，統計量已經看過全部資料
        </text>

        <FlowNode
          x={44}
          y={165}
          w={100}
          h={60}
          lines={['整份原始資料', '（含 test）']}
          bg="var(--neutral-100)"
          color="var(--neutral-700)"
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        <Arrow x1={144} y1={195} x2={170} y2={192} color="var(--neutral-400)" marker="mw7-arrow" />

        {/* pipeline 容器（在切分前）：虛線＋警示色 */}
        <rect x={170} y={127} width={280} height={130} rx={12} fill="var(--neutral-0)" stroke="var(--danger-500)" strokeWidth={2} strokeDasharray="6 4" />
        <text x={310} y={148} fontSize={11} fontWeight={600} fill="var(--danger-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          pipeline（切分前就 fit）
        </text>
        {topChips.map((c) => (
          <Chip key={c.label} x={c.x} y={170} w={72} h={44} label={c.label} bg="var(--danger-50)" color="var(--danger-500)" />
        ))}
        <Arrow x1={258} y1={192} x2={274} y2={192} color="var(--danger-500)" marker="mw7-arrow-danger" strokeWidth={1.5} />
        <Arrow x1={346} y1={192} x2={362} y2={192} color="var(--danger-500)" marker="mw7-arrow-danger" strokeWidth={1.5} />
        <foreignObject x={186} y={221} width={14} height={14}>
          <TriangleAlert size={14} color="var(--danger-500)" />
        </foreignObject>
        <text x={204} y={232} fontSize={10.5} fill="var(--danger-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          fit 已經看過全部資料（含 test）
        </text>

        <Arrow x1={450} y1={192} x2={482} y2={195} color="var(--neutral-400)" marker="mw7-arrow" />
        <FlowNode
          x={482}
          y={165}
          w={120}
          h={60}
          lines={['才切 train/test', '與 k 個 fold']}
          bg="var(--neutral-100)"
          color="var(--neutral-700)"
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        <text x={542} y={238} fontSize={10} fontWeight={600} fill="var(--danger-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          已經太晚了
        </text>

        <Arrow x1={602} y1={192} x2={642} y2={195} color="var(--danger-500)" marker="mw7-arrow-danger" />
        <FlowNode
          x={642}
          y={165}
          w={118}
          h={60}
          lines={['交叉驗證分數', '虛高']}
          bg="var(--neutral-0)"
          color="var(--danger-500)"
          fontWeight={700}
          Icon={TriangleAlert}
          stroke="var(--danger-500)"
          strokeWidth={2}
        />

        {/* ───────── 右側小圖例：兩種做法的分數差異 ───────── */}
        <rect x={800} y={20} width={180} height={260} rx={16} fill="var(--neutral-50)" stroke="var(--border-subtle)" strokeWidth={1} />
        <text x={890} y={44} fontSize={12} fontWeight={700} fill="var(--text-strong)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          兩種流程的分數差異
        </text>

        <foreignObject x={816} y={58} width={12} height={12}>
          <TriangleAlert size={12} color="var(--danger-500)" />
        </foreignObject>
        <text x={832} y={68} fontSize={10} fill="var(--danger-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          虛高的交叉驗證分數
        </text>
        <rect x={816} y={78} width={140} height={22} rx={4} fill="var(--danger-500)" />
        <text x={886} y={93} fontSize={11} fontWeight={700} fill="#ffffff" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          約 95%
        </text>

        <foreignObject x={816} y={116} width={12} height={12}>
          <Check size={12} color="var(--success-500)" />
        </foreignObject>
        <text x={832} y={126} fontSize={10} fill="var(--success-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          誠實的交叉驗證分數
        </text>
        <rect x={816} y={136} width={105} height={22} rx={4} fill="var(--success-500)" />
        <text x={868} y={151} fontSize={11} fontWeight={700} fill="#ffffff" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          約 82%
        </text>

        <line x1={816} y1={170} x2={956} y2={170} stroke="var(--border-subtle)" strokeWidth={1} />
        <Caption
          x={816}
          y={188}
          color="var(--danger-500)"
          lines={['虛高：test 的統計量', '偷跑進前處理，分數', '比真實表現樂觀']}
        />
        <Caption
          x={816}
          y={234}
          color="var(--success-500)"
          lines={['誠實：每個 fold 內', '各自 fit，才反映模', '型真正的泛化能力']}
        />

        {/* ───────── 下排：正確做法 ───────── */}
        <rect x={20} y={300} width={960} height={430} rx={20} fill="var(--success-50)" />
        <foreignObject x={44} y={318} width={18} height={18}>
          <CheckCircle2 size={18} color="var(--success-500)" />
        </foreignObject>
        <text x={68} y={333} fontSize={15} fontWeight={700} fill="var(--success-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          正確做法
        </text>
        <text x={44} y={355} fontSize={11.5} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
          test 留到最後；每個 fold 內部各自 fit，只對驗證部分 transform
        </text>

        <FlowNode
          x={44}
          y={380}
          w={100}
          h={60}
          lines={['原始資料']}
          bg="var(--neutral-100)"
          color="var(--neutral-700)"
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        <Arrow x1={144} y1={410} x2={176} y2={410} color="var(--neutral-400)" marker="mw7-arrow" />

        <FlowNode
          x={176}
          y={380}
          w={140}
          h={60}
          lines={['先切出 test', '（留到最後）']}
          bg="var(--info-50)"
          color="var(--info-500)"
          Icon={Lock}
          stroke="var(--info-500)"
          strokeWidth={1}
        />
        <Arrow x1={316} y1={410} x2={348} y2={410} color="var(--neutral-400)" marker="mw7-arrow" />

        <FlowNode
          x={348}
          y={380}
          w={130}
          h={60}
          lines={['訓練集切成', 'k 折']}
          bg="var(--neutral-100)"
          color="var(--neutral-700)"
          Icon={GitBranch}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />

        <Arrow x1={413} y1={440} x2={400} y2={460} color="var(--neutral-400)" marker="mw7-arrow" />
        <foreignObject x={444} y={438} width={13} height={13}>
          <RefreshCw size={13} color="var(--neutral-500)" />
        </foreignObject>
        <text x={462} y={448} fontSize={10} fill="var(--neutral-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          每一折都各自重跑一次
        </text>

        {/* fold 內部容器：實線＋成功色，拆出 fit（train）與 transform（val）兩條入口 */}
        <rect x={170} y={460} width={460} height={170} rx={14} fill="var(--neutral-0)" stroke="var(--success-500)" strokeWidth={2} />
        <text x={400} y={478} fontSize={10.5} fontWeight={600} fill="var(--success-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          此 fold 內部：train 段 fit，val 段只 transform
        </text>

        <rect x={190} y={498} width={110} height={36} rx={8} fill="var(--success-50)" />
        <text x={245} y={520} fontSize={10} fontWeight={600} fill="var(--success-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          本折：訓練部分
        </text>

        <rect x={190} y={560} width={110} height={36} rx={8} fill="var(--info-50)" />
        <text x={245} y={582} fontSize={10} fontWeight={600} fill="var(--info-500)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
          本折：驗證部分
        </text>

        {bottomChips.map((c) => (
          <Chip key={c.label} x={c.x} y={518} w={58} h={50} label={c.label} bg="var(--success-50)" color="var(--success-500)" />
        ))}
        <Arrow x1={388} y1={543} x2={404} y2={543} color="var(--success-500)" marker="mw7-arrow-success" strokeWidth={1.5} />
        <Arrow x1={462} y1={543} x2={478} y2={543} color="var(--success-500)" marker="mw7-arrow-success" strokeWidth={1.5} />
        <Arrow x1={536} y1={543} x2={552} y2={543} color="var(--success-500)" marker="mw7-arrow-success" strokeWidth={1.5} />

        <Arrow x1={300} y1={516} x2={330} y2={530} color="var(--success-500)" marker="mw7-arrow-success" strokeWidth={1.5} />
        <text x={306} y={510} fontSize={9.5} fontWeight={700} fill="var(--success-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          fit
        </text>

        <Arrow x1={300} y1={578} x2={330} y2={556} color="var(--info-500)" marker="mw7-arrow-info" dashed strokeWidth={1.5} />
        <text x={292} y={598} fontSize={9.5} fontWeight={700} fill="var(--info-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          transform only
        </text>

        <Arrow x1={630} y1={543} x2={800} y2={533} color="var(--success-500)" marker="mw7-arrow-success" />

        <FlowNode
          x={800}
          y={498}
          w={150}
          h={70}
          lines={['k 個分數：', '平均 ± 標準差']}
          bg="var(--success-50)"
          color="var(--success-500)"
          Icon={BarChart3}
          fontWeight={700}
        />

        <Arrow x1={875} y1={568} x2={805} y2={620} color="var(--success-500)" marker="mw7-arrow-success" />

        <FlowNode
          x={660}
          y={620}
          w={290}
          h={70}
          lines={['最後才用一次 test 確認', '（誠實估計）']}
          bg="var(--neutral-0)"
          color="var(--success-500)"
          fontWeight={700}
          Icon={CheckCircle2}
          stroke="var(--success-500)"
          strokeWidth={2}
        />

        {/* held-out test：從先切出的 test 繞過 fold 容器，直到最後才進入確認節點 */}
        <path
          d="M246,440 L246,455 L60,455 L60,655 L660,655"
          fill="none"
          stroke="var(--info-500)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          markerEnd="url(#mw7-arrow-info)"
        />
        <text x={64} y={472} fontSize={9} fill="var(--info-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          held-out
        </text>
        <text x={64} y={484} fontSize={9} fill="var(--info-500)" style={{ fontFamily: 'var(--font-sans)' }}>
          test
        </text>
      </svg>
    </div>
  )
}
