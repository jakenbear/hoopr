import type { Shot } from "../types";

interface LiveCourtProps {
  position: { x: number; y: number };
  trail: { x: number; y: number }[];
  shots: Shot[];
  markedPosition?: { x: number; y: number } | null;
}

// Court dimensions in meters (half court)
const COURT_WIDTH = 15.24; // NBA half-court width
const COURT_DEPTH = 14.33; // roughly half-court depth we care about

// Convert court meters to SVG coordinates
// SVG is 300 wide x 360 tall, court centered
function toSvg(x: number, y: number): { sx: number; sy: number } {
  const padding = 20;
  const svgW = 300 - padding * 2;
  const svgH = 360 - padding * 2;

  return {
    sx: padding + (x + COURT_WIDTH / 2) * (svgW / COURT_WIDTH),
    sy: padding + svgH - y * (svgH / COURT_DEPTH), // flip y so hoop is at bottom
  };
}

export function LiveCourt({ position, trail, shots, markedPosition }: LiveCourtProps) {
  const hoop = toSvg(0, 0);
  const current = toSvg(position.x, position.y);

  // Build trail path
  const trailPoints = trail.map((p) => toSvg(p.x, p.y));
  const trailPath =
    trailPoints.length > 1
      ? `M ${trailPoints[0].sx} ${trailPoints[0].sy} ` +
        trailPoints
          .slice(1)
          .map((p) => `L ${p.sx} ${p.sy}`)
          .join(" ")
      : "";

  // 3-point arc in SVG coords
  const arcLeft = toSvg(-COURT_WIDTH / 2 + 0.91, 0); // corner 3 left
  const arcRight = toSvg(COURT_WIDTH / 2 - 0.91, 0); // corner 3 right
  const arcTop = toSvg(0, 7.24); // top of arc

  // Paint corners
  const paintTL = toSvg(-2.44, 5.79);
  const paintTR = toSvg(2.44, 5.79);
  const paintBL = toSvg(-2.44, 0);
  const paintBR = toSvg(2.44, 0);

  // FT circle center
  const ftCenter = toSvg(0, 5.79);

  return (
    <div style={{ margin: "12px 0" }}>
      <svg
        viewBox="0 0 300 360"
        style={{
          width: "100%",
          maxWidth: 300,
          display: "block",
          margin: "0 auto",
          background: "#0d1117",
          borderRadius: 10,
          border: "1px solid #1e293b",
        }}
      >
        {/* Court outline */}
        <rect
          x={toSvg(-COURT_WIDTH / 2, 0).sx}
          y={toSvg(0, COURT_DEPTH).sy}
          width={toSvg(COURT_WIDTH / 2, 0).sx - toSvg(-COURT_WIDTH / 2, 0).sx}
          height={toSvg(0, 0).sy - toSvg(0, COURT_DEPTH).sy}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Paint */}
        <rect
          x={paintBL.sx}
          y={paintTL.sy}
          width={paintBR.sx - paintBL.sx}
          height={paintBL.sy - paintTL.sy}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* FT circle */}
        <circle
          cx={ftCenter.sx}
          cy={ftCenter.sy}
          r={((paintTR.sx - paintTL.sx) / 2)}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* 3-point arc (approximated with a quadratic curve) */}
        <path
          d={`M ${arcLeft.sx} ${arcLeft.sy} L ${arcLeft.sx} ${toSvg(-COURT_WIDTH / 2 + 0.91, 2.99).sy} Q ${arcTop.sx} ${arcTop.sy - 30} ${toSvg(COURT_WIDTH / 2 - 0.91, 2.99).sx} ${toSvg(COURT_WIDTH / 2 - 0.91, 2.99).sy} L ${arcRight.sx} ${arcRight.sy}`}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Hoop */}
        <circle cx={hoop.sx} cy={hoop.sy} r="5" fill="none" stroke="#f97316" strokeWidth="1.5" />

        {/* Trail */}
        {trailPath && (
          <path d={trailPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4" />
        )}

        {/* Shot markers */}
        {shots.map((shot) => {
          // shot.position stores court coords as lat=x, lng=y
          const sp = toSvg(shot.position.lat, shot.position.lng);
          const isHit = shot.result === "hit";
          return (
            <circle
              key={shot.id}
              cx={sp.sx}
              cy={sp.sy}
              r="4"
              fill={isHit ? "#22c55e" : "#ef4444"}
              opacity="0.8"
            />
          );
        })}

        {/* Marked position */}
        {markedPosition && (() => {
          const mp = toSvg(markedPosition.x, markedPosition.y);
          return (
            <>
              <circle cx={mp.sx} cy={mp.sy} r="8" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx={mp.sx} cy={mp.sy} r="3" fill="#f59e0b" />
            </>
          );
        })()}

        {/* Current position */}
        <circle cx={current.sx} cy={current.sy} r="6" fill="#3b82f6" />
        <circle cx={current.sx} cy={current.sy} r="10" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginTop: 8,
          fontSize: 11,
          color: "#64748b",
        }}
      >
        <span><span style={{ color: "#3b82f6" }}>●</span> You</span>
        <span><span style={{ color: "#22c55e" }}>●</span> Make</span>
        <span><span style={{ color: "#ef4444" }}>●</span> Miss</span>
        <span><span style={{ color: "#f59e0b" }}>◎</span> Marked</span>
        <span><span style={{ color: "#f97316" }}>○</span> Hoop</span>
      </div>
    </div>
  );
}
