# Tinkercad 代操作工具

- `daemon.js`：用本機 Chrome 開獨立設定檔的 Playwright 常駐程式（`npm i playwright-core` 後 `node daemon.js`），輪詢 `work/cmds/*.js` 執行、結果寫到 `work/out/<name>.json`。作者要在它開的視窗登入 Tinkercad 一次。
- `run.sh <name> <<'JS' … JS`：把一段程式（可用 `page`、`ctx`、`require`、`D`）丟給常駐程式並等結果。
- `build-lab1-exp1.js`：以 `./run.sh 001 < build-lab1-exp1.js` 執行，會重新載入指定設計、清空畫布、照講義畫法重建實驗一並跑模擬截圖。改設計網址與元件即可套到其他實驗。
