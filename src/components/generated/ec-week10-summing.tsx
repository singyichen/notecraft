import { useState } from 'react';
import { TriangleAlert, Info } from 'lucide-react';

const R = [10, 20, 40] as const; // kΩ，固定
const COLORS = ['var(--blue-500)', 'var(--orange-400)', 'var(--success-500)'] as const;
// 滑桿的 accent-color 用 class 而不是 style：inline style 的 CSS 變數在 SSR／client 序列化不同，會觸發 hydration 警告
const ACCENT = ['accent-[var(--blue-500)]', 'accent-[var(--orange-400)]', 'accent-[var(--success-500)]'] as const;
const TEXT_ON = ['#ffffff', 'var(--neutral-900)', '#ffffff'] as const; // 對比字色：橘底用深字
const RAIL = 5;
const X0 = 320;
const PX = 28;

const fmt = (n: number, d = 1) => {
  const s = (Math.round(n * 1000) / 1000).toFixed(d);
  return s === '-0.0' || s === '-0.00' ? s.slice(1) : s;
};
const sgn = (n: number, d = 1) => (n > 0 ? '+' : '') + fmt(n, d);
const clampX = (x: number) => Math.max(40, Math.min(600, x));

export default function EcWeek10Summing() {
  const [dv, setDv] = useState<[number, number, number]>([10, 20, -10]); // deci-volt
  const [rf, setRf] = useState(20);
  const [dragging, setDragging] = useState<0 | 1 | 2 | null>(null);

  const v = dv.map((d) => d / 10);
  const w = R.map((r) => rf / r);
  const cur = v.map((x, i) => x / R[i]); // mA
  const c = v.map((x, i) => -w[i] * x);
  const ideal = c.reduce((a, b) => a + b, 0);
  const out = Math.max(-RAIL, Math.min(RAIL, ideal));
  const clipped = Math.abs(ideal) > RAIL + 1e-9;

  // 堆疊區段
  let pos = 0;
  let neg = 0;
  const segs = c.map((ci, i) => {
    let a: number;
    let b: number;
    if (ci >= 0) {
      a = pos;
      pos += ci;
      b = pos;
    } else {
      b = neg;
      neg += ci;
      a = neg;
    }
    return { i, ci, x1: clampX(X0 + a * PX), x2: clampX(X0 + b * PX) };
  });

  const xo = X0 + out * PX;
  const xi = clampX(X0 + ideal * PX);
  const overflow = Math.abs(ideal) > 10;
  const dir = ideal >= 0 ? 1 : -1;
  const R1Y = 44;
  const R2Y = 140;
  const BH = 32;

  const slider = (idx: 0 | 1 | 2) => (
    <div key={idx} className="flex items-center gap-3">
      <span className="inline-block h-4 w-4 shrink-0 rounded-sm" style={{ background: COLORS[idx] }} aria-hidden="true" />
      <label htmlFor={`ec10s-v${idx}`} className="w-[112px] shrink-0 text-[length:var(--text-sm)] text-[var(--text-strong)]" style={{ fontFamily: 'var(--font-mono)' }}>
        V{idx + 1} = {sgn(v[idx])} V
      </label>
      <input
        id={`ec10s-v${idx}`}
        type="range"
        min={-30}
        max={30}
        step={1}
        value={dv[idx]}
        aria-label={`V${idx + 1} 輸入電壓`}
        aria-valuetext={`V${idx + 1} ${v[idx] < 0 ? '負' : '正'} ${fmt(Math.abs(v[idx]))} 伏`}
        onChange={(e) => {
          const n = Number(e.target.value);
          setDv((p) => p.map((x, k) => (k === idx ? n : x)) as [number, number, number]);
        }}
        onPointerDown={() => setDragging(idx)}
        onPointerUp={() => setDragging(null)}
        onBlur={() => setDragging(null)}
        onFocus={() => setDragging(idx)}
        className={`min-w-0 flex-1 ${ACCENT[idx]}`}
      />
      <span className="w-[84px] shrink-0 whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
        R{idx + 1} = {R[idx]} kΩ
      </span>
    </div>
  );

  return (
    <div className="not-prose space-y-4">
      <div className="space-y-2">
        {([0, 1, 2] as const).map(slider)}
        <div className="flex items-center gap-3">
          <span className="inline-block h-4 w-4 shrink-0 rounded-sm" style={{ background: 'var(--neutral-700)' }} aria-hidden="true" />
          <label htmlFor="ec10s-rf" className="w-[112px] shrink-0 text-[length:var(--text-sm)] text-[var(--text-strong)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Rf = {rf} kΩ
          </label>
          <input
            id="ec10s-rf"
            type="range"
            min={5}
            max={60}
            step={5}
            value={rf}
            aria-label="回授電阻 Rf"
            aria-valuetext={`Rf ${rf} 千歐姆`}
            onChange={(e) => setRf(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--neutral-700)]"
          />
          <span className="w-[84px] shrink-0 whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--text-muted)]">共同增益</span>
        </div>
      </div>

      <svg viewBox="0 0 640 220" width="100%" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`水平長條圖：三路貢獻堆疊總和等於輸出，目前理想輸出 ${sgn(ideal, 2)} 伏，實際輸出 ${sgn(out, 2)} 伏`}
        style={{ display: 'block', fontFamily: 'var(--font-sans, inherit)' }}>
        <defs>
          <pattern id="ec10s-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--danger-50)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--danger-500)" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* 電源軌與零線 */}
        <line x1={X0} y1={22} x2={X0} y2={190} stroke="var(--neutral-400)" strokeWidth={1.5} />
        {[-RAIL, RAIL].map((r) => (
          <line key={r} x1={X0 + r * PX} y1={22} x2={X0 + r * PX} y2={190} stroke="var(--neutral-500)" strokeWidth={1} strokeDasharray="4 3" />
        ))}
        <text x={X0 + RAIL * PX} y={14} textAnchor="middle" fontSize={11} fill="var(--neutral-600)">+5 V 電源軌</text>
        <text x={X0 - RAIL * PX} y={14} textAnchor="middle" fontSize={11} fill="var(--neutral-600)">−5 V 電源軌</text>

        {/* 第一列 */}
        <text x={44} y={R1Y - 6} fontSize={12} fill="var(--neutral-700)">各路貢獻（堆疊）</text>
        {segs.map((s) => {
          const wd = Math.abs(s.x2 - s.x1);
          return (
            <g key={s.i}>
              <rect x={Math.min(s.x1, s.x2)} y={R1Y} width={wd} height={BH} fill={COLORS[s.i]}
                stroke={dragging === s.i ? 'var(--neutral-900)' : 'none'} strokeWidth={2} />
              {Math.abs(s.ci) * PX > 28 && wd > 28 && (
                <text x={(s.x1 + s.x2) / 2} y={R1Y + BH / 2 + 4} textAnchor="middle" fontSize={11} fill={TEXT_ON[s.i]}
                  style={{ fontFamily: 'var(--font-mono)' }}>{sgn(s.ci)}</text>
              )}
            </g>
          );
        })}

        {/* 堆疊總和 = 輸出 */}
        <line x1={xi} y1={R1Y + BH} x2={xi} y2={R2Y} stroke="var(--neutral-500)" strokeWidth={1} strokeDasharray="2 3" />

        {/* 第二列 */}
        <text x={44} y={R2Y - 6} fontSize={12} fill="var(--neutral-700)">輸出 Vout</text>
        <rect x={Math.min(X0, xi)} y={R2Y} width={Math.abs(xi - X0)} height={BH} fill="none"
          stroke="var(--neutral-400)" strokeWidth={1.5} strokeDasharray="4 3" />
        {clipped && (
          <rect x={Math.min(X0 + dir * RAIL * PX, xi)} y={R2Y} width={Math.abs(xi - (X0 + dir * RAIL * PX))} height={BH}
            fill="url(#ec10s-hatch)" stroke="var(--danger-500)" strokeWidth={1.5} />
        )}
        <rect x={Math.min(X0, xo)} y={R2Y} width={Math.abs(xo - X0)} height={BH} fill="var(--neutral-900)" />
        {overflow && (
          <polygon
            points={`${xi},${R2Y + 6} ${xi + dir * 8},${R2Y + BH / 2} ${xi},${R2Y + BH - 6}`}
            fill="var(--danger-500)" />
        )}
        <text x={xo + (out >= 0 ? 6 : -6)} y={R2Y + BH + 14} textAnchor={out >= 0 ? 'start' : 'end'} fontSize={11}
          fill="var(--neutral-900)" style={{ fontFamily: 'var(--font-mono)' }}>{sgn(out, 2)} V</text>

        {/* 刻度 */}
        {[-10, -5, 0, 5, 10].map((t) => (
          <text key={t} x={X0 + t * PX} y={212} textAnchor="middle" fontSize={11} fill="var(--neutral-500)">{t > 0 ? `+${t}` : t}</text>
        ))}
      </svg>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(136px, 1fr))' }}>
        {([0, 1, 2] as const).map((i) => (
          <div key={i} className="min-w-0 p-3" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--neutral-50)', borderLeft: `4px solid ${COLORS[i]}` }}>
            <div className="text-[length:var(--text-xs)] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>w{i + 1} = Rf/R{i + 1}</div>
            <div className="text-xl font-semibold text-[var(--text-strong)]" style={{ fontFamily: 'var(--font-mono)' }}>{fmt(w[i], 2)}</div>
            <div className="text-[11px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
              I{i + 1} = V{i + 1}/R{i + 1} = {fmt(cur[i], 2)} mA
            </div>
          </div>
        ))}
        <div className="min-w-0 p-3" style={{ borderRadius: 'var(--radius-lg)', background: clipped ? 'var(--danger-50)' : 'var(--neutral-100)', borderLeft: '4px solid var(--neutral-900)' }}>
          <div className="text-[length:var(--text-xs)] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>Vout</div>
          <div className="text-xl font-semibold text-[var(--text-strong)]" style={{ fontFamily: 'var(--font-mono)' }}>{sgn(out, 2)} V</div>
          <div className="min-h-[16px] text-[11px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {clipped ? `理想值 ${sgn(ideal, 2)} V` : `If = ${fmt(cur.reduce((a, b) => a + b, 0), 2)} mA`}
          </div>
        </div>
      </div>

      <div className="min-h-[36px]" aria-live="polite">
        {clipped && (
          <div className="flex items-start gap-2 px-3 py-2 text-[length:var(--text-sm)]" style={{ borderRadius: 'var(--radius-md)', background: 'var(--warning-50)', color: 'var(--warning-700)' }}>
            <TriangleAlert size={14} className="mt-[3px] shrink-0" aria-hidden="true" />
            <span>輸出被削平：理想值為 {sgn(ideal, 2)} V，超出 ±5 V 電源軌。這不是電路錯了，是權重設計得太大。</span>
          </div>
        )}
      </div>

      <div className="space-y-1 text-[length:var(--text-sm)] text-[var(--text-muted)]">
        <p className="flex items-start gap-2">
          <Info size={14} className="mt-[3px] shrink-0" aria-hidden="true" />
          <span>因為虛接地，每一路的電流只由自己那一路的電壓與電阻決定，三路之間完全不互相影響。</span>
        </p>
        <p className="pl-[22px] text-[length:var(--text-xs)]">電源軌以理想 ±5 V 計；真實 op amp 約在軌道內 1–2 V 就已飽和。</p>
      </div>
    </div>
  );
}
