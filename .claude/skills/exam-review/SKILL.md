---
name: exam-review
description: Use when the author asks to整理期中考/期末考複習、列出可能考題、出題並附詳解，or otherwise wants a review section built for a specific NoteCraft lecture note (electronics, ML, or similar weekly note) — producing key definitions, formulas, and worked practice questions as separate sidebar sections.
---

# Exam Review Section

## Overview

Turns a NoteCraft lecture note into a self-contained review section: definitions table, formula list, and practice questions with full worked solutions — written as three top-level `##` sections (關鍵定義 / 公式 / 考題) so each shows up as its own entry in the note's right-side table of contents, instead of being buried under one heading.

## When to use

- Author asks to整理期中考/期末考複習、列出可能考題、幫忙出題附詳解，for a specific week/chapter note that already has substantial content to draw from.
- Note already defines terms, states formulas, or has worked textbook Examples — this skill compiles/extends that, it doesn't invent a topic from nothing.

## Process

1. **Read the whole target note** (paginate with `offset`/`limit` if long — a partial read misses later chapters). Distinguish what's already fact-checked (terms tied to a confirmed `@ai-reference` PDF page, or a cited textbook Example number) from narrative explanation.
2. **Scope check**: if the note spans multiple chapters/weeks, ask the author which part is in scope rather than assuming full coverage.
3. **`## 關鍵定義`** — pull terms already defined in the note into a 英中對照 table (`| 名詞 | 定義 |`). Don't invent terms the note never covers.
4. **`## 公式`** — bullet list of every core formula already present in the note, each in `$...$` KaTeX, one per line.
5. **`## 考題`** — practice questions in two `###` subsections:
   - `### 概念辨析題` — compare/contrast or "why" questions testing distinctions the note already explains.
   - `### 計算題` — worked numeric problems. Prefer reusing the *structure* of an already-cited textbook Example (same formula, different numbers) over inventing new formulas. Afterward, tell the author plainly which questions mirror a cited Example vs. are self-constructed practice numbers — never imply invented numbers came from the textbook's exercise set.
   - **Each question is its own block, never a crammed bullet**: `#### 複習題 N` heading → `> ` blockquote with the question → **詳解** (plus optional **考的觀念**) as its own paragraph/math block below. Putting question + multi-line solution inside one `-` bullet is unreadable, and an indented `$$` block inside a list item risks breaking CommonMark list parsing.
6. **Three separate `##` headings, not one wrapper** — `## 關鍵定義`, `## 公式`, `## 考題` at the same heading level. The site's sidebar TOC reads top-level `##` headings; nesting all three under one `##` title hides two of them from it.
7. **Placement**: insert right before the note's closing personal-reflection section (e.g. `## 實作心得`) if one exists, else append at the end.
8. **REQUIRED:** follow the `math-formula-notation` skill for every formula/derivation — aligned blocks for multi-step math, units wrapped in `\text{}`, no bare Chinese inside `$...$`, and correct list-indentation if a `$$` block ever ends up inside a list item.
9. **Verify before reporting done**: run `npx astro build`, then `grep -a -c 'katex-error\|ParseError' dist/notes/<slug>/index.html` — must print `0`. Also run `grep -noP '[)）]\*\*(?![\s\p{P}\p{S}])' <筆記路徑>` on the section you wrote/edited — must print nothing. This catches `**名詞（English term）**是...` style bold immediately followed by a CJK character with no space: CommonMark's right-flanking rule refuses to close `**` there (see [CLAUDE.md](../../../CLAUDE.md) 工作慣例), so it silently prints literal `**` instead of rendering bold — `astro build` and the KaTeX grep won't catch this, only this separate check will. Fix by inserting one half-width space right after the offending `）**`/`)**`.

## Common mistakes

- Cramming question + solution into one bullet → unreadable, and risks the list-indentation KaTeX trap.
- Wrapping all three sections under one shared `##` title → only one entry shows in the sidebar TOC instead of three.
- Presenting self-invented practice numbers as verified textbook exercises instead of disclosing which are original.
- Inventing definitions/formulas absent from the note rather than drawing from its existing, already-checked content.
- Skipping the `astro build` + KaTeX-error grep before calling the work done.
