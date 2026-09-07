/**
 * 核心洞察：選容器不是看「能裝什麼」，而是依序回答三個問題——
 * 要不要改（是否可變）、要不要順序（是否有序）、要不要查得快（查找效率）。
 * dict／set 背後是雜湊表，查找幾乎與資料量無關；list／tuple 的成員測試要從頭
 * 掃到尾，資料一大差別就很明顯——這也是「是否可變」「是否有序」「查找效率」
 * 三欄要特別用色票與圖示強調的原因：橫向掃過一列，就能直接做選型判斷。
 */

import {
  List,
  Parentheses,
  Braces,
  Layers,
  ListOrdered,
  Shuffle,
  Lock,
  Pencil,
  Zap,
  Search,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'active' | 'muted' | 'accent'

const TONE_STYLE: Record<Tone, { bg: string; color: string }> = {
  active: { bg: 'var(--blue-50)', color: 'var(--blue-700)' },
  muted: { bg: 'var(--neutral-100)', color: 'var(--neutral-600)' },
  accent: { bg: 'var(--orange-50)', color: 'var(--orange-700)' },
}

interface AttributeBadgeProps {
  icon: LucideIcon
  label: string
  tone: Tone
}

function AttributeBadge({ icon: Icon, label, tone }: AttributeBadgeProps) {
  const style = TONE_STYLE[tone]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </span>
  )
}

interface ContainerRow {
  key: string
  name: string
  nameIcon: LucideIcon
  syntax: string
  syntaxNote: string
  ordered: { label: string; tone: Tone; icon: LucideIcon }
  mutable: { label: string; tone: Tone; icon: LucideIcon }
  duplicates: string
  lookup: { label: string; tone: Tone; icon: LucideIcon }
  useCase: string
  nextStep: string
}

const rows: ContainerRow[] = [
  {
    key: 'list',
    name: 'list',
    nameIcon: List,
    syntax: '[1, 2, 3]',
    syntaxNote: '方括號',
    ordered: { label: '有序', tone: 'active', icon: ListOrdered },
    mutable: { label: '可變', tone: 'active', icon: Pencil },
    duplicates: '可重複',
    lookup: { label: '逐一掃描 O(n)', tone: 'muted', icon: Search },
    useCase: '會一直增刪的暫存區——逐行讀檔時把解析結果 append 進去。',
    nextStep: '切片語法 a[start:stop:step] 延伸為 NumPy arr[2:5, 1]、Pandas df.iloc[10:20] 的索引文法。',
  },
  {
    key: 'tuple',
    name: 'tuple',
    nameIcon: Parentheses,
    syntax: '(28, 28)',
    syntaxNote: '圓括號',
    ordered: { label: '有序', tone: 'active', icon: ListOrdered },
    mutable: { label: '不可變', tone: 'muted', icon: Lock },
    duplicates: '可重複',
    lookup: { label: '逐一掃描 O(n)', tone: 'muted', icon: Search },
    useCase: '表示一組固定的東西，例如圖片的形狀 (28, 28)；不可變也讓它能當字典的鍵。',
    nextStep: '不可變＋可雜湊的特性，讓它能當 dict 的鍵，也是 NumPy shape、DataFrame MultiIndex 元素的慣用型別。',
  },
  {
    key: 'dict',
    name: 'dict',
    nameIcon: Braces,
    syntax: '{"a": 1}',
    syntaxNote: '大括號鍵值對',
    ordered: { label: '有序（插入順序）', tone: 'active', icon: ListOrdered },
    mutable: { label: '可變', tone: 'active', icon: Pencil },
    duplicates: '鍵不可重複，值可重複',
    lookup: { label: '雜湊查找 O(1)', tone: 'accent', icon: Zap },
    useCase: '用名字查東西——把欄位名對應到那一欄資料，或收一份超參數設定。',
    nextStep: '「用名字取值」的心智模型，正是 Pandas DataFrame 依欄位名取一整欄的原型。',
  },
  {
    key: 'set',
    name: 'set',
    nameIcon: Layers,
    syntax: '{1, 2, 3}',
    syntaxNote: '大括號單值',
    ordered: { label: '無序', tone: 'muted', icon: Shuffle },
    mutable: { label: '可變', tone: 'active', icon: Pencil },
    duplicates: '不可重複（自動去重）',
    lookup: { label: '雜湊查找 O(1)', tone: 'accent', icon: Zap },
    useCase: '去重與取交集——想知道兩份名單重疊多少，set(a) & set(b) 一行就好。',
    nextStep: '「只在乎有沒有這個成員」的直覺，之後對應到 Pandas 的 isin()／duplicated() 等成員判斷與去重方法。',
  },
]

const questions: { icon: LucideIcon; text: string }[] = [
  { icon: Pencil, text: '要不要改？——是否可變' },
  { icon: ListOrdered, text: '要不要順序？——是否有序' },
  { icon: Zap, text: '要不要查得快？——查找效率' },
]

const columnHeaders = [
  '容器（建立語法）',
  '是否有序',
  '是否可變',
  '元素是否可重複',
  '查找效率',
  '典型使用場景',
  '之後會接到哪裡',
]

export default function MlWeek2Concept() {
  return (
    <div className="not-prose w-full space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {questions.map((q) => (
          <span
            key={q.text}
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--text-strong)' }}
          >
            <q.icon size={15} style={{ color: 'var(--text-accent)' }} />
            {q.text}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Python 四種內建容器（list、tuple、dict、set）的建立語法、是否有序、是否可變、元素是否可重複、查找效率、典型使用場景與後續延伸的對照表
          </caption>
          <thead>
            <tr style={{ background: 'var(--surface-sunken)' }}>
              {columnHeaders.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.key}
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  background: i % 2 === 1 ? 'var(--surface-sunken)' : 'transparent',
                }}
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <row.nameIcon size={15} style={{ color: 'var(--text-brand)' }} />
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: 'var(--text-strong)' }}
                    >
                      {row.name}
                    </span>
                  </div>
                  <code
                    className="mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-xs"
                    style={{ background: 'var(--neutral-100)', color: 'var(--text-body)' }}
                  >
                    {row.syntax}
                  </code>
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.syntaxNote}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <AttributeBadge icon={row.ordered.icon} label={row.ordered.label} tone={row.ordered.tone} />
                </td>
                <td className="px-4 py-3 align-top">
                  <AttributeBadge icon={row.mutable.icon} label={row.mutable.label} tone={row.mutable.tone} />
                </td>
                <td className="px-4 py-3 align-top text-sm" style={{ color: 'var(--text-body)' }}>
                  {row.duplicates}
                </td>
                <td className="px-4 py-3 align-top">
                  <AttributeBadge icon={row.lookup.icon} label={row.lookup.label} tone={row.lookup.tone} />
                </td>
                <td className="max-w-xs px-4 py-3 align-top text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                  {row.useCase}
                </td>
                <td className="max-w-xs px-4 py-3 align-top text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                  {row.nextStep}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
