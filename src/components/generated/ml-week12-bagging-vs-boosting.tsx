import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Stethoscope,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ArrowDown,
  ArrowRight,
  Database,
  Users,
  Scale,
  Repeat,
  CircleAlert,
} from 'lucide-react';

type Branch = 'bagging' | 'boosting';

// ────────────────────────────────────────────────────────────
// 診斷選項 —— 對應決策樹的兩條分支
// ────────────────────────────────────────────────────────────
const DIAGNOSES: {
  key: Branch;
  icon: typeof TrendingUp;
  title: string;
  verdict: string;
  color: string; // CSS var，僅供文字/邊框上色
}[] = [
  {
    key: 'bagging',
    icon: TrendingUp,
    title: '訓練分數高，測試分數落後',
    verdict: '高變異 · Overfitting',
    color: 'var(--blue-600)',
  },
  {
    key: 'boosting',
    icon: TrendingDown,
    title: '訓練、測試分數都不理想',
    verdict: '高偏差 · Underfitting',
    color: 'var(--orange-600)',
  },
];

export default function MlWeek12BaggingVsBoosting() {
  const shouldReduce = useReducedMotion();
  const [active, setActive] = useState<Branch | null>(null);

  const dur = shouldReduce ? 0 : 0.28;
  const stagger = shouldReduce ? 0 : 0.2;

  const toggle = (key: Branch) => {
    setActive((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ── 診斷入口 ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={16} style={{ color: 'var(--blue-600)' }} />
          <h3
            className="text-sm font-bold leading-snug"
            style={{ color: 'var(--text-strong)' }}
          >
            模型表現不如預期？先做這個診斷
          </h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          點選最接近的情況，看該往哪一支修正
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {DIAGNOSES.map((d) => {
            const Icon = d.icon;
            const selected = active === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setActive(d.key)}
                aria-pressed={selected}
                className="text-left p-2.5 transition-colors"
                style={{
                  background: selected ? 'var(--surface-card)' : 'var(--surface-sunken)',
                  border: `1.5px solid ${selected ? d.color : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Icon size={15} style={{ color: d.color }} />
                <div
                  className="text-xs font-semibold leading-snug mt-1.5"
                  style={{ color: 'var(--text-strong)' }}
                >
                  {d.title}
                </div>
                <div className="text-[11px] font-medium mt-1" style={{ color: d.color }}>
                  {d.verdict}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bagging 分支（並行） ── */}
      <Panel
        title="Bagging（並行）"
        subtitle="多個模型互相獨立，平均掉抖動"
        icon={Scale}
        color="var(--blue-600)"
        expanded={active === 'bagging'}
        onToggle={() => toggle('bagging')}
      >
        <div className="min-h-[236px]">
          {/* 訓練資料 */}
          <div className="flex justify-center mb-2">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1"
              style={{
                background: 'var(--blue-50)',
                border: '1px solid var(--blue-200)',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <Database size={13} style={{ color: 'var(--blue-600)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--blue-700)' }}>
                訓練資料
              </span>
            </div>
          </div>

          {/* 拆分箭頭 */}
          <div className="flex justify-between px-8 mb-1" aria-hidden="true">
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
          </div>

          {/* 三個模型 —— 同時淡入，代表並行 */}
          <div className="flex gap-2">
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease: 'easeOut' }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--blue-300)', borderRadius: 'var(--radius-md)' }}
            >
              <Users size={14} style={{ color: 'var(--blue-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--blue-700)' }}>
                模型 1
              </div>
            </motion.div>
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease: 'easeOut' }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--blue-300)', borderRadius: 'var(--radius-md)' }}
            >
              <Users size={14} style={{ color: 'var(--blue-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--blue-700)' }}>
                模型 2
              </div>
            </motion.div>
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease: 'easeOut' }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--blue-300)', borderRadius: 'var(--radius-md)' }}
            >
              <Users size={14} style={{ color: 'var(--blue-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--blue-700)' }}>
                模型 3
              </div>
            </motion.div>
          </div>

          {/* 匯流箭頭 */}
          <div className="flex justify-between px-8 my-1" aria-hidden="true">
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
            <ArrowDown size={13} style={{ color: 'var(--blue-300)' }} />
          </div>

          {/* 平均 / 投票節點 */}
          <div className="flex justify-center mb-3">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5"
              style={{ background: 'var(--blue-600)', borderRadius: 'var(--radius-pill)' }}
            >
              <Scale size={13} color="#ffffff" />
              <span className="text-xs font-bold text-white">平均 / 投票</span>
            </div>
          </div>

          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--blue-600)' }}>
            並行訓練 · 彼此獨立 · 平均掉抖動
          </p>

          <ul className="space-y-1 text-xs leading-snug" style={{ color: 'var(--text-body)' }}>
            <li>
              <strong style={{ color: 'var(--blue-700)' }}>Majority Voting</strong>
              {' '}—— 多個模型各自預測，投票決定
            </li>
            <li>
              <strong style={{ color: 'var(--blue-700)' }}>Bagging / Random Forest</strong>
              {' '}—— bootstrap 抽樣，每棵樹看不同子集
            </li>
          </ul>
        </div>
      </Panel>

      {/* ── Boosting 分支（序列） ── */}
      <Panel
        title="Boosting（序列）"
        subtitle="逐輪接力，後者修正前者的錯"
        icon={Repeat}
        color="var(--orange-600)"
        expanded={active === 'boosting'}
        onToggle={() => toggle('boosting')}
      >
        <div className="min-h-[236px]">
          <div className="flex items-center gap-1.5">
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: dur, ease: 'easeOut', delay: 0 * stagger }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--orange-300)', borderRadius: 'var(--radius-md)' }}
            >
              <CircleAlert size={14} style={{ color: 'var(--orange-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--orange-700)' }}>
                模型 1
              </div>
            </motion.div>

            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur, delay: 0.6 * stagger }}
              className="shrink-0"
              aria-hidden="true"
            >
              <ArrowRight size={14} style={{ color: 'var(--orange-400)' }} />
            </motion.div>

            <motion.div
              initial={shouldReduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: dur, ease: 'easeOut', delay: 1 * stagger }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--orange-300)', borderRadius: 'var(--radius-md)' }}
            >
              <CircleAlert size={14} style={{ color: 'var(--orange-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--orange-700)' }}>
                模型 2
              </div>
            </motion.div>

            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur, delay: 1.6 * stagger }}
              className="shrink-0"
              aria-hidden="true"
            >
              <ArrowRight size={14} style={{ color: 'var(--orange-400)' }} />
            </motion.div>

            <motion.div
              initial={shouldReduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: dur, ease: 'easeOut', delay: 2 * stagger }}
              className="flex-1 text-center px-1.5 py-2"
              style={{ background: 'var(--surface-card)', border: '1.5px solid var(--orange-300)', borderRadius: 'var(--radius-md)' }}
            >
              <CircleAlert size={14} style={{ color: 'var(--orange-600)', margin: '0 auto' }} />
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--orange-700)' }}>
                模型 3
              </div>
            </motion.div>
          </div>

          <p
            className="text-[11px] mt-2.5 mb-2 flex items-center gap-1"
            style={{ color: 'var(--orange-600)' }}
          >
            <Repeat size={11} />
            把上一輪的錯誤交給下一輪
          </p>

          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--orange-600)' }}>
            序列補課 · 後者修正前者的錯
          </p>

          <ul className="space-y-1 text-xs leading-snug" style={{ color: 'var(--text-body)' }}>
            <li>
              <strong style={{ color: 'var(--orange-700)' }}>AdaBoost</strong>
              {' '}—— 調整樣本權重，答錯的下一輪加重
            </li>
            <li>
              <strong style={{ color: 'var(--orange-700)' }}>Gradient Boosting</strong>
              {' '}—— 擬合前一輪的殘差（負梯度）
            </li>
            <li>
              <strong style={{ color: 'var(--orange-700)' }}>XGBoost</strong>
              {' '}—— 加上正則化與高效實作
            </li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 分支面板 —— 可折疊，標題列本身也能點開（供對照）
// ────────────────────────────────────────────────────────────
interface PanelProps {
  title: string;
  subtitle: string;
  icon: typeof Scale;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function Panel({ title, subtitle, icon: Icon, color, expanded, onToggle, children }: PanelProps) {
  const shouldReduce = useReducedMotion();
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors"
        style={{
          background: expanded ? 'var(--surface-sunken)' : 'var(--surface-card)',
          border: `1px solid ${expanded ? color : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon size={16} style={{ color, flexShrink: 0 }} />
          <span className="min-w-0">
            <span className="text-sm font-bold block" style={{ color: 'var(--text-strong)' }}>
              {title}
            </span>
            <span className="text-[11px] block truncate" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{
            color,
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease-out',
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.22, ease: 'easeOut' }}
            className="px-1 pt-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
