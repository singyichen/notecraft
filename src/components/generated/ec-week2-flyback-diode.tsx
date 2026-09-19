import { useEffect, useState, type ReactElement } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Unplug,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
  TriangleAlert,
  CircleCheck,
} from 'lucide-react';

// -----------------------------------------------------------------------
// 「切斷電流」示範：同一顆繼電器線圈，左欄沒有續流二極體、右欄反向並聯一顆。
// 開關打開瞬間，電感不允許電流瞬間中斷（Ir 連續），只有 V1（線圈兩端電壓）
// 會依有沒有續流路徑而走向完全不同的結局。
// -----------------------------------------------------------------------

type Phase = 'idle' | 'running' | 'done';
type Variant = 'noDiode' | 'diode';

const ANIM_MS = 750; // 動畫總長（毫秒），與 rAF 的實際經過時間 1:1 對應

// ── 物理模型 ──────────────────────────────────────────────────────────
const L_H = 0.2; // 電感 L = 200 mH
const I_SS = 0.5; // 切斷前穩態電流 I_ss = 0.5 A
const V_D = 0.7; // 二極體順向壓降
const V_RATING = 30; // 微控制器耐壓線示意值（未過壓 / 過壓的分界，非精確規格）
const TAU_A_MS = 90; // 左欄（無二極體）戲劇化衰減時間常數，見下方 v1A 註解
// 二極體續流路徑讓 Ir 線性下降到 0 所需時間：I_ss·L / V_D ≈ 142.9 ms
const T_OFF_MS = ((I_SS * L_H) / V_D) * 1000;

function irA(t: number): number {
  if (t < 0) return I_SS;
  return I_SS * Math.exp(-t / TAU_A_MS);
}

function v1A(t: number): number {
  if (t < 0) return 0;
  // −100 V 是刻意戲劇化的常數，不是用 L·dIr/dt 算出的真實值——理想模型裡
  // 開路瞬間 dt→0、dI/dt 理論上趨近無限大，V1 沒有明確上界。這裡選一個
  // 「明顯超出 30 V 耐壓線、但仍能畫進圖裡」的峰值，並用跟 Ir 相同的時間
  // 常數衰減，語意是「沒有二極體時，電感只能對著開路的空氣硬放電」。
  return -100 * Math.exp(-t / TAU_A_MS);
}

function irD(t: number): number {
  if (t < 0) return I_SS;
  return Math.max(0, I_SS - (V_D / L_H) * (t / 1000));
}

function v1D(t: number): number {
  if (t < 0) return 0;
  return t < T_OFF_MS ? -V_D : 0;
}

// ── 波形座標映射（兩欄共用同一刻度）───────────────────────────────────
const T_MIN = -100;
const T_MAX = ANIM_MS;
const T_STEP = 10;
const TIMES: number[] = [];
for (let t = T_MIN; t <= T_MAX; t += T_STEP) TIMES.push(t);

const WF_X0 = 34;
const WF_X1 = 254;
function xOf(t: number): number {
  return WF_X0 + ((t - T_MIN) / (T_MAX - T_MIN)) * (WF_X1 - WF_X0);
}

const IR_Y0 = 14; // Ir = 0.5A
const IR_Y1 = 82; // Ir = 0A
function yIr(ir: number): number {
  return IR_Y0 + ((0.5 - ir) / 0.5) * (IR_Y1 - IR_Y0);
}

// V1 y 軸固定 −110 V ~ +20 V，兩欄共用，不可各自調整
const V1_TOP = 20;
const V1_BOTTOM = -110;
const V1_Y0 = 104;
const V1_Y1 = 186;
function yV1(v: number): number {
  return V1_Y0 + ((V1_TOP - v) / (V1_TOP - V1_BOTTOM)) * (V1_Y1 - V1_Y0);
}

function buildPolyline(valueFn: (t: number) => number, yOf: (v: number) => number, visibleT: number): string {
  const pts: string[] = [];
  for (const t of TIMES) {
    if (t > visibleT) break;
    pts.push(`${xOf(t).toFixed(1)},${yOf(valueFn(t)).toFixed(1)}`);
  }
  if (visibleT > T_MIN) {
    pts.push(`${xOf(visibleT).toFixed(1)},${yOf(valueFn(visibleT)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// ── 電路圖 ────────────────────────────────────────────────────────────
function CircuitDiagram({ variant, phase, elapsed }: { variant: Variant; phase: Phase; elapsed: number }): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const switchOpen = phase !== 'idle';
  const conducting = variant === 'diode' && phase !== 'idle' && elapsed < T_OFF_MS;
  const showSpark = variant === 'noDiode' && phase !== 'idle' && elapsed < 200;
  const bladeTarget = switchOpen ? { x2: 165, y2: 145 } : { x2: 140, y2: 165 };
  const diodeColor = conducting ? 'var(--blue-500)' : 'var(--text-strong)';

  return (
    <div className="relative">
      <svg
        viewBox="0 0 260 220"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          variant === 'noDiode'
            ? '無二極體的繼電器線圈電路，開關切斷後電感沒有續流路徑'
            : '反向並聯二極體的繼電器線圈電路，開關切斷後電流改走二極體續流'
        }
      >
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* 微控制器 */}
          <rect x={8} y={96} width={48} height={30} rx={6} />
          <text x={32} y={115} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">
            MCU
          </text>

          {/* 控制訊號線（只是控制訊號，與主迴路分開） */}
          <path d="M56,111 H100 V130 H140" stroke="var(--neutral-400)" strokeDasharray="3 3" strokeWidth={1} />

          {/* 外側回路線：電源 → 開關下方共同接地節點 */}
          <path d="M140,8 H60 V170" />

          {/* 電源 Vs */}
          <path d="M140,8 V20" />
          <path d="M128,20 H152" strokeWidth={1.5} />
          <path d="M133,26 H147" strokeWidth={4} />
          <path d="M128,33 H152" strokeWidth={1.5} />
          <path d="M133,39 H147" strokeWidth={4} />
          <path d="M140,39 V55" />
          <text x={154} y={30} fontSize={10} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">
            Vs
          </text>

          {/* 節點 N1（電感上端） */}
          <circle cx={140} cy={55} r={2.5} fill="var(--text-strong)" />

          {/* 電感 L */}
          <path d="M140,55 V60" />
          <path d="M140,60 a7,5 0 0 1 0,10 a7,5 0 0 1 0,10 a7,5 0 0 1 0,10 a7,5 0 0 1 0,10" />
          <path d="M140,100 V115" />
          <text x={150} y={90} fontSize={10} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">
            L
          </text>

          {/* 節點 N_A（電感下端） */}
          <circle cx={140} cy={115} r={2.5} fill="var(--text-strong)" />

          {variant === 'diode' ? (
            <g stroke={diodeColor} strokeWidth={conducting ? 2.25 : 1.5} style={{ transition: 'stroke 200ms ease-out, stroke-width 200ms ease-out' }}>
              {/* 陰極朝上：正常運作時逆偏（阻斷），切斷瞬間線圈電壓反轉，
                  電流改由下端節點續流至上端節點（由下往上導通）。 */}
              <path d="M140,55 H190" />
              <g transform="translate(160 70) rotate(-90 30 15)">
                <path d="M0,15 H20 M36,15 H60" />
                <path d="M20,7 L20,23 L36,15 Z" fill={diodeColor} stroke="none" />
                <path d="M36,7 V23" />
              </g>
              <path d="M190,115 H140" />
              <text x={198} y={90} fontSize={10} fontFamily="var(--font-mono)" stroke="none" fill={diodeColor}>
                D
              </text>
            </g>
          ) : null}

          {/* 開關樞紐與固定觸點 */}
          <path d="M140,115 V130" />
          <circle cx={140} cy={130} r={2} fill="var(--text-strong)" />
          <circle cx={140} cy={170} r={2} fill="var(--text-strong)" />

          {/* 接地 */}
          <g transform="translate(125 170)">
            <path d="M15,0 V10" />
            <path d="M5,10 H25 M8,14 H22 M11,18 H19" />
          </g>
        </g>

        {/* 開關可動觸點：補間數值而非改寫 path d */}
        <motion.line
          x1={140}
          y1={130}
          animate={{ x2: bladeTarget.x2, y2: bladeTarget.y2 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: 'easeOut' }}
          stroke="var(--text-strong)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>

      {variant === 'noDiode' ? (
        <AnimatePresence initial={false}>
          {showSpark ? (
            <motion.div
              key="spark"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="pointer-events-none absolute"
              style={{ left: '58%', top: '50%', color: 'var(--danger-500)' }}
              aria-hidden
            >
              <Zap size={20} fill="var(--danger-500)" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}

// ── 波形圖 ────────────────────────────────────────────────────────────
function Waveform({ variant, phase, elapsed }: { variant: Variant; phase: Phase; elapsed: number }): ReactElement {
  const visibleT = phase === 'idle' ? 0 : elapsed;
  const irFn = variant === 'noDiode' ? irA : irD;
  const v1Fn = variant === 'noDiode' ? v1A : v1D;
  const irColor = 'var(--blue-600)';
  const v1Color = variant === 'noDiode' ? 'var(--danger-500)' : 'var(--success-500)';

  const irPts = buildPolyline(irFn, yIr, visibleT);
  const v1Pts = buildPolyline(v1Fn, yV1, visibleT);
  const headT = Math.min(Math.max(visibleT, T_MIN), T_MAX);
  const showHead = phase !== 'idle';

  return (
    <svg
      viewBox="0 0 260 200"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={variant === 'noDiode' ? '無二極體時的 Ir 與 V1 波形' : '反向並聯二極體時的 Ir 與 V1 波形'}
    >
      {/* Ir 軌道基準線與刻度 */}
      <line x1={WF_X0} y1={IR_Y1} x2={WF_X1} y2={IR_Y1} stroke="var(--border-subtle)" strokeWidth={1} />
      <text x={2} y={IR_Y0 + 4} fontSize={8} fontFamily="var(--font-mono)" fill="var(--text-muted)">
        0.5A
      </text>
      <text x={6} y={IR_Y1 + 3} fontSize={8} fontFamily="var(--font-mono)" fill="var(--text-muted)">
        0
      </text>
      <text x={2} y={IR_Y0 - 6} fontSize={8} fontFamily="var(--font-mono)" fill="var(--text-muted)">
        Ir
      </text>

      {/* V1 軌道：0V 基準、耐壓虛線（兩欄共用 −110V ~ +20V 刻度） */}
      <line x1={WF_X0} y1={yV1(0)} x2={WF_X1} y2={yV1(0)} stroke="var(--border-subtle)" strokeWidth={1} />
      <line x1={WF_X0} y1={yV1(-V_RATING)} x2={WF_X1} y2={yV1(-V_RATING)} stroke="var(--warning-500)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={WF_X1 - 46} y={yV1(-V_RATING) - 3} fontSize={8} fontFamily="var(--font-mono)" fill="var(--warning-500)">
        -30V 耐壓
      </text>
      <text x={2} y={V1_Y0 - 6} fontSize={8} fontFamily="var(--font-mono)" fill="var(--text-muted)">
        V1
      </text>

      {/* 切斷瞬間標線 */}
      <line x1={xOf(0)} y1={IR_Y0 - 8} x2={xOf(0)} y2={V1_Y1} stroke="var(--border-default)" strokeWidth={1} strokeDasharray="2 3" />

      <polyline points={irPts} fill="none" stroke={irColor} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={v1Pts} fill="none" stroke={v1Color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />

      {showHead ? (
        <>
          <circle cx={xOf(headT)} cy={yIr(irFn(headT))} r={2.5} fill={irColor} />
          <circle cx={xOf(headT)} cy={yV1(v1Fn(headT))} r={2.5} fill={v1Color} />
        </>
      ) : null}
    </svg>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────────
export default function FlybackDiode(): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const e = Math.min(ANIM_MS, now - start);
      setElapsed(e);
      if (e < ANIM_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const handleCut = (): void => {
    if (phase === 'running') return;
    if (shouldReduceMotion) {
      setElapsed(ANIM_MS);
      setPhase('done');
      return;
    }
    setElapsed(0);
    setPhase('running');
  };

  const statusText =
    phase === 'idle'
      ? '穩定運轉中，尚未切斷電流。'
      : phase === 'running'
        ? `已切斷電流，動畫播放中（經過約 ${Math.round(elapsed)} 毫秒）。`
        : '動畫播放完畢：左欄沒有二極體時出現超出耐壓線的高壓尖峰，右欄的二極體把電壓夾在約 -0.7 伏特。';

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleCut}
          disabled={phase === 'running'}
          className="inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
          style={{
            background: 'var(--action-primary)',
            color: 'var(--text-on-brand)',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            padding: '9px 20px',
            cursor: phase === 'running' ? 'default' : 'pointer',
          }}
        >
          {phase === 'done' ? <RotateCcw size={16} /> : <Unplug size={16} />}
          {phase === 'done' ? '重播' : phase === 'running' ? '切斷中…' : '切斷電流'}
        </button>
        <span className="sr-only" aria-live="polite">
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--danger-500)' }}>
            <ShieldAlert size={16} />
            沒有二極體
          </div>
          <CircuitDiagram variant="noDiode" phase={phase} elapsed={elapsed} />
          <Waveform variant="noDiode" phase={phase} elapsed={elapsed} />
          <AnimatePresence initial={false}>
            {phase === 'done' ? (
              <motion.div
                key="chip-left"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold"
                style={{ background: 'var(--danger-50)', color: 'var(--danger-500)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}
              >
                <TriangleAlert size={14} />
                尖峰 -100V，超出耐壓線
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--success-500)' }}>
            <ShieldCheck size={16} />
            反向並聯二極體
          </div>
          <CircuitDiagram variant="diode" phase={phase} elapsed={elapsed} />
          <Waveform variant="diode" phase={phase} elapsed={elapsed} />
          <AnimatePresence initial={false}>
            {phase === 'done' ? (
              <motion.div
                key="chip-right"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold"
                style={{ background: 'var(--success-50)', color: 'var(--success-500)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}
              >
                <CircleCheck size={14} />
                夾在 -0.7V，安全
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
