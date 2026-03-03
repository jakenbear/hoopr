import { useState, useEffect, useCallback, useRef } from "react";
import type { GeoPosition } from "../types";

interface UseGeolocationReturn {
  position: GeoPosition | null;
  accuracy: number | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  capturePosition: () => GeoPosition | null;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const latestPositionRef = useRef<GeoPosition | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }

    setError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const geo: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(geo);
        setAccuracy(pos.coords.accuracy);
        latestPositionRef.current = geo;
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const capturePosition = useCallback((): GeoPosition | null => {
    return latestPositionRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    accuracy,
    error,
    isTracking,
    startTracking,
    stopTracking,
    capturePosition,
  };
}
