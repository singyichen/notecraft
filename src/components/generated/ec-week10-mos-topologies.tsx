import { ArrowDownUp, ArrowUp, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Pin = 'G' | 'D' | 'S';
type Role = 'in' | 'out' | 'gnd';

const POS: Record<Pin, { x: number; y: number }> = {
  G: { x: 18, y: 24 },
  D: { x: 46, y: 10 },
  S: { x: 46, y: 38 },
};

const PIN_NAME: Record<Pin, string> = { G: '閘極 G', D: '汲極 D', S: '源極 S' };

interface Row {
  name: string;
  sub?: string;
  roles: Record<Pin, Role>;
  label: string;
  gain: { sign: '-' | '+'; text: string; note: string; small?: boolean };
  zin: ReactNode;
  zinNote?: string;
  use: string;
}

const ROWS: Row[] = [
  {
    name: '共源級',
    sub: 'CS',
    roles: { G: 'in', D: 'out', S: 'gnd' },
    label: '共源：閘極進、汲極出、源極交流接地',
    gain: { sign: '-', text: '− 負・大', note: '反相' },
    zin: <>高（閘極，低頻趨近無限大）</>,
    use: '一般電壓放大',
  },
  {
    name: '共閘級',
    sub: 'CG',
    roles: { S: 'in', D: 'out', G: 'gnd' },
    label: '共閘：源極進、汲極出、閘極交流接地',
    gain: { sign: '+', text: '+ 正・大', note: '同相' },
    zin: <>低（≈ 1/g<sub>m</sub>）</>,
    use: '射頻低阻抗匹配',
  },
  {
    name: '源極隨耦器',
    sub: 'CD',
    roles: { G: 'in', S: 'out', D: 'gnd' },
    label: '源極隨耦器：閘極進、源極出、汲極交流接地',
    gain: { sign: '+', text: '+ 正・小於 1', note: '同相，接近 1', small: true },
    zin: <>高</>,
    zinNote: '輸出阻抗低，所以適合當緩衝器',
    use: '緩衝器',
  },
];

function PinDiagram({ roles, label }: { roles: Record<Pin, Role>; label: string }) {
  const stroke = 'var(--text-muted)';
  const inC = 'var(--blue-700)';
  return (
    <svg
      viewBox="0 0 64 48"
      width="64"
      height="48"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      {/* 簡化的 MOSFET 本體：閘極板（x=31）與通道（x=36），D 在上、S 在下 */}
      <path d="M18 24 H31 M31 15 V33 M36 10 V38 M36 10 H46 M36 38 H46" stroke={stroke} strokeWidth="1.5" fill="none" />
      {(['G', 'D', 'S'] as Pin[]).map((p) => {
        const { x, y } = POS[p];
        const r = roles[p];
        const left = p === 'G';
        const dir = left ? -1 : 1;
        const els: ReactNode[] = [];
        if (r === 'in') {
          // arrow pointing toward the dot, coming from outside
          const x0 = left ? 2 : 62;
          const x1 = x + dir * 6;
          els.push(
            <path key="a" d={`M${x0} ${y} H${x1}`} stroke={inC} strokeWidth="1.5" fill="none" />,
            <path
              key="h"
              d={`M${x1 + dir * 4} ${y - 3} L${x1} ${y} L${x1 + dir * 4} ${y + 3}`}
              stroke={inC}
              strokeWidth="1.5"
              fill="none"
            />,
          );
        } else if (r === 'out') {
          const x0 = x + dir * 5;
          const x1 = left ? 2 : 62;
          els.push(
            <path key="a" d={`M${x0} ${y} H${x1}`} stroke="var(--text-strong)" strokeWidth="1.5" fill="none" />,
            <path
              key="h"
              d={`M${x1 - dir * 4} ${y - 3} L${x1} ${y} L${x1 - dir * 4} ${y + 3}`}
              stroke="var(--text-strong)"
              strokeWidth="1.5"
              fill="none"
            />,
          );
        } else {
          const gx = x + dir * 8;
          els.push(
            <path key="a" d={`M${x + dir * 3} ${y} H${gx}`} stroke={stroke} strokeWidth="1.5" fill="none" />,
            <path key="b1" d={`M${gx} ${y - 5} V${y + 5}`} stroke={stroke} strokeWidth="1.5" />,
            <path key="b2" d={`M${gx + dir * 3} ${y - 3.5} V${y + 3.5}`} stroke={stroke} strokeWidth="1.5" />,
            <path key="b3" d={`M${gx + dir * 6} ${y - 2} V${y + 2}`} stroke={stroke} strokeWidth="1.5" />,
          );
        }
        return (
          <g key={p}>
            {els}
            <circle cx={x} cy={y} r="3" fill={r === 'in' ? inC : 'var(--text-strong)'} />
            <text
              x={p === 'G' ? x : 29}
              y={p === 'G' ? y - 6 : p === 'D' ? 13 : 43}
              textAnchor={p === 'G' ? 'middle' : 'end'}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill="var(--text-strong)"
            >
              {p}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Chip({ role, children }: { role: Role; children: ReactNode }) {
  const style =
    role === 'in'
      ? { background: 'var(--blue-50)', color: 'var(--blue-700)' }
      : role === 'out'
        ? { background: 'var(--neutral-100)', color: 'var(--text-strong)' }
        : { background: 'var(--neutral-100)', color: 'var(--text-muted)' };
  return (
    <span
      className="inline-block whitespace-nowrap px-2 py-0.5"
      style={{ ...style, borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
    >
      {children}
    </span>
  );
}

function pinOf(roles: Record<Pin, Role>, r: Role): Pin {
  return (['G', 'D', 'S'] as Pin[]).find((p) => roles[p] === r) as Pin;
}

function GainBadge({ gain }: { gain: Row['gain'] }) {
  const neg = gain.sign === '-';
  const Icon = neg ? ArrowDownUp : ArrowUp;
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 font-semibold"
        style={{
          background: neg ? 'var(--blue-50)' : 'var(--success-50)',
          color: neg ? 'var(--blue-700)' : 'var(--success-500)',
          borderRadius: 'var(--radius-pill)',
          border: gain.small ? '1px dashed var(--success-500)' : '1px solid transparent',
          fontSize: 'var(--text-sm)',
        }}
      >
        <Icon size={14} aria-hidden="true" />
        {gain.text}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{gain.note}</span>
    </div>
  );
}

export default function EcWeek10MosTopologies() {
  const cell = 'px-3 py-2.5 align-middle text-left';
  const head = 'px-3 py-2 text-left font-semibold align-middle';
  return (
    <div className="not-prose space-y-3">
      <div
        className="overflow-x-auto"
        style={{ border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-lg)' }}
      >
        <table
          className="w-full min-w-[640px] border-collapse"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}
        >
          <caption className="sr-only">MOS 三種放大組態的腳位角色與特性比較</caption>
          <thead>
            <tr
              style={{
                background: 'var(--neutral-50)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                borderBottom: '1px solid var(--neutral-200)',
              }}
            >
              <th scope="col" className={head} style={{ width: 120 }}>組態</th>
              <th scope="col" className={head} style={{ width: 72 }}>訊號進</th>
              <th scope="col" className={head} style={{ width: 72 }}>訊號出</th>
              <th scope="col" className={head} style={{ width: 72 }}>交流接地</th>
              <th scope="col" className={head} style={{ width: 120 }}>增益</th>
              <th scope="col" className={head} style={{ width: 96 }}>輸入阻抗</th>
              <th scope="col" className={head} style={{ width: 140 }}>典型用途</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.name}
                className="hover:bg-[var(--neutral-100)]"
                style={i > 0 ? { borderTop: '1px solid var(--neutral-200)' } : undefined}
              >
                <th scope="row" className={cell}>
                  <div className="flex flex-col items-start gap-1">
                    <PinDiagram roles={row.roles} label={row.label} />
                    <span className="font-semibold">{row.name}</span>
                    {row.sub && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {row.sub}
                      </span>
                    )}
                  </div>
                </th>
                <td className={cell}>
                  <Chip role="in">{PIN_NAME[pinOf(row.roles, 'in')]}</Chip>
                </td>
                <td className={cell}>
                  <Chip role="out">{PIN_NAME[pinOf(row.roles, 'out')]}</Chip>
                </td>
                <td className={cell}>
                  <Chip role="gnd">{PIN_NAME[pinOf(row.roles, 'gnd')]}</Chip>
                </td>
                <td className={cell}>
                  <GainBadge gain={row.gain} />
                </td>
                <td className={cell}>
                  <div>{row.zin}</div>
                  {row.zinNote && (
                    <div className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {row.zinNote}
                    </div>
                  )}
                </td>
                <td className={cell}>{row.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className="flex items-start gap-1.5"
        style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}
      >
        <Info size={14} className="mt-1 shrink-0" aria-hidden="true" />
        <span>
          三者的直流工作點可以完全相同，差別只在訊號注入與取出的位置，所以看電路要先問：訊號從哪裡進、從哪裡出、哪隻腳交流接地。
        </span>
      </p>
    </div>
  );
}
