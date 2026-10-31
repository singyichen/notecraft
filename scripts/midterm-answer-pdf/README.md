# 電子學期中考 PDF 產生器

第 8 週期中考（改以作業形式繳交）的兩份 PDF 的來源。產物直接寫回
`src/content/notes/_references/電子學實作系列/第八週/`，所以跟著講義一起進版控、
`astro build` 也會複製進 `dist/`，正式站的講義庫看得到。

| 指令 | 產物 | 用途 |
| --- | --- | --- |
| `node scripts/midterm-answer-pdf/build-answer.mjs` | `515661055_陳欣怡_期中考作答.pdf`（5 頁） | 交件用：原卷題目＋關鍵公式、代入計算與 `Ans.` |
| `node scripts/midterm-answer-pdf/build-blank.mjs` | `期中考空白作答卷.pdf`（5 頁） | 列印手寫用：只有標題與題目，下方整片留白 |
| `build-detail.mjs`（見下） | `515661055_陳欣怡_期中考詳解.pdf`（12 頁） | 自己複習用：第 8 週筆記整篇轉出來 |

前兩份是**一題一頁**，頁首是從原卷切下來的標題區塊。

## 檔案

```
scripts/midterm-answer-pdf/
├── build-answer.mjs   作答版：題目圖 + KaTeX 算式 + Ans.
├── build-blank.mjs    空白卷：題目圖 only
├── build-detail.mjs   詳解版：整篇筆記 → PDF（需額外套件，見下）
├── q5-plot.mjs        第 5 題答案圖（手寫 SVG 折線，雙圖並排）
└── qblocks/           原卷逐題切圖（head、q1–q5）
```

### `qblocks/` 怎麼來的

從教授給的 `Midterm_a.pdf` 以 300 dpi 轉 PNG 後，依整頁的水平投影找出空白帶，逐題切出
「題幹＋電路圖」區塊，再壓掉區塊內超過 34 px 的連續空白列。切圖用同一組左右邊界
（原頁 x = 365…2116），所以標題與五題的左邊緣在版面上對齊。

原卷 PDF 不在 repo 裡（是教授發的考卷檔）。**要重切就得拿到原檔**；日常只改算式或版面的話
不需要動 `qblocks/`。

## 相依

- `katex`（專案既有相依）— 算式在產生階段就展開成 HTML，不需要瀏覽器端 JS
- headless Chrome 負責列印成 PDF。預設找 `/Applications/Google Chrome.app/...`，
  可用 `CHROME_BIN=<路徑>` 覆寫

不需要額外 `npm install`。

## 版面上的幾個決定

- **解答左緣對齊題目內文**：原卷是懸掛縮排（題號在 x=381、內文從 x=452 起），換算成題目
  影像寬度的 4.97%，`.sol` 就用這個比例當左邊距。
- **全份無彩色**：`mono()` 把第 5 題圖的藍／橘換成黑灰，`Ans.` 沒有底色與外框。
- **第 5 題 (a) 圖不標「斜率 = 1/R1」**：該圖縱軸是 `I_R1 ÷ (1.8 V / R1)`、橫軸是實際
  `V_in`，圖上斜率並不等於 `1/R1`。`q5-plot.mjs` 的 `stripSlopeLabelA()` 會把那個標註拿掉，
  改放在圖下方寫成 `dI_R1/dV_in = 1/R_1`。詳解版用的 `Q5_PLOT_HTML` 維持原樣。
- **第 3 題的 hybrid-π 圖**是寫在 `build-answer.mjs` 裡的 inline SVG（`HYBRID_PI_SVG`），
  (a)(b) 共用一張，參數列在右側。

## 詳解版怎麼重出

`build-detail.mjs` 把[第 8 週筆記](../../src/content/notes/電子學實作系列第8週-期中考.mdx)
整篇轉成 PDF（去掉 frontmatter、`@ai-*` 標記、JSX island，`PdfRefChip` 換成一行講義出處，
`@ai-visualize` 的互動元件換成同一張靜態 SVG，「三份 PDF」整節略過）。

它走 remark／rehype 管線，那組套件**不是專案相依**，而 ESM 不吃 `NODE_PATH`，所以要搬到裝了
套件的目錄裡跑，再用 `NC_ROOT` 指回 repo：

```bash
mkdir -p /tmp/nc-pdf && cd /tmp/nc-pdf && npm init -y
npm i unified remark-parse remark-gfm remark-math remark-directive \
      remark-rehype rehype-raw rehype-katex rehype-stringify unist-util-visit katex
cp <repo>/scripts/midterm-answer-pdf/{build-detail.mjs,q5-plot.mjs} .
NC_ROOT=<repo> node build-detail.mjs
```

**改了筆記第 2 題的數值就要重出這份**，否則會與作答版對不上（2026-10-31 就因為中途捨入，
筆記寫 635 mV、作答版寫 634 mV）。

## 另外

筆記裡的互動版第 5 題答案圖是 `src/components/generated/ec-week8-q5-transfer.tsx`，
與這裡的靜態 SVG 各自維護，數值與幾何刻意一致。
