import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
import { TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

type FnKey = 'sigmoid' | 'tanh' | 'relu' | 'leakyRelu';

interface Point {
  z: number;
  f: number;
  fPrime: number;
}

interface FnConfig {
  label: string;
  color: string;
  softBg: string;
  compute: (z: number) => { f: number; fPrime: number };
}

const FN_CONFIG: Record<FnKey, FnConfig> = {
  sigmoid: {
    label: 'sigmoid',
    color: 'var(--blue-500)',
    softBg: 'var(--blue-50)',
    compute: (z) => {
      const f = 1 / (1 + Math.exp(-z));
      return { f, fPrime: f * (1 - f) };
    },
  },
  tanh: {
    label: 'tanh',
    color: 'var(--blue-300)',
    softBg: 'var(--blue-50)',
    compute: (z) => {
      const f = Math.tanh(z);
      return { f, fPrime: 1 - f * f };
    },
  },
  relu: {
    label: 'ReLU',
    color: 'var(--orange-400)',
    softBg: 'var(--orange-50)',
    compute: (z) => ({ f: Math.max(0, z), fPrime: z > 0 ? 1 : 0 }),
  },
  leakyRelu: {
    label: 'leaky ReLU',
    color: 'var(--neutral-500)',
    softBg: 'var(--neutral-100)',
    compute: (z) => ({ f: z >= 0 ? z : 0.1 * z, fPrime: z >= 0 ? 1 : 0.1 }),
  },
};

const FN_ORDER: FnKey[] = ['sigmoid', 'tanh', 'relu', 'leakyRelu'];

const Z_MIN = -6;
const Z_STEP = 0.1;
const Z_INDEX_MAX = 120;

function buildData(fn: FnKey): Point[] {
  const config = FN_CONFIG[fn];
  const points: Point[] = [];
  for (let i = 0; i <= Z_INDEX_MAX; i += 1) {
    const z = Math.round((Z_MIN + i * Z_STEP) * 100) / 100;
    const { f, fPrime } = config.compute(z);
    points.push({ z, f, fPrime });
  }
  return points;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatPow5(value: number): string {
  if (Math.abs(value) >= 0.001) return value.toFixed(4);
  return value.toExponential(2);
}

export default function MlWeek10ActivationExplorer() {
  const shouldReduceMotion = useReducedMotion();
  const [activeFn, setActiveFn] = useState<FnKey>('sigmoid');
  const [zIndex, setZIndex] = useState(60);

  const config = FN_CONFIG[activeFn];
  const data = useMemo(() => buildData(activeFn), [activeFn]);
  const current = data[zIndex];
  const z = current.z;
  const fValue = current.f;
  const fPrimeValue = current.fPrime;
  const pow5 = Math.pow(fPrimeValue, 5);

  const layers = [1, 2, 3, 4, 5].map((i) => ({
    i,
    opacity: clamp(Math.pow(fPrimeValue, i), 0.04, 1),
  }));

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* 區塊 1：函數選擇 */}
      <div className="flex flex-wrap gap-2">
        {FN_ORDER.map((key) => {
          const fnConfig = FN_CONFIG[key];
          const active = key === activeFn;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFn(key)}
              className="transition-colors"
              style={{
                fontSize: 'var(--text-sm)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${active ? fnConfig.color : 'var(--border-subtle)'}`,
                background: active ? fnConfig.softBg : 'var(--neutral-100)',
                color: active ? fnConfig.color : 'var(--text-body)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {fnConfig.label}
            </button>
          );
        })}
      </div>

      {/* 區塊 2：函數圖 */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
          <XAxis
            type="number"
            dataKey="z"
            domain={[-6, 6]}
            ticks={[-6, -4, -2, 0, 2, 4, 6]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            stroke="var(--neutral-300)"
          />
          <YAxis
            domain={[-1.2, 1.2]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            stroke="var(--neutral-300)"
            width={34}
          />
          <ReferenceLine x={z} stroke="var(--neutral-400)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="f"
            stroke={config.color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="fPrime"
            stroke={config.color}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot x={z} y={fValue} r={5} fill={config.color} stroke="#ffffff" strokeWidth={1.5} isFront />
          <ReferenceDot x={z} y={fPrimeValue} r={5} fill={config.color} stroke="#ffffff" strokeWidth={1.5} isFront />
        </LineChart>
      </ResponsiveContainer>

      {/* 區塊 3：數值列 */}
      <div className="flex flex-wrap gap-4" style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--text-body)' }}>z = {z.toFixed(1)}</span>
        <span style={{ color: 'var(--text-strong)' }}>f(z) = {fValue.toFixed(3)}</span>
        <span style={{ color: config.color, fontWeight: 600 }}>f'(z) = {fPrimeValue.toFixed(3)}</span>
      </div>

      {/* 區塊 4：slider */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={Z_INDEX_MAX}
          step={1}
          value={zIndex}
          onChange={(e) => setZIndex(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: config.color }}
          aria-label="z 的值"
        />
        <div className="flex justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>-6</span>
          <span>6</span>
        </div>
      </div>

      {/* 區塊 5：連乘 5 層 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>
          <TrendingDown size={16} style={{ color: config.color }} />
          <span>導通連乘 5 層後還剩多少</span>
        </div>
        <div className="flex gap-2">
          {layers.map((layer) => (
            <motion.div
              key={layer.i}
              className={clsx('flex-1 flex items-center justify-center')}
              style={{
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: config.color,
                color: '#ffffff',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
              animate={{ opacity: layer.opacity }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              L{layer.i}
            </motion.div>
          ))}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: config.color, fontWeight: 600 }}>
          (f'(z))^5 = {formatPow5(pow5)}
        </div>
      </div>
    </div>
  );
}
