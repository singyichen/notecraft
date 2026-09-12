import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Scale, Radio, Zap } from 'lucide-react';

// P 側 / 電洞語意的橘色刻意不用專案的 --orange-* token：該 token 字面色其實是 emerald
// 綠（見 tokens.css 的歷史命名說明），與 prompt 要求的橘色語意衝突，故改用 Tailwind
// 內建、未被本專案覆寫的 amber-500 / amber-600。

type BiasState = 'equilibrium' | 'reverse' | 'forward';

interface BiasInfo {
  label: string;
  /** 空乏區寬度佔長條總寬的百分比 */
  depletionPct: number;
  /** 左端（N 側）極性符號，平衡態不顯示 */
  leftPolarity: string | null;
  rightPolarity: string | null;
  depletionWidth: string;
  netCurrent: string;
  fieldStrength: string;
  application: string;
}

const TABS: { key: BiasState; label: string }[] = [
  { key: 'equilibrium', label: '平衡' },
  { key: 'reverse', label: '逆偏' },
  { key: 'forward', label: '順偏' },
];

const BIAS_INFO: Record<BiasState, BiasInfo> = {
  equilibrium: {
    label: '平衡（無外加電壓）',
    depletionPct: 30,
    leftPolarity: null,
    rightPolarity: null,
    depletionWidth: '中等',
    netCurrent: '零（漂移與擴散電流大小相等方向相反）',
    fieldStrength: '存在內建電場',
    application: '內建電位的由來',
  },
  reverse: {
    label: '逆偏（N 側接高電位）',
    depletionPct: 55,
    leftPolarity: '+',
    rightPolarity: '−',
    depletionWidth: '變寬',
    netCurrent: '幾乎為零',
    fieldStrength: '內建電場變強',
    application: '電壓控制電容，用於 VCO 調頻',
  },
  forward: {
    label: '順偏（P 側接高電位）',
    depletionPct: 12,
    leftPolarity: '−',
    rightPolarity: '+',
    depletionWidth: '變窄',
    netCurrent: '與電壓呈指數關係',
    fieldStrength: '位障降低',
    application: '二極體導通、少數載子大量注入',
  },
};

const APPLICATION_ICON: Record<BiasState, ReactNode> = {
  equilibrium: <Scale size={14} className="text-neutral-500" />,
  reverse: <Radio size={14} className="text-blue-600" />,
  forward: <Zap size={14} className="text-amber-600" />,
};

export default function EcWeek1PnJunction() {
  const [activeState, setActiveState] = useState<BiasState>('equilibrium');
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.3;
  const fadeDuration = shouldReduceMotion ? 0 : 0.2;

  const info = BIAS_INFO[activeState];
  const sidePct = (100 - info.depletionPct) / 2;
  const applicationIcon = APPLICATION_ICON[activeState];

  return (
    <div className="not-prose flex flex-col gap-5">
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

      {/* 中央長條：N 在左、P 在右 */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full h-16 rounded-xl overflow-hidden flex border border-neutral-200">
          <motion.div
            className="h-full bg-blue-500"
            animate={{ width: `${sidePct}%` }}
            transition={{ duration }}
          />
          <motion.div
            className="h-full bg-neutral-400"
            animate={{ width: `${info.depletionPct}%` }}
            transition={{ duration }}
          />
          <motion.div
            className="h-full bg-amber-500"
            animate={{ width: `${sidePct}%` }}
            transition={{ duration }}
          />

          {info.leftPolarity !== null && (
            <div className="absolute inset-y-0 left-0 flex items-center justify-center w-1/4 text-sm font-semibold text-white">
              {info.leftPolarity}
            </div>
          )}
          {info.rightPolarity !== null && (
            <div className="absolute inset-y-0 right-0 flex items-center justify-center w-1/4 text-sm font-semibold text-white">
              {info.rightPolarity}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-600">N 型（多數載子：電子）</span>
          <span className="text-amber-600">P 型（多數載子：電洞）</span>
        </div>
      </div>

      {/* 下方欄位區 */}
      {/* initial={false}：略過首次掛載的進場動畫，避免分頁未取得焦點時
          rAF 動畫卡在 opacity:0（切換分頁的動畫不受影響，仍會播放） */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="text-xs text-neutral-500 mb-1">空乏區寬度</div>
            <div className="text-sm font-medium text-neutral-800">
              {info.depletionWidth}
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="text-xs text-neutral-500 mb-1">淨電流</div>
            <div className="text-sm font-medium text-neutral-800">
              {info.netCurrent}
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="text-xs text-neutral-500 mb-1">電場強弱</div>
            <div className="text-sm font-medium text-neutral-800">
              {info.fieldStrength}
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
              {applicationIcon}
              典型應用
            </div>
            <div className="text-sm font-medium text-neutral-800">
              {info.application}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
