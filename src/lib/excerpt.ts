/**
 * 從 MDX 內文取一段純文字摘要，供 frontmatter 沒寫 `description` 的筆記使用。
 *
 * 產物會直接進 `<meta name="description">` 與頁面副標，兩處都以純文字呈現，
 * 因此**必須剝到沒有任何 Markdown 標記**——殘留的 `**` 會被讀者原樣看見。
 *
 * 獨立成模組（而非放在 `notes.ts`）是為了可測試：`notes.ts` 會 import `astro:content`，
 * 那個 scheme 在 `node --test` 下載不進來。
 */
export function excerpt(body: string | undefined | null, fallback: string): string {
  if (!body) return fallback.replace(/\s+/g, " ").slice(0, 220);
  const stripped = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^import[^\n]*$/gm, "")
    .replace(/<[A-Z][^>]*\/?>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/^\s*[-*]\s.*$/gm, "")
    .replace(/^>\s.*$/gm, "")
    .trim();
  const para = stripped.split(/\n{2,}/).find((p) => p.trim().length > 0);
  return stripInline(para || fallback).replace(/\s+/g, " ").slice(0, 220);
}

/**
 * 剝除行內 Markdown 標記，只留下讀者該看到的文字。
 *
 * 單側星號／底線（例如「3 * 4」、`partial_fit`）刻意不動：成對才視為強調語法，
 * 寧可留著也不要誤刪。`\w` 在 JS 正則裡只涵蓋 ASCII，因此中文字兩側的強調照樣剝得掉。
 */
function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 圖片：留 alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 連結：留顯示文字
    .replace(/`([^`]+)`/g, "$1") // 行內程式碼
    .replace(/~~([^~]+)~~/g, "$1") // 刪除線
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 粗體
    .replace(/__([^_]+)__/g, "$1") // 粗體（底線式）
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, "$1") // 斜體
    .replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, "$1"); // 斜體（底線式）
}
