#!/usr/bin/env node
// 給 pdf-reference-planner subagent 呼叫：印出指定 PDF 每頁純文字（JSON），
// 供 AI 比對筆記段落與 PDF 頁碼。用 pdfjs-dist 的 legacy Node build，不依賴系統安裝的 poppler/pdftotext。
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";

// pdfjs-dist 的 legacy Node build 執行期會呼叫 Promise.withResolvers()，這是 Node 22.13 才有的
// API；在較舊的 Node（例如 20.x）上會炸出一個沒有上下文的 pdfjs 內部 stack trace，看不出真正原因。
// 先在這裡擋下來給明確訊息。
if (typeof Promise.withResolvers !== "function") {
  throw new Error(
    `pdfjs-dist 需要 Node ≥22.13（目前 ${process.version}）—— 請先 nvm use 22 或改用 Node 22`,
  );
}

const [, , pdfPathArg] = process.argv;
if (!pdfPathArg) {
  console.error("Usage: node scripts/pdf-extract-text.mjs <path-to-pdf>");
  process.exit(1);
}

const pdfPath = path.resolve(pdfPathArg);
const loadingTask = getDocument({ url: pdfPath });
const doc = await loadingTask.promise;

const pages = [];
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  pages.push({ page: i, text });
  page.cleanup();
}
await loadingTask.destroy();

console.log(JSON.stringify({ file: pdfPath, numPages: doc.numPages, pages }, null, 2));
