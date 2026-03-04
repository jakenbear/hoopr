import { useState, useRef, useCallback } from "react";
import type { Shot } from "../types";
import { ZONE_LABELS } from "../utils/zones";
import { LiveCourt } from "./LiveCourt";

interface ActiveSessionProps {
  motionPosition: { x: number; y: number };
  trail: { x: number; y: number }[];
  heading: number | null;
  stepLength: number;
  isListening: boolean;
  lastHeard: string | null;
  shots: Shot[];
  markedPosition: { x: number; y: number } | null;
  pocketMode: boolean;
  onMark: () => void;
  onHit: () => void;
  onMiss: () => void;
  onEnd: () => void;
  onToggleVoice: () => void;
  onTogglePocketMode: () => void;
}

const UNLOCK_HOLD_MS = 1500; // hold for 1.5s to unlock

export function ActiveSession({
  motionPosition,
  trail,
  heading,
  stepLength,
  isListening,
  lastHeard,
  shots,
  markedPosition,
  pocketMode,
  onMark,
  onHit,
  onMiss,
  onEnd,
  onToggleVoice,
  onTogglePocketMode,
}: ActiveSessionProps) {
  const lastShot = shots.length > 0 ? shots[shots.length - 1] : null;
  const makes = shots.filter((s) => s.result === "hit").length;
  const dist = Math.sqrt(motionPosition.x ** 2 + motionPosition.y ** 2);

  // Unlock hold state
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  const startHold = useCallback(() => {
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / UNLOCK_HOLD_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setHoldProgress(0);
        onTogglePocketMode();
      }
    }, 50);
  }, [onTogglePocketMode]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  }, []);

  // Pocket mode overlay
  if (pocketMode) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onTouchCancel={cancelHold}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
      >
        <div style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>
          Pocket Mode — Voice Only
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#f8fafc" }}>
          {makes}/{shots.length}
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 8, marginBottom: 32 }}>
          {markedPosition ? "Shot marked — say HIT or MISS" : "Say MARK to lock your spot"}
        </div>

        {/* Hold to unlock indicator */}
        <div style={{ width: 200, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: `${holdProgress * 100}%`,
              height: "100%",
              background: "#3b82f6",
              transition: holdProgress === 0 ? "width 0.15s" : "none",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>
          Hold to unlock
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Position info */}
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
        {dist.toFixed(1)}m from hoop · {heading != null ? `${heading.toFixed(0)}°` : "—"} · step: {(stepLength * 100).toFixed(0)}cm
      </div>

      {/* Shot counter */}
      <div style={{ fontSize: 48, fontWeight: "bold", color: "#f8fafc", marginBottom: 4 }}>
        {makes}/{shots.length}
      </div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>
        {shots.length > 0
          ? `${Math.round((makes / shots.length) * 100)}% shooting`
          : "Say MARK at your spot, then HIT or MISS"}
      </div>

      {/* Last shot indicator */}
      {lastShot && !markedPosition && (
        <div
          style={{
            marginBottom: 16,
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

      {/* Pending mark indicator */}
      {markedPosition && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 16px",
            borderRadius: 8,
            background: "#1e3a5f",
            border: "1px solid #3b82f6",
            display: "inline-block",
            fontSize: 14,
            color: "#93c5fd",
          }}
        >
          Shot marked — tap HIT or MISS
        </div>
      )}

      {/* Live court map with trail */}
      <LiveCourt position={motionPosition} trail={trail} shots={shots} markedPosition={markedPosition} />

      {/* MARK button */}
      <button
        onClick={onMark}
        style={{
          width: "100%",
          padding: "16px 0",
          fontSize: 16,
          fontWeight: "bold",
          borderRadius: 12,
          border: markedPosition ? "2px solid #3b82f6" : "2px dashed #475569",
          background: markedPosition ? "#1e3a5f" : "#0f172a",
          color: markedPosition ? "#93c5fd" : "#94a3b8",
          cursor: "pointer",
          touchAction: "manipulation",
          marginBottom: 12,
        }}
      >
        {markedPosition ? "MARKED — Shoot now!" : "MARK SPOT"}
      </button>

      {/* HIT / MISS buttons — dimmed when no mark */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button
          onClick={onHit}
          disabled={!markedPosition}
          style={{
            flex: 1,
            padding: "32px 0",
            fontSize: 24,
            fontWeight: "bold",
            borderRadius: 16,
            border: "none",
            background: markedPosition ? "#16a34a" : "#1a2e1a",
            color: markedPosition ? "white" : "#4a5a4a",
            cursor: markedPosition ? "pointer" : "not-allowed",
            touchAction: "manipulation",
            opacity: markedPosition ? 1 : 0.5,
          }}
        >
          HIT
        </button>
        <button
          onClick={onMiss}
          disabled={!markedPosition}
          style={{
            flex: 1,
            padding: "32px 0",
            fontSize: 24,
            fontWeight: "bold",
            borderRadius: 16,
            border: "none",
            background: markedPosition ? "#dc2626" : "#2e1a1a",
            color: markedPosition ? "white" : "#5a4a4a",
            cursor: markedPosition ? "pointer" : "not-allowed",
            touchAction: "manipulation",
            opacity: markedPosition ? 1 : 0.5,
          }}
        >
          MISS
        </button>
      </div>

      {/* Voice + Pocket mode toggles */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 8 }}>
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
          }}
        >
          {isListening ? "🎤 Voice ON" : "🎤 Voice OFF"}
        </button>
        <button
          onClick={onTogglePocketMode}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Pocket Mode
        </button>
      </div>
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
