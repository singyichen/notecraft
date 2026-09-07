/**
 * 核心洞察：挑分類器時，「決策邊界的形狀」「能不能直接吐出機率」「可不可以跟人解釋」
 * 是三個獨立的軸——不會因為邊界複雜就代表不能解釋（決策樹邊界簡單卻可解釋，隨機森林
 * 邊界更複雜、可解釋性反而中等），也不會因為輸出是機率就代表可解釋（隨機森林能給出
 * 機率，但「為什麼」仍要翻開一整片森林）。本表只放這三軸 + 分類器名稱，特徵縮放與
 * 訓練 / 預測成本留給同篇另外兩個元件處理，避免資訊重複。
 */

import { Check, X, CircuitBoard, Percent, Spline, Waypoints, GitBranch, Trees, Users, type LucideIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

type ExplainLevel = 'low' | 'mid' | 'high'

interface ClassifierRow {
  id: string
  name: string
  icon: LucideIcon
  boundary: string
  hasProbability: boolean
  probabilityNote?: string
  explainability: ExplainLevel
}

const ROWS: ClassifierRow[] = [
  {
    id: 'perceptron-adaline',
    name: '感知器 / Adaline',
    icon: CircuitBoard,
    boundary: '直線',
    hasProbability: false,
    explainability: 'high',
  },
  {
    id: 'logistic-regression',
    name: '邏輯斯迴歸',
    icon: Percent,
    boundary: '直線',
    hasProbability: true,
    explainability: 'high',
  },
  {
    id: 'linear-svm',
    name: '線性 SVM',
    icon: Spline,
    boundary: '直線（最大間隔）',
    hasProbability: false,
    probabilityNote: '需 Platt scaling',
    explainability: 'mid',
  },
  {
    id: 'rbf-svm',
    name: 'RBF 核 SVM',
    icon: Waypoints,
    boundary: '曲面',
    hasProbability: false,
    probabilityNote: '需 Platt scaling',
    explainability: 'low',
  },
  {
    id: 'decision-tree',
    name: '決策樹',
    icon: GitBranch,
    boundary: '軸平行切割',
    hasProbability: true,
    probabilityNote: '葉節點比例',
    explainability: 'high',
  },
  {
    id: 'random-forest',
    name: '隨機森林',
    icon: Trees,
    boundary: '多棵樹軸平行切割平均',
    hasProbability: true,
    probabilityNote: '多樹投票比例',
    explainability: 'mid',
  },
  {
    id: 'knn',
    name: 'k 近鄰（KNN）',
    icon: Users,
    boundary: '鄰域投票（不規則）',
    hasProbability: true,
    probabilityNote: '鄰居比例',
    explainability: 'mid',
  },
]

function ProbabilityMark({ hasProbability, note }: { hasProbability: boolean; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={twMerge(
          'inline-flex items-center gap-1.5 text-xs font-semibold',
          hasProbability ? 'text-[var(--success-500)]' : 'text-[var(--neutral-400)]',
        )}
      >
        {hasProbability ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
        {hasProbability ? '是' : '否'}
      </span>
      {note ? <span className="text-[0.6875rem] leading-snug text-[var(--text-muted)]">{note}</span> : null}
    </div>
  )
}

function ExplainabilityBlocks({ level }: { level: ExplainLevel }) {
  const order: ExplainLevel[] = ['low', 'mid', 'high']
  const colorMap: Record<ExplainLevel, string> = {
    low: 'bg-[var(--danger-500)]',
    mid: 'bg-[var(--warning-500)]',
    high: 'bg-[var(--success-500)]',
  }
  const textColorMap: Record<ExplainLevel, string> = {
    low: 'text-[var(--danger-500)]',
    mid: 'text-[var(--warning-500)]',
    high: 'text-[var(--success-500)]',
  }
  const labelMap: Record<ExplainLevel, string> = { low: '低', mid: '中', high: '高' }
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" role="img" aria-label={`可解釋性：${labelMap[level]}`}>
        {order.map((key) => (
          <span
            key={key}
            className={twMerge('h-2.5 w-4 rounded-[var(--radius-xs)]', key === level ? colorMap[key] : 'bg-[var(--neutral-200)]')}
          />
        ))}
      </div>
      <span className={twMerge('text-xs font-semibold', textColorMap[level])}>{labelMap[level]}</span>
    </div>
  )
}

export default function MlWeek6ClassifierTable() {
  return (
    <div className="not-prose w-full">
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        <table className="w-full min-w-[540px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-left">
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">分類器</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">決策邊界形狀</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">輸出機率</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">可解釋性</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const Icon = row.icon
              return (
                <tr key={row.id} className="border-b border-[var(--border-subtle)] last:border-0 align-top">
                  <td className="px-3 py-3 font-medium text-[var(--text-strong)]">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="shrink-0 text-[var(--blue-600)]" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-body)]">{row.boundary}</td>
                  <td className="px-3 py-3">
                    <ProbabilityMark hasProbability={row.hasProbability} note={row.probabilityNote} />
                  </td>
                  <td className="px-3 py-3">
                    <ExplainabilityBlocks level={row.explainability} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
