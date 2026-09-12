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
