import { useState, type ReactElement, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, X, ArrowRight } from 'lucide-react'

type BadgeTone = 'muted' | 'brand' | 'success'

interface ChannelState {
  id: 'off' | 'depletion' | 'triode' | 'saturation'
  buttonLabel: ReactNode
  regionBadge: string
  badgeTone: BadgeTone
  surfaceText: ReactNode
  deviceText: ReactNode
  ampText: ReactNode
  canAmplify: boolean
}

const STATES: ChannelState[] = [
  {
    id: 'off',
    buttonLabel: 'V_G = 0',
    regionBadge: '截止',
    badgeTone: 'muted',
    surfaceText: 'P 型基板表面電洞均勻分佈，未被擾動',
    deviceText: '源汲極之間是兩顆背對背的逆偏二極體——絕緣體',
    ampText: '不行：源汲極之間沒有通道，幾乎沒有電流',
    canAmplify: false,
  },
  {
    id: 'depletion',
    buttonLabel: (
      <>
        0 &lt; V<sub>G</sub> &lt; V<sub>TH</sub>
      </>
    ),
    regionBadge: '空乏區形成',
    badgeTone: 'muted',
    surfaceText: (
      <>
        電洞被正閘極電壓推開，留下不能移動的負受體離子，形成空乏區
      </>
    ),
    deviceText: '仍是絕緣體——空乏區裡沒有可動的電子',
    ampText: '不行：反轉層尚未成形，通道仍不存在',
    canAmplify: false,
  },
  {
    id: 'triode',
    buttonLabel: (
      <>
        V<sub>G</sub> &gt; V<sub>TH</sub>，V<sub>D</sub> 小
      </>
    ),
    regionBadge: '三極管區',
    badgeTone: 'brand',
    surfaceText: '電子被吸引到介面，形成反轉層；通道從源極到汲極完整連通',
    deviceText: (
      <>
        一顆電壓控制電阻（R<sub>on</sub> 由 V<sub>GS</sub> − V<sub>TH</sub> 決定）
      </>
    ),
    ampText: '不是標準放大區：此時元件是電阻，電流隨 V_DS 改變，通常用於開關或可變電阻',
    canAmplify: false,
  },
  {
    id: 'saturation',
    buttonLabel: (
      <>
        V<sub>D</sub> &gt; V<sub>GS</sub> − V<sub>TH</sub>
      </>
    ),
    regionBadge: '飽和區・夾止',
    badgeTone: 'success',
    surfaceText: (
      <>
        汲極端 V<sub>GD</sub> 掉到 V<sub>TH</sub> 以下，反轉層在汲極端完全消失（夾止），夾止區變成空乏區，電子被強電場迅速掃進汲極
      </>
    ),
    deviceText: (
      <>
        幾乎與 V<sub>DS</sub> 無關的電流源，由 V<sub>GS</sub> 控制
      </>
    ),
    ampText: (
      <>
        可以：這正是放大器要用的工作區，小訊號增益由轉導 g<sub>m</sub> 與輸出電阻決定
      </>
    ),
    canAmplify: true,
  },
]

const DEPLETION_HEIGHT = [0, 28, 28, 28]
const CHANNEL_WIDTH = [0, 0, 320, 280]
const CHANNEL_HEIGHT = [0, 0, 10, 10]

function badgeColors(tone: BadgeTone): { bg: string; fg: string } {
  if (tone === 'brand') return { bg: 'var(--blue-100)', fg: 'var(--blue-700)' }
  if (tone === 'success') return { bg: 'var(--success-50)', fg: 'var(--success-500)' }
  return { bg: 'var(--surface-sunken)', fg: 'var(--text-muted)' }
}

export default function EcWeek7ChannelFormation(): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const current = STATES[activeIndex]
  const badge = badgeColors(current.badgeTone)
  const transition = { duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' as const }
  const fadeTransition = { duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' as const }

  return (
    <div className="not-prose space-y-5">
      <div role="tablist" aria-label="MOSFET 通道狀態" className="flex flex-wrap gap-2">
        {STATES.map((state, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={state.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(index)}
              style={{
                background: isActive ? 'var(--action-secondary)' : 'var(--surface-sunken)',
                color: isActive ? '#fff' : 'var(--text-body)',
                border: isActive ? '1px solid transparent' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease-out, color 0.2s ease-out',
              }}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              {state.buttonLabel}
            </button>
          )
        })}
      </div>

      <svg
        viewBox="0 0 640 300"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`MOSFET 剖面圖：目前狀態為${current.regionBadge}`}
      >
        <rect x={40} y={140} width={560} height={140} rx={4} fill="var(--neutral-100)" stroke="var(--border-default)" strokeWidth={1.5} />
        <rect x={70} y={140} width={90} height={50} rx={4} fill="var(--blue-600)" stroke="var(--blue-700)" strokeWidth={1.5} />
        <rect x={480} y={140} width={90} height={50} rx={4} fill="var(--blue-600)" stroke="var(--blue-700)" strokeWidth={1.5} />
        <rect x={160} y={128} width={320} height={12} fill="var(--blue-100)" stroke="var(--blue-200)" strokeWidth={1} />
        <rect x={160} y={90} width={320} height={38} rx={3} fill="var(--neutral-700)" stroke="var(--neutral-800)" strokeWidth={1.5} />

        <path d="M115,140 V60" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
        <circle cx={115} cy={60} r={3} fill="var(--text-strong)" />
        <path d="M320,90 V40" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
        <circle cx={320} cy={40} r={3} fill="var(--text-strong)" />
        <path d="M525,140 V60" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
        <circle cx={525} cy={60} r={3} fill="var(--text-strong)" />

        <motion.rect
          x={160}
          y={140}
          width={320}
          fill="var(--neutral-300)"
          stroke="var(--neutral-400)"
          strokeWidth={1}
          fillOpacity={0.85}
          animate={{ height: DEPLETION_HEIGHT[activeIndex] }}
          transition={transition}
        />
        <motion.rect
          x={160}
          y={140}
          fill="var(--blue-500)"
          stroke="var(--blue-600)"
          strokeWidth={1}
          animate={{ width: CHANNEL_WIDTH[activeIndex], height: CHANNEL_HEIGHT[activeIndex] }}
          transition={transition}
        />

        <motion.g
          animate={{ opacity: activeIndex === 3 ? 1 : 0 }}
          initial={false}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
        >
          <ArrowRight x={436} y={136} size={16} color="var(--blue-500)" />
        </motion.g>
      </svg>

      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <LegendItem color="var(--neutral-700)" label="閘極" />
        <LegendItem color="var(--blue-100)" label="氧化層" />
        <LegendItem color="var(--neutral-100)" label="基板" />
        <LegendItem color="var(--blue-600)" label="源極・汲極 N+" />
        <LegendItem color="var(--neutral-300)" label="空乏區" />
        <LegendItem color="var(--blue-500)" label="反轉層・通道" />
      </div>

      <div className="flex">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 9px',
            borderRadius: 'var(--radius-pill)',
            background: badge.bg,
            color: badge.fg,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {current.regionBadge}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeIndex}
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={fadeTransition}
        >
          <Panel title="表面發生什麼">{current.surfaceText}</Panel>
          <Panel title="元件像什麼">{current.deviceText}</Panel>
          <Panel title="可否用來放大">
            <div className="flex items-start gap-2">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-pill)',
                  background: current.canAmplify ? 'var(--success-50)' : 'var(--surface-sunken)',
                  color: current.canAmplify ? 'var(--success-500)' : 'var(--text-muted)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {current.canAmplify ? <Check size={13} /> : <X size={13} />}
              </span>
              <span>{current.ampText}</span>
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 'var(--radius-sm)',
          background: color,
        }}
      />
      {label}
    </span>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        flex: '1 1 180px',
        minWidth: 160,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}
