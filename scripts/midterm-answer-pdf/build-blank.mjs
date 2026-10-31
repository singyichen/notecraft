import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const QDIR = path.join(HERE, "qblocks");
const OUT_PDF = path.join(ROOT, 'src/content/notes/_references/電子學實作系列/第八週/期中考空白作答卷.pdf');
const imgs = ["q1.png", "q2.png", "q3.png", "q4.png", "q5.png"];

const sections = imgs.map((f, i) => `<section class="q">
  <img src="file://${path.join(QDIR, f)}" alt="第 ${i + 1} 題">
</section>`).join("\n");

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Midterm</title>
<style>
@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
body { font-family: "PingFang TC","Noto Sans TC",system-ui,sans-serif; color:#111827; margin:0; }
img.head { width:92%; max-width:92%; display:block; margin:0 auto 20px; }
section.q { break-after:page; page-break-after:always; }
section.q:last-of-type { break-after:auto; page-break-after:auto; }
section.q img { width:92%; max-width:92%; display:block; margin:0 auto; }
</style></head><body>
<img class="head" src="file://${path.join(QDIR, "head.png")}" alt="Midterm — 5 Problems (20 points each, total 100 points)">
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
