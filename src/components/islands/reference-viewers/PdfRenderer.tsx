import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ReferenceViewerProps } from "./types";
import ViewerStatus from "./ViewerStatus";

// cmaps / standard_fonts 由 build（notes-assets-build-copy.ts）與 dev（dev-api/handlers.mjs）
// 各自複製 / 服務到這兩個固定路徑，供 pdf.js 解析 CJK CMap（如 GBK-EUC-H）與非嵌入標準字型。
const CMAP_URL = "/pdfjs-cmaps/";
const STANDARD_FONT_DATA_URL = "/pdfjs-standard-fonts/";

// pdfjs-dist 打包後約 441 KB。檢視器抽屜以 client:only 掛在 WorkbenchLayout，會出現在
// 每一頁，若在檔案頂層靜態 import 會讓完全沒開過講義的頁面也在首次載入時抓下這包 JS。
// 改成惰性動態 import，只有讀者第一次開啟 PDF 才真正載入 pdfjs 與它的 worker；
// 用模組層的 promise cache 確保多次開啟只載入一次。
let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ])
      .then(([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        return lib;
      })
      .catch((err) => {
        // 不快取失敗結果：dev 期間 pdfjs-dist 若還沒被 Vite 預先 optimize，
        // 第一次動態 import 可能撞上「Outdated Optimize Dep」的暫時性 504；
        // 若把這個 rejected promise 存進模組層 cache，之後每次開任何 PDF
        // 都會直接吃到同一個已失敗的 promise，永久卡在「載入失敗」，
        // 跟檔案本身存不存在無關。清掉 cache 讓下一次開啟能重新 import。
        pdfjsLibPromise = null;
        throw err;
      });
  }
  return pdfjsLibPromise;
}

/**
 * PDF 檢視器。殼會以 url 當 key 掛載本元件，所以「換一份文件」等於重新 mount ——
 * 不需要自己追蹤文件版本，effect 的相依只要顧好同一份文件內的翻頁與縮放。
 */
export default function PdfRenderer({ url, page, scale, onMeta }: ReferenceViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  // 原生寬度只在這份文件第一次畫的時候量一次回報；同一份文件內翻頁、縮放都不該讓抽屜寬度再跳動。
  const naturalSentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    setStatus("loading");
    loadPdfjs()
      .then((lib) => {
        if (cancelled) return undefined;
        task = lib.getDocument({
          url,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: STANDARD_FONT_DATA_URL,
        });
        return task.promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        docRef.current = doc;
        onMeta({ pageCount: doc.numPages });
        setStatus("ready");
      })
      .catch((err) => {
        // 檔案不存在 / 404 / 格式錯誤等情況：不能讓 rejection 被吞掉、loading 卡死，
        // 要讓使用者看到明確的失敗狀態而不是永遠轉圈圈。畫面訊息對讀者說人話，
        // 真正的原因印進 console，否則各種成因在畫面上長得一模一樣、只能靠猜。
        if (cancelled) return;
        console.error("[reference-viewer] PDF 載入失敗", url, err);
        docRef.current = null;
        setStatus("error");
      });
    return () => {
      cancelled = true;
      task?.destroy();
      docRef.current = null;
    };
  }, [url, onMeta]);

  // 渲染當前頁到 canvas；page / scale 任一變動都要重畫，並取消上一次還沒畫完的 render
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (status !== "ready" || !doc || !canvas) return;
    let cancelled = false;
    const clampedPage = Math.min(Math.max(page, 1), doc.numPages);
    doc.getPage(clampedPage).then((pdfPage) => {
      if (cancelled) return;

      if (!naturalSentRef.current) {
        naturalSentRef.current = true;
        onMeta({ naturalWidth: pdfPage.getViewport({ scale: 1 }).width });
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
  }, [page, scale, status, onMeta]);

  if (status === "loading") return <ViewerStatus>載入中…</ViewerStatus>;
  if (status === "error") return <ViewerStatus>PDF 載入失敗，請確認檔案是否存在。</ViewerStatus>;
  return <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto", boxShadow: "var(--shadow-md)" }} />;
}
