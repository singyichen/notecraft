import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { RefreshCw, Target, ArrowRight, MousePointerClick } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * scikit-learn 的兩套 API 結構圖：Transformer（fit → transform）與 Estimator（fit → predict）。
 * 核心洞察：認出一個類別屬於哪一套，就知道它該呼叫什麼方法、
 * 能不能放進 Pipeline 的哪個位置（Pipeline 中間每一步都必須是 Transformer，只有最後一步能是 Estimator）。
 */

type ApiSide = 'transformer' | 'estimator'

interface ApiClass {
  key: string
  name: string
  module: string
  side: ApiSide
  summary: string
}

const CLASSES: ApiClass[] = [
  { key: 'simple-imputer', name: 'SimpleImputer', module: 'impute', side: 'transformer', summary: '補上缺失值' },
  { key: 'standard-scaler', name: 'StandardScaler', module: 'preprocessing', side: 'transformer', summary: '標準化：減均值除以標準差' },
  { key: 'minmax-scaler', name: 'MinMaxScaler', module: 'preprocessing', side: 'transformer', summary: '正規化：縮放到固定區間' },
  { key: 'robust-scaler', name: 'RobustScaler', module: 'preprocessing', side: 'transformer', summary: '抗離群值的縮放' },
  { key: 'label-encoder', name: 'LabelEncoder', module: 'preprocessing', side: 'transformer', summary: '把類別標籤編碼成整數' },
  { key: 'onehot-encoder', name: 'OneHotEncoder', module: 'preprocessing', side: 'transformer', summary: '把類別欄位獨熱編碼' },
  { key: 'function-transformer', name: 'FunctionTransformer', module: 'preprocessing', side: 'transformer', summary: '包裝任意可呼叫物件成轉換器' },
  { key: 'column-transformer', name: 'ColumnTransformer', module: 'compose', side: 'transformer', summary: '選擇性轉換特定欄位' },
  { key: 'sequential-feature-selector', name: 'SequentialFeatureSelector', module: 'feature_selection', side: 'transformer', summary: '序列特徵選取' },
  { key: 'select-from-model', name: 'SelectFromModel', module: 'feature_selection', side: 'transformer', summary: '依模型給的重要度選取特徵' },
  { key: 'perceptron', name: 'Perceptron', module: 'linear_model', side: 'estimator', summary: '感知器分類器' },
  { key: 'logistic-regression', name: 'LogisticRegression', module: 'linear_model', side: 'estimator', summary: '邏輯斯迴歸分類器' },
  { key: 'svc', name: 'SVC', module: 'svm', side: 'estimator', summary: '支援向量分類器' },
  { key: 'knn-classifier', name: 'KNeighborsClassifier', module: 'neighbors', side: 'estimator', summary: 'k 近鄰分類器' },
  { key: 'decision-tree', name: 'DecisionTreeClassifier', module: 'tree', side: 'estimator', summary: '決策樹分類器' },
  { key: 'random-forest', name: 'RandomForestClassifier', module: 'ensemble', side: 'estimator', summary: '隨機森林分類器' },
]

const TRANSFORMER_ITEMS = CLASSES.filter((c) => c.side === 'transformer')
const ESTIMATOR_ITEMS = CLASSES.filter((c) => c.side === 'estimator')

const SIDE_META: Record<
  ApiSide,
  {
    label: string
    chain: string
    chipBase: string
    chipSelected: string
    moduleMuted: string
    moduleSelected: string
    text: string
  }
> = {
  transformer: {
    label: 'Transformer API',
    chain: 'fit() → transform()',
    chipBase: 'bg-[var(--blue-50)] text-[var(--blue-700)]',
    chipSelected: 'bg-[var(--blue-500)] text-white',
    moduleMuted: 'text-[var(--blue-400)]',
    moduleSelected: 'text-white/75',
    text: 'text-[var(--blue-700)]',
  },
  estimator: {
    label: 'Estimator API',
    chain: 'fit() → predict()',
    chipBase: 'bg-[var(--orange-50)] text-[var(--orange-700)]',
    chipSelected: 'bg-[var(--orange-500)] text-white',
    moduleMuted: 'text-[var(--orange-400)]',
    moduleSelected: 'text-white/75',
    text: 'text-[var(--orange-700)]',
  },
}

interface ChipProps {
  item: ApiClass
  selected: boolean
  onSelect: (key: string) => void
}

function Chip({ item, selected, onSelect }: ChipProps) {
  const meta = SIDE_META[item.side]
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-pressed={selected}
      className={clsx(
        'inline-flex shrink-0 items-baseline gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 whitespace-nowrap transition-colors duration-200',
        selected ? meta.chipSelected : meta.chipBase,
      )}
    >
      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
        {item.name}
      </span>
      <span className={clsx('text-[10px]', selected ? meta.moduleSelected : meta.moduleMuted)}>
        ({item.module})
      </span>
    </button>
  )
}

interface PipelineBlockProps {
  label: string
  variant: 'transformer' | 'dashed' | 'estimator'
  index: number
  reduce: boolean
}

function PipelineBlock({ label, variant, index, reduce }: PipelineBlockProps) {
  const styleByVariant: Record<PipelineBlockProps['variant'], string> = {
    transformer: 'border border-[var(--blue-200)] bg-[var(--blue-50)] text-[var(--blue-700)]',
    dashed: 'border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-100)] text-[var(--text-muted)]',
    estimator: 'border border-[var(--orange-400)] bg-[var(--orange-100)] text-[var(--orange-700)]',
  }
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.24, ease: 'easeOut', delay: reduce ? 0 : index * 0.04 }}
      className={clsx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--radius-md)] px-2 py-1 text-[11px] font-medium',
        styleByVariant[variant],
      )}
      style={variant !== 'dashed' ? { fontFamily: 'var(--font-mono)' } : undefined}
    >
      {label}
    </motion.span>
  )
}

export default function MlWeek6SklearnApiMap() {
  const reduce = useReducedMotion() ?? false
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selected = selectedKey ? CLASSES.find((c) => c.key === selectedKey) ?? null : null
  const selectedMeta = selected ? SIDE_META[selected.side] : null

  return (
    <div className="not-prose max-w-[640px] mx-auto space-y-4">
      {/* 欄位 header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <RefreshCw size={14} className="text-[var(--blue-600)]" />
            <span className="text-xs font-semibold text-[var(--blue-700)]">{SIDE_META.transformer.label}</span>
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue-600)' }}>
            {SIDE_META.transformer.chain}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            <span style={{ fontFamily: 'var(--font-mono)' }}>fit_transform()</span> 為捷徑
          </p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-[var(--orange-600)]" />
            <span className="text-xs font-semibold text-[var(--orange-700)]">{SIDE_META.estimator.label}</span>
          </div>
          <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange-600)' }}>
            {SIDE_META.estimator.chain}
          </p>
        </div>
      </div>

      {/* chip 雲 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TRANSFORMER_ITEMS.map((item) => (
            <Chip key={item.key} item={item} selected={item.key === selectedKey} onSelect={setSelectedKey} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ESTIMATOR_ITEMS.map((item) => (
            <Chip key={item.key} item={item} selected={item.key === selectedKey} onSelect={setSelectedKey} />
          ))}
        </div>
      </div>

      {/* 詳情面板 */}
      <div className="h-[88px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2.5">
        <AnimatePresence mode="wait" initial={false}>
          {selected && selectedMeta ? (
            <motion.div
              key={selected.key}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
              className="flex h-full flex-col justify-center gap-1"
            >
              <p className="m-0 text-xs text-[var(--text-body)]">
                模組：<span style={{ fontFamily: 'var(--font-mono)' }}>{selected.module}</span>
              </p>
              <p className="m-0 text-xs text-[var(--text-body)]">在做什麼：{selected.summary}</p>
              <p className={clsx('m-0 text-xs font-medium', selectedMeta.text)}>
                屬於：{selectedMeta.label}
                <span className="text-[var(--text-muted)]">
                  {' · '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedMeta.chain}</span>
                </span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
              className="flex h-full flex-col items-center justify-center gap-1 text-[var(--text-muted)]"
            >
              <MousePointerClick size={16} />
              <p className="m-0 text-xs">點選上方任一類別查看細節</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pipeline 流程帶 */}
      <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <PipelineBlock label="Transformer" variant="transformer" index={0} reduce={reduce} />
          <PipelineBlock label="Transformer" variant="transformer" index={1} reduce={reduce} />
          <PipelineBlock label="…（n 個）" variant="dashed" index={2} reduce={reduce} />
          <motion.span
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: 'easeOut', delay: reduce ? 0 : 0.12 }}
            className="inline-flex shrink-0 items-center text-[var(--text-muted)]"
          >
            <ArrowRight size={14} />
          </motion.span>
          <PipelineBlock label="Estimator" variant="estimator" index={4} reduce={reduce} />
        </div>
        <p className="m-0 text-xs text-[var(--text-muted)]">
          n 個 Transformer 依序接，最後一個必須是 Estimator
        </p>
        <p className="m-0 text-[10px] text-[var(--text-muted)]">
          PCA 等特例本身同時具備 <span style={{ fontFamily: 'var(--font-mono)' }}>transform()</span>
        </p>
      </div>
    </div>
  )
}
