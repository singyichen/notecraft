/**
 * 核心洞察：這張圖把整章壓成一個可重複執行的迴圈——
 * 「配模型 → 看殘差 → 對症下藥 → 再配」。殘差圖的「形狀」才是真正的路由器：
 * 少數點特別大走 RANSAC、特徵多且高度相關走正則化、結構性彎曲走非線性模型；
 * Ridge 與 Lasso 的差異不是文字能講清楚的，用係數長條圖對照
 * 「整體壓矮」vs「幾根真的歸零」最直接。
 */

import type { ReactNode } from 'react'
import {
  ScanSearch,
  LineChart,
  Activity,
  Split,
  Target,
  SlidersHorizontal,
  Minimize2,
  Scissors,
  Blend,
  Spline,
  TreeDeciduous,
  Trees,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function cx(r: Rect): number {
  return r.x + r.w / 2
}
function cy(r: Rect): number {
  return r.y + r.h / 2
}

interface SpineBoxProps extends Rect {
  icon: LucideIcon
  title: string
  desc?: string
  fill: string
  border: string
  titleColor: string
  descColor: string
}

function SpineBox({ x, y, w, h, icon: Icon, title, desc, fill, border, titleColor, descColor }: SpineBoxProps) {
  const iconSize = 20
  const midY = y + h / 2
  const textX = x + 20 + iconSize + 10
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={border} strokeWidth={1.5} />
      <foreignObject x={x + 20} y={midY - iconSize / 2} width={iconSize} height={iconSize}>
        <Icon size={iconSize} color={titleColor} />
      </foreignObject>
      <text x={textX} y={desc ? midY - 3 : midY + 5} fontSize={15} fontWeight={700} fill={titleColor} style={{ fontFamily: 'var(--font-sans)' }}>
        {title}
      </text>
      {desc && (
        <text x={textX} y={midY + 16} fontSize={11.5} fill={descColor} style={{ fontFamily: 'var(--font-sans)' }}>
          {desc}
        </text>
      )}
    </g>
  )
}

interface NodeBoxProps extends Rect {
  icon: LucideIcon
  title: string
  lines?: string[]
  fill: string
  stroke?: string
  titleColor: string
  lineColor?: string
  titleSize?: number
  children?: ReactNode
}

function NodeBox({
  x,
  y,
  w,
  h,
  icon: Icon,
  title,
  lines = [],
  fill,
  stroke,
  titleColor,
  lineColor,
  titleSize = 14,
  children,
}: NodeBoxProps) {
  const center = x + w / 2
  const titleY = y + 42
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : 0} />
      <foreignObject x={center - 8} y={y + 10} width={16} height={16}>
        <Icon size={16} color={titleColor} />
      </foreignObject>
      <text x={center} y={titleY} fontSize={titleSize} fontWeight={700} fill={titleColor} textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={line}
          x={center}
          y={titleY + 16 + i * 14}
          fontSize={10.8}
          fill={lineColor ?? titleColor}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
      {children}
    </g>
  )
}

interface CoefficientBarsProps {
  x: number
  baseline: number
  before: number[]
  after: number[]
  afterColor: string
}

/** Ridge 只把係數壓小（after 都 > 1px），Lasso 有幾根 after 落在 <=1 的門檻、畫成貼底的細線＝真的歸零。 */
function CoefficientBars({ x, baseline, before, after, afterColor }: CoefficientBarsProps) {
  const barW = 7
  const gap = 3
  const groupGap = 9
  const groupW = barW * 2 + gap + groupGap
  return (
    <g>
      <line
        x1={x - 4}
        y1={baseline}
        x2={x + before.length * groupW - groupGap + 4}
        y2={baseline}
        stroke="var(--neutral-300)"
        strokeWidth={1}
      />
      {before.map((h, i) => {
        const gx = x + i * groupW
        const a = after[i]
        return (
          <g key={i}>
            <rect x={gx} y={baseline - h} width={barW} height={h} fill="var(--neutral-200)" stroke="var(--neutral-400)" strokeWidth={0.75} rx={1.5} />
            {a > 1 ? (
              <rect x={gx + barW + gap} y={baseline - a} width={barW} height={a} fill={afterColor} rx={1.5} />
            ) : (
              <rect x={gx + barW + gap} y={baseline - 1.5} width={barW} height={1.5} fill={afterColor} rx={0.75} />
            )}
          </g>
        )
      })}
    </g>
  )
}

interface ResidualThumbProps extends Rect {
  points: Array<[number, number]>
  dotColor: string
  label: string
}

/** 殘差小縮圖：x 是 0~1 的相對位置、y 是離 0 線的偏移量（px），四種形狀直接決定下面走哪一條處方。 */
function ResidualThumb({ x, y, w, h, points, dotColor, label }: ResidualThumbProps) {
  const baseline = y + h / 2
  const padX = 10
  const plotW = w - padX * 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--neutral-50)" stroke="var(--border-subtle)" strokeWidth={1} />
      <line x1={x + 4} y1={baseline} x2={x + w - 4} y2={baseline} stroke="var(--neutral-300)" strokeWidth={1} strokeDasharray="2 2" />
      {points.map(([fx, dy], i) => (
        <circle key={i} cx={x + padX + fx * plotW} cy={baseline + dy} r={2.4} fill={dotColor} />
      ))}
      <text x={x + w / 2} y={y + h + 14} fontSize={10.3} fill="var(--text-muted)" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>
        {label}
      </text>
    </g>
  )
}

interface CalloutProps {
  x: number
  y: number
  lines: string[]
  fontSize?: number
  color?: string
  bold?: boolean
}

function Callout({ x, y, lines, fontSize = 11, color = 'var(--neutral-600)', bold = false }: CalloutProps) {
  const maxLen = Math.max(...lines.map((l) => l.length))
  const w = maxLen * fontSize * 0.98 + 12
  const h = lines.length * (fontSize + 4) + 6
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="var(--surface-page)" opacity={0.94} rx={3} />
      {lines.map((line, i) => (
        <text
          key={line}
          x={x}
          y={y - h / 2 + (i + 1) * (fontSize + 4) - 2}
          fontSize={fontSize}
          fontWeight={bold ? 700 : 500}
          fill={color}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

export default function MlWeek14Concept() {
  const step1: Rect = { x: 400, y: 16, w: 320, h: 64 }
  const step2: Rect = { x: 400, y: 104, w: 320, h: 64 }
  const step3: Rect = { x: 230, y: 192, w: 660, h: 150 }
  const step4: Rect = { x: 440, y: 366, w: 240, h: 64 }

  const ransac: Rect = { x: 40, y: 460, w: 230, h: 95 }
  const regHeader: Rect = { x: 390, y: 460, w: 340, h: 74 }
  const ridge: Rect = { x: 390, y: 560, w: 105, h: 140 }
  const lasso: Rect = { x: 505, y: 560, w: 105, h: 140 }
  const elasticNet: Rect = { x: 620, y: 560, w: 110, h: 140 }
  const nonlinear: Rect = { x: 830, y: 460, w: 230, h: 95 }
  const tree: Rect = { x: 790, y: 615, w: 150, h: 125 }
  const forest: Rect = { x: 960, y: 615, w: 150, h: 125 }

  const thumbY = 250
  const thumbW = 140
  const thumbH = 60
  const thumbXs = [250, 410, 570, 730]

  const randomPts: Array<[number, number]> = [
    [0.06, -8],
    [0.18, 6],
    [0.3, -4],
    [0.42, 9],
    [0.55, -7],
    [0.68, 5],
    [0.8, -6],
    [0.93, 7],
  ]
  const arcPts: Array<[number, number]> = [
    [0.05, -8],
    [0.22, -2],
    [0.38, 5],
    [0.5, 11],
    [0.62, 5],
    [0.78, -2],
    [0.95, -8],
  ]
  const funnelPts: Array<[number, number]> = [
    [0.06, -2],
    [0.18, 2],
    [0.3, -3],
    [0.42, 4],
    [0.54, -6],
    [0.67, 8],
    [0.8, -10],
    [0.93, 12],
  ]
  const outlierPts: Array<[number, number]> = [
    [0.08, -2],
    [0.2, 1],
    [0.33, -1],
    [0.46, 2],
    [0.58, -2],
    [0.71, 1],
    [0.85, 22],
    [0.93, -1],
  ]

  return (
    <div className="not-prose w-full max-w-6xl mx-auto">
      <svg
        viewBox="0 0 1240 865"
        width="100%"
        role="img"
        aria-label="迴歸實作流程與除錯決策圖：主幹由上往下四步，先探索資料（散佈圖矩陣與相關係數矩陣），再用最小平方法配出 OLS 基準線，接著看 MSE／MAE／R² 與訓練測試差距、並畫殘差圖，最後依殘差圖的形狀分岔出三條虛線處方：少數點殘差特別大走 RANSAC 以內群點投票重配；特徵多且高度相關（共線性、過擬合）走正則化，再細分 Ridge 只把係數壓小、Lasso 直接把係數壓成 0、Elastic Net 兩者混合，圖中各附一組係數長條圖對照壓小與歸零的差異；殘差呈結構性彎曲走多項式或基底函數迴歸，若仍不理想（結構性彎曲持續或特徵有明顯交互作用）再換決策樹迴歸與隨機森林迴歸。三條支線末端都收回主幹，形成配模型、看殘差、對症下藥、再配的迴圈。"
      >
        <defs>
          <marker id="w14-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* ───────── 主幹（實線） ───────── */}
        <line x1={cx(step1)} y1={step1.y + step1.h} x2={cx(step1)} y2={step2.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w14-arrow)" />
        <line x1={cx(step2)} y1={step2.y + step2.h} x2={cx(step2)} y2={step3.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w14-arrow)" />
        <line x1={cx(step3)} y1={step3.y + step3.h} x2={cx(step4)} y2={step4.y} stroke="var(--neutral-400)" strokeWidth={2} markerEnd="url(#w14-arrow)" />
        <Callout x={cx(step3)} y={354} lines={['殘差圖的形狀 → 決定該用哪一種處方']} bold color="var(--text-strong)" />

        <SpineBox
          {...step1}
          icon={ScanSearch}
          title="① 探索資料"
          desc="散佈圖矩陣 ＋ 相關係數矩陣"
          fill="var(--blue-50)"
          border="var(--border-brand)"
          titleColor="var(--text-strong)"
          descColor="var(--neutral-600)"
        />
        <SpineBox
          {...step2}
          icon={LineChart}
          title="② OLS 配基準線"
          desc="最小平方法：垂直距離平方和最小"
          fill="var(--blue-50)"
          border="var(--border-brand)"
          titleColor="var(--text-strong)"
          descColor="var(--neutral-600)"
        />

        {/* step3：指標＋殘差圖，內含四個形狀縮圖 */}
        <g>
          <rect x={step3.x} y={step3.y} width={step3.w} height={step3.h} rx={12} fill="var(--blue-50)" stroke="var(--border-brand)" strokeWidth={1.5} />
          <foreignObject x={step3.x + 20} y={step3.y + 14} width={20} height={20}>
            <Activity size={20} color="var(--text-strong)" />
          </foreignObject>
          <text x={step3.x + 50} y={step3.y + 29} fontSize={15} fontWeight={700} fill="var(--text-strong)" style={{ fontFamily: 'var(--font-sans)' }}>
            ③ 看指標與殘差圖
          </text>
          <text x={step3.x + 50} y={step3.y + 46} fontSize={11.5} fill="var(--neutral-600)" style={{ fontFamily: 'var(--font-sans)' }}>
            MSE／MAE／R²（訓練 vs 測試）－ 殘差圖：x 放預測值、y 放預測減真實
          </text>
          <ResidualThumb x={thumbXs[0]} y={thumbY} w={thumbW} h={thumbH} points={randomPts} dotColor="var(--success-500)" label="隨機散布（正常）" />
          <ResidualThumb x={thumbXs[1]} y={thumbY} w={thumbW} h={thumbH} points={arcPts} dotColor="var(--warning-500)" label="弧形（漏非線性）" />
          <ResidualThumb x={thumbXs[2]} y={thumbY} w={thumbW} h={thumbH} points={funnelPts} dotColor="var(--warning-500)" label="喇叭形（變異放大）" />
          <ResidualThumb x={thumbXs[3]} y={thumbY} w={thumbW} h={thumbH} points={outlierPts} dotColor="var(--danger-500)" label="少數極端（離群值）" />
        </g>

        <SpineBox
          {...step4}
          icon={Split}
          title="④ 殘差呈現什麼形狀？"
          desc="分岔點：依形狀選處方，再回②重配"
          fill="var(--neutral-100)"
          border="var(--neutral-300)"
          titleColor="var(--neutral-700)"
          descColor="var(--neutral-500)"
        />

        {/* ───────── 分岔（虛線起點） ───────── */}
        <line x1={460} y1={step4.y + step4.h} x2={cx(ransac)} y2={ransac.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#w14-arrow)" />
        <Callout x={300} y={447} lines={['少數點殘差特別大', '（離群值）']} />

        <line x1={cx(step4)} y1={step4.y + step4.h} x2={cx(regHeader)} y2={regHeader.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#w14-arrow)" />
        <Callout x={cx(regHeader)} y={445} lines={['特徵多／高度相關', '（共線性、過擬合）']} />

        <line x1={660} y1={step4.y + step4.h} x2={cx(nonlinear)} y2={nonlinear.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#w14-arrow)" />
        <Callout x={800} y={447} lines={['結構性彎曲', '（非線性）']} />

        {/* ───────── 左支線：RANSAC ───────── */}
        <NodeBox
          {...ransac}
          icon={Target}
          title="RANSAC"
          lines={['反覆抽樣配線，統計內群點', '取內群點最多者重配']}
          fill="var(--warning-500)"
          titleColor="#ffffff"
        />

        {/* ───────── 中支線：正則化 ───────── */}
        <NodeBox
          {...regHeader}
          icon={SlidersHorizontal}
          title="正則化迴歸"
          lines={['損失函數加上係數懲罰項，用之前須先標準化']}
          fill="var(--blue-600)"
          titleColor="#ffffff"
        />
        <line x1={cx(ridge)} y1={regHeader.y + regHeader.h} x2={cx(ridge)} y2={ridge.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(lasso)} y1={regHeader.y + regHeader.h} x2={cx(lasso)} y2={lasso.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(elasticNet)} y1={regHeader.y + regHeader.h} x2={cx(elasticNet)} y2={elasticNet.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />

        <NodeBox {...ridge} icon={Minimize2} title="Ridge (L2)" lines={['壓小、不歸零']} fill="var(--blue-50)" stroke="var(--blue-200)" titleColor="var(--blue-700)">
          <CoefficientBars x={ridge.x + 12} baseline={ridge.y + ridge.h - 10} before={[34, 34, 30]} after={[29, 17, 15]} afterColor="var(--blue-500)" />
        </NodeBox>
        <NodeBox {...lasso} icon={Scissors} title="Lasso (L1)" lines={['壓成 0＝特徵選擇']} fill="var(--blue-50)" stroke="var(--blue-200)" titleColor="var(--blue-700)">
          <CoefficientBars x={lasso.x + 12} baseline={lasso.y + lasso.h - 10} before={[34, 34, 30]} after={[30, 0, 20]} afterColor="var(--orange-500)" />
        </NodeBox>
        <NodeBox
          {...elasticNet}
          icon={Blend}
          title="Elastic Net"
          lines={['兩者加權混合']}
          fill="var(--blue-50)"
          stroke="var(--blue-200)"
          titleColor="var(--blue-700)"
        >
          <CoefficientBars x={elasticNet.x + 12} baseline={elasticNet.y + elasticNet.h - 10} before={[34, 34, 30]} after={[27, 4, 17]} afterColor="var(--blue-300)" />
        </NodeBox>

        {/* ───────── 右支線：非線性 ───────── */}
        <NodeBox
          {...nonlinear}
          icon={Spline}
          title="多項式／基底函數迴歸"
          lines={['仍是線性模型，特徵空間撐開', '（對係數線性，需搭配正則化）']}
          fill="var(--orange-600)"
          titleColor="#ffffff"
        />
        <line
          x1={nonlinear.x}
          y1={nonlinear.y + 47}
          x2={regHeader.x + regHeader.w}
          y2={regHeader.y + 35}
          stroke="var(--neutral-400)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <Callout x={778} y={486} lines={['需搭配正則化']} fontSize={9.6} />

        <line x1={cx(nonlinear)} y1={nonlinear.y + nonlinear.h} x2={cx(nonlinear)} y2={585} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <Callout
          x={1060}
          y={572}
          lines={['若仍不理想：結構性彎曲持續', '／特徵有明顯交互作用']}
          fontSize={10}
        />
        <line x1={cx(nonlinear)} y1={585} x2={cx(tree)} y2={tree.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#w14-arrow)" />
        <line x1={cx(nonlinear)} y1={585} x2={cx(forest)} y2={forest.y} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#w14-arrow)" />

        <NodeBox
          {...tree}
          icon={TreeDeciduous}
          title="決策樹迴歸"
          lines={['階梯狀擬合，不必標準化', 'max_depth 控制深度（正則化旋鈕）', '易過擬合、不可平滑外推']}
          fill="var(--orange-50)"
          stroke="var(--orange-200)"
          titleColor="var(--orange-700)"
        />
        <NodeBox
          {...forest}
          icon={Trees}
          title="隨機森林迴歸"
          lines={['多棵樹（隨機樣本＋隨機特徵）', '取平均，抹平單樹的高變異', '通常是這章最穩的模型']}
          fill="var(--orange-50)"
          stroke="var(--orange-200)"
          titleColor="var(--orange-700)"
        />

        {/* ───────── 三條支線收回主幹，形成迴圈 ───────── */}
        <line x1={cx(ransac)} y1={ransac.y + ransac.h} x2={cx(ransac)} y2={800} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(regHeader)} y1={ridge.y + ridge.h} x2={cx(regHeader)} y2={800} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(tree)} y1={tree.y + tree.h} x2={cx(tree)} y2={765} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(forest)} y1={forest.y + forest.h} x2={cx(forest)} y2={765} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(tree)} y1={765} x2={cx(forest)} y2={765} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={950} y1={765} x2={950} y2={800} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <line x1={cx(ransac)} y1={800} x2={950} y2={800} stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="5 4" />
        <path
          d={`M950,800 L1190,800 L1190,${cy(step2)} L${step2.x + step2.w},${cy(step2)}`}
          fill="none"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          markerEnd="url(#w14-arrow)"
        />

        <foreignObject x={470} y={817} width={16} height={16}>
          <RotateCcw size={16} color="var(--text-muted)" />
        </foreignObject>
        <text x={494} y={829} fontSize={11} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
          配模型 → 看殘差 → 對症下藥 → 再配（迴圈）
        </text>

        <text x={40} y={852} fontSize={10} fill="var(--text-muted)" style={{ fontFamily: 'var(--font-sans)' }}>
          ── 主幹（實線）　┈┈ 支線／迴圈（虛線）
        </text>
      </svg>
    </div>
  )
}
