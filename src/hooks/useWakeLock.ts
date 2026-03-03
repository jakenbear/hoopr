import { useRef, useCallback, useEffect } from "react";

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      // Re-acquire if page becomes visible again (e.g. after tab switch)
      const handleVisibility = async () => {
        if (document.visibilityState === "visible" && wakeLockRef.current?.released) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
          } catch { /* ignore */ }
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
    } catch { /* permission denied or not supported */ }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  return { request, release };
}
