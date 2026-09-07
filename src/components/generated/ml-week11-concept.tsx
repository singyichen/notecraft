/**
 * 核心洞察：PyTorch 的五層抽象堆疊，往上走省下的是樣板程式碼（bar 越畫越窄），
 * 付出的代價是出錯時要往下探的層數越來越多（bar 顏色越畫越深、右側錯誤提示
 * 離 bar 本體越來越遠）。右側「一次訓練迭代的五步驟」多數步驟由第 3 層
 * （nn.Module／optim）執行，唯獨 backward() 是第 2 層（autograd）沿計算圖
 * 往回推——用不同顏色的細線把這個例外標出來。
 */

import {
  Sigma,
  GitBranch,
  Layers,
  Blocks,
  Zap,
  TriangleAlert,
  Target,
  Gauge,
  ArrowLeft,
  RefreshCw,
  Eraser,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react'

const TIP_ANCHOR_X = 500
const OWNER_DOT_X = 760
const STEP_X = 800
const STEP_W = 160
const STEP_H = 60

interface LayerRowProps {
  x: number
  y: number
  w: number
  h: number
  fill: string
  textColor: string
  Icon: LucideIcon
  title: string
  subtitle: string
  tipLines: string[]
}

function LayerRow({ x, y, w, h, fill, textColor, Icon, title, subtitle, tipLines }: LayerRowProps) {
  const cy = y + h / 2
  const rightEdge = x + w
  const lineHeight = 13
  const textStartY = cy - ((tipLines.length - 1) * lineHeight) / 2 + 4

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} />
      <foreignObject x={x + 16} y={cy - 9} width={18} height={18}>
        <Icon size={18} color={textColor} />
      </foreignObject>
      <text
        x={x + 44}
        y={cy - 6}
        fontSize={14}
        fontWeight={700}
        fill={textColor}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {title}
      </text>
      <text
        x={x + 44}
        y={cy + 12}
        fontSize={11}
        fontWeight={500}
        fill={textColor}
        opacity={0.88}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {subtitle}
      </text>

      {/* 由 bar 右緣連到固定的提示欄：bar 越窄，這條線越長 —— 視覺化「越往上出錯越遠」 */}
      <line
        x1={rightEdge}
        y1={cy}
        x2={TIP_ANCHOR_X}
        y2={cy}
        stroke="var(--neutral-300)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      <foreignObject x={TIP_ANCHOR_X} y={cy - 7} width={16} height={16}>
        <TriangleAlert size={14} color="var(--warning-500)" />
      </foreignObject>
      {tipLines.map((line, i) => (
        <text
          key={line}
          x={TIP_ANCHOR_X + 20}
          y={textStartY + i * lineHeight}
          fontSize={11}
          fill="var(--warning-500)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

interface OwnerLineProps {
  layerCenterY: number
  stepCenterY: number
  color: string
}

function OwnerLine({ layerCenterY, stepCenterY, color }: OwnerLineProps) {
  return (
    <g>
      <line
        x1={OWNER_DOT_X}
        y1={layerCenterY}
        x2={STEP_X}
        y2={stepCenterY}
        stroke={color}
        strokeWidth={1.25}
        strokeDasharray="3 3"
        opacity={0.8}
      />
      <circle cx={OWNER_DOT_X} cy={layerCenterY} r={3} fill={color} />
      <circle cx={STEP_X} cy={stepCenterY} r={3} fill={color} />
    </g>
  )
}

interface StepNodeProps {
  y: number
  index: number
  title: string
  code: string
  Icon: LucideIcon
}

function StepNode({ y, index, title, code, Icon }: StepNodeProps) {
  return (
    <g>
      <rect
        x={STEP_X}
        y={y}
        width={STEP_W}
        height={STEP_H}
        rx={10}
        fill="var(--surface-card)"
        stroke="var(--border-subtle)"
        strokeWidth={1}
      />
      <foreignObject x={STEP_X + 12} y={y + 10} width={18} height={18}>
        <Icon size={18} color="var(--blue-600)" />
      </foreignObject>
      <text
        x={STEP_X + 38}
        y={y + 23}
        fontSize={12.5}
        fontWeight={700}
        fill="var(--text-strong)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {`${index}. ${title}`}
      </text>
      <text
        x={STEP_X + 14}
        y={y + STEP_H - 13}
        fontSize={10}
        fill="var(--text-muted)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {code}
      </text>
    </g>
  )
}

interface AnnotationProps {
  x: number
  y: number
  Icon: LucideIcon
  text: string
}

function Annotation({ x, y, Icon, text }: AnnotationProps) {
  return (
    <g>
      <foreignObject x={x} y={y - 11} width={14} height={14}>
        <Icon size={13} color="var(--blue-700)" />
      </foreignObject>
      <text
        x={x + 18}
        y={y}
        fontSize={11.5}
        fontWeight={600}
        fill="var(--blue-700)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

export default function MlWeek11Concept() {
  // 五層抽象堆疊：由下往上，寬度遞減（樣板越來越少）、顏色漸深（出錯要往下探的層數越來越多）
  const layers = [
    {
      x: 24,
      y: 526,
      w: 460,
      h: 84,
      fill: 'var(--blue-50)',
      textColor: 'var(--blue-800)',
      Icon: Sigma,
      title: '手刻 numpy（第 10 週）',
      subtitle: '自己算矩陣、自己推導梯度',
      tipLines: ['手推梯度公式寫錯', '反向傳播整條跟著錯'],
    },
    {
      x: 24,
      y: 426,
      w: 420,
      h: 84,
      fill: 'var(--blue-100)',
      textColor: 'var(--blue-800)',
      Icon: GitBranch,
      title: 'tensor 與 autograd',
      subtitle: 'requires_grad 記帳，backward() 沿圖回推',
      tipLines: ['梯度未歸零會累加', '同張計算圖不能', 'backward 兩次'],
    },
    {
      x: 24,
      y: 326,
      w: 380,
      h: 84,
      fill: 'var(--blue-300)',
      textColor: 'var(--blue-950)',
      Icon: Layers,
      title: 'nn.Module 與 optim',
      subtitle: '組合層、activation functions、更新參數',
      tipLines: ['activation 與 loss', '重複算 softmax', 'CrossEntropyLoss 已含'],
    },
    {
      x: 24,
      y: 226,
      w: 340,
      h: 84,
      fill: 'var(--blue-500)',
      textColor: '#ffffff',
      Icon: Blocks,
      title: 'Sequential vs. 自訂 Module',
      subtitle: '單一資料流 vs. 分支／自訂層',
      tipLines: ['自訂 Module 用', '一般 tensor 存權重', 'parameters() 抓不到'],
    },
    {
      x: 24,
      y: 126,
      w: 300,
      h: 84,
      fill: 'var(--blue-700)',
      textColor: '#ffffff',
      Icon: Zap,
      title: 'PyTorch Lightning',
      subtitle: '只填 training_step，Trainer 代管迴圈',
      tipLines: ['Trainer 出狀況', '先退回純 PyTorch', '迴圈排查'],
    },
  ]

  const layerCenterY = {
    numpy: 568,
    tensorAutograd: 468,
    nnOptim: 368,
    sequentialCustom: 268,
    lightning: 168,
  }

  const ownerBlue = 'var(--blue-400)'
  const ownerException = 'var(--orange-600)'

  // 右側：一次訓練迭代的五步驟，直向排列
  const steps: { y: number; title: string; code: string; Icon: LucideIcon; owner: number; color: string }[] = [
    { y: 144, title: '算預測', code: 'model(x)', Icon: Target, owner: layerCenterY.nnOptim, color: ownerBlue },
    { y: 241, title: '算 loss', code: 'loss_fn(pred, y)', Icon: Gauge, owner: layerCenterY.nnOptim, color: ownerBlue },
    {
      y: 338,
      title: 'backward()',
      code: 'loss.backward()',
      Icon: ArrowLeft,
      owner: layerCenterY.tensorAutograd,
      color: ownerException,
    },
    {
      y: 435,
      title: 'optimizer.step()',
      code: '更新每個參數',
      Icon: RefreshCw,
      owner: layerCenterY.nnOptim,
      color: ownerBlue,
    },
    { y: 532, title: 'zero_grad()', code: '清空梯度', Icon: Eraser, owner: layerCenterY.nnOptim, color: ownerBlue },
  ]

  return (
    <div className="not-prose w-full max-w-4xl mx-auto">
      <svg
        viewBox="0 0 1010 660"
        width="100%"
        role="img"
        aria-label="PyTorch 抽象層級堆疊圖：由下往上五層——手刻 numpy、tensor 與 autograd、nn.Module 與 optim、Sequential 對比自訂 Module、PyTorch Lightning。bar 由寬變窄代表樣板程式碼遞減，顏色由淺變深代表出錯時要往下探的層數遞增，每層右緣標一個常見錯誤。右側直向排列一次訓練迭代的五步驟：算預測、算 loss、backward()、optimizer.step()、zero_grad()，多數步驟由 nn.Module 與 optim 層負責，唯獨 backward() 由 tensor 與 autograd 層負責，並每個 batch 重複一次。"
      >
        <defs>
          <marker id="mw11-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* 頂部圖例：說明寬度與深淺各自代表什麼 */}
        <text
          x={24}
          y={20}
          fontSize={11}
          fill="var(--text-muted)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          寬度＝手寫樣板量（往上遞減）　深淺＝出錯要往下探的層數（往上遞增）
        </text>

        {/* 出錯要往下探的層數 -> 越往上越遠；樣板程式碼 -> 越往上越少 */}
        <Annotation x={24} y={110} Icon={ArrowUp} text="樣板最少，但出錯要往下探好幾層" />
        <Annotation x={24} y={632} Icon={ArrowDown} text="樣板最多，但出錯就在你眼前這層" />

        {/* 五層堆疊（含右緣錯誤提示） */}
        {layers.map((layer) => (
          <LayerRow key={layer.title} {...layer} />
        ))}

        {/* 每個訓練步驟連回負責的層 */}
        {steps.map((step) => (
          <OwnerLine key={`owner-${step.title}`} layerCenterY={step.owner} stepCenterY={step.y + STEP_H / 2} color={step.color} />
        ))}

        {/* 右側五步驟標題 */}
        <text
          x={STEP_X + STEP_W / 2}
          y={110}
          fontSize={12}
          fontWeight={700}
          fill="var(--text-strong)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          一次訓練迭代的五步驟
        </text>

        {/* 步驟之間的順序箭頭 */}
        {steps.slice(0, -1).map((step, i) => (
          <line
            key={`flow-${step.title}`}
            x1={STEP_X + STEP_W / 2}
            y1={step.y + STEP_H}
            x2={STEP_X + STEP_W / 2}
            y2={steps[i + 1].y}
            stroke="var(--neutral-400)"
            strokeWidth={1.5}
            markerEnd="url(#mw11-arrow)"
          />
        ))}

        {/* 每個 epoch／batch 重複：從最後一步繞回第一步 */}
        <path
          d={`M${STEP_X + STEP_W},${steps[4].y + STEP_H / 2} C${STEP_X + STEP_W + 35},${
            steps[4].y + STEP_H / 2 - 90
          } ${STEP_X + STEP_W + 35},${steps[0].y + STEP_H / 2 + 90} ${STEP_X + STEP_W + 2},${
            steps[0].y + STEP_H / 2
          }`}
          fill="none"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          markerEnd="url(#mw11-arrow)"
        />
        <text
          x={STEP_X + STEP_W + 46}
          y={(steps[0].y + steps[4].y) / 2 + STEP_H / 2}
          fontSize={10}
          fill="var(--text-muted)"
          textAnchor="middle"
          transform={`rotate(-90 ${STEP_X + STEP_W + 46} ${(steps[0].y + steps[4].y) / 2 + STEP_H / 2})`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          每個 batch 重複
        </text>

        {/* 步驟節點本體（畫在箭頭之上） */}
        {steps.map((step, i) => (
          <StepNode key={step.title} y={step.y} index={i + 1} title={step.title} code={step.code} Icon={step.Icon} />
        ))}
      </svg>
    </div>
  )
}
