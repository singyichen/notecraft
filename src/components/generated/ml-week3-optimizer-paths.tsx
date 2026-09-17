import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Layers } from 'lucide-react';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'gd' | 'minibatch' | 'sgd' | 'overlay';

interface Point {
  x: number;
  y: number;
}

// ─── Fixed (deterministic) path coordinates ────────────────────────────────
// Shared start point; all three paths converge near the same minimum.
// Coordinates are hand-authored, not randomly generated.

const START: Point = { x: 140, y: 90 };
const MINIMUM: Point = { x: 320, y: 230 };

// Full-batch GD: 6 points, smooth, near-monotonic descent toward the minimum.
const PATH_GD: Point[] = [
  { x: 140, y: 90 },
  { x: 195, y: 130 },
  { x: 240, y: 165 },
  { x: 275, y: 192 },
  { x: 300, y: 210 },
  { x: 318, y: 226 },
];

// Mini-batch GD: 12 points, mild zigzag but a clear overall trend to the minimum.
const PATH_MINIBATCH: Point[] = [
  { x: 140, y: 90 },
  { x: 178, y: 102 },
  { x: 203, y: 136 },
  { x: 188, y: 152 },
  { x: 228, y: 158 },
  { x: 213, y: 178 },
  { x: 253, y: 182 },
  { x: 243, y: 200 },
  { x: 274, y: 204 },
  { x: 266, y: 219 },
  { x: 296, y: 221 },
  { x: 318, y: 228 },
];

// SGD: 22 points, pronounced noise, weaker per-step direction, still approaches minimum.
const PATH_SGD: Point[] = [
  { x: 140, y: 90 },
  { x: 205, y: 75 },
  { x: 160, y: 130 },
  { x: 230, y: 110 },
  { x: 175, y: 170 },
  { x: 255, y: 150 },
  { x: 190, y: 205 },
  { x: 270, y: 180 },
  { x: 210, y: 230 },
  { x: 288, y: 205 },
  { x: 230, y: 255 },
  { x: 303, y: 224 },
  { x: 245, y: 268 },
  { x: 312, y: 238 },
  { x: 255, y: 288 },
  { x: 318, y: 248 },
  { x: 270, y: 298 },
  { x: 324, y: 258 },
  { x: 285, y: 298 },
  { x: 308, y: 268 },
  { x: 300, y: 244 },
  { x: 318, y: 230 },
];

const PATHS: Record<'gd' | 'minibatch' | 'sgd', Point[]> = {
  gd: PATH_GD,
  minibatch: PATH_MINIBATCH,
  sgd: PATH_SGD,
};

const COLORS: Record<'gd' | 'minibatch' | 'sgd', string> = {
  gd: 'var(--blue-500)',
  minibatch: 'var(--orange-500)',
  sgd: 'var(--warning-500)',
};

const TABS: { id: ViewMode; label: string }[] = [
  { id: 'gd', label: 'Full-batch GD' },
  { id: 'minibatch', label: 'Mini-batch GD' },
  { id: 'sgd', label: 'SGD' },
  { id: 'overlay', label: '全部疊加' },
];

const SUMMARY: Record<ViewMode, string> = {
  gd: '每步都算全部資料，方向準但慢。',
  minibatch: '每步只看一小批，快且相對穩定。',
  sgd: '每步只看一筆，快但路線曲折。',
  overlay: '同一個旋鈕轉到三個位置：資料用得越少，路徑越抖、但更新越頻繁。',
};

// 同心橢圓等高線（由外而內半徑遞減）
const CONTOURS: { rx: number; ry: number; opacity: number }[] = [
  { rx: 230, ry: 165, opacity: 0.25 },
  { rx: 185, ry: 133, opacity: 0.32 },
  { rx: 140, ry: 100, opacity: 0.4 },
  { rx: 95, ry: 68, opacity: 0.5 },
  { rx: 50, ry: 36, opacity: 0.6 },
];

const STAGGER_STEP = 0.2; // 200ms，落在規劃書要求的 150–250ms 區間

// ─── Path group (single optimizer's drawn path) ────────────────────────────

interface PathGroupProps {
  points: Point[];
  color: string;
  stagger: boolean;
  strokeWidth: number;
  finalOpacity: number;
}

function PathGroup({ points, color, stagger, strokeWidth, finalOpacity }: PathGroupProps) {
  const segments = points.slice(0, -1).map((p, i) => [p, points[i + 1]] as const);

  return (
    <g>
      {segments.map(([p1, p2], i) => (
        <motion.line
          key={`seg-${i}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeOpacity={finalOpacity}
          initial={stagger ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={
            stagger
              ? { delay: i * STAGGER_STEP, duration: STAGGER_STEP * 0.85, ease: 'easeOut' }
              : { duration: 0 }
          }
        />
      ))}
      {points.map((p, i) => {
        const isEndpoint = i === points.length - 1;
        return (
          <motion.circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={isEndpoint ? 5.5 : 3}
            fill={color}
            fillOpacity={finalOpacity}
            initial={stagger ? { opacity: 0, scale: 0.3 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              stagger
                ? { delay: i * STAGGER_STEP, duration: STAGGER_STEP * 0.7, ease: 'easeOut' }
                : { duration: 0 }
            }
            style={{ originX: `${p.x}px`, originY: `${p.y}px` }}
          />
        );
      })}
    </g>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function MlWeek3OptimizerPaths() {
  const [activeView, setActiveView] = useState<ViewMode>('gd');
  const shouldReduce = useReducedMotion();

  const groupTransitionDuration = shouldReduce ? 0.15 : 0.28;

  return (
    <div className="flex flex-col gap-4 not-prose max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {TABS.map((tab) => {
          const isActive = activeView === tab.id;
          const dotColor = tab.id === 'overlay' ? undefined : COLORS[tab.id as 'gd' | 'minibatch' | 'sgd'];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              aria-pressed={isActive}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
              )}
              style={{
                background: isActive
                  ? tab.id === 'overlay'
                    ? 'var(--text-strong)'
                    : dotColor
                  : 'var(--surface-sunken)',
                color: isActive ? '#ffffff' : 'var(--text-body)',
              }}
            >
              {tab.id === 'overlay' ? (
                <Layers size={14} />
              ) : (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: isActive ? '#ffffff' : dotColor }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SVG contour + paths */}
      <div className="w-full">
        <svg
          viewBox="0 0 600 440"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="三種梯度下降優化方式在損失等高線上的路徑對比"
          style={{ display: 'block' }}
        >
          {/* 同心橢圓等高線 */}
          {CONTOURS.map((ring, i) => (
            <ellipse
              key={`ring-${i}`}
              cx={MINIMUM.x}
              cy={MINIMUM.y}
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke="var(--neutral-400)"
              strokeOpacity={ring.opacity}
              strokeWidth={1.25}
            />
          ))}

          {/* 路徑群組：單一分頁用 stagger 播放，全部疊加用半透明靜態顯示 */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.g
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: groupTransitionDuration, ease: 'easeOut' }}
            >
              {activeView === 'overlay' ? (
                <>
                  <PathGroup points={PATH_GD} color={COLORS.gd} stagger={false} strokeWidth={2} finalOpacity={0.55} />
                  <PathGroup
                    points={PATH_MINIBATCH}
                    color={COLORS.minibatch}
                    stagger={false}
                    strokeWidth={2}
                    finalOpacity={0.55}
                  />
                  <PathGroup points={PATH_SGD} color={COLORS.sgd} stagger={false} strokeWidth={2} finalOpacity={0.55} />
                </>
              ) : (
                <PathGroup
                  points={PATHS[activeView]}
                  color={COLORS[activeView]}
                  stagger={!shouldReduce}
                  strokeWidth={3}
                  finalOpacity={1}
                />
              )}
            </motion.g>
          </AnimatePresence>

          {/* 起點標記 */}
          <circle cx={START.x} cy={START.y} r={4.5} fill="var(--text-strong)" />
          <text
            x={START.x - 10}
            y={START.y - 12}
            textAnchor="end"
            fontSize={11}
            fill="var(--text-body)"
            fontWeight={500}
          >
            起點
          </text>

          {/* 最低點標記 */}
          <circle cx={MINIMUM.x} cy={MINIMUM.y} r={4} fill="none" stroke="var(--text-strong)" strokeWidth={1.5} />
          <circle cx={MINIMUM.x} cy={MINIMUM.y} r={1.6} fill="var(--text-strong)" />
          <text
            x={MINIMUM.x}
            y={MINIMUM.y + 22}
            textAnchor="middle"
            fontSize={11}
            fill="var(--text-body)"
            fontWeight={500}
          >
            Global loss minimum
          </text>
        </svg>
      </div>

      {/* 白話總結 */}
      <div className="text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={activeView}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.22, ease: 'easeOut' }}
            className="text-[13px] font-normal"
            style={{ color: 'var(--text-body)' }}
          >
            {SUMMARY[activeView]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
