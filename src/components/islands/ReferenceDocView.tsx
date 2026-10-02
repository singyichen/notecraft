// 講義頁籤的主區（/references/doc/*；issue #3）。layout 以 bareBody 掛它：Toolbar 列與 #nc-scroll.wb-body 都由這裡輸出。
//
// MPA 下每次切頁籤都是整頁導覽，元件 state 留不住，所以閱讀狀態存在頁籤清單裡（wb-tabs 的 TabEntry）：
// - 頁碼、縮放 → `doc`（setDocState）
// - 捲動位置   → `scroll`（與筆記頁共用欄位）。但 TabBar 的通用還原在 `load` 事件就收手，
//   講義是 load 之後才非同步畫出來的（pdfjs、docx-preview），scrollTop 會被夾在 0，所以講義頁籤的捲動由這裡自己管
// 頁籤不存在（被別的視窗關掉）時 setDocState／setScroll 都是 no-op，不會憑空長出頁籤。
//
// 筆記裡的引用不走這裡，仍開右側抽屜（ReferenceViewerDrawer），兩邊狀態互不影響。
import { useCallback, useEffect, useRef, useState } from "react";
import { getTabStore } from "@/lib/wb-tabs-store";
import { setDocState, setScroll, tabKey } from "@/lib/wb-tabs";
import { withBase } from "@/lib/base";
import { referenceKindOf, REFERENCE_KIND_LABEL } from "@/lib/reference-kinds";
import type { ReferenceViewerMeta } from "./reference-viewers/types";
import { REFERENCE_VIEWERS } from "./reference-viewers/registry";
import ReferenceToolbar from "./reference-viewers/ReferenceToolbar";
import ViewerStatus from "./reference-viewers/ViewerStatus";

export interface ReferenceDocViewProps {
  /** 講義的完整相對路徑（頁籤 id） */
  id?: string;
  name?: string;
  /** /notes-assets/… 或 dev-only 的 /local-assets/…（未加站台前綴） */
  url?: string;
  workspace?: string;
}

const SCROLL_KEYS = new Set(["PageUp", "PageDown", " ", "ArrowUp", "ArrowDown", "Home", "End"]);
/** 內容遲遲撐不到目標高度（例如檔案變短了）就放棄還原，免得之後一直把人拉回去 */
const RESTORE_GIVE_UP_MS = 10000;

export default function ReferenceDocView({ id = "", name = "", url = "", workspace = "" }: ReferenceDocViewProps) {
  const key = tabKey("ref", id);
  const handle = getTabStore(workspace);
  const kind = referenceKindOf(name);
  const Viewer = kind ? REFERENCE_VIEWERS[kind] : null;
  const src = withBase(url);

  // 讀到保存的狀態之前不掛檢視器：否則會先畫第 1 頁、100%，再跳到保存的那頁
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [meta, setMeta] = useState<ReferenceViewerMeta>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef(0);
  const restoring = useRef(false);

  const onMeta = useCallback((next: ReferenceViewerMeta) => setMeta((prev) => ({ ...prev, ...next })), []);

  useEffect(() => {
    const t = handle.get().tabs.find((x) => x.key === key);
    if (t?.doc) {
      setPage(t.doc.page);
      setScale(t.doc.scale);
    }
    scrollTarget.current = t?.scroll ?? 0;
    setReady(true);
  }, [handle, key]);

  // 保存頁碼與縮放（剛讀回來的那一次內容相同，setDocState 會回傳原物件、不寫入）
  useEffect(() => {
    if (ready) handle.update((s) => setDocState(s, key, { page, scale }));
  }, [handle, key, ready, page, scale]);

  // 檔案變短了（保存的是第 8 頁、現在只剩 5 頁）：夾回最後一頁
  useEffect(() => {
    if (meta.pageCount && page > meta.pageCount) setPage(meta.pageCount);
  }, [meta.pageCount, page]);

  // 捲動記錄與還原
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!ready || !el || !content) return;
    const target = scrollTarget.current;
    restoring.current = !location.hash && target > 0;
    let timer = 0;

    const save = () => handle.update((s) => setScroll(s, key, el.scrollTop));
    const stop = () => {
      restoring.current = false;
    };
    const apply = () => {
      if (!restoring.current) return;
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) < 2) stop();
    };
    const onScroll = () => {
      if (restoring.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 220);
    };
    const onPageHide = () => {
      if (restoring.current) return;
      window.clearTimeout(timer);
      save();
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) stop();
    };

    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(apply) : null;
    ro?.observe(content);
    apply();
    const giveUp = window.setTimeout(stop, RESTORE_GIVE_UP_MS);
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    return () => {
      ro?.disconnect();
      window.clearTimeout(giveUp);
      window.clearTimeout(timer);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [handle, key, ready]);

  // 使用者翻頁：新的一頁從頂端看起（也結束還原，不再把人拉回舊位置）
  const onPage = useCallback((p: number) => {
    restoring.current = false;
    setPage(p);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  return (
    <>
      <div className="wb-tb nc-refdoc-tb">
        {ready && Viewer ? (
          <ReferenceToolbar page={page} pageCount={meta.pageCount} scale={scale} onPage={onPage} onScale={setScale} />
        ) : null}
        <span className="wb-tb-right nc-refdoc-path" title={id}>
          {kind ? <span className="wb-pill muted">{REFERENCE_KIND_LABEL[kind]}</span> : null}
          <span className="nc-refdoc-rel">{id}</span>
        </span>
      </div>
      <div id="nc-scroll" ref={scrollRef} className="wb-body flush nc-refdoc-body">
        <div ref={contentRef} className="nc-refdoc-content">
          {!Viewer ? (
            <ViewerStatus>
              不支援的檔案格式：{name}。<a href={withBase("/references")}>回到講義列表</a>
            </ViewerStatus>
          ) : ready ? (
            <Viewer url={src} page={page} scale={scale} onMeta={onMeta} />
          ) : (
            <ViewerStatus>載入中…</ViewerStatus>
          )}
        </div>
      </div>
    </>
  );
}
