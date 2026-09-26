import { useEffect, useRef, useState } from "react";
import {
  parseSheetStyles,
  parseStyleTable,
  parseWorkbookSheets,
  type CellStyle,
  type SheetStyles,
} from "@/lib/xlsx-styles";
import type { ReferenceViewerProps } from "./types";
import SheetTable, { MAX_SHEET_ROWS, type SheetCell, type SheetData } from "./SheetTable";
import ViewerStatus from "./ViewerStatus";

// 與 pdfjs／docx-preview 同樣的理由：抽屜出現在每一頁，這兩包只在讀者真的開了 .xlsx 時
// 才載入。失敗不快取，讓下一次開啟能重試。
//
// 為什麼是「兩包」：read-excel-file 負責值（日期序號、數字格式、shared strings 都是它的
// 強項），但它丟掉所有格式；fflate 則讓我們自己再讀一次同一份 zip 裡的 styles.xml 與
// sheet XML，把底色／合併／欄寬補回來（見 src/lib/xlsx-styles.ts 的說明）。
// read-excel-file 沒有根匯出，必須指定 `/browser` 子路徑（另有 /node、/web-worker）。
let xlsxLibsPromise: Promise<{
  readXlsxFile: typeof import("read-excel-file/browser").default;
  unzipSync: typeof import("fflate").unzipSync;
  strFromU8: typeof import("fflate").strFromU8;
}> | null = null;
function loadXlsxLibs() {
  if (!xlsxLibsPromise) {
    xlsxLibsPromise = Promise.all([import("read-excel-file/browser"), import("fflate")])
      .then(([xlsx, fflate]) => ({
        readXlsxFile: xlsx.default,
        unzipSync: fflate.unzipSync,
        strFromU8: fflate.strFromU8,
      }))
      .catch((err) => {
        xlsxLibsPromise = null;
        throw err;
      });
  }
  return xlsxLibsPromise;
}

export default function XlsxRenderer({ url, scale, onMeta }: ReferenceViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([loadXlsxLibs(), fetch(url)])
      .then(([libs, res]) => {
        // 404 是一個 ok:false 的正常回應，不自己擋下來會把 HTML 錯誤頁餵給解析器。
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Promise.all([libs, res.arrayBuffer()]);
      })
      .then(async ([libs, buf]) => {
        const bytes = new Uint8Array(buf);
        // v9 的預設匯出直接回傳全部工作表（[{ sheet, data }]），不必指定 sheet。
        const values = await libs.readXlsxFile(new Blob([bytes]));
        const styles = readStyles(bytes, libs.unzipSync, libs.strFromU8);
        return values.map((sheet) => toSheetData(sheet, styles.get(sheet.sheet)));
      })
      .then((parsed) => {
        if (cancelled) return;
        setSheets(parsed);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // 畫面訊息對讀者說人話，真正的原因留給 console —— 404、壞檔與 dev 期的
        // 504 Outdated Optimize Dep 在畫面上長得一模一樣。
        console.error("[reference-viewer] Excel 載入失敗", url, err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // 量表格寬度讓抽屜開到剛好。要等畫完才量（載入中容器是隱藏的，量到 0）。
  useEffect(() => {
    if (status !== "ready" || !wrapRef.current) return;
    const table = wrapRef.current.querySelector("table");
    if (table) onMeta({ naturalWidth: table.scrollWidth + 24 });
  }, [status, sheets, onMeta]);

  if (status === "loading") return <ViewerStatus>載入中…</ViewerStatus>;
  if (status === "error") return <ViewerStatus>Excel 載入失敗，請確認檔案是否存在或格式是否為 .xlsx。</ViewerStatus>;
  if (sheets.length === 0) return <ViewerStatus>這個活頁簿沒有任何工作表。</ViewerStatus>;
  // 與 docx 一樣用 CSS zoom 而非 transform：輸出是 DOM，zoom 會重新佈局，捲軸才正確。
  return (
    <div ref={wrapRef} style={{ zoom: scale }}>
      <SheetTable sheets={sheets} />
    </div>
  );
}

/**
 * 解開同一份 zip，讀出每張工作表的樣式。key 是工作表名稱（xlsx 內唯一），因此與
 * read-excel-file 回傳的順序無關，不會對錯表。樣式讀不到就整個略過——沒有底色頂多
 * 樸素一點，不該讓整份檔案開不起來。
 */
function readStyles(
  bytes: Uint8Array,
  unzipSync: typeof import("fflate").unzipSync,
  strFromU8: typeof import("fflate").strFromU8,
): Map<string, SheetStyles> {
  const out = new Map<string, SheetStyles>();
  try {
    const zip = unzipSync(bytes);
    const text = (name: string) => (zip[name] ? strFromU8(zip[name]) : "");
    const workbook = text("xl/workbook.xml");
    const rels = text("xl/_rels/workbook.xml.rels");
    if (!workbook || !rels) return out;
    const table = parseStyleTable(text("xl/styles.xml"));
    for (const sheet of parseWorkbookSheets(workbook, rels)) {
      const xml = text(sheet.path);
      if (xml) out.set(sheet.name, parseSheetStyles(xml, table));
    }
  } catch (err) {
    console.warn("[reference-viewer] 讀不到 Excel 樣式，改以純值顯示", err);
  }
  return out;
}

type RawSheet = import("read-excel-file/browser").Sheet;

/** read-excel-file 的值 ＋ 自己解析的樣式 → SheetTable 吃的形狀。 */
function toSheetData(sheet: RawSheet, styles: SheetStyles | undefined): SheetData {
  const all = sheet.data ?? [];
  const shown = all.slice(0, MAX_SHEET_ROWS);
  const width = shown.reduce((max, row) => Math.max(max, row.length), 0);

  // 被合併吃掉的位置不輸出 <td>，左上角那格帶 span。
  const covered = new Set<string>();
  const spans = new Map<string, { colSpan: number; rowSpan: number }>();
  for (const m of styles?.merges ?? []) {
    spans.set(`${m.top}:${m.left}`, { colSpan: m.right - m.left + 1, rowSpan: m.bottom - m.top + 1 });
    for (let r = m.top; r <= m.bottom; r++) {
      for (let c = m.left; c <= m.right; c++) {
        if (r !== m.top || c !== m.left) covered.add(`${r}:${c}`);
      }
    }
  }

  const rows: SheetCell[][] = shown.map((row, ri) => {
    const r = ri + 1;
    return Array.from({ length: width }, (_, ci): SheetCell => {
      const c = ci + 1;
      if (covered.has(`${r}:${c}`)) return { text: "", hidden: true };
      const style: CellStyle = styles?.cells.get(`${r}:${c}`) ?? {};
      return {
        text: cellText(row[ci]),
        fill: style.fill,
        bold: style.bold,
        align: style.align,
        ...spans.get(`${r}:${c}`),
      };
    });
  });

  return {
    name: sheet.sheet,
    rows,
    colWidths: styles?.colWidths.slice(0, width).map((w) => w ?? 0).some((w) => w > 0)
      ? styles?.colWidths.map((w) => w ?? 0)
      : undefined,
    truncatedRows: all.length - shown.length,
  };
}

/** 空格是 null。日期由 read-excel-file 轉成 Date，這裡只取日期部分（記錄表不需要時分秒）。 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
