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
