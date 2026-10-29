import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  RectangleHorizontal,
  BatteryCharging,
  Scale,
  TrendingUp,
  MoveVertical,
  Gauge,
  Target,
  type LucideIcon,
} from 'lucide-react';

type LoadKey = 'resistor' | 'currentSource' | 'diodeConnected';
type Level = '低' | '中' | '高';

interface LoadInfo {
  key: LoadKey;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  formula: ReactNode;
  gainPct: number;
  swingPct: number;
  sensitivityPct: number;
  gainTag: Level;
  swingTag: Level;
  sensitivityTag: Level;
  useCase: string;
  tradeoffNote: string;
}

const LOADS: LoadInfo[] = [
  {
    key: 'resistor',
    label: '電阻負載',
    subtitle: '最簡單的被動負載',
    icon: RectangleHorizontal,
    formula: (
      <>
        A<sub>V</sub> = −g<sub>m</sub>（R<sub>D</sub> ∥ r<sub>o</sub>）
      </>
    ),
    gainPct: 50,
    swingPct: 30,
    sensitivityPct: 55,
    gainTag: '中',
    swingTag: '低',
    sensitivityTag: '中',
    useCase:
      '電路最簡單、不需要額外的偏壓電路，適合教學示範、原型電路，或對增益與擺幅沒有嚴苛要求的場合。',
    tradeoffNote:
      'R_D 越大，增益 g_m（R_D∥r_o）越高，但汲極直流電位也被拉得越低——增益與擺幅綁在同一顆電阻上，只能二選一妥協。',
  },
  {
    key: 'currentSource',
    label: '電流源負載',
    subtitle: 'PMOS 主動負載',
    icon: BatteryCharging,
    formula: (
      <>
        A<sub>V</sub> = −g<sub>m</sub>（r<sub>o1</sub> ∥ r<sub>o2</sub>）
      </>
    ),
    gainPct: 95,
    swingPct: 90,
    sensitivityPct: 85,
    gainTag: '高',
    swingTag: '高',
    sensitivityTag: '高',
    useCase:
      '類比 IC 設計中追求高增益放大級的首選：晶片面積不受限、可額外搭建偏壓電路，同時拿到高增益與大擺幅，但實際增益隨 g_m、r_o 的製程變異而浮動。',
    tradeoffNote:
      'r_o1、r_o2 本身就很大，增益不必靠拉高直流壓降換來——一次解開電阻負載「增益 vs 擺幅」的兩難，代價是增益精確度完全交給製程決定。',
  },
  {
    key: 'diodeConnected',
    label: '二極體連接負載',
    subtitle: '閘極與汲極短接',
    icon: Scale,
    formula: (
      <>
        A<sub>V</sub> = −g<sub>m1</sub>/g<sub>m2</sub> = −√((W/L)<sub>1</sub> / (W/L)<sub>2</sub>)
      </>
    ),
    gainPct: 20,
    swingPct: 60,
    sensitivityPct: 15,
    gainTag: '低',
    swingTag: '中',
    sensitivityTag: '低',
    useCase:
      '電流鏡的參考端、差動對負載、需要精確可預測比值的偏壓電路——犧牲增益，換來幾乎不受製程與溫度影響的穩定特性。',
    tradeoffNote:
      '增益只剩兩個寬長比的比值開根號，μ_nC_ox、電流、溫度這些製程相關量全部同時出現在分子分母、彼此約掉——這就是「用增益換精度」的數學內容。',
  },
];

const LEVEL_TEXT: Record<Level, string> = { 低: '低', 中: '中', 高: '高' };

function neutralBadgeClass(): string {
  return 'bg-[var(--surface-sunken)] text-[var(--text-muted)]';
}

function sensitivityBadgeClass(level: Level): string {
  if (level === '低') return 'bg-[var(--success-50)] text-[var(--success-500)]';
  if (level === '中') return 'bg-[var(--warning-50)] text-[var(--warning-700)]';
  return 'bg-[var(--danger-50)] text-[var(--danger-500)]';
}

function sensitivityBarColor(level: Level): string {
  if (level === '低') return 'var(--success-500)';
  if (level === '中') return 'var(--warning-500)';
  return 'var(--danger-500)';
}

export default function EcWeek7CsLoads() {
  const [activeLoad, setActiveLoad] = useState<LoadKey>('resistor');
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.26;

  const current = LOADS.find((l) => l.key === activeLoad) ?? LOADS[0];

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* 切換鈕列 */}
      <div className="flex flex-wrap gap-2">
        {LOADS.map((load) => {
          const Icon = load.icon;
          const active = load.key === activeLoad;
          return (
            <button
              key={load.key}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveLoad(load.key)}
              className={`flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] ${
                active
                  ? 'bg-[var(--blue-700)] text-white'
                  : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]'
              }`}
            >
              <Icon size={16} />
              {load.label}
            </button>
          );
        })}
      </div>

      {/* 文字卡區 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <current.icon size={18} className="shrink-0 text-[var(--blue-700)]" />
            <span className="font-semibold text-[var(--text-strong)]">{current.label}</span>
            <span className="text-xs text-[var(--text-muted)]">{current.subtitle}</span>
            <span
              className="inline-block rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-1.5 text-[var(--text-sm)] text-[var(--text-strong)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {current.formula}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-sm text-[var(--text-body)]">
            <Target size={15} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
            <span>{current.useCase}</span>
          </div>

          <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--orange-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
            {current.tradeoffNote}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 三條橫條區：永久掛載，key 固定，切換時用插值動畫 */}
      <div className="flex flex-col gap-3">
        <BarRow
          key="gain-bar"
          icon={TrendingUp}
          label="增益"
          badgeText={LEVEL_TEXT[current.gainTag]}
          badgeClassName={neutralBadgeClass()}
          value={current.gainPct}
          barColor="var(--blue-500)"
          duration={duration}
        />
        <BarRow
          key="swing-bar"
          icon={MoveVertical}
          label="輸出擺幅"
          badgeText={LEVEL_TEXT[current.swingTag]}
          badgeClassName={neutralBadgeClass()}
          value={current.swingPct}
          barColor="var(--orange-400)"
          duration={duration}
        />
        <BarRow
          key="sensitivity-bar"
          icon={Gauge}
          label="製程敏感度"
          badgeText={LEVEL_TEXT[current.sensitivityTag]}
          badgeClassName={sensitivityBadgeClass(current.sensitivityTag)}
          value={current.sensitivityPct}
          barColor={sensitivityBarColor(current.sensitivityTag)}
          duration={duration}
        />
      </div>

      <p className="text-[var(--text-2xs)] text-[var(--text-muted)]">
        橫條為三種負載彼此之間的相對高低，非量測或模擬的絕對數值；製程敏感度橫條愈長代表愈容易受製程變異影響（愈不精確）。
      </p>
    </div>
  );
}

interface BarRowProps {
  icon: LucideIcon;
  label: string;
  badgeText: string;
  badgeClassName: string;
  value: number;
  barColor: string;
  duration: number;
}

function BarRow({ icon: Icon, label, badgeText, badgeClassName, value, barColor, duration }: BarRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-body)]">
          <Icon size={14} className="shrink-0 text-[var(--text-muted)]" />
          {label}
        </span>
        <span className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[var(--text-xs)] font-medium ${badgeClassName}`}>
          {badgeText}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--neutral-100)]">
        <motion.div
          className="h-full rounded-[var(--radius-pill)]"
          style={{ backgroundColor: barColor }}
          animate={{ width: `${value}%` }}
          transition={{ duration }}
        />
      </div>
    </div>
  );
}
