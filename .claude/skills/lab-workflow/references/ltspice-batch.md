# LTspice：真實元件模型、批次執行與畫圖

作者本機是 macOS 版 LTspice（26.x，CrossOver 包裝的 Windows 版）。GUI 開 `.cir` 按 Run 即可；線上版 <https://my.analog.com/en/app/> 可上傳同一個檔案。要產生筆記用的圖與數字，走批次模式。

## 目錄慣例

```
simulations/
  tools/run-lt.sh      批次執行（macOS CrossOver 版的呼叫方式已封裝）
  tools/ltraw.py       .raw 讀取器：read_raw(path) → (names, steps)；stats(t, v, f, cycles)
  <lab>/*.cir          每個實驗一個網表，檔頭一行中文說明，.model 內嵌（檔案自足，線上版也能開）
  <lab>/plot.py        用 dataviz 參考色票畫 PNG 到 public/note-images/<slug>/
  <lab>/README.md      檔案表 + 三種跑法
  <lab>/.gitignore     *.raw *.log .venv/
```

## 指令

```bash
cd simulations/<lab>
../tools/run-lt.sh *.cir                                   # 每個 .cir 產生 .raw/.log，印 ok/FAIL
python3 -m venv .venv && .venv/bin/pip install numpy matplotlib
.venv/bin/python plot.py
```

## 元件模型

- 標準庫在 `/Applications/LTspice.app/Contents/SharedSupport/ltspice/support/ltspice/drive_c/users/crossover/AppData/Local/LTspice/lib/cmp/`。`standard.dio` 是 latin-1，直接 `grep -ai '^\.model 1N4007 ' standard.dio`；**`standard.bjt`、`standard.mos` 是 UTF-16LE**，要 `iconv -f UTF-16LE -t UTF-8 standard.bjt | grep -ai '^\.model 2N3904 '`。找到後**把整段 `.model` 貼進網表**（BJT 的模型常跨多行，`+` 開頭的續行也要一起複製），不要用 `.lib` 引用，線上版才開得起來。常用型號：二極體 1N4007／1N4148、BJT 2N3904（NPN）／2N3906（PNP）／2N2222、MOSFET 2N7002（VDMOS）／BS170。
- 找不到型號時自訂：`.model Z6V8 D(Is=1e-14 N=1 Rs=0.5 Bv=6.8 Ibv=1m)`，並在筆記註明是概念模型。

## 分析語句

| 實驗類型 | 語句 | 備註 |
| --- | --- | --- |
| I-V 掃描 | `.dc Vs 0 2 0.01` | 掃描變數存 double，其餘 float |
| 波形 | `.tran 0 50m 0 10u` | 第四個數是最大步長 |
| 多組電容比較 | `C1 out 0 {C}` + `.step param C list 1u 10u 100u` | RC 大的要把 `.tran` 拉到 3 s 以上才到穩態，只畫最後 50 ms |
| 直流工作點（BJT／MOS 偏壓） | `.op` | 結果在 `.log`（UTF-16LE，`iconv` 後讀）；讀 $I_C$、$V_{CE}$ 判斷主動／飽和區 |
| 輸出特性曲線族 | `.dc Vce 0 10 0.05 Ib 0 100u 20u` | 第二個掃描變數產生一族曲線，`ltraw.py` 會依 Vce 重頭開始切段 |
| 放大器增益 | `.tran` + 小訊號正弦輸入，用 `stats()` 取 Vout 與 Vin 的峰值相除 | 削頂＝進飽和或截止，改偏壓再跑 |

## 讀取 .raw 的要點（ltraw.py 已處理）

標頭是 UTF-16LE，`No. Variables:` 與 `Variables:` 會撞字串，要用 `\nVariables:\n` 切；`Binary:` 之後每點是 1 個 double（掃描變數）+ (N−1) 個 float32；`.step` 的各組資料串在一起，靠掃描變數重新從頭開始切段。

## 畫圖

先載入 `dataviz` skill：淺色底 `#fcfcfb`、系列色藍 `#2a78d6`／橘 `#eb6834`／綠 `#1baf7a`（已通過驗證器）、2 px 線、hairline 格線、≥2 條線要有圖例並在圖例寫出關鍵數字（例如「C = 10 µF，漣波 0.61 V」）。圖檔輸出到 `public/note-images/<slug>/`，一定要用 Read 工具打開每張圖看過。
