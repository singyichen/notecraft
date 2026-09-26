import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, ZapOff } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

/**
 * 迴路 17 個頂點（idx 0-16），座標已通過交叉檢查，不可更動。
 * 另有一條不畫的隱式閉合邊 idx16 -> idx0，僅用於動畫弧長計算，不渲染成看得見的路徑。
 * 沒有電流表：從 j13(idx9) 先跳到安全區（idx10、idx11 的 x=630 刻意避開帶電的 −軌），
 * 再從軌線端點 idx12(610,100) 切入 −軌，不會讓引線穿過帶電軌。
 */
const LOOP_POINTS: Point[] = [
  { x: 120, y: 180 }, // 0 產生器 + 端子
  { x: 150, y: 180 }, // 1
  { x: 150, y: 130 }, // 2 +軌左端
  { x: 286, y: 130 }, // 3 +軌 col5
  { x: 286, y: 170 }, // 4 j5
  { x: 286, y: 194 }, // 5 i5 陽極
  { x: 422, y: 194 }, // 6 i9 陰極
  { x: 422, y: 218 }, // 7 h9 負載左腳
  { x: 558, y: 218 }, // 8 h13 負載右腳
  { x: 558, y: 170 }, // 9 j13
  { x: 630, y: 170 }, // 10 避開 −軌帶電區
  { x: 630, y: 100 }, // 11 在安全區爬升
  { x: 610, y: 100 }, // 12 從軌線端點切入 −軌
  { x: 140, y: 100 }, // 13 −軌左界
  { x: 135, y: 100 }, // 14
  { x: 135, y: 150 }, // 15
  { x: 120, y: 150 }, // 16 產生器 − 端子
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
const LOOP_SECONDS = 2.5;
/** 單一連續時鐘的完整週期：0-0.5 正半週、0.5-1 負半週，永不暫停。 */
const CYCLE_MS = 7000;

interface SegmentInfo {
  d: string;
  arrow: string;
  title: string;
  description: string;
  badge: Point;
}

const SEGMENTS: SegmentInfo[] = [
  {
    d: 'M120,180 L150,180 L150,130',
    arrow: 'M150,180 L150,130',
    title: '函數波產生器 + 端子出發',
    description: '正半週這一端電位高；負半週極性反過來，所以整圈改成細虛線。',
    badge: { x: 128, y: 163 },
  },
  {
    d: 'M150,130 L286,130',
    arrow: 'M150,130 L286,130',
    title: '下排 + 軌',
    description: '電源軌整條水平相通，把產生器的一端送到右邊任何一欄。',
    badge: { x: 210, y: 148 },
  },
  {
    d: 'M286,130 L286,170 L286,194',
    arrow: 'M286,170 L286,194',
    title: '跳線：+ 軌第 5 欄 → j5',
    description: '電源軌與中央五孔組不相通，要靠跳線把電位「搬」進第 5 欄。',
    badge: { x: 305, y: 150 },
  },
  {
    d: 'M286,194 L422,194',
    arrow: 'M286,194 L422,194',
    title: '二極體：陽極 i5 → 陰極 i9',
    description: '半波整流的關鍵全在這一格：正半週順偏導通，負半週逆偏被紅叉擋掉。',
    badge: { x: 354, y: 178 },
  },
  {
    d: 'M422,194 L422,218 L558,218',
    arrow: 'M422,218 L558,218',
    title: '10 kΩ 負載：h9 → h13',
    description: '電阻左腳與二極體陰極同在第 9 欄（同一個節點），Vout 就取在這裡。',
    badge: { x: 490, y: 236 },
  },
  {
    d: 'M558,218 L558,170 L630,170 L630,100 L610,100',
    arrow: 'M630,100 L610,100',
    title: '跳線：第 13 欄 → 上排 − 軌',
    description: '把負載另一端接回回程。',
    badge: { x: 604, y: 140 },
  },
  {
    d: 'M610,100 L140,100',
    arrow: 'M610,100 L140,100',
    title: '− 軌往左',
    description: '回程，整條相通。',
    badge: { x: 375, y: 116 },
  },
  {
    d: 'M140,100 L135,100 L135,150 L120,150',
    arrow: 'M135,150 L120,150',
    title: '回到產生器 − 端子',
    description: '迴路閉合；沒有這一段就沒有電流。',
    badge: { x: 128, y: 118 },
  },
];

const COLS = Array.from({ length: 16 }, (_, i) => 150 + i * 34);
const RAIL_COLS = COLS.filter((x) => x <= 610);
const UPPER_ROWS = [170, 194, 218, 242, 266];
const LABELED_COLS = [5, 9, 13];

type Phase = 'forward' | 'reverse';

/** 板體背景 / 孔位 / 溝槽 / 電源軌，兩相位共用，內容不隨狀態改變。 */
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

/** 10 kΩ 負載本體（暖米色本體 + 棕黑橙三環色碼，裝飾色例外），兩相位不變。 */
function ResistorBody() {
  return (
    <>
      <rect x={438} y={212} width={104} height={12} rx={6} fill="#e6d3a3" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={452} y={212} width={4} height={12} fill="#7b4b25" />
      <rect x={462} y={212} width={4} height={12} fill="#1a1a1a" />
      <rect x={472} y={212} width={4} height={12} fill="var(--orange-400)" />
      <text x={490} y={206} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-400)">
        10 k&#937;
      </text>
    </>
  );
}

/** 二極體本體：全程固定方向，陰極色環在 col9（右）端，永不旋轉。 */
function DiodeBody() {
  return (
    <>
      <rect x={300} y={186} width={108} height={16} rx={8} fill="var(--neutral-800)" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={396} y={186} width={6} height={16} fill="var(--neutral-50)" />
    </>
  );
}

/** 第 9 欄高亮框：只留虛線邊，兩相位都顯示，代表 i9 陰極與 h9 左腳同一個節點。 */
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

export default function EcWeek3Exp3CurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  // 單一連續時鐘：wavePhase 0->1 循環，代表輸入正弦一個完整週期，永不暫停。
  const [wavePhase, setWavePhase] = useState(0);
  const wavePhaseRef = useRef(0);
  const waveRafRef = useRef<number | null>(null);
  const waveLastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    function tick(ts: number) {
      if (waveLastTsRef.current === null) waveLastTsRef.current = ts;
      const dt = (ts - waveLastTsRef.current) / 1000;
      waveLastTsRef.current = ts;
      wavePhaseRef.current = (wavePhaseRef.current + dt / (CYCLE_MS / 1000)) % 1;
      setWavePhase(wavePhaseRef.current);
      waveRafRef.current = requestAnimationFrame(tick);
    }
    waveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current);
      waveLastTsRef.current = null;
    };
  }, [shouldReduceMotion]);

  const phase: Phase = wavePhase < 0.5 ? 'forward' : 'reverse';

  // 迴路光點的第二個 rAF：只在正半週啟動，負半週 cancelAnimationFrame；
  // progressRef 跨相位保留累積值，回到正半週接續原本進度，不從頭跳。
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

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
              aria-label="正半週靜態示意：二極體導通，電流路徑為實線並有一顆靜止光點"
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
              <DiodeBody />
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              <Zap size={14} />
              <span>正半週：Vin &gt; VD,on &#8594; 二極體導通，Vout &#8776; Vin &#8722; VD,on</span>
            </div>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-2">
            <svg
              viewBox="260 158 210 92"
              width="100%"
              role="img"
              aria-label="負半週靜態示意：電流路徑改為細虛線且完全沒有光點，二極體上有紅叉"
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
              <DiodeBody />
              <path d="M334,179 L374,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
              <path d="M374,179 L334,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--danger-500)' }}>
              <ZapOff size={14} />
              <span>負半週：Vin 反向 &#8594; 二極體截止，電流為零，Vout &#8776; 0</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
            綠色實線＋光點：正半週，電流暢通
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
            綠色細虛線：負半週，二極體截止
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
            第 9 欄：同一個節點
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
          一個週期裡只有一半的時間有電流，所以輸出平均值只有 Vp/&#960;。
        </p>
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

  // 輸入波形指示器：純函式近似正弦（在四分之一相位點與給定的貝茲控制點完全吻合），
  // 圓點由 wavePhase 這個永不暫停的時鐘驅動，即使負半週也持續往下半週移動。
  const waveDot = {
    x: 296 + wavePhase * 138,
    y: 61 - 15 * Math.sin(2 * Math.PI * wavePhase),
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
                ? 'Vin > VD,on → 二極體導通，Vout ≈ Vin − VD,on'
                : 'Vin 反向 → 二極體截止，電流為零，Vout ≈ 0'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <svg
        viewBox="0 0 720 320"
        width="100%"
        role="img"
        aria-label="麵包板電流路徑動畫：同一顆二極體不旋轉，輸入極性每秒交替 60 次；正半週整圈實線並有光點流動，負半週整圈改成細虛線且完全沒有光點，二極體上疊紅叉；上方波形指示器的圓點持續移動，標示目前是正半週還是負半週"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="flow-arrow-3" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
          </marker>
        </defs>

        {/* 1. 板體背景 / 孔位 / 溝槽 / 電源軌 */}
        <g>
          <BoardBackdrop />
        </g>

        {/* 2. 綠色電流路徑：正半週實線＋光點／負半週細虛線，opacity 交叉淡入淡出 */}
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

        {/* 3. 示波器探棒（sky 虛線，不分流）；三個落在帶電綠線上的端點各有一顆實心接點圓，
            右台 + 探棒插進 j9（不在任何綠線上，不畫接點圓——它是靠麵包板夾片和 i9/h9 同節點） */}
        <g fill="none" stroke="var(--sky-500)" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round">
          <path d="M160,88 L184,130" />
          <path d="M220,88 L218,100" />
          <path d="M482,88 L422,170" />
          <path d="M538,88 L524,100" />
        </g>
        <circle cx={184} cy={130} r={2.5} fill="var(--text-strong)" />
        <circle cx={218} cy={100} r={2.5} fill="var(--text-strong)" />
        <circle cx={524} cy={100} r={2.5} fill="var(--text-strong)" />
        <circle cx={160} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
        <circle cx={220} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
        <circle cx={482} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
        <circle cx={538} cy={88} r={2.5} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />

        {/* 4. 輸入波形指示器：唯一線索，圓點由永不暫停的 wavePhase 驅動 */}
        <g>
          <text x={296} y={30} fontSize={9} fill="var(--neutral-400)">
            Vin
          </text>
          <line x1={296} y1={61} x2={434} y2={61} stroke="var(--neutral-400)" strokeWidth={1} />
          <path
            d="M296,61 C313,61 313,46 330.5,46 C348,46 348,61 365,61"
            fill="none"
            strokeWidth={1.5}
            stroke={phase === 'forward' ? 'var(--success-500)' : 'var(--neutral-300)'}
          />
          <path
            d="M365,61 C382,61 382,76 399.5,76 C417,76 417,61 434,61"
            fill="none"
            strokeWidth={1.5}
            stroke="var(--neutral-300)"
          />
          <circle cx={waveDot.x} cy={waveDot.y} r={3} fill={phase === 'forward' ? 'var(--success-500)' : 'var(--neutral-400)'} />
        </g>

        {/* 5. 元件本體：畫在路徑之上，路徑才像插進元件 */}
        <g>
          {/* 函數波產生器 */}
          <rect x={20} y={133} width={100} height={62} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={33} y={140} width={64} height={14} rx={2} fill="var(--neutral-800)" />
          <text x={65} y={150} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            SINE
          </text>
          <rect x={33} y={157} width={64} height={14} rx={2} fill="var(--neutral-800)" />
          <text x={65} y={167} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            60Hz
          </text>
          <rect x={33} y={174} width={64} height={14} rx={2} fill="var(--neutral-800)" />
          <text x={65} y={184} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            10Vpp
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

          {/* 二極體：全程固定方向，不旋轉 */}
          <DiodeBody />
          <motion.g animate={{ opacity: phase === 'reverse' ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <path d="M334,179 L374,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M374,179 L334,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
          </motion.g>

          <ResistorBody />

          {/* 左台示波器：看 Vin，恆定顯示 SINE 60Hz / 10 Vpp，不隨相位變 */}
          <rect x={140} y={38} width={100} height={50} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={150} y={48} width={80} height={32} rx={2} fill="var(--neutral-800)" />
          <text x={190} y={62} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            SINE 60Hz
          </text>
          <text x={190} y={75} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
            10 Vpp
          </text>

          {/* 右台示波器：看 Vout，讀數隨相位 crossfade */}
          <rect x={460} y={38} width={100} height={50} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
          <rect x={470} y={48} width={80} height={32} rx={2} fill="var(--neutral-800)" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`vout-${phase}`}
              x={510}
              y={68}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fill="var(--neutral-50)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {phase === 'forward' ? '~4.3 V' : '0 V'}
            </motion.text>
          </AnimatePresence>
        </g>

        {/* 6. 段號徽章與方向箭頭：箭頭只在正半週出現；徽章顏色隨相位平滑轉場，第4段（二極體）負半週轉紅 */}
        <motion.g animate={{ opacity: phase === 'forward' ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {SEGMENTS.map((seg, i) => (
            <path key={`arrow-${i}`} d={seg.arrow} stroke="transparent" fill="none" markerEnd="url(#flow-arrow-3)" />
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

        {/* 7. 第 9 欄高亮框：兩相位都顯示 */}
        <Col9Highlight />

        {/* 命中路徑：放在最上層才能可靠接收 hover / focus，覆蓋底下所有元件本體 */}
        <g>
          {SEGMENTS.map((seg, i) => (
            <path
              key={`hit-${i}`}
              d={seg.d}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              tabIndex={0}
              role="img"
              aria-label={`${seg.title}：${seg.description}`}
            />
          ))}
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠色實線＋箭頭：正半週，電流沿方向流動
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
          綠色細虛線：負半週，二極體截止、沒有電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
          藍虛線：示波器探棒，量電位差不分流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
          第 9 欄：i9 與 h9 同一個節點
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
        一個週期裡只有一半的時間有電流，所以輸出平均值只有 Vp/&#960;。
      </p>
    </div>
  );
}
