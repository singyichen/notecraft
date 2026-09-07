import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowLeft, Play, Pause, Repeat } from 'lucide-react';
import { clsx } from 'clsx';

type Direction = 'forward' | 'backward';
type NodeState = 'idle' | 'settled' | 'active';
type SegVariant = 'flow' | 'gradient';
interface SegState {
  state: NodeState;
  variant: SegVariant;
}
interface Stage {
  formula: string;
  description: string;
}

const FORWARD_STAGES: Stage[] = [
  { formula: 'z_h = X · W_h + b_h', description: '輸入向量乘上第一層權重矩陣、加上偏值，得到隱藏層的淨輸入。' },
  { formula: 'a_h = sigmoid(z_h)', description: '淨輸入通過 sigmoid 函式，成為隱藏層的激活值。' },
  { formula: 'z_out = a_h · W_out + b_out', description: '隱藏層激活值乘上第二層權重矩陣，得到輸出層的淨輸入。' },
  { formula: 'a_out = sigmoid(z_out)', description: '輸出層激活值出爐，與 one-hot 標籤比對後得到 MSE 損失。' },
];

const BACKWARD_STAGES: Stage[] = [
  { formula: "δ_out = (a_out − y) × sigmoid'(z_out)", description: '責任先在輸出層產生：預測與標籤的落差，乘上輸出層的斜率。' },
  { formula: "δ_h = (δ_out · W_out^T) × sigmoid'(z_h)", description: '責任沿著權重轉置往回送，分攤到每個隱藏神經元頭上。' },
  { formula: '∇W_h , ∇W_out', description: '責任換算成梯度，落在 W_h 與 W_out 這兩組權重上，交給優化器更新。' },
];

const VIEW_W = 620;
const VIEW_H = 360;
const INPUT_X = 55;
const HIDDEN_X = 300;
const OUTPUT_X = 470;
const MID_Y = 170;

const INPUT_NODE_YS = [40, 105, 170, 300];
const HIDDEN_NODE_YS = [60, 170, 300];
const OUTPUT_NODES: { y: number; label: string }[] = [
  { y: 50, label: '0' },
  { y: 170, label: '1' },
  { y: 300, label: '9' },
];
const ELLIPSIS_Y = 235;

function getSegments(direction: Direction, stage: number): { inputHidden: SegState; hiddenOutput: SegState } {
  if (direction === 'forward') {
    const inputHidden: SegState = stage === 0 ? { state: 'active', variant: 'flow' } : { state: 'settled', variant: 'flow' };
    const hiddenOutput: SegState =
      stage < 2 ? { state: 'idle', variant: 'flow' } : stage === 2 ? { state: 'active', variant: 'flow' } : { state: 'settled', variant: 'flow' };
    return { inputHidden, hiddenOutput };
  }
  const hiddenOutput: SegState =
    stage < 1 ? { state: 'idle', variant: 'flow' } : stage === 1 ? { state: 'active', variant: 'flow' } : { state: 'settled', variant: 'gradient' };
  const inputHidden: SegState = stage < 2 ? { state: 'idle', variant: 'flow' } : { state: 'active', variant: 'gradient' };
  return { inputHidden, hiddenOutput };
}

function getNodeStates(direction: Direction, stage: number): { hidden: NodeState; output: NodeState } {
  if (direction === 'forward') {
    return {
      hidden: stage >= 1 ? 'active' : 'idle',
      output: stage >= 3 ? 'active' : 'idle',
    };
  }
  return {
    output: stage === 0 ? 'active' : 'settled',
    hidden: stage < 1 ? 'idle' : stage === 1 ? 'active' : 'settled',
  };
}

function lineAttrs(seg: SegState, color: string): { stroke: string; strokeWidth: number; opacity: number } {
  if (seg.state === 'active') return { stroke: color, strokeWidth: 2.2, opacity: 0.95 };
  if (seg.state === 'settled') return { stroke: color, strokeWidth: 1.4, opacity: 0.4 };
  return { stroke: 'var(--neutral-300)', strokeWidth: 1, opacity: 0.35 };
}

function nodeAttrs(state: NodeState, color: string): { fill: string; fillOpacity: number; stroke: string; strokeOpacity: number } {
  if (state === 'active') return { fill: color, fillOpacity: 1, stroke: color, strokeOpacity: 1 };
  if (state === 'settled') return { fill: color, fillOpacity: 0.28, stroke: color, strokeOpacity: 0.85 };
  return { fill: 'var(--neutral-100)', fillOpacity: 1, stroke: 'var(--neutral-300)', strokeOpacity: 1 };
}

export default function MlWeek10TwoDirections() {
  const shouldReduceMotion = useReducedMotion();
  const [direction, setDirection] = useState<Direction>('forward');
  const [stageIndex, setStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const stages = direction === 'forward' ? FORWARD_STAGES : BACKWARD_STAGES;
  const effectiveStageIndex = shouldReduceMotion ? stages.length - 1 : stageIndex;
  const directionColor = direction === 'forward' ? 'var(--blue-500)' : 'var(--orange-500)';

  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return undefined;
    if (stageIndex >= stages.length - 1) {
      setIsPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setStageIndex((s) => Math.min(s + 1, stages.length - 1));
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [isPlaying, stageIndex, stages.length, shouldReduceMotion]);

  const switchDirection = (d: Direction) => {
    if (d === direction) return;
    setDirection(d);
    setStageIndex(0);
    setIsPlaying(false);
  };

  const handlePlay = () => {
    setStageIndex(0);
    setIsPlaying(true);
  };

  const jumpTo = (i: number) => {
    setStageIndex(i);
    setIsPlaying(false);
  };

  const segments = getSegments(direction, effectiveStageIndex);
  const nodeStates = getNodeStates(direction, effectiveStageIndex);
  const transitionSpeed = shouldReduceMotion ? 0 : 0.25;

  const inputHiddenChevronX = (INPUT_X + HIDDEN_X) / 2;
  const hiddenOutputChevronX = (HIDDEN_X + OUTPUT_X) / 2;
  const chevronY = 330;
  const pointRight = direction === 'forward';

  const inputHiddenFlowing = !shouldReduceMotion && segments.inputHidden.state === 'active' && segments.inputHidden.variant === 'flow';
  const hiddenOutputFlowing = !shouldReduceMotion && segments.hiddenOutput.state === 'active' && segments.hiddenOutput.variant === 'flow';

  const lossVisible = direction === 'forward' && effectiveStageIndex >= 3;

  const chevronPoints = (x: number, y: number, right: boolean) =>
    right ? `${x - 7},${y - 9} ${x + 9},${y} ${x - 7},${y + 9}` : `${x + 7},${y - 9} ${x - 9},${y} ${x + 7},${y + 9}`;

  return (
    <div className="not-prose space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full p-1 gap-1" style={{ background: 'var(--neutral-100)' }}>
          <button
            type="button"
            onClick={() => switchDirection('forward')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200"
            style={
              direction === 'forward'
                ? { background: 'var(--blue-500)', color: '#ffffff' }
                : { color: 'var(--neutral-600)' }
            }
          >
            <ArrowRight size={14} />
            前向傳播
          </button>
          <button
            type="button"
            onClick={() => switchDirection('backward')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200"
            style={
              direction === 'backward'
                ? { background: 'var(--orange-500)', color: '#ffffff' }
                : { color: 'var(--neutral-600)' }
            }
          >
            <ArrowLeft size={14} />
            反向傳播
          </button>
        </div>

        {!shouldReduceMotion && (
          <button
            type="button"
            onClick={handlePlay}
            disabled={isPlaying}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors duration-200',
              isPlaying && 'opacity-50'
            )}
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)' }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? '播放中' : stageIndex === stages.length - 1 ? '重播' : '播放'}
          </button>
        )}

        {shouldReduceMotion && (
          <span className="text-xs" style={{ color: 'var(--neutral-500)' }}>
            已依系統設定停用動畫，以下顯示完整流程
          </span>
        )}
      </div>

      {!shouldReduceMotion && (
        <div className="flex items-center gap-2">
          {stages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`第 ${i + 1} 階段`}
              className="h-2.5 rounded-full transition-all duration-200"
              style={{
                width: i === stageIndex ? 20 : 10,
                background: i <= stageIndex ? directionColor : 'var(--neutral-300)',
              }}
            />
          ))}
        </div>
      )}

      {/* Diagram */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={direction === 'forward' ? 'MLP 前向傳播資料流示意圖' : 'MLP 反向傳播資料流示意圖'}
      >
        <text x={VIEW_W / 2} y={18} textAnchor="middle" fontSize={14} fontWeight={700} fill={directionColor}>
          {stages[effectiveStageIndex].formula}
        </text>

        {/* mesh: input -> hidden */}
        {INPUT_NODE_YS.map((iy) =>
          HIDDEN_NODE_YS.map((hy) => (
            <motion.line
              key={`ih-${iy}-${hy}`}
              x1={INPUT_X}
              y1={iy}
              x2={HIDDEN_X}
              y2={hy}
              animate={lineAttrs(segments.inputHidden, directionColor)}
              transition={{ duration: transitionSpeed, ease: 'easeOut' }}
              strokeDasharray={segments.inputHidden.variant === 'gradient' ? '5 4' : undefined}
            />
          ))
        )}

        {/* mesh: hidden -> output */}
        {HIDDEN_NODE_YS.map((hy) =>
          OUTPUT_NODES.map((o) => (
            <motion.line
              key={`ho-${hy}-${o.y}`}
              x1={HIDDEN_X}
              y1={hy}
              x2={OUTPUT_X}
              y2={o.y}
              animate={lineAttrs(segments.hiddenOutput, directionColor)}
              transition={{ duration: transitionSpeed, ease: 'easeOut' }}
              strokeDasharray={segments.hiddenOutput.variant === 'gradient' ? '5 4' : undefined}
            />
          ))
        )}

        {/* flow dots */}
        {inputHiddenFlowing && (
          <motion.circle
            key={`flow-ih-${direction}-${stageIndex}`}
            r={4}
            fill={directionColor}
            cy={MID_Y}
            initial={{ cx: direction === 'forward' ? INPUT_X : HIDDEN_X, opacity: 0 }}
            animate={{ cx: direction === 'forward' ? HIDDEN_X : INPUT_X, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}
        {hiddenOutputFlowing && (
          <motion.circle
            key={`flow-ho-${direction}-${stageIndex}`}
            r={4}
            fill={directionColor}
            cy={MID_Y}
            initial={{ cx: direction === 'forward' ? HIDDEN_X : OUTPUT_X, opacity: 0 }}
            animate={{ cx: direction === 'forward' ? OUTPUT_X : HIDDEN_X, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}

        {/* input nodes */}
        {INPUT_NODE_YS.map((iy) => (
          <circle key={`in-${iy}`} cx={INPUT_X} cy={iy} r={7} fill="var(--neutral-100)" stroke="var(--neutral-300)" strokeWidth={1.2} />
        ))}
        {[ELLIPSIS_Y - 8, ELLIPSIS_Y, ELLIPSIS_Y + 8].map((y) => (
          <circle key={`in-dot-${y}`} cx={INPUT_X} cy={y} r={1.6} fill="var(--neutral-400)" />
        ))}

        {/* hidden nodes */}
        {HIDDEN_NODE_YS.map((hy) => (
          <motion.circle
            key={`hid-${hy}`}
            cx={HIDDEN_X}
            cy={hy}
            r={7}
            strokeWidth={1.6}
            animate={nodeAttrs(nodeStates.hidden, directionColor)}
            transition={{ duration: transitionSpeed, ease: 'easeOut' }}
          />
        ))}
        {[ELLIPSIS_Y - 8, ELLIPSIS_Y, ELLIPSIS_Y + 8].map((y) => (
          <circle key={`hid-dot-${y}`} cx={HIDDEN_X} cy={y} r={1.6} fill="var(--neutral-400)" />
        ))}

        {/* output nodes */}
        {OUTPUT_NODES.map((o) => {
          const attrs = nodeAttrs(nodeStates.output, directionColor);
          return (
            <g key={`out-${o.y}`}>
              <motion.circle
                cx={OUTPUT_X}
                cy={o.y}
                r={12}
                strokeWidth={1.6}
                animate={attrs}
                transition={{ duration: transitionSpeed, ease: 'easeOut' }}
              />
              <text
                x={OUTPUT_X}
                y={o.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill={nodeStates.output === 'active' ? '#ffffff' : 'var(--neutral-700)'}
              >
                {o.label}
              </text>
            </g>
          );
        })}
        {[ELLIPSIS_Y - 8, ELLIPSIS_Y, ELLIPSIS_Y + 8].map((y) => (
          <circle key={`out-dot-${y}`} cx={OUTPUT_X} cy={y} r={1.6} fill="var(--neutral-400)" />
        ))}

        {/* segment chevrons + weight labels */}
        <motion.polygon
          points={chevronPoints(inputHiddenChevronX, chevronY, pointRight)}
          fill={directionColor}
          animate={{ opacity: segments.inputHidden.state === 'active' && segments.inputHidden.variant === 'flow' ? 1 : 0 }}
          transition={{ duration: transitionSpeed, ease: 'easeOut' }}
        />
        {segments.inputHidden.variant === 'gradient' && segments.inputHidden.state !== 'idle' && (
          <motion.text
            x={inputHiddenChevronX}
            y={chevronY + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={directionColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: transitionSpeed, ease: 'easeOut' }}
          >
            {'∇'}
          </motion.text>
        )}
        <text x={inputHiddenChevronX} y={chevronY + 26} textAnchor="middle" fontSize={12} fill="var(--neutral-500)">
          W_h
        </text>

        <motion.polygon
          points={chevronPoints(hiddenOutputChevronX, chevronY, pointRight)}
          fill={directionColor}
          animate={{ opacity: segments.hiddenOutput.state === 'active' && segments.hiddenOutput.variant === 'flow' ? 1 : 0 }}
          transition={{ duration: transitionSpeed, ease: 'easeOut' }}
        />
        {segments.hiddenOutput.variant === 'gradient' && segments.hiddenOutput.state !== 'idle' && (
          <motion.text
            x={hiddenOutputChevronX}
            y={chevronY + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={directionColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: transitionSpeed, ease: 'easeOut' }}
          >
            {'∇'}
          </motion.text>
        )}
        <text x={hiddenOutputChevronX} y={chevronY + 26} textAnchor="middle" fontSize={12} fill="var(--neutral-500)">
          W_out
        </text>

        {/* loss annotation */}
        {lossVisible && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: transitionSpeed, ease: 'easeOut' }}>
            <text x={OUTPUT_X + 35} y={160} fontSize={12} fontWeight={700} fill={directionColor}>
              MSE
            </text>
            <text x={OUTPUT_X + 35} y={176} fontSize={12} fill={directionColor}>
              {'= ½Σ(y−a_out)²'}
            </text>
          </motion.g>
        )}
      </svg>

      {/* layer captions (Chinese labels live in the DOM, not the SVG) */}
      <div className="grid grid-cols-3 text-[11px]" style={{ color: 'var(--neutral-500)' }}>
        <span className="text-left">輸入層 · 784 像素</span>
        <span className="text-center">隱藏層 · 50 神經元</span>
        <span className="text-right">輸出層 · 10 類別（0–9）</span>
      </div>

      {/* stage description */}
      <div aria-live="polite">
        {!shouldReduceMotion ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${direction}-${stageIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-lg p-3 text-sm"
              style={{ background: 'var(--surface-sunken)' }}
            >
              <div className="font-mono text-[13px] font-semibold mb-1" style={{ color: directionColor }}>
                {stages[stageIndex].formula}
              </div>
              <p style={{ color: 'var(--text-body)' }}>{stages[stageIndex].description}</p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div key={i} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface-sunken)' }}>
                <div className="font-mono text-[13px] font-semibold mb-1" style={{ color: directionColor }}>
                  {s.formula}
                </div>
                <p style={{ color: 'var(--text-body)' }}>{s.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* core insight */}
      <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: 'var(--surface-brand-soft)' }}>
        <Repeat size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--blue-600)' }} />
        <p className="text-sm" style={{ color: 'var(--text-strong)' }}>
          核心洞察：同一組權重，前向送訊號、反向送責任——兩者互為轉置。
        </p>
      </div>
    </div>
  );
}
