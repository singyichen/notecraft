/**
 * 「副檔名 → 檢視器」註冊表的 client 端契約。
 *
 * 殼（ReferenceViewerDrawer）負責抽屜本身：開關、寬度、Esc、標題列、工具列；
 * 檢視器只負責把 `url` 這份檔案畫進自己的容器，並把殼需要知道的事情用 onMeta 回報。
 * 檢視器不碰抽屜狀態，殼不認識任何檔案格式——新增一種格式只要多寫一個檢視器、
 * 在 REFERENCE_VIEWERS 加一列，殼與工具列完全不用改。
 *
 * build 期那一半在 src/lib/reference-kinds.ts（決定講義庫掃描時要收哪些副檔名）。
 */
export interface ReferenceViewerMeta {
  /** 有分頁概念的格式才回報；沒回報的格式，工具列不會出現翻頁控制。 */
  pageCount?: number;
  /** 100% 縮放下內容的原生寬度（px），殼用它決定抽屜要開多寬。 */
  naturalWidth?: number;
}

export interface ReferenceViewerProps {
  /** `/notes-assets/<relpath>`，dev 與正式站皆同（見 lib/references-url.ts）。 */
  url: string;
  /** 1-based。沒有分頁概念的檢視器忽略它。 */
  page: number;
  scale: number;
  /**
   * 回報 meta。殼以合併方式收（後到的欄位不會清掉先到的），因此檢視器可以分次回報，
   * 例如載入完先給 pageCount、畫完第一頁再給 naturalWidth。
   */
  onMeta: (meta: ReferenceViewerMeta) => void;
}
