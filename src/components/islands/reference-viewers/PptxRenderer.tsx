import { useEffect, useRef, useState } from "react";
import type { PptxViewer } from "@aiden0z/pptx-renderer";
import type { ReferenceViewerProps } from "./types";
import ViewerStatus from "./ViewerStatus";
import { fixPptxAutofit } from "@/lib/pptx-autofit-fix";

// 與 pdfjs／docx-preview 同樣的理由：抽屜出現在每一頁，@aiden0z/pptx-renderer 連同它的
// jszip 與 echarts 子模組只在讀者真的開了 .pptx 時才載入。失敗不快取，讓下一次開啟能重試。
let pptxLibPromise: Promise<typeof import("@aiden0z/pptx-renderer")> | null = null;
function loadPptxRenderer() {
  if (!pptxLibPromise) {
    pptxLibPromise = import("@aiden0z/pptx-renderer").catch((err) => {
      pptxLibPromise = null;
      throw err;
    });
  }
  return pptxLibPromise;
}

// SmartArt 與從 Word 貼過來的向量圖（公式最常見）在 pptx 裡常是 EMF，而 EMF 內嵌的是一份
// PDF 預覽。渲染器不自己解 EMF，但能用 pdf.js 把那份預覽畫出來——這裡只是把專案既有的
// pdfjs-dist 資產網址交給它，真正遇到 EMF 時它才會在 worker 裡載入；沒有 EMF 的投影片
// 完全不會多下載任何東西。網址要是絕對的：它是在 blob worker 裡 import 的，沒有 base。
let pdfjsUrlsPromise: Promise<{ moduleUrl: string; workerUrl: string }> | null = null;
function loadPdfjsUrls() {
  if (!pdfjsUrlsPromise) {
    pdfjsUrlsPromise = Promise.all([
      import("pdfjs-dist/build/pdf.min.mjs?url"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([m, w]) => ({
      moduleUrl: new URL(m.default, window.location.href).href,
      workerUrl: new URL(w.default, window.location.href).href,
    }));
  }
  return pdfjsUrlsPromise;
}

// 抽屜寬度由 naturalWidth 決定；16:9 投影片的原生寬度是 1280px（13.33 吋 × 96dpi），
// 照實回報會讓抽屜一開就吃掉整個視窗。這裡報一個適合閱讀的上限，實際排版交給 fitMode:
// "contain" 把投影片縮進抽屜寬度，之後的縮放再乘在這個基準上。
const MAX_NATURAL_WIDTH = 960;

// 渲染器會在三個時間點重算 normAutofit 的縮放：同步一次、兩層 requestAnimationFrame 後一次、
// 字型載完再一次，每次都先還原再重算——修正若搶在它前面就會被蓋掉。所以等這三個時間點都過了
// 再修，並在稍後再補一次保險（修正是冪等的，重跑結果相同）。
function scheduleAutofitFix(slide: HTMLElement, isCancelled: () => boolean) {
  const run = () => {
    if (isCancelled() || !slide.isConnected) return;
    fixPptxAutofit(slide);
  };
  const afterFrames = (n: number, cb: () => void) =>
    n <= 0 ? cb() : requestAnimationFrame(() => afterFrames(n - 1, cb));
  const fontsReady = typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => afterFrames(3, run)).catch(() => afterFrames(3, run));
  window.setTimeout(run, 600);
}

/**
 * PowerPoint（.pptx）檢視器。
 *
 * 與 PDF 同一種形狀：有分頁概念（回報 pageCount，翻頁控制會出現），一次只畫 `page` 那一張。
 * 渲染器以 renderMode "slide" 掛在容器上，翻頁走 goToSlide、縮放走 setZoom，不自己管 DOM；
 * 殼以 url 當 key 掛載本元件，換一份文件等於重新 mount，effect 只要顧好同一份文件內的翻頁與縮放。
 */
export default function PptxRenderer({ url, page, scale, onMeta }: ReferenceViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PptxViewer | null>(null);
  // 開啟當下要跳到的那一張（@ai-reference 的 chip 會指定頁碼）。只在載入完成那一刻讀一次，
  // 之後的翻頁由下面的 effect 處理，所以放 ref 而不是放進載入 effect 的相依。
  const initialPageRef = useRef(page);
  initialPageRef.current = page;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    Promise.all([loadPptxRenderer(), loadPdfjsUrls(), fetch(url)])
      .then(([lib, pdfjs, res]) => {
        // fetch 只有在網路層失敗才 reject，404 會是一個 ok:false 的正常回應——
        // 不自己擋下來的話，會把 HTML 錯誤頁當成 zip 餵給解析器，錯在很後面才炸。
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Promise.all([lib, pdfjs, res.arrayBuffer()]);
      })
      .then(async ([lib, pdfjs, buffer]) => {
        if (cancelled) return;
        container.replaceChildren();
        const viewer = new lib.PptxViewer(container, {
          fitMode: "contain",
          zoomPercent: Math.round(scale * 100),
          // 對外來檔案的解壓上限（zip bomb 守衛），套件建議的預設值
          zipLimits: lib.RECOMMENDED_ZIP_LIMITS,
          pdfjs,
          // 單一節點畫不出來（例如不支援的 3D 效果）只警告、不讓整張失敗
          onNodeError: (nodeId, err) => console.warn("[reference-viewer] pptx 節點略過", nodeId, err),
          onSlideRendered: (_index, element) => scheduleAutofitFix(element, () => cancelled),
        });
        viewerRef.current = viewer;
        await viewer.open(buffer, { renderMode: "slide" });
        if (cancelled) return;
        const first = Math.min(Math.max(initialPageRef.current, 1), viewer.slideCount) - 1;
        if (first !== viewer.currentSlideIndex) await viewer.goToSlide(first);
        if (cancelled) return;
        onMeta({
          pageCount: viewer.slideCount,
          naturalWidth: Math.min(viewer.slideWidth || MAX_NATURAL_WIDTH, MAX_NATURAL_WIDTH),
        });
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // 畫面上的訊息對讀者說人話，真正的原因留給 console——404、壞掉的 zip、dev 期的
        // 504 Outdated Optimize Dep 在畫面上長得一模一樣，不印出來只能靠猜。
        console.error("[reference-viewer] PowerPoint 檔載入失敗", url, err);
        container.replaceChildren();
        setStatus("error");
      });
    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
    // scale 的初始值只拿來建 viewer，之後的縮放由下面的 effect 走 setZoom，不該讓它觸發重載
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, onMeta]);

  // 翻頁與縮放都交給渲染器自己重畫；兩個呼叫都是 async，但同一份文件內的操作它會自己排隊
  useEffect(() => {
    const viewer = viewerRef.current;
    if (status !== "ready" || !viewer) return;
    const index = Math.min(Math.max(page, 1), viewer.slideCount) - 1;
    const percent = Math.round(scale * 100);
    (async () => {
      if (viewer.zoomPercent !== percent) await viewer.setZoom(percent);
      if (viewer.currentSlideIndex !== index) await viewer.goToSlide(index);
    })().catch((err) => console.warn("[reference-viewer] pptx 翻頁／縮放失敗", err));
  }, [page, scale, status]);

  return (
    <>
      {status === "loading" && <ViewerStatus>載入中…</ViewerStatus>}
      {status === "error" && (
        <ViewerStatus>PowerPoint 檔載入失敗，請確認檔案是否存在或格式是否為 .pptx。</ViewerStatus>
      )}
      {/* 容器必須一直在 DOM 裡：渲染器是直接寫進這個節點的，不能等狀態切換才掛。
          載入中／失敗時把它藏起來，而不是拿掉。 */}
      <div ref={containerRef} style={{ display: status === "ready" ? "block" : "none" }} />
    </>
  );
}
