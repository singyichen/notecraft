import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Circle, TrendingUp, TrendingDown } from 'lucide-react';

type DopingState = 'intrinsic' | 'n' | 'p';

interface StateInfo {
  label: string;
  /** 電子色塊寬度百分比 */
  electronPct: number;
  /** 電洞色塊寬度百分比 */
  holePct: number;
  majority: string;
  minority: string;
  dopant: string;
  valenceElectrons: string;
}

// 電子＝藍色（--blue-500/600 token，字面色為 indigo，用於「藍色」語意）
// 電洞＝橘色：刻意不用專案的 --orange-* token，因其字面色實際是 emerald 綠，
// 與 prompt 要求的橘色語意衝突，改用 Tailwind 內建、未被本專案覆寫的 amber-500/600。
const STATE_INFO: Record<DopingState, StateInfo> = {
  intrinsic: {
    label: '本質矽',
    electronPct: 20,
    holePct: 20,
    majority: '無（電子與電洞數量相等）',
    minority: '無',
    dopant: '無（純矽）',
    valenceElectrons: '4（矽本身）',
  },
  n: {
    label: 'N 型（摻磷）',
    electronPct: 85,
    holePct: 15,
    majority: '電子',
    minority: '電洞',
    dopant: '磷（P，五價）',
    valenceElectrons: '5',
  },
  p: {
    label: 'P 型（摻硼）',
    electronPct: 15,
    holePct: 85,
    majority: '電洞',
    minority: '電子',
    dopant: '硼（B，三價）',
    valenceElectrons: '3',
  },
};

const TABS: { key: DopingState; label: string }[] = [
  { key: 'intrinsic', label: '本質矽' },
  { key: 'n', label: 'N 型（摻磷）' },
  { key: 'p', label: 'P 型（摻硼）' },
];

export default function EcWeek1Doping() {
  const [activeState, setActiveState] = useState<DopingState>('intrinsic');
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.25;
  const info = STATE_INFO[activeState];

  return (
    <div className="not-prose flex flex-col gap-5">
      {/* 守恆律提示列：三態切換時完全不動，不參與任何動畫 */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        <span className="text-blue-600 font-semibold">n</span>
        {' × '}
        <span className="text-amber-600 font-semibold">p</span>
        {' = n'}
        <sub>i</sub>
        <sup>2</sup>
        {'（守恆律，三態恆成立）'}
      </div>

      {/* 分頁列 */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveState(tab.key)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
              activeState === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* initial={false}：略過首次掛載的進場動畫，避免分頁未取得焦點時
          rAF 動畫卡在 opacity:0（切換分頁的動畫不受影響，仍會播放） */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeState}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration }}
          className="flex flex-col gap-4"
        >
          {/* 載子組成比例條 */}
          <div className="flex flex-col gap-2">
            <div className="h-3 rounded-full bg-neutral-100 overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${info.electronPct}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${info.holePct}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Circle size={8} fill="currentColor" className="text-blue-500" />
                電子
              </span>
              <span className="flex items-center gap-1.5">
                <Circle size={8} fill="currentColor" className="text-amber-500" />
                電洞
              </span>
            </div>
          </div>

          {/* 2x2 欄位卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                <TrendingUp size={14} />
                多數載子
              </div>
              <div className="text-sm font-medium text-neutral-800">
                {info.majority}
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1 opacity-70">
                <TrendingDown size={14} />
                少數載子
              </div>
              <div className="text-sm font-medium text-neutral-800">
                {info.minority}
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="text-xs text-neutral-500 mb-1">摻入的元素</div>
              <div className="text-sm font-medium text-neutral-800">
                {info.dopant}
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="text-xs text-neutral-500 mb-1">價電子數</div>
              <div className="text-sm font-medium text-neutral-800">
                {info.valenceElectrons}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
