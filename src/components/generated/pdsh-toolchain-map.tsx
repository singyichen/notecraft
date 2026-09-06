/**
 * PDSH 工具鏈地圖（純靜態手寫 SVG）。
 * 核心洞察：NumPy -> pandas -> Matplotlib -> Scikit-Learn 是一條「資料從裸陣列
 * 一路長成模型」的加工鏈，每一站都在前一站的產出上疊加一層抽象，離原始數字
 * 越遠、離可下決策的洞見越近。
 */

import { Grid3x3, Table2, LineChart, Brain, type LucideIcon } from 'lucide-react'

interface NodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  role: string
  fill: string
  stroke: string
  textColor: string
  Icon: LucideIcon
}

function Node({ x, y, w, h, title, role, fill, stroke, textColor, Icon }: NodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <foreignObject x={x + 14} y={y + 12} width={16} height={16}>
        <Icon size={16} color={textColor} />
      </foreignObject>
      <text
        x={x + 14}
        y={y + 46}
        fontSize={15}
        fontWeight={700}
        fill={textColor}
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 66}
        fontSize={12}
        fill="var(--text-muted)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {role}
      </text>
    </g>
  )
}

const NODE_W = 180
const NODE_H = 100
const NODE_Y = 80
const GAP = 33.33

export default function PdshToolchainMap() {
  const xs = [40, 40 + NODE_W + GAP, 40 + (NODE_W + GAP) * 2, 40 + (NODE_W + GAP) * 3]

  return (
    <div className="not-prose w-full max-w-3xl mx-auto">
      <svg
        viewBox="0 0 880 260"
        width="100%"
        role="img"
        aria-label="Python 資料科學工具鏈：NumPy 提供底層陣列運算，pandas 在其上做資料清理與轉換，Matplotlib 將整理好的資料視覺化，Scikit-Learn 最終做統計與機器學習建模，離原始數字越遠、離可下決策的洞見越近。"
      >
        <defs>
          <marker id="ptm-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {xs.slice(0, 3).map((x, i) => (
          <line
            key={i}
            x1={x + NODE_W}
            y1={NODE_Y + NODE_H / 2}
            x2={xs[i + 1]}
            y2={NODE_Y + NODE_H / 2}
            stroke="var(--neutral-400)"
            strokeWidth={1.75}
            markerEnd="url(#ptm-arrow)"
          />
        ))}

        <Node
          x={xs[0]}
          y={NODE_Y}
          w={NODE_W}
          h={NODE_H}
          title="NumPy"
          role="底層陣列運算"
          fill="var(--blue-50)"
          stroke="var(--blue-700)"
          textColor="var(--blue-700)"
          Icon={Grid3x3}
        />
        <Node
          x={xs[1]}
          y={NODE_Y}
          w={NODE_W}
          h={NODE_H}
          title="pandas"
          role="資料清理／轉換"
          fill="var(--blue-100)"
          stroke="var(--blue-700)"
          textColor="var(--blue-700)"
          Icon={Table2}
        />
        <Node
          x={xs[2]}
          y={NODE_Y}
          w={NODE_W}
          h={NODE_H}
          title="Matplotlib"
          role="視覺化"
          fill="var(--blue-200)"
          stroke="var(--blue-800)"
          textColor="var(--blue-800)"
          Icon={LineChart}
        />
        <Node
          x={xs[3]}
          y={NODE_Y}
          w={NODE_W}
          h={NODE_H}
          title="Scikit-Learn"
          role="統計／機器學習建模"
          fill="var(--orange-50)"
          stroke="var(--orange-600)"
          textColor="var(--orange-600)"
          Icon={Brain}
        />
      </svg>
    </div>
  )
}
