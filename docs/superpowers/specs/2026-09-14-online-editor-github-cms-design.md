# 線上編輯（Git-based CMS）設計文件

- 狀態：已與作者確認設計，待寫實作計畫
- 分類：架構型（新子系統，涉及瀏覽器端寫入 GitHub 的新能力）
- 相關現況：目前「編輯筆記」只能透過本機 `astro dev`（dev-only API，僅綁 `localhost`）或「以 VS Code 編輯」按鈕（`vscode://file/...`），兩者都要求作者人在自己電腦前，正式站（Netlify 靜態部署）完全沒有寫入能力

## 1. 動機

`notecraftapp` 是已發布到 npm 的開源 CLI 工具（`SteveLin100132/notecraft`），使用者（含這個 fork：`singyichen/notecraft`）用它產生自己的靜態筆記站並部署到 Netlify。目前若想改筆記內文，一定要回到本機開 `astro dev` 或用編輯器直接改檔——出門在外用手機、或臨時想改個錯字時完全沒辦法。目標是讓已部署上線的筆記站本身，能直接編輯筆記內文並發布，不需要額外架設任何伺服器。

## 2. 範圍與非目標

**範圍內：**

- 正式站筆記檢視頁新增「線上編輯」模式：編輯 MDX body（純文字），發布時直接 commit 到 GitHub `main` 分支
- 一次性設定畫面：GitHub repo（`owner/name`）、branch、fine-grained PAT，存於瀏覽器 `localStorage`
- 發布前的標記/元件安全檢查（比對 `@ai-visualize` / `@ai-reference` id 與 generated component import 有沒有被誤刪）
- 用 GitHub Contents API 的 `sha` 做樂觀鎖，擋掉「編輯期間內容已被別處更新」的情況
- 通用化：不寫死任何特定 repo，讓其他 `notecraftapp` 使用者也能各自設定使用

**非目標（本期不做）：**

- 編輯 frontmatter（title / tags / description / 日期）——仍留在本機 dev-only API
- 線上新增筆記
- 線上觸發 `@ai-visualize` / `@ai-reference` 的 AI 生成 pipeline（這些仍只能在本機 Claude Code 對話中觸發，符合 CLAUDE.md「AI 不在 Netlify CI/正式站自動執行」的既有原則）
- 即時多人協作編輯、離線草稿同步
- commit 前開 PR 讓人 review（作者已選擇直接 commit 到 `main`）
- GitHub App / OAuth App 完整授權流程（會需要常駐後端做 token exchange，違背「無 Function」架構；本期只用作者自行簽發的 fine-grained PAT）

## 3. 整體架構與資料流

```text
瀏覽器（正式站筆記頁）
  │ 1. 編輯 MDX body
  │ 2. 按「發布」
  ▼
GitHub REST API（api.github.com，瀏覽器直接呼叫，帶 Authorization: Bearer <PAT>）
  │ GET  /repos/{owner}/{repo}/contents/{path}?ref={branch}   → 拿目前內容 + sha
  │ PUT  /repos/{owner}/{repo}/contents/{path}                → 帶新內容 + 同一個 sha + commit message
  ▼
GitHub 收到 commit（main 分支）
  │ webhook
  ▼
Netlify 偵測到新 commit → 自動重新 build + 部署（沿用現有 CI 流程，不需改動）
```

全程沒有新增任何伺服器端點；Netlify 端的角色跟現在完全一樣（只是被動接收 GitHub 的 build hook）。這是選它而非「Netlify Function 做 OAuth 中介」的核心原因。

**待驗證的關鍵前提**：GitHub REST API 是否允許瀏覽器直接跨網域呼叫（CORS）。這是整個方案成立的地基，會排進實作計畫的第一步，用一行 `fetch` 實測；若不成立，需要回頭跟作者討論退回 Function 中介方案。

## 4. 認證與設定

### 4.1 儲存內容

`localStorage`（key 前綴 `notecraft:onlineEdit:`）：

| key | 說明 |
| --- | --- |
| `repo` | `owner/name`，例如 `singyichen/notecraft` |
| `branch` | 預設 `main` |
| `pathPrefix` | 選填，repo 內 notes 目錄相對路徑前綴（給 notesDir 不等於 repo root 的情境用，預設空字串） |
| `token` | fine-grained PAT，僅要求對該 repo 的 **Contents: Read and write** 權限，不需要其他 scope |

### 4.2 Repo 自動偵測

`astro.config.mjs` 在設定階段（Node、同步）嘗試 `git remote get-url origin`，成功則解析出 `owner/name`，透過 `vite.define` 注入 `import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT` 當作設定畫面的預填值；失敗（非 git 專案、無 origin）就留空，使用者手動輸入。這一步全在 build 時執行，不影響「靜態輸出、無執行時邏輯」的原則。

### 4.3 安全性揭露

設定畫面明確寫出：「此 token 只會存在你目前這個瀏覽器裡，不會送到 NoteCraft 以外的任何伺服器；換裝置需要重新貼一次；建議設定過期時間並只給單一 repo 的 Contents 權限。」

## 5. 編輯 UI：`OnlineEditor` island

新增 `src/components/islands/OnlineEditor.tsx`（React island），掛在 `src/pages/notes/[...slug].astro` 現有的動作按鈕列。顯示條件與「以 VS Code 編輯」互補：

```astro
{!import.meta.env.DEV && !import.meta.env.LOCAL_EDIT && <OnlineEditor client:visible ... />}
```

（現有 VS Code 按鈕的條件相反：只在 dev / `LOCAL_EDIT` 顯示——兩顆按鈕永遠不會同時出現。）

行為：

- 未設定 repo/token 時，按鈕文字為「設定線上編輯」，點擊開設定表單（見 §4）
- 已設定時，按鈕文字為「線上編輯」，點擊切換頁面成「閱讀 / 編輯」兩個分頁（沿用 brainstorming 階段已確認過的草圖互動：分頁 tab + 下方發布列），編輯區是一個純文字 `<textarea>`，內容是**去除 frontmatter 之後**的完整 MDX body（含既有的 `@ai-visualize` 標記與 import，這些文字仍然可見可改，只是發布前會做 §6 的安全檢查）
- 發布列：commit message 輸入框（預帶固定樣板「更新《{筆記標題}》內文」，可自行改寫）、發布按鈕、狀態指示（編輯中 → 提交至 GitHub → 已提交，等 Netlify 重新部署上線由外部 webhook 完成，UI 不追蹤 Netlify 端狀態）

## 6. 發布流程與 GitHub Contents API 合約

新增 `src/lib/github-contents.ts`：

- `fetchNoteFile(config, slugPath)` → `GET contents/{path}?ref={branch}`，回傳 `{ content, sha }`（content 需 base64 解碼 + 分離 frontmatter/body）
- `publishNoteFile(config, slugPath, newBody, baseSha, commitMessage)`：
  1. 把新 body 跟原本保留下來的 frontmatter 重新組裝，`updatedAt` 欄位改成今天日期（比照 CLAUDE.md「寫入後受影響 MDX 的 updatedAt 都要更新」的既有慣例）
  2. `PUT contents/{path}`，body 帶 `{ message, content: base64(...), sha: baseSha, branch }`
  3. `409` → 拋出明確的「衝突」錯誤類型，UI 顯示「內容已在別處被更新，請重新整理拿最新版本再編輯」，不自動重試、不強制覆蓋
  4. 其他非 2xx → 顯示 GitHub 回傳的錯誤訊息（例如權限不足、repo/path 打錯）

## 7. 安全檢查：標記與元件 import 保護

發布前（PUT 呼叫之前），在瀏覽器端對編輯前後的 body 各跑一次輕量掃描（regex 等級即可，不需要完整 MDX AST）：

- 收集 `@ai-visualize` / `@ai-reference` 標記的 `id` 清單
- 收集 `from "@/components/generated/..."` 的 import 清單

若編輯後少了任何一個原本存在的 id 或 import，跳出確認框：「偵測到你可能刪除了 N 個視覺化標記或元件引用，繼續發布會讓這些內容從筆記消失，確定要繼續嗎？」——預設不繼續，作者需主動確認。這不是完整驗證（不會跑 `tsc` / `astro build`，那需要本機環境），只是防手滑的最後一道提示。

## 8. 衝突處理

- **線上對線上 / 線上對本機已 commit**：GitHub `sha` 樂觀鎖天然擋住，見 §6
- **線上對本機「尚未 commit」的修改**：不特別處理（YAGNI）。下次本機 `git pull` 時會出現一般的 git merge conflict，跟作者平常處理 merge conflict 的手感一致，這是已知且接受的取捨

## 9. Build 驗證

- 新增的 `OnlineEditor.tsx` 走 `client:visible`，需確認 `astro build` 正常打包、且在 `import.meta.env.DEV=false` 的正式 build 路徑會出現在頁面上（可用既有 `NOTECRAFT_VERIFY_BUILD` 驗證流程延伸）
- 手動驗證 GitHub Contents API 的 CORS 假設（見 §3 待驗證前提），這一步失敗會直接影響是否要繼續這個方案，優先做

## 10. 風險與取捨

- **PAT 存在 localStorage**：瀏覽器端沒有更安全的存放位置可選（沒有後端），這是為了維持「無 Function」架構主動接受的風險；用 fine-grained token 縮小影響範圍，且作者可隨時在 GitHub 端撤銷
- **CORS 是否支援是地基級假設**：一旦不成立，整個「純前端直接呼叫 GitHub API」的路徑都要重來，因此排最優先驗證
- **只編輯 body、不編輯 frontmatter**：範圍縮小換取安全與實作速度；tag / 標題管理仍集中在本機 dev-only API，避免兩套 frontmatter 寫入邏輯互相打架
- **不做即時鎖定機制**：單人使用情境下，靠 git 原生機制（sha 樂觀鎖 + 之後 pull 出現 merge conflict）已經夠用，提早做鎖定機制是過度設計
