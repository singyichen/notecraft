import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeftRight } from 'lucide-react';

type SignalMode = 'large' | 'small';
type RegulationTab = 'line' | 'load';

/** 熱電壓 VT（mV），用來由 ID1 衍生 rd1 = VT / ID1 */
const VT_MV = 26;

interface SliderControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}

function SliderControl({ id, label, value, min, max, step, displayValue, onChange }: SliderControlProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs text-[var(--text-muted)]">
          {label}
        </label>
        <span className="text-xs font-semibold tabular-nums text-[var(--text-strong)]">{displayValue}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-full accent-[var(--blue-500)]"
      />
    </div>
  );
}

function ReadoutCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
      <div className="text-xs text-[var(--text-muted)]">{title}</div>
      <div className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">{value}</div>
    </div>
  );
}

function CompareBar({
  label,
  valuePct,
  valueLabel,
  color,
}: {
  label: string;
  valuePct: number;
  valueLabel: string;
  color: string;
}) {
  const clamped = Math.min(Math.max(valuePct, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--text-strong)]">
        {valueLabel}
      </span>
    </div>
  );
}

export default function EcWeek2ZenerRegulation() {
  const shouldReduceMotion = useReducedMotion();
  const symbolDuration = shouldReduceMotion ? 0 : 0.3;
  const fadeDuration = shouldReduceMotion ? 0 : 0.2;

  const [mode, setMode] = useState<SignalMode>('large');
  const [tab, setTab] = useState<RegulationTab>('line');

  // R1 用對數滑桿：position 0-100 → 10 Ω .. 1000 Ω（兩個十進位級距）
  const [r1Pos, setR1Pos] = useState(50);
  const [rd2, setRd2] = useState(5);
  const [id1, setId1] = useState(15);
  const [deltaVin, setDeltaVin] = useState(1);
  const [deltaIL, setDeltaIL] = useState(1);

  const r1 = useMemo(() => Math.pow(10, 1 + (r1Pos / 100) * 2), [r1Pos]);
  const rd1 = useMemo(() => VT_MV / id1, [id1]);

  const lineRatio = useMemo(() => (rd1 + rd2) / (rd1 + rd2 + r1), [rd1, rd2, r1]);
  const loadReg = useMemo(() => ((rd1 + rd2) * r1) / (rd1 + rd2 + r1), [rd1, rd2, r1]);

  const deltaVoutLineV = lineRatio * deltaVin;
  const deltaVoutLoadMv = loadReg * deltaIL;

  const tabs: { key: RegulationTab; label: string }[] = [
    { key: 'line', label: '線調整率' },
    { key: 'load', label: '負載調整率' },
  ];

  return (
    <div className="not-prose flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'large' ? 'small' : 'large'))}
          aria-pressed={mode === 'small'}
          className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] transition-colors"
        >
          <ArrowLeftRight size={13} className={mode === 'small' ? 'text-[var(--blue-500)]' : 'text-[var(--text-muted)]'} />
          {mode === 'large' ? '大訊號模型（點擊切換為小訊號）' : '小訊號模型（點擊切回大訊號）'}
        </button>

        <svg
          viewBox="0 0 340 300"
          width="100%"
          role="img"
          aria-label="齊納穩壓器電路：大訊號二極體模型與小訊號電阻模型切換"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Vin 電源（垂直放置） */}
          <g transform="translate(20 65) rotate(90 30 15)">
            <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
              <path d="M0,15 H22 M37,15 H60" />
              <path d="M22,5 V25" />
              <path d="M27,10 V20" strokeWidth={4} />
              <path d="M32,5 V25" />
              <path d="M37,10 V20" strokeWidth={4} />
            </g>
          </g>
          <text x={4} y={88} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)">
            {mode === 'large' ? 'Vin' : 'vin'}
          </text>

          {/* Vin 正極 → R1 左端 */}
          <path d="M50,50 H100" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />

          {/* R1（水平電阻，品牌色強調） */}
          <g transform="translate(100 35)">
            <g stroke="var(--blue-500)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
            </g>
          </g>
          <text x={108} y={28} fontSize={13} fontFamily="var(--font-mono)" fill="var(--blue-500)">
            R1
          </text>

          {/* R1 右端 → 輸出節點 → Vout 分接腳 */}
          <path d="M160,50 H270" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
          <circle cx={230} cy={50} r={2.5} fill="var(--text-strong)" />
          <text x={274} y={54} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)">
            {mode === 'large' ? 'Vout' : 'vout'}
          </text>

          {/* 節點下拉到 D1 / rd1 */}
          <path d="M230,50 V90" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />

          {/* 大訊號層：D1（順偏二極體）+ D2（齊納二極體），常駐疊層只切 opacity */}
          <motion.g animate={{ opacity: mode === 'large' ? 1 : 0 }} transition={{ duration: symbolDuration }}>
            <g transform="translate(200 105) rotate(90 30 15)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,15 H20 M36,15 H60" />
                <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
                <path d="M36,7 V23" />
              </g>
            </g>
            <g transform="translate(200 185) rotate(-90 30 15)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,15 H20 M40,15 H60" />
                <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
                <path d="M40,7 L36,7 M36,7 V23 M36,23 L40,23" />
              </g>
            </g>
          </motion.g>

          {/* 小訊號層：rd1 + rd2（電阻符號），與上方大訊號層位置完全重疊 */}
          <motion.g animate={{ opacity: mode === 'small' ? 1 : 0 }} transition={{ duration: symbolDuration }}>
            <g transform="translate(200 105) rotate(90 30 15)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
              </g>
            </g>
            <g transform="translate(200 185) rotate(-90 30 15)">
              <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
              </g>
            </g>
          </motion.g>

          {/* D1/rd1 → D2/rd2 串接、標籤 */}
          <path d="M230,150 V170" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
          <text x={244} y={124} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)">
            {mode === 'large' ? 'D1' : 'rd1'}
          </text>
          <text x={244} y={204} fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-strong)">
            {mode === 'large' ? 'D2' : 'rd2'}
          </text>

          {/* D2/rd2 → 共同接地軌，Vin 負極也接到同一接地軌 */}
          <path d="M230,230 V270 M50,110 V270 H230" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />

          {/* 接地符號 */}
          <g transform="translate(215 270)">
            <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
              <path d="M15,0 V10" />
              <path d="M5,10 H25 M8,14 H22 M11,18 H19" />
            </g>
          </g>
        </svg>
      </div>

      {/* 常駐讀數：rd1／線調整率／負載調整率 */}
      <div className="grid grid-cols-3 gap-3">
        <ReadoutCard title="rd1（小訊號電阻）" value={`${rd1.toFixed(2)} Ω`} />
        <ReadoutCard title="線調整率 Δvout/Δvin" value={lineRatio.toFixed(4)} />
        <ReadoutCard title="負載調整率 Δvout/ΔIL" value={`${loadReg.toFixed(2)} Ω`} />
      </div>

      {/* 分頁列 */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 分頁內容：initial={false} 避免首次掛載卡在 opacity:0（見 motion-patterns.md） */}
      <AnimatePresence mode="wait" initial={false}>
        {tab === 'line' ? (
          <motion.div
            key="line"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: fadeDuration }}
            className="flex flex-col gap-3"
          >
            <SliderControl
              id="delta-vin"
              label="輸入變動 Δvin"
              value={deltaVin}
              min={0}
              max={1}
              step={0.01}
              displayValue={`${deltaVin.toFixed(2)} V`}
              onChange={setDeltaVin}
            />
            <div className="flex flex-col gap-2">
              <CompareBar
                label="Δvin"
                valuePct={(deltaVin / 1) * 100}
                valueLabel={`${deltaVin.toFixed(2)} V`}
                color="var(--blue-500)"
              />
              <CompareBar
                label="Δvout"
                valuePct={(deltaVoutLineV / 1) * 100}
                valueLabel={`${(deltaVoutLineV * 1000).toFixed(1)} mV`}
                color="var(--orange-500)"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="load"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: fadeDuration }}
            className="flex flex-col gap-3"
          >
            <SliderControl
              id="delta-il"
              label="負載電流變動 ΔIL"
              value={deltaIL}
              min={0}
              max={20}
              step={0.5}
              displayValue={`${deltaIL.toFixed(1)} mA`}
              onChange={setDeltaIL}
            />
            <CompareBar
              label="Δvout"
              valuePct={(deltaVoutLoadMv / 200) * 100}
              valueLabel={`${deltaVoutLoadMv.toFixed(2)} mV`}
              color="var(--orange-500)"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 三條共用滑桿：R1／rd2／ID1，state 放父層不隨分頁重置 */}
      <div className="grid grid-cols-3 gap-3">
        <SliderControl
          id="r1"
          label="R1"
          value={r1Pos}
          min={0}
          max={100}
          step={1}
          displayValue={`${Math.round(r1)} Ω`}
          onChange={setR1Pos}
        />
        <SliderControl
          id="rd2"
          label="rd2"
          value={rd2}
          min={1}
          max={50}
          step={1}
          displayValue={`${rd2} Ω`}
          onChange={setRd2}
        />
        <SliderControl
          id="id1"
          label="ID1"
          value={id1}
          min={1}
          max={50}
          step={1}
          displayValue={`${id1} mA`}
          onChange={setId1}
        />
      </div>
    </div>
  );
}
