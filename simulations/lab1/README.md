# Lab 1 二極體實驗：LTspice 網表

電子學實作系列第 2／3 週 `App_Lab1.pdf` 四個實驗的 SPICE 網表，全部用 LTspice 內建元件庫的真實 1N4007 模型（`.model` 已內嵌，檔案自足）。結果圖片輸出到 `public/note-images/ec-week3-ltspice/`，嵌在第 3 週筆記的「進階：LTspice」小節。

| 檔案 | 內容 | 分析 |
| --- | --- | --- |
| `lab1-exp1-forward.cir` | 順偏 I-V：Vs 0→2 V、R 1 kΩ | `.dc` |
| `lab1-exp2-reverse.cir` | 逆偏 0→20 V | `.dc` |
| `lab1-exp2-reverse-bv.cir` | 逆偏掃到 1200 V 看崩潰 | `.dc` |
| `lab1-rc-review.cir` | RC 低通複習：20 Hz、100 Ω、1 mF | `.tran` |
| `lab1-exp3-halfwave.cir` | 半波整流：60 Hz、10 Vpp、10 kΩ | `.tran` |
| `lab1-exp3-halfwave-rc.cir` | 半波加濾波電容，`.step` 1 µF／10 µF／100 µF | `.tran` 3 s |
| `lab1-exp4-bridge.cir` | 全波橋式：60 Hz、5 Vpp、10 kΩ | `.tran` |
| `lab1-exp4-bridge-rc.cir` | 橋式加濾波電容，`.step` 三組 | `.tran` 3 s |
| `lab1-exp4-zener.cir` | 橋式加齊納穩壓（概念電路：±10 V、Rlimit 1 kΩ、Vz 6.8 V） | `.tran` |
| `plot_measured.py` | 把 `measured/*.csv`（實測或 Tinkercad 掃描，欄位 `Vs,VD,I_mA`）疊到實驗一的 LTspice 曲線上，用「1 mA 門檻」與「切線交點」兩個準則印出導通電壓表，圖存到 `public/note-images/ec-week3-measured/` | 讀 `.raw` |
| `measured/lab1-exp1-forward.csv`、`measured/lab1-exp1-tinkercad.csv` | 實測與 Tinkercad 掃描的記錄範本（0.1–2.0 V 共 21 列，`I_mA` 留空會用 $(V_s - V_D)/1\,\text{k}\Omega$ 補） | — |

## 三種跑法

1. **LTspice GUI（本機）**：File → Open 選 `.cir`，按 Run（跑步人圖示），在波形視窗點節點名稱即可看波形。
2. **LTspice 線上版**：<https://my.analog.com/en/app/> 登入後上傳 `.cir`，操作同 GUI。
3. **命令列批次（本機，產生數據與圖）**：

```bash
cd simulations/lab1
../tools/run-lt.sh lab1-*.cir          # 產生 .raw / .log
python3 -m venv .venv && .venv/bin/pip install numpy matplotlib
.venv/bin/python plot.py               # 重新輸出八張 PNG 到 public/note-images/ec-week3-ltspice/
.venv/bin/python ../tools/ltraw.py     # 在 lab1 目錄執行，印出峰值、rms、平均、漣波等數字（JSON）
```

`../tools/ltraw.py` 是最小的 `.raw` 讀取器（UTF-16 標頭 + 二進位資料，支援 `.step` 分段），不依賴 PyLTSpice；`run-lt.sh` 也在 `../tools/`。
