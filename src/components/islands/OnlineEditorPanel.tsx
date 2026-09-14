import { useEffect, useState } from "react";
import { X, UploadCloud, AlertTriangle } from "lucide-react";
import {
  fetchNoteFile,
  publishNoteFile,
  splitFrontmatter,
  bumpUpdatedAt,
  extractRefs,
  diffRemovedRefs,
  todayISO,
  GithubConflictError,
  GithubNotFoundError,
  GithubApiError,
} from "@/lib/github-contents";
import type { OnlineEditSettings } from "@/lib/online-edit-settings";

type Props = {
  slug: string;
  noteTitle: string;
  filePath?: string;
  settings: OnlineEditSettings;
  onClose: () => void;
};

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; path: string; sha: string; frontmatter: string; originalBody: string };

export default function OnlineEditorPanel({ slug, noteTitle, filePath, settings, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [bodyDraft, setBodyDraft] = useState("");
  const [commitMessage, setCommitMessage] = useState(`更新《${noteTitle}》內文`);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNoteFile(settings, slug, filePath)
      .then((file) => {
        if (cancelled) return;
        const { frontmatter, body } = splitFrontmatter(file.raw);
        setState({ phase: "ready", path: file.path, sha: file.sha, frontmatter, originalBody: body });
        setBodyDraft(body);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof GithubNotFoundError
            ? err.message
            : err instanceof GithubApiError
              ? `GitHub 回應錯誤（${err.status}）：${err.message}`
              : "讀取失敗，請確認設定的 repo / token 是否正確";
        setState({ phase: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [settings, slug, filePath]);

  const publish = async () => {
    if (state.phase !== "ready") return;
    if (!commitMessage.trim()) {
      setPublishError("請填寫 commit message");
      return;
    }
    const before = extractRefs(state.originalBody);
    const after = extractRefs(bodyDraft);
    const removed = diffRemovedRefs(before, after);
    const removedCount = removed.markerIds.length + removed.importIds.length;
    if (removedCount > 0) {
      const ok = window.confirm(
        `偵測到你可能刪除了 ${removedCount} 個視覺化標記或元件引用，繼續發布會讓這些內容從筆記消失，確定要繼續嗎？`,
      );
      if (!ok) return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const newFrontmatter = bumpUpdatedAt(state.frontmatter, todayISO());
      await publishNoteFile(settings, state.path, newFrontmatter + bodyDraft, state.sha, commitMessage);
      window.dispatchEvent(
        new CustomEvent("nc-toast", { detail: { msg: "已發布，Netlify 即將重新部署", icon: "check" } }),
      );
      onClose();
    } catch (err) {
      if (err instanceof GithubConflictError) {
        setPublishError(err.message);
      } else if (err instanceof GithubApiError) {
        setPublishError(`GitHub 回應錯誤（${err.status}）：${err.message}`);
      } else {
        setPublishError("發布失敗，請稍後再試");
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>線上編輯 · {slug}</span>
        <button onClick={onClose} style={closeBtn} disabled={publishing}>
          <X size={16} />
        </button>
      </div>

      {state.phase === "loading" && <div style={statusBox}>讀取中…</div>}
      {state.phase === "error" && (
        <div style={{ ...statusBox, color: "var(--danger-500)" }}>
          <AlertTriangle size={15} style={{ marginRight: 6 }} />
          {state.message}
        </div>
      )}
      {state.phase === "ready" && (
        <>
          <textarea value={bodyDraft} onChange={(e) => setBodyDraft(e.target.value)} spellCheck={false} style={textarea} />
          <div style={publishBar}>
            <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} style={commitInput} />
            <button onClick={publish} disabled={publishing} style={publishBtn(publishing)}>
              <UploadCloud size={15} /> {publishing ? "發布中…" : "發布"}
            </button>
          </div>
          {publishError && <div style={errorBanner}>{publishError}</div>}
        </>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-lg)",
  background: "#fff",
  boxShadow: "var(--shadow-card)",
  padding: 14,
  marginBottom: 18,
};
const head: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const closeBtn: React.CSSProperties = {
  border: "none",
  background: "var(--neutral-100)",
  borderRadius: 999,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-muted)",
};
const statusBox: React.CSSProperties = { fontSize: 13, color: "var(--text-muted)", padding: "20px 4px" };
const textarea: React.CSSProperties = {
  minHeight: 360,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  background: "var(--neutral-50)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  lineHeight: 1.75,
  color: "var(--neutral-700)",
  padding: "12px 14px",
  resize: "vertical",
};
const publishBar: React.CSSProperties = { display: "flex", gap: 10 };
const commitInput: React.CSSProperties = {
  flex: 1,
  height: 36,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  color: "var(--text-strong)",
};
function publishBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 16px",
    borderRadius: 999,
    border: "none",
    background: "var(--action-primary)",
    color: "#fff",
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: 12.5,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}
const errorBanner: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--danger-500)",
  background: "var(--danger-50)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
};
