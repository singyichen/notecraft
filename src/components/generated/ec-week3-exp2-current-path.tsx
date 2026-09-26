import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, ZapOff } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

/**
 * 迴路 18 個頂點（idx 0-17），與 ec-week3-exp1-current-path 完全相同的座標系，
 * 接線一根都沒動，只有二極體轉了 180 度。座標已通過交叉檢查，不可更動。
 */
const LOOP_POINTS: Point[] = [
  { x: 120, y: 180 }, // 0 電源 + 端子
  { x: 150, y: 180 }, // 1
  { x: 150, y: 130 }, // 2 +軌左端
  { x: 286, y: 130 }, // 3 +軌 col5
  { x: 286, y: 170 }, // 4 j5
  { x: 286, y: 194 }, // 5 i5
  { x: 422, y: 194 }, // 6 i9
  { x: 422, y: 218 }, // 7 h9 電阻左腳
  { x: 558, y: 218 }, // 8 h13 右腳
  { x: 558, y: 170 }, // 9 j13
  { x: 655, y: 170 }, // 10 避開 −軌帶電區
  { x: 655, y: 70 }, // 11 電流表紅棒
  { x: 610, y: 70 }, // 12 電流表黑棒（表內）
  { x: 610, y: 100 }, // 13 接入 −軌
  { x: 140, y: 100 }, // 14 −軌左界
  { x: 135, y: 100 }, // 15
  { x: 135, y: 150 }, // 16
  { x: 120, y: 150 }, // 17 電源 − 端子
];

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const EDGE_LENGTHS: number[] = LOOP_POINTS.map((p, i) => dist(p, LOOP_POINTS[(i + 1) % LOOP_POINTS.length]));
const CUM_LEN: number[] = EDGE_LENGTHS.reduce<number[]>(
  (acc, len) => {
    acc.push(acc[acc.length - 1] + len);
    return acc;
  },
  [0],
);
const TOTAL_LEN = CUM_LEN[CUM_LEN.length - 1];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 純函式：t（0-1，會自動取模）-> 迴路上對應的座標。純水平/垂直折線，弧長用線段長度線性內插即可。 */
function pointAtProgress(t: number): Point {
  const wrapped = ((t % 1) + 1) % 1;
  const target = wrapped * TOTAL_LEN;
  let i = 0;
  while (i < EDGE_LENGTHS.length - 1 && CUM_LEN[i + 1] <= target) i++;
  const segLen = EDGE_LENGTHS[i] || 1;
  const frac = (target - CUM_LEN[i]) / segLen;
  const a = LOOP_POINTS[i];
  const b = LOOP_POINTS[(i + 1) % LOOP_POINTS.length];
  return { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac) };
}

const DOT_COUNT = 6;
const DOT_PHASES = Array.from({ length: DOT_COUNT }, (_, k) => k / DOT_COUNT);
const LOOP_SECONDS = 5;
const PHASE_MS = 4000;

interface SegmentInfo {
  /** 可見路徑（8 段之一）的折線座標 */
  d: string;
  /** 段末端方向箭頭的最後一小段（供 marker-end 定向，僅順偏時使用） */
  arrow: string;
  badge: Point;
}

const SEGMENTS: SegmentInfo[] = [
  { d: 'M120,180 L150,180 L150,130', arrow: 'M150,180 L150,130', badge: { x: 128, y: 163 } },
  { d: 'M150,130 L286,130', arrow: 'M150,130 L286,130', badge: { x: 250, y: 148 } },
  { d: 'M286,130 L286,170 L286,194', arrow: 'M286,170 L286,194', badge: { x: 305, y: 150 } },
  { d: 'M286,194 L422,194', arrow: 'M286,194 L422,194', badge: { x: 354, y: 178 } },
  { d: 'M422,194 L422,218 L558,218', arrow: 'M422,218 L558,218', badge: { x: 490, y: 236 } },
  { d: 'M558,218 L558,170 L655,170 L655,70 L610,70', arrow: 'M655,70 L610,70', badge: { x: 525, y: 192 } },
  { d: 'M610,70 L610,100', arrow: 'M610,70 L610,100', badge: { x: 592, y: 66 } },
  { d: 'M610,100 L140,100 L135,100 L135,150 L120,150', arrow: 'M135,150 L120,150', badge: { x: 375, y: 84 } },
];

const COLS = Array.from({ length: 16 }, (_, i) => 150 + i * 34);
const RAIL_COLS = COLS.filter((x) => x <= 610);
const UPPER_ROWS = [170, 194, 218, 242, 266];
const LABELED_COLS = [5, 9, 13];

type Phase = 'forward' | 'reverse';

/** 板體背景 / 孔位 / 溝槽 / 電源軌，兩態與縮圖共用，內容完全不隨狀態改變。 */
function BoardBackdrop() {
  return (
    <>
      <rect x={105} y={58} width={600} height={242} rx={8} fill="var(--neutral-50)" stroke="var(--neutral-200)" strokeWidth={1.5} />
      <rect x={115} y={266} width={580} height={30} fill="var(--neutral-100)" stroke="var(--neutral-200)" strokeWidth={1} />
      <line x1={140} y1={100} x2={610} y2={100} stroke="var(--neutral-400)" strokeWidth={1.5} />
      <line x1={140} y1={130} x2={610} y2={130} stroke="var(--neutral-400)" strokeWidth={1.5} />
      <text x={118} y={104} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        &#8722;
      </text>
      <text x={118} y={134} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        +
      </text>
      <g fill="var(--neutral-400)">
        {RAIL_COLS.map((x) => (
          <circle key={`rail-n-${x}`} cx={x} cy={100} r={1.4} />
        ))}
        {RAIL_COLS.map((x) => (
          <circle key={`rail-p-${x}`} cx={x} cy={130} r={1.4} />
        ))}
        {COLS.flatMap((x) => UPPER_ROWS.map((y) => <circle key={`u-${x}-${y}`} cx={x} cy={y} r={1.4} />))}
      </g>
      {LABELED_COLS.map((n) => (
        <text
          key={n}
          x={150 + (n - 1) * 34}
          y={312}
          textAnchor="middle"
          fontSize={10}
          fontFamily="var(--font-mono)"
          fill="var(--neutral-400)"
        >
          {n}
        </text>
      ))}
    </>
  );
}

/** 1 kΩ 電阻本體（暖米色本體 + 棕黑紅金色碼環，裝飾色例外），兩態不變。 */
function ResistorBody() {
  return (
    <>
      <rect x={438} y={212} width={104} height={12} rx={6} fill="#e6d3a3" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={452} y={212} width={4} height={12} fill="#7b4b25" />
      <rect x={462} y={212} width={4} height={12} fill="#1a1a1a" />
      <rect x={472} y={212} width={4} height={12} fill="#c0392b" />
      <rect x={486} y={212} width={4} height={12} fill="#c9a227" />
      <text x={490} y={206} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-400)">
        1 k&#937;
      </text>
    </>
  );
}

/** 第 9 欄高亮框：只留虛線邊，兩態都顯示，代表 i9 陰極與 h9 左腳同一個節點。 */
function Col9Highlight() {
  return (
    <>
      <rect x={406} y={160} width={34} height={70} rx={6} fill="none" stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={422} y={250} textAnchor="middle" fontSize={10} fill="var(--text-strong)">
        同一欄＝同一個節點
      </text>
    </>
  );
}

/**
 * 二極體本體，局部座標以中心 (0,0) 為準（黑色圓柱 -54~54，色環固定在右側 42~48，
 * 也就是順偏時的 i9／陰極端）。要畫成逆偏（色環在 i5 端）一律靠外層旋轉 180 度達成，
 * 不要另外寫「逆偏時畫在另一個 x」的條件邏輯——旋轉已經自動把色環搬到左側。
 */
function DiodeBody() {
  return (
    <>
      <rect x={-54} y={-8} width={108} height={16} rx={8} fill="var(--neutral-800)" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={42} y={-8} width={6} height={16} fill="var(--neutral-50)" />
    </>
  );
}

export default function EcWeek3Exp2CurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('forward');
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // 兩態自動交替，每 4 秒切換一次。
  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = window.setInterval(() => {
      setPhase((p) => (p === 'forward' ? 'reverse' : 'forward'));
    }, PHASE_MS);
    return () => window.clearInterval(id);
  }, [shouldReduceMotion]);

  // 光點只在順偏時流動；逆偏時二極體截止、串聯迴路處處無電流，rAF 迴圈直接暫停，
  // 不是把光點畫成堆在二極體前面。progressRef 跨切換保留，回到順偏時接續原本進度。
  useEffect(() => {
    if (shouldReduceMotion) return;
    if (phase !== 'forward') return;
    function tick(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      progressRef.current = (progressRef.current + dt / LOOP_SECONDS) % 1;
      setProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [shouldReduceMotion, phase]);

  if (shouldReduceMotion) {
    return (
      <div className="not-prose flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[220px] flex-1 flex-col gap-2">
            <svg
              viewBox="260 158 210 92"
              width="100%"
              role="img"
              aria-label="順偏靜態示意：二極體導通，電流路徑為實線並有一顆靜止光點"
              preserveAspectRatio="xMidYMid meet"
            >
              <BoardBackdrop />
              <Col9Highlight />
              <ResistorBody />
              <line x1={286} y1={130} x2={286} y2={170} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M286,130 L286,170 L286,194" stroke="var(--success-500)" strokeWidth={1.5} />
                <path d="M286,194 L422,194" stroke="var(--success-500)" strokeWidth={1.5} />
                <path d="M422,194 L422,218 L558,218" stroke="var(--success-500)" strokeWidth={1.5} />
              </g>
              <circle cx={354} cy={194} r={3.2} fill="var(--success-500)" />
              <g transform="translate(354,194)">
                <DiodeBody />
              </g>
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              <Zap size={14} />
              <span>順偏：I = 206 &#181;A（電源 700 mV，電壓表 494 mV，電流表 206 &#181;A）</span>
            </div>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-2">
            <svg
              viewBox="260 158 210 92"
              width="100%"
              role="img"
              aria-label="逆偏靜態示意：二極體轉 180 度，電流路徑改為細虛線且完全沒有光點，二極體上有紅叉"
              preserveAspectRatio="xMidYMid meet"
            >
              <BoardBackdrop />
              <Col9Highlight />
              <ResistorBody />
              <line x1={286} y1={130} x2={286} y2={170} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />
              <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                <path d="M286,130 L286,170 L286,194" stroke="var(--success-500)" strokeWidth={1} />
                <path d="M286,194 L422,194" stroke="var(--success-500)" strokeWidth={1} />
                <path d="M422,194 L422,218 L558,218" stroke="var(--success-500)" strokeWidth={1} />
              </g>
              <g transform="translate(354,194) rotate(180)">
                <DiodeBody />
              </g>
              <path d="M334,179 L374,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
              <path d="M374,179 L334,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--danger-500)' }}>
              <ZapOff size={14} />
              <span>逆偏：I &#8776; 0（電源 20 V，電壓表 20.0 V，電流表 0.00 A）</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
            綠色實線＋光點：順偏，電流暢通
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
            綠色細虛線：逆偏，路徑還在、電流小到看不見
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
            藍虛線：電壓表量電位差，不分走電流
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
            第 9 欄：同一個節點
          </span>
        </div>
      </div>
    );
  }

  const dots = phase === 'forward' ? DOT_PHASES.map((phaseOffset) => pointAtProgress(progress + phaseOffset)) : [];

  const badgeFill = (i: number) => {
    if (phase === 'forward') return 'var(--success-500)';
    return i === 3 ? 'var(--danger-500)' : 'var(--neutral-200)';
  };
  const badgeTextFill = (i: number) => {
    if (phase === 'forward') return 'var(--neutral-0)';
    return i === 3 ? 'var(--neutral-0)' : 'var(--neutral-800)';
  };

  return (
    <div className="not-prose flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[13px] font-medium" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center gap-2"
            style={{ color: phase === 'forward' ? 'var(--success-500)' : 'var(--danger-500)' }}
          >
            {phase === 'forward' ? <Zap size={16} /> : <ZapOff size={16} />}
            <span>
              {phase === 'forward'
                ? '順偏：電位高的一端接陽極 → 導通，I = 206 µA'
                : '逆偏：正極送到陰極 → 空乏區被拉寬，載子越不過去，I ≈ 0'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <svg
        viewBox="0 0 720 320"
        width="100%"
        role="img"
        aria-label="麵包板電流路徑動畫：接線和實驗一完全相同，二極體每 4 秒在順偏與逆偏之間自動交替；順偏時整圈實線並有光點流動，逆偏時整圈改成細虛線且完全沒有光點，二極體上疊紅叉"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="flow-arrow-2" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
          </marker>
        </defs>

        {/* 1. 板體背景 / 孔位 / 溝槽 / 電源軌 */}
        <g>
          <BoardBackdrop />
        </g>

        {/* 2. 綠色電流路徑：順偏實線＋光點／逆偏細虛線，opacity 交叉淡入淡出 */}
        <motion.g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: phase === 'forward' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {SEGMENTS.map((seg, i) => (
            <path key={`solid-${i}`} d={seg.d} stroke="var(--success-500)" strokeWidth={1.5} />
          ))}
        </motion.g>
        <motion.g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 3"
          animate={{ opacity: phase === 'reverse' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {SEGMENTS.map((seg, i) => (
            <path key={`dash-${i}`} d={seg.d} stroke="var(--success-500)" strokeWidth={1} />
          ))}
        </motion.g>
        {phase === 'forward' && (
          <g fill="var(--success-500)">
            {dots.map((p, i) => (
              <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.2} />
            ))}
          </g>
        )}

        {/* 3. 電壓表兩條藍虛線（不參與電流路徑，兩態都顯示） */}
        <g fill="none" stroke="var(--sky-500)" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round">
          <path d="M275,88 L218,130" />
          <path d="M330,88 L422,170" />
        </g>
        <circle cx={218} cy={130} r={2.5} fill="var(--text-strong)" />
        <text x={303} y={18} textAnchor="middle" fontSize={10} fill="var(--sky-500)">
          量電位差，不分走電流
        </text>
        <motion.text
          x={303}
          y={30}
          textAnchor="middle"
          fontSize={9.5}
          fill="var(--sky-500)"
          animate={{ opacity: phase === 'reverse' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          幾乎整個 Vs 都落在二極體上
        </motion.text>

        {/* 4. 元件本體：畫在路徑之上，路徑才像插進元件 */}
        <g>
          {/* 電源供應器 */}
          <rect x={20} y={133} width={100} height={62} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={33} y={142} width={64} height={16} rx={2} fill="var(--neutral-800)" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`ps-v-${phase}`}
              x={65}
              y={154}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--neutral-50)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {phase === 'forward' ? '700 mV' : '20 V'}
            </motion.text>
          </AnimatePresence>
          <rect x={33} y={162} width={64} height={16} rx={2} fill="var(--neutral-800)" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`ps-i-${phase}`}
              x={65}
              y={174}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--neutral-50)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {phase === 'forward' ? '206 µA' : '0.00 A'}
            </motion.text>
          </AnimatePresence>
          <circle cx={120} cy={150} r={3} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <circle cx={120} cy={180} r={3} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <text x={126} y={153} fontSize={10} fill="var(--text-strong)">
            &#8722;
          </text>
          <text x={126} y={183} fontSize={10} fill="var(--text-strong)">
            +
          </text>

          {/* 跳線（橘色絕緣外皮，蓋住底下同一段綠線，兩端露出插入點） */}
          <line x1={286} y1={130} x2={286} y2={170} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />

          {/* 二極體：旋轉軸心搬到局部座標 (0,0)，動畫只繞這裡轉，不會位移跑掉 */}
          <g transform="translate(354,194)">
            <g
              style={{
                transform: `rotate(${phase === 'forward' ? 0 : 180}deg)`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'transform 0.4s ease-out',
              }}
            >
              <DiodeBody />
            </g>
          </g>
          {/* 紅叉放在旋轉群組外面，只做淡入淡出，不跟著轉 */}
          <motion.g
            animate={{ opacity: phase === 'reverse' ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <path d="M334,179 L374,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M374,179 L334,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
          </motion.g>

          <ResistorBody />

          {/* 電壓表（跨在 +軌與 j9 之間） */}
          <rect x={255} y={38} width={95} height={50} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={268} y={50} width={70} height={18} rx={2} fill="var(--neutral-800)" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`vm-${phase}`}
              x={303}
              y={63}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--neutral-50)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {phase === 'forward' ? '494 mV' : '20.0 V'}
            </motion.text>
          </AnimatePresence>
          <circle cx={275} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
          <circle cx={330} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />

          {/* 電流表（串在 j13 與 −軌之間） */}
          <rect x={596} y={38} width={72} height={70} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={608} y={48} width={48} height={18} rx={2} fill="var(--neutral-800)" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`am-${phase}`}
              x={632}
              y={61}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--neutral-50)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {phase === 'forward' ? '206 µA' : '0.00 A'}
            </motion.text>
          </AnimatePresence>
        </g>

        {/* 5. 段號徽章與方向箭頭：箭頭只在順偏時出現；徽章顏色隨狀態平滑轉場 */}
        <motion.g animate={{ opacity: phase === 'forward' ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {SEGMENTS.map((seg, i) => (
            <path key={`arrow-${i}`} d={seg.arrow} stroke="transparent" fill="none" markerEnd="url(#flow-arrow-2)" />
          ))}
        </motion.g>
        <g>
          {SEGMENTS.map((seg, i) => (
            <g key={`badge-${i}`}>
              <motion.circle
                cx={seg.badge.x}
                cy={seg.badge.y}
                r={9}
                animate={{ fill: badgeFill(i) }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              <motion.text
                x={seg.badge.x}
                y={seg.badge.y + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                animate={{ fill: badgeTextFill(i) }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {i + 1}
              </motion.text>
            </g>
          ))}
        </g>

        {/* 6. 第 9 欄高亮框：兩態都顯示 */}
        <Col9Highlight />
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠色實線＋光點：順偏（對照組），電流暢通
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
          綠色細虛線：逆偏，路徑還在、電流小到看不見
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
          藍虛線：電壓表量電位差，不分走電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
          第 9 欄：i9 與 h9 同一個節點
        </span>
      </div>
    </div>
  );
}
