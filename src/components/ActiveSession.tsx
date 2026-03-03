import type { GeoPosition, Shot } from "../types";
import { ZONE_LABELS } from "../utils/zones";

interface ActiveSessionProps {
  position: GeoPosition | null;
  accuracy: number | null;
  isListening: boolean;
  lastHeard: string | null;
  shots: Shot[];
  onHit: () => void;
  onMiss: () => void;
  onEnd: () => void;
  onToggleVoice: () => void;
}

export function ActiveSession({
  position,
  accuracy,
  isListening,
  lastHeard,
  shots,
  onHit,
  onMiss,
  onEnd,
  onToggleVoice,
}: ActiveSessionProps) {
  const lastShot = shots.length > 0 ? shots[shots.length - 1] : null;
  const makes = shots.filter((s) => s.result === "hit").length;

  return (
    <div style={{ textAlign: "center" }}>
      {/* GPS Status */}
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
        GPS: {position ? `±${accuracy?.toFixed(0)}m` : "acquiring..."}
      </div>

      {/* Shot counter */}
      <div style={{ fontSize: 48, fontWeight: "bold", color: "#f8fafc", marginBottom: 4 }}>
        {makes}/{shots.length}
      </div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
        {shots.length > 0
          ? `${Math.round((makes / shots.length) * 100)}% shooting`
          : "Take your first shot"}
      </div>

      {/* Last shot indicator */}
      {lastShot && (
        <div
          style={{
            marginBottom: 24,
            padding: "8px 16px",
            borderRadius: 8,
            background: lastShot.result === "hit" ? "#166534" : "#991b1b",
            display: "inline-block",
            fontSize: 14,
          }}
        >
          {lastShot.result === "hit" ? "MAKE" : "MISS"} — {ZONE_LABELS[lastShot.zone]}
        </div>
      )}

      {/* Big tap buttons */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button
          onClick={onHit}
          style={{
            flex: 1,
            padding: "32px 0",
            fontSize: 24,
            fontWeight: "bold",
            borderRadius: 16,
            border: "none",
            background: "#16a34a",
            color: "white",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          HIT
        </button>
        <button
          onClick={onMiss}
          style={{
            flex: 1,
            padding: "32px 0",
            fontSize: 24,
            fontWeight: "bold",
            borderRadius: 16,
            border: "none",
            background: "#dc2626",
            color: "white",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          MISS
        </button>
      </div>

      {/* Voice toggle */}
      <button
        onClick={onToggleVoice}
        style={{
          padding: "12px 24px",
          borderRadius: 12,
          border: "1px solid #334155",
          background: isListening ? "#1e3a5f" : "#1e293b",
          color: isListening ? "#60a5fa" : "#94a3b8",
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        {isListening ? "🎤 Voice ON" : "🎤 Voice OFF"}
      </button>
      {lastHeard && (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Heard: "{lastHeard}"
        </div>
      )}

      {/* End session */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={onEnd}
          style={{
            padding: "12px 32px",
            borderRadius: 12,
            border: "1px solid #475569",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}
