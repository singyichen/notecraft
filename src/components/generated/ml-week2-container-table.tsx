import type { ReactElement } from 'react';
import { Check, X } from 'lucide-react';

type LookupKind = 'linear' | 'hash';

interface ContainerRow {
  name: string;
  syntax: string;
  ordered: boolean;
  orderedNote?: string;
  mutable: boolean;
  duplicable: boolean;
  duplicableNote?: string;
  lookup: LookupKind;
  lookupLabel: string;
}

const rows: ContainerRow[] = [
  {
    name: 'list',
    syntax: '[1, 2, 3]',
    ordered: true,
    mutable: true,
    duplicable: true,
    lookup: 'linear',
    lookupLabel: '線性掃描',
  },
  {
    name: 'tuple',
    syntax: '(1, 2, 3)',
    ordered: true,
    mutable: false,
    duplicable: true,
    lookup: 'linear',
    lookupLabel: '線性掃描',
  },
  {
    name: 'dict',
    syntax: "{'a': 1}",
    ordered: true,
    orderedNote: '插入序',
    mutable: true,
    duplicable: false,
    duplicableNote: '鍵不可',
    lookup: 'hash',
    lookupLabel: '雜湊 O(1)',
  },
  {
    name: 'set',
    syntax: '{1, 2, 3}',
    ordered: false,
    mutable: true,
    duplicable: false,
    lookup: 'hash',
    lookupLabel: '雜湊 O(1)',
  },
];

function BoolCell({ value, note }: { value: boolean; note?: string }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {value ? (
        <Check size={18} className="text-orange-600" strokeWidth={2.5} />
      ) : (
        <X size={18} className="text-neutral-400" strokeWidth={2.5} />
      )}
      {note && <span className="text-[11px] leading-none text-neutral-500">{note}</span>}
    </div>
  );
}

function LookupCell({ kind, label }: { kind: LookupKind; label: string }): ReactElement {
  const isHash = kind === 'hash';
  return (
    <span
      className={
        isHash
          ? 'inline-flex items-center rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700'
          : 'inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'
      }
    >
      {label}
    </span>
  );
}

export default function MlWeek2ContainerTable(): ReactElement {
  return (
    <div className="not-prose w-full overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-blue-950">
              容器
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-blue-950">
              有序
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-blue-950">
              可變
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-blue-950">
              元素可重複
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-blue-950">
              成員查找
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.name}
              className={i !== rows.length - 1 ? 'border-b border-neutral-100' : ''}
            >
              <td className="whitespace-nowrap px-3 py-2.5">
                <span className="font-mono font-semibold text-neutral-800">{row.name}</span>
                <span className="ml-2 font-mono text-xs text-neutral-500">{row.syntax}</span>
              </td>
              <td className="px-3 py-2.5 text-center">
                <BoolCell value={row.ordered} note={row.orderedNote} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <BoolCell value={row.mutable} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <BoolCell value={row.duplicable} note={row.duplicableNote} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <LookupCell kind={row.lookup} label={row.lookupLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
