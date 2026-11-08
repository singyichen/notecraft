# Lab 4 運算放大器實驗：模擬檔案

電子學實作系列第 10 週（11/14）`App_Lab4_5.pdf` 第 8–14 頁（非反相／反相放大器）的
CircuitJS 電路檔、LTspice 網表與圖。

## uA741 的模型

LTspice 標準庫**沒有** uA741（只有 `UniversalOpAmp` 這種理想化的巨集模型），所以網表
內嵌 TI 的 Boyle 巨集模型（`ua741-model.txt`，`.subckt uA741 1 2 3 4 5`，腳位順序是
非反相輸入／反相輸入／V+／V−／輸出）。跑過四項對照，和規格書對得上：

| 項目 | 模型 | uA741 規格書（±15 V、25 °C） |
| --- | --- | --- |
| 開迴路增益 | 106.0 dB（約 200 k） | 典型 200 V/mV ＝ 106 dB |
| 主極點 | 4.97 Hz | 約 5 Hz |
| 增益頻寬積 | 889 kHz | 典型 1 MHz |
| 迴轉率 | 0.52 V/µs | 典型 0.5 V/µs |
| 輸出擺幅（R_L = 10 k） | ±14.6 V | 典型 ±14 V、最小 ±12 V |

**輸出擺幅是模型比實機樂觀的地方**：模型要到 10 V_pp 輸入才削平，手上那顆若是
V_OM 接近下限的批次，9 V_pp 就可能開始平頂。筆記的削平門檻一律寫成「9～10 V_pp 之間」。

## 檔案

| 檔案 | 內容 | 分析 |
| --- | --- | --- |
| `circuitjs/lab4-exp1-noninv.txt` | 實驗一電路，V_in 與 V_out 兩個示波器 | CircuitJS |
| `circuitjs/lab4-exp2-inv.txt` | 實驗二電路，同上 | CircuitJS |
| `lab4-exp1-noninv-tran.cir` | 實驗一時域波形（1 kHz、4 V 峰值） | `.tran` |
| `lab4-exp2-inv-tran.cir` | 實驗二時域波形 | `.tran` |
| `lab4-exp1-noninv-ac.cir`／`lab4-exp2-inv-ac.cir` | 閉迴路增益與 −3 dB 頻寬 | `.ac` |
| `lab4-exp1-amp-sweep.cir`／`lab4-exp2-amp-sweep.cir` | 輸入振幅 2～15 V_pp，找削平門檻 | `.tran` + `.step` |
| `lab4-q3-1MHz-tran.cir` | 講義問題 3：1 MHz、4 V 峰值（撞迴轉率） | `.tran` |
| `lab4-q3-1MHz-small.cir` | 同頻率但 50 mV 峰值（純頻寬） | `.tran` |
| `lab4-zin-rs.cir` | 講義問題 1／2：訊號源內阻對兩種組態的影響 | `.ac` + `.step` |
| `lab4-offset.cir` | 輸入偏壓電流造成的輸出直流偏移，比較有無補償電阻 | `.op` |
| `lab4-bonus-unity.cir` | Bonus：單位增益與開迴路增益的關係 A_cl = A0/(1+A0) | `.op` + `.step` |
| `plot.py` | 出四張 PNG 到 `public/note-images/ec-week10-ltspice/`，並寫出 `ltspice-pred.json` | — |
| `draw_breadboard.py` | 從零畫兩張實體麵包板接線圖到 `public/note-images/ec-week10-breadboard/` | — |
| `annotate_current_path.py` | 在上面兩張接線圖疊電流分析（輸出加 `-current`） | — |
| `build_record_xlsx.py` | 產生 `measured/Lab4-數據記錄.xlsx`（兩張工作表，預報欄讀 `ltspice-pred.json`） | — |

`bodies/*.body` 才是網表的來源，`.cir` 是 `build-cir.sh` 把它和 `ua741-model.txt` 串出來的
產物（照樣進版控，重新 clone 不必先跑）。

## 跑法

```bash
cd simulations/lab4
./build-cir.sh                                 # bodies/ 改過才需要
../tools/run-lt.sh lab4-*.cir                  # 產生 .raw / .log
../lab1/.venv/bin/python plot.py               # 共用 lab1 的 venv（numpy、matplotlib、Pillow、openpyxl）
../lab1/.venv/bin/python draw_breadboard.py
../lab1/.venv/bin/python annotate_current_path.py
../lab1/.venv/bin/python build_record_xlsx.py  # 已存在就不動它，要重產加 --force
node ../../.claude/skills/lab-workflow/scripts/circuitjs-link.mjs circuitjs/*.txt
```

`.raw`／`.log` 不進版控（見 `.gitignore`），重新 clone 後先跑 `run-lt.sh` 再跑 `plot.py`。

## 講義裡要注意的地方（網表照講義接，但筆記有點破）

1. **第 8 頁的文字與圖對不起來**：標題寫 Non-inverting amplifier，底下卻寫
   「the input signal input by inverting terminal」；第 9 頁反過來。圖是對的，文字是
   兩頁互換了。網表照圖接。
2. **第 8 頁的兩條式子少了乘號**：印成 $V_- = V_O + \frac{R_1}{R_1+R_2}$，正確的是
   $V_- = V_O \cdot \frac{R_1}{R_1+R_2}$。照印出來的寫法推不出下面那條 $A_V = 1 + R_2/R_1$。
3. **「Ampl: 4」是峰值不是峰對峰值**：第 21 頁的 LTspice 波形圖上，`Ampl:2` 的那條
   確實畫到 ±2 V，可以反推第 10／11 頁的 4 就是 4 V 峰值 ＝ 8 V_pp。AFG-2225 的面板
   輸入的是 V_pp，所以要填 8.00。
4. **非反相組態在這組參數下很接近削平**：8 V_pp 進去、24 V_pp 出來，距模型的
   ±14.6 V 只剩 2.6 V 餘裕。當天若看到平頂，先確認電源真的是 ±15 V，再把輸入降到 6 V_pp。

## Tinkercad 的預演設計

| 設計 | 連結 |
| --- | --- |
| Lab 4 Exp 1: Non-inverting Amplifier | <https://www.tinkercad.com/things/gLGjppMZq2E> |
| Lab 4 Exp 2: Inverting Amplifier | <https://www.tinkercad.com/things/8vsDbYcDYgT> |

截圖用 `simulations/tools/crop_tinkercad.py` 從 daemon 的輸出目錄裁進
`public/note-images/ec-week10-tinkercad/`。代操作的工具與踩過的坑見
`.claude/skills/lab-workflow/scripts/tinkercad/README.md`。
