/**
 * `_references/` 底下的檔案一律用這個 URL 慣例存取：dev 靠既有 /notes-assets/* handler，
 * 正式 build 靠 notes-assets-build-copy.ts 複製出來的靜態檔案——兩邊路徑完全一致，
 * 呼叫端不用判斷模式。relPath 是相對 notesDir 的路徑（含 `_references/` 前綴）。
 */
export function pdfAssetUrl(relPath: string): string {
  const segments = relPath.split(/[\\/]/).map(encodeURIComponent);
  return `/notes-assets/${segments.join("/")}`;
}
