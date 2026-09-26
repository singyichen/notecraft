/**
 * 最小的 RFC 4180 CSV 解析：支援引號欄位、引號內的逗號與換行、`""` 跳脫、CRLF 與 BOM。
 *
 * 為什麼不裝套件：講義庫要顯示的 CSV 是實驗數據與課程附的小檔，需求就只有「切成表格」。
 * 這段邏輯有完整單元測試，比引入一個解析器划算。
 *
 * 不做的事：不猜分隔符號（一律逗號）、不推斷型別（全部當字串，呈現層負責對齊）、
 * 不補齊各列欄數（交給呈現層，才不會把資料本身的缺格藏起來）。
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  // 這一列有沒有出現過任何字元（含逗號與引號），用來丟掉空行——單純用 field/row 是否為空
  // 判斷不了：`,,` 是一列三個空欄，`\n` 卻是空行，兩者在切完之後長得一樣。
  let started = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    if (started) rows.push(row);
    row = [];
    started = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch !== '"') {
        field += ch;
      } else if (src[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      started = true;
      continue;
    }
    if (ch === ",") {
      started = true;
      endField();
      continue;
    }
    if (ch === "\r") continue; // CRLF 的 \r 一律忽略，換行只認 \n
    if (ch === "\n") {
      endField();
      endRow();
      continue;
    }
    field += ch;
    started = true;
  }
  if (started) {
    endField();
    endRow();
  }
  return rows;
}
