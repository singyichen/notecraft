/**
 * 講義庫支援的原始檔格式。
 *
 * 這張表是「副檔名 → 檢視器」註冊表的 build 期那一半：`src/lib/references.ts` 靠它決定
 * 掃描時要收哪些檔，client 端的對應物是 ReferenceViewerDrawer 的 renderer 分派。
 * 新增一種格式要同時動這兩處 —— 只加這裡會列得出檔案卻開不起來。
 *
 * 刻意不收 `.doc`（舊版二進位格式）：瀏覽器端沒有可靠的解析方案，列出來只會讓讀者
 * 點到一個永遠顯示載入失敗的項目。
 */
export const REFERENCE_KINDS = ["pdf", "docx"] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** 列表與標題列顯示用的格式名稱（給人看的，不是副檔名）。 */
export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  pdf: "PDF",
  docx: "Word",
};

// Word / Excel 開啟文件時會在同目錄放一個 `~$` 開頭的鎖定檔，副檔名與本尊相同但內容
// 不是完整文件。它是暫存檔不是講義，掃描時要當作不存在。
const LOCK_FILE_PREFIX = "~$";

/** 依檔名判斷是哪一種講義；不支援的格式回 null。只看檔名，不碰檔案系統。 */
export function referenceKindOf(fileName: string): ReferenceKind | null {
  if (fileName.startsWith(LOCK_FILE_PREFIX)) return null;
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return (REFERENCE_KINDS as readonly string[]).includes(ext) ? (ext as ReferenceKind) : null;
}
