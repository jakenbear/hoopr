import { useState, useCallback } from "react";
import type { GeoPosition, Session, Shot, ShotResult, ZoneStats, CourtZone } from "../types";
import { classifyZone } from "../utils/zones";

type SessionPhase = "idle" | "setting_hoop" | "setting_direction" | "active" | "review";

interface UseSessionReturn {
  session: Session | null;
  phase: SessionPhase;
  startSetup: () => void;
  setHoopPosition: (pos: GeoPosition) => void;
  setCourtDirection: (pos: GeoPosition) => void;
  logShot: (position: GeoPosition, result: ShotResult) => void;
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
    setPhase("setting_direction");
  }, []);

  const setCourtDirection = useCallback((pos: GeoPosition) => {
    setSession((prev) => {
      if (!prev) return prev;
      // Calculate bearing from hoop to where the user walked
      const dLng = ((pos.lng - prev.hoopPosition.lng) * Math.PI) / 180;
      const lat1 = (prev.hoopPosition.lat * Math.PI) / 180;
      const lat2 = (pos.lat * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      return { ...prev, hoopBearing: bearing };
    });
    setPhase("active");
  }, []);

  const logShot = useCallback((position: GeoPosition, result: ShotResult) => {
    setSession((prev) => {
      if (!prev) return prev;
      const zone = classifyZone(prev.hoopPosition, prev.hoopBearing, position);
      const shot: Shot = {
        id: generateId(),
        zone,
        result,
        position,
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
    setCourtDirection,
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
