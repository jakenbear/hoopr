import { useState, useCallback, useRef, useEffect } from "react";

interface Position {
  x: number; // meters, lateral (+ right, - left facing court)
  y: number; // meters, distance from hoop into court
}

interface UseMotionTrackingReturn {
  position: Position;
  heading: number | null; // compass heading in degrees
  stepCount: number;
  stepLength: number;
  isTracking: boolean;
  error: string | null;
  startCalibration: (compassHeading: number) => void;
  finishCalibration: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  requestPermissions: () => Promise<boolean>;
}

const DEFAULT_STEP_LENGTH = 0.75; // meters, average step
const FREE_THROW_DISTANCE = 4.57; // meters from hoop

// Step detection tuning
const STEP_COOLDOWN_MS = 350; // minimum time between steps (~170 BPM max cadence)
const FILTER_ALPHA = 0.15; // low-pass filter smoothing (lower = smoother, slower)
const MIN_PEAK_VALLEY_DIFF = 1.5; // minimum swing in filtered signal to count as a step
const GRAVITY = 9.81;

export function useMotionTracking(): UseMotionTrackingReturn {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [heading, setHeading] = useState<number | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [stepLength, setStepLength] = useState(DEFAULT_STEP_LENGTH);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking state without re-renders
  const courtBearingRef = useRef<number>(0);
  const headingRef = useRef<number>(0);
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const lastStepTimeRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const calibrationRef = useRef<{
    active: boolean;
    startHeading: number;
    steps: number;
  } | null>(null);

  // Improved step detection state
  const filteredRef = useRef<number>(GRAVITY); // low-pass filtered magnitude
  const valleyRef = useRef<number>(GRAVITY); // most recent local minimum
  const wasRisingRef = useRef(false); // was the signal going up last sample?
  const prevFilteredRef = useRef<number>(GRAVITY);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    try {
      if (typeof DME.requestPermission === "function") {
        const motionPerm = await DME.requestPermission();
        if (motionPerm !== "granted") {
          setError("Motion sensor permission denied");
          return false;
        }
      }
      if (typeof DOE.requestPermission === "function") {
        const orientPerm = await DOE.requestPermission();
        if (orientPerm !== "granted") {
          setError("Orientation sensor permission denied");
          return false;
        }
      }
      return true;
    } catch {
      setError("Failed to request sensor permissions");
      return false;
    }
  }, []);

  // Compass heading listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const webkit = e as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };
      let compassHeading: number | null = null;

      if (webkit.webkitCompassHeading != null) {
        compassHeading = webkit.webkitCompassHeading;
      } else if (e.alpha != null) {
        compassHeading = (360 - e.alpha) % 360;
      }

      if (compassHeading != null) {
        headingRef.current = compassHeading;
        setHeading(compassHeading);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // Step detection via accelerometer with low-pass filter
  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      if (!isTrackingRef.current && !calibrationRef.current?.active) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const rawMagnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

      // Low-pass filter: smooths out hand jitter, screen taps, etc.
      // Only passes through the ~1-2 Hz walking frequency
      const filtered =
        FILTER_ALPHA * rawMagnitude + (1 - FILTER_ALPHA) * filteredRef.current;
      filteredRef.current = filtered;

      const prev = prevFilteredRef.current;
      const isRising = filtered > prev;
      const now = Date.now();

      // Track the valley (local minimum) before each peak
      if (!isRising && filtered < valleyRef.current) {
        valleyRef.current = filtered;
      }

      // Detect step: signal was rising, now falling (we just passed a peak)
      // AND the peak-to-valley swing is large enough (real step, not noise)
      // AND enough time has passed since last step
      if (
        wasRisingRef.current &&
        !isRising &&
        prev - valleyRef.current >= MIN_PEAK_VALLEY_DIFF &&
        now - lastStepTimeRef.current > STEP_COOLDOWN_MS
      ) {
        lastStepTimeRef.current = now;
        // Reset valley for next step
        valleyRef.current = filtered;

        setStepCount((c) => c + 1);

        if (calibrationRef.current?.active) {
          calibrationRef.current.steps++;
        }

        if (isTrackingRef.current) {
          const courtBearing = courtBearingRef.current;
          const currentHeading = headingRef.current;

          const relAngle =
            ((currentHeading - courtBearing + 360) % 360) * (Math.PI / 180);

          const dx = Math.sin(relAngle) * stepLength;
          const dy = Math.cos(relAngle) * stepLength;

          positionRef.current = {
            x: positionRef.current.x + dx,
            y: positionRef.current.y + dy,
          };

          setPosition({ ...positionRef.current });
        }
      }

      wasRisingRef.current = isRising;
      prevFilteredRef.current = filtered;
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [stepLength]);

  const startCalibration = useCallback((compassHeading: number) => {
    courtBearingRef.current = compassHeading;
    calibrationRef.current = {
      active: true,
      startHeading: compassHeading,
      steps: 0,
    };
    positionRef.current = { x: 0, y: 0 };
    setPosition({ x: 0, y: 0 });
    setStepCount(0);
    // Reset filter state
    filteredRef.current = GRAVITY;
    prevFilteredRef.current = GRAVITY;
    valleyRef.current = GRAVITY;
    wasRisingRef.current = false;
  }, []);

  const finishCalibration = useCallback(() => {
    if (!calibrationRef.current) return;

    const steps = calibrationRef.current.steps;
    calibrationRef.current.active = false;

    if (steps > 0) {
      const calibrated = FREE_THROW_DISTANCE / steps;
      setStepLength(calibrated);
    }

    positionRef.current = { x: 0, y: FREE_THROW_DISTANCE };
    setPosition({ x: 0, y: FREE_THROW_DISTANCE });
  }, []);

  const startTracking = useCallback(() => {
    isTrackingRef.current = true;
    setIsTracking(true);
    setError(null);
  }, []);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    setIsTracking(false);
  }, []);

  return {
    position,
    heading,
    stepCount,
    stepLength,
    isTracking,
    error,
    startCalibration,
    finishCalibration,
    startTracking,
    stopTracking,
    requestPermissions,
  };
}
