---
name: lab-workflow
description: Use when the author has a lab handout (App_LabN.pdf、實驗講義) for the 電子學實作系列 and wants it turned into a runnable lab manual — 「幫我整理實驗」「Lab 2 要做什麼」「先模擬再接線」「預報／結報要寫什麼」「把實驗數據記進筆記」— or asks to simulate a course circuit in CircuitJS, Tinkercad, or LTspice. Also triggers on "prepare the lab", "pre-lab / post-lab report", "simulate this experiment".
---

# Lab Workflow：實驗講義 → 三種模擬 → 記錄表 → 筆記

## Overview

把一份實驗講義變成「實驗當天要翻的那一頁」。核心原則：**講義的逐頁詳解和實驗手冊是兩件事**——詳解放講義所屬週次的筆記（用 `pdf-image-extract` 與 `@ai-reference` 流程），手冊放實驗週次的筆記；手冊裡每個實驗固定走「看懂 → 預演 → 預報 → 實測 → 對照」五段，三個模擬工具各司其職，**不用 `@ai-visualize` 元件代替模擬**。

| 工具 | 模型 | 拿來做什麼 | 不做什麼 |
| --- | --- | --- | --- |
| CircuitJS | 通用 | 一鍵連結看電流方向與波形形狀 | 抄數值、預演接線 |
| Tinkercad | 通用 | 照配方表在虛擬麵包板預演接線與儀器接法 | 精確數據 |
| LTspice | 真實型號 | 產生可進報告的曲線與預報值，和實測對照 | 麵包板與儀器外觀 |

## When to use

- 作者給了 `App_LabN.pdf` 或說「第 N 週要做實驗」「整理實驗」「預報」「結報」
- 作者要把某個課程電路丟到 CircuitJS／Tinkercad／LTspice 看
- 不適用：純理論章節（走 `electronics-foundation`）；已做完實驗只要出考題（走 `exam-review`）

## 流程

1. **讀講義**：用 `scripts/pdf-extract-text.mjs` 抽全文，文字少的頁用 `pdftoppm -png -r 80` 轉圖再看。每個實驗抓出：目標、理論名詞、步驟（含掃描級距）、器材表、量測欄位、講義問題。**先確認講義參數自洽**（例如齊納電壓 vs 輸入振幅、電容 vs 週期），不自洽要在筆記點破而不是照抄。
2. **CircuitJS**：每個實驗寫一個文字檔到 `simulations/<lab>/circuitjs/`，用 `scripts/circuitjs-link.mjs --check` 產連結並看截圖。直流實驗加滑桿模擬「每次加 0.1 V」；交流實驗放 Vin／Vout 兩個示波器；多組參數各給一個連結。格式與佈局見 `references/circuitjs-format.md`。
3. **Tinkercad**：每個實驗一張接線配方表 + 一張儀器設定表，寫法與陷阱見 `references/tinkercad-recipes.md`。作者要求代操作時，才用 Playwright 驅動本機 Chrome（需作者在該視窗登入）。
4. **LTspice**：`simulations/<lab>/*.cir` 用內建庫的真實 `.model`，`../tools/run-lt.sh` 批次跑，`plot.py` 出圖到 `public/note-images/<slug>/`，並算出峰值、rms、平均、漣波，見 `references/ltspice-batch.md`。
5. **記錄表**：預報表（理論公式、LTspice、CircuitJS 三欄預期值）與結報表（實測、預報值、誤差、原因）都留空欄給作者填；記錄表欄位對齊講義的量測項目，多加一欄可互相驗證的量（例如同時抄 $V_R / R$ 與電流表）。
6. **寫進筆記**：用 `templates/lab-section.md` 的段落順序，每個實驗掛 `@ai-reference` 到講義步驟頁；LTspice 結果另立「進階」小節放理論 vs 模擬對照表；附錄收 CircuitJS 文字檔。寫完跑粗體自檢 grep、remark 清單檢查、`astro build`、preview 截圖。

## 產出位置

| 產出 | 位置 |
| --- | --- |
| 實驗手冊 | `src/content/notes/電子學實作系列第<實驗週>週-*.mdx` |
| CircuitJS 文字檔 | `simulations/<lab>/circuitjs/*.txt` |
| LTspice 網表、plot.py、README | `simulations/<lab>/` |
| 圖 | `public/note-images/ec-week<N>-<tool>/` |

## Common mistakes

- 用 `@ai-visualize` 元件「示意」實驗 → 那是插圖不是模擬，作者看不到電流與讀值。
- 把 Tinkercad 的 Amplitude 當峰值 → 它是峰對峰值。
- 橋式電路的實體示波器兩通道同時接輸入與輸出 → 大地短路一顆二極體，手冊必須寫接地做法。
- 直接抄 CircuitJS／Tinkercad 的數值當預報值 → 通用模型導通電壓約 0.5 V，預報值以 LTspice 真實型號為準。
- LTspice 網表用 `.lib` 引用元件庫 → 線上版開不起來，`.model` 要內嵌。
- 濾波電容大的 `.tran` 只跑 50 ms → 還沒到穩態，漣波算錯。
- 圖沒用 Read 打開看就貼進筆記 → 圖例重疊、座標軸錯了都看不到。
