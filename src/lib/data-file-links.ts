/**
 * 筆記正文裡「指向資料檔的連結」→ 抽屜開得起來的目標。
 *
 * 判定哪些副檔名算資料檔，直接沿用 `reference-kinds.ts` 的註冊表——講義抽屜畫得出來的
 * 格式，筆記內文就該點得開，兩邊不該各維護一份清單。
 *
 * 純函式、不碰檔案系統（`exists` 由呼叫端注入），remark plugin 那層才接 node:fs。
 * 路徑解析的直覺與 remark-notecraft-notes-assets 的圖片／筆記間連結一致：先以 MDX 檔
 * 所在目錄為基準，找不到再退回專案根——`simulations/` 這種實驗工作區不在 notesDir 底下，
 * 但作者在筆記裡就是照專案根的相對路徑寫它。
 */

import path from "node:path";
import { referenceKindOf } from "./reference-kinds.ts";
import { localAssetUrl, referenceAssetUrl } from "./references-url.ts";

/** dev / 正式站兩邊都服務得到的資產前綴（`_references/` 由 notes-assets-build-copy 複製進 dist）。 */
const NOTES_ASSETS_PREFIX = "/notes-assets/";
/** dev-only 的資產前綴：正式 build 既沒有這條路由，也不會複製檔案。 */
const LOCAL_ASSETS_PREFIX = "/local-assets/";

export interface DataFileLinkTarget {
  /** 顯示用的相對路徑（已解碼），抽屜靠它取檔名與判斷格式 */
  relPath: string;
  /** 可直接放進 href / fetch 的 URL（含原本的 query / hash） */
  url: string;
}

export type DataFileLinkResult =
  /** 解析成功，連結可以改寫成抽屜入口 */
  | { status: "resolved"; target: DataFileLinkTarget }
  /** 檔案在，但只有 `astro dev` 服務得到——正式站不輸出它，連結要另尋出路 */
  | { status: "dev-only"; relPath: string }
  /** 副檔名對得上，但兩個基準都找不到檔案：多半是作者路徑打錯 */
  | { status: "not-found"; pathPart: string }
  /** 不是資料檔連結，或不歸這個 plugin 管（站外連結、頁內 anchor…） */
  | { status: "skip" };

export interface DataFileLinkContext {
  /** 這篇 MDX 所在目錄的絕對路徑 */
  mdxDir: string;
  /** notesDir 絕對路徑 */
  notesDir: string;
  /** 專案根（cwd）絕對路徑 */
  projectRoot: string;
  /** 是否為 `astro dev`——決定 `/local-assets/*` 算不算數 */
  dev: boolean;
  /** 檔案是否存在。抽成參數讓測試不必碰真的檔案系統 */
  exists: (absPath: string) => boolean;
}

const SKIP = { status: "skip" } as const;

/** 把 URL 拆成 path 與 query/hash 兩段；只有 path 那段參與解析。 */
function splitUrl(url: string): { pathPart: string; suffix: string } {
  const m = url.match(/^([^?#]*)([?#].*)?$/);
  return { pathPart: m?.[1] ?? url, suffix: m?.[2] ?? "" };
}

/** 中文檔名在作者手寫與工具產出之間可能編碼也可能沒編碼；壞掉的 escape 就原樣用。 */
function decodePath(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** abs 是否真的落在 parent 底下（同一個目錄不算）。 */
function isInside(parent: string, abs: string): boolean {
  const rel = path.relative(parent, abs);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function resolveDataFileLink(href: string, ctx: DataFileLinkContext): DataFileLinkResult {
  const { pathPart, suffix } = splitUrl(href);
  if (!pathPart) return SKIP;

  // 先用副檔名把絕大多數連結擋在外面，後面才做比較貴的路徑解析。
  const fileName = decodePath(pathPart.split("/").pop() ?? "");
  if (!referenceKindOf(fileName)) return SKIP;

  // 作者已經寫成站內資產 URL：路徑他自己算好了，這裡只補 relPath 與 dev 判定。
  if (pathPart.startsWith(NOTES_ASSETS_PREFIX)) {
    return {
      status: "resolved",
      target: { relPath: decodePath(pathPart.slice(NOTES_ASSETS_PREFIX.length)), url: href },
    };
  }
  if (pathPart.startsWith(LOCAL_ASSETS_PREFIX)) {
    const relPath = decodePath(pathPart.slice(LOCAL_ASSETS_PREFIX.length));
    return ctx.dev ? { status: "resolved", target: { relPath, url: href } } : { status: "dev-only", relPath };
  }

  // 站外連結、protocol-relative、頁內 anchor 一律不碰。
  if (/^[a-z][a-z0-9+\-.]*:/i.test(pathPart) || pathPart.startsWith("//") || pathPart.startsWith("#")) {
    return SKIP;
  }
  // 其他絕對路徑（public/ 底下的檔案）沒有 relPath 可言，維持瀏覽器原生的下載行為。
  if (pathPart.startsWith("/")) return SKIP;

  const decoded = decodePath(pathPart);
  const abs = [path.resolve(ctx.mdxDir, decoded), path.resolve(ctx.projectRoot, decoded)].find(ctx.exists);
  if (!abs) return { status: "not-found", pathPart };

  // notesDir 先判：它通常就在專案根底下（預設 src/content/notes），順序反了會全部走成 local-assets。
  if (isInside(ctx.notesDir, abs)) {
    const rel = toPosix(path.relative(ctx.notesDir, abs));
    return { status: "resolved", target: { relPath: rel, url: referenceAssetUrl(rel) + suffix } };
  }
  if (isInside(ctx.projectRoot, abs)) {
    const rel = toPosix(path.relative(ctx.projectRoot, abs));
    return ctx.dev
      ? { status: "resolved", target: { relPath: rel, url: localAssetUrl(rel) + suffix } }
      : { status: "dev-only", relPath: rel };
  }
  // 專案根以外的檔案：連 relPath 都不該出現在輸出的 HTML 裡（本機絕對路徑不得外流）。
  return SKIP;
}
