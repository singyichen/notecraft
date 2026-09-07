import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { TriangleAlert, RotateCcw, ChevronDown } from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TrainingStep {
  id: string;
  code: string;
  desc: string;
  layerLabel: string;
  accent: string;
  soft: string;
}

// ──────────────────────────────────────────────
// Data — 一次訓練迭代的五個步驟（依序，會不斷重複）
// 配色對應 ml-week11-abstraction-stack：nn.Module / torch.optim 對應「torch.nn.Module 與
// torch.optim」層（blue-400），autograd 對應「tensor 與 autograd」層（blue-700），
// 讓兩個元件可以對讀。
// ──────────────────────────────────────────────

const STEPS: TrainingStep[] = [
  {
    id: 'forward',
    code: 'y_hat = model(X)',
    desc: '前向傳播，算出目前的預測值',
    layerLabel: 'nn.Module',
    accent: 'var(--blue-400)',
    soft: 'var(--blue-100)',
  },
  {
    id: 'loss',
    code: 'loss = criterion(y_hat, y)',
    desc: '比較預測與正確答案，量化差多少',
    layerLabel: 'nn（損失函數）',
    accent: 'var(--blue-400)',
    soft: 'var(--blue-100)',
  },
  {
    id: 'backward',
    code: 'loss.backward()',
    desc: '沿計算圖反向傳播，算出每個參數的梯度',
    layerLabel: 'autograd',
    accent: 'var(--blue-700)',
    soft: 'var(--blue-50)',
  },
  {
    id: 'step',
    code: 'optimizer.step()',
    desc: '依梯度與學習率，真正更新每個參數',
    layerLabel: 'torch.optim',
    accent: 'var(--blue-400)',
    soft: 'var(--blue-100)',
  },
  {
    id: 'zero-grad',
    code: 'optimizer.zero_grad()',
    desc: '梯度歸零，準備下一次迭代',
    layerLabel: 'torch.optim',
    accent: 'var(--blue-400)',
    soft: 'var(--blue-100)',
  },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function MlWeek11TrainingLoop() {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const transitionDuration = shouldReduceMotion ? 0 : 0.25;
  const isLastStep = activeIndex === STEPS.length - 1;

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % STEPS.length);
  };

  return (
    <div className="not-prose flex flex-col gap-3">
      {/* 標頭：步驟計數 + 下一步按鈕 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          步驟 {activeIndex + 1} / {STEPS.length}
        </p>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: 'var(--action-primary)', color: 'var(--text-on-brand)' }}
        >
          下一步
          <ChevronDown size={14} className="-rotate-90" aria-hidden="true" />
        </button>
      </div>

      {/* 五個步驟：直向堆疊，當前步驟高亮、其餘變淡 */}
      <div className="flex flex-col gap-2">
        {STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          return (
            <motion.div
              key={step.id}
              animate={{ opacity: isActive ? 1 : 0.45 }}
              transition={{ duration: transitionDuration, ease: 'easeOut' }}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
              style={{
                borderColor: isActive ? step.accent : 'var(--border-subtle)',
                background: isActive ? step.soft : 'var(--surface-card)',
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  width: 24,
                  height: 24,
                  background: isActive ? step.accent : 'var(--surface-sunken)',
                  color: isActive ? 'var(--text-on-brand)' : 'var(--text-muted)',
                }}
                aria-hidden="true"
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className="font-mono text-xs break-all"
                  style={{ color: 'var(--text-strong)' }}
                >
                  {step.code}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {step.desc}
                </p>
              </div>

              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: step.soft, color: step.accent }}
              >
                {step.layerLabel}
              </span>
            </motion.div>
          );
        })}

        {/* 循環指示：從第 5 步回到第 1 步 */}
        <div
          className="flex items-center gap-1.5 self-start pl-1 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <RotateCcw size={12} aria-hidden="true" />
          <span>完成第 5 步後，回到第 1 步，開始下一次迭代</span>
        </div>
      </div>

      {/* 提示區：固定高度，避免第 5 步顯示提示時版面跳動 */}
      <div
        className="min-h-[44px] rounded-md border px-3 py-2 transition-colors"
        style={{
          borderColor: isLastStep ? 'var(--danger-50)' : 'var(--border-subtle)',
          background: isLastStep ? 'var(--danger-50)' : 'transparent',
        }}
      >
        <AnimatePresence mode="wait">
          {isLastStep ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: transitionDuration, ease: 'easeOut' }}
              className="flex items-start gap-1.5 text-xs"
              style={{ color: 'var(--danger-500)' }}
            >
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>漏掉這步，梯度會累加到下一次迭代</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
