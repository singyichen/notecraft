import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { referenceAssetUrl } from "@/lib/references-url";
import { referenceKindOf, REFERENCE_KIND_LABEL, type ReferenceKind } from "@/lib/reference-kinds";
import type { ReferenceViewerMeta, ReferenceViewerProps } from "./reference-viewers/types";
import PdfRenderer from "./reference-viewers/PdfRenderer";
import DocxRenderer from "./reference-viewers/DocxRenderer";
import ViewerStatus from "./reference-viewers/ViewerStatus";

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 420;
// 內容區左右各 16px padding（見下方 content 那層的 style），算抽屜寬度要扣掉這兩份
const CONTENT_PADDING = 16;
// 抽屜最寬不能吃光視窗——留一截讓筆記正文還看得到、還能捲動
const VIEWPORT_MARGIN = 80;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

// 「副檔名 → 檢視器」註冊表的 client 端。新增一種格式：寫一個檢視器、在 reference-kinds.ts
// 的 REFERENCE_KINDS 加副檔名、在這裡加一列——殼與工具列都不用動。
// 這裡是靜態 import 沒關係：兩個檢視器模組本身很小，各自的重型依賴（pdfjs、docx-preview）
// 都在模組內部用動態 import 惰性載入。
const REFERENCE_VIEWERS: Record<ReferenceKind, ComponentType<ReferenceViewerProps>> = {
  pdf: PdfRenderer,
  docx: DocxRenderer,
};

type OpenDetail = { file: string; page?: number };

export default function ReferenceViewerDrawer() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [meta, setMeta] = useState<ReferenceViewerMeta>({});
  // 抽屜寬度依「當前這份文件在 100% 縮放下的原生寬度」算出來，而不是固定值——
  // 這樣預設 100% 就能完整顯示整頁，不用使用者自己縮小。每份新文件重算一次。
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_WIDTH);
  const widthSetRef = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  // 合併而非取代：檢視器可以分次回報（載入完先給 pageCount、畫完第一頁再給 naturalWidth）。
  // 身分必須穩定，否則會變成檢視器 effect 的相依、每次 render 都重載文件。
  const onMeta = useCallback((next: ReferenceViewerMeta) => {
    setMeta((prev) => ({ ...prev, ...next }));
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (!detail?.file) return;
      setFile(detail.file);
      setPage(detail.page || 1);
      setScale(1);
      setMeta({});
      widthSetRef.current = false;
      setOpen(true);
    };
    window.addEventListener("nc-ref-open", onOpen as EventListener);
    return () => window.removeEventListener("nc-ref-open", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  // 抽屜寬度：每份文件只在第一次拿到原生寬度時算一次。夾在 [MIN_WIDTH, 視窗寬度 - 留白]
  // 之間，避免極窄或超寬的頁面把抽屜擠得太小或吃光整個畫面。
  useEffect(() => {
    if (widthSetRef.current || !meta.naturalWidth) return;
    widthSetRef.current = true;
    const desired = meta.naturalWidth + CONTENT_PADDING * 2;
    const maxAllowed = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN);
    setDrawerWidth(Math.round(Math.min(Math.max(desired, MIN_WIDTH), maxAllowed)));
  }, [meta.naturalWidth]);

  const fileName = file?.split("/").pop() ?? "";
  const kind = fileName ? referenceKindOf(fileName) : null;
  const Viewer = kind ? REFERENCE_VIEWERS[kind] : null;
  const url = file ? referenceAssetUrl(file) : "";
  const pageCount = meta.pageCount ?? 0;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pageCount || p, p + 1));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          role="dialog"
          aria-label={`講義檢視：${fileName}`}
          initial={{ x: drawerWidth }}
          animate={{ x: 0 }}
          exit={{ x: drawerWidth }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: drawerWidth,
            maxWidth: "100vw",
            transition: reducedMotion ? "none" : "width 220ms var(--ease-out, ease-out)",
            zIndex: 900,
            display: "flex",
            flexDirection: "column",
            background: "var(--neutral-0)",
            boxShadow: "var(--shadow-xl)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 56,
              padding: "0 12px 0 16px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              title={fileName}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-strong)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileName}
            </span>
            {kind && (
              <span
                style={{
                  flex: "none",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--neutral-100)",
                  color: "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {REFERENCE_KIND_LABEL[kind]}
              </span>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="關閉"
              title="關閉（Esc）"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: "none",
                borderRadius: "var(--radius-pill)",
                background: "var(--neutral-100)",
                color: "var(--text-body)",
                cursor: "pointer",
                flex: "none",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "auto",
              background: "var(--neutral-50)",
              padding: CONTENT_PADDING,
            }}
          >
            {Viewer ? (
              // key={url}：換一份文件等於重新 mount 檢視器，狀態（文件、頁數、量過的寬度）
              // 一次清乾淨，檢視器內部不必自己分辨「現在這份是不是剛剛那份」。
              <Viewer key={url} url={url} page={page} scale={scale} onMeta={onMeta} />
            ) : (
              <ViewerStatus>不支援的檔案格式：{fileName}</ViewerStatus>
            )}
          </div>

          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              height: 52,
              borderTop: "1px solid var(--border-subtle)",
              padding: "0 16px",
            }}
          >
            {/* 翻頁控制只對「有分頁概念」的格式出現：docx 的分頁是排版結果不是檔案資料，
                給它一個頁碼輸入框只會讓人以為跳得過去。 */}
            {meta.pageCount !== undefined && (
              <>
                <IconButton onClick={goPrev} disabled={page <= 1} label="上一頁">
                  <ChevronLeft size={16} />
                </IconButton>
                <input
                  type="number"
                  value={page}
                  min={1}
                  max={pageCount || 1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setPage(Math.min(Math.max(1, v), pageCount || v));
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
                <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>/ {pageCount || "…"}</span>
                <IconButton onClick={goNext} disabled={pageCount > 0 && page >= pageCount} label="下一頁">
                  <ChevronRight size={16} />
                </IconButton>
                <span style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />
              </>
            )}
            <IconButton onClick={zoomOut} disabled={scale <= MIN_SCALE} label="縮小">
              <Minus size={16} />
            </IconButton>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)", width: 40, textAlign: "center" }}>
              {Math.round(scale * 100)}%
            </span>
            <IconButton onClick={zoomIn} disabled={scale >= MAX_SCALE} label="放大">
              <Plus size={16} />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
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
  children: React.ReactNode;
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
