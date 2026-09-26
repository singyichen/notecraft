import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { TriangleAlert, Info } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

type Stage = 'actual' | 'hypothetical';

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
/** 齊納直接跨在 col25/col29 之間、不需額外跳線，所以跨越 + 軌的斷口沿用橋式版三處，不新增。 */
const RAIL_CASING_X = [60, 500, 676];

const STATIC_P_RAIL_D = gappedHorizontal(48, 692, 130, RAIL_CASING_X);

/**
 * 這支凍結在正半週：A -> D3 -> +軌 -> 負載 -> -軌 -> D1 -> B，再經產生器接回 A。
 * 與橋式版的 POS_LOOP_POINTS 完全相同座標（複製，不 import）。
 */
const LOAD_LOOP_POINTS: Point[] = [
  { x: 148, y: 242 }, // 0 A（g5/i5/j5 merged）
  { x: 148, y: 170 }, // 1 j5
  { x: 236, y: 170 }, // 2 j9 D3 陰極
  { x: 236, y: 130 }, // 3 跳線上 + 軌
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25 分流點（負載與齊納並聯的節點）
  { x: 676, y: 218 }, // 6 h29 負載右腳
  { x: 676, y: 100 }, // 7 跳線上 - 軌
  { x: 500, y: 100 }, // 8 - 軌 col21
  { x: 500, y: 194 }, // 9 i21 D1 陽極
  { x: 412, y: 194 }, // 10 i17 D1 陰極 = B
  { x: 412, y: 242 }, // 11 B
  { x: 412, y: 330 }, // 12 產生器回程外接線
  { x: 66, y: 330 }, // 13
  { x: 70, y: 252 }, // 14 產生器 - 端子
  { x: 70, y: 222 }, // 15 產生器 + 端子
  { x: 130, y: 222 }, // 16
  { x: 130, y: 242 }, // 17 -> 閉合回 A（隱式邊）
];

/**
 * 假想相位：電流從 h25 分流點改道往下鑽進齊納（陰極 col25），穿過齊納本體到陽極 col29，
 * 再往上併回 h29，之後與負載支共用同一段回程（-軌 -> D1 -> B -> 產生器）。
 * 齊納腳距四欄、直接跨在 P、N 之間，不需額外跳線，所以沒有橫向跳線段落。
 */
const ZENER_LOOP_POINTS: Point[] = [
  { x: 148, y: 242 }, // 0 A
  { x: 148, y: 170 }, // 1 j5
  { x: 236, y: 170 }, // 2 j9
  { x: 236, y: 130 }, // 3 跳線上 + 軌
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25 分流點
  { x: 588, y: 266 }, // 6 f25 齊納陰極
  { x: 676, y: 266 }, // 7 f29 齊納陽極
  { x: 676, y: 218 }, // 8 h29 併回負載支
  { x: 676, y: 100 }, // 9 跳線上 - 軌
  { x: 500, y: 100 }, // 10 - 軌 col21
  { x: 500, y: 194 }, // 11 i21 D1 陽極
  { x: 412, y: 194 }, // 12 i17 D1 陰極 = B
  { x: 412, y: 242 }, // 13 B
  { x: 412, y: 330 }, // 14 產生器回程外接線
  { x: 66, y: 330 }, // 15
  { x: 70, y: 252 }, // 16 產生器 - 端子
  { x: 70, y: 222 }, // 17 產生器 + 端子
  { x: 130, y: 222 }, // 18
  { x: 130, y: 242 }, // 19 -> 閉合回 A（隱式邊）
];

const LOAD_META = buildMeta(LOAD_LOOP_POINTS);
const ZENER_META = buildMeta(ZENER_LOOP_POINTS);

const DOT_COUNT = 8;
/** 目前條件：8 顆光點都走負載支（齊納不導通、沒有光點）。 */
const DOT_PHASES = Array.from({ length: DOT_COUNT }, (_, k) => k / DOT_COUNT);
/** 假想條件：8 顆光點依奇偶交替分配到負載支／齊納支，模擬分流。 */
const DOT_LANES = Array.from({ length: DOT_COUNT }, (_, k) => Math.floor(k / 2) / (DOT_COUNT / 2));
const STATIC_T = [0.06, 0.28, 0.5, 0.72, 0.9];

const LOOP_SECONDS = 3.2;
/** 單一永不暫停的狀態時鐘：0-0.5 目前條件、0.5-1 假想條件，各約 4 秒。 */
const STAGE_CYCLE_MS = 8000;

/** 正半週固定導通：D3 本體 -> 跳線上 +軌 -> +軌 col9->col25 -> -軌 col29->col21 -> 跳線下 -> D1 本體。 */
const BRIDGE_SEGMENTS: string[] = [
  'M148,170 L236,170', // D3 本體 j5->j9
  'M236,170 L236,130', // 跳線上 + 軌
  gappedHorizontal(236, 588, 130, RAIL_CASING_X), // + 軌 col9->col25
  'M676,100 L500,100', // - 軌 col29->col21
  'M500,100 L500,194', // 跳線下 i21（跨越 + 軌，col21 最嚴重）
  'M500,194 L412,194', // D1 本體 i21->i17=B
];

/** D4、D2 那條對角線：本圖凍結在正半週，這條線永遠逆偏，只做示意，恆為綠色細虛線。 */
const Q_SEGMENTS: string[] = [
  'M412,170 L324,170', // D4 本體 j17->j13
  'M324,170 L324,130', // 跳線上 + 軌
  gappedHorizontal(324, 588, 130, RAIL_CASING_X), // + 軌 col13->col25
  'M676,100 L60,100', // - 軌 col29->col1
  'M60,100 L60,194', // 跳線下 i1（跨越 + 軌）
  'M60,194 L148,194', // D2 本體 i1->i5=A
];

/** 兩狀態共用、永遠實線的部分：節點合併線、負載兩側跳線、產生器導線。 */
const S_NODE_A = 'M148,170 L148,242';
const S_NODE_B = 'M412,170 L412,242';
const S_TO_LOAD = 'M588,130 L588,218';
const S_LOAD = 'M588,218 L676,218';
const S_FROM_LOAD = 'M676,218 L676,100'; // 跨越 + 軌（col29）
const S_GEN_PLUS = 'M70,222 L130,222 L130,242 L148,242';
const S_GEN_MINUS = 'M70,252 L70,330 L412,330 L412,242';

/** 齊納支路：h25 下鑽到 f25（陰極）-> 齊納本體 -> f29（陽極）-> 上併回 h29。 */
const ZENER_BRANCH_SEGMENTS: string[] = ['M588,218 L588,266', 'M588,266 L676,266', 'M676,266 L676,218'];

interface DiodeConfig {
  id: string;
  anodeX: number;
  cathodeX: number;
  y: number;
  labelPos: Point;
  alwaysOff: boolean;
}

/** 四顆二極體位置與另兩支實驗四元件共用；本圖凍結正半週，D3、D1 常態導通，D2、D4 永遠逆偏疊紅叉。 */
const DIODES: DiodeConfig[] = [
  { id: 'D1', anodeX: 500, cathodeX: 412, y: 194, labelPos: { x: 456, y: 213 }, alwaysOff: false },
  { id: 'D2', anodeX: 60, cathodeX: 148, y: 194, labelPos: { x: 104, y: 213 }, alwaysOff: true },
  { id: 'D3', anodeX: 148, cathodeX: 236, y: 170, labelPos: { x: 192, y: 154 }, alwaysOff: false },
  { id: 'D4', anodeX: 412, cathodeX: 324, y: 170, labelPos: { x: 368, y: 154 }, alwaysOff: true },
];

const RAIL_DOTS: Point[] = [
  { x: 236, y: 130 },
  { x: 324, y: 130 },
  { x: 500, y: 100 },
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

/** 板體背景／孔位／溝槽／電源軌，兩狀態共用；+ 軌本身在三處跳線跨越點留白斷口。 */
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
 * 二極體（與齊納共用）本體：色環一律畫在陰極端，純算術決定方向，不旋轉不鏡射。
 * 色環要內縮 6px，末端留一截深色本體；齊邊的話色環會和板子背景同色、被讀成「本體到此為止」。
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

/** 「Zener」白底標籤：放在齊納本體左側，避免和上方 R∥Zener 分流標、下方狀態短標打架。 */
function ZenerLabel({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 20} y={y - 9} width={40} height={14} rx={3} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1} />
      <text x={x} y={y + 1.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-strong)">
        Zener
      </text>
    </g>
  );
}

/** 齊納支路狀態短標：溝槽內的一行小字，「不導通」／「崩潰導通」。 */
function ZenerStateTag({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
      {label}
    </text>
  );
}

/** 分流節點（h25, 588,218）：實心接點圓 + 短標，代表負載與齊納並聯的節點；兩狀態都常駐顯示。 */
function SplitMarker() {
  return (
    <>
      <circle cx={588} cy={218} r={3.5} fill="var(--success-500)" />
      <text x={580} y={214} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--text-strong)">
        R&#8741;Zener
      </text>
    </>
  );
}

/** 10 kΩ 負載本體（暖米色本體＋三環色碼，裝飾色例外），兩狀態不變；方向恆定。 */
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

/** 函數波產生器：+ / − 端子標籤固定不變，兩狀態共用同一份導線。 */
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
        5Vpp
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

/** 兩台示波器：左台看 Vin，右台看 Vout；右台第二行讀數依狀態切換，恆定不隨光點動畫變。 */
function Scopes({ stage }: { stage: Stage }) {
  const readout = stage === 'actual' ? '≈1.1V' : '≈VZ（假想）';
  return (
    <>
      <rect x={130} y={8} width={100} height={48} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <rect x={138} y={16} width={84} height={32} rx={2} fill="var(--neutral-800)" />
      <text x={180} y={30} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        SINE 60Hz
      </text>
      <text x={180} y={43} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        Vin 5 Vpp
      </text>

      <rect x={520} y={8} width={100} height={48} rx={4} fill="var(--neutral-50)" stroke="var(--text-strong)" strokeWidth={1.5} />
      <rect x={528} y={16} width={84} height={32} rx={2} fill="var(--neutral-800)" />
      <text x={570} y={30} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        橋式+齊納
      </text>
      <text x={570} y={43} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        {readout}
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

/** 某一組電流路徑：導通時綠色實線＋箭頭，不導通（或恆為示意）時綠色細虛線、無箭頭、無光點。 */
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

/** 箭頭 marker 與假想狀態的斜線警示紋理 pattern，兩者都依 suffix 區分，避免多個 svg 實例互相覆蓋 id。 */
function Defs({ suffix }: { suffix: string }) {
  return (
    <defs>
      <marker id={`flow-arrow-${suffix}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
      </marker>
      <pattern id={`zener-hatch-${suffix}`} width={10} height={10} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width={10} height={10} fill="var(--warning-500)" opacity={0.08} />
        <line x1={0} y1={0} x2={0} y2={10} stroke="var(--warning-500)" strokeWidth={4} opacity={0.35} />
      </pattern>
    </defs>
  );
}

/** 整張板子的完整內容（不含 <svg> 外框與 <defs>），兩個狀態、動畫／靜態版共用。 */
function Scene({ stage, dots, suffix }: { stage: Stage; dots: Point[]; suffix: string }) {
  const hypothetical = stage === 'hypothetical';
  return (
    <>
      <BoardBackdrop />

      {/* 假想狀態才疊的斜線警示紋理：覆蓋齊納支路周邊區域，提醒這段路徑此刻不是真的在導通 */}
      {hypothetical && <rect x={572} y={202} width={120} height={88} fill={`url(#zener-hatch-${suffix})`} />}

      {/* D4、D2 對角線：本圖凍結在正半週，永遠逆偏，只做示意 */}
      <PathGroup segments={Q_SEGMENTS} active={false} suffix={suffix} />

      {/* 正半週固定導通：D3 -> +軌 -> -軌 -> D1 */}
      <PathGroup segments={BRIDGE_SEGMENTS} active suffix={suffix} />

      {/* 兩狀態共用、永遠實線的部分 */}
      <g fill="none" stroke="var(--success-500)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={S_NODE_A} />
        <path d={S_NODE_B} />
        <path d={S_TO_LOAD} markerEnd={`url(#flow-arrow-${suffix})`} />
        <path d={S_FROM_LOAD} markerEnd={`url(#flow-arrow-${suffix})`} />
        <path d={S_GEN_PLUS} />
        <path d={S_GEN_MINUS} />
      </g>

      {/* 負載段落：全元件唯一醒目常駐標記，兩狀態座標與樣式完全相同，方向永遠不變 */}
      <path d={S_LOAD} fill="none" stroke="var(--success-500)" strokeWidth={3.5} strokeLinecap="round" markerEnd={`url(#flow-arrow-${suffix})`} />

      {/* 齊納支路：目前條件下不導通（虛線＋紅叉），假想條件下導通並分流 */}
      <PathGroup segments={ZENER_BRANCH_SEGMENTS} active={hypothetical} suffix={suffix} />

      <g fill="var(--success-500)">
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} />
        ))}
      </g>

      <SplitMarker />

      <GeneratorBody />
      {DIODES.map((d) => (
        <g key={d.id}>
          <DiodeBody anodeX={d.anodeX} cathodeX={d.cathodeX} y={d.y} />
          {d.alwaysOff && <DiodeCross cx={(d.anodeX + d.cathodeX) / 2} cy={d.y} />}
          <DiodeLabel x={d.labelPos.x} y={d.labelPos.y} id={d.id} />
        </g>
      ))}
      <ResistorBody />

      {/* 齊納本體：色環（陰極）在 col25 端，與二極體同款畫法，只是加白底 Zener 標籤與狀態短標 */}
      <DiodeBody anodeX={676} cathodeX={588} y={266} />
      {!hypothetical && <DiodeCross cx={632} cy={266} />}
      <ZenerLabel x={560} y={266} />
      <ZenerStateTag x={632} y={296} label={hypothetical ? '崩潰導通' : '不導通'} color={hypothetical ? 'var(--success-500)' : 'var(--neutral-400)'} />

      <StaticDots />
    </>
  );
}

const ACTUAL_EXPLANATION =
  '齊納未導通，輸出和沒加時一樣——5 Vpp 經橋式後峰值只剩約 1.1 V，遠低於 VZ，齊納一直待在逆偏不導通區。';
const HYPOTHETICAL_EXPLANATION =
  '齊納崩潰導通，輸出被箝在 VZ（假想）——把振幅拉到 VZ 以上，多餘的電流走齊納、輸出被箝住。';

function ActualBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ color: 'var(--info-500)', background: 'var(--info-50)' }}
    >
      目前條件：Vin &lt; VZ
    </span>
  );
}

function HypotheticalBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
      style={{ color: 'var(--neutral-900)', background: 'var(--warning-500)' }}
    >
      <TriangleAlert size={14} />
      假想：需把輸入振幅拉到崩潰電壓以上
    </span>
  );
}

function ReversedReminder() {
  return (
    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      <Info size={13} />
      <span>插反判斷：色環接反會變順偏，輸出被箝在約 0.7 V</span>
    </div>
  );
}

function FixedConclusion() {
  return (
    <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
      這正是講義要量的 Vin &lt; VZ 情況，輸出和沒加齊納時一模一樣；要看到穩壓效果得把輸入振幅拉到崩潰電壓以上，是否要這樣做請向助教確認。
    </p>
  );
}

export default function EcWeek3Exp4ZenerCurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  // 第一個 rAF：單一永不暫停的狀態時鐘，0-0.5 目前條件、0.5-1 假想條件。
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
      wavePhaseRef.current = (wavePhaseRef.current + dt / (STAGE_CYCLE_MS / 1000)) % 1;
      setWavePhase(wavePhaseRef.current);
      waveRafRef.current = requestAnimationFrame(tick);
    }
    waveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current);
      waveLastTsRef.current = null;
    };
  }, [shouldReduceMotion]);

  const stage: Stage = wavePhase < 0.5 ? 'actual' : 'hypothetical';

  // 第二個 rAF：迴路光點的弧長進度，永不暫停（目前條件下只有負載支有光點）。
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
    const actualDots = STATIC_T.map((t) => pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, t));
    const hypotheticalDots = [
      ...STATIC_T.map((t) => pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, t)),
      ...STATIC_T.map((t) => pointAtProgress(ZENER_LOOP_POINTS, ZENER_META, t + 0.5)),
    ];
    return (
      <div className="not-prose flex flex-col gap-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <ActualBadge />
            <svg
              viewBox="0 0 720 362"
              width="100%"
              role="img"
              aria-label="目前條件靜態示意：橋式正半週路徑實線導通有光點，齊納支路畫成綠色細虛線並疊紅叉，代表沒有電流"
              preserveAspectRatio="xMidYMid meet"
            >
              <Defs suffix="zener-actual" />
              <Scene stage="actual" dots={actualDots} suffix="zener-actual" />
              <Scopes stage="actual" />
            </svg>
            <p className="text-[12px] font-medium" style={{ color: 'var(--info-500)' }}>
              {ACTUAL_EXPLANATION}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <HypotheticalBadge />
            <div style={{ filter: 'saturate(0.55)' }}>
              <svg
                viewBox="0 0 720 362"
                width="100%"
                role="img"
                aria-label="假想條件靜態示意：把輸入振幅拉到崩潰電壓以上，齊納支路轉為實線並分流，整張圖降飽和並疊斜線警示紋理提醒這是假想狀態"
                preserveAspectRatio="xMidYMid meet"
              >
                <Defs suffix="zener-hypo" />
                <Scene stage="hypothetical" dots={hypotheticalDots} suffix="zener-hypo" />
                <Scopes stage="hypothetical" />
              </svg>
            </div>
            <p className="text-[12px] font-bold" style={{ color: 'var(--warning-500)' }}>
              {HYPOTHETICAL_EXPLANATION}
            </p>
          </div>
        </div>

        <ReversedReminder />
        <FixedConclusion />
      </div>
    );
  }

  const dots =
    stage === 'actual'
      ? DOT_PHASES.map((offset) => pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, progress + offset))
      : DOT_LANES.map((lane, k) =>
          k % 2 === 0
            ? pointAtProgress(LOAD_LOOP_POINTS, LOAD_META, progress + lane)
            : pointAtProgress(ZENER_LOOP_POINTS, ZENER_META, progress + lane),
        );

  return (
    <div className="not-prose flex flex-col gap-4">
      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {stage === 'actual' ? <ActualBadge /> : <HypotheticalBadge />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={stage === 'hypothetical' ? { filter: 'saturate(0.55)' } : undefined}>
        <svg
          viewBox="0 0 720 362"
          width="100%"
          role="img"
          aria-label="橋式整流並聯齊納電流路徑動畫：橋式正半週路徑固定導通，齊納支路在目前條件（Vin 小於 VZ）下不導通並疊紅叉，每約 4 秒切換到假想條件（把輸入振幅拉到崩潰電壓以上），此時齊納支路轉為實線並分流、整張圖降飽和提醒這是假想畫面"
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs suffix="zener-main" />
          <Scene stage={stage} dots={dots} suffix="zener-main" />
          <Scopes stage={stage} />
        </svg>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={stage === 'actual' ? 'text-[12px] font-medium' : 'text-[12px] font-bold'}
          style={{ color: stage === 'actual' ? 'var(--info-500)' : 'var(--warning-500)' }}
        >
          {stage === 'actual' ? ACTUAL_EXPLANATION : HYPOTHETICAL_EXPLANATION}
        </motion.p>
      </AnimatePresence>

      <ReversedReminder />
      <FixedConclusion />
    </div>
  );
}
