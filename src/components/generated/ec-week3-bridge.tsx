import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowDown, Link2, Waves, Gauge } from 'lucide-react';

type HalfCycle = 'positive' | 'negative';

interface DiodeGeometry {
  /** local (0,15) 對應的全域座標：導線由此點連向陽極頂點 */
  x: number;
  y: number;
  /** 旋轉角（度），local +x 軸沿陽極 -> 陰極方向 */
  angle: number;
  /** 陽極頂點（導線起點） */
  anode: [number, number];
  /** 陰極頂點（導線終點） */
  cathode: [number, number];
  labelX: number;
  labelY: number;
  label: string;
}

// 四頂點：L=(210,190) R=(390,190) T=(300,100) B=(300,280)，皆恰為 45 度菱形邊。
// 二極體符號（circuit-symbols.md 兩端子網格，本體寬 60）置於每條邊的中段，
// 兩端另外用導線連回頂點——邊長 127.28 遠大於符號本體寬 60，
// 若直接把符號兩端拉伸貼齊頂點會需要非等比縮放、導致箭頭三角形變形，
// 因此改採「本體居中 + 兩段導線」，並用三角函數校正 translate 基準點
// （原規劃書給的 translate 是頂點本身，套用旋轉公式後陰極端會偏出邊外，
// 這裡校正為「符號起點＝邊中點退回半個本體長度」，角度沿用規劃書給值，驗證後兩者一致）。
const DIODES: Record<'D1' | 'D2' | 'D3' | 'D4', DiodeGeometry> = {
  D1: { x: 233.79, y: 166.21, angle: -45, anode: [210, 190], cathode: [300, 100], labelX: 241, labelY: 131, label: 'D1' },
  D2: { x: 366.21, y: 166.21, angle: -135, anode: [390, 190], cathode: [300, 100], labelX: 359, labelY: 131, label: 'D2' },
  D3: { x: 276.21, y: 256.21, angle: -135, anode: [300, 280], cathode: [210, 190], labelX: 241, labelY: 249, label: 'D3' },
  D4: { x: 323.79, y: 256.21, angle: -45, anode: [300, 280], cathode: [390, 190], labelX: 359, labelY: 249, label: 'D4' },
};

const ON_COLOR = 'var(--blue-500)';
const OFF_COLOR = 'var(--neutral-300)';

interface DiodeSymbolProps {
  geo: DiodeGeometry;
  on: boolean;
  transitionMs: number;
}

function DiodeWithLeads({ geo, on, transitionMs }: DiodeSymbolProps) {
  const color = on ? ON_COLOR : OFF_COLOR;
  const width = on ? 2.5 : 1;
  const transitionStyle = { transition: `stroke ${transitionMs}ms var(--ease-out), stroke-width ${transitionMs}ms var(--ease-out), fill ${transitionMs}ms var(--ease-out)` };

  // local (0,15) 之全域座標＝(geo.x, geo.y)；local (60,15) 之全域座標由旋轉公式推得，
  // 即導線終點（連向陰極頂點那一段的起點）。
  const rad = (geo.angle * Math.PI) / 180;
  const endX = geo.x + 60 * Math.cos(rad);
  const endY = geo.y + 60 * Math.sin(rad);

  return (
    <g>
      {/* 陽極側導線：頂點 -> 符號起點 */}
      <path
        d={`M${geo.anode[0]},${geo.anode[1]} L${geo.x},${geo.y}`}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        style={transitionStyle}
      />
      {/* 陰極側導線：符號終點 -> 頂點 */}
      <path
        d={`M${endX},${endY} L${geo.cathode[0]},${geo.cathode[1]}`}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        style={transitionStyle}
      />
      <g transform={`translate(${geo.x} ${geo.y - 15}) rotate(${geo.angle} 0 15)`}>
        <g
          stroke={color}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={transitionStyle}
        >
          <path d="M0,15 H20 M36,15 H60" />
          <path d="M20,7 L20,23 L36,15 Z" fill={color} style={transitionStyle} />
          <path d="M36,7 V23" />
        </g>
      </g>
      <text
        x={geo.labelX}
        y={geo.labelY}
        fontSize={12}
        textAnchor="middle"
        fill="var(--text-strong)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {geo.label}
      </text>
    </g>
  );
}

const NOTES: { icon: typeof Link2; text: string }[] = [
  { icon: Link2, text: '每條導通路徑串兩顆二極體，死區是兩倍導通壓降' },
  { icon: Waves, text: '相同電容下，漣波是半波整流的一半' },
  { icon: Gauge, text: '每顆二極體承受的逆向電壓約一倍峰值（半波是兩倍）' },
];

export default function EcWeek3Bridge() {
  const [halfCycle, setHalfCycle] = useState<HalfCycle>('positive');
  const shouldReduceMotion = useReducedMotion();
  const dur = shouldReduceMotion ? 0 : 0.25;
  const transitionMs = shouldReduceMotion ? 0 : 220;

  const isPositive = halfCycle === 'positive';
  // 正半週：D1+D4 導通（對角互補）；負半週：D2+D3 導通。
  const onSet: Record<'D1' | 'D2' | 'D3' | 'D4', boolean> = isPositive
    ? { D1: true, D2: false, D3: false, D4: true }
    : { D1: false, D2: true, D3: true, D4: false };

  const leftMark = isPositive ? '+' : '−';
  const rightMark = isPositive ? '−' : '+';

  const statusConducting = isPositive ? 'D1、D4' : 'D2、D3';
  const statusBlocking = isPositive ? 'D2、D3' : 'D1、D4';
  const statusCurrentText = isPositive ? '電流方向：T → 負載 → B' : '電流方向：T → 負載 → B（不變）';

  const ariaLabel = isPositive
    ? '橋式整流電路圖，正半週：D1 與 D4 導通，D2 與 D3 截止，電流經 T 流過負載到 B'
    : '橋式整流電路圖，負半週：D2 與 D3 導通，D1 與 D4 截止，電流仍經 T 流過負載到 B';

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 切換控制區 */}
      <div className="flex flex-col gap-2">
        <div
          className="relative inline-flex self-start p-1"
          style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-pill)' }}
        >
          <motion.div
            className="absolute top-1 bottom-1"
            style={{ width: 96, background: 'var(--blue-500)', borderRadius: 'var(--radius-pill)' }}
            animate={{ left: isPositive ? 4 : 100 }}
            transition={{ duration: dur, ease: [0.16, 1, 0.3, 1] }}
          />
          <button
            type="button"
            onClick={() => setHalfCycle('positive')}
            className="relative z-10 text-sm font-semibold py-1.5 transition-colors"
            style={{ width: 96, color: isPositive ? '#fff' : 'var(--neutral-500)', borderRadius: 'var(--radius-pill)' }}
          >
            正半週
          </button>
          <button
            type="button"
            onClick={() => setHalfCycle('negative')}
            className="relative z-10 text-sm font-semibold py-1.5 transition-colors"
            style={{ width: 96, color: !isPositive ? '#fff' : 'var(--neutral-500)', borderRadius: 'var(--radius-pill)' }}
          >
            負半週
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={halfCycle}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: dur }}
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm"
            style={{ color: 'var(--text-body)' }}
          >
            <span>導通：{statusConducting}</span>
            <span aria-hidden="true">　·　</span>
            <span>截止：{statusBlocking}</span>
            <span aria-hidden="true">　·　</span>
            <span className="inline-flex items-center gap-1">
              <ArrowDown size={14} style={{ color: 'var(--blue-500)' }} />
              {statusCurrentText}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2-5. 主電路圖 */}
      <svg
        viewBox="0 0 620 360"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        {/* AC 訊號源 */}
        <g transform="translate(270 45)">
          <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx={30} cy={15} r={12} />
            <path d="M19,15 C22,6 26,6 30,15 C34,24 38,24 41,15" />
          </g>
        </g>
        <text x={300} y={26} fontSize={11} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          AC
        </text>

        {/* AC 源到 L / R 的導線（不隨狀態變色，屬結構線） */}
        <path d="M270,60 H210 V190" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <path d="M330,60 H390 V190" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" />

        {/* 負載迴路：永遠高亮，不隨 halfCycle 切換 */}
        <path d="M300,100 H480 V160" stroke="var(--blue-500)" strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M480,220 V280 H300" stroke="var(--blue-500)" strokeWidth={2} fill="none" strokeLinecap="round" />
        <g transform="translate(450 175) rotate(90 30 15)">
          <g stroke="var(--blue-500)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
          </g>
        </g>
        <text x={495} y={194} fontSize={11} fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          R_L
        </text>

        {/* 四顆二極體 */}
        <DiodeWithLeads geo={DIODES.D1} on={onSet.D1} transitionMs={transitionMs} />
        <DiodeWithLeads geo={DIODES.D2} on={onSet.D2} transitionMs={transitionMs} />
        <DiodeWithLeads geo={DIODES.D3} on={onSet.D3} transitionMs={transitionMs} />
        <DiodeWithLeads geo={DIODES.D4} on={onSet.D4} transitionMs={transitionMs} />

        {/* 四頂點接點 */}
        <circle cx={210} cy={190} r={2.5} fill="var(--text-strong)" />
        <circle cx={390} cy={190} r={2.5} fill="var(--text-strong)" />
        <circle cx={300} cy={100} r={2.5} fill="var(--text-strong)" />
        <circle cx={300} cy={280} r={2.5} fill="var(--text-strong)" />

        {/* 靜態極性標記：T(+) / B(−)，不隨狀態變 */}
        <text x={300} y={85} fontSize={14} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          +
        </text>
        <text x={300} y={304} fontSize={14} textAnchor="middle" fill="var(--text-strong)" style={{ fontFamily: 'var(--font-mono)' }}>
          {'−'}
        </text>

        {/* 動態極性標記：L / R 隨半週翻轉 */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.text
            key={`L-${halfCycle}`}
            x={185}
            y={195}
            fontSize={14}
            textAnchor="middle"
            fill="var(--blue-500)"
            style={{ fontFamily: 'var(--font-mono)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
          >
            {leftMark}
          </motion.text>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.text
            key={`R-${halfCycle}`}
            x={415}
            y={195}
            fontSize={14}
            textAnchor="middle"
            fill="var(--blue-500)"
            style={{ fontFamily: 'var(--font-mono)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
          >
            {rightMark}
          </motion.text>
        </AnimatePresence>
      </svg>

      {/* 6. 下方三個固定對照欄位（垂直堆疊，不隨狀態改變） */}
      <div className="flex flex-col gap-2">
        {NOTES.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3"
            style={{
              borderLeft: '4px solid var(--blue-500)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-card)',
              padding: '12px 16px',
            }}
          >
            <Icon size={16} style={{ color: 'var(--blue-500)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-strong)' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
