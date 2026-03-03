import { useState, useCallback } from "react";
import type { GeoPosition, Session, Shot, ShotResult, ZoneStats, CourtZone } from "../types";
import { classifyZoneFromCoords } from "../utils/zones";

type SessionPhase = "idle" | "setting_hoop" | "calibrating" | "active" | "review";

interface UseSessionReturn {
  session: Session | null;
  phase: SessionPhase;
  startSetup: () => void;
  setHoopPosition: (pos: GeoPosition) => void;
  startCalibrationPhase: () => void;
  finishCalibrationPhase: () => void;
  logShot: (courtX: number, courtY: number, result: ShotResult) => void;
  endSession: () => void;
  resetSession: () => void;
  stats: ZoneStats[];
  totalStats: { makes: number; attempts: number; percentage: number };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("idle");

  const startSetup = useCallback(() => {
    setPhase("setting_hoop");
  }, []);

  const setHoopPosition = useCallback((pos: GeoPosition) => {
    setSession({
      id: generateId(),
      hoopPosition: pos,
      hoopBearing: 0,
      shots: [],
      startTime: Date.now(),
    });
    setPhase("calibrating");
  }, []);

  const startCalibrationPhase = useCallback(() => {
    setPhase("calibrating");
  }, []);

  const finishCalibrationPhase = useCallback(() => {
    setPhase("active");
  }, []);

  const logShot = useCallback((courtX: number, courtY: number, result: ShotResult) => {
    setSession((prev) => {
      if (!prev) return prev;
      const zone = classifyZoneFromCoords(courtX, courtY);
      const shot: Shot = {
        id: generateId(),
        zone,
        result,
        position: { lat: courtX, lng: courtY }, // store court coords here for now
        timestamp: Date.now(),
      };
      return { ...prev, shots: [...prev.shots, shot] };
    });
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, endTime: Date.now() } : prev));
    setPhase("review");
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setPhase("idle");
  }, []);

  const stats: ZoneStats[] = session
    ? computeZoneStats(session.shots)
    : [];

  const totalStats = session
    ? {
        makes: session.shots.filter((s) => s.result === "hit").length,
        attempts: session.shots.length,
        percentage:
          session.shots.length > 0
            ? Math.round(
                (session.shots.filter((s) => s.result === "hit").length /
                  session.shots.length) *
                  100
              )
            : 0,
      }
    : { makes: 0, attempts: 0, percentage: 0 };

  return {
    session,
    phase,
    startSetup,
    setHoopPosition,
    startCalibrationPhase,
    finishCalibrationPhase,
    logShot,
    endSession,
    resetSession,
    stats,
    totalStats,
  };
}

function computeZoneStats(shots: Shot[]): ZoneStats[] {
  const map = new Map<CourtZone, { makes: number; attempts: number }>();

  for (const shot of shots) {
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
