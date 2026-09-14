import { useEffect, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import { loadSettings, type OnlineEditSettings } from "@/lib/online-edit-settings";
import OnlineEditorSettingsForm from "./OnlineEditorSettingsForm";

type Props = { slug: string; noteTitle: string };

export default function OnlineEditor({ slug, noteTitle }: Props) {
  const [settings, setSettings] = useState<OnlineEditSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  return (
    <>
      {settings ? (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Pencil size={15} /> 線上編輯
        </button>
      ) : (
        <button onClick={() => setShowSettings(true)} style={triggerBtn}>
          <Settings size={15} /> 設定線上編輯
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
