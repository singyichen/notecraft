# Tinkercad 代操作工具

- `daemon.js`：用本機 Chrome 開獨立設定檔的 Playwright 常駐程式，輪詢 `work/cmds/*.js` 執行、結果寫到 `work/out/<name>.json`。作者要在它開的視窗登入 Tinkercad 一次（設定檔留在 `work/profile/`，之後不用再登入）。專案 `package.json` 是 `"type": "module"`，直接 `node daemon.js` 會因 `require` 報錯；`playwright-core` 也不在專案依賴裡，啟動方式：

  ```bash
  mkdir -p /tmp/pw && (cd /tmp/pw && npm init -y >/dev/null && npm i playwright-core)
  cd .claude/skills/lab-workflow/scripts/tinkercad && NODE_PATH=/tmp/pw/node_modules node -e "$(cat daemon.js)"
  ```

- `sweep` 類的命令（例如實驗一 0.1→2.0 V 逐點讀電表）：開著模擬，點電源供應器本體（顯示區，避開旋鈕），用 `panelSet(186, '1.3')` 改電壓，等 1.3 s 再從每個 `cgfx__multimeter` 底下的 `<text>` 讀值；電表依 x 座標排序，左邊是電壓表。掃完記得把電壓改回原值。
- `run.sh <name> <<'JS' … JS`：把一段程式（可用 `page`、`ctx`、`require`、`D`）丟給常駐程式並等結果。
- `helpers.cjs`：命令裡共用的操作（幾何、端子座標、擺件、接線、屬性面板、模擬、改名）。用法：

  ```js
  delete require.cache[require.resolve('./helpers.cjs')];
  const H = require('./helpers.cjs')(ctx.pages()[ctx.pages().length - 1]);
  await H.allComponents();                 // 元件選單切「全部」，不然找不到儀器類元件
  await H.place('函數波產生器', 250, 600);
  await H.setField('頻率', '60');           // 屬性面板用標籤找欄位，不要寫死 y
  await H.placeHoriz('二極體', 5, 9, 'i', 'cgfx__diode');
  const t = await H.terms('diode');        // 端子名稱 + 螢幕座標
  await H.wire('rail -> j5', [x1, y1], [x2, y2]);
  ```

  檔名必須是 `.cjs`（專案 `package.json` 是 `"type": "module"`）。daemon 的命令有 120 秒上限，每次只做一兩步。

- `build-lab1-exp1.js`：以 `./run.sh 001 < build-lab1-exp1.js` 執行，會重新載入指定設計、清空畫布、照講義畫法重建實驗一並跑模擬截圖。改設計網址與元件即可套到其他實驗。（寫在 `helpers.cjs` 之前，函式是內嵌的。）

- 已建好的設計：實驗一 `jKblOBzuo2v`（Forward Bias: Knee Voltage）、實驗二 `2oSQv0GjSSi`（Reverse Bias）、實驗三 `d55wQxQs1FC`（Half-Wave Rectifier）、實驗四 `384Ncqz5XD3`（Full-Wave Bridge Rectifier）。
