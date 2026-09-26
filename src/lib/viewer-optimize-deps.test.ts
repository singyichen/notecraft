import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 講義檢視器一律惰性動態 import 自己的重型依賴（pdfjs-dist、docx-preview），好讓沒開過
// 抽屜的頁面不用扛那包 JS。代價是：這些套件不會出現在任何靜態 import 裡，Vite 的 dep
// 掃描在 dev server 啟動時看不到它們，要等讀者第一次開抽屜才「按需發現」→ 觸發重新
// optimize → 進行中的那次 dynamic import 撞上 504 Outdated Optimize Dep，畫面只會顯示
// 「載入失敗，請確認檔案是否存在」，看起來像檔案壞掉，實際上是建置設定漏了一行。
//
// astro.config.mjs 的 optimizeDeps.include 就是為此存在（見該處註解）。這個測試確保
// 「新增一個檢視器」時不會忘記同步那份清單 —— 這是加 docx 檢視器時實際犯過的錯。
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const VIEWERS_DIR = path.join(ROOT, "src/components/islands/reference-viewers");

/** astro.config.mjs 的 optimizeDeps.include 陣列（以文字解析，避免在測試裡真的載入 astro 設定）。 */
function readOptimizeDepsInclude(): string[] {
  const src = fs.readFileSync(path.join(ROOT, "astro.config.mjs"), "utf-8");
  const block = src.match(/optimizeDeps:\s*\{\s*include:\s*\[([^\]]*)\]/);
  assert.ok(block, "astro.config.mjs 找不到 optimizeDeps.include 陣列");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** 檢視器裡以 `import("套件名")` 動態載入的 npm 套件（略過相對路徑與 ?url 之類的資產 import）。 */
function dynamicBarePackages(): { file: string; pkg: string }[] {
  const out: { file: string; pkg: string }[] = [];
  for (const name of fs.readdirSync(VIEWERS_DIR)) {
    if (!name.endsWith(".tsx")) continue;
    const src = fs.readFileSync(path.join(VIEWERS_DIR, name), "utf-8");
    for (const m of src.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)) {
      const spec = m[1];
      if (spec.startsWith(".") || spec.startsWith("/") || spec.includes("?")) continue;
      out.push({ file: name, pkg: spec });
    }
  }
  return out;
}

test("檢視器動態 import 的套件都在 optimizeDeps.include 裡", () => {
  const include = readOptimizeDepsInclude();
  const found = dynamicBarePackages();
  assert.ok(found.length > 0, "沒掃到任何動態 import，測試本身失效了");
  for (const { file, pkg } of found) {
    assert.ok(
      include.includes(pkg),
      `${file} 動態 import 了 "${pkg}"，但 astro.config.mjs 的 optimizeDeps.include 沒有它。` +
        `dev 期間第一次開啟會撞 504 Outdated Optimize Dep（畫面顯示「載入失敗」）。`,
    );
  }
});
