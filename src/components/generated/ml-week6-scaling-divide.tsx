import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  SlidersHorizontal,
  Zap,
  TrendingUp,
  Ruler,
  Target,
  MapPin,
  GitBranch,
  TreePine,
} from 'lucide-react';
import { clsx } from 'clsx';

type GroupKey = 'scale' | 'noScale';
type ViewMode = 'group' | 'reason';

interface ClassifierItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  reason: string;
  group: GroupKey;
}

const CLASSIFIERS: ClassifierItem[] = [
  {
    id: 'perceptron-adaline',
    name: '感知器 / Adaline',
    icon: <Zap size={14} />,
    reason: '梯度下降更新權重，特徵尺度會直接改變有效步長。',
    group: 'scale',
  },
  {
    id: 'logistic-regression',
    name: '邏輯斯迴歸',
    icon: <TrendingUp size={14} />,
    reason: '同樣以梯度下降訓練，尺度影響收斂速度與穩定性。',
    group: 'scale',
  },
  {
    id: 'linear-svm',
    name: '線性 SVM',
    icon: <Ruler size={14} />,
    reason: '靠間隔（樣本到邊界的距離）定義最佳邊界。',
    group: 'scale',
  },
  {
    id: 'rbf-svm',
    name: 'RBF 核 SVM',
    icon: <Target size={14} />,
    reason: '核函數直接以歐氏距離計算樣本相似度。',
    group: 'scale',
  },
  {
    id: 'knn',
    name: 'k 近鄰（KNN）',
    icon: <MapPin size={14} />,
    reason: '整個演算法的核心就是在計算樣本間的距離。',
    group: 'scale',
  },
  {
    id: 'decision-tree',
    name: '決策樹',
    icon: <GitBranch size={14} />,
    reason: '每次分裂只問「這個特徵大於某個閾值嗎」。',
    group: 'noScale',
  },
  {
    id: 'random-forest',
    name: '隨機森林',
    icon: <TreePine size={14} />,
    reason: '由多棵決策樹組成，分裂邏輯與決策樹相同。',
    group: 'noScale',
  },
];

const GROUP_META: Record<
  GroupKey,
  { title: string; badge: string; bg: string; border: string; text: string; iconBg: string }
> = {
  scale: {
    title: '靠距離或靠梯度學習',
    badge: '需要特徵縮放',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  noScale: {
    title: '只比大小',
    badge: '不需要特徵縮放',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100 text-orange-700',
  },
};

interface ClassifierCardProps {
  item: ClassifierItem;
  showReason: boolean;
  reducedMotion: boolean;
}

function ClassifierCard({ item, showReason, reducedMotion }: ClassifierCardProps) {
  const meta = GROUP_META[item.group];
  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2.5',
        meta.bg,
        meta.border,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', meta.iconBg)}>
          {item.icon}
        </span>
        <span className="text-xs font-semibold leading-snug text-neutral-800">{item.name}</span>
      </div>
      <AnimatePresence initial={false}>
        {showReason && (
          <motion.p
            key="reason"
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className={clsx('overflow-hidden text-[11px] leading-snug', meta.text)}
          >
            <span className="mt-1.5 block pl-8">{item.reason}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MlWeek6ScalingDivide() {
  const reducedMotion = useReducedMotion() ?? false;
  const [mode, setMode] = useState<ViewMode>('group');
  const showReason = mode === 'reason';

  const scaleItems = CLASSIFIERS.filter((c) => c.group === 'scale');
  const noScaleItems = CLASSIFIERS.filter((c) => c.group === 'noScale');

  return (
    <div className="not-prose space-y-4">
      {/* 頂部說明 + 切換 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            哪些分類器需要特徵縮放
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode('group')}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
              mode === 'group'
                ? 'border-transparent bg-blue-600 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
            )}
          >
            只看分組
          </button>
          <button
            type="button"
            onClick={() => setMode('reason')}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
              mode === 'reason'
                ? 'border-transparent bg-blue-600 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
            )}
          >
            顯示原因
          </button>
        </div>
      </div>

      {/* 兩欄 + 分界線 */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className={clsx('text-xs font-bold', GROUP_META.scale.text)}>{GROUP_META.scale.title}</p>
              <p className="text-[10px] font-medium text-neutral-400">{GROUP_META.scale.badge}</p>
            </div>
            <div className="space-y-2">
              {scaleItems.map((item) => (
                <ClassifierCard key={item.id} item={item} showReason={showReason} reducedMotion={reducedMotion} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className={clsx('text-xs font-bold', GROUP_META.noScale.text)}>{GROUP_META.noScale.title}</p>
              <p className="text-[10px] font-medium text-neutral-400">{GROUP_META.noScale.badge}</p>
            </div>
            <div className="space-y-2">
              {noScaleItems.map((item) => (
                <ClassifierCard key={item.id} item={item} showReason={showReason} reducedMotion={reducedMotion} />
              ))}
            </div>
          </div>
        </div>

        {/* 分界線：僅「顯示原因」時出現 */}
        <AnimatePresence>
          {showReason && (
            <motion.div
              key="divider"
              initial={reducedMotion ? false : { opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.6 }}
              transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center"
              aria-hidden="true"
            >
              <div className="relative h-full w-px bg-orange-600/60">
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-orange-600/60 bg-white px-0.5 py-2 text-[9px] font-semibold tracking-wide text-orange-700"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  靠距離或靠梯度 ↔ 只比大小
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 核心洞察 */}
      <p className="border-t border-neutral-100 pt-2.5 text-[11px] leading-relaxed text-neutral-500">
        「是否需要特徵縮放」的分界，正好切在「靠距離或靠梯度學習」與「只比大小」兩類模型之間。
      </p>
    </div>
  );
}
