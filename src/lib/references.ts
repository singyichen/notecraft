import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolveNotesDir } from "./notes-dir";
import { localAssetUrl, referenceAssetUrl } from "./references-url";
import { REFERENCE_KINDS, referenceKindOf, type ReferenceKind } from "./reference-kinds";
import { countPptxSlides } from "./pptx-slide-count";

export interface ReferenceDoc {
  /** 檔名（不含路徑），列表顯示用 */
  name: string;
  /** 相對於 notesDir 的路徑（含 `_references/` 前綴）——同時是 @ai-reference 標記 file 欄位的格式 */
  relPath: string;
  /** 可直接放進 fetch / <a href> 的 URL */
  url: string;
  kind: ReferenceKind;
  /**
   * PDF 的頁數、pptx 的投影片張數。docx 沒有可靠的頁數——docProps/app.xml 裡的 Pages 是產生
   * 它的那個文書軟體當下寫入的值，之後被誰改過都不會更新，而真正的分頁要排版引擎跑過才算得出來；
   * 投影片張數則是檔案裡列出來的事實（見 pptx-slide-count.ts）。
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

function countSlides(absPath: string): number {
  try {
    return countPptxSlides(fs.readFileSync(absPath));
  } catch (err) {
    console.warn(`[references] 無法讀取 pptx 張數，略過並以 0 張計：${absPath}`, err);
    return 0;
  }
}

// 掃描時整個略過的目錄：套件與虛擬環境（simulations/lab1/.venv 底下就躺著一個 python-docx
// 的 default.docx）、建置暫存、版控內部檔。少了這道過濾，講義庫會冒出一堆不是講義的東西。
const SKIP_DIRS = new Set(["node_modules", ".git", ".venv", "__pycache__", "build", "dist"]);

/**
 * `count`：要不要開檔算頁數（PDF 要整份交給 pdfjs 解析）。講義庫列表要顯示；
 * 檢視頁路由與工作台索引只需要「有哪些檔」，每頁都會用到，不該付這個成本。
 */
async function walk(
  absDir: string,
  baseDir: string,
  toUrl: (relPath: string) => string,
  count = true,
): Promise<ReferenceFolder> {
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const folders: ReferenceFolder[] = [];
  const docs: ReferenceDoc[] = [];
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const sub = await walk(abs, baseDir, toUrl, count);
      // 空資料夾不進樹：simulations/ 底下多的是 circuitjs/、tools/ 這種沒有可檢視檔案的目錄，
      // 留著只會讓清單長出一排點不開的節點。
      if (sub.folders.length > 0 || sub.docs.length > 0) folders.push(sub);
      continue;
    }
    if (!entry.isFile()) continue;
    const kind = referenceKindOf(entry.name);
    if (!kind) continue;
    const relPath = path.relative(baseDir, abs).split(path.sep).join("/");
    docs.push({
      name: entry.name,
      relPath,
      url: toUrl(relPath),
      kind,
      ...(count && kind === "pdf" ? { numPages: await countPages(abs) } : {}),
      ...(count && kind === "pptx" ? { numPages: countSlides(abs) } : {}),
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
  return walk(referencesDir, notesDir, referenceAssetUrl);
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
  const tree = await walk(outputsDir, notesDir, referenceAssetUrl);
  return tree.folders.length > 0 || tree.docs.length > 0 ? tree : null;
}

/** 依格式統計整棵樹的檔案數，供頁首 pill 顯示。 */
export function countReferencesByKind(folder: ReferenceFolder): Record<ReferenceKind, number> {
  const out = Object.fromEntries(REFERENCE_KINDS.map((k) => [k, 0])) as Record<ReferenceKind, number>;
  for (const doc of folder.docs) out[doc.kind] += 1;
  for (const child of folder.folders) {
    const sub = countReferencesByKind(child);
    for (const kind of REFERENCE_KINDS) out[kind] += sub[kind];
  }
  return out;
}

/**
 * dev-only：專案根目錄底下、notesDir 以外的資料檔（實驗數據、電路圖）。
 *
 * 為什麼不是把檔案搬進 notesDir：`simulations/` 底下的 CSV 是 `build_lab1_report.py` 以相對
 * 路徑讀取的輸入，`.xlsx` 是作者邊做實驗邊填的記錄表——它們屬於實驗工作區，不是筆記素材。
 * 因此改成讓講義庫多看一個根，檔案留在原地。
 *
 * URL 走 dev-only 的 `/local-assets/*`（見 references-url.ts），正式 build 沒有那條路由、
 * 也不會複製這些檔案，所以呼叫端必須自己用 `import.meta.env.DEV` 把關。
 * 沒有東西時回 null，讓呼叫端直接判斷要不要顯示整個分區。
 */
const EXTERNAL_DATA_DIRS = ["simulations"];

export async function listExternalDataTree(): Promise<ReferenceFolder[]> {
  const root = process.cwd();
  const trees: ReferenceFolder[] = [];
  for (const dir of EXTERNAL_DATA_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    const tree = await walk(abs, root, localAssetUrl);
    if (tree.folders.length > 0 || tree.docs.length > 0) trees.push(tree);
  }
  return trees;
}

function flatten(folder: ReferenceFolder, out: ReferenceDoc[] = []): ReferenceDoc[] {
  out.push(...folder.docs);
  for (const child of folder.folders) flatten(child, out);
  return out;
}

/**
 * 所有可在工作台主區開成頁籤的講義（扁平清單、不算頁數）：`/references/doc/[...path]` 的
 * getStaticPaths 與 /wb-index.json 的 `refDocs` 共用，兩邊才不會一邊開得起來、另一邊判定不存在。
 *
 * `includeLocal`：連同 dev-only 的「我的產出」與「實驗數據」。**呼叫端必須以 import.meta.env.DEV 把關**——
 * 正式 build 既不複製那些檔案，也不能讓它們的路徑出現在任何輸出裡。
 */
export async function listReferenceDocs({ includeLocal }: { includeLocal: boolean }): Promise<ReferenceDoc[]> {
  const notesDir = resolveNotesDir();
  const roots: ReferenceFolder[] = [];
  const referencesDir = path.join(notesDir, "_references");
  if (fs.existsSync(referencesDir)) roots.push(await walk(referencesDir, notesDir, referenceAssetUrl, false));
  if (includeLocal) {
    const outputsDir = path.join(notesDir, "_outputs");
    if (fs.existsSync(outputsDir)) roots.push(await walk(outputsDir, notesDir, referenceAssetUrl, false));
    const root = process.cwd();
    for (const dir of EXTERNAL_DATA_DIRS) {
      const abs = path.join(root, dir);
      if (fs.existsSync(abs)) roots.push(await walk(abs, root, localAssetUrl, false));
    }
  }
  return roots.flatMap((r) => flatten(r));
}
