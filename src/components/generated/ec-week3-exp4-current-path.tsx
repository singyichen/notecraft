import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

type Phase = 'positive' | 'negative';

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
/** 唯三處跳線跨越 + 軌（col1、col21、col29）；col21 最嚴重——落在正半週 + 軌帶電範圍內。 */
const RAIL_CASING_X = [60, 500, 676];

const STATIC_P_RAIL_D = gappedHorizontal(48, 692, 130, RAIL_CASING_X);

/** 正半週 12 點路徑：A -> D3 -> +軌 -> 負載 -> -軌 -> D1 -> B，再經產生器接回 A。 */
const POS_LOOP_POINTS: Point[] = [
  { x: 148, y: 242 }, // 0 A（g5/i5/j5 merged）
  { x: 148, y: 170 }, // 1 j5
  { x: 236, y: 170 }, // 2 j9 D3 陰極
  { x: 236, y: 130 }, // 3 跳線上 + 軌
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25 負載左腳
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

/** 負半週 12 點路徑：B -> D4 -> +軌 -> 負載 -> -軌 -> D2 -> A，方向相反地經產生器接回 B。 */
const NEG_LOOP_POINTS: Point[] = [
  { x: 412, y: 242 }, // 0 B
  { x: 412, y: 170 }, // 1 j17
  { x: 324, y: 170 }, // 2 j13 D4 陰極
  { x: 324, y: 130 }, // 3 跳線上 + 軌
  { x: 588, y: 130 }, // 4 + 軌 col25
  { x: 588, y: 218 }, // 5 h25
  { x: 676, y: 218 }, // 6 h29
  { x: 676, y: 100 }, // 7 跳線上 - 軌
  { x: 60, y: 100 }, // 8 - 軌 col1
  { x: 60, y: 194 }, // 9 i1 D2 陽極
  { x: 148, y: 194 }, // 10 i5 D2 陰極 = A
  { x: 148, y: 242 }, // 11 A
  { x: 130, y: 242 }, // 12
  { x: 130, y: 222 }, // 13
  { x: 70, y: 222 }, // 14 產生器 + 端子
  { x: 70, y: 252 }, // 15 產生器 - 端子
  { x: 66, y: 330 }, // 16
  { x: 412, y: 330 }, // 17 -> 閉合回 B（隱式邊）
];

const POS_META = buildMeta(POS_LOOP_POINTS);
const NEG_META = buildMeta(NEG_LOOP_POINTS);

const DOT_COUNT = 8;
const DOT_PHASES = Array.from({ length: DOT_COUNT }, (_, k) => k / DOT_COUNT);
const DOT_STATIC_T = [0.06, 0.28, 0.5, 0.72, 0.9];
const LOOP_SECONDS = 3.2;
/** 單一連續時鐘：0-0.5 正半週、0.5-1 負半週，永不暫停（全波兩個半週都有電流）。 */
const CYCLE_MS = 7000;

/** 正半週專屬：D3 -> +軌 -> -軌 -> D1，負半週為虛線且無箭頭。 */
const P_SEGMENTS: string[] = [
  'M148,170 L236,170', // D3 本體 j5->j9
  'M236,170 L236,130', // 跳線上 + 軌
  gappedHorizontal(236, 588, 130, RAIL_CASING_X), // + 軌 col9->col25
  'M676,100 L500,100', // - 軌 col29->col21
  'M500,100 L500,194', // 跳線下 i21（跨越 + 軌，col21 最嚴重）
  'M500,194 L412,194', // D1 本體 i21->i17=B
];

/** 負半週專屬：D4 -> +軌 -> -軌 -> D2，正半週為虛線且無箭頭。 */
const Q_SEGMENTS: string[] = [
  'M412,170 L324,170', // D4 本體 j17->j13
  'M324,170 L324,130', // 跳線上 + 軌
  gappedHorizontal(324, 588, 130, RAIL_CASING_X), // + 軌 col13->col25
  'M676,100 L60,100', // - 軌 col29->col1
  'M60,100 L60,194', // 跳線下 i1（跨越 + 軌）
  'M60,194 L148,194', // D2 本體 i1->i5=A
];

/** 兩個半週共用、永遠實線的部分：負載段落＋緊鄰兩端＋產生器導線＋節點合併線。 */
const S_NODE_A = 'M148,170 L148,242';
const S_NODE_B = 'M412,170 L412,242';
const S_TO_LOAD = 'M588,130 L588,218';
const S_LOAD = 'M588,218 L676,218';
const S_FROM_LOAD = 'M676,218 L676,100'; // 跨越 + 軌（col29，兩半週共用）
const S_GEN_PLUS = 'M70,222 L130,222 L130,242 L148,242';
const S_GEN_MINUS = 'M70,252 L70,330 L412,330 L412,242';

interface DiodeConfig {
  id: string;
  anodeX: number;
  cathodeX: number;
  y: number;
  labelPos: Point;
  crossPhase: Phase;
}

const DIODES: DiodeConfig[] = [
  { id: 'D1', anodeX: 500, cathodeX: 412, y: 194, labelPos: { x: 456, y: 213 }, crossPhase: 'negative' },
  { id: 'D2', anodeX: 60, cathodeX: 148, y: 194, labelPos: { x: 104, y: 213 }, crossPhase: 'positive' },
  { id: 'D3', anodeX: 148, cathodeX: 236, y: 170, labelPos: { x: 192, y: 154 }, crossPhase: 'negative' },
  { id: 'D4', anodeX: 412, cathodeX: 324, y: 170, labelPos: { x: 368, y: 154 }, crossPhase: 'positive' },
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

const WAVE_X0 = 250;
const WAVE_WIDTH = 184;
const WAVE_ZERO_Y = 40;
const WAVE_AMP = 15;
const WAVE_POS_PATH = `M${WAVE_X0},${WAVE_ZERO_Y} C${WAVE_X0 + 23},${WAVE_ZERO_Y} ${WAVE_X0 + 23},${WAVE_ZERO_Y - WAVE_AMP} ${WAVE_X0 + 46},${WAVE_ZERO_Y - WAVE_AMP} C${WAVE_X0 + 69},${WAVE_ZERO_Y - WAVE_AMP} ${WAVE_X0 + 69},${WAVE_ZERO_Y} ${WAVE_X0 + 92},${WAVE_ZERO_Y}`;
const WAVE_NEG_PATH = `M${WAVE_X0 + 92},${WAVE_ZERO_Y} C${WAVE_X0 + 115},${WAVE_ZERO_Y} ${WAVE_X0 + 115},${WAVE_ZERO_Y + WAVE_AMP} ${WAVE_X0 + 138},${WAVE_ZERO_Y + WAVE_AMP} C${WAVE_X0 + 161},${WAVE_ZERO_Y + WAVE_AMP} ${WAVE_X0 + 161},${WAVE_ZERO_Y} ${WAVE_X0 + 184},${WAVE_ZERO_Y}`;

/** 板體背景／孔位／溝槽／電源軌，兩相位共用；+ 軌本身在三處跳線跨越點留白斷口。 */
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

/** 二極體本體：色環一律畫在陰極端，純算術決定方向，不旋轉不鏡射。 */
function DiodeBody({ anodeX, cathodeX, y }: { anodeX: number; cathodeX: number; y: number }) {
  const left = Math.min(anodeX, cathodeX);
  const right = Math.max(anodeX, cathodeX);
  // 色環要內縮 6px，末端留一截深色本體；齊邊的話色環會和板子背景同色、被讀成「本體到此為止」
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

/** 10 kΩ 負載本體（暖米色本體＋三環色碼，裝飾色例外），兩相位不變。 */
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

/** 兩台示波器：左台看 Vin（探棒接 h5、h17），右台看 Vout（探棒接 + / − 軌），恆定不隨相位變。 */
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
        全波輸出
      </text>
      <text x={570} y={43} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--neutral-50)">
        120 Hz
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

/** Vin 波形指示器：完整正弦一週期＋零軸＋沿波形移動的圓點，圓點永不暫停。 */
function WaveformIndicator({ phase, wavePhase }: { phase: Phase; wavePhase: number }) {
  const dotX = WAVE_X0 + wavePhase * WAVE_WIDTH;
  const dotY = WAVE_ZERO_Y - WAVE_AMP * Math.sin(2 * Math.PI * wavePhase);
  const posColor = phase === 'positive' ? 'var(--success-500)' : 'var(--neutral-300)';
  const negColor = phase === 'negative' ? 'var(--success-500)' : 'var(--neutral-300)';
  return (
    <g>
      <text x={WAVE_X0} y={16} fontSize={9} fill="var(--neutral-400)">
        Vin
      </text>
      <line x1={WAVE_X0} y1={WAVE_ZERO_Y} x2={WAVE_X0 + WAVE_WIDTH} y2={WAVE_ZERO_Y} stroke="var(--neutral-400)" strokeWidth={1} />
      <path d={WAVE_POS_PATH} fill="none" strokeWidth={1.6} stroke={posColor} />
      <path d={WAVE_NEG_PATH} fill="none" strokeWidth={1.6} stroke={negColor} />
      <circle cx={dotX} cy={dotY} r={3.6} fill="var(--success-500)" />
    </g>
  );
}

/** 某一組（P 或 Q）電流路徑：導通時綠色實線＋箭頭，逆偏時綠色細虛線、無箭頭、無光點。 */
function CurrentPathLayer({ segments, active, suffix }: { segments: string[]; active: boolean; suffix: string }) {
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
      <marker id={`flow-arrow-big-${suffix}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={9} markerHeight={9} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--success-500)" />
      </marker>
    </defs>
  );
}

/** 整張板子的完整內容（不含 <svg> 外框與 <defs>），兩個相位、動畫／靜態版共用。 */
function Scene({ phase, dots, suffix }: { phase: Phase; dots: Point[]; suffix: string }) {
  const posActive = phase === 'positive';
  return (
    <>
      <BoardBackdrop />

      {/* 兩半週共用、永遠實線的部分：節點合併線、負載兩側的跳線、產生器導線 */}
      <g fill="none" stroke="var(--success-500)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={S_NODE_A} />
        <path d={S_NODE_B} />
        <path d={S_TO_LOAD} markerEnd={`url(#flow-arrow-${suffix})`} />
        <path d={S_FROM_LOAD} markerEnd={`url(#flow-arrow-${suffix})`} />
        <path d={S_GEN_PLUS} />
        <path d={S_GEN_MINUS} />
      </g>

      {/* 負載段落：全元件唯一醒目常駐標記，兩半週座標與樣式完全相同，方向永遠不變 */}
      <path d={S_LOAD} fill="none" stroke="var(--success-500)" strokeWidth={3.5} strokeLinecap="round" markerEnd={`url(#flow-arrow-big-${suffix})`} />
      <text x={632} y={234} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--success-500)">
        &#8594; 固定方向
      </text>

      <CurrentPathLayer segments={P_SEGMENTS} active={posActive} suffix={suffix} />
      <CurrentPathLayer segments={Q_SEGMENTS} active={!posActive} suffix={suffix} />

      <g fill="var(--success-500)">
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} />
        ))}
      </g>

      <GeneratorBody />
      {DIODES.map((d) => (
        <g key={d.id}>
          <DiodeBody anodeX={d.anodeX} cathodeX={d.cathodeX} y={d.y} />
          {d.crossPhase === phase && <DiodeCross cx={(d.anodeX + d.cathodeX) / 2} cy={d.y} />}
          <DiodeLabel x={d.labelPos.x} y={d.labelPos.y} id={d.id} />
        </g>
      ))}
      <ResistorBody />
      <StaticDots />

      <g>
        <circle cx={128} cy={236} r={11} fill="var(--sky-500)" />
        <text x={128} y={239} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--neutral-0)">
          A {posActive ? '高' : '低'}
        </text>
        <circle cx={432} cy={236} r={11} fill="var(--sky-500)" />
        <text x={432} y={239} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--neutral-0)">
          B {posActive ? '低' : '高'}
        </text>
      </g>
    </>
  );
}

function LegendAndConclusion() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success-500)' }} />
          綠色實線＋箭頭：這對二極體正在導通
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: 'var(--success-500)' }} />
          綠色細虛線：這對二極體逆偏，沒有電流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger-500)' }} />
          紅叉：逆偏截止的二極體
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight size={12} style={{ color: 'var(--success-500)' }} />
          粗綠線：負載固定電流方向，兩個半週都一樣
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
        輸入反向、負載電流卻不反向，所以兩個半週都被翻成正的，輸出頻率變成輸入的兩倍（120 Hz），平均值也是半波的兩倍。
      </p>
    </>
  );
}

export default function EcWeek3Exp4CurrentPath() {
  const shouldReduceMotion = useReducedMotion();

  // 單一連續時鐘：wavePhase 0-0.5 正半週、0.5-1 負半週；progress 驅動迴路光點；兩者永不暫停。
  const [wavePhase, setWavePhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const wavePhaseRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    function tick(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      wavePhaseRef.current = (wavePhaseRef.current + dt / (CYCLE_MS / 1000)) % 1;
      progressRef.current = (progressRef.current + dt / LOOP_SECONDS) % 1;
      setWavePhase(wavePhaseRef.current);
      setProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [shouldReduceMotion]);

  const phase: Phase = wavePhase < 0.5 ? 'positive' : 'negative';

  if (shouldReduceMotion) {
    const posDots = DOT_STATIC_T.map((t) => pointAtProgress(POS_LOOP_POINTS, POS_META, t));
    const negDots = DOT_STATIC_T.map((t) => pointAtProgress(NEG_LOOP_POINTS, NEG_META, t));
    return (
      <div className="not-prose flex flex-col gap-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <svg
              viewBox="0 0 720 362"
              width="100%"
              role="img"
              aria-label="正半週靜態示意：A 端為正，D3、D1 導通並畫成綠色實線加箭頭，D2、D4 逆偏疊紅叉並轉綠色細虛線，負載段落固定由左向右且加粗標示"
              preserveAspectRatio="xMidYMid meet"
            >
              <ArrowDefs suffix="pos" />
              <Scene phase="positive" dots={posDots} suffix="pos" />
              <Scopes />
              <WaveformIndicator phase="positive" wavePhase={0.25} />
            </svg>
            <p className="text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              正半週：A 端為正 &#8594; 對角線的 D3、D1 導通，D2、D4 逆偏
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <svg
              viewBox="0 0 720 362"
              width="100%"
              role="img"
              aria-label="負半週靜態示意：B 端為正，D4、D2 導通並畫成綠色實線加箭頭，D1、D3 逆偏疊紅叉並轉綠色細虛線，負載段落方向與正半週完全相同"
              preserveAspectRatio="xMidYMid meet"
            >
              <ArrowDefs suffix="neg" />
              <Scene phase="negative" dots={negDots} suffix="neg" />
              <Scopes />
              <WaveformIndicator phase="negative" wavePhase={0.75} />
            </svg>
            <p className="text-[12px] font-medium" style={{ color: 'var(--success-500)' }}>
              負半週：B 端為正 &#8594; 換另一條對角線 D4、D2 導通，D1、D3 逆偏
            </p>
          </div>
        </div>

        <LegendAndConclusion />
      </div>
    );
  }

  const dots =
    phase === 'positive'
      ? DOT_PHASES.map((offset) => pointAtProgress(POS_LOOP_POINTS, POS_META, progress + offset))
      : DOT_PHASES.map((offset) => pointAtProgress(NEG_LOOP_POINTS, NEG_META, progress + offset));

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
            style={{ color: 'var(--success-500)' }}
          >
            <ArrowLeftRight size={16} />
            <span>
              {phase === 'positive'
                ? '正半週：A 端為正 → 對角線的 D3、D1 導通，D2、D4 逆偏'
                : '負半週：B 端為正 → 換另一條對角線 D4、D2 導通，D1、D3 逆偏'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <svg
        viewBox="0 0 720 362"
        width="100%"
        role="img"
        aria-label="橋式整流電流路徑動畫：正負半週各驅動對角線的兩顆二極體，輸入的入口與出口每半週都換邊，但流過負載那一段的方向從頭到尾沒變，波形指示器的圓點永不暫停"
        preserveAspectRatio="xMidYMid meet"
      >
        <ArrowDefs suffix="main" />
        <Scene phase={phase} dots={dots} suffix="main" />
        <Scopes />
        <WaveformIndicator phase={phase} wavePhase={wavePhase} />
      </svg>

      <LegendAndConclusion />
    </div>
  );
}
