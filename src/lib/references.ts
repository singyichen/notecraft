import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolveNotesDir } from "./notes-dir";
import { pdfAssetUrl } from "./references-url";

export interface ReferencePdf {
  /** 檔名（不含路徑），列表顯示用 */
  name: string;
  /** 相對於 notesDir 的路徑（含 `_references/` 前綴）——同時是 @ai-reference 標記 file 欄位的格式 */
  relPath: string;
  /** 可直接放進 fetch / <a href> 的 URL */
  url: string;
  numPages: number;
}

export interface ReferenceFolder {
  /** 資料夾名稱（顯示用），最外層固定是 "_references" */
  name: string;
  folders: ReferenceFolder[];
  pdfs: ReferencePdf[];
}

async function countPages(absPath: string): Promise<number> {
  const loadingTask = getDocument({ url: absPath });
  const doc = await loadingTask.promise;
  const n = doc.numPages;
  await loadingTask.destroy();
  return n;
}

async function walk(absDir: string, notesDir: string): Promise<ReferenceFolder> {
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const folders: ReferenceFolder[] = [];
  const pdfs: ReferencePdf[] = [];
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      folders.push(await walk(abs, notesDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      const relPath = path.relative(notesDir, abs).split(path.sep).join("/");
      pdfs.push({
        name: entry.name,
        relPath,
        url: pdfAssetUrl(relPath),
        numPages: await countPages(abs),
      });
    }
  }
  return { name: path.basename(absDir), folders, pdfs };
}

/** 掃描 `<notesDir>/_references/` 底下的資料夾樹；目錄不存在就回傳空樹，不報錯。 */
export async function listReferenceTree(): Promise<ReferenceFolder> {
  const notesDir = resolveNotesDir();
  const referencesDir = path.join(notesDir, "_references");
  if (!fs.existsSync(referencesDir)) {
    return { name: "_references", folders: [], pdfs: [] };
  }
  return walk(referencesDir, notesDir);
}
