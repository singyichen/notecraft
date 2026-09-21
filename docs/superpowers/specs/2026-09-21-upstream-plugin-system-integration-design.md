# 上游 Plugin System 整合（設計文件）

- 狀態：已與作者確認整合方向，待作者審閱書面規格
- 分類：架構型（既有上游子系統整合）
- 上游共同祖先：`5e3e1c3346a9b55910312c430d05b36f60a00236`
- 上游目標：`9e2f11ab225a8d68c077f6271cfd59e98f417ca7`
- 本地基線：整合開始時的 `main`

## 1. 目標

把原作者 NoteCraft v0.6.0 的 Plugin System 與後續 ER Diagram 無限畫布整合進目前的個人化版本，同時保留本地已完成的 PDF 講義檢視、KaTeX、線上編輯器、課程筆記與現有設計系統。

整合完成後，專案應具備：

1. 結構化 JSON 資料檔可由 renderer plugin 產生 `/view/<path>` 頁面。
2. 資料檔可出現在資料列表、筆記列表及系列章節中。
3. CLI 可列出、安裝、移除與設定 plugin。
4. 官方 `er-diagram-renderer` 可安裝使用，並具備拖曳、縮放、還原與 `canvasHeight`。
5. 未設定 plugin 時，不影響既有筆記網站的 build 與使用方式。

## 2. 整合邊界

### 2.1 納入

- v0.6.0 Plugin System 的 runtime、CLI、schema、官方 plugin、文件與驗證腳本。
- `/view` 資料檔列表與詳細頁。
- 筆記／資料檔混排與系列整合。
- `GeneratedFrame`、`VizZoom` 對 plugin 標示的支援。
- `ajv`、`picomatch`、`@types/picomatch` 依賴。
- `check-plugins` 與 `prepublishOnly` 的 plugin 驗證。
- ER Diagram Renderer v1.1.0 的無限畫布更新。

### 2.2 不納入

- 不加入上游示範資料 `src/content/notes/schema-demo.er.json`。
- 不加入會立即啟用示範 plugin 的 `.notecraft/plugins.json`。
- 不改寫、刪除或搬移任何現有課程筆記、PDF、圖片或模擬資料。
- 不趁機重構 Plugin System 以外的現有功能。
- 不自動安裝任何第三方 plugin，也不執行其程式碼。

### 2.3 保留本地功能

- `/references` 講義入口與側邊欄項目。
- `PdfViewerDrawer`、`PdfRefChip` 與 notes assets build copy。
- KaTeX、`remark-math`、`rehype-katex`。
- GitHub 線上編輯器與相關設定。
- 本地 `notecraft-design` token、課程寫作規範與 Skills。
- Node engine 下限 `>=22.13.0`。

## 3. 採用方法

### 3.1 選擇：在隔離 worktree 合併上游，再做明確排除

先在隔離 worktree 將原作者 `main` 合併至整合分支，保留完整上游提交關係；解決五個文字衝突後，再明確移除 demo 設定與 demo 資料。這樣未來仍可辨認哪些內容來自上游，也能繼續比較或合併後續更新。

### 3.2 未採用方案

- **整包直接合併到目前 `main`**：會把 demo 資料帶進個人筆記站，而且在工作樹存在使用者進行中修改時風險較高。
- **逐檔複製 Plugin System**：短期可避開 merge conflict，但會失去上游歷史，容易漏掉跨檔案契約，未來也更難再同步。
- **只 cherry-pick 單一功能提交**：Plugin System 與 ER 畫布後續提交具有連續依賴，仍需處理相同衝突，卻讓 ancestry 更難追蹤。

## 4. 衝突解法

### 4.1 `package.json` 與 `package-lock.json`

- package dependencies 取聯集：保留本地 PDF／數學／線上編輯相關依賴，加上 `ajv`、`picomatch`、`@types/picomatch`。
- 保留本地較嚴格的 Node engine `>=22.13.0`。
- package `files` 同時包含本地 `scripts/pdf-extract-text.mjs` 與上游 `plugins/`。
- `prepublishOnly` 採 `npm run sync-skill && npm run check-plugins`。
- `package-lock.json` 不手動拼接；以合併後的 `package.json` 重新產生。

### 4.2 `Icon.astro`

保留本地 `file`，加入上游 `database`、`fileJson`、`plug`、`alert`，`Name` union 與 `paths` 必須一一對應。

### 4.3 `Sidebar.astro`

`current` 同時接受 `references` 與 `data`；導覽同時顯示「講義 References」與「資料 Data」，保留本地視覺樣式。

### 4.4 `BaseLayout.astro`

- `current` 同時接受 `references` 與 `data`。
- 保留 KaTeX CSS 與全域 `PdfViewerDrawer`。
- 加入上游 `bleed?: boolean`；只有資料檔詳細頁使用滿版內容，其他頁仍走原本 1120px 版心。

### 4.5 自動合併後的語意檢查

- `CLAUDE.md`：本地課程／PDF 規範與 Plugin System 規範都保留，避免重複或矛盾。
- `src/pages/notes/[...slug].astro`：同時保留線上編輯器與 plugin-aware 系列導覽。
- `src/lib/series.ts` 與系列 React 元件：確認 note slug 與 `view:` data ref 的 localStorage key 不互撞。

## 5. Plugin 啟用與內容邊界

Plugin System 程式碼可以存在，但沒有 `.notecraft/plugins.json` 時必須保持零成本停用：

- 不掃描或顯示任何資料檔。
- `/view` 顯示空狀態，不造成 build failure。
- 側邊欄保留「資料 Data」入口，作為功能入口；不自行建立設定檔。
- 使用者日後明確執行 `notecraftapp install-plugin ... --apply ...` 才建立安裝內容與 mapping。

官方 `plugins/er-diagram-renderer/` 是套件提供的 store 內容，不等同於在目前筆記站啟用；只要沒有 mapping，就不渲染使用者資料。

## 6. 安全模型

- 保留上游「安裝等於信任」模型，不宣稱 plugin 有執行期 sandbox。
- 安裝前仍需確認；`--yes` 僅供使用者明確選用的非互動環境。
- 保留 import 白名單、禁止 `dangerouslySetInnerHTML`、路徑逃脫防護、可接受副檔名與 engine 檢查。
- 本次整合不下載或安裝任何第三方 renderer。

## 7. 測試策略

### 7.1 基線

在隔離 worktree、尚未合併上游前執行目前專案既有測試、typecheck 與 build；若基線失敗，先區分既有問題與整合引入問題。

### 7.2 自動化驗證

- 既有 Node／TypeScript 測試全部通過。
- `npm run typecheck`。
- `npm run build`。
- `npm run check-plugins`。
- package tarball 檔案清單包含 Plugin System runtime、官方 plugins 與本地 PDF extract script。

若上游核心行為缺少測試，先加入能在合併前失敗、合併後通過的最小整合測試，至少涵蓋：

- 無 `.notecraft/plugins.json` 時回傳空 plugin/data 集合。
- mapping 命中 JSON 檔時可解析 metadata、route path 與 renderer。
- 不相容或缺少 plugin 時產生明確錯誤。
- 系列 ref 能區分筆記 slug 與 `view:` data ref。

### 7.3 回歸檢查

- `/notes/<slug>`：線上編輯器仍存在，系列導覽正常。
- `/references`：PDF 列表與 Drawer 正常。
- `/view`：未啟用時為空狀態。
- 暫時建立測試 mapping 時：資料列表、資料詳細頁、系列與 ER 無限畫布皆可 build。
- 一般頁面仍受 1120px 版心限制，只有資料詳細頁使用 bleed。

## 8. Git 與交付

- 使用獨立整合分支與 worktree，不直接在目前 `main` 解衝突。
- 不帶入目前工作樹中尚未提交的使用者修改。
- 先提交上游合併與衝突解決，再提交 demo 排除／本地適配與測試，讓 review 能分辨來源。
- 不自動 push、不建立 PR；完成驗證與 code review 後交由作者決定如何併回 `main`。

## 9. 完成條件

1. Plugin System 與 ER 畫布程式碼已納入。
2. 五個文字衝突依本文件規則解決。
3. 所有本地功能保留且驗證通過。
4. 沒有 `schema-demo.er.json` 與預設 `.notecraft/plugins.json`。
5. 未設定 plugin 時既有站點仍可 build。
6. 設定測試 plugin 時可 build 並產生 `/view` 頁面。
7. 自動化測試、typecheck、build、plugin validation 都通過。
8. 變更經獨立 code review，Critical／Important 問題已處理。
