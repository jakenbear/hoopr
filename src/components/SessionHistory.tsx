import type { Session } from "../types";

interface SessionHistoryListProps {
  history: Session[];
  onDelete: (id: string) => void;
}

export function SessionHistoryList({ history, onDelete }: SessionHistoryListProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
        Past Sessions
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((s) => {
          const makes = s.shots.filter((sh) => sh.result === "hit").length;
          const pct = s.shots.length > 0 ? Math.round((makes / s.shots.length) * 100) : 0;
          const date = new Date(s.startTime);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#1e293b",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>
                  {makes}/{s.shots.length} — {pct}%
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {dateStr} at {timeStr}
                </div>
              </div>
              <button
                onClick={() => onDelete(s.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#475569",
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
                aria-label="Delete session"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
