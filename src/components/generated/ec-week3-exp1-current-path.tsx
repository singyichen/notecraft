import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface Point {
  x: number;
  y: number;
}

/**
 * 迴路 18 個頂點（idx 0-17），座標已通過交叉檢查，不可更動。
 * 另有一條不畫的隱式閉合邊 idx17 -> idx0（穿過電源機殼內部），
 * 僅用於動畫弧長計算，不渲染成看得見的路徑。
 */
const LOOP_POINTS: Point[] = [
  { x: 120, y: 180 }, // 0 電源 + 端子
  { x: 150, y: 180 }, // 1
  { x: 150, y: 130 }, // 2 +軌左端
  { x: 286, y: 130 }, // 3 +軌 col5
  { x: 286, y: 170 }, // 4 j5
  { x: 286, y: 194 }, // 5 i5 陽極
  { x: 422, y: 194 }, // 6 i9 陰極
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
const AUTOPLAY_INTERVAL_MS = 2200;
const TOUCH_CLEAR_MS = 3000;

interface SegmentInfo {
  /** 可見路徑（8 段之一）的折線座標 */
  d: string;
  /** 段末端方向箭頭的最後一小段（供 marker-end 定向） */
  arrow: string;
  title: string;
  description: string;
  badge: Point;
}

const SEGMENTS: SegmentInfo[] = [
  {
    d: 'M120,180 L150,180 L150,130',
    arrow: 'M150,180 L150,130',
    title: '電源供應器 +　端子出發',
    description: '習慣電流（conventional current）從電源正極出發，方向與電子實際移動方向相反。',
    badge: { x: 128, y: 163 },
  },
  {
    d: 'M150,130 L286,130',
    arrow: 'M150,130 L286,130',
    title: '下排 + 軌',
    description: '電源軌整條水平相通，所以正極電位一路送到右邊任何一欄。',
    badge: { x: 250, y: 148 },
  },
  {
    d: 'M286,130 L286,170 L286,194',
    arrow: 'M286,170 L286,194',
    title: '黃色跳線：+ 軌第 5 欄 → j5',
    description: '電源軌與中央五孔組不相通，要靠跳線把正極「搬」進第 5 欄。',
    badge: { x: 305, y: 150 },
  },
  {
    d: 'M286,194 L422,194',
    arrow: 'M286,194 L422,194',
    title: '二極體：陽極 i5 → 陰極 i9',
    description: '電位高的一端接陽極就是順偏（forward bias），二極體導通；反過來接就變成實驗二。',
    badge: { x: 354, y: 178 },
  },
  {
    d: 'M422,194 L422,218 L558,218',
    arrow: 'M422,218 L558,218',
    title: '1 kΩ 電阻：h9 → h13',
    description: '電阻左腳與二極體陰極同在第 9 欄（同一個節點），電流自然接著流進電阻。',
    badge: { x: 490, y: 236 },
  },
  {
    d: 'M558,218 L558,170 L655,170 L655,70 L610,70',
    arrow: 'M655,70 L610,70',
    title: '接電流表紅棒 → 表內 → 黑棒',
    description: '電流表串聯在迴路裡，全部電流都得穿過它，讀到的就是 I。',
    badge: { x: 525, y: 192 },
  },
  {
    d: 'M610,70 L610,100',
    arrow: 'M610,70 L610,100',
    title: '接回上排 − 軌',
    description: '電流表的另一端接回負軌，這是迴路唯一的回程。',
    badge: { x: 592, y: 66 },
  },
  {
    d: 'M610,100 L140,100 L135,100 L135,150 L120,150',
    arrow: 'M135,150 L120,150',
    title: '− 軌往左回到電源 −　端子',
    description: '回到電源負極，迴路閉合；沒有這一段就沒有電流。',
    badge: { x: 375, y: 84 },
  },
];

const COLS = Array.from({ length: 16 }, (_, i) => 150 + i * 34);
const RAIL_COLS = COLS.filter((x) => x <= 610);
const UPPER_ROWS = [170, 194, 218, 242, 266];
const LABELED_COLS = [5, 9, 13];

export default function EcWeek3Exp1CurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [autoplaySegment, setAutoplaySegment] = useState(0);
  const clickTimeoutRef = useRef<number | null>(null);

  const displayedSegment = hoveredSegment ?? autoplaySegment;

  // 光點沿迴路持續流動（尊重 prefers-reduced-motion：停在 progress=0 的靜止位置，不隱藏）
  useEffect(() => {
    if (shouldReduceMotion) return;
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
  }, [shouldReduceMotion]);

  // 高亮的獨立時鐘：每 2.2 秒掃到下一段，無限循環
  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = window.setInterval(() => {
      setAutoplaySegment((s) => (s + 1) % SEGMENTS.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [shouldReduceMotion]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) window.clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  function clearPendingTimeout() {
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
  }

  function handleSegmentEnter(i: number) {
    clearPendingTimeout();
    setHoveredSegment(i);
  }

  function handleSegmentLeave() {
    clearPendingTimeout();
    setHoveredSegment(null);
  }

  function handleSegmentClick(i: number) {
    clearPendingTimeout();
    setHoveredSegment(i);
    clickTimeoutRef.current = window.setTimeout(() => {
      setHoveredSegment(null);
      clickTimeoutRef.current = null;
    }, TOUCH_CLEAR_MS);
  }

  const baseProgress = shouldReduceMotion ? 0 : progress;
  const dots = DOT_PHASES.map((phase) => pointAtProgress(baseProgress + phase));
  const cardDuration = shouldReduceMotion ? 0 : 0.25;

  return (
    <div className="not-prose flex flex-col gap-4">
      <svg
        viewBox="0 0 720 320"
        width="100%"
        role="img"
        aria-label="麵包板電流路徑動畫：綠色迴路從電源正極經 + 軌、跳線、二極體、電阻、電流表回到負極，藍色虛線是並聯的電壓表"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="flow-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
          </marker>
        </defs>

        {/* 1. 板體背景 / 孔位 / 溝槽（溝槽以下不畫，溝槽本身即板子下邊界）/ 電源軌 */}
        <g>
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
        </g>

        {/* 2. 綠色電流路徑（8 段可見）＋ 光點 */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {SEGMENTS.map((seg, i) => (
            <path key={`path-${i}`} d={seg.d} stroke="var(--success-500)" strokeWidth={1.5} />
          ))}
        </g>
        <g fill="var(--success-500)">
          {dots.map((p, i) => (
            <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.2} />
          ))}
        </g>

        {/* 3. 電壓表兩條藍虛線（不參與 8 段 hover/autoplay） */}
        <g fill="none" stroke="var(--sky-500)" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round">
          <path d="M275,88 L218,130" />
          <path d="M330,88 L422,170" />
        </g>
        <circle cx={218} cy={130} r={2.5} fill="var(--text-strong)" />
        <text x={303} y={26} textAnchor="middle" fontSize={10} fill="var(--sky-500)">
          量電位差，不分走電流
        </text>

        {/* 4. 元件本體：畫在路徑之上，路徑才像插進元件 */}
        <g>
          {/* 電源供應器 */}
          <rect x={20} y={133} width={100} height={62} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={33} y={142} width={64} height={16} rx={2} fill="var(--neutral-800)" />
          <text x={65} y={154} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            700 mV
          </text>
          <rect x={33} y={162} width={64} height={16} rx={2} fill="var(--neutral-800)" />
          <text x={65} y={174} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            206 &#181;A
          </text>
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

          {/* 二極體：黑色圓柱 + 陰極色環（col9 端） */}
          <rect x={300} y={186} width={108} height={16} rx={8} fill="var(--neutral-800)" stroke="var(--text-strong)" strokeWidth={1} />
          <rect x={396} y={186} width={6} height={16} fill="var(--neutral-50)" />

          {/* 電阻：暖米色本體 + 棕黑紅金色碼環（裝飾色例外） */}
          <rect x={438} y={212} width={104} height={12} rx={6} fill="#e6d3a3" stroke="var(--text-strong)" strokeWidth={1} />
          <rect x={452} y={212} width={4} height={12} fill="#7b4b25" />
          <rect x={462} y={212} width={4} height={12} fill="#1a1a1a" />
          <rect x={472} y={212} width={4} height={12} fill="#c0392b" />
          <rect x={486} y={212} width={4} height={12} fill="#c9a227" />
          <text x={490} y={206} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-400)">
            1 k&#937;
          </text>

          {/* 電壓表（跨在 +軌與 j9 之間） */}
          <rect x={255} y={38} width={95} height={50} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={268} y={50} width={70} height={18} rx={2} fill="var(--neutral-800)" />
          <text x={303} y={63} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            494 mV
          </text>
          <circle cx={275} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
          <circle cx={330} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />

          {/* 電流表（串在 j13 與 −軌之間） */}
          <rect x={596} y={38} width={72} height={70} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={608} y={48} width={48} height={18} rx={2} fill="var(--neutral-800)" />
          <text x={632} y={61} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            206 &#181;A
          </text>
        </g>

        {/* 5. 段號徽章與方向箭頭（箭頭恆為 success-500——全段都是帶電的同一條迴路，不能因為非目前高亮段就變灰） */}
        <g>
          {SEGMENTS.map((seg, i) => (
            <path key={`arrow-${i}`} d={seg.arrow} stroke="transparent" fill="none" markerEnd="url(#flow-arrow)" />
          ))}
          {SEGMENTS.map((seg, i) => {
            const active = shouldReduceMotion || i === displayedSegment;
            return (
              <g key={`badge-${i}`}>
                <circle cx={seg.badge.x} cy={seg.badge.y} r={9} fill={active ? 'var(--success-500)' : 'var(--neutral-200)'} />
                <text
                  x={seg.badge.x}
                  y={seg.badge.y + 3.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill={active ? 'var(--neutral-0)' : 'var(--neutral-800)'}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </g>

        {/* 6. 第 9 欄高亮框：只留虛線邊，fill=none，框內的孔位與 i9→h9 綠線才不會被洗白 */}
        <g>
          <rect x={406} y={160} width={34} height={70} rx={6} fill="none" stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="4 3" />
          <text x={422} y={250} textAnchor="middle" fontSize={10} fill="var(--text-strong)">
            同一欄＝同一個節點
          </text>
        </g>

        {/* 命中路徑：放在最上層才能可靠接收 hover / click，覆蓋底下所有元件本體 */}
        <g>
          {SEGMENTS.map((seg, i) => (
            <path
              key={`hit-${i}`}
              d={seg.d}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={`${seg.title}：${seg.description}`}
              onMouseEnter={() => handleSegmentEnter(i)}
              onMouseLeave={handleSegmentLeave}
              onFocus={() => handleSegmentEnter(i)}
              onBlur={handleSegmentLeave}
              onClick={() => handleSegmentClick(i)}
            />
          ))}
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠線：同一條串聯迴路，電流處處相同
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
          藍虛線：電壓表量電位差，不分走電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
          第 9 欄：i9 陰極與 h9 左腳同一個節點
        </span>
      </div>

      {shouldReduceMotion ? (
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-body)]">
          {SEGMENTS.map((seg, i) => (
            <li key={i}>
              <span className="font-semibold text-[var(--text-strong)]">{seg.title}</span>
              <span className="block">{seg.description}</span>
            </li>
          ))}
        </ol>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={displayedSegment}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: cardDuration, ease: 'easeOut' }}
            style={{ minHeight: 92 }}
            className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] p-4"
          >
            <div className="text-sm font-semibold text-[var(--text-strong)]">
              {displayedSegment + 1}. {SEGMENTS[displayedSegment].title}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-body)]">{SEGMENTS[displayedSegment].description}</p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
