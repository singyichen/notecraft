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
| `plot_measured.py` | 把 `measured/*.csv` 疊到 LTspice 曲線上。預設實驗一（欄位 `Vs,VD,I_mA`），用「1 mA 門檻」與「切線交點」兩個準則印出導通電壓表；`--exp 2` 是實驗二（欄位 `Vs,VD,I_uA`），對數軸畫漏電流並加 DMM 10 MΩ 輸入阻抗線與 datasheet 5 µA 上限線。圖存到 `public/note-images/ec-week3-measured/` | 讀 `.raw` |
| `measured/lab1-exp1-forward.csv`、`measured/lab1-exp1-tinkercad.csv` | 實驗一實測與 Tinkercad 掃描的記錄範本（0.1–2.0 V 共 21 列，`I_mA` 留空會用 $(V_s - V_D)/1\,\text{k}\Omega$ 補） | — |
| `measured/lab1-exp2-reverse.csv`、`measured/lab1-exp2-tinkercad.csv` | 實驗二實測與 Tinkercad 掃描的記錄範本（1–20 V 共 20 列，電流單位 µA；三欄都要有值才會畫） | — |

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

## 結報（助教格式）

格式依 `src/content/notes/_references/電子學實作系列/第二週/Lab_結報形式參考.pdf`；同資料夾的 `Lab_結報範本.docx` 是空白範本，由 `../tools/lab_report.py` 產生，之後每個 Lab 共用。

```bash
cd simulations/lab1
.venv/bin/python ../tools/lab_report.py --lab 2 --title "實驗名稱" -o ~/Desktop/Lab2_空白.docx     # 任一 Lab 的空白範本
.venv/bin/python report/build_lab1_report.py --id <學號> --name <姓名>                              # Lab 1 預填版 → report/<學號>_<姓名>_Lab1.docx
```

- 預填版已放入實驗一、二的 Tinkercad 截圖與掃描表、KiCad 電路圖、LTspice 網表與曲線、比較表；黃底是待填（照片、實測、自己的分析），綠底是要用自己的話改寫的草稿。
- 實測數據填進 `measured/lab1-exp1-forward.csv`、`measured/lab1-exp2-reverse.csv` 後重跑，實測表與疊圖會自動帶入。已存在的 docx 不會被覆寫，要加 `--force` 或用 `-o` 另存，避免蓋掉在 Word 手改的內容。
- `report/*.docx` 與 `report/build/` 已列入 `.gitignore`（含學號，且 repo 是公開的）。
