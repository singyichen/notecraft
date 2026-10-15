import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { Check, X } from 'lucide-react';
import { clsx } from 'clsx';

type ClassKey = 'A' | 'B' | 'C' | 'D';

const CLASS_ORDER: ClassKey[] = ['A', 'B', 'C', 'D'];
const CORRECT_CLASS: ClassKey = 'B';

const P_MIN = 0.01;
const P_MAX = 0.99;
const P_DEFAULT = 0.6;

interface CurvePoint {
  p: number;
  loss: number;
}

function buildCurve(): CurvePoint[] {
  const points: CurvePoint[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i += 1) {
    const p = Math.max(0.01, (i / steps) * 1.0);
    points.push({ p: Math.round(p * 1000) / 1000, loss: -Math.log(p) });
  }
  return points;
}

const CURVE_DATA = buildCurve();

function clampP(value: number): number {
  return Math.min(P_MAX, Math.max(P_MIN, value));
}

export default function MlWeek10CrossEntropy() {
  const shouldReduceMotion = useReducedMotion();
  const [p, setP] = useState(P_DEFAULT);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const others = (1 - p) / 3;
  const yHat: Record<ClassKey, number> = {
    A: others,
    B: p,
    C: others,
    D: others,
  };
  const lossB = -Math.log(p);

  const handleSliderChange = (nextP: number) => {
    controlsRef.current?.stop();
    setP(clampP(nextP));
  };

  const handleQuickSet = (target: number) => {
    controlsRef.current?.stop();
    if (shouldReduceMotion) {
      setP(target);
      return;
    }
    const from = p;
    controlsRef.current = animate(from, target, {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setP(value),
    });
  };

  const sliderValue = Math.round(p * 100);

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* 區塊 1：四類別長條 */}
      <div className="flex gap-[var(--space-4)]">
        {CLASS_ORDER.map((cls) => {
          const isCorrect = cls === CORRECT_CLASS;
          const prob = yHat[cls];
          const pct = Math.max(prob * 100, 1.5);
          return (
            <div key={cls} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="flex flex-col items-center"
                style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  y_{cls} = {isCorrect ? 1 : 0}
                </span>
                <span
                  style={{
                    color: isCorrect ? 'var(--orange-700)' : 'var(--text-body)',
                    fontWeight: isCorrect ? 600 : 400,
                  }}
                >
                  ŷ_{cls} = {prob.toFixed(2)}
                </span>
              </div>
              <div
                className="w-full flex items-end"
                style={{ height: 160, background: 'var(--neutral-100)', borderRadius: 'var(--radius-sm)' }}
              >
                <motion.div
                  className={clsx('w-full')}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    background: isCorrect ? 'var(--orange-400)' : 'var(--neutral-300)',
                  }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div
                className="flex flex-col items-center text-center"
                style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}
              >
                {isCorrect ? (
                  <span style={{ color: 'var(--orange-700)', fontWeight: 600 }}>
                    −log(p) = {lossB.toFixed(3)}
                  </span>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>
                      −0·log(ŷ_{cls}) = 0
                    </span>
                    <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>× 0 消失</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 區塊 2：−log(p) 曲線 */}
      <div className="flex flex-col gap-2">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={CURVE_DATA} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
            <XAxis
              type="number"
              dataKey="p"
              domain={[0.01, 1]}
              ticks={[0.01, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => value.toFixed(2)}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              stroke="var(--neutral-300)"
            />
            <YAxis
              domain={[0, 4.7]}
              ticks={[0, 1, 2, 3, 4]}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              stroke="var(--neutral-300)"
              width={28}
            />
            <Line
              type="monotone"
              dataKey="loss"
              stroke="var(--blue-500)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine x={p} stroke="var(--neutral-400)" strokeDasharray="4 4" />
            <ReferenceDot x={p} y={lossB} r={5} fill="var(--orange-400)" stroke="#ffffff" strokeWidth={1.5} isFront />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          p 越接近 1，損失越接近 0；p 很小時，損失急遽上升
        </div>
      </div>

      {/* 區塊 3：控制列 */}
      <div className="flex flex-col gap-2">
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>
          p = {p.toFixed(2)}
        </div>
        <input
          type="range"
          min={1}
          max={99}
          step={1}
          value={sliderValue}
          onChange={(e) => handleSliderChange(Number(e.target.value) / 100)}
          className="w-full"
          style={{ accentColor: 'var(--orange-400)' }}
          aria-label="模型給正解 B 的機率 p"
        />
        <div className="flex gap-[var(--space-2)]">
          <button
            type="button"
            onClick={() => handleQuickSet(0.95)}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 'var(--text-sm)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--neutral-50)',
              color: 'var(--text-body)',
            }}
          >
            <Check size={14} style={{ color: 'var(--success-500)' }} />
            猜對（p = 0.95）
          </button>
          <button
            type="button"
            onClick={() => handleQuickSet(0.05)}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 'var(--text-sm)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--neutral-50)',
              color: 'var(--text-body)',
            }}
          >
            <X size={14} style={{ color: 'var(--danger-500)' }} />
            猜錯（p = 0.05）
          </button>
        </div>
      </div>
    </div>
  );
}
