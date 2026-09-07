import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  CornerDownRight,
  Scale,
  Brain,
} from 'lucide-react';

// ─── 資料模型 ────────────────────────────────────────────────
const RAW_TEXT = '這部片超好看的!!! 演員演技一流 :) <br />強烈推薦';
const CLEANED_TEXT = '這部片超好看的 演員演技一流 強烈推薦 :)';

const TOKENS = ['這部片', '超好看', '演員', '演技', '一流', '強烈推薦', ':)'];

const BOW: { word: string; count: number }[] = TOKENS.map((word) => ({ word, count: 1 }));

const TFIDF: { word: string; weight: number }[] = [
  { word: '這部片', weight: 0.12 },
  { word: '超好看', weight: 0.61 },
  { word: '演員', weight: 0.28 },
  { word: '演技', weight: 0.35 },
  { word: '一流', weight: 0.58 },
  { word: '強烈推薦', weight: 0.66 },
  { word: ':)', weight: 0.44 },
];

interface StepMeta {
  id: number;
  title: string;
  short: string;
  desc: string;
}

const STEPS: StepMeta[] = [
  { id: 1, title: '原始文字', short: '原始', desc: '未經處理的評論原文' },
  { id: 2, title: 'text cleaning', short: '清理', desc: '去 HTML 標籤、去標點、轉小寫，但保留顏文字' },
  { id: 3, title: 'tokenization', short: '斷詞', desc: '斷詞、移除停用詞（英文另有 stemming）' },
  { id: 4, title: 'bag-of-words', short: '詞頻', desc: '詞 → 出現次數 的對照表' },
  { id: 5, title: 'TF-IDF', short: '權重', desc: '壓低高頻但無鑑別力的詞，改看詞 → 權重' },
];

const TOTAL_STEPS = STEPS.length;

// ─── 小元件：步驟指示器 ─────────────────────────────────────
function StepDots({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, i) => {
        const active = step.id === current;
        const done = step.id < current;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: active
                  ? 'var(--blue-600)'
                  : done
                    ? 'var(--surface-brand-soft)'
                    : 'var(--surface-sunken)',
                color: active ? '#fff' : done ? 'var(--blue-700)' : 'var(--text-muted)',
              }}
            >
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] font-bold"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'transparent',
                }}
              >
                {step.id}
              </span>
              {step.short}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight size={12} style={{ color: 'var(--neutral-300)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 小元件：token 陣列 chips ────────────────────────────────
function TokenChips({ tokens }: { tokens: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
      {tokens.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="rounded-md px-2 py-1"
          style={{
            backgroundColor: 'var(--surface-brand-soft)',
            color: 'var(--blue-700)',
            border: '1px solid var(--blue-200)',
          }}
        >
          "{t}"
        </span>
      ))}
    </div>
  );
}

// ─── 小元件：BOW 詞頻列表 ────────────────────────────────────
function BowList({ rows }: { rows: { word: string; count: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
      {rows.map((r) => (
        <div key={r.word} className="flex items-center justify-between gap-2">
          <span style={{ color: 'var(--text-body)' }}>{r.word}</span>
          <span
            className="rounded px-1.5 py-0.5 font-semibold"
            style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--blue-700)' }}
          >
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 小元件：TF-IDF 權重列表（長條 + 底色深淺） ──────────────
function TfidfList({ rows }: { rows: { word: string; weight: number }[] }) {
  return (
    <div className="flex flex-col gap-1.5 font-mono text-xs">
      {rows.map((r) => (
        <div key={r.word} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate" style={{ color: 'var(--text-body)' }}>
            {r.word}
          </span>
          <div
            className="h-3.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--surface-sunken)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(r.weight * 100)}%`,
                backgroundColor: `rgba(79,70,229,${0.25 + r.weight * 0.65})`,
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-semibold" style={{ color: 'var(--blue-700)' }}>
            {r.weight.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 小元件：out-of-core learning 旁支 ──────────────────────
function OutOfCoreBranch() {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2"
      style={{
        border: '1px dashed var(--border-default)',
        backgroundColor: 'var(--surface-sunken)',
      }}
    >
      <CornerDownRight size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <GitBranch size={13} style={{ color: 'var(--neutral-500)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
            out-of-core learning
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[0.6875rem]"
            style={{ backgroundColor: 'var(--surface-card)', color: 'var(--blue-700)' }}
          >
            HashingVectorizer
          </span>
          <span className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>
            +
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[0.6875rem]"
            style={{ backgroundColor: 'var(--surface-card)', color: 'var(--blue-700)' }}
          >
            partial_fit
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          資料大到記憶體裝不下時走這裡，小批次逐步餵進模型。
        </p>
      </div>
    </div>
  );
}

// ─── 小元件：終點卡（判別式 / 生成式） ──────────────────────
function EndpointCard({
  icon,
  title,
  subtitle,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
}) {
  return (
    <div
      className="flex min-w-[220px] flex-1 flex-col gap-1.5 rounded-lg p-3"
      style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-card)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
            {title}
          </p>
          <p className="text-[0.6875rem] leading-tight" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>
      <p className="text-xs leading-snug" style={{ color: 'var(--text-body)' }}>
        {desc}
      </p>
    </div>
  );
}

// ─── 主元件 ──────────────────────────────────────────────────
export default function MlWeek12TextPipeline() {
  const [step, setStep] = useState(1);
  const shouldReduceMotion = useReducedMotion() ?? false;

  const meta = STEPS.find((s) => s.id === step) ?? STEPS[0];
  const showBranch = step >= 4;
  const showEndpoints = step >= 5;

  function goPrev() {
    setStep((s) => Math.max(1, s - 1));
  }
  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  const fadeVariants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 },
  };

  return (
    <div className="not-prose w-full space-y-3">
      {/* 步驟指示器 */}
      <StepDots current={step} onSelect={setStep} />

      {/* 上一步 / 下一步 + 標題 */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={step <= 1}
          aria-label="上一步"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-opacity disabled:opacity-30"
          style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-body)' }}
        >
          <ChevronLeft size={16} />
          上一步
        </button>

        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
            {meta.title}
          </p>
          <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>
            {meta.desc}
          </p>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={step >= TOTAL_STEPS}
          aria-label="下一步"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-opacity disabled:opacity-30"
          style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-body)' }}
        >
          下一步
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 結果面板 */}
      <div
        className="min-h-[220px] rounded-xl p-4"
        style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-card)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${step}`}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="space-y-3"
          >
            {step === 1 && (
              <p
                className="rounded-lg px-3 py-2 font-mono text-xs leading-relaxed"
                style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-body)' }}
              >
                {RAW_TEXT}
              </p>
            )}

            {step === 2 && (
              <p
                className="rounded-lg px-3 py-2 font-mono text-xs leading-relaxed"
                style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-body)' }}
              >
                {CLEANED_TEXT}
              </p>
            )}

            {step === 3 && (
              <div className="overflow-x-auto">
                <TokenChips tokens={TOKENS} />
              </div>
            )}

            {step === 4 && (
              <div className="overflow-x-auto">
                <BowList rows={BOW} />
              </div>
            )}

            {step === 5 && (
              <div className="overflow-x-auto">
                <TfidfList rows={TFIDF} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 第 4 步之後：out-of-core learning 旁支 */}
        <AnimatePresence>
          {showBranch && (
            <motion.div
              key="branch"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="mt-3"
            >
              <OutOfCoreBranch />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 第 5 步：兩個並列終點 */}
        <AnimatePresence>
          {showEndpoints && (
            <motion.div
              key="endpoints"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-3 flex flex-wrap gap-3"
            >
              <EndpointCard
                icon={<Scale size={13} />}
                title="Logistic Regression"
                subtitle="判別式"
                desc="直接學「給定這組特徵，標籤是什麼」的邊界。"
                accent="var(--blue-600)"
              />
              <EndpointCard
                icon={<Brain size={13} />}
                title="Naive Bayes"
                subtitle="生成式"
                desc="先學每個類別下詞的分布，再用貝氏定理反推標籤。"
                accent="var(--orange-600)"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 核心洞察 */}
      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
        模型吃不下文字，只吃得下數字——這條管線就是把非結構化的字變成有鑑別力的向量。
      </p>
    </div>
  );
}
