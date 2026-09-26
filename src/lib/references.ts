import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolveNotesDir } from "./notes-dir";
import { referenceAssetUrl } from "./references-url";
import { referenceKindOf, type ReferenceKind } from "./reference-kinds";

export interface ReferenceDoc {
  /** 檔名（不含路徑），列表顯示用 */
  name: string;
  /** 相對於 notesDir 的路徑（含 `_references/` 前綴）——同時是 @ai-reference 標記 file 欄位的格式 */
  relPath: string;
  /** 可直接放進 fetch / <a href> 的 URL */
  url: string;
  kind: ReferenceKind;
  /**
   * 只有 PDF 有。docx 沒有可靠的頁數——docProps/app.xml 裡的 Pages 是產生它的那個文書
   * 軟體當下寫入的值，之後被誰改過都不會更新，而真正的分頁要排版引擎跑過才算得出來。
   */
  numPages?: number;
  /** 檔案大小（bytes）。沒有頁數可顯示的格式，列表用它當次要資訊。 */
  bytes: number;
}

export interface ReferenceFolder {
  /** 資料夾名稱（顯示用），最外層固定是 "_references" */
  name: string;
  folders: ReferenceFolder[];
  docs: ReferenceDoc[];
}

// pdfjs-dist 的 legacy Node build 執行期會呼叫 Promise.withResolvers()，這是 Node 22.13 才有的
// API；在較舊的 Node（例如 20.x）上會炸出一個沒有上下文的 pdfjs 內部 stack trace。這裡擋下來給
// 明確訊息，否則 `npm run build`（經由 /references 頁）會在無說明的情況下失敗。
if (typeof Promise.withResolvers !== "function") {
  throw new Error(
    `pdfjs-dist 需要 Node ≥22.13（目前 ${process.version}）—— 請先 nvm use 22 或改用 Node 22`,
  );
}

async function countPages(absPath: string): Promise<number> {
  try {
    const loadingTask = getDocument({ url: absPath });
    const doc = await loadingTask.promise;
    const n = doc.numPages;
    await loadingTask.destroy();
    return n;
  } catch (err) {
    console.warn(`[references] 無法讀取 PDF 頁數，略過並以 0 頁計：${absPath}`, err);
    return 0;
  }
}

async function walk(absDir: string, notesDir: string): Promise<ReferenceFolder> {
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const folders: ReferenceFolder[] = [];
  const docs: ReferenceDoc[] = [];
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      folders.push(await walk(abs, notesDir));
      continue;
    }
    if (!entry.isFile()) continue;
    const kind = referenceKindOf(entry.name);
    if (!kind) continue;
    const relPath = path.relative(notesDir, abs).split(path.sep).join("/");
    docs.push({
      name: entry.name,
      relPath,
      url: referenceAssetUrl(relPath),
      kind,
      ...(kind === "pdf" ? { numPages: await countPages(abs) } : {}),
      bytes: fs.statSync(abs).size,
    });
  }
  return { name: path.basename(absDir), folders, docs };
}

/** 掃描 `<notesDir>/_references/` 底下的資料夾樹；目錄不存在就回傳空樹，不報錯。 */
export async function listReferenceTree(): Promise<ReferenceFolder> {
  const notesDir = resolveNotesDir();
  const referencesDir = path.join(notesDir, "_references");
  if (!fs.existsSync(referencesDir)) {
    return { name: "_references", folders: [], docs: [] };
  }
  return walk(referencesDir, notesDir);
}

/**
 * dev-only：`<notesDir>/_outputs/` 底下作者自己的產出（例如實驗結報 .docx）。
 *
 * 刻意放在 notesDir 底下、但不是 `_references/`：dev 的 `/notes-assets/*` handler 會服務
 * notesDir 底下的任何檔案（同一道 assertSafePath 守衛），而 build 期的複製
 *（notes-assets-build-copy.ts）**只處理 `_references/`** —— 所以這裡的東西本機看得到、
 * 正式站完全不存在。作者的結報帶著姓名學號，不該被發佈到公開站上。
 *
 * 沒有東西時回 null（不是空樹），讓呼叫端可以直接判斷要不要顯示整個分區。
 * 呼叫端仍必須自己用 `import.meta.env.DEV` 把關。
 */
export async function listLocalOutputTree(): Promise<ReferenceFolder | null> {
  const notesDir = resolveNotesDir();
  const outputsDir = path.join(notesDir, "_outputs");
  if (!fs.existsSync(outputsDir)) return null;
  const tree = await walk(outputsDir, notesDir);
  return tree.folders.length > 0 || tree.docs.length > 0 ? tree : null;
}

/** 依格式統計整棵樹的檔案數，供頁首 pill 顯示。 */
export function countReferencesByKind(folder: ReferenceFolder): Record<ReferenceKind, number> {
  const out = { pdf: 0, docx: 0 };
  for (const doc of folder.docs) out[doc.kind] += 1;
  for (const child of folder.folders) {
    const sub = countReferencesByKind(child);
    out.pdf += sub.pdf;
    out.docx += sub.docx;
  }
  return out;
}
