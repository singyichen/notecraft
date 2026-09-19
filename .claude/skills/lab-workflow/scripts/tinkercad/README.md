# Tinkercad 代操作工具

- `daemon.js`：用本機 Chrome 開獨立設定檔的 Playwright 常駐程式，輪詢 `work/cmds/*.js` 執行、結果寫到 `work/out/<name>.json`。作者要在它開的視窗登入 Tinkercad 一次（設定檔留在 `work/profile/`，之後不用再登入）。專案 `package.json` 是 `"type": "module"`，直接 `node daemon.js` 會因 `require` 報錯；`playwright-core` 也不在專案依賴裡，啟動方式：

  ```bash
  mkdir -p /tmp/pw && (cd /tmp/pw && npm init -y >/dev/null && npm i playwright-core)
  cd .claude/skills/lab-workflow/scripts/tinkercad && NODE_PATH=/tmp/pw/node_modules node -e "$(cat daemon.js)"
  ```

- `sweep` 類的命令（例如實驗一 0.1→2.0 V 逐點讀電表）：開著模擬，點電源供應器本體（顯示區，避開旋鈕），用 `panelSet(186, '1.3')` 改電壓，等 1.3 s 再從每個 `cgfx__multimeter` 底下的 `<text>` 讀值；電表依 x 座標排序，左邊是電壓表。掃完記得把電壓改回原值。
- `run.sh <name> <<'JS' … JS`：把一段程式（可用 `page`、`ctx`、`require`、`D`）丟給常駐程式並等結果。
- `build-lab1-exp1.js`：以 `./run.sh 001 < build-lab1-exp1.js` 執行，會重新載入指定設計、清空畫布、照講義畫法重建實驗一並跑模擬截圖。改設計網址與元件即可套到其他實驗。
