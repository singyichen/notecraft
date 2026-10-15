import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

type MVal = 2 | 3 | 4;
type PVal = 0 | 1 | 2 | 3;
type SVal = 1 | 2 | 3;

const X: readonly number[] = [3, 2, 1, 7, 1, 2, 5, 4];
const KERNEL_BASE: readonly number[] = [0.5, 0.75, 1, 0.25];

const M_OPTIONS: readonly MVal[] = [2, 3, 4];
const P_OPTIONS: readonly PVal[] = [0, 1, 2, 3];
const S_OPTIONS: readonly SVal[] = [1, 2, 3];

const CELL = 36;
const GAP = 4;

function kernelLabel(v: number): string {
  if (v === 0.5) return '1/2';
  if (v === 0.75) return '3/4';
  if (v === 0.25) return '1/4';
  return String(v);
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  let s = v.toFixed(2);
  s = s.replace(/0+$/, '');
  if (s.endsWith('.')) s = s.slice(0, -1);
  return s;
}

function computeO(m: number, p: number, s: number): number {
  return Math.floor((X.length + 2 * p - m) / s) + 1;
}

interface SegmentedControlProps<T extends number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}

function SegmentedControl<T extends number>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          minWidth: 20,
        }}
      >
        {label}
      </span>
      <div className="flex" style={{ gap: 2 }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={clsx('transition-colors')}
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                border: active ? '1px solid var(--blue-500)' : '1px solid var(--border-subtle)',
                background: active ? 'var(--blue-500)' : 'var(--surface-card)',
                color: active ? '#ffffff' : 'var(--text-body)',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MlWeek11ConvStepper() {
  const shouldReduceMotion = useReducedMotion();
  const [m, setM] = useState<MVal>(4);
  const [p, setP] = useState<PVal>(0);
  const [s, setS] = useState<SVal>(2);
  const [completed, setCompleted] = useState(0);
  const [outputs, setOutputs] = useState<(number | null)[]>(() => Array(computeO(4, 0, 2)).fill(null));

  const o = useMemo(() => computeO(m, p, s), [m, p, s]);

  const paddedInput = useMemo(
    () => [...Array(p).fill(0), ...X, ...Array(p).fill(0)],
    [p],
  );
  const kernel = useMemo(() => KERNEL_BASE.slice(0, m), [m]);
  const kernelReversed = useMemo(() => [...kernel].reverse(), [kernel]);

  // 旋鈕改變時重置步進
  useEffect(() => {
    setCompleted(0);
    setOutputs(Array(o).fill(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, p, s, o]);

  const windowStart = Math.min(completed, o - 1) * s;

  const currentSum = useMemo(() => {
    let sum = 0;
    for (let j = 0; j < kernelReversed.length; j += 1) {
      sum += paddedInput[windowStart + j] * kernelReversed[j];
    }
    return sum;
  }, [paddedInput, kernelReversed, windowStart]);

  const done = completed >= o;

  const handleNext = () => {
    if (done) return;
    setOutputs((prev) => {
      const next = [...prev];
      next[completed] = currentSum;
      return next;
    });
    setCompleted((c) => c + 1);
  };

  const handleReset = () => {
    setCompleted(0);
    setOutputs(Array(o).fill(null));
  };

  const formulaParts = kernelReversed
    .map((w, j) => `${formatNumber(paddedInput[windowStart + j])}×${kernelLabel(w)}`)
    .join(' + ');

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {/* 旋鈕列 */}
      <div className="flex flex-wrap gap-[var(--space-3)]">
        <SegmentedControl label="m" options={M_OPTIONS} value={m} onChange={setM} />
        <SegmentedControl label="p" options={P_OPTIONS} value={p} onChange={setP} />
        <SegmentedControl label="s" options={S_OPTIONS} value={s} onChange={setS} />
      </div>

      {/* 公式列：輸出長度 */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-strong)',
        }}
      >
        o = ⌊(8 + {2 * p} − {m}) / {s}⌋ + 1 = {o}
      </div>

      {/* 輸入格子 + 覆蓋視窗 */}
      <div style={{ position: 'relative', paddingTop: 22 }}>
        <div className="flex" style={{ gap: GAP }}>
          {paddedInput.map((val, i) => {
            const isPad = i < p || i >= p + X.length;
            return (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 'var(--radius-sm)',
                  border: isPad
                    ? '1px dashed var(--border-subtle)'
                    : '1px solid var(--border-default)',
                  color: isPad ? 'var(--text-muted)' : 'var(--text-strong)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  flexShrink: 0,
                }}
              >
                {val}
              </div>
            );
          })}
        </div>

        <motion.div
          className="flex items-center justify-center"
          style={{
            position: 'absolute',
            top: 0,
            height: CELL + 22,
            width: m * CELL + (m - 1) * GAP,
            border: '1.5px solid var(--blue-500)',
            background: 'var(--blue-50)',
            opacity: 0.85,
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none',
          }}
          animate={{ left: windowStart * (CELL + GAP) }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="flex absolute"
            style={{ top: 0, gap: GAP, left: 0 }}
          >
            {kernelReversed.map((w, j) => (
              <div
                key={j}
                className="flex items-center justify-center"
                style={{
                  width: CELL,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--blue-700)',
                  fontWeight: 600,
                }}
              >
                {kernelLabel(w)}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 算式列 */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-body)',
          wordBreak: 'break-all',
        }}
      >
        {formulaParts} = {formatNumber(currentSum)}
      </div>

      {/* 輸出格子 */}
      <div className="flex flex-wrap" style={{ gap: GAP }}>
        {Array.from({ length: o }).map((_, i) => {
          const value = outputs[i];
          const isNext = i === completed && !done;
          const isDone = value !== null && value !== undefined;
          return (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 'var(--radius-sm)',
                border: isNext
                  ? '1.5px solid var(--orange-400)'
                  : isDone
                    ? '1px solid var(--border-default)'
                    : '1px dashed var(--border-subtle)',
                background: isDone ? 'var(--surface-sunken)' : 'transparent',
                color: isDone ? 'var(--text-strong)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                flexShrink: 0,
              }}
            >
              {isDone ? formatNumber(value) : ''}
            </div>
          );
        })}
      </div>

      {/* 按鈕列 */}
      <div className="flex items-center gap-[var(--space-3)] flex-wrap">
        <button
          type="button"
          onClick={handleNext}
          disabled={done}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: done ? 'var(--neutral-200)' : 'var(--action-primary)',
            color: done ? 'var(--text-muted)' : '#ffffff',
            fontWeight: 600,
            cursor: done ? 'default' : 'pointer',
          }}
        >
          下一步
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)',
            color: 'var(--text-body)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
        {done && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            移動了 {o} 次，所以輸出有 {o} 格
          </span>
        )}
      </div>
    </div>
  );
}
