import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

// ── physics ────────────────────────────────────────────────────────────────

/** 波茲曼常數，eV/K（用 eV 制，才能直接跟 Eg（eV）湊在同一個指數項） */
const K_EV = 8.617e-5
const EG_SI = 1.12 // 矽能隙 (eV)
const EG_GE = 0.66 // 鍺能隙 (eV)

/** 本質載子濃度 ni(T) = 5.2e15 * T^1.5 * exp(-Eg / (2kT))，單位 cm^-3 */
function ni(temperatureK: number, egEv: number): number {
  return 5.2e15 * Math.pow(temperatureK, 1.5) * Math.exp(-egEv / (2 * K_EV * temperatureK))
}

interface DataPoint {
  T: number
  niSi: number
  niGe: number
}

const T_MIN = 200
const T_MAX = 600
const T_STEP = 10

function buildData(): DataPoint[] {
  const points: DataPoint[] = []
  for (let T = T_MIN; T <= T_MAX; T += T_STEP) {
    points.push({ T, niSi: ni(T, EG_SI), niGe: ni(T, EG_GE) })
  }
  return points
}

// ── number formatting（禁止 emoji，一律用 unicode 上標或 <sup>） ───────────

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
}

function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch)
    .join('')
}

/** YAxis tick：純字串，回傳如 "10⁶" */
function formatPow10Tick(value: number): string {
  const exp = Math.round(Math.log10(value))
  return `10${toSuperscript(exp)}`
}

interface Scientific {
  mantissa: string
  exponent: number
}

/** 科學記號拆解：mantissa 2 位小數 + 10 的次方 */
function toScientific(value: number): Scientific {
  let exponent = Math.floor(Math.log10(value))
  let mantissa = value / Math.pow(10, exponent)
  let mantissaStr = mantissa.toFixed(2)
  // 四捨五入把 mantissa 撐到 10.00 時進位一個次方
  if (parseFloat(mantissaStr) >= 10) {
    exponent += 1
    mantissa = value / Math.pow(10, exponent)
    mantissaStr = mantissa.toFixed(2)
  }
  return { mantissa: mantissaStr, exponent }
}

function SciValue({ value, unit }: { value: number; unit?: string }): JSX.Element {
  const { mantissa, exponent } = toScientific(value)
  return (
    <>
      {mantissa}
      {'×10'}
      <sup>{exponent}</sup>
      {unit ? ` ${unit}` : ''}
    </>
  )
}

// ── component ────────────────────────────────────────────────────────────────

export default function EcWeek1NiTemperature() {
  const shouldReduceMotion = useReducedMotion() ?? false
  const [temperature, setTemperature] = useState(300)

  const data = useMemo(() => buildData(), [])

  const currentIndex = Math.round((temperature - T_MIN) / T_STEP)
  const currentNiSi = data[currentIndex]?.niSi ?? ni(temperature, EG_SI)
  const niSi300 = data[Math.round((300 - T_MIN) / T_STEP)]?.niSi ?? ni(300, EG_SI)
  const ratio = currentNiSi / niSi300

  return (
    <div className="not-prose flex flex-col gap-4">
      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--neutral-600)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-[var(--blue-500)]" />
          矽（E<sub>g</sub> = 1.12 eV）
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 bg-[var(--blue-300)]"
            style={{ backgroundImage: 'repeating-linear-gradient(to right, var(--blue-300) 0 4px, transparent 4px 7px)' }}
          />
          鍺（E<sub>g</sub> = 0.66 eV，對照）
        </span>
      </div>

      {/* 圖表 */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 28, left: 56 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
          <XAxis
            dataKey="T"
            type="number"
            domain={[T_MIN, T_MAX]}
            ticks={[200, 300, 400, 500, 600]}
            tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
            label={{ value: 'T (K)', position: 'insideBottom', offset: -18, fill: 'var(--neutral-600)', fontSize: 12 }}
          />
          <YAxis
            scale="log"
            domain={[1e6, 1e16]}
            ticks={[1e6, 1e8, 1e10, 1e12, 1e14, 1e16]}
            tickFormatter={formatPow10Tick}
            allowDataOverflow
            tick={{ fill: 'var(--neutral-500)', fontSize: 11 }}
            label={{ value: 'nᵢ (cm⁻³)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--neutral-600)', fontSize: 12 }}
          />
          <Line
            dataKey="niSi"
            stroke="var(--blue-500)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={220}
          />
          <Line
            dataKey="niGe"
            stroke="var(--blue-300)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={220}
          />
          <ReferenceLine x={temperature} stroke="var(--neutral-400)" strokeDasharray="3 3" />
          <ReferenceDot
            x={300}
            y={1.08e10}
            r={4}
            fill="var(--orange-500)"
            stroke="#fff"
            strokeWidth={1.5}
            isFront
            label={{ value: 'Ex 2-1', position: 'top', fill: 'var(--orange-600)', fontSize: 11 }}
          />
          <ReferenceDot
            x={600}
            y={1.54e15}
            r={4}
            fill="var(--orange-500)"
            stroke="#fff"
            strokeWidth={1.5}
            isFront
          />
          <ReferenceDot
            x={temperature}
            y={currentNiSi}
            r={5}
            fill="var(--blue-500)"
            stroke="#fff"
            strokeWidth={2}
            isFront
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 溫度 slider */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-body)]">溫度 T</span>
          <span className="font-semibold text-[var(--blue-600)]">{temperature} K</span>
        </div>
        <input
          type="range"
          min={T_MIN}
          max={T_MAX}
          step={T_STEP}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full accent-[var(--blue-600)]"
          aria-label="溫度 T（K）"
        />
      </div>

      {/* 數值卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">目前溫度</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">{temperature} K</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">矽的 n<sub>i</sub></div>
          <div className="text-sm font-medium text-[var(--text-strong)]">
            <SciValue value={currentNiSi} unit="cm⁻³" />
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--neutral-200)] p-3">
          <div className="mb-1 text-xs text-[var(--neutral-600)]">相對 300K 倍數</div>
          <div className="text-sm font-medium text-[var(--text-strong)]">
            {ratio < 1000 ? (
              `約 ${ratio.toFixed(1)} 倍`
            ) : (
              <>
                約 <SciValue value={ratio} /> 倍
              </>
            )}
          </div>
        </div>
      </div>

      {/* 固定結論 */}
      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--blue-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        指數關係讓 n<sub>i</sub> 對溫度極度敏感——這就是後面所有偏壓電路都要抵抗溫度漂移的原因。
      </div>
    </div>
  )
}
