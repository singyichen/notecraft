import { useState } from "react";
import type { ReferenceDoc, ReferenceFolder } from "@/lib/references";
import { REFERENCE_KIND_LABEL, type ReferenceKind } from "@/lib/reference-kinds";
import { ChevronRight, FileSpreadsheet, FileText, FileType2, FolderOpen, Table2 } from "lucide-react";

export interface ReferencesLibraryProps {
  tree: ReferenceFolder;
  /**
   * dev-only：`_outputs/` 底下作者自己的產出（結報之類）。正式 build 時頁面傳 null，
   * 這一區連同標題都不會出現在輸出的 HTML 裡（見 pages/references/index.astro）。
   */
  outputs?: ReferenceFolder | null;
  /** dev-only：notesDir 以外的資料檔（`simulations/` 的實驗數據與電路圖），同上只在本機出現。 */
  externals?: ReferenceFolder[];
}

const KIND_ICON: Record<ReferenceKind, typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  xlsx: FileSpreadsheet,
  csv: Table2,
};

const KIND_COLOR: Record<ReferenceKind, string> = {
  pdf: "var(--blue-600)",
  docx: "var(--orange-600)",
  xlsx: "var(--success-500)",
  csv: "var(--neutral-500)",
};

/** 沒有頁數可顯示的格式（docx）改顯示檔案大小，讓每一列都有一個次要資訊。 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function metaLabel(doc: ReferenceDoc): string {
  if (doc.kind === "pdf") return doc.numPages && doc.numPages > 0 ? `${doc.numPages} 頁` : "— 頁";
  return formatBytes(doc.bytes);
}

export default function ReferencesLibrary({ tree, outputs = null, externals = [] }: ReferencesLibraryProps) {
  const open = (doc: ReferenceDoc) => {
    // 帶著 doc.url：外部資料檔走 /local-assets/*，抽屜從 relPath 推算不出來。
    window.dispatchEvent(
      new CustomEvent("nc-ref-open", { detail: { file: doc.relPath, page: 1, url: doc.url } }),
    );
  };

  const empty = tree.folders.length === 0 && tree.docs.length === 0;
  if (empty && !outputs && externals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
        <p style={{ margin: 0, fontSize: 15 }}>_references/ 底下還沒有任何講義</p>
      </div>
    );
  }

  return (
    <>
      {/* 檔案列 hover 高亮用 class（不是逐列 state），比照檔案總管的簡單列表樣式 */}
      <style>{`.nc-ref-file-row:hover { background: var(--surface-sunken); }`}</style>
      {!empty && <FolderSection folder={tree} depth={0} onOpen={open} />}
      {outputs && (
        <LocalSection title="我的產出" folder={outputs} onOpen={open} />
      )}
      {externals.map((folder) => (
        <LocalSection key={folder.name} title={`實驗數據 · ${folder.name}/`} folder={folder} onOpen={open} />
      ))}
    </>
  );
}

/** dev-only 分區的外框：標題 + 「僅本機」標記，讓人一眼知道正式站為何看不到這塊。 */
function LocalSection({
  title,
  folder,
  onOpen,
}: {
  title: string;
  folder: ReferenceFolder;
  onOpen: (doc: ReferenceDoc) => void;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text-strong)" }}>{title}</h2>
        <span
          title="這些檔案不會被複製進 dist，只在本機 dev 看得到"
          style={{
            padding: "2px 8px",
            borderRadius: "var(--radius-pill)",
            background: "var(--orange-50)",
            color: "var(--orange-700)",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          僅本機
        </span>
      </div>
      <FolderSection folder={folder} depth={0} onOpen={onOpen} />
    </section>
  );
}

function FolderSection({
  folder,
  depth,
  onOpen,
}: {
  folder: ReferenceFolder;
  depth: number;
  onOpen: (doc: ReferenceDoc) => void;
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
          {folder.docs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 4 }}>
              {folder.docs.map((doc) => {
                const Icon = KIND_ICON[doc.kind];
                return (
                  <button
                    key={doc.relPath}
                    type="button"
                    onClick={() => onOpen(doc)}
                    className="nc-ref-file-row"
                    title={`${doc.name}（${REFERENCE_KIND_LABEL[doc.kind]}）`}
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
                    <Icon size={15} style={{ color: KIND_COLOR[doc.kind], flex: "none" }} />
                    <span
                      style={{
                        fontSize: 13.5,
                        color: "var(--text-strong)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.name}
                    </span>
                    <span style={{ marginLeft: "auto", flex: "none", fontSize: 12, color: "var(--text-muted)" }}>
                      {metaLabel(doc)}
                    </span>
                  </button>
                );
              })}
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
