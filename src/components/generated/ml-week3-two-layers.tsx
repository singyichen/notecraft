import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Box, Table2, Lightbulb } from 'lucide-react'

/**
 * NumPy 與 Pandas 分層對照。
 * 核心洞察：選型判斷是「有沒有欄名、型別是否一致」，不是資料大小 ——
 * Pandas 的 DataFrame 底下就是 ndarray，廣播 / 遮罩 / 聚合沿用同一套機制，
 * 只是多包了一層欄名與索引。
 */

type LayerKey = 'numpy' | 'pandas'

interface CapabilityNode {
  title: string
  code: string
}

interface Layer {
  key: LayerKey
  tabLabel: string
  centerObject: string
  subtitle: string
  nodes: CapabilityNode[]
}

const LAYERS: Layer[] = [
  {
    key: 'numpy',
    tabLabel: 'NumPy',
    centerObject: 'ndarray',
    subtitle: '同型別數值運算',
    nodes: [
      { title: '向量化 / ufuncs', code: 'X * 2 + 1' },
      { title: '聚合（axis 是被壓扁的維度）', code: 'X.mean(axis=0)' },
      { title: '廣播', code: 'X - X.mean(axis=0)' },
      { title: '布林遮罩', code: 'temps[temps > 30]' },
      { title: '花式索引', code: 'X[[0, 2, 5]]' },
    ],
  },
  {
    key: 'pandas',
    tabLabel: 'Pandas',
    centerObject: 'Series / DataFrame',
    subtitle: '有欄名的真實表格',
    nodes: [
      { title: '.loc / .iloc', code: 'df.loc["2024-01", "close"]' },
      { title: '缺失值處理', code: 'df.fillna(df.mean())' },
      { title: 'groupby', code: 'df.groupby("city")["temp"].mean()' },
      { title: 'concat / merge / join', code: 'df.merge(other, on="id")' },
      { title: '樞紐分析與時間序列', code: 'df.pivot_table(index="city")' },
    ],
  },
]

export default function MlWeek3TwoLayers() {
  const reduce = useReducedMotion() ?? false
  const [activeKey, setActiveKey] = useState<LayerKey>('numpy')
  const layer = LAYERS.find((l) => l.key === activeKey) ?? LAYERS[0]
  const Icon = layer.key === 'numpy' ? Box : Table2

  return (
    <div className="not-prose w-full space-y-4">
      {/* 二選一切換 */}
      <div className="inline-flex rounded-[var(--radius-pill)] p-1 gap-1 bg-[var(--surface-sunken)]">
        {LAYERS.map((l) => {
          const on = l.key === activeKey
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setActiveKey(l.key)}
              aria-pressed={on}
              className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
              style={{
                background: on ? 'var(--blue-600)' : 'transparent',
                color: on ? '#fff' : 'var(--text-body)',
              }}
            >
              {l.tabLabel}
            </button>
          )
        })}
      </div>

      {/* 中心物件 + 五個能力節點 */}
      <div className="flex flex-wrap gap-4 items-stretch">
        <motion.div
          key={`center-${layer.key}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="shrink-0 w-44 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[132px]"
        >
          <Icon
            size={26}
            style={{ color: layer.key === 'numpy' ? 'var(--blue-500)' : 'var(--orange-500)' }}
          />
          <div className="font-mono font-bold text-base leading-snug text-[var(--text-strong)] break-words">
            {layer.centerObject}
          </div>
          <div className="text-xs leading-snug text-[var(--text-muted)]">{layer.subtitle}</div>
        </motion.div>

        <div className="flex-1 min-w-[200px] flex flex-wrap content-start gap-2">
          {layer.nodes.map((node, i) => (
            <motion.div
              key={`${layer.key}-${i}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                ease: 'easeOut',
                delay: reduce ? 0 : i * 0.04,
              }}
              className="basis-[47%] grow min-w-[160px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2"
            >
              <div className="text-xs font-semibold leading-snug text-[var(--text-body)]">
                {node.title}
              </div>
              <code className="mt-1 block font-mono text-xs leading-snug text-[var(--text-accent)] break-words">
                {node.code}
              </code>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 固定關係帶：切換時不消失 */}
      <div
        className="w-full flex items-center py-3 pl-5 pr-9 text-sm font-semibold leading-snug text-white"
        style={{
          background: 'var(--gradient-header)',
          clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        DataFrame 底下就是 ndarray：廣播、遮罩、聚合沿用同一套機制
      </div>

      {/* 核心洞察 */}
      <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-muted)]">
        <Lightbulb size={14} className="shrink-0 mt-0.5 text-[var(--orange-600)]" />
        <span>選型看的是「有沒有欄名、型別是否一致」，不是資料大小。</span>
      </div>
    </div>
  )
}
