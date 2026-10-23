import test from "node:test";
import assert from "node:assert/strict";
import { legacyNoteSlugRedirect, legacyNoteSlugRedirectsFor } from "./legacy-note-slugs.ts";

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
