import type { ReactNode } from "react";

const INK = "stroke-[color:var(--text-strong)] fill-none";
const INK_FILL = "fill-[color:var(--text-strong)] stroke-[color:var(--text-strong)]";
const ACC = "stroke-[color:var(--blue-500)] fill-none";
const ACC_FILL = "fill-[color:var(--blue-500)] stroke-none";
const LABEL = "font-mono fill-[color:var(--text-brand)] stroke-none";

interface Overlay {
  x: number;
  y: number;
  node: ReactNode;
  brand?: boolean;
}

interface Card {
  name: string;
  label: string;
  relation: string;
  reading: string;
  art: ReactNode;
  overlays?: Overlay[];
}

const W = 160;
const H = 88;

const CARDS: Card[] = [
  {
    name: "電阻",
    label: "電阻符號：鋸齒線",
    relation: "V = IR",
    reading: "電流從高電位端流向低電位端",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M14,44 H50 M110,44 H146" />
        <path className={INK} strokeWidth={1.5} transform="translate(50 29)" d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
        <text className={LABEL} fontSize={11} x={80} y={28} textAnchor="middle">R</text>
      </>
    ),
  },
  {
    name: "直流電壓源",
    label: "直流電壓源符號：電池式與圓圈式兩種畫法",
    relation: "兩端電位差固定，電流由外部電路決定",
    reading: "長線那端是正極",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M40,14 V36 M40,51 V74 M30,36 H50 M30,46 H50" />
        <path className={INK} strokeWidth={4} d="M35,41 H45 M35,51 H45" />
        <text className={LABEL} fontSize={11} x={56} y={38} textAnchor="middle">+</text>
        <text className={LABEL} fontSize={11} x={56} y={56} textAnchor="middle">−</text>
        <circle className={INK} strokeWidth={1.5} cx={120} cy={44} r={18} />
        <path className={INK} strokeWidth={1.5} d="M120,14 V26 M120,62 V74" />
        <text className={LABEL} fontSize={11} x={120} y={40} textAnchor="middle">+</text>
        <text className={LABEL} fontSize={11} x={120} y={57} textAnchor="middle">−</text>
      </>
    ),
    overlays: [
      { x: 40, y: 83, node: "電池式" },
      { x: 120, y: 83, node: "圓圈式" },
    ],
  },
  {
    name: "交流訊號源",
    label: "交流訊號源符號：圓圈內一個正弦波週期",
    relation: "小寫 v 的訊號（如麥克風 v₁）",
    reading: "小訊號分析時只剩它，直流源都接地",
    art: (
      <>
        <circle className={INK} strokeWidth={1.5} cx={80} cy={44} r={20} />
        <path className={INK} strokeWidth={1.5} d="M80,12 V24 M80,64 V76" />
        <path className={INK} strokeWidth={1} d="M66,44 C70,36 76,36 80,44 S90,52 94,44" />
      </>
    ),
  },
  {
    name: "電流源",
    label: "電流源符號：圓圈內一支直立箭頭",
    relation: "電流固定，兩端電壓由外部電路決定",
    reading: "和電壓源正好對偶",
    art: (
      <>
        <circle className={INK} strokeWidth={1.5} cx={80} cy={44} r={20} />
        <path className={INK} strokeWidth={1.5} d="M80,12 V24 M80,64 V76" />
        <path className={INK} strokeWidth={1.5} d="M80,57 V41" />
        <path className={INK_FILL} strokeWidth={1} d="M80,31 L75.5,41 H84.5 Z" />
        <text className={LABEL} fontSize={11} x={106} y={48} textAnchor="middle">I</text>
      </>
    ),
  },
  {
    name: "接地",
    label: "接地符號：三條橫線與倒三角兩種畫法",
    relation: "電位 0 的參考點",
    reading: "圖上所有接地符號都是同一個節點",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M40,14 V30 M25,30 H55 M30,36 H50 M35,42 H45" />
        <path className={INK} strokeWidth={1.5} d="M120,14 V34 M104,34 H136 L120,54 Z" />
      </>
    ),
    overlays: [
      { x: 40, y: 82, node: "三條橫線" },
      { x: 120, y: 82, node: "倒三角" },
    ],
  },
  {
    name: "電容",
    label: "電容符號：兩條平行短板",
    relation: "I = C·dV/dt",
    reading: "直流穩態視為斷路",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M14,44 H50 M110,44 H146" />
        <g transform="translate(50 29)">
          <path className={INK} strokeWidth={1.5} d="M0,15 H27 M33,15 H60" />
          <path className={INK} strokeWidth={2} d="M27,5 V25 M33,5 V25" />
        </g>
        <text className={LABEL} fontSize={11} x={80} y={28} textAnchor="middle">C</text>
      </>
    ),
  },
  {
    name: "二極體",
    label: "二極體符號：實心三角頂著一條橫線，下方箭頭標示順向電流",
    relation: "指數模型或定電壓模型",
    reading: "三角形尖端指的方向就是順向電流方向",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M14,44 H50 M110,44 H146" />
        <g transform="translate(50 29)">
          <path className={INK} strokeWidth={1.5} d="M0,15 H20 M36,15 H60" />
          <path className={INK_FILL} strokeWidth={1.5} d="M20,7 L20,23 L36,15 Z" />
          <path className={INK} strokeWidth={1.5} d="M36,7 V23" />
        </g>
        <path className={ACC} strokeWidth={1} d="M64,64 H96 M96,64 L91,60.5 M96,64 L91,67.5" />
        <text className={LABEL} fontSize={11} x={24} y={38} textAnchor="middle">+</text>
        <text className={LABEL} fontSize={11} x={136} y={38} textAnchor="middle">−</text>
      </>
    ),
    overlays: [
      { x: 24, y: 24, node: "陽極" },
      { x: 136, y: 24, node: "陰極" },
      { x: 80, y: 77, node: "順向電流", brand: true },
    ],
  },
  {
    name: "齊納二極體",
    label: "齊納二極體符號：陰極橫線兩端帶彎鉤",
    relation: "逆偏崩潰時兩端電壓固定",
    reading: "在穩壓電路裡是「反著接」的（Ex 3-33）",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M14,44 H50 M110,44 H146" />
        <g transform="translate(50 29)">
          <path className={INK} strokeWidth={1.5} d="M0,15 H20 M36,15 H60" />
          <path className={INK_FILL} strokeWidth={1.5} d="M20,7 L20,23 L36,15 Z" />
          <path className={INK} strokeWidth={1.5} d="M40,7 H36 V23 H32" />
        </g>
      </>
    ),
  },
  {
    name: "NPN 電晶體（BJT）",
    label: "NPN 電晶體符號：基極 B、集極 C、射極 E，射極箭頭朝外",
    relation: "基極 B、集極 C、射極 E",
    reading: "箭頭在射極、朝外，就是射極電流方向",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M20,44 H50 M80,14 V24 M80,64 V74" />
        <g transform="translate(50 24)">
          <path className={INK} strokeWidth={1.5} d="M0,20 H14" />
          <path className={INK} strokeWidth={2} d="M14,8 V32" />
          <path className={INK} strokeWidth={1.5} d="M14,14 L30,4 V0" />
          <path className={INK} strokeWidth={1.5} d="M14,26 L30,36 V40" />
          <path className={INK_FILL} strokeWidth={1} d="M28.5,35.06 L21.2,33.6 L23.9,29.2 Z" />
        </g>
        <text className={LABEL} fontSize={11} x={22} y={39} textAnchor="middle">B</text>
        <text className={LABEL} fontSize={11} x={88} y={18} textAnchor="middle">C</text>
        <text className={LABEL} fontSize={11} x={88} y={74} textAnchor="middle">E</text>
      </>
    ),
  },
  {
    name: "NMOS 電晶體",
    label: "NMOS 電晶體符號：閘極板與通道板之間留有空隙",
    relation: "閘極 G、汲極 D、源極 S",
    reading: "閘極不吃直流電流（CH6）",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M20,40 H50 M80,10 V20 M80,60 V70" />
        <g transform="translate(50 20)">
          <path className={INK} strokeWidth={1.5} d="M0,20 H12" />
          <path className={INK} strokeWidth={2} d="M12,10 V30" />
          <path className={INK} strokeWidth={2} d="M18,8 V32" />
          <path className={INK} strokeWidth={1.5} d="M30,0 V8 H18" />
          <path className={INK} strokeWidth={1.5} d="M30,40 V32 H18" />
        </g>
        <path className={ACC} strokeWidth={1} strokeDasharray="2 2" d="M65,44 V70" />
        <circle className={ACC_FILL} cx={65} cy={44} r={1.5} />
        <text className={LABEL} fontSize={11} x={22} y={35} textAnchor="middle">G</text>
        <text className={LABEL} fontSize={11} x={88} y={16} textAnchor="middle">D</text>
        <text className={LABEL} fontSize={11} x={88} y={66} textAnchor="middle">S</text>
      </>
    ),
    overlays: [{ x: 65, y: 81, node: "絕緣層：閘極電流 = 0" }],
  },
  {
    name: "運算放大器",
    label: "運算放大器符號：三角形，上方輸入 +、下方輸入 −，右側尖端為輸出",
    relation: "理想時兩輸入電位相同（CH8）",
    reading: "先看回授電阻接在哪一邊",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M20,36 H50 M20,52 H50 M110,44 H140" />
        <g transform="translate(50 24)">
          <path className={INK} strokeWidth={1.5} d="M14,4 L14,36 L50,20 Z" />
          <path className={INK} strokeWidth={1.5} d="M0,12 H14 M0,28 H14 M50,20 H60" />
        </g>
        <text className={LABEL} fontSize={9} x={67} y={39} textAnchor="middle">+</text>
        <text className={LABEL} fontSize={9} x={67} y={56} textAnchor="middle">−</text>
      </>
    ),
    overlays: [
      { x: 14, y: 29, node: <>v₊</> },
      { x: 14, y: 59, node: <>v₋</> },
      { x: 128, y: 36, node: <>v<sub>out</sub></> },
    ],
  },
  {
    name: "導線交叉",
    label: "導線交叉：左邊有實心圓點為相連，右邊沒有圓點為不相連",
    relation: "有實心圓點才相連，沒有點只是交叉經過",
    reading: "整張圖先找出所有圓點，就知道有幾個節點",
    art: (
      <>
        <path className={INK} strokeWidth={1.5} d="M18,40 H62 M40,18 V62" />
        <circle className={INK_FILL} cx={40} cy={40} r={2.5} />
        <path className={INK} strokeWidth={1.5} d="M98,40 H142 M120,18 V62" />
      </>
    ),
    overlays: [
      { x: 40, y: 78, node: "相連" },
      { x: 120, y: 78, node: "不相連" },
    ],
  },
];

export default function EcFinalCircuitSymbols() {
  return (
    <div className="not-prose">
      <ul
        className="m-0 grid list-none gap-3 p-0"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 204px), 1fr))" }}
      >
        {CARDS.map((c) => (
          <li
            key={c.name}
            className="m-0 rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[var(--surface-card)]"
          >
            {/* 內距放在內層 div：筆記的 prose 規則會把 li 的 padding 歸零 */}
            <div className="p-3">
            <div
              className="relative mx-auto w-full rounded-[var(--radius-md)] bg-[var(--surface-sunken)]"
              style={{ maxWidth: 200, aspectRatio: "160 / 88" }}
            >
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={c.label}
                className="absolute inset-0 h-full w-full"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {c.art}
              </svg>
              {c.overlays?.map((o, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] leading-none ${
                    o.brand ? "text-[color:var(--text-brand)]" : "text-[color:var(--text-body)]"
                  }`}
                  style={{ left: `${(o.x / W) * 100}%`, top: `${(o.y / H) * 100}%` }}
                >
                  {o.node}
                </span>
              ))}
            </div>
            <p className="m-0 mt-3 text-sm font-semibold text-[color:var(--text-strong)]">{c.name}</p>
            <dl className="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
              <dt className="text-[11px] font-semibold leading-relaxed text-[color:var(--text-brand)]">關係</dt>
              <dd className="m-0 text-[13px] leading-relaxed text-[color:var(--text-body)]">{c.relation}</dd>
              <dt className="text-[11px] font-semibold leading-relaxed text-[color:var(--text-brand)]">讀圖</dt>
              <dd className="m-0 text-[13px] leading-relaxed text-[color:var(--text-body)]">{c.reading}</dd>
            </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
