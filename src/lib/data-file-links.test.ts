import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDataFileLink } from "./data-file-links.ts";

const ROOT = "/proj";
const NOTES = "/proj/src/content/notes";
const MDX_DIR = NOTES;

// 測試用的假檔案系統：只有列在這裡的絕對路徑算「存在」。
function ctx(files: string[], dev = true) {
  const set = new Set(files);
  return { mdxDir: MDX_DIR, notesDir: NOTES, projectRoot: ROOT, dev, exists: (p: string) => set.has(p) };
}

test("notesDir 底下的相對路徑 → /notes-assets/*", () => {
  const r = resolveDataFileLink("_references/機器學習/wat.csv", ctx([`${NOTES}/_references/機器學習/wat.csv`]));
  assert.equal(r.status, "resolved");
  assert.equal(r.status === "resolved" && r.target.relPath, "_references/機器學習/wat.csv");
  assert.equal(
    r.status === "resolved" && r.target.url,
    "/notes-assets/_references/" + encodeURIComponent("機器學習") + "/wat.csv",
  );
});

test("專案根底下、notesDir 以外的檔案 → dev 給 /local-assets/*", () => {
  const r = resolveDataFileLink("simulations/lab1/measured/Lab1.xlsx", ctx([`${ROOT}/simulations/lab1/measured/Lab1.xlsx`]));
  assert.equal(r.status, "resolved");
  assert.equal(r.status === "resolved" && r.target.url, "/local-assets/simulations/lab1/measured/Lab1.xlsx");
});

test("同一個檔案在正式 build 是 dev-only，不生成 /local-assets 連結", () => {
  const r = resolveDataFileLink("simulations/lab1/measured/Lab1.xlsx", ctx([`${ROOT}/simulations/lab1/measured/Lab1.xlsx`], false));
  assert.equal(r.status, "dev-only");
  assert.equal(r.status === "dev-only" && r.relPath, "simulations/lab1/measured/Lab1.xlsx");
});

test("_references/ 底下的檔案在正式 build 仍然可開（/notes-assets 兩邊都在）", () => {
  const r = resolveDataFileLink("_references/a.csv", ctx([`${NOTES}/_references/a.csv`], false));
  assert.equal(r.status, "resolved");
});

test("作者已經寫成 /notes-assets/* 的連結：原樣採用，只補 relPath", () => {
  const r = resolveDataFileLink("/notes-assets/_references/x/y.csv", ctx([]));
  assert.equal(r.status, "resolved");
  assert.equal(r.status === "resolved" && r.target.relPath, "_references/x/y.csv");
  assert.equal(r.status === "resolved" && r.target.url, "/notes-assets/_references/x/y.csv");
});

test("percent-encoded 的 /notes-assets/* 連結：relPath 要解碼回中文", () => {
  const r = resolveDataFileLink("/notes-assets/_references/" + encodeURIComponent("機器學習") + "/a.csv", ctx([]));
  assert.equal(r.status === "resolved" && r.target.relPath, "_references/機器學習/a.csv");
});

test("/local-assets/* 的連結在正式 build 不採用", () => {
  assert.equal(resolveDataFileLink("/local-assets/simulations/a.csv", ctx([])).status, "resolved");
  assert.equal(resolveDataFileLink("/local-assets/simulations/a.csv", ctx([], false)).status, "dev-only");
});

test("MDX 所在目錄優先於專案根", () => {
  const r = resolveDataFileLink("data/a.csv", ctx([`${NOTES}/data/a.csv`, `${ROOT}/data/a.csv`]));
  assert.equal(r.status === "resolved" && r.target.url, "/notes-assets/data/a.csv");
});

test("副檔名不在檢視器註冊表裡的連結一律不碰", () => {
  for (const href of ["a.txt", "b.zip", "./c.mdx", "d.cir"]) {
    assert.equal(resolveDataFileLink(href, ctx([`${NOTES}/${href}`])).status, "skip", href);
  }
});

test("站外連結、頁內 anchor、其他絕對路徑一律不碰", () => {
  for (const href of [
    "https://github.com/x/y/blob/main/a.csv",
    "mailto:a@b.c",
    "//cdn.example.com/a.csv",
    "#當天怎麼記數據",
    "/public-thing/a.csv",
  ]) {
    assert.equal(resolveDataFileLink(href, ctx([])).status, "skip", href);
  }
});

test("副檔名對得上、但兩個基準都找不到檔案 → not-found（作者打錯路徑）", () => {
  const r = resolveDataFileLink("simulations/lab9/nope.xlsx", ctx([]));
  assert.equal(r.status, "not-found");
});

test("落在專案根以外的相對路徑不採用（不洩漏本機路徑）", () => {
  const r = resolveDataFileLink("../../../../etc/secret.csv", ctx(["/etc/secret.csv"]));
  assert.equal(r.status, "skip");
});

test("query / hash 保留在 URL 後面，不進 relPath", () => {
  const r = resolveDataFileLink("_references/a.csv#sheet2", ctx([`${NOTES}/_references/a.csv`]));
  assert.equal(r.status === "resolved" && r.target.url, "/notes-assets/_references/a.csv#sheet2");
  assert.equal(r.status === "resolved" && r.target.relPath, "_references/a.csv");
});

test("Excel 的 ~$ 鎖定檔不是資料檔", () => {
  const r = resolveDataFileLink("_references/~$a.xlsx", ctx([`${NOTES}/_references/~$a.xlsx`]));
  assert.equal(r.status, "skip");
});
