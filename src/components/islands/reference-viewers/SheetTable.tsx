import { useState } from "react";

/** 一格。空字串代表空白格；`hidden` 的格是被合併吃掉的位置，不輸出 `<td>`。 */
export interface SheetCell {
  text: string;
  /** `#RRGGBB`，來自試算表的填滿色。原始檔用黃底標「這格要填」，丟掉就看不出來了。 */
  fill?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
  hidden?: boolean;
}

export interface SheetData {
  name: string;
  rows: SheetCell[][];
  /** 每欄寬度（px）。沒有就讓瀏覽器自己決定。 */
  colWidths?: number[];
  /** 超過上限而被截掉的列數，>0 時在表格下方說明。 */
  truncatedRows?: number;
}

/** 試算表類（xlsx / csv）共用的呈現：多工作表時上方出現分頁列。 */
export default function SheetTable({ sheets }: { sheets: SheetData[] }) {
  const [active, setActive] = useState(0);
  const sheet = sheets[Math.min(active, sheets.length - 1)];
  if (!sheet) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sheets.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {sheets.map((s, i) => (
            <button
              key={s.name + i}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? "true" : undefined}
              style={{
                padding: "4px 10px",
                border: `1px solid ${i === active ? "var(--blue-300)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-pill)",
                background: i === active ? "var(--blue-50)" : "var(--neutral-0)",
                color: i === active ? "var(--blue-700)" : "var(--text-body)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ overflow: "auto", background: "var(--neutral-0)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-md)" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12.5, fontFamily: "var(--font-sans)" }}>
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  cell.hidden ? null : (
                    <td
                      key={c}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      style={{
                        border: "1px solid var(--border-subtle)",
                        padding: "4px 8px",
                        whiteSpace: "pre-wrap",
                        verticalAlign: "top",
                        // 試算表的欄寬當「下限」而不是固定寬度：Excel 裡窄欄的長字串會溢出到
                        // 右邊的空白格，HTML 表格不會——照抄欄寬的話，那種說明文字會被擠成
                        // 一行一個字、整列高度爆掉。改成 minWidth 讓瀏覽器依內容加寬，
                        // 再用 maxWidth 擋住單一長句把整張表拉到天邊。
                        minWidth: sheet.colWidths?.[c] || 56,
                        maxWidth: 420,
                        background: cell.fill,
                        fontWeight: cell.bold ? 700 : 400,
                        textAlign: cell.align,
                        color: "var(--text-body)",
                      }}
                    >
                      {cell.text}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sheet.truncatedRows ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          僅顯示前 {sheet.rows.length} 列，另有 {sheet.truncatedRows} 列未顯示。
        </p>
      ) : null}
    </div>
  );
}

/** 檢視器共用：表格太大時截斷，避免一個誤放的十萬列檔案把抽屜卡死。 */
export const MAX_SHEET_ROWS = 500;
