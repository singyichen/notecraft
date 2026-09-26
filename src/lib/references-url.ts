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
