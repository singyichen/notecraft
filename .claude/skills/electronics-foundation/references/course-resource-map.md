# 電子學公開課程資源映射

本檔只負責「選哪個外部單元、怎麼限時使用」。概念如何向數學背景作者解釋，仍依 `SKILL.md` 的五段輸出契約與其他 references。

## 選擇原則

1. 先從當週筆記辨認唯一的主要缺口：物理地基、電路分析、元件模型、小訊號、運放／回授，或量測。
2. 每個學習目標最多選一個主教材與一個練習來源；同一門課中為完成同一目標而連續使用的相鄰單元，仍算一個主教材。優先使用和 Razavi／當週術語相容的資源；只有原解釋仍卡住時才換第二種講法。
3. 來源優先序：大學或課程官方頁 > 講師官方播放清單 > 策展 repo。策展 repo 是發現入口，不是單元內容的證據。
4. 推薦前確認課程名稱、目標單元、免費存取方式與連結。只有實際確認過影片標題與內容時才寫講次或時間戳；否則提供課程入口與搜尋詞。
5. 不安排從第一講開始完整修課。只取能回答當週問題、並能在可用時間內產生可檢查成果的片段。

來源索引：[mabdulre9/electrical-engineering](https://github.com/mabdulre9/electrical-engineering)。下列官方入口最後核對日期：2026-09-21；使用時若能連網，仍應重新確認。

## 核心資源

| 資源 | 適合用途 | 使用方式與限制 |
| --- | --- | --- |
| [MIT 3.15.1x — Electronic Materials and Devices](https://openlearninglibrary.mit.edu/courses/course-v1:MITX%2B3.15.1x%2B2T2017/about) | 半導體物理、漂移／擴散、PN 接面、二極體方程式、BJT／MOS 工作原理 | 物理地基首選；課程頁列出 Week 1–4 主題。可能需要免費帳號。它偏元件物理，不取代放大器電路分析。 |
| [MIT 6.002 — Circuits and Electronics](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/) | KCL／KVL、Thevenin、非線性與小訊號、MOS 放大器、頻率響應、濾波器、運放與回授 | 電路分析與練習首選；官方頁有影片、講義、作業、考題。課程年代較早但基礎模型仍適用；術語與 Razavi 不同時要明確對照。 |
| [Razavi Electronics 1](https://www.youtube.com/playlist?list=PLiDoPUX9nLkJ8dnPgKoVEOiAb8BfulKRR) | 二極體、BJT、MOS、單級放大器、運放；配合《Fundamentals of Microelectronics》 | 與本站教材語言最接近。YouTube 清單的排序、標題可能變動；用概念搜尋，不猜講次或時間戳。 |
| [Razavi Electronics 2](https://www.youtube.com/playlist?list=PLO4mxQzfcml_56XSGcA8ULOv7qEtZd0Hy) | 後續類比電路、頻率響應與回授延伸 | 只在當週主題進入後段類比電路時使用，不作前十週預設主教材。 |
| [NPTEL — Electrical Measurement and Electronic Instruments](https://nptel.ac.in/courses/108105153) | 示波器、電子量測、誤差與儀器觀念 | 實驗週按儀器或誤差主題選片段；不要求從頭修完。 |
| [NPTEL — Measurement and Instrumentation](https://nptel.ac.in/courses/108103862) | 量測系統、感測器、橋式量測與資料擷取 | 前一門找不到需要的量測主題時才使用。 |

## NoteCraft 週次與概念映射

| 筆記週次／主題 | 主要缺口 | 主教材與範圍 | 可選練習 |
| --- | --- | --- | --- |
| 第 1 週：半導體物理 | 能帶、載子、漂移、擴散 | MIT 3.15.1x Week 1–2 | 用筆記公式做因次檢查與單變數自測 |
| 第 2 週：PN 接面、二極體 | 平衡、偏壓、二極體方程式 | MIT 3.15.1x Week 3；需要 Razavi 術語時改用 Electronics 1 對應段落 | MIT 6.002 的非線性／增量分析只用來補小訊號觀念 |
| 第 3 週：整流實驗 | KCL／KVL、二極體模型、RC 放電、量測 | Razavi Electronics 1 的 diode circuits；電路先備不足時取 MIT 6.002 L1–L3 主題 | 重建 CircuitJS／Tinkercad／LTspice 電路，填預測與模擬值 |
| 第 4 週：BJT | 元件物理、工作區、跨導 | MIT 3.15.1x Week 4 或 Razavi Electronics 1 的 BJT 段落 | 自己從指數式對工作點微分得到 $g_m$ |
| 第 6 週：CE 放大器 | 偏壓、負載線、小訊號、增益與擺幅 | Razavi Electronics 1 的 BJT amplifier 段落；MIT 6.002 amplifier／operating-point／small-signal 主題作第二視角 | 手算工作點後，改一個偏壓或負載並預測削波方向 |
| 第 7 週：MOS、CS 放大器 | MOS 工作區、偏壓、平方律局部線性化 | MIT 6.002 的 MOS amplifier、large-signal、small-signal 主題；需要教材同語言時用 Razavi Electronics 1 | 從平方律推 $g_m$，再用模擬驗證飽和條件與輸出擺幅 |
| 第 9 週：運放 | 黑盒抽象、虛短路、負回授、非理想性 | MIT 6.002 的 op-amp abstraction／feedback；Razavi Electronics 1 作術語對照 | 從有限開迴路增益取 $A\to\infty$ 極限，再解一題 KCL |
| 第 10 週：MOS／運放實驗 | 反相、加法、工作區與量測差異 | MIT 6.002 的 op-amp circuits；NPTEL 只補本次會用到的儀器主題 | 建立預測／模擬／實測／差異原因表 |
| 第 11–16 週候選：頻率響應、濾波、回授、振盪器 | 複阻抗、極點、Bode 圖、穩定度 | MIT 6.002 的 sinusoidal steady state／impedance／filters／feedback／oscillators；進階再用 Razavi Electronics 2 | 選一個傳遞函數，手推極點並與模擬 Bode 圖核對 |

MIT 6.002 的 `L1–L3` 指官方 calendar 的主題編號；其他項目以主題名稱定位，避免 calendar 與舊版影片頁的講次編號不一致。

## 限時學習計畫

先把使用者提供的總時間分配完，再推薦內容；每段都要有可觀察的完成條件。

| 可用時間 | 建議配置 |
| --- | --- |
| 30 分鐘 | 5 分鐘盤點缺口；15 分鐘單一片段；10 分鐘手推或一題自測 |
| 60 分鐘 | 10 分鐘地基；20 分鐘主教材；20 分鐘推導／例題；10 分鐘回想摘要 |
| 90 分鐘 | 10 分鐘地基；25 分鐘主教材；25 分鐘推導；20 分鐘模擬或題目；10 分鐘自測與整理 |
| 120 分鐘以上 | 先完成 90 分鐘版本；剩餘時間才加入第二視角或額外題目，不延長被動觀看 |

影片時間超過預算時，用官方章節、逐字稿或站內搜尋定位概念；找不到可確認的片段就改用官方講義。不得用猜測的時間戳填滿計畫。

## 輸出格式

外部教材型回答依序給：

1. **目前缺口**：用一句話指出這次只補哪個概念，以及已具備哪些先備知識。
2. **選擇結果**：主教材、精確到已驗證的單元或搜尋詞、選它而不選完整課程的理由；需要時加一個練習來源。
3. **限時安排**：時間、動作、完成條件三欄；總分鐘數必須等於使用者給的時間。
4. **概念轉譯**：回到 `SKILL.md` 的五段輸出契約，不以連結清單代替解釋。
5. **產出物**：指定一個可保存進 NoteCraft 的成果，例如推導、錯題、比較表或實驗證據鏈。
6. **來源狀態**：列出實際確認的官方入口；若某講次、標題或時間戳未確認，明說並提供搜尋詞。

## 常見錯誤

- 從 repo 一次推薦三門完整課程，讓補充教材變成第二份課綱。
- 只因清單收錄就宣稱某門課包含特定單元，沒有回官方頁確認。
- 猜影片編號、標題、網址或時間戳；查不到時應降級成課程入口與搜尋詞。
- 只排「看影片」，沒有推導、題目、模擬或完成條件。
- 用外部講師的術語直接覆蓋 Razavi；不同符號與模型必須先對照。
