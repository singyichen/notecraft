# Lab 3 MOSFET 實驗：模擬檔案

電子學實作系列第 11 週 `App_Lab3.pdf`（MOSFET 偏壓與開關、共源級放大器）的 CircuitJS 電路檔、
LTspice 網表與圖。LTspice 全部用內建元件庫的 **BS170** 模型（`.model` 已內嵌，檔案自足）。

> **為什麼不是 2N7000**：LTspice 標準庫（`standard.mos`）沒有 2N7000。BS170 與 2N7000 是同一族的
> N 通道增強型小訊號 MOSFET（60 V／500 mA／TO-92），差別主要在腳位順序，模型的 `Vto = 2.14 V`
> 正好落在 2N7000 規格書 `V_GS(th)` 0.8–3.0 V 的典型值附近。另外用庫裡的 `2N7002`（SOT-23 版的
> 同晶片，`Vto = 1.6 V`）交叉驗算過第二部分：工作點 I_D 35.5 µA、增益 9.3 倍，與 BS170 的
> 29.7 µA／8.7 倍同一量級，結論不變。

| 檔案 | 內容 | 分析 |
| --- | --- | --- |
| `circuitjs/lab3-exp1-output-curve.txt` | 實驗一電路（R1 1 kΩ 在源極）＋ V_GS／V_DS 兩支滑桿 | CircuitJS |
| `circuitjs/lab3-exp2-transfer.txt` | 實驗二電路（R1 100 Ω 在汲極、源極接地） | CircuitJS |
| `circuitjs/lab3-exp3-ron.txt` | 實驗三：10 mA 定電流源灌進汲極，看 V_DS | CircuitJS |
| `circuitjs/lab3-exp4-switch.txt` | 實驗四：LED 開關，V_DD = 8 V，拉 V_GS 看 LED 亮不亮 | CircuitJS |
| `circuitjs/lab3-exp5-cs-amp.txt` | 第二部分共源級放大器，示波器看 V_in 與 V_out | CircuitJS |
| `lab3-exp1-curves.cir` | 輸出特性曲線族（V_GS 0／2／4／6 V，V_DS 0→15 V），R1 1 kΩ 在源極 | `.dc` 雙掃描 |
| `lab3-exp1-ideal.cir` | 對照組：拿掉 R1、源極接地的「教科書」曲線（同樣掃到 15 V） | `.dc` 雙掃描 |
| `lab3-exp2-transfer.cir` | 轉移特性曲線（V_DS 1／3／5 V，V_GS 0→6 V） | `.dc` 雙掃描 |
| `lab3-exp3-ron.cir` | 導通電阻：I_D 固定 10 mA，掃 V_GS 2→10 V | `.dc` |
| `lab3-exp4-switch.cir` | LED 開關，`.step` 比較 R1 100 Ω 與講義問題 4 的 200 Ω | `.dc` + `.step` |
| `lab3-exp5-op.cir` | 共源級放大器的直流工作點 | `.op` |
| `lab3-exp5-tran.cir` | 共源級放大器的時域波形（V_in 50 mV 峰值、1 kHz） | `.tran` |
| `lab3-exp5-ac.cir` | 中頻增益；`.step` 比較「有／沒有」跨接在 R6 上的旁路電容（講義問題 3） | `.ac` + `.meas` |
| `lab3-exp5-vth-sens.cir`／`-op.cir` | 工作點與增益對 V_th 的敏感度（掃 0.8→3.0 V，即規格書全範圍） | `.ac`／`.op` + `.step` |
| `lab3-q4-r3.cir`／`-op.cir` | 講義問題 4：R3 300 kΩ → 1 MΩ | `.ac`／`.op` + `.step` |
| `lab3-q4-r3-sweep.cir`／`-op.cir` | Bonus 1：掃 R3 100 k→1 MΩ，找工作點真正離開飽和區的位置（手算的 409 kΩ 是固定 I_D 的估算，模型自洽解出的崩潰點在 405 kΩ 附近） | `.ac` + `.meas`／`.op` + `.step` |
| `lab3-exp5-gm.cir`／`lab3-exp5-ro.cir` | 第二部分工作點上的小訊號 g_m 與 r_o：把三個節點電位釘在 `.op` 的解上做數值微分（g_m = 0.364 mA/V、r_o = 1.26 MΩ）。**這才是模型的 g_m**；由增益回推的 0.295 mA/V 是有效值 | `.dc` |
| `lab3-q5-r1.cir`／`-op.cir` | 講義問題 5：R1 100 kΩ → 1 MΩ | `.ac`／`.op` + `.step` |
| `lab3-bonus-r7-sweep.cir` | Bonus：掃 R7 找 \|A_v\| > 10 的範圍 | `.ac` + `.meas` |
| `lab3-bonus-design.cir`／`-ac.cir`／`-op.cir` | Bonus 定案（R7 = 10 kΩ）的時域、增益與工作點，並掃 V_th 看耐受度 | `.tran`／`.ac`／`.op` |
| `plot.py` | 讀 `.raw`／`.log` 出六張 PNG 到 `public/note-images/ec-week9-ltspice/`，並把預報表的數字印到 stdout | — |
| `draw_breadboard.py` | 從零畫實體麵包板接線圖（三張）到 `public/note-images/ec-week9-breadboard/` | — |
| `annotate_current_path.py` | 在上面三張接線圖疊電流分析（輸出加 `-current`） | — |
| `annotate_schematic.py` | 在講義第 19 頁的原理圖上疊直流偏壓與交流訊號兩種電流路徑 | — |
| `build_record_xlsx.py` | 產生當天填數據用的 `measured/Lab3-數據記錄.xlsx`（七個分頁、七張圖，預報欄讀 `.raw`）。必做的實驗一、二是 0～5 V 每 0.5 V 共 11 點，選做的三張表維持講義版面 | — |
| `report/build_lab3_data_results.py` | 當天上傳用的「實驗數據結果」`.docx`：讀 `measured/Lab3-數據記錄.xlsx` 的快取值，排出實驗一、二的數據表、對照圖與現場照片 | — |
| `report/build_lab3_report.py` | 結報 `.docx`：章節照助教範本，正文照 `report-voice.md` 的學生口吻，數據與上面那份同源 | — |

## 跑法

```bash
cd simulations/lab3
../tools/run-lt.sh lab3-*.cir                 # 產生 .raw / .log
../lab1/.venv/bin/python plot.py              # 共用 lab1 的 venv（numpy、matplotlib、Pillow）
../lab1/.venv/bin/python draw_breadboard.py
../lab1/.venv/bin/python annotate_current_path.py
../lab1/.venv/bin/python annotate_schematic.py
../lab1/.venv/bin/python build_record_xlsx.py          # 已存在就不動它（寫檔前會自檢公式括號）
../lab1/.venv/bin/python build_record_xlsx.py --update # 保留已填的黃底格後重產（按分頁＋欄組＋電壓＋欄名對應，不按列號）
../lab1/.venv/bin/python build_record_xlsx.py --force  # 丟掉舊檔重產
node ../../.claude/skills/lab-workflow/scripts/circuitjs-link.mjs circuitjs/*.txt   # 印 CircuitJS 連結
```

- **當天上傳用的「實驗數據結果」**：`report/build_lab3_data_results.py --id <學號> --name <姓名>` 讀
  `measured/Lab3-數據記錄.xlsx` 的實測欄（**要先在 Excel 存檔**，openpyxl 才讀得到公式的快取值），
  照片讀 `<notesDir>/_outputs/lab3/photos/`（`--photos` 可改），
  輸出 `_outputs/lab3/<學號>_<姓名>_Lab 3 實驗數據結果.docx`；已存在時加 `--force`。
  2026-11-07 當天只完成必做的實驗一、二，所以這份只有那兩節。
- **結報**：`report/build_lab3_report.py --id <學號> --name <姓名>`，數據與上面那份同源（都讀同一個
  xlsx），輸出 `_outputs/lab3/<學號>_<姓名>_Lab 3 結報.docx`，目前 9 頁。

### 記錄簿被 Excel 存過之後的兩個坑

1. **填色會從 `FFF2CC` 變成 8 碼的 `FFFFF2CC`**。`build_record_xlsx.py` 的 `--update` 靠黃底認輸入格，
   所以比對一律取後六碼；真的一格都認不出來時會直接中止，不會覆蓋。
2. **手改過的公式會被蓋回產生器的版本**。2026-11-07 的實測值填在實驗二「實測 V_D」那一欄，但量的其實是
   $R_1$ 的壓降，所以當天把 `I_D` 的公式改成直接除 $R_1$；照原版公式重算會變成 $(V_{DS}-V_{R_1})/R_1$，
   電流差 75 倍。`--update` 現在會把所有被手改過的公式列出來提醒。

`.raw`／`.log` 不進版控（見 `.gitignore`），重新 clone 後先跑 `run-lt.sh` 再跑 `plot.py`。
`draw_breadboard.py` 直接 import `../lab2/draw_real_breadboard.py` 的繪圖原語（同一塊 60 欄全尺寸板、
同一套配色），只有孔位與標籤是 Lab 3 自己的。

## LED 模型

實驗四的 LED 沒有指定型號，網表裡用的是概念模型 `.model LEDRED D(Is=1e-21 N=1.9 Rs=4)`，
10 mA 時順向壓降約 1.9 V、5 mA 時約 2.1 V，和一般紅光 LED 相符。**它不是任何特定型號**，
實測壓降以當天那顆為準；筆記的預報表只拿它判斷「大概幾伏開始亮」。

## 講義裡對不起來的地方（網表照講義接，但筆記有點破）

1. **第 19 頁同時有兩個 `C2`、兩個 `R6`**。對照第 23 頁 Bonus 的同一張圖可知正確命名是
   C1（輸入耦合）、C2（輸出耦合）、C3（源極旁路）、R6（源極 100 kΩ）、R7（與 C3 串聯的 30 kΩ）。
   網表一律用 Bonus 的命名。
2. **第 21 頁的零件表沒有 30 kΩ**（只有 50 kΩ ×2）。網表照電路圖用 30 kΩ，當天以助教發的為準；
   換成 50 kΩ 增益會從 8.7 掉到 6.3。
3. **第 10 頁的模擬圖 y 軸是 0.0014 V**（換算 R_on = 0.14 Ω），任何 2N7000 都做不到。
   LTspice 在 V_GS = 5 V、I_D = 10 mA 下是 44 mV → 4.4 Ω，才符合規格書。

## 記錄簿的量測級距

講義第 7／9 頁每組只印了一兩列、其餘留白，那是版面不是點數上限。必做的兩個實驗照
Lab 1／Lab 2 記錄簿的慣例加密：

| | 級距 | 點數 | 上限為什麼停在這裡 |
| --- | --- | --- | --- |
| 實驗一 | V_DS 電源 0～15 V，每 0.5 V | 31 × 4 組 | V_GS = 6 V 那條的膝點在 3.8 V，只掃到 5 V 的話飽和段只剩 1.2 V，看不出「平」——而輸出特性曲線要看的就是這個。掃到 15 V 有 11 V 的平台（8→15 V 電流只多 17 µA）。元件撐得住：15 V 時元件分到 11.4 V × 3.6 mA = 41 mW（P_D 上限 400 mW），R1 只吃 13 mW |
| 實驗二 | V_GS 電源 0～5 V，每 0.5 V | 11 × 3 組 | 和實驗一相反：這裡的平台高度只由 R1 決定（≈ V_DS/100 Ω），不含元件資訊，多掃沒有新東西。而且 V_GS 一過 3 V，R1 100 Ω 就要吃約 0.23 W（零件表給 1/4 W），整個平台段都貼著額定 |
| 實驗二加密段 | 抬頭段 0.05～0.1 V | 24 列 | 求 V_th 的平方根外插要兩個以上落在平方律直線上的點；粗掃在抬頭段只落得到一個點。預填 1.90～3.05 V 是 BS170 的範圍，當天照自己的元件整欄改掉 |

所以實驗一是 31 列（和 Lab 2 的 V_CC 掃描同樣密度）、實驗二是 11 + 24 = 35 列。
實驗三、四與第二部分是選做，維持講義版面的點數，`build_record_xlsx.py` 沒有加密它們。

## 一個踩過的坑：只用 LibreOffice 驗算抓不到壞公式

`build_record_xlsx.py` 寫檔前會跑 `check_formulas()`，把每一條公式的字串常值剝掉後
檢查括號與引號是否成對，不過就直接中止、不寫檔。

原因是 2026-11-05 實際踩到的一次：V_th 兩點外插那條七層巢狀 `IF` ＋ `IFERROR` 的
公式**少了一個右括號**。LibreOffice 會自動把它補齊、照常算出正確的值，所以用
`soffice --convert-to` 重算驗證時一切正常；但 Excel 在載入時會判定檔案毀損，跳出
「我們發現……的部分內容有問題。您要我們盡可能嘗試復原嗎？」並把那一格丟掉。

**結論：改了公式之後，不能只用 LibreOffice 重算當作驗證。** 現在這件事由
`check_formulas()` 把關（Lab 1、Lab 2 的記錄簿目前都沒有這個問題，但它們的產生
腳本還沒加同樣的自檢）。
