# PDF 原始講義檢視 + 段落關聯（設計文件）

- 狀態：已與作者確認設計，待寫實作計畫
- 分類：架構型（新子系統）
- 相關現況：`docs/references/**/*.pdf` 目前放在專案根目錄、游離於 `notesDir` 之外

## 1. 動機

`docs/references/` 底下已經累積多份課程原始 PDF（投影片、儀器手冊），目前只能在檔案總管裡另外開啟，跟筆記內文完全脫節。目標是讓 NoteCraft：

1. **基礎**：能在網頁上直接翻閱這些原始 PDF，不必跳出瀏覽器。
2. **進階**：筆記段落旁能標出「這段對應 PDF 第幾頁」，點一下側邊就跳出對應頁面，讀者可以邊看筆記邊對照原文。

## 2. 範圍與非目標

**範圍內：**
- PDF 檔案的歸屬與服務機制（dev + 正式 build 都要能顯示）
- 段落 ⇄ PDF 頁碼的關聯標記語法與狀態機
- AI 輔助產生關聯建議的 subagent pipeline（延伸既有 `@ai-visualize` 架構慣例）
- 基礎瀏覽頁面（不依賴筆記標記，純瀏覽 PDF 庫）
- 進階檢視元件（頁碼跳轉、側邊抽屜）

**非目標（本期不做）：**
- PDF 全文搜尋（pagefind 目前只索引筆記正文，PDF 全文搜尋留待後續）
- 建議/駁回的 dev-only 一鍵按鈕（v1 先用手動改 MDX 欄位，跟 `@ai-visualize` 的 locked/failed 慣例一致）
- OCR（現有 PDF 都有可抽取文字層，用不到）
- 匯出 PDF 註記 / 高亮

## 3. 目錄結構與服務機制

### 3.1 檔案位置

PDF 一律放在 `<notesDir>/_references/**/*.pdf`。主專案（`NOTECRAFT_NOTES_DIR` 未設）即 `src/content/notes/_references/`，沿用現有「系列/週次」分層：

```
src/content/notes/
├── _references/
│   ├── 電子學實作系列/
│   │   └── 第一週/
│   │       ├── Ch 1 - Introduction to Microelectronics.pdf
│   │       ├── Ch 2 - Basic Physics of Semiconductors.pdf
│   │       ├── DSOX1200X_EDUX1052A_示波器使用者指南.pdf
│   │       ├── GDM-532_萬用電表使用手冊.pdf
│   │       ├── GPE-1326_2323_3323_4323_多輸出直流電源供應器使用手冊.pdf
│   │       ├── Contents.pdf
│   │       └── Syllabus_A.pdf
│   └── 機器學習實作系列/
│       └── 第1週-機器學習簡介.pdf
├── 電子學實作系列.mdx
└── ...
```

執行遷移：`git mv docs/references/* src/content/notes/_references/`，保留檔案歷史。

外部 viewer 模式（`NOTECRAFT_NOTES_DIR` 指向任意資料夾）沿用同一慣例：該資料夾底下的 `_references/` 就是它自己的 PDF 庫，不需要額外設定。

### 3.2 URL 慣例：`/notes-assets/<相對於 notesDir 的路徑>`

這是既有機制的延伸，不是新發明：

- `src/dev-api/handlers.mjs` 的 `/notes-assets/*` handler（`handleNotesAsset`）**已經**把 `.pdf` 列進 `MIME_MAP`，只是目前沒有任何呼叫端在用。dev 環境下（`astro dev`，不論主專案或外部 viewer 模式）PDF 直接透過這條路由讀取，零額外工。
- 正式 build（`output: "static"`，Netlify 部署）沒有 Function，這條 dev-only 路由不存在。因此新增一個 Astro 建置期 hook（掛在 `astro:build:done`，實作上可以放進 `src/dev-api/integration.ts` 既有的 integration 物件，或拆一個小的 `references-build-copy` 獨立 integration ——實作計畫階段再定），把 `<notesDir>/_references/**` 逐檔複製進 `<outDir>/notes-assets/**`，保留相對路徑。

前端（`PdfRefChip` / `PdfViewerDrawer` / `/references` 頁面）一律只認 `/notes-assets/<relpath>` 這個 URL 形式，不需要判斷 dev / build 模式。

## 4. `@ai-reference` 標記語法

```mdx
{/* @ai-reference
id: bjt-bias-1
file: _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf
page: 12
status: suggested
excerpt: 如圖 3-2 所示的偏壓電路
*/}
<PdfRefChip file="_references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf" page={12} client:visible />
```

欄位：

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `id` | 是 | kebab-case，同檔內唯一（重複比照 `@ai-visualize` 規則：標註錯誤、跳過該重複 id，不中止其他標記） |
| `file` | 是 | 相對於 notesDir 的路徑，指向 `_references/` 底下的 PDF |
| `page` | 是 | AI 建議或作者確認的頁碼（1-indexed，對應 PDF 實際頁碼） |
| `status` | 是 | `suggested` \| `confirmed` \| `locked` |
| `excerpt` | 選填 | AI 抽出的 PDF 該頁片段，供作者不用打開 PDF 也能快速判斷猜得準不準；`confirmed` 後可留可刪 |

### 狀態機

- **`suggested`**：AI 產生、尚未經人工確認。重跑規劃時允許被覆寫（更新 page / excerpt）或整段移除（若重新判斷該段不再需要關聯）。
- **`confirmed`**：作者手動把 `status: suggested` 改成 `confirmed`（可能同時修正 `page`），代表頁碼正確。重跑規劃時**跳過**，不覆寫。
- **`locked`**：作者手動標記，語意同 `@ai-visualize` 的 `locked`——永不覆寫，AI 連讀取比對都不需要考慮更新它。

沒有 `pending` / `failed` 狀態：這個標記不是作者手寫的空殼待補（跟 `@ai-visualize` 不同，作者不用先手動決定「這段該對哪份 PDF」），而是 AI 通篇比對後主動插入的建議；信心不足的段落**不插入標記**，不產生「失敗」的標記噪音。

## 5. Subagent Pipeline

延伸既有四階段架構的慣例，只新增一個 subagent，其餘用擴充的：

1. **note-scanner（擴充，仍 haiku / 唯讀）**：掃描時一併找出 `@ai-reference` 區塊，回報格式新增一節：

   ```
   ## PDF References
   | file | id | pdf file | page | status |
   | --- | --- | --- | --- | --- |
   ```

2. **pdf-reference-planner（新增，sonnet，Read / Glob / Grep / Bash）**：
   - 輸入：一篇（或多篇）筆記 + 其所屬系列/週次資料夾下 `_references/` 內的候選 PDF
   - 用 `pdfjs-dist` 的 Node legacy build（`pdfjs-dist/legacy/build/pdf.mjs`）逐頁抽取候選 PDF 的文字（透過 Bash 呼叫一段一次性 Node script，不依賴系統安裝 `poppler`/`pdftotext`——這樣跟前端渲染共用同一套依賴，作者機器不用額外裝東西）
   - 逐段比對筆記內文與 PDF 各頁文字的語意相關性，只對信心夠高的段落產出建議
   - 輸出「待寫回清單」：`{ file, paragraphAnchor, id, pdfFile, page, excerpt }[]`，格式比照 `visualize-planner` 交給 `component-generator` 的規劃書
   - 已有 `confirmed` / `locked` 標記的段落**不重新比對**

3. **mdx-writer（擴充，仍 haiku，Edit only）**：
   - 新增支援：在 `pdf-reference-planner` 指定的段落下方插入 `@ai-reference` 標記 + `<PdfRefChip ... client:visible />`
   - 手法比照現有插入 `GeneratedFrame` 的方式：檔案內已有 `PdfRefChip` import 就不重複插入
   - 對既有 `suggested` 標記，若規劃書要求更新 `page`/`excerpt`，用 Edit 原地覆寫；`confirmed`/`locked` 一律不得觸碰（規劃階段已過濾，這裡是第二道防線）

主 Agent 觸發方式與 `@ai-visualize` 一致：作者在 Claude Code 對話中明確要求（例如「幫這篇筆記的段落跟 references 建立 PDF 關聯」），不在 CI 自動跑。

## 6. 基礎瀏覽：`/references` 頁面

新增 `src/pages/references/index.astro`：

- 用一個純 Node 的 `src/lib/references.ts`（讀 `_references/` 目錄樹，不做成 Content Collection——二進位檔案不適合套 collection schema，寫法比照 `enrichNote` 那樣的輕量 fs 工具函式）在建置期掃出資料夾樹
- 畫面：系列 → 週次的巢狀分組卡片列表，每份 PDF 一張卡片（檔名、頁數、開啟按鈕）
- 點「開啟」直接觸發 `PdfViewerDrawer` 從第 1 頁開始看，不需要筆記裡有標記——這是滿足「基礎」需求（單純瀏覽原始 PDF）的入口
- 沿用 `notecraft-design` 的卡片 / 排版 token，不硬編樣式

## 7. 進階檢視元件

### 7.1 `PdfRefChip`（React island）

- 掛在筆記段落旁的小按鈕，樣式：`suggested` 用虛線外框（提示「AI 猜的，尚未確認」），`confirmed` 用實線外框
- 顯示 `📄 p.{page}`，hover 顯示 `excerpt`（若有）
- 點擊：`window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file, page } }))`——沿用 `ToastHost` 的「singleton host + CustomEvent」慣例（見 `src/components/islands/ToastHost.tsx`），不做 prop drilling / context

### 7.2 `PdfViewerDrawer`（React island，singleton）

- 掛在 `BaseLayout.astro`，緊鄰現有 `<ToastHost client:idle />` 旁（同一份 layout、同樣 `client:idle`）
- 監聽 `nc-pdf-open` 事件開啟自己，形式為**右側抽屜**（不是全螢幕 modal，讀者可以側邊看 PDF、同時筆記正文還在畫面上，跟 `VizZoom` 的全螢幕放大檢視是兩種不同機制，刻意不共用）
- 內部用 `pdfjs-dist` 把指定頁 render 成 `<canvas>`
- 控制列：上一頁 / 下一頁、頁碼輸入框（直接跳頁）、縮放 +/−、關閉（Esc 或按鈕）
- 樣式一律走 `notecraft-design` 的既有 token（間距、圓角、陰影、字級），不新增色碼
- 動畫（開關的滑入/滑出）預設 200–400ms ease-out，`useReducedMotion()` 尊重 `prefers-reduced-motion`（比照 CLAUDE.md 的 motion 元件慣例）

### 7.3 新增依賴：`pdfjs-dist`

- 不在現有元件白名單內，**已徵得作者同意**加入白名單（前端 `PdfViewerDrawer` + subagent 端的文字抽取都用它，一套依賴兩處共用）
- 需要處理 worker 檔案的打包路徑（pdfjs 需要指定 `pdfjs-dist/build/pdf.worker.min.mjs` 的 URL），實作計畫階段處理，需驗證 `astro build` 能正確把 worker 檔案打包進輸出

## 8. Build 驗證

- Pre-push hook 現有的 `astro build` 這關必須涵蓋：
  - 新增的 build hook 正確把 `_references/**` 複製進 `dist/notes-assets/**`
  - `PdfViewerDrawer` 引入 `pdfjs-dist` 後 `astro build` 不出錯（worker 路徑設定正確）
  - `/references` 頁面能正常產生靜態頁面

## 9. 風險與取捨

- **頁碼比對準確度**：AI 用文字語意比對猜頁碼，不是 100% 準——這正是為什麼有 `suggested` → `confirmed` 這道人工審核關卡，而不是像 `@ai-visualize` 那樣一次到位。
- **build hook 是新機制**：目前專案裡建置期複製任意檔案（而非透過 `public/` 或 Vite asset pipeline）是頭一次，需要在實作時仔細測試「主專案模式」與「外部 notesDir 模式」兩種路徑都正確。
- **v1 不做 dev-only 確認按鈕**：作者需要手動改 MDX 的 `status` 欄位，比較陽春，但跟現有 `@ai-visualize` 的 `locked`/`failed` 手動慣例一致，且省下一組新 API endpoint 的實作與維護成本。之後若手動改欄位的量大到困擾，可以再補。
