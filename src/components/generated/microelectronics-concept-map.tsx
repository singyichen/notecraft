/**
 * 微電子概念地圖（純靜態手寫 SVG）。
 * 核心洞察：元件複雜度每上一階，能扮演的電路角色就更抽象一層 —— 二極體只能
 * 「認方向」，電晶體開始能「放大／開關」，運算放大器是把大量電晶體行為封裝
 * 成一顆「可以直接設計電路」的高階積木。
 */

import type { ReactNode } from 'react'
import { ArrowRightToLine, ToggleLeft, CircuitBoard, type LucideIcon } from 'lucide-react'

interface InnerSquareProps {
  x: number
  y: number
  size: number
  fill: string
  stroke?: string
}

function InnerSquare({ x, y, size, fill, stroke }: InnerSquareProps) {
  return <rect x={x} y={y} width={size} height={size} rx={4} fill={fill} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
}

interface NodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  role: string
  fill: string
  stroke?: string
  textColor: string
  roleColor: string
  Icon: LucideIcon
  iconColor: string
  children?: ReactNode
}

function Node({ x, y, w, h, title, role, fill, stroke, textColor, roleColor, Icon, iconColor, children }: NodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.25 : 0} />
      <foreignObject x={x + 14} y={y + 14} width={16} height={16}>
        <Icon size={16} color={iconColor} />
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
        y={y + 64}
        fontSize={12}
        fill={roleColor}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {role}
      </text>
      {children}
    </g>
  )
}

const BASELINE = 260

const diode = { x: 30, w: 160, h: 120 }
const transistor = { x: 300, w: 200, h: 160 }
const opamp = { x: 610, w: 240, h: 200 }

export default function MicroelectronicsConceptMap() {
  const diodeY = BASELINE - diode.h
  const transistorY = BASELINE - transistor.h
  const opampY = BASELINE - opamp.h

  return (
    <div className="not-prose w-full max-w-3xl mx-auto">
      <svg
        viewBox="0 0 880 300"
        width="100%"
        role="img"
        aria-label="微電子元件複雜度地圖：二極體只能單向導通／整流，電晶體開始能放大／開關，運算放大器把大量電晶體行為封裝成可以直接設計電路的高階積木，元件複雜度每上一階，能扮演的電路角色就更抽象一層。"
      >
        <defs>
          <marker id="mecm-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        <line
          x1={diode.x + diode.w}
          y1={diodeY + diode.h / 2}
          x2={transistor.x}
          y2={transistorY + transistor.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={1.75}
          markerEnd="url(#mecm-arrow)"
        />
        <line
          x1={transistor.x + transistor.w}
          y1={transistorY + transistor.h / 2}
          x2={opamp.x}
          y2={opampY + opamp.h / 2}
          stroke="var(--neutral-400)"
          strokeWidth={1.75}
          markerEnd="url(#mecm-arrow)"
        />

        <Node
          x={diode.x}
          y={diodeY}
          w={diode.w}
          h={diode.h}
          title="二極體"
          role="單向導通／整流"
          fill="var(--blue-50)"
          stroke="var(--blue-600)"
          textColor="var(--blue-600)"
          roleColor="var(--text-muted)"
          Icon={ArrowRightToLine}
          iconColor="var(--blue-600)"
        >
          <InnerSquare x={diode.x + diode.w / 2 - 14} y={diodeY + 84} size={28} fill="var(--neutral-0)" stroke="var(--neutral-300)" />
        </Node>

        <Node
          x={transistor.x}
          y={transistorY}
          w={transistor.w}
          h={transistor.h}
          title="BJT／MOS 電晶體"
          role="放大／開關的核心元件"
          fill="var(--blue-100)"
          stroke="var(--blue-700)"
          textColor="var(--blue-700)"
          roleColor="var(--text-muted)"
          Icon={ToggleLeft}
          iconColor="var(--blue-700)"
        >
          <InnerSquare x={transistor.x + transistor.w / 2 - 26} y={transistorY + 88} size={22} fill="var(--neutral-0)" stroke="var(--neutral-300)" />
          <InnerSquare x={transistor.x + transistor.w / 2 + 4} y={transistorY + 88} size={22} fill="var(--neutral-0)" stroke="var(--neutral-300)" />
        </Node>

        <Node
          x={opamp.x}
          y={opampY}
          w={opamp.w}
          h={opamp.h}
          title="運算放大器"
          role="類比電路設計的高階基石"
          fill="var(--blue-700)"
          textColor="var(--text-on-brand)"
          roleColor="rgba(255,255,255,.85)"
          Icon={CircuitBoard}
          iconColor="#ffffff"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <InnerSquare
              key={i}
              x={opamp.x + opamp.w / 2 - 55 + i * 22}
              y={opampY + 96}
              size={16}
              fill="rgba(255,255,255,.15)"
            />
          ))}
        </Node>
      </svg>
    </div>
  )
}
