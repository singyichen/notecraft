import { useId, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";

interface SimulationPoint {
  time: number;
  rectifiedInput: number;
  output: number;
  diodeOn: boolean;
}

interface SimulationResult {
  points: SimulationPoint[];
  peakOutput: number;
  troughOutput: number;
  averageOutput: number;
  ripplePeakToPeak: number;
  ripplePercent: number;
  conductionWindowMs: number;
  estimatedPeakCurrentMa: number;
  peakCurrentMultiple: number;
}

const PEAK_INPUT_V = 5;
const FREQUENCY_HZ = 60;
const LOAD_OHM = 10_000;
const DIODE_DROP_V = 0.7;
const PERIOD_S = 1 / FREQUENCY_HZ;
const STEPS_PER_PERIOD = 1_600;
const DISPLAY_PERIODS = 3;
const SIMULATED_PERIODS = 7;
const PEAK_CURRENT_WARNING_MA = 30;

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 248;
const PLOT_LEFT = 42;
const PLOT_RIGHT = 616;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 205;
const PLOT_MAX_V = 5.4;

function capacitorFromPosition(position: number): number {
  const minUf = 0.47;
  const maxUf = 470;
  return minUf * Math.pow(maxUf / minUf, position / 100);
}

function formatCapacitance(capacitanceUf: number): string {
  if (capacitanceUf < 10) return `${capacitanceUf.toFixed(2)} μF`;
  if (capacitanceUf < 100) return `${capacitanceUf.toFixed(1)} μF`;
  return `${capacitanceUf.toFixed(0)} μF`;
}

function formatVoltage(voltage: number): string {
  return `${voltage.toFixed(voltage < 1 ? 3 : 2)} V`;
}

function formatCurrent(currentMa: number): string {
  return `${currentMa.toFixed(currentMa < 10 ? 2 : 1)} mA`;
}

function runSimulation(capacitanceUf: number): SimulationResult {
  const capacitanceF = capacitanceUf * 1e-6;
  const dt = PERIOD_S / STEPS_PER_PERIOD;
  const displayStart = (SIMULATED_PERIODS - DISPLAY_PERIODS) * PERIOD_S;
  const analysisStart = (SIMULATED_PERIODS - 1) * PERIOD_S;
  const points: SimulationPoint[] = [];
  const analysisOutputs: number[] = [];
  let output = 0;
  let conductionSteps = 0;

  for (let step = 0; step <= SIMULATED_PERIODS * STEPS_PER_PERIOD; step += 1) {
    const time = step * dt;
    const input = PEAK_INPUT_V * Math.sin(2 * Math.PI * FREQUENCY_HZ * time);
    const rectifiedInput = Math.max(0, input);
    const availableVoltage = Math.max(0, rectifiedInput - DIODE_DROP_V);
    const diodeOn = availableVoltage > output;

    if (diodeOn) {
      output = availableVoltage;
    } else {
      output *= Math.exp(-dt / (LOAD_OHM * capacitanceF));
    }

    if (time >= displayStart && step % 6 === 0) {
      points.push({
        time: time - displayStart,
        rectifiedInput,
        output,
        diodeOn,
      });
    }

    if (time >= analysisStart) {
      analysisOutputs.push(output);
      if (diodeOn) conductionSteps += 1;
    }
  }

  const peakOutput = Math.max(...analysisOutputs);
  const troughOutput = Math.min(...analysisOutputs);
  const averageOutput =
    analysisOutputs.reduce((sum, value) => sum + value, 0) /
    analysisOutputs.length;
  const ripplePeakToPeak = peakOutput - troughOutput;
  const ripplePercent =
    averageOutput > 0 ? (ripplePeakToPeak / averageOutput) * 100 : 0;
  const conductionWindowS = Math.max(conductionSteps * dt, dt);
  const averageLoadCurrentA = averageOutput / LOAD_OHM;
  const chargePerPeriodC = averageLoadCurrentA * PERIOD_S;
  const estimatedPeakCurrentA = (2 * chargePerPeriodC) / conductionWindowS;
  const peakCurrentMultiple =
    averageLoadCurrentA > 0 ? estimatedPeakCurrentA / averageLoadCurrentA : 0;

  return {
    points,
    peakOutput,
    troughOutput,
    averageOutput,
    ripplePeakToPeak,
    ripplePercent,
    conductionWindowMs: conductionWindowS * 1_000,
    estimatedPeakCurrentMa: estimatedPeakCurrentA * 1_000,
    peakCurrentMultiple,
  };
}

function xScale(time: number): number {
  return (
    PLOT_LEFT + (time / (DISPLAY_PERIODS * PERIOD_S)) * (PLOT_RIGHT - PLOT_LEFT)
  );
}

function yScale(voltage: number): number {
  return (
    PLOT_BOTTOM - (Math.max(0, voltage) / PLOT_MAX_V) * (PLOT_BOTTOM - PLOT_TOP)
  );
}

function buildLinePath(
  points: SimulationPoint[],
  key: "rectifiedInput" | "output",
): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${xScale(point.time).toFixed(2)} ${yScale(point[key]).toFixed(2)}`;
    })
    .join(" ");
}

function buildRippleAreaPath(
  points: SimulationPoint[],
  peakOutput: number,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const outputPath = points
    .map(
      (point) =>
        `L ${xScale(point.time).toFixed(2)} ${yScale(point.output).toFixed(2)}`,
    )
    .join(" ");

  return [
    `M ${xScale(first.time).toFixed(2)} ${yScale(peakOutput).toFixed(2)}`,
    outputPath,
    `L ${xScale(last.time).toFixed(2)} ${yScale(peakOutput).toFixed(2)}`,
    "Z",
  ].join(" ");
}

interface ReadingCardProps {
  label: string;
  value: string;
  note: string;
  warning?: boolean;
}

function ReadingCard({
  label,
  value,
  note,
  warning = false,
}: ReadingCardProps): JSX.Element {
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-3"
      style={{
        background: warning ? "var(--danger-50)" : "var(--surface-card)",
        borderColor: warning ? "var(--danger-500)" : "var(--border-subtle)",
      }}
    >
      <span className="block text-[11px] font-semibold leading-snug text-[var(--text-muted)]">
        {label}
      </span>
      <strong
        className="mt-1 block text-base font-bold tabular-nums"
        style={{ color: warning ? "var(--danger-500)" : "var(--text-strong)" }}
      >
        {value}
      </strong>
      <span className="mt-1 block text-[10px] leading-snug text-[var(--neutral-500)]">
        {note}
      </span>
    </div>
  );
}

export default function EcWeek3Ripple(): JSX.Element {
  const sliderId = useId();
  const [capacitorPosition, setCapacitorPosition] = useState(56);
  const capacitanceUf = useMemo(
    () => capacitorFromPosition(capacitorPosition),
    [capacitorPosition],
  );
  const result = useMemo(() => runSimulation(capacitanceUf), [capacitanceUf]);
  const outputPath = useMemo(
    () => buildLinePath(result.points, "output"),
    [result.points],
  );
  const inputPath = useMemo(
    () => buildLinePath(result.points, "rectifiedInput"),
    [result.points],
  );
  const rippleAreaPath = useMemo(
    () => buildRippleAreaPath(result.points, result.peakOutput),
    [result.points, result.peakOutput],
  );

  const rippleWarning = result.ripplePercent > 10;
  const peakCurrentWarning =
    result.estimatedPeakCurrentMa > PEAK_CURRENT_WARNING_MA;
  const hasWarning = rippleWarning || peakCurrentWarning;

  const handleCapacitorChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setCapacitorPosition(Number(event.target.value));
  };

  const warningText = useMemo(() => {
    if (rippleWarning && peakCurrentWarning) {
      return "漣波超過 10%，充電尖峰也越過示範警戒線；請把電容移回中間範圍。";
    }
    if (rippleWarning) {
      return "漣波超過 10%；增大電容能改善平滑度，但也會縮短充電窗口。";
    }
    if (peakCurrentWarning) {
      return "估算峰值電流越過 30 mA 示範警戒線；電容過大會讓充電更集中。";
    }
    return "目前漣波與充電尖峰都在示範警戒範圍內，仍可拖動滑桿比較兩端代價。";
  }, [peakCurrentWarning, rippleWarning]);

  return (
    <div className="not-prose flex w-full flex-col gap-4">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <label
              htmlFor={sliderId}
              className="block text-sm font-semibold text-[var(--text-strong)]"
            >
              濾波電容
            </label>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--text-muted)]">
              半波整流模型：5 V 峰值、60 Hz、負載 10 kΩ、二極體壓降 0.7 V
            </span>
          </div>
          <output
            htmlFor={sliderId}
            className="rounded-[var(--radius-pill)] bg-[var(--blue-100)] px-3 py-1 text-sm font-bold tabular-nums text-[var(--text-brand)]"
          >
            {formatCapacitance(capacitanceUf)}
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min="0"
          max="100"
          step="1"
          value={capacitorPosition}
          onChange={handleCapacitorChange}
          className="mt-3 h-2 w-full cursor-pointer accent-[var(--blue-600)]"
          aria-label="調整濾波電容大小"
          aria-valuetext={formatCapacitance(capacitanceUf)}
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--text-muted)]">
          <span>0.47 μF</span>
          <span>470 μF</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="pointer-events-none absolute right-3 top-2 z-10 flex flex-wrap justify-end gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-card)]/90 px-2 py-1 text-[10px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 bg-[var(--neutral-300)]" /> 整流後輸入
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 bg-[var(--blue-600)]" /> 電容輸出
          </span>
        </div>
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`濾波電容 ${formatCapacitance(capacitanceUf)} 時的輸出波形`}
        >
          {[0, 1, 2, 3, 4, 5].map((voltage) => (
            <line
              key={`grid-${voltage}`}
              x1={PLOT_LEFT}
              y1={yScale(voltage)}
              x2={PLOT_RIGHT}
              y2={yScale(voltage)}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
          ))}

          {[0, 1, 2, 3].map((period) => (
            <line
              key={`period-${period}`}
              x1={xScale(period * PERIOD_S)}
              y1={PLOT_TOP}
              x2={xScale(period * PERIOD_S)}
              y2={PLOT_BOTTOM}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}

          <path d={rippleAreaPath} fill="var(--blue-100)" opacity="0.72" />
          <path
            d={inputPath}
            fill="none"
            stroke="var(--neutral-300)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d={outputPath}
            fill="none"
            stroke="var(--blue-600)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {[0, 1, 2, 3, 4, 5].map((voltage) => (
            <text
              key={`label-${voltage}`}
              x={PLOT_LEFT - 8}
              y={yScale(voltage) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {voltage}
            </text>
          ))}
          <text x="10" y="16" fontSize="10" fill="var(--text-muted)">
            V
          </text>
          {[0, 1, 2, 3].map((period) => (
            <text
              key={`time-${period}`}
              x={xScale(period * PERIOD_S)}
              y={PLOT_BOTTOM + 18}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {period === 0 ? "0" : `${period}T`}
            </text>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ReadingCard
          label="漣波峰對峰值"
          value={formatVoltage(result.ripplePeakToPeak)}
          note={`輸出約 ${result.troughOutput.toFixed(2)}–${result.peakOutput.toFixed(2)} V`}
        />
        <ReadingCard
          label="漣波佔輸出"
          value={`${result.ripplePercent.toFixed(1)}%`}
          note="以平均輸出電壓為基準"
          warning={rippleWarning}
        />
        <ReadingCard
          label="二極體導通窗口"
          value={`${result.conductionWindowMs.toFixed(2)} ms`}
          note="每個輸入週期的估算值"
        />
        <ReadingCard
          label="二極體峰值電流"
          value={formatCurrent(result.estimatedPeakCurrentMa)}
          note={`約平均負載電流 ${result.peakCurrentMultiple.toFixed(1)} 倍`}
          warning={peakCurrentWarning}
        />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 text-xs leading-relaxed"
        style={{
          background: hasWarning ? "var(--danger-50)" : "var(--success-50)",
          borderColor: hasWarning ? "var(--danger-500)" : "var(--success-500)",
          color: hasWarning ? "var(--danger-500)" : "var(--success-500)",
        }}
      >
        {hasWarning ? (
          <TriangleAlert
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <CircleCheck
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <span>{warningText}</span>
      </div>

      <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">
        峰值電流以負載電荷與三角脈衝近似；30 mA
        是用來觀察取捨的示範警戒線，不代表 1N4007 的絕對額定值。
      </p>
    </div>
  );
}
