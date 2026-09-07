import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  TrendingUp,
  ScatterChart,
  BarChart3,
  Grid3x3,
  Waves,
  ShieldQuestion,
  ArrowRight,
  TriangleAlert,
  Sparkles,
  Compass,
  Target,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'

/**
 * Matplotlib 繪圖選型器：從「想回答什麼問題」反推該用的函式。
 * 六個問題卡 + 展開答案卡；另設一個獨立的「探索式／解釋式」切換，
 * 只影響答案卡是否顯示 Seaborn 高階替代（誠實地：不是每個問題都有捷徑）。
 */

interface SeabornAlt {
  func: string
  desc: string
}

interface PlotQuestion {
  id: string
  icon: LucideIcon
  question: string
  func: string
  reason: string
  knob: string
  seaborn: SeabornAlt | null
}

const QUESTIONS: PlotQuestion[] = [
  {
    id: 'sequence',
    icon: TrendingUp,
    question: '這個量隨序列怎麼變化？',
    func: 'plt.plot',
    reason: '連成折線看趨勢。',
    knob: "旋鈕：加 'o' 也能畫點，但全部點共用一組樣式。",
    seaborn: null,
  },
  {
    id: 'relation',
    icon: ScatterChart,
    question: '兩個變數有沒有關係？',
    func: 'plt.scatter',
    reason: '可逐點指定大小 s、顏色 c、透明度 alpha。',
    knob: '旋鈕：一張二維圖能塞進四個變數，代價是點多時較慢。',
    seaborn: {
      func: 'sns.pairplot',
      desc: '一次畫出所有欄位兩兩配對的散佈矩陣，快速掃過整個資料集。',
    },
  },
  {
    id: 'distribution',
    icon: BarChart3,
    question: '單一變數的分布長什麼樣？',
    func: 'plt.hist',
    reason: '切箱再數每箱幾筆。',
    knob: '旋鈕：箱寬是最關鍵的旋鈕，太寬壓掉雙峰、太窄整張都是雜訊。',
    seaborn: {
      func: 'sns.FacetGrid',
      desc: '依類別欄位自動切成一排小圖，比較多組分布比疊在一起好讀。',
    },
  },
  {
    id: 'density2d',
    icon: Grid3x3,
    question: '兩個變數的密度分布？',
    func: 'plt.hist2d / plt.hexbin / KDE',
    reason: '把散落樣本聚合成二維密度。',
    knob: '旋鈕：hexbin 的相鄰距離一致，比方格更不容易誤導。',
    seaborn: {
      func: 'sns.jointplot',
      desc: '同時給雙變數關係與各自邊際分布，一次看全貌。',
    },
  },
  {
    id: 'field',
    icon: Waves,
    question: '網格上的函數場長什麼樣？',
    func: 'plt.contour / plt.contourf',
    reason: '先用 np.meshgrid 展開網格，再描等高線或填色塊。',
    knob: '旋鈕：慣例是 contourf 打底、contour 疊上去描邊。',
    seaborn: null,
  },
  {
    id: 'uncertainty',
    icon: ShieldQuestion,
    question: '我想誠實表達不確定性',
    func: 'plt.errorbar / plt.fill_between',
    reason: '把「有多不確定」畫進圖裡，而不是只畫一條乾淨的線。',
    knob: '旋鈕：離散點用 errorbar，連續信賴區間用 fill_between。',
    seaborn: null,
  },
]

type Mode = 'explore' | 'explain'

export default function MlWeek5PlotSelector() {
  const reduce = useReducedMotion() ?? false
  const [activeId, setActiveId] = useState(QUESTIONS[0].id)
  const [mode, setMode] = useState<Mode>('explain')

  const active = QUESTIONS.find((q) => q.id === activeId) ?? QUESTIONS[0]
  const showSeaborn = mode === 'explore'

  return (
    <div className="not-prose w-full max-w-3xl mx-auto space-y-4">
      {/* 第一層：六個問題卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {QUESTIONS.map((q) => {
          const Icon = q.icon
          const on = q.id === activeId
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveId(q.id)}
              aria-pressed={on}
              className={clsx(
                'flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm font-medium transition-colors',
              )}
              style={{
                background: on ? 'var(--surface-brand-soft)' : 'var(--surface-card)',
                borderColor: on ? 'var(--border-brand)' : 'var(--border-subtle)',
                color: on ? 'var(--text-brand)' : 'var(--text-body)',
              }}
            >
              <Icon
                size={17}
                className="shrink-0 mt-0.5"
                style={{ color: on ? 'var(--blue-600)' : 'var(--neutral-400)' }}
              />
              <span>{q.question}</span>
            </button>
          )
        })}
      </div>

      {/* 獨立切換：探索式／解釋式（不與問題卡同層） */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          檢視角度
        </span>
        <div
          className="inline-flex rounded-[var(--radius-pill)] p-0.5"
          style={{ background: 'var(--surface-sunken)' }}
          role="tablist"
          aria-label="探索式或解釋式"
        >
          {(
            [
              { key: 'explore' as const, label: '探索式', icon: Compass },
              { key: 'explain' as const, label: '解釋式', icon: Target },
            ]
          ).map(({ key, label, icon: Icon }) => {
            const on = mode === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMode(key)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: on ? 'var(--blue-700)' : 'transparent',
                  color: on ? 'var(--text-on-brand)' : 'var(--text-body)',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 第二層：展開的答案卡 */}
      <div
        className="rounded-[var(--radius-lg)] border p-4 sm:p-5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-card)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-3"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <span
                className="inline-block rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-semibold break-words"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--surface-brand-soft)',
                  color: 'var(--text-brand)',
                }}
              >
                {active.func}
              </span>

              <AnimatePresence initial={false}>
                {showSeaborn && (
                  <motion.span
                    key="seaborn-badge"
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--orange-50)', color: 'var(--orange-700)' }}
                  >
                    <Sparkles size={12} />
                    Seaborn
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <p className="m-0 flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
              <ArrowRight size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--blue-500)' }} />
              <span>{active.reason}</span>
            </p>

            <div
              className="flex gap-2 rounded-[var(--radius-md)] p-2.5 text-sm leading-relaxed"
              style={{ background: 'var(--warning-50)', color: 'var(--text-body)' }}
            >
              <TriangleAlert size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warning-500)' }} />
              <span>{active.knob}</span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {showSeaborn && (
                <motion.div
                  key={active.seaborn ? active.seaborn.func : 'no-alt'}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  {active.seaborn ? (
                    <div
                      className="flex gap-2 rounded-[var(--radius-md)] p-2.5 text-sm leading-relaxed"
                      style={{ background: 'var(--orange-50)', color: 'var(--text-body)' }}
                    >
                      <span
                        className="shrink-0 mt-0.5 break-words font-semibold"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange-700)' }}
                      >
                        {active.seaborn.func}
                      </span>
                      <span>{active.seaborn.desc}</span>
                    </div>
                  ) : (
                    <p className="m-0 text-sm italic" style={{ color: 'var(--text-muted)' }}>
                      這個需求 Seaborn 沒有專用高階函式，仍落回上面的 Matplotlib 寫法。
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <p className="m-0 pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {showSeaborn ? '畫給自己，快而多，可丟棄。' : '畫給別人，一圖一結論，落回 Axes 慢慢調。'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
