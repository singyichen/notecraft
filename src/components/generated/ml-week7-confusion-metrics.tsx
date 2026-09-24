import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  animate,
} from 'motion/react';
import { Stethoscope, MailWarning } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// 資料 —— 兩組固定分數，用純數學公式一次算出，恆定不變。
// Math.pow / Math.sin 在這裡只是「函式圖形」的產生器，輸入是
// 0..59 / 0..139 的迴圈索引，每次執行、每個讀者看到的都是同一組
// 數字 —— 不是隨機來源，請勿誤認為亂數而改用 Math.random。
// ──────────────────────────────────────────────────────────────

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

const POSITIVE_SCORES: number[] = Array.from({ length: 60 }, (_, i) => {
  const u = (i + 0.5) / 60;
  const raw = 0.25 + 0.7 * u + 0.06 * Math.sin(i * 2.399963);
  return clamp(raw, 0.02, 0.99);
});

const NEGATIVE_SCORES: number[] = Array.from({ length: 140 }, (_, i) => {
  const v = (i + 0.5) / 140;
  const raw = 0.05 + 0.55 * Math.pow(v, 1.8) + 0.05 * Math.sin(i * 1.7823);
  return clamp(raw, 0.01, 0.95);
});

interface ConfusionCounts {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
}

function computeCounts(threshold: number): ConfusionCounts {
  let tp = 0;
  let fn = 0;
  let fp = 0;
  let tn = 0;
  for (const s of POSITIVE_SCORES) {
    if (s >= threshold) tp += 1;
    else fn += 1;
  }
  for (const s of NEGATIVE_SCORES) {
    if (s >= threshold) fp += 1;
    else tn += 1;
  }
  return { tp, fn, fp, tn };
}

interface Metrics {
  err: number;
  acc: number;
  tpr: number;
  fpr: number;
  pre: number | null;
  rec: number;
  f1: number | null;
  mcc: number;
}

function computeMetrics(c: ConfusionCounts): Metrics {
  const total = c.tp + c.fn + c.fp + c.tn;
  const posTotal = c.tp + c.fn;
  const negTotal = c.fp + c.tn;

  const err = total > 0 ? (c.fp + c.fn) / total : 0;
  const acc = total > 0 ? (c.tp + c.tn) / total : 0;
  const tpr = posTotal > 0 ? c.tp / posTotal : 0;
  const fpr = negTotal > 0 ? c.fp / negTotal : 0;
  const rec = posTotal > 0 ? c.tp / posTotal : 0;

  const preDenom = c.tp + c.fp;
  const pre = preDenom > 0 ? c.tp / preDenom : null;

  const f1 = pre !== null && pre + rec > 0 ? (2 * pre * rec) / (pre + rec) : null;

  const mccDenomSq = (c.tp + c.fp) * (c.tp + c.fn) * (c.tn + c.fp) * (c.tn + c.fn);
  const mcc = mccDenomSq > 0 ? (c.tp * c.tn - c.fp * c.fn) / Math.sqrt(mccDenomSq) : 0;

  return { err, acc, tpr, fpr, pre, rec, f1, mcc };
}

function formatMetric(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

interface MetricDef {
  key: keyof Metrics;
  label: string;
  formula: string;
  labelColor?: string;
}

const METRIC_DEFS: MetricDef[] = [
  { key: 'err', label: 'ERR', formula: '(FP+FN)/總數' },
  { key: 'acc', label: 'ACC', formula: '(TP+TN)/總數' },
  { key: 'tpr', label: 'TPR', formula: 'TP/(TP+FN)' },
  { key: 'fpr', label: 'FPR', formula: 'FP/(FP+TN)' },
  { key: 'pre', label: 'PRE', formula: 'TP/(TP+FP)', labelColor: 'var(--text-brand)' },
  { key: 'rec', label: 'REC', formula: 'TP/(TP+FN)', labelColor: 'var(--text-accent)' },
  { key: 'f1', label: 'F1', formula: '2·PRE·REC/(PRE+REC)' },
  { key: 'mcc', label: 'MCC', formula: '(TP·TN−FP·FN)/√(…)' },
];

// ──────────────────────────────────────────────────────────────
// 共用：數字脈衝 —— key 隨顯示值變動時重新進場，短暫閃過品牌藍再
// 回到目標色。prefers-reduced-motion 時退化為純文字節點。
// ──────────────────────────────────────────────────────────────

function PulseValue({
  value,
  reducedMotion,
  toColor = 'var(--text-strong)',
  className,
}: {
  value: string;
  reducedMotion: boolean;
  toColor?: string;
  className?: string;
}) {
  if (reducedMotion) {
    return (
      <span className={className} style={{ color: toColor }}>
        {value}
      </span>
    );
  }
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.3, color: 'var(--blue-500)' }}
      animate={{ scale: 1, color: toColor }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
      style={{ display: 'inline-block', color: toColor }}
    >
      {value}
    </motion.span>
  );
}

// ──────────────────────────────────────────────────────────────
// 門檻滑桿 —— 自製 track/thumb，用 motionValue 驅動視覺位置，
// 拖曳即時 .set()，鍵盤支援 ArrowLeft/Right（±0.01）與
// PageUp/PageDown（±0.1）。
// ──────────────────────────────────────────────────────────────

function ThresholdSlider({
  threshold,
  thresholdMv,
  onDragCommit,
}: {
  threshold: number;
  thresholdMv: ReturnType<typeof useMotionValue<number>>;
  onDragCommit: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillWidth = useTransform(thresholdMv, (v) => `${v * 100}%`);
  const thumbLeft = useTransform(thresholdMv, (v) => `${v * 100}%`);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const next = Math.round(ratio * 100) / 100;
      thresholdMv.set(next);
      onDragCommit(next);
    },
    [thresholdMv, onDragCommit],
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromClientX(e.clientX);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -0.01;
    else if (e.key === 'ArrowRight') delta = 0.01;
    else if (e.key === 'PageDown') delta = -0.1;
    else if (e.key === 'PageUp') delta = 0.1;
    else return;
    e.preventDefault();
    const next = Math.round(clamp(threshold + delta, 0, 1) * 100) / 100;
    thresholdMv.set(next);
    onDragCommit(next);
  };

  return (
    <div className="flex items-center gap-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="分類門檻"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={threshold}
        aria-valuetext={`門檻 = ${threshold.toFixed(2)}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        className="relative h-2 flex-1 cursor-pointer touch-none rounded-full"
        style={{ background: 'var(--neutral-200)' }}
      >
        <motion.div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full"
          style={{ background: 'var(--blue-500)', width: fillWidth }}
        />
        <motion.div
          className="pointer-events-none absolute top-1/2 h-4 w-4 rounded-full"
          style={{
            left: thumbLeft,
            x: '-50%',
            y: '-50%',
            background: 'var(--blue-500)',
            border: '2px solid var(--surface-card)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>
      <span
        className="shrink-0 font-bold"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}
      >
        門檻 = {threshold.toFixed(2)}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 混淆矩陣格
// ──────────────────────────────────────────────────────────────

function MatrixCell({
  value,
  label,
  tone,
  reducedMotion,
}: {
  value: number;
  label: string;
  tone: 'positive' | 'negative';
  reducedMotion: boolean;
}) {
  const bg = tone === 'positive' ? 'var(--success-50)' : 'var(--danger-50)';
  const fg = tone === 'positive' ? 'var(--success-500)' : 'var(--danger-500)';
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5"
      style={{ background: bg, height: 76, borderRadius: 'var(--radius-md)' }}
    >
      <PulseValue
        value={String(value)}
        reducedMotion={reducedMotion}
        toColor={fg}
        className="font-mono text-2xl font-bold"
      />
      <span style={{ fontSize: 'var(--text-2xs)', color: fg, fontWeight: 600, letterSpacing: 'var(--tracking-wide)' }}>
        {label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 指標卡
// ──────────────────────────────────────────────────────────────

function MetricCard({
  def,
  value,
  reducedMotion,
}: {
  def: MetricDef;
  value: number | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 px-1"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        height: 92,
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: def.labelColor ?? 'var(--text-muted)',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        {def.label}
      </span>
      <PulseValue value={formatMetric(value)} reducedMotion={reducedMotion} className="font-mono text-lg font-bold" />
      <span
        className="text-center"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}
      >
        {def.formula}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 主元件
// ──────────────────────────────────────────────────────────────

export default function MlWeek7ConfusionMetrics() {
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = !!shouldReduceMotion;

  const [threshold, setThreshold] = useState(0.5);
  const thresholdMv = useMotionValue(0.5);

  useMotionValueEvent(thresholdMv, 'change', (latest) => {
    setThreshold(Math.round(latest * 100) / 100);
  });

  const goToThreshold = useCallback(
    (target: number) => {
      if (reducedMotion) {
        thresholdMv.set(target);
        setThreshold(target);
        return;
      }
      animate(thresholdMv, target, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
    },
    [thresholdMv, reducedMotion],
  );

  const handleDragCommit = useCallback((next: number) => {
    setThreshold(next);
  }, []);

  const counts = useMemo(() => computeCounts(threshold), [threshold]);
  const metrics = useMemo(() => computeMetrics(counts), [counts]);

  const preFraction = metrics.pre ?? 0;
  const recFraction = metrics.rec;

  return (
    <div className="not-prose flex flex-col gap-4">
      {/* 1. 門檻區 */}
      <ThresholdSlider threshold={threshold} thresholdMv={thresholdMv} onDragCommit={handleDragCommit} />

      {/* 2. 混淆矩陣 */}
      <div className="flex flex-col gap-1">
        <div
          className="grid items-center gap-1"
          style={{ gridTemplateColumns: 'auto 1fr 1fr' }}
        >
          <div />
          <div
            className="text-center"
            style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            預測：陽性
          </div>
          <div
            className="text-center"
            style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            預測：陰性
          </div>

          <div
            className="flex items-center pr-2"
            style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            實際：陽性
          </div>
          <MatrixCell value={counts.tp} label="TP" tone="positive" reducedMotion={reducedMotion} />
          <MatrixCell value={counts.fn} label="FN" tone="negative" reducedMotion={reducedMotion} />

          <div
            className="flex items-center pr-2"
            style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            實際：陰性
          </div>
          <MatrixCell value={counts.fp} label="FP" tone="negative" reducedMotion={reducedMotion} />
          <MatrixCell value={counts.tn} label="TN" tone="positive" reducedMotion={reducedMotion} />
        </div>
      </div>

      {/* 加分項：PRE vs REC 拉鋸條 */}
      <div className="flex flex-col gap-1">
        <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--neutral-200)' }}>
          <div className="flex h-full w-1/2 justify-end">
            <div
              className={reducedMotion ? 'h-full' : 'h-full transition-[width] duration-200 ease-out'}
              style={{ width: `${preFraction * 100}%`, background: 'var(--blue-500)' }}
            />
          </div>
          <div className="flex h-full w-1/2 justify-start">
            <div
              className={reducedMotion ? 'h-full' : 'h-full transition-[width] duration-200 ease-out'}
              style={{ width: `${recFraction * 100}%`, background: 'var(--orange-400)' }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-brand)' }}>
            PRE {formatMetric(metrics.pre)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-accent)' }}>
            REC {formatMetric(metrics.rec)}
          </span>
        </div>
      </div>

      {/* 3. 指標面板 */}
      <div className="grid grid-cols-4 gap-2">
        {METRIC_DEFS.map((def) => (
          <MetricCard key={def.key} def={def} value={metrics[def.key]} reducedMotion={reducedMotion} />
        ))}
      </div>

      {/* 4. 兩個預設按鈕 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => goToThreshold(0.2)}
          className="flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-accent-soft)]"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '2px solid var(--orange-400)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Stethoscope size={16} style={{ color: 'var(--orange-500)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)' }}>偏重召回率（篩檢情境）</span>
        </button>
        <button
          type="button"
          onClick={() => goToThreshold(0.75)}
          className="flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-brand-soft)]"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '2px solid var(--blue-500)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <MailWarning size={16} style={{ color: 'var(--blue-500)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)' }}>偏重精確率（垃圾信情境）</span>
        </button>
      </div>
    </div>
  );
}
