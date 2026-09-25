# Lab 1：KiCad 結報電路圖

Tinkercad 的線路圖檢視不畫電表、會留開放端，結報要放的正式電路圖改用 KiCad 畫。原理圖檔是用 `gen_exp1.py` 從 KiCad 內建符號庫（Device、Diode、Simulation_SPICE、power）組出來的純文字 `.kicad_sch`，可直接在 KiCad 10 打開微調；SVG 複製一份到 `public/note-images/ec-week3-kicad/` 嵌進第 3 週筆記。

| 檔案 | 內容 |
| --- | --- |
| `lab1-exp1-forward.kicad_sch` / `.kicad_pro` | 實驗一順偏量測電路：$V_s$ → D1 1N4007 陽極 → 陰極 → R1 1 kΩ → 電流表 → $V_s$ −，電壓表跨在 D1 兩端 |
| `lab1-exp1-forward.svg` | 筆記用：不含圖框、已用 `../../tools/svg_crop.py` 裁到內容邊界 |
| `lab1-exp1-forward-sheet.svg` / `.pdf` | 結報用：A5 橫式含圖框與標題欄（標題、日期、版次） |
| `lab1-exp1-forward.kicad.cir` | 由原理圖匯出的 SPICE 網表，用來和手寫的 `../lab1-exp1-forward.cir` 比對拓樸 |
| `gen_exp1.py` | 產生器；共用的 S-expression 工具在 `../../tools/kicad_sexp.py` |
| `lab1-exp3-halfwave.*`、`gen_exp3.py` | 實驗三半波整流量測電路：$V_{in}$ 正弦 60 Hz／10 Vpp → D1 1N4007 → $V_{out}$ → R1 10 kΩ ∥ C1 1 µF → GND。C1 是講義第 20 頁才並上去的，圖上有註明第 18 頁先不要接；示波器不畫符號，改用文字說明 CH1／CH2 接在哪 |
| `lab1-exp4-bridge.*`、`gen_exp4.py` | 實驗四全波橋式量測電路：$V_{in}$ 正弦 60 Hz／5 Vpp 接 A、B 兩節點，D1–D4 1N4007 組成橋，左分支中點是 N（接地）、右分支中點是 P，$R_L$ 10 kΩ 跨在 P、N 之間。二極體編號與講義第 25 頁一致；圖上註明第 26／27 頁要並上的 C 與齊納 |
| `lab1-exp2-reverse.*`、`gen_exp2.py` | 實驗二逆偏量測電路：與實驗一同拓樸，D1 旋轉 270° 反接（陰極朝 $V_s$ 正端），電壓表 + 端接陰極側所以讀值為正；同一套 `.svg`／`-sheet.svg`／`.pdf`／`.kicad.cir` 輸出，指令把檔名換成 `lab1-exp2-reverse` 即可 |

## 重新產生與驗證

```bash
cd simulations/lab1/kicad
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
python3 gen_exp1.py lab1-exp1-forward.kicad_sch   # 實驗二、三、四：gen_exp2/3/4.py，檔名換成 lab1-exp2-reverse / lab1-exp3-halfwave / lab1-exp4-bridge
$KC sch erc --severity-all --exit-code-violations -o erc.rpt lab1-exp1-forward.kicad_sch   # 0 違規才算過
$KC sch upgrade --force lab1-exp1-forward.kicad_sch     # 轉成 KiCad 10 格式，GUI 開啟才不會警告「舊版建立」
$KC sch export svg -o svg lab1-exp1-forward.kicad_sch && mv svg/lab1-exp1-forward.svg lab1-exp1-forward-sheet.svg
$KC sch export svg --exclude-drawing-sheet -o svg lab1-exp1-forward.kicad_sch
python3 ../../tools/svg_crop.py svg/lab1-exp1-forward.svg lab1-exp1-forward.svg 4 && rm -r svg
$KC sch export pdf -o lab1-exp1-forward.pdf lab1-exp1-forward.kicad_sch
$KC sch export netlist --format spice -o lab1-exp1-forward.kicad.cir lab1-exp1-forward.kicad_sch
cp lab1-exp1-forward.svg ../../../public/note-images/ec-week3-kicad/
```

## 畫法約定

- 電表（`Device:Voltmeter_DC`／`Ammeter_DC`）的 V、A 是文字物件，會跟著符號轉，所以二極體、電阻、電表一律直立擺放。
- 電流表在模擬裡定義成 0 V 的 DC 電壓源（`Sim.Device=V`、`dc=0`），匯出的網表才會閉合；電壓表不參與模擬（`exclude_from_sim`）。
- D1 帶 `Sim.Params`，值與 `../lab1-exp1-forward.cir` 的 `.model 1N4007` 相同，方便交叉比對。
- GND 節點放一個 `PWR_FLAG`，否則 ERC 會報「Input Power pin not driven」。
- 紙張用 A5 橫式，電路放左上空白區、標題欄在右下角互不重疊；圖內只留一行標題與驗算式，接線順序與器材對照寫在筆記裡。
- kicad-cli 跑完會留下 `.kicad_prl`（個人偏好）與 `erc.rpt`，GUI 開檔會留 `~*.lck`，都不進版控。
- 跑 ERC 時不要把輸出接 `tail`，會吃掉退出碼；補線後一定看網表有沒有 `unconnected-` 節點。
- 在 GUI 開著檔案時重跑產生器，KiCad 會提示檔案已被外部修改，選重新載入即可；GUI 手動改過的內容不要再跑產生器，否則會被蓋掉。

## 驗證過的結果

四張圖的 ERC 都是 **0 errors**（只有 `kicad-cli` 沒載入符號庫表造成的 `lib_symbol_issues` 警告，GUI 開啟時不會出現）。
實驗三、四另外把匯出的 SPICE 網表和手寫的 `../lab1-exp3-halfwave.cir`、`../lab1-exp4-bridge.cir` 比對過，
節點關係完全一致——橋式那張特別要比，四顆二極體的方向是最容易畫反的地方。
