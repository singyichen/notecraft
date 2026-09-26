import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStyleTable, parseSheetStyles, parseWorkbookSheets, colWidthToPx } from "./xlsx-styles.ts";

const STYLES = `<styleSheet>
  <fonts count="2"><font><sz val="11"/></font><font><b/><sz val="11"/></font></fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00FFF2CC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <cellXfs count="3">
    <xf fontId="0" fillId="0"/>
    <xf fontId="1" fillId="2" applyFill="1"/>
    <xf fontId="0" fillId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
  </cellXfs>
</styleSheet>`;

test("cellXfs 索引對應到填滿色、粗體與對齊", () => {
  const t = parseStyleTable(STYLES);
  assert.deepEqual(t[0], {});
  // ARGB 的前兩碼是 alpha，Excel 實務上一律不透明，取後六碼即可
  assert.deepEqual(t[1], { fill: "#FFF2CC", bold: true });
  assert.deepEqual(t[2], { align: "center" });
});

test("非 solid 的填滿不算底色", () => {
  const t = parseStyleTable(STYLES.replace('patternType="solid"', 'patternType="gray125"'));
  assert.equal(t[1].fill, undefined);
});

test("theme／indexed 色不支援，回 undefined 而不是猜一個顏色", () => {
  const t = parseStyleTable(STYLES.replace('<fgColor rgb="00FFF2CC"/>', '<fgColor theme="4" tint="0.6"/>'));
  assert.equal(t[1].fill, undefined);
  assert.equal(t[1].bold, true); // 其他屬性不受影響
});

const SHEET = `<worksheet>
  <cols><col min="1" max="1" width="14.5" customWidth="1"/><col min="3" max="4" width="8" customWidth="1"/></cols>
  <sheetData>
    <row r="1"><c r="A1" s="1" t="inlineStr"><is><t>標題</t></is></c></row>
    <row r="3"><c r="B3" s="2"/><c r="C3"/></row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells>
</worksheet>`;

test("逐格對到 cellXfs 索引", () => {
  const s = parseSheetStyles(SHEET, parseStyleTable(STYLES));
  assert.deepEqual(s.cells.get("1:1"), { fill: "#FFF2CC", bold: true });
  assert.deepEqual(s.cells.get("3:2"), { align: "center" });
  assert.equal(s.cells.get("3:3"), undefined); // 沒有 s= 就沒有樣式
});

test("合併儲存格解析成 1-based 範圍", () => {
  const s = parseSheetStyles(SHEET, parseStyleTable(STYLES));
  assert.deepEqual(s.merges, [{ top: 1, left: 1, bottom: 1, right: 4 }]);
});

test("欄寬展開到 min–max 的每一欄", () => {
  const s = parseSheetStyles(SHEET, parseStyleTable(STYLES));
  assert.equal(s.colWidths[0], colWidthToPx(14.5));
  assert.equal(s.colWidths[1], undefined); // 第 2 欄沒有指定
  assert.equal(s.colWidths[2], colWidthToPx(8));
  assert.equal(s.colWidths[3], colWidthToPx(8));
});

test("超過 Z 的欄名（AA、AB）換算正確", () => {
  const s = parseSheetStyles(
    `<worksheet><sheetData><row r="2"><c r="AB2" s="1"/></row></sheetData></worksheet>`,
    parseStyleTable(STYLES),
  );
  assert.deepEqual(s.cells.get("2:28"), { fill: "#FFF2CC", bold: true });
});

test("workbook.xml + rels 對出工作表名稱與檔案路徑", () => {
  const wb = `<workbook><sheets>
    <sheet name="說明" sheetId="1" r:id="rId1"/>
    <sheet name="實驗一 順偏" sheetId="2" r:id="rId3"/>
  </sheets></workbook>`;
  const rels = `<Relationships>
    <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId3" Target="/xl/worksheets/sheet9.xml"/>
  </Relationships>`;
  // 檔名不保證等於 sheet 順序，一律走 r:id → rels；Target 可能是絕對路徑
  assert.deepEqual(parseWorkbookSheets(wb, rels), [
    { name: "說明", path: "xl/worksheets/sheet1.xml" },
    { name: "實驗一 順偏", path: "xl/worksheets/sheet9.xml" },
  ]);
});
