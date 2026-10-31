// 第 5 題答案圖的靜態 SVG（與互動元件同一套幾何）
const AX = { L: 50, R: 306, T: 16, B: 186 };
const line = (x1,y1,x2,y2,extra="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra} />`;
const box = `<rect x="${AX.L}" y="${AX.T}" width="${AX.R-AX.L}" height="${AX.B-AX.T}" fill="none" stroke="#cbd5e1" stroke-width="1"/>`;

function chart(opts) {
  const { ticksX, ticksY, points, corner, guides, labels, xTitle, yTitle } = opts;
  return `<svg viewBox="0 0 320 232" width="100%" role="img" aria-label="${opts.aria}">
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" fill="#64748b">
    ${box}
    ${guides.map(g => line(g[0],g[1],g[2],g[3],'stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3"')).join("\n    ")}
    ${ticksX.map(t => `<text x="${t.x}" y="${AX.B+13}" text-anchor="middle" ${t.hl?'fill="#ea580c" font-weight="700"':''}>${t.label}</text>`).join("\n    ")}
    ${ticksY.map(t => `<text x="${AX.L-6}" y="${t.y+3}" text-anchor="end">${t.label}</text>`).join("\n    ")}
    <polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${corner.guide ? line(corner.x, corner.y, corner.gx, corner.gy, 'stroke="#fdba74" stroke-width="1" stroke-dasharray="2 2"') : ""}
    <circle cx="${corner.x}" cy="${corner.y}" r="4" fill="#ffffff" stroke="#ea580c" stroke-width="2"/>
    <text x="${AX.R}" y="${AX.B+25}" text-anchor="end" font-size="9">${xTitle}</text>
    <text x="${AX.L+2}" y="${AX.T-6}" text-anchor="start" font-size="9">${yTitle}</text>
  </g>
  <g font-family="'PingFang TC','Noto Sans TC',sans-serif" font-size="9.5" font-weight="600">
    ${labels.map(l => `<text x="${l.x}" y="${l.y}" fill="${l.fill}" text-anchor="${l.anchor||'middle'}">${l.text}</text>`).join("\n    ")}
  </g>
</svg>`;
}

const mapXa = v => 50 + ((v + 2) / 7) * 256;
const mapYa = v => 186 - (v / 2) * 170;
const a = chart({
  aria: "電壓驅動時流過 R1 的電流對 Vin 的折線圖，1.8 V 以下為零，之後以 1/R1 為斜率上升",
  guides: [[mapXa(0), AX.T, mapXa(0), AX.B]],
  ticksX: [{x:mapXa(-2),label:"-2"},{x:mapXa(0),label:"0"},{x:mapXa(1.8),label:"1.8",hl:true},{x:mapXa(5),label:"5"}],
  ticksY: [0,0.5,1,1.5,2].map(v => ({ y: mapYa(v), label: v.toString() })),
  points: `${mapXa(-2)},${mapYa(0)} ${mapXa(1.8)},${mapYa(0)} ${mapXa(5)},${mapYa(3.2/1.8)}`,
  corner: { x: mapXa(1.8), y: mapYa(0), guide: true, gx: mapXa(1.8), gy: mapYa(0)-36 },
  xTitle: "Vin (V)", yTitle: "I_R1 ÷ (1.8 V / R1)",
  labels: [
    { x: mapXa(1.8)-4, y: mapYa(0)-40, text: "Vth = VB + VD,on = 1.8 V", fill: "#ea580c", anchor: "end" },
    { x: mapXa(3.6), y: mapYa(1.5), text: "斜率 = 1/R1", fill: "#475569", anchor: "end" },
    { x: mapXa(-0.2), y: mapYa(0)-8, text: "截止：I = 0", fill: "#475569" },
  ],
});

const mapXb = v => 50 + ((v + 1) / 4) * 256;
const mapYb = v => 186 - ((v + 1) / 2) * 170;
const b = chart({
  aria: "電流驅動時流過 R1 的電流對 Iin 的折線圖，斜率 1 上升到 1.8 V 除以 R1 後水平封頂",
  guides: [[mapXb(0), AX.T, mapXb(0), AX.B], [AX.L, mapYb(0), AX.R, mapYb(0)]],
  ticksX: [-1,0,1,2,3].map(v => ({ x: mapXb(v), label: v.toString(), hl: v===1 })),
  ticksY: [-1,0,1].map(v => ({ y: mapYb(v), label: v.toString() })),
  points: `${mapXb(-1)},${mapYb(-1)} ${mapXb(1)},${mapYb(1)} ${mapXb(3)},${mapYb(1)}`,
  corner: { x: mapXb(1), y: mapYb(1), guide: false },
  xTitle: "Iin ÷ (1.8 V / R1)", yTitle: "I_R1 ÷ (1.8 V / R1)",
  labels: [
    { x: mapXb(-0.1), y: mapYb(0.2), text: "斜率 = 1", fill: "#475569", anchor: "end" },
    { x: mapXb(2.1), y: mapYb(1)+16, text: "封頂 = 1.8 V / R1", fill: "#ea580c" },
  ],
});


// 作答版用：拿掉 (a) 圖上的「斜率 = 1/R1」標註（縱軸正規化、橫軸是實際 Vin，
// 圖上斜率並不等於 1/R1），改由呼叫端放在圖下方說明。
export const stripSlopeLabelA = (html) =>
  html.replace(/<text [^>]*>斜率 = 1\/R1<\/text>\s*/, "");

export const Q5_PLOT_HTML = `<figure class="q5plot">
  <div class="q5grid">
    <div><div class="q5t">(a) 電壓驅動：I<sub>R1</sub> 對 V<sub>in</sub></div>${a}<div class="q5c">二極體放行 R1 的電流：導通後電流持續上升</div></div>
    <div><div class="q5t">(b) 電流驅動：I<sub>R1</sub> 對 I<sub>in</sub></div>${b}<div class="q5c">二極體接管超額電流：R1 的電流被封頂</div></div>
  </div>
  <figcaption>兩軸都以 1.8 V / R1 為單位正規化，所以 R1 只改變縱軸的實際數值，不改變折線形狀。</figcaption>
</figure>`;
