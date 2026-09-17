import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, Maximize2, X } from 'lucide-react';
import { clsx } from 'clsx';

// ─── 型別 ────────────────────────────────────────────────────
type DimStatus = 'equal' | 'stretch' | 'incompatible';

interface ShapePreset {
  label: string;
  a: number[];
  b: number[];
}

interface DimCell {
  value: number;
  virtual: boolean; // 缺少的維度，視為 1
}

interface PositionResult {
  position: number; // 0 = 最右側（trailing）
  a: DimCell;
  b: DimCell;
  status: DimStatus;
}

interface Comparison {
  /** 規則實際會走到的位置，由右（position 0）至左，contiguous，
   *  一遇到 incompatible 立刻中止，之後的位置不會出現在此陣列中 */
  positions: PositionResult[];
  resultShape: number[] | null; // null 代表不相容
  errorPosition: number | null;
  maxLen: number;
}

interface ColumnData {
  position: number;
  a: DimCell;
  b: DimCell;
  status: DimStatus | 'unreached';
}

// ─── 4 個預設範例（已逐位重新核算） ───────────────────────────
const PRESETS: ShapePreset[] = [
  { label: '(4, 3) vs (3,)', a: [4, 3], b: [3] },
  { label: '(4, 3) vs (4,)', a: [4, 3], b: [4] },
  { label: '(3,) vs (1,)', a: [3], b: [1] },
  { label: '(8, 1, 6, 1) vs (7, 1, 5)', a: [8, 1, 6, 1], b: [7, 1, 5] },
];

const CELL_W = 44; // px，與 Tailwind w-11 對齊

// ─── 純函式：廣播規則核算 ───────────────────────────────────
function getCell(shape: number[], position: number): DimCell {
  const idx = shape.length - 1 - position;
  if (idx < 0) return { value: 1, virtual: true };
  return { value: shape[idx], virtual: false };
}

function compare(preset: ShapePreset): Comparison {
  const maxLen = Math.max(preset.a.length, preset.b.length);
  const positions: PositionResult[] = [];
  let errorPosition: number | null = null;

  for (let position = 0; position < maxLen; position += 1) {
    const cellA = getCell(preset.a, position);
    const cellB = getCell(preset.b, position);
    let status: DimStatus;
    if (cellA.value === cellB.value) {
      status = 'equal';
    } else if (cellA.value === 1 || cellB.value === 1) {
      status = 'stretch';
    } else {
      status = 'incompatible';
    }
    positions.push({ position, a: cellA, b: cellB, status });
    if (status === 'incompatible') {
      errorPosition = position;
      break; // 規則規定：一遇不相容立刻停止，左側維度不再評估
    }
  }

  const resultShape =
    errorPosition === null
      ? Array.from({ length: maxLen }, (_, i) => {
          const position = maxLen - 1 - i;
          const cellA = getCell(preset.a, position);
          const cellB = getCell(preset.b, position);
          return Math.max(cellA.value, cellB.value);
        })
      : null;

  return { positions, resultShape, errorPosition, maxLen };
}

function statusColor(status: DimStatus): string {
  switch (status) {
    case 'equal':
      return 'var(--success-500)';
    case 'stretch':
      return 'var(--info-500)';
    case 'incompatible':
      return 'var(--danger-500)';
  }
}

function statusBg(status: DimStatus): string {
  switch (status) {
    case 'equal':
      return 'var(--success-50)';
    case 'stretch':
      return 'var(--info-50)';
    case 'incompatible':
      return 'var(--danger-50)';
  }
}

function dimBoxStyle(status: DimStatus | 'unreached', revealed: boolean, current: boolean): React.CSSProperties {
  if (!revealed || status === 'unreached') {
    return {
      borderColor: 'var(--neutral-300)',
      background: 'var(--neutral-50)',
      color: 'var(--neutral-400)',
    };
  }
  return {
    borderColor: statusColor(status),
    background: statusBg(status),
    color: statusColor(status),
    boxShadow: current ? '0 0 0 3px rgba(99,102,241,0.4)' : undefined,
  };
}

// ─── 子元件 ─────────────────────────────────────────────────
function DimBox({
  cell,
  status,
  revealed,
  current,
}: {
  cell: DimCell;
  status: DimStatus | 'unreached';
  revealed: boolean;
  current: boolean;
}) {
  const style = dimBoxStyle(status, revealed, current);
  return (
    <motion.div
      className={clsx(
        'flex h-10 items-center justify-center rounded-md border font-mono text-sm font-medium',
        cell.virtual && 'italic',
      )}
      style={{ width: CELL_W, borderStyle: cell.virtual ? 'dashed' : 'solid', borderWidth: 1.5, ...style }}
      animate={current ? { scale: [0.92, 1] } : { scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      title={cell.virtual ? '缺少維度，視為 1' : undefined}
    >
      {cell.value}
    </motion.div>
  );
}

function ShapeRow({
  label,
  columns,
  field,
  activePosition,
}: {
  label: string;
  columns: ColumnData[];
  field: 'a' | 'b';
  activePosition: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-5 shrink-0 text-center font-mono text-xs font-semibold"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <div className="flex flex-1 justify-end gap-2">
        {columns.map((col) => {
          const revealed = col.status !== 'unreached';
          const current = activePosition !== null && activePosition === col.position;
          return (
            <DimBox
              key={col.position}
              cell={col[field]}
              status={col.status}
              revealed={revealed}
              current={current}
            />
          );
        })}
      </div>
    </div>
  );
}

function IndicatorRow({ columns, activePosition }: { columns: ColumnData[]; activePosition: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-1 justify-end gap-2">
        {columns.map((col) => {
          const revealed = col.status !== 'unreached';
          const current = activePosition !== null && activePosition === col.position;
          const Icon = col.status === 'equal' ? Check : col.status === 'stretch' ? Maximize2 : col.status === 'incompatible' ? X : null;
          const color = revealed && col.status !== 'unreached' ? statusColor(col.status) : 'var(--neutral-300)';
          return (
            <div
              key={col.position}
              className="flex items-center justify-center"
              style={{ width: CELL_W, color, boxShadow: current ? '0 0 0 3px rgba(99,102,241,0.28)' : undefined, borderRadius: 'var(--radius-pill)' }}
            >
              {revealed && Icon ? <Icon size={14} /> : <span className="block h-1 w-1 rounded-full" style={{ background: 'var(--neutral-300)' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ icon, label, color, bg }: { icon: React.ReactNode; label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ color, background: bg }}>
        {icon}
      </span>
      {label}
    </span>
  );
}

// ─── 主元件 ─────────────────────────────────────────────────
export default function MlWeek3BroadcastingSteps() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const [presetIndex, setPresetIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1); // -1 = 尚未開始
  const [running, setRunning] = useState(false);

  const preset = PRESETS[presetIndex];
  const comparison = useMemo(() => compare(preset), [preset]);
  const lastIndex = comparison.positions.length - 1;

  const columns: ColumnData[] = useMemo(() => {
    const list: ColumnData[] = [];
    for (let position = 0; position < comparison.maxLen; position += 1) {
      const found = comparison.positions[position];
      if (found) {
        list.push({ position, a: found.a, b: found.b, status: found.status });
      } else {
        list.push({
          position,
          a: getCell(preset.a, position),
          b: getCell(preset.b, position),
          status: 'unreached',
        });
      }
    }
    return list.slice().reverse(); // 最左側維度先出現在 DOM，靠 justify-end 靠右對齊
  }, [comparison, preset]);

  // 切換 preset 時重置比對狀態
  useEffect(() => {
    setStepIndex(-1);
    setRunning(false);
  }, [presetIndex]);

  // 逐格播放：每 550ms 往前推進一位（尊重 reduced motion 時不會啟動，見 handleStart）
  useEffect(() => {
    if (!running) return;
    if (stepIndex >= lastIndex) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIndex((s) => Math.min(s + 1, lastIndex));
    }, 550);
    return () => clearTimeout(timer);
  }, [running, stepIndex, lastIndex]);

  function handleStart() {
    if (running) return;
    if (shouldReduceMotion) {
      // 不逐格播放，直接一次呈現所有維度的最終解析狀態
      setStepIndex(lastIndex);
      setRunning(false);
      return;
    }
    setStepIndex(-1);
    setRunning(true);
  }

  const buttonLabel = running ? '比對中…' : stepIndex === -1 ? '逐步比對' : '重新比對';
  const activePosition = running ? stepIndex : null;

  const errored = comparison.errorPosition !== null && stepIndex >= comparison.errorPosition;
  const finished = !running && stepIndex === lastIndex && lastIndex >= 0;
  const errorPair =
    comparison.errorPosition !== null ? comparison.positions[comparison.errorPosition] : undefined;

  return (
    <div className="flex flex-col gap-5 not-prose">
      {/* preset 選擇 */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPresetIndex(i)}
            className="rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition-colors"
            style={{
              borderColor: i === presetIndex ? 'var(--blue-500)' : 'var(--border-subtle)',
              background: i === presetIndex ? 'var(--blue-50)' : 'var(--surface-card)',
              color: i === presetIndex ? 'var(--blue-700)' : 'var(--text-body)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <LegendItem icon={<Check size={12} />} label="相等" color="var(--success-500)" bg="var(--success-50)" />
        <LegendItem
          icon={<Maximize2 size={12} />}
          label="拉伸（其中一邊是 1）"
          color="var(--info-500)"
          bg="var(--info-50)"
        />
        <LegendItem icon={<X size={12} />} label="不相容" color="var(--danger-500)" bg="var(--danger-50)" />
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-4 w-4 rounded italic"
            style={{ borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'var(--neutral-400)' }}
          />
          視為 1（缺少維度）
        </span>
      </div>

      {/* 維度方塊：靠右對齊，從最右側開始比對 */}
      <div className="flex flex-col gap-2 rounded-lg p-4" style={{ background: 'var(--surface-sunken)' }}>
        <ShapeRow label="a" columns={columns} field="a" activePosition={activePosition} />
        <IndicatorRow columns={columns} activePosition={activePosition} />
        <ShapeRow label="b" columns={columns} field="b" activePosition={activePosition} />
      </div>

      {/* 控制列 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={running}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: 'var(--action-primary)' }}
        >
          {buttonLabel}
        </button>
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {stepIndex === -1 ? '尚未開始' : `第 ${Math.min(stepIndex + 1, lastIndex + 1)}/${lastIndex + 1} 步`}
        </span>
      </div>

      {/* 結果面板：固定高度避免版面跳動 */}
      <div
        className="flex min-h-[64px] flex-col justify-center rounded-lg border px-4 py-3"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-card)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {stepIndex === -1 ? (
            <motion.p
              key="idle"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              按下「逐步比對」，從最右邊的維度開始逐一驗證是否相容。
            </motion.p>
          ) : errored ? (
            <motion.div
              key="error"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--danger-500)' }}>
                <X size={16} />
                ValueError：形狀不相容
              </div>
              {errorPair ? (
                <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-body)' }}>
                  從右數第 {comparison.errorPosition! + 1} 個維度：{errorPair.a.value} 與 {errorPair.b.value}
                  {' '}既不相等、也不是 1，無法廣播。
                </p>
              ) : null}
            </motion.div>
          ) : finished && comparison.resultShape ? (
            <motion.div
              key="done"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success-500)' }}>
                <Check size={16} />
                廣播成功
              </div>
              <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-body)' }}>
                結果 shape：({comparison.resultShape.join(', ')}
                {comparison.resultShape.length === 1 ? ',' : ''})
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="progress"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              比對中，依序從最右側往左驗證每一位維度…
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
