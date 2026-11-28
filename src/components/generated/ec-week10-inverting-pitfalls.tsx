import { useId, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, TriangleAlert } from "lucide-react";

type TabKey = "rs" | "gain" | "bw" | "sr";

const RIN = 10; // kΩ（狀態 1、3、4）
const RF = 100; // kΩ
const G0 = 10; // |G0|
const GBW = 1e6; // Hz
const SR = 5e5; // V/s = 0.5 V/μs

const TABS: { key: TabKey; label: string }[] = [
  { key: "rs", label: "源阻抗" },
  { key: "gain", label: "有限增益" },
  { key: "bw", label: "頻寬" },
  { key: "sr", label: "迴轉率" },
];

const COPY: Record<TabKey, { cause: string; symptom: string; verify: string }> = {
  rs: {
    cause:
      "訊號源內阻 Rs 與 Rin 串聯一起分壓；虛接地點電位為 0，所以 Iin = Vs/(Rs+Rin)，回授電阻流過同一個電流。",
    symptom: "所有頻率、所有振幅下，增益都按同一個固定比例偏低，波形仍是乾淨的正弦。",
    verify: "拿掉 Rs（加緩衝器或換低內阻訊號源），或把 Rin 換大；偏差應隨 Rs/Rin 變化。",
  },
  gain: {
    cause:
      "開路增益 A0 不是無限大，虛短路不再完美；誤差正比於 n/A0（n = 1+|G0|），閉迴路增益越大越明顯。",
    symptom: "增益略低於理論值，低頻到中頻皆然，波形仍是乾淨的正弦；增益設很大時才看得出來。",
    verify:
      "把增益降低重測（100 降到 10），誤差應按比例縮小。並排除電阻公差：1% 電阻本身就造成約 1% 偏差，實驗中通常比有限 A0 影響更大。",
  },
  bw: {
    cause:
      "op amp 的增益隨頻率下降（增益頻寬積 GBW 為定值），閉迴路增益越大，可用頻寬越窄。",
    symptom: "波形仍是正弦，但振幅縮小、相位落後；降低頻率後增益恢復。",
    verify: "降低頻率，增益應恢復；降低輸入振幅，增益比例不變，不變就是頻寬而非迴轉率。",
  },
  sr: {
    cause:
      "op amp 內部補償電容只能以有限電流充放電，輸出電壓的變化速率有上限 SR（迴轉率，slew rate）。",
    symptom: "大訊號、較高頻下，正弦變成三角波；輸出峰值隨頻率下降且與輸入振幅無關，約為 SR/(4f)。",
    verify: "降低輸入振幅：回到正弦就是迴轉率；仍是正弦但振幅比例沒變，則是頻寬。",
  },
};

function fmtF(f: number): string {
  return f >= 1e6 ? `${(f / 1e6).toFixed(2)} MHz` : f >= 1e3 ? `${(f / 1e3).toFixed(1)} kHz` : `${f.toFixed(0)} Hz`;
}

function fmtG(g: number): string {
  return g >= 100 ? g.toFixed(0) : g >= 10 ? g.toFixed(1) : g.toFixed(2);
}

/** 單極點閉迴路增益大小與相位（|G0| = G0） */
function gainAt(f: number, g0: number): { mag: number; phi: number } {
  const f3 = GBW / (1 + g0);
  return { mag: g0 / Math.sqrt(1 + (f / f3) ** 2), phi: Math.atan(f / f3) };
}

const mono: CSSProperties = { fontFamily: "var(--font-mono)" };

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "ref" | "act" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-right" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {label}
      </span>
      <div className="h-3 flex-1 overflow-hidden" style={{ background: "var(--neutral-100)", borderRadius: "var(--radius-sm)" }}>
        <div
          className="h-full"
          style={{
            width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
            background: tone === "ref" ? "var(--neutral-400)" : "var(--blue-500)",
          }}
        />
      </div>
      <span className="w-16 shrink-0" style={{ ...mono, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>
        {fmtG(value)}
      </span>
    </div>
  );
}

function Bars({ theory, actual }: { theory: number; actual: number }) {
  const err = ((theory - actual) / theory) * 100;
  return (
    <div className="space-y-1.5">
      <Bar label="理論 |G|" value={theory} max={theory} tone="ref" />
      <Bar label="實際 |G|" value={actual} max={theory} tone="act" />
      <p className="text-right" style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-body)" }}>
        誤差 (|G0| - |G|)/|G0| = {err < 1 ? err.toFixed(3) : err.toFixed(1)}%
      </p>
    </div>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  valueText: string;
  display: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-28 shrink-0 text-right" style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-body)" }}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-[var(--blue-500)]"
      />
      <span className="w-20 shrink-0" style={{ ...mono, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>
        {display}
      </span>
    </div>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; text: ReactNode; aria: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-right" style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-body)" }}>
        {label}
      </span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              aria-label={o.aria}
              onClick={() => onChange(o.key)}
              className="px-2.5 py-1"
              style={{
                ...mono,
                fontSize: "var(--text-xs)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${on ? "var(--blue-500)" : "var(--neutral-300)"}`,
                background: on ? "var(--blue-50)" : "transparent",
                color: on ? "var(--blue-700)" : "var(--text-body)",
                fontWeight: on ? 600 : 400,
              }}
            >
              {o.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const W = 640;

function WaveSvg({
  ideal,
  actual,
  yMax,
  actualColor,
  label,
  yTicks,
}: {
  ideal: number[];
  actual: number[];
  yMax: number;
  actualColor: string;
  label: string;
  yTicks: string[];
}) {
  const H = 180;
  const mid = H / 2;
  const sy = (H / 2 - 10) / yMax;
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (arr.length - 1)) * W).toFixed(1)} ${(mid - v * sy).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label} style={{ display: "block" }}>
      <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--neutral-300)" strokeWidth="1" />
      <line x1="0" y1={mid - yMax * sy} x2={W} y2={mid - yMax * sy} stroke="var(--neutral-200)" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="0" y1={mid + yMax * sy} x2={W} y2={mid + yMax * sy} stroke="var(--neutral-200)" strokeWidth="1" strokeDasharray="2 4" />
      <text x="4" y={mid - yMax * sy + 12} fontSize="11" fill="var(--neutral-500)" style={mono}>
        {yTicks[0]}
      </text>
      <text x="4" y={mid + yMax * sy - 4} fontSize="11" fill="var(--neutral-500)" style={mono}>
        {yTicks[1]}
      </text>
      <path d={path(ideal)} fill="none" stroke="var(--neutral-400)" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={path(actual)} fill="none" stroke={actualColor} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Legend({ actualColor, actualText }: { actualColor: string; actualText: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
      <span className="inline-flex items-center gap-1.5">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke="var(--neutral-400)" strokeWidth="1.5" strokeDasharray="5 4" />
        </svg>
        理想（線性）輸出
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke={actualColor} strokeWidth="2" />
        </svg>
        {actualText}
      </span>
    </div>
  );
}

const N_PTS = 240;

function GainChart({ g0, a0 }: { g0: number; a0: number }) {
  const H = 140;
  const L = 36;
  const R = 12;
  const T = 10;
  const B = 24;
  const yMax = 10;
  const X = (g: number) => L + (Math.log10(g) / 3) * (W - L - R);
  const Y = (e: number) => T + (1 - e / yMax) * (H - T - B);
  const err = (g: number, a: number) => (((1 + g) / a) / (1 + (1 + g) / a)) * 100;
  const curve = (a: number) =>
    Array.from({ length: 61 }, (_, i) => {
      const g = 10 ** ((i / 60) * 3);
      return `${i === 0 ? "M" : "L"}${X(g).toFixed(1)} ${Y(err(g, a)).toFixed(1)}`;
    }).join(" ");
  const cx = X(g0);
  const cy = Y(err(g0, a0));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="增益誤差百分比對閉迴路增益的對數圖，A0 越小誤差越大"
      style={{ display: "block" }}
    >
      <line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke="var(--neutral-300)" />
      <line x1={L} y1={T} x2={L} y2={Y(0)} stroke="var(--neutral-300)" />
      {[0, 5, 10].map((v) => (
        <text key={v} x={L - 4} y={Y(v) + 4} fontSize="11" textAnchor="end" fill="var(--neutral-500)" style={mono}>
          {v}%
        </text>
      ))}
      {[1, 10, 100, 1000].map((g) => (
        <text key={g} x={X(g)} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--neutral-500)" style={mono}>
          {g}
        </text>
      ))}
      <path d={curve(1e4)} fill="none" stroke="var(--neutral-400)" strokeWidth="1.5" />
      <path d={curve(1e5)} fill="none" stroke="var(--blue-300)" strokeWidth="1.5" />
      <text x={W - R - 4} y={Y(9.1) - 2} fontSize="11" textAnchor="end" fill="var(--neutral-500)" style={mono}>
        A0 = 10⁴
      </text>
      <text x={W - R - 4} y={Y(1) - 6} fontSize="11" textAnchor="end" fill="var(--blue-500)" style={mono}>
        A0 = 10⁵
      </text>
      <circle cx={cx} cy={cy} r="5" fill="var(--blue-700)" stroke="var(--neutral-0)" strokeWidth="1.5" />
    </svg>
  );
}

export default function EcWeek10InvertingPitfalls() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabKey>("rs");
  // 每態旋鈕狀態獨立保存
  const [rs, setRs] = useState(2);
  const [logG, setLogG] = useState(2);
  const [a0Key, setA0Key] = useState<"e4" | "e5">("e5");
  const [logFbw, setLogFbw] = useState(4.96);
  const [logFsr, setLogFsr] = useState(4.7);
  const [big, setBig] = useState<"big" | "small">("big");

  const tabId = useId();

  // 狀態 1
  const gRs = RF / (RIN + rs);

  // 狀態 2
  const g2 = 10 ** logG;
  const a0 = a0Key === "e4" ? 1e4 : 1e5;
  const n2 = 1 + g2;
  const gMeas2 = g2 / (1 + n2 / a0);

  // 狀態 3
  const fBw = 10 ** logFbw;
  const bw = useMemo(() => {
    const vp = 0.05;
    const { mag, phi } = gainAt(fBw, G0);
    const ideal: number[] = [];
    const actual: number[] = [];
    for (let i = 0; i <= N_PTS; i++) {
      const th = (i / N_PTS) * 3 * 2 * Math.PI;
      ideal.push(-G0 * vp * Math.sin(th));
      actual.push(-mag * vp * Math.sin(th - phi));
    }
    return { ideal, actual, mag, phi };
  }, [fBw]);

  // 狀態 4
  const fSr = 10 ** logFsr;
  const vpSr = big === "big" ? 0.5 : 0.05;
  const sr = useMemo(() => {
    const N = 400;
    const dt = 4 / (fSr * N);
    const { mag, phi } = gainAt(fSr, G0);
    const lin = (t: number) => -mag * vpSr * Math.sin(2 * Math.PI * fSr * t - phi);
    const idealFn = (t: number) => -G0 * vpSr * Math.sin(2 * Math.PI * fSr * t);
    const v = new Array<number>(N + 1).fill(0);
    for (let k = 0; k < N; k++) {
      const d = lin((k + 1) * dt) - v[k];
      const lim = SR * dt;
      v[k + 1] = v[k] + Math.max(-lim, Math.min(lim, d));
    }
    const start = Math.round(N / 4);
    const actual = v.slice(start);
    const ideal = actual.map((_, i) => idealFn((start + i) * dt));
    const sReq = 2 * Math.PI * fSr * mag * vpSr; // V/s
    return { actual, ideal, sReq, limited: sReq > SR, mag };
  }, [fSr, vpSr]);
  const fSlew = SR / (2 * Math.PI * 5);


  const cols: CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };
  const card: CSSProperties = {
    border: "1px solid var(--neutral-200)",
    borderRadius: "var(--radius-lg)",
    padding: 12,
    background: "var(--neutral-50)",
  };
  const small: CSSProperties = { fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-strong)", marginBottom: 4 };
  const body: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.6, margin: 0 };


  return (
    <div className="not-prose space-y-4">
      <div role="tablist" aria-label="反相放大器增益偏差的四種嫌疑" className="flex flex-wrap gap-1" style={{ borderBottom: "1px solid var(--neutral-200)" }}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${tabId}-tab-${t.key}`}
              aria-selected={on}
              aria-controls={`${tabId}-panel`}
              onClick={() => setTab(t.key)}
              className="px-3 py-2"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: on ? 600 : 400,
                color: on ? "var(--blue-700)" : "var(--text-muted)",
                borderBottom: `2px solid ${on ? "var(--blue-700)" : "transparent"}`,
                borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-tab-${tab}`} className="grid grid-cols-[minmax(0,1fr)]">
        {TABS.map(({ key: k }) => {
          const on = k === tab;
          const c = COPY[k];
          return (
            <motion.div
              key={k}
              className="min-w-0 space-y-4"
              aria-hidden={!on}
              style={{ gridArea: "1 / 1", visibility: on ? "visible" : "hidden" }}
              initial={false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 4 }}
              transition={on && !reduce ? { duration: 0.2, ease: "easeOut" } : { duration: 0 }}
            >
                <div className="space-y-2.5">
                  {k === "rs" && (
                    <>
                      <Bars theory={G0} actual={gRs} />
                      <Knob
                        label="源阻抗 Rs"
                        value={rs}
                        min={0}
                        max={5}
                        step={0.5}
                        onChange={setRs}
                        valueText={`${rs} 千歐姆`}
                        display={`${rs.toFixed(1)} kΩ`}
                      />
                      <p style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-body)", margin: 0 }}>
                        G = -Rf/(Rin+Rs) = -{RF}/({RIN}+{rs.toFixed(1)}) = -{gRs.toFixed(2)}
                      </p>
                    </>
                  )}
    
                  {k === "gain" && (
                    <>
                      <Bars theory={g2} actual={gMeas2} />
                      <Knob
                        label="理論增益 |G0|"
                        value={logG}
                        min={0}
                        max={3}
                        step={0.01}
                        onChange={setLogG}
                        valueText={`理論增益 ${fmtG(g2)}`}
                        display={fmtG(g2)}
                      />
                      <Chips
                        label="開路增益 A0"
                        value={a0Key}
                        onChange={setA0Key}
                        options={[
                          { key: "e4", text: <>10<sup>4</sup> (80 dB)</>, aria: "A0 等於 10 的 4 次方，80 分貝" },
                          { key: "e5", text: <>10<sup>5</sup> (100 dB)</>, aria: "A0 等於 10 的 5 次方，100 分貝" },
                        ]}
                      />
                      <p style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-body)", margin: 0 }}>
                        n = 1+|G0| = {fmtG(n2)}；G = |G0|/(1+n/A0) = {fmtG(gMeas2)}
                      </p>
                      <GainChart g0={g2} a0={a0} />
                    </>
                  )}
    
                  {k === "bw" && (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Legend actualColor="var(--blue-500)" actualText="實際輸出" />
                        <span style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-strong)" }}>
                          |G(f)| = {bw.mag.toFixed(2)}；相位 -{((bw.phi * 180) / Math.PI).toFixed(0)}°
                        </span>
                      </div>
                      <WaveSvg
                        ideal={bw.ideal}
                        actual={bw.actual}
                        yMax={0.6}
                        actualColor="var(--blue-500)"
                        label={`頻率 ${fmtF(fBw)} 時的輸出波形，增益 ${bw.mag.toFixed(2)}，相位落後 ${((bw.phi * 180) / Math.PI).toFixed(0)} 度`}
                        yTicks={["+0.6 V", "-0.6 V"]}
                      />
                      <Knob
                        label="輸入頻率 f"
                        value={logFbw}
                        min={3}
                        max={6}
                        step={0.01}
                        onChange={setLogFbw}
                        valueText={fmtF(fBw)}
                        display={fmtF(fBw)}
                      />
                      <p style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-body)", margin: 0 }}>
                        GBW = 1 MHz，f3 = GBW/(1+|G0|) = {fmtF(GBW / (1 + G0))}；輸入 Vp = 0.05 V
                      </p>
                    </>
                  )}
    
                  {k === "sr" && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Legend actualColor={sr.limited ? "var(--danger-500)" : "var(--blue-500)"} actualText="模擬輸出" />
                        <span
                          className="inline-flex items-center gap-1.5"
                          style={{ ...mono, fontSize: "var(--text-xs)", color: sr.limited ? "var(--danger-500)" : "var(--text-strong)" }}
                        >
                          {sr.limited ? <TriangleAlert size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                          S_req = {(sr.sReq / 1e6).toFixed(3)} V/μs {sr.limited ? ">" : "≤"} SR = 0.5 V/μs
                          {!sr.limited && big === "small" && <span style={{ fontFamily: "inherit" }}>，恢復正弦</span>}
                        </span>
                      </div>
                      <WaveSvg
                        ideal={sr.ideal}
                        actual={sr.actual}
                        yMax={5}
                        actualColor={sr.limited ? "var(--danger-500)" : "var(--blue-500)"}
                        label={`頻率 ${fmtF(fSr)}、輸入振幅 ${vpSr} V 時的輸出波形，${sr.limited ? "受迴轉率限制，變成三角波" : "維持正弦"}`}
                        yTicks={["+5 V", "-5 V"]}
                      />
                      <Knob
                        label="輸入頻率 f"
                        value={logFsr}
                        min={Math.log10(2000)}
                        max={5}
                        step={0.01}
                        onChange={setLogFsr}
                        valueText={fmtF(fSr)}
                        display={fmtF(fSr)}
                      />
                      <Chips
                        label="輸入振幅"
                        value={big}
                        onChange={setBig}
                        options={[
                          { key: "big", text: "大訊號 Vp = 0.5 V", aria: "大訊號，輸入峰值 0.5 伏" },
                          { key: "small", text: "小訊號 Vp = 0.05 V", aria: "小訊號，輸入峰值 0.05 伏" },
                        ]}
                      />
                      <p style={{ ...mono, fontSize: "var(--text-xs)", color: "var(--text-body)", margin: 0, lineHeight: 1.6 }}>
                        全功率頻寬 f_slew = SR/(2πA) = {fmtF(fSlew)}（A = 5 V 峰值），不同於小訊號頻寬 {fmtF(GBW / (1 + G0))}
                      </p>
                    </>
                  )}
                </div>
    
                <div style={cols}>
                  <div style={card}>
                    <div style={small}>成因</div>
                    <p style={body}>{c.cause}</p>
                  </div>
                  <div style={card}>
                    <div style={small}>示波器上的症狀</div>
                    <p style={body}>{c.symptom}</p>
                  </div>
                  <div style={card}>
                    <div style={small}>怎麼驗證</div>
                    <p style={body}>{c.verify}</p>
                  </div>
                </div>
            </motion.div>
          );
        })}
      </div>

      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.6, margin: 0 }}>
        先降低頻率：增益恢復，是頻寬或迴轉率；仍偏低，是源內阻或有限增益。再降低振幅：波形回到正弦，是迴轉率；增益比例不變，是頻寬。
      </p>
    </div>
  );
}
