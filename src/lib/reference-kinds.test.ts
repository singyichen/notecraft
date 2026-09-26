import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceKindOf, REFERENCE_KIND_LABEL } from "./reference-kinds.ts";

test("認得 PDF 與 Word 副檔名", () => {
  assert.equal(referenceKindOf("Ch 1 - Introduction.pdf"), "pdf");
  assert.equal(referenceKindOf("Lab_結報範本.docx"), "docx");
});

test("副檔名不分大小寫", () => {
  assert.equal(referenceKindOf("HANDOUT.PDF"), "pdf");
  assert.equal(referenceKindOf("範本.DocX"), "docx");
});

test("不支援的格式回 null", () => {
  assert.equal(referenceKindOf("wat_train.csv"), null);
  assert.equal(referenceKindOf("舊版講義.doc"), null);
  assert.equal(referenceKindOf("README"), null);
  assert.equal(referenceKindOf("投影片.pptx"), null);
});

test("略過 Word 開檔時產生的 ~$ 暫存檔", () => {
  // Word 開啟 Lab_結報範本.docx 時會在同目錄留下 ~$b_結報範本.docx，
  // 它是鎖定檔不是文件，列進講義庫只會讓讀者點到一個開不起來的項目。
  assert.equal(referenceKindOf("~$b_結報範本.docx"), null);
  assert.equal(referenceKindOf("~$講義.pdf"), null);
});

test("檔名中間出現副檔名字樣不算數", () => {
  assert.equal(referenceKindOf("pdf-整理筆記.txt"), null);
  assert.equal(referenceKindOf("第一週.docx.bak"), null);
});

test("每個 kind 都有顯示用標籤", () => {
  assert.equal(REFERENCE_KIND_LABEL.pdf, "PDF");
  assert.equal(REFERENCE_KIND_LABEL.docx, "Word");
});
