import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  TriangleAlert,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  CircleCheck,
} from 'lucide-react';

// ─── 資料模型 ────────────────────────────────────────────────
interface StepDatum {
  id: number;
  label: string;
}

const LEAKY_STEPS: StepDatum[] = [
  { id: 1, label: '整份原始資料' },
  { id: 2, label: '補缺值 / one-hot / 標準化' },
  { id: 3, label: '才切 train / test 與 k 個 fold' },
  { id: 4, label: '交叉驗證分數虛高' },
];

const CORRECT_STEPS: StepDatum[] = [
  { id: 1, label: '原始資料' },
  { id: 2, label: '先切出 test，留到最後才動' },
  { id: 3, label: '訓練集切成 k 個 fold，各自跑 pipeline' },
  { id: 4, label: 'k 個分數取平均與標準差，最後才驗證一次 test' },
];

const LEAK_NOTE = '轉換器的統計量已經看過全部資料';

type Tone = 'leaky' | 'correct';

const TONE_STYLE: Record<Tone, { border: string; bg: string; text: string; badge: string }> = {
  leaky: {
    border: 'var(--warning-500)',
    bg: 'var(--warning-50)',
    text: 'var(--warning-500)',
    badge: 'var(--warning-500)',
  },
  correct: {
    border: 'var(--blue-500)',
    bg: 'var(--blue-50)',
    text: 'var(--blue-700)',
    badge: 'var(--blue-600)',
  },
};

// ─── 單一步驟節點 ────────────────────────────────────────────
function StepNode({
  step,
  reached,
  isCurrent,
  tone,
  showLeakNote,
}: {
  step: StepDatum;
  reached: boolean;
  isCurrent: boolean;
  tone: Tone;
  showLeakNote: boolean;
}) {
  const colors = TONE_STYLE[tone];

  return (
    <div
      className="relative flex-1 basis-[108px] min-w-[100px] rounded-lg border px-2.5 py-2 transition-colors duration-200"
      style={{
        borderColor: reached ? colors.border : 'var(--border-subtle)',
        backgroundColor: reached ? colors.bg : 'var(--surface-card)',
        boxShadow: isCurrent ? 'var(--shadow-card)' : 'none',
      }}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
          style={{ backgroundColor: reached ? colors.badge : 'var(--neutral-300)' }}
        >
          {step.id}
        </span>
        <p
          className="text-xs leading-snug"
          style={{ color: reached ? colors.text : 'var(--text-muted)' }}
        >
          {step.label}
        </p>
      </div>

      {showLeakNote && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-1.5 flex items-start gap-1 border-t pt-1.5"
          style={{ borderColor: 'var(--warning-500)' }}
        >
          <TriangleAlert size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--warning-500)' }} />
          <span className="text-[0.6875rem] leading-snug" style={{ color: 'var(--warning-500)' }}>
            {LEAK_NOTE}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── 分數示意卡 ──────────────────────────────────────────────
function ScoreBadge({ tone, value, note }: { tone: Tone; value: string; note: string }) {
  const style =
    tone === 'leaky'
      ? { border: 'var(--danger-500)', bg: 'var(--danger-50)', text: 'var(--danger-500)' }
      : { border: 'var(--success-500)', bg: 'var(--success-50)', text: 'var(--success-500)' };

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-1 basis-[108px] min-w-[100px] flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-2"
      style={{ borderColor: style.border, backgroundColor: style.bg }}
    >
      <span className="text-sm font-bold tabular-nums" style={{ color: style.text }}>
        {value}
      </span>
      <span className="text-[0.6875rem] leading-snug" style={{ color: style.text }}>
        {note}
      </span>
    </motion.div>
  );
}

// ─── 單排流程 ────────────────────────────────────────────────
function StepRow({
  title,
  icon,
  tone,
  steps,
  currentStep,
  scoreValue,
  scoreNote,
}: {
  title: string;
  icon: React.ReactNode;
  tone: Tone;
  steps: StepDatum[];
  currentStep: number;
  scoreValue: string;
  scoreNote: string;
}) {
  const colors = TONE_STYLE[tone];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span style={{ color: colors.text }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {title}
        </span>
      </div>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {steps.map((step, index) => {
          const reached = step.id <= currentStep;
          return (
            <div key={step.id} className="flex items-stretch gap-1.5">
              <StepNode
                step={step}
                reached={reached}
                isCurrent={step.id === currentStep}
                tone={tone}
                showLeakNote={tone === 'leaky' && step.id === 2 && currentStep >= 2}
              />
              {index < steps.length - 1 && (
                <ArrowRight
                  size={14}
                  className="mt-3 shrink-0"
                  style={{ color: 'var(--neutral-300)' }}
                />
              )}
            </div>
          );
        })}
        <AnimatePresence>
          {currentStep >= 4 && (
            <ScoreBadge key="score" tone={tone} value={scoreValue} note={scoreNote} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── 主元件 ──────────────────────────────────────────────────
export default function MlWeek7LeakageContrast() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [currentStep, setCurrentStep] = useState(shouldReduceMotion ? 4 : 1);

  const atEnd = currentStep >= 4;

  function handleAdvance() {
    if (atEnd) {
      setCurrentStep(1);
    } else {
      setCurrentStep((s) => Math.min(4, s + 1));
    }
  }

  return (
    <div className="not-prose space-y-4 select-none">
      {/* 控制列 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: n <= currentStep ? 'var(--blue-600)' : 'var(--neutral-200)',
              }}
            />
          ))}
          <span className="ml-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            步驟 {currentStep} / 4
          </span>
        </div>
        <button
          type="button"
          onClick={handleAdvance}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--action-primary)' }}
        >
          {atEnd ? (
            <>
              <RotateCcw size={13} />
              重新開始
            </>
          ) : (
            <>
              下一步
              <ChevronRight size={13} />
            </>
          )}
        </button>
      </div>

      <StepRow
        title="會洩漏的做法"
        icon={<TriangleAlert size={16} />}
        tone="leaky"
        steps={LEAKY_STEPS}
        currentStep={currentStep}
        scoreValue="0.95"
        scoreNote="虛高"
      />

      {/* 分岔提示 */}
      <div className="flex items-center justify-center">
        <AnimatePresence>
          {currentStep >= 2 && (
            <motion.span
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="rounded-full px-3 py-0.5 text-[0.6875rem] font-medium"
              style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
            >
              兩條路徑在這一步分岔：前處理先做，還是先切分
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <StepRow
        title="正確做法"
        icon={<CircleCheck size={16} />}
        tone="correct"
        steps={CORRECT_STEPS}
        currentStep={currentStep}
        scoreValue="0.87 ± 0.03"
        scoreNote="誠實估計"
      />
    </div>
  );
}
