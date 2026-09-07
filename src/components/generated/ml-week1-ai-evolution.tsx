/**
 * 核心洞察：AI 是終極目標，ML／DL 只是貫穿整條路線的手段——不是四階段之一，
 * 所以畫成底下一條獨立的「手段帶」，用短虛線連向每個階段，而不是掛在某一階段底下。
 * 更重要的是「我們現在在哪」：不是站在終點，而是落在 GAI 邁向 AI Agent 這一小段路上，
 * 具身智能與 AGI/ASI 都還在更後面——這個定位點比四個階段各自的定義更值得記住。
 *
 * 版面：4 節點用 flex-1 等寬欄位（非 SVG 幾何座標）取代絕對定位百分比，
 * 確保最窄容器（約 583px）下每欄仍有足夠寬度容納中文標籤且不重疊；
 * 連接線與「手段帶」虛線連接器改用相同的 4 欄 flex 結構，天然對齊、不需手算像素。
 */

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Sparkles,
  Bot,
  Cog,
  Brain,
  MapPin,
  Layers,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

interface Stage {
  id: string
  period: string
  name: string
  title: string
  description: string
  Icon: LucideIcon
}

const STAGES: Stage[] = [
  {
    id: 'gai',
    period: '當前階段',
    name: 'GAI',
    title: 'GAI 生成式 AI',
    description: '內容的創造與文字／影像生成。',
    Icon: Sparkles,
  },
  {
    id: 'agent',
    period: '現在～近未來',
    name: 'AI Agent',
    title: 'AI Agent 代理人',
    description: '自主規劃步驟、使用工具完成線上任務。',
    Icon: Bot,
  },
  {
    id: 'physical',
    period: '下一階段（躍升）',
    name: 'Physical AI',
    title: 'Physical AI 具身智能',
    description: '結合硬體與機器人，在物理世界採取行動。',
    Icon: Cog,
  },
  {
    id: 'agi',
    period: '終極目標',
    name: 'AGI・ASI',
    title: 'AGI／ASI 通用／超級人工智慧',
    description: '跨領域自學、自我反思，達到或超越人類智慧。',
    Icon: Brain,
  },
]

// 連接線的垂直位置：期別小字列固定 16px（h-4）+ gap-1（4px）+ 圖示半徑 21px = 41px。
// 四欄結構一致，因此不論欄寬如何都精準對齊圖示圓心。
const LINE_TOP = 41

export default function MlWeek1AiEvolution() {
  const [activeStage, setActiveStage] = useState(0)
  const reduce = useReducedMotion()
  const active = STAGES[activeStage]

  return (
    <div className="not-prose w-full space-y-6">
      {/* 時間軸 */}
      <div>
        <div className="relative">
          {/* 連接線 + 延伸箭頭 */}
          <div
            aria-hidden
            className="pointer-events-none absolute z-0 h-px"
            style={{ top: LINE_TOP, left: '3%', right: '6%', background: 'var(--border-default)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute z-0"
            style={{ top: LINE_TOP - 7, right: '1%' }}
          >
            <ArrowRight size={14} color="var(--neutral-400)" />
          </div>

          {/* 4 個階段節點 */}
          <div className="relative z-10 flex justify-between">
            {STAGES.map((stage, i) => {
              const isActive = i === activeStage
              return (
                <motion.button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(i)}
                  aria-pressed={isActive}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.3, delay: i * 0.08, ease: 'easeOut' }
                  }
                  className="flex flex-1 flex-col items-center gap-1 px-0.5"
                >
                  <span
                    className="block h-4 text-center text-[11px] leading-4"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {stage.period}
                  </span>
                  <span
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      width: 42,
                      height: 42,
                      background: isActive ? 'var(--blue-600)' : 'var(--neutral-100)',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      transition: 'background 220ms var(--ease-out, ease-out), transform 220ms var(--ease-out, ease-out)',
                    }}
                  >
                    <stage.Icon size={18} color={isActive ? '#ffffff' : 'var(--neutral-600)'} />
                  </span>
                  <span
                    className="text-center text-[13px] font-semibold leading-4"
                    style={{ color: 'var(--text-strong)' }}
                  >
                    {stage.name}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* 「你在這裡」定位徽章：常駐顯示，落在 GAI 與 AI Agent 之間偏 GAI 側 */}
        <div className="relative mt-2 h-7">
          <div className="absolute" style={{ left: '20%', transform: 'translateX(-50%)' }}>
            <motion.div
              className="relative inline-flex"
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, delay: 0.4, ease: 'easeOut' }}
            >
              {reduce ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid var(--orange-200)' }}
                />
              ) : (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid var(--orange-200)' }}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <span
                className="relative inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: 'var(--orange-50)',
                  color: 'var(--orange-700)',
                  border: '1px solid var(--orange-200)',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                <MapPin size={14} color="var(--orange-700)" />
                你在這裡
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 詳情卡：單一常駐卡片，依 activeStage 切換內容 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-start gap-3 p-4"
          style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)' }}
        >
          <span
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: 'var(--blue-600)' }}
          >
            <active.Icon size={16} color="#ffffff" />
          </span>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              {active.title}
            </p>
            <p
              className="mt-1 text-[13px]"
              style={{ color: 'var(--text-body)', lineHeight: 'var(--leading-relaxed)' }}
            >
              {active.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 底部「手段」帶：ML/DL 貫穿整條路線，非四階段之一 */}
      <div>
        <div className="flex">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex flex-1 flex-col items-center">
              <span
                aria-hidden
                style={{ width: 0, height: 10, borderLeft: '1px dashed var(--border-default)' }}
              />
            </div>
          ))}
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: 'var(--blue-50)', borderRadius: 'var(--radius-md)' }}
        >
          <Layers size={14} color="var(--blue-700)" />
          <p className="text-[13px]" style={{ color: 'var(--blue-700)' }}>
            貫穿整條路線的手段：機器學習（ML）→ 其中深度學習（DL）尤其強大
          </p>
        </div>
      </div>
    </div>
  )
}
