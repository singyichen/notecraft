import { useEffect, useRef, useState } from "react";
import { parseCsv } from "@/lib/csv-parse";
import type { ReferenceViewerProps } from "./types";
import SheetTable, { MAX_SHEET_ROWS, type SheetCell, type SheetData } from "./SheetTable";
import ViewerStatus from "./ViewerStatus";

/**
 * CSV 檢視器。解析在 `src/lib/csv-parse.ts`（有單元測試），不引入套件。
 * 與 xlsx 共用 SheetTable，差別只在：只有一張表、沒有樣式，第一列當表頭加粗。
 */
export default function CsvRenderer({ url, scale, onMeta }: ReferenceViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const all = parseCsv(text);
        const shown = all.slice(0, MAX_SHEET_ROWS);
        // 各列欄數可能不同（資料本身就缺格），補到最寬那列，表格才不會參差。
        const width = shown.reduce((max, row) => Math.max(max, row.length), 0);
        const rows: SheetCell[][] = shown.map((row, r) =>
          Array.from({ length: width }, (_, c) => ({ text: row[c] ?? "", bold: r === 0 })),
        );
        setSheet({
          name: "CSV",
          rows,
          truncatedRows: all.length - shown.length,
        });
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[reference-viewer] CSV 載入失敗", url, err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (status !== "ready" || !wrapRef.current) return;
    const table = wrapRef.current.querySelector("table");
    if (table) onMeta({ naturalWidth: table.scrollWidth + 24 });
  }, [status, sheet, onMeta]);

  if (status === "loading") return <ViewerStatus>載入中…</ViewerStatus>;
  if (status === "error") return <ViewerStatus>CSV 載入失敗，請確認檔案是否存在。</ViewerStatus>;
  if (!sheet || sheet.rows.length === 0) return <ViewerStatus>這個 CSV 沒有任何資料列。</ViewerStatus>;
  return (
    <div ref={wrapRef} style={{ zoom: scale }}>
      <SheetTable sheets={[sheet]} />
    </div>
  );
}
