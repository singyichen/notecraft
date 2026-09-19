import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Battery } from 'lucide-react';

type TabIndex = 0 | 1 | 2 | 3;
type ModelMode = 'ideal' | 'constant-voltage';
type ElementType = 'R' | 'D' | 'battery';

interface CircuitElement {
  type: ElementType;
  label: string;
}

const VP = 3; // 輸入正弦波振幅 (V)
const DOMAIN = VP + 0.5; // 軸範圍 [-3.5, 3.5]
const SAMPLE_COUNT = 121;
const WAVE_SAMPLE_COUNT = 121;

// 四個電路的元件堆疊（由上至下）；Vout 一律取自「第一個元件之後」的節點，
// 這個節點的對地電壓剛好等於「跨接在其餘元件上的電壓」，四個電路因此可用同一套繪圖邏輯。
const TAB_ELEMENTS: Record<TabIndex, CircuitElement[]> = {
  0: [
    { type: 'D', label: 'D1' },
    { type: 'R', label: 'R1' },
  ],
  1: [
    { type: 'R', label: 'R1' },
    { type: 'D', label: 'D1' },
  ],
  2: [
    { type: 'R', label: 'R1' },
    { type: 'D', label: 'D1' },
    { type: 'battery', label: 'VB' },
  ],
  3: [
    { type: 'R', label: 'R1' },
    { type: 'R', label: 'R2' },
    { type: 'D', label: 'D1' },
  ],
};

const TAB_LABELS: Record<TabIndex, string> = {
  0: 'D 串 R',
  1: 'R 串 D',
  2: '限幅器',
  3: '分壓器',
};

const TAB_DESCRIPTIONS: Record<TabIndex, string> = {
  0: '二極體串電阻，輸出取自電阻兩端：正半週導通、負半週輸出為零。',
  1: '電阻串二極體到地，輸出取自二極體兩端：負半週導通、正半週被壓平在零。',
  2: '二極體下方多串一顆電池 VB，正半週被削平在 VB 之上，削平高度隨 VB 提升。',
  3: 'R1、R2 分壓再串二極體，正輸入時斜率變成 R2/(R1+R2)。',
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** 四個電路共用的分段線性轉移函數：vOn 是模型的導通壓降（理想=0、定電壓=0.7），vb 僅分頁 2 使用 */
function transferFn(tab: TabIndex, vOn: number, vb: number, vin: number): number {
  switch (tab) {
    case 0:
      return vin <= vOn ? 0 : vin - vOn;
    case 1:
      return vin <= vOn ? vin : vOn;
    case 2: {
      const threshold = vOn + vb;
      return vin <= threshold ? vin : threshold;
    }
    case 3:
      return vin <= vOn ? vin : vOn + 0.5 * (vin - vOn);
    default:
      return vin;
  }
}

// ---- 電路符號：縱向版（方框電阻／三角形二極體／雙格電池），依 circuit-symbols.md 的墨色與線寬慣例 ----

function ResistorSymbol({ x, y, h }: { x: number; y: number; h: number }) {
  const lead = h * 0.2;
  const body = h * 0.6;
  return (
    <g>
      <path d={`M${x},${y} V${y + lead}`} />
      <rect x={x - 9} y={y + lead} width={18} height={body} />
      <path d={`M${x},${y + lead + body} V${y + h}`} />
    </g>
  );
}

function DiodeSymbol({ x, y, h }: { x: number; y: number; h: number }) {
  const lead = h * 0.2;
  const apex = y + h * 0.5;
  return (
    <g>
      <path d={`M${x},${y} V${y + lead}`} />
      <path d={`M${x - 8},${y + lead} L${x + 8},${y + lead} L${x},${apex} Z`} fill="var(--text-strong)" />
      <path d={`M${x - 8},${apex} H${x + 8}`} />
      <path d={`M${x},${apex} V${y + h}`} />
    </g>
  );
}

function BatterySymbol({ x, y, h }: { x: number; y: number; h: number }) {
  const p1 = y + h * 0.32;
  const p2 = y + h * 0.4;
  const p3 = y + h * 0.52;
  const p4 = y + h * 0.6;
  return (
    <g>
      <path d={`M${x},${y} V${p1}`} />
      <path d={`M${x - 10},${p1} H${x + 10}`} />
      <path d={`M${x - 5},${p2} H${x + 5}`} strokeWidth={4} />
      <path d={`M${x - 10},${p3} H${x + 10}`} />
      <path d={`M${x - 5},${p4} H${x + 5}`} strokeWidth={4} />
      <path d={`M${x},${p4} V${y + h}`} />
    </g>
  );
}

function GroundSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x},${y} V${y + 10}`} />
      <path d={`M${x - 10},${y + 10} H${x + 10}`} />
      <path d={`M${x - 7},${y + 14} H${x + 7}`} />
      <path d={`M${x - 4},${y + 18} H${x + 4}`} />
    </g>
  );
}

function SourceSymbol({ cx }: { cx: number }) {
  return (
    <g>
      <path d={`M${cx},45 V90`} />
      <circle cx={cx} cy={105} r={15} />
      <path d={`M${cx - 8},105 Q${cx - 4},97 ${cx},105 Q${cx + 4},113 ${cx + 8},105`} />
      <path d={`M${cx},120 V165`} />
    </g>
  );
}

function CircuitDiagram({ elements }: { elements: CircuitElement[] }) {
  const stackX = 190;
  const stackTop = 45;
  const stackBottom = 165;
  const count = elements.length;
  const elHeight = (stackBottom - stackTop) / count;
  const tapY = stackTop + elHeight; // Vout 引出點：第一個元件之後的節點
  const sourceCx = 55;

  return (
    <svg viewBox="0 0 300 200" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="電路示意圖">
      <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <SourceSymbol cx={sourceCx} />
        {/* 頂部軌：電源正端 -> 堆疊頂端（單一轉角，非三線交會，不畫接點） */}
        <path d={`M${sourceCx},45 H${stackX}`} />
        {/* 底部軌：堆疊底端 -> 電源負端 */}
        <path d={`M${stackX},${stackBottom} H${sourceCx}`} />
        {/* 接地支線 */}
        <path d={`M${stackX},${stackBottom} V${stackBottom + 15}`} />
        <GroundSymbol x={stackX} y={stackBottom + 15} />
        {/* 底部三線交會（元件最後一端＋回線＋接地支線）：畫接點 */}
        <circle cx={stackX} cy={stackBottom} r={2.5} fill="var(--text-strong)" />

        {elements.map((el, i) => {
          const y = stackTop + i * elHeight;
          if (el.type === 'R') return <ResistorSymbol key={i} x={stackX} y={y} h={elHeight} />;
          if (el.type === 'D') return <DiodeSymbol key={i} x={stackX} y={y} h={elHeight} />;
          return <BatterySymbol key={i} x={stackX} y={y} h={elHeight} />;
        })}

        {/* Vout 引出點（第一、二元件交會＋引出線：三線交會，畫接點） */}
        <circle cx={stackX} cy={tapY} r={2.5} fill="var(--text-strong)" />
        <path d={`M${stackX},${tapY} H250`} />
      </g>

      <g fill="var(--text-strong)" fontFamily="var(--font-mono)" fontSize={11}>
        <text x={26} y={60}>Vin</text>
        <text x={254} y={tapY + 4}>Vout</text>
        {elements.map((el, i) => {
          const y = stackTop + i * elHeight + elHeight / 2;
          return (
            <text key={i} x={163} y={y + 4} textAnchor="end" fontSize={10}>
              {el.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

function TransferCurve({
  tab,
  vOn,
  vb,
  transitionDuration,
}: {
  tab: TabIndex;
  vOn: number;
  vb: number;
  transitionDuration: number;
}) {
  const LEFT = 46;
  const RIGHT = 280;
  const TOP = 14;
  const BOTTOM = 170;
  const mapX = (v: number) => LEFT + ((v + DOMAIN) / (2 * DOMAIN)) * (RIGHT - LEFT);
  const mapY = (v: number) => BOTTOM - ((clamp(v, -DOMAIN, DOMAIN) + DOMAIN) / (2 * DOMAIN)) * (BOTTOM - TOP);

  const points = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const vin = -DOMAIN + (2 * DOMAIN * i) / (SAMPLE_COUNT - 1);
      const vout = transferFn(tab, vOn, vb, vin);
      pts.push(`${mapX(vin).toFixed(2)},${mapY(vout).toFixed(2)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vOn, vb]);

  const zeroX = mapX(0);
  const zeroY = mapY(0);

  return (
    <svg viewBox="0 0 300 200" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="輸入輸出轉移曲線">
      <g stroke="var(--neutral-300)" strokeWidth={1}>
        <path d={`M${LEFT},${zeroY} H${RIGHT}`} />
        <path d={`M${zeroX},${TOP} V${BOTTOM}`} />
      </g>
      <motion.polyline
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ points }}
        transition={{ duration: transitionDuration, ease: 'easeOut' }}
      />
      <g fill="var(--text-strong)" fontFamily="var(--font-mono)" fontSize={9}>
        <text x={LEFT} y={BOTTOM + 12} textAnchor="start">-3</text>
        <text x={zeroX} y={BOTTOM + 12} textAnchor="middle">0</text>
        <text x={RIGHT} y={BOTTOM + 12} textAnchor="end">3</text>
        <text x={4} y={TOP + 8}>Vout</text>
        <text x={RIGHT - 22} y={BOTTOM - 6}>Vin</text>
      </g>
    </svg>
  );
}

function Waveform({
  tab,
  vOn,
  vb,
  transitionDuration,
}: {
  tab: TabIndex;
  vOn: number;
  vb: number;
  transitionDuration: number;
}) {
  const LEFT = 44;
  const RIGHT = 616;
  const TOP = 12;
  const BOTTOM = 140;
  const mapT = (t: number) => LEFT + (t / (2 * Math.PI)) * (RIGHT - LEFT);
  const mapV = (v: number) => BOTTOM - ((clamp(v, -DOMAIN, DOMAIN) + DOMAIN) / (2 * DOMAIN)) * (BOTTOM - TOP);

  const { vinPoints, voutPoints } = useMemo(() => {
    const inPts: string[] = [];
    const outPts: string[] = [];
    for (let i = 0; i < WAVE_SAMPLE_COUNT; i++) {
      const t = (2 * Math.PI * i) / (WAVE_SAMPLE_COUNT - 1);
      const vin = VP * Math.sin(t);
      const vout = transferFn(tab, vOn, vb, vin);
      inPts.push(`${mapT(t).toFixed(2)},${mapV(vin).toFixed(2)}`);
      outPts.push(`${mapT(t).toFixed(2)},${mapV(vout).toFixed(2)}`);
    }
    return { vinPoints: inPts.join(' '), voutPoints: outPts.join(' ') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vOn, vb]);

  const zeroY = mapV(0);

  return (
    <svg viewBox="0 0 640 160" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="輸入與輸出波形對照">
      <path d={`M${LEFT},${zeroY} H${RIGHT}`} stroke="var(--neutral-300)" strokeWidth={1} />
      <polyline
        points={vinPoints}
        fill="none"
        stroke="var(--neutral-400)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <motion.polyline
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ points: voutPoints }}
        transition={{ duration: transitionDuration, ease: 'easeOut' }}
      />
      <g fontFamily="var(--font-mono)" fontSize={10}>
        <text x={LEFT} y={TOP + 8} fill="var(--text-strong)">V</text>
        <text x={RIGHT - 96} y={TOP + 8} fill="var(--neutral-400)">Vin(t)</text>
        <text x={RIGHT - 44} y={TOP + 8} fill="var(--orange-600)">Vout(t)</text>
      </g>
    </svg>
  );
}

export default function EcWeek2TransferCurves() {
  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const [modelMode, setModelMode] = useState<ModelMode>('ideal');
  const [vb, setVb] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  // 拖動 VB 滑桿時要「零延遲」跟著動，切分頁／切模型才套用 200–300ms 補間；
  // 用這個 ref 記錄「最近一次更新是不是 VB 滑桿觸發的」，在同一次 render 內決定 transition duration。
  const lastChangeWasVb = useRef(false);

  const vOn = modelMode === 'ideal' ? 0 : 0.7;
  const transitionDuration = lastChangeWasVb.current ? 0 : shouldReduceMotion ? 0 : 0.3;

  function handleTabChange(i: TabIndex) {
    lastChangeWasVb.current = false;
    setActiveTab(i);
  }
  function handleModelChange(m: ModelMode) {
    lastChangeWasVb.current = false;
    setModelMode(m);
  }
  function handleVbChange(v: number) {
    lastChangeWasVb.current = true;
    setVb(v);
  }

  const elements = TAB_ELEMENTS[activeTab];

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2, 3] as TabIndex[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleTabChange(i)}
              className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === i ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {TAB_LABELS[i]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['ideal', 'constant-voltage'] as ModelMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModelChange(m)}
              className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                modelMode === m
                  ? m === 'ideal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-600 text-white'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {m === 'ideal' ? '理想' : '定電壓'}
            </button>
          ))}
        </div>
      </div>

      {/* initial={false}：避免首次掛載的進場動畫在分頁未取得焦點時卡在 opacity:0 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <CircuitDiagram elements={elements} />
            <TransferCurve tab={activeTab} vOn={vOn} vb={vb} transitionDuration={transitionDuration} />
          </div>
          <Waveform tab={activeTab} vOn={vOn} vb={vb} transitionDuration={transitionDuration} />

          {activeTab === 2 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vb-slider" className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <Battery size={14} className="text-neutral-500" />
                電池電壓 VB：<span className="font-mono text-neutral-800">{vb.toFixed(1)} V</span>
              </label>
              <input
                id="vb-slider"
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={vb}
                onChange={(e) => handleVbChange(Number(e.target.value))}
                className="w-full accent-[var(--blue-600)]"
                aria-label="電池電壓 VB 拖曳滑桿"
              />
            </div>
          )}

          <p className="text-xs text-neutral-600">{TAB_DESCRIPTIONS[activeTab]}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
