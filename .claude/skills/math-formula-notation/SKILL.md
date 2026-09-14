---
name: math-formula-notation
description: 筆記內容涉及數學／物理／化學公式與計算推導時，統一用 KaTeX 方程式呈現的寫作規範——多步驟推導要獨立成 display math 區塊（用 aligned 對齊），不要塞進同一句話裡用行內小字或反引號 unicode 上下標湊合。當作者要求「把這個 example／公式整理進筆記」「這個計算過程幫我列出來」，或任何筆記段落包含算式、推導、代入數字求值時使用。Also triggers on "turn this formula into a proper equation" / "math notation" / "KaTeX".
---

# Math Formula Notation Skill

NoteCraft 的 markdown pipeline 已經接好 **KaTeX**（`astro.config.mjs` 的 `remark-math` + `rehype-katex`，樣式在 `src/styles/global.css` 的「Math」區塊），不需要再另外安裝或設定。這個 skill 規範的是**寫進筆記時該怎麼用**，不是怎麼裝。

## 何時使用

- 筆記正文（不是 `@ai-visualize` 生成元件）裡出現數學、物理、化學公式，尤其是**多步驟計算或推導**（例如教科書的 Example、公式代入求值、化學反應式平衡計量）
- 把 PDF 投影片裡的例題／公式整理進筆記時
- 看到筆記裡有用反引號包 unicode 上下標湊出來的假公式（例如 `` `n ≈ N_D = 10¹⁶` ``），要重寫成真正的方程式

## 核心規則

**任何計算過程（有兩個以上推導/代入步驟）一律獨立成一段 KaTeX display math 區塊，不要擠在同一句話裡用行內小字呈現。**

這條規則的由來：早期筆記把公式寫成反引號包住的 unicode 上下標（`` `p ≈ n_i²/N_D = 1.17×10⁴` ``），只是等寬字體的純文字，跟教科書投影片上獨立方框顯示的真正數學排版差很多，讀者事後也認不出這是「公式」還是「程式碼」。改用 KaTeX 後，**推導步驟還是不能全部擠在一句話裡**——即使公式本身渲染正確，一整句夾雜三四個行內公式仍然讀不出「這是一個計算過程」的節奏感，跟投影片上獨立一個方框的呈現方式差很多。

具體判斷：

| 情況 | 處理方式 |
| --- | --- |
| 單一個簡短符號或代換（例如 $V_T$、$N_A$、$E=V/L$） | 行內 `$...$` 即可，不用獨立成塊 |
| 一句話裡有**兩個以上**推導/代入步驟（設定 → 代入 → 求值） | 獨立成 `$$...$$` 區塊；三步以上用 `\begin{aligned}...\end{aligned}` 逐行對齊 |
| 教科書 Example／例題的完整解法 | 一律獨立成塊，即使只有一步 | 
| 反應式配平、多步驟合成路徑（化學） | 同樣獨立成塊，箭頭用 `\rightarrow` 或 `\xrightarrow{條件}` |

## 向量／矩陣排版比照原始講義

投影片／PDF 裡向量或矩陣是**直式（column，`\begin{bmatrix} a \\ b \\ \vdots \end{bmatrix}`）還是橫式（row，`[a, b, \dots]`）呈現，筆記就照樣寫成同樣的排版**，不要為了塞進行內句子而簡化成「橫式 + 轉置上標」的緊湊寫法（例如把直式的 $\boldsymbol{x}=\begin{bmatrix}x_1\\x_2\\\vdots\\x_m\end{bmatrix}$ 寫成 $\boldsymbol{x}=[x_1,x_2,\dots,x_m]^T$）——兩者數學上等價，但排版跟原始講義不同，讀者對照投影片截圖時會覺得對不起來。

即使因此讓公式變成行內多行的 `bmatrix`（视觉上比單行轉置寫法高），只要原始講義是這樣畫的就照樣寫，不要為了行內美觀擅自簡化記法。

## 裸的數學符號一律包進 `$...$`

只要判定某個英文字母／符號在上下文裡是**數學定義（變數、參數、向量、函式名）**，就要寫成 `$w$`、`$b$`、`$z$`、`$\boldsymbol{x}$` 這樣的 KaTeX 行內公式，不能留成純文字或用 **粗體** 代替——即使只是單一個字母，即使旁邊的句子是中文敘述。原始投影片裡這些符號本來就是用數學斜體排版，筆記轉寫成純文字（含粗體）會讓讀者對照原始講義時覺得「同一個符號但長得不一樣」。

判斷準則：這個字母指的是**某個具體的量**（權重、偏差、某次迭代的輸出、某個座標軸的值……），不是在講「這個英文單字本身」，就要包 `$...$`：

| 情境 | 錯誤（純文字/粗體） | 正確（KaTeX） |
| --- | --- | --- |
| 提到權重向量、偏差純量 | 把權重 w 與偏差 b 初始化為 0 | 把權重 $\boldsymbol{w}$ 與偏差 $b$ 初始化為 0 |
| 描述某條線/函式的角色 | z 值切成兩個類別 | $z$ 值切成兩個類別 |
| 句子裡帶等式 | 正樣本（y = +1）被誤判 | 正樣本（$y=+1$）被誤判 |
| 學習率等希臘字母 | η 是學習率 | $\eta$ 是學習率 |

**例外，不需要包 `$...$`：** Markdown 圖片 `alt` 文字（`![...]`，remark-math 不解析屬性字串，包了也不會渲染，只會顯示原始 `$` 符號）；`@ai-visualize` 標記裡給 AI 看的 `prompt` 內容與 `<GeneratedFrame prompt={...}>` 屬性（那是生成指令，不是讀者看的正文）；`@ai-reference` 標記的 `excerpt` 欄位（要求逐字對應 PDF 原文，不應該重新排版）；指向實際程式碼識別字的反引號（例如 `` `w_`、`b_`、`eta` `` 這些是 Python 屬性名稱，不是抽象數學符號）。

## 寫法

行內：

```mdx
矽的能隙 $E_g = 1.12\text{ eV}$，質量作用定律 $np = n_i^2$。
```

單一計算式獨立成塊：

```mdx
$$
V_0 = V_T\ln\!\left(\dfrac{N_AN_D}{n_i^2}\right)
$$
```

多步驟推導用 `aligned`（`&` 對齊等號，`\\` 換行）：

```mdx
- **Example 2-3（第 19 頁）**：一片矽均勻摻雜磷原子，摻雜濃度 $N_D = 10^{16}\text{ electrons/cm}^3$，滿足 $N_D \gg n_i$：

$$
\begin{aligned}
n &\approx N_D = 10^{16}\text{ electrons/cm}^3 \\
\because\ n_i(T=300\text{K}) &= 1.08\times10^{10}\text{ electrons/cm}^3 \\
p &\approx \frac{n_i^2}{N_D} = \frac{(1.08\times10^{10})^2}{10^{16}} = 1.17\times10^4\text{ holes/cm}^3
\end{aligned}
$$

投影片結論：**...**（此例說明了為何電子稱多數載子、電洞稱少數載子）。
```

段落結構固定為三段：**設定句**（bullet 開頭，交代已知條件，以冒號收尾）→ **獨立的 display math 區塊**（空行前後隔開）→ **結論句**（解讀結果、呼應投影片原文）。這個區塊會讓 bullet list 中斷、之後若接下一個 `-` 開頭的項目會重新起一個新 list，這是既有慣例（筆記裡的圖片插入也是同樣打斷 bullet 的做法），不是錯誤。

## 常見換算對照

| 原本反引號/unicode 寫法 | KaTeX 寫法 |
| --- | --- |
| `` `10¹⁶` ``、`` `cm⁻³` ``（上標） | `10^{16}`、`\text{cm}^{-3}` |
| `` `N_D`、`V_T` ``（底線下標） | 保留 `N_D`、`V_T`（單字元下標可以不加大括號，多字元下標用 `N_{D,on}`） |
| `×` | `\times` |
| `≈`、`≫`、`≠` | `\approx`、`\gg`、`\neq` |
| `±`、`−`（減號 U+2212） | `\pm`、`-` |
| `√(...)` | `\sqrt{...}` |
| `Δ`、`μ`、`λ`、`Σ`、`ε` | `\Delta`、`\mu`、`\lambda`、`\Sigma`、`\varepsilon` |
| `Y = (A+B)‾`（上加一橫表反相） | `Y = \overline{A+B}` |
| `exp(...)`、`ln(...)`、`log₁₀(...)` | `\exp(...)`、`\ln(...)`、`\log_{10}(...)` |
| 單位（mV、μm、cm²/s、kΩ...） | 一律包 `\text{}`，例如 `\text{mV}`、`\mu\text{m}`、`\text{cm}^2/\text{s}`、`\text{k}\Omega` |

## 重要陷阱：math 模式裡不能有裸中文字

KaTeX 的 `$...$` / `$$...$$` 裡如果直接寫中文字（沒有包在 `\text{}` 裡），輕則字型跑掉變成鋸齒狀的數學斜體中文，重則整個 build 直接噴 `ParseError` 失敗（本專案 `rehype-katex` 是預設的 `throwOnError: true`，一個公式壞掉會讓 `astro build` 整個失敗）。

錯誤示範：

```
$V_R = -1\text{V}\ 時\quad C_j = ...$    ← 「時」裸露在 \text{} 外面
```

正確做法：把中文說明整句移到 `$...$` 外面當一般 markdown 文字，或把整個片語（含中文）包進同一個 `\text{}`：

```
$V_R = -1\text{V}$ 時 $C_j = ...$        ← 中文移到數學模式外
C_j(V_R=-1\text{V}) = ...                ← 或者用下標描述代替中文插入
```

## 重要陷阱：清單項目裡的 `$$` 區塊縮排不足會打斷整個清單

`$$...$$` display math 區塊如果寫在**清單項目（`1.`／`-`）裡面**（例如「推導步驟」本身就是某個有序清單項目的內容），這個區塊的 `$$` 起始行、公式本體、結尾 `$$`，**縮排都必須對齊該清單項目的內容欄位**，否則 remark 會把它判定為縮排不足、直接跳出清單——不只斷開這個項目，後面所有清單項目都會被打斷。

更危險的是：清單斷開後，如果緊接著的下一個清單標記不是從 `1.` 開始（例如是 `3.`），CommonMark 規定**有序清單只有起始數字為 1 時才能打斷前一個段落**，於是這個 `3.` 不會被當成新的清單項目，而是被解析成純文字、直接黏進前一段落——肉眼看起來就是「這一點沒有編號、跟上一行擠在一起」的跑版。這個陷阱不會讓 `astro build` 失敗（純文字沒有語法錯誤），只會默默跑版，所以必須肉眼核對渲染結果，不能只看 build 有沒有過。

錯誤示範（`$$` 沒有縮排，導致第 2 項的巢狀 bullet、以及後面的第 3 項全部脫離清單）：

```mdx
2. 逐一檢查每一筆訓練樣本：
   - 若分類錯誤，依更新規則調整參數：

$$
w \leftarrow w + \eta \cdot y \cdot x
$$

3. 重複整個資料集，直到收斂為止
```

正確做法（`$$` 縮排對齊到清單項目的內容欄位，這裡是巢狀 bullet `- ` 的內容欄位）：

```mdx
2. 逐一檢查每一筆訓練樣本：
   - 若分類錯誤，依更新規則調整參數：

     $$
     w \leftarrow w + \eta \cdot y \cdot x
     $$

3. 重複整個資料集，直到收斂為止
```

判斷該縮排幾格：數清單標記＋一個空格的寬度——有序清單 `2. ` 是 3 格，巢狀 bullet `   - ` （在 3 格縮排的清單項目底下）則是 3+2=5 格，`$$` 要縮排到跟公式所屬那一層清單的內容欄位對齊。不確定縮排是否正確時，可以用 remark 解析後檢查是否仍是單一個 list 節點：

```bash
node -e "
import('unified').then(async ({unified}) => {
  const remarkParse = (await import('remark-parse')).default;
  const remarkMath = (await import('remark-math')).default;
  const fs = await import('fs');
  const md = fs.readFileSync(process.argv[1], 'utf-8');
  const tree = unified().use(remarkParse).use(remarkMath).parse(md);
  console.log(tree.children.map(c => c.type + (c.type==='list' ? \`(\${c.children.length} items)\` : '')).join(' -> '));
});
" /path/to/snippet.md
```

如果輸出出現 `list -> math -> ... -> paragraph` 這種清單被切成好幾段的結果，就代表縮排有問題；正確時應該只有一個 `list` 節點。

## 驗證

寫完後一定要跑一次 build，確認沒有 KaTeX 解析錯誤（而不是只看有沒有 `$` 符號）：

```bash
npx astro build 2>&1 | tail -30
grep -a -c 'katex-error\|ParseError' dist/notes/<slug>/index.html   # 必須是 0
```

如果專案裡同時有其他人在跑 `astro dev`／`astro build`（共用 `dist/`），偶發的 `Cannot find module '.../renderers.mjs'` 是併發寫入造成的暫時性錯誤，重跑一次即可，不代表公式寫錯。

大量公式要一次轉換時（例如把一整個章節的舊寫法批次改寫），建議先用 Python 腳本做**字面（literal）字串替換**、每條公式手動核對過的對照表，而不是寫 regex 硬轉 unicode 上下標——公式的排版差異太大（巢狀括號、逗號下標、單位、上加橫線），regex 容易產生語法正確但排版錯誤的 LaTeX，肉眼核對過的對照表雖然前置成本高，但每一條的正確性可控。
