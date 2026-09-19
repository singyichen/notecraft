#!/usr/bin/env node
// 把 CircuitJS 電路文字檔壓成可直接開啟的連結（?ctz=），並驗證能無損還原。
// 用法：node .claude/skills/lab-workflow/scripts/circuitjs-link.mjs simulations/<lab>/circuitjs/*.txt
//       加 --check 會用本機 Chrome 開每個連結截圖到 --out <dir>（需要 playwright-core 與已安裝的 Google Chrome）
import fs from 'node:fs';
import path from 'node:path';
import LZString from 'lz-string';

const args = process.argv.slice(2);
const check = args.includes('--check');
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args[outIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
if (files.length === 0) { console.error('請給至少一個 .txt 電路檔'); process.exit(1); }

const BASE = 'https://www.falstad.com/circuit/circuitjs.html?ctz=';
const links = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (!text.startsWith('$ ')) console.warn(`警告：${f} 第一行不是 "$ " 選項列，CircuitJS 會用預設時間步長`);
  const ctz = LZString.compressToEncodedURIComponent(text);
  if (LZString.decompressFromEncodedURIComponent(ctz) !== text) { console.error(`壓縮還原失敗：${f}`); process.exit(1); }
  links.push({ file: f, url: BASE + ctz });
  console.log(`${path.basename(f, '.txt')}\t${BASE + ctz}`);
}

if (check) {
  if (!outDir) { console.error('--check 需要 --out <dir>'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const { chromium } = await import('playwright-core');
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  for (const { file, url } of links) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('dialog', async d => { errs.push('DIALOG: ' + d.message()); await d.dismiss(); });
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    await p.goto(url, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(6000);
    const shot = path.join(outDir, path.basename(file, '.txt') + '.png');
    await p.screenshot({ path: shot });
    console.log(`${errs.length ? 'ERR ' + errs.join(' | ') : 'ok '}\t${shot}`);
    await p.close();
  }
  await b.close();
}
