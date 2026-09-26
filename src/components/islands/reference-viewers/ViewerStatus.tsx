/** 檢視器共用的載入中／失敗訊息，讓各格式的空狀態長得一樣。 */
export default function ViewerStatus({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}
