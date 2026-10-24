import { existsSync } from "node:fs";
import { join } from "node:path";

let cached: boolean | null = null;

/**
 * 這次 build 的檔案系統是不是大小寫不敏感（macOS 預設的 APFS、Windows 的 NTFS）。
 *
 * 用專案根的 `package.json` 探測：大小寫不敏感時，把檔名整個改成大寫也查得到同一個檔。
 * 不寫任何暫存檔，結果快取一次。
 */
export function isCaseInsensitiveFs(cwd: string = process.cwd()): boolean {
  if (cached === null) {
    cached = existsSync(join(cwd, "package.json")) && existsSync(join(cwd, "PACKAGE.JSON"));
  }
  return cached;
}
