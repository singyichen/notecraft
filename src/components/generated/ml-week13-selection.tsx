import { motion, useReducedMotion } from 'motion/react'
import { Lightbulb } from 'lucide-react'

/**
 * 降維方法怎麼選：手寫 SVG 決策分支圖（直向生長，8 個節點）。
 * 核心洞察：能不能放進 pipeline，取決於這個方法有沒有 transform —— t-SNE 沒有。
 * 「有標籤嗎？」以分支標籤（有／沒有）呈現，不額外計入節點數。
 */

interface CenteredTextProps {
  x: number
  y: number
  lines: string[]
  fontSize: number
  fontWeight?: number
  fill: string
  lineHeight?: number
  italic?: boolean
}

function CenteredText({ x, y, lines, fontSize, fontWeight = 400, fill, lineHeight = 16, italic = false }: CenteredTextProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fontWeight={fontWeight}
      fill={fill}
      textAnchor="middle"
      style={italic ? { fontStyle: 'italic' } : undefined}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

interface PillProps {
  cx: number
  y: number
  label: string
  tone: 'success' | 'warning'
}

function Pill({ cx, y, label, tone }: PillProps) {
  const isWarn = tone === 'warning'
  const w = 92
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={y}
        width={w}
        height={18}
        rx={9}
        fill={isWarn ? 'var(--warning-50)' : 'var(--success-50)'}
        stroke={isWarn ? 'var(--warning-500)' : 'var(--success-500)'}
        strokeWidth={1.25}
      />
      <text
        x={cx}
        y={y + 13}
        textAnchor="middle"
        fontSize={11.5}
        fontWeight={600}
        fill={isWarn ? 'var(--warning-500)' : 'var(--success-500)'}
      >
        {label}
      </text>
    </g>
  )
}

interface EdgeBadgeProps {
  cx: number
  cy: number
  label: string
  width: number
}

function EdgeBadge({ cx, cy, label, width }: EdgeBadgeProps) {
  return (
    <g>
      <rect
        x={cx - width / 2}
        y={cy - 9}
        width={width}
        height={18}
        rx={9}
        fill="var(--surface-card)"
        stroke="var(--border-default)"
        strokeWidth={1.25}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--text-body)">
        {label}
      </text>
    </g>
  )
}

export default function MlWeek13Selection() {
  const reduce = useReducedMotion() ?? false

  const fadeUp = (delay: number) => ({
    initial: reduce ? undefined : { opacity: 0, y: -6 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.32, ease: 'easeOut' as const, delay },
  })

  return (
    <div className="not-prose w-full space-y-4">
      <svg
        viewBox="0 0 650 374"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="降維方法選擇決策圖：先問要拿降維結果做什麼。若要餵給後續模型，再問有沒有標籤——有標籤用 LDA（上限 c 減 1 維），沒有標籤用 PCA（有 transform，能放進 pipeline）。若只是要畫圖看分群，用 t-SNE，但 t-SNE 只有 fit_transform、無法套用到新資料，不能放進 pipeline，此為常見誤區。若資料是彎的、線性方法壓不好，改用流形學習 Isomap 或 LLE。"
      >
        {/* ── Tier 1：起點 ── */}
        <motion.g {...fadeUp(0)}>
          <rect x={195} y={14} width={260} height={46} rx={14} fill="var(--blue-600)" />
          <CenteredText x={325} y={43} lines={['要拿降維結果做什麼？']} fontSize={15} fontWeight={700} fill="#ffffff" />
          <line x1={325} y1={60} x2={325} y2={90} stroke="var(--neutral-400)" strokeWidth={1.5} />
        </motion.g>

        {/* ── Tier 2：三個一級分支 ── */}
        <motion.g {...fadeUp(0.12)}>
          <line x1={150} y1={90} x2={565} y2={90} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={150} y1={90} x2={150} y2={132} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={390} y1={90} x2={390} y2={132} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={565} y1={90} x2={565} y2={132} stroke="var(--neutral-400)" strokeWidth={1.5} />

          <rect x={10} y={132} width={280} height={54} rx={12} fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth={1.25} />
          <CenteredText x={150} y={164} lines={['餵給後續模型']} fontSize={14} fontWeight={700} fill="var(--blue-700)" />

          <rect x={320} y={132} width={140} height={54} rx={12} fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth={1.25} />
          <CenteredText x={390} y={164} lines={['只是要畫圖看分群']} fontSize={13} fontWeight={700} fill="var(--blue-700)" />

          <rect x={490} y={132} width={150} height={54} rx={12} fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth={1.25} />
          <CenteredText x={565} y={154} lines={['資料是彎的、', '線性壓不好']} fontSize={13} fontWeight={700} fill="var(--blue-700)" lineHeight={16} />
        </motion.g>

        {/* ── Tier 3：「餵給後續模型」再分「有標籤嗎？」── */}
        <motion.g {...fadeUp(0.22)}>
          <line x1={150} y1={186} x2={150} y2={196} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <CenteredText x={150} y={210} lines={['有標籤嗎？']} fontSize={11.5} fill="var(--text-muted)" italic />
          <line x1={150} y1={214} x2={150} y2={218} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={77.5} y1={218} x2={222.5} y2={218} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={77.5} y1={218} x2={77.5} y2={248} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={222.5} y1={218} x2={222.5} y2={248} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <EdgeBadge cx={77.5} cy={233} label="有" width={30} />
          <EdgeBadge cx={222.5} cy={233} label="沒有" width={40} />

          {/* 中間與右側分支直接接到葉節點 */}
          <line x1={390} y1={186} x2={390} y2={248} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={565} y1={186} x2={565} y2={248} stroke="var(--neutral-400)" strokeWidth={1.5} />
        </motion.g>

        {/* ── Tier 4：四個終點 ── */}
        <motion.g {...fadeUp(0.32)}>
          {/* LDA */}
          <rect x={10} y={248} width={135} height={110} rx={12} fill="var(--surface-card)" stroke="var(--border-default)" strokeWidth={1.25} />
          <Pill cx={95} y={254} label="有 transform" tone="success" />
          <CenteredText x={77.5} y={298} lines={['LDA']} fontSize={16} fontWeight={700} fill="var(--text-strong)" />
          <CenteredText
            x={77.5}
            y={320}
            lines={['上限 c−1 維', '（c 是類別數）']}
            fontSize={11.5}
            fill="var(--text-muted)"
            lineHeight={16}
          />

          {/* PCA */}
          <rect x={155} y={248} width={135} height={110} rx={12} fill="var(--surface-card)" stroke="var(--border-default)" strokeWidth={1.25} />
          <Pill cx={240} y={254} label="有 transform" tone="success" />
          <CenteredText x={222.5} y={298} lines={['PCA']} fontSize={16} fontWeight={700} fill="var(--text-strong)" />
          <CenteredText
            x={222.5}
            y={320}
            lines={['有 fit/transform', '可放進 pipeline']}
            fontSize={11.5}
            fill="var(--text-muted)"
            lineHeight={16}
          />

          {/* t-SNE — 警示色標記：不能放進 pipeline */}
          <rect x={320} y={248} width={140} height={110} rx={12} fill="var(--warning-50)" stroke="var(--warning-500)" strokeWidth={1.5} />
          <g transform="translate(330,254)">
            <path d="M7 1 L13 12 L1 12 Z" fill="var(--warning-50)" stroke="var(--warning-500)" strokeWidth={1.4} strokeLinejoin="round" />
            <line x1={7} y1={5} x2={7} y2={8.5} stroke="var(--warning-500)" strokeWidth={1.4} strokeLinecap="round" />
            <circle cx={7} cy={10.3} r={0.9} fill="var(--warning-500)" />
          </g>
          <Pill cx={410} y={254} label="無 transform" tone="warning" />
          <CenteredText x={390} y={298} lines={['t-SNE']} fontSize={16} fontWeight={700} fill="var(--warning-500)" />
          <CenteredText
            x={390}
            y={320}
            lines={['只有 fit_transform', '不能放進 pipeline']}
            fontSize={11.5}
            fill="var(--warning-500)"
            lineHeight={16}
          />

          {/* 流形學習 Isomap / LLE */}
          <rect x={490} y={248} width={150} height={110} rx={12} fill="var(--surface-card)" stroke="var(--border-default)" strokeWidth={1.25} />
          <CenteredText
            x={565}
            y={270}
            lines={['流形學習']}
            fontSize={11.5}
            fontWeight={600}
            fill="var(--text-accent)"
          />
          <CenteredText x={565} y={296} lines={['Isomap / LLE']} fontSize={15} fontWeight={700} fill="var(--text-strong)" />
          <CenteredText x={565} y={318} lines={['保留局部幾何結構']} fontSize={11.5} fill="var(--text-muted)" />
        </motion.g>
      </svg>

      <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] px-4 py-3" style={{ background: 'var(--surface-accent-soft)' }}>
        <Lightbulb size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-accent)' }} />
        <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-accent)' }}>
            核心洞察：
          </span>
          能不能放進 pipeline，取決於這個方法有沒有 transform —— t-SNE 沒有。
        </p>
      </div>
    </div>
  )
}
