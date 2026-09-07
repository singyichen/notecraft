/**
 * 核心洞察：這張圖真正要教的不是「流程的先後順序」，而是四道防止「模型偷看
 * 考題／帶錯配方上線」的隔離機制——①測試集切分後立刻封存、②前處理其實是兩條
 * 互不相通的獨立管線、③調參的本質是交叉驗證迴圈（因為 No Free Lunch，沒有
 * 萬能演算法）、④上線與最終評估必須帶著同一套前處理管線。
 *
 * 互動：4 階段 stepper，讀者主動點擊 chevron／步驟圓點累加式推進（不自動播放）。
 * 每個階段新揭露的節點／邊／badge 用 stagger fade-in-y 標出；先前已揭露的元素
 * 保留但降階至 opacity 0.55。唯一例外是「測試集」的封存視覺（虛線框＋鎖頭＋
 * 灰底 badge）：stage1–3 全程 opacity 1.0，直到 stage4 才切換為解封視覺，藉此
 * 讓讀者清楚看到它「一直在那裡、沒有被動過」。
 *
 * 版面：viewBox 640x580，縱向雙欄（左欄＝訓練建模路徑 cx≈155，右欄＝測試／
 * 新資料的隔離與部署路徑 cx≈475），中央窄欄（cx≈320）放最上層的 Raw data
 * collection。CV 迴圈虛線繞到左欄外側（x<80）避免與主線交叉；No Free Lunch
 * 對照 mini-panel 貼在左右欄中間的空白處（gutter，x≈235–390）。
 */

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Database,
  Filter,
  SlidersHorizontal,
  Lock,
  Unlock,
  Cpu,
  Target,
  Award,
  ClipboardCheck,
  FileInput,
  Rocket,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

const VBW = 640
const VBH = 580

const NODE_W = 150
const NODE_H = 50
const TOP_W = 180
const TOP_H = 46

const LEFT_CX = 155
const RIGHT_CX = 475
const TOP_CX = 320

const ROW = { r0: 30, r1: 120, r2: 210, r3: 300, r4: 390, r5: 480 }

type Stage = 1 | 2 | 3 | 4

const STAGE_DOTS: Stage[] = [1, 2, 3, 4]

interface StageInfo {
  stage: Stage
  title: string
  desc: string
  Icon: LucideIcon
}

const STAGE_INFO: StageInfo[] = [
  {
    stage: 1,
    title: '① 測試集何時切開、如何被隔離',
    desc: '原始資料一分岔為訓練集與測試集，測試集在切分的當下就立刻封存，直到最終評估前完全不會被使用或參考。',
    Icon: Lock,
  },
  {
    stage: 2,
    title: '② 前處理其實是兩條獨立管線',
    desc: 'Pipeline 1 套用在切分前的整份原始資料；Pipeline 2 只套用在訓練集上。此時測試集這一側還沒有任何前處理發生。',
    Icon: Filter,
  },
  {
    stage: 3,
    title: '③ 調參其實是交叉驗證迴圈',
    desc: '反覆訓練、評估候選模型，直到選出表現最好的版本才做最終訓練。No Free Lunch 定理：不同資料情境下最佳演算法不同，所以這一步通常要比較多種演算法。',
    Icon: RotateCw,
  },
  {
    stage: 4,
    title: '④ 上線與最終評估都要帶著同一套前處理',
    desc: '測試集在此解封：對它做最後一次評估、以及對新資料上線預測，都必須套用同一套 Final preprocessing pipeline——兩處 badge 長得一模一樣，正是要強調這件事。',
    Icon: Rocket,
  },
]

const ARROW_COLOR = 'var(--neutral-400)'
const LOOP_COLOR = 'var(--blue-500)'

/* ── 揭露包裝：依 revealStage 決定顯示與 stagger／降階 ── */
function Reveal({
  revealStage,
  stage,
  index = 0,
  forceOpacity,
  children,
}: {
  revealStage: Stage
  stage: Stage
  index?: number
  forceOpacity?: number
  children: React.ReactNode
}) {
  const shouldReduce = useReducedMotion()
  if (revealStage > stage) return null
  const isNew = revealStage === stage
  const targetOpacity = forceOpacity ?? (isNew ? 1 : 0.55)
  return (
    <motion.g
      initial={shouldReduce ? false : isNew ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: targetOpacity, y: 0 }}
      transition={{
        duration: shouldReduce ? 0 : 0.28,
        ease: 'easeOut',
        delay: shouldReduce || !isNew ? 0 : index * 0.045,
      }}
    >
      {children}
    </motion.g>
  )
}

/* ── 一般節點：icon + 兩行文字 ── */
function NodeBox({
  cx,
  cy,
  w = NODE_W,
  h = NODE_H,
  lines,
  Icon,
  emphasis,
}: {
  cx: number
  cy: number
  w?: number
  h?: number
  lines: [string, string]
  Icon: LucideIcon
  emphasis?: boolean
}) {
  const x = cx - w / 2
  const y = cy - h / 2
  const border = emphasis ? 'var(--blue-500)' : 'var(--border-subtle)'
  const fill = emphasis ? 'var(--blue-50)' : 'var(--neutral-100)'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={border} strokeWidth={1.4} />
      <foreignObject x={cx - 7} y={y + 6} width={14} height={14}>
        <Icon size={14} color="var(--blue-600)" />
      </foreignObject>
      <text
        x={cx}
        y={y + h - 18}
        fontSize={11.5}
        fontWeight={700}
        fill="var(--neutral-700)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {lines[0]}
      </text>
      <text
        x={cx}
        y={y + h - 6}
        fontSize={10.5}
        fontWeight={500}
        fill="var(--text-muted)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {lines[1]}
      </text>
    </g>
  )
}

/* ── 測試集節點：封存／解封兩態，封存視覺全程 opacity 1.0（由外層 Reveal 保證） ── */
function TestDatasetNode({ cx, cy, unlocked }: { cx: number; cy: number; unlocked: boolean }) {
  const shouldReduce = useReducedMotion()
  const w = NODE_W
  const h = NODE_H
  const x = cx - w / 2
  const y = cy - h / 2
  const border = unlocked ? 'var(--blue-500)' : 'var(--border-strong)'
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="var(--neutral-100)"
        stroke={border}
        strokeWidth={1.6}
        strokeDasharray={unlocked ? undefined : '5 4'}
      />
      <foreignObject x={cx - 7} y={y + 6} width={14} height={14}>
        <AnimatePresence mode="wait" initial={false}>
          {unlocked ? (
            <motion.div
              key="unlock"
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduce ? 0 : 0.2 }}
            >
              <Unlock size={14} color="var(--blue-600)" />
            </motion.div>
          ) : (
            <motion.div
              key="lock"
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduce ? 0 : 0.2 }}
            >
              <Lock size={14} color="var(--blue-600)" />
            </motion.div>
          )}
        </AnimatePresence>
      </foreignObject>
      <text
        x={cx}
        y={y + h - 18}
        fontSize={11.5}
        fontWeight={700}
        fill="var(--neutral-700)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        測試集
      </text>
      <text
        x={cx}
        y={y + h - 6}
        fontSize={10.5}
        fontWeight={500}
        fill="var(--text-muted)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {unlocked ? '（已解封）' : '（切分後封存）'}
      </text>
      <rect
        x={cx - 58}
        y={y + h + 6}
        width={116}
        height={18}
        rx={9}
        fill={unlocked ? 'var(--success-50)' : 'var(--neutral-100)'}
      />
      <text
        x={cx}
        y={y + h + 18}
        fontSize={10.5}
        fontWeight={700}
        textAnchor="middle"
        fill={unlocked ? 'var(--success-500)' : 'var(--neutral-600)'}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {unlocked ? '已用於最終評估' : '封存至最終評估'}
      </text>
    </g>
  )
}

/* ── Pipeline / Final preprocessing pipeline badge：Pipeline2 與 Final pipeline 視覺完全相同 ── */
function PipelineBadge({
  cx,
  cy,
  label,
  tone,
  Icon,
  width,
}: {
  cx: number
  cy: number
  label: string
  tone: 'indigo' | 'emerald'
  Icon: LucideIcon
  width: number
}) {
  const bg = tone === 'indigo' ? 'var(--blue-100)' : 'var(--orange-50)'
  const fg = tone === 'indigo' ? 'var(--blue-700)' : 'var(--orange-600)'
  const x = cx - width / 2
  return (
    <g>
      <rect x={x} y={cy - 11} width={width} height={22} rx={11} fill={bg} />
      <foreignObject x={x + 7} y={cy - 7} width={14} height={14}>
        <Icon size={13} color={fg} />
      </foreignObject>
      <text
        x={x + 25}
        y={cy + 3.5}
        fontSize={10.5}
        fontWeight={700}
        fill={fg}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
    </g>
  )
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = ARROW_COLOR,
  dashed,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  dashed?: boolean
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={1.8}
      strokeDasharray={dashed ? '4 4' : undefined}
      markerEnd="url(#wf-arrow)"
    />
  )
}

/* ── No Free Lunch 對照 mini-panel：貼在 CV 迴圈與左欄之間的空白處 ── */
interface Scenario {
  key: string
  bars: { name: 'X' | 'Y' | 'Z'; pct: number }[]
  best: string
}

const BAR_COLORS: Record<string, string> = {
  X: 'var(--blue-500)',
  Y: 'var(--orange-500)',
  Z: 'var(--blue-300)',
}

const SCENARIOS: Scenario[] = [
  { key: 'A', bars: [{ name: 'X', pct: 88 }, { name: 'Y', pct: 52 }, { name: 'Z', pct: 38 }], best: 'X' },
  { key: 'B', bars: [{ name: 'X', pct: 42 }, { name: 'Y', pct: 90 }, { name: 'Z', pct: 58 }], best: 'Y' },
  { key: 'C', bars: [{ name: 'X', pct: 48 }, { name: 'Y', pct: 36 }, { name: 'Z', pct: 92 }], best: 'Z' },
]

function NflPanel({ x, y, shouldReduce }: { x: number; y: number; shouldReduce: boolean }) {
  const rowH = 42
  return (
    <g>
      <rect x={x} y={y} width={158} height={168} rx={8} fill="var(--surface-sunken)" />
      <text
        x={x + 9}
        y={y + 17}
        fontSize={10}
        fontWeight={700}
        fill="var(--text-strong)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        沒有萬能演算法（NFL）
      </text>
      {SCENARIOS.map((sc, sIdx) => {
        const rowY = y + 32 + sIdx * rowH
        return (
          <g key={sc.key}>
            <text
              x={x + 9}
              y={rowY}
              fontSize={9.5}
              fontWeight={600}
              fill="var(--text-muted)"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              情境 {sc.key} ・ 最佳：{sc.best}
            </text>
            {sc.bars.map((bar, bIdx) => (
              <motion.rect
                key={bar.name}
                x={x + 9}
                y={rowY + 6 + bIdx * 7}
                height={4}
                rx={2}
                fill={BAR_COLORS[bar.name]}
                initial={shouldReduce ? false : { width: 0 }}
                animate={{ width: (bar.pct / 100) * 128 }}
                transition={{
                  duration: shouldReduce ? 0 : 0.32,
                  ease: 'easeOut',
                  delay: shouldReduce ? 0 : (sIdx * 3 + bIdx) * 0.05,
                }}
              />
            ))}
          </g>
        )
      })}
      <foreignObject x={x + 9} y={y + 150} width={14} height={14}>
        <ArrowRight size={12} color="var(--text-muted)" />
      </foreignObject>
      <text
        x={x + 26}
        y={y + 160}
        fontSize={9.5}
        fill="var(--text-muted)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        所以要比較多種演算法
      </text>
    </g>
  )
}

export default function MlWeek1SystemWorkflow() {
  const shouldReduce = useReducedMotion()
  const [stage, setStage] = useState<Stage>(1)

  const goPrev = () => setStage((s) => (s > 1 ? ((s - 1) as Stage) : s))
  const goNext = () => setStage((s) => (s < 4 ? ((s + 1) as Stage) : s))
  const unlocked = stage === 4

  const current = STAGE_INFO[stage - 1]

  // 節點座標（左欄 x=80..230，右欄 x=400..550，中央頂部 x=230..410）
  const topBottom = ROW.r0 + TOP_H / 2 // 53
  const branchY = topBottom + 25 // 78
  const r1Top = ROW.r1 - NODE_H / 2 // 95
  const r1Bottom = ROW.r1 + NODE_H / 2 // 145
  const r2Top = ROW.r2 - NODE_H / 2 // 185
  const r2Bottom = ROW.r2 + NODE_H / 2 // 235
  const r3Top = ROW.r3 - NODE_H / 2 // 275
  const r3Bottom = ROW.r3 + NODE_H / 2 // 325
  const r4Top = ROW.r4 - NODE_H / 2 // 365
  const r4Bottom = ROW.r4 + NODE_H / 2 // 415
  const r5Top = ROW.r5 - NODE_H / 2 // 455
  const r5Bottom = ROW.r5 + NODE_H / 2 // 505

  const leftEdge = LEFT_CX - NODE_W / 2 // 80
  const leftRight = LEFT_CX + NODE_W / 2 // 230
  const rightEdge = RIGHT_CX - NODE_W / 2 // 400

  const ariaLabel =
    stage === 1
      ? '流程圖第 1 階段：原始資料切分為訓練集與測試集，測試集立即封存。'
      : stage === 2
        ? '流程圖第 2 階段：前處理分為套用在整份原始資料的 Pipeline 1，以及只套用在訓練集的 Pipeline 2；測試集尚未經過任何前處理。'
        : stage === 3
          ? '流程圖第 3 階段：ML 演算法透過交叉驗證迴圈反覆訓練與評估候選模型，選定後做最終訓練得到最終預測模型；No Free Lunch 定理說明需要比較多種演算法。'
          : '流程圖第 4 階段：測試集解封，與最終預測模型搭配同一套 Final preprocessing pipeline 做最後一次評估；新資料也套用同一套管線後由最終模型上線預測。'

  return (
    <div className="not-prose w-full space-y-5" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* 標題與控制列 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-strong)' }}>
          建立 ML 系統的完整工作流程
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={stage === 1}
            className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: stage === 1 ? 'var(--text-muted)' : 'var(--text-body)',
              background: 'var(--surface-card)',
              opacity: stage === 1 ? 0.5 : 1,
              cursor: stage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            上一步
          </button>

          <div className="flex items-center gap-1.5" role="group" aria-label="跳至階段">
            {STAGE_DOTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                aria-current={stage === s}
                aria-label={`階段 ${s}`}
                className="text-[11px] font-bold transition-colors"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-pill)',
                  background: stage === s ? 'var(--blue-600)' : 'var(--neutral-100)',
                  color: stage === s ? '#ffffff' : 'var(--neutral-600)',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={stage === 4}
            className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: stage === 4 ? 'var(--text-muted)' : 'var(--text-body)',
              background: 'var(--surface-card)',
              opacity: stage === 4 ? 0.5 : 1,
              cursor: stage === 4 ? 'not-allowed' : 'pointer',
            }}
          >
            下一步
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 主流程圖 */}
      <p className="sr-only">
        十個節點依序為：原始資料收集（Raw data collection）；訓練集（Training dataset）；測試集（Test
        dataset，切分後立即封存，直到最終評估才解封）；訓練集（已前處理）（Processed training
        dataset，套用 Pipeline 2）；ML 演算法：超參數選擇與訓練（ML algorithm：hyperparameter choice +
        training）；候選預測模型（Predictive model candidate，透過交叉驗證反覆評估）；最終預測模型（Final
        predictive model，選定並以完整訓練集重新訓練）；最終評估（Evaluate，以測試集搭配 Final
        preprocessing pipeline 做最後一次評估）；新資料（New dataset，上線後的新輸入）；套用／預測
        （Apply/Predict，套用同一套 Final preprocessing pipeline 後由最終模型預測）。
        四道隔離規則：一、測試集在切分當下就被隔離封存，全程不能用於訓練或調參；二、前處理是兩條獨立管線，
        Pipeline 1 套用於切分前的整份原始資料，Pipeline 2 只套用於訓練集；三、調參的本質是交叉驗證迴圈，因為
        No Free Lunch 定理沒有萬能演算法，需要反覆比較多種演算法；四、最終上線與最終評估測試集都必須套用同一套
        Final preprocessing pipeline，確保前後一致。
      </p>
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <marker id="wf-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={ARROW_COLOR} />
          </marker>
          <marker id="wf-loop-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={LOOP_COLOR} />
          </marker>
        </defs>

        {/* stage 1 : raw data + split + training/test */}
        <Reveal revealStage={1} stage={stage} index={0}>
          <NodeBox cx={TOP_CX} cy={ROW.r0} w={TOP_W} h={TOP_H} lines={['原始資料', '收集']} Icon={Database} />
        </Reveal>
        <Reveal revealStage={1} stage={stage} index={1}>
          <g>
            <line x1={TOP_CX} y1={topBottom} x2={TOP_CX} y2={branchY} stroke={ARROW_COLOR} strokeWidth={1.8} />
            <Arrow x1={TOP_CX} y1={branchY} x2={LEFT_CX} y2={r1Top} />
            <Arrow x1={TOP_CX} y1={branchY} x2={RIGHT_CX} y2={r1Top} />
          </g>
        </Reveal>
        <Reveal revealStage={1} stage={stage} index={2}>
          <NodeBox cx={LEFT_CX} cy={ROW.r1} lines={['訓練集', '（切分後）']} Icon={Database} />
        </Reveal>
        {/* 測試集封存視覺：全程 opacity 1.0，不受降階規則影響 */}
        <Reveal revealStage={1} stage={stage} index={3} forceOpacity={1}>
          <TestDatasetNode cx={RIGHT_CX} cy={ROW.r1} unlocked={unlocked} />
        </Reveal>

        {/* stage 2 : pipeline 1 / pipeline 2 / processed training dataset */}
        <Reveal revealStage={2} stage={stage} index={0}>
          <PipelineBadge cx={TOP_CX} cy={(topBottom + branchY) / 2} label="Pipeline 1" tone="indigo" Icon={Filter} width={84} />
        </Reveal>
        <Reveal revealStage={2} stage={stage} index={1}>
          <Arrow x1={LEFT_CX} y1={r1Bottom} x2={LEFT_CX} y2={r2Top} />
        </Reveal>
        <Reveal revealStage={2} stage={stage} index={2}>
          <NodeBox cx={LEFT_CX} cy={ROW.r2} lines={['訓練集', '（已前處理）']} Icon={SlidersHorizontal} />
        </Reveal>
        <Reveal revealStage={2} stage={stage} index={3}>
          <PipelineBadge
            cx={LEFT_CX}
            cy={(r1Bottom + r2Top) / 2}
            label="Pipeline 2"
            tone="emerald"
            Icon={SlidersHorizontal}
            width={90}
          />
        </Reveal>

        {/* stage 3 : ML algorithm / candidate / CV loop / NFL / final model */}
        <Reveal revealStage={3} stage={stage} index={0}>
          <Arrow x1={LEFT_CX} y1={r2Bottom} x2={LEFT_CX} y2={r3Top} />
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={1}>
          <NodeBox cx={LEFT_CX} cy={ROW.r3} lines={['ML 演算法', '超參數選擇＋訓練']} Icon={Cpu} emphasis />
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={2}>
          <Arrow x1={LEFT_CX} y1={r3Bottom} x2={LEFT_CX} y2={r4Top} />
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={3}>
          <NodeBox cx={LEFT_CX} cy={ROW.r4} lines={['候選', '預測模型']} Icon={Target} />
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={4}>
          <g>
            <path
              id="cv-loop-path"
              d={`M${leftEdge},${ROW.r4} C${leftEdge - 60},${ROW.r4} ${leftEdge - 60},${ROW.r3} ${leftEdge},${ROW.r3}`}
              fill="none"
              stroke={LOOP_COLOR}
              strokeWidth={1.8}
              strokeDasharray="3 5"
              markerEnd="url(#wf-loop-arrow)"
            />
            {!shouldReduce && (
              <circle r={3.5} fill={LOOP_COLOR}>
                <animateMotion dur="2.4s" repeatCount="indefinite">
                  <mpath href="#cv-loop-path" />
                </animateMotion>
              </circle>
            )}
          </g>
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={5}>
          <g>
            <foreignObject x={4} y={ROW.r3 + 13} width={13} height={13}>
              <RotateCw size={12} color={LOOP_COLOR} />
            </foreignObject>
            <text x={2} y={ROW.r3 + 40} fontSize={9} fontWeight={600} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              交叉驗證
            </text>
            <text x={2} y={ROW.r3 + 52} fontSize={9} fontWeight={600} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              反覆迭代
            </text>
          </g>
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={6}>
          <NflPanel x={235} y={250} shouldReduce={!!shouldReduce} />
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={7}>
          <g>
            <Arrow x1={LEFT_CX} y1={r4Bottom} x2={LEFT_CX} y2={r5Top} />
            <text x={192} y={438} fontSize={9.5} fontWeight={600} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              選定→
            </text>
            <text x={192} y={450} fontSize={9.5} fontWeight={600} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
              最終訓練
            </text>
          </g>
        </Reveal>
        <Reveal revealStage={3} stage={stage} index={8}>
          <NodeBox cx={LEFT_CX} cy={ROW.r5} lines={['最終', '預測模型']} Icon={Award} emphasis />
        </Reveal>

        {/* stage 4 : final preprocessing pipeline x2 / evaluate / new dataset / apply */}
        <Reveal revealStage={4} stage={stage} index={0}>
          <Arrow x1={RIGHT_CX} y1={r1Bottom} x2={RIGHT_CX} y2={r3Top} />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={1}>
          <PipelineBadge
            cx={RIGHT_CX}
            cy={(r1Bottom + r3Top) / 2}
            label="最終前處理管線"
            tone="emerald"
            Icon={SlidersHorizontal}
            width={116}
          />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={2}>
          <NodeBox cx={RIGHT_CX} cy={ROW.r3} lines={['最終評估', '（測試集）']} Icon={ClipboardCheck} emphasis />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={3}>
          <g>
            <rect x={RIGHT_CX + 46} y={r3Top - 22} width={64} height={17} rx={8.5} fill="var(--blue-50)" />
            <text
              x={RIGHT_CX + 78}
              y={r3Top - 10}
              fontSize={9.5}
              fontWeight={700}
              textAnchor="middle"
              fill="var(--blue-600)"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              僅此一次
            </text>
          </g>
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={4}>
          <g>
            <path
              d={`M${LEFT_CX},${r5Bottom} L${LEFT_CX},530 L610,530 L610,${ROW.r3} L${RIGHT_CX + NODE_W / 2},${ROW.r3}`}
              fill="none"
              stroke="var(--blue-300)"
              strokeWidth={1.4}
              strokeDasharray="2 5"
              markerEnd="url(#wf-loop-arrow)"
            />
            <text x={420} y={524} fontSize={9} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
              同一套模型
            </text>
          </g>
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={5}>
          <NodeBox cx={RIGHT_CX} cy={ROW.r4} lines={['新資料', '（上線輸入）']} Icon={FileInput} />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={6}>
          <Arrow x1={RIGHT_CX} y1={r4Bottom} x2={RIGHT_CX} y2={r5Top} />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={7}>
          <PipelineBadge
            cx={RIGHT_CX}
            cy={(r4Bottom + r5Top) / 2}
            label="最終前處理管線"
            tone="emerald"
            Icon={SlidersHorizontal}
            width={116}
          />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={8}>
          <NodeBox cx={RIGHT_CX} cy={ROW.r5} lines={['套用', '／ 預測']} Icon={Rocket} emphasis />
        </Reveal>
        <Reveal revealStage={4} stage={stage} index={9}>
          <g>
            <Arrow x1={leftRight} y1={ROW.r5} x2={rightEdge} y2={ROW.r5} color="var(--blue-500)" />
            <text x={315} y={468} fontSize={9.5} fontWeight={600} textAnchor="middle" fill="var(--blue-600)" style={{ fontFamily: 'var(--font-sans)' }}>
              上線套用
            </text>
          </g>
        </Reveal>
      </svg>

      {/* 階段說明卡片 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduce ? 0 : 0.2 }}
          className="flex items-start gap-2.5"
          style={{
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          <div style={{ color: 'var(--blue-600)', flexShrink: 0, marginTop: 1 }}>
            <current.Icon size={16} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold" style={{ color: 'var(--text-strong)' }}>
              {current.title}
            </p>
            <p className="text-[12.5px] leading-snug" style={{ color: 'var(--text-body)' }}>
              {current.desc}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
