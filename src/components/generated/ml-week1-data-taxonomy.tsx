/**
 * 核心洞察：拿到一份新資料，先依序問三個問題——「有沒有結構？」「有沒有標籤？」
 * 「數學特性是什麼？」——答案決定能用哪類演算法。Iris 資料集三題都給出最乾淨的
 * 教科書答案：結構化二維表格、有標籤、4 個連續數值特徵＋1 個名義類別標籤。
 *
 * 互動：三個可點擊分頁分別走查一個角度，Iris 落點的選項卡以 emerald 徽章高亮；
 * 分頁下方常駐一張 Iris 完整輪廓摘要卡，與目前分頁相關的 chip 同步強調，
 * 讓「三個問題」與「一份資料的樣子」隨走查逐步收斂成同一張圖像。
 */

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Table2,
  FileText,
  Braces,
  Tag,
  CircleHelp,
  Ruler,
  Hash,
  Tags,
  ListOrdered,
  Check,
  type LucideIcon,
} from 'lucide-react'

const TABS = ['① 有無結構', '② 有無標籤', '③ 數學特性'] as const

interface OptionCardProps {
  Icon: LucideIcon
  title: string
  matched: boolean
  note?: string
}

function OptionCard({ Icon, title, matched, note }: OptionCardProps) {
  return (
    <div
      className={`relative flex flex-1 flex-col gap-1.5 rounded-lg border p-3 ${
        matched ? 'border-orange-500 bg-orange-50' : ''
      }`}
      style={matched ? undefined : { borderColor: 'var(--border-subtle)' }}
    >
      {matched && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
          <Check size={11} color="#ffffff" strokeWidth={3} />
        </span>
      )}
      <Icon size={16} className={matched ? 'text-orange-700' : ''} style={matched ? undefined : { color: 'var(--text-muted)' }} />
      <p
        className={`text-[13px] font-semibold ${matched ? 'text-orange-700' : ''}`}
        style={matched ? undefined : { color: 'var(--text-strong)' }}
      >
        {title}
      </p>
      {note && (
        <p className="text-[12px]" style={{ color: matched ? 'var(--orange-700)' : 'var(--text-muted)' }}>
          {note}
        </p>
      )}
    </div>
  )
}

function Question({ children }: { children: string }) {
  return (
    <p className="text-[14px] font-medium" style={{ color: 'var(--text-strong)' }}>
      {children}
    </p>
  )
}

interface ChipProps {
  label: string
  active: boolean
}

function Chip({ label, active }: ChipProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5">
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />}
      <span
        className={`text-[12.5px] ${active ? 'font-semibold' : ''}`}
        style={{ color: active ? 'var(--text-strong)' : 'var(--text-muted)', marginLeft: active ? 0 : 9 }}
      >
        {label}
      </span>
    </div>
  )
}

const CHIPS = [
  { label: '150 筆觀測', tab: 0 },
  { label: '3 種鳶尾花，各 50 筆', tab: 1 },
  { label: '4 個連續數值特徵＋1 個名義類別標籤', tab: 2 },
  { label: '乾淨無缺失值', tab: -1 },
] as const

export default function MlWeek1DataTaxonomy() {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0)
  const [visited, setVisited] = useState<boolean[]>([true, false, false])
  const prefersReducedMotion = useReducedMotion()

  function selectTab(i: 0 | 1 | 2) {
    setActiveTab(i)
    setVisited((prev) => {
      if (prev[i]) return prev
      const next = [...prev]
      next[i] = true
      return next
    })
  }

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: 'easeOut' as const }

  return (
    <div className="not-prose w-full space-y-5">
      {/* 分頁列 */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {TABS.map((label, i) => {
          const active = activeTab === i
          const showCheck = visited[i] && !active
          return (
            <button
              key={label}
              type="button"
              onClick={() => selectTab(i as 0 | 1 | 2)}
              className={`relative flex items-center gap-1 px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-600' : 'text-neutral-500'
              }`}
            >
              {label}
              {showCheck && <Check size={12} className="text-orange-600" />}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-500" />}
            </button>
          )
        })}
      </div>

      {/* 分頁內容 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
          transition={transition}
          className="space-y-3"
        >
          {activeTab === 0 && (
            <>
              <Question>這份資料有沒有固定欄位結構？</Question>
              <div className="flex flex-wrap gap-3">
                <OptionCard Icon={Table2} title="結構化" matched note="Iris → 二維表格" />
                <OptionCard Icon={FileText} title="非結構化" matched={false} />
                <OptionCard Icon={Braces} title="半結構化" matched={false} />
              </div>
            </>
          )}

          {activeTab === 1 && (
            <>
              <Question>這份資料有沒有正確答案可以學？</Question>
              <div className="flex flex-wrap gap-3">
                <OptionCard Icon={Tag} title="有標籤" matched note="Iris → 3 種鳶尾花標籤" />
                <OptionCard Icon={CircleHelp} title="無標籤" matched={false} />
              </div>
            </>
          )}

          {activeTab === 2 && (
            <>
              <Question>特徵與標籤的數學特性是什麼？</Question>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    數值型
                  </p>
                  <div className="space-y-2">
                    <OptionCard Icon={Ruler} title="連續" matched note="Iris → 花萼／花瓣長寬（cm）" />
                    <OptionCard Icon={Hash} title="離散" matched={false} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    類別型
                  </p>
                  <div className="space-y-2">
                    <OptionCard Icon={Tags} title="名義" matched note="Iris → 鳶尾花種名" />
                    <OptionCard Icon={ListOrdered} title="順序" matched={false} />
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 常駐摘要卡 */}
      <div className="rounded-lg p-4" style={{ background: 'var(--surface-sunken)' }}>
        <p className="mb-2.5 text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>
          Iris 資料集完整輪廓
        </p>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <Chip key={chip.label} label={chip.label} active={chip.tab === activeTab} />
          ))}
        </div>
      </div>
    </div>
  )
}
