import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, RotateCcw } from 'lucide-react';

// 電洞語意刻意不用專案 --orange-* token（該 token 字面色其實是 emerald 綠，
// 見 ec-week1-pn-junction.tsx 的說明），改用 Tailwind 內建、未被本專案覆寫的 amber-500。

const ZENER_X_POSITIONS = [70, 150, 230] as const;
const ARROW_Y = 30;
const ELECTRON_Y = 100;

interface PlayButtonProps {
  played: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PlayButton({ played, disabled, onClick }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-pill border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
    >
      {played ? <RotateCcw size={14} /> : <Play size={14} />}
      {played ? '重播' : '播放'}
    </button>
  );
}

interface ZenerPanelProps {
  reduceMotion: boolean;
}

function ZenerPanel({ reduceMotion }: ZenerPanelProps) {
  const uid = useId();
  const [played, setPlayed] = useState(reduceMotion);
  const [playKey, setPlayKey] = useState(0);
  const showFinal = reduceMotion; // reduced motion：直接顯示終態，不提供互動播放

  const handlePlay = () => {
    setPlayed(true);
    setPlayKey((k) => k + 1);
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-700">齊納崩潰（Zener）</h3>
        <PlayButton played={played} disabled={showFinal} onClick={handlePlay} />
      </div>

      <svg
        viewBox="0 0 300 170"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="齊納崩潰示意圖：空乏區內共價鍵中的電子被強電場直接扯脫"
      >
        <defs>
          <marker
            id={`${uid}-arrow`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="fill-blue-600" />
          </marker>
        </defs>

        {/* 靜態背景：空乏區底與鍵結錨點，永遠完整可見、不隨播放改變 */}
        <g>
          <rect x={10} y={15} width={280} height={120} rx={10} className="fill-neutral-100" />
          {ZENER_X_POSITIONS.map((x) => (
            <circle
              key={`anchor-${x}`}
              cx={x - 15}
              cy={ELECTRON_Y + 15}
              r={3}
              className="fill-neutral-400"
            />
          ))}
        </g>

        {/* 播放前的基準畫面：細電場箭頭＋鍵結中的電子（未播放時就是這個樣子） */}
        {!played && (
          <g>
            {ZENER_X_POSITIONS.map((x) => (
              <line
                key={`arrow-rest-${x}`}
                x1={x - 9}
                y1={ARROW_Y}
                x2={x + 9}
                y2={ARROW_Y}
                strokeWidth={1.5}
                className="stroke-blue-600"
                markerEnd={`url(#${uid}-arrow)`}
              />
            ))}
            {ZENER_X_POSITIONS.map((x) => (
              <g key={`electron-rest-${x}`}>
                <line
                  x1={x - 15}
                  y1={ELECTRON_Y + 15}
                  x2={x}
                  y2={ELECTRON_Y}
                  className="stroke-neutral-400"
                />
                <circle cx={x} cy={ELECTRON_Y} r={6} className="fill-blue-600" />
              </g>
            ))}
          </g>
        )}

        {/* 播放後的動態疊加層：key 改變即重掛，從 initial 重新播放一次 */}
        {played && (
          <g key={playKey}>
            {ZENER_X_POSITIONS.map((x) => (
              <motion.line
                key={`arrow-play-${x}`}
                y1={ARROW_Y}
                y2={ARROW_Y}
                className="stroke-blue-600"
                markerEnd={`url(#${uid}-arrow)`}
                initial={{ x1: x - 9, x2: x + 9, strokeWidth: 1.5 }}
                animate={{
                  x1: showFinal ? x - 20 : [x - 9, x - 20],
                  x2: showFinal ? x + 20 : [x + 9, x + 20],
                  strokeWidth: showFinal ? 3 : [1.5, 3],
                }}
                transition={{ duration: showFinal ? 0 : 0.4, ease: 'easeOut' }}
              />
            ))}
            {ZENER_X_POSITIONS.map((x, i) => (
              <g key={`electron-play-${x}`}>
                <motion.line
                  x1={x - 15}
                  y1={ELECTRON_Y + 15}
                  y2={ELECTRON_Y}
                  className="stroke-neutral-400"
                  initial={{ x2: x, opacity: 1 }}
                  animate={{ x2: x, opacity: showFinal ? 0 : [1, 0] }}
                  transition={{
                    duration: showFinal ? 0 : 0.35,
                    delay: showFinal ? 0 : 0.4 + i * 0.05,
                    ease: 'easeOut',
                  }}
                />
                <motion.circle
                  cy={ELECTRON_Y}
                  r={6}
                  className="fill-blue-600"
                  initial={{ cx: x }}
                  animate={{ cx: showFinal ? x + 50 : [x, x + 50] }}
                  transition={{
                    duration: showFinal ? 0 : 0.35,
                    delay: showFinal ? 0 : 0.4 + i * 0.05,
                    ease: 'easeOut',
                  }}
                />
              </g>
            ))}
          </g>
        )}
      </svg>

      <ul className="space-y-1 text-xs text-neutral-600">
        <li>觸發條件：VR 遠低於 VBD，空乏區電場強度達到臨界值</li>
        <li>新載子從哪來：電場直接扯斷共價鍵中的電子（無碰撞）</li>
        <li>關鍵字：量子穿隧、強電場、無碰撞</li>
      </ul>
    </div>
  );
}

interface AvalanchePanelProps {
  reduceMotion: boolean;
}

// 三代粒子的關鍵影格時間點（毫秒）：0 起跳 -> 撞離子1 -> 碰撞1結束 -> 撞離子2 -> 碰撞2結束 -> 最終擴散
const AVALANCHE_MS = [0, 350, 450, 800, 900, 1300] as const;
const AVALANCHE_TOTAL = 1300;
const AVALANCHE_TIMES = AVALANCHE_MS.map((t) => t / AVALANCHE_TOTAL);

function AvalanchePanel({ reduceMotion }: AvalanchePanelProps) {
  const [played, setPlayed] = useState(reduceMotion);
  const [playKey, setPlayKey] = useState(0);
  const showFinal = reduceMotion;

  const handlePlay = () => {
    setPlayed(true);
    setPlayKey((k) => k + 1);
  };

  const duration = showFinal ? 0 : AVALANCHE_TOTAL / 1000;

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-700">突崩崩潰（Avalanche）</h3>
        <PlayButton played={played} disabled={showFinal} onClick={handlePlay} />
      </div>

      <svg
        viewBox="0 0 300 170"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="突崩崩潰示意圖：載子加速撞擊晶格離子，兩代倍增成四顆載子"
      >
        {/* 靜態背景：空乏區底與兩顆固定離子，永遠完整可見、不隨播放改變 */}
        <g>
          <rect x={10} y={15} width={280} height={120} rx={10} className="fill-neutral-100" />
          <circle cx={100} cy={85} r={5} className="fill-neutral-400" />
          <circle cx={190} cy={85} r={5} className="fill-neutral-400" />
        </g>

        {/* 播放前的基準畫面：只有一顆入射電子從左側等待加速 */}
        {!played && <circle cx={20} cy={85} r={5} className="fill-blue-600" />}

        {/* 播放後的動態疊加層：key 改變即重掛，從 initial 重新播放一次 */}
        {played && (
          <g key={playKey}>
            {/* 電子1：原始入射電子，撞離子1、撞離子2後成為最終 2 顆藍電子之一 */}
            <motion.circle
              r={5}
              cy={85}
              className="fill-blue-600"
              initial={{ cx: 20 }}
              animate={{
                cx: showFinal ? 250 : [20, 100, 100, 190, 190, 250],
                cy: showFinal ? 70 : [85, 85, 85, 85, 85, 70],
              }}
              transition={{
                duration,
                times: showFinal ? undefined : AVALANCHE_TIMES,
                ease: 'easeOut',
              }}
            />
            {/* 電洞1：碰撞1新生，與電子1一起衝向離子2 */}
            <motion.circle
              r={5}
              className="fill-amber-500"
              initial={{ cx: 100, cy: 85, scale: 0 }}
              animate={{
                cx: showFinal ? 260 : [100, 100, 100, 190, 190, 260],
                cy: showFinal ? 100 : [85, 85, 85, 85, 85, 100],
                scale: showFinal ? 1 : [0, 0, 1, 1, 1, 1],
              }}
              transition={{
                duration,
                times: showFinal ? undefined : AVALANCHE_TIMES,
                ease: 'easeOut',
              }}
            />
            {/* 電子2：碰撞2新生 */}
            <motion.circle
              r={5}
              className="fill-blue-600"
              initial={{ cx: 190, cy: 85, scale: 0 }}
              animate={{
                cx: showFinal ? 280 : [190, 190, 190, 190, 190, 280],
                cy: showFinal ? 100 : [85, 85, 85, 85, 85, 100],
                scale: showFinal ? 1 : [0, 0, 0, 0, 1, 1],
              }}
              transition={{
                duration,
                times: showFinal ? undefined : AVALANCHE_TIMES,
                ease: 'easeOut',
              }}
            />
            {/* 電洞2：碰撞2新生 */}
            <motion.circle
              r={5}
              className="fill-amber-500"
              initial={{ cx: 190, cy: 85, scale: 0 }}
              animate={{
                cx: showFinal ? 270 : [190, 190, 190, 190, 190, 270],
                cy: showFinal ? 70 : [85, 85, 85, 85, 85, 70],
                scale: showFinal ? 1 : [0, 0, 0, 0, 1, 1],
              }}
              transition={{
                duration,
                times: showFinal ? undefined : AVALANCHE_TIMES,
                ease: 'easeOut',
              }}
            />
          </g>
        )}
      </svg>

      <ul className="space-y-1 text-xs text-neutral-600">
        <li>觸發條件：載子被電場加速到足夠高的動能</li>
        <li>新載子從哪來：高速載子撞擊晶格離子，撞出新的電子電洞對</li>
        <li>關鍵字：碰撞游離、連鎖倍增、雪崩效應</li>
      </ul>
    </div>
  );
}

export default function EcWeek1BreakdownMechanisms() {
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = shouldReduceMotion ?? false;

  return (
    <div className="not-prose flex flex-col gap-4">
      <div className="flex flex-row gap-4">
        <ZenerPanel reduceMotion={reduceMotion} />
        <AvalanchePanel reduceMotion={reduceMotion} />
      </div>

      {reduceMotion && (
        <p className="text-xs text-neutral-500">
          已依系統設定停用動畫，兩格直接顯示崩潰後的終態結果。
        </p>
      )}

      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
        兩者都發生在 VR 超過 VBD 之後，且只要外部有限流電阻保護，崩潰區「電壓幾乎不隨電流變」的特性正是齊納二極體穩壓的原理。
      </div>
    </div>
  );
}
