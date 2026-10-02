import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { MAX_SCALE, MIN_SCALE, zoomIn, zoomOut } from "./registry";

export interface ReferenceToolbarProps {
  page: number;
  /** 檢視器回報的頁數；undefined = 這個格式沒有分頁概念，不畫翻頁控制 */
  pageCount: number | undefined;
  scale: number;
  onPage: (page: number) => void;
  onScale: (scale: number) => void;
}

/**
 * 翻頁＋縮放控制。只輸出控制項本身（Fragment），外框由殼決定：抽屜放在底部置中、
 * 講義頁籤放在工作台 Toolbar 列。兩邊的行為因此不會分岔。
 */
export default function ReferenceToolbar({ page, pageCount, scale, onPage, onScale }: ReferenceToolbarProps) {
  const total = pageCount ?? 0;
  return (
    <>
      {/* 翻頁控制只對「有分頁概念」的格式出現：docx 的分頁是排版結果不是檔案資料，
          給它一個頁碼輸入框只會讓人以為跳得過去。 */}
      {pageCount !== undefined && (
        <>
          <IconButton onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} label="上一頁">
            <ChevronLeft size={16} />
          </IconButton>
          <input
            type="number"
            value={page}
            min={1}
            max={total || 1}
            aria-label="頁碼"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 1) onPage(Math.min(Math.round(v), total || Math.round(v)));
            }}
            style={{
              width: 48,
              height: 30,
              textAlign: "center",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
            }}
          />
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>/ {total || "…"}</span>
          <IconButton onClick={() => onPage(Math.min(total || page, page + 1))} disabled={total > 0 && page >= total} label="下一頁">
            <ChevronRight size={16} />
          </IconButton>
          <span style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px", flex: "none" }} />
        </>
      )}
      <IconButton onClick={() => onScale(zoomOut(scale))} disabled={scale <= MIN_SCALE} label="縮小">
        <Minus size={16} />
      </IconButton>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", width: 40, textAlign: "center", flex: "none" }}>
        {Math.round(scale * 100)}%
      </span>
      <IconButton onClick={() => onScale(zoomIn(scale))} disabled={scale >= MAX_SCALE} label="放大">
        <Plus size={16} />
      </IconButton>
    </>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: 30,
        height: 30,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: disabled ? "var(--neutral-100)" : "var(--neutral-0)",
        color: disabled ? "var(--neutral-400)" : "var(--text-body)",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
