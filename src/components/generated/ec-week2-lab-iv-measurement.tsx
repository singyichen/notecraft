import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RotateCcw, Info } from 'lucide-react';

type Mode = 'forward' | 'reverse';

interface Sample {
  mode: Mode;
  vs: number;
  vd: number;
  i: number;
}

// 數值模型：1N4007 簡化指數模型，僅供教學示意，不對應真實 datasheet 參數
const IS = 1e-9; // A
const VT = 0.026; // V（熱電壓）
const R = 1000; // Ω（限流電阻）
const MAX_HISTORY = 500;
// 導通電壓判定：以 IS = 1e-9 A 計算，實際導通電壓約落在 0.35–0.40 V 附近，
// 不是常見手算捷徑的 0.7 V；因此不能寫死「VD > 0.6」，
// 改用「順偏量測中電流首次達到 1 mA」這個更貼近物理定義的門檻。
const KNEE_CURRENT = 0.001; // A

/** 順偏：Vs = VD + I·R 與 Shockley 方程式聯立，用二分法求解 VD */
function solveForward(vs: number): { vd: number; i: number } {
  if (vs <= 0) return { vd: 0, i: 0 };
  let lo = 0;
  let hi = vs;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    const i = IS * (Math.exp(mid / VT) - 1);
    if (mid + i * R - vs > 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const vd = (lo + hi) / 2;
  return { vd, i: IS * (Math.exp(vd / VT) - 1) };
}

/** 逆偏：二極體視為近乎開路，電流固定為 -IS，跨壓幾乎等於 -Vs */
function solveReverse(vs: number): { vd: number; i: number } {
  return { vd: -vs, i: -IS };
}

function solve(mode: Mode, vs: number): { vd: number; i: number } {
  return mode === 'forward' ? solveForward(vs) : solveReverse(vs);
}

function formatCurrent(amps: number): string {
  const abs = Math.abs(amps);
  if (abs === 0) return '0 mA';
  if (abs >= 1e-3) return `${(amps * 1e3).toFixed(2)} mA`;
  if (abs >= 1e-6) return `${(amps * 1e6).toFixed(2)} µA`;
  return `${(amps * 1e9).toFixed(2)} nA`;
}

// IV 曲線座標系
const IV_W = 320;
const IV_H = 260;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 300;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 210;
const VD_MIN = -31;
const VD_MAX = 1;
const I_MIN = -1;
const I_MAX = 6;

function xScale(vd: number): number {
  const clamped = Math.min(VD_MAX, Math.max(VD_MIN, vd));
  return PLOT_LEFT + ((clamped - VD_MIN) / (VD_MAX - VD_MIN)) * (PLOT_RIGHT - PLOT_LEFT);
}

function yScale(iMa: number): number {
  const clamped = Math.min(I_MAX, Math.max(I_MIN, iMa));
  return PLOT_BOTTOM - ((clamped - I_MIN) / (I_MAX - I_MIN)) * (PLOT_BOTTOM - PLOT_TOP);
}

const VD_TICKS = [-30, -20, -10, 0];
const I_TICKS = [0, 2, 4, 6];

export default function EcWeek2LabIvMeasurement() {
  const [mode, setMode] = useState<Mode>('forward');
  const [vs, setVs] = useState(0);
  const [history, setHistory] = useState<Sample[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const tableRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const current = useMemo(() => solve(mode, vs), [mode, vs]);

  const vsMax = mode === 'forward' ? 5 : 30;
  const vsStep = mode === 'forward' ? 0.1 : 1;

  function handleModeChange(next: Mode) {
    setMode(next);
    setVs(0);
    // 切換順偏／逆偏刻意不清空 history：兩段資料疊加起來才是完整的 I-V 曲線。
  }

  function handleVsChange(nextVs: number) {
    setVs(nextVs);
    const sample = solve(mode, nextVs);
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.mode === mode && last.vs === nextVs) return prev;
      const next = [...prev, { mode, vs: nextVs, vd: sample.vd, i: sample.i }];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }

  function handleClear() {
    setHistory([]);
    setVs(0);
  }

  useEffect(() => {
    const el = tableRef.current;
    if (el && isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [history.length]);

  const kneeSample = useMemo(
    () => history.find((s) => s.mode === 'forward' && s.i >= KNEE_CURRENT),
    [history]
  );

  const visibleRows = history.slice(-10);

  const vdAbs = Math.abs(current.vd);
  const irAbs = Math.abs(current.i) * R;
  const vdPct = vs > 0 ? Math.min(100, (vdAbs / vs) * 100) : 0;
  const irPct = vs > 0 ? Math.min(100 - vdPct, (irAbs / vs) * 100) : 0;

  const flipDuration = shouldReduceMotion ? 0 : 0.25;

  const linePoints = history
    .map((s) => `${xScale(s.vd).toFixed(1)},${yScale(s.i * 1000).toFixed(1)}`)
    .join(' ');

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* 模式切換 + Vs 滑桿 */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('forward')}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'forward' ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              順偏
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('reverse')}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'reverse' ? 'bg-neutral-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              逆偏
            </button>
          </div>
          <span className="text-sm font-mono text-neutral-600">
            Vs = {vs.toFixed(mode === 'forward' ? 1 : 0)} V
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={vsMax}
          step={vsStep}
          value={vs}
          onChange={(e) => handleVsChange(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="電源電壓 Vs 滑桿"
        />
      </div>

      {/* 電路圖 + IV 曲線 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <svg
            viewBox="0 0 260 180"
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="順偏或逆偏量測電路：電源 Vs 經二極體 D1 與電阻 R 回到接地"
          >
            <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* 迴路接線 */}
              <path d="M40,15 H90" />
              <path d="M150,15 H210 V150" />
              <path d="M210,150 H150" />
              <path d="M90,150 H40 V75" />
              <path d="M65,150 V160" />
            </g>

            {/* 電源 Vs（垂直放置） */}
            <g transform="translate(10 30) rotate(90 30 15)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
                <path d="M0,15 H22 M37,15 H60" />
                <path d="M22,5 V25" />
                <path d="M27,10 V20" strokeWidth={4} />
                <path d="M32,5 V25" />
                <path d="M37,10 V20" strokeWidth={4} />
              </g>
            </g>
            <text x={2} y={45} fontSize={10} fontFamily="var(--font-mono)" fill="var(--text-strong)">
              Vs
            </text>

            {/* 二極體 D1：逆偏時整組繞符號中心翻轉 180 度 */}
            <g transform="translate(90 0)">
              <motion.g
                style={{ transformOrigin: '30px 15px' }}
                animate={{ rotate: mode === 'reverse' ? 180 : 0 }}
                transition={{ duration: flipDuration, ease: 'easeOut' }}
              >
                <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0,15 H20 M36,15 H60" />
                  <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
                  <path d="M36,7 V23" />
                </g>
              </motion.g>
            </g>
            <text x={100} y={32} fontSize={10} fontFamily="var(--font-mono)" fill="var(--text-strong)">
              D1
            </text>

            {/* 電阻 R（IEC 方框版） */}
            <g transform="translate(90 135)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,15 H15 M45,15 H60" />
                <rect x={15} y={8} width={30} height={14} />
              </g>
            </g>
            <text x={112} y={130} fontSize={10} fontFamily="var(--font-mono)" fill="var(--text-strong)">
              R
            </text>

            {/* 接地 */}
            <g transform="translate(50 160)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
                <path d="M15,0 V10" />
                <path d="M5,10 H25 M8,14 H22 M11,18 H19" />
              </g>
            </g>

            {/* VD / I 量測位置標示 */}
            <text x={155} y={8} fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-500)">
              VD
            </text>
            <text x={214} y={90} fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-500)">
              I
            </text>
          </svg>
          <div className="text-xs font-mono text-neutral-600">
            VD = {current.vd.toFixed(3)} V ・ I = {formatCurrent(current.i)}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${IV_W} ${IV_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="I-V 特性曲線：橫軸二極體跨壓 VD，縱軸電流 I"
        >
          <rect
            x={PLOT_LEFT}
            y={PLOT_TOP}
            width={PLOT_RIGHT - PLOT_LEFT}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill="none"
            stroke="var(--neutral-200)"
          />
          {/* VD = 0 / I = 0 參考虛線 */}
          <line
            x1={xScale(0)}
            y1={PLOT_TOP}
            x2={xScale(0)}
            y2={PLOT_BOTTOM}
            stroke="var(--neutral-300)"
            strokeDasharray="3 3"
          />
          <line
            x1={PLOT_LEFT}
            y1={yScale(0)}
            x2={PLOT_RIGHT}
            y2={yScale(0)}
            stroke="var(--neutral-300)"
            strokeDasharray="3 3"
          />

          {VD_TICKS.map((t) => (
            <g key={`vd-${t}`}>
              <line x1={xScale(t)} y1={PLOT_BOTTOM} x2={xScale(t)} y2={PLOT_BOTTOM + 4} stroke="var(--neutral-400)" />
              <text
                x={xScale(t)}
                y={PLOT_BOTTOM + 14}
                fontSize={8}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
              >
                {t}
              </text>
            </g>
          ))}
          {I_TICKS.map((t) => (
            <g key={`i-${t}`}>
              <line x1={PLOT_LEFT - 4} y1={yScale(t)} x2={PLOT_LEFT} y2={yScale(t)} stroke="var(--neutral-400)" />
              <text
                x={PLOT_LEFT - 7}
                y={yScale(t) + 3}
                fontSize={8}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
              >
                {t}
              </text>
            </g>
          ))}

          {history.length > 1 && <polyline points={linePoints} fill="none" stroke="var(--neutral-300)" strokeWidth={1} />}

          {history.map((s, idx) => (
            <circle
              key={idx}
              cx={xScale(s.vd)}
              cy={yScale(s.i * 1000)}
              r={2.5}
              fill={s.mode === 'forward' ? 'var(--blue-500)' : 'var(--neutral-500)'}
            />
          ))}

          {kneeSample && (
            <circle cx={xScale(kneeSample.vd)} cy={yScale(kneeSample.i * 1000)} r={4} fill="var(--warning-500)" />
          )}
        </svg>
      </div>

      {kneeSample && (
        <div className="inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-[var(--warning-50)] text-[var(--warning-500)]">
          導通電壓 ≈ {kneeSample.vd.toFixed(2)} V
        </div>
      )}

      {mode === 'reverse' && (
        <div className="flex items-start gap-2 rounded-md p-3 text-xs bg-[var(--info-50)] text-[var(--info-500)]">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>1N4007 崩潰電壓 1000 V，本實驗電源最高 32 V，量不到崩潰。</span>
        </div>
      )}

      {/* Vs 堆疊長條：一眼看出多出來的電壓掉在哪 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Vs 分配：VD（二極體跨壓）與 I·R（電阻壓降）</span>
        </div>
        <div className="h-7 w-full overflow-hidden rounded-md bg-neutral-100 flex">
          {vs === 0 ? (
            <div className="h-full w-full bg-neutral-200" />
          ) : (
            <>
              <div className="h-full bg-blue-500" style={{ width: `${vdPct}%` }} />
              <div className="h-full bg-orange-500" style={{ width: `${irPct}%` }} />
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-600">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> VD {vdAbs.toFixed(3)} V
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> I·R {irAbs.toFixed(3)} V
          </span>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-pill border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <RotateCcw size={13} />
          清除紀錄
        </button>
      </div>

      {/* 量測表 */}
      <div
        ref={tableRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="max-h-60 overflow-y-auto rounded-md border border-neutral-200"
      >
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">模式</th>
              <th className="px-2 py-1.5 text-right font-medium">Vs (V)</th>
              <th className="px-2 py-1.5 text-right font-medium">VD (V)</th>
              <th className="px-2 py-1.5 text-right font-medium">I</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-center text-neutral-400 font-sans">
                  拖動上方滑桿開始量測
                </td>
              </tr>
            )}
            {visibleRows.map((s, idx) => (
              <tr key={idx} className="border-t border-neutral-100">
                <td className="px-2 py-1.5">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-[10px] font-sans font-medium ${
                      s.mode === 'forward' ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {s.mode === 'forward' ? '順偏' : '逆偏'}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{s.vs.toFixed(mode === 'forward' ? 1 : 0)}</td>
                <td className="px-2 py-1.5 text-right">{s.vd.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-right">{formatCurrent(s.i)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
