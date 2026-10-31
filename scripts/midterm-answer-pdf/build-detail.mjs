// 詳解版：把第 8 週筆記整篇轉成 PDF。
// remark／rehype 那組套件不是專案相依（ESM 不吃 NODE_PATH，所以要把這支搬到裝了
// 套件的目錄裡跑，再用 NC_ROOT 指回 repo）：
//   mkdir -p /tmp/nc-pdf && cd /tmp/nc-pdf && npm init -y
//   npm i unified remark-parse remark-gfm remark-math remark-directive \
//         remark-rehype rehype-raw rehype-katex rehype-stringify unist-util-visit katex
//   cp <repo>/scripts/midterm-answer-pdf/{build-detail.mjs,q5-plot.mjs} .
//   NC_ROOT=<repo> node build-detail.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { Q5_PLOT_HTML } from "./q5-plot.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.NC_ROOT ? path.resolve(process.env.NC_ROOT) : path.resolve(HERE, "../..");
const SRC = path.join(ROOT, "src/content/notes/電子學實作系列第8週-期中考.mdx");
const OUT_PDF = path.join(ROOT, "src/content/notes/_references/電子學實作系列/第八週/515661055_陳欣怡_期中考詳解.pdf");
const OUT_HTML = path.join(os.tmpdir(), "期中考詳解.html");

let md = fs.readFileSync(SRC, "utf8");

// 1. frontmatter / import / JSX island → 去掉
md = md.replace(/^---\n[\s\S]*?\n---\n/, "");
md = md.replace(/^import .*$/gm, "");
// @ai-visualize 標記 → 換成靜態答案圖佔位
md = md.replace(/\{\/\*\s*@ai-visualize[\s\S]*?\*\/\}/g, "\n<!--Q5PLOT-->\n");
// 「三份 PDF」整節是指向檔案的連結，放進 PDF 本身沒有意義，整段拿掉
{
  const start = md.indexOf("## 三份 PDF");
  if (start >= 0) {
    const next = md.indexOf("\n## ", start + 1);
    md = md.slice(0, start) + (next >= 0 ? md.slice(next + 1) : "");
  }
}
// 其餘 MDX 註解（@ai-reference 等）
md = md.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
// GeneratedFrame（mdx-writer 之後可能寫入）
md = md.replace(/<GeneratedFrame[\s\S]*?<\/GeneratedFrame>/g, "\n<!--Q5PLOT-->\n");
// PdfRefChip → 換成一行講義出處
md = md.replace(/<PdfRefChip\s+file="([^"]+)"\s+page=\{(\d+)\}[\s\S]*?\/>/g, (_m, f, p) => {
  const name = f.split("/").pop().replace(/\.pdf$/i, "");
  return `\n> 講義出處：${name}　第 ${p} 頁\n`;
});
md = md.replace(/\n{3,}/g, "\n\n");

// :en[...] → textDirective；交給下面的 plugin
function directives() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === "textDirective" && node.name === "en") {
        node.data = { hName: "span", hProperties: { className: ["en"] } };
      } else if (node.type === "textDirective" || node.type === "leafDirective" || node.type === "containerDirective") {
        node.data = { hName: "span" };
      }
    });
  };
}

// 圖片路徑 → 本機絕對路徑；站內連結 → 純文字
function rewrite() {
  return (tree) => {
    visit(tree, "image", (node) => {
      if (node.url.startsWith("/")) node.url = "file://" + path.join(ROOT, "public", node.url);
    });
    visit(tree, "link", (node, index, parent) => {
      if (node.url.startsWith("/") && parent && typeof index === "number") {
        parent.children.splice(index, 1, { type: "emphasis", children: node.children });
        return index;
      }
    });
  };
}

const html = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(directives)
  .use(rewrite)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify, { allowDangerousHtml: true })
  .process(md);

const katexCss = fs.readFileSync(path.join(ROOT, "node_modules/katex/dist/katex.min.css"), "utf8")
  .replace(/url\((fonts\/[^)]+)\)/g, (_m, f) => `url(file://${path.join(ROOT, "node_modules/katex/dist", f)})`);

const body = String(html).replace("<!--Q5PLOT-->", Q5_PLOT_HTML);

const page = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><title>電子學實作 期中考詳解</title>
<style>${katexCss}</style>
<style>
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
:root { --ink:#1e293b; --muted:#64748b; --line:#e2e8f0; --blue:#2563eb; --orange:#ea580c; }
* { box-sizing: border-box; }
body { font-family: "Crimson Pro", Georgia, "PingFang TC", "Noto Serif TC", serif; color: var(--ink);
  font-size: 10.2pt; line-height: 1.62; margin: 0; }
.cover { border-bottom: 2px solid var(--ink); padding-bottom: 8px; margin-bottom: 14px; }
.cover h1 { font-size: 17pt; margin: 0 0 4px; letter-spacing: .02em; }
.cover .meta { font-size: 9pt; color: var(--muted); display: flex; gap: 14px; flex-wrap: wrap; }
h1 { font-size: 15pt; margin: 0 0 6px; }
h1 + p em { color: var(--muted); }
h2 { font-size: 12.5pt; margin: 18px 0 7px; padding-top: 6px; border-top: 1px solid var(--line);
  break-after: avoid; page-break-after: avoid; }
h3 { font-size: 11pt; margin: 13px 0 5px; color: #334155; break-after: avoid; page-break-after: avoid; }
p { margin: 6px 0; }
strong { font-weight: 700; }
blockquote { margin: 8px 0; padding: 8px 11px; background: #f8fafc; border-left: 3px solid var(--blue);
  break-inside: avoid; page-break-inside: avoid; }
blockquote p { margin: 3px 0; }
.en { display: block; font-size: 9pt; color: var(--muted); font-style: italic; margin-top: 2px; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt;
  break-inside: avoid; page-break-inside: avoid; }
th, td { border: 1px solid var(--line); padding: 4px 7px; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-weight: 700; }
img { max-width: 100%; display: block; margin: 9px auto 3px; }
p > em:only-child { display: block; text-align: center; font-size: 8.6pt; color: var(--muted); }
ol, ul { margin: 6px 0; padding-left: 1.5em; }
li { margin: 3px 0; }
li > p { margin: 2px 0; }
code { font-family: ui-monospace, Menlo, monospace; font-size: .9em; background: #f1f5f9; padding: 0 3px; border-radius: 3px; }
.katex-display { margin: 9px 0; break-inside: avoid; page-break-inside: avoid; }
.katex { font-size: 1.02em; }
.q5plot { margin: 12px 0 6px; break-inside: avoid; page-break-inside: avoid; }
.q5grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.q5t { font-size: 9pt; font-weight: 700; text-align: center; margin-bottom: 2px; }
.q5c { font-size: 8.4pt; color: var(--muted); text-align: center; margin-top: 2px; }
.q5plot figcaption { font-size: 8.6pt; color: var(--muted); text-align: center; margin-top: 7px; }
.foot { margin-top: 20px; padding-top: 7px; border-top: 1px solid var(--line); font-size: 8.4pt; color: var(--muted); }
</style></head><body>
<div class="cover">
  <h1>電子學實作　期中考（作業繳交版）詳解</h1>
  <div class="meta"><span>5 題，每題 20 分</span><span>學號 515661055</span><span>陳欣怡</span><span>2026-10-31</span></div>
</div>
${body}
<p class="foot">本份詳解依課程投影片 CH2–CH4 的公式與例題整理；每題附上投影片最相關的原題出處與差異比對。計算取 V_T = 26 mV（300 K）、n_i = 1.08×10¹⁰ cm⁻³。</p>
</body></html>`;

fs.writeFileSync(OUT_HTML, page);

const CHROME = process.env.CHROME_BIN
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}
用 CHROME_BIN 指定路徑，或自行開啟 ${OUT_HTML} 另存 PDF。`);
  process.exit(1);
}
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--allow-file-access-from-files", "--virtual-time-budget=20000",
  "--no-pdf-header-footer", `--print-to-pdf=${OUT_PDF}`,
  `file://${OUT_HTML}`,
], { stdio: ["ignore", "ignore", "ignore"] });

console.log(`✓ ${path.relative(ROOT, OUT_PDF)}`);
