import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { withBase } from "@/lib/base";
import { referenceAssetUrl } from "@/lib/references-url";
import { referenceKindOf, REFERENCE_KIND_LABEL } from "@/lib/reference-kinds";
import type { ReferenceViewerMeta } from "./reference-viewers/types";
import { REFERENCE_VIEWERS } from "./reference-viewers/registry";
import ReferenceToolbar from "./reference-viewers/ReferenceToolbar";
import ViewerStatus from "./reference-viewers/ViewerStatus";

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 420;
// 內容區左右各 16px padding（見下方 content 那層的 style），算抽屜寬度要扣掉這兩份
const CONTENT_PADDING = 16;
// 抽屜最寬不能吃光視窗——留一截讓筆記正文還看得到、還能捲動
const VIEWPORT_MARGIN = 80;

// 筆記內的講義引用（<PdfRefChip>、資料檔連結）一律開這個抽屜，**不**開頁籤（issue #3）：
// 讀筆記時對照講義，關掉抽屜就回到原本的閱讀位置。狀態每次開啟都重設、只活在這個元件裡，
// 所以不會寫進同一份講義的頁籤閱讀狀態（那邊在 ReferenceDocView，存在頁籤清單裡）。
// 格式註冊表與工具列和講義頁籤共用（reference-viewers/registry.ts、ReferenceToolbar.tsx）。

/**
 * `file` 是顯示用的路徑（也用來判斷格式）；`url` 可省略，省略時當作 notesDir 底下的檔案、
 * 以 `/notes-assets/` 推算。dev-only 的外部資料檔（`/local-assets/*`）推算不出來，
 * 由派發端直接帶 url。
 */
type OpenDetail = { file: string; page?: number; url?: string };

export default function ReferenceViewerDrawer() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
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
      setFileUrl(detail.url ?? null);
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
  // withBase：站台部署在子路徑時，/notes-assets/* 也在那個前綴底下（冪等，已帶前綴的不會再加）
  const url = withBase(fileUrl ?? (file ? referenceAssetUrl(file) : ""));

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
            <ReferenceToolbar page={page} pageCount={meta.pageCount} scale={scale} onPage={setPage} onScale={setScale} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
