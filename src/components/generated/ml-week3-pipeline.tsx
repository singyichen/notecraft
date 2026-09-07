import { useId } from 'react'

/**
 * NumPy 與 Pandas 資料處理管線：六個步驟蛇形排列（第一列左到右、第二列右到左）。
 * 核心洞察：NumPy 與 Pandas 不是二選一，而是同一條管線上的前後段——
 * Pandas 負責讀檔、清理、合併、分組聚合，`.to_numpy()` 是交接的閘門，
 * 之後才交給 NumPy 陣列與模型。
 */

type Category = 'pandas' | 'numpy'

interface Step {
  order: number
  title: string
  code: string[]
  category: Category
}

const STEPS: Step[] = [
  { order: 1, title: '讀檔', code: ['pd.read_csv()'], category: 'pandas' },
  { order: 2, title: '清缺值', code: ['df.dropna()', 'df.fillna()'], category: 'pandas' },
  { order: 3, title: '合併', code: ['df.merge(other,', 'on="id")'], category: 'pandas' },
  {
    order: 4,
    title: '分組算特徵',
    code: ['df.groupby("city")', '.agg(...)'],
    category: 'pandas',
  },
  { order: 6, title: '交給模型', code: ['model.fit(X, y)'], category: 'numpy' },
]

const VBW = 640
const VBH = 400
const BOX_W = 180
const BOX_H = 140
const MARGIN = 30
const GAP = 20
const ROW_Y = [50, 240]
const ROW1_CY = ROW_Y[0] + BOX_H / 2
const ROW2_CY = ROW_Y[1] + BOX_H / 2

const PANDAS_BORDER = 'var(--blue-400)'
const PANDAS_BADGE = 'var(--blue-500)'
const PANDAS_TEXT = 'var(--blue-700)'
const NUMPY_BORDER = 'var(--orange-400)'
const NUMPY_BADGE = 'var(--orange-500)'
const NUMPY_TEXT = 'var(--orange-700)'
const ARROW_COLOR = 'var(--neutral-400)'

/** xIndex：第一列 0→2 由左至右；第二列 2→0，讓步驟 4/5/6 由右至左蛇形接續 */
function slotX(order: number): number {
  const idx = order - 1 // 0-based 陣列位置（order 1..6 對應 idx 0..5）
  const row = Math.floor(idx / 3)
  const withinRow = idx % 3
  const xIndex = row === 0 ? withinRow : 2 - withinRow
  return MARGIN + xIndex * (BOX_W + GAP)
}

function slotY(order: number): number {
  const row = Math.floor((order - 1) / 3)
  return ROW_Y[row]
}

function StepBox({ step }: { step: Step }) {
  const x = slotX(step.order)
  const y = slotY(step.order)
  const border = step.category === 'pandas' ? PANDAS_BORDER : NUMPY_BORDER
  const badge = step.category === 'pandas' ? PANDAS_BADGE : NUMPY_BADGE
  const tagText = step.category === 'pandas' ? PANDAS_TEXT : NUMPY_TEXT
  const tagLabel = step.category === 'pandas' ? 'Pandas' : 'NumPy'

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={14}
        fill="var(--surface-card)"
        stroke={border}
        strokeWidth={1.5}
      />
      <circle cx={x + 26} cy={y + 26} r={12} fill={badge} />
      <text
        x={x + 26}
        y={y + 30}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="var(--text-on-brand)"
      >
        {step.order}
      </text>
      <text x={x + 46} y={y + 30} fontSize={14} fontWeight={600} fill="var(--text-strong)">
        {step.title}
      </text>
      {step.code.map((line, i) => (
        <text
          key={i}
          x={x + 14}
          y={y + 56 + i * 16}
          fontFamily="var(--font-mono)"
          fontSize={12}
          fill="var(--text-body)"
        >
          {line}
        </text>
      ))}
      <text x={x + 14} y={y + 126} fontSize={11} fontWeight={600} fill={tagText}>
        {tagLabel}
      </text>
    </g>
  )
}

function GateBox({ clipId }: { clipId: string }) {
  const x = slotX(5)
  const y = slotY(5)
  const midX = x + BOX_W / 2

  return (
    <g>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={BOX_W} height={BOX_H} rx={14} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={BOX_W / 2} height={BOX_H} fill="var(--blue-100)" />
        <rect x={midX} y={y} width={BOX_W / 2} height={BOX_H} fill="var(--orange-100)" />
      </g>
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={14}
        fill="none"
        stroke="var(--neutral-400)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <line
        x1={midX}
        y1={y + 10}
        x2={midX}
        y2={y + BOX_H - 10}
        stroke="var(--neutral-500)"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <text x={x + 16} y={y + 22} fontSize={10} fontWeight={700} fill={PANDAS_TEXT}>
        Pandas
      </text>
      <text
        x={x + BOX_W - 16}
        y={y + 22}
        textAnchor="end"
        fontSize={10}
        fontWeight={700}
        fill={NUMPY_TEXT}
      >
        NumPy
      </text>
      <circle cx={midX} cy={y + 46} r={13} fill="var(--neutral-800)" />
      <text
        x={midX}
        y={y + 50}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="var(--text-on-brand)"
      >
        5
      </text>
      <text
        x={midX}
        y={y + 76}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="var(--text-strong)"
      >
        交接
      </text>
      <rect
        x={x + 20}
        y={y + 88}
        width={BOX_W - 40}
        height={22}
        rx={6}
        fill="var(--surface-card)"
        stroke="var(--neutral-400)"
        strokeWidth={1}
      />
      <text
        x={midX}
        y={y + 103}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={12}
        fill="var(--text-body)"
      >
        X = df.to_numpy()
      </text>
      <text
        x={midX}
        y={y + 128}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--neutral-600)"
      >
        交界（閘門）
      </text>
    </g>
  )
}

/** 兩點間水平／垂直箭頭；tipX/tipY 為箭頭實際指向的座標，line 端點會內縮讓出箭頭空間 */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  tipX,
  tipY,
  direction,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  tipX: number
  tipY: number
  direction: 'right' | 'left' | 'down'
}) {
  const points =
    direction === 'right'
      ? `${tipX - 7},${tipY - 5} ${tipX - 7},${tipY + 5} ${tipX},${tipY}`
      : direction === 'left'
        ? `${tipX + 7},${tipY - 5} ${tipX + 7},${tipY + 5} ${tipX},${tipY}`
        : `${tipX - 5},${tipY - 7} ${tipX + 5},${tipY - 7} ${tipX},${tipY}`

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW_COLOR} strokeWidth={1.5} />
      <polygon points={points} fill={ARROW_COLOR} />
    </g>
  )
}

export default function MlWeek3Pipeline() {
  const gateClipId = useId()

  const s1x = slotX(1)
  const s2x = slotX(2)
  const s3x = slotX(3)
  const s4x = slotX(4)
  const s5x = slotX(5)
  const s6x = slotX(6)

  return (
    <div className="not-prose mx-auto w-full max-w-2xl">
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Pandas 與 NumPy 資料處理管線：讀檔、清缺值、合併、分組算特徵、經 to_numpy 交接後，交給 NumPy 陣列與模型訓練"
      >
        <title>NumPy 與 Pandas 資料處理管線</title>

        {/* legend */}
        <rect x={30} y={14} width={12} height={12} rx={3} fill={PANDAS_BADGE} />
        <text x={48} y={24} fontSize={12} fontWeight={600} fill={PANDAS_TEXT}>
          Pandas
        </text>
        <rect x={280} y={14} width={12} height={12} rx={3} fill="var(--neutral-500)" />
        <text x={298} y={24} fontSize={12} fontWeight={600} fill="var(--neutral-600)">
          交接（閘門）
        </text>
        <rect x={560} y={14} width={12} height={12} rx={3} fill={NUMPY_BADGE} />
        <text x={578} y={24} fontSize={12} fontWeight={600} fill={NUMPY_TEXT}>
          NumPy
        </text>

        {/* 底色帶：第一列全屬 Pandas */}
        <rect x={20} y={42} width={600} height={156} rx={16} fill="var(--blue-50)" />
        {/* 底色帶：第二列以閘門中線為界，左半 NumPy、右半 Pandas */}
        <rect x={20} y={232} width={300} height={156} rx={16} fill="var(--orange-50)" />
        <rect x={320} y={232} width={300} height={156} rx={16} fill="var(--blue-50)" />

        {/* row 1 連接箭頭：讀檔 -> 清缺值 -> 合併 */}
        <Arrow
          x1={s1x + BOX_W}
          y1={ROW1_CY}
          x2={s2x - 7}
          y2={ROW1_CY}
          tipX={s2x}
          tipY={ROW1_CY}
          direction="right"
        />
        <Arrow
          x1={s2x + BOX_W}
          y1={ROW1_CY}
          x2={s3x - 7}
          y2={ROW1_CY}
          tipX={s3x}
          tipY={ROW1_CY}
          direction="right"
        />

        {/* 蛇形轉折：合併 -> 分組算特徵（垂直向下） */}
        <Arrow
          x1={s3x + BOX_W / 2}
          y1={ROW_Y[0] + BOX_H}
          x2={s4x + BOX_W / 2}
          y2={ROW_Y[1] - 7}
          tipX={s4x + BOX_W / 2}
          tipY={ROW_Y[1]}
          direction="down"
        />

        {/* row 2 連接箭頭（由右至左）：分組算特徵 -> 交接 -> 交給模型 */}
        <Arrow
          x1={s4x}
          y1={ROW2_CY}
          x2={s5x + BOX_W + 7}
          y2={ROW2_CY}
          tipX={s5x + BOX_W}
          tipY={ROW2_CY}
          direction="left"
        />
        <Arrow
          x1={s5x}
          y1={ROW2_CY}
          x2={s6x + BOX_W + 7}
          y2={ROW2_CY}
          tipX={s6x + BOX_W}
          tipY={ROW2_CY}
          direction="left"
        />

        {STEPS.filter((s) => s.order !== 5).map((step) => (
          <StepBox key={step.order} step={step} />
        ))}
        <GateBox clipId={gateClipId} />
      </svg>
    </div>
  )
}
