import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Gauge, Target, TriangleAlert, type LucideIcon } from 'lucide-react';

type ModelKey = 'ideal' | 'constant-voltage' | 'exponential';

interface ModelInfo {
  tabLabel: string;
  activeClass: string;
  lineColor: string;
  drop: string;
  usage: string;
  cost: string;
}

const MODELS: Record<ModelKey, ModelInfo> = {
  ideal: {
    tabLabel: '理想',
    activeClass: 'bg-[var(--blue-600)] text-white',
    lineColor: 'var(--blue-500)',
    drop: '短路，壓降為零',
    usage: '快速判斷通斷、畫大致的輸入輸出曲線',
    cost: '誤差最大，轉折點位置不對',
  },
  'constant-voltage': {
    tabLabel: '定電壓',
    activeClass: 'bg-[var(--neutral-600)] text-white',
    lineColor: 'var(--neutral-600)',
    drop: '固定壓降（約 0.7 V）',
    usage: '手算絕大多數電路',
    cost: '忽略電流對壓降的影響',
  },
  exponential: {
    tabLabel: '指數',
    activeClass: 'bg-[var(--orange-600)] text-white',
    lineColor: 'var(--orange-500)',
    drop: '電流與電壓成指數關係（無固定值）',
    usage: '兩顆面積不同的二極體並存、需要精確值時',
    cost: '要迭代求解，手算極痛苦',
  },
};

const TAB_ORDER: ModelKey[] = ['ideal', 'constant-voltage', 'exponential'];

const CARD_META: { key: 'drop' | 'usage' | 'cost'; label: string; Icon: LucideIcon }[] = [
  { key: 'drop', label: '壓降', Icon: Gauge },
  { key: 'usage', label: '適用', Icon: Target },
  { key: 'cost', label: '代價', Icon: TriangleAlert },
];

// ---- 數值模型 --------------------------------------------------------
// 三個模型共用同一組固定取樣點數，才能讓 <motion.polyline> 的 points 屬性
// 在切換時逐點補間、呈現「L 形被拉成平滑曲線」的視覺效果。
const SAMPLE_COUNT = 121;
const VD_MIN = -1;
const VD_MAX = 1;
const IMAX = 12; // mA，y 軸上限
const IS_SAT = 2e-14; // A
const VT = 0.026; // V
// 理想 / 定電壓模型的「垂直上升」用一段很窄的線性斜坡近似，寬度遠小於取樣間距
// （2V / 120 ≈ 0.0167V），視覺上仍是一條幾乎垂直的線。
const RAMP_WIDTH = 0.02; // V

const PLOT_LEFT = 56;
const PLOT_RIGHT = 616;
const PLOT_TOP = 24;
const PLOT_BOTTOM = 248;

const VD_SAMPLES: number[] = Array.from(
  { length: SAMPLE_COUNT },
  (_, i) => VD_MIN + (i * (VD_MAX - VD_MIN)) / (SAMPLE_COUNT - 1)
);

function xScale(vd: number): number {
  return PLOT_LEFT + ((vd - VD_MIN) / (VD_MAX - VD_MIN)) * (PLOT_RIGHT - PLOT_LEFT);
}

function yScale(currentMa: number): number {
  const clamped = Math.min(Math.max(currentMa, 0), IMAX);
  return PLOT_BOTTOM - (clamped / IMAX) * (PLOT_BOTTOM - PLOT_TOP);
}

function rampCurrent(vd: number, turnOn: number): number {
  if (vd < turnOn) return 0;
  if (vd >= turnOn + RAMP_WIDTH) return IMAX;
  return (IMAX * (vd - turnOn)) / RAMP_WIDTH;
}

function exponentialCurrent(vd: number): number {
  if (vd < 0) return 0;
  const amps = IS_SAT * (Math.exp(vd / VT) - 1);
  return Math.max(0, amps * 1000);
}

function buildPoints(currentFn: (vd: number) => number): string {
  return VD_SAMPLES.map((vd) => `${xScale(vd).toFixed(2)},${yScale(currentFn(vd)).toFixed(2)}`).join(' ');
}

const POINTS: Record<ModelKey, string> = {
  ideal: buildPoints((vd) => rampCurrent(vd, 0)),
  'constant-voltage': buildPoints((vd) => rampCurrent(vd, 0.7)),
  exponential: buildPoints(exponentialCurrent),
};

const X_TICKS: { vd: number; label: string }[] = [
  { vd: -1, label: '-1V' },
  { vd: 0, label: '0' },
  { vd: 0.5, label: '0.5V' },
  { vd: 0.7, label: '0.7V' },
  { vd: 1, label: '1V' },
];

const Y_TICKS: { i: number; label: string }[] = [
  { i: 0, label: '0' },
  { i: IMAX, label: '12 mA' },
];

export default function EcWeek2DiodeModels() {
  const [activeModel, setActiveModel] = useState<ModelKey>('ideal');
  const shouldReduceMotion = useReducedMotion();
  const curveDuration = shouldReduceMotion ? 0 : 0.3;
  const fadeDuration = shouldReduceMotion ? 0 : 0.2;

  const info = MODELS[activeModel];

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* 分頁列：三種模型，一次只顯示一態 */}
      <div className="flex flex-wrap gap-2">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveModel(key)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
              activeModel === key ? MODELS[key].activeClass : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {MODELS[key].tabLabel}
          </button>
        ))}
      </div>

      {/* IV 特性曲線：單一折線，切換模型時 points 逐點補間過渡 */}
      <svg
        viewBox="0 0 640 320"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="二極體 IV 特性曲線，依所選模型呈現不同形狀"
      >
        {/* 0.7V 導通電壓輔助虛線 */}
        <line
          x1={xScale(0.7)}
          y1={PLOT_TOP}
          x2={xScale(0.7)}
          y2={PLOT_BOTTOM}
          stroke="var(--neutral-300)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* 座標軸 */}
        <line
          x1={PLOT_LEFT}
          y1={PLOT_BOTTOM}
          x2={PLOT_RIGHT}
          y2={PLOT_BOTTOM}
          stroke="var(--text-strong)"
          strokeWidth={1.5}
        />
        <line
          x1={xScale(0)}
          y1={PLOT_TOP}
          x2={xScale(0)}
          y2={PLOT_BOTTOM}
          stroke="var(--text-strong)"
          strokeWidth={1.5}
        />

        {/* x 軸刻度 */}
        {X_TICKS.map((tick) => (
          <g key={tick.vd}>
            <line
              x1={xScale(tick.vd)}
              y1={PLOT_BOTTOM}
              x2={xScale(tick.vd)}
              y2={PLOT_BOTTOM + 6}
              stroke="var(--text-strong)"
              strokeWidth={1}
            />
            <text
              x={xScale(tick.vd)}
              y={PLOT_BOTTOM + 20}
              textAnchor="middle"
              fontSize={11}
              fill="var(--neutral-500)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* y 軸刻度 */}
        {Y_TICKS.map((tick) => (
          <g key={tick.i}>
            <line
              x1={PLOT_LEFT - 6}
              y1={yScale(tick.i)}
              x2={PLOT_LEFT}
              y2={yScale(tick.i)}
              stroke="var(--text-strong)"
              strokeWidth={1}
            />
            <text
              x={PLOT_LEFT - 10}
              y={yScale(tick.i) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--neutral-500)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* 軸標題（英數） */}
        <text x={PLOT_RIGHT} y={PLOT_BOTTOM + 20} textAnchor="end" fontSize={11} fill="var(--neutral-400)">
          VD
        </text>
        <text x={PLOT_LEFT} y={PLOT_TOP - 8} textAnchor="start" fontSize={11} fill="var(--neutral-400)">
          I (mA)
        </text>

        {/* IV 折線：不寫 initial，未包在 AnimatePresence 內、也沒有 key 變動，
            SSR 直接以 animate 的值當起始狀態渲染（見 motion-patterns.md 的例外情況） */}
        <motion.polyline
          animate={{ points: POINTS[activeModel], stroke: info.lineColor }}
          transition={{ duration: curveDuration, ease: 'easeOut' }}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* 下方三欄資訊卡：壓降 / 適用 / 代價 */}
      {/* initial={false}：略過首次掛載的進場動畫，避免元件未取得瀏覽器焦點時
          rAF 動畫卡在 opacity:0（切換分頁的動畫不受影響，仍會播放） */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeModel}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: fadeDuration }}
          className="grid grid-cols-3 gap-3"
        >
          {CARD_META.map(({ key, label, Icon }) => (
            <div key={key} className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                <Icon size={14} className="text-neutral-500" />
                {label}
              </div>
              <div className="text-sm font-medium text-neutral-800">{info[key]}</div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
