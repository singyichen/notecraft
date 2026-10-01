/**
 * 把筆記正文裡指向資料檔（.xlsx / .csv / .pdf / .docx / .pptx，以 REFERENCE_KINDS 為準）的連結，改寫成講義抽屜的入口。
 *
 * 「哪些副檔名算資料檔」沿用 `reference-kinds.ts` 的註冊表；路徑解析規則與各種結果的
 * 意義見 `data-file-links.ts`。這一層只負責三件事：接 node:fs、決定 dev/正式、把結果
 * 寫回 mdast 節點。
 *
 * 輸出的連結長這樣（`href` 仍是真的檔案 URL，沒有 JS 也點得到）：
 *     <a class="nc-datafile-link" href="/local-assets/..." data-nc-datafile="simulations/...xlsx">
 * `data-nc-datafile` 由 WorkbenchLayout 的委派 click handler 攔下，dispatch `nc-ref-open`
 * 給 ReferenceViewerDrawer——屬性值是**顯示用的相對路徑**（未 percent-encode），
 * 抽屜靠它取檔名與判斷格式，href 才是拿去 fetch 的 URL。
 *
 * 正式 build 的 dev-only 檔案（`simulations/` 底下的實驗數據）不會被輸出到 dist，
 * 這裡改指向 GitHub 上的同一個檔——沿用作者原本手寫 GitHub 連結的做法，只是自動化。
 * 偵測不到 origin 就維持原樣不動。
 *
 * 注意：改完這個檔要重啟 `astro dev`（remark plugin 只在 dev server 啟動時實例化一次）。
 */

import fs from "node:fs";
import path from "node:path";
import { resolveDataFileLink } from "./data-file-links.ts";
import { resolveNotesDir } from "./notes-dir.ts";
import { detectGithubRepoHint } from "./detect-github-repo.mjs";

interface MdNode {
  type: string;
  url?: string;
  data?: { hProperties?: Record<string, unknown> };
  children?: MdNode[];
}
interface VFileLike {
  path?: string;
}

/** `blob/HEAD` 讓 GitHub 自己解析預設分支，不必在這裡寫死 main。 */
function githubBlobUrl(repoHint: string, relPath: string): string {
  const segments = relPath.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repoHint}/blob/HEAD/${segments}`;
}

function markAsDrawerLink(node: MdNode, url: string, relPath: string) {
  node.url = url;
  node.data = node.data ?? {};
  node.data.hProperties = {
    ...(node.data.hProperties ?? {}),
    className: ["nc-datafile-link"],
    "data-nc-datafile": relPath,
    title: `在側邊抽屜開啟 ${relPath.split("/").pop()}`,
  };
}

export default function remarkNotecraftDataLinks() {
  // 只認 "development"：NODE_ENV 沒設時當作正式環境，寧可少一個抽屜入口，
  // 也不要在靜態產物裡留下一條指向不存在路由的 /local-assets 連結。
  const dev = process.env.NODE_ENV === "development";
  const projectRoot = process.cwd();
  const notesDir = resolveNotesDir();
  // 正式 build 才需要 GitHub 退路，dev 不必付 `git remote` 那一次 spawn 的成本。
  const repoHint = dev ? "" : detectGithubRepoHint();
  const warned = new Set<string>();

  const warnOnce = (key: string, message: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[data-links] ${message}`);
  };

  return (tree: MdNode, file: VFileLike) => {
    const mdxAbsPath = file.path;
    if (!mdxAbsPath) return;
    const ctx = {
      mdxDir: path.dirname(mdxAbsPath),
      notesDir,
      projectRoot,
      dev,
      exists: (abs: string) => fs.existsSync(abs) && fs.statSync(abs).isFile(),
    };
    // 訊息裡只給 notesDir 相對路徑：build log 也算輸出，不放本機絕對路徑。
    const noteLabel = path.relative(notesDir, mdxAbsPath) || path.basename(mdxAbsPath);

    const walk = (node: MdNode) => {
      if (node.type === "link" && node.url) {
        const result = resolveDataFileLink(node.url, ctx);
        if (result.status === "resolved") {
          markAsDrawerLink(node, result.target.url, result.target.relPath);
        } else if (result.status === "dev-only") {
          // 檔案在，但只有本機服務得到。正式站改指 GitHub，抽屜入口不給——點了會開新分頁。
          if (repoHint) node.url = githubBlobUrl(repoHint, result.relPath);
          else warnOnce(`${noteLabel}:${result.relPath}`, `${noteLabel}：${result.relPath} 只有 dev 開得起來，又偵測不到 GitHub origin，連結維持原樣`);
        } else if (result.status === "not-found") {
          warnOnce(`${noteLabel}:${result.pathPart}`, `${noteLabel}：找不到 ${result.pathPart}（MDX 所在目錄與專案根都沒有），連結維持原樣`);
        }
      }
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(tree);
  };
}
