# NoteCraft

以 Astro + MDX 為核心、由 AI 生成視覺化與動態互動元件並嵌入筆記的個人筆記 Web App。完整規格見 [docs/notecraft-prd.md](docs/notecraft-prd.md)。

## 技術棧

- **框架**：Astro 5 + `@astrojs/mdx`，輸出 `output: 'static'`
- **內容**：MDX 筆記放在 `src/content/notes/`，以 Content Collections 管理 frontmatter（title / description / tags / createdAt / updatedAt）
- **UI**：React（僅用於 AI 生成的互動元件）+ TailwindCSS
- **動畫 / 互動**：`motion`（Framer Motion，npm 套件名即 `motion`，**勿與舊 motion.js 混淆**）
- **圖表**：`recharts`（標準圖表）、`d3`（非標準）、手寫 SVG（流程 / 時序 / 架構圖優先）
- **PDF 檢視**：`pdfjs-dist`（瀏覽器端側邊抽屜檢視器 + Node legacy build 供 subagent 抽取頁面文字）
- **搜尋**：`pagefind`（build 階段索引）
- **部署**：Netlify 靜態部署，**無 Function、無執行時 API**
- **Node ^22.x、TypeScript**

## 目錄結構

```
src/
├── content/notes/              MDX 筆記原始檔
│   └── _references/             原始 PDF 講義（跟著 notesDir 走，dev/build 都以 /notes-assets/<相對路徑> 存取）
├── components/generated/        AI 生成的視覺化元件（一個 id 對應一個 .tsx）
├── pages/
│   ├── api/                    dev-only API routes（POST /api/notes、tags 相關）
│   ├── references/             PDF 講義庫瀏覽頁
│   └── notes/[slug].astro      筆記檢視頁
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

第二種標記，`@ai-reference`，標出筆記段落與 PDF 原始講義頁碼的關聯：

```mdx
{/* @ai-reference
id: bjt-bias-1
file: _references/電子學實作系列/第一週/Ch 1 - Introduction to Microelectronics.pdf
page: 12
status: suggested | confirmed | locked
excerpt: 如圖 3-2 所示的偏壓電路
*/}
```

流程由 `note-scanner`（擴充）→ `pdf-reference-planner`（新增）→ `mdx-writer`（擴充）三個 subagent 協作：先掃描既有標記、比對段落與 PDF 頁面文字產出建議、寫回標記。`status` 沒有 `pending`/`failed`——AI 通篇比對後主動插入建議（`suggested`），信心不足的段落不插入標記；作者手動把 `status` 改成 `confirmed` 代表頁碼正確，`locked` 永不覆寫，重跑規劃時 `confirmed`/`locked` 一律跳過。完整設計見 docs/superpowers/specs/2026-09-12-pdf-reference-viewer-design.md。

處理流程由作者在 Claude Code 對話中觸發，依序由四個 Subagent 協作：

1. **note-scanner**（haiku, 唯讀）— 掃描 MDX 找出標記區塊、列出孤兒元件
2. **visualize-planner**（sonnet, 唯讀）— 依 `content-visualize-skill` 決策樹規劃方案
3. **component-generator**（sonnet, 可寫檔）— 寫元件到 `src/components/generated/<id>.tsx`，跑 `tsc --noEmit` + `astro build` 驗證，失敗自動修最多 3 次
4. **mdx-writer**（haiku, Edit only）— 在標記區塊下方寫入 `import` 與 JSX、更新 `status`

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

色票、字級、間距、圓角、陰影一律遵循 **`notecraft-design` Skill**（改編自 label-suite 的 indigo/emerald 配色系統，見 `.claude/skills/notecraft-design/SKILL.md`）。生成元件前先讀取其 SKILL.md 與 `src/styles/tokens.css`，優先使用既有 token / CSS 變數，**不要硬編碼色碼**。僅在 prompt 明確要求跳脫設計系統時例外，並在對話中說明。

## dev-only API（僅 `astro dev` 期間存在，build 時不輸出）

- `POST /api/notes` — 新增筆記（建檔 + 預設 frontmatter + AI 標記範本）
- `GET /api/tags` — 全站標籤統計
- `PUT /api/tags/:old` — 重新命名標籤（合併語意：若新名稱已存在則自動去重）
- `DELETE /api/tags/:tag` — 從所有 MDX 移除該標籤
- `PUT /api/notes/:slug/tags` — 替換單篇筆記標籤

**所有 endpoint 僅綁定 `localhost`**。寫入後受影響 MDX 的 `updatedAt` 都要更新。

### 標籤字串規範

trim 前後空白 → 過濾空字串 → 同篇內不分大小寫去重（保留首次出現的大小寫）。

## dev / 正式環境差異

下列功能**僅在 dev 環境（或 build 帶 `LOCAL_EDIT=1`）顯示**，Netlify 正式環境完全隱藏：

- 「+ 新增筆記」按鈕
- 「以 VS Code 編輯」按鈕（`vscode://file/{絕對路徑}`）
- 「在 Claude Code 中重新生成」提示按鈕（點擊複製對話範本到剪貼簿）
- 筆記檢視頁的標籤 chip 編輯 UI
- `/tags` 頁面的重新命名 / 刪除控制

判定方式：`import.meta.env.DEV` 或 build 時的 `LOCAL_EDIT` 旗標。

## 工作慣例

- AI 視覺化**不在 CI 階段執行**，僅由作者於本機 Claude Code 對話觸發，產出隨原始碼一起 commit
- Dashboard 統計於 `astro build` 階段透過 Content Collections 預計算為 JSON，**無執行時 API**
- 元件強制 TypeScript（`.tsx`），禁用 `any`（除非註解說明理由），不可有 required props
- motion 元件預設 200–400ms ease-out，並用 `useReducedMotion()` 尊重 `prefers-reduced-motion`
- Pre-push hook 跑 `astro build` 確保生成元件可成功 build
- 筆記正文（非 `@ai-visualize` 生成元件）若要並列 3 個以上「名稱＋定義＋範例」的平行項目，改用 Markdown 表格，不要在同一段塞多組 `**粗體**`——已知 remark 在多組粗體被全形標點緊貼（中間無空格，如 `**A**：**B**...**C**`）時，只有第一組會正確轉譯成 `<strong>`，其餘會照字面輸出 `**文字**`

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
- `references/svg-patterns.md` 等 Skill 參考檔初版**先不提供**，待累積案例後再回填
