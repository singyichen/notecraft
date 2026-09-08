import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TriangleAlert, Cpu } from 'lucide-react';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** 每個請求會開幾條推論執行緒——同時也代表 CPU 核心數，固定值。 */
const THREADS_PER_REQUEST = 8;

/**
 * 單一請求延遲（ms），索引 0 對應並發數 1、索引 9 對應並發數 10。
 * 示意用查表值，非實測數字——用來讓「超額訂閱後變慢」的曲線可控、可教學，
 * 不代表任何一次真實 benchmark。
 */
const LATENCY_TABLE_MS = [120, 140, 210, 320, 460, 620, 800, 1000, 1230, 1480];

/**
 * 總吞吐量（相對值，非絕對單位），索引 0 對應並發數 1。
 * 同樣是示意用查表值：索引 1 刻意比索引 0 微升一點，之後單調下滑，
 * 用來呈現「多工一開始有點用、但很快就被超額訂閱吃掉」的教學曲線。
 */
const THROUGHPUT_TABLE = [8.0, 8.3, 7.6, 6.2, 5.2, 4.4, 3.8, 3.3, 2.9, 2.6];

/** 核心格內分層顏色循環（圖表 token 只有 4 色，10 層時靠色相＋透明度輪替區隔）。 */
// 核心分層的輪替色只用圖表色，刻意不含 --warning-500：警示色在本元件另有
// 明確語意（標示「超額訂閱」），若同時拿來當裝飾性輪替色會稀釋該語意。
const LAYER_COLORS = ['var(--blue-500)', 'var(--orange-500)', 'var(--blue-300)', 'var(--orange-400)'];

/** 每輪色相循環（每 4 層）遞減的不透明度，讓後面幾輪視覺上退到背景。 */
const OPACITY_CYCLE = [1, 0.8, 0.6, 0.45];

const CORE_COUNT = 8;

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function NerThreadOversubscription() {
  const [requestCount, setRequestCount] = useState(1);
  const shouldReduceMotion = useReducedMotion();

  const totalThreads = requestCount * THREADS_PER_REQUEST;
  const isOversubscribed = totalThreads > THREADS_PER_REQUEST;
  const latency = LATENCY_TABLE_MS[requestCount - 1];
  const throughput = THROUGHPUT_TABLE[requestCount - 1];

  const resultColor = isOversubscribed ? 'var(--warning-500)' : 'var(--text-strong)';

  return (
    <div className="flex flex-col gap-4">
      {/* 滑桿。accent-color 走 Tailwind 任意值 class 而非 inline style：
          React 伺服器端會序列化成 `accent-color: var(--blue-500);`，瀏覽器
          正規化後是 `accent-color:var(--blue-500)`，兩者字串不同會觸發
          hydration mismatch 警告。用真正的 CSS class 就沒有這個問題。 */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={10}
          value={requestCount}
          onChange={(e) => setRequestCount(Number(e.target.value))}
          className="flex-1 accent-[var(--blue-500)]"
          aria-label="並發請求數"
        />
        <span
          className="font-mono text-sm whitespace-nowrap"
          style={{ color: 'var(--text-strong)' }}
        >
          並發請求數：{requestCount}
        </span>
      </div>

      {/* 區塊 1：執行緒帳本 */}
      <div
        className="flex flex-col gap-2 p-4"
        style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="font-mono text-sm flex justify-between" style={{ color: 'var(--text-strong)' }}>
          <span>請求數</span>
          <span>{requestCount}</span>
        </div>

        <div className="font-mono text-sm flex justify-between items-start" style={{ color: 'var(--text-strong)' }}>
          <span>每請求推論執行緒數</span>
          <span className="flex flex-col items-end">
            <span>8</span>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>= CPU 核心數</span>
          </span>
        </div>

        <div
          className="font-mono text-sm flex items-center justify-between px-2 py-1 -mx-2"
          style={{
            borderRadius: 'var(--radius-sm)',
            color: isOversubscribed ? 'var(--warning-500)' : 'var(--text-strong)',
            background: isOversubscribed ? 'var(--warning-50)' : 'transparent',
          }}
        >
          <span>執行緒總數</span>
          <span className="flex items-center gap-1">
            {totalThreads}
            {isOversubscribed && (
              <span className="flex items-center gap-1">
                <TriangleAlert size={14} />
                超額訂閱
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 區塊 2：核心佔用視覺 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Cpu size={16} style={{ color: 'var(--text-brand)' }} />
          <span className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
            核心佔用視覺（{CORE_COUNT} 核）
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: CORE_COUNT }).map((_, coreIdx) => (
            <div
              key={coreIdx}
              className="aspect-square overflow-hidden flex flex-col"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {requestCount === 1 ? (
                <div className="flex-1" style={{ background: 'var(--success-500)' }} />
              ) : (
                Array.from({ length: requestCount }).map((_, i) => {
                  const color = LAYER_COLORS[i % LAYER_COLORS.length];
                  const cycle = Math.floor(i / LAYER_COLORS.length);
                  const targetOpacity = OPACITY_CYCLE[cycle % OPACITY_CYCLE.length];
                  return (
                    <motion.div
                      key={i}
                      className="flex-1"
                      style={{ background: color }}
                      initial={{ opacity: 0, scaleY: 0.6 }}
                      animate={{ opacity: targetOpacity, scaleY: 1 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.2,
                        ease: 'easeOut',
                        delay: shouldReduceMotion ? 0 : i * 0.015,
                      }}
                    />
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 區塊 3：結果讀數 */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <div
            className="flex-1 flex flex-col gap-1 p-3"
            style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)' }}
          >
            <span className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
              單一請求延遲
            </span>
            <span className="font-mono text-lg" style={{ color: resultColor }}>
              {latency} ms
            </span>
          </div>
          <div
            className="flex-1 flex flex-col gap-1 p-3"
            style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)' }}
          >
            <span className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
              總吞吐量（相對值）
            </span>
            <span className="font-mono text-lg" style={{ color: resultColor }}>
              {throughput}
            </span>
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-body)' }}>
          並發數超過核心數之後，延遲變差而吞吐量沒有變好
        </p>
        {requestCount === 1 && (
          <p className="text-sm" style={{ color: 'var(--success-500)' }}>
            目前是健康基準
          </p>
        )}
      </div>
    </div>
  );
}
