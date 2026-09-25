#!/usr/bin/env node
// 檢查筆記正文有沒有「寫了 ** 卻不會變成粗體」的位置。
//
//   node scripts/check-bold.mjs                      # 掃全部筆記
//   node scripts/check-bold.mjs <檔案> [<檔案>…]      # 只掃指定檔案
//
// 邏輯在 src/lib/bold-lint.ts（有單元測試）。有問題時列出 檔案:行號 並以 exit 1 結束。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { findBrokenBold } from "../src/lib/bold-lint.ts";

const require = createRequire(import.meta.url);
void require;

const NOTES_DIR = path.resolve("src/content/notes");

function collect(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collect(p));
    else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length ? args.map((a) => path.resolve(a)) : collect(NOTES_DIR);

let total = 0;
for (const f of files) {
  const found = findBrokenBold(fs.readFileSync(f, "utf-8"));
  for (const { line, text } of found) {
    total++;
    console.log(`${path.relative(process.cwd(), f)}:${line}: ${text.trim().slice(0, 100)}`);
  }
}

if (total === 0) {
  console.log(`[check-bold] ${files.length} 個檔案，沒有失效的粗體標記。`);
  process.exit(0);
}
console.log(`\n[check-bold] 共 ${total} 行的 ** 不會生效。`);
console.log("修法：把標點移到粗體外（`（term）**是` → `（term）**` 後補空格，或 `**「x」**` → `「**x**」`）。");
process.exit(1);
