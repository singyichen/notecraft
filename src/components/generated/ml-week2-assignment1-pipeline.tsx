import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Database,
  Square,
  Repeat,
  Check,
  SquareStack,
  FileText,
  FileChartColumn,
  GitCompareArrows,
  Ruler,
  Cpu,
  Target,
  ListOrdered,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface Combo {
  key: string;
  label: string;
  accuracy: number;
}

/**
 * 示意用的正確率數值（非真實實驗輸出）——僅用來展示「迴圈累積 7 筆結果，
 * 完成後依 Accuracy 排序」這個結構本身，數值本身不具科學意義。
 */
const COMBOS: Combo[] = [
  { key: 'lm', label: '語文＋數理', accuracy: 0.88 },
  { key: 'lc', label: '語文＋程式', accuracy: 0.74 },
  { key: 'lh', label: '語文＋健康', accuracy: 0.82 },
  { key: 'mc', label: '數理＋程式', accuracy: 0.86 },
  { key: 'mh', label: '數理＋健康', accuracy: 0.93 },
  { key: 'ch', label: '程式＋健康', accuracy: 0.78 },
  { key: 'all', label: '全部 4 項', accuracy: 0.91 },
];

const SORTED_COMBOS = [...COMBOS].sort((a, b) => b.accuracy - a.accuracy);

const TRAY_START_X = 52;
const SLOT_W = 68;
const SLOT_GAP = 10;
const SLOT_STEP = SLOT_W + SLOT_GAP;
const TRAY_Y = 446;
const TRAY_H = 66;

function slotX(i: number): number {
  return TRAY_START_X + i * SLOT_STEP;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** 檔案「折角」外框（dog-ear），供落地輸出檔案節點使用 */
function filePath(x: number, y: number, w: number, h: number, fold = 14): string {
  const r = 8;
  return `M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} Z`;
}
function foldPath(x: number, y: number, w: number, fold = 14): string {
  return `M${x + w - fold},${y} L${x + w},${y + fold} L${x + w - fold},${y + fold} Z`;
}

function LegendItem({
  icon,
  label,
  swatchClass,
}: {
  icon: React.ReactNode;
  label: string;
  swatchClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600">
      <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${swatchClass}`}>
        {icon}
      </span>
      {label}
    </span>
  );
}

interface OutputNodeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
  filename: string;
  note?: string;
}

function OutputNode({ x, y, w, h, active, icon, title, sub, filename, note }: OutputNodeProps) {
  return (
    <g className="transition-opacity duration-300 motion-reduce:transition-none" opacity={active ? 1 : 0.45}>
      <path
        d={filePath(x, y, w, h)}
        fill="var(--surface-card)"
        stroke={active ? 'var(--orange-500)' : 'var(--border-default)'}
        strokeWidth={1.5}
        className="transition-colors duration-300 motion-reduce:transition-none"
      />
      <path
        d={foldPath(x, y, w)}
        fill={active ? 'var(--orange-100)' : 'var(--neutral-100)'}
        className="transition-colors duration-300 motion-reduce:transition-none"
      />
      <foreignObject x={x + 6} y={y + 6} width={w - 12} height={h - 12}>
        <div className="flex h-full w-full flex-col items-center justify-start gap-0.5 pt-0.5 text-center">
          <span style={{ color: active ? 'var(--orange-600)' : 'var(--neutral-400)' }}>{icon}</span>
          <span className="text-[10px] font-semibold leading-tight text-neutral-800">{title}</span>
          <span className="text-[9px] leading-tight text-neutral-500">{sub}</span>
          {note && <span className="text-[8px] leading-tight text-neutral-400">{note}</span>}
          <span
            className="mt-0.5 break-all font-mono text-[7.5px] leading-tight text-neutral-400"
          >
            {filename}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

export default function MlWeek2Assignment1Pipeline() {
  const reduceMotion = useReducedMotion();
  const [iteration, setIteration] = useState(0); // 已完成的特徵組合數 0..7
  const [sorted, setSorted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  // 每次 iteration 增加，短暫高亮迴圈內三個步驟方塊
  useEffect(() => {
    if (iteration === 0) return;
    setPulse(true);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), reduceMotion ? 0 : 260);
  }, [iteration, reduceMotion]);

  const scheduleSort = (delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSorted(true);
      setPlaying(false);
    }, delay);
  };

  const handlePlay = () => {
    if (reduceMotion) {
      clearTimers();
      setIteration(7);
      setSorted(true);
      setPlaying(false);
      return;
    }
    if (iteration >= 7) {
      if (!sorted) scheduleSort(300);
      return;
    }
    clearTimers();
    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setIteration((prev) => {
        const next = Math.min(prev + 1, 7);
        if (next >= 7) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          scheduleSort(300);
        }
        return next;
      });
    }, 560);
  };

  const handlePause = () => {
    clearTimers();
    setPlaying(false);
  };

  const handleReset = () => {
    clearTimers();
    setIteration(0);
    setSorted(false);
    setPlaying(false);
  };

  const handleStep = () => {
    if (playing) return;
    clearTimers();
    setIteration((prev) => {
      if (prev >= 7) return prev;
      const next = prev + 1;
      if (next >= 7) scheduleSort(300);
      return next;
    });
  };

  const trayReady = iteration >= 7;
  const transDur = reduceMotion ? 0 : 0.22;
  const layoutDur = reduceMotion ? 0 : 0.36;

  const rows = sorted ? SORTED_COMBOS : COMBOS;

  return (
    <div className="not-prose flex flex-col gap-3">
      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
        <LegendItem
          icon={<Database size={10} className="text-blue-700" />}
          label="輸入資料"
          swatchClass="bg-blue-50 border border-blue-500"
        />
        <LegendItem
          icon={<Square size={9} className="text-neutral-500" />}
          label="處理步驟"
          swatchClass="bg-white border border-neutral-300"
        />
        <LegendItem
          icon={<Repeat size={10} className="text-blue-700" />}
          label="迴圈節點"
          swatchClass="bg-blue-50 border border-dashed border-blue-500"
        />
        <LegendItem
          icon={<SquareStack size={10} className="text-orange-700" />}
          label="暫存結果"
          swatchClass="bg-orange-50 border border-orange-300"
        />
        <LegendItem
          icon={<FileText size={10} className="text-orange-600" />}
          label="落地輸出檔案"
          swatchClass="bg-white border border-orange-500"
        />
      </div>

      {/* 控制列 */}
      <div className="flex flex-wrap items-center gap-2 px-0.5">
        <button
          type="button"
          onClick={playing ? handlePause : handlePlay}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors motion-reduce:transition-none"
          style={{ background: 'var(--action-primary)' }}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? '暫停' : iteration >= 7 && !sorted ? '完成排序' : '播放全流程'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 motion-reduce:transition-none"
        >
          <RotateCcw size={12} />
          重置
        </button>
        <span className="text-[11px] text-neutral-400">
          或點擊迴圈方塊單步前進・已完成 {iteration} / 7
        </span>
        <span className="sr-only" aria-live="polite">
          {sorted
            ? '已完成 7 種特徵組合並依正確率排序'
            : `已完成 ${iteration} / 7 種特徵組合`}
        </span>
      </div>

      {/* 主流程圖 */}
      <svg viewBox="0 0 640 856" width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="mlw2-arrow-neutral" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="mlw2-arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--blue-300)" />
          </marker>
          <marker id="mlw2-arrow-orange" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--orange-500)" />
          </marker>
        </defs>

        {/* ---- 連接線（畫在節點下方，避免視覺上蓋住方框） ---- */}
        <g fill="none">
          <line x1={320} y1={62} x2={320} y2={70} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-neutral)" />
          <line x1={320} y1={84} x2={320} y2={90} stroke="var(--neutral-400)" strokeWidth={1.5} />
          <line x1={205} y1={154} x2={205} y2={186} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-neutral)" />
          <line x1={435} y1={154} x2={435} y2={186} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-neutral)" />
          <line x1={225} y1={297} x2={245} y2={297} stroke="var(--border-strong)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-neutral)" />
          <line x1={395} y1={297} x2={415} y2={297} stroke="var(--border-strong)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-neutral)" />
          <path
            d="M490,345 L490,368 L150,368 L150,345"
            stroke="var(--blue-400)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            markerEnd="url(#mlw2-arrow-neutral)"
          />
          <line
            x1={320}
            y1={416}
            x2={320}
            y2={446}
            stroke={trayReady ? 'var(--blue-500)' : 'var(--neutral-400)'}
            strokeWidth={1.5}
            markerEnd="url(#mlw2-arrow-neutral)"
            className="transition-colors duration-300 motion-reduce:transition-none"
          />

          <AnimatePresence initial={false}>
            {trayReady && (
              <motion.g
                key="tray-branches"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: transDur, ease: 'easeOut' }}
              >
                <path
                  d="M430,512 L430,560"
                  stroke="var(--orange-500)"
                  strokeWidth={1.5}
                  markerEnd="url(#mlw2-arrow-orange)"
                />
                <path
                  d="M120,512 C100,590 95,660 92,724"
                  stroke="var(--blue-300)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerEnd="url(#mlw2-arrow-blue)"
                />
                <path
                  d="M280,512 C260,590 245,660 242,724"
                  stroke="var(--blue-300)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerEnd="url(#mlw2-arrow-blue)"
                />
              </motion.g>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {sorted && (
              <motion.g
                key="sorted-branches"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: transDur, ease: 'easeOut' }}
              >
                <line x1={392} y1={680} x2={392} y2={724} stroke="var(--orange-500)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-orange)" />
                <line x1={542} y1={680} x2={542} y2={724} stroke="var(--orange-500)" strokeWidth={1.5} markerEnd="url(#mlw2-arrow-orange)" />
              </motion.g>
            )}
          </AnimatePresence>
        </g>

        {/* ---- 輸入資料 ---- */}
        <rect x={200} y={8} width={240} height={54} rx={14} fill="var(--surface-brand-soft)" stroke="var(--blue-500)" strokeWidth={1.5} />
        <foreignObject x={200} y={8} width={240} height={54}>
          <div className="flex h-full w-full items-center justify-center gap-2">
            <Database size={16} className="text-blue-700 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[11px] font-semibold text-blue-950">tech_employees.csv</span>
              <span className="text-[9.5px] text-blue-700">300 筆・4 特徵＋1 標籤</span>
            </div>
          </div>
        </foreignObject>

        <foreignObject x={170} y={70} width={300} height={14}>
          <div className="text-center text-[9.5px] text-neutral-500">依原始順序切分・非隨機</div>
        </foreignObject>

        {/* ---- 切分 Train / Test ---- */}
        <rect x={110} y={90} width={190} height={64} rx={10} fill="var(--surface-card)" stroke="var(--border-default)" strokeWidth={1.5} />
        <foreignObject x={110} y={90} width={190} height={64}>
          <div className="flex h-full w-full flex-col items-center justify-center">
            <span className="text-[11px] font-semibold text-neutral-800">Train・前 200 筆</span>
            <span className="text-[9px] text-neutral-500">供 fit / 算 mean・std</span>
          </div>
        </foreignObject>

        <rect x={340} y={90} width={190} height={64} rx={10} fill="var(--surface-card)" stroke="var(--border-default)" strokeWidth={1.5} />
        <foreignObject x={340} y={90} width={190} height={64}>
          <div className="flex h-full w-full flex-col items-center justify-center">
            <span className="text-[11px] font-semibold text-neutral-800">Test・後 100 筆</span>
            <span className="text-[9px] text-neutral-500">只做 transform / 評估</span>
          </div>
        </foreignObject>

        {/* ---- 迴圈容器 ---- */}
        <rect
          x={40}
          y={186}
          width={560}
          height={230}
          rx={20}
          fill={trayReady ? 'var(--surface-sunken)' : 'var(--surface-brand-soft)'}
          stroke={trayReady ? 'var(--blue-700)' : 'var(--blue-500)'}
          strokeWidth={2}
          strokeDasharray={trayReady ? undefined : '7 5'}
          className="transition-colors duration-300 motion-reduce:transition-none"
          onClick={handleStep}
          role="button"
          tabIndex={0}
          aria-label="單步前進一種特徵組合"
          style={{ cursor: iteration < 7 ? 'pointer' : 'default' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleStep();
            }
          }}
        />
        <foreignObject x={60} y={198} width={340} height={20} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full items-center gap-1.5 text-xs font-semibold text-blue-800">
            <Repeat size={12} />
            迴圈：依序處理 7 種特徵組合
          </div>
        </foreignObject>

        <rect x={456} y={194} width={128} height={28} rx={14} fill="var(--blue-50)" stroke="var(--blue-500)" strokeWidth={1.25} style={{ pointerEvents: 'none' }} />
        <foreignObject x={456} y={194} width={128} height={28} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full w-full items-center justify-center gap-1 text-xs font-bold text-blue-700">
            {trayReady ? <Check size={12} /> : <Repeat size={12} />}
            組合 {iteration} / 7
          </div>
        </foreignObject>

        {/* 迴圈內三步驟 */}
        <rect
          x={75}
          y={250}
          width={150}
          height={95}
          rx={10}
          fill={pulse ? 'var(--surface-brand-soft)' : 'var(--surface-card)'}
          stroke="var(--border-default)"
          strokeWidth={1.25}
          className="transition-colors duration-200 motion-reduce:transition-none"
          style={{ pointerEvents: 'none' }}
        />
        <foreignObject x={81} y={256} width={138} height={83} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
            <Ruler size={13} className="text-blue-600" />
            <span className="text-[10px] font-semibold text-neutral-800">標準化</span>
            <span className="font-mono text-[8px] text-neutral-500">StandardScaler.fit(Train)</span>
            <span className="text-[8px] leading-tight text-neutral-400">同一組 mean/std 套用到 Train・Test</span>
          </div>
        </foreignObject>

        <rect
          x={245}
          y={250}
          width={150}
          height={95}
          rx={10}
          fill={pulse ? 'var(--surface-brand-soft)' : 'var(--surface-card)'}
          stroke="var(--border-default)"
          strokeWidth={1.25}
          className="transition-colors duration-200 motion-reduce:transition-none"
          style={{ pointerEvents: 'none' }}
        />
        <foreignObject x={251} y={256} width={138} height={83} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
            <Cpu size={13} className="text-blue-600" />
            <span className="text-[10px] font-semibold text-neutral-800">訓練</span>
            <span className="font-mono text-[8px] text-neutral-500">AdalineSGD.fit</span>
            <span className="text-[8px] leading-tight text-neutral-400">每 epoch shuffle・可選自適應 η_t</span>
          </div>
        </foreignObject>

        <rect
          x={415}
          y={250}
          width={150}
          height={95}
          rx={10}
          fill={pulse ? 'var(--surface-brand-soft)' : 'var(--surface-card)'}
          stroke="var(--border-default)"
          strokeWidth={1.25}
          className="transition-colors duration-200 motion-reduce:transition-none"
          style={{ pointerEvents: 'none' }}
        />
        <foreignObject x={421} y={256} width={138} height={83} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
            <Target size={13} className="text-blue-600" />
            <span className="text-[10px] font-semibold text-neutral-800">評估</span>
            <span className="font-mono text-[8px] text-neutral-500">predict(Test) → Accuracy</span>
            <span className="text-[8px] leading-tight text-neutral-400">記錄 losses_（各 epoch 平均損失）</span>
          </div>
        </foreignObject>

        <foreignObject x={120} y={372} width={400} height={14} style={{ pointerEvents: 'none' }}>
          <div className="text-center text-[9px] text-blue-600">重複直到 7 種組合都完成</div>
        </foreignObject>

        {/* ---- 結果列（result tray） ---- */}
        <foreignObject x={52} y={428} width={260} height={14}>
          <div className="text-left text-[9.5px] text-neutral-500">已完成結果（未排序，依完成順序累積）</div>
        </foreignObject>

        {Array.from({ length: 7 }).map((_, i) => {
          const filled = iteration > i;
          const combo = COMBOS[i];
          const x = slotX(i);
          if (!filled) {
            return (
              <rect
                key={`slot-${combo.key}`}
                x={x}
                y={TRAY_Y}
                width={SLOT_W}
                height={TRAY_H}
                rx={8}
                fill="none"
                stroke="var(--border-default)"
                strokeDasharray="3 3"
              />
            );
          }
          return (
            <motion.g
              key={`slot-${combo.key}`}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: transDur, ease: 'easeOut' }}
              style={{ transformOrigin: `${x + SLOT_W / 2}px ${TRAY_Y + TRAY_H / 2}px` }}
            >
              <rect x={x} y={TRAY_Y} width={SLOT_W} height={TRAY_H} rx={8} fill="var(--orange-50)" stroke="var(--orange-300)" strokeWidth={1.25} />
              <foreignObject x={x + 3} y={TRAY_Y + 3} width={SLOT_W - 6} height={TRAY_H - 6}>
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
                  <span className="text-[8.5px] font-medium leading-tight text-orange-700">{combo.label}</span>
                  <span className="font-mono text-[10px] font-bold text-orange-600">{pct(combo.accuracy)}</span>
                </div>
              </foreignObject>
            </motion.g>
          );
        })}

        {/* ---- 彙整排序 ---- */}
        <rect x={280} y={560} width={300} height={120} rx={14} fill="var(--orange-50)" stroke="var(--orange-300)" strokeWidth={1.5} />
        <foreignObject x={290} y={568} width={280} height={16}>
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-semibold text-orange-700">
            <ListOrdered size={11} />
            彙整排序（依 Accuracy）
          </div>
        </foreignObject>
        <foreignObject x={300} y={588} width={260} height={84}>
          {trayReady ? (
            <div className="flex h-full w-full flex-col justify-center gap-[2px]">
              {rows.map((c, idx) => (
                <motion.div
                  key={c.key}
                  layout
                  transition={{ duration: layoutDur, ease: 'easeOut' }}
                  className="flex items-center justify-between font-mono text-[8.5px] text-neutral-700"
                >
                  <span className="text-neutral-400">{idx + 1}.</span>
                  <span className="flex-1 truncate px-1 text-left">{c.label}</span>
                  <span className="font-semibold text-orange-600">{pct(c.accuracy)}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9.5px] text-neutral-400">
              等待迴圈完成⋯
            </div>
          )}
        </foreignObject>

        {/* 左側小註：說明兩條分支不需等排序 */}
        <foreignObject x={8} y={572} width={140} height={100}>
          <div className="flex h-full w-full items-center text-[8.5px] leading-snug text-blue-600">
            決策邊界／loss 曲線不需等排序，迴圈跑完（未排序的結果列）即可產出
          </div>
        </foreignObject>

        {/* ---- 落地輸出檔案（四個） ---- */}
        <OutputNode
          x={25}
          y={724}
          w={135}
          h={112}
          active={trayReady}
          icon={<FileChartColumn size={14} />}
          title="決策邊界圖"
          sub="6 張子圖・meshgrid 上色"
          note="僅雙特徵組合適用"
          filename="assignment1_decision_boundaries.png"
        />
        <OutputNode
          x={175}
          y={724}
          w={135}
          h={112}
          active={trayReady}
          icon={<FileChartColumn size={14} />}
          title="Loss 收斂曲線"
          sub="7 條曲線疊圖"
          filename="assignment1_loss_curves.png"
        />
        <OutputNode
          x={325}
          y={724}
          w={135}
          h={112}
          active={sorted}
          icon={<FileText size={14} />}
          title="排序報告"
          sub="含特徵鑑別度結論"
          filename="assignment1_results.txt"
        />
        <OutputNode
          x={475}
          y={724}
          w={135}
          h={112}
          active={sorted}
          icon={<GitCompareArrows size={14} />}
          title="重訓練最佳組合"
          sub="固定 vs 自適應學習率"
          filename="assignment1_adaptive_vs_fixed.png"
        />
      </svg>
    </div>
  );
}
