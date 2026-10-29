import { Fragment, type ReactNode } from 'react';
import {
  Layers,
  LineChart,
  TriangleAlert,
  Zap,
  ZapOff,
  Gauge,
  Ruler,
  CircuitBoard,
} from 'lucide-react';

interface Row {
  icon: ReactNode;
  label: string;
  bjt: ReactNode;
  mos: ReactNode;
  warning?: { label: string };
  note?: string;
}

const SaturationBadge = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--warning-50)',
      color: 'var(--warning-700)',
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    <TriangleAlert size={12} />
    飽和≠飽和
  </span>
);

const Formula = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[13px] text-[var(--text-strong)]">{children}</span>
);

const MiniBar = ({ widthPct, color }: { widthPct: number; color: string }) => (
  <div className="h-1.5 w-20 rounded-full bg-neutral-100 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${widthPct}%` }} />
  </div>
);

const rows: Row[] = [
  {
    icon: <Layers size={16} className="text-blue-700 shrink-0" />,
    label: '核心結構',
    bjt: (
      <>
        三層 PN 接面「三明治」結構（NPN 為 N–P–N，或 PNP 為 P–N–P），兩個背靠背的 PN
        接面
      </>
    ),
    mos: <>MOS 電容（閘極–氧化層–基板）＋通道形成時的反轉層連接源極與汲極</>,
  },
  {
    icon: <LineChart size={16} className="text-blue-700 shrink-0" />,
    label: '控制關係',
    bjt: (
      <>
        指數特性 —— <Formula>I_C = I_S · exp(V_BE / V_T)</Formula>
      </>
    ),
    mos: (
      <>
        平方律特性 ——{' '}
        <Formula>I_D = ½ · μ_n C_ox · (W/L) · (V_GS − V_TH)²</Formula>
      </>
    ),
  },
  {
    icon: <TriangleAlert size={16} className="text-blue-700 shrink-0" />,
    label: '放大要用的工作區',
    warning: { label: '飽和≠飽和' },
    bjt: (
      <>
        順向主動區（forward active region）：V<sub>BE</sub> &gt; 0 順偏、V
        <sub>CB</sub> &gt; 0 逆偏
      </>
    ),
    mos: (
      <>
        飽和區（saturation region）：V<sub>DS</sub> &gt; V<sub>GS</sub> − V
        <sub>TH</sub>
      </>
    ),
    note: 'BJT 把放大失效、進入開關狀態稱為「飽和區」（放大要用的是主動區）；MOSFET 卻把負責放大的工作區本身稱為「飽和區」（開關／電阻狀態叫三極管區）——同一個詞，在兩種元件裡指向相反的角色。',
  },
  {
    icon: null,
    label: '輸入端是否吃直流電流',
    bjt: (
      <span className="flex items-start gap-2">
        <Zap size={14} className="text-blue-700 shrink-0 mt-0.5" />
        <span>
          基極吃有限電流（finite base current），大小與 β 有關：
          <Formula>I_B = I_C / β</Formula>
        </span>
      </span>
    ),
    mos: (
      <span className="flex items-start gap-2">
        <ZapOff size={14} className="text-neutral-400 shrink-0 mt-0.5" />
        <span>閘極電流為零（zero gate current）——閘極隔著氧化層，是絕緣的 MOS 電容</span>
      </span>
    ),
  },
  {
    icon: <Gauge size={16} className="text-blue-700 shrink-0" />,
    label: '相同電流下的轉導',
    bjt: (
      <div className="space-y-1.5">
        <div>
          較大 —— <Formula>g_m = I_C / V_T</Formula>（指數特性，曲線斜率大）
        </div>
        <MiniBar widthPct={70} color="bg-blue-700" />
      </div>
    ),
    mos: (
      <div className="space-y-1.5">
        <div>
          較小 —— <Formula>g_m = 2I_D / (V_GS − V_TH)</Formula>（平方律，斜率較小）
        </div>
        <MiniBar widthPct={35} color="bg-neutral-300" />
      </div>
    ),
  },
  {
    icon: <Ruler size={16} className="text-blue-700 shrink-0" />,
    label: '設計者可調的幾何自由度',
    bjt: (
      <>
        只有元件面積（面積放大 n 倍 → I<sub>S</sub>、g<sub>m</sub> 同步放大 n
        倍，形狀沒有獨立設計自由度）
      </>
    ),
    mos: (
      <>
        寬 W 與長 L 各自可調（寬長比 W/L 是獨立設計參數，同時影響電流、g
        <sub>m</sub> 與通道電阻特性）
      </>
    ),
  },
  {
    icon: <CircuitBoard size={16} className="text-blue-700 shrink-0" />,
    label: '有限輸出電阻的成因',
    bjt: (
      <>
        爾利效應（Early effect）——集極電壓升高使基極–集極空乏區往基極擴張，有效基極寬度變薄，集極電流微幅上升；
        <Formula>r_o = V_A / I_C</Formula>
      </>
    ),
    mos: (
      <>
        通道長度調變（channel-length modulation）——汲極電壓升高使夾止點往源極端移動，有效通道變短，汲極電流微幅上升；
        <Formula>r_o = 1 / (λ · I_D)</Formula>
      </>
    ),
  },
];

export default function EcWeek7BjtVsMos() {
  return (
    <figure className="not-prose my-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm border-collapse rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">
                項目
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">
                BJT（雙極性）
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">
                MOSFET（場效）
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={row.label}>
                <tr
                  className={[
                    index % 2 === 0 ? 'bg-white' : 'bg-neutral-50',
                    'hover:bg-blue-50 transition-colors',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 align-top text-neutral-700">
                    <span className="flex items-start gap-2">
                      {row.icon}
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-neutral-800">{row.label}</span>
                        {row.warning && <SaturationBadge />}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-neutral-700">{row.bjt}</td>
                  <td className="px-4 py-3 align-top text-neutral-700">{row.mos}</td>
                </tr>
                {row.note && (
                  <tr className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                    <td colSpan={3} className="px-4 py-2 text-xs text-[var(--neutral-600)]">
                      {row.note}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
