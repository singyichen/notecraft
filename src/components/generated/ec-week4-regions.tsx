import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ToggleLeft,
  Zap,
  ToggleRight,
  CircleOff,
  Lock,
  Ruler,
  type LucideIcon,
} from 'lucide-react';

type RegionId = 'cutoff' | 'active' | 'saturation';

/** 把「V_BE」「g_m」「β_forced」「V_CE,sat」這種底線寫法轉成真正的下標 */
function withSub(text: string): React.ReactNode {
  const parts = text.split(/([A-Za-zβ]_[A-Za-z0-9π]+(?:,[a-z]+)?)/g)
  return parts.map((part, i) => {
    const m = /^([A-Za-zβ])_(.+)$/.exec(part)
    if (!m) return part
    return (
      <span key={i}>
        {m[1]}
        <sub>{m[2]}</sub>
      </span>
    )
  })
}

interface RegionField {
  label: string;
  value: React.ReactNode;
}

interface RegionConfig {
  id: RegionId;
  tabLabel: string;
  tabIcon: LucideIcon;
  /** 選中態 pill 與卡片共用的語意色（inline style，--success-* / --warning-* 無 Tailwind class） */
  pillBg: string;
  pillText: string;
  pillBorder: string;
  cardBg: string;
  accentText: string;
  fields: RegionField[];
  usageIcon: LucideIcon;
  usageLabel: string;
  note?: string;
}

const REGIONS: RegionConfig[] = [
  {
    id: 'cutoff',
    tabLabel: '截止區',
    tabIcon: ToggleLeft,
    pillBg: 'var(--neutral-200)',
    pillText: 'var(--neutral-700)',
    pillBorder: 'var(--neutral-300)',
    cardBg: 'var(--neutral-100)',
    accentText: 'var(--neutral-500)',
    fields: [
      { label: '基極-射極接面偏壓', value: '未順偏' },
      { label: '基極-集極接面偏壓', value: '同樣不順偏（無注入）' },
      { label: '集極電流行為', value: '集極電流約為零（近似截止漏電流）' },
      { label: '電流增益（β）變化', value: '不適用（I_C、I_B 皆趨近零）' },
    ],
    usageIcon: CircleOff,
    usageLabel: '關閉的開關',
  },
  {
    id: 'active',
    tabLabel: '順向主動區',
    tabIcon: Zap,
    pillBg: 'var(--success-50)',
    pillText: 'var(--success-500)',
    pillBorder: 'var(--success-500)',
    cardBg: 'var(--success-50)',
    accentText: 'var(--success-500)',
    fields: [
      { label: '基極-射極接面偏壓', value: '順偏（V_BE > 0）' },
      { label: '基極-集極接面偏壓', value: '逆偏（講義記為 V_CB < 0，即基極低於集極）' },
      {
        label: '集極電流行為',
        value: '由 V_BE 指數控制，幾乎與集極電壓無關（定電流源）',
      },
      { label: '電流增益（β）變化', value: '維持正常 β（典型約 100）' },
    ],
    usageIcon: Zap,
    usageLabel: '放大器（唯一可用區域）',
  },
  {
    id: 'saturation',
    tabLabel: '飽和區',
    tabIcon: ToggleRight,
    pillBg: 'var(--warning-50)',
    pillText: 'var(--warning-700)',
    pillBorder: 'var(--warning-500)',
    cardBg: 'var(--warning-50)',
    accentText: 'var(--warning-700)',
    fields: [
      { label: '基極-射極接面偏壓', value: '仍順偏' },
      { label: '基極-集極接面偏壓', value: '從逆偏轉為順偏（p.49）' },
      {
        label: '集極電流行為',
        value: 'B-C 接面順偏分流，淨集極電流不再隨 V_BE 指數成長、反而下降（p.50）',
      },
      {
        label: '電流增益（β）變化',
        value: (
          <>
            基極電流暴增、β 下降，β<sub>forced</sub> = I<sub>C</sub>/I
            <sub>B</sub> &lt; β（p.49）
          </>
        ),
      },
    ],
    usageIcon: Lock,
    usageLabel: '閉合的開關',
    note: '深飽和時 V_CE 被鉗制在約 200 mV（p.54）',
  },
];

interface RegionTabProps {
  region: RegionConfig;
  active: boolean;
  onSelect: () => void;
}

function RegionTab({ region, active, onSelect }: RegionTabProps) {
  const Icon = region.tabIcon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors'
          : 'inline-flex items-center gap-1.5 rounded-pill border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50'
      }
      style={
        active
          ? {
              background: region.pillBg,
              color: region.pillText,
              borderColor: region.pillBorder,
            }
          : undefined
      }
    >
      <Icon size={16} />
      {region.tabLabel}
    </button>
  );
}

interface FieldCardProps {
  field: RegionField;
  cardBg: string;
  accentText: string;
}

function FieldCard({ field, cardBg, accentText }: FieldCardProps) {
  return (
    <div
      className="rounded-lg border-l-4 p-3"
      style={{ background: cardBg, borderLeftColor: accentText }}
    >
      <div className="text-xs text-neutral-500">{field.label}</div>
      <div className="mt-1 text-sm font-medium" style={{ color: accentText }}>
        {typeof field.value === 'string' ? withSub(field.value) : field.value}
      </div>
    </div>
  );
}

export default function EcWeek4Regions() {
  const [activeId, setActiveId] = useState<RegionId>('active');
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = shouldReduceMotion ?? false;
  const activeRegion = REGIONS.find((r) => r.id === activeId) ?? REGIONS[1];
  const UsageIcon = activeRegion.usageIcon;

  return (
    <div className="not-prose flex flex-col gap-4">
      <div role="tablist" aria-label="BJT 工作區選擇" className="flex flex-wrap gap-2">
        {REGIONS.map((region) => (
          <RegionTab
            key={region.id}
            region={region}
            active={region.id === activeId}
            onSelect={() => setActiveId(region.id)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeRegion.id}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            {activeRegion.fields.map((field) => (
              <FieldCard
                key={field.label}
                field={field}
                cardBg={activeRegion.cardBg}
                accentText={activeRegion.accentText}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold"
              style={{ background: activeRegion.pillBg, color: activeRegion.pillText }}
            >
              <UsageIcon size={14} />
              典型用途：{activeRegion.usageLabel}
            </span>
            {activeRegion.note && (
              <span className="text-xs text-neutral-500">{withSub(activeRegion.note)}</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-start gap-2 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
        <Ruler size={16} className="mt-0.5 shrink-0 text-neutral-500" />
        <span>
          {withSub('實務判準：V_BC（基極電壓 − 集極電壓）不可超過約 400 mV，否則進入軟飽和——前提是元件誤差不能把工作點推進深飽和。')}
        </span>
      </div>
    </div>
  );
}
