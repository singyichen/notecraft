# Lab 2 BJT 實驗：模擬檔案

電子學實作系列第 6 週 `App_Lab2.pdf`（BJT 偏壓與特性曲線、CE 放大器）的 CircuitJS 電路檔與 LTspice 網表。LTspice 全部用內建元件庫的 2N2222 模型（`.model` 已內嵌，檔案自足）。結果圖輸出到 `public/note-images/ec-week6-ltspice/`，嵌在第 6 週筆記的 Lab 2 各實驗小節。

| 檔案 | 內容 | 分析 |
| --- | --- | --- |
| `circuitjs/lab2-exp1-characteristic.txt` | 分壓偏壓（R1 10k、R2 4.7k、RC 1k）加 VBB／VCC 兩支滑桿，示波器看 RC 電流（= IC） | CircuitJS |
| `circuitjs/lab2-exp2-beta.txt` | 同電路，VBB = VCC = 15 V，示波器看 R1、R2、RC 電流（IB = I_R1 − I_R2） | CircuitJS |
| `circuitjs/lab2-exp3-ce-amp.txt` | CE 放大器（10 kHz、50 mV 峰值），示波器看 Vs、Vb、Vout；三顆電容給了初始電壓避免啟動暫態 | CircuitJS |
| `circuitjs/lab2-exp3-ce-amp-no-bypass.txt` | 同上但拿掉旁路電容 C3（講義問題 1） | CircuitJS |
| `lab2-exp1-curves.cir` | 輸出特性曲線族：VBB 1.5／2／2.2／2.4 V，VCC 0→15 V | `.step` + `.dc` |
| `lab2-exp1-vbb-sweep.cir` | VCC 15 V 固定，VBB 0→3 V 看 ON／OFF 門檻 | `.dc` |
| `lab2-exp2-op.cir` | 單電源 VBB = VCC = 15 V 的工作點（IB、IC、VCE、β_forced） | `.op` |
| `lab2-exp2-op-vbb.cir` | VCC 15 V，VBB 取 1.5／2／2.2／2.4／15 V 的工作點 | `.step` + `.op` |
| `lab2-exp3-ce-amp.cir` | CE 放大器，`.step` RC1 100 Ω／1 kΩ × C3 有／無（講義問題 1、3） | `.tran` |
| `lab2-exp1-beta-sens.cir` | 主動區工作點（VBB 2.4 V）對 β 的敏感度，講義問題 3 的對照組 | `.step` + `.op` |
| `lab2-q2-rc-sweep.cir` | 講義問題 2：掃 RC（18 個值）找 VC = VCC/2 的那一顆 | `.step` + `.op` |
| `lab2-q3-beta.cir` | 講義問題 3：飽和時掃 β 50／100／200 | `.step` + `.op` |
| `lab2-bonus-qpoint.cir` | 第一部分 Bonus：講義第 15 頁電路掃 Re 找負載線中點 | `.step` + `.op` |
| `lab2-bonus-qpoint-beta.cir` | 同上定案（Re 4.7 kΩ）對 β 的敏感度 | `.step` + `.op` |
| `lab2-exp3-ce-amp-op.cir` | CE 放大器的直流工作點（RC1 100 Ω／1 kΩ） | `.step` + `.op` |
| `lab2-bonus-c3-ac.cir` | 第二部分 Bonus：掃 C3 看增益天花板（只加大 C3 最多到 16.6） | `.ac` + `.meas` |
| `lab2-bonus-design-ac.cir` | 全旁路方案掃 RC1 | `.ac` + `.meas` |
| `lab2-bonus-degen-ac.cir` | 部分旁路方案掃 RC1，定案 620 Ω | `.ac` + `.meas` |
| `lab2-bonus-degen.cir`／`-op.cir` | 定案設計的時域與工作點驗證（Av 20.1、不對稱 1.6%） | `.tran`／`.op` |
| `lab2-bonus-design.cir`／`-op.cir` | 最小改動方案（RC1 120 Ω 全旁路）的對照 | `.tran`／`.op` |
| `plot.py` | 讀 `.raw` 出四張 PNG（曲線族＋負載線、VBB 門檻掃描、CE 四組波形、Bonus 的增益天花板與兩種設計比較），並印出工作點與增益 | 讀 `.raw` |

CE 放大器的電阻值講義沒有給（Bonus 要自己設計），`lab2-exp3-ce-amp.cir` 用的是把元件表（100 Ω×2、1 kΩ×1、10 kΩ×3、1 µF×3）剛好用完、且讓三個講義問題都有意義的唯一組合：R1 = R2 = RL1 = 10 kΩ、RE1 = 1 kΩ、RC1 = RS1 = 100 Ω。實驗當天以助教公布為準。

## 跑法

```bash
cd simulations/lab2
../tools/run-lt.sh lab2-*.cir                 # 產生 .raw / .log
../lab1/.venv/bin/python plot.py              # 共用 lab1 的 venv（numpy、matplotlib）
node ../../.claude/skills/lab-workflow/scripts/circuitjs-link.mjs circuitjs/*.txt   # 印 CircuitJS 連結
```

`.raw`／`.log` 不進版控（見 `.gitignore`），重新 clone 後先跑 `run-lt.sh` 再跑 `plot.py`。

## Tinkercad

實驗一的設計：`Lab 2 Exp 1: BJT Biasing & Characteristic Curve`（<https://www.tinkercad.com/things/f1i0PdS6UlX>）。版面：R1 i6–i10、R2 j10–j14、RC g11–g15、2N2222 在 f9（E）／f10（B）／f11（C）、本體轉 180° 掛進溝槽；VBB 走上方 + 軌、兩台電源的 − 共接上方 − 軌；左表量 V_BE（h10 對 − 軌）、中表量 V_CE（h11 對 − 軌）、右表串在 VCC 與 RC 之間量 I_C。截圖在 `public/note-images/ec-week6-tinkercad/`，電流分析圖由 `annotate_current_path.py` 疊在原圖上產生（原名加 `-current`）。

## 記錄簿

`build_record_xlsx.py` 產生實驗當天用的 `measured/Lab2-數據記錄.xlsx`：四張工作表（說明／實驗一 特性曲線
四組 × 31 列／實驗二 beta／第二部分 CE 放大器），預報欄直接讀 `.raw`，黃底格子是當天要填的。
檔案已存在時不覆蓋，要重產範本加 `--force`。

```bash
../lab1/.venv/bin/python build_record_xlsx.py
```

## Tinkercad（第二部分）

CE 放大器的設計：`Lab 2 Exp 3 CE Amplifier`（<https://www.tinkercad.com/things/eKNcZ9VKvAu>）。
元件橫插上半區、訊號源那段放下半區，一條跳線跨溝槽接到基極；腳位與跳線表見第 6 週筆記。
電流分析圖由 `annotate_ce_current.py` 疊在 `lab2-exp3-breadboard-zoom.png` 上產生（座標直接取自
Tinkercad 的 DOM，不是手量）。

**這個電路 Tinkercad 跑不動**：接上函數波產生器後電源被拉到限流、軌電壓從 12 V 塌到 2–3 V。
把振幅設成 0 V 症狀一樣，把儀器全部移除則回到正確的 12.0 V／5.83 mA——是求解器失效，不是接線錯。
第二部分的所有讀值一律以 LTspice 為準。
