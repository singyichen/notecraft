/**
 * 核心洞察：選機器學習方法只需依序回答兩個判斷題——「有沒有標籤？」
 * 「標籤是類別還是數值（或：想分組還是想精簡）？」——分類／迴歸／聚類／
 * 降維就自動浮現。半監督學習不是第五種獨立類別，而是「標籤太少」時
 * 監督式與非監督式互相借用的折衷地帶，因此畫在兩支之間、用虛線連向兩邊，
 * 不掛在任何一支底下。
 */

import {
  CircleHelp,
  Tag,
  Shapes,
  GitMerge,
  Tags,
  TrendingUp,
  Users,
  Shrink,
  type LucideIcon,
} from 'lucide-react'

interface DecisionNodeProps {
  x: number
  y: number
  w: number
  h: number
  lines: string[]
}

function DecisionNode({ x, y, w, h, lines }: DecisionNodeProps) {
  const cx = x + w / 2
  const iconSize = 16
  const textStartY = lines.length === 1 ? y + h / 2 + 5 : y + h / 2 - 4
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="var(--neutral-100)" />
      <foreignObject x={cx - iconSize / 2} y={y + 8} width={iconSize} height={iconSize}>
        <CircleHelp size={iconSize} color="var(--neutral-700)" />
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

interface BranchNodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  fill: string
  Icon: LucideIcon
}

function BranchNode({ x, y, w, h, title, fill, Icon }: BranchNodeProps) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} />
      <foreignObject x={cx - 9} y={y + 10} width={18} height={18}>
        <Icon size={18} color="#ffffff" />
      </foreignObject>
      <text
        x={cx}
        y={y + h / 2 + 14}
        fontSize={14}
        fontWeight={700}
        fill="#ffffff"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
    </g>
  )
}

interface SemiSupervisedNodeProps {
  x: number
  y: number
  w: number
  h: number
}

function SemiSupervisedNode({ x, y, w, h }: SemiSupervisedNodeProps) {
  const cx = x + w / 2
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="var(--neutral-50)"
        stroke="var(--neutral-400)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <foreignObject x={cx - 8} y={y + 8} width={16} height={16}>
        <GitMerge size={16} color="var(--text-strong)" />
      </foreignObject>
      <text
        x={cx}
        y={y + h / 2 + 12}
        fontSize={12}
        fontWeight={600}
        fill="var(--text-strong)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        半監督學習
      </text>
    </g>
  )
}

interface LeafNodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  example: string
  bg: string
  color: string
  Icon: LucideIcon
}

function LeafNode({ x, y, w, h, title, example, bg, color, Icon }: LeafNodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={bg} />
      <foreignObject x={x + 12} y={y + 10} width={16} height={16}>
        <Icon size={16} color={color} />
      </foreignObject>
      <text
        x={x + 34}
        y={y + 22}
        fontSize={13.5}
        fontWeight={700}
        fill={color}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
      <text
        x={x + 12}
        y={y + h - 12}
        fontSize={10.5}
        fill="var(--text-muted)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {example}
      </text>
    </g>
  )
}

interface EdgeLabelProps {
  x: number
  y: number
  text: string
}

function EdgeLabel({ x, y, text }: EdgeLabelProps) {
  const w = text.length * 8 + 8
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={15} fill="var(--surface-page)" opacity={0.9} />
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

export default function MlWeek1Concept() {
  // 第 1 層：根判斷節點
  const root = { x: 290, y: 8, w: 180, h: 48 }
  const rootCx = root.x + root.w / 2

  // 第 2 層：兩大分支
  const supervised = { x: 60, y: 96, w: 210, h: 56 }
  const unsupervised = { x: 490, y: 96, w: 210, h: 56 }
  const supervisedCx = supervised.x + supervised.w / 2
  const unsupervisedCx = unsupervised.x + unsupervised.w / 2

  // 半監督節點：浮在兩分支之間、略低於兩者
  const semi = { x: 335, y: 172, w: 90, h: 44 }
  const semiCx = semi.x + semi.w / 2

  // 第 3 層：兩個第二層判斷節點
  const supervisedQ = { x: 55, y: 248, w: 220, h: 56 }
  const unsupervisedQ = { x: 485, y: 248, w: 220, h: 56 }
  const supervisedQCx = supervisedQ.x + supervisedQ.w / 2
  const unsupervisedQCx = unsupervisedQ.x + unsupervisedQ.w / 2

  // 第 4 層：四個葉節點
  const leafW = 165
  const leafH = 70
  const leafY = 400
  const classification = { x: 20, y: leafY, w: leafW, h: leafH }
  const regression = { x: 200, y: leafY, w: leafW, h: leafH }
  const clustering = { x: 400, y: leafY, w: leafW, h: leafH }
  const reduction = { x: 580, y: leafY, w: leafW, h: leafH }

  const classificationCx = classification.x + classification.w / 2
  const regressionCx = regression.x + regression.w / 2
  const clusteringCx = clustering.x + clustering.w / 2
  const reductionCx = reduction.x + reduction.w / 2

  return (
    <div className="not-prose w-full max-w-3xl mx-auto">
      <svg
        viewBox="0 0 760 520"
        width="100%"
        role="img"
        aria-label="機器學習方法選擇的決策樹：先問有沒有標籤，分出監督式學習與非監督式學習；標籤太少時介於兩者之間的半監督學習以虛線連向兩邊；監督式學習再依標籤是類別或數值分出分類與迴歸；非監督式學習再依想分組或想精簡分出聚類與降維。"
      >
        <defs>
          <marker id="mw1-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* 根節點 -> 監督式 */}
        <line
          x1={rootCx}
          y1={root.y + root.h}
          x2={supervisedCx}
          y2={supervised.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel x={(rootCx + supervisedCx) / 2 - 18} y={(root.y + root.h + supervised.y) / 2 + 4} text="有標籤" />

        {/* 根節點 -> 非監督式 */}
        <line
          x1={rootCx}
          y1={root.y + root.h}
          x2={unsupervisedCx}
          y2={unsupervised.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel x={(rootCx + unsupervisedCx) / 2 + 18} y={(root.y + root.h + unsupervised.y) / 2 + 4} text="無標籤" />

        {/* 半監督：虛線分別連向監督式與非監督式分支節點底部 */}
        <line
          x1={supervisedCx}
          y1={supervised.y + supervised.h}
          x2={semi.x}
          y2={semi.y + semi.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <line
          x1={unsupervisedCx}
          y1={unsupervised.y + unsupervised.h}
          x2={semi.x + semi.w}
          y2={semi.y + semi.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text
          x={semiCx}
          y={semi.y + semi.h + 16}
          fontSize={10}
          fill="var(--text-muted)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          少量標籤＋大量無標籤資料
        </text>

        {/* 監督式 -> 第二層判斷 */}
        <line
          x1={supervisedCx}
          y1={supervised.y + supervised.h}
          x2={supervisedQCx}
          y2={supervisedQ.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
        />

        {/* 非監督式 -> 第二層判斷 */}
        <line
          x1={unsupervisedCx}
          y1={unsupervised.y + unsupervised.h}
          x2={unsupervisedQCx}
          y2={unsupervisedQ.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
        />

        {/* 監督式判斷 -> 分類 / 迴歸 */}
        <line
          x1={supervisedQCx}
          y1={supervisedQ.y + supervisedQ.h}
          x2={classificationCx}
          y2={classification.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel
          x={(supervisedQCx + classificationCx) / 2 - 16}
          y={(supervisedQ.y + supervisedQ.h + classification.y) / 2 + 4}
          text="類別"
        />
        <line
          x1={supervisedQCx}
          y1={supervisedQ.y + supervisedQ.h}
          x2={regressionCx}
          y2={regression.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel
          x={(supervisedQCx + regressionCx) / 2 + 16}
          y={(supervisedQ.y + supervisedQ.h + regression.y) / 2 + 4}
          text="數值"
        />

        {/* 非監督式判斷 -> 聚類 / 降維 */}
        <line
          x1={unsupervisedQCx}
          y1={unsupervisedQ.y + unsupervisedQ.h}
          x2={clusteringCx}
          y2={clustering.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel
          x={(unsupervisedQCx + clusteringCx) / 2 - 16}
          y={(unsupervisedQ.y + unsupervisedQ.h + clustering.y) / 2 + 4}
          text="分組"
        />
        <line
          x1={unsupervisedQCx}
          y1={unsupervisedQ.y + unsupervisedQ.h}
          x2={reductionCx}
          y2={reduction.y}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mw1-arrow)"
        />
        <EdgeLabel
          x={(unsupervisedQCx + reductionCx) / 2 + 20}
          y={(unsupervisedQ.y + unsupervisedQ.h + reduction.y) / 2 + 4}
          text="壓縮／視覺化"
        />

        {/* 節點本體（畫在連線之上） */}
        <DecisionNode {...root} lines={['有沒有標籤？']} />
        <BranchNode {...supervised} title="監督式學習" fill="var(--blue-600)" Icon={Tag} />
        <BranchNode {...unsupervised} title="非監督式學習" fill="var(--orange-600)" Icon={Shapes} />
        <SemiSupervisedNode {...semi} />
        <DecisionNode {...supervisedQ} lines={['標籤是類別，', '還是數值？']} />
        <DecisionNode {...unsupervisedQ} lines={['想分組，', '還是想精簡？']} />

        <LeafNode
          {...classification}
          title="分類"
          example="例：貓狗圖片分類"
          bg="var(--blue-50)"
          color="var(--blue-700)"
          Icon={Tags}
        />
        <LeafNode
          {...regression}
          title="迴歸"
          example="例：房價迴歸"
          bg="var(--blue-50)"
          color="var(--blue-700)"
          Icon={TrendingUp}
        />
        <LeafNode
          {...clustering}
          title="聚類"
          example="例：顧客分眾聚類"
          bg="var(--orange-50)"
          color="var(--orange-700)"
          Icon={Users}
        />
        <LeafNode
          {...reduction}
          title="降維"
          example="例：資料視覺化降維"
          bg="var(--orange-50)"
          color="var(--orange-700)"
          Icon={Shrink}
        />
      </svg>
    </div>
  )
}
