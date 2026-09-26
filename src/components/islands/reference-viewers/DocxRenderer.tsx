import { useEffect, useRef, useState } from "react";
import type { ReferenceViewerProps } from "./types";
import ViewerStatus from "./ViewerStatus";

// 與 pdfjs 同樣的理由（見 PdfRenderer.tsx）：抽屜出現在每一頁，docx-preview 與它的
// jszip 依賴只在讀者真的開了 Word 檔時才載入。失敗不快取，讓下一次開啟能重試。
let docxPreviewPromise: Promise<typeof import("docx-preview")> | null = null;
function loadDocxPreview() {
  if (!docxPreviewPromise) {
    docxPreviewPromise = import("docx-preview").catch((err) => {
      docxPreviewPromise = null;
      throw err;
    });
  }
  return docxPreviewPromise;
}

/**
 * Word（.docx）檢視器。
 *
 * 與 PDF 有兩點本質差異：
 *
 * 1. **沒有頁數可回報**。docx 的分頁是排版引擎跑出來的結果，不是檔案裡的資料；
 *    docx-preview 依 `breakPages` 畫出來的頁框是它自己的估算。因此不回報 pageCount，
 *    工具列的翻頁控制不會出現，讀者直接捲動。
 * 2. **輸出是 DOM 不是 canvas**，所以縮放用 CSS `zoom` 而不是 transform：zoom 會實際
 *    重新佈局，容器高度與捲軸自動跟著變；transform: scale() 只是視覺縮放，放大後內容
 *    會溢出容器、捲不到底，還得自己補償尺寸。
 */
export default function DocxRenderer({ url, scale, onMeta }: ReferenceViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    Promise.all([loadDocxPreview(), fetch(url)])
      .then(([lib, res]) => {
        // fetch 只有在網路層失敗才 reject，404 會是一個 ok:false 的正常回應 ——
        // 不自己擋下來的話，會把 HTML 錯誤頁當成 docx 餵給解析器，錯在很後面才炸。
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Promise.all([lib, res.blob()]);
      })
      .then(([lib, blob]) => {
        if (cancelled) return undefined;
        container.replaceChildren();
        return lib.renderAsync(blob, container, container, {
          // 內嵌圖片轉成 base64 而不是 object URL：object URL 要手動 revoke，
          // 但它們由 docx-preview 建立、散在 DOM 裡，抽屜關掉後只會留著直到整頁卸載。
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
      })
      .then(() => {
        if (cancelled) return;
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // 畫面上的訊息對讀者說人話，真正的原因留給 console —— 這個 catch 蓋掉的可能是
        // 404、壞掉的 zip，也可能是 dev 期的 504 Outdated Optimize Dep（三者對讀者
        // 長得一模一樣），不印出來就只能靠猜。
        console.error("[reference-viewer] Word 檔載入失敗", url, err);
        container.replaceChildren();
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // 量寬度必須等狀態切到 ready 之後：載入中的容器是 display:none，
  // 在那個時間點量任何後代的 offsetWidth 都是 0，抽屜就會一直停在預設寬度。
  // effect 在 DOM commit 之後才跑，此時容器已經是 display:block。
  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;
    reportNaturalWidth(containerRef.current, onMeta);
  }, [status, onMeta]);

  return (
    <>
      {status === "loading" && <ViewerStatus>載入中…</ViewerStatus>}
      {status === "error" && <ViewerStatus>Word 檔載入失敗，請確認檔案是否存在或格式是否為 .docx。</ViewerStatus>}
      {/* 容器必須一直在 DOM 裡：docx-preview 是直接寫進這個節點的，不能等狀態切換才掛。
          載入中／失敗時把它藏起來，而不是拿掉。 */}
      <div ref={containerRef} style={{ display: status === "ready" ? "block" : "none", zoom: scale }} />
    </>
  );
}

/**
 * 量出文件頁面在 100% 下的寬度回報給殼。docx-preview 的輸出形狀是
 * `<div class="docx-wrapper"><section class="docx">…</section></div>`：wrapper 會被
 * 容器撐滿（量了沒有意義），真正的頁寬在 section 上，再加回 wrapper 的左右留白。
 */
function reportNaturalWidth(
  container: HTMLElement,
  onMeta: (meta: { naturalWidth?: number }) => void,
): void {
  const section = container.querySelector<HTMLElement>("section");
  if (!section) return;
  const wrapper = section.parentElement;
  const padding = wrapper ? parseFloat(getComputedStyle(wrapper).paddingLeft) || 0 : 0;
  onMeta({ naturalWidth: section.offsetWidth + padding * 2 });
}
