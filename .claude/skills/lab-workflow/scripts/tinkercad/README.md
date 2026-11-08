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

- 麵包板在元件庫叫**電路試驗板**；四個實驗用的 30 欄板子是「小型電路試驗板」。搜尋框會過濾清單，用 `H.place(name, x, y)`（它會先清空搜尋框）。
- 點工具列（配線顏色）之前先把 `.root_container` 的 `scrollTop` 歸零，否則頁首被捲掉、`wireColor()` 會靜默失敗；歸零後所有 y 座標會位移，要重讀 `H.geom()`。

- 已建好的設計：實驗一 `jKblOBzuo2v`（Forward Bias: Knee Voltage）、實驗二 `2oSQv0GjSSi`（Reverse Bias）、實驗三 `d55wQxQs1FC`（Half-Wave Rectifier）、實驗四 `384Ncqz5XD3`（Full-Wave Bridge Rectifier）；課前教學用的 `fUK2JBC2tGl`（Preclass: Series Resistors & Meters）、`8A3v53Rb7JM`（Preclass: Same Column = Short Circuit）。

## 2026-11-08 做 Lab 4／Lab 5 運放電路時踩到的坑

**環境**

- **作者平常的 Chrome 開著時，`channel: 'chrome'` 會搶 profile**：新行程被既有的 Chrome 接管後自己退出，
  Playwright 的連線當場斷掉，但那些 chrome 行程還活著（看起來像視窗開著、其實已經連不上）。
  改用 Playwright 快取裡的 **Google Chrome for Testing** 就不會衝突：

  ```bash
  EXE="$HOME/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  TC_CHROME_EXE="$EXE" TC_PROFILE="$PWD/work/profile-cft" NODE_PATH=/tmp/pw/node_modules node -e "$(cat daemon.js)"
  ```

  `daemon.js` 現在吃 `TC_CHROME_EXE` 與 `TC_PROFILE` 兩個環境變數（都不給就是原本的行為）。
  換 profile 要重新登入一次（Chrome 與 Chrome for Testing 的 cookie 加密金鑰在 Keychain 裡是不同項目，
  複製 profile 也解不開）。
- **舊的 daemon 沒收乾淨會搶命令佇列**：兩個 daemon 同時輪詢 `work/cmds/`，`run.sh` 送出去的命令被哪一個
  撿到是隨機的；撿到連線已斷的那個就回「context closed」或「page undefined」，看起來像隨機失敗。
  起新的之前先 `pgrep -f "node -e" | xargs kill`，並清掉 `work/profile*/Singleton*`。

**操作**

- **座標一律在動作前當場重讀**。畫布會隨操作（選取、開屬性面板、貼上）整體位移幾十到一百多 px，
  先讀好再用一定落空。`work/lib-op.cjs` 的 `run()` / `wireT()` 就是為了這件事每次重呼叫 `geom()`。
- **轉折點不要落在孔位或電源軌附近**：Tinkercad 會把它當成「線接到這裡」而提前結束。繞路一律走板子
  外緣（`board.x - 22` 或 `board.x + board.w + 25`），最後一次點擊才落在目標孔。
- **貼上之後要用「點空白處」確認，不能按 Escape**（Escape 會取消整個貼上）。
  而且 Tinkercad 的剪貼簿**撐不過直接改網址**：複製完要走「管控面板 → 建立 → 電路」那條路徑才貼得上。
- **屬性面板的值會慢一拍**：剛點完元件就讀 `fields()` 可能讀到上一個元件的值。設完值要 deselect、
  重新點一次再讀才算數（這次就因此誤判「回授電阻已經是 10 kΩ」，實際還是 200 kΩ，模擬整個飽和）。
- **選元件要點「兩隻腳的中點」**，不要點 bbox 中心：臥式電阻的 bbox 很扁，點中心常常選到壓在上面的線或儀器。

**元件**

- **741 運算放大器**（搜尋 `op amp`）的腳位和實機 DIP-8 一致：橫跨溝槽、缺口朝左時，
  下排那一列由左到右是腳 1／2／3／4，上排是腳 8／7／6／5。端子名稱是
  `Offset 1`／`In-`／`In+`／`Vcc-`／`Offset 2`／`Out`／`Vcc+`／`NC`。
- **電阻的跨距固定五欄**（兩腳相距四格），`placeHoriz(c1, c2, ...)` 只是置中，所以一定要寫
  `placeHoriz(c, c+4, ...)`；寫成 `(7, 13)` 會變成落在 8 與 12。
- **示波器只有一個通道**，要同時看輸入輸出就放兩台；兩台各自觸發，**看不出相位差**。
  時基預設 100 ms，1 kHz 的波形要把「每次分離的時間」改成 0.5 ms。**複製貼上後時基會回預設**。
- 示波器**不給數值讀數**，只給波形。要數字就從截圖的軌跡像素高度換算（誤差 2–4%），
  或乾脆把預報值交給 LTspice。
- 配線顏色的選單標籤是單字：黑／紅／橙／黃／綠／青綠／藍／紫。

**這次建好的五個設計**

| 設計 | 連結 |
| --- | --- |
| Lab 4 Exp 1: Non-inverting Amplifier | <https://www.tinkercad.com/things/gLGjppMZq2E> |
| Lab 4 Exp 2: Inverting Amplifier | <https://www.tinkercad.com/things/8vsDbYcDYgT> |
| Lab 5 Exp 1: Inverting Summing Amplifier | <https://www.tinkercad.com/things/1v9pESB3Ssd> |
| Lab 5 Exp 2: Summing Amplifier (non-inverting) | <https://www.tinkercad.com/things/cd3sTYKe0t2> |
| Lab 5 Exp 3: Subtracting Amplifier | <https://www.tinkercad.com/things/hpK8PHXQVlr> |

共用的座標／接線小工具在 `lib-op.cjs`（`geom()`／`at()`／`run()`／`wireT()`／`delAt()`）；
`work/` 不進版控，用之前先 `cp lib-op.cjs work/`。
