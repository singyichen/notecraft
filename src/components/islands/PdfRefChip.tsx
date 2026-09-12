import { useState } from "react";
import { FileText } from "lucide-react";

export interface PdfRefChipProps {
  /** 相對於 notesDir 的 PDF 路徑（含 `_references/` 前綴），跟 @ai-reference 標記的 file 欄位同格式 */
  file: string;
  page: number;
  status?: "suggested" | "confirmed";
  /** AI 抽出的該頁片段，hover 顯示，方便作者不用開 PDF 也能初步判斷猜得準不準 */
  excerpt?: string;
}

export default function PdfRefChip({ file, page, status = "confirmed", excerpt }: PdfRefChipProps) {
  const [hover, setHover] = useState(false);
  const suggested = status === "suggested";

  const open = () => {
    window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file, page } }));
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 8 }}>
      <button
        type="button"
        onClick={open}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={suggested ? `AI 建議對應 PDF 第 ${page} 頁（尚未確認）` : `對應 PDF 第 ${page} 頁`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 24,
          padding: "0 10px",
          borderRadius: "var(--radius-pill)",
          border: `1px ${suggested ? "dashed" : "solid"} ${hover ? "var(--blue-300)" : "var(--neutral-200)"}`,
          background: hover ? "var(--blue-50)" : "var(--neutral-0)",
          color: hover ? "var(--blue-700)" : "var(--neutral-600)",
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          fontWeight: 700,
          cursor: "pointer",
          transition:
            "background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out)",
        }}
      >
        <FileText size={13} strokeWidth={2.1} />
        p.{page}
      </button>
      {hover && excerpt && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            maxWidth: 280,
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            background: "var(--neutral-900)",
            color: "#fff",
            fontSize: 12.5,
            lineHeight: 1.5,
            boxShadow: "var(--shadow-lg)",
            zIndex: 10,
          }}
        >
          {excerpt}
        </span>
      )}
    </span>
  );
}
