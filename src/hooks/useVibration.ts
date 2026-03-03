import { useCallback } from "react";

export function useVibration() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Short pulse for makes
  const vibrateHit = useCallback(() => {
    vibrate([50, 30, 50]); // two quick taps
  }, [vibrate]);

  // Single long buzz for misses
  const vibrateMiss = useCallback(() => {
    vibrate(150);
  }, [vibrate]);

  return { vibrateHit, vibrateMiss };
}
