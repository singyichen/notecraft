import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { Q5_PLOT_HTML, stripSlopeLabelA } from "./q5-plot.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const QDIR = path.join(HERE, "qblocks");
const OUT_PDF = path.join(ROOT, 'src/content/notes/_references/電子學實作系列/第八週/515661055_陳欣怡_期中考作答.pdf');
const M = (tex) => katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: false });
const IN = (tex) => katex.renderToString(tex, { displayMode: false, throwOnError: true, strict: false });

const MONO = { "#2563eb":"#111827", "#ea580c":"#111827", "#fdba74":"#9ca3af",
  "#475569":"#374151", "#64748b":"#6b7280", "#cbd5e1":"#9ca3af", "#e2e8f0":"#d1d5db" };
const mono = (html) => Object.entries(MONO)
  .reduce((acc, [from, to]) => acc.split(from).join(to), html);

// ── 第 3 題：BJT hybrid-π 小訊號模型（(a)(b) 共用，單色、與內文同風格）────────
const sub = (base, s) => `${base}<tspan font-size="13" dy="5">${s}</tspan><tspan dy="-5"></tspan>`;
const HYBRID_PI_SVG = `<svg viewBox="0 0 320 200" width="100%" role="img"
  aria-label="BJT hybrid-pi 小訊號模型：B 與 E 之間為 r pi，C 與 E 之間為受控電流源 g m v pi，射極交流接地">
  <g stroke="#111827" stroke-width="1.9" fill="none" stroke-linecap="round">
    <circle cx="28" cy="34" r="3.5" stroke-width="1.4"/>
    <path d="M31.5,34 H100"/>
    <path d="M100,34 V58"/>
    <path d="M100,58 l8,6 l-16,12 l16,12 l-16,12 l16,12 l-8,6"/>
    <path d="M100,118 V146"/>
    <circle cx="292" cy="34" r="3.5" stroke-width="1.4"/>
    <path d="M288.5,34 H215"/>
    <path d="M215,34 V71"/>
    <circle cx="215" cy="88" r="17"/>
    <path d="M215,105 V146"/>
    <path d="M100,146 H215"/>
    <path d="M215,78 V97"/>
    <path d="M157,146 V162"/>
    <path d="M147,162 H167"/>
    <path d="M150.5,167 H163.5"/>
    <path d="M154,172 H160"/>
  </g>
  <g fill="#111827" stroke="none">
    <polygon points="211.4,95 218.6,95 215,101.5"/>
    <circle cx="100" cy="34" r="2.6"/>
    <circle cx="215" cy="34" r="2.6"/>
    <circle cx="100" cy="146" r="2.6"/>
    <circle cx="215" cy="146" r="2.6"/>
    <circle cx="157" cy="146" r="2.6"/>
  </g>
  <g font-family="'Times New Roman',Times,serif" font-size="20" fill="#111827">
    <text x="28" y="21" text-anchor="middle" font-weight="700">B</text>
    <text x="292" y="21" text-anchor="middle" font-weight="700">C</text>
    <text x="84" y="92" text-anchor="end" font-style="italic">${sub("r", "π")}</text>
    <text x="242" y="92" font-style="italic">${sub("g", "m")} ${sub("v", "π")}</text>
    <text x="117" y="92" font-style="italic">${sub("v", "π")}</text>
    <text x="118" y="62" font-size="19">+</text>
    <text x="118" y="122" font-size="19">−</text>
  </g>
  <g font-family="'PingFang TC','Noto Sans TC',sans-serif" font-size="15" fill="#111827">
    <text x="157" y="192" text-anchor="middle">E（交流接地）</text>
  </g>
</svg>`;

const HYBRID_PI_BLOCK = `<div class="hpi">
  <div class="hpi-fig">${HYBRID_PI_SVG}</div>
  <div class="hpi-side">
    <div class="hpi-row">${IN(String.raw`\text{(a)}\quad g_m \approx 177\ \text{mS},\quad r_\pi \approx 564\ \Omega,\quad r_o = \infty`)}</div>
    <div class="hpi-row">${IN(String.raw`\text{(b)}\quad g_m \approx 38.5\ \text{mS},\quad r_\pi = 2.6\ \text{k}\Omega,\quad r_o = \infty`)}</div>
    <div class="hpi-note">${IN(String.raw`r_o = V_A/I_C = \infty`)}（開路，忽略）</div>
  </div>
</div>`;

const Q = [
{ img: "q1.png",
  steps: [
    String.raw`V_{out,\text{peak}} = V_p - V_{D,on} = 3.5 - 0.6 = 2.9\ \text{V}`,
    String.raw`I_L \approx \frac{V_{out,\text{peak}}}{R_L} = \frac{2.9\ \text{V}}{100\ \Omega} = 29\ \text{mA}`,
    String.raw`V_{r,pp} \approx \frac{I_L}{C\,f_{in}}\qquad(\text{小漣波近似，}V_{r,pp}\text{ 為峰對峰值})`,
    String.raw`\text{(a)}\quad V_{r,pp} \approx \frac{29\times10^{-3}}{(500\times10^{-6})(60)} = 0.967\ \text{V}`,
    String.raw`\text{(b)}\quad C_{eq} = C_1 + C_1 = 1000\ \mu\text{F}\ \Rightarrow\ V_{r,pp} \approx \frac{29\times10^{-3}}{(1000\times10^{-6})(60)} = 0.483\ \text{V}`,
  ],
  ans: String.raw`\text{(a)}\ V_{r,pp} \approx 0.967\ \text{V}\qquad \text{(b)}\ V_{r,pp} \approx 0.483\ \text{V}` },

{ img: "q2.png",
  steps: [
    String.raw`V_T = \frac{kT}{q},\qquad n_i = 5.2\times10^{15}\,T^{3/2}\exp\!\left[-\frac{E_g}{2kT}\right],\qquad V_0 = V_T\ln\frac{N_AN_D}{n_i^2}`,
    String.raw`\text{Si}:\ E_g = 1.12\ \text{eV},\quad k = 8.625\times10^{-5}\ \text{eV/K},\quad k/q = 8.625\times10^{-5}\ \text{V/K}`,
    String.raw`\text{(a)}\ T = 300\ \text{K}:\quad V_T = 0.025875\ \text{V},\quad n_i = 1.0776\times10^{10}\ \text{cm}^{-3}`,
    String.raw`V_0 = (0.025875)\ln\frac{(3\times10^{15})(4\times10^{16})}{(1.0776\times10^{10})^2} = 0.715802\ \text{V} \approx 0.716\ \text{V}`,
    String.raw`\text{(b)}\ T = 350\ \text{K}:\quad V_T = 0.0301875\ \text{V},\quad n_i = 2.9897\times10^{11}\ \text{cm}^{-3}`,
    String.raw`V_0 = (0.0301875)\ln\frac{(3\times10^{15})(4\times10^{16})}{(2.9897\times10^{11})^2} = 0.634476\ \text{V} \approx 0.634\ \text{V}`,
  ],
  ans: String.raw`\text{(a)}\ V_0 \approx 0.716\ \text{V}\qquad \text{(b)}\ V_0 \approx 0.634\ \text{V}` },

{ img: "q3.png",
  steps: [
    String.raw`\text{(a)}\quad V_{BE} = 0.8\ \text{V}`,
    String.raw`I_C = I_Se^{V_{BE}/V_T} = (2\times10^{-16})e^{0.8/0.026} = 4.61\ \text{mA}`,
    String.raw`I_B = \frac{I_C}{\beta} = 46.1\ \mu\text{A},\qquad I_E = I_C + I_B = 4.66\ \text{mA}`,
    String.raw`V_C = V_{CC} - I_CR_C = 2.5 - (4.61\ \text{mA})(50\ \Omega) \approx 2.269\ \text{V}`,
    String.raw`V_C \approx 2.269\ \text{V} > V_B = 0.800\ \text{V} > V_E = 0 \;\Rightarrow\; \text{順向主動區}`,
    String.raw`g_m = \frac{I_C}{V_T} \approx 177\ \text{mS},\qquad r_\pi = \frac{\beta}{g_m} \approx 564\ \Omega,\qquad r_o = \frac{V_A}{I_C} = \infty`,
    String.raw`\text{(b)}\quad I_B = 10\ \mu\text{A}`,
    String.raw`I_C = \beta I_B = 1\ \text{mA},\qquad I_E = 1.01\ \text{mA},\qquad V_C = 2.5 - (1\ \text{mA})(1\ \text{k}\Omega) = 1.500\ \text{V}`,
    String.raw`V_{BE} = V_T\ln\frac{I_C}{I_S} = (26\ \text{mV})\ln\frac{10^{-3}}{2\times10^{-16}} \approx 760\ \text{mV}`,
    String.raw`V_C = 1.500\ \text{V} > V_B \approx 0.760\ \text{V} > V_E = 0 \;\Rightarrow\; \text{順向主動區}`,
    String.raw`g_m = \frac{I_C}{V_T} \approx 38.5\ \text{mS},\qquad r_\pi = \frac{\beta}{g_m} = 2.6\ \text{k}\Omega,\qquad r_o = \infty`,
  ],
  extra: HYBRID_PI_BLOCK,
  ans: String.raw`\begin{aligned}
\text{(a)}\ &I_C = 4.61\ \text{mA},\ I_B = 46.1\ \mu\text{A},\ V_{CE} \approx 2.269\ \text{V};\ \ g_m \approx 177\ \text{mS},\ r_\pi \approx 564\ \Omega\\
\text{(b)}\ &I_C = 1\ \text{mA},\ V_{BE} \approx 760\ \text{mV},\ V_{CE} = 1.500\ \text{V};\ \ g_m \approx 38.5\ \text{mS},\ r_\pi = 2.6\ \text{k}\Omega
\end{aligned}` },

{ img: "q4.png",
  steps: [
    String.raw`I_C = I_Se^{V_{BE}/V_T}\left(1 + \frac{V_{CE}}{V_A}\right)\ \Rightarrow\ V_{BE} = V_T\ln\!\left(\frac{I_C}{I_S}\cdot\frac{1}{1 + V_{CE}/V_A}\right)`,
    String.raw`\text{(a)}\ V_A = \infty:\quad V_{BE} = (26\ \text{mV})\ln\frac{10^{-3}}{3\times10^{-16}} = 750\ \text{mV}`,
    String.raw`\text{(b)}\ V_A = 20\ \text{V}:\quad 1 + \frac{2}{20} = 1.1,\qquad V_{BE} = (26\ \text{mV})\ln\!\left(\frac{10^{-3}}{3\times10^{-16}}\cdot\frac{1}{1.1}\right) = 747\ \text{mV}`,
  ],
  ans: String.raw`\text{(a)}\ V_{BE} = 750\ \text{mV}\qquad \text{(b)}\ V_{BE} = 747\ \text{mV}` },

{ img: "q5.png",
  steps: [
    String.raw`D_1\ \text{on}:\quad V_{out} \ge V_B + V_{D,on} = 1\ \text{V} + 0.8\ \text{V} = 1.8\ \text{V}`,
    String.raw`\text{(a)}\quad V_{in} < 1.8\ \text{V}:\ I_{R_1} = 0;\qquad V_{in} \ge 1.8\ \text{V}:\ I_{R_1} = \frac{V_{in} - 1.8\ \text{V}}{R_1}`,
    String.raw`\text{(b)}\quad I_{in} < 1.8\ \text{V}/R_1:\ I_{R_1} = I_{in};\qquad I_{in} \ge 1.8\ \text{V}/R_1:\ I_{R_1} = 1.8\ \text{V}/R_1`,
  ],
  plot: true,
  plotNote: `(a) 圖縱軸已用 ${IN(String.raw`1.8\ \text{V}/R_1`)} 正規化，實際斜率 ${IN(String.raw`\mathrm{d}I_{R_1}/\mathrm{d}V_{in} = 1/R_1`)}。`,
  ans: String.raw`\begin{aligned}
\text{(a)}\ &\text{轉折於 }V_{in} = 1.8\ \text{V}\text{，之後 }I_{R_1} = (V_{in}-1.8\ \text{V})/R_1\\
\text{(b)}\ &\text{轉折於 }I_{in} = 1.8\ \text{V}/R_1\text{，之後定值 }1.8\ \text{V}/R_1
\end{aligned}` },
];

const plotHtml = () => mono(
  stripSlopeLabelA(Q5_PLOT_HTML)
    .replace(/<div class="q5c">[\s\S]*?<\/div>/g, "")
    .replace(/<figcaption>[\s\S]*?<\/figcaption>/, ""),
);

const sections = Q.map((q, i) => `<section class="q"><div class="inner">
  <img src="file://${path.join(QDIR, q.img)}" alt="第 ${i + 1} 題原卷題目">
  <div class="sol">
    ${q.note ? `<p class="note">${q.note}</p>` : ""}
    ${q.steps.map(M).join("\n    ")}
    ${q.extra ?? ""}
    ${q.plot ? plotHtml() : ""}
    ${q.plotNote ? `<p class="note plotnote">${q.plotNote}</p>` : ""}
    <div class="ans"><span class="lbl">Ans.</span>${M(q.ans)}</div>
  </div>
</div></section>`).join("\n");

const katexCss = fs.readFileSync(path.join(ROOT, "node_modules/katex/dist/katex.min.css"), "utf8")
  .replace(/url\((fonts\/[^)]+)\)/g, (_m, f) => `url(file://${path.join(ROOT, "node_modules/katex/dist", f)})`);

const page = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><title>Midterm 解答</title>
<style>${katexCss}</style>
<style>
@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
body { font-family: "PingFang TC","Noto Sans TC",system-ui,sans-serif; color:#111827; margin:0; font-size:12.5pt; }
img.head { width:92%; max-width:92%; display:block; margin:0 auto 4px; }
.ident { width:92%; margin:0 auto 18px; text-align:right; font-size:11pt; color:#111827; }
section.q { break-after:page; page-break-after:always; }
section.q:last-of-type { break-after:auto; page-break-after:auto; }
section.q .inner { width:92%; margin:0 auto; }
section.q .inner > img { width:100%; max-width:100%; display:block; margin:0 0 8px; }
.sol { padding-left:4.97%; }
.sol .katex-display { margin:7px 0; text-align:left; }
.sol .katex-display > .katex { text-align:left; font-size:1.0em; }
.note { margin:4px 0 8px; font-size:11pt; line-height:1.6; }
.plotnote { margin:4px 0 0; }
.ans { margin-top:10px; padding:0; display:flex; align-items:baseline; gap:8px; }
.ans .lbl { font-weight:700; color:#111827; font-size:12pt; flex:none; }
.ans .katex-display { margin:0; text-align:left; }
.ans .katex-display > .katex { text-align:left; }
.hpi { display:flex; align-items:center; gap:16px; margin:10px 0 4px; break-inside:avoid; }
.hpi-fig { flex:0 0 39%; }
.hpi-side { flex:1 1 auto; }
.hpi-row { font-size:10.5pt; margin-bottom:7px; white-space:nowrap; }
.hpi-note { font-size:9.5pt; line-height:1.55; }
.q5plot { margin:8px 0 2px; break-inside:avoid; }
.q5grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.q5t { font-size:8.6pt; font-weight:700; text-align:center; margin-bottom:1px; }
.q5c, .q5plot figcaption { font-size:8pt; color:#6b7280; text-align:center; margin-top:2px; }
.q5plot figcaption { margin-top:5px; }
</style></head><body>
<img class="head" src="file://${path.join(QDIR, "head.png")}" alt="Midterm — 5 Problems (20 points each, total 100 points)">
<p class="ident">學號 515661055　陳欣怡</p>
${sections}
</body></html>`;


// ── 輸出：先寫 HTML 到暫存目錄，再用 headless Chrome 列印成 PDF ────────────────
const htmlPath = path.join(os.tmpdir(), `${path.basename(OUT_PDF, ".pdf")}.html`);
fs.writeFileSync(htmlPath, page);

const CHROME = process.env.CHROME_BIN
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}\n用 CHROME_BIN 指定路徑，或自行開啟 ${htmlPath} 另存 PDF。`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--allow-file-access-from-files", "--virtual-time-budget=20000",
  "--no-pdf-header-footer", `--print-to-pdf=${OUT_PDF}`,
  `file://${htmlPath}`,
], { stdio: ["ignore", "ignore", "ignore"] });

console.log(`✓ ${path.relative(ROOT, OUT_PDF)}`);
