import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { pdfAssetUrl } from "@/lib/references-url";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 420;
// 內容區左右各 16px padding（見下方 contentRef 那層的 style），算抽屜寬度要扣掉這兩份
const CONTENT_PADDING = 16;
// 抽屜最寬不能吃光視窗——留一截讓筆記正文還看得到、還能捲動
const VIEWPORT_MARGIN = 80;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

// cmaps / standard_fonts 由 build（notes-assets-build-copy.ts）與 dev（dev-api/handlers.mjs）
// 各自複製 / 服務到這兩個固定路徑，供 pdf.js 解析 CJK CMap（如 GBK-EUC-H）與非嵌入標準字型。
const CMAP_URL = "/pdfjs-cmaps/";
const STANDARD_FONT_DATA_URL = "/pdfjs-standard-fonts/";

// pdfjs-dist 打包後約 441 KB。PdfViewerDrawer 以 client:only 掛在 BaseLayout，會出現在
// 每一頁，若在檔案頂層靜態 import 會讓完全沒用到 PDF 的頁面也在首次載入時抓下這包 JS。
// 改成惰性動態 import，只有讀者第一次觸發 nc-pdf-open 才真正載入 pdfjs 與它的 worker；
// 用模組層的 promise cache 確保多次開啟只載入一次。
let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

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
  // 抽屜寬度依「當前這份 PDF 在 100% 縮放下的原生寬度」算出來，而不是固定值——
  // 這樣預設 100% 就能完整顯示整頁，不用使用者自己縮小。每份新文件重算一次。
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_WIDTH);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  // 換文件時重置：確保 drawerWidth 只在每份新文件第一次渲染時算一次，
  // 同一份文件內翻頁、手動縮放都不應該讓抽屜寬度再跳動。
  const widthSetRef = useRef(false);

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
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  // 載入 PDF 文件——只在 file 變動時重載，不是每次翻頁都重載
  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    setLoading(true);
    setLoadError(false);
    loadPdfjs()
      .then((lib) => {
        if (cancelled) return undefined;
        task = lib.getDocument({
          url: pdfAssetUrl(file),
          cMapUrl: CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: STANDARD_FONT_DATA_URL,
        });
        return task.promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        docRef.current = doc;
        widthSetRef.current = false;
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
      task?.destroy();
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

      // 第一次畫這份文件：量出 100% 縮放下的原生寬度，把抽屜撐到剛好完整顯示整頁，
      // 而不是讓頁面被固定寬度的抽屜裁掉。夾在 [MIN_WIDTH, 視窗寬度 - 留白] 之間，
      // 避免極窄或超寬的頁面把抽屜擠得太小或吃光整個畫面。
      if (!widthSetRef.current) {
        widthSetRef.current = true;
        const natural = pdfPage.getViewport({ scale: 1 });
        const desired = natural.width + CONTENT_PADDING * 2;
        const maxAllowed = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN);
        setDrawerWidth(Math.round(Math.min(Math.max(desired, MIN_WIDTH), maxAllowed)));
      }

      const context = canvas.getContext("2d");
      if (!context) return;
      // devicePixelRatio：canvas 的畫布解析度只跟著 CSS 邏輯像素跑會在 Retina /
      // HiDPI 螢幕被瀏覽器放大成模糊的點陣圖。內部畫布用 scale * dpr 的解析度畫，
      // 再用 style.width/height 把顯示尺寸壓回原本的 CSS 像素，畫面看起來一樣大但夠銳利。
      const dpr = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale });
      const renderViewport = pdfPage.getViewport({ scale: scale * dpr });
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: context, viewport: renderViewport, canvas });
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
            key="drawer"
            role="dialog"
            aria-label={`PDF 檢視：${fileName}`}
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
