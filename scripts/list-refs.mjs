#!/usr/bin/env node
/**
 * 列出一篇 MDX 筆記裡所有 @ai-reference 標記，輸出成核對清單。
 *
 * 用途：作者要把 status 從 suggested 升成 confirmed 之前，需要逐筆確認
 * 「這一段」對應的「那一頁」是不是真的對得上。逐個點開 PDF 抽屜很慢，
 * 這支腳本把 id、頁碼、狀態、標記上方的段落開頭、excerpt 攤成一張表，
 * 可以先用它掃一輪，只對可疑的幾筆去開 PDF。
 *
 * 同時做兩項機器檢查（人眼看不出來但會出錯的地方）：
 *   1. 註解區塊的 page/status 與下方 <PdfRefChip> 的屬性是否同步
 *      （CLAUDE.md 規定兩者是同一份狀態的兩種呈現，不可不同步）
 *   2. 同一篇內 id 是否重複
 *
 *   node scripts/list-refs.mjs <筆記路徑> [--status suggested] [--md]
 */
import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const wantStatus = args.includes("--status") ? args[args.indexOf("--status") + 1] : null;
const asMarkdown = args.includes("--md");

if (!file) {
  console.error("用法: node scripts/list-refs.mjs <筆記路徑> [--status suggested] [--md]");
  process.exit(1);
}

const src = await readFile(file, "utf8");
const lines = src.split("\n");

// 逐行掃描，才能同時知道每個標記在第幾行、以及它上方最近的一段內文是什麼
const refs = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() !== "{/* @ai-reference") continue;

  const meta = {};
  let j = i + 1;
  for (; j < lines.length && lines[j].trim() !== "*/}"; j++) {
    const m = lines[j].match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2];
  }
  const chipLine = lines[j + 1] ?? "";

  // 往上找最近一行非空、且不是標記/JSX/表格分隔線的內文，當作定位錨點
  let anchor = "";
  for (let k = i - 1; k >= 0 && i - k < 40; k--) {
    const t = lines[k].trim();
    if (!t) continue;
    if (t.startsWith("<") || t.startsWith("{/*") || t.startsWith("*/}")) continue;
    if (/^\|\s*-+/.test(t)) continue;
    anchor = t;
    break;
  }

  refs.push({
    line: i + 1,
    id: meta.id ?? "",
    page: meta.page ?? "",
    status: meta.status ?? "",
    excerpt: meta.excerpt ?? "",
    chipPage: chipLine.match(/page=\{(\d+)\}/)?.[1] ?? "",
    chipStatus: chipLine.match(/status="([^"]+)"/)?.[1] ?? "",
    anchor,
  });
}

// ── 機器檢查 ─────────────────────────────────────────────
const desync = refs.filter((r) => r.page !== r.chipPage || r.status !== r.chipStatus);
const seen = new Map();
for (const r of refs) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
const dupes = [...seen].filter(([, n]) => n > 1).map(([id]) => id);

const shown = wantStatus ? refs.filter((r) => r.status === wantStatus) : refs;
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

if (asMarkdown) {
  console.log(`| 行 | id | 頁 | 狀態 | 段落開頭 | excerpt |`);
  console.log(`| --- | --- | --- | --- | --- | --- |`);
  for (const r of shown) {
    const cell = (s) => clip(s, 60).replace(/\|/g, "\\|");
    console.log(`| ${r.line} | ${r.id} | ${r.page} | ${r.status} | ${cell(r.anchor)} | ${cell(r.excerpt)} |`);
  }
} else {
  for (const r of shown) {
    console.log(`p${r.page.padStart(3)}  ${r.status.padEnd(9)} ${r.id}`);
    console.log(`      段落  ${clip(r.anchor, 72)}`);
    console.log(`      講義  ${clip(r.excerpt, 72)}`);
    console.log(`      行 ${r.line}`);
    console.log();
  }
}

const byStatus = refs.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
console.error(`\n${file}`);
console.error(`  標記 ${refs.length} 個${wantStatus ? `（顯示 status=${wantStatus} 的 ${shown.length} 個）` : ""}`);
console.error(`  狀態 ${JSON.stringify(byStatus)}`);
console.error(`  註解與 chip 同步：${desync.length === 0 ? "全部同步 ✓" : `✗ ${desync.length} 筆不同步 → ${desync.map((r) => r.id).join(", ")}`}`);
console.error(`  id 重複：${dupes.length === 0 ? "無 ✓" : `✗ ${dupes.join(", ")}`}`);

if (desync.length || dupes.length) process.exit(1);
