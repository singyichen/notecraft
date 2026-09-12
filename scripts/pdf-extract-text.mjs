#!/usr/bin/env node
// 給 pdf-reference-planner subagent 呼叫：印出指定 PDF 每頁純文字（JSON），
// 供 AI 比對筆記段落與 PDF 頁碼。用 pdfjs-dist 的 legacy Node build，不依賴系統安裝的 poppler/pdftotext。
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";

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
