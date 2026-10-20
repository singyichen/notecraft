import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  MicOff,
  BatteryWarning,
  Dices,
  SlidersHorizontal,
  ShieldCheck,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';

type StageId = 'direct-mic' | 'direct-supply' | 'single-resistor' | 'voltage-divider' | 'emitter-degeneration';

interface Stage {
  id: StageId;
  label: string;
  icon: LucideIcon;
  solved: string;
  remaining: string;
  usable: boolean;
  usableNote: string;
}

const STAGES: Stage[] = [
  {
    id: 'direct-mic',
    label: '訊號源直接接基極',
    icon: MicOff,
    solved: '接線最簡單，訊號理論上能直接驅動基極',
    remaining: '完全沒有直流路徑，偏壓電流為零，g_m 為零，什麼都放大不了',
    usable: false,
    usableNote: '不可用：電晶體從未被偏壓',
  },
  {
    id: 'direct-supply',
    label: '基極直接接電源',
    icon: BatteryWarning,
    solved: '基極有了穩定的直流電位，電晶體確實被偏壓了',
    remaining: '電源在交流上等於接地，訊號源被電源短路掉，訊號根本進不了電晶體',
    usable: false,
    usableNote: '不可用：訊號路徑被短路',
  },
  {
    id: 'single-resistor',
    label: '單一基極電阻',
    icon: Dices,
    solved: '工作點終於可以算出來了，訊號也進得去基極',
    remaining: '集極電流正比於電流增益 β，而 β 本身批號間差異極大、也隨溫度飄移',
    usable: false,
    usableNote: '不可用：工作點靠 β 賭運氣',
  },
  {
    id: 'voltage-divider',
    label: '電阻分壓偏壓',
    icon: SlidersHorizontal,
    solved: '兩顆電阻分壓決定基極電位，只要基極電流夠小，集極電流幾乎與 β 無關',
    remaining: '工作點變成指數地依賴電阻分壓誤差，分壓點差 60 mV 電流就差一個數量級',
    usable: false,
    usableNote: '堪用但脆弱：電阻公差一超標就大幅偏移',
  },
  {
    id: 'emitter-degeneration',
    label: '射極退化偏壓',
    icon: ShieldCheck,
    solved: '射極電阻形成負回授：電流一大、射極電位上升、V_BE 被壓下來、電流又降回去',
    remaining: '增益因此被壓低，但可以靠旁路電容換回來',
    usable: true,
    usableNote: '可用：對 β 與電阻誤差都不敏感',
  },
];

interface StageTabProps {
  stage: Stage;
  active: boolean;
  onSelect: () => void;
}

function StageTab({ stage, active, onSelect }: StageTabProps) {
  const Icon = stage.icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill,9999px)] border px-3 py-1.5 text-xs font-medium transition-colors"
      style={
        active
          ? {
              background: stage.usable ? 'var(--success-50)' : 'var(--neutral-200)',
              color: stage.usable ? 'var(--success-500)' : 'var(--neutral-700)',
              borderColor: stage.usable ? 'var(--success-500)' : 'var(--neutral-400)',
            }
          : {
              background: 'var(--surface-card)',
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }
      }
    >
      <Icon size={14} />
      {stage.label}
    </button>
  );
}

export default function EcWeek6BiasingEvolution() {
  // 從第一態開始，讓讀者照「一路改良」的順序自己走一遍
  const [activeId, setActiveId] = useState<StageId>(STAGES[0].id);
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = shouldReduceMotion ?? false;
  const stage = STAGES.find((s) => s.id === activeId) ?? STAGES[STAGES.length - 1];

  return (
    <div className="not-prose flex flex-col gap-4">
      <div role="tablist" aria-label="偏壓電路演進五態" className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <StageTab key={s.id} stage={s} active={s.id === activeId} onSelect={() => setActiveId(s.id)} />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}
        >
          <div
            className="rounded-[var(--radius-lg)] border p-3.5"
            style={{
              borderLeft: '4px solid var(--blue-500)',
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-card)',
            }}
          >
            <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">解決了什麼</div>
            <div className="text-sm text-[var(--text-body)]">{stage.solved}</div>
          </div>
          <div
            className="rounded-[var(--radius-lg)] border p-3.5"
            style={{
              borderLeft: `4px solid ${stage.usable ? 'var(--success-500)' : 'var(--warning-500)'}`,
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-card)',
            }}
          >
            <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">還剩什麼問題</div>
            <div className="text-sm text-[var(--text-body)]">{stage.remaining}</div>
          </div>
          <div
            className="flex flex-col justify-between rounded-[var(--radius-lg)] p-3.5"
            style={{
              background: stage.usable ? 'var(--success-50)' : 'var(--orange-50)',
            }}
          >
            <div
              className="mb-1 text-xs font-medium"
              style={{ color: stage.usable ? 'var(--success-500)' : 'var(--orange-600)' }}
            >
              能不能實用
            </div>
            <div
              className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-pill,9999px)] px-2.5 py-1 text-xs font-semibold"
              style={{
                background: stage.usable ? 'var(--success-500)' : 'var(--orange-500)',
                color: '#fff',
              }}
            >
              {stage.usable ? <Check size={13} /> : <X size={13} />}
              {stage.usableNote}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--blue-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        好的偏壓不是「算得出來」，而是「參數飄了也不會偏太多」——這正是最後一態（射極退化）相對前四態的本質差異。
      </div>
    </div>
  );
}
