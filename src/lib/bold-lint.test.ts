import { test } from "node:test";
import assert from "node:assert/strict";
import { findBrokenBold } from "./bold-lint.ts";

/** 取回報的行號，方便比對。 */
const lines = (src: string) => findBrokenBold(src).map((f) => f.line);

test("正常的粗體不回報", () => {
  assert.deepEqual(lines("這是 **重點** 所在。"), []);
});

test("粗體後接全形標點不回報（right-flanking 成立）", () => {
  assert.deepEqual(lines("這是**重點**，不要漏看。"), []);
});

test("粗體在行尾不回報（行尾等同空白）", () => {
  assert.deepEqual(lines("- **電子學 vs. 微電子學（1.1 Electronics）**"), []);
});

test("收尾 ** 前是全形括號、後接中文 → 回報", () => {
  assert.deepEqual(lines("**導通電壓（knee voltage）**是二極體開始導通的電壓。"), [1]);
});

test("收尾 ** 前是句號、後接中文 → 回報", () => {
  assert.deepEqual(lines("可以拆成兩個問題：**前者較早實現；後者更接近量產。**所以兩者並不排斥。"), [1]);
});

test("開頭 ** 前是中文、後接全形引號 → 回報", () => {
  assert.deepEqual(lines("真正的瓶頸是**「知識如何被結構化」**。"), [1]);
});

test("開頭 ** 前是中文、後接錢字號 → 回報", () => {
  assert.deepEqual(lines("代入**$x$ 的定義**即可。"), [1]);
});

test("圍欄程式碼區塊內的 ** 不回報", () => {
  const src = ["```python", "return (self.x**2 + self.y**2)**0.5", "```"].join("\n");
  assert.deepEqual(lines(src), []);
});

test("行內程式碼裡的 ** 不回報", () => {
  assert.deepEqual(lines("函式簽章寫成 `def f(*args, **kwargs)` 這樣。"), []);
});

test("AI 標記註解區塊內的 ** 不回報", () => {
  const src = ["{/* @ai-visualize", "prompt: |", "  用**粗體**強調（這段不是正文）", "*/}"].join("\n");
  assert.deepEqual(lines(src), []);
});

test("回報多行時逐行列出", () => {
  const src = ["**甲（A）**乙", "正常的一行", "**丙（C）**丁"].join("\n");
  assert.deepEqual(lines(src), [1, 3]);
});

test("回報內容包含該行原文，方便人工核對", () => {
  const found = findBrokenBold("**導通電壓（knee voltage）**是二極體。");
  assert.equal(found.length, 1);
  assert.match(found[0].text, /導通電壓/);
});

// ── 以下為實跑全站語料時發現的偽陽性，逐一固定住 ──

test("粗體內容整段是行內程式碼不回報", () => {
  assert.deepEqual(lines("**`torch.nn.Module`** 是所有模型的共同基底。"), []);
});

test("粗體內含行內程式碼不回報", () => {
  assert.deepEqual(lines("轉換器：**只在訓練集上 `fit`**"), []);
});

test("粗體後接箭頭等符號不回報（符號也算標點）", () => {
  assert.deepEqual(lines("**印刷電路板模組（PCB）**→ 封裝好的晶片"), []);
});

test("粗體後接星號等符號不回報", () => {
  assert.deepEqual(lines("| **`Stop`** ⭐ | **AI 結束回應時** |"), []);
});

test("JSX 屬性裡的 ** 不回報", () => {
  assert.deepEqual(lines('<PdfRefChip file="a.pdf" page={25} excerpt={"複習重點：** 算術運算子"} />'), []);
});

test("多組粗體與行內程式碼混排不回報", () => {
  assert.deepEqual(
    lines("涵蓋四件事：**類別定義**（包成型別）、**`__init__` 初始化**（建立時決定）、**`self` 參數**（方法）"),
    [],
  );
});
