/**
 * 核心洞察：(1) 該用 NumPy 還是 Pandas，判斷依據是「有沒有欄名／型別是否一致」，
 * 不是資料量大小；(2) 兩者不是二選一，而是同一條管線上的前後段——
 * DataFrame 底下就是 ndarray，Pandas 讀檔清理、分組算特徵，
 * 最後 `.to_numpy()` 把整理好的表格交回 NumPy 的向量化世界交給模型。
 * 因此版面刻意畫成「上層 Pandas —— 粗箭頭 —— 下層 NumPy」再加一條橫貫的
 * 流程軸，而不是兩張並列、互不相干的能力清單。
 */

import {
  Lightbulb,
  Table2,
  Grid3x3,
  Zap,
  Sigma,
  Expand,
  Filter,
  ListOrdered,
  Search,
  FilterX,
  Group,
  Combine,
  CalendarClock,
  FileText,
  Binary,
  Cpu,
  ArrowBigUp,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

type Accent = 'blue' | 'orange'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const LEAF_XS = [22, 200, 378, 556, 734]
const LEAF_W = 164
const LEAF_H = 92

const CENTER: Rect = { x: 350, y: 62, w: 220, h: 56 }
const PANDAS_LEAF_Y = 140
const ARROW_TOP = PANDAS_LEAF_Y + LEAF_H // 232
const NUMPY_CENTER: Rect = { x: 350, y: 336, w: 220, h: 56 }
const NUMPY_LEAF_Y = 414

const PIPE_XS = [20, 170, 320, 470, 620, 770]
const PIPE_W = 130
const PIPE_H = 60
const PIPE_Y = 540

const W = 920
const H = 632

function cx(r: Rect): number {
  return r.x + r.w / 2
}

interface InsightChipProps {
  x: number
  y: number
  w: number
  text: string
}

function InsightChip({ x, y, w, text }: InsightChipProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={30} rx={8} fill="var(--surface-sunken)" />
      <foreignObject x={x + 10} y={y + 7} width={16} height={16}>
        <Lightbulb size={16} color="var(--text-accent)" />
      </foreignObject>
      <text
        x={x + 32}
        y={y + 19}
        fontSize={11.5}
        fontWeight={600}
        fill="var(--text-body)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

interface CenterNodeProps extends Rect {
  title: string
  subtitle: string
  Icon: LucideIcon
  fill: string
}

function CenterNode({ x, y, w, h, title, subtitle, Icon, fill }: CenterNodeProps) {
  const c = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} />
      <foreignObject x={c - 11} y={y + 9} width={22} height={22}>
        <Icon size={22} color="#ffffff" />
      </foreignObject>
      <text
        x={c}
        y={y + h / 2 + 12}
        fontSize={16}
        fontWeight={700}
        fill="#ffffff"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
      <text
        x={c}
        y={y + h - 8}
        fontSize={10.5}
        fill="rgba(255,255,255,0.85)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {subtitle}
      </text>
    </g>
  )
}

interface LeafNodeProps extends Rect {
  titleLines: string[]
  note?: string
  code: string
  Icon: LucideIcon
  accent: Accent
}

function LeafNode({ x, y, w, h, titleLines, note, code, Icon, accent }: LeafNodeProps) {
  const c = x + w / 2
  const bg = accent === 'blue' ? 'var(--blue-50)' : 'var(--orange-50)'
  const fg = accent === 'blue' ? 'var(--blue-700)' : 'var(--orange-700)'
  const titleStartY = y + 34
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={bg} />
      <foreignObject x={c - 8} y={y + 9} width={16} height={16}>
        <Icon size={16} color={fg} />
      </foreignObject>
      {titleLines.map((line, i) => (
        <text
          key={line}
          x={c}
          y={titleStartY + i * 13}
          fontSize={12}
          fontWeight={700}
          fill={fg}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
      {note ? (
        <text
          x={c}
          y={titleStartY + titleLines.length * 13 + 2}
          fontSize={9.5}
          fill="var(--text-muted)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {note}
        </text>
      ) : null}
      <text
        x={c}
        y={y + h - 12}
        fontSize={9.5}
        fill="var(--neutral-600)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {code}
      </text>
    </g>
  )
}

interface FanLinesProps {
  from: { x: number; y: number }
  toXs: number[]
  toY: number
}

function FanLines({ from, toXs, toY }: FanLinesProps) {
  return (
    <>
      {toXs.map((x) => (
        <line
          key={x}
          x1={from.x}
          y1={from.y}
          x2={x}
          y2={toY}
          stroke="var(--neutral-300)"
          strokeWidth={1.5}
        />
      ))}
    </>
  )
}

interface PipelineStepProps extends Rect {
  label: string
  code: string
  Icon: LucideIcon
  variant: 'pandas' | 'numpy' | 'transition'
}

function PipelineStep({ x, y, w, h, label, code, Icon, variant }: PipelineStepProps) {
  const c = x + w / 2
  const styles: Record<PipelineStepProps['variant'], { bg: string; fg: string; dashed: boolean }> = {
    pandas: { bg: 'var(--blue-50)', fg: 'var(--blue-700)', dashed: false },
    numpy: { bg: 'var(--orange-50)', fg: 'var(--orange-700)', dashed: false },
    transition: { bg: 'var(--surface-sunken)', fg: 'var(--neutral-700)', dashed: true },
  }
  const s = styles[variant]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        fill={s.bg}
        stroke={s.dashed ? 'var(--neutral-400)' : 'none'}
        strokeWidth={s.dashed ? 1.5 : 0}
        strokeDasharray={s.dashed ? '4 3' : undefined}
      />
      <foreignObject x={c - 8} y={y + 8} width={16} height={16}>
        <Icon size={16} color={s.fg} />
      </foreignObject>
      <text
        x={c}
        y={y + 34}
        fontSize={11.5}
        fontWeight={700}
        fill={s.fg}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
      <text
        x={c}
        y={y + h - 9}
        fontSize={9}
        fill="var(--neutral-600)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {code}
      </text>
    </g>
  )
}

interface LegendSwatchProps {
  x: number
  y: number
  color: string
  label: string
}

function LegendSwatch({ x, y, color, label }: LegendSwatchProps) {
  return (
    <g>
      <rect x={x} y={y} width={10} height={10} rx={3} fill={color} />
      <text
        x={x + 16}
        y={y + 9}
        fontSize={10.5}
        fill="var(--text-body)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
    </g>
  )
}

export default function MlWeek3Concept() {
  const pandasCenterBottom = { x: cx(CENTER), y: CENTER.y + CENTER.h }
  const numpyCenterBottom = { x: cx(NUMPY_CENTER), y: NUMPY_CENTER.y + NUMPY_CENTER.h }
  const arrowCx = cx(CENTER)

  const pipelineSteps: Omit<PipelineStepProps, 'x' | 'y' | 'w' | 'h'>[] = [
    { label: '讀檔', code: "pd.read_csv()", Icon: FileText, variant: 'pandas' },
    { label: '清缺值', code: 'dropna() / fillna()', Icon: FilterX, variant: 'pandas' },
    { label: '合併', code: "merge(a, b, on='id')", Icon: Combine, variant: 'pandas' },
    { label: '分組算特徵', code: "groupby(k).mean()", Icon: Group, variant: 'pandas' },
    { label: '.to_numpy()', code: 'df.to_numpy()', Icon: Binary, variant: 'transition' },
    { label: '交給模型', code: 'model.fit(X, y)', Icon: Cpu, variant: 'numpy' },
  ]

  return (
    <div className="not-prose w-full max-w-5xl mx-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="資料處理工具分層地圖：上層是 Pandas 的 Series / DataFrame，向外接出 .loc/.iloc、缺失值處理、groupby、concat/merge/join、樞紐分析表與時間序列五個能力；下層是 NumPy 的 ndarray，向外接出向量化、聚合、廣播、布林遮罩、花式索引五個能力；兩層之間以粗箭頭標示 DataFrame 底下就是 ndarray；最下方橫貫一條讀檔、清缺值、合併、分組算特徵、to_numpy、交給模型的流程軸，並以底色區分 Pandas 與 NumPy 的段落。"
      >
        <defs>
          <linearGradient id="mw3-flow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--orange-500)" />
            <stop offset="100%" stopColor="var(--blue-500)" />
          </linearGradient>
          <marker id="mw3-arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto">
            <path d="M0,0 L10,0 L5,9 Z" fill="url(#mw3-flow)" />
          </marker>
        </defs>

        {/* 兩個核心洞察 */}
        <InsightChip x={20} y={8} w={440} text="選型看的是有沒有欄名／型別是否一致，不是資料大小" />
        <InsightChip x={470} y={8} w={430} text="NumPy 與 Pandas 不是二選一，是同一條管線的前後段" />

        {/* 上層：Pandas */}
        <text
          x={cx(CENTER)}
          y={56}
          fontSize={11.5}
          fontWeight={700}
          fill="var(--blue-700)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Pandas：有欄名的真實表格
        </text>
        <FanLines from={pandasCenterBottom} toXs={LEAF_XS.map((x) => x + LEAF_W / 2)} toY={PANDAS_LEAF_Y} />
        <CenterNode
          {...CENTER}
          title="Series / DataFrame"
          subtitle="共用一條索引、對齊排好的表格"
          Icon={Table2}
          fill="var(--blue-600)"
        />
        <LeafNode
          x={LEAF_XS[0]}
          y={PANDAS_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['.loc / .iloc']}
          code="df.iloc[0:3]"
          Icon={Search}
          accent="blue"
        />
        <LeafNode
          x={LEAF_XS[1]}
          y={PANDAS_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['缺失值處理']}
          code="df.fillna(0)"
          Icon={FilterX}
          accent="blue"
        />
        <LeafNode
          x={LEAF_XS[2]}
          y={PANDAS_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['groupby']}
          code="groupby('city').mean()"
          Icon={Group}
          accent="blue"
        />
        <LeafNode
          x={LEAF_XS[3]}
          y={PANDAS_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['concat / merge', '/ join']}
          code="merge(a, b, on='id')"
          Icon={Combine}
          accent="blue"
        />
        <LeafNode
          x={LEAF_XS[4]}
          y={PANDAS_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['樞紐分析表', '與時間序列']}
          code="resample('M').mean()"
          Icon={CalendarClock}
          accent="blue"
        />

        {/* 粗箭頭：DataFrame 底下就是 ndarray */}
        <line
          x1={arrowCx}
          y1={NUMPY_CENTER.y}
          x2={arrowCx}
          y2={ARROW_TOP + 8}
          stroke="url(#mw3-flow)"
          strokeWidth={10}
          markerEnd="url(#mw3-arrowhead)"
        />
        <rect
          x={arrowCx + 24}
          y={(ARROW_TOP + NUMPY_CENTER.y) / 2 - 30}
          width={356}
          height={60}
          rx={10}
          fill="var(--surface-sunken)"
        />
        <foreignObject x={arrowCx + 36} y={(ARROW_TOP + NUMPY_CENTER.y) / 2 - 22} width={18} height={18}>
          <ArrowBigUp size={18} color="var(--text-strong)" />
        </foreignObject>
        <text
          x={arrowCx + 60}
          y={(ARROW_TOP + NUMPY_CENTER.y) / 2 - 8}
          fontSize={12.5}
          fontWeight={700}
          fill="var(--text-strong)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          DataFrame 底下就是 ndarray
        </text>
        <text
          x={arrowCx + 60}
          y={(ARROW_TOP + NUMPY_CENTER.y) / 2 + 10}
          fontSize={10.5}
          fill="var(--text-muted)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          廣播、布林遮罩、聚合原封不動再用一次
        </text>

        {/* 下層：NumPy */}
        <text
          x={cx(NUMPY_CENTER)}
          y={NUMPY_CENTER.y - 8}
          fontSize={11.5}
          fontWeight={700}
          fill="var(--orange-700)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          NumPy：同型別數值運算
        </text>
        <CenterNode
          {...NUMPY_CENTER}
          title="ndarray"
          subtitle="單一 dtype，連續記憶體的多維陣列"
          Icon={Grid3x3}
          fill="var(--orange-600)"
        />
        <FanLines from={numpyCenterBottom} toXs={LEAF_XS.map((x) => x + LEAF_W / 2)} toY={NUMPY_LEAF_Y} />
        <LeafNode
          x={LEAF_XS[0]}
          y={NUMPY_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['向量化', '/ ufuncs']}
          code="arr * 2"
          Icon={Zap}
          accent="orange"
        />
        <LeafNode
          x={LEAF_XS[1]}
          y={NUMPY_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['聚合']}
          note="axis＝被壓扁的維度"
          code="X.mean(axis=0)"
          Icon={Sigma}
          accent="orange"
        />
        <LeafNode
          x={LEAF_XS[2]}
          y={NUMPY_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['廣播']}
          code="X - X.mean(axis=0)"
          Icon={Expand}
          accent="orange"
        />
        <LeafNode
          x={LEAF_XS[3]}
          y={NUMPY_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['布林遮罩']}
          code="temps[temps > 30]"
          Icon={Filter}
          accent="orange"
        />
        <LeafNode
          x={LEAF_XS[4]}
          y={NUMPY_LEAF_Y}
          w={LEAF_W}
          h={LEAF_H}
          titleLines={['花式索引']}
          code="arr[[3, 0, 7]]"
          Icon={ListOrdered}
          accent="orange"
        />

        {/* 流程軸標題 + 圖例 */}
        <text
          x={20}
          y={PIPE_Y - 14}
          fontSize={11.5}
          fontWeight={700}
          fill="var(--text-strong)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          接力管線：Pandas 收尾交棒給 NumPy
        </text>
        <LegendSwatch x={620} y={PIPE_Y - 22} color="var(--blue-500)" label="Pandas 段" />
        <LegendSwatch x={730} y={PIPE_Y - 22} color="var(--orange-500)" label="NumPy 段" />

        {/* 流程軸 */}
        {pipelineSteps.map((step, i) => (
          <g key={step.label}>
            <PipelineStep {...step} x={PIPE_XS[i]} y={PIPE_Y} w={PIPE_W} h={PIPE_H} />
            {i < pipelineSteps.length - 1 ? (
              <foreignObject x={PIPE_XS[i] + PIPE_W + 2} y={PIPE_Y + PIPE_H / 2 - 7} width={14} height={14}>
                <ArrowRight size={14} color="var(--neutral-400)" />
              </foreignObject>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}
