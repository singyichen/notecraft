import { useState } from "react";
import type { ReferenceFolder, ReferencePdf } from "@/lib/references";
import { ChevronRight, FileText, FolderOpen } from "lucide-react";

export interface ReferencesLibraryProps {
  tree: ReferenceFolder;
}

export default function ReferencesLibrary({ tree }: ReferencesLibraryProps) {
  const open = (pdf: ReferencePdf) => {
    window.dispatchEvent(new CustomEvent("nc-pdf-open", { detail: { file: pdf.relPath, page: 1 } }));
  };

  if (tree.folders.length === 0 && tree.pdfs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
        <p style={{ margin: 0, fontSize: 15 }}>_references/ 底下還沒有任何 PDF</p>
      </div>
    );
  }

  return (
    <>
      {/* 檔案列 hover 高亮用 class（不是逐列 state），比照檔案總管的簡單列表樣式 */}
      <style>{`.nc-ref-file-row:hover { background: var(--surface-sunken); }`}</style>
      <FolderSection folder={tree} depth={0} onOpen={open} />
    </>
  );
}

function FolderSection({
  folder,
  depth,
  onOpen,
}: {
  folder: ReferenceFolder;
  depth: number;
  onOpen: (pdf: ReferencePdf) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasHeader = depth > 0;
  const showChildren = !hasHeader || expanded;

  return (
    <section style={{ marginLeft: depth * 20, marginBottom: hasHeader ? 8 : 28 }}>
      {hasHeader && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "4px 0",
            border: "none",
            background: "none",
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-strong)",
            margin: "0 0 12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <ChevronRight
            size={15}
            style={{
              color: "var(--text-muted)",
              flex: "none",
              transition: "transform 140ms var(--ease-out, ease-out)",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
          <FolderOpen size={16} style={{ color: "var(--blue-500)", flex: "none" }} />
          {folder.name}
        </button>
      )}
      {showChildren && (
        <>
          {folder.pdfs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 4 }}>
              {folder.pdfs.map((pdf) => (
                <button
                  key={pdf.relPath}
                  type="button"
                  onClick={() => onOpen(pdf)}
                  className="nc-ref-file-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 10px 6px 27px",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <FileText size={15} style={{ color: "var(--blue-600)", flex: "none" }} />
                  <span
                    style={{
                      fontSize: 13.5,
                      color: "var(--text-strong)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pdf.name}
                  </span>
                  <span style={{ marginLeft: "auto", flex: "none", fontSize: 12, color: "var(--text-muted)" }}>
                    {pdf.numPages > 0 ? `${pdf.numPages} 頁` : "— 頁"}
                  </span>
                </button>
              ))}
            </div>
          )}
          {folder.folders.map((child) => (
            <FolderSection key={child.name} folder={child} depth={depth + 1} onOpen={onOpen} />
          ))}
        </>
      )}
    </section>
  );
}
