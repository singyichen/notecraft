import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Settings } from "lucide-react";
import { loadSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";
import OnlineEditorSettingsForm from "./OnlineEditorSettingsForm";
import OnlineEditorPanel from "./OnlineEditorPanel";

type Props = { slug: string; noteTitle: string; filePath?: string };

export default function OnlineEditor({ slug, noteTitle, filePath }: Props) {
  const [settings, setSettings] = useState<OnlineEditSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setSlotEl(document.getElementById("nc-online-editor-slot"));
  }, []);

  useEffect(() => {
    const el = document.getElementById("nc-note-content");
    if (el) el.style.display = editing ? "none" : "";
  }, [editing]);

  return (
    <>
      {settings ? (
        <button onClick={() => setEditing(true)} style={triggerBtn}>
          <Pencil size={15} /> 線上編輯
        </button>
      ) : (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Settings size={15} /> 設定線上編輯
        </button>
      )}
      {settings && (
        <button onClick={() => setShowSettings(true)} style={settingsBtn} aria-label="線上編輯設定">
          <Settings size={15} />
        </button>
      )}
      {showSettings && (
        <OnlineEditorSettingsForm
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
      {editing && settings && slotEl
        ? createPortal(
            <OnlineEditorPanel
              slug={slug}
              noteTitle={noteTitle}
              filePath={filePath}
              settings={settings}
              onClose={() => setEditing(false)}
            />,
            slotEl,
          )
        : null}
    </>
  );
}

const triggerBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 999,
  border: "none",
  background: "var(--action-secondary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const settingsBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid var(--border-default)",
  background: "#fff",
  color: "var(--neutral-500)",
  cursor: "pointer",
};
