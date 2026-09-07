/**
 * 核心洞察：挑分類器前，先看兩件事就能過濾一半選項——
 * （1）「是否需要特徵縮放」把七個模型切成兩群：靠距離或靠梯度學習的（感知器 /
 * Adaline、邏輯斯迴歸、線性 SVM、RBF 核 SVM、KNN）都得先標準化；只比大小的
 * 決策樹與隨機森林可以跳過，本表用底色把這兩列標出來，一眼就能看出分界。
 * （2）「訓練成本 vs 預測成本」不是同向增減——KNN 訓練幾乎免費、預測卻要
 * 掃過全部資料；RBF 核 SVM 恰好相反，訓練昂貴、預測相對便宜，兩者互為對照組。
 */

import {
  Check,
  X,
  CircleDashed,
  Ruler,
  Ban,
  ArrowUp,
  ArrowDown,
  Equal,
  ArrowLeftRight,
  CircuitBoard,
  Percent,
  Spline,
  Waypoints,
  GitBranch,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'

type CostLevel = 1 | 2 | 3
type ProbabilityAnswer = 'yes' | 'no' | 'approx'

interface ClassifierRow {
  id: string
  name: string
  icon: LucideIcon
  boundary: string
  needsScaling: boolean
  probability: ProbabilityAnswer
  probabilityNote?: string
  explainability: CostLevel
  trainCost: CostLevel
  predictCost: CostLevel
  tradeoffHighlight?: boolean
  knobs: string
  useCase: string
}

const ROWS: ClassifierRow[] = [
  {
    id: 'perceptron-adaline',
    name: '感知器 / Adaline',
    icon: CircuitBoard,
    boundary: '直線（線性）',
    needsScaling: true,
    probability: 'no',
    explainability: 3,
    trainCost: 1,
    predictCost: 1,
    knobs: '學習率',
    useCase: '手刻梯度下降的教學基準線，資料須線性可分',
  },
  {
    id: 'logistic-regression',
    name: '邏輯斯迴歸',
    icon: Percent,
    boundary: '直線（線性）',
    needsScaling: true,
    probability: 'yes',
    explainability: 3,
    trainCost: 1,
    predictCost: 1,
    knobs: 'C（正則化強度倒數）',
    useCase: '需要機率輸出與可解釋權重的預設基準模型',
  },
  {
    id: 'linear-svm',
    name: '線性 SVM',
    icon: Spline,
    boundary: '直線（最大間隔）',
    needsScaling: true,
    probability: 'no',
    probabilityNote: '原生不輸出機率',
    explainability: 2,
    trainCost: 2,
    predictCost: 1,
    knobs: 'C',
    useCase: '高維稀疏特徵（如文字分類）的線性基準',
  },
  {
    id: 'rbf-svm',
    name: 'RBF 核 SVM',
    icon: Waypoints,
    boundary: '曲面（非線性）',
    needsScaling: true,
    probability: 'no',
    probabilityNote: '原生不輸出機率',
    explainability: 1,
    trainCost: 3,
    predictCost: 1,
    tradeoffHighlight: true,
    knobs: 'C、gamma',
    useCase: '邊界明顯非線性（如同心圓）、資料量中小',
  },
  {
    id: 'decision-tree',
    name: '決策樹',
    icon: GitBranch,
    boundary: '軸平行切割',
    needsScaling: false,
    probability: 'approx',
    probabilityNote: '葉節點類別比例',
    explainability: 3,
    trainCost: 1,
    predictCost: 1,
    knobs: '樹深（max_depth）',
    useCase: '要能對人解釋規則（核貸、醫療分流）',
  },
  {
    id: 'random-forest',
    name: '隨機森林',
    icon: Trees,
    boundary: '軸平行切割（多樹疊加）',
    needsScaling: false,
    probability: 'approx',
    probabilityNote: '多樹投票比例',
    explainability: 2,
    trainCost: 2,
    predictCost: 2,
    knobs: 'n_estimators、樹深',
    useCase: '只求準度、不深究理由的省事預設值',
  },
  {
    id: 'knn',
    name: 'k 近鄰（KNN）',
    icon: Users,
    boundary: '鄰域投票（局部）',
    needsScaling: true,
    probability: 'approx',
    probabilityNote: '鄰居類別比例',
    explainability: 2,
    trainCost: 1,
    predictCost: 3,
    tradeoffHighlight: true,
    knobs: 'k',
    useCase: '資料量小、想要免訓練的簡單基準',
  },
]

function ScalingBadge({ needsScaling }: { needsScaling: boolean }) {
  if (needsScaling) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--blue-50)] px-2.5 py-1 text-xs font-medium text-[var(--blue-700)]">
        <Ruler size={13} className="shrink-0" />
        需要縮放
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-500)]">
      <Ban size={13} className="shrink-0" />
      不需要
    </span>
  )
}

function ProbabilityBadge({ value, note }: { value: ProbabilityAnswer; note?: string }) {
  const map: Record<
    ProbabilityAnswer,
    { icon: LucideIcon; label: string; className: string }
  > = {
    yes: { icon: Check, label: '是', className: 'text-[var(--success-500)]' },
    no: { icon: X, label: '否', className: 'text-[var(--neutral-400)]' },
    approx: { icon: CircleDashed, label: '可估算', className: 'text-[var(--warning-500)]' },
  }
  const { icon: Icon, label, className } = map[value]
  return (
    <div className="flex flex-col gap-0.5">
      <span className={twMerge('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
        <Icon size={13} className="shrink-0" />
        {label}
      </span>
      {note ? <span className="text-[0.6875rem] leading-snug text-[var(--text-muted)]">{note}</span> : null}
    </div>
  )
}

function ExplainabilityDots({ level }: { level: CostLevel }) {
  const labels: Record<CostLevel, string> = { 1: '低', 2: '中', 3: '高' }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1" role="img" aria-label={`可解釋性：${labels[level]}`}>
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={twMerge(
              'h-2 w-2 rounded-full',
              dot <= level ? 'bg-[var(--blue-500)]' : 'bg-[var(--neutral-200)]',
            )}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--text-body)]">{labels[level]}</span>
    </div>
  )
}

function CostBadge({
  label,
  level,
  highlight,
}: {
  label: string
  level: CostLevel
  highlight?: boolean
}) {
  const config: Record<
    CostLevel,
    { icon: LucideIcon; text: string; className: string }
  > = {
    1: { icon: ArrowDown, text: '低', className: 'bg-[var(--success-50)] text-[var(--success-500)]' },
    2: { icon: Equal, text: '中', className: 'bg-[var(--warning-50)] text-[var(--warning-500)]' },
    3: { icon: ArrowUp, text: '高', className: 'bg-[var(--danger-50)] text-[var(--danger-500)]' },
  }
  const { icon: Icon, text, className } = config[level]
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.6875rem] font-semibold',
        className,
        highlight && 'ring-1 ring-[var(--warning-500)]/50',
      )}
    >
      <span className="font-normal text-[var(--text-muted)]">{label}</span>
      <Icon size={11} className="shrink-0" />
      {text}
    </span>
  )
}

export default function MlWeek6Concept() {
  return (
    <div className="not-prose w-full max-w-5xl mx-auto space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Ruler size={13} className="text-[var(--blue-600)]" />
          靠距離／梯度學習 → 需要先做特徵縮放
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Ban size={13} className="text-[var(--neutral-400)]" />
          只比大小 → 不需要縮放（底色標出的兩列）
        </span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-left">
              <th className="sticky left-0 z-10 bg-[var(--surface-card)] px-3 py-2.5 font-semibold text-[var(--text-strong)]">
                分類器
              </th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">決策邊界形狀</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">特徵縮放</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">輸出機率</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">可解釋性</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">訓練 vs 預測成本</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">主要調參旋鈕</th>
              <th className="px-3 py-2.5 font-semibold text-[var(--text-strong)]">典型適用情境</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const rowBg = row.needsScaling ? 'bg-[var(--surface-card)]' : 'bg-[var(--orange-50)]'
              const Icon = row.icon
              return (
                <tr key={row.id} className="border-b border-[var(--border-subtle)] last:border-0 align-top">
                  <td
                    className={twMerge(
                      'sticky left-0 z-10 px-3 py-3 font-medium text-[var(--text-strong)]',
                      rowBg,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="shrink-0 text-[var(--blue-600)]" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className={twMerge('px-3 py-3 text-[var(--text-body)]', rowBg)}>{row.boundary}</td>
                  <td className={twMerge('px-3 py-3', rowBg)}>
                    <ScalingBadge needsScaling={row.needsScaling} />
                  </td>
                  <td className={twMerge('px-3 py-3', rowBg)}>
                    <ProbabilityBadge value={row.probability} note={row.probabilityNote} />
                  </td>
                  <td className={twMerge('px-3 py-3', rowBg)}>
                    <ExplainabilityDots level={row.explainability} />
                  </td>
                  <td className={twMerge('px-3 py-3', rowBg)}>
                    <div className="flex flex-col gap-1">
                      <CostBadge label="訓練" level={row.trainCost} highlight={row.tradeoffHighlight} />
                      <CostBadge label="預測" level={row.predictCost} highlight={row.tradeoffHighlight} />
                    </div>
                  </td>
                  <td className={twMerge('px-3 py-3 text-[var(--text-body)]', rowBg)}>{row.knobs}</td>
                  <td className={twMerge('px-3 py-3 text-[var(--text-body)] leading-snug', rowBg)}>
                    {row.useCase}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning-500)]/30 bg-[var(--warning-50)] px-3 py-2 text-xs text-[var(--warning-700)]">
        <ArrowLeftRight size={14} className="mt-0.5 shrink-0" />
        <span>
          KNN 與 RBF 核 SVM 的訓練／預測成本正好相反：KNN 訓練幾乎免費、但每次預測都要掃過全部資料；
          RBF 核 SVM 訓練昂貴（隨樣本數增長快），預測相對便宜。表中以外框標出這兩列的成本徽章。
        </span>
      </div>
    </div>
  )
}
