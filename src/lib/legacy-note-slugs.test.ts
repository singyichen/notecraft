import test from "node:test";
import assert from "node:assert/strict";
import {
  isCaseOnlyAlias,
  legacyNoteSlugRedirect,
  legacyNoteSlugRedirectsFor,
} from "./legacy-note-slugs.ts";

test("maps the malformed Traditional Chinese note URL to its canonical slug", () => {
  assert.equal(
    legacyNoteSlugRedirect("機器學習\uFFFD\uFFFD實作系列第16週-期末專案"),
    "機器學習實作系列第16週-期末專案",
  );
});

test("maps the former uppercase CE note URL to the canonical lowercase slug", () => {
  assert.equal(
    legacyNoteSlugRedirect("電子學實作系列第6週-CE放大器實驗"),
    "電子學實作系列第6週-ce放大器實驗",
  );
});

test("does not redirect unrelated note slugs", () => {
  assert.equal(legacyNoteSlugRedirect("機器學習實作系列第15週-分群與應用"), null);
});

test("creates an alias only while its canonical note exists", () => {
  const canonicalSlug = "機器學習實作系列第16週-期末專案";
  assert.deepEqual(legacyNoteSlugRedirectsFor(new Set([canonicalSlug])), [
    { slug: "機器學習\uFFFD\uFFFD實作系列第16週-期末專案", canonicalSlug },
  ]);
  assert.deepEqual(legacyNoteSlugRedirectsFor(new Set()), []);
});

test("recognises aliases that differ from their canonical slug only by case", () => {
  assert.equal(isCaseOnlyAlias("電子學實作系列第6週-CE放大器實驗", "電子學實作系列第6週-ce放大器實驗"), true);
  // U+FFFD 的那筆不是只差大小寫，它在任何檔案系統上都是獨立路徑
  assert.equal(
    isCaseOnlyAlias("機器學習\uFFFD\uFFFD實作系列第16週-期末專案", "機器學習實作系列第16週-期末專案"),
    false,
  );
  assert.equal(isCaseOnlyAlias("同一個 slug", "同一個 slug"), false);
});

test("drops case-only aliases when the build filesystem is case-insensitive", () => {
  const ceSlug = "電子學實作系列第6週-CE放大器實驗";
  const ceCanonical = "電子學實作系列第6週-ce放大器實驗";
  const mlSlug = "機器學習\uFFFD\uFFFD實作系列第16週-期末專案";
  const mlCanonical = "機器學習實作系列第16週-期末專案";
  const noteSlugs = new Set([ceCanonical, mlCanonical]);

  assert.deepEqual(legacyNoteSlugRedirectsFor(noteSlugs), [
    { slug: mlSlug, canonicalSlug: mlCanonical },
    { slug: ceSlug, canonicalSlug: ceCanonical },
  ]);
  // 大小寫不敏感時只留下不會撞路徑的那一筆
  assert.deepEqual(legacyNoteSlugRedirectsFor(noteSlugs, { allowCaseOnlyAliases: false }), [
    { slug: mlSlug, canonicalSlug: mlCanonical },
  ]);
});
