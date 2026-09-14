import { test } from "node:test";
import assert from "node:assert/strict";
import {
  todayISO,
  splitFrontmatter,
  bumpUpdatedAt,
  utf8ToBase64,
  base64ToUtf8,
  extractRefs,
  diffRemovedRefs,
} from "./github-contents.ts";

test("todayISO returns YYYY-MM-DD", () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test("splitFrontmatter 切出 frontmatter block（含結尾 ---）與 body", () => {
  const raw = `---\ntitle: "測試"\nupdatedAt: "2026-01-01"\n---\n\n# 內文\n\n段落文字`;
  const { frontmatter, body } = splitFrontmatter(raw);
  assert.equal(frontmatter, `---\ntitle: "測試"\nupdatedAt: "2026-01-01"\n---\n`);
  assert.equal(body, `\n# 內文\n\n段落文字`);
  assert.equal(frontmatter + body, raw);
});

test("splitFrontmatter 對沒有 frontmatter 的內容原樣回傳 body", () => {
  const raw = "沒有 frontmatter 的內容";
  const { frontmatter, body } = splitFrontmatter(raw);
  assert.equal(frontmatter, "");
  assert.equal(body, raw);
});

test("bumpUpdatedAt 只改 updatedAt 那一行，其餘逐字保留", () => {
  const fm = `---\ntitle: "測試"\nupdatedAt: "2026-01-01"\ntags: ["a"]\n---\n`;
  const out = bumpUpdatedAt(fm, "2026-09-14");
  assert.equal(out, `---\ntitle: "測試"\nupdatedAt: "2026-09-14"\ntags: ["a"]\n---\n`);
});

test("bumpUpdatedAt 找不到 updatedAt 欄位時原樣回傳", () => {
  const fm = `---\ntitle: "測試"\n---\n`;
  assert.equal(bumpUpdatedAt(fm, "2026-09-14"), fm);
});

test("utf8ToBase64 / base64ToUtf8 對中文內容互為反函式", () => {
  const original = "感知器學習演算法（PLA）的模型與收斂定理";
  const encoded = utf8ToBase64(original);
  assert.equal(base64ToUtf8(encoded), original);
});

test("base64ToUtf8 能處理 GitHub API 回傳、每 60 字元換行一次的 base64", () => {
  const original = "hello world";
  const withNewlines = utf8ToBase64(original).split("").join("") + "\n";
  assert.equal(base64ToUtf8(withNewlines), original);
});

test("extractRefs 收集 @ai-visualize / @ai-reference 的 id 與 generated import", () => {
  const body = `
{/* @ai-visualize
id: oauth-flow
type: diagram
status: generated
*/}
import OauthFlow from "@/components/generated/oauth-flow";
<OauthFlow client:visible />

{/* @ai-reference
id: bjt-bias-1
file: _references/foo.pdf
page: 12
status: suggested
*/}
`;
  const refs = extractRefs(body);
  assert.deepEqual(refs.markerIds.sort(), ["bjt-bias-1", "oauth-flow"]);
  assert.deepEqual(refs.importIds, ["oauth-flow"]);
});

test("diffRemovedRefs 只回報被刪掉的 id，不回報新增的", () => {
  const before = { markerIds: ["a", "b"], importIds: ["a"] };
  const after = { markerIds: ["a", "c"], importIds: [] };
  const removed = diffRemovedRefs(before, after);
  assert.deepEqual(removed.markerIds, ["b"]);
  assert.deepEqual(removed.importIds, ["a"]);
});
