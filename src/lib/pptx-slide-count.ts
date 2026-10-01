import { unzipSync, strFromU8 } from "fflate";

/**
 * 從 .pptx 的位元組算出投影片張數。
 *
 * 張數是檔案裡的事實（`ppt/presentation.xml` 的 `<p:sldIdLst>` 列了每一張的 id），不像 docx
 * 的頁數要排版引擎跑過才知道，所以講義庫可以放心顯示「N 張」、抽屜也能直接拿它當 pageCount。
 *
 * 用 fflate 的 `filter` 只解壓這一個 XML：課程投影片動輒數十 MB、大半是圖片，整包解開只為了
 * 數張數太浪費。不是合法 zip、或裡面沒有 presentation.xml 時丟錯，由呼叫端決定怎麼降級。
 */
export function countPptxSlides(bytes: Uint8Array): number {
  const files = unzipSync(bytes, { filter: (file) => file.name === "ppt/presentation.xml" });
  const xml = files["ppt/presentation.xml"];
  if (!xml) throw new Error("不是 .pptx：找不到 ppt/presentation.xml");
  const text = strFromU8(xml);
  const list = text.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/);
  if (!list) return 0;
  return (list[1].match(/<p:sldId[\s>]/g) ?? []).length;
}
