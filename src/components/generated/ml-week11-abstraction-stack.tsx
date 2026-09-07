import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { TriangleAlert } from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AbstractionLayer {
  id: string;
  title: string;
  subtitle: string;
  boilerplateLabel: string;
  commonError: string;
  accent: string;
  soft: string;
}

// ──────────────────────────────────────────────
// Data — 由下往上五層（陣列順序即由下往上，配合 flex-col-reverse 呈現）
// ──────────────────────────────────────────────

const LAYERS: AbstractionLayer[] = [
  {
    id: 'numpy',
    title: '手刻 numpy（第 10 週）',
    subtitle: '自己算矩陣、自己推導梯度',
    boilerplateLabel: '最多',
    commonError: '矩陣維度對不上；導數推錯符號',
    accent: 'var(--neutral-600)',
    soft: 'var(--neutral-100)',
  },
  {
    id: 'tensor-autograd',
    title: 'tensor 與 autograd',
    subtitle:
      'tensor 操作、GPU 搬移、requires_grad 記帳、計算圖與 backward() 沿圖回推',
    boilerplateLabel: '多',
    commonError:
      '同一張計算圖 backward 兩次（需 retain_graph）；忘記 .detach() 導致計算圖無限長大',
    accent: 'var(--blue-700)',
    soft: 'var(--blue-50)',
  },
  {
    id: 'nn-optim',
    title: 'torch.nn.Module 與 torch.optim',
    subtitle:
      '層的組合、activation functions（sigmoid / softmax / tanh / ReLU）、優化器更新參數',
    boilerplateLabel: '中',
    commonError: '權重沒包成 nn.Parameter，optimizer 抓不到',
    accent: 'var(--blue-400)',
    soft: 'var(--blue-100)',
  },
  {
    id: 'sequential-custom',
    title: 'nn.Sequential vs. 自訂 nn.Module',
    subtitle: '單一資料流 vs. 有分支／自訂層',
    boilerplateLabel: '少',
    commonError:
      '需要分支卻硬用 Sequential；自訂 Module 忘了呼叫 super().__init__()',
    accent: 'var(--orange-600)',
    soft: 'var(--orange-50)',
  },
  {
    id: 'lightning',
    title: 'PyTorch Lightning',
    subtitle: '連訓練迴圈都收走，只填 training_step 等空格',
    boilerplateLabel: '最少',
    commonError: '出錯時堆疊追蹤落在框架內部，不知道該往下面哪一層看',
    accent: 'var(--orange-400)',
    soft: 'var(--orange-100)',
  },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function MlWeek11AbstractionStack() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = LAYERS[selectedIndex];
  const transitionDuration = shouldReduceMotion ? 0 : 0.25;

  return (
    <div className="not-prose flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-3">
        {/* 樣板量漸變刻度帶：由下（最多）往上（最少） */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            多
          </span>
          <div
            className="flex-1 w-2 rounded-full"
            style={{
              background: 'linear-gradient(to top, var(--neutral-700), var(--neutral-100))',
              minHeight: 140,
            }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            少
          </span>
        </div>

        {/* 五層堆疊：DOM 堆疊 + flex-col-reverse，讓陣列第一筆（numpy）落在最底層 */}
        <div className="flex-1 flex flex-col-reverse gap-2">
          {LAYERS.map((layer, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-pressed={isSelected}
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors"
                style={{
                  borderColor: isSelected ? layer.accent : 'var(--border-subtle)',
                  background: isSelected ? layer.soft : 'var(--surface-card)',
                }}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="mt-1 shrink-0 rounded-full"
                    style={{ width: 10, height: 10, background: layer.accent }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                      {layer.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {layer.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: layer.soft, color: layer.accent }}
                >
                  {layer.boilerplateLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 詳情面板：固定最小高度，切換時 motion 淡入，避免版面跳動 */}
      <div
        className="relative min-h-[136px] rounded-lg border p-4"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: transitionDuration, ease: 'easeOut' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: selected.accent }}
            >
              {selected.title}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-body)' }}>
              {selected.subtitle}
            </p>
            <div
              className="mt-3 flex items-start gap-1.5 text-xs"
              style={{ color: 'var(--danger-500)' }}
            >
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{selected.commonError}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
