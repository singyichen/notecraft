/**
 * MLPT 內容地圖（純靜態手寫 SVG）。
 * 核心洞察：這本書是一棵「複雜度往上長」的樹 —— Scikit-Learn 是地基、PyTorch
 * 深度學習是主幹，GNN 與 Transformer 是主幹頂端才分岔出的兩個尖端應用；
 * Gradient Boosting 刻意畫成不在主幹上、從地基旁側岔出的獨立分支——傳統 ML
 * 的延伸強化，跟深度學習是兩條並行的路，不是深度學習的鋪墊。
 */

import { Layers, GitBranch, Network, Share2, Sparkles, type LucideIcon } from 'lucide-react'

interface ChipProps {
  x: number
  y: number
  w: number
  label: string
}

function Chip({ x, y, w, label }: ChipProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={20} rx={10} fill="rgba(255,255,255,.18)" />
      <text
        x={x + w / 2}
        y={y + 14}
        fontSize={10}
        fill="#ffffff"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
    </g>
  )
}

interface TrunkNodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub: string
  Icon: LucideIcon
}

function TrunkNode({ x, y, w, h, title, sub, Icon }: TrunkNodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="var(--blue-600)" />
      <foreignObject x={x + 14} y={y + 12} width={16} height={16}>
        <Icon size={16} color="#ffffff" />
      </foreignObject>
      <text
        x={x + 14}
        y={y + 46}
        fontSize={15}
        fontWeight={700}
        fill="#ffffff"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 64}
        fontSize={11}
        fill="rgba(255,255,255,.85)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {sub}
      </text>
    </g>
  )
}

interface BranchNodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub?: string
  fill: string
  textColor: string
  Icon: LucideIcon
}

function BranchNode({ x, y, w, h, title, sub, fill, textColor, Icon }: BranchNodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} />
      <foreignObject x={x + 12} y={y + 10} width={14} height={14}>
        <Icon size={14} color={textColor} />
      </foreignObject>
      <text
        x={x + 12}
        y={y + h / 2 + (sub ? -2 : 4)}
        fontSize={13}
        fontWeight={600}
        fill={textColor}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + 12}
          y={y + h - 12}
          fontSize={10}
          fill={textColor}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {sub}
        </text>
      )}
    </g>
  )
}

export default function MlptContentMap() {
  // Scikit-Learn (地基) — 主幹底部，center x = 300
  const skl = { x: 190, y: 330, w: 220, h: 110 }
  const sklCx = skl.x + skl.w / 2

  // PyTorch (主幹) — 對齊 Scikit-Learn 中心
  const torch = { x: 200, y: 170, w: 200, h: 90 }
  const torchCx = torch.x + torch.w / 2

  // GNN / Transformer — 主幹頂端分岔，對稱於 PyTorch 中心
  const gnn = { x: 110, y: 30, w: 170, h: 80 }
  const gnnCx = gnn.x + gnn.w / 2
  const transformer = { x: 390, y: 30, w: 170, h: 80 }
  const transformerCx = transformer.x + transformer.w / 2

  // Gradient Boosting — 地基旁側的獨立分支
  const gb = { x: 490, y: 350, w: 170, h: 80 }

  return (
    <div className="not-prose w-full max-w-2xl mx-auto">
      <svg
        viewBox="0 0 720 480"
        width="100%"
        role="img"
        aria-label="機器學習與 PyTorch／Scikit-Learn 內容地圖：Scikit-Learn 是地基，PyTorch 深度學習是主幹，GNN 與 Transformer 是主幹頂端分岔出的尖端應用；Gradient Boosting 是從地基旁側岔出、跟深度學習並行的獨立分支，不是深度學習的鋪墊。"
      >
        <defs>
          <marker id="mcm-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* 主幹：Scikit-Learn -> PyTorch */}
        <line
          x1={sklCx}
          y1={skl.y}
          x2={torchCx}
          y2={torch.y + torch.h}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mcm-arrow)"
        />

        {/* 分岔：PyTorch -> GNN / Transformer */}
        <line
          x1={torchCx}
          y1={torch.y}
          x2={gnnCx}
          y2={gnn.y + gnn.h}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mcm-arrow)"
        />
        <line
          x1={torchCx}
          y1={torch.y}
          x2={transformerCx}
          y2={transformer.y + transformer.h}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#mcm-arrow)"
        />

        {/* 旁支虛線：Gradient Boosting -> Scikit-Learn */}
        <line
          x1={gb.x}
          y1={gb.y + gb.h / 2}
          x2={skl.x + skl.w}
          y2={skl.y + 30}
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        <BranchNode
          x={gnn.x}
          y={gnn.y}
          w={gnn.w}
          h={gnn.h}
          title="GNN"
          fill="var(--blue-100)"
          textColor="var(--blue-700)"
          Icon={Share2}
        />
        <BranchNode
          x={transformer.x}
          y={transformer.y}
          w={transformer.w}
          h={transformer.h}
          title="Transformer"
          fill="var(--blue-100)"
          textColor="var(--blue-700)"
          Icon={Sparkles}
        />

        <TrunkNode
          x={torch.x}
          y={torch.y}
          w={torch.w}
          h={torch.h}
          title="PyTorch"
          sub="多層神經網路"
          Icon={Network}
        />

        <BranchNode
          x={gb.x}
          y={gb.y}
          w={gb.w}
          h={gb.h}
          title="Gradient Boosting"
          fill="var(--neutral-100)"
          textColor="var(--neutral-600)"
          Icon={GitBranch}
        />
        <text
          x={gb.x}
          y={gb.y + gb.h + 16}
          fontSize={10}
          fill="var(--text-muted)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          補充分支
        </text>

        <TrunkNode
          x={skl.x}
          y={skl.y}
          w={skl.w}
          h={skl.h}
          title="Scikit-Learn"
          sub="傳統機器學習地基"
          Icon={Layers}
        />
        <Chip x={skl.x + 14} y={skl.y + 74} w={56} label="分類" />
        <Chip x={skl.x + 76} y={skl.y + 74} w={56} label="迴歸" />
        <Chip x={skl.x + 138} y={skl.y + 74} w={68} label="模型評估" />
      </svg>
    </div>
  )
}
