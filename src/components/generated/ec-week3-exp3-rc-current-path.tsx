import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, ZapOff } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 把一組頂點視為封閉迴路，回傳「t(0-1，自動取模) -> 弧長對應座標」的純函式。僅供光點動畫使用。 */
function createLoop(points: Point[]) {
  const lens = points.map((p, i) => dist(p, points[(i + 1) % points.length]));
  const cum: number[] = lens.reduce<number[]>(
    (acc, len) => {
      acc.push(acc[acc.length - 1] + len);
      return acc;
    },
    [0],
  );
  const total = cum[cum.length - 1];
  return {
    pointAt(t: number): Point {
      const wrapped = ((t % 1) + 1) % 1;
      const target = wrapped * total;
      let i = 0;
      while (i < lens.length - 1 && cum[i + 1] <= target) i++;
      const segLen = lens[i] || 1;
      const frac = (target - cum[i]) / segLen;
      const a = points[i];
      const b = points[(i + 1) % points.length];
      return { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac) };
    },
  };
}

/**
 * 充電相位：負載支迴路。與實驗三（無電容版）完全相同的 17 個頂點——
 * 產生器 -> +軌 -> j5 跳線 -> 二極體 -> i9/h9 -> 負載 -> 安全區繞線 -> −軌 -> 產生器。
 * 分流頂點在 idx7（h9, 422,218），之後沿負載走到 idx12（610,100）再併入 −軌。
 */
const LOAD_LOOP_POINTS: Point[] = [
  { x: 120, y: 180 },
  { x: 150, y: 180 },
  { x: 150, y: 130 },
  { x: 286, y: 130 },
  { x: 286, y: 170 },
  { x: 286, y: 194 },
  { x: 422, y: 194 },
  { x: 422, y: 218 },
  { x: 558, y: 218 },
  { x: 558, y: 170 },
  { x: 630, y: 170 },
  { x: 630, y: 100 },
  { x: 610, y: 100 },
  { x: 140, y: 100 },
  { x: 135, y: 100 },
  { x: 135, y: 150 },
  { x: 120, y: 150 },
];

/**
 * 充電相位：電容支迴路。前 8 個頂點與負載支共用（產生器到 h9 分流點），
 * idx7（h9）之後改往下鑽進電容、經 g10、跳線 j10 併回 −軌，再走回產生器。
 */
const CAP_LOOP_POINTS: Point[] = [
  { x: 120, y: 180 },
  { x: 150, y: 180 },
  { x: 150, y: 130 },
  { x: 286, y: 130 },
  { x: 286, y: 170 },
  { x: 286, y: 194 },
  { x: 422, y: 194 },
  { x: 422, y: 218 },
  { x: 422, y: 242 },
  { x: 456, y: 242 },
  { x: 456, y: 170 },
  { x: 456, y: 100 },
  { x: 140, y: 100 },
  { x: 135, y: 100 },
  { x: 135, y: 150 },
  { x: 120, y: 150 },
];

/**
 * 放電相位：只剩電容與負載之間的區域迴路（產生器整圈斷開，不在此迴路內）。
 * 起點在電容 g9，流過負載的方向（idx1 -> idx2，422,218 -> 558,218）和充電時完全相同，
 * 迴路尾端 idx9（456,242 即 g10）隱式經電容本體閉合回 idx0，不畫成看得見的路徑。
 */
const DISCHARGE_LOOP_POINTS: Point[] = [
  { x: 422, y: 242 },
  { x: 422, y: 218 },
  { x: 558, y: 218 },
  { x: 558, y: 170 },
  { x: 630, y: 170 },
  { x: 630, y: 100 },
  { x: 610, y: 100 },
  { x: 456, y: 100 },
  { x: 456, y: 170 },
  { x: 456, y: 242 },
];

const loadLoop = createLoop(LOAD_LOOP_POINTS);
const capLoop = createLoop(CAP_LOOP_POINTS);
const dischargeLoop = createLoop(DISCHARGE_LOOP_POINTS);

/** 產生器 -> +軌 -> j5 跳線 -> 二極體 -> h9（含 i9<->h9 那截柱子）：充電實線、放電虛線斷路。 */
const PATH_GEN_TO_H9 = 'M120,180 L150,180 L150,130 L286,130 L286,170 L286,194 L422,194 L422,218';
/** h9 分流點 -> 10 kΩ 負載 -> 安全繞線 -> 併入 −軌（456,100）：兩相位皆導通，方向恆定不變。 */
const PATH_H9_TO_LOAD_MERGE = 'M422,218 L558,218 L558,170 L630,170 L630,100 L610,100 L456,100';
/** h9 -> 電容左腳 g9：兩相位皆導通，充電時往下（充電流入）、放電時往上（放電流出）。 */
const PATH_H9_TO_G9 = 'M422,218 L422,242';
/** 電容右腳 g10 -> 跳線 j10 -> 併入 −軌（456,100）：兩相位皆導通，方向與上面那截同步反轉。 */
const PATH_G10_TO_MERGE = 'M456,242 L456,170 L456,100';
/** −軌併點（456,100）-> 產生器 − 端子：充電實線（總電流回程）、放電虛線斷路。 */
const PATH_MERGE_TO_GEN = 'M456,100 L140,100 L135,100 L135,150 L120,150';

/** 負載支方向箭頭：兩相位都在同一段、同一方向，用來強調「負載電流方向不變」。 */
const ARROW_LOAD = 'M498,218 L522,218';
/** 電容支上下兩截的箭頭：充電往下（進電容）／放電往上（出電容），方向相反才是重點。 */
const ARROW_CAP_CHARGE = 'M422,228 L422,238';
const ARROW_CAP_DISCHARGE = 'M422,238 L422,228';
const ARROW_MERGE_CHARGE = 'M456,150 L456,124';
const ARROW_MERGE_DISCHARGE = 'M456,124 L456,150';
/** 產生器整圈：只在充電相位出現，示意總電流真的有流回產生器。 */
const ARROW_GEN_ENTRY = 'M340,194 L364,194';
const ARROW_GEN_RETURN = 'M300,100 L276,100';

const DOT_COUNT = 6;
/** 圓點永不暫停的弧長時鐘：不論相位為何都持續推進，只是切換要套用哪一組迴路幾何。 */
const LOOP_SECONDS = 2.5;
/** 單一連續時鐘的完整週期：0-0.25 充電、0.25-1 放電（充電快、放電慢，比例對應 RC 相對週期）。 */
const CYCLE_MS = 8000;
const CHARGE_FRACTION = 0.25;

type Phase = 'charge' | 'discharge';

const COLS = Array.from({ length: 16 }, (_, i) => 150 + i * 34);
const RAIL_COLS = COLS.filter((x) => x <= 610);
const UPPER_ROWS = [170, 194, 218, 242, 266];
const LABELED_COLS = [5, 9, 13];

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

/** 10 kΩ 負載本體：畫在電流路徑之上，覆寫 1 的關鍵——(456,218) 交點會被本體自然遮住。 */
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

/**
 * 1 µF 電容本體：g9(422,242)/g10(456,242) 兩腳插孔，本體置中約 (439,254)，
 * 上緣 y=244、下緣 y=264（高度 20），貼近溝槽（266）但不越過。
 * sky 系與板體、暖色負載區隔；右側（col10／j10 那一腳）邊緣加窄極性條。
 * 兩相位視覺不變，只有旁邊箭頭方向會變。
 */
function CapacitorBody() {
  return (
    <>
      <path d="M422,242 L427,244" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <path d="M456,242 L451,244" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <rect x={427} y={244} width={24} height={20} rx={3} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
      <rect x={447} y={246} width={3} height={16} fill="var(--sky-600)" />
      <text x={439} y={238} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--sky-600)">
        1&#181;F
      </text>
    </>
  );
}

/** 分流頂點（h9, 422,218）：實心接點圓 + 短標「R∥C」，代表負載與電容並聯的節點。
 *  標籤放在分流點右上方，避開二極體下方短標與電阻標籤的文字範圍。 */
function SplitMarker() {
  return (
    <>
      <circle cx={422} cy={218} r={3.5} fill="var(--success-500)" />
      <text x={430} y={206} textAnchor="start" fontSize={9} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        R&#8741;C
      </text>
    </>
  );
}

/** 跳線：+ 軌第 5 欄 → j5（沿用無電容版畫法，橘色粗描邊蓋在同位置綠線上）。 */
function JumperJ5() {
  return <line x1={286} y1={130} x2={286} y2={170} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />;
}

/** 跳線：j10 → −軌（456,170 -> 456,100），同樣蓋在電容支的綠線上。 */
function JumperJ10() {
  return <line x1={456} y1={170} x2={456} y2={100} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />;
}

/** 第 9 欄高亮框：延伸到含 g 列（電容 g9 腳也是同一節點），標籤挪到框頂端避免和電容打架。 */
function Col9Highlight() {
  return (
    <>
      <rect x={406} y={160} width={34} height={94} rx={6} fill="none" stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={422} y={172} textAnchor="middle" fontSize={9} fill="var(--text-strong)">
        同一欄＝同一個節點
      </text>
    </>
  );
}

export default function EcWeek3Exp3RcCurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  // 第一個 rAF：單一連續時鐘，wavePhase 0->1 循環代表一次「充電+放電」，永不暫停。
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

  const phase: Phase = wavePhase < CHARGE_FRACTION ? 'charge' : 'discharge';

  // 第二個 rAF：迴路光點的弧長進度，兩個相位都要繼續推進（不像無電容版只在導通相位跑），
  // 因為放電相位也有一圈在跑的電流（電容供電給負載）。
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

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

  if (shouldReduceMotion) {
    return (
      <div className="not-prose flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-2">
            <svg
              viewBox="410 150 260 130"
              width="100%"
              role="img"
              aria-label="充電靜態示意：二極體導通，電流在第 9 欄分流，一路餵負載、一路把電容充到接近峰值"
              preserveAspectRatio="xMidYMid meet"
            >
              <BoardBackdrop />
              <Col9Highlight />
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={PATH_H9_TO_LOAD_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
                <path d={PATH_H9_TO_G9} stroke="var(--success-500)" strokeWidth={1.5} />
                <path d={PATH_G10_TO_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
              </g>
              <g stroke="var(--success-500)" fill="none" strokeWidth={1.5} strokeLinecap="round" markerEnd="url(#rc-arrow-static)">
                <path d={ARROW_LOAD} />
                <path d={ARROW_CAP_CHARGE} />
                <path d={ARROW_MERGE_CHARGE} />
              </g>
              <circle cx={470} cy={218} r={3.2} fill="var(--success-500)" />
              <circle cx={456} cy={210} r={3.2} fill="var(--success-500)" />
              <JumperJ10 />
              <CapacitorBody />
              <SplitMarker />
              <ResistorBody />
              <defs>
                <marker id="rc-arrow-static" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
                </marker>
              </defs>
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              <Zap size={14} />
              <span>充電：Vout &#8776; 4.44 V，電流分兩路——一路餵負載、一路把電容充到接近峰值</span>
            </div>
          </div>

          <div className="flex min-w-[240px] flex-1 flex-col gap-2">
            <svg
              viewBox="410 150 260 130"
              width="100%"
              role="img"
              aria-label="放電靜態示意：二極體截止，負載完全由電容供應，電流方向和充電時相同"
              preserveAspectRatio="xMidYMid meet"
            >
              <BoardBackdrop />
              <Col9Highlight />
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={PATH_H9_TO_LOAD_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
                <path d={PATH_H9_TO_G9} stroke="var(--success-500)" strokeWidth={1.5} />
                <path d={PATH_G10_TO_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
              </g>
              <g stroke="var(--success-500)" fill="none" strokeWidth={1.5} strokeLinecap="round" markerEnd="url(#rc-arrow-static-2)">
                <path d={ARROW_LOAD} />
                <path d={ARROW_CAP_DISCHARGE} />
                <path d={ARROW_MERGE_DISCHARGE} />
              </g>
              <circle cx={470} cy={218} r={3.2} fill="var(--success-500)" />
              <circle cx={456} cy={130} r={3.2} fill="var(--success-500)" />
              <JumperJ10 />
              <CapacitorBody />
              <SplitMarker />
              <ResistorBody />
              <defs>
                <marker id="rc-arrow-static-2" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
                </marker>
              </defs>
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--orange-500)' }}>
              <ZapOff size={14} />
              <span>放電：Vout &#8776; 1.22 V，二極體截止、產生器整圈斷開，電流方向不變只是慢慢下降</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
            綠色實線＋箭頭：R∥C 區域迴路，兩相位都導通
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
            第 9、10 欄：負載與電容並聯的節點
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
          RC = 10 kΩ &#215; 1 &#181;F = 10 ms，和 60 Hz 的週期 16.7 ms 同量級，所以電容在下一個峰值來之前幾乎放光，看到的是深鋸齒而不是平穩直流。
        </p>
      </div>
    );
  }

  // 充電相位：6 顆光點按 k % 2 分流——偶數走負載支、奇數走電容支，各自在自己分支的弧長上跑；
  // 放電相位：6 顆光點全部走同一條區域迴路（沒有分流可言）。
  const dots =
    phase === 'charge'
      ? Array.from({ length: DOT_COUNT }, (_, k) => {
          const lane = Math.floor(k / 2) / 3;
          return k % 2 === 0 ? loadLoop.pointAt(progress + lane) : capLoop.pointAt(progress + lane);
        })
      : Array.from({ length: DOT_COUNT }, (_, k) => dischargeLoop.pointAt(progress + k / DOT_COUNT));

  // 波形指示器：輸出深鋸齒，充電段陡升（25% 寬度）、放電段緩降（75% 寬度），
  // 圓點依 wavePhase 在對應段內線性內插，兩個相位都持續推進、永不暫停。
  const waveDot: Point =
    phase === 'charge'
      ? { x: lerp(258, 304, wavePhase / CHARGE_FRACTION), y: lerp(76, 46, wavePhase / CHARGE_FRACTION) }
      : { x: lerp(304, 442, (wavePhase - CHARGE_FRACTION) / (1 - CHARGE_FRACTION)), y: lerp(46, 76, (wavePhase - CHARGE_FRACTION) / (1 - CHARGE_FRACTION)) };

  const diodeReason = phase === 'charge' ? 'Vin > Vc → 順偏導通' : 'Vin < Vc → 逆偏截止';
  const phaseColor = phase === 'charge' ? 'var(--success-500)' : 'var(--orange-500)';

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
            style={{ color: phaseColor }}
          >
            {phase === 'charge' ? <Zap size={16} /> : <ZapOff size={16} />}
            <span>
              {phase === 'charge'
                ? 'Vin 高於電容電壓 → 二極體導通，電流分兩路：一路餵負載，一路把電容充到接近峰值'
                : 'Vin 掉到比電容低 → 二極體截止，負載完全由電容供應，電流方向不變、輸出只會慢慢下降'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <svg
        viewBox="0 0 720 320"
        width="100%"
        role="img"
        aria-label="RC 充放電麵包板電流路徑動畫：充電時電流在第 9 欄分成兩路（負載與電容），放電時二極體截止、產生器整圈斷開，只剩電容與負載之間的區域迴路持續供電，流過負載的方向與充電時相同；上方波形指示器顯示輸出深鋸齒"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="rc-flow-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
          </marker>
        </defs>

        {/* 1. 板體背景 / 孔位 / 溝槽 / 電源軌 */}
        <g>
          <BoardBackdrop />
        </g>

        {/* 2. 電流路徑：產生器兩截依相位在實線/虛線間 crossfade；R∥C 區域三截兩相位都常駐實線 */}
        <motion.g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: phase === 'charge' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <path d={PATH_GEN_TO_H9} stroke="var(--success-500)" strokeWidth={1.5} />
          <path d={PATH_MERGE_TO_GEN} stroke="var(--success-500)" strokeWidth={1.5} />
        </motion.g>
        <motion.g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 3"
          animate={{ opacity: phase === 'discharge' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <path d={PATH_GEN_TO_H9} stroke="var(--success-500)" strokeWidth={1} />
          <path d={PATH_MERGE_TO_GEN} stroke="var(--success-500)" strokeWidth={1} />
        </motion.g>

        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={PATH_H9_TO_LOAD_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
          <path d={PATH_H9_TO_G9} stroke="var(--success-500)" strokeWidth={1.5} />
          <path d={PATH_G10_TO_MERGE} stroke="var(--success-500)" strokeWidth={1.5} />
        </g>

        {/* 方向箭頭：負載支兩相位同向常駐；電容支與跳線那截依相位反轉；產生器整圈只有充電才出現 */}
        <g stroke="var(--success-500)" fill="none" strokeWidth={1.5} strokeLinecap="round" markerEnd="url(#rc-flow-arrow)">
          <path d={ARROW_LOAD} />
          <path d={phase === 'charge' ? ARROW_CAP_CHARGE : ARROW_CAP_DISCHARGE} />
          <path d={phase === 'charge' ? ARROW_MERGE_CHARGE : ARROW_MERGE_DISCHARGE} />
        </g>
        <motion.g
          stroke="var(--success-500)"
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          markerEnd="url(#rc-flow-arrow)"
          animate={{ opacity: phase === 'charge' ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <path d={ARROW_GEN_ENTRY} />
          <path d={ARROW_GEN_RETURN} />
        </motion.g>

        <g fill="var(--success-500)">
          {dots.map((p, i) => (
            <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.2} />
          ))}
        </g>

        {/* 3. 示波器探棒（sky 虛線，不分流） */}
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

        {/* 4. 波形指示器：這次畫輸出深鋸齒（不是輸入正弦）。峰值線 y=46、谷值線 y=76，
            陡升段 x 258->304（充電）、緩降段 x 304->442（放電），圓點永不暫停 */}
        <g>
          <text x={258} y={30} fontSize={9} fill="var(--neutral-400)">
            Vout
          </text>
          <line x1={258} y1={46} x2={442} y2={46} stroke="var(--neutral-300)" strokeWidth={1} strokeDasharray="2 2" />
          <line x1={258} y1={76} x2={442} y2={76} stroke="var(--neutral-300)" strokeWidth={1} strokeDasharray="2 2" />
          <path d="M258,76 L304,46" fill="none" strokeWidth={1.5} stroke="var(--success-500)" />
          <path d="M304,46 C328,74 350,76 442,76" fill="none" strokeWidth={1.5} stroke="var(--orange-500)" />
          <text x={304} y={36} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--success-500)">
            4.44 V
          </text>
          <text x={442} y={90} textAnchor="end" fontSize={8} fontFamily="var(--font-mono)" fill="var(--orange-500)">
            1.22 V
          </text>
          <path d="M410,46 L410,76" stroke="var(--sky-500)" strokeWidth={1} markerEnd="url(#rc-flow-arrow)" markerStart="url(#rc-flow-arrow)" />
          <text x={415} y={64} fontSize={8} fontFamily="var(--font-mono)" fill="var(--sky-500)">
            3.22 V
          </text>
          <circle cx={waveDot.x} cy={waveDot.y} r={3.8} fill={phase === 'charge' ? 'var(--success-500)' : 'var(--orange-500)'} />
        </g>

        {/* 5. 元件本體：畫在路徑之上，覆寫 1 靠這一層的順序讓電阻本體自然遮住 (456,218) 交點 */}
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

          <JumperJ5 />
          <JumperJ10 />

          {/* 二極體：全程固定方向，不旋轉 */}
          <DiodeBody />
          <motion.g animate={{ opacity: phase === 'discharge' ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <path d="M334,179 L374,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M374,179 L334,209" stroke="var(--danger-500)" strokeWidth={2.5} strokeLinecap="round" />
          </motion.g>
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={`diode-reason-${phase}`}
              x={354}
              y={222}
              textAnchor="middle"
              fontSize={9}
              fill={phase === 'charge' ? 'var(--success-500)' : 'var(--danger-500)'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {diodeReason}
            </motion.text>
          </AnimatePresence>

          <ResistorBody />
          <CapacitorBody />
          <SplitMarker />

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
              {phase === 'charge' ? '4.44 V' : '1.22 V'}
            </motion.text>
          </AnimatePresence>
        </g>

        {/* 6. 第 9 欄高亮框：兩相位都顯示，延伸到含 g 列 */}
        <Col9Highlight />
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠色實線＋箭頭：電流暢通，箭頭指示方向
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
          綠色細虛線：放電時產生器整圈斷開，沒有電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
          藍虛線：示波器探棒，量電位差不分流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--sky-500)' }} />
          藍色小方塊：1 &#181;F 電容，和 10 k&#937; 負載並聯在第 9、10 欄
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--neutral-400)' }} />
          第 9、10 欄：負載與電容並聯的節點
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
        RC = 10 kΩ &#215; 1 &#181;F = 10 ms，和 60 Hz 的週期 16.7 ms 同量級，所以電容在下一個峰值來之前幾乎放光，看到的是深鋸齒而不是平穩直流。
      </p>
    </div>
  );
}
