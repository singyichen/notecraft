import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Pencil, Lock, ListOrdered, Shuffle, Zap, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * 三個問題選容器。
 * 核心洞察：選容器不是看「能裝什麼」，而是這三個問題——
 * 要不要改、要不要順序、要不要查得快。
 */

type Mutability = 'mutable' | 'immutable'
type Order = 'ordered' | 'unordered'
type Lookup = 'fast' | 'linear'

interface ContainerSpec {
  id: string
  name: string
  syntax: string
  mutability: Mutability
  order: Order
  lookup: Lookup
}

const CONTAINERS: ContainerSpec[] = [
  { id: 'list', name: 'list', syntax: '[1, 2, 3]', mutability: 'mutable', order: 'ordered', lookup: 'linear' },
  { id: 'tuple', name: 'tuple', syntax: '(28, 28)', mutability: 'immutable', order: 'ordered', lookup: 'linear' },
  { id: 'dict', name: 'dict', syntax: '{"lr": 0.01}', mutability: 'mutable', order: 'ordered', lookup: 'fast' },
  { id: 'set', name: 'set', syntax: '{1, 2, 3}', mutability: 'mutable', order: 'unordered', lookup: 'fast' },
]

interface ToggleOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

interface ToggleQuestion<T extends string> {
  id: string
  question: string
  options: [ToggleOption<T>, ToggleOption<T>]
}

const MUTABILITY_Q: ToggleQuestion<Mutability> = {
  id: 'mutability',
  question: '要不要改？',
  options: [
    { value: 'mutable', label: '可變', icon: Pencil },
    { value: 'immutable', label: '不可變', icon: Lock },
  ],
}

const ORDER_Q: ToggleQuestion<Order> = {
  id: 'order',
  question: '要不要順序？',
  options: [
    { value: 'ordered', label: '按位置取用', icon: ListOrdered },
    { value: 'unordered', label: '不在乎順序', icon: Shuffle },
  ],
}

const LOOKUP_Q: ToggleQuestion<Lookup> = {
  id: 'lookup',
  question: '要不要查得快？',
  options: [
    { value: 'fast', label: '只看有沒有', icon: Zap },
    { value: 'linear', label: '不需要', icon: Search },
  ],
}

function ToggleGroup<T extends string>({
  q,
  value,
  onChange,
}: {
  q: ToggleQuestion<T>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[168px]" role="group" aria-label={q.question}>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        {q.question}
      </span>
      <div className="flex gap-1 rounded-[var(--radius-pill)] p-1" style={{ background: 'var(--surface-sunken)' }}>
        {q.options.map((opt) => {
          const active = opt.value === value
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium whitespace-nowrap transition-colors duration-200"
              style={{
                background: active ? 'var(--blue-600)' : 'transparent',
                color: active ? '#fff' : 'var(--text-body)',
              }}
            >
              <Icon size={13} className="shrink-0" />
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AttrIcon({ Icon, on }: { Icon: LucideIcon; on: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-[var(--radius-sm)]"
      style={{
        background: on ? 'var(--surface-brand-soft)' : 'var(--neutral-100)',
        color: on ? 'var(--text-brand)' : 'var(--text-muted)',
      }}
    >
      <Icon size={11} />
    </span>
  )
}

function ContainerCard({
  spec,
  match,
  reduce,
}: {
  spec: ContainerSpec
  match: boolean
  reduce: boolean
}) {
  return (
    <motion.div
      animate={{
        opacity: match ? 1 : 0.5,
        scale: match ? 1 : 0.96,
        filter: match ? 'grayscale(0)' : 'grayscale(1)',
      }}
      transition={reduce ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
      className="flex-1 min-w-[132px] rounded-[var(--radius-lg)] p-3 flex flex-col gap-2"
      style={{
        background: match ? 'var(--surface-card)' : 'var(--surface-sunken)',
        border: `1.5px solid ${match ? 'var(--border-brand)' : 'var(--border-subtle)'}`,
      }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: match ? 'var(--text-brand)' : 'var(--text-muted)' }}
      >
        {spec.name}
      </span>

      <code
        className="text-xs px-1.5 py-1 rounded-[var(--radius-sm)] w-fit"
        style={{
          fontFamily: 'var(--font-mono)',
          background: match ? 'var(--surface-brand-soft)' : 'var(--neutral-100)',
          color: match ? 'var(--text-brand)' : 'var(--text-muted)',
        }}
      >
        {spec.syntax}
      </code>

      <div className="flex gap-1 mt-0.5">
        <AttrIcon Icon={spec.mutability === 'mutable' ? Pencil : Lock} on={match} />
        <AttrIcon Icon={spec.order === 'ordered' ? ListOrdered : Shuffle} on={match} />
        <AttrIcon Icon={spec.lookup === 'fast' ? Zap : Search} on={match} />
      </div>
    </motion.div>
  )
}

export default function MlWeek2ContainerChoice() {
  const reduce = useReducedMotion() ?? false
  const [mutability, setMutability] = useState<Mutability>('mutable')
  const [order, setOrder] = useState<Order>('ordered')
  const [lookup, setLookup] = useState<Lookup>('linear')

  const matches = useMemo(
    () =>
      CONTAINERS.filter(
        (c) => c.mutability === mutability && c.order === order && c.lookup === lookup
      ),
    [mutability, order, lookup]
  )

  const summaryClause = useMemo(() => {
    if (matches.length === 1) return `這三個答案只留下 ${matches[0].name}`
    if (matches.length === 0) return `這三個答案沒有任何內建容器同時符合`
    return `這三個答案還留著 ${matches.length} 種容器`
  }, [matches])

  return (
    <div className="not-prose w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        <ToggleGroup q={MUTABILITY_Q} value={mutability} onChange={setMutability} />
        <ToggleGroup q={ORDER_Q} value={order} onChange={setOrder} />
        <ToggleGroup q={LOOKUP_Q} value={lookup} onChange={setLookup} />
      </div>

      <div className="flex flex-wrap gap-3">
        {CONTAINERS.map((spec) => (
          <ContainerCard
            key={spec.id}
            spec={spec}
            match={matches.some((m) => m.id === spec.id)}
            reduce={reduce}
          />
        ))}
      </div>

      <p
        className="m-0 flex items-start gap-2 text-sm leading-relaxed"
        style={{ color: 'var(--text-body)' }}
      >
        <Sparkles size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--text-accent)' }} />
        <span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={summaryClause}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="inline-block font-semibold"
              style={{ color: 'var(--text-brand)' }}
            >
              {summaryClause}
            </motion.span>
          </AnimatePresence>
          {' —— 選容器不是看「能裝什麼」，而是這三個問題：要不要改、要不要順序、要不要查得快。'}
        </span>
      </p>
    </div>
  )
}
