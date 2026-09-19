import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Mic, Radio, Filter, Volume2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

// 專案 token `--orange-*` 的字面色其實是 emerald 綠（見 tokens.css 歷史命名），
// 這裡剛好語意也是要 emerald（載波脈衝），故直接使用 var(--orange-500) 沒有衝突，
// 僅在此註記命名由來，避免日後誤以為要改成橘色。

type Step = 0 | 1 | 2 | 3;

type NodeKey = 'mic' | 'mulTx' | 'antenna' | 'mulRx' | 'lpf' | 'speaker';

interface NodeDef {
  key: NodeKey;
  label: string;
  icon: ReactNode;
}

interface StepInfo {
  activeNodes: NodeKey[];
  description: string;
  note?: string;
}

const NODES: NodeDef[] = [
  { key: 'mic', label: '麥克風', icon: <Mic size={16} /> },
  {
    key: 'mulTx',
    label: '乘法器',
    icon: <span className="text-sm font-semibold leading-none">{'⊗'}</span>,
  },
  { key: 'antenna', label: '天線', icon: <Radio size={16} /> },
  {
    key: 'mulRx',
    label: '乘法器',
    icon: <span className="text-sm font-semibold leading-none">{'⊗'}</span>,
  },
  { key: 'lpf', label: '低通濾波器', icon: <Filter size={16} /> },
  { key: 'speaker', label: '喇叭', icon: <Volume2 size={16} /> },
];

const STEP_INFO: StepInfo[] = [
  {
    activeNodes: ['mic'],
    description: '語音訊號 x(t) 的頻譜集中在 0 附近，頻寬很窄。',
  },
  {
    activeNodes: ['mulTx', 'antenna'],
    description:
      '乘上載波 cos(2πfc t)：時域相乘，等於頻域把語音頻譜複製搬到 ±fc 兩側。',
    note: '時域兩訊號相乘，等於頻域兩者頻譜做卷積。',
  },
  {
    activeNodes: ['antenna', 'mulRx'],
    description:
      '接收端再乘一次 fc（降頻）：頻譜出現三塊——搬回 0 附近的語音，以及 ±2fc 兩處不要的副本。',
    note: '時域兩訊號相乘，等於頻域兩者頻譜做卷積。',
  },
  {
    activeNodes: ['lpf', 'speaker'],
    description: '低通濾波器把 ±2fc 的副本濾掉，只留下 0 附近還原出的語音頻譜。',
  },
];

// 刻度：x=60/180/300/420/540 依序對應 -2fc/-fc/0/+fc/+2fc
const TICKS: { x: number; label: string }[] = [
  { x: 60, label: '−2fc' },
  { x: 180, label: '−fc' },
  { x: 300, label: '0' },
  { x: 420, label: '+fc' },
  { x: 540, label: '+2fc' },
];

const AXIS_Y = 170;
const PEAK_Y = AXIS_Y - 55;
const GRAY_PEAK_Y = AXIS_Y - 45;
const PULSE_TOP = AXIS_Y - 80;
const HALF_WIDTH = 40;

/** 產生以 cx 為中心、baseY 為底線、peakY 為峰頂的鐘形（貝茲曲線）SVG path */
function bellPath(cx: number, halfWidth: number, baseY: number, peakY: number): string {
  const left = cx - halfWidth;
  const right = cx + halfWidth;
  const c1 = cx - halfWidth * 0.55;
  const c2 = cx - halfWidth * 0.15;
  const c3 = cx + halfWidth * 0.15;
  const c4 = cx + halfWidth * 0.55;
  return `M ${left} ${baseY} C ${c1} ${baseY}, ${c2} ${peakY}, ${cx} ${peakY} C ${c3} ${peakY}, ${c4} ${baseY}, ${right} ${baseY} Z`;
}

function CarrierPulse({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} y1={AXIS_Y} x2={x} y2={PULSE_TOP} stroke="var(--orange-500)" strokeWidth={2} />
      <polygon
        points={`${x - 5},${PULSE_TOP + 8} ${x + 5},${PULSE_TOP + 8} ${x},${PULSE_TOP}`}
        fill="var(--orange-500)"
      />
    </g>
  );
}

function VoiceBump({ cx }: { cx: number }) {
  return (
    <path
      d={bellPath(cx, HALF_WIDTH, AXIS_Y, PEAK_Y)}
      fill="var(--blue-100)"
      fillOpacity={0.6}
      stroke="var(--blue-500)"
      strokeWidth={2}
    />
  );
}

function SpectrumContent({ step, reduce }: { step: Step; reduce: boolean }) {
  if (step === 0) {
    return <VoiceBump cx={300} />;
  }
  if (step === 1) {
    return (
      <>
        <VoiceBump cx={180} />
        <VoiceBump cx={420} />
        <CarrierPulse x={180} />
        <CarrierPulse x={420} />
      </>
    );
  }
  if (step === 2) {
    return (
      <>
        <path
          d={bellPath(60, HALF_WIDTH, AXIS_Y, GRAY_PEAK_Y)}
          fill="var(--neutral-100)"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
        />
        <path
          d={bellPath(540, HALF_WIDTH, AXIS_Y, GRAY_PEAK_Y)}
          fill="var(--neutral-100)"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
        />
        <VoiceBump cx={300} />
      </>
    );
  }
  // step === 3：LPF 通帶遮罩，±2fc 灰隆起淡出，只剩中央語音頻譜
  return (
    <>
      <rect
        x={260}
        y={40}
        width={80}
        height={130}
        fill="var(--blue-50)"
        stroke="var(--blue-300)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <motion.path
        d={bellPath(60, HALF_WIDTH, AXIS_Y, GRAY_PEAK_Y)}
        fill="var(--neutral-100)"
        stroke="var(--neutral-400)"
        strokeWidth={1.5}
        initial={{ opacity: reduce ? 0 : 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }}
        style={{ transformOrigin: '60px 170px' }}
      />
      <motion.path
        d={bellPath(540, HALF_WIDTH, AXIS_Y, GRAY_PEAK_Y)}
        fill="var(--neutral-100)"
        stroke="var(--neutral-400)"
        strokeWidth={1.5}
        initial={{ opacity: reduce ? 0 : 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }}
        style={{ transformOrigin: '540px 170px' }}
      />
      <VoiceBump cx={300} />
    </>
  );
}

export default function EcWeek1FrequencyConversion() {
  const [step, setStep] = useState<Step>(0);
  const shouldReduceMotion = useReducedMotion();
  const reduce = Boolean(shouldReduceMotion);
  const spectrumDuration = reduce ? 0 : 0.28;
  const dotTransitionClass = reduce ? '' : 'transition-transform duration-200';

  const current = STEP_INFO[step];

  const goPrev = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  const goNext = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* DOM 方塊圖：走查目前訊號走到哪個電路方塊 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {NODES.map((node, i) => {
          const active = current.activeNodes.includes(node.key);
          return (
            <div key={`${node.key}-${i}`} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`flex w-[76px] flex-col items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-center transition-colors duration-200 ${
                  active
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                }`}
              >
                {node.icon}
                <span className="text-[11px] leading-tight whitespace-nowrap">{node.label}</span>
              </div>
              {i < NODES.length - 1 && (
                <ArrowRight size={14} className="text-neutral-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* 頻譜圖 */}
      <svg
        viewBox="0 0 600 220"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="頻譜搬移示意圖"
      >
        <line x1={30} y1={AXIS_Y} x2={570} y2={AXIS_Y} stroke="var(--neutral-300)" strokeWidth={1.5} />
        <text x={580} y={AXIS_Y + 4} fontSize={11} fill="var(--neutral-400)">
          f
        </text>
        {TICKS.map((tick) => (
          <g key={tick.x}>
            <line
              x1={tick.x}
              y1={AXIS_Y - 4}
              x2={tick.x}
              y2={AXIS_Y + 4}
              stroke="var(--neutral-300)"
              strokeWidth={1.5}
            />
            <text x={tick.x} y={AXIS_Y + 18} fontSize={11} fill="var(--neutral-500)" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.g
            key={step}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: spectrumDuration, ease: 'easeOut' }}
          >
            <SpectrumContent step={step} reduce={reduce} />
          </motion.g>
        </AnimatePresence>
      </svg>

      {step === 0 && (
        <p className="-mt-3 text-xs text-neutral-400">實際頻寬遠小於圖中比例，僅示意</p>
      )}

      {/* 說明文字 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-neutral-700">{current.description}</p>
        {current.note && <p className="text-xs text-neutral-500">{current.note}</p>}
      </div>

      {/* Stepper 控制 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          上一步
        </button>
        <div className="flex items-center gap-2">
          {STEP_INFO.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i as Step)}
              aria-label={`第 ${i + 1} 步`}
              className={`rounded-full bg-blue-500 ${dotTransitionClass}`}
              style={{
                width: 8,
                height: 8,
                opacity: i === step ? 1 : 0.3,
                transform: i === step ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={step === 3}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一步
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
