import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface FieldSpec {
  key: string;
  label: string;
  value: number;
}

interface Stage {
  label: string;
  fields: FieldSpec[];
  note: string;
}

function spatialFields(n: number, c: number, h: number, w: number): FieldSpec[] {
  return [
    { key: 'N', label: 'N', value: n },
    { key: 'C', label: 'C', value: c },
    { key: 'H', label: 'H', value: h },
    { key: 'W', label: 'W', value: w },
  ];
}

function flatFields(n: number, features: number): FieldSpec[] {
  return [
    { key: 'N', label: 'N', value: n },
    { key: 'features', label: 'features', value: features },
  ];
}

// 九個階段的形狀變化；note 標「補」者為依講義第 47 頁補足的說明
const STAGES: Stage[] = [
  {
    label: '輸入',
    fields: spatialFields(64, 1, 28, 28),
    note: '補：批次 64、灰階 1 通道，28×28 影像', // 補
  },
  {
    label: 'Conv2d_1',
    fields: spatialFields(64, 32, 28, 28),
    note: '32 個 5×5 核、p = 2、s = 1：same padding，空間尺寸不變、通道 1 → 32',
  },
  {
    label: 'MaxPool_1',
    fields: spatialFields(64, 32, 14, 14),
    note: '2×2、s = 2：空間尺寸減半、通道不變',
  },
  {
    label: 'Conv2d_2',
    fields: spatialFields(64, 64, 14, 14),
    note: '64 個 5×5 核、p = 2、s = 1：通道 32 → 64',
  },
  {
    label: 'MaxPool_2',
    fields: spatialFields(64, 64, 7, 7),
    note: '補：2×2、s = 2：空間尺寸再減半、通道不變', // 補
  },
  {
    label: 'Flatten',
    fields: flatFields(64, 3136),
    note: '64 × 7 × 7 = 3136：四階張量變二階，才進得了全連接層',
  },
  {
    label: 'FC_1',
    fields: flatFields(64, 1024),
    note: '補：攤平後的 3136 維向量，線性映射到 1024 維', // 補
  },
  {
    label: 'Dropout',
    fields: flatFields(64, 1024),
    note: 'p_drop = 0.5：形狀不變、只在訓練時隨機歸零',
  },
  {
    label: 'FC_2',
    fields: flatFields(64, 10),
    note: '輸出 10 個 logits，不接 softmax',
  },
];

const FLATTEN_INDEX = 5;

function shapeString(fields: FieldSpec[]): string {
  return `[${fields.map((f) => f.value).join(', ')}]`;
}

function isFieldChanged(field: FieldSpec, prevFields: FieldSpec[] | null): boolean {
  if (!prevFields) return false;
  const prev = prevFields.find((p) => p.key === field.key);
  if (!prev) return true;
  return prev.value !== field.value;
}

function findValue(fields: FieldSpec[], key: string): number {
  return fields.find((f) => f.key === key)?.value ?? 0;
}

export default function MlWeek11TensorShapes() {
  const shouldReduceMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);

  const stage = STAGES[stageIndex];
  const prevFields = stageIndex > 0 ? STAGES[stageIndex - 1].fields : null;
  const isFlattened = stageIndex >= FLATTEN_INDEX;

  const volume = useMemo(() => {
    if (isFlattened) {
      const features = findValue(stage.fields, 'features');
      const widthPct = Math.min(100, Math.log10(features + 1) * 20);
      return { kind: 'bar' as const, features, widthPct };
    }
    const c = findValue(stage.fields, 'C');
    const h = findValue(stage.fields, 'H');
    const shown = Math.min(c, 8);
    const extra = c - shown;
    const size = 18 + (h / 28) * 60;
    return { kind: 'squares' as const, c, shown, extra, size };
  }, [stage, isFlattened]);

  const goPrev = () => setStageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStageIndex((i) => Math.min(STAGES.length - 1, i + 1));

  const flashDuration = shouldReduceMotion ? 0 : 0.6;

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex gap-[var(--space-4)]">
        {/* 左欄：流程帶 */}
        <div className="flex flex-col w-[140px] shrink-0" style={{ gap: 'var(--space-1)' }}>
          {STAGES.map((s, i) => {
            const active = i === stageIndex;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setStageIndex(i)}
                aria-current={active ? 'step' : undefined}
                className="text-left transition-colors"
                style={{
                  fontSize: 'var(--text-sm)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: active ? 'var(--blue-500)' : 'var(--surface-sunken)',
                  color: active ? '#ffffff' : 'var(--text-body)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* 右欄：形狀面板 */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <div>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-strong)',
                fontWeight: 600,
              }}
            >
              {stage.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-md)',
                color: 'var(--text-strong)',
              }}
            >
              {shapeString(stage.fields)}
            </div>
          </div>

          <div
            className={clsx('grid', isFlattened ? 'grid-cols-2' : 'grid-cols-4')}
            style={{ gap: 'var(--space-2)' }}
          >
            {stage.fields.map((field) => {
              const changed = isFieldChanged(field, prevFields);
              return (
                <div
                  key={field.key}
                  className="flex flex-col items-center justify-center relative overflow-hidden"
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid var(--border-subtle)`,
                    minHeight: 52,
                  }}
                >
                  <motion.div
                    key={`${stageIndex}-${field.key}-flash`}
                    initial={changed ? { opacity: 1 } : false}
                    animate={{ opacity: 0 }}
                    transition={{ duration: flashDuration, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--orange-100)',
                      pointerEvents: 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'var(--text-2xs)',
                      color: 'var(--text-muted)',
                      position: 'relative',
                    }}
                  >
                    {field.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: changed ? 'var(--orange-500)' : 'var(--text-strong)',
                      position: 'relative',
                    }}
                  >
                    {field.value}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {stage.note}
          </div>

          <div
            className="flex items-center"
            style={{
              minHeight: 140,
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              {volume.kind === 'squares' ? (
                <motion.div
                  key="squares"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                  className="flex items-center"
                  style={{ gap: 'var(--space-4)', width: '100%' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: volume.size + volume.shown * 6,
                      height: volume.size + volume.shown * 6,
                      flexShrink: 0,
                    }}
                  >
                    {Array.from({ length: volume.shown }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: i * 6,
                          top: i * 6,
                          width: volume.size,
                          height: volume.size,
                          background: 'var(--blue-100)',
                          border: '1px solid var(--blue-500)',
                          borderRadius: 'var(--radius-xs)',
                          zIndex: volume.shown - i,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                    通道數 C = {volume.c}
                    {volume.extra > 0 ? `（顯示 8 格，+${volume.extra}）` : ''}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                  style={{ width: '100%' }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 28,
                      background: 'var(--surface-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      animate={{ width: `${volume.widthPct}%` }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                      className="flex items-center justify-end"
                      style={{
                        height: '100%',
                        background: 'var(--blue-500)',
                        minWidth: 32,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          color: '#ffffff',
                          paddingRight: 8,
                        }}
                      >
                        {volume.features}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 底部導覽列 */}
      <div className="flex items-center gap-[var(--space-3)]">
        <button
          type="button"
          onClick={goPrev}
          disabled={stageIndex === 0}
          className="flex items-center gap-1"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)',
            color: stageIndex === 0 ? 'var(--text-muted)' : 'var(--text-body)',
            cursor: stageIndex === 0 ? 'default' : 'pointer',
          }}
        >
          <ChevronLeft size={14} />
          上一步
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={stageIndex === STAGES.length - 1}
          className="flex items-center gap-1"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)',
            color: stageIndex === STAGES.length - 1 ? 'var(--text-muted)' : 'var(--text-body)',
            cursor: stageIndex === STAGES.length - 1 ? 'default' : 'pointer',
          }}
        >
          下一步
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
