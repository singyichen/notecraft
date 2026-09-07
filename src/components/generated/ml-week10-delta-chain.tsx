import { motion, useReducedMotion } from 'motion/react';
import { Repeat } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A run of formula text; `tag` marks which of the two repeating actions it belongs to. */
interface FormulaSegment {
  text: string;
  tag?: 'A' | 'B';
}

interface Stage {
  id: string;
  index: number;
  title: string;
  segments: FormulaSegment[];
  annotation: string;
}

// ─── Data (mirrors the plan's three right-to-left stages) ───────────────────

const STAGES: Stage[] = [
  {
    id: 'output',
    index: 1,
    title: '輸出層',
    segments: [
      { text: 'δ_out = (a_out − y) × ' },
      { text: "σ'(z_out)", tag: 'B' },
    ],
    annotation: '損失對輸出激活的偏導 × 該層激活函數的導數',
  },
  {
    id: 'hidden',
    index: 2,
    title: '隱藏層',
    segments: [
      { text: 'δ_h = (' },
      { text: 'δ_out · W_out^T', tag: 'A' },
      { text: ') × ' },
      { text: "σ'(z_h)", tag: 'B' },
    ],
    annotation: '上一層的責任 × 權重轉置 × 該層激活函數的導數',
  },
  {
    id: 'deeper',
    index: 3,
    title: '更深的層',
    segments: [
      { text: 'δ_(l−1) = (' },
      { text: 'δ_l · W_l^T', tag: 'A' },
      { text: ') × ' },
      { text: "f'(z_(l−1))", tag: 'B' },
    ],
    annotation: '每退一層就重複同一個動作',
  },
];

// ─── Layout constants (SVG user units, viewBox width kept ≤ 660) ───────────

const VB_W = 600;
const BOX_W = 520;
const BOX_H = 72;
const BOX_X = (VB_W - BOX_W) / 2;
const GAP = 40;
const TOP_PAD = 16;
const BOTTOM_PAD = 16;

function stageY(i: number): number {
  return TOP_PAD + i * (BOX_H + GAP);
}

const VB_H = stageY(STAGES.length - 1) + BOX_H + BOTTOM_PAD;
const ARROW_CX = VB_W / 2;

function segmentClass(tag: FormulaSegment['tag']): string {
  if (tag === 'A') return 'rounded px-1 bg-blue-100 text-blue-700';
  if (tag === 'B') return 'rounded px-1 bg-orange-100 text-orange-700';
  return '';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChainArrow({ y1, y2 }: { y1: number; y2: number }) {
  const tipY = y2 - 4;
  return (
    <g>
      <line
        x1={ARROW_CX}
        y1={y1}
        x2={ARROW_CX}
        y2={tipY - 8}
        stroke="#cbd5e1"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <polygon
        points={`${ARROW_CX - 6},${tipY - 8} ${ARROW_CX + 6},${tipY - 8} ${ARROW_CX},${tipY}`}
        fill="#94a3b8"
      />
    </g>
  );
}

interface StageBoxProps {
  stage: Stage;
  y: number;
  reduced: boolean | null;
}

function StageBox({ stage, y, reduced }: StageBoxProps) {
  return (
    <motion.g
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: reduced ? 0 : stage.index * 0.12 }}
    >
      <rect
        x={BOX_X}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={12}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <foreignObject x={BOX_X + 18} y={y + 10} width={BOX_W - 36} height={BOX_H - 20}>
        <div className="flex h-full w-full flex-col justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
              {stage.index}
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-500">
              {stage.title}
            </span>
          </div>
          <div className="whitespace-nowrap font-mono text-[15px] leading-snug text-neutral-800">
            {stage.segments.map((seg, i) => (
              <span key={i} className={segmentClass(seg.tag)}>
                {seg.text}
              </span>
            ))}
          </div>
        </div>
      </foreignObject>
    </motion.g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MlWeek10DeltaChain() {
  const reduced = useReducedMotion();

  return (
    <div className="not-prose mx-auto max-w-2xl space-y-4 font-sans">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="反向傳播責任鏈：三個階段重複同樣兩個動作"
      >
        {STAGES.map((stage, i) => (
          <StageBox key={stage.id} stage={stage} y={stageY(i)} reduced={reduced} />
        ))}
        {STAGES.slice(0, -1).map((stage, i) => (
          <ChainArrow key={`arrow-${stage.id}`} y1={stageY(i) + BOX_H} y2={stageY(i + 1)} />
        ))}
      </svg>

      {/* Legend: the two repeating actions, color-matched to the formula highlights above */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-3 w-3 flex-none rounded-sm bg-blue-500" />
          <p className="text-sm leading-snug text-neutral-700">
            <span className="font-semibold text-blue-700">動作 A</span>
            ：乘上該層權重的轉置（把責任往回分配）
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 h-3 w-3 flex-none rounded-sm bg-orange-500" />
          <p className="text-sm leading-snug text-neutral-700">
            <span className="font-semibold text-orange-600">動作 B</span>
            ：乘上該層激活函數的導數（過那一層的閘門）
          </p>
        </div>
      </div>

      {/* Per-stage annotations, kept as DOM text per the plan's "中文說明放 DOM" rule */}
      <div className="space-y-1.5">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex gap-2 text-sm">
            <span className="flex-none pt-0.5 font-mono text-xs text-neutral-400">
              {stage.index}
            </span>
            <p className="leading-snug text-neutral-600">
              <span className="font-medium text-neutral-800">{stage.title}：</span>
              {stage.annotation}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
        <Repeat size={16} className="mt-0.5 flex-none text-blue-600" />
        <p className="text-sm leading-relaxed text-blue-900">
          <span className="font-semibold">核心洞察：</span>
          反向傳播沒有新東西，只是「乘權重轉置、乘激活導數」這兩個動作，一層一層重複下去。
        </p>
      </div>
    </div>
  );
}
