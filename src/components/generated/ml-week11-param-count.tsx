import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts';
import { Lock } from 'lucide-react';
import { clsx } from 'clsx';

type MVal = 3 | 5 | 7;

const M_OPTIONS: readonly MVal[] = [3, 5, 7];
const N_MIN = 8;
const N_MAX = 256;
const N_DEFAULT = 28;
const M_DEFAULT: MVal = 5;

const C_IN = 3;
const C_OUT = 5;

function computeConv(m: number): number {
  return m * m * C_IN * C_OUT + C_OUT;
}

function computeFc(n: number): number {
  const area = n * n;
  return area * area * C_IN * C_OUT + area * C_OUT;
}

function formatThousands(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}

function formatCompact(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return formatThousands(v);
}

function useCountUp(target: number, reduceMotion: boolean | null): number {
  const [value, setValue] = useState(target);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const prevRef = useRef(target);

  useEffect(() => {
    controlsRef.current?.stop();
    if (reduceMotion) {
      setValue(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current;
    controlsRef.current = animate(from, target, {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
      onComplete: () => {
        prevRef.current = target;
      },
    });
    return () => {
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduceMotion]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  return value;
}

interface BarDatum {
  name: string;
  value: number;
  key: 'conv' | 'fc';
}

export default function MlWeek11ParamCount() {
  const shouldReduceMotion = useReducedMotion();
  const [n, setN] = useState(N_DEFAULT);
  const [m, setM] = useState<MVal>(M_DEFAULT);

  const conv = useMemo(() => computeConv(m), [m]);
  const fc = useMemo(() => computeFc(n), [n]);
  const ratio = fc / conv;

  const convDisplay = useCountUp(conv, shouldReduceMotion);
  const fcDisplay = useCountUp(fc, shouldReduceMotion);

  const chartData: BarDatum[] = useMemo(
    () => [
      { name: '卷積層', value: conv, key: 'conv' },
      { name: '全連接層', value: fc, key: 'fc' },
    ],
    [conv, fc],
  );

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {/* 控制列 */}
      <div className="flex flex-col gap-[var(--space-3)]">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="nc-week11-n"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}
          >
            影像邊長 n = <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{n}</span>
          </label>
          <input
            id="nc-week11-n"
            type="range"
            min={N_MIN}
            max={N_MAX}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--orange-400)' }}
            aria-label="影像邊長 n"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            核邊長 m
          </span>
          <div className="flex" style={{ gap: 2 }}>
            {M_OPTIONS.map((opt) => {
              const active = opt === m;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setM(opt)}
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
      </div>

      {/* 數字卡列 */}
      <div className="flex gap-[var(--space-4)]">
        <div
          className="flex-1 flex flex-col gap-1"
          style={{
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontWeight: 600 }}>
            卷積層
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all',
            }}
          >
            {m} × {m} × {C_IN} × {C_OUT} + {C_OUT} = {formatThousands(conv)}
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--blue-700)',
            }}
          >
            {formatThousands(convDisplay)}
          </div>
          <div
            className="flex items-center gap-1.5"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--blue-700)',
              background: 'var(--surface-brand-soft)',
              borderRadius: 'var(--radius-pill)',
              padding: '2px 9px',
              width: 'fit-content',
            }}
          >
            <Lock size={14} />
            與影像大小無關
          </div>
        </div>

        <div
          className="flex-1 flex flex-col gap-1"
          style={{
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontWeight: 600 }}>
            全連接層
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all',
            }}
          >
            ({n} × {n})² × {C_IN} × {C_OUT} + {n} × {n} × {C_OUT} = {formatThousands(fc)}
          </div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--orange-500)',
            }}
          >
            {formatThousands(fcDisplay)}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            是卷積層的 {formatThousands(ratio)} 倍
          </div>
        </div>
      </div>

      {/* 圖表區 */}
      <div className="flex flex-col gap-1">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 20, right: 12, bottom: 0, left: -12 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              stroke="var(--neutral-300)"
            />
            <YAxis
              scale="log"
              domain={[100, 1e11]}
              ticks={[1e2, 1e4, 1e6, 1e8, 1e10]}
              tickFormatter={(value: number) => formatCompact(value)}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              stroke="var(--neutral-300)"
              width={42}
            />
            <Bar dataKey="value" isAnimationActive={!shouldReduceMotion} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.key === 'conv' ? 'var(--blue-500)' : 'var(--orange-400)'}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value: number) => formatCompact(value)}
                style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--text-strong)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          對數座標：每一格高度代表 100 倍差距
        </div>
      </div>
    </div>
  );
}
