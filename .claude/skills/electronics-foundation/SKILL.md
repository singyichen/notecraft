---
name: electronics-foundation
description: Use when explaining, writing, or reviewing electronics / semiconductor-physics content in NoteCraft（電子學實作系列筆記、Razavi Fundamentals of Microelectronics 教材）for an author with a mathematics degree and no prior physics or circuits coursework, or when selecting supplemental open courses and planning weekly electronics preview or review — including 補地基、為什麼公式長這樣、幫我看懂講義、物理先備知識、外部教材、預習複習路線, and @ai-visualize prompts for physics concepts.
---

# Electronics Foundation（給數學背景讀者的電子學地基）

## Overview

作者是數學系畢業、沒修過普通物理與電路學。教材與筆記裡的定義建立在一層課程假設已知的物理原始概念之上（電荷、電場、電位、$kT$、Boltzmann 因子……），那一層才是卡住的地方。這個 skill 提供那一層，並規定「解釋給這位作者」的輸出形狀：**每個名詞往上追到原始概念，每條公式用作者已會的數學重講並實際推導，不背公式。**

## When to use

- 作者說「這段物理我不懂」「為什麼公式是這樣」「什麼是 X」（X 是電子學／半導體名詞）
- 要為電子學筆記新增或改寫概念說明、補「地基」段落、寫關鍵定義表
- 要從免費公開課程選擇與當週筆記直接相關的單元，安排限時預習、複習或補弱計畫
- 要為物理概念下 `@ai-visualize` 標記、寫 prompt
- `exam-review` 為電子學筆記出概念辨析題時
- 不適用：純電路計算題的解題步驟（那是教材本身的流程），或機器學習筆記（用 `hung-yi-lee`）

## 解釋的輸出契約

對這位作者的每一段概念解釋，依序包含這五個部分（不足可略過第 5 項，其餘必備）：

1. **前提盤點**：這個概念用到哪些原始概念？逐一對回 [references/primitives.md](references/primitives.md)。筆記與教材沒定義的，在這裡一句話補齊。
2. **數學對應**：這在數學上是什麼？查 [references/math-map.md](references/math-map.md)，用作者已會的名字講（指數尾機率、一階泰勒展開、可分離變數 ODE、負梯度、$Ax=b$……）。
3. **推導**：公式要從上一步實際推出來，寫成 `$$…$$` 的 `aligned` 區塊，遵循 `math-formula-notation`。推導鏈與各步驟已整理在 [references/derivation-chain.md](references/derivation-chain.md)，直接沿用，不要用「可以證明」「剛好消掉」帶過。
4. **因次檢查**：至少一條公式做單位驗算（半導體公式用 cm 制）。這是作者最擅長、也最能自我糾錯的工具。
5. **一題自測**：一題只需改一個變數就能答的小題（例如「溫度升高 $n_i$ 怎麼變？為什麼？」），答案放在折疊或段末。

文字風格維持筆記既有的精確、表格／公式導向；只借物理直覺，不寫成講課口語。長段散文要拆成表格或條列。正文以中文為主，英文術語只在對應中文名詞第一次出現時括號附註（「空乏區（depletion region）」），不要英文原句在前再接中文；knee voltage 寫「導通電壓」，不寫「膝點」。

## Quick reference

| 需要 | 看 |
| --- | --- |
| 八個物理原始概念的定義、單位、數學對應 | `references/primitives.md` |
| 電子學概念 ↔ 數學課已學過的東西（按章節） | `references/math-map.md` |
| 從 Boltzmann 因子推到二極體方程式的完整鏈 | `references/derivation-chain.md` |
| 數學背景讀者的常見誤解、符號慣例、單位陷阱、常數表 | `references/misconceptions.md` |
| 免費公開課程、週次／概念映射、限時學習計畫 | `references/course-resource-map.md` |

## 使用外部教材時

作者要求補充教材、預習／複習路線或針對弱點推薦課程時，讀 [references/course-resource-map.md](references/course-resource-map.md)。每個學習目標最多選一個主教材與一個練習來源，不要求完整修另一門課。

把資源選擇接回本 skill 的解釋契約：先指出要補的概念與選該單元的理由，再安排有完成條件的時段；概念說明仍包含前提盤點、數學對應、推導、因次檢查與自測。實驗週再加「預測／模擬／實測／差異原因」證據鏈。

GitHub 課程清單只用來發現候選資源。能連網時，推薦前先回到大學、講師或平台的官方頁確認課程名稱、單元內容、存取方式與連結；無法確認精確影片編號、標題或時間戳時，只給已確認的課程入口與站內搜尋詞，不得猜測。

## 為物理概念寫 `@ai-visualize` prompt 時

寫成「讓讀者改變 X、觀察 Y」的參數探索，不寫「畫出 X 的示意圖」。滑桿要對應公式裡的變數（$T$、$N_D$、$V_D$、$E$），畫面上同時顯示該變數在公式中的位置，讓圖和推導鏈是同一件事。純概念圖對這位作者幫助最低，優先級放最後。

## Common mistakes

- 用「電場像一隻手推」「統計力學告訴我們」帶過前提：作者沒修過，這些正是要定義的東西。
- 講完直覺沒推導：作者的優勢是推導，直覺講再多也不如讓他自己推一次。
- 混用 SI 公尺制與半導體 cm 制，因次檢查會差 $10^{4}$ 倍。
- 把 $kT$（能量）和 $kT/q = V_T$（電壓）混為一談。
- 用 `hung-yi-lee` 的講課語感寫電子學筆記；本 skill 只借知識背景。
