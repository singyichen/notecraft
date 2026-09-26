import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, ZapOff } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

type Phase = 'charge' | 'discharge';

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface LoopMeta {
  edgeLengths: number[];
  cumLen: number[];
  totalLen: number;
}

function buildMeta(points: Point[]): LoopMeta {
  const edgeLengths = points.map((p, i) => dist(p, points[(i + 1) % points.length]));
  const cumLen = edgeLengths.reduce<number[]>(
    (acc, len) => {
      acc.push(acc[acc.length - 1] + len);
      return acc;
    },
    [0],
  );
  return { edgeLengths, cumLen, totalLen: cumLen[cumLen.length - 1] };
}

/** 純函式：t（0-1，自動取模）-> 迴路上對應座標。純水平/垂直折線，弧長線性內插即可。 */
function pointAtProgress(points: Point[], meta: LoopMeta, t: number): Point {
  const wrapped = ((t % 1) + 1) % 1;
  const target = wrapped * meta.totalLen;
  let i = 0;
  while (i < meta.edgeLengths.length - 1 && meta.cumLen[i + 1] <= target) i++;
  const segLen = meta.edgeLengths[i] || 1;
  const frac = (target - meta.cumLen[i]) / segLen;
  const a = points[i];
  const b = points[(i + 1) % points.length];
  return { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac) };
}

/**
 * 跳線跨越軌道處理：把水平的軌道／匯流線在交叉點左右各留 6px 空白，
 * 讓垂直的跳線畫在空白處時，底下那條線出現視覺斷口（不是改路徑座標，
 * 只是改「軌道這條線」本身的畫法：分段畫、跳過交叉點附近）。
 */
function gappedHorizontal(xStart: number, xEnd: number, y: number, gaps: number[], half = 6): string {
  const cuts = gaps.filter((g) => g > xStart && g < xEnd).sort((a, b) => a - b);
  const points: number[] = [xStart];
  cuts.forEach((g) => {
    points.push(g - half, g + half);
  });
  points.push(xEnd);
  const parts: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    parts.push(`M${points[i]},${y} L${points[i + 1]},${y}`);
  }
  return parts.join(' ');
}

/** 麵包板格線（三支實驗四元件共用，已算過，不可自行改動）。 */
const COL_X = (n: number) => 60 + (n - 1) * 22;
const ALL_COLS = Array.from({ length: 29 }, (_, idx) => COL_X(idx + 1));
const HOLE_ROWS = [170, 194, 218, 242, 266]; // j i h g f
const TICK_COLS = [1, 5, 9, 13, 17, 21, 25, 29];
/**
 * 四處跳線垂直段穿過 + 軌（col1、col21、col26、col29）：col1／col21／col29 是無電容版就有的三處，
 * col26 是這支新增的 g26→−軌跳線；四處都要在 + 軌的物理匯流排線留白，不論當下是否帶電。
 */
const RAIL_CASING_X = [60, 500, 610, 676];

const STATIC_P_RAIL_D = gappedHorizontal(48, 692, 130, RAIL_CASING_X);

/**
 * 充電：負載支完整迴路（供光點動畫用）。0-5 與電容支共用（產生器 -> D3 -> +軌 -> h25 分流點），
 * 6-11 走負載、上 −軌、沿 −軌到 col21、經 D1 回到 B，12-17 經產生器導線閉合回 A（隱式邊）。
 */
const LOAD_LOOP_POINTS: Point[] = [
  { x: 148, y: 242 }, // 0 A
  { x: 148, y: 170 }, // 1 j5
  { x: 236, y: 170 }, // 2 j9 D3 陰極
  { x: 236, y: 130 }, // 3 跳線上 + 軌
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25 分流點
  { x: 676, y: 218 }, // 6 h29 負載右腳
  { x: 676, y: 100 }, // 7 跳線上 − 軌
  { x: 500, y: 100 }, // 8 − 軌 col21
  { x: 500, y: 194 }, // 9 i21 D1 陽極
  { x: 412, y: 194 }, // 10 i17 D1 陰極 = B
  { x: 412, y: 242 }, // 11 B
  { x: 412, y: 330 }, // 12 產生器回程外接線
  { x: 66, y: 330 }, // 13
  { x: 70, y: 252 }, // 14 產生器 − 端子
  { x: 70, y: 222 }, // 15 產生器 + 端子
  { x: 130, y: 222 }, // 16
  { x: 130, y: 242 }, // 17 -> 閉合回 A（隱式邊，即產生器 + 導線最後一截）
];

/**
 * 充電：電容支完整迴路。0-5 與負載支共用，6-9 改往下鑽進電容、經 g26 回到 −軌 col26，
 * 10-13 併入負載支已經在走的回程（− 軌到 col21、經 D1 回 B），14-19 經產生器導線閉合回 A。
 */
const CAP_LOOP_POINTS: Point[] = [
  { x: 148, y: 242 }, // 0 A
  { x: 148, y: 170 }, // 1 j5
  { x: 236, y: 170 }, // 2 j9
  { x: 236, y: 130 }, // 3
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25 分流點
  { x: 588, y: 266 }, // 6 f25 電容左腳
  { x: 610, y: 266 }, // 7 f26 電容右腳
  { x: 610, y: 242 }, // 8 g26 跳線腳
  { x: 610, y: 100 }, // 9 跳線上 − 軌 col26
  { x: 500, y: 100 }, // 10 − 軌 col21
  { x: 500, y: 194 }, // 11 i21 D1 陽極
  { x: 412, y: 194 }, // 12 i17 D1 陰極 = B
  { x: 412, y: 242 }, // 13 B
  { x: 412, y: 330 }, // 14 產生器回程外接線
  { x: 66, y: 330 }, // 15
  { x: 70, y: 252 }, // 16 產生器 − 端子
  { x: 70, y: 222 }, // 17 產生器 + 端子
  { x: 130, y: 222 }, // 18
  { x: 130, y: 242 }, // 19 -> 閉合回 A（隱式邊）
];

/**
 * 放電：只剩電容與負載之間的區域迴路（產生器整圈斷開，不在此迴路內）。
 * 流過負載的方向（idx1 -> idx2，588,218 -> 676,218）和充電時完全相同；
 * 迴路尾端 idx6（610,266）隱式經電容本體閉合回 idx0（588,266），不畫成看得見的路徑。
 */
const DISCHARGE_LOOP_POINTS: Point[] = [
  { x: 588, y: 266 }, // 0 f25 電容左腳（放電時電流由此流出）
  { x: 588, y: 218 }, // 1 h25
  { x: 676, y: 218 }, // 2 h29
  { x: 676, y: 100 }, // 3 跳線上 − 軌
  { x: 610, y: 100 }, // 4 − 軌 col26
  { x: 610, y: 242 }, // 5 g26
  { x: 610, y: 266 }, // 6 f26 電容右腳 -> 隱式經電容閉合回 idx0
];

const LOAD_META = buildMeta(LOAD_LOOP_POINTS);
const CAP_META = buildMeta(CAP_LOOP_POINTS);
const DISCHARGE_META = buildMeta(DISCHARGE_LOOP_POINTS);

const DOT_COUNT = 8;
const DOT_LANES = Array.from({ length: DOT_COUNT }, (_, k) => Math.floor(k / 2) / (DOT_COUNT / 2));
const DISCHARGE_DOT_PHASES = Array.from({ length: DOT_COUNT }, (_, k) => k / DOT_COUNT);
const CHARGE_DOT_STATIC_T = [0.05, 0.3, 0.55, 0.8];
const DISCHARGE_DOT_STATIC_T = [0.08, 0.32, 0.56, 0.8];
const LOOP_SECONDS = 2.6;
/** 單一連續時鐘：0-0.25 充電（陡）、0.25-1 放電（緩），永不暫停，比例對應波形的陡升／緩降段。 */
const CYCLE_MS = 8000;
const CHARGE_FRACTION = 0.25;

/** 充電：產生器 -> D3 -> +軌 -> h25 分流點。 */
const G1_GEN_TO_SPLIT: string[] = [
  'M148,242 L148,170', // A 上 j5
  'M148,170 L236,170', // D3 本體 j5->j9
  'M236,170 L236,130', // 跳線上 + 軌
  gappedHorizontal(236, 588, 130, RAIL_CASING_X), // + 軌 col9->col25，col21 處留白
  'M588,130 L588,218', // 下到 h25
];
/** 充電：− 軌 col26->col21 -> D1 -> B -> 產生器導線，只在充電相位實線導通。 */
const G1_RETURN_TO_GEN: string[] = [
  'M610,100 L500,100', // − 軌 col26->col21
  'M500,100 L500,194', // 跳線下 i21（跨越 + 軌，col21 最嚴重）
  'M500,194 L412,194', // D1 本體 i21->i17=B
  'M412,194 L412,242', // 下到 B
  'M70,222 L130,222 L130,242 L148,242', // 產生器 + 端子 -> A
  'M70,252 L70,330 L412,330 L412,242', // 產生器 − 端子 -> B
];

/** D4、D2 那條對角線：本圖只示意「換半週會走這條」，永遠不參與動畫，恆為綠色細虛線。 */
const Q_SEGMENTS: string[] = [
  'M412,170 L324,170', // D4 本體 j17->j13
  'M324,170 L324,130', // 跳線上 + 軌
  gappedHorizontal(324, 588, 130, RAIL_CASING_X), // + 軌 col13->col25
  'M676,100 L60,100', // − 軌 col29->col1
  'M60,100 L60,194', // 跳線下 i1（跨越 + 軌）
  'M60,194 L148,194', // D2 本體 i1->i5=A
];

/** R∥C 區域：負載段落＋上到 −軌＋−軌 col29->col26，兩相位都常駐實線，方向恆定不變。 */
const REGION_SEGMENTS: string[] = [
  'M588,218 L676,218', // h25->h29 負載，固定方向
  'M676,218 L676,100', // 跳線上 − 軌（跨越 + 軌，col29）
  'M676,100 L610,100', // − 軌 col29->col26
];

/** 電容支：兩腳方向依相位相反。充電＝流進電容（h25->f25 向下、f26->−軌向上）。 */
const CAP_SEGMENTS_CHARGE: string[] = ['M588,218 L588,266', 'M610,266 L610,242 L610,100'];
/** 放電＝流出電容（f25->h25 向上、−軌->f26 向下）。 */
const CAP_SEGMENTS_DISCHARGE: string[] = ['M588,266 L588,218', 'M610,100 L610,242 L610,266'];

interface DiodeConfig {
  id: string;
  anodeX: number;
  cathodeX: number;
  y: number;
  labelPos: Point;
  alwaysOff: boolean;
}

/** 四顆二極體位置與三支實驗四元件共用；D3、D1 才是本圖動畫路徑，D2、D4 恆為示意用途不參與。 */
const DIODES: DiodeConfig[] = [
  { id: 'D1', anodeX: 500, cathodeX: 412, y: 194, labelPos: { x: 456, y: 213 }, alwaysOff: false },
  { id: 'D2', anodeX: 60, cathodeX: 148, y: 194, labelPos: { x: 104, y: 213 }, alwaysOff: true },
  { id: 'D3', anodeX: 148, cathodeX: 236, y: 170, labelPos: { x: 192, y: 154 }, alwaysOff: false },
  { id: 'D4', anodeX: 412, cathodeX: 324, y: 170, labelPos: { x: 368, y: 154 }, alwaysOff: true },
];

/** 落在帶電綠線上的實際接點（跳線／二極體腳落在軌道或列上），r=2.5 實心圓。 */
const RAIL_DOTS: Point[] = [
  { x: 236, y: 130 },
  { x: 324, y: 130 },
  { x: 500, y: 100 },
  { x: 610, y: 100 },
  { x: 60, y: 100 },
  { x: 588, y: 130 },
  { x: 676, y: 100 },
];
const NODE_DOTS: Point[] = [
  { x: 148, y: 194 },
  { x: 148, y: 170 },
  { x: 412, y: 194 },
  { x: 412, y: 170 },
];
const PROBE_DOTS: Point[] = [
  { x: 550, y: 130 },
  { x: 650, y: 100 },
];
const ALL_STATIC_DOTS = [...RAIL_DOTS, ...NODE_DOTS, ...PROBE_DOTS];

/** 波形指示器：輸出深鋸齒。陡升段（充電，25% 寬度）+ 緩降段（放電，75% 寬度）。 */
const WAVE_X0 = 270;
const WAVE_X_MID = 320;
const WAVE_X1 = 470;
const WAVE_PEAK_Y = 20;
const WAVE_VALLEY_Y = 54;
const WAVE_RISE_D = `M${WAVE_X0},${WAVE_VALLEY_Y} L${WAVE_X_MID},${WAVE_PEAK_Y}`;
const WAVE_FALL_D = `M${WAVE_X_MID},${WAVE_PEAK_Y} C${WAVE_X_MID + 36},${WAVE_PEAK_Y + 20} ${WAVE_X_MID + 52},${WAVE_VALLEY_Y} ${WAVE_X1},${WAVE_VALLEY_Y}`;

/** 板體背景／孔位／溝槽／電源軌，兩相位共用；+ 軌本身在四處跳線跨越點留白斷口。 */
function BoardBackdrop() {
  return (
    <>
      <rect x={40} y={58} width={660} height={262} rx={8} fill="var(--neutral-50)" stroke="var(--neutral-200)" strokeWidth={1.5} />
      <rect x={50} y={284} width={640} height={26} fill="var(--neutral-100)" stroke="var(--neutral-200)" strokeWidth={1} />
      <line x1={48} y1={100} x2={692} y2={100} stroke="var(--neutral-400)" strokeWidth={1.8} />
      <path d={STATIC_P_RAIL_D} stroke="var(--neutral-400)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <text x={20} y={104} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        &#8722;
      </text>
      <text x={20} y={134} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        +
      </text>
      <g fill="var(--neutral-300)">
        {ALL_COLS.flatMap((x) => HOLE_ROWS.map((y) => <circle key={`h-${x}-${y}`} cx={x} cy={y} r={1.2} />))}
      </g>
      {TICK_COLS.map((n) => (
        <text key={n} x={COL_X(n)} y={350} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-400)">
          {n}
        </text>
      ))}
    </>
  );
}

/**
 * 二極體本體：色環一律畫在陰極端，內縮 6px、末端留一截深色本體。
 * 色環齊邊會和板子背景同色被讀成「本體到此為止」，所以不可齊邊畫。
 */
function DiodeBody({ anodeX, cathodeX, y }: { anodeX: number; cathodeX: number; y: number }) {
  const left = Math.min(anodeX, cathodeX);
  const right = Math.max(anodeX, cathodeX);
  const bandX = cathodeX > anodeX ? right - 12 : left + 6;
  return (
    <>
      <rect x={left} y={y - 8} width={right - left} height={16} rx={8} fill="var(--neutral-800)" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={bandX} y={y - 8} width={6} height={16} fill="var(--neutral-50)" />
    </>
  );
}

function DiodeCross({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke="var(--danger-500)" strokeWidth={2.2} strokeLinecap="round">
      <path d={`M${cx - 15},${cy - 7} L${cx + 15},${cy + 7}`} />
      <path d={`M${cx - 15},${cy + 7} L${cx + 15},${cy - 7}`} />
    </g>
  );
}

function DiodeLabel({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g>
      <rect x={x - 12} y={y - 9} width={24} height={14} rx={3} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1} />
      <text x={x} y={y + 1.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-strong)">
        {id}
      </text>
    </g>
  );
}

/** 10 kΩ 負載本體：畫在路徑之上，順帶自然遮住 (610,218) 這個 g26 跳線跨越負載跨距的交點。 */
function ResistorBody() {
  return (
    <>
      <rect x={588} y={212} width={88} height={12} rx={6} fill="#e6d3a3" stroke="var(--text-strong)" strokeWidth={1} />
      <rect x={602} y={212} width={4} height={12} fill="#7b4b25" />
      <rect x={612} y={212} width={4} height={12} fill="#1a1a1a" />
      <rect x={622} y={212} width={4} height={12} fill="var(--orange-400)" />
      <text x={632} y={206} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--neutral-400)">
        10 k&#937;
      </text>
      <text x={632} y={234} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--success-500)">
        &#8594; 方向不變
      </text>
    </>
  );
}

/**
 * 1 µF 電容本體：f25(588,266)/f26(610,266) 兩腳插孔，本體 x=584,y=248,width=30,height=16。
 * 溝槽下移到 y=284，本體下緣 264 淨空充足。極性條在右腳（610，接 −軌）側。
 */
function CapacitorBody() {
  return (
    <>
      <path d="M588,266 L588,264" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <path d="M610,266 L610,264" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <rect x={584} y={248} width={30} height={16} rx={3} fill="var(--neutral-50)" stroke="var(--sky-500)" strokeWidth={1.5} />
      <rect x={604} y={250} width={3} height={12} fill="var(--sky-600)" />
      <text x={598} y={240} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--sky-600)">
        1&#181;F
      </text>
    </>
  );
}

/** 跳線 g26 → −軌：橘色粗描邊蓋在同座標綠線上，中段 212-224 會被電阻本體遮住。 */
function JumperG26() {
  return <line x1={610} y1={242} x2={610} y2={100} stroke="var(--orange-300)" strokeWidth={3} strokeLinecap="round" />;
}

/** 分流點（h25, 588,218）：實心接點圓 + 短標「R∥C」，代表負載與電容並聯的節點。 */
function SplitMarker() {
  return (
    <>
      <circle cx={588} cy={218} r={3.5} fill="var(--success-500)" />
      {/* 往左錨定：擺右側會和電阻的「10 kΩ」標籤（x=632, y=206）疊在同一行 */}
      <text x={578} y={214} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        R&#8741;C
      </text>
    </>
  );
}

/** col25/col26 高亮框：覆寫本體＋跳線讓兩欄實際上是同一個輸出節點。 */
function Col2526Highlight() {
  return (
    <>
      <rect x={578} y={204} width={42} height={66} rx={6} fill="none" stroke="var(--neutral-400)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={599} y={280} textAnchor="middle" fontSize={9} fill="var(--text-strong)">
        同一欄＝同一節點
      </text>
    </>
  );
}

/** 函數波產生器：+ / − 端子標籤固定不變，兩相位共用同一份導線。 */
function GeneratorBody() {
  return (
    <>
      <rect x={6} y={204} width={64} height={64} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <rect x={14} y={212} width={48} height={13} rx={2} fill="var(--neutral-800)" />
      <text x={38} y={221.5} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        SINE
      </text>
      <rect x={14} y={229} width={48} height={13} rx={2} fill="var(--neutral-800)" />
      <text x={38} y={238.5} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        60Hz
      </text>
      <rect x={14} y={246} width={48} height={13} rx={2} fill="var(--neutral-800)" />
      <text x={38} y={255.5} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        10Vpp
      </text>
      <circle cx={70} cy={222} r={3} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <circle cx={70} cy={252} r={3} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <text x={76} y={225} fontSize={9} fill="var(--text-strong)">
        +
      </text>
      <text x={76} y={255} fontSize={9} fill="var(--text-strong)">
        &#8722;
      </text>
    </>
  );
}

/** 兩台示波器：左台看 Vin，右台看濾波後 Vout，恆定不隨相位變。 */
function Scopes() {
  return (
    <>
      <rect x={130} y={8} width={100} height={48} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <rect x={138} y={16} width={84} height={32} rx={2} fill="var(--neutral-800)" />
      <text x={180} y={30} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        SINE 60Hz
      </text>
      <text x={180} y={43} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        Vin 10 Vpp
      </text>

      <rect x={520} y={8} width={100} height={48} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <rect x={528} y={16} width={84} height={32} rx={2} fill="var(--neutral-800)" />
      <text x={570} y={30} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        全波 + RC
      </text>
      <text x={570} y={43} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        見鋸齒
      </text>

      <g fill="none" stroke="var(--sky-500)" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round">
        <path d="M150,56 L148,218" />
        <path d="M210,56 L412,218" />
        <path d="M540,56 L550,130" />
        <path d="M600,56 L650,100" />
      </g>
    </>
  );
}

function StaticDots() {
  return (
    <g fill="var(--text-strong)">
      {ALL_STATIC_DOTS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} />
      ))}
    </g>
  );
}

/** Vout 波形指示器：陡升段＝充電、緩降段＝放電，圓點永不暫停；標出 LTspice 預報值。 */
function WaveformIndicator({ wavePhase }: { wavePhase: number }) {
  const inCharge = wavePhase < CHARGE_FRACTION;
  const dot: Point = inCharge
    ? { x: lerp(WAVE_X0, WAVE_X_MID, wavePhase / CHARGE_FRACTION), y: lerp(WAVE_VALLEY_Y, WAVE_PEAK_Y, wavePhase / CHARGE_FRACTION) }
    : {
        x: lerp(WAVE_X_MID, WAVE_X1, (wavePhase - CHARGE_FRACTION) / (1 - CHARGE_FRACTION)),
        y: lerp(WAVE_PEAK_Y, WAVE_VALLEY_Y, (wavePhase - CHARGE_FRACTION) / (1 - CHARGE_FRACTION)),
      };
  return (
    <g>
      <text x={WAVE_X0} y={12} fontSize={9} fill="var(--neutral-400)">
        Vout
      </text>
      <line x1={WAVE_X0} y1={WAVE_PEAK_Y} x2={WAVE_X1} y2={WAVE_PEAK_Y} stroke="var(--neutral-300)" strokeWidth={1} strokeDasharray="2 2" />
      <line x1={WAVE_X0} y1={WAVE_VALLEY_Y} x2={WAVE_X1} y2={WAVE_VALLEY_Y} stroke="var(--neutral-300)" strokeWidth={1} strokeDasharray="2 2" />
      <path d={WAVE_RISE_D} fill="none" strokeWidth={1.6} stroke="var(--success-500)" />
      <path d={WAVE_FALL_D} fill="none" strokeWidth={1.6} stroke="var(--orange-500)" />
      <text x={WAVE_X_MID} y={14} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--success-500)">
        1.45 V
      </text>
      <text x={WAVE_X1} y={68} textAnchor="end" fontSize={8} fontFamily="var(--font-mono)" fill="var(--orange-500)">
        0.84 V
      </text>
      <path
        d={`M${WAVE_X_MID + 74},${WAVE_PEAK_Y} L${WAVE_X_MID + 74},${WAVE_VALLEY_Y}`}
        stroke="var(--sky-500)"
        strokeWidth={1}
        markerEnd="url(#rc-wave-arrow)"
        markerStart="url(#rc-wave-arrow)"
      />
      <text x={WAVE_X_MID + 79} y={40} fontSize={8} fontFamily="var(--font-mono)" fill="var(--sky-500)">
        0.61 V
      </text>
      <circle cx={dot.x} cy={dot.y} r={3.6} fill={inCharge ? 'var(--success-500)' : 'var(--orange-500)'} />
    </g>
  );
}

/** 某一組電流路徑：導通時綠色實線＋箭頭，逆偏（或恆為示意）時綠色細虛線、無箭頭、無光點。 */
function PathGroup({ segments, active, suffix }: { segments: string[]; active: boolean; suffix: string }) {
  if (active) {
    return (
      <g fill="none" stroke="var(--success-500)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {segments.map((d, i) => (
          <path key={i} d={d} markerEnd={`url(#flow-arrow-${suffix})`} />
        ))}
      </g>
    );
  }
  return (
    <g fill="none" stroke="var(--success-500)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" opacity={0.55}>
      {segments.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

function ArrowDefs({ suffix }: { suffix: string }) {
  return (
    <defs>
      <marker id={`flow-arrow-${suffix}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
      </marker>
      <marker id="rc-wave-arrow" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--sky-500)" />
      </marker>
    </defs>
  );
}

/** 整張板子的完整內容（不含 <svg> 外框），兩個相位、動畫／靜態版共用。 */
function Scene({ phase, dots, suffix }: { phase: Phase; dots: Point[]; suffix: string }) {
  const charging = phase === 'charge';
  return (
    <>
      <BoardBackdrop />

      {/* D4、D2 那條對角線：恆為示意，永遠是綠色細虛線，畫在最底層讓上方實線路徑蓋過重疊處 */}
      <PathGroup segments={Q_SEGMENTS} active={false} suffix={suffix} />

      {/* 產生器 -> D3 -> +軌 -> h25，以及 −軌回程 -> D1 -> B -> 產生器：只在充電相位實線導通 */}
      <PathGroup segments={G1_GEN_TO_SPLIT} active={charging} suffix={suffix} />
      <PathGroup segments={G1_RETURN_TO_GEN} active={charging} suffix={suffix} />

      {/* R∥C 區域：負載固定方向，兩相位都常駐實線 */}
      <PathGroup segments={REGION_SEGMENTS} active suffix={suffix} />

      {/* 電容支：方向依相位反轉，兩相位都常駐實線 */}
      <PathGroup segments={charging ? CAP_SEGMENTS_CHARGE : CAP_SEGMENTS_DISCHARGE} active suffix={suffix} />

      <g fill="var(--success-500)">
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} />
        ))}
      </g>

      <Col2526Highlight />
      <JumperG26 />

      <GeneratorBody />
      {DIODES.map((d) => {
        const crossed = d.alwaysOff || phase === 'discharge';
        return (
          <g key={d.id}>
            <DiodeBody anodeX={d.anodeX} cathodeX={d.cathodeX} y={d.y} />
            {crossed && <DiodeCross cx={(d.anodeX + d.cathodeX) / 2} cy={d.y} />}
            <DiodeLabel x={d.labelPos.x} y={d.labelPos.y} id={d.id} />
          </g>
        );
      })}
      <ResistorBody />
      <CapacitorBody />
      <SplitMarker />
      <StaticDots />
    </>
  );
}

function LegendAndConclusion() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠色實線＋箭頭：這段路徑正在導通
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
          綠色細虛線：逆偏或恆為示意，沒有電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger-500)' }} />
          紅叉：截止的二極體
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--sky-500)' }} />
          藍虛線：示波器探棒
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--neutral-50)', border: '1px solid var(--neutral-400)' }} />
          軌道斷口：跳線只是跨過，沒有相接
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
        同樣的 RC = 10 ms，橋式每半週就充一次電、空檔只有半個週期，所以漣波比 0.61 V／1.45 V ≈ 42%，大約是半波（72.6%）的六成。
      </p>
    </>
  );
}

export default function EcWeek3Exp4RcCurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  // 第一個 rAF：單一連續時鐘，wavePhase 0-0.25 充電（陡）、0.25-1 放電（緩），永不暫停。
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

  // 第二個 rAF：迴路光點的弧長進度，兩相位都持續推進（放電時區域迴路也有電流）。
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
    const chargeDots = [
      ...CHARGE_DOT_STATIC_T.map((t) => pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, t)),
      ...CHARGE_DOT_STATIC_T.map((t) => pointAtProgress(CAP_LOOP_POINTS, CAP_META, t + 0.5)),
    ];
    const dischargeDots = DISCHARGE_DOT_STATIC_T.map((t) => pointAtProgress(DISCHARGE_LOOP_POINTS, DISCHARGE_META, t));
    return (
      <div className="not-prose flex flex-col gap-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <svg
              viewBox="0 0 720 362"
              width="100%"
              role="img"
              aria-label="充電靜態示意：橋式導通（以正半週為例），電流在輸出節點 h25 分成兩路，一路餵負載、一路把電容充到接近峰值"
              preserveAspectRatio="xMidYMid meet"
            >
              <ArrowDefs suffix="rc-charge" />
              <Scene phase="charge" dots={chargeDots} suffix="rc-charge" />
              <Scopes />
              <WaveformIndicator wavePhase={0.1} />
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              <Zap size={14} />
              <span>充電：橋式導通 &#8594; 電流在輸出節點分兩路：一路餵負載，一路把電容充到接近峰值</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <svg
              viewBox="0 0 720 362"
              width="100%"
              role="img"
              aria-label="放電靜態示意：四顆二極體全部截止，訊號產生器整圈斷開，只剩電容與負載之間的區域迴路持續供電，方向與充電時相同"
              preserveAspectRatio="xMidYMid meet"
            >
              <ArrowDefs suffix="rc-discharge" />
              <Scene phase="discharge" dots={dischargeDots} suffix="rc-discharge" />
              <Scopes />
              <WaveformIndicator wavePhase={0.6} />
            </svg>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--orange-500)' }}>
              <ZapOff size={14} />
              <span>放電：四顆二極體全部截止 &#8594; 負載完全由電容供應，電流方向不變、輸出只會慢慢下降</span>
            </div>
          </div>
        </div>

        <LegendAndConclusion />
      </div>
    );
  }

  const dots =
    phase === 'charge'
      ? DOT_LANES.map((lane, k) =>
          k % 2 === 0 ? pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, progress + lane) : pointAtProgress(CAP_LOOP_POINTS, CAP_META, progress + lane),
        )
      : DISCHARGE_DOT_PHASES.map((offset) => pointAtProgress(DISCHARGE_LOOP_POINTS, DISCHARGE_META, progress + offset));

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
                ? '橋式導通 → 電流在輸出節點分兩路：一路餵負載，一路把電容充到接近峰值'
                : '四顆二極體全部截止 → 負載完全由電容供應，電流方向不變、輸出只會慢慢下降'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <svg
        viewBox="0 0 720 362"
        width="100%"
        role="img"
        aria-label="橋式整流加濾波電容電流路徑動畫：充電時橋式導通、電流在輸出節點分兩路餵負載與電容，放電時四顆二極體全部截止、只剩電容與負載之間的區域迴路持續供電，流過負載的方向兩相位相同；上方波形指示器顯示輸出鋸齒"
        preserveAspectRatio="xMidYMid meet"
      >
        <ArrowDefs suffix="rc-main" />
        <Scene phase={phase} dots={dots} suffix="rc-main" />
        <Scopes />
        <WaveformIndicator wavePhase={wavePhase} />
      </svg>

      <LegendAndConclusion />
    </div>
  );
}
