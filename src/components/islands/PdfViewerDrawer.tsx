import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pdfAssetUrl } from "@/lib/references-url";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const WIDTH = 560;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

type OpenDetail = { file: string; page: number };

export default function PdfViewerDrawer() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // 每次成功載入新文件就 +1；畫面繪製 effect 靠這個值判斷「文件本身」是否換了一份，
  // 不能只靠 page / scale / numPages（兩份不同文件很可能剛好頁碼、頁數都相同）。
  const [docVersion, setDocVersion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (!detail?.file) return;
      setFile(detail.file);
      setPage(detail.page || 1);
      setScale(1);
      setOpen(true);
    };
    window.addEventListener("nc-pdf-open", onOpen as EventListener);
    return () => window.removeEventListener("nc-pdf-open", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  // 載入 PDF 文件——只在 file 變動時重載，不是每次翻頁都重載
  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const task = pdfjsLib.getDocument({ url: pdfAssetUrl(file) });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
        setDocVersion((v) => v + 1);
      })
      .catch(() => {
        // 檔案不存在 / 404 / 格式錯誤等情況：不能讓 rejection 被吞掉、loading 卡死，
        // 要讓使用者看到明確的失敗狀態而不是永遠轉圈圈。
        if (cancelled) return;
        docRef.current = null;
        setLoading(false);
        setLoadError(true);
      });
    return () => {
      cancelled = true;
      task.destroy();
      docRef.current = null;
    };
  }, [open, file]);

  // 渲染當前頁到 canvas；page / scale 任一變動都要重畫，並取消上一次還沒畫完的 render
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !open) return;
    let cancelled = false;
    const clampedPage = Math.min(Math.max(page, 1), doc.numPages);
    doc.getPage(clampedPage).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: context, viewport, canvas });
      renderTaskRef.current = task;
      task.promise.catch(() => {
        /* 被下一次 render 取消時會 reject，忽略即可 */
      });
    });
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [page, scale, numPages, open, docVersion]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(numPages || p, p + 1));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const fileName = file?.split("/").pop() ?? "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 890, background: "rgba(15,23,42,0.35)" }}
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`PDF 檢視：${fileName}`}
            initial={{ x: WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: WIDTH }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: WIDTH,
              maxWidth: "100vw",
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
                padding: 16,
              }}
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  載入中…
                </div>
              ) : loadError ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  PDF 載入失敗，請確認檔案是否存在。
                </div>
              ) : (
                <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto", boxShadow: "var(--shadow-md)" }} />
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
              <IconButton onClick={goPrev} disabled={page <= 1} label="上一頁">
                <ChevronLeft size={16} />
              </IconButton>
              <input
                type="number"
                value={page}
                min={1}
                max={numPages || 1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setPage(Math.min(Math.max(1, v), numPages || v));
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
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>/ {numPages || "…"}</span>
              <IconButton onClick={goNext} disabled={numPages > 0 && page >= numPages} label="下一頁">
                <ChevronRight size={16} />
              </IconButton>
              <span style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />
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
        </>
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
