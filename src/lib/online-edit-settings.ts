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
