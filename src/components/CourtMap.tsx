import type { ZoneStats } from "../types";
import { ZONE_POSITIONS, ZONE_LABELS } from "../utils/zones";

interface CourtMapProps {
  stats: ZoneStats[];
}

function getZoneColor(percentage: number): string {
  if (percentage >= 60) return "#22c55e"; // green
  if (percentage >= 45) return "#84cc16"; // lime
  if (percentage >= 35) return "#eab308"; // yellow
  if (percentage >= 25) return "#f97316"; // orange
  return "#ef4444"; // red
}

export function CourtMap({ stats }: CourtMapProps) {
  const statsMap = new Map(stats.map((s) => [s.zone, s]));

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <svg viewBox="0 0 500 600" style={{ width: "100%", background: "#1a1a2e", borderRadius: 12 }}>
        {/* Court outline */}
        <rect x="25" y="30" width="450" height="540" fill="none" stroke="#334155" strokeWidth="2" rx="4" />

        {/* Paint / lane */}
        <rect x="150" y="400" width="200" height="170" fill="none" stroke="#475569" strokeWidth="1.5" />

        {/* Free throw circle */}
        <circle cx="250" cy="400" r="60" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="6 4" />

        {/* Three-point arc */}
        <path
          d="M 60 570 L 60 420 Q 60 200 250 200 Q 440 200 440 420 L 440 570"
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Backboard and hoop */}
        <line x1="210" y1="555" x2="290" y2="555" stroke="#94a3b8" strokeWidth="3" />
        <circle cx="250" cy="540" r="12" fill="none" stroke="#f97316" strokeWidth="2" />

        {/* Zone markers */}
        {Object.entries(ZONE_POSITIONS).map(([zone, pos]) => {
          const stat = statsMap.get(zone as keyof typeof ZONE_POSITIONS);
          const cx = (pos.x / 100) * 500;
          const cy = (pos.y / 100) * 600;

          if (!stat) {
            // No shots in this zone — show empty marker
            return (
              <g key={zone}>
                <circle cx={cx} cy={cy} r="20" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize="10">
                  —
                </text>
              </g>
            );
          }

          const color = getZoneColor(stat.percentage);

          return (
            <g key={zone}>
              <circle cx={cx} cy={cy} r="24" fill={color} opacity={0.85} />
              <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="bold">
                {stat.percentage}%
              </text>
              <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9" opacity={0.8}>
                {stat.makes}/{stat.attempts}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        {stats
          .sort((a, b) => b.percentage - a.percentage)
          .map((s) => (
            <div
              key={s.zone}
              style={{
                background: "#1e293b",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                color: "#e2e8f0",
                borderLeft: `3px solid ${getZoneColor(s.percentage)}`,
              }}
            >
              {ZONE_LABELS[s.zone]}: {s.percentage}%
            </div>
          ))}
      </div>
    </div>
  );
}
