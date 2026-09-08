import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, Route } from 'lucide-react';

/**
 * 弧線需要在瀏覽器量測 DOM 後才畫得出來，但 useLayoutEffect 在 SSR 階段
 * 會觸發 React 警告（伺服器端無從執行 layout effect）。這裡在伺服器端退回
 * useEffect，兩者在 SSR 都不會執行，行為一致但不會噪音化 SSR log。
 * arcPath 初值為 null，量測完成前不渲染 <path>，因此不會有位置閃動。
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface StageSpec {
  key: string;
  title: string;
  structured: string;
  output: string;
  note?: string;
  linkBadge?: boolean;
}

const STAGES: StageSpec[] = [
  {
    key: 'source',
    title: '1. 原始文件',
    structured: '有結構',
    output: 'PDF 頁 / 文字區塊，或 XML 節點',
  },
  {
    key: 'flatten',
    title: '2. 壓平（flatten）',
    structured: '輸出',
    output: '連續字串 + 對照表',
    note: '跨節點的個資（例如被字距拆開的姓名）只有在壓平後才抓得到',
    linkBadge: true,
  },
  {
    key: 'detect',
    title: '3. 偵測（detect）',
    structured: '輸出',
    output: '{起始, 結束, 類別} 命中清單',
  },
  {
    key: 'resolve',
    title: '4. 重疊解析（resolve）',
    structured: '規則',
    output: '取較長者，同長取較早者',
  },
  {
    key: 'replace',
    title: '5. 替換（replace）',
    structured: '輸出',
    output: '命中換成假名 / 代號',
  },
  {
    key: 'distribute',
    title: '6. 分派回結構（distribute）',
    structured: '輸出',
    output: '依對照表寫回原節點',
    linkBadge: true,
  },
];

function LinkBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
      style={{ background: 'var(--blue-500)', boxShadow: '0 0 0 2px var(--surface-card)' }}
    />
  );
}

function StageCard({
  stage,
  cardRef,
}: {
  stage: StageSpec;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      className="relative px-3 py-2.5"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {stage.linkBadge && <LinkBadge />}
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--text-strong)',
        }}
      >
        {stage.title}
      </div>
      <div
        className="mt-1"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--text-muted)',
        }}
      >
        {stage.structured}：{stage.output}
      </div>
      {stage.note && (
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--text-muted)',
          }}
        >
          {stage.note}
        </div>
      )}
    </div>
  );
}

function StageDivider() {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <ArrowDown size={14} style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

function DetectResolveMiniDiagram() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <svg
        viewBox="0 0 260 90"
        width="100%"
        style={{ maxWidth: 260 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M130 8 L130 22 L60 22 L60 40"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        <path
          d="M130 8 L130 22 L200 22 L200 40"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        <path
          d="M60 58 L60 68 L130 68 L130 78"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        <path
          d="M200 58 L200 68 L130 68 L130 78"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />

        {/* rule branch pill */}
        <rect
          x="14"
          y="40"
          width="92"
          height="20"
          rx="10"
          fill="var(--surface-brand-soft)"
        />
        <text
          x="60"
          y="53.5"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="10"
          fill="var(--text-brand)"
        >
          規則 + 檢核碼
        </text>

        {/* NER branch pill */}
        <rect
          x="166"
          y="40"
          width="68"
          height="20"
          rx="10"
          fill="var(--surface-accent-soft)"
        />
        <text
          x="200"
          y="53.5"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="10"
          fill="var(--text-accent)"
        >
          NER 模型
        </text>

        {/* union label */}
        <rect
          x="94"
          y="70"
          width="72"
          height="18"
          rx="9"
          fill="var(--surface-sunken)"
        />
        <text
          x="130"
          y="82.5"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="10"
          fill="var(--text-body)"
        >
          取聯集
        </text>
      </svg>
    </div>
  );
}

export default function DeidPipeline() {
  const reduceMotion = useReducedMotion();
  const [arcActive, setArcActive] = useState(false);
  const [arcPath, setArcPath] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const flattenRef = useRef<HTMLDivElement>(null);
  const distributeRef = useRef<HTMLDivElement>(null);

  const computeArc = useCallback(() => {
    const wrapper = wrapperRef.current;
    const flatten = flattenRef.current;
    const distribute = distributeRef.current;
    if (!wrapper || !flatten || !distribute) return;

    const wRect = wrapper.getBoundingClientRect();
    const fRect = flatten.getBoundingClientRect();
    const dRect = distribute.getBoundingClientRect();
    if (wRect.width === 0) return;

    const startX = fRect.right - wRect.left;
    const startY = fRect.top - wRect.top + fRect.height / 2;
    const endX = dRect.right - wRect.left;
    const endY = dRect.top - wRect.top + dRect.height / 2;

    const bulgeX = wRect.width - 6;
    const d = `M ${startX} ${startY} C ${bulgeX} ${startY}, ${bulgeX} ${endY}, ${endX} ${endY}`;
    setArcPath(d);
  }, []);

  useIsomorphicLayoutEffect(() => {
    computeArc();

    const wrapper = wrapperRef.current;
    const flatten = flattenRef.current;
    const distribute = distributeRef.current;
    if (!wrapper || !flatten || !distribute) return;

    const observer = new ResizeObserver(() => {
      computeArc();
    });
    observer.observe(wrapper);
    observer.observe(flatten);
    observer.observe(distribute);

    return () => observer.disconnect();
  }, [computeArc]);

  const pathLengthTarget = arcActive ? 1 : 0.15;

  return (
    <div ref={wrapperRef} className="relative pr-10">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {arcPath && (
          <motion.path
            d={arcPath}
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: pathLengthTarget }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }
            }
          />
        )}
      </svg>

      <div className="flex flex-col gap-3">
        <StageCard stage={STAGES[0]} />
        <StageDivider />

        <StageCard stage={STAGES[1]} cardRef={flattenRef} />
        <StageDivider />

        <StageCard stage={STAGES[2]} />
        <DetectResolveMiniDiagram />

        <StageCard stage={STAGES[3]} />
        <StageDivider />

        <StageCard stage={STAGES[4]} />
        <StageDivider />

        <StageCard stage={STAGES[5]} cardRef={distributeRef} />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setArcActive((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors"
          style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-brand)',
            background: arcActive ? 'var(--surface-brand-soft)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-brand-soft)';
          }}
          onMouseLeave={(e) => {
            if (!arcActive) e.currentTarget.style.background = 'transparent';
          }}
          aria-pressed={arcActive}
        >
          <Route size={14} />
          追蹤同一份對照表
        </button>
      </div>
    </div>
  );
}
