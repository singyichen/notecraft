/**
 * `_references/` 底下的檔案一律用這個 URL 慣例存取：dev 靠既有 /notes-assets/* handler，
 * 正式 build 靠 notes-assets-build-copy.ts 複製出來的靜態檔案——兩邊路徑完全一致，
 * 呼叫端不用判斷模式。relPath 是相對 notesDir 的路徑（含 `_references/` 前綴）。
 */
export function referenceAssetUrl(relPath: string): string {
  const segments = relPath.split(/[\\/]/).map(encodeURIComponent);
  return `/notes-assets/${segments.join("/")}`;
}

/**
 * dev-only：專案 cwd 底下、notesDir 以外的檔案（例如 `simulations/` 的實驗數據）。
 * 只有 `astro dev` 的 `/local-assets/*` handler 服務這條路徑，正式 build 既不複製檔案、
 * 也沒有這條路由——所以引用它的 UI 必須自己用 `import.meta.env.DEV` 把關。
 * relPath 是相對專案根目錄的路徑，例如 `simulations/lab1/measured/Lab1-數據記錄.xlsx`。
 */
export function localAssetUrl(relPath: string): string {
  const segments = relPath.split(/[\\/]/).map(encodeURIComponent);
  return `/local-assets/${segments.join("/")}`;
}

/**
 * 講義在工作台主區的檢視頁（不含站台前綴，呼叫端自己 withBase）。`id` 是講義的完整相對路徑：
 * notesDir 底下的是 `_references/…`／`_outputs/…`，dev-only 的外部資料檔是 `simulations/…`
 *（相對專案根）——兩種前綴不會撞，所以不同資料夾的同名檔一定是不同頁、不同頁籤。
 * 每段各自 encode：檔名裡的 `#`、`?`、`%`、空白不能被瀏覽器當成網址語法。
 * 本檔被 wb-tabs.ts 以帶副檔名的相對 import 載入（scripts/checks 直接跑），不可有任何 import。
 */
export function referenceDocPath(id: string): string {
  return `/references/doc/${id.split("/").map(encodeURIComponent).join("/")}`;
}
