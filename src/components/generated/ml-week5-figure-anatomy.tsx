import React, { useState } from 'react';
import {
  Frame,
  LayoutGrid,
  Ruler,
  ScatterChart,
  ArrowUpDown,
  Tag,
  Palette,
  Pin,
  type LucideIcon,
} from 'lucide-react';

type PartId =
  | 'figure'
  | 'axes'
  | 'axis'
  | 'data'
  | 'errorbar'
  | 'legend'
  | 'colorbar'
  | 'annotation';

interface PartInfo {
  id: PartId;
  label: string;
  desc: string;
  method: string;
  icon: LucideIcon;
}

const PARTS: PartInfo[] = [
  {
    id: 'figure',
    label: 'Figure',
    desc: '整張畫布，一張圖只有一個',
    method: 'plt.figure() / plt.subplots()',
    icon: Frame,
  },
  {
    id: 'axes',
    label: 'Axes',
    desc: '一個有座標軸的作圖區，可以有很多個',
    method: 'fig.add_subplot() / ax',
    icon: LayoutGrid,
  },
  {
    id: 'axis',
    label: 'Axis（座標軸與刻度）',
    desc: '一個 Axes 底下的 x 軸與 y 軸',
    method: 'ax.set_xlim() / ax.set_xticks()',
    icon: Ruler,
  },
  {
    id: 'data',
    label: '折線與散點',
    desc: '資料本體',
    method: 'ax.plot() / ax.scatter()',
    icon: ScatterChart,
  },
  {
    id: 'errorbar',
    label: '誤差棒',
    desc: '每點的不確定範圍，通常調得比資料點更淡',
    method: 'ax.errorbar()',
    icon: ArrowUpDown,
  },
  {
    id: 'legend',
    label: '圖例',
    desc: '自動蒐集帶 label 的元素',
    method: 'ax.legend(loc=, frameon=, ncol=)',
    icon: Tag,
  },
  {
    id: 'colorbar',
    label: '色條',
    desc: '顏色在編碼數值時必須附的刻度尺',
    method: 'fig.colorbar()',
    icon: Palette,
  },
  {
    id: 'annotation',
    label: '標註',
    desc: '把「一堆線」變成「一個結論」',
    method: 'ax.annotate() / ax.text()',
    icon: Pin,
  },
];

// 折線 + 散點的資料座標（viewBox 座標系內）
const DATA_POINTS: Array<{ x: number; y: number }> = [
  { x: 120, y: 322 },
  { x: 210, y: 268 },
  { x: 300, y: 222 },
  { x: 390, y: 172 },
  { x: 480, y: 132 },
];

const CONTENT_IDS: readonly PartId[] = ['data', 'errorbar', 'legend', 'colorbar', 'annotation'];

export default function MlWeek5FigureAnatomy(): React.JSX.Element {
  const [selected, setSelected] = useState<PartId | null>(null);

  const toggle = (id: PartId) => {
    setSelected((current) => (current === id ? null : id));
  };

  const isActive = (id: PartId): boolean => selected === id;

  const contentOpacity = (id: PartId): number =>
    selected === null || isActive(id) ? 1 : 0.25;

  const structureStroke = (id: PartId): string =>
    isActive(id) ? 'var(--blue-600)' : 'var(--neutral-300)';

  const structureWidth = (id: PartId): number => (isActive(id) ? 2.5 : 1.5);

  const active = selected ? PARTS.find((p) => p.id === selected) : undefined;

  const polylinePoints = DATA_POINTS.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="not-prose w-full flex flex-col gap-4">
      <p className="text-sm font-semibold tracking-wide text-[--blue-700]">
        Figure ⊃ Axes ⊃ Axis，三個名字很像但層級不同。
      </p>

      <div className="w-full rounded-[--radius-lg] bg-[--surface-sunken] p-3">
        <svg
          viewBox="0 0 640 420"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Matplotlib 圖的組成層級解剖圖：Figure 內含 Axes，Axes 內含資料、誤差棒、圖例、色條與標註"
          className="block w-full h-auto"
        >
          <defs>
            <linearGradient id="nc-cbar-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--blue-700)" />
              <stop offset="100%" stopColor="var(--orange-500)" />
            </linearGradient>
          </defs>

          {/* Figure：整張畫布 */}
          <rect
            x={14}
            y={48}
            width={612}
            height={344}
            rx={10}
            fill="none"
            stroke={structureStroke('figure')}
            strokeWidth={structureWidth('figure')}
            strokeDasharray="6 5"
            className="transition-all duration-300 ease-out"
          />
          <text
            x={28}
            y={40}
            fontSize={14}
            fontWeight={700}
            fill={isActive('figure') ? 'var(--blue-700)' : 'var(--text-muted)'}
            className="transition-all duration-300 ease-out"
          >
            Figure
          </text>

          {/* Axes：一整個作圖區 */}
          <rect
            x={78}
            y={88}
            width={430}
            height={272}
            rx={4}
            fill={isActive('axes') ? 'var(--surface-brand-soft)' : 'var(--surface-card)'}
            stroke={structureStroke('axes')}
            strokeWidth={structureWidth('axes')}
            className="transition-all duration-300 ease-out"
          />
          <text
            x={86}
            y={104}
            fontSize={12}
            fontWeight={700}
            fill={isActive('axes') ? 'var(--blue-700)' : 'var(--text-muted)'}
            className="transition-all duration-300 ease-out"
          >
            Axes
          </text>

          {/* Axis：座標軸本體與刻度 */}
          <g
            stroke={structureStroke('axis')}
            strokeWidth={structureWidth('axis')}
            className="transition-all duration-300 ease-out"
          >
            <line x1={78} y1={360} x2={508} y2={360} />
            <line x1={78} y1={88} x2={78} y2={360} />
            {[0, 1, 2, 3, 4].map((i) => {
              const tx = 78 + (430 / 4) * i;
              return <line key={`xt-${i}`} x1={tx} y1={360} x2={tx} y2={366} />;
            })}
            {[0, 1, 2, 3, 4].map((i) => {
              const ty = 88 + (272 / 4) * i;
              return <line key={`yt-${i}`} x1={72} y1={ty} x2={78} y2={ty} />;
            })}
          </g>
          <text
            x={512}
            y={364}
            fontSize={12}
            fill={isActive('axis') ? 'var(--blue-700)' : 'var(--text-muted)'}
            className="transition-all duration-300 ease-out"
          >
            x
          </text>
          <text
            x={70}
            y={84}
            textAnchor="end"
            fontSize={12}
            fill={isActive('axis') ? 'var(--blue-700)' : 'var(--text-muted)'}
            className="transition-all duration-300 ease-out"
          >
            y
          </text>

          {/* 誤差棒：畫在資料點下方，通常較淡 */}
          <g
            stroke={isActive('errorbar') ? 'var(--orange-600)' : 'var(--neutral-400)'}
            strokeWidth={isActive('errorbar') ? 2 : 1.4}
            opacity={contentOpacity('errorbar')}
            className="transition-all duration-300 ease-out"
          >
            {DATA_POINTS.map((p, i) => (
              <g key={`eb-${i}`}>
                <line x1={p.x} y1={p.y - 16} x2={p.x} y2={p.y + 16} />
                <line x1={p.x - 5} y1={p.y - 16} x2={p.x + 5} y2={p.y - 16} />
                <line x1={p.x - 5} y1={p.y + 16} x2={p.x + 5} y2={p.y + 16} />
              </g>
            ))}
          </g>

          {/* 折線與散點：資料本體 */}
          <g
            opacity={contentOpacity('data')}
            className="transition-all duration-300 ease-out"
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={isActive('data') ? 'var(--orange-600)' : 'var(--blue-600)'}
              strokeWidth={isActive('data') ? 3 : 2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
            {DATA_POINTS.map((p, i) => (
              <circle
                key={`pt-${i}`}
                cx={p.x}
                cy={p.y}
                r={isActive('data') ? 6 : 4.5}
                fill={isActive('data') ? 'var(--orange-600)' : 'var(--blue-600)'}
                className="transition-all duration-300 ease-out"
              />
            ))}
          </g>

          {/* 圖例 */}
          <g
            opacity={contentOpacity('legend')}
            className="transition-all duration-300 ease-out"
          >
            <rect
              x={402}
              y={300}
              width={94}
              height={34}
              rx={5}
              fill="var(--surface-card)"
              stroke={isActive('legend') ? 'var(--orange-600)' : 'var(--border-default)'}
              strokeWidth={isActive('legend') ? 2 : 1}
              className="transition-all duration-300 ease-out"
            />
            <line
              x1={412}
              y1={317}
              x2={430}
              y2={317}
              stroke={isActive('legend') ? 'var(--orange-600)' : 'var(--blue-600)'}
              strokeWidth={2}
            />
            <circle
              cx={421}
              cy={317}
              r={3}
              fill={isActive('legend') ? 'var(--orange-600)' : 'var(--blue-600)'}
            />
            <text
              x={438}
              y={321}
              fontSize={12}
              fill="var(--text-body)"
            >
              資料
            </text>
          </g>

          {/* 色條 */}
          <g
            opacity={contentOpacity('colorbar')}
            className="transition-all duration-300 ease-out"
          >
            <rect
              x={534}
              y={88}
              width={20}
              height={272}
              fill="url(#nc-cbar-gradient)"
              stroke={isActive('colorbar') ? 'var(--orange-600)' : 'var(--border-default)'}
              strokeWidth={isActive('colorbar') ? 2 : 1}
              className="transition-all duration-300 ease-out"
            />
            {[0, 1, 2].map((i) => (
              <line
                key={`cb-tick-${i}`}
                x1={554}
                y1={88 + (272 / 2) * i}
                x2={560}
                y2={88 + (272 / 2) * i}
                stroke="var(--text-muted)"
                strokeWidth={1}
              />
            ))}
          </g>

          {/* 標註：把資料指向的結論標出來 */}
          <g
            opacity={contentOpacity('annotation')}
            className="transition-all duration-300 ease-out"
          >
            <line
              x1={300}
              y1={122}
              x2={476}
              y2={134}
              stroke={isActive('annotation') ? 'var(--orange-600)' : 'var(--neutral-400)'}
              strokeWidth={isActive('annotation') ? 2 : 1.25}
              strokeDasharray="3 3"
            />
            <circle
              cx={480}
              cy={132}
              r={isActive('annotation') ? 7 : 5}
              fill="none"
              stroke={isActive('annotation') ? 'var(--orange-600)' : 'var(--neutral-400)'}
              strokeWidth={1.5}
            />
            <rect
              x={246}
              y={94}
              width={72}
              height={28}
              rx={5}
              fill={isActive('annotation') ? 'var(--surface-accent-soft)' : 'var(--surface-card)'}
              stroke={isActive('annotation') ? 'var(--orange-600)' : 'var(--border-default)'}
              strokeWidth={isActive('annotation') ? 2 : 1}
              className="transition-all duration-300 ease-out"
            />
            <text
              x={282}
              y={112}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill={isActive('annotation') ? 'var(--orange-600)' : 'var(--text-body)'}
            >
              峰值
            </text>
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        {PARTS.map((part) => {
          const Icon = part.icon;
          const on = selected === part.id;
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => toggle(part.id)}
              aria-pressed={on}
              className={
                'inline-flex items-center gap-1.5 rounded-[--radius-pill] border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out ' +
                (on
                  ? 'border-[--action-primary] bg-[--surface-accent-soft] text-[--orange-700]'
                  : 'border-[--border-default] bg-[--surface-card] text-[--text-body] hover:border-[--border-brand] hover:text-[--blue-700]')
              }
            >
              <Icon size={14} className={on ? 'text-[--orange-600]' : 'text-[--blue-600]'} />
              {part.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[52px] rounded-[--radius-md] border border-[--border-subtle] bg-[--surface-card] px-4 py-2.5">
        {active ? (
          <p className="text-sm text-[--text-body]">
            <span className="font-semibold text-[--blue-700]">{active.label}</span>
            <span className="mx-1.5 text-[--text-muted]">—</span>
            {active.desc}
            <span className="mx-1.5 text-[--text-muted]">—</span>
            <code className="rounded-[--radius-sm] bg-[--surface-sunken] px-1.5 py-0.5 font-mono text-xs text-[--blue-700]">
              {active.method}
            </code>
          </p>
        ) : (
          <p className="text-sm text-[--text-muted]">
            點選上方任一元件，看它落在 Figure、Axes、Axis 的哪一層。
          </p>
        )}
      </div>
    </div>
  );
}
