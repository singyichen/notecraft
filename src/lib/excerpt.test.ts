import { test } from "node:test";
import assert from "node:assert/strict";
import { excerpt } from "./excerpt.ts";

// excerpt() 的產物會直接進 <meta name="description"> 與頁面副標，兩處都以純文字呈現，
// 因此殘留的 Markdown 標記會被讀者看見（真實案例：描述欄顯示成「把利息**滾入本金**」）。

test("剝除粗體標記，保留文字", () => {
  assert.equal(excerpt("把每一期賺到的利息**滾入本金**，讓下一期更大。", ""), "把每一期賺到的利息滾入本金，讓下一期更大。");
});

test("剝除底線式粗體", () => {
  assert.equal(excerpt("這是 __重點__ 所在。", ""), "這是 重點 所在。");
});

test("剝除斜體標記", () => {
  assert.equal(excerpt("這是 *強調* 的字。", ""), "這是 強調 的字。");
});

test("剝除行內程式碼的反引號，保留內容", () => {
  assert.equal(excerpt("呼叫 `partial_fit()` 即可續訓。", ""), "呼叫 partial_fit() 即可續訓。");
});

test("連結只留下顯示文字", () => {
  assert.equal(excerpt("詳見 [管理鐵三角](https://example.com/abc) 一文。", ""), "詳見 管理鐵三角 一文。");
});

test("刪除線標記被剝除", () => {
  assert.equal(excerpt("~~舊作法~~ 已淘汰。", ""), "舊作法 已淘汰。");
});

test("同一段落中的多組粗體都要剝除", () => {
  assert.equal(
    excerpt("真正的威力不在利率高低，而在**時間**與**複利頻率**。", ""),
    "真正的威力不在利率高低，而在時間與複利頻率。",
  );
});

test("程式碼區塊仍整段剝除（既有行為不變）", () => {
  assert.equal(excerpt("```js\nconst a = 1;\n```\n\n這是內文。", ""), "這是內文。");
});

test("標題與清單仍被略過，取第一個實際段落（既有行為不變）", () => {
  assert.equal(excerpt("## 標題\n\n- 項目一\n\n這是第一段內文。", ""), "這是第一段內文。");
});

test("body 為空時回傳 fallback（既有行為不變）", () => {
  assert.equal(excerpt("", "備用描述"), "備用描述");
});

test("乘冪等非強調用途的星號不應被誤刪", () => {
  // 單獨出現、兩側非成對的星號不構成強調語法，保留原樣比誤刪安全。
  assert.equal(excerpt("面積是 3 * 4 平方公尺。", ""), "面積是 3 * 4 平方公尺。");
});
