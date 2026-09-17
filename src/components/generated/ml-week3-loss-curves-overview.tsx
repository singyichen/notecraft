import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ── types ──────────────────────────────────────────────────────────────────

interface EpochPoint {
  epoch: number
  gdHighLr: number
  gdLowLr: number
  gdScaled: number
  sgdScaled: number
}

type SeriesKey = Exclude<keyof EpochPoint, 'epoch'>

interface SeriesConfig {
  key: SeriesKey
  name: string
  color: string
}

type ScaleMode = 'log' | 'linear'

// ── synthetic data (epoch 1–15) ───────────────────────────────────────────
// 手動寫死的示意數值，對應四個訓練情境；log 軸要求所有數值 > 0。

const EPOCHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

// GD, η=0.1（未縮放）：學習率過大，指數發散
const GD_HIGH_LR = [0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 2.9, 3.8, 5.0, 6.5, 8.5, 11.0, 14.5, 19.0, 25.0]

// GD, η=0.0001（未縮放）：學習率過小，緩慢下降、遠未收斂
const GD_LOW_LR = [0.435, 0.431, 0.427, 0.423, 0.419, 0.415, 0.411, 0.408, 0.405, 0.402, 0.399, 0.396, 0.393, 0.39, 0.382]

// GD, η=0.5（已縮放）：前 3 個 epoch 快速陡降，之後平緩收斂到接近但不等於 0
const GD_SCALED = [0.5, 0.22, 0.09, 0.045, 0.028, 0.02, 0.016, 0.014, 0.013, 0.012, 0.0115, 0.011, 0.0105, 0.0102, 0.01]

// SGD, η=0.01（已縮放）：第 2 個 epoch 就幾乎降到收斂水準
const SGD_SCALED = [0.135, 0.019, 0.017, 0.0165, 0.016, 0.0158, 0.0157, 0.0156, 0.0155, 0.0154, 0.0153, 0.0152, 0.0151, 0.015, 0.015]

const DATA: EpochPoint[] = EPOCHS.map((epoch, i) => ({
  epoch,
  gdHighLr: GD_HIGH_LR[i],
  gdLowLr: GD_LOW_LR[i],
  gdScaled: GD_SCALED[i],
  sgdScaled: SGD_SCALED[i],
}))

const SERIES: SeriesConfig[] = [
  { key: 'gdHighLr', name: 'GD η=0.1（未縮放）', color: 'var(--warning-500)' },
  { key: 'gdLowLr', name: 'GD η=0.0001（未縮放）', color: 'var(--blue-300)' },
  { key: 'gdScaled', name: 'GD η=0.5（已縮放）', color: 'var(--blue-600)' },
  { key: 'sgdScaled', name: 'SGD η=0.01（已縮放）', color: 'var(--orange-500)' },
]

const SCALE_OPTIONS: { value: ScaleMode; label: string }[] = [
  { value: 'log', label: '對數' },
  { value: 'linear', label: '線性' },
]

// ── component ──────────────────────────────────────────────────────────────

export default function MlWeek3LossCurvesOverview() {
  const [hiddenKeys, setHiddenKeys] = useState<Set<SeriesKey>>(new Set())
  const [scale, setScale] = useState<ScaleMode>('log')

  function toggleKey(key: SeriesKey) {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 not-prose">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--text-muted)]">Y 軸座標</span>
        <div className="inline-flex gap-1 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] p-1">
          {SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setScale(opt.value)}
              className={
                scale === opt.value
                  ? 'rounded-[var(--radius-pill)] bg-[var(--blue-600)] px-3 py-1 text-xs font-medium text-white transition-colors'
                  : 'rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--blue-50)]'
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={DATA} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
          <XAxis dataKey="epoch" tick={{ fill: 'var(--neutral-500)', fontSize: 12 }} />
          <YAxis
            scale={scale}
            domain={scale === 'log' ? ['auto', 'auto'] : [0, 'auto']}
            tick={{ fill: 'var(--neutral-500)', fontSize: 12 }}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
            }}
            itemStyle={{ fontVariantNumeric: 'tabular-nums' }}
            labelFormatter={(label) => `Epoch ${label}`}
            formatter={(value, name) => {
              const num = typeof value === 'number' ? value : Number(value)
              return [num.toFixed(4), name]
            }}
          />
          <Legend
            onClick={(entry) => {
              const key = entry.dataKey
              if (typeof key === 'string') toggleKey(key as SeriesKey)
            }}
            formatter={(value, entry) => {
              const key = entry.dataKey
              const isHidden = typeof key === 'string' && hiddenKeys.has(key as SeriesKey)
              return (
                <span
                  style={{
                    color: isHidden ? 'var(--text-muted)' : 'var(--text-body)',
                    opacity: isHidden ? 0.45 : 1,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {value}
                </span>
              )
            }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
              hide={hiddenKeys.has(s.key)}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="space-y-1 text-[13px] leading-relaxed text-[var(--text-body)]">
        <p>
          同樣是梯度下降，縮放前後可用的學習率範圍差了一個數量級：未縮放時 η=0.1 就會發散，縮放後 η=0.5 反而更快收斂。
        </p>
        <p>
          在特徵已縮放的前提下，SGD 比 GD 更早進入平緩區——第 2 個 epoch 就逼近收斂水準，GD 則要到第 3、4 個 epoch 才開始平緩。
        </p>
      </div>
    </div>
  )
}
