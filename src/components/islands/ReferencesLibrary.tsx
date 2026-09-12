import type { ReferenceFolder, ReferencePdf } from "@/lib/references";
import { FileText, FolderOpen } from "lucide-react";

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

  return <FolderSection folder={tree} depth={0} onOpen={open} />;
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
  return (
    <section style={{ marginLeft: depth * 20, marginBottom: 28 }}>
      {depth > 0 && (
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-strong)",
            margin: "0 0 12px",
          }}
        >
          <FolderOpen size={16} style={{ color: "var(--blue-500)" }} />
          {folder.name}
        </h3>
      )}
      {folder.pdfs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {folder.pdfs.map((pdf) => (
            <button
              key={pdf.relPath}
              type="button"
              onClick={() => onOpen(pdf)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "flex-start",
                padding: 16,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-card)",
                boxShadow: "var(--shadow-card)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FileText size={20} style={{ color: "var(--blue-600)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.4 }}>
                {pdf.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{pdf.numPages} 頁</span>
            </button>
          ))}
        </div>
      )}
      {folder.folders.map((child) => (
        <FolderSection key={child.name} folder={child} depth={depth + 1} onOpen={onOpen} />
      ))}
    </section>
  );
}
