import type { JSX } from 'react';
import { Info } from 'lucide-react';

/**
 * IC Design Eco-System —— 三段式分工鏈快照。
 * 純靜態手寫 SVG：Design (Fabless) -> Fabrication (Foundries) -> Packaging，
 * 並用一顆獨立虛線標籤標出 Intel（傳統 IDM，非典型 fabless），避免與上方
 * 六家 fabless 公司混為一談。內容本質靜態，不加互動 / 動畫。
 */

interface ChipGridProps {
  companies: readonly string[];
  /** 每一列排幾個 chip */
  columns: number;
  /** 網格左上角（每個 chip 的左上角座標系原點） */
  originX: number;
  originY: number;
  chipWidth: number;
  chipHeight: number;
  gapX: number;
  gapY: number;
}

function ChipGrid({
  companies,
  columns,
  originX,
  originY,
  chipWidth,
  chipHeight,
  gapX,
  gapY,
}: ChipGridProps): JSX.Element {
  return (
    <>
      {companies.map((name, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = originX + col * (chipWidth + gapX);
        const y = originY + row * (chipHeight + gapY);
        return (
          <g key={name}>
            <rect
              x={x}
              y={y}
              width={chipWidth}
              height={chipHeight}
              rx={4}
              fill="var(--surface-sunken)"
              stroke="var(--border-default)"
              strokeWidth={1}
            />
            <text
              x={x + chipWidth / 2}
              y={y + chipHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-sans)"
              fontSize={11}
              fontWeight={400}
              fill="var(--text-body)"
            >
              {name}
            </text>
          </g>
        );
      })}
    </>
  );
}

const DESIGN_COMPANIES = ['MediaTek', 'Realtek', 'Qualcomm', 'AMD', 'Apple', 'NVIDIA'] as const;

export default function EcWeek1IcEcosystem(): JSX.Element {
  // 三個階段標題方塊：同色系三層次，由深到淺
  const stageBoxWidth = 160;
  const stageBoxHeight = 44;
  const stageBoxY = 20;
  const stages = [
    { x: 20, fill: 'var(--blue-700)', textFill: 'var(--text-on-brand)' },
    { x: 240, fill: 'var(--blue-500)', textFill: 'var(--text-on-brand)' },
    { x: 460, fill: 'var(--blue-300)', textFill: 'var(--text-strong)' },
  ] as const;
  const centerY = stageBoxY + stageBoxHeight / 2;

  return (
    <div className="not-prose">
      <svg
        viewBox="0 0 640 210"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="IC 產業分工鏈：Design (Fabless) 經 Fabrication (Foundries) 到 Packaging，Intel 為傳統 IDM 例外"
      >
        <defs>
          <marker id="ec-arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* 階段標題方塊 */}
        <rect
          x={stages[0].x}
          y={stageBoxY}
          width={stageBoxWidth}
          height={stageBoxHeight}
          rx={8}
          fill={stages[0].fill}
        />
        <text
          x={stages[0].x + stageBoxWidth / 2}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={13}
          fontWeight={600}
          fill={stages[0].textFill}
        >
          Design (Fabless)
        </text>

        <rect
          x={stages[1].x}
          y={stageBoxY}
          width={stageBoxWidth}
          height={stageBoxHeight}
          rx={8}
          fill={stages[1].fill}
        />
        <text
          x={stages[1].x + stageBoxWidth / 2}
          y={centerY - 7}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={13}
          fontWeight={600}
          fill={stages[1].textFill}
        >
          Fabrication
        </text>
        <text
          x={stages[1].x + stageBoxWidth / 2}
          y={centerY + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={13}
          fontWeight={600}
          fill={stages[1].textFill}
        >
          (Foundries)
        </text>

        <rect
          x={stages[2].x}
          y={stageBoxY}
          width={stageBoxWidth}
          height={stageBoxHeight}
          rx={8}
          fill={stages[2].fill}
        />
        <text
          x={stages[2].x + stageBoxWidth / 2}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={13}
          fontWeight={600}
          fill={stages[2].textFill}
        >
          Packaging
        </text>

        {/* 兩個水平箭頭 */}
        <line
          x1={stages[0].x + stageBoxWidth + 2}
          y1={centerY}
          x2={stages[1].x - 4}
          y2={centerY}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#ec-arrowhead)"
        />
        <line
          x1={stages[1].x + stageBoxWidth + 2}
          y1={centerY}
          x2={stages[2].x - 4}
          y2={centerY}
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#ec-arrowhead)"
        />

        {/* Design (Fabless) 六家公司：2 欄 x 3 列 */}
        <ChipGrid
          companies={DESIGN_COMPANIES}
          columns={2}
          originX={26}
          originY={80}
          chipWidth={70}
          chipHeight={22}
          gapX={8}
          gapY={8}
        />

        {/* Fabrication (Foundries)：TSMC 單一 chip，頂端與其他兩欄對齊 */}
        <ChipGrid
          companies={['TSMC']}
          columns={1}
          originX={275}
          originY={80}
          chipWidth={90}
          chipHeight={22}
          gapX={0}
          gapY={0}
        />

        {/* Packaging：ASE 單一 chip，頂端與其他兩欄對齊 */}
        <ChipGrid
          companies={['ASE']}
          columns={1}
          originX={495}
          originY={80}
          chipWidth={90}
          chipHeight={22}
          gapX={0}
          gapY={0}
        />

        {/* 細虛線分隔線：隔開 fabless chip 群組與 Intel 註記 */}
        <line
          x1={26}
          y1={170}
          x2={174}
          y2={170}
          stroke="var(--border-default)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Intel 註記：虛線邊框標籤 + 說明，風格明顯區別於上方實線 chip，避免被誤認成第 7 家 fabless */}
        <rect
          x={26}
          y={178}
          width={64}
          height={20}
          rx={4}
          fill="var(--info-50)"
          stroke="var(--info-500)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <Info x={34} y={182} width={12} height={12} color="var(--info-500)" />
        <text
          x={52}
          y={188}
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={11}
          fontWeight={600}
          fill="var(--info-500)"
        >
          Intel
        </text>
        <text
          x={100}
          y={188}
          dominantBaseline="middle"
          fontFamily="var(--font-sans)"
          fontSize={11}
          fontWeight={400}
          fill="var(--text-body)"
        >
          傳統 IDM：同時擁有設計與製造，非典型 fabless
        </text>
      </svg>
    </div>
  );
}
