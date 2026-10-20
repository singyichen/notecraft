import { useMemo, useState } from 'react';
import { TrendingUp, Zap, Ruler, TriangleAlert, CircleCheck } from 'lucide-react';

// ── 電路常數（見筆記第二部分：CE 放大器實驗元件值）────────────────────────
const VCC = 12; // V
const RE1 = 1000; // Ω
const RL1 = 10000; // Ω
// R_S1 = 100 Ω（訊號源內阻）只透過 INPUT_ATTEN 這個比值間接影響結果，詳見下方說明
const C3 = 1e-6; // F（射極旁路電容）
const F_SIG = 10000; // Hz（10 kHz 訊號）
const VT = 0.0259; // V（熱電壓，室溫）
const VBE_ON = 0.7; // V
const VCE_SAT = 0.2; // V（飽和判準）
const VIN_PK = 0.05; // V（100 mVpp 輸入的峰值）

// 分壓偏壓：R1 = R2 = 10 kΩ，基極電位約 VCC/2，與 R_C1 無關（偏壓只由分壓網路決定）
const VB = VCC / 2; // 6 V
const VE = VB - VBE_ON; // 5.3 V
const IC = VE / RE1; // ≈ 5.3 mA，不隨 R_C1 改變
const GM = IC / VT; // 轉導

// 輸入端衰減：Rin = R1 ∥ R2 ∥ r_π 對 R_S1 分壓。
// 依筆記 Bonus 小節的推算（理想全旁路增益上限 19.7、計入訊號源分壓後剩 16.6），
// 兩者比值就是 Rin/(Rin + R_S1)，此比值與 R_C1 無關（輸入側與集極側解耦）。
const INPUT_ATTEN = 16.6 / 19.7;

// C3 並非理想短路：1 µF 在 10 kHz 的容抗與 1/g_m 相當，射極看出去的等效阻抗
// 是 (1/g_m) 與 C3 阻抗的複數相加（R_E1 遠大於容抗，近似忽略其並聯效應）。
const OMEGA = 2 * Math.PI * F_SIG;
const XC3 = 1 / (OMEGA * C3);
// R_E1 與 C3 並聯後的複數阻抗
function emitterBypassImpedance(): { re: number; im: number } {
  // Z_c3 = -j·Xc3；Z_par = (R_E1 · Z_c3) / (R_E1 + Z_c3)
  const zc3Re = 0;
  const zc3Im = -XC3;
  const denomRe = RE1 + zc3Re;
  const denomIm = zc3Im;
  const denomMagSq = denomRe * denomRe + denomIm * denomIm;
  const numRe = RE1 * zc3Re - 0 * zc3Im; // RE1 is real, zc3 is (0, -Xc3)
  const numIm = RE1 * zc3Im;
  const parRe = (numRe * denomRe + numIm * denomIm) / denomMagSq;
  const parIm = (numIm * denomRe - numRe * denomIm) / denomMagSq;
  return { re: parRe, im: parIm };
}
const ZE_PAR = emitterBypassImpedance();
const Z_TOTAL_RE = 1 / GM + ZE_PAR.re;
const Z_TOTAL_IM = ZE_PAR.im;
const Z_TOTAL_MAG = Math.sqrt(Z_TOTAL_RE * Z_TOTAL_RE + Z_TOTAL_IM * Z_TOTAL_IM);

function parallel(a: number, b: number): number {
  return (a * b) / (a + b);
}

interface OperatingPoint {
  rc1: number;
  rcParallel: number;
  avMag: number;
  vc: number;
  vce: number;
  headroom: number;
}

function computeOperatingPoint(rc1: number): OperatingPoint {
  const rcParallel = parallel(rc1, RL1);
  const avMag = (INPUT_ATTEN * rcParallel) / Z_TOTAL_MAG;
  const vc = VCC - IC * rc1;
  const vce = vc - VE;
  const headroom = vce - VCE_SAT;
  return { rc1, rcParallel, avMag, vc, vce, headroom };
}

function formatOhm(ohm: number): string {
  if (ohm >= 1000) return `${(ohm / 1000).toFixed(ohm % 1000 === 0 ? 0 : 2)} kΩ`;
  return `${ohm.toFixed(0)} Ω`;
}

// ── 波形座標（viewBox 640 x 230，兩段分開畫：輸入示意 + 輸出實際電壓）────
const VIEW_W = 640;
const X0 = 40;
const X1 = 616;
const PERIODS = 2;
const N_SAMPLES = 161;

const IN_Y_MID = 38;
const IN_Y_SPAN = 22;

const OUT_Y_MID = 150;
const OUT_PLOT_HALF = 68; // px，對應 outYMax 伏特

function xAt(frac: number): number {
  return X0 + frac * (X1 - X0);
}

interface WavePoint {
  frac: number;
  vin: number;
  voutIdeal: number;
  voutClipped: number;
  clipped: boolean;
}

function buildWave(avMag: number, headroomClamped: number): WavePoint[] {
  const points: WavePoint[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const frac = i / (N_SAMPLES - 1);
    const theta = frac * PERIODS * 2 * Math.PI;
    const vin = VIN_PK * Math.sin(theta);
    // 反相放大：vin 為正時輸出朝負向擺（集極電位下降）
    const voutIdeal = -avMag * vin;
    const floor = -headroomClamped;
    const clipped = voutIdeal < floor;
    const voutClipped = clipped ? floor : voutIdeal;
    points.push({ frac, vin, voutIdeal, voutClipped, clipped });
  }
  return points;
}

function buildPath(points: WavePoint[], yMid: number, yPerVolt: number, key: 'vin' | 'voutClipped'): string {
  return points
    .map((p, i) => {
      const x = xAt(p.frac);
      const y = yMid - p[key] * yPerVolt;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

interface ClipRegion {
  startFrac: number;
  endFrac: number;
}

function findClipRegions(points: WavePoint[]): ClipRegion[] {
  const regions: ClipRegion[] = [];
  let current: ClipRegion | null = null;
  for (const p of points) {
    if (p.clipped) {
      if (!current) {
        current = { startFrac: p.frac, endFrac: p.frac };
      } else {
        current.endFrac = p.frac;
      }
    } else if (current) {
      regions.push(current);
      current = null;
    }
  }
  if (current) regions.push(current);
  return regions;
}

export default function EcWeek6GainHeadroom() {
  const [rc1, setRc1] = useState(100);

  const op = useMemo(() => computeOperatingPoint(rc1), [rc1]);
  const headroomClamped = Math.max(op.headroom, 0);
  const saturated = op.headroom <= 0;

  const points = useMemo(() => buildWave(op.avMag, headroomClamped), [op.avMag, headroomClamped]);
  const clipRegions = useMemo(() => findClipRegions(points), [points]);

  const idealPeak = op.avMag * VIN_PK;
  const outYMax = Math.max(idealPeak, headroomClamped, 0.3) * 1.15;
  const outYPerVolt = OUT_PLOT_HALF / outYMax;
  const inYPerVolt = IN_Y_SPAN / VIN_PK;

  const vinPath = useMemo(() => buildPath(points, IN_Y_MID, inYPerVolt, 'vin'), [points, inYPerVolt]);
  const voutPath = useMemo(
    () => buildPath(points, OUT_Y_MID, outYPerVolt, 'voutClipped'),
    [points, outYPerVolt]
  );

  const clipFloorY = OUT_Y_MID + headroomClamped * outYPerVolt;

  return (
    <div className="not-prose flex flex-col gap-4">
      <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / 230` }}>
        <svg
          viewBox={`0 0 ${VIEW_W} 230`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="CE 放大器輸入輸出波形，輸出負半週可能因進入飽和而削平"
        >
          {/* 輸入區塊 */}
          <text x={X0} y={14} fontSize={10} fill="var(--text-muted)">
            輸入 Vin（示意，振幅未按比例）
          </text>
          <line x1={X0} y1={IN_Y_MID} x2={X1} y2={IN_Y_MID} stroke="var(--border-subtle)" strokeDasharray="2 3" />
          <path d={vinPath} fill="none" stroke="var(--blue-300)" strokeWidth={1.75} />

          {/* 分隔線 */}
          <line x1={X0} y1={70} x2={X1} y2={70} stroke="var(--border-subtle)" />

          {/* 輸出區塊 */}
          <text x={X0} y={86} fontSize={10} fill="var(--text-muted)">
            輸出 Vout（實際電壓，反相放大）
          </text>
          <line
            x1={X0}
            y1={OUT_Y_MID}
            x2={X1}
            y2={OUT_Y_MID}
            stroke="var(--border-subtle)"
            strokeDasharray="2 3"
          />

          {headroomClamped > 0 && (
            <line
              x1={X0}
              y1={clipFloorY}
              x2={X1}
              y2={clipFloorY}
              stroke="var(--danger-500)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}

          {clipRegions.map((r, i) => (
            <rect
              key={i}
              x={xAt(r.startFrac)}
              y={clipFloorY - 3}
              width={Math.max(xAt(r.endFrac) - xAt(r.startFrac), 1)}
              height={OUT_Y_MID + OUT_PLOT_HALF + 10 - (clipFloorY - 3)}
              fill="var(--danger-50)"
            />
          ))}

          <path d={voutPath} fill="none" stroke="var(--orange-500)" strokeWidth={2.25} strokeLinejoin="round" />

          {saturated && (
            <text x={X1} y={OUT_Y_MID + 4} fontSize={10} textAnchor="end" fill="var(--danger-500)" fontWeight={600}>
              已深度飽和
            </text>
          )}
        </svg>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rc1-slider" className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>集極電阻 R_C1</span>
          <span className="font-semibold tabular-nums text-[var(--text-strong)]">{formatOhm(rc1)}</span>
        </label>
        <input
          id="rc1-slider"
          type="range"
          min={50}
          max={1500}
          step={10}
          value={rc1}
          onChange={(e) => setRc1(Number(e.target.value))}
          className="w-full accent-[var(--orange-500)]"
          aria-label="集極電阻 R_C1，50 歐姆到 1.5 千歐姆"
        />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <TrendingUp size={13} />
            小訊號增益
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {op.avMag.toFixed(1)} 倍（反相）
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Zap size={13} />
            集極直流電位 V_C
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {op.vc.toFixed(2)} V
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Ruler size={13} />
            距飽和餘裕
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {headroomClamped.toFixed(2)} V
          </div>
          {saturated ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--danger-500)]">
              <TriangleAlert size={12} className="shrink-0" />
              直流工作點已進入飽和
            </div>
          ) : clipRegions.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--warning-700)]">
              <TriangleAlert size={12} className="shrink-0" />
              負半週已被削平
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--success-500)]">
              <CircleCheck size={12} className="shrink-0" />
              未削波
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--orange-500)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--text-body)]">
        {saturated
          ? `R_C1 已經把集極電位壓得太低，工作點本身就撞進飽和——拿掉輸入訊號也救不回來，必須重新設計偏壓。`
          : clipRegions.length > 0
          ? `集極電阻越大增益越高（目前 ${op.avMag.toFixed(1)} 倍），但直流壓降也越大，只剩 ${headroomClamped.toFixed(2)} V 餘裕，輸出負半週已經削平。`
          : `集極電阻越大增益越高，但直流壓降越大、越早進入飽和而削波——目前餘裕還有 ${headroomClamped.toFixed(2)} V，波形完整。`}
        {op.avMag < 12 ? '　輸出畫在 0–12 V 的真實尺度上，所以這個增益下的擺幅看起來很小：把滑桿往右拉，就會看到波形長大、同時整條往下掉，最後撞到底部削平。' : ''}
      </div>
    </div>
  );
}
