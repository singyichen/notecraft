# simulations/tools

各週實驗共用的 LTspice 工具（用法見 `.claude/skills/lab-workflow/references/ltspice-batch.md`）：

- `run-lt.sh file.cir …`：用 macOS 版 LTspice（CrossOver 包裝）的批次模式跑網表，產生同名 `.raw`／`.log`。
- `ltraw.py`：最小的 `.raw` 讀取器（`read_raw` 回傳依 `.step` 分段的欄位陣列；`stats` 算最後 N 個週期的峰值、rms、平均、漣波）。每週的 `plot.py` 從這裡 import。
