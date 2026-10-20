import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Gauge } from 'lucide-react';

type ImpedanceLevel = 'high' | 'low';

interface ImpedanceRow {
  terminal: string;
  condition: ReactNode;
  magnitude: ReactNode;
  level: ImpedanceLevel;
  usage: ReactNode;
}

const ROWS: ImpedanceRow[] = [
  {
    terminal: '從基極看進去',
    condition: '射極交流接地',
    magnitude: (
      <>
        基極-射極小訊號電阻 r<sub>π</sub>
      </>
    ),
    level: 'high',
    usage: '共射組態的輸入端',
  },
  {
    terminal: '從集極看進去',
    condition: (
      <>
        射極交流接地，<span className="whitespace-nowrap">考慮爾利效應</span>
      </>
    ),
    magnitude: (
      <>
        電晶體本身的輸出電阻 r<sub>o</sub>
      </>
    ),
    level: 'high',
    usage: '共射組態的輸出端',
  },
  {
    terminal: '從射極看進去',
    condition: '基極交流接地，忽略爾利效應',
    magnitude: (
      <>
        轉導的倒數 1/g<sub>m</sub>
      </>
    ),
    level: 'low',
    usage: '射極隨耦器的低阻抗輸出',
  },
];

function LevelBadge({ level }: { level: ImpedanceLevel }) {
  const isHigh = level === 'high';
  const Icon = isHigh ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill,9999px)] px-2.5 py-1 text-xs font-semibold"
      style={
        isHigh
          ? { background: 'var(--blue-50)', color: 'var(--blue-700)' }
          : { background: 'var(--orange-50)', color: 'var(--orange-600)' }
      }
    >
      <Icon size={13} />
      {isHigh ? '高阻抗' : '低阻抗'}
    </span>
  );
}

export default function EcWeek6ImpedanceRules() {
  return (
    <div className="not-prose flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--neutral-50)] text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-2.5 font-medium">端點</th>
              <th className="px-4 py-2.5 font-medium">前提條件</th>
              <th className="px-4 py-2.5 font-medium">阻抗大小</th>
              <th className="px-4 py-2.5 font-medium">高／低阻抗</th>
              <th className="px-4 py-2.5 font-medium">典型用途</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.terminal}
                className={i < ROWS.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}
              >
                <td className="px-4 py-3 font-medium text-[var(--text-strong)] whitespace-nowrap">
                  {row.terminal}
                </td>
                <td className="px-4 py-3 text-[var(--text-body)]">{row.condition}</td>
                <td className="px-4 py-3 text-[var(--text-body)]">{row.magnitude}</td>
                <td className="px-4 py-3">
                  <LevelBadge level={row.level} />
                </td>
                <td className="px-4 py-3 text-[var(--text-body)]">{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
        <Gauge size={14} className="mt-0.5 shrink-0" />
        <span>
          量測方法一律是在該端點加測試電壓源、另一端接地，算流入電流，兩者相除就是阻抗。
        </span>
      </div>
    </div>
  );
}
