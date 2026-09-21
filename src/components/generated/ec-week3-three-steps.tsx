type WaveformKind = "input" | "rectified" | "filtered" | "regulated";

const waveformLabels: Record<WaveformKind, string> = {
  input: "正負交替的交流正弦波",
  rectified: "只保留正半週的整流波形",
  filtered: "帶有漣波的濾波後直流",
  regulated: "接近水平線的穩壓後直流",
};

interface Stage {
  title: string;
  transition: string;
  cost: string;
  waveform: WaveformKind;
}

const stages: Stage[] = [
  {
    title: "輸入",
    transition: "原始交流",
    cost: "處理前的基準波形",
    waveform: "input",
  },
  {
    title: "整流後",
    transition: "去掉負半週",
    cost: "損失二極體壓降",
    waveform: "rectified",
  },
  {
    title: "加濾波電容後",
    transition: "填平空檔",
    cost: "漣波與二極體峰值電流的取捨",
    waveform: "filtered",
  },
  {
    title: "穩壓後",
    transition: "壓掉漣波與輸入變動",
    cost: "額外電路與功耗",
    waveform: "regulated",
  },
];

function Waveform({ kind }: { kind: WaveformKind }): JSX.Element {
  const commonProps = {
    fill: "none",
    stroke: "var(--blue-500)",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 140 68"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={waveformLabels[kind]}
    >
      <line
        x1="4"
        y1="34"
        x2="136"
        y2="34"
        stroke="var(--border-subtle)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {kind === "input" && (
        <path
          d="M4 34 C12 8 22 8 30 34 S48 60 56 34 S74 8 82 34 S100 60 108 34 S126 8 136 34"
          {...commonProps}
        />
      )}

      {kind === "rectified" && (
        <path
          d="M4 34 C12 11 22 11 30 34 L56 34 C64 11 74 11 82 34 L108 34 C116 11 126 11 136 34"
          {...commonProps}
        />
      )}

      {kind === "filtered" && (
        <>
          <path
            d="M4 23 C12 25 22 28 30 31 C34 24 39 19 45 18 C54 21 66 25 76 29 C80 23 85 18 91 17 C101 20 113 24 123 28 C127 22 131 18 136 17"
            fill="none"
            stroke="var(--blue-200)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 23 C12 25 22 28 30 31 C34 24 39 19 45 18 C54 21 66 25 76 29 C80 23 85 18 91 17 C101 20 113 24 123 28 C127 22 131 18 136 17"
            {...commonProps}
          />
        </>
      )}

      {kind === "regulated" && (
        <>
          <path
            d="M4 21 C27 20 47 22 70 21 S113 20 136 21"
            fill="none"
            stroke="var(--blue-100)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path d="M4 21 C27 20 47 22 70 21 S113 20 136 21" {...commonProps} />
        </>
      )}
    </svg>
  );
}

export default function EcWeek3ThreeSteps(): JSX.Element {
  return (
    <div
      className="not-prose flex w-full flex-wrap gap-2.5"
      aria-label="從交流輸入到穩定直流的處理流程"
    >
      {stages.map((stage, index) => (
        <section
          key={stage.title}
          className="flex min-w-[136px] flex-1 basis-[136px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
        >
          <div className="flex min-h-12 items-center gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-brand-soft)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--text-brand)]">
            {index > 0 && (
              <svg
                viewBox="0 0 18 10"
                width="18"
                height="10"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  d="M1 5 H15 M11 1 L15 5 L11 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{stage.transition}</span>
          </div>

          <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
            <h3 className="m-0 text-sm font-bold leading-snug text-[var(--text-strong)]">
              {stage.title}
            </h3>
            <div className="mt-2 flex min-h-[72px] items-center">
              <Waveform kind={stage.waveform} />
            </div>
            <div className="mt-auto border-t border-[var(--border-subtle)] pt-2.5">
              <span className="block text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">
                代價
              </span>
              <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--neutral-600)]">
                {stage.cost}
              </p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
