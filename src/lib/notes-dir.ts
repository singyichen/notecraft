import path from "node:path";

/**
 * notesDir 解析順序：NOTECRAFT_NOTES_DIR 環境變數 > 主專案預設 src/content/notes。
 * 抽成共用函式，避免 content/config.ts 與其他建置期程式各自維護一份、日後改預設值時漏改。
 */
export function resolveNotesDir(): string {
  const envDir = process.env.NOTECRAFT_NOTES_DIR;
  return envDir ? path.resolve(envDir) : path.resolve(process.cwd(), "src/content/notes");
}
