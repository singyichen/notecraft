# Lab 5 加法／減法放大器實驗：模擬檔案

電子學實作系列第 11 週（11/21）`App_Lab4_5.pdf` 第 19–27 頁（反相加法器、同相加法器、
減法器）的 CircuitJS 電路檔、LTspice 網表與圖。uA741 的巨集模型與驗證結果見
[../lab4/README.md](../lab4/README.md)，這裡用的是同一份 `ua741-model.txt`。

## 檔案

| 檔案 | 內容 | 分析 |
| --- | --- | --- |
| `circuitjs/lab5-exp1-inverting-summing.txt` | 實驗一電路，三個示波器（V_in1／V_in2／V_out） | CircuitJS |
| `circuitjs/lab5-exp2-summing.txt` | 實驗二電路，同上 | CircuitJS |
| `circuitjs/lab5-exp3-subtracting.txt` | 實驗三電路，同上 | CircuitJS |
| `lab5-exp1-invsum-tran.cir` | 實驗一時域波形（2 V／3 V 峰值、1 kHz） | `.tran` |
| `lab5-exp2-sum-tran.cir` | 實驗二時域波形 | `.tran` |
| `lab5-exp3-sub-tran.cir` | 實驗三時域波形（5 V／2 V 峰值） | `.tran` |
| `lab5-exp*-sweep.cir` | 固定一路、掃另一路的振幅 0～5 V 峰值，記錄簿的預報欄用它 | `.tran` + `.step` |
| `lab5-exp3-cm.cir` | 講義問題 1：兩端接同一訊號，掃 R4 的誤差 0／0.5／1／5 %，看共模漏多少 | `.tran` + `.step` |
| `lab5-q2-weights.cir` | 講義問題 2：權重 3 與 0.5（R_f = 30 k、R_1 = 10 k、R_2 = 60 k） | `.tran` |
| `lab5-bonus-mono.cir` | Bonus：立體聲混單聲道，a = b = 0.5，第二級把極性轉回來 | `.tran` |
| `lab5-offset.cir` | 三個電路輸入全部接地時的輸出直流偏移 | `.op` |
| `plot.py` | 出三張 PNG 到 `public/note-images/ec-week11-ltspice/`，並寫出 `ltspice-pred.json` | — |
| `draw_breadboard.py` | 從零畫三張實體麵包板接線圖到 `public/note-images/ec-week11-breadboard/` | — |
| `annotate_current_path.py` | 在上面三張接線圖疊電流分析（輸出加 `-current`） | — |
| `build_record_xlsx.py` | 產生 `measured/Lab5-數據記錄.xlsx`（三張工作表） | — |

## 跑法

和 Lab 4 一樣：

```bash
cd simulations/lab5
./build-cir.sh
../tools/run-lt.sh lab5-*.cir
../lab1/.venv/bin/python plot.py
../lab1/.venv/bin/python draw_breadboard.py
../lab1/.venv/bin/python annotate_current_path.py
../lab1/.venv/bin/python build_record_xlsx.py --force
node ../../.claude/skills/lab-workflow/scripts/circuitjs-link.mjs circuitjs/*.txt
```

## 模擬結果（1 kHz，±15 V）

| 電路 | 輸入 | LTspice 輸出 | 理論 |
| --- | --- | --- | --- |
| 反相加法器 | 2 V／3 V 峰值 | 5.000 V 峰值，反相 | −(2+3) |
| 同相加法器 | 2 V／3 V 峰值 | 5.000 V 峰值，同相 | 2+3 |
| 減法器 | 5 V／2 V 峰值 | 3.000 V 峰值 | 5−2 |
| 減法器共模 | 兩端都 5 V 峰值 | 0.3 mV_pp（完美配對） | 0 |

共模測試掃電阻誤差的結果：R4 差 0.5 % → 12.7 mV 峰值（CMRR 52 dB）、差 1 % →
25.2 mV（46 dB）、差 5 % → 125 mV（32 dB）。**uA741 自己的 CMRR 規格是 90 dB，
所以整體 CMRR 幾乎完全由那四顆電阻配得準不準決定**，這是講義問題 1 的答案核心。

## 講義裡要注意的地方

1. **第 21 頁有助教手寫的批註「500 or 1k Hz 太低頻易出問題」**：圖上印的是 100 Hz，
   實際要用 500 Hz 或 1 kHz。網表與記錄簿一律用 1 kHz。
2. **「Ampl」是峰值**：第 21／22／23 頁的 LTspice 波形圖可以直接驗證
   （`Ampl:2` 那條畫到 ±2 V）。AFG-2225 面板填的是 V_pp，所以要乘 2。
3. **第 19 頁下半與第 22 頁的「the summing amplifier」是同相加法器**，不是另一種
   反相加法器；它的兩路輸入**會互相負載**（兩顆輸入電阻直接串在兩個訊號源之間），
   這是它和反相加法器最大的差別，講義沒有寫。
4. **實驗二與實驗三是同一塊板**：元件位置完全一樣，只要把「接地」與「吃訊號」
   那兩條線對調。做完實驗二不要拆板。

## Tinkercad 的預演設計

| 設計 | 連結 |
| --- | --- |
| Lab 5 Exp 1: Inverting Summing Amplifier | <https://www.tinkercad.com/things/1v9pESB3Ssd> |
| Lab 5 Exp 2: Summing Amplifier (non-inverting) | <https://www.tinkercad.com/things/cd3sTYKe0t2> |
| Lab 5 Exp 3: Subtracting Amplifier | <https://www.tinkercad.com/things/hpK8PHXQVlr> |

實驗三是直接從實驗二複製後只改兩條線，和筆記寫的「同一塊板」一致。
截圖用 `simulations/tools/crop_tinkercad.py` 裁進 `public/note-images/ec-week11-tinkercad/`。
