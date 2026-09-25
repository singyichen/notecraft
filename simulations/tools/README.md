# simulations/tools

各週實驗共用的 LTspice 工具（用法見 `.claude/skills/lab-workflow/references/ltspice-batch.md`）：

- `run-lt.sh file.cir …`：用 macOS 版 LTspice（CrossOver 包裝）的批次模式跑網表，產生同名 `.raw`／`.log`。
- `ltraw.py`：最小的 `.raw` 讀取器（`read_raw` 回傳依 `.step` 分段的欄位陣列；`stats` 算最後 N 個週期的峰值、rms、平均、漣波）。每週的 `plot.py` 從這裡 import。
- `kicad_sexp.py`：KiCad S-expression 的最小解析／輸出器，能從內建符號庫抽出符號並攤平 `extends`，供各週 `kicad/gen_*.py` 手寫 `.kicad_sch`（用法見 `../lab1/kicad/README.md`）。
- `current_overlay.py`：在既有接線圖／原理圖上疊「電流實際流動路徑」的繪圖原語（`compose`／`path`／`badge`／`meter`／`label`）。各週的 `simulations/<lab>/annotate_current_path.py` 只放座標與標籤，畫法從這裡取；規範見 `.claude/skills/lab-workflow/references/current-path-overlay.md`。
- `svg_crop.py in.svg out.svg [margin_mm]`：把 kicad-cli 匯出的 SVG 依內容邊界框裁切，去掉整頁空白，給筆記嵌圖用。
