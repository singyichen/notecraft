# NoteCraft

以 Astro + MDX 為核心、由 AI 生成視覺化與動態互動元件並嵌入筆記的個人筆記 Web App。完整規格見 [docs/notecraft-prd.md](docs/notecraft-prd.md)。

## 技術棧

- **框架**：Astro 5 + `@astrojs/mdx`，輸出 `output: 'static'`
- **內容**：MDX 筆記放在 `src/content/notes/`，以 Content Collections 管理 frontmatter（title / description / tags / createdAt / updatedAt）
- **UI**：React（僅用於 AI 生成的互動元件）+ TailwindCSS
- **動畫 / 互動**：`motion`（Framer Motion，npm 套件名即 `motion`，**勿與舊 motion.js 混淆**）
- **圖表**：`recharts`（標準圖表）、`d3`（非標準）、手寫 SVG（流程 / 時序 / 架構圖優先）
- **原始講義檢視**：側邊抽屜是「副檔名 → 檢視器」註冊表（`src/lib/reference-kinds.ts` 管 build 期掃描，`src/components/islands/reference-viewers/` 管 client 端渲染）。PDF 用 `pdfjs-dist`（另有 Node legacy build 供 subagent 抽取頁面文字）、Word（`.docx`）用 `docx-preview`；兩者的重型依賴都在各自的檢視器模組內動態 import。新增格式要同時動這兩處
- **搜尋**：`pagefind`（build 階段索引）
- **部署**：Netlify 靜態部署，**無 Function、無執行時 API**
- **Node ^22.x、TypeScript**

## 目錄結構

```
src/
├── content/notes/              MDX 筆記原始檔
│   └── _references/             原始講義（PDF / Word，跟著 notesDir 走，dev/build 都以 /notes-assets/<相對路徑> 存取）
├── components/generated/        AI 生成的視覺化元件（一個 id 對應一個 .tsx）
├── components/wb/               Workbench 工作台的殼與各頁 island（Rail／Sidebar／Header／NotesWorkbench／Drawer／Palette…）
├── components/islands/          其他 React island（TagEditor、Toc、PluginHost、SeriesNav…）
├── layouts/WorkbenchLayout.astro  三欄工作台的殼，所有頁面共用（簡報頁例外）
├── lib/workbench.ts             工作台索引（build 期、模組層快取）；client-safe 型別在 lib/wb-types.ts
├── styles/workbench.css         工作台樣式（--wb-* token；規則裡不出現色碼字面值）
├── dev-api/                     dev-only API（handlers.mjs 供 astro dev 與 CLI 共用）
├── pages/
│   ├── api/                    dev-only API routes（POST /api/notes、tags 相關）
│   ├── wb-index.json.ts        build 期輸出 /wb-index.json，給 Palette 與 Dashboard Drawer 延遲載入
│   ├── references/             原始講義庫瀏覽頁（PDF / Word）
│   ├── notes/[...slug].astro   筆記檢視頁
│   ├── plugins/                Plugin 資料檔與已安裝外掛
│   └── settings.astro          設定與關於
└── ...
.claude/
├── agents/                     五個 Subagent 設定檔
│   ├── note-scanner.md
│   ├── visualize-planner.md
│   ├── component-generator.md
│   ├── mdx-writer.md
│   └── pdf-reference-planner.md
└── skills/
    └── content-visualize/SKILL.md
```

tsconfig path alias：`@/*` → `./src/*`、特別是 `@/components/generated/<id>` 用於 MDX 寫回的 import。

## AI 標記區塊（核心機制）

筆記中以 MDX 註解標記需 AI 處理的位置：

```mdx
{/* @ai-visualize
id: oauth-flow
type: diagram | chart | timeline | table | motion | free
prompt: |
  自然語言描述
status: pending | generated | locked | failed
*/}
```

處理流程由作者在 Claude Code 對話中觸發，依序由四個 Subagent 協作：

1. **note-scanner**（haiku, 唯讀）— 掃描 MDX 找出標記區塊、列出孤兒元件
2. **visualize-planner**（sonnet, 唯讀）— 依 `content-visualize-skill` 決策樹規劃方案
3. **component-generator**（sonnet, 可寫檔）— 寫元件到 `src/components/generated/<id>.tsx`，跑 `tsc --noEmit` + `astro build` 驗證，失敗自動修最多 3 次
4. **mdx-writer**（haiku, Edit only）— 在標記區塊下方寫入 `import` 與 JSX、更新 `status`

第二種標記，`@ai-reference`，標出筆記段落與 PDF 原始講義頁碼的關聯：

```mdx
{/* @ai-reference
id: bjt-bias-1
file: _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf
page: 12
status: suggested | confirmed | locked
excerpt: 如圖 3-2 所示的偏壓電路
*/}
<PdfRefChip file="_references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf" page={12} status="suggested" excerpt="如圖 3-2 所示的偏壓電路" />
```

標記註解與 `<PdfRefChip>` 是同一份狀態的兩種呈現——`page` / `status` 一律同步；作者手動修改註解的 `status`（例如 `suggested` → `confirmed`）時，下方 `<PdfRefChip status="...">` 也要在同一次編輯改成相同值，兩者不可不同步。

流程由 `note-scanner`（擴充）→ `pdf-reference-planner`（新增）→ `mdx-writer`（擴充）三個 subagent 協作：先掃描既有標記、比對段落與 PDF 頁面文字產出建議、寫回標記。`status` 沒有 `pending`/`failed`——AI 通篇比對後主動插入建議（`suggested`），信心不足的段落不插入標記；作者手動把 `status` 改成 `confirmed` 代表頁碼正確，`locked` 永不覆寫，重跑規劃時 `confirmed`/`locked` 一律跳過。完整設計見 docs/superpowers/specs/2026-09-12-pdf-reference-viewer-design.md。

### 處理規則

- `status: locked` 永不覆寫；`status: failed` 預設不重跑，除非作者調 prompt 後明確要求
- 同檔內 `id` 重複 → 標註錯誤、跳過該重複 id，**不中止其他標記**
- **孤兒元件**（標記已刪、元件還在）由 note-scanner 回報，**必須作者明確同意才可刪除**
- 驗證未通過前**不寫回 MDX**，避免引用到壞元件
- 只有含互動 / 動畫時加 `client:visible`；純靜態 SVG 不加
- `GeneratedFrame` 的元件本體外面那層 `data-nc-viz-body` 是「放大檢視」的搬移目標，**不可拿掉**（見 [VizZoom.tsx](src/components/islands/VizZoom.tsx)）
- `@ai-reference` 標記的 `status: confirmed`／`status: locked` 永不覆寫；重新規劃時只補新段落或更新既有 `suggested` 標記

### 元件白名單

允許 import：`react`、`motion`、`recharts`、`d3`、`clsx`、`tailwind-merge`、`lucide-react`（圖示）、專案內相對路徑。其他套件**先在對話中徵詢作者**。

### 視覺化選型（決策樹要點）

| Prompt 描述 | 採用方式 |
| --- | --- |
| 流程 / 時序 / 狀態機 / 架構 | 手寫 SVG（不引入函式庫） |
| 電路 / 電子元件示意圖 | 手寫 SVG，符號參考 `references/circuit-symbols.md`（不引入 tscircuit 等電路函式庫） |
| 有軸的量化資料 | recharts；非標準才用 d3 |
| 時間軸 / Gantt | 手寫 SVG |
| 含豐富欄位的比較表 | Tailwind `<table>`，不要做成 SVG |
| 動畫 / 互動 / scroll-driven | `motion`（Framer Motion） |
| 複合需求 | 組合上述，不要二選一 |

### 草稿輔助 Skill（`diagram-design` / `archify`）

`.claude/skills/diagram-design/`、`.claude/skills/archify/` 是兩個外部繪圖 Skill，可在對話中直接請 Claude 呼叫，快速畫出流程 / 架構 / 時序 / 狀態機圖的**獨立 standalone HTML 草稿**（含自己的配色系統與互動 viewer），方便在下筆前先確認節點、分支、標籤與版面是否合理，或用於 `docs/` 底下的專案文件配圖。

- **不可**當作 `@ai-visualize` 標記的最終產出：兩者輸出都是 standalone HTML（內建自己的 CSS/JS/配色系統），不是 `.tsx`，無法被 `mdx-writer` 以 `import` 寫回 MDX，也不遵循 `notecraft-design` 的 token。
- 嵌入筆記的視覺化仍必須照舊流程走：note-scanner → visualize-planner → component-generator → mdx-writer，由 component-generator 依決策樹手寫 SVG／`recharts`／`motion` 並跑 `tsc` + `astro build` 驗證。
- 用途僅限：author 本機草稿預覽、複雜流程圖的佈局試錯、或專案文件（非筆記 MDX）配圖。

### 樣式規範

色票、字級、間距、圓角、陰影一律遵循 **`notecraft-design` Skill**（上游 TrendLink DS 的 blue/orange 配色，字體則保留本專案的 Crimson Pro + Inter；見 `.claude/skills/notecraft-design/SKILL.md`）。生成元件前先讀取其 SKILL.md 與 `src/styles/tokens.css`，優先使用既有 token / CSS 變數，**不要硬編碼色碼**。僅在 prompt 明確要求跳脫設計系統時例外，並在對話中說明。

## Workbench 工作台（v1.0.0）

殼是 Rail 52 + Sidebar 240 + 主區（Header／Toolbar 40／Body），**整頁不捲動**，只有 `#nc-scroll.wb-body` 與 Sidebar 內部捲動。
完整設計見 [docs/notecraft-workbench.md](docs/notecraft-workbench.md)，像素級規格在 `docs/prototype/design_handoff_workbench/`。

- **殼的切分**：能在 build 期畫完的用 `.astro`（Rail、Sidebar 樹、靜態頁首）；Header Tab／Toolbar／Body／Drawer 是同一份 state 的頁面
  （`/notes`、Dashboard、`/plugins`、`/settings`）由**同一個 island** 渲染，layout 以 `bare` 掛它；只有 Toolbar 與 Body 由 island 輸出的用 `bareBody`
- **`id="nc-scroll"` 不可拿掉**：`Toc`、筆記頁 inline script 靠它找捲動容器。island 自己輸出 Body 時也要帶這個 id
- **列的 DOM 規則**：單擊開 Drawer 的列是容器，內含並排的 `<button class="wb-row-main">` 與常駐的 `<a class="wb-row-open">`，**連結不可包在按鈕裡**；
  單擊即導覽的列（系列、標籤、資料檔）整列是 `<a>`
- **資料夾與顯示用路徑一律來自真實檔案路徑**（`WbNoteRow.path`），不是會被 slug 化的 `entry.id`；`?folder=` 的值也是真實路徑。slug 只用於 `/notes/<slug>` 與 localStorage key
- **本機絕對路徑不得出現在任何輸出的 HTML／JSON**（`/wb-index.json` 序列化後若含 cwd 會直接 throw）。唯一例外是 dev-only 的 `vscode://` 連結
- **相對於「今天」的量在瀏覽器算**（`lib/wb-time.ts`，當地時區），SSR 以「—」佔位；靠 localStorage 的東西（閱讀進度、收藏、偏好）SSR 一律當作沒有
- 篩選全在 query string（`?folder=`、`?series=`、`?tag=`、`?pending=1`、`?fav=1`、`?view=`），island 內切換用 `history.replaceState`；分組與搜尋字串不進網址
- `Escape` 走 `lib/wb-escape.ts` 的共用堆疊（Palette → Modal → Drawer → Sidebar 抽屜），浮層不要各自掛 keydown
- 樣式規則只引用 `--wb-*` token；DS 沒有的七個值集中在 `workbench.css` 開頭

## Plugin System（v0.6.0）

讓結構化 JSON 資料檔被「可安裝的渲染器」畫成頁面。與 `@ai-visualize` 的分界：
**同一種形狀的資料會反覆出現 → plugin；只為這一段文字服務 → `@ai-visualize`。**

完整設計見 [docs/notecraft-plugin-system.md](docs/notecraft-plugin-system.md)。

```
<專案根>/.notecraft/
├── plugins.json                    映射：哪些檔案交給哪個 plugin
└── plugins/
    ├── _types.d.ts                 安裝時產生，供 renderer 取 PluginRendererProps
    └── <id>/
        ├── notecraft-plugin.json   身分證（id / title / version / dataSchema / engines）
        ├── renderer.tsx            入口，檔名固定
        └── schema.json             資料的 JSON Schema
```

### 幾條不會變的規則

- **`plugins.json` 頂層 `disabled: string[]`**（v1.0.0）：停用的 plugin 其所有規則在比對前就略過、等同不存在，也不參與安裝檢查（壞掉的 plugin 先停用，站仍 build 得出來）。停用不是解除安裝，renderer 仍在 client chunk
- **`meta.backTo` 是 app 層約定的第三個 meta 欄位**（與 `meta.title`、`meta.description` 並列）：「回到來源筆記」的站內路徑，只接受單一 `/` 開頭，不符者忽略並 warn
- **入口固定 `renderer.tsx`**，manifest 不放 `entry`；吃哪些檔完全由 `plugins.json` 的 `files` 決定，manifest 也不放 `accepts`
- **`files` 的基準是 notesDir** —— 資料檔必須放在筆記資料夾內；不允許比對 `.md` / `.mdx`
- **一檔被多條規則命中 → 第一條勝**，build 印 warn
- **失敗一律 build fail**（plugin 未裝、JSON 壞、schema 不符）。只有「渲染器在瀏覽器 throw」才走錯誤卡片
- **plugin 只能 import 既有白名單**（與 AI 生成元件共用 `src/lib/generated-component-whitelist.ts`），安裝時就擋、不拖到 build
- **資料一律 inline 成 island props**；超過 256 KB 印警告（注意 Astro 的 props 編碼會讓 HTML 約為 JSON 的 3 倍）

### 渲染器要透過 `PluginHost` 掛載

**不要**從 `getPlugins()` 取出元件直接掛 `client:load` —— build 會以 `NoMatchingImport` 失敗。
Astro 的 hydration 指令要在編譯期就知道元件來自哪個模組。渲染器的 glob 在
`src/components/islands/PluginHost.tsx` 裡（會進 client chunk），
`src/lib/plugins.ts` 只做 build 期解析（它用 `node:fs`，不能進 client）。
既有的簡報頁是同一個形狀。

### 系列

章節識別碼可以是筆記 slug，也可以是 `view:<路徑去副檔名>`。兩者一視同仁：有序號、
計入進度分母、可標記已完成。**閱讀進度的 localStorage key 用未經轉換的識別碼原字串**
（含 `view:` 前綴），否則筆記 `a/b` 與資料檔 `view:a/b` 會撞同一格。

### 官方 store

repo 根目錄的 `plugins/`，隨 GitHub 發佈 —— **推上預設分支就等於發佈**。
因此 `npm run check-plugins` 是必要的護欄：驗 manifest、registry 無漂移、
example 通過自己的 schema，並實際配 example 資料 build 一次。`prepublishOnly` 會跑它。

## dev-only API（僅 `astro dev` 期間存在，build 時不輸出）

- `POST /api/notes` — 新增筆記（建檔 + 預設 frontmatter + AI 標記範本）
- `GET /api/tags` — 全站標籤統計
- `PUT /api/tags/:old` — 重新命名標籤（合併語意：若新名稱已存在則自動去重）
- `DELETE /api/tags/:tag` — 從所有 MDX 移除該標籤
- `PUT /api/notes/:slug/tags` — 替換單篇筆記標籤
- `DELETE /api/notes/:slug` — 刪除筆記（連帶處理未被其他筆記引用的生成元件）
- `GET /api/folders` — notesDir 底下所有層的資料夾（遞迴），供新增筆記的下拉選單
- `PUT /api/plugins/:id` body `{ enabled }` — 增刪 `.notecraft/plugins.json` 頂層 `disabled` 陣列的元素；只動這個鍵、保留作者排版

**所有 endpoint 僅綁定 `localhost`**。寫入後受影響 MDX 的 `updatedAt` 都要更新。

### 標籤字串規範

trim 前後空白 → 過濾空字串 → 同篇內不分大小寫去重（保留首次出現的大小寫）。

## dev / 正式環境差異

下列功能**僅在 dev 環境顯示**，Netlify 正式環境完全隱藏：

- 「+ 新增筆記」按鈕（每頁頁首）
- 筆記頁首的「⋯」選單整顆：以 VS Code 編輯（`vscode://file/{絕對路徑}`）、重新生成提示（複製對話範本到剪貼簿）、刪除筆記
- Drawer 的「複製生成提示」與無 deck 時的「生成簡報」
- 筆記檢視頁的標籤 chip 編輯 UI
- `/tags` 頁面的重新命名 / 刪除控制
- `/plugins` 的啟用／停用 Switch（正式環境只留 pill）

判定方式：`import.meta.env.DEV`。（舊文件提到的 `LOCAL_EDIT=1` build 旗標在程式碼裡並不存在，2026-09-22 更正。）

## 工作慣例

- AI 視覺化**不在 CI 階段執行**，僅由作者於本機 Claude Code 對話觸發，產出隨原始碼一起 commit
- Dashboard 統計於 `astro build` 階段透過 Content Collections 預計算為 JSON，**無執行時 API**
- 元件強制 TypeScript（`.tsx`），禁用 `any`（除非註解說明理由），不可有 required props
- motion 元件預設 200–400ms ease-out，並用 `useReducedMotion()` 尊重 `prefers-reduced-motion`
- **pre-push hook 會跑 `tsc --noEmit` + `astro build`**（`.git/hooks/pre-push`，2026-09-24 建立；動到 `plugins/` 時額外跑 `npm run check-plugins`）。hook 不進版控，重新 clone 後要自己補。確定要推半成品時用 `git push --no-verify` 繞過
- **改動 `src/lib/remark-*.ts` 或 `astro.config.mjs` 後必須重啟 `astro dev`**：remark plugin 在 dev server 啟動時只實例化一次，不走 HMR（CSS 走 HMR，所以樣式會照常更新，更容易誤導）。未重啟時新指令會掉進 `revertDirective()` 的安全網，在內文顯示為字面 `:::xxx` 加一份原生清單，但 `astro build` 的產物是正確的——**只驗 `dist` 不會發現**，要驗 dev 端就 `curl` 該筆記網址比對（2026-09-25 加入 `:::choices` 時踩到）
- 筆記正文一律**以中文撰寫為主**，英文只在專有名詞第一次出現時以括號附在對應中文名詞後面，例如「導通電壓（knee voltage）」「順偏（forward bias）」；整理講義、投影片、Lab 手冊的目標／步驟／結論時直接用中文改寫，**不要把英文原句整句（尤其是粗體）放在前面再接中文翻譯**，也不要寫成「**English term（中文）**」這種英文在前的順序。縮寫（ENIAC、BJT、LED）、例題編號（`Example 2-3`）、軟體介面上的按鈕與選單名稱（`Start Simulation`）維持原文。術語譯名用台灣慣用寫法：knee voltage 寫「導通電壓」（不用「膝點」）、順偏／逆偏、空乏區、崩潰、漣波、整流器、穩壓器。寫回前跑自檢，兩條都應為 0（例外只剩上述縮寫與介面名稱）：`grep -nP '\*\*[A-Za-z][A-Za-z0-9 ,;:/&()\x27-]{15,}\*\*\s*[\p{Han}]' <筆記路徑>`（英文長句粗體後接中文）與 `grep -nP '\*\*[A-Za-z][A-Za-z -]*（[\p{Han}]' <筆記路徑>`（英文術語在前、中文在括號內）
- **粗體的 `**` 會在兩種情形下靜默失效**，整段照字面輸出 `**文字**`，而 `astro build` 與 KaTeX 檢查都抓不到：（a）收尾 `**` 前面是標點、後面直接接中文，例如 `**導通電壓（knee voltage）**是…`；（b）開頭 `**` 前面是中文、後面直接接標點，例如 `是**「引文」**` 或 `中文**$x$ 說明**`。依據是 CommonMark 的 flanking 規則（`**` 前是標點時後面須接空白或標點才能收尾，反之亦然）。多組連續出現時，失效的標記還會被下一組頂替，造成整段 bold 範圍位移一格。修法：把標點移到粗體外（`**「x」**` → `「**x**」`、`路線。**所以` → `路線**。所以`），或在該側補一個半形空格。
- **自檢一律用 `npm run check-bold`**（`scripts/check-bold.mjs`，邏輯在 `src/lib/bold-lint.ts`，有 18 個單元測試）。它實際做一次 flanking 判定與配對，並自動略過圍欄程式碼、行內程式碼、JSX 標籤與 `@ai-*` 標記區塊，輸出 `檔案:行號`。**不要再用單純的 grep**：`grep -noP '[)）]\*\*(?!…)'` 這類寫法在行尾會大量誤報（行尾等同空白，是合法收尾），又抓不到 `。**` 這類非括號標點與上述 (b) 的開頭失效——實測 36 個命中裡 33 個是偽陽性。任何一次寫入或改寫筆記正文後，寫回前都跑一次。
- 筆記正文（非 `@ai-visualize` 生成元件）若要並列 3 個以上「名稱＋定義＋範例」的平行項目，改用 Markdown 表格，不要在同一段塞多組 `**粗體**`。
- 筆記正文出現數學／物理／化學公式與計算推導時，一律用 KaTeX（已接好 `remark-math` + `rehype-katex`）呈現，多步驟推導要獨立成 `$$...$$`（`aligned`）區塊，不要塞進同一句話裡用行內小字或反引號 unicode 上下標湊合，細節與換算對照見 `math-formula-notation` Skill
- 生成或改寫「機器學習實作系列」任一篇筆記的正文內容時，一律參考 `.claude/skills/hung-yi-lee/SKILL.md` 及其 `wiki/`（機器學習概念的直覺講法、常見誤解、跨主題關聯的知識背景）來補充概念說明的深度與正確性；**只借知識背景，不套用其講課口語語感**，寫出來的文字仍維持筆記既有的精確、表格／公式導向風格。`wiki/` 內容是逐字稿自動抽取／推論而成（EXTRACTED／INFERRED 邊不保證準確），僅作靈感與交叉檢查，技術正確性以課本／原始講義為準，不直接當權威引用；作業本身的資料與實驗結果不在其知識範圍內。此規則不影響 `@ai-visualize`／`@ai-reference` 標記與元件生成流程的技術規則
- 整理「電子學實作系列」的實驗講義（`App_LabN.pdf`）、要在 CircuitJS／Tinkercad／LTspice 模擬課程電路、或作者提到預報／結報／實驗數據記錄時，一律走 `lab-workflow` Skill（`.claude/skills/lab-workflow/SKILL.md`）：講義逐頁詳解放講義週筆記、實驗手冊放實驗週筆記，每個實驗固定「CircuitJS 看懂 → Tinkercad 預演 → LTspice 預報 → 實測結報」，網表與電路文字檔放 `simulations/<lab>/`，共用工具在 `simulations/tools/`；Tinkercad 的每張接線圖都要再產一張**電流分析圖**（原圖不覆蓋、輸出加 `-current` 後綴），畫法見該 skill 的 `references/current-path-overlay.md`
- 解釋、新增或改寫「電子學實作系列」任一篇筆記的概念說明（物理定義、原理、公式來源、地基段落、關鍵定義表），或在對話中回答作者的電子學／半導體物理問題時，一律先讀 `.claude/skills/electronics-foundation/SKILL.md` 及其 `references/`（八個物理原始概念、電子學↔數學對照、從 Boltzmann 因子到二極體方程式的推導鏈、數學背景讀者的常見誤解與常數表）。作者是數學系畢業、未修過普通物理與電路學，解釋要依該 skill 的輸出契約：前提盤點 → 數學對應 → 實際推導（display math）→ 因次檢查 → 一題自測；只借物理知識背景，文字仍維持筆記既有的精確、表格／公式導向風格。技術正確性以教材原文為準。此規則不影響 `@ai-visualize`／`@ai-reference` 標記與元件生成流程的技術規則

## 待釐清項已收斂的決策

（PRD 中標 `[x]` 者，作為實作依據）

- VS Code 編輯按鈕在正式環境**完全隱藏**
- 新增筆記表單**不**讓使用者指定 AI 標記的 `type`，預設 `free`
- **保留** `npm run new-note` CLI 與按鈕共用建檔邏輯
- AI 生成元件強制 **TS（.tsx）**
- `type` 欄位列舉為**提示**，允許 `free`
- AI **不**在 Netlify CI 自動執行
- 白名單外套件**需先徵詢作者同意**才能 import
- Subagent 模型**寫死建議值**（haiku / sonnet），不用 `inherit`
- note-scanner / mdx-writer **獨立成 Subagent**
- **不**提供「新增空標籤」；**不**做軟刪除 / undo（依靠 git 復原）
- `references/svg-patterns.md` 等 Skill 參考檔初版**先不提供**，待累積案例後再回填（`references/circuit-symbols.md`、`references/motion-patterns.md` 已因實際案例回填，格式可作為後續回填其他參考檔的範本）
