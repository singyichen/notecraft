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
