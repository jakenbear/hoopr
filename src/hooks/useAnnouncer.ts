import { useCallback, useRef } from "react";
import type { CourtZone } from "../types";
import { ZONE_LABELS } from "../utils/zones";

export function useAnnouncer() {
  const enabledRef = useRef(true);

  const speak = useCallback((text: string) => {
    if (!enabledRef.current || !("speechSynthesis" in window)) return;
    // Cancel any in-progress speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, []);

  const announceShot = useCallback(
    (result: "hit" | "miss", zone: CourtZone, makes: number, attempts: number) => {
      const zoneName = ZONE_LABELS[zone];
      const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;

      if (result === "hit") {
        speak(`${zoneName}. ${makes} for ${attempts}, ${pct} percent.`);
      } else {
        speak(`Miss. ${zoneName}. ${makes} for ${attempts}.`);
      }
    },
    [speak]
  );

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) {
      window.speechSynthesis?.cancel();
    }
  }, []);

  return { announceShot, speak, setEnabled, enabledRef };
}
