---
name: exam-review
description: Use when the author asks to整理期中考/期末考複習、列出可能考題、出題並附詳解、整理「可能會考的選擇題」, or otherwise wants a review section built for a specific NoteCraft lecture note (electronics, ML, or similar weekly note) — producing key definitions, formulas, and practice questions (multiple-choice with the correct option coloured in place, plus concept-contrast and numeric questions) as separate sidebar sections, with every question stem and multiple-choice option written bilingually (Chinese above, English below).
---

# Exam Review Section

## Overview

Turns a NoteCraft lecture note into a self-contained review section: definitions table, formula list, and practice questions with full worked solutions — written as three top-level `##` sections (關鍵定義 / 公式 / 考題) so each shows up as its own entry in the note's right-side table of contents, instead of being buried under one heading.

`## 考題` holds up to three `###` subsections. **選擇題 comes first** — for courses whose exams are all multiple-choice it is the section the author actually revises from.

**題幹與選擇題選項一律雙語**（中文在上、英文另一行）：教授可能出英文題目，複習時必須同時讀得到兩種說法。「考的觀念」與詳解維持純中文——那是理解用的，雙語只會讓篇幅加倍。寫法見 [Bilingual mode](#bilingual-mode)。

## When to use

- Author asks to整理期中考/期末考複習、列出可能考題、幫忙出題附詳解，for a specific week/chapter note that already has substantial content to draw from.
- Author asks for選擇題 specifically（「老師說都考選擇題」「整理這篇可能會考的選擇題」）→ write `### 選擇題` alone, don't force the other two subsections into a note that doesn't need them.
- Note already defines terms, states formulas, or has worked textbook Examples — this skill compiles/extends that, it doesn't invent a topic from nothing.

## Process

1. **Read the whole target note** (paginate with `offset`/`limit` if long — a partial read misses later chapters). Distinguish what's already fact-checked (terms tied to a confirmed `@ai-reference` PDF page, or a cited textbook Example number) from narrative explanation.
2. **Scope check**: if the note spans multiple chapters/weeks, ask the author which part is in scope rather than assuming full coverage.
3. **`## 關鍵定義`** — pull terms already defined in the note into a 英中對照 table (`| 名詞 | 定義 |`). Don't invent terms the note never covers.
4. **`## 公式`** — bullet list of every core formula already present in the note, each in `$...$` KaTeX, one per line.
5. **`## 考題`** — practice questions in `###` subsections, **in this order**:
   - `### 選擇題` — multiple-choice, correct option coloured in place. See [Multiple-choice mode](#multiple-choice-mode) below for the syntax and the distractor rules; it is the substance of this section, not a formatting detail.
   - `### 概念辨析題` — compare/contrast or "why" questions testing distinctions the note already explains.
   - `### 計算題` — worked numeric problems. Prefer reusing the *structure* of an already-cited textbook Example (same formula, different numbers) over inventing new formulas. Afterward, tell the author plainly which questions mirror a cited Example vs. are self-constructed practice numbers — never imply invented numbers came from the textbook's exercise set.
   - **每個題幹都要有英文對照行**：`> 中文題幹` 之後緊接一行 `> :en[English stem]`，三種題型皆同。選擇題的選項另外各自附英文，見 [Bilingual mode](#bilingual-mode)。
   - **Each question is its own block, never a crammed bullet**: `#### <題型> N` heading → `> ` blockquote with the question → the answer block → **詳解** as its own block below. Putting question + multi-line solution inside one `-` bullet is unreadable, and an indented `$$` block inside a list item risks breaking CommonMark list parsing.
   - Number each subsection's questions from 1 independently (`#### 選擇題 1`, `#### 複習題 1`).
6. **Three separate `##` headings, not one wrapper** — `## 關鍵定義`, `## 公式`, `## 考題` at the same heading level. The sidebar TOC collects h1–h3 (`src/pages/notes/[...slug].astro`), so the three `##` headings and the `###` subsections under 考題 all appear; `####` question headings do not.
7. **Placement**: insert right before the note's closing personal-reflection section (e.g. `## 實作心得`) if one exists, else append at the end.
8. **REQUIRED:** follow the `math-formula-notation` skill for every formula/derivation — aligned blocks for multi-step math, units wrapped in `\text{}`, no bare Chinese inside `$...$`, and correct list-indentation if a `$$` block ever ends up inside a list item.
9. **Verify before reporting done** — see [Verification](#verification).

## Multiple-choice mode

### 語法

Options use the `:::choices` container directive; the solution goes in a collapsed admonition below it. Both are build-time Markdown extensions — no React component, no JS.

```mdx
#### 選擇題 1

> 關於獨熱編碼後刪掉其中一欄，下列敘述哪一項正確？
> :en[Which of the following is correct about dropping one column after one-hot encoding?]

:::choices{answer="B"}
- 會損失該類別欄位的資訊 :en[It loses the information in that category column]
- 被刪的那一欄是其餘欄位的線性組合 :en[The dropped column is a linear combination of the rest]
- 只是為了節省記憶體 :en[It merely saves memory]
- 只有樹模型需要這樣做 :en[Only tree models need this]
:::

:::tip{collapsible title="詳解"}
這組欄位對每一筆樣本恰有一個為 1、其餘為 0，總和恆為 1。刪掉任一欄後，剩下的欄位仍能唯一還原原始類別，因此被刪的那一欄本來就是其餘欄位的線性組合，不帶任何額外資訊。選 (A) 的人把「欄位數變少」直接當成「資訊變少」，但這裡少掉的那一欄是可推導的冗餘。

**考的觀念**：獨熱編碼與多重共線性
:::
```

- **選項不自己寫 `(A)`／`1.`** —— 字母由 `:::choices` 依清單順序自動指派，作者手寫編號會變成「A (A) …」。
- `answer` 是正解的唯一來源，大小寫不分。**重排選項時務必同步改 `answer`** —— 機器無法偵測「順序換了但 `answer` 沒改」，只能靠寫入時兩者一起產出。
- 複選題在題幹註明「（複選）」，`answer="B,D"`。
- 題幹一律放 `>` blockquote，與其他題型一致；英文對照行是 blockquote 內的第二行 `> :en[...]`。
- 每個選項的英文接在中文後面、同一行，用一個半形空格隔開：`- 中文選項 :en[English option]`。
- 詳解標題固定 `title="詳解"`；`**考的觀念**：<一句話>` 選用，放在詳解最後一行（與既有筆記的寫法一致）。

### 出題規則

- **每篇 8–12 題**，筆記裡每個 `##` 主題至少 1 題；主題份量差很多時按份量分配，不要平均攤。
- **四個選項、一個正解**（複選題明確標示）。
- **誘答項必須是筆記本身講過的混淆點** —— 例如 `fit`／`transform` 的先後、標準化 vs 正規化、順偏 vs 逆偏、L1 vs L2 的稀疏性。不要造明顯荒謬的選項湊數：一眼可排除的選項等於沒有選項。
- **四個選項長度與句式相近**。正解特別長、特別具體、或唯一帶條件子句，都是在送分。
- **不用「以上皆是／以上皆非」當正解**。
- **正解字母要打散** —— 全篇不要有任何字母佔超過一半。
- **考判斷與因果，不考死記數字**。數值只在它本身就是結論時才考（例如矽二極體導通電壓約 0.7 V）。
- **詳解要解釋為什麼其他選項錯**，至少點名最誘人的那一個錯誤選項並說明它錯在哪。只寫「正解是 B，因為……」不夠。
- **誠實揭露來源**：寫完後告訴作者哪些題改寫自課本 Example／講義原文（附編號或頁碼）、哪些是自創練習題。絕不把自創題講成課本習題。

### 兩個系列的差別

| | 機器學習實作系列 | 電子學實作系列 |
| --- | --- | --- |
| 概念背景 | 參考 `hung-yi-lee` skill 的 `wiki/`（只借知識背景，不套講課口語） | 先讀 `electronics-foundation` skill 及其 `references/`（作者是數學系、未修過普物與電路學） |
| 常見誘答來源 | 資料洩漏、過擬合 vs 欠擬合、評估指標選擇、`fit`／`transform` 範圍 | 順偏／逆偏、空乏區變化、理想 vs 實際二極體模型、漣波與整流器拓樸 |
| 公式題 | 多為概念判斷，少量代入計算 | 代入計算較多，一律走 `math-formula-notation` |

術語一律照 [CLAUDE.md](../../../CLAUDE.md) 的中文為主規則（knee voltage 寫「導通電壓」，不寫「膝點」）；英文只在專有名詞第一次出現時以括號附在中文後面。


## Bilingual mode

教授可能以英文出題，所以**題幹與選擇題選項一律中英並列**；「考的觀念」與「詳解」維持純中文。

### 語法

行內 `:en[英文內容]` 渲染成 `<span class="nc-en" lang="en">`，樣式是 `display: block` + 轉淡縮小——中文寫一行、`:en[...]` 接下一行，出來就是「中文在上、英文另一行」。

```mdx
> 電場持續增強時，載子的漂移速度會怎麼變化？
> :en[As the electric field keeps increasing, how does the drift velocity of carriers change?]

:::choices{answer="D"}
- 持續線性增加，沒有上限 :en[Increases linearly without limit]
- 先線性增加，之後趨近一個飽和速度 :en[Increases linearly at first, then approaches a saturation velocity]
:::
```

- **不是**區塊 directive（沒有 `::en[...]` 這種寫法）。英文必須與中文待在同一個段落／清單項目內，換行交給 CSS；寫成獨立區塊會把 `:::choices` 的選項列拆散。
- 英文內可寫 KaTeX：`:en[If $N_D$ increases tenfold, how does $p$ change?]`。符號用原本那一份，不要為英文另寫一套。
- 忘了帶 `[...]` 只會在 build log 留 warn 並輸出字面 `:en`，build 不會失敗——所以要靠 [Verification](#verification) 第 7 條檢查。

### 翻譯規則

- **英文是題目的另一種問法，不是中文的逐字直譯**。用該領域課本的慣用說法（Razavi、scikit-learn 文件的用語），讓作者在英文卷上認得出同一個概念。
- **四個選項的英文長度與句式也要相近**。中文那層做到了選項等長，英文這層若讓正解特別長、特別具體，等於在英文卷上送分。
- **專有名詞用原文既有的拼法**：knee voltage、depletion region、forward/reverse bias、precision/recall、one-hot encoding。中文那層仍照 [CLAUDE.md](../../../CLAUDE.md) 寫「導通電壓」「空乏區」「順偏／逆偏」。
- 詳解、`**考的觀念**`、表格、`## 關鍵定義` 與 `## 公式` **都不加英文**。關鍵定義本來就是英中對照表，不需要再包一層。

### 只補英文到既有筆記時

既有筆記已經有整段中文考題、只是缺英文，那是一次機械性的批次改寫：逐則題幹插入 `> :en[...]`、逐個選項行尾接 ` :en[...]`，**不要順手改中文題目或選項順序**——`answer` 與選項順序的對應沒有機器可以驗，動了就有標錯答案的風險。改完照 [Verification](#verification) 全跑一次。

## Verification

Run all of these before reporting done:

1. `npx astro build`
2. KaTeX：`grep -a -c 'katex-error\|ParseError' dist/notes/<slug>/index.html` 必須是 `0`
3. **`:::choices` 寫法**：build log 不得出現 `[notecraft-directives] :::choices` —— 出現就表示 `answer` 指到不存在的字母、缺 `answer`、或容器內沒有清單，該題的正解不會被標出來（build 不會失敗，所以只能靠這條檢查）
4. 渲染結果：`grep -c 'nc-choice--correct' dist/notes/<slug>/index.html` 應等於選擇題題數（複選題仍算多列，用來確認沒有整組漏標）
5. 正解字母分佈：`grep -oP '(?<=:::choices\{answer=")[^"]+' <筆記路徑> | sort | uniq -c` —— 任一字母不應超過總題數的一半
6. 雙語覆蓋率：`grep -c ':en\[' <筆記路徑>` 應等於「題幹則數 + 選項行數」（例如 12 題選擇題 + 10 題其他題型 = 22 則題幹、48 個選項 → 70）。少了就是有題目漏翻。
7. 字面 `:en` 殘留：`grep -c ':en\[' dist/notes/<slug>/index.html` 必須是 `0`。出現代表某處 `:en` 沒被處理（多半是漏了 `[`），build 不會失敗，只能靠這條檢查。
8. 粗體收尾：`grep -noP '[)）]\*\*(?![\s\p{P}\p{S}])' <筆記路徑>` 必須沒有輸出。這抓的是 `**名詞（English term）**是...` 這種粗體緊接 CJK 字元的寫法：CommonMark 的 right-flanking 規則不允許 `**` 在那裡收尾（見 [CLAUDE.md](../../../CLAUDE.md) 工作慣例），會靜默輸出字面 `**`，而 `astro build` 與 KaTeX 檢查都抓不到。修法是在 `）**`／`)**` 後補一個半形空格。

## Common mistakes

- 選項自己寫 `(A)`／`(B)` → 渲染成「A (A) …」重複編號。
- 重排選項卻忘了改 `answer` → 標錯答案，而且沒有任何警示。
- 誘答項造得太假（明顯荒謬、長度落差大）→ 題目失去鑑別力，複習時等於白看。
- 詳解只說正解為何對，不說其他選項錯在哪。
- Cramming question + solution into one bullet → unreadable, and risks the list-indentation KaTeX trap.
- Wrapping all three sections under one shared `##` title → only one entry shows in the sidebar TOC instead of three.
- 把 `### 選擇題` 擺在 `## 考題` 最後面 → 考試以選擇題為主的課程，最重要的一段被擠到最下面。
- Presenting self-invented practice numbers as verified textbook exercises instead of disclosing which are original.
- Inventing definitions/formulas absent from the note rather than drawing from its existing, already-checked content.
- 只給題幹英文、選項留中文 → 英文卷上最需要辨認的就是選項，等於沒做。
- 英文選項長度落差大（正解特別長）→ 中文那層的等長設計在英文層破功。
- 把 `:en` 寫成獨立一行的區塊 directive → `:::choices` 的選項列被拆散，版面壞掉。
- 補英文時順手調動選項順序卻沒改 `answer` → 標錯答案，而且沒有任何警示。
- 跳過 `astro build` 與上面第 3、4 條 `:::choices` 檢查就宣稱完成。
