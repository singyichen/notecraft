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

import {
  fetchNoteFile,
  publishNoteFile,
  GithubNotFoundError,
  GithubConflictError,
  GithubApiError,
  type RepoConfig,
} from "./github-contents.ts";

const config: RepoConfig = {
  owner: "singyichen",
  repo: "notecraft",
  branch: "main",
  pathPrefix: "src/content/notes",
  token: "fake-token",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

test("fetchNoteFile 先試 .mdx，成功就回傳 raw/sha/path", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return jsonResponse(200, { content: btoa("---\ntitle: t\n---\nbody"), sha: "abc123" });
  }) as typeof fetch;

  const result = await fetchNoteFile(config, "week2");
  assert.equal(result.sha, "abc123");
  assert.equal(result.path, "src/content/notes/week2.mdx");
  assert.match(calls[0], /contents\/src\/content\/notes\/week2\.mdx\?ref=main$/);
});

test("fetchNoteFile 在 .mdx 404 時改試 .md", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    if (url.endsWith(".mdx?ref=main")) return jsonResponse(404, { message: "Not Found" });
    return jsonResponse(200, { content: btoa("---\ntitle: t\n---\nbody"), sha: "def456" });
  }) as typeof fetch;

  const result = await fetchNoteFile(config, "week2");
  assert.equal(result.path, "src/content/notes/week2.md");
  assert.equal(calls.length, 2);
});

test("fetchNoteFile 兩個副檔名都 404 時丟 GithubNotFoundError", async () => {
  globalThis.fetch = (async () => jsonResponse(404, { message: "Not Found" })) as typeof fetch;
  await assert.rejects(() => fetchNoteFile(config, "missing"), GithubNotFoundError);
});

test("fetchNoteFile 非 404 的錯誤丟 GithubApiError", async () => {
  globalThis.fetch = (async () => jsonResponse(500, { message: "boom" })) as typeof fetch;
  await assert.rejects(() => fetchNoteFile(config, "week2"), (err: unknown) => {
    assert.ok(err instanceof GithubApiError);
    assert.equal((err as GithubApiError).status, 500);
    return true;
  });
});

test("publishNoteFile 送出 PUT，body 帶 base64 內容、sha、branch", async () => {
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedInit = init;
    return jsonResponse(200, { content: { sha: "new-sha" } });
  }) as typeof fetch;

  const result = await publishNoteFile(config, "src/content/notes/week2.mdx", "新內容", "old-sha", "更新內文");
  assert.equal(result.sha, "new-sha");
  assert.equal(capturedInit?.method, "PUT");
  const payload = JSON.parse(capturedInit!.body as string);
  assert.equal(payload.sha, "old-sha");
  assert.equal(payload.branch, "main");
  assert.equal(payload.message, "更新內文");
  assert.equal(base64ToUtf8(payload.content), "新內容");
});

test("githubFetch 送出的 headers 包含 Authorization 與 Content-Type", async () => {
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedInit = init;
    return jsonResponse(200, { content: { sha: "new-sha" } });
  }) as typeof fetch;

  await publishNoteFile(config, "src/content/notes/week2.mdx", "內容", "sha", "msg");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer fake-token");
  assert.equal(headers["Content-Type"], "application/json");
});

test("fetchNoteFile 帶 filePath 時直接用該路徑、不做 .mdx/.md 猜測", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return jsonResponse(200, { content: btoa("---\ntitle: t\n---\nbody"), sha: "real-sha" });
  }) as typeof fetch;

  const result = await fetchNoteFile(config, "week2", "src/content/notes/機器學習實作系列第2週-Python基礎.mdx");
  assert.equal(result.path, "src/content/notes/機器學習實作系列第2週-Python基礎.mdx");
  assert.equal(result.sha, "real-sha");
  assert.equal(calls.length, 1);
});

test("fetchNoteFile 帶 filePath 但 404 時丟 GithubNotFoundError，訊息帶正確路徑", async () => {
  globalThis.fetch = (async () => jsonResponse(404, { message: "Not Found" })) as typeof fetch;
  await assert.rejects(
    () => fetchNoteFile(config, "week2", "src/content/notes/真實檔名.mdx"),
    (err: unknown) => {
      assert.ok(err instanceof GithubNotFoundError);
      assert.match((err as Error).message, /真實檔名\.mdx/);
      return true;
    },
  );
});

test("publishNoteFile 收到 409 時丟 GithubConflictError", async () => {
  globalThis.fetch = (async () => jsonResponse(409, { message: "conflict" })) as typeof fetch;
  await assert.rejects(
    () => publishNoteFile(config, "p.mdx", "x", "sha", "msg"),
    GithubConflictError,
  );
});
