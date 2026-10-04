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
| `plot_measured.py` | 把 `measured/*.csv` 疊到 LTspice 曲線上。預設實驗一（欄位 `Vs,VD,I_mA`），用「1 mA 門檻」與「切線交點」兩個準則印出導通電壓表；`--exp 2` 是實驗二（欄位 `Vs,VD,I_uA`），對數軸畫漏電流並加 DMM 10 MΩ 輸入阻抗線與 datasheet 5 µA 上限線；`--exp 3`／`--exp 4` 讀純量記錄表，畫實測 vs LTspice 預報 vs 理想公式的長條對照圖並印出誤差表。圖存到 `public/note-images/ec-week3-measured/` | 讀 `.raw` |
| `measured/lab1-exp1-forward.csv`、`measured/lab1-exp1-tinkercad.csv` | 實驗一實測與 Tinkercad 掃描的記錄範本（0.1–2.0 V 共 21 列，`I_mA` 留空會用 $(V_s - V_D)/1\,\text{k}\Omega$ 補） | — |
| `measured/Lab1-數據記錄.xlsx` | **實驗課當天用的資料記錄簿**：四個實驗各一張工作表，黃底格子是要填的，其餘是公式或預報值；填一列圖就跟著更新。實驗一、二是 I-V 散佈圖（實測點疊在 LTspice 曲線上），實驗三、四是實測 vs 預報的長條圖。每張工作表的資料區下方另有一張「當天拍照檢查表」（示波器畫面、麵包板照片、上傳登記），離開實驗室前逐項打勾 |
| `build_record_xlsx.py` | 產生上面那個 xlsx 與實驗三、四的 CSV 範本。預報欄直接讀 `*.raw`，所以和筆記的數字同源；改了網表重跑即可 |
| `measured/lab1-exp3-halfwave.csv`、`measured/lab1-exp4-bridge.csv` | 實驗三、四的純量記錄範本（區段／量測項目／實測／預報_LTspice／理想公式），填完可餵給 `plot_measured.py --exp 3`／`--exp 4` |
| `measured/lab1-exp2-reverse.csv`、`measured/lab1-exp2-tinkercad.csv` | 實驗二實測與 Tinkercad 掃描的記錄範本（1–20 V 共 20 列，電流單位 µA；三欄都要有值才會畫） | — |

## 三種跑法

1. **LTspice GUI（本機）**：File → Open 選 `.cir`，按 Run（跑步人圖示），在波形視窗點節點名稱即可看波形。
2. **LTspice 線上版**：<https://my.analog.com/en/app/> 登入後上傳 `.cir`，操作同 GUI。
3. **命令列批次（本機，產生數據與圖）**：

```bash
cd simulations/lab1
../tools/run-lt.sh lab1-*.cir          # 產生 .raw / .log
python3 -m venv .venv && .venv/bin/pip install numpy matplotlib openpyxl python-docx latex2mathml mathml2omml
.venv/bin/python plot.py               # 重新輸出八張 PNG 到 public/note-images/ec-week3-ltspice/
.venv/bin/python ../tools/ltraw.py     # 在 lab1 目錄執行，印出峰值、rms、平均、漣波等數字（JSON）
.venv/bin/python build_record_xlsx.py  # 產生 measured/Lab1-數據記錄.xlsx 與實驗三、四的 CSV 範本；xlsx 已存在時不覆蓋，加 --force 才重產
```

**`measured/Lab1-數據記錄.xlsx` 從 2026-10-02 起是作者直接填寫、調格式的工作檔**，不再是腳本的純產物：
腳本遇到檔案已存在會拒絕覆蓋（加 `--force` 才重產），之後要加欄位或說明請直接改 xlsx（或像
實驗三、四的「量測順序」那樣只動 sheet XML），不要重產。

`.raw` 不進版控（見 `.gitignore`），而 `plot.py` 與 `build_record_xlsx.py` 都要讀它，
所以重新 clone 之後**一定要先跑 `run-lt.sh`** 再跑後面兩支腳本。`openpyxl` 只有
`build_record_xlsx.py` 用得到。

### 改完 xlsx 之後要驗算並修回字型

openpyxl 寫出來的公式沒有快取值，任何讀快取的工具（Excel 以外的預覽器、pandas）都會讀到空的，
所以要用 LibreOffice 重算一次。但 LibreOffice 存檔時會把字型換成它自己的 `Linux Libertine G`
（本機不存在，Excel 會亂代用），所以重算完要把字型改回來：

```bash
cd simulations/lab1
SK=~/.claude/skills/synced/*/xlsx                       # xlsx skill 的位置
.venv/bin/python $SK/scripts/recalc.py measured/Lab1-數據記錄.xlsx 180   # 要 status: success、total_errors: 0
rm -rf /tmp/fix && mkdir /tmp/fix && cd /tmp/fix
unzip -q <repo>/simulations/lab1/measured/Lab1-數據記錄.xlsx
sed -i '' 's/Linux Libertine G/Arial/g' xl/styles.xml
rm <repo>/simulations/lab1/measured/Lab1-數據記錄.xlsx
zip -Xrq <repo>/simulations/lab1/measured/Lab1-數據記錄.xlsx .
```

**散佈圖的實測序列要明確給點的填色**（`build_record_xlsx.py` 的 `dot_series()`）：openpyxl 只設
`line.noFill` 不設點的填色時，LibreOffice 重算存檔會把點也寫成 `noFill`，序列整個隱形，看起來像
「填了數據圖卻不動」（2026-10-02 實測）。

**改完字型之後不要再跑一次 `recalc.py`**：它會用 LibreOffice 重新存檔，`Linux Libertine G`
會再被塞回去（2026-10-02 實測）。要確認重打包沒弄壞檔案，改用唯讀的方式檢查——
用 Python 的 `zipfile` 讀 `xl/styles.xml` 看字型只剩 `Arial`／`Calibri`、每張 `sheet*.xml`
的 `<f>` 後面都接著 `<v>`，或直接用 openpyxl `load_workbook` 開得起來即可。

驗過的結果（2026-10-02，含四張拍照檢查表）：166 條公式、0 錯誤，全部帶有快取值；
六張圖的錨點與儲存格內容不變。

`../tools/ltraw.py` 是最小的 `.raw` 讀取器（UTF-16 標頭 + 二進位資料，支援 `.step` 分段），不依賴 PyLTSpice；`run-lt.sh` 也在 `../tools/`。

## 結報（助教格式）

格式依 `src/content/notes/_references/電子學實作系列/第二週/Lab_結報形式參考.pdf`；同資料夾的 `Lab_結報範本.docx` 是空白範本，由 `../tools/lab_report.py` 產生，之後每個 Lab 共用。

```bash
cd simulations/lab1
.venv/bin/python ../tools/lab_report.py --lab 2 --title "實驗名稱" -o ~/Desktop/Lab2_空白.docx     # 任一 Lab 的空白範本
.venv/bin/python report/build_lab1_report.py --id <學號> --name <姓名>                              # Lab 1 預填版 → report/<學號>_<姓名>_Lab1.docx
```

- **公式一律寫 LaTeX**（2026-10-03 起）：`r.equation(r'...')` 吃 LaTeX 產生獨立置中的 Word 原生方程式（OMML），段落、表格、圖說裡的行內公式與符號寫成 `$V_D$`、`$I=\frac{V_R}{R}$`，由 `tools/lab_report.py` 的 `add_runs()` 經 `latex2mathml` → `mathml2omml` 轉成行內方程式；分數用 `\frac`、單位包 `\text{}`，比照 `math-formula-notation` skill。舊的 `V_{D}` 下標寫法仍相容但不要再用。這兩個套件要裝進 `.venv`（`pip install latex2mathml mathml2omml`）。
- 預設只產基礎實驗一、二；真的做了半波整流再加 `--advanced` 放回實驗三章節。
- **封面後自動插一頁目錄、頁尾有頁碼**：`build_lab1_report.py` 跑兩段——先組一次轉 PDF、用 `pdftotext` 找每個章節落在第幾頁，再帶著目錄重組（目錄佔一頁，頁碼 +1）。所以本機要有 `soffice` 與 `pdftotext`。表格一律整張不跨頁（每列 `cantSplit`＋列間 keep-with-next），超過一頁放不下的表要自己拆。
- **`--final` 是交件版**：不印使用說明框、草稿不上綠底也不加標記、待填處改輸出寫好的學生語氣內容（實驗目的、六題講義問題、LTspice 對照、實驗一＋二合併 I-V 圖）、表格空格不塗黃。沒有 `--final` 仍是帶黃綠底的工作版。
- 預填版已放入實驗一、二的 Tinkercad 截圖與掃描表、KiCad 電路圖、LTspice 網表與曲線、比較表；黃底是待填（照片、實測、自己的分析），綠底是要用自己的話改寫的草稿。
- 實測數據填進 `measured/lab1-exp1-forward.csv`、`measured/lab1-exp2-reverse.csv` 後重跑，實測表與疊圖會自動帶入。已存在的 docx 不會被覆寫，要加 `--force` 或用 `-o` 另存，避免蓋掉在 Word 手改的內容。
- `report/*.docx` 與 `report/build/` 已列入 `.gitignore`（含學號，且 repo 是公開的）。
- **當天上傳用的「實驗數據結果」**：`report/build_lab1_data_results.py --id <學號> --name <姓名>` 讀 `measured/Lab1-數據記錄.xlsx`
  的快取值（要先在 Excel 存檔）排成實驗一、二的數據表＋matplotlib 重畫的對照圖＋現場照片（放 `_outputs/lab1/photos/`），
  輸出 `_outputs/lab1/<學號>_<姓名>_Lab 1 實驗數據結果.docx`；已存在時加 `--force`。
  轉 PDF 用 `soffice --headless --convert-to pdf --outdir <同資料夾> <docx>`。**這台 Mac 的 LibreOffice 原本找不到任何 CJK 字型**
  （中文全變方框，pptx 那條「微軟正黑體被替代」的根因也是這個），把 `/System/Library/Fonts/Supplemental/Arial Unicode.ttf`
  複製到 `~/Library/Application Support/LibreOffice/4/user/fonts/` 之後就正常（2026-10-03 已放）。
