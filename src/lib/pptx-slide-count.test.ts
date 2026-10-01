import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { countPptxSlides } from "./pptx-slide-count.ts";

function fakePptx(slideIds: number[], extra: Record<string, string> = {}): Uint8Array {
  const ids = slideIds.map((id) => `<p:sldId id="${id}" r:id="rId${id}"/>`).join("");
  const presentation =
    `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="x" xmlns:r="y">` +
    `<p:sldMasterIdLst><p:sldMasterId id="1" r:id="rId1"/></p:sldMasterIdLst>` +
    (slideIds.length > 0 ? `<p:sldIdLst>${ids}</p:sldIdLst>` : "") +
    `<p:sldSz cx="12192000" cy="6858000"/></p:presentation>`;
  const files: Record<string, Uint8Array> = { "ppt/presentation.xml": strToU8(presentation) };
  for (const [name, body] of Object.entries(extra)) files[name] = strToU8(body);
  return zipSync(files);
}

test("數 sldIdLst 裡的 sldId", () => {
  assert.equal(countPptxSlides(fakePptx([256, 257, 258])), 3);
});

test("沒有 sldIdLst（空簡報）算 0 張", () => {
  assert.equal(countPptxSlides(fakePptx([])), 0);
});

test("只看 presentation.xml，不被多餘的 slide 檔或母片誤導", () => {
  const bytes = fakePptx([256], {
    "ppt/slides/slide1.xml": "<p:sld/>",
    "ppt/slides/slide2.xml": "<p:sld/>",
    "ppt/slideMasters/slideMaster1.xml": "<p:sldMaster/>",
  });
  assert.equal(countPptxSlides(bytes), 1);
});

test("不是 pptx 的 zip 會丟錯，交給呼叫端降級", () => {
  const bytes = zipSync({ "word/document.xml": strToU8("<w:document/>") });
  assert.throws(() => countPptxSlides(bytes), /presentation\.xml/);
});

test("不是 zip 也會丟錯而不是回傳 0", () => {
  assert.throws(() => countPptxSlides(strToU8("%PDF-1.7 not a zip")));
});
