/**
 * 核心洞察：兩支的骨架都靠「版面」說話，不只靠文字標註。
 * 換模型（A，indigo）：高變異那側是一個節點同時射出兩條線到並排的
 * majority voting／bagging 兩個框——彼此之間完全沒有連線，代表互相獨立、
 * 同時訓練；高偏差那側是三個框由上而下逐一用箭頭串起，每個箭頭都代表
 * 「修正前一個的錯」。並排無連線＝bagging，垂直串接有箭頭＝boosting，
 * 這個差異用幾何關係表達，不必額外加字。
 * 換特徵表示（B，emerald）：文字處理管線由左到右、遇欄位不夠再換行，
 * 末端在分類器分岔成判別式／生成式兩個對等終點，另拉一條虛線側支到
 * out-of-core learning，代表「資料太大時的另一條路」而非第三個平行模型。
 * 兩支最後都收斂到「回頭看資料」，因為模型與特徵都對症之後，真正的
 * 上限常常在資料本身（雜訊、失衡、樣本太少）。
 */

import {
  CircleHelp,
  Layers,
  Type,
  Users,
  Shuffle,
  Scale,
  TrendingDown,
  Zap,
  FileText,
  Eraser,
  Scissors,
  Hash,
  Filter,
  Split,
  Sigma,
  Wand2,
  HardDrive,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'neutral' | 'headerA' | 'headerB' | 'leafA' | 'leafB' | 'altB' | 'fork'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const cx = (n: Rect) => n.x + n.w / 2
const cy = (n: Rect) => n.y + n.h / 2
const bottom = (n: Rect) => n.y + n.h

const TONE_STYLE: Record<
  Tone,
  { bg: string; border?: string; dashed?: boolean; title: string; subtitle: string; icon: string }
> = {
  neutral: {
    bg: 'var(--neutral-100)',
    title: 'var(--text-strong)',
    subtitle: 'var(--text-muted)',
    icon: 'var(--neutral-600)',
  },
  headerA: { bg: 'var(--blue-600)', title: '#ffffff', subtitle: 'var(--blue-100)', icon: '#ffffff' },
  headerB: { bg: 'var(--orange-600)', title: '#ffffff', subtitle: 'var(--orange-100)', icon: '#ffffff' },
  leafA: {
    bg: 'var(--blue-50)',
    title: 'var(--blue-700)',
    subtitle: 'var(--text-muted)',
    icon: 'var(--blue-600)',
  },
  leafB: {
    bg: 'var(--orange-50)',
    title: 'var(--orange-700)',
    subtitle: 'var(--text-muted)',
    icon: 'var(--orange-600)',
  },
  altB: {
    bg: 'var(--orange-50)',
    border: 'var(--orange-300)',
    dashed: true,
    title: 'var(--orange-700)',
    subtitle: 'var(--text-muted)',
    icon: 'var(--orange-600)',
  },
  fork: {
    bg: 'var(--neutral-200)',
    title: 'var(--text-strong)',
    subtitle: 'var(--text-muted)',
    icon: 'var(--neutral-700)',
  },
}

interface NodeBoxProps extends Rect {
  title: string
  subtitle?: string
  Icon: LucideIcon
  tone: Tone
}

function NodeBox({ x, y, w, h, title, subtitle, Icon, tone }: NodeBoxProps) {
  const s = TONE_STYLE[tone]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={s.bg}
        stroke={s.border}
        strokeWidth={s.border ? 1.5 : 0}
        strokeDasharray={s.dashed ? '5 5' : undefined}
      />
      <foreignObject x={x} y={y} width={w} height={h}>
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-2 text-center"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <Icon size={15} color={s.icon} />
          <div className="text-[11.5px] font-semibold leading-snug" style={{ color: s.title }}>
            {title}
          </div>
          {subtitle ? (
            <div className="text-[9.5px] leading-snug" style={{ color: s.subtitle }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </foreignObject>
    </g>
  )
}

interface EdgeLabelProps {
  x: number
  y: number
  text: string
}

function EdgeLabel({ x, y, text }: EdgeLabelProps) {
  const w = text.length * 7.6 + 10
  return (
    <g>
      <rect x={x - w / 2} y={y - 11} width={w} height={16} fill="var(--surface-page)" opacity={0.92} />
      <text
        x={x}
        y={y}
        fontSize={11}
        fill="var(--neutral-600)"
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {text}
      </text>
    </g>
  )
}

interface ArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  dashed?: boolean
  marker?: boolean
}

function Arrow({ x1, y1, x2, y2, color = 'var(--neutral-400)', dashed, marker = true }: ArrowProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={2}
      strokeDasharray={dashed ? '6 4' : undefined}
      markerEnd={marker ? 'url(#w12-arrow)' : undefined}
    />
  )
}

export default function MlWeek12Concept() {
  // 根節點
  const root: Rect = { x: 460, y: 20, w: 300, h: 64 }

  // 兩大支標頭
  const headerA: Rect = { x: 160, y: 130, w: 260, h: 64 }
  const headerB: Rect = { x: 760, y: 130, w: 340, h: 64 }

  // A．換模型 —— 高變異分岔點與並排的 bagging 兩個框
  const forkVariance = { x: 175, y: 230 }
  const majorityVoting: Rect = { x: 20, y: 260, w: 140, h: 78 }
  const baggingRF: Rect = { x: 190, y: 260, w: 140, h: 78 }

  // A．換模型 —— 高偏差分岔點與垂直串接的 boosting 三個框
  const chainEntry = { x: 455, y: 230 }
  const adaBoost: Rect = { x: 365, y: 260, w: 180, h: 64 }
  const gradientBoosting: Rect = { x: 365, y: 344, w: 180, h: 64 }
  const xgBoost: Rect = { x: 365, y: 428, w: 180, h: 64 }

  // B．換特徵表示 —— 文字處理管線（第一行）
  const rawText: Rect = { x: 600, y: 250, w: 190, h: 64 }
  const textCleaning: Rect = { x: 835, y: 250, w: 190, h: 64 }
  const tokenization: Rect = { x: 1070, y: 250, w: 190, h: 64 }

  // 第二行（換行延續）
  const bagOfWords: Rect = { x: 600, y: 344, w: 190, h: 64 }
  const tfidf: Rect = { x: 835, y: 344, w: 190, h: 64 }
  const classifierFork: Rect = { x: 1100, y: 352, w: 130, h: 48 }

  // 分類器分岔出的兩個對等終點
  const logisticRegression: Rect = { x: 850, y: 470, w: 190, h: 78 }
  const naiveBayes: Rect = { x: 1060, y: 470, w: 190, h: 78 }

  // 記憶體裝不下時的旁支
  const outOfCore: Rect = { x: 1060, y: 580, w: 200, h: 78 }

  // 匯流節點
  const converge: Rect = { x: 260, y: 740, w: 700, h: 96 }

  // 六個來源匯入 converge 上緣的等距落點（由左至右對應各來源 x 大致的相對順序）
  const mergeXs = [360, 460, 560, 660, 760, 860]

  return (
    <div className="not-prose w-full max-w-5xl mx-auto">
      <svg
        viewBox="0 0 1280 880"
        width="100%"
        role="img"
        aria-label="單一模型表現不如預期時的決策地圖：換模型支再依訓練測試分數落差分為高變異（並排的 majority voting 與 bagging / random forest，彼此獨立同時訓練）與高偏差（AdaBoost 到 gradient boosting 到 XGBoost 依序串接，後者修正前者的錯）；換特徵表示支是原始文字經 text cleaning、tokenization、bag-of-words、TF-IDF 到分類器，分岔為判別式的 logistic regression 與生成式的 naive Bayes，並另有一條旁支在資料太大時走 out-of-core learning；最後兩支匯流到回頭看資料（標籤雜訊、類別不平衡、樣本太少）。"
      >
        <defs>
          <marker id="w12-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* 根節點 -> 兩大支標頭 */}
        <Arrow x1={cx(root)} y1={bottom(root)} x2={cx(headerA)} y2={headerA.y} />
        <Arrow x1={cx(root)} y1={bottom(root)} x2={cx(headerB)} y2={headerB.y} />

        {/* A：標頭 -> 高變異分岔點 / 高偏差分岔點 */}
        <Arrow x1={cx(headerA)} y1={bottom(headerA)} x2={forkVariance.x} y2={forkVariance.y} marker={false} />
        <Arrow x1={cx(headerA)} y1={bottom(headerA)} x2={chainEntry.x} y2={chainEntry.y} marker={false} />
        <EdgeLabel
          x={(cx(headerA) + forkVariance.x) / 2 - 8}
          y={(bottom(headerA) + forkVariance.y) / 2}
          text="訓練高、測試落後（高變異）"
        />
        <EdgeLabel
          x={(cx(headerA) + chainEntry.x) / 2 + 10}
          y={(bottom(headerA) + chainEntry.y) / 2}
          text="訓練、測試都不好（高偏差）"
        />

        {/* 高變異：一個點同時分岔到兩個並排、彼此無連線的框（獨立、同時訓練） */}
        <circle cx={forkVariance.x} cy={forkVariance.y} r={4} fill="var(--blue-400)" />
        <Arrow x1={forkVariance.x} y1={forkVariance.y} x2={cx(majorityVoting)} y2={majorityVoting.y} />
        <Arrow x1={forkVariance.x} y1={forkVariance.y} x2={cx(baggingRF)} y2={baggingRF.y} />
        <EdgeLabel x={forkVariance.x} y={245} text="並行訓練、彼此獨立、平均掉抖動" />

        {/* 高偏差：垂直串接三個框，每一箭頭代表修正前一個的錯 */}
        <Arrow x1={chainEntry.x} y1={chainEntry.y} x2={cx(adaBoost)} y2={adaBoost.y} />
        <Arrow x1={cx(adaBoost)} y1={bottom(adaBoost)} x2={cx(gradientBoosting)} y2={gradientBoosting.y} />
        <Arrow
          x1={cx(gradientBoosting)}
          y1={bottom(gradientBoosting)}
          x2={cx(xgBoost)}
          y2={xgBoost.y}
        />
        <EdgeLabel x={chainEntry.x} y={245} text="序列補課、後者修正前者的錯" />

        {/* B：標頭 -> 管線第一站 */}
        <Arrow x1={cx(headerB)} y1={bottom(headerB)} x2={cx(rawText)} y2={rawText.y} />

        {/* 管線第一行：原始文字 -> text cleaning -> tokenization */}
        <Arrow x1={rawText.x + rawText.w} y1={cy(rawText)} x2={textCleaning.x} y2={cy(textCleaning)} />
        <Arrow
          x1={textCleaning.x + textCleaning.w}
          y1={cy(textCleaning)}
          x2={tokenization.x}
          y2={cy(tokenization)}
        />

        {/* 換行：tokenization 折回 bag-of-words（管線太長，換行延續由左到右） */}
        <path
          d={`M${cx(tokenization)},${bottom(tokenization)} L${cx(tokenization)},${bottom(tokenization) + 16} L${cx(
            bagOfWords,
          )},${bagOfWords.y - 16} L${cx(bagOfWords)},${bagOfWords.y}`}
          fill="none"
          stroke="var(--neutral-400)"
          strokeWidth={2}
          markerEnd="url(#w12-arrow)"
        />

        {/* 管線第二行：bag-of-words -> TF-IDF -> 分類器 */}
        <Arrow x1={bagOfWords.x + bagOfWords.w} y1={cy(bagOfWords)} x2={tfidf.x} y2={cy(tfidf)} />
        <Arrow
          x1={tfidf.x + tfidf.w}
          y1={cy(tfidf)}
          x2={classifierFork.x}
          y2={cy(classifierFork)}
        />

        {/* 分類器分岔出判別式／生成式兩個對等終點 */}
        <Arrow x1={cx(classifierFork)} y1={bottom(classifierFork)} x2={cx(logisticRegression)} y2={logisticRegression.y} />
        <Arrow x1={cx(classifierFork)} y1={bottom(classifierFork)} x2={cx(naiveBayes)} y2={naiveBayes.y} />

        {/* 管線末端另拉旁支：資料太大時改走 out-of-core（虛線，區別於分類器的兩個平行模型） */}
        <Arrow
          x1={cx(tfidf)}
          y1={bottom(tfidf)}
          x2={cx(outOfCore)}
          y2={outOfCore.y}
          color="var(--orange-400)"
          dashed
        />
        <EdgeLabel x={1045} y={494} text="資料大到記憶體裝不下時走這裡" />

        {/* 兩支收斂到「回頭看資料」 */}
        <Arrow x1={cx(majorityVoting)} y1={bottom(majorityVoting)} x2={mergeXs[0]} y2={converge.y} />
        <Arrow x1={cx(baggingRF)} y1={bottom(baggingRF)} x2={mergeXs[1]} y2={converge.y} />
        <Arrow x1={cx(xgBoost)} y1={bottom(xgBoost)} x2={mergeXs[2]} y2={converge.y} />
        <Arrow x1={cx(logisticRegression)} y1={bottom(logisticRegression)} x2={mergeXs[3]} y2={converge.y} />
        <Arrow x1={cx(naiveBayes)} y1={bottom(naiveBayes)} x2={mergeXs[4]} y2={converge.y} />
        <Arrow x1={cx(outOfCore)} y1={bottom(outOfCore)} x2={mergeXs[5]} y2={converge.y} />

        {/* 節點本體（畫在連線之上） */}
        <NodeBox {...root} title="模型表現不如預期" Icon={CircleHelp} tone="neutral" />

        <NodeBox {...headerA} title="A．換模型" subtitle="集成多個分類器" Icon={Layers} tone="headerA" />
        <NodeBox
          {...headerB}
          title="B．換特徵表示"
          subtitle="把文字轉成模型吃得下的向量"
          Icon={Type}
          tone="headerB"
        />

        <NodeBox
          {...majorityVoting}
          title="Majority Voting"
          subtitle="多數決／機率加權平均"
          Icon={Users}
          tone="leafA"
        />
        <NodeBox
          {...baggingRF}
          title="Bagging／Random Forest"
          subtitle="重複抽樣訓練＋隨機挑特徵"
          Icon={Shuffle}
          tone="leafA"
        />

        <NodeBox {...adaBoost} title="AdaBoost" subtitle="調高分錯樣本的權重" Icon={Scale} tone="leafA" />
        <NodeBox
          {...gradientBoosting}
          title="Gradient Boosting"
          subtitle="擬合殘差／負梯度"
          Icon={TrendingDown}
          tone="leafA"
        />
        <NodeBox {...xgBoost} title="XGBoost" subtitle="正則化＋高效分裂搜尋" Icon={Zap} tone="leafA" />

        <NodeBox {...rawText} title="原始文字" subtitle="未處理的影評文本" Icon={FileText} tone="leafB" />
        <NodeBox
          {...textCleaning}
          title="Text Cleaning"
          subtitle="去 HTML／標點、轉小寫、留顏文字"
          Icon={Eraser}
          tone="leafB"
        />
        <NodeBox
          {...tokenization}
          title="Tokenization"
          subtitle="斷詞、詞幹還原、去停用詞"
          Icon={Scissors}
          tone="leafB"
        />
        <NodeBox
          {...bagOfWords}
          title="Bag-of-Words"
          subtitle="詞頻向量（丟掉語序）"
          Icon={Hash}
          tone="leafB"
        />
        <NodeBox {...tfidf} title="TF-IDF" subtitle="壓低高頻無鑑別力的詞" Icon={Filter} tone="leafB" />
        <NodeBox {...classifierFork} title="分類器" Icon={Split} tone="fork" />

        <NodeBox
          {...logisticRegression}
          title="Logistic Regression"
          subtitle="判別式：學一條分界線"
          Icon={Sigma}
          tone="leafB"
        />
        <NodeBox
          {...naiveBayes}
          title="Naive Bayes"
          subtitle="生成式：比較各類別機率"
          Icon={Wand2}
          tone="leafB"
        />
        <NodeBox
          {...outOfCore}
          title="Out-of-core Learning"
          subtitle="雜湊向量化＋小批次更新"
          Icon={HardDrive}
          tone="altB"
        />

        <g>
          <rect
            x={converge.x}
            y={converge.y}
            width={converge.w}
            height={converge.h}
            rx={12}
            fill="var(--neutral-100)"
          />
          <foreignObject x={converge.x} y={converge.y} width={converge.w} height={converge.h}>
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1.5"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <div className="flex items-center gap-1.5">
                <RotateCcw size={16} color="var(--neutral-600)" />
                <span className="text-[13px] font-bold" style={{ color: 'var(--text-strong)' }}>
                  回頭看資料
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {['標籤雜訊', '類別不平衡', '樣本太少'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: 'var(--neutral-200)', color: 'var(--neutral-700)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  )
}
