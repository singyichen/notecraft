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
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function fetchNoteFile(config: RepoConfig, slug: string, filePath?: string): Promise<FetchedNote> {
  if (filePath) {
    const res = await githubFetch(`${apiUrl(config, filePath)}?ref=${encodeURIComponent(config.branch)}`, config);
    if (res.status === 404) throw new GithubNotFoundError(filePath);
    if (!res.ok) throw new GithubApiError(res.status, await res.text());
    const json = (await res.json()) as { content: string; sha: string };
    return { raw: base64ToUtf8(json.content), sha: json.sha, path: filePath };
  }
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
