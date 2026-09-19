import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, Pause } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

type DiodeId = 'D1' | 'D2' | 'D3' | 'D4';

/** 菱形四角座標（規劃書固定拓樸，不可更動） */
const OUT_P: Point = { x: 280, y: 90 };
const OUT_N: Point = { x: 280, y: 270 };
const AC_L: Point = { x: 190, y: 180 };
const AC_R: Point = { x: 370, y: 180 };

/** 電源兩端子（水平 AC 源符號，translate(40 165)） */
const SRC_LEFT: Point = { x: 40, y: 180 };
const SRC_RIGHT: Point = { x: 100, y: 180 };

/** RL 兩端子（垂直電阻符號，translate(450 165) rotate(90 30 15)） */
const RL_TOP: Point = { x: 480, y: 150 };
const RL_BOTTOM: Point = { x: 480, y: 210 };

/** 二極體導線接點（沿對角線 rotate(±45/±135 30 15) 計算出的符號兩端） */
const D3_NEAR: Point = { x: 213.8, y: 156.2 }; // 靠 AC_L
const D3_FAR: Point = { x: 256.2, y: 113.8 }; // 靠 OUT_P
const D2_NEAR: Point = { x: 346.2, y: 156.2 }; // 靠 AC_R
const D2_FAR: Point = { x: 303.8, y: 113.8 }; // 靠 OUT_P
const D1_NEAR: Point = { x: 256.2, y: 246.2 }; // 靠 OUT_N
const D1_FAR: Point = { x: 213.8, y: 203.8 }; // 靠 AC_L
const D4_NEAR: Point = { x: 303.8, y: 246.2 }; // 靠 OUT_N
const D4_FAR: Point = { x: 346.2, y: 203.8 }; // 靠 AC_R

/** 二極體符號中心（用於 VDon / 逆偏幾何標記） */
const D3_CENTER: Point = { x: 235, y: 135 };
const D4_CENTER: Point = { x: 325, y: 225 };
const D1_CENTER: Point = { x: 235, y: 225 };
const D2_CENTER: Point = { x: 325, y: 135 };

/** 正半週（AC_L 為正）：AC_L→D3→OUT_P→RL→OUT_N→D4→AC_R，含電源兩端子繞線 */
const POSITIVE_PATH: Point[] = [
  SRC_RIGHT,
  AC_L,
  D3_NEAR,
  D3_FAR,
  OUT_P,
  { x: 280, y: 60 },
  { x: 480, y: 60 },
  RL_TOP,
  RL_BOTTOM,
  { x: 480, y: 300 },
  { x: 280, y: 300 },
  OUT_N,
  D4_NEAR,
  D4_FAR,
  AC_R,
  { x: 370, y: 310 },
  { x: 40, y: 310 },
  SRC_LEFT,
];

/** 負半週（AC_R 為正）：AC_R→D2→OUT_P→RL→OUT_N→D1→AC_L */
const NEGATIVE_PATH: Point[] = [
  SRC_LEFT,
  { x: 40, y: 310 },
  { x: 370, y: 310 },
  AC_R,
  D2_NEAR,
  D2_FAR,
  OUT_P,
  { x: 280, y: 60 },
  { x: 480, y: 60 },
  RL_TOP,
  RL_BOTTOM,
  { x: 480, y: 300 },
  { x: 280, y: 300 },
  OUT_N,
  D1_NEAR,
  D1_FAR,
  AC_L,
  SRC_RIGHT,
];

const STEP_ACTIVE_DIODES: Record<number, DiodeId[]> = {
  0: ['D3', 'D4'],
  1: ['D1', 'D2'],
  2: ['D3', 'D4'],
  3: ['D3', 'D4'],
};

interface DiodeStyle {
  color: string;
  opacity: number;
}

function diodeStyle(id: DiodeId, step: number): DiodeStyle {
  const isActive = STEP_ACTIVE_DIODES[step].includes(id);
  if (step <= 1) {
    return isActive ? { color: 'var(--blue-600)', opacity: 1 } : { color: 'var(--neutral-300)', opacity: 0.55 };
  }
  if (step === 2) {
    return isActive ? { color: 'var(--text-strong)', opacity: 1 } : { color: 'var(--neutral-300)', opacity: 0.55 };
  }
  // step === 3：導通維持墨色，截止改標逆偏危險色
  return isActive ? { color: 'var(--text-strong)', opacity: 1 } : { color: 'var(--danger-500)', opacity: 0.95 };
}

interface StepInfo {
  title: string;
  description: string;
  dotPath: Point[] | null;
  marker: 'none' | 'vdon' | 'reverse';
}

const STEPS: StepInfo[] = [
  {
    title: '正半週：D3、D4 導通',
    description:
      'AC_L 端電位較高，電流從電源經 D3 流入 OUT_P，穿過負載 RL 後由 OUT_N 經 D4 流回 AC_R。電流方向固定是 OUT_P → RL → OUT_N。',
    dotPath: POSITIVE_PATH,
    marker: 'none',
  },
  {
    title: '負半週：D1、D2 導通',
    description:
      '半週後 AC_R 端電位轉為較高，改由 D2、D1 導通，但電流依然沿 OUT_P → RL → OUT_N 同一方向流過負載，負半週因此被「翻正」。',
    dotPath: NEGATIVE_PATH,
    marker: 'none',
  },
  {
    title: '定電壓模型：路徑上串了兩顆二極體',
    description:
      '不論哪個半週，電流都得先後通過兩顆順偏二極體才能抵達負載，等效多了 2·VD,on 的壓降——這是全波整流器比理想全波多付出的代價，輸出波形在過零附近會出現一小段死區。',
    dotPath: null,
    marker: 'vdon',
  },
  {
    title: '逆向電壓：截止二極體只需承受約 Vp',
    description:
      '正半週時 D1、D2 截止，兩者串聯分攤外加電壓，每顆只需承受約 Vp 的逆向偏壓；半波整流器裡截止的那顆二極體卻得獨自扛下約 2Vp。橋式多一顆二極體的死區，換到漣波減半、逆向耐壓需求減半。',
    dotPath: null,
    marker: 'reverse',
  },
];

const AUTOPLAY_INTERVAL_MS = 2400;

interface DiodeWithLeadsProps {
  id: DiodeId;
  transform: string;
  near: Point;
  far: Point;
  nearAnchor: Point;
  farAnchor: Point;
  style: DiodeStyle;
  labelPos: Point;
}

function DiodeWithLeads({ id, transform, near, far, nearAnchor, farAnchor, style, labelPos }: DiodeWithLeadsProps) {
  return (
    <g opacity={style.opacity}>
      <path
        d={`M${nearAnchor.x},${nearAnchor.y} L${near.x},${near.y}`}
        stroke={style.color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${far.x},${far.y} L${farAnchor.x},${farAnchor.y}`}
        stroke={style.color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <g transform={transform}>
        <g stroke={style.color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,15 H20 M36,15 H60" />
          <path d="M20,7 L20,23 L36,15 Z" fill={style.color} />
          <path d="M36,7 V23" />
        </g>
      </g>
      <text
        x={labelPos.x}
        y={labelPos.y}
        fontSize={12}
        fontFamily="var(--font-mono)"
        fill={style.color}
        textAnchor="middle"
      >
        {id}
      </text>
    </g>
  );
}

function StepButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function EcWeek2BridgeRectifierPaths() {
  const shouldReduceMotion = useReducedMotion();
  const cardDuration = shouldReduceMotion ? 0 : 0.3;
  const dotDuration = shouldReduceMotion ? 0 : 1.2;

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const current = STEPS[step];
  const showHump1 = step >= 0;
  const showHump2 = step >= 1;
  const showDeadZoneMark = step >= 2;

  return (
    <div className="not-prose flex flex-col gap-5">
      <svg
        viewBox="0 0 640 340"
        width="100%"
        role="img"
        aria-label="橋式整流器電流路徑"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 常駐骨幹接線（電源繞線、RL 兩端引線） */}
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
          <path d="M100,180 H190" />
          <path d="M40,180 V310 H370 V180" />
          <path d="M280,90 V60 H480 V150" />
          <path d="M280,270 V300 H480 V210" />
        </g>

        {/* 節點接點（三線交會處） */}
        <g fill="var(--text-strong)">
          <circle cx={AC_L.x} cy={AC_L.y} r={2.5} />
          <circle cx={AC_R.x} cy={AC_R.y} r={2.5} />
          <circle cx={OUT_P.x} cy={OUT_P.y} r={2.5} />
          <circle cx={OUT_N.x} cy={OUT_N.y} r={2.5} />
        </g>

        {/* 電源（AC 正弦源） */}
        <g transform="translate(40 165)">
          <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0,15 H8 M52,15 H60" />
            <circle cx={30} cy={15} r={14} />
            <path d="M20,15 Q25,5 30,15 Q35,25 40,15" />
          </g>
        </g>
        <text x={30} y={210} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)" textAnchor="middle">
          Vin
        </text>

        {/* RL（垂直電阻） */}
        <g transform="translate(450 165) rotate(90 30 15)">
          <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
          </g>
        </g>
        <text x={505} y={184} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)">
          RL
        </text>

        {/* OUT_P / OUT_N 標籤 */}
        <text x={280} y={45} fontSize={12} fontFamily="var(--font-mono)" fill="var(--text-muted)" textAnchor="middle">
          OUT_P
        </text>
        <text x={280} y={330} fontSize={12} fontFamily="var(--font-mono)" fill="var(--text-muted)" textAnchor="middle">
          OUT_N
        </text>

        {/* 四顆二極體（含導線與依步驟變色） */}
        <DiodeWithLeads
          id="D3"
          transform="translate(205 120) rotate(-45 30 15)"
          near={D3_NEAR}
          far={D3_FAR}
          nearAnchor={AC_L}
          farAnchor={OUT_P}
          style={diodeStyle('D3', step)}
          labelPos={{ x: 220, y: 118 }}
        />
        <DiodeWithLeads
          id="D2"
          transform="translate(295 120) rotate(-135 30 15)"
          near={D2_NEAR}
          far={D2_FAR}
          nearAnchor={AC_R}
          farAnchor={OUT_P}
          style={diodeStyle('D2', step)}
          labelPos={{ x: 340, y: 118 }}
        />
        <DiodeWithLeads
          id="D1"
          transform="translate(205 210) rotate(-135 30 15)"
          near={D1_NEAR}
          far={D1_FAR}
          nearAnchor={OUT_N}
          farAnchor={AC_L}
          style={diodeStyle('D1', step)}
          labelPos={{ x: 220, y: 242 }}
        />
        <DiodeWithLeads
          id="D4"
          transform="translate(295 210) rotate(-45 30 15)"
          near={D4_NEAR}
          far={D4_FAR}
          nearAnchor={OUT_N}
          farAnchor={AC_R}
          style={diodeStyle('D4', step)}
          labelPos={{ x: 340, y: 242 }}
        />

        {/* 定電壓模型：VDon 幾何標記（在導通的兩顆二極體旁） */}
        {current.marker === 'vdon' && (
          <g stroke="var(--warning-500)" strokeWidth={2} strokeLinecap="round">
            <line x1={D3_CENTER.x - 4} y1={D3_CENTER.y - 4} x2={D3_CENTER.x + 4} y2={D3_CENTER.y + 4} />
            <line x1={D4_CENTER.x - 4} y1={D4_CENTER.y - 4} x2={D4_CENTER.x + 4} y2={D4_CENTER.y + 4} />
          </g>
        )}

        {/* 逆向電壓：截止二極體的幾何標記 */}
        {current.marker === 'reverse' && (
          <g stroke="var(--danger-500)" strokeWidth={2} strokeLinecap="round">
            <line x1={D1_CENTER.x - 4} y1={D1_CENTER.y + 4} x2={D1_CENTER.x + 4} y2={D1_CENTER.y - 4} />
            <line x1={D2_CENTER.x - 4} y1={D2_CENTER.y + 4} x2={D2_CENTER.x + 4} y2={D2_CENTER.y - 4} />
          </g>
        )}

        {/* 沿路徑流動的小圓點（僅正／負半週步驟） */}
        {current.dotPath &&
          (shouldReduceMotion ? (
            <circle cx={current.dotPath[0].x} cy={current.dotPath[0].y} r={5} fill="var(--blue-600)" />
          ) : (
            <motion.circle
              key={step}
              r={5}
              fill="var(--blue-600)"
              animate={{
                cx: current.dotPath.map((p) => p.x),
                cy: current.dotPath.map((p) => p.y),
              }}
              transition={{ duration: dotDuration, repeat: Infinity, ease: 'linear' }}
            />
          ))}
      </svg>

      <svg
        viewBox="0 0 640 100"
        width="100%"
        role="img"
        aria-label="橋式整流器輸出波形逐步生成"
        preserveAspectRatio="xMidYMid meet"
      >
        <path d="M20,80 H620" stroke="var(--border-subtle)" strokeWidth={1} />
        <text x={4} y={30} fontSize={12} fontFamily="var(--font-mono)" fill="var(--text-muted)">
          Vout
        </text>

        {showHump1 && (
          <motion.path
            d="M60,80 Q190,16 320,80"
            stroke="var(--blue-600)"
            strokeWidth={2.5}
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: cardDuration }}
          />
        )}
        {showHump2 && (
          <motion.path
            d="M320,80 Q450,16 580,80"
            stroke="var(--blue-600)"
            strokeWidth={2.5}
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: cardDuration }}
          />
        )}
        {showDeadZoneMark && (
          <g stroke="var(--warning-500)" strokeWidth={2.5} strokeLinecap="round">
            <line x1={50} y1={80} x2={70} y2={80} />
            <line x1={310} y1={80} x2={330} y2={80} />
            <line x1={570} y1={80} x2={590} y2={80} />
          </g>
        )}
      </svg>

      {/* 圖例（純 DOM，中文） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--blue-600)]" />
          目前導通
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--warning-500)]" />
          串聯壓降 VD,on
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--danger-500)]" />
          截止承受逆偏
        </span>
      </div>

      {/* 步驟控制列 */}
      <div className="flex items-center justify-between gap-3">
        <StepButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} label="上一步">
          <ArrowLeft size={14} />
          上一步
        </StepButton>

        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            第 {step + 1}/{STEPS.length} 步
          </span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? '暫停自動播放' : '開始自動播放'}
            className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1.5 text-[var(--text-strong)] transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>

        <StepButton
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          label="下一步"
        >
          下一步
          <ArrowRight size={14} />
        </StepButton>
      </div>

      {/* 步驟說明卡片：initial={false} 避免首次掛載卡在 opacity:0（見 motion-patterns.md） */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: cardDuration }}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4"
        >
          <div className="text-sm font-semibold text-[var(--text-strong)]">{current.title}</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-body)]">{current.description}</p>

          {step === STEPS.length - 1 && (
            <div className="mt-4 flex items-end gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-20 w-10 items-end justify-center rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]">
                  <div className="w-6 rounded-t-[var(--radius-sm)]" style={{ height: '40%', background: 'var(--blue-500)' }} />
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">橋式：約 Vp</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-20 w-10 items-end justify-center rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]">
                  <div className="w-6 rounded-t-[var(--radius-sm)]" style={{ height: '80%', background: 'var(--danger-500)' }} />
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">半波：約 2Vp</span>
              </div>
              <p className="max-w-[220px] text-[12px] leading-relaxed text-[var(--text-muted)]">
                漣波減半、逆向耐壓需求減半。
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
