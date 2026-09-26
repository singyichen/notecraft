/**
 * xlsx 的「樣式層」：填滿色、粗體、對齊、合併儲存格、欄寬。
 *
 * 為什麼自己寫：值的部分交給 read-excel-file（日期序號、數字格式、shared strings 都是它的
 * 強項，自己寫最容易在這裡出錯），但它只回傳值、丟掉所有格式。而記錄表用**黃底標「這格
 * 要填」**，把底色丟掉等於丟掉一半資訊。exceljs 兩者都給，但它遇到圖表 drawing 會直接
 * 拋 TypeError（`reconcile` 解到 undefined.anchors），開不了含圖表的活頁簿——而實驗記錄簿
 * 正好有 6 張圖表。所以拆成兩層：值用套件，格式用這裡。
 *
 * 解析方式是針對 OOXML 這幾個固定形狀的屬性抽取，不是通用 XML parser。理由：這段程式碼要
 * 同時能在瀏覽器與 Node 測試環境跑，Node 沒有 DOMParser，而通用 parser 又是另一個依賴。
 * 這些結構由 Excel／openpyxl 產生、形狀穩定，且每一條都有單元測試。
 *
 * 明確不支援：theme 與 indexed 色（回 undefined，不猜色）、漸層填滿、條件格式。
 */

export interface CellStyle {
  /** `#RRGGBB` */
  fill?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
}

export interface MergeRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface SheetStyles {
  /** key 是 `${row}:${col}`，皆為 1-based。 */
  cells: Map<string, CellStyle>;
  merges: MergeRange[];
  /** index 0 對應第 1 欄，單位 px；沒指定寬度的欄是 undefined。 */
  colWidths: (number | undefined)[];
}

/** Excel 的欄寬單位是「字元數」，這是換成 px 的慣用近似。 */
export function colWidthToPx(width: number): number {
  return Math.round(width * 7 + 10);
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : undefined;
}

/** "AB12" → { col: 28, row: 12 }。 */
export function cellRef(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.replace(/\$/g, "").toUpperCase());
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

/**
 * styles.xml → 依 cellXfs 索引排列的樣式表。儲存格上的 `s="3"` 就是這個陣列的索引。
 */
export function parseStyleTable(stylesXml: string): CellStyle[] {
  const fills: (string | undefined)[] = [];
  const fillsBlock = /<fills[^>]*>([\s\S]*?)<\/fills>/.exec(stylesXml)?.[1] ?? "";
  for (const m of fillsBlock.matchAll(/<fill>([\s\S]*?)<\/fill>|<fill\/>/g)) {
    const body = m[1] ?? "";
    const pattern = /<patternFill[^>]*patternType="([^"]*)"/.exec(body)?.[1];
    // 只認 solid：none／gray125 是 Excel 給每個活頁簿的預設兩格，畫出來會是錯的網底。
    if (pattern !== "solid") {
      fills.push(undefined);
      continue;
    }
    const rgb = /<fgColor[^>]*\brgb="([0-9A-Fa-f]{6,8})"/.exec(body)?.[1];
    fills.push(rgb ? `#${rgb.slice(-6)}` : undefined);
  }

  const bolds: boolean[] = [];
  const fontsBlock = /<fonts[^>]*>([\s\S]*?)<\/fonts>/.exec(stylesXml)?.[1] ?? "";
  for (const m of fontsBlock.matchAll(/<font>([\s\S]*?)<\/font>|<font\/>/g)) {
    bolds.push(/<b\s*\/>|<b>/.test(m[1] ?? ""));
  }

  const out: CellStyle[] = [];
  const xfsBlock = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? "";
  // `[^>]*?` 必須是惰性的：貪婪版在 `<xf .../>` 上會先用掉結尾的 `/`，退而走 `>` 分支，
  // 於是第一個 xf 會一路吃到最後一個 `</xf>`，把後面所有 xf 吞掉（整張樣式表只剩一筆）。
  for (const m of xfsBlock.matchAll(/<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g)) {
    const head = m[1] ?? "";
    const body = m[2] ?? "";
    const style: CellStyle = {};
    const fillId = Number(attr(head, "fillId") ?? NaN);
    const fill = Number.isFinite(fillId) ? fills[fillId] : undefined;
    if (fill) style.fill = fill;
    const fontId = Number(attr(head, "fontId") ?? NaN);
    if (Number.isFinite(fontId) && bolds[fontId]) style.bold = true;
    const horizontal = /<alignment[^>]*\bhorizontal="([^"]*)"/.exec(body)?.[1];
    if (horizontal === "center" || horizontal === "right" || horizontal === "left") {
      style.align = horizontal;
    }
    out.push(style);
  }
  return out;
}

/** 單一 worksheet XML → 逐格樣式、合併範圍、欄寬。 */
export function parseSheetStyles(sheetXml: string, table: CellStyle[]): SheetStyles {
  const cells = new Map<string, CellStyle>();
  for (const m of sheetXml.matchAll(/<c\b([^>]*)/g)) {
    const head = m[1] ?? "";
    const s = attr(head, "s");
    const ref = attr(head, "r");
    if (s === undefined || !ref) continue;
    const style = table[Number(s)];
    if (!style || Object.keys(style).length === 0) continue;
    const at = cellRef(ref);
    if (at) cells.set(`${at.row}:${at.col}`, style);
  }

  const merges: MergeRange[] = [];
  for (const m of sheetXml.matchAll(/<mergeCell\b[^>]*\bref="([^"]+)"/g)) {
    const [tl, br] = m[1].split(":");
    const a = cellRef(tl);
    const b = cellRef(br ?? tl);
    if (a && b) merges.push({ top: a.row, left: a.col, bottom: b.row, right: b.col });
  }

  const colWidths: (number | undefined)[] = [];
  for (const m of sheetXml.matchAll(/<col\b([^>]*)/g)) {
    const head = m[1] ?? "";
    const min = Number(attr(head, "min") ?? NaN);
    const max = Number(attr(head, "max") ?? NaN);
    const width = Number(attr(head, "width") ?? NaN);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(width)) continue;
    // 一條 <col> 可以涵蓋一段欄範圍（min–max），要展開成每一欄。
    for (let c = min; c <= max; c++) colWidths[c - 1] = colWidthToPx(width);
  }

  return { cells, merges, colWidths };
}

/**
 * workbook.xml ＋ workbook.xml.rels → 依活頁簿順序的 [{ 名稱, zip 內路徑 }]。
 * 檔名不保證是 sheet1.xml、sheet2.xml⋯的順序，一律走 `r:id` → rels 的 Target。
 */
export function parseWorkbookSheets(
  workbookXml: string,
  relsXml: string,
): { name: string; path: string }[] {
  const targets = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b([^>]*)/g)) {
    const head = m[1] ?? "";
    const id = attr(head, "Id");
    const target = attr(head, "Target");
    if (!id || !target) continue;
    // Target 可能是相對 xl/ 的 "worksheets/sheet1.xml"，也可能是絕對的 "/xl/worksheets/sheet1.xml"
    targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }
  const out: { name: string; path: string }[] = [];
  for (const m of workbookXml.matchAll(/<sheet\b([^>]*)/g)) {
    const head = m[1] ?? "";
    const name = attr(head, "name");
    const rid = attr(head, "r:id") ?? attr(head, "id");
    if (!name || !rid) continue;
    const path = targets.get(rid);
    if (path) out.push({ name: decodeXmlEntities(name), path });
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
