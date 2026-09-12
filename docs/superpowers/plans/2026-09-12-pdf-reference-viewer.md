# PDF 原始講義檢視 + 段落關聯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 NoteCraft 能在網頁上直接翻閱 `docs/references/` 底下的原始 PDF 講義，並讓筆記段落能標出「對應 PDF 第幾頁」、點擊後在側邊抽屜跳轉到該頁。

**Architecture:** PDF 實體檔案搬到 `<notesDir>/_references/**`，統一以 `/notes-assets/<relpath>` 這個 URL 存取（dev 沿用既有 `/notes-assets/*` handler，正式 build 新增一個複製 hook 把檔案搬進 `dist/`）。前端用 `pdfjs-dist` 做頁碼精準的側邊抽屜檢視器；AI 端新增一個 subagent、擴充兩個既有 subagent，比對筆記段落與 PDF 頁面文字、寫回 `@ai-reference` 標記，狀態機為 `suggested → confirmed`（`locked` 永不覆寫）。

**Tech Stack:** Astro 5 + React island + `pdfjs-dist`（瀏覽器渲染 + Node legacy build 抽文字）、現有 dev-api handler、既有四階段 subagent 架構的延伸。

**Spec:** [docs/superpowers/specs/2026-09-12-pdf-reference-viewer-design.md](../specs/2026-09-12-pdf-reference-viewer-design.md)

## Global Constraints

- 輸出模式 `output: "static"`，Netlify 部署**無 Function、無執行時 API**——任何正式站要能讀到的資料都必須在 build 產物裡是實體檔案。
- Node ^22.x、強制 TypeScript。
- 系統共用元件（`src/components/**`，非 `src/components/generated/**` 的 AI 產出）不受 CLAUDE.md「元件白名單」限制——那份白名單只管 AI 一次性生成的視覺化元件（`component-generator` 的產出）可以 import 什麼；`GeneratedFrame.astro`、`VizZoom.tsx` 等系統元件本來就自由使用 `lucide-react`、`html-to-image` 等非白名單套件。因此本計畫新增的 `pdfjs-dist` 是一般 npm 依賴，不需要動 `src/lib/generated-component-whitelist.ts`。
- motion 動畫預設 200–400ms、`var(--ease-out)`，並用 `useReducedMotion()` 尊重 `prefers-reduced-motion`。
- 樣式一律用 `src/styles/tokens.css` 既有 CSS 變數，不硬編色碼；本專案系統 island（`ToastHost.tsx`、`VizZoom.tsx`、`Sidebar.astro`）的既有慣例是 inline style + CSS 變數，不是 Tailwind utility class——新元件延續這個慣例。
- Pre-push hook 跑 `astro build`；每個會影響 build 的 task 都要跑一次 `npm run build` 確認過關。
- 本專案目前沒有單元測試框架（無 vitest/jest，`grep` 不到任何 `*.test.*`），既有驗證手段是 `npm run typecheck`（`astro check`）+ `npm run build` + 手動開 `npm run dev` 在瀏覽器裡確認——本計畫延續這個慣例，不引入新的測試框架。

---

### Task 1: 搬移 PDF 到 notesDir

**Files:**
- Move: `docs/references/**/*.pdf` → `src/content/notes/_references/**/*.pdf`

**Interfaces:**
- Produces: `src/content/notes/_references/` 目錄樹（後續所有 task 的 PDF 來源）

- [ ] **Step 1: 建立目標目錄並搬移**

```bash
mkdir -p src/content/notes/_references
git mv docs/references/* src/content/notes/_references/
```

- [ ] **Step 2: 確認搬移結果，`docs/references/` 應該變空**

```bash
find src/content/notes/_references -type f -iname "*.pdf"
ls docs/references 2>&1
```

Expected：前者列出 8 個 `.pdf` 檔（電子學實作系列 7 份 + 機器學習實作系列 1 份）；後者印出 `No such file or directory` 或空目錄（若目錄還在但已空，直接 `rmdir docs/references` 清掉）。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: 搬移 docs/references PDF 到 notesDir 底下的 _references/"
```

---

### Task 2: 新增 pdfjs-dist 依賴

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `pdfjs-dist` 套件（`pdfjs-dist/legacy/build/pdf.mjs` 供 Node 端文字抽取、`pdfjs-dist` 主 build 供瀏覽器端渲染）

- [ ] **Step 1: 安裝套件**

```bash
npm install pdfjs-dist@^6.3.289
```

- [ ] **Step 2: 確認 Node legacy build 可以正常 import**

```bash
node --input-type=module -e "import('pdfjs-dist/legacy/build/pdf.mjs').then(m => console.log(typeof m.getDocument))"
```

Expected：印出 `function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 新增 pdfjs-dist 依賴（PDF 渲染與文字抽取）"
```

---

### Task 3: 抽出 `resolveNotesDir()` 共用函式

**Files:**
- Create: `src/lib/notes-dir.ts`
- Modify: `src/content/config.ts`

**Interfaces:**
- Produces: `resolveNotesDir(): string`——回傳目前生效的 notesDir 絕對路徑（`NOTECRAFT_NOTES_DIR` 優先，否則 `<cwd>/src/content/notes`）
- Consumed by: Task 5、Task 6

- [ ] **Step 1: 建立共用函式**

```ts
// src/lib/notes-dir.ts
import path from "node:path";

/**
 * notesDir 解析順序：NOTECRAFT_NOTES_DIR 環境變數 > 主專案預設 src/content/notes。
 * 抽成共用函式，避免 content/config.ts 與其他建置期程式各自維護一份、日後改預設值時漏改。
 */
export function resolveNotesDir(): string {
  const envDir = process.env.NOTECRAFT_NOTES_DIR;
  return envDir ? path.resolve(envDir) : path.resolve(process.cwd(), "src/content/notes");
}
```

- [ ] **Step 2: 讓 `src/content/config.ts` 改用它**

把檔案開頭這段：

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";
import { pathToFileURL } from "node:url";

// P1: 支援 NOTECRAFT_NOTES_DIR 讓 viewer 讀外部絕對路徑；沒設就走原本的 src/content/notes
const envDir = process.env.NOTECRAFT_NOTES_DIR;
const notesDir = envDir
  ? path.resolve(envDir)
  : path.resolve(process.cwd(), "src/content/notes");
```

改成：

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { pathToFileURL } from "node:url";
import { resolveNotesDir } from "../lib/notes-dir";

// P1: 支援 NOTECRAFT_NOTES_DIR 讓 viewer 讀外部絕對路徑；沒設就走原本的 src/content/notes
const notesDir = resolveNotesDir();
```

（其餘內容，包含 `notesBase` 的計算與 `notes` collection 定義，維持不動。）

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected：無錯誤（尤其確認 `notesDir` 型別仍是 `string`、`notesBase` 那行 `path.resolve/pathToFileURL` 用法沒有因為少 import `path` 而炸掉——`path` 仍在 `notesBase` 計算中用到，**不要整個移除 `node:path` 的 import**，只移除 `envDir`/`notesDir` 那段重複邏輯）

- [ ] **Step 4: Build 驗證主專案模式沒有壞掉**

```bash
npm run build
```

Expected：build 成功，跟修改前行為一致（因為主專案模式下 `resolveNotesDir()` 回傳的路徑跟原本手寫的邏輯完全相同）

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes-dir.ts src/content/config.ts
git commit -m "refactor: 抽出 resolveNotesDir() 共用函式，供 build hook 與 content config 共用"
```

---

### Task 4: PDF 文字抽取腳本（供 pdf-reference-planner 使用）

**Files:**
- Create: `scripts/pdf-extract-text.mjs`

**Interfaces:**
- Produces: CLI `node scripts/pdf-extract-text.mjs <pdf路徑>`，stdout 印出 `{ file, numPages, pages: [{ page, text }] }` 的 JSON
- Consumed by: Task 12（`pdf-reference-planner` subagent 透過 Bash 呼叫它逐頁抽字）

- [ ] **Step 1: 寫腳本**

```js
#!/usr/bin/env node
// 給 pdf-reference-planner subagent 呼叫：印出指定 PDF 每頁純文字（JSON），
// 供 AI 比對筆記段落與 PDF 頁碼。用 pdfjs-dist 的 legacy Node build，不依賴系統安裝的 poppler/pdftotext。
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";

const [, , pdfPathArg] = process.argv;
if (!pdfPathArg) {
  console.error("Usage: node scripts/pdf-extract-text.mjs <path-to-pdf>");
  process.exit(1);
}

const pdfPath = path.resolve(pdfPathArg);
const loadingTask = getDocument({ url: pdfPath });
const doc = await loadingTask.promise;

const pages = [];
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  pages.push({ page: i, text });
  page.cleanup();
}
await loadingTask.destroy();

console.log(JSON.stringify({ file: pdfPath, numPages: doc.numPages, pages }, null, 2));
```

- [ ] **Step 2: 對一份真的 PDF 跑跑看**

```bash
node scripts/pdf-extract-text.mjs "src/content/notes/_references/機器學習實作系列/第1週-機器學習簡介.pdf" | head -40
```

Expected：合法 JSON，`numPages` 是正整數（機器學習簡介那份應該是 59），至少前幾頁的 `text` 欄位非空字串。

- [ ] **Step 3: Commit**

```bash
git add scripts/pdf-extract-text.mjs
git commit -m "feat: 新增 PDF 文字抽取腳本，供 pdf-reference-planner subagent 使用"
```

---

### Task 5: 正式 build 的 PDF 複製 hook

**Files:**
- Create: `src/lib/notes-assets-build-copy.ts`
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `resolveNotesDir()`（Task 3）
- Produces: `astro:build:done` hook，把 `<notesDir>/_references/**` 複製進 `<outDir>/notes-assets/_references/**`

- [ ] **Step 1: 寫 build hook**

```ts
// src/lib/notes-assets-build-copy.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { resolveNotesDir } from "./notes-dir";

/**
 * 正式 build（output: "static"，無 Function）沒有 dev-only 的 `/notes-assets/*` handler
 *（見 src/dev-api/handlers.mjs 的 handleNotesAsset），所以把 notesDir 底下的
 * `_references/**`（PDF 原始檔）在建置完成後複製進 `dist/notes-assets/**`，讓同一個
 * `/notes-assets/<relpath>` URL 在 dev 與正式站都指向同一份檔案，前端元件不需要判斷模式。
 */
export default function notesAssetsBuildCopy(): AstroIntegration {
  return {
    name: "notecraft-notes-assets-build-copy",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const notesDir = resolveNotesDir();
        const referencesDir = path.join(notesDir, "_references");
        if (!fs.existsSync(referencesDir)) {
          logger.info("沒有 _references/ 目錄，略過 PDF 複製");
          return;
        }

        const outDir = fileURLToPath(dir);
        const destDir = path.join(outDir, "notes-assets", "_references");
        fs.cpSync(referencesDir, destDir, { recursive: true });
        logger.info(`已複製 ${referencesDir} → ${destDir}`);
      },
    },
  };
}
```

- [ ] **Step 2: 在 `astro.config.mjs` 註冊**

在現有的 import 區塊（`devApi` 那行附近）加入：

```js
import notesAssetsBuildCopy from "./src/lib/notes-assets-build-copy.ts";
```

在 `integrations: [...]` 陣列裡，`devApi()` 後面加上：

```js
    integrations: [
      mdx(),
      react(),
      tailwind({ applyBaseStyles: false }),
      devApi(),
      notesAssetsBuildCopy(),
    ],
```

- [ ] **Step 3: Build 並確認檔案真的被複製**

```bash
npm run build
find dist/notes-assets/_references -type f -iname "*.pdf" | wc -l
```

Expected：跟 `src/content/notes/_references` 底下的 `.pdf` 數量一致（8 份）。

- [ ] **Step 4: 確認 dev 模式那條既有路由也讀得到（不是這個 task 改的，但要確認沒被動到）**

```bash
npm run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4321/notes-assets/_references/%E6%A9%9F%E5%99%A8%E5%AD%B8%E7%BF%92%E5%AF%A6%E4%BD%9C%E7%B3%BB%E5%88%97/%E7%AC%AC1%E9%80%B1-%E6%A9%9F%E5%99%A8%E5%AD%B8%E7%BF%92%E7%B0%A1%E4%BB%8B.pdf"
kill %1
```

Expected：`200`

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes-assets-build-copy.ts astro.config.mjs
git commit -m "feat: 新增正式 build 的 PDF 複製 hook，讓 /notes-assets/* 在 Netlify 上也能讀到"
```

---

### Task 6: `_references/` 目錄樹掃描（供 /references 頁面使用）

**Files:**
- Create: `src/lib/references-url.ts`
- Create: `src/lib/references.ts`

**Interfaces:**
- Consumes: `resolveNotesDir()`（Task 3）
- Produces:
  - `pdfAssetUrl(relPath: string): string`（純函式，client/server 都能 import）
  - `interface ReferencePdf { name: string; relPath: string; url: string; numPages: number }`
  - `interface ReferenceFolder { name: string; folders: ReferenceFolder[]; pdfs: ReferencePdf[] }`
  - `listReferenceTree(): Promise<ReferenceFolder>`
- Consumed by: Task 7（`PdfViewerDrawer` 用 `pdfAssetUrl`）、Task 9（`PdfRefChip` 不需要，直接傳 relPath 給事件）、Task 10（`/references` 頁面 + `ReferencesLibrary` island）

- [ ] **Step 1: 純函式版本的 URL 換算**

```ts
// src/lib/references-url.ts
/**
 * `_references/` 底下的檔案一律用這個 URL 慣例存取：dev 靠既有 /notes-assets/* handler，
 * 正式 build 靠 notes-assets-build-copy.ts 複製出來的靜態檔案——兩邊路徑完全一致，
 * 呼叫端不用判斷模式。relPath 是相對 notesDir 的路徑（含 `_references/` 前綴）。
 */
export function pdfAssetUrl(relPath: string): string {
  const segments = relPath.split(/[\\/]/).map(encodeURIComponent);
  return `/notes-assets/${segments.join("/")}`;
}
```

- [ ] **Step 2: 目錄樹掃描 + 頁數**

```ts
// src/lib/references.ts
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
```

- [ ] **Step 3: 用一次性腳本手動驗證**

```bash
node --input-type=module -e "
import { listReferenceTree } from './src/lib/references.ts';
const tree = await listReferenceTree();
console.log(JSON.stringify(tree, null, 2));
" 2>&1 | head -60
```

（若專案的 Node 版本對直接執行 `.ts` 需要額外 loader，改用 `npx tsx --input-type=module -e "..."` 或暫時在 `scripts/` 下建一個 `.mjs` 呼叫它測試——重點是確認回傳的樹狀結構含 `電子學實作系列` / `機器學習實作系列` 兩個資料夾、`numPages` 是正確數字。）

Expected：能印出巢狀結構，`機器學習實作系列` 底下的 `第1週-機器學習簡介.pdf` 的 `numPages` 是 59。

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/references-url.ts src/lib/references.ts
git commit -m "feat: 新增 _references/ 目錄樹掃描與 PDF 資產 URL 換算"
```

---

### Task 7: `PdfViewerDrawer` island（pdf.js 側邊檢視器）

**Files:**
- Create: `src/components/islands/PdfViewerDrawer.tsx`

**Interfaces:**
- Consumes: `pdfAssetUrl(relPath: string): string`（Task 6）
- Produces: 監聽 `window` 上的 `nc-pdf-open` CustomEvent，`detail: { file: string; page: number }`——這是 Task 9 的 `PdfRefChip` 與 Task 10 的 `ReferencesLibrary` 開啟檢視器的唯一介面（沿用 `ToastHost.tsx` 的 singleton host + CustomEvent 慣例，不做 prop drilling）

- [ ] **Step 1: 寫元件**

```tsx
// src/components/islands/PdfViewerDrawer.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pdfAssetUrl } from "@/lib/references-url";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const WIDTH = 560;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

type OpenDetail = { file: string; page: number };

export default function PdfViewerDrawer() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (!detail?.file) return;
      setFile(detail.file);
      setPage(detail.page || 1);
      setScale(1);
      setOpen(true);
    };
    window.addEventListener("nc-pdf-open", onOpen as EventListener);
    return () => window.removeEventListener("nc-pdf-open", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  // 載入 PDF 文件——只在 file 變動時重載，不是每次翻頁都重載
  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    const task = pdfjsLib.getDocument(pdfAssetUrl(file));
    task.promise.then((doc) => {
      if (cancelled) return;
      docRef.current = doc;
      setNumPages(doc.numPages);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      task.destroy();
      docRef.current = null;
    };
  }, [open, file]);

  // 渲染當前頁到 canvas；page / scale 任一變動都要重畫，並取消上一次還沒畫完的 render
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !open) return;
    let cancelled = false;
    const clampedPage = Math.min(Math.max(page, 1), doc.numPages);
    doc.getPage(clampedPage).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: context, viewport, canvas });
      renderTaskRef.current = task;
      task.promise.catch(() => {
        /* 被下一次 render 取消時會 reject，忽略即可 */
      });
    });
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [page, scale, numPages, open]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(numPages || p, p + 1));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const fileName = file?.split("/").pop() ?? "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 890, background: "rgba(15,23,42,0.35)" }}
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`PDF 檢視：${fileName}`}
            initial={{ x: WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: WIDTH }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: WIDTH,
              maxWidth: "100vw",
              zIndex: 900,
              display: "flex",
              flexDirection: "column",
              background: "var(--neutral-0)",
              boxShadow: "var(--shadow-xl)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 56,
                padding: "0 12px 0 16px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span
                title={fileName}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-strong)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {fileName}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="關閉"
                title="關閉（Esc）"
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--neutral-100)",
                  color: "var(--text-body)",
                  cursor: "pointer",
                  flex: "none",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "auto",
                background: "var(--neutral-50)",
                padding: 16,
              }}
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  載入中…
                </div>
              ) : (
                <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto", boxShadow: "var(--shadow-md)" }} />
              )}
            </div>

            <div
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                height: 52,
                borderTop: "1px solid var(--border-subtle)",
                padding: "0 16px",
              }}
            >
              <IconButton onClick={goPrev} disabled={page <= 1} label="上一頁">
                <ChevronLeft size={16} />
              </IconButton>
              <input
                type="number"
                value={page}
                min={1}
                max={numPages || 1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setPage(Math.min(Math.max(1, v), numPages || v));
                }}
                style={{
                  width: 48,
                  height: 30,
                  textAlign: "center",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>/ {numPages || "…"}</span>
              <IconButton onClick={goNext} disabled={numPages > 0 && page >= numPages} label="下一頁">
                <ChevronRight size={16} />
              </IconButton>
              <span style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />
              <IconButton onClick={zoomOut} disabled={scale <= MIN_SCALE} label="縮小">
                <Minus size={16} />
              </IconButton>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", width: 40, textAlign: "center" }}>
                {Math.round(scale * 100)}%
              </span>
              <IconButton onClick={zoomIn} disabled={scale >= MAX_SCALE} label="放大">
                <Plus size={16} />
              </IconButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: disabled ? "var(--neutral-100)" : "var(--neutral-0)",
        color: disabled ? "var(--neutral-400)" : "var(--text-body)",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected：若 `PDFDocumentProxy` / `RenderTask` 型別名稱與已安裝的 `pdfjs-dist` 版本對不上，`astro check` 會報錯——照錯誤訊息去 `node_modules/pdfjs-dist/types/src/pdf.d.ts` 找正確的匯出型別名稱調整 import，不要用 `any` 繞過。

- [ ] **Step 3: Commit**

```bash
git add src/components/islands/PdfViewerDrawer.tsx
git commit -m "feat: 新增 PdfViewerDrawer 側邊 PDF 檢視器 island"
```

---

### Task 8: 掛載 `PdfViewerDrawer` 到 BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: `PdfViewerDrawer`（Task 7）
- Produces: `BaseLayout`／`Sidebar` 的 `Props["current"]` 新增 `"references"` 選項（Task 10 要用）

- [ ] **Step 1: `BaseLayout.astro` 掛上 drawer**

在 import 區塊加入：

```astro
import PdfViewerDrawer from "@/components/islands/PdfViewerDrawer.tsx";
```

`<ToastHost client:idle />` 那行下面加一行：

```astro
      <ToastHost client:idle />
      <PdfViewerDrawer client:only="react" />
```

> 用 `client:only="react"`（不是 `client:idle`）：`pdfjs-dist` 的瀏覽器 build 在 Astro SSR（`astro build` 預先跑一次 server render）階段執行會出錯，`client:only` 讓這個元件完全跳過 SSR、只在瀏覽器端掛載，跟它「預設關閉、沒東西要靜態渲染」的性質一致。

同時把 `Props.current` 的型別加一個選項：

```ts
export interface Props {
  title: string;
  description?: string;
  current: "dashboard" | "notes" | "series" | "tags" | "about" | "references";
}
```

- [ ] **Step 2: `Sidebar.astro` 的 `current` 型別同步**

```ts
export interface Props {
  current: "dashboard" | "notes" | "series" | "tags" | "about" | "references";
  markersPending: number;
}
```

（先只改型別，導覽項目留給 Task 10 一起加，因為那個 task 才會用到 `/references` 連結。）

- [ ] **Step 3: Typecheck + Build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 4: 手動驗證**

```bash
npm run dev
```

開瀏覽器到 `http://127.0.0.1:4321/`，打開瀏覽器 console 貼上：

```js
window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file: "_references/機器學習實作系列/第1週-機器學習簡介.pdf", page: 3 } }))
```

Expected：右側滑出一個抽屜，畫面顯示該 PDF 第 3 頁，上一頁/下一頁/縮放按鈕可操作，按 Esc 或右上角 X 會關閉。

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Sidebar.astro
git commit -m "feat: 在 BaseLayout 掛載 PdfViewerDrawer"
```

---

### Task 9: `PdfRefChip` island（筆記段落旁的觸發按鈕）

**Files:**
- Create: `src/components/islands/PdfRefChip.tsx`

**Interfaces:**
- Produces: `<PdfRefChip file={string} page={number} status?="suggested"|"confirmed" excerpt?={string} />`——這是 Task 13（`mdx-writer` 擴充）寫回 MDX 時要 import 的元件
- 依賴：`window.dispatchEvent(new CustomEvent("nc-pdf-open", ...))`，被 Task 7 的 `PdfViewerDrawer` 監聽

- [ ] **Step 1: 寫元件**

```tsx
// src/components/islands/PdfRefChip.tsx
import { useState } from "react";
import { FileText } from "lucide-react";

export interface PdfRefChipProps {
  /** 相對於 notesDir 的 PDF 路徑（含 `_references/` 前綴），跟 @ai-reference 標記的 file 欄位同格式 */
  file: string;
  page: number;
  status?: "suggested" | "confirmed";
  /** AI 抽出的該頁片段，hover 顯示，方便作者不用開 PDF 也能初步判斷猜得準不準 */
  excerpt?: string;
}

export default function PdfRefChip({ file, page, status = "confirmed", excerpt }: PdfRefChipProps) {
  const [hover, setHover] = useState(false);
  const suggested = status === "suggested";

  const open = () => {
    window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file, page } }));
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 8 }}>
      <button
        type="button"
        onClick={open}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={suggested ? `AI 建議對應 PDF 第 ${page} 頁（尚未確認）` : `對應 PDF 第 ${page} 頁`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 24,
          padding: "0 10px",
          borderRadius: "var(--radius-pill)",
          border: `1px ${suggested ? "dashed" : "solid"} ${hover ? "var(--blue-300)" : "var(--neutral-200)"}`,
          background: hover ? "var(--blue-50)" : "var(--neutral-0)",
          color: hover ? "var(--blue-700)" : "var(--neutral-600)",
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          fontWeight: 700,
          cursor: "pointer",
          transition:
            "background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out)",
        }}
      >
        <FileText size={13} strokeWidth={2.1} />
        p.{page}
      </button>
      {hover && excerpt && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            maxWidth: 280,
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            background: "var(--neutral-900)",
            color: "#fff",
            fontSize: 12.5,
            lineHeight: 1.5,
            boxShadow: "var(--shadow-lg)",
            zIndex: 10,
          }}
        >
          {excerpt}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: 手動驗證——暫時貼進一篇既有筆記測試**

在任一篇 `.mdx`（例如 `src/content/notes/機器學習實作系列第1週-機器學習簡介.mdx`）底部暫時加：

```mdx
import PdfRefChip from '@/components/islands/PdfRefChip.tsx'

測試段落 <PdfRefChip file="_references/機器學習實作系列/第1週-機器學習簡介.pdf" page={5} status="suggested" excerpt="測試用片段文字" client:visible />
```

`npm run dev` 打開該筆記頁面，確認看到虛線樣式的 `📄 p.5` chip、hover 出現 excerpt 提示框、點擊後 `PdfViewerDrawer` 開啟並跳到第 5 頁。**驗證完手動改掉 status="confirmed" 再確認變實線樣式，然後把這段測試用 import/JSX 刪掉，不要留在筆記裡。**

- [ ] **Step 4: Commit**

```bash
git add src/components/islands/PdfRefChip.tsx
git commit -m "feat: 新增 PdfRefChip island，筆記段落旁的 PDF 頁碼觸發按鈕"
```

---

### Task 10: `/references` 基礎瀏覽頁面

**Files:**
- Create: `src/components/islands/ReferencesLibrary.tsx`
- Create: `src/pages/references/index.astro`
- Modify: `src/components/Icon.astro`
- Modify: `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: `listReferenceTree()`、`ReferenceFolder`、`ReferencePdf`（Task 6）
- 依賴：`window.dispatchEvent(new CustomEvent("nc-pdf-open", ...))`，同 Task 9

- [ ] **Step 1: 加一個 `file` icon**

在 `src/components/Icon.astro` 的 `Name` union 加入 `"file"`：

```ts
type Name =
  | "dashboard"
  | "notes"
  | "tag"
  | "about"
  | "search"
  | "plus"
  | "clock"
  | "sparkle"
  | "code"
  | "edit"
  | "arrowRight"
  | "chevronRight"
  | "chevronLeft"
  | "grid"
  | "list"
  | "check"
  | "clipboard"
  | "folder"
  | "x"
  | "layers"
  | "bolt"
  | "hash"
  | "trash"
  | "external"
  | "menu"
  | "star"
  | "download"
  | "play"
  | "file";
```

在 `paths` 物件加入（放在 `download` 那筆後面）：

```ts
  file: [
    '<path d="M6 3.5A1.5 1.5 0 0 1 7.5 2H14l4 4v14.5A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z"/>',
    '<path d="M14 2v4.5h4"/>',
  ],
```

- [ ] **Step 2: `ReferencesLibrary` island**

```tsx
// src/components/islands/ReferencesLibrary.tsx
import type { ReferenceFolder, ReferencePdf } from "@/lib/references";
import { FileText, FolderOpen } from "lucide-react";

export interface ReferencesLibraryProps {
  tree: ReferenceFolder;
}

export default function ReferencesLibrary({ tree }: ReferencesLibraryProps) {
  const open = (pdf: ReferencePdf) => {
    window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file: pdf.relPath, page: 1 } }));
  };

  if (tree.folders.length === 0 && tree.pdfs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
        <p style={{ margin: 0, fontSize: 15 }}>_references/ 底下還沒有任何 PDF</p>
      </div>
    );
  }

  return <FolderSection folder={tree} depth={0} onOpen={open} />;
}

function FolderSection({
  folder,
  depth,
  onOpen,
}: {
  folder: ReferenceFolder;
  depth: number;
  onOpen: (pdf: ReferencePdf) => void;
}) {
  return (
    <section style={{ marginLeft: depth * 20, marginBottom: 28 }}>
      {depth > 0 && (
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-strong)",
            margin: "0 0 12px",
          }}
        >
          <FolderOpen size={16} style={{ color: "var(--blue-500)" }} />
          {folder.name}
        </h3>
      )}
      {folder.pdfs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {folder.pdfs.map((pdf) => (
            <button
              key={pdf.relPath}
              type="button"
              onClick={() => onOpen(pdf)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "flex-start",
                padding: 16,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-card)",
                boxShadow: "var(--shadow-card)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FileText size={20} style={{ color: "var(--blue-600)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.4 }}>
                {pdf.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{pdf.numPages} 頁</span>
            </button>
          ))}
        </div>
      )}
      {folder.folders.map((child) => (
        <FolderSection key={child.name} folder={child} depth={depth + 1} onOpen={onOpen} />
      ))}
    </section>
  );
}
```

- [ ] **Step 3: 頁面**

```astro
---
// src/pages/references/index.astro
import BaseLayout from "@/layouts/BaseLayout.astro";
import PageHead from "@/components/PageHead.astro";
import ReferencesLibrary from "@/components/islands/ReferencesLibrary.tsx";
import { listReferenceTree, type ReferenceFolder } from "@/lib/references";

const tree = await listReferenceTree();

function countPdfs(folder: ReferenceFolder): number {
  return folder.pdfs.length + folder.folders.reduce((acc, f) => acc + countPdfs(f), 0);
}
const totalPdfs = countPdfs(tree);
---
<BaseLayout title="原始講義" current="references" description="瀏覽課程原始 PDF 講義與手冊">
  <PageHead eyebrow="REFERENCES" title="原始講義" sub={`共 ${totalPdfs} 份 PDF`} />
  <ReferencesLibrary client:load tree={tree} />
</BaseLayout>
```

- [ ] **Step 4: Sidebar 加導覽項**

在 `nav` 陣列（`{ id: "tags", ... }` 後面、`{ id: "about", ... }` 前面）加入：

```ts
  { id: "references", zh: "講義", en: "References", ic: "file", href: "/references" },
```

同時把 `nav` 陣列型別定義那行的 `ic` union 加上 `"file"`：

```ts
const nav: { id: Props["current"]; zh: string; en: string; ic: "dashboard" | "notes" | "layers" | "tag" | "about" | "file"; href: string }[] = [
```

- [ ] **Step 5: Typecheck + Build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 6: 手動驗證**

```bash
npm run dev
```

開 `http://127.0.0.1:4321/references`，確認：
- 側邊欄看得到「講義 References」導覽項，點擊會到這頁且高亮
- 畫面依「電子學實作系列 → 第一週」「機器學習實作系列」分組列出 8 張 PDF 卡片，各自標示正確頁數
- 點任一張卡片，右側 `PdfViewerDrawer` 開啟並停在第 1 頁

- [ ] **Step 7: Commit**

```bash
git add src/components/islands/ReferencesLibrary.tsx src/pages/references/index.astro src/components/Icon.astro src/components/Sidebar.astro
git commit -m "feat: 新增 /references 基礎瀏覽頁面"
```

---

### Task 11: 擴充 `note-scanner` subagent

**Files:**
- Modify: `.claude/agents/note-scanner.md`

**Interfaces:**
- 無程式碼介面（這是 Claude Code subagent 設定檔，改的是它讀到的 prompt/指示）

- [ ] **Step 1: 在「工作流程」步驟 2 的 `@ai-visualize` 標記格式後面，補充第二種標記格式**

找到這段（步驟 2 結尾）：

```
   ```mdx
   {/* @ai-visualize
   id: <kebab-case-id>
   type: diagram | chart | timeline | table | motion | free
   prompt: |
     <自然語言描述>
   status: pending | generated | locked | failed
   */}
   ```

3. 解析每個區塊的四個欄位（id、type、prompt、status）
```

改成：

```
   ```mdx
   {/* @ai-visualize
   id: <kebab-case-id>
   type: diagram | chart | timeline | table | motion | free
   prompt: |
     <自然語言描述>
   status: pending | generated | locked | failed
   */}
   ```

   同時掃描第二種標記，`@ai-reference`（段落與 PDF 頁碼的關聯，見 docs/superpowers/specs/2026-09-12-pdf-reference-viewer-design.md）：

   ```mdx
   {/* @ai-reference
   id: <kebab-case-id>
   file: <相對於 notesDir 的 PDF 路徑，含 _references/ 前綴>
   page: <頁碼>
   status: suggested | confirmed | locked
   excerpt: <選填，PDF 該頁的文字片段>
   */}
   ```

3. 解析每個 `@ai-visualize` 區塊的四個欄位（id、type、prompt、status），以及每個 `@ai-reference` 區塊的欄位（id、file、page、status、excerpt）
```

- [ ] **Step 2: 在「輸出格式」的表格範本後面加一節**

找到 `## Locked / Failed / Errors` 那個區塊，在它前面插入：

```
## PDF References
| file | id | pdf file | page | status |
| --- | --- | --- | --- | --- |
| notes/電子學實作系列第1週....mdx | bjt-bias-1 | _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf | 12 | suggested |

（沒有 @ai-reference 標記就不用列這節。）

```

- [ ] **Step 3: 手動驗證**

在 Claude Code 對話中委派 note-scanner 掃描 `src/content/notes/`，確認它的回報格式確實新增了「PDF References」這一節（即使目前是空的，因為還沒有任何 `@ai-reference` 標記存在——這點沒關係，等 Task 12/13 跑過一次真的產生標記後再驗證一次有內容的情況）。

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/note-scanner.md
git commit -m "feat: note-scanner 擴充掃描 @ai-reference 標記"
```

---

### Task 12: 新增 `pdf-reference-planner` subagent

**Files:**
- Create: `.claude/agents/pdf-reference-planner.md`

**Interfaces:**
- Consumes: Task 4 的 `scripts/pdf-extract-text.mjs`
- Produces: 一份「待寫回清單」交給 Task 13 擴充後的 `mdx-writer`，格式：`{ file, paragraphAnchor, id, pdfFile, page, excerpt }[]`

- [ ] **Step 1: 寫 subagent 設定檔**

```markdown
---
name: pdf-reference-planner
description: 為一篇筆記規劃段落與 PDF 頁碼的關聯（@ai-reference 標記）。讀筆記全文與其所屬系列/週次資料夾下 _references/ 內的候選 PDF，用 pdf-extract-text.mjs 逐頁抽出 PDF 文字，比對段落語意後產出建議清單。當主 Agent 要幫某篇筆記的段落補上「對應 PDF 第幾頁」的標記時，委派給此 Subagent。
tools: Read, Glob, Grep, Bash
model: sonnet
---

你是 NoteCraft 的 PDF 對照員。你的任務是幫一篇筆記的段落找出「這段內容對應 PDF 的第幾頁」，產出建議清單交給 mdx-writer 寫回，你自己不修改任何檔案。

## 輸入

主 Agent 會給你：

- 一篇（或多篇）筆記的路徑
- 候選 PDF 的範圍（通常是該筆記所屬系列/週次資料夾底下的 `_references/**/*.pdf`；沒指定就用 Glob 找該筆記同資料夾脈絡下最相關的 PDF）

## 工作流程

1. Read 該筆記全文，按段落（以空行分隔的區塊）切開，記錄每個段落的大致內容與它在檔案中的錨點（例如段落開頭的前 20 個字，供 mdx-writer 精確定位插入點）
2. 對每份候選 PDF，用 Bash 執行 `node scripts/pdf-extract-text.mjs "<pdf 絕對路徑>"`，取得逐頁文字（JSON：`{ file, numPages, pages: [{ page, text }] }`）
3. 把每個筆記段落跟每份 PDF 的每一頁做語意比對，找出最相關的頁面
4. **只對信心足夠高的段落產出建議**——如果一個段落在所有候選 PDF 裡都找不到明顯對應的頁面，就不要為它產生建議，不要硬猜
5. 已經有 `@ai-reference` 標記且 `status: confirmed` 或 `status: locked` 的段落，**跳過，不重新比對**（用 Grep 先找出這篇筆記裡已存在的 `@ai-reference` id 與 status）
6. 對通過篩選的段落，決定：
   - `id`：kebab-case，語意化命名（例如 `bjt-bias-1`），同篇內不可跟既有 `@ai-visualize` 或 `@ai-reference` 的 id 重複
   - `paragraphAnchor`：該段落開頭的前 20 個字左右，供 mdx-writer 定位插入點
   - `pdfFile`：相對於 notesDir 的路徑（含 `_references/` 前綴，例如 `_references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf`）
   - `page`：建議頁碼
   - `excerpt`：該頁比對到的文字片段（截取 30–50 字，讓作者不用開 PDF 就能初步判斷猜得準不準）

## 輸出格式

```
## PDF Reference Suggestions
| file | paragraphAnchor | id | pdfFile | page | excerpt |
| --- | --- | --- | --- | --- | --- |
| notes/電子學實作系列第1週....mdx | "接下來討論 BJT 的偏壓..." | bjt-bias-1 | _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf | 12 | "...如圖 3-2 所示的偏壓電路，透過..." |
```

若整篇筆記都找不到信心足夠的對應，明確回報「找不到足夠信心的對應段落，未產生建議」，不要編造。

## 不要做的事

- 不要修改任何檔案；你只負責讀取、比對、回報
- 不要對已經 `confirmed` 或 `locked` 的段落重新比對或建議覆寫
- 不要因為找不到完美對應就隨便選一頁湊數——信心不足就不產生建議
```

- [ ] **Step 2: 手動驗證**

在 Claude Code 對話中委派這個 subagent，範圍設為 `src/content/notes/電子學實作系列第1週-半導體物理基礎.mdx`（或實際存在的第一週筆記檔名），候選 PDF 設為 `src/content/notes/_references/電子學實作系列/第一週/*.pdf`。確認：
- 它有實際呼叫 `node scripts/pdf-extract-text.mjs` 抽文字（不是憑空猜)
- 輸出的表格格式正確、`pdfFile` 路徑格式跟規格一致（含 `_references/` 前綴）
- 沒有裝樣子硬湊建議

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/pdf-reference-planner.md
git commit -m "feat: 新增 pdf-reference-planner subagent，比對筆記段落與 PDF 頁碼"
```

---

### Task 13: 擴充 `mdx-writer` subagent

**Files:**
- Modify: `.claude/agents/mdx-writer.md`

**Interfaces:**
- Consumes: Task 12 產出的「待寫回清單」
- Produces: 在 MDX 裡插入 `@ai-reference` 標記 + `<PdfRefChip ... client:visible />`（Task 9 的元件）

- [ ] **Step 1: 在檔案開頭的說明後面，「## 輸入」區塊加一段**

在現有「## 輸入」段落（描述 `file`/`id`/`pascalCaseId`/`type`/`prompt`/... 那些欄位）後面加：

```
## 輸入（第二種：PDF 段落關聯）

主 Agent 也可能給你一份「PDF Reference 待寫回清單」（來自 pdf-reference-planner），每筆包含：

- `file`：MDX 檔路徑
- `paragraphAnchor`：段落開頭的前 20 字左右，用來定位插入點（找該段落結尾）
- `id`：標記區塊的 id
- `pdfFile`：相對於 notesDir 的 PDF 路徑（含 `_references/` 前綴）
- `page`：建議頁碼
- `excerpt`：該頁文字片段
```

- [ ] **Step 2: 在「## 工作流程」後面加一節新的工作流程**

在現有「## 工作流程」整節結束、「### 範例：...」開始之前，加入：

```
## 工作流程（PDF 段落關聯）

對每一筆「PDF Reference 待寫回清單」項目，執行：

1. Read 該 MDX 檔
2. 用 `paragraphAnchor` 找到對應段落，定位到該段落結尾（下一個空行之前）
3. 檢查該檔案是否已有相同 `id` 的 `@ai-reference` 標記：
   - 沒有 → 在段落結尾插入新標記 + `<PdfRefChip>`（見下方格式）
   - 有且 `status: suggested` → 原地更新 `page` / `excerpt`，`status` 維持 `suggested`
   - 有且 `status: confirmed` 或 `status: locked` → **不要修改，跳過這筆**，在回報中註明「已 confirmed/locked，略過」
4. 若檔案還沒 import 過 `PdfRefChip`，在檔案第一個 `@ai-reference` 標記前面補上：

   ```mdx
   import PdfRefChip from '@/components/islands/PdfRefChip.tsx'
   ```

   （每個檔案只需一次；已存在就不要重複插入）

5. 插入格式：

   ```mdx
   {/* @ai-reference
   id: <id>
   file: <pdfFile>
   page: <page>
   status: suggested
   excerpt: <excerpt>
   */}
   <PdfRefChip file="<pdfFile>" page={<page>} status="suggested" excerpt="<excerpt>" client:visible />
   ```

   `excerpt` 帶雙引號時要跳脫成 `\"`；如果 excerpt 裡本來就有雙引號，一併處理。

## 輸出格式（PDF 段落關聯）

```
## PDF Reference writeback
- notes/電子學實作系列第1週....mdx :: bjt-bias-1 → 新增標記，對應 p.12
- notes/電子學實作系列第1週....mdx :: existing-id → 已 confirmed，略過
```
```

- [ ] **Step 3: 「不要做的事」補一條**

在現有「## 不要做的事」清單最後加一條：

```
- 不要覆寫 `status: confirmed` 或 `status: locked` 的 `@ai-reference` 標記
```

- [ ] **Step 4: 端到端手動驗證**

用 Task 12 產出的一份真實建議清單，委派這個擴充後的 `mdx-writer` 實際寫回一篇筆記，確認：
- `npm run typecheck` 過
- `npm run build` 過
- `npm run dev` 打開該筆記頁面，看到虛線 `📄 p.N` chip，點擊能開啟 `PdfViewerDrawer` 並跳到正確頁
- 手動把該標記的 `status` 改成 `confirmed`，重新整理頁面，chip 變成實線樣式

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/mdx-writer.md
git commit -m "feat: mdx-writer 擴充支援寫回 @ai-reference 標記與 PdfRefChip"
```

---

### Task 14: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 技術棧新增 pdfjs-dist**

在「## 技術棧」的「圖表」那行後面加一行：

```
- **PDF 檢視**：`pdfjs-dist`（瀏覽器端側邊抽屜檢視器 + Node legacy build 供 subagent 抽取頁面文字）
```

- [ ] **Step 2: 目錄結構補上 `_references/` 與新檔案**

在「## 目錄結構」的 tree 裡，`content/notes/` 那行後面加一行 `_references/` 說明，並在 `.claude/agents/` 底下加一行 `pdf-reference-planner.md`：

```
src/
├── content/notes/              MDX 筆記原始檔
│   └── _references/             原始 PDF 講義（跟著 notesDir 走，dev/build 都以 /notes-assets/<相對路徑> 存取）
├── components/generated/        AI 生成的視覺化元件（一個 id 對應一個 .tsx）
├── pages/
│   ├── api/                    dev-only API routes（POST /api/notes、tags 相關）
│   ├── references/             PDF 講義庫瀏覽頁
│   └── notes/[slug].astro      筆記檢視頁
└── ...
.claude/
├── agents/                     五個 Subagent 設定檔
│   ├── note-scanner.md
│   ├── visualize-planner.md
│   ├── component-generator.md
│   ├── mdx-writer.md
│   └── pdf-reference-planner.md
└── skills/
    └── content-visualize/SKILL.md
```

（沿用既有 tree 的其餘內容，只補上面這幾行；把「四個 Subagent 設定檔」的「四」改成「五」。）

- [ ] **Step 3: 「AI 標記區塊（核心機制）」補第二種標記**

在現有 `@ai-visualize` 範例區塊後面加一段：

```
第二種標記，`@ai-reference`，標出筆記段落與 PDF 原始講義頁碼的關聯：

```mdx
{/* @ai-reference
id: bjt-bias-1
file: _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf
page: 12
status: suggested | confirmed | locked
excerpt: 如圖 3-2 所示的偏壓電路
*/}
```

流程由 `note-scanner`（擴充）→ `pdf-reference-planner`（新增）→ `mdx-writer`（擴充）三個 subagent 協作：先掃描既有標記、比對段落與 PDF 頁面文字產出建議、寫回標記。`status` 沒有 `pending`/`failed`——AI 通篇比對後主動插入建議（`suggested`），信心不足的段落不插入標記；作者手動把 `status` 改成 `confirmed` 代表頁碼正確，`locked` 永不覆寫，重跑規劃時 `confirmed`/`locked` 一律跳過。完整設計見 docs/superpowers/specs/2026-09-12-pdf-reference-viewer-design.md。
```

- [ ] **Step 4: 「處理規則」補一條**

在「### 處理規則」清單最後加：

```
- `@ai-reference` 標記的 `status: confirmed`／`status: locked` 永不覆寫；重新規劃時只補新段落或更新既有 `suggested` 標記
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 補上 PDF 講義檢視功能的說明"
```

---

## Self-Review 摘要（寫完計畫後的檢查結果）

- **spec 涵蓋度**：spec 第 3 節（目錄/服務機制）→ Task 1/5/6；第 4 節（標記語法）→ Task 12/13；第 5 節（subagent）→ Task 11/12/13；第 6 節（基礎瀏覽）→ Task 10；第 7 節（進階檢視 + pdfjs-dist）→ Task 2/7/8/9；第 8 節（build 驗證）→ 各 task 內建的 `npm run build` 步驟。全部有對應 task。
- **型別一致性**：`ReferenceFolder`/`ReferencePdf`（Task 6）在 Task 10 用 `import type` 引用；`pdfAssetUrl`（Task 6）在 Task 7 引用；`nc-pdf-open` 事件的 `detail: { file, page }` 形狀在 Task 7/9/10 三處一致。
- **白名單澄清**：spec 原文把 `pdfjs-dist` 講成「加入元件白名單」，但白名單機制（`generated-component-whitelist.ts`）只管 AI 生成元件的 import，系統元件不受限——已在 Global Constraints 澄清，Task 2 只是單純 `npm install`，沒有去動白名單檔案。
