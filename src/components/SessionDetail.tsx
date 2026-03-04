import type { Session, ZoneStats, CourtZone } from "../types";
import { CourtMap } from "./CourtMap";

interface SessionDetailProps {
  session: Session;
  onBack: () => void;
}

function computeZoneStats(session: Session): ZoneStats[] {
  const map = new Map<CourtZone, { makes: number; attempts: number }>();

  for (const shot of session.shots) {
    const existing = map.get(shot.zone) ?? { makes: 0, attempts: 0 };
    existing.attempts++;
    if (shot.result === "hit") existing.makes++;
    map.set(shot.zone, existing);
  }

  return Array.from(map.entries()).map(([zone, data]) => ({
    zone,
    ...data,
    percentage: Math.round((data.makes / data.attempts) * 100),
  }));
}

export function SessionDetail({ session, onBack }: SessionDetailProps) {
  const makes = session.shots.filter((s) => s.result === "hit").length;
  const attempts = session.shots.length;
  const percentage = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;
  const stats = computeZoneStats(session);

  const date = new Date(session.startTime);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const durationMs = (session.endTime ?? session.startTime) - session.startTime;
  const durationMin = Math.round(durationMs / 60000);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#94a3b8",
          fontSize: 14,
          cursor: "pointer",
          padding: "4px 0",
          marginBottom: 16,
        }}
      >
        ← Back
      </button>

      {/* Date header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", margin: "0 0 4px" }}>
          {dateStr}
        </h2>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          {timeStr} · {durationMin > 0 ? `${durationMin} min` : "<1 min"}
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{attempts}</div>
          <div className="stat-label">Shots</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{makes}</div>
          <div className="stat-label">Makes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{percentage}%</div>
          <div className="stat-label">FG%</div>
        </div>
      </div>

      {/* Court map with dots + zones */}
      <CourtMap stats={stats} shots={session.shots} />
    </div>
  );
}
