import { useState } from "react";
import { X, Github, ShieldCheck } from "lucide-react";
import { parseRepoInput, saveSettings, clearSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";

type Props = {
  initial: OnlineEditSettings | null;
  onClose: () => void;
  onSaved: (settings: OnlineEditSettings) => void;
};

export default function OnlineEditorSettingsForm({ initial, onClose, onSaved }: Props) {
  const repoHint = import.meta.env.PUBLIC_NOTECRAFT_REPO_HINT || "";
  const [repoInput, setRepoInput] = useState(initial ? `${initial.owner}/${initial.repo}` : repoHint);
  const [branch, setBranch] = useState(initial?.branch ?? "main");
  const [pathPrefix, setPathPrefix] = useState(initial?.pathPrefix ?? "src/content/notes");
  const [token, setToken] = useState(initial?.token ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError("repo 格式要是「owner/repo」，例如 singyichen/notecraft");
      return;
    }
    if (!token.trim()) {
      setError("請貼上 GitHub fine-grained PAT");
      return;
    }
    const settings: OnlineEditSettings = {
      owner: parsed.owner,
      repo: parsed.repo,
      branch: branch.trim() || "main",
      pathPrefix: pathPrefix.trim(),
      token: token.trim(),
    };
    saveSettings(settings);
    onSaved(settings);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={modalHead}>
          <span style={headIcon}>
            <Github size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, color: "var(--text-strong)", margin: 0 }}>設定線上編輯</h2>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              直接呼叫 GitHub API，不經過任何伺服器
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={field}>
            <span style={fieldLabel}>GitHub repo</span>
            <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="owner/repo" style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>分支</span>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Repo 內筆記路徑前綴</span>
            <input value={pathPrefix} onChange={(e) => setPathPrefix(e.target.value)} style={input} />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Fine-grained PAT（僅需這個 repo 的 Contents 讀寫權限）</span>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_..." style={input} />
          </label>
          <div style={notice}>
            <ShieldCheck size={15} style={{ flex: "none", marginTop: 1 }} />
            此 token 只會存在這個瀏覽器裡，只會直接送到 GitHub API，不會送到 NoteCraft 或其他任何伺服器；換裝置需要重新貼一次。
          </div>
          {error && <div style={errorBox}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            {initial ? (
              <button
                onClick={() => {
                  clearSettings();
                  onClose();
                  window.location.reload();
                }}
                style={dangerLink}
              >
                清除設定
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={ghostBtn}>
                取消
              </button>
              <button onClick={submit} style={primaryBtn}>
                儲存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 600,
  background: "rgba(30,27,75,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  borderRadius: "var(--radius-xl)",
  boxShadow: "var(--shadow-xl)",
  overflow: "hidden",
};
const modalHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "20px 24px",
  borderBottom: "1px solid var(--neutral-100)",
};
const headIcon: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 8,
  background: "var(--surface-brand-soft)",
  color: "var(--blue-600)",
};
const closeBtn: React.CSSProperties = {
  border: "none",
  background: "var(--neutral-100)",
  borderRadius: 999,
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-muted)",
};
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" };
const input: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  fontFamily: "var(--font-sans)",
  fontSize: 13.5,
  color: "var(--text-strong)",
};
const notice: React.CSSProperties = {
  display: "flex",
  gap: 8,
  fontSize: 12,
  color: "var(--neutral-500)",
  background: "var(--neutral-50)",
  border: "1px solid var(--neutral-100)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  lineHeight: 1.6,
};
const errorBox: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--danger-500)",
  background: "var(--danger-50)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
};
const dangerLink: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--danger-500)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
const ghostBtn: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  borderRadius: 999,
  border: "1.5px solid var(--neutral-200)",
  background: "#fff",
  color: "var(--text-body)",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  height: 38,
  padding: "0 18px",
  borderRadius: 999,
  border: "none",
  background: "var(--action-primary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
