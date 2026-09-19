import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronRight, RotateCcw } from 'lucide-react';

// 電洞語意的橘色刻意不用專案的 --orange-* token：該 token 字面色其實是 emerald
// 綠（見 tokens.css 的歷史命名說明），與「電洞＝橘色」的直覺衝突，故改用 Tailwind
// 內建、未被本專案覆寫的 amber-500 / amber-600（沿用 ec-week1-pn-junction.tsx 慣例）。

const SLOT_COUNT = 6;
const ELECTRON_IDS = [1, 2, 3, 4, 5];
const MAX_STEP = 5;

/** 第 slot 個格位（0-based）在 viewBox 中的 x 座標 */
function xForSlot(slot: number): number {
  return 50 + slot * 100;
}

/** 電子 id 在目前 holeIndex 下所在的格位：電洞經過的位置全部左移一格 */
function positionOf(id: number, holeIndex: number): number {
  return holeIndex >= id ? id - 1 : id;
}

export default function EcWeek1HoleMotion() {
  const [holeIndex, setHoleIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.3;
  const transition = { duration, ease: 'easeOut' as const };

  const holeLeftPct = ((holeIndex + 0.5) / SLOT_COUNT) * 100;

  return (
    <div className="not-prose flex flex-col gap-4">
      {/* 方向標示 */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-1.5 text-blue-600">
          <ArrowLeft size={16} />
          電子實際移動方向：往左
        </div>
        <div className="flex items-center gap-1.5 text-amber-600">
          <ArrowRight size={16} />
          電洞等效移動方向：往右
        </div>
      </div>

      {/* 晶格 + 浮動 hole 標籤 */}
      <div className="relative pt-7">
        <motion.div
          className="absolute top-0 -translate-x-1/2 rounded-pill bg-amber-500 px-2 py-0.5 text-xs font-medium text-white"
          animate={{ left: `${holeLeftPct}%` }}
          transition={transition}
        >
          hole
        </motion.div>

        <svg
          viewBox="0 0 600 160"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="矽原子鍵結格位動畫：電子逐一向左跳格，等效呈現電洞向右移動"
        >
          <line
            x1={50}
            y1={80}
            x2={550}
            y2={80}
            stroke="var(--neutral-200)"
            strokeWidth={2}
          />

          {Array.from({ length: SLOT_COUNT }, (_, slot) => slot).map((slot) => (
            <circle
              key={slot}
              cx={xForSlot(slot)}
              cy={80}
              r={34}
              fill="none"
              stroke="var(--neutral-300)"
              strokeWidth={2}
            />
          ))}

          <motion.circle
            cy={80}
            r={34}
            fill="none"
            className="stroke-amber-500"
            strokeWidth={2}
            strokeDasharray="5 4"
            animate={{ cx: xForSlot(holeIndex) }}
            transition={transition}
          />

          {ELECTRON_IDS.map((id) => (
            <motion.circle
              key={id}
              cy={80}
              r={16}
              fill="var(--blue-500)"
              stroke="var(--blue-600)"
              strokeWidth={2}
              animate={{ cx: xForSlot(positionOf(id, holeIndex)) }}
              transition={transition}
            />
          ))}
        </svg>
      </div>

      {/* 步數 */}
      <div className="text-center text-sm font-mono text-neutral-500">
        t = t<sub>{holeIndex}</sub>
      </div>

      {/* 結論 */}
      <p className="text-sm text-neutral-700">
        我們把這連鎖填補當成一顆帶正電的粒子在移動，所以電洞也是載子。
      </p>

      {/* 控制列 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setHoleIndex((step) => Math.min(step + 1, MAX_STEP))}
          disabled={holeIndex === MAX_STEP}
          className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity ${
            holeIndex === MAX_STEP ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          style={{ background: 'var(--action-primary)' }}
        >
          下一步
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setHoleIndex(0)}
          disabled={holeIndex === 0}
          className={`inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition-opacity ${
            holeIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <RotateCcw size={16} />
          重播
        </button>
      </div>
    </div>
  );
}
