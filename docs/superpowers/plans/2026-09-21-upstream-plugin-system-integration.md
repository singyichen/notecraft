# Upstream Plugin System Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate upstream NoteCraft Plugin System v0.6.0 and ER Diagram Renderer v1.1.0 without enabling demo content or regressing the local PDF, math, references, and online-editor features.

**Architecture:** Preserve upstream ancestry by merging commit `9e2f11ab225a8d68c077f6271cfd59e98f417ca7` in an isolated worktree, then resolve the five known conflicts as unions of local and upstream behavior. Lock the integration down with black-box fixture builds, CLI safety tests, and merge-regression tests before removing the upstream demo configuration and data.

**Tech Stack:** Astro 5, React 18, TypeScript, Node.js 22 test runner, AJV 2020, picomatch, npm, Git worktrees.

**Spec:** `docs/superpowers/specs/2026-09-21-upstream-plugin-system-integration-design.md`

## Global Constraints

- Preserve local PDF viewer, `/references`, KaTeX, online editor, notes-assets copy, design tokens, course content, and Skills.
- Keep `engines.node` at `>=22.13.0`.
- Add `ajv`, `picomatch`, and `@types/picomatch` without removing existing dependencies.
- Do not keep `.notecraft/plugins.json` or `src/content/notes/schema-demo.er.json` in the final tree.
- Do not install or execute third-party plugins during this integration.
- Do not stage or copy the user's uncommitted course notes, generated components, PDFs, or other workspace changes.
- Do not push or open a pull request.

## Review Focus

- Missing `.notecraft/plugins.json` must mean an empty, buildable Plugin System rather than an error or implicit activation; Task 1's no-config fixture test owns this.
- Invalid or overlapping mappings must produce actionable build output while preserving first-rule-wins semantics; Task 1's overlap fixture test owns this.
- A note ref `collision` and data ref `view:collision` must remain distinct links and progress keys; Task 1's mixed-series fixture test owns this.
- Installer inputs containing path traversal, forbidden files, non-whitelisted imports, or `dangerouslySetInnerHTML` must be rejected; Task 1's installer safety test owns this.
- `references`/`PdfViewerDrawer` and `data`/`bleed` must coexist in the merged layout and navigation; Task 1's merge-regression test owns this.

---

### Task 1: Isolate the work and establish executable acceptance tests

**Files:**
- Modify: `.gitignore`
- Create: `tests/install-plugin.test.mjs`
- Create: `tests/plugin-system.integration.test.mjs`
- Create: `tests/upstream-merge-regression.test.mjs`

**Interfaces:**
- Consumes: current local `main` containing approved spec commit `ad830e8` or its descendant.
- Produces: isolated branch `integrate-upstream-plugin-system`; executable tests that fail because Plugin System is not present while existing baseline checks remain green.

- [ ] **Step 1: Verify the source workspace and protect user changes**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git diff --name-only
git ls-files --others --exclude-standard
```

Expected: record all user-owned modified and untracked paths; none may appear in any later `git add` command.

- [ ] **Step 2: Ignore the project-local worktree directory**

Append this single entry to `.gitignore` if it is not already covered:

```gitignore
.worktrees/
```

Run:

```bash
git check-ignore -v .worktrees
git diff --check -- .gitignore
git add .gitignore
git commit -m "chore: ignore local worktrees"
```

Expected: `.worktrees` is ignored and the commit contains only `.gitignore`.

- [ ] **Step 3: Create the isolated worktree and install the exact baseline dependencies**

Run:

```bash
git worktree add .worktrees/integrate-upstream-plugin-system -b integrate-upstream-plugin-system
cd .worktrees/integrate-upstream-plugin-system
npm ci
```

Expected: the new worktree is clean and `npm ci` exits 0.

- [ ] **Step 4: Run the clean baseline**

Run:

```bash
node --test src/lib/detect-github-repo.test.mjs src/lib/github-contents.test.ts src/lib/online-edit-settings.test.ts
npm run typecheck
npm run build
```

Expected: all three commands exit 0 before upstream code is merged. If one fails, stop and report the exact baseline failure before continuing.

- [ ] **Step 5: Write the failing installer contract and safety tests**

Create `tests/install-plugin.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

test("parseSource resolves official ids and pinned GitHub subdirectories", async () => {
  const { parseSource } = await import("../bin/install-plugin.mjs");
  assert.deepEqual(parseSource("er-diagram-renderer"), {
    kind: "github",
    owner: "SteveLin100132",
    repo: "notecraft",
    ref: null,
    dir: "plugins/er-diagram-renderer",
    officialId: "er-diagram-renderer",
  });
  assert.deepEqual(parseSource("owner/repo/plugins/foo#v1.2.0"), {
    kind: "github",
    owner: "owner",
    repo: "repo",
    ref: "v1.2.0",
    dir: "plugins/foo",
  });
});

test("inspectFiles rejects traversal, executable files, unsafe HTML, and imports outside the whitelist", async () => {
  const { inspectFiles } = await import("../bin/install-plugin.mjs");
  const files = new Map([
    ["notecraft-plugin.json", Buffer.from(JSON.stringify({ id: "unsafe", title: "Unsafe", description: "x", version: "1.0.0" }))],
    ["renderer.tsx", Buffer.from('import nope from "left-pad"; export default () => <div dangerouslySetInnerHTML={{__html: "x"}} />;')],
    ["../escape.ts", Buffer.from("export default 1")],
    ["run.mjs", Buffer.from("process.exit(0)")],
  ]);
  const { problems } = inspectFiles(files, ["react"], "0.6.0");
  assert.ok(problems.some((p) => p.includes("路徑不安全")));
  assert.ok(problems.some((p) => p.includes("不收這種檔案")));
  assert.ok(problems.some((p) => p.includes("白名單外")));
  assert.ok(problems.some((p) => p.includes("dangerouslySetInnerHTML")));
});
```

- [ ] **Step 6: Write the failing merge-regression test**

Create `tests/upstream-merge-regression.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("merged package metadata preserves local dependencies and adds plugin dependencies", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const name of ["katex", "pdfjs-dist", "rehype-katex", "remark-math", "lz-string"]) {
    assert.ok(pkg.dependencies?.[name] || pkg.devDependencies?.[name], `missing local dependency ${name}`);
  }
  for (const name of ["ajv", "picomatch"]) assert.ok(pkg.dependencies[name], `missing plugin dependency ${name}`);
  assert.ok(pkg.devDependencies["@types/picomatch"]);
  assert.equal(pkg.engines.node, ">=22.13.0");
  assert.ok(pkg.files.includes("plugins/"));
  assert.ok(pkg.files.includes("scripts/pdf-extract-text.mjs"));
  assert.equal(pkg.scripts.prepublishOnly, "npm run sync-skill && npm run check-plugins");
});

test("navigation and layout preserve references while adding data and bleed", () => {
  const sidebar = read("src/components/Sidebar.astro");
  const layout = read("src/layouts/BaseLayout.astro");
  const icons = read("src/components/Icon.astro");
  for (const id of ["references", "data"]) assert.match(sidebar, new RegExp(`\\b${id}\\b`));
  assert.match(layout, /PdfViewerDrawer/);
  assert.match(layout, /bleed\?: boolean/);
  for (const icon of ["file", "database", "fileJson", "plug", "alert"]) {
    assert.match(icons, new RegExp(`"${icon}"`));
  }
});

test("the repository does not enable or publish upstream demo content", () => {
  assert.equal(existsSync(new URL("../.notecraft/plugins.json", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/content/notes/schema-demo.er.json", import.meta.url)), false);
});
```

- [ ] **Step 7: Write the failing black-box fixture-build tests**

Create `tests/plugin-system.integration.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixture({ enabled, overlap = false, mixedSeries = false }) {
  const dir = mkdtempSync(path.join(tmpdir(), "notecraft-plugin-test-"));
  const docs = path.join(dir, "docs");
  mkdirSync(docs, { recursive: true });
  writeFileSync(path.join(docs, "readme.md"), "---\ntitle: Readme\n---\n# Readme\n");
  if (enabled) {
    mkdirSync(path.join(dir, ".notecraft"), { recursive: true });
    copyFileSync(path.join(root, "plugins/er-diagram-renderer/example/schema.json"), path.join(docs, "collision.json"));
    const plugins = overlap
      ? [
          { plugin: "er-diagram-renderer", files: ["*.json"] },
          { plugin: "er-diagram-renderer", files: ["collision.json"] },
        ]
      : [{ plugin: "er-diagram-renderer", files: ["collision.json"] }];
    writeFileSync(path.join(dir, ".notecraft/plugins.json"), JSON.stringify({ plugins }));
    if (mixedSeries) {
      writeFileSync(path.join(dir, ".notecraft/series.json"), JSON.stringify({
        series: [{
          id: "mixed",
          title: "Mixed",
          eyebrow: "MIXED",
          description: "note and data",
          accent: "blue",
          icon: "layers",
          slugs: ["readme", "view:collision"],
        }],
      }));
    }
  }
  return dir;
}

function build(dir) {
  const outDir = path.join(dir, "dist");
  const result = spawnSync("npm", ["exec", "astro", "build", "--", "--outDir", outDir], {
    cwd: root,
    env: { ...process.env, NOTECRAFT_NOTES_DIR: path.join(dir, "docs"), NOTECRAFT_USER_CWD: dir },
    encoding: "utf8",
  });
  return { ...result, outDir, output: `${result.stdout}\n${result.stderr}` };
}

test("no plugin config builds the empty data index without creating data detail pages", () => {
  const dir = fixture({ enabled: false });
  try {
    const result = build(dir);
    assert.equal(result.status, 0, result.output);
    assert.ok(existsSync(path.join(result.outDir, "view/index.html")));
    assert.equal(existsSync(path.join(result.outDir, "view/collision/index.html")), false);
    assert.ok(existsSync(path.join(result.outDir, "references/index.html")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("configured ER data builds a detail route and keeps note/data series refs distinct", () => {
  const dir = fixture({ enabled: true, mixedSeries: true });
  try {
    const result = build(dir);
    assert.equal(result.status, 0, result.output);
    const detail = path.join(result.outDir, "view/collision/index.html");
    assert.ok(existsSync(detail));
    assert.match(readFileSync(detail, "utf8"), /範例：客戶與合約 schema/);
    const series = readFileSync(path.join(result.outDir, "series/mixed/index.html"), "utf8");
    assert.match(series, /\/notes\/readme/);
    assert.match(series, /\/view\/collision/);
    assert.match(series, /view:collision/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("overlapping mappings warn and the first matching rule still builds the page", () => {
  const dir = fixture({ enabled: true, overlap: true });
  try {
    const result = build(dir);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /同時被 2 條規則命中/);
    assert.ok(existsSync(path.join(result.outDir, "view/collision/index.html")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 8: Run the new tests and verify the expected RED state**

Run:

```bash
node --test tests/install-plugin.test.mjs tests/upstream-merge-regression.test.mjs tests/plugin-system.integration.test.mjs
```

Expected: FAIL because `bin/install-plugin.mjs`, plugin package files, `/view`, `data`, `bleed`, `ajv`, and `picomatch` are not present. The demo-absence assertion is an existing-behavior characterization and may already pass.

- [ ] **Step 9: Commit only the test harness**

Run:

```bash
git add tests/install-plugin.test.mjs tests/plugin-system.integration.test.mjs tests/upstream-merge-regression.test.mjs
git commit -m "test: define plugin system integration contract"
```

Expected: the branch contains one red-test commit and no user content.

---

### Task 2: Merge the upstream subsystem and resolve the five known conflicts

**Files:**
- Add/Modify: all paths introduced or changed by upstream `9e2f11a`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/components/Icon.astro`
- Modify: `src/components/Sidebar.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Inspect: `CLAUDE.md`
- Inspect: `src/pages/notes/[...slug].astro`

**Interfaces:**
- Consumes: failing acceptance tests from Task 1 and upstream commit `9e2f11ab225a8d68c077f6271cfd59e98f417ca7`.
- Produces: a merge commit containing Plugin System v0.6.0, ER Diagram Renderer v1.1.0, and conflict resolutions preserving both local and upstream APIs.

- [ ] **Step 1: Fetch and verify the exact upstream target**

Run:

```bash
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/SteveLin100132/notecraft.git
git fetch upstream main
git rev-parse upstream/main
```

Expected: `9e2f11ab225a8d68c077f6271cfd59e98f417ca7`. If upstream moved, merge the pinned SHA from the spec, not a newer unreviewed commit.

- [ ] **Step 2: Start the ancestry-preserving merge**

Run:

```bash
git merge --no-commit --no-ff 9e2f11ab225a8d68c077f6271cfd59e98f417ca7
git diff --name-only --diff-filter=U
```

Expected conflicts only in:

```text
package-lock.json
package.json
src/components/Icon.astro
src/components/Sidebar.astro
src/layouts/BaseLayout.astro
```

- [ ] **Step 3: Resolve `package.json` as a union**

The resolved metadata must include:

```json
{
  "version": "0.6.0",
  "files": ["bin/", "plugins/", "scripts/pdf-extract-text.mjs"],
  "scripts": {
    "check-plugins": "node scripts/check-plugins.mjs",
    "prepublishOnly": "npm run sync-skill && npm run check-plugins"
  },
  "dependencies": {
    "ajv": "^8.20.0",
    "katex": "^0.18.7",
    "pdfjs-dist": "^6.3.289",
    "picomatch": "^4.0.7",
    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@types/node": "^22.20.2",
    "@types/picomatch": "^4.0.3",
    "lz-string": "^1.5.0"
  },
  "engines": { "node": ">=22.13.0" }
}
```

Keep every unrelated existing field and dependency; the fragment above lists mandatory merged values, not a replacement package file.

- [ ] **Step 4: Regenerate rather than hand-merge the lockfile**

Run:

```bash
rm -f package-lock.json
npm install --package-lock-only --ignore-scripts
git add package.json package-lock.json
```

Expected: lockfile root dependencies match the resolved `package.json`; no conflict markers remain.

- [ ] **Step 5: Resolve icons and navigation as unions**

In `src/components/Icon.astro`, keep `file` and add these exact upstream names to both the `Name` union and `paths` map:

```ts
"database" | "fileJson" | "plug" | "alert"
```

In `src/components/Sidebar.astro`, the route union and nav list must contain both entries:

```ts
current: "dashboard" | "notes" | "series" | "tags" | "about" | "references" | "data";
```

```ts
{ id: "references", zh: "講義", en: "References", ic: "file", href: "/references" },
{ id: "data", zh: "資料", en: "Data", ic: "database", href: "/view" },
```

Keep the local token-based light sidebar styling.

- [ ] **Step 6: Resolve the base layout as a union**

The merged props and structure must retain these elements together:

```ts
current: "dashboard" | "notes" | "series" | "tags" | "about" | "references" | "data";
bleed?: boolean;
```

```astro
import "katex/dist/katex.min.css";
import PdfViewerDrawer from "@/components/islands/PdfViewerDrawer.tsx";
```

```astro
{bleed ? <slot /> : <div class="nc-page-wrap" style="max-width:1120px;margin:0 auto;"><slot /></div>}
<ToastHost client:idle />
<PdfViewerDrawer client:only="react" />
```

- [ ] **Step 7: Inspect clean merges for semantic loss**

Run:

```bash
git diff --check
rg -n 'Plugin System|PDF 檢視|@ai-reference|notecraft-design' CLAUDE.md
rg -n 'OnlineEditor|getDataFiles|seriesOf' 'src/pages/notes/[...slug].astro'
rg -n 'view:|DATA_REF_PREFIX|getSeriesChapters' src/lib/series.ts src/components/islands/SeriesNav.tsx src/components/islands/SeriesDetail.tsx
git diff --name-only --diff-filter=U
```

Expected: both local and upstream concepts are present and the final command prints nothing.

- [ ] **Step 8: Stage the resolved merge without staging Task 1 tests again**

Run:

```bash
git add CLAUDE.md README.md CHANGELOG.md package.json package-lock.json bin plugins scripts src docs .notecraft
git status --short
```

Expected: all upstream paths and five resolutions are staged; no path from the original dirty source workspace exists in this worktree.

- [ ] **Step 9: Create the merge commit**

Run:

```bash
git commit -m "merge: integrate upstream plugin system v0.6.0"
```

Expected: a two-parent merge commit is created. The upstream demo is temporarily present and will be removed in Task 3 before the branch is considered usable.

---

### Task 3: Remove implicit demo activation and make the acceptance suite green

**Files:**
- Delete: `.notecraft/plugins.json`
- Delete: `src/content/notes/schema-demo.er.json`
- Modify if needed: `package.json`
- Modify if needed: `package-lock.json`
- Modify if needed: files identified by failing tests, limited to integration defects

**Interfaces:**
- Consumes: merged `getDataFiles()`, `/view` routes, `install-plugin` CLI, `dataRef()`, and official `er-diagram-renderer`.
- Produces: opt-in Plugin System with no demo content and a passing acceptance suite.

- [ ] **Step 1: Remove the two implicit-demo files**

Run:

```bash
git rm .notecraft/plugins.json src/content/notes/schema-demo.er.json
```

Expected: official plugin source remains under `plugins/er-diagram-renderer/`, but the repository has no active mapping and no demo note data.

- [ ] **Step 2: Run the installer tests**

Run:

```bash
node --test tests/install-plugin.test.mjs
```

Expected: PASS for source parsing and all four safety rejection classes.

- [ ] **Step 3: Run the merge-regression tests**

Run:

```bash
node --test tests/upstream-merge-regression.test.mjs
```

Expected: PASS; dependency union, icon union, dual navigation, PDF Drawer, bleed, and demo absence are all proven.

- [ ] **Step 4: Run the black-box fixture builds**

Run:

```bash
node --test tests/plugin-system.integration.test.mjs
```

Expected: three PASS results: no-config build, mixed note/data series build, and overlapping-rule warning with a valid page.

- [ ] **Step 5: Fix only integration defects exposed by the tests**

For each failure:

1. Preserve the failing assertion.
2. Identify whether the defect is in conflict resolution, upstream/local API drift, or the test fixture.
3. Change the smallest production surface that restores the documented contract.
4. Re-run only the failing test, then the entire three-file suite.

Run after each fix:

```bash
node --test tests/install-plugin.test.mjs tests/upstream-merge-regression.test.mjs tests/plugin-system.integration.test.mjs
```

Expected: all tests pass without warnings other than the explicitly asserted overlapping-rule warning.

- [ ] **Step 6: Commit the opt-in boundary and compatibility fixes**

Run:

```bash
git add -u .notecraft src/content/notes
git add package.json package-lock.json bin plugins scripts src tests
git diff --cached --check
git commit -m "feat: adapt plugin system to local NoteCraft features"
```

Expected: commit contains demo removal, tests, and only test-driven compatibility changes.

---

### Task 4: Verify official plugin packaging and existing application behavior

**Files:**
- Modify only if a verification failure proves an integration defect.

**Interfaces:**
- Consumes: final source tree from Task 3.
- Produces: verified package contents, official plugin validation, and unchanged local capabilities.

- [ ] **Step 1: Run every repository test together**

Run:

```bash
node --test src/lib/detect-github-repo.test.mjs src/lib/github-contents.test.ts src/lib/online-edit-settings.test.ts tests/install-plugin.test.mjs tests/upstream-merge-regression.test.mjs tests/plugin-system.integration.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run type checking and the normal production build**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit 0; the default build contains `/view/index.html` but no `schema-demo` data detail page.

- [ ] **Step 3: Validate the official plugin store including a fixture build**

Run:

```bash
npm run check-plugins
```

Expected: `plugin store 檢查通過（1 個 plugin）` and `er-diagram-renderer 配 example 資料 build 成功`.

- [ ] **Step 4: Inspect the publish tarball without publishing**

Run:

```bash
npm pack --dry-run --json
```

Expected tarball includes:

```text
bin/install-plugin.mjs
plugins/er-diagram-renderer/renderer.tsx
plugins/er-diagram-renderer/schema.json
plugins/registry.json
scripts/pdf-extract-text.mjs
src/lib/plugins.ts
src/pages/view/index.astro
```

Expected tarball does not include:

```text
.notecraft/plugins.json
src/content/notes/schema-demo.er.json
```

- [ ] **Step 5: Start a temporary fixture server for human ER canvas inspection**

Create a temporary fixture outside the repository by copying the official example and writing this mapping:

```json
{
  "plugins": [
    { "plugin": "er-diagram-renderer", "files": ["schema-demo.er.json"] }
  ]
}
```

Run the dev server with:

```bash
NOTECRAFT_NOTES_DIR=<fixture>/docs NOTECRAFT_USER_CWD=<fixture> npm run dev
```

Open `/view/schema-demo.er` and verify:

- dragging blank canvas pans;
- Command/Control + wheel zooms around the pointer;
- double-clicking blank canvas restores the fitted view;
- normal wheel scroll remains available to the page;
- the References route and a normal note route still use the constrained layout.

Stop the server and remove only the temporary fixture created for this step.

- [ ] **Step 6: Commit any verification-driven fix, or record that no fix was needed**

If files changed, run:

```bash
git add <only-the-files-changed-to-fix-verification>
git diff --cached --check
git commit -m "fix: resolve plugin integration regressions"
```

If no files changed, do not create an empty commit.

---

### Task 5: Review the finished branch and prepare handoff

**Files:**
- Inspect: complete branch diff from its merge base.
- Modify only for confirmed Critical or Important review findings.

**Interfaces:**
- Consumes: verified integration branch.
- Produces: reviewed branch ready for the user to merge, with no push or PR side effects.

- [ ] **Step 1: Capture review boundaries**

Run:

```bash
BASE_SHA=$(git merge-base main HEAD)
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA".."$HEAD_SHA"
```

Expected: review range contains the test-contract commit, upstream merge, demo removal, local adaptations, and any verification fix.

- [ ] **Step 2: Request an independent whole-branch review**

Review request must include:

```text
Description: Integrated upstream Plugin System v0.6.0 and ER Diagram Renderer v1.1.0 while preserving local PDF, KaTeX, References, and online-editor features; removed default demo activation.
Requirements: docs/superpowers/specs/2026-09-21-upstream-plugin-system-integration-design.md and docs/superpowers/plans/2026-09-21-upstream-plugin-system-integration.md
Base SHA: <BASE_SHA>
Head SHA: <HEAD_SHA>
```

Expected: reviewer reports findings by severity and explicitly checks the five Review Focus conditions.

- [ ] **Step 3: Address every Critical and Important finding with a regression test**

For each valid finding:

1. Add or strengthen the smallest test that reproduces it.
2. Run the test and observe the expected failure.
3. Apply the smallest fix.
4. Re-run the targeted test and full suite.
5. Commit with `fix: address plugin integration review findings`.

- [ ] **Step 4: Run fresh final verification**

Run:

```bash
node --test src/lib/detect-github-repo.test.mjs src/lib/github-contents.test.ts src/lib/online-edit-settings.test.ts tests/install-plugin.test.mjs tests/upstream-merge-regression.test.mjs tests/plugin-system.integration.test.mjs
npm run typecheck
npm run build
npm run check-plugins
git status --short --branch
```

Expected: tests have zero failures, typecheck/build/plugin validation exit 0, and the integration worktree is clean.

- [ ] **Step 5: Hand off without pushing**

Report:

- branch and worktree path;
- upstream SHA integrated;
- commits created;
- exact verification results;
- ER preview URL/command;
- review findings and resolutions;
- confirmation that demo config/data and user-owned workspace changes are absent;
- options to merge locally, keep the branch, or discard the worktree.
