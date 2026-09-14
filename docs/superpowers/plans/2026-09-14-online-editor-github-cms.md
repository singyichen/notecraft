# 線上編輯（Git-based CMS）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓已部署到 Netlify 的正式站筆記檢視頁,能直接編輯筆記 MDX 內文並發布——瀏覽器透過 GitHub Contents API 直接 commit 到 `main`,不新增任何 Netlify Function。

**Architecture:** 新增一個純前端的 `OnlineEditor` React island,搭配 `github-contents.ts`(GitHub REST API 呼叫 + 檔案內容處理)與 `online-edit-settings.ts`(瀏覽器端設定/token 儲存)兩個 lib。發布時用 GitHub 的 `sha` 樂觀鎖擋衝突,發布前掃描比對 `@ai-visualize`/`@ai-reference` 標記與 generated component import,防止手滑刪除視覺化內容。只在正式站(非 dev)顯示,與現有「以 VS Code 編輯」dev-only 按鈕互補。

**Tech Stack:** Astro 5 + React island(`client:idle`)、原生 `fetch`(瀏覽器)、`lucide-react` 圖示(已在白名單)、GitHub REST API `contents` endpoint、Node 內建 `node:test` 跑純邏輯單元測試(用 `--experimental-strip-types` 直接執行 `.ts`,零新增依賴)。

**Spec:** `docs/superpowers/specs/2026-09-14-online-editor-github-cms-design.md`

## Global Constraints

- 只編輯 MDX body(內文文字),frontmatter 一律不可被使用者編輯——發布時只允許系統自動更新 `updatedAt` 欄位
- 發布一律直接 commit 到設定的 `branch`(預設 `main`),不做 PR review 流程
- 認證用作者自行簽發的 fine-grained PAT,只存在瀏覽器 `localStorage`(key 前綴 `notecraft:onlineEdit:`),不得送往 NoteCraft 以外的任何伺服器
- 不得新增 Netlify Function 或任何執行時伺服器端點——全程純前端呼叫 `api.github.com`
- 新程式碼只能 import 既有元件白名單套件(`react`/`motion`/`recharts`/`d3`/`clsx`/`tailwind-merge`/`lucide-react`)或專案內相對路徑,不得引入新的 npm 依賴
- 樣式一律用 `notecraft-design` 的 CSS 變數(`var(--token)`),不得硬編色碼;inline style object 寫法比照 `src/components/islands/DeleteNoteButton.tsx` 既有慣例
- 所有新檔案強制 TypeScript,禁用 `any`
- 本專案沒有既有單元測試框架,不新增測試依賴;純邏輯函式改用 Node 內建 `node:test`,執行指令固定為 `node --experimental-strip-types --test <path>`(已在本機 Node v22.23.2 驗證可行,需要 Node ≥ 22.6)
- GitHub Contents API 的 CORS 支援已用 `curl` 驗證 GET 請求會回傳 `access-control-allow-origin: *`(見 spec §3);PUT(帶 `Authorization` header)的瀏覽器端 CORS 行為會在 Task 7 用真實瀏覽器 + 真實 PAT 做最終驗證

---

## Task 1: `github-contents.ts` — 純邏輯（frontmatter 切分 / base64 / 標記掃描)

**Files:**
- Create: `src/lib/github-contents.ts`
- Test: `src/lib/github-contents.test.ts`

**Interfaces:**
- Produces:
  - `todayISO(): string`
  - `splitFrontmatter(raw: string): { frontmatter: string; body: string }`
  - `bumpUpdatedAt(frontmatter: string, today?: string): string`
  - `utf8ToBase64(str: string): string`
  - `base64ToUtf8(b64: string): string`
  - `type RefsSnapshot = { markerIds: string[]; importIds: string[] }`
  - `extractRefs(body: string): RefsSnapshot`
  - `diffRemovedRefs(before: RefsSnapshot, after: RefsSnapshot): RefsSnapshot`

- [ ] **Step 1: 寫失敗的測試**

建立 `src/lib/github-contents.test.ts`：

```ts
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
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `node --experimental-strip-types --test src/lib/github-contents.test.ts`
Expected: 找不到 `./github-contents.ts`（模組尚未建立），測試整批失敗。

- [ ] **Step 3: 寫最小實作**

建立 `src/lib/github-contents.ts`：

```ts
export type RefsSnapshot = { markerIds: string[]; importIds: string[] };

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;
const UPDATED_AT_RE = /^updatedAt:\s*.*$/m;
const MARKER_BLOCK_RE = /\{\/\*\s*@ai-(?:visualize|reference)[\s\S]*?\*\/\}/g;
const MARKER_ID_RE = /^id:\s*(.+)$/m;
const IMPORT_RE = /from\s+["']@\/components\/generated\/([^"']+)["']/g;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: "", body: raw };
  return { frontmatter: m[1], body: m[2] };
}

export function bumpUpdatedAt(frontmatter: string, today: string = todayISO()): string {
  if (!UPDATED_AT_RE.test(frontmatter)) return frontmatter;
  return frontmatter.replace(UPDATED_AT_RE, `updatedAt: "${today}"`);
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function extractRefs(body: string): RefsSnapshot {
  const markerIds: string[] = [];
  for (const block of body.match(MARKER_BLOCK_RE) ?? []) {
    const idMatch = block.match(MARKER_ID_RE);
    if (idMatch) markerIds.push(idMatch[1].trim());
  }
  const importIds: string[] = [];
  for (const m of body.matchAll(IMPORT_RE)) {
    importIds.push(m[1]);
  }
  return { markerIds, importIds };
}

export function diffRemovedRefs(before: RefsSnapshot, after: RefsSnapshot): RefsSnapshot {
  return {
    markerIds: before.markerIds.filter((id) => !after.markerIds.includes(id)),
    importIds: before.importIds.filter((id) => !after.importIds.includes(id)),
  };
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `node --experimental-strip-types --test src/lib/github-contents.test.ts`
Expected: 全部 9 個 test 都 `ok`。

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 無新增錯誤。

- [ ] **Step 6: Commit**

```bash
git add src/lib/github-contents.ts src/lib/github-contents.test.ts
git commit -m "feat: 新增線上編輯用的 frontmatter 切分與標記掃描邏輯"
```

---

## Task 2: `github-contents.ts` — GitHub Contents API 呼叫

**Files:**
- Modify: `src/lib/github-contents.ts`（延續 Task 1）
- Modify: `src/lib/github-contents.test.ts`（延續 Task 1）

**Interfaces:**
- Consumes（來自 Task 1，同檔案內）: `utf8ToBase64`、`base64ToUtf8`
- Produces:
  - `type RepoConfig = { owner: string; repo: string; branch: string; pathPrefix: string; token: string }`
  - `type FetchedNote = { raw: string; sha: string; path: string }`
  - `class GithubNotFoundError extends Error`
  - `class GithubConflictError extends Error`
  - `class GithubApiError extends Error`（帶 `status: number`）
  - `fetchNoteFile(config: RepoConfig, slug: string): Promise<FetchedNote>`
  - `publishNoteFile(config: RepoConfig, path: string, newRaw: string, baseSha: string, commitMessage: string): Promise<{ sha: string }>`

- [ ] **Step 1: 寫失敗的測試**

在 `src/lib/github-contents.test.ts` 檔案最後追加：

```ts
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

test("publishNoteFile 收到 409 時丟 GithubConflictError", async () => {
  globalThis.fetch = (async () => jsonResponse(409, { message: "conflict" })) as typeof fetch;
  await assert.rejects(
    () => publishNoteFile(config, "p.mdx", "x", "sha", "msg"),
    GithubConflictError,
  );
});
```

（`base64ToUtf8` 已在檔案上方 import；`btoa`/`Response` 為 Node 全域內建，不需額外 import。）

- [ ] **Step 2: 執行測試，確認失敗**

Run: `node --experimental-strip-types --test src/lib/github-contents.test.ts`
Expected: 新增的 6 個 test 因 `fetchNoteFile`/`publishNoteFile` 等尚未定義而失敗，Task 1 的 9 個仍要維持通過。

- [ ] **Step 3: 寫最小實作**

在 `src/lib/github-contents.ts` 檔案最後追加：

```ts
export type RepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  pathPrefix: string;
  token: string;
};

export type FetchedNote = { raw: string; sha: string; path: string };

export class GithubNotFoundError extends Error {
  constructor(path: string) {
    super(`找不到檔案：${path}`);
    this.name = "GithubNotFoundError";
  }
}

export class GithubConflictError extends Error {
  constructor() {
    super("內容已在別處被更新，請重新整理拿最新版本再編輯");
    this.name = "GithubConflictError";
  }
}

export class GithubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GithubApiError";
    this.status = status;
  }
}

function notePath(config: RepoConfig, slug: string, ext: string): string {
  const prefix = config.pathPrefix.replace(/\/+$/, "");
  return [prefix, `${slug}${ext}`].filter(Boolean).join("/");
}

function apiUrl(config: RepoConfig, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`;
}

async function githubFetch(url: string, config: RepoConfig, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
}

export async function fetchNoteFile(config: RepoConfig, slug: string): Promise<FetchedNote> {
  for (const ext of [".mdx", ".md"]) {
    const path = notePath(config, slug, ext);
    const res = await githubFetch(`${apiUrl(config, path)}?ref=${encodeURIComponent(config.branch)}`, config);
    if (res.status === 404) continue;
    if (!res.ok) throw new GithubApiError(res.status, await res.text());
    const json = (await res.json()) as { content: string; sha: string };
    return { raw: base64ToUtf8(json.content), sha: json.sha, path };
  }
  throw new GithubNotFoundError(notePath(config, slug, ".mdx"));
}

export async function publishNoteFile(
  config: RepoConfig,
  path: string,
  newRaw: string,
  baseSha: string,
  commitMessage: string,
): Promise<{ sha: string }> {
  const res = await githubFetch(apiUrl(config, path), config, {
    method: "PUT",
    body: JSON.stringify({
      message: commitMessage,
      content: utf8ToBase64(newRaw),
      sha: baseSha,
      branch: config.branch,
    }),
  });
  if (res.status === 409) throw new GithubConflictError();
  if (!res.ok) throw new GithubApiError(res.status, await res.text());
  const json = (await res.json()) as { content: { sha: string } };
  return { sha: json.content.sha };
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `node --experimental-strip-types --test src/lib/github-contents.test.ts`
Expected: 全部 15 個 test 都 `ok`。

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 無新增錯誤。

- [ ] **Step 6: Commit**

```bash
git add src/lib/github-contents.ts src/lib/github-contents.test.ts
git commit -m "feat: 新增 GitHub Contents API 讀寫與衝突處理"
```

---

## Task 3: `online-edit-settings.ts` — 瀏覽器端設定儲存

**Files:**
- Create: `src/lib/online-edit-settings.ts`
- Test: `src/lib/online-edit-settings.test.ts`

**Interfaces:**
- Produces:
  - `type OnlineEditSettings = { owner: string; repo: string; branch: string; pathPrefix: string; token: string }`
  - `parseRepoInput(input: string): { owner: string; repo: string } | null`
  - `loadSettings(): OnlineEditSettings | null`
  - `saveSettings(settings: OnlineEditSettings): void`
  - `clearSettings(): void`

- [ ] **Step 1: 寫失敗的測試**

建立 `src/lib/online-edit-settings.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRepoInput,
  loadSettings,
  saveSettings,
  clearSettings,
  type OnlineEditSettings,
} from "./online-edit-settings.ts";

// 不寫 `implements Storage`：DOM 的 Storage 型別帶一個 `[name: string]: any` index
// signature，class 要滿足它得額外宣告一個 any 型別成員，不值得為了型別合規引入 any。
// 指派給 globalThis.localStorage 時用 `as Storage` 斷言即可，成員都對得上。
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as Storage;
});

test("parseRepoInput 解析 owner/repo 格式", () => {
  assert.deepEqual(parseRepoInput("singyichen/notecraft"), { owner: "singyichen", repo: "notecraft" });
});

test("parseRepoInput 對格式錯誤回傳 null", () => {
  assert.equal(parseRepoInput("not-a-repo"), null);
  assert.equal(parseRepoInput("too/many/slashes"), null);
  assert.equal(parseRepoInput(""), null);
});

test("loadSettings 在沒有存過設定時回傳 null", () => {
  assert.equal(loadSettings(), null);
});

test("saveSettings 之後 loadSettings 能拿回同樣的值", () => {
  const settings: OnlineEditSettings = {
    owner: "singyichen",
    repo: "notecraft",
    branch: "main",
    pathPrefix: "src/content/notes",
    token: "github_pat_xxx",
  };
  saveSettings(settings);
  assert.deepEqual(loadSettings(), settings);
});

test("loadSettings 在 branch / pathPrefix 沒存過時給預設值", () => {
  localStorage.setItem("notecraft:onlineEdit:owner", "singyichen");
  localStorage.setItem("notecraft:onlineEdit:repo", "notecraft");
  localStorage.setItem("notecraft:onlineEdit:token", "t");
  const settings = loadSettings();
  assert.equal(settings?.branch, "main");
  assert.equal(settings?.pathPrefix, "");
});

test("clearSettings 之後 loadSettings 回傳 null", () => {
  saveSettings({
    owner: "a",
    repo: "b",
    branch: "main",
    pathPrefix: "",
    token: "t",
  });
  clearSettings();
  assert.equal(loadSettings(), null);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `node --experimental-strip-types --test src/lib/online-edit-settings.test.ts`
Expected: 找不到 `./online-edit-settings.ts`，測試整批失敗。

- [ ] **Step 3: 寫最小實作**

建立 `src/lib/online-edit-settings.ts`：

```ts
const KEY_PREFIX = "notecraft:onlineEdit:";

export type OnlineEditSettings = {
  owner: string;
  repo: string;
  branch: string;
  pathPrefix: string;
  token: string;
};

export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const m = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export function loadSettings(): OnlineEditSettings | null {
  try {
    const owner = localStorage.getItem(`${KEY_PREFIX}owner`);
    const repo = localStorage.getItem(`${KEY_PREFIX}repo`);
    const token = localStorage.getItem(`${KEY_PREFIX}token`);
    if (!owner || !repo || !token) return null;
    const branch = localStorage.getItem(`${KEY_PREFIX}branch`) || "main";
    const pathPrefix = localStorage.getItem(`${KEY_PREFIX}pathPrefix`) || "";
    return { owner, repo, branch, pathPrefix, token };
  } catch {
    return null;
  }
}

export function saveSettings(settings: OnlineEditSettings): void {
  localStorage.setItem(`${KEY_PREFIX}owner`, settings.owner);
  localStorage.setItem(`${KEY_PREFIX}repo`, settings.repo);
  localStorage.setItem(`${KEY_PREFIX}branch`, settings.branch);
  localStorage.setItem(`${KEY_PREFIX}pathPrefix`, settings.pathPrefix);
  localStorage.setItem(`${KEY_PREFIX}token`, settings.token);
}

export function clearSettings(): void {
  for (const key of ["owner", "repo", "branch", "pathPrefix", "token"]) {
    localStorage.removeItem(`${KEY_PREFIX}${key}`);
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `node --experimental-strip-types --test src/lib/online-edit-settings.test.ts`
Expected: 全部 6 個 test 都 `ok`。

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 無新增錯誤。

- [ ] **Step 6: Commit**

```bash
git add src/lib/online-edit-settings.ts src/lib/online-edit-settings.test.ts
git commit -m "feat: 新增線上編輯設定的瀏覽器端儲存"
```

---

## Task 4: repo 自動偵測 + build 設定

**Files:**
- Create: `src/lib/detect-github-repo.mjs`
- Test: `src/lib/detect-github-repo.test.mjs`
- Modify: `astro.config.mjs`
- Modify: `src/env.d.ts`

**Interfaces:**
- Produces: `detectGithubRepoHint(getRemoteUrl?: () => string): string`
- Consumes（Task 5 起）: `import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT: string`

- [ ] **Step 1: 寫失敗的測試**

建立 `src/lib/detect-github-repo.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectGithubRepoHint } from "./detect-github-repo.mjs";

test("解析 https remote URL", () => {
  assert.equal(
    detectGithubRepoHint(() => "https://github.com/singyichen/notecraft.git"),
    "singyichen/notecraft",
  );
});

test("解析 ssh remote URL", () => {
  assert.equal(
    detectGithubRepoHint(() => "git@github.com:singyichen/notecraft.git"),
    "singyichen/notecraft",
  );
});

test("解析沒有 .git 結尾的 URL", () => {
  assert.equal(
    detectGithubRepoHint(() => "https://github.com/singyichen/notecraft"),
    "singyichen/notecraft",
  );
});

test("非 GitHub remote 回傳空字串", () => {
  assert.equal(detectGithubRepoHint(() => "https://gitlab.com/foo/bar.git"), "");
});

test("取得 remote URL 失敗（非 git repo）時回傳空字串", () => {
  assert.equal(
    detectGithubRepoHint(() => {
      throw new Error("not a git repository");
    }),
    "",
  );
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `node --test src/lib/detect-github-repo.test.mjs`
Expected: 找不到 `./detect-github-repo.mjs`，測試整批失敗。

- [ ] **Step 3: 寫最小實作**

建立 `src/lib/detect-github-repo.mjs`：

```js
import { execSync } from "node:child_process";

export function detectGithubRepoHint(getRemoteUrl = defaultGetRemoteUrl) {
  try {
    const url = getRemoteUrl();
    const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    return m ? `${m[1]}/${m[2]}` : "";
  } catch {
    return "";
  }
}

function defaultGetRemoteUrl() {
  return execSync("git remote get-url origin", {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `node --test src/lib/detect-github-repo.test.mjs`
Expected: 全部 5 個 test 都 `ok`。

- [ ] **Step 5: 接進 `astro.config.mjs`**

在檔案頂部 import 區塊加入：

```js
import { detectGithubRepoHint } from "./src/lib/detect-github-repo.mjs";
```

找到現有的 `vite: { ... }` 物件（含 `server`、`resolve`、`optimizeDeps` 等 key），在同一層加入 `define`：

```js
    vite: {
      define: {
        "import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT": JSON.stringify(detectGithubRepoHint()),
      },
      ...(process.env.NOTECRAFT_VERIFY_BUILD && { cacheDir: "node_modules/.vite-verify" }),
      server: {
        host: "127.0.0.1",
        ...(notesDir && { fs: { allow: [process.cwd(), notesDir, ...(userCwd ? [userCwd] : [])] } }),
      },
      resolve: {
        alias: { "@notes": notecraftDir },
        dedupe: notesDir ? [...GENERATED_COMPONENT_PACKAGE_WHITELIST] : [],
      },
      optimizeDeps: {
        include: ["react", "react-dom", "motion/react", "lucide-react", "clsx", "recharts", "d3"],
      },
    },
```

（只新增 `define` 這個 key，其餘既有 key 原樣保留。）

- [ ] **Step 6: 幫 `PUBLIC_NOTECRAFT_REPO_HINT` 補上型別**

修改 `src/env.d.ts`：

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_NOTECRAFT_REPO_HINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 7: Typecheck + 確認 build 設定不出錯**

Run: `npm run typecheck`
Expected: 無新增錯誤。

Run: `npm run build`
Expected: build 成功（這一步只是確認 `astro.config.mjs` 語法正確、`detectGithubRepoHint()` 在真實 repo 下不拋錯）。

- [ ] **Step 8: Commit**

```bash
git add src/lib/detect-github-repo.mjs src/lib/detect-github-repo.test.mjs astro.config.mjs src/env.d.ts
git commit -m "feat: build 時自動偵測 GitHub repo 供線上編輯設定預填"
```

---

## Task 5: `OnlineEditor` island — 設定閘門與觸發按鈕

**Files:**
- Create: `src/components/islands/OnlineEditor.tsx`
- Create: `src/components/islands/OnlineEditorSettingsForm.tsx`

**Interfaces:**
- Consumes: `loadSettings`、`saveSettings`、`clearSettings`、`parseRepoInput`、`type OnlineEditSettings`（`@/lib/online-edit-settings`，Task 3）；`import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT`（Task 4）
- Produces: `export default function OnlineEditor(props: { slug: string; noteTitle: string })`（給 Task 7 的 Astro 頁面掛載）

- [ ] **Step 1: 建立設定表單元件**

建立 `src/components/islands/OnlineEditorSettingsForm.tsx`：

```tsx
import { useState } from "react";
import { X, Github, ShieldCheck } from "lucide-react";
import { parseRepoInput, saveSettings, clearSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";

type Props = {
  initial: OnlineEditSettings | null;
  onClose: () => void;
  onSaved: (settings: OnlineEditSettings) => void;
};

export default function OnlineEditorSettingsForm({ initial, onClose, onSaved }: Props) {
  const repoHint = import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT || "";
  const [repoInput, setRepoInput] = useState(initial ? `${initial.owner}/${initial.repo}` : repoHint);
  const [branch, setBranch] = useState(initial?.branch ?? "main");
  const [pathPrefix, setPathPrefix] = useState(initial?.pathPrefix ?? "src/content/notes");
  const [token, setToken] = useState(initial?.token ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError("repo 格式要是「owner/repo」，例如 singyichen/notecraft");
      return;
    }
    if (!token.trim()) {
      setError("請貼上 GitHub fine-grained PAT");
      return;
    }
    const settings: OnlineEditSettings = {
      owner: parsed.owner,
      repo: parsed.repo,
      branch: branch.trim() || "main",
      pathPrefix: pathPrefix.trim(),
      token: token.trim(),
    };
    saveSettings(settings);
    onSaved(settings);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={modalHead}>
          <span style={headIcon}>
            <Github size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, color: "var(--text-strong)", margin: 0 }}>設定線上編輯</h2>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              直接呼叫 GitHub API，不經過任何伺服器
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={field}>
            <span style={fieldLabel}>GitHub repo</span>
            <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="owner/repo" style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>分支</span>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Repo 內筆記路徑前綴</span>
            <input value={pathPrefix} onChange={(e) => setPathPrefix(e.target.value)} style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Fine-grained PAT（僅需這個 repo 的 Contents 讀寫權限）</span>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_..." style={input} />
          </label>
          <div style={notice}>
            <ShieldCheck size={15} style={{ flex: "none", marginTop: 1 }} />
            此 token 只會存在這個瀏覽器裡，不會送到 NoteCraft 以外的任何伺服器；換裝置需要重新貼一次。
          </div>
          {error && <div style={errorBox}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            {initial ? (
              <button
                onClick={() => {
                  clearSettings();
                  onClose();
                  window.location.reload();
                }}
                style={dangerLink}
              >
                清除設定
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={ghostBtn}>
                取消
              </button>
              <button onClick={submit} style={primaryBtn}>
                儲存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 600,
  background: "rgba(30,27,75,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  borderRadius: "var(--radius-xl)",
  boxShadow: "var(--shadow-xl)",
  overflow: "hidden",
};
const modalHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "20px 24px",
  borderBottom: "1px solid var(--neutral-100)",
};
const headIcon: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 8,
  background: "var(--surface-brand-soft)",
  color: "var(--blue-600)",
};
const closeBtn: React.CSSProperties = {
  border: "none",
  background: "var(--neutral-100)",
  borderRadius: 999,
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-muted)",
};
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" };
const input: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  fontFamily: "var(--font-sans)",
  fontSize: 13.5,
  color: "var(--text-strong)",
};
const notice: React.CSSProperties = {
  display: "flex",
  gap: 8,
  fontSize: 12,
  color: "var(--neutral-500)",
  background: "var(--neutral-50)",
  border: "1px solid var(--neutral-100)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  lineHeight: 1.6,
};
const errorBox: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--danger-500)",
  background: "var(--danger-50)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
};
const dangerLink: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--danger-500)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
const ghostBtn: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  borderRadius: 999,
  border: "1.5px solid var(--neutral-200)",
  background: "#fff",
  color: "var(--text-body)",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  height: 38,
  padding: "0 18px",
  borderRadius: 999,
  border: "none",
  background: "var(--action-primary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
```

- [ ] **Step 2: 建立 `OnlineEditor` 主元件（尚未接編輯面板）**

建立 `src/components/islands/OnlineEditor.tsx`：

```tsx
import { useEffect, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import { loadSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";
import OnlineEditorSettingsForm from "./OnlineEditorSettingsForm";

type Props = { slug: string; noteTitle: string };

export default function OnlineEditor({ slug, noteTitle }: Props) {
  const [settings, setSettings] = useState<OnlineEditSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  return (
    <>
      {settings ? (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Pencil size={15} /> 線上編輯
        </button>
      ) : (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Settings size={15} /> 設定線上編輯
        </button>
      )}
      {showSettings && (
        <OnlineEditorSettingsForm
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}

const triggerBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 999,
  border: "none",
  background: "var(--action-secondary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
```

（`slug`/`noteTitle` 這步驟還沒用到，是刻意留給 Task 6 的編輯面板用；`noteTitle` 會觸發「宣告了但沒用到」的 lint/type 警告是預期的，Task 6 會消掉。）

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 除了 Step 2 提到的「`noteTitle` 未使用」之外無其他新增錯誤（這個特定警告在 Task 6 接上編輯面板後會消失，先不用理它）。

- [ ] **Step 4: Commit**

```bash
git add src/components/islands/OnlineEditor.tsx src/components/islands/OnlineEditorSettingsForm.tsx
git commit -m "feat: 新增線上編輯的設定表單與觸發按鈕"
```

---

## Task 6: `OnlineEditor` island — 編輯面板與發布流程

**Files:**
- Create: `src/components/islands/OnlineEditorPanel.tsx`
- Modify: `src/components/islands/OnlineEditor.tsx`

**Interfaces:**
- Consumes: `fetchNoteFile`、`publishNoteFile`、`splitFrontmatter`、`bumpUpdatedAt`、`extractRefs`、`diffRemovedRefs`、`todayISO`、`GithubConflictError`、`GithubNotFoundError`、`GithubApiError`（`@/lib/github-contents`，Task 1+2）；`type OnlineEditSettings`（`@/lib/online-edit-settings`，Task 3）
- Produces: `export default function OnlineEditorPanel(props: { slug: string; noteTitle: string; settings: OnlineEditSettings; onClose: () => void })`

- [ ] **Step 1: 建立編輯面板元件**

建立 `src/components/islands/OnlineEditorPanel.tsx`：

```tsx
import { useEffect, useState } from "react";
import { X, UploadCloud, AlertTriangle } from "lucide-react";
import {
  fetchNoteFile,
  publishNoteFile,
  splitFrontmatter,
  bumpUpdatedAt,
  extractRefs,
  diffRemovedRefs,
  todayISO,
  GithubConflictError,
  GithubNotFoundError,
  GithubApiError,
} from "@/lib/github-contents";
import type { OnlineEditSettings } from "@/lib/online-edit-settings";

type Props = {
  slug: string;
  noteTitle: string;
  settings: OnlineEditSettings;
  onClose: () => void;
};

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; path: string; sha: string; frontmatter: string; originalBody: string };

export default function OnlineEditorPanel({ slug, noteTitle, settings, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [bodyDraft, setBodyDraft] = useState("");
  const [commitMessage, setCommitMessage] = useState(`更新《${noteTitle}》內文`);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNoteFile(settings, slug)
      .then((file) => {
        if (cancelled) return;
        const { frontmatter, body } = splitFrontmatter(file.raw);
        setState({ phase: "ready", path: file.path, sha: file.sha, frontmatter, originalBody: body });
        setBodyDraft(body);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof GithubNotFoundError
            ? err.message
            : err instanceof GithubApiError
              ? `GitHub 回應錯誤（${err.status}）：${err.message}`
              : "讀取失敗，請確認設定的 repo / token 是否正確";
        setState({ phase: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [settings, slug]);

  const publish = async () => {
    if (state.phase !== "ready") return;
    const before = extractRefs(state.originalBody);
    const after = extractRefs(bodyDraft);
    const removed = diffRemovedRefs(before, after);
    const removedCount = removed.markerIds.length + removed.importIds.length;
    if (removedCount > 0) {
      const ok = window.confirm(
        `偵測到你可能刪除了 ${removedCount} 個視覺化標記或元件引用，繼續發布會讓這些內容從筆記消失，確定要繼續嗎？`,
      );
      if (!ok) return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const newFrontmatter = bumpUpdatedAt(state.frontmatter, todayISO());
      await publishNoteFile(settings, state.path, newFrontmatter + bodyDraft, state.sha, commitMessage);
      window.dispatchEvent(
        new CustomEvent("nc-toast", { detail: { msg: "已發布，Netlify 即將重新部署", icon: "check" } }),
      );
      onClose();
    } catch (err) {
      if (err instanceof GithubConflictError) {
        setPublishError(err.message);
      } else if (err instanceof GithubApiError) {
        setPublishError(`GitHub 回應錯誤（${err.status}）：${err.message}`);
      } else {
        setPublishError("發布失敗，請稍後再試");
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>線上編輯 · {slug}</span>
        <button onClick={onClose} style={closeBtn} disabled={publishing}>
          <X size={16} />
        </button>
      </div>

      {state.phase === "loading" && <div style={statusBox}>讀取中…</div>}
      {state.phase === "error" && (
        <div style={{ ...statusBox, color: "var(--danger-500)" }}>
          <AlertTriangle size={15} style={{ marginRight: 6 }} />
          {state.message}
        </div>
      )}
      {state.phase === "ready" && (
        <>
          <textarea value={bodyDraft} onChange={(e) => setBodyDraft(e.target.value)} spellCheck={false} style={textarea} />
          <div style={publishBar}>
            <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} style={commitInput} />
            <button onClick={publish} disabled={publishing} style={publishBtn(publishing)}>
              <UploadCloud size={15} /> {publishing ? "發布中…" : "發布"}
            </button>
          </div>
          {publishError && <div style={errorBanner}>{publishError}</div>}
        </>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-lg)",
  background: "#fff",
  boxShadow: "var(--shadow-card)",
  padding: 14,
  marginBottom: 18,
};
const head: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const closeBtn: React.CSSProperties = {
  border: "none",
  background: "var(--neutral-100)",
  borderRadius: 999,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-muted)",
};
const statusBox: React.CSSProperties = { fontSize: 13, color: "var(--text-muted)", padding: "20px 4px" };
const textarea: React.CSSProperties = {
  minHeight: 360,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  background: "var(--neutral-50)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  lineHeight: 1.75,
  color: "var(--neutral-700)",
  padding: "12px 14px",
  resize: "vertical",
};
const publishBar: React.CSSProperties = { display: "flex", gap: 10 };
const commitInput: React.CSSProperties = {
  flex: 1,
  height: 36,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  color: "var(--text-strong)",
};
function publishBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 16px",
    borderRadius: 999,
    border: "none",
    background: "var(--action-primary)",
    color: "#fff",
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: 12.5,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}
const errorBanner: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--danger-500)",
  background: "var(--danger-50)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
};
```

- [ ] **Step 2: 把編輯面板接進 `OnlineEditor.tsx`**

修改 `src/components/islands/OnlineEditor.tsx`：把

```tsx
import { useEffect, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import { loadSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";
import OnlineEditorSettingsForm from "./OnlineEditorSettingsForm";

type Props = { slug: string; noteTitle: string };

export default function OnlineEditor({ slug, noteTitle }: Props) {
  const [settings, setSettings] = useState<OnlineEditSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  return (
    <>
      {settings ? (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Pencil size={15} /> 線上編輯
        </button>
      ) : (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Settings size={15} /> 設定線上編輯
        </button>
      )}
      {showSettings && (
        <OnlineEditorSettingsForm
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}
```

改成：

```tsx
import { useEffect, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import { loadSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";
import OnlineEditorSettingsForm from "./OnlineEditorSettingsForm";
import OnlineEditorPanel from "./OnlineEditorPanel";

type Props = { slug: string; noteTitle: string };

export default function OnlineEditor({ slug, noteTitle }: Props) {
  const [settings, setSettings] = useState<OnlineEditSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const el = document.getElementById("nc-note-content");
    if (el) el.style.display = editing ? "none" : "";
  }, [editing]);

  return (
    <>
      {settings ? (
        <button onClick={() => setEditing(true)} style={triggerBtn}>
          <Pencil size={15} /> 線上編輯
        </button>
      ) : (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Settings size={15} /> 設定線上編輯
        </button>
      )}
      {showSettings && (
        <OnlineEditorSettingsForm
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
      {editing && settings && (
        <OnlineEditorPanel slug={slug} noteTitle={noteTitle} settings={settings} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
```

（`triggerBtn` 樣式常數維持在檔案底部不動。）

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 無錯誤（Task 5 留下的「`noteTitle` 未使用」警告在這步消失，因為現在有傳給 `OnlineEditorPanel` 了）。

- [ ] **Step 4: Commit**

```bash
git add src/components/islands/OnlineEditorPanel.tsx src/components/islands/OnlineEditor.tsx
git commit -m "feat: 線上編輯加入編輯面板、安全檢查與發布流程"
```

---

## Task 7: 掛進筆記檢視頁 + 端對端驗證

**Files:**
- Modify: `src/pages/notes/[...slug].astro`

**Interfaces:**
- Consumes: `export default function OnlineEditor`（`@/components/islands/OnlineEditor.tsx`，Task 5+6）

- [ ] **Step 1: 加上 import**

在 `src/pages/notes/[...slug].astro` 現有的 import 區塊（第 4-11 行附近）加入：

```astro
import OnlineEditor from "@/components/islands/OnlineEditor.tsx";
```

- [ ] **Step 2: 給 Content 容器加上 id**

把（第 145 行附近）：

```astro
      <div class="nc-prose" data-pagefind-body>
        <Content />
      </div>
```

改成：

```astro
      <div id="nc-note-content" class="nc-prose" data-pagefind-body>
        <Content />
      </div>
```

- [ ] **Step 3: 在動作按鈕列加上線上編輯按鈕**

在現有「以 VS Code 編輯」的 `{isDev && (...)}` 區塊（第 113-120 行附近）後面加入：

```astro
          {!isDev && (
            <OnlineEditor client:idle slug={note.id} noteTitle={note.data.title} />
          )}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 無錯誤。

- [ ] **Step 5: 確認 dev 模式不顯示、build 後會顯示**

Run: `npm run dev`，開一篇筆記頁面（例如 `/notes/機器學習實作系列第2週-python基礎`）。
Expected: 看得到「以 VS Code 編輯」，**看不到**「線上編輯」/「設定線上編輯」按鈕。

Run: `npm run build`
Expected: build 成功。

Run: `grep -o "線上編輯\|設定線上編輯" dist/notes/*.html | sort -u`
Expected: 有輸出（正式 build 裡看得到按鈕文字），且 `grep -o "以 VS Code 編輯" dist/notes/*.html` 沒有任何輸出（dev-only 按鈕在正式 build 裡不見）。

- [ ] **Step 6: 端對端手動驗證（需要作者操作，用真實 PAT）**

這一步是整個功能唯一沒辦法自動化驗證的部分，也是 spec 裡「GitHub API CORS 是否真的支援瀏覽器直接呼叫」這個關鍵假設最終落地驗證的地方（`curl` 只驗證過 GET 的 CORS header，PUT + `Authorization` header 的瀏覽器行為要在這裡才會真正跑到）：

1. 在 GitHub 開一個 fine-grained PAT：只勾這個 repo，Permissions 只給 **Contents: Read and write**。
2. `npm run build && npm run preview`，在真實瀏覽器（不是 curl／不是 Node）打開 preview 網址下任一篇筆記。
3. 點「設定線上編輯」，確認 repo 欄位已經自動預填（Task 4 的 build-time 偵測），貼上 PAT，儲存。
4. 點「線上編輯」，確認能讀到目前筆記內文（loading 結束後看得到 textarea 裡的文字）。
5. 在內文任意處加一行測試文字，按「發布」。
6. Expected：幾秒內看到「已發布，Netlify 即將重新部署」的 toast，編輯面板自動關閉；打開 GitHub repo 該檔案的 commit 紀錄，確認多了一筆對應的 commit,內容包含剛剛加的那行文字,且 `updatedAt` 已經被改成今天日期。
7. 把剛剛加的測試文字刪掉，重複一次發布流程清乾淨（避免留下測試用的內文變更）。

如果 Step 6 的第 5-6 點失敗且錯誤與 CORS/preflight 有關（瀏覽器 console 出現 `blocked by CORS policy`），代表 spec §3 的核心假設不成立,需要回頭跟作者討論 spec 裡被否決的「Netlify Function 中介」方案,而不是在這裡硬修。

- [ ] **Step 7: Commit**

```bash
git add src/pages/notes/[...slug].astro
git commit -m "feat: 筆記檢視頁掛上線上編輯按鈕與編輯面板"
```

---

## 完成後的狀態

- 正式站（`npm run build` 產出的靜態站）筆記頁會有「線上編輯」入口,本機 `astro dev` 不會（跟「以 VS Code 編輯」互補）
- 全程沒有新增任何 Netlify Function、沒有新增任何 npm 依賴
- `src/lib/github-contents.ts`、`src/lib/online-edit-settings.ts`、`src/lib/detect-github-repo.mjs` 三個純邏輯檔案共 20 個 `node --test` 測試,可用以下指令一次全跑：

```bash
node --experimental-strip-types --test src/lib/github-contents.test.ts src/lib/online-edit-settings.test.ts src/lib/detect-github-repo.test.mjs
```
