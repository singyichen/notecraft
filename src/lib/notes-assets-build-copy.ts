import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { resolveNotesDir } from "./notes-dir";

// pdfjs-dist 套件內建的 cmaps/ 與 standard_fonts/ 是解析 PDF（尤其 CJK CMap，如 GBK-EUC-H
// ／非嵌入標準字型）必要的靜態資料，跟 notesDir 無關、每次 build 都一樣，所以固定複製一次到
// dist 底下的固定路徑，供 PdfViewerDrawer.tsx 以 `/pdfjs-cmaps/`、`/pdfjs-standard-fonts/`
// 存取。開發期由 src/dev-api/handlers.mjs 的對應路由服務同一份 node_modules 內容。
//
// 用 createRequire(import.meta.url).resolve() 找 pdfjs-dist 的實際安裝位置，而不是相對
// 路徑拼接：這個檔案本身會隨 npm 套件（notecraftapp）一起發布、在別人專案的 astro build
// 裡執行，pdfjs-dist 有沒有被 hoist 到更上層 node_modules 無法預先假設。require.resolve
// 沿用 Node 標準的模組解析演算法（逐層往上找 node_modules），跟本檔其他地方以 bare
// specifier import "pdfjs-dist/..." 的解析結果一致。
const require = createRequire(import.meta.url);
const PDFJS_DIR = path.dirname(require.resolve("pdfjs-dist/package.json"));

/**
 * 正式 build（output: "static"，無 Function）沒有 dev-only 的 `/notes-assets/*` handler
 *（見 src/dev-api/handlers.mjs 的 handleNotesAsset），所以把 notesDir 底下的
 * `_references/**`（PDF 原始檔）在建置完成後複製進 `dist/notes-assets/**`，讓同一個
 * `/notes-assets/<relpath>` URL 在 dev 與正式站都指向同一份檔案，前端元件不需要判斷模式。
 * 同一個 hook 也把 pdfjs-dist 的 cmaps/ 與 standard_fonts/ 複製進 dist，兩者都是
 * static、per-build（不隨 notesDir 而變），所以不需要 `_references/`-style 的 relPath 處理。
 */
export default function notesAssetsBuildCopy(): AstroIntegration {
  return {
    name: "notecraft-notes-assets-build-copy",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);

        const notesDir = resolveNotesDir();
        const referencesDir = path.join(notesDir, "_references");
        if (!fs.existsSync(referencesDir)) {
          logger.info("沒有 _references/ 目錄，略過 PDF 複製");
        } else {
          const destDir = path.join(outDir, "notes-assets", "_references");
          fs.cpSync(referencesDir, destDir, { recursive: true });
          logger.info(`已複製 ${referencesDir} → ${destDir}`);
        }

        const cmapsSrc = path.join(PDFJS_DIR, "cmaps");
        const cmapsDest = path.join(outDir, "pdfjs-cmaps");
        fs.cpSync(cmapsSrc, cmapsDest, { recursive: true });
        logger.info(`已複製 ${cmapsSrc} → ${cmapsDest}`);

        const fontsSrc = path.join(PDFJS_DIR, "standard_fonts");
        const fontsDest = path.join(outDir, "pdfjs-standard-fonts");
        fs.cpSync(fontsSrc, fontsDest, { recursive: true });
        logger.info(`已複製 ${fontsSrc} → ${fontsDest}`);
      },
    },
  };
}
