import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Infinity as InfinityIcon,
  TrendingUp,
  Gauge,
  TrendingDown,
  CircleHelp,
  Workflow,
  ArrowRight,
} from 'lucide-react';

type Mode = 'ignore' | 'early';

/** 把「V_BE」「g_m」「β_forced」「V_CE,sat」這種底線寫法轉成真正的下標 */
function withSub(text: string): React.ReactNode {
  const parts = text.split(/([A-Za-zβ]_[A-Za-z0-9π]+(?:,[a-z]+)?)/g)
  return parts.map((part, i) => {
    const m = /^([A-Za-zβ])_(.+)$/.exec(part)
    if (!m) return part
    return (
      <span key={i}>
        {m[1]}
        <sub>{m[2]}</sub>
      </span>
    )
  })
}

/** 三條輸出特性曲線（V_BE1 < V_BE2 < V_BE3）在主動區右端（V_CE = 0）的 I_C 起點，
 *  以 SVG y 座標表示（y 越小代表 I_C 越大）。 */
const CURVE_Y0 = [230, 190, 140] as const;
const CURVE_STROKE = ['stroke-blue-300', 'stroke-blue-500', 'stroke-blue-700'] as const;
const CURVE_FILL = ['fill-blue-300', 'fill-blue-500', 'fill-blue-700'] as const;
const CURVE_LABEL = ['BE1', 'BE2', 'BE3'] as const;

const X_CONVERGE = 40; // V_CE = -V_A
const X_LEFT = 460; // V_CE = 0
const X_RIGHT = 600; // 主動區右端，約 V_CE = 5 V
const Y_ZERO = 270; // I_C = 0
const BACK_SPAN = X_LEFT - X_CONVERGE; // 420，對齊 V_A = 15 V 的比例
const FWD_SPAN = X_RIGHT - X_LEFT; // 140

/** 延伸直線（早至收斂點 (X_CONVERGE, Y_ZERO)）在 x = X_RIGHT 的 y 值。 */
function earlyEndY(y0: number): number {
  const slope = (y0 - Y_ZERO) / BACK_SPAN;
  return y0 + slope * FWD_SPAN;
}

interface ModeTabProps {
  mode: Mode;
  active: boolean;
  label: string;
  icon: typeof InfinityIcon;
  onSelect: () => void;
}

function ModeTab({ active, label, icon: Icon, onSelect }: ModeTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-pill bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors'
          : 'inline-flex items-center gap-1.5 rounded-pill border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50'
      }
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

interface FieldCardConfig {
  key: string;
  title: string;
  icon: typeof Gauge;
  ignore: string;
  early: string;
}

const FIELD_CARDS: FieldCardConfig[] = [
  {
    key: 'ro',
    title: '輸出電阻 r_o',
    icon: Gauge,
    ignore: 'r_o → ∞（講義 p.43：Without Early Effect 曲線完全水平）',
    early: 'r_o = V_A / I_C（p.46）。例：V_A = 15 V、I_C = 1 mA → r_o = 15 kΩ（p.47 例題 4-14）',
  },
  {
    key: 'gain',
    title: '對增益的影響',
    icon: TrendingDown,
    ignore: 'r_o 不與 R_C 並聯分流，增益上限只由負載電阻 R_C 決定',
    early:
      'r_o 與 R_C 並聯，增益被封頂在本質增益 g_m·r_o = V_A / V_T ≈ 15 V / 26 mV ≈ 577（由 p.43 的 g_m = I_C/V_T 與 p.46 的 r_o = V_A/I_C 相乘推得，講義未直接列出此式）',
  },
  {
    key: 'when',
    title: '什麼時候可以忽略',
    icon: CircleHelp,
    ignore:
      'V_A 遠大於實際操作的 V_CE 範圍時合理（p.44 例題 4-13：V_A = ∞ 與 V_A = 20 V 算出的 V_BE 只差 2 mV）',
    early: '負載電阻 R_C 遠小於 r_o 時（重負載、低增益設計），r_o 的分流效應仍可忽略',
  },
];

const CAUSE_CHAIN = [
  'V_CE 升高',
  'B-C 空乏區往基極擴張',
  '有效基極寬度變薄',
  '濃度梯度變陡',
  'I_C 微幅上升',
];

export default function EcWeek4Early() {
  const [mode, setMode] = useState<Mode>('ignore');
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = shouldReduceMotion ?? false;
  const duration = reduceMotion ? 0 : 0.3;
  const isEarly = mode === 'early';

  return (
    <div className="not-prose flex flex-col gap-4">
      <div role="tablist" aria-label="是否考慮爾利效應" className="flex flex-wrap gap-2">
        <ModeTab
          mode="ignore"
          active={mode === 'ignore'}
          label="忽略爾利效應"
          icon={InfinityIcon}
          onSelect={() => setMode('ignore')}
        />
        <ModeTab
          mode="early"
          active={mode === 'early'}
          label="考慮爾利效應"
          icon={TrendingUp}
          onSelect={() => setMode('early')}
        />
      </div>

      <svg
        viewBox="0 0 640 300"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          isEarly
            ? 'BJT 輸出特性曲線，考慮爾利效應：三條曲線向右上方傾斜，反向延伸收斂於 -V_A'
            : 'BJT 輸出特性曲線，忽略爾利效應：三條曲線在主動區呈水平線'
        }
      >
        {/* 軸線 */}
        <line x1={30} y1={Y_ZERO} x2={610} y2={Y_ZERO} className="stroke-neutral-300" strokeWidth={1.5} />
        <line x1={X_LEFT} y1={Y_ZERO} x2={X_LEFT} y2={20} className="stroke-neutral-300" strokeWidth={1.5} />
        <polygon points="455,30 465,30 460,16" className="fill-neutral-300" />
        <polygon points="602,264 602,276 614,270" className="fill-neutral-300" />
        <text x={466} y={24} className="fill-neutral-500 text-[10px]">
          I<tspan baselineShift="sub" fontSize={8}>C</tspan>
        </text>
        <text x={596} y={286} textAnchor="end" className="fill-neutral-500 text-[10px]">
          V<tspan baselineShift="sub" fontSize={8}>CE</tspan>
        </text>
        <text x={452} y={286} textAnchor="end" className="fill-neutral-400 text-[10px]">
          0
        </text>

        {/* 反向延伸虛線與收斂點 */}
        {CURVE_Y0.map((y0, i) => (
          <motion.line
            key={`ext-${i}`}
            x1={X_CONVERGE}
            y1={Y_ZERO}
            x2={X_LEFT}
            y2={y0}
            strokeDasharray="4 3"
            className="stroke-neutral-400"
            strokeWidth={1.25}
            animate={{ opacity: isEarly ? 1 : 0 }}
            transition={{ duration, ease: 'easeOut' }}
          />
        ))}
        <motion.circle
          cx={X_CONVERGE}
          cy={Y_ZERO}
          r={4}
          className="fill-neutral-600"
          animate={{ opacity: isEarly ? 1 : 0 }}
          transition={{ duration, ease: 'easeOut' }}
        />
        <motion.text
          x={X_CONVERGE + 6}
          y={Y_ZERO - 10}
          textAnchor="start"
          className="fill-neutral-600 text-[10px]"
          animate={{ opacity: isEarly ? 1 : 0 }}
          transition={{ duration, ease: 'easeOut' }}
        >
          −V<tspan baselineShift="sub" fontSize={8}>A</tspan>
        </motion.text>
        <motion.text
          x={X_CONVERGE}
          y={Y_ZERO - 10}
          textAnchor="start"
          className="fill-neutral-400 text-[10px]"
          initial={false}
          animate={{ opacity: isEarly ? 0 : 1 }}
          transition={{ duration, ease: 'easeOut' }}
        >
          切到「考慮爾利效應」可看到反向延伸線與 −V<tspan baselineShift="sub" fontSize={8}>A</tspan>
        </motion.text>

        {/* 主曲線 */}
        {CURVE_Y0.map((y0, i) => (
          <motion.line
            key={`curve-${i}`}
            x1={X_LEFT}
            y1={y0}
            x2={X_RIGHT}
            y2={y0}
            initial={false}
            animate={{ y2: isEarly ? earlyEndY(y0) : y0 }}
            transition={{ duration, ease: 'easeOut' }}
            className={CURVE_STROKE[i]}
            strokeWidth={2}
          />
        ))}
        {CURVE_Y0.map((y0, i) => (
          <motion.text
            key={`label-${i}`}
            x={X_RIGHT + 6}
            y={y0 + 3}
            textAnchor="start"
            initial={false}
            animate={{ attrY: (isEarly ? earlyEndY(y0) : y0) + 3 }}
            transition={{ duration, ease: 'easeOut' }}
            className={`${CURVE_FILL[i]} text-[10px]`}
          >
            V<tspan baselineShift="sub" fontSize={8}>{CURVE_LABEL[i]}</tspan>
          </motion.text>
        ))}
      </svg>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          className="font-mono text-xs text-neutral-500"
        >
          {withSub(
            isEarly
              ? 'I_C ≈ I_S · exp(V_BE/V_T) · (1 + V_CE/V_A)　（講義 p.43）'
              : 'I_C ≈ I_S · exp(V_BE/V_T)　（講義 p.43 虛線：Without Early Effect）',
          )}
        </motion.p>
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FIELD_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
                <Icon size={16} />
                {withSub(card.title)}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                  className="mt-1.5 text-sm leading-relaxed text-neutral-700"
                >
                  {withSub(isEarly ? card.early : card.ignore)}
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {isEarly && (
          <motion.div
            key="cause-callout"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="rounded-lg border border-blue-100 bg-blue-50 p-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Workflow size={16} />
              {withSub('為什麼 V_CE 升高會讓 I_C 微升（講義 p.42）')}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-700">
              {CAUSE_CHAIN.map((step, i) => (
                <span key={step} className="flex items-center gap-1.5">
                  <span className="rounded-pill bg-white px-2 py-1 text-neutral-700">{withSub(step)}</span>
                  {i < CAUSE_CHAIN.length - 1 && <ArrowRight size={14} className="text-blue-400" />}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
