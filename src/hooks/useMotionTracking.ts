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

  // Improved step detection state — tracks vertical (gravity-axis) acceleration
  const gravityRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: GRAVITY });
  const filteredRef = useRef<number>(0); // low-pass filtered vertical accel
  const valleyRef = useRef<number>(0); // most recent local minimum
  const wasRisingRef = useRef(false);
  const prevFilteredRef = useRef<number>(0);

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

      const accWithG = e.accelerationIncludingGravity;
      if (!accWithG || accWithG.x == null || accWithG.y == null || accWithG.z == null) return;

      // Isolate gravity vector using a slow low-pass filter
      const gAlpha = 0.8; // heavy smoothing to extract stable gravity direction
      const g = gravityRef.current;
      g.x = gAlpha * g.x + (1 - gAlpha) * accWithG.x;
      g.y = gAlpha * g.y + (1 - gAlpha) * accWithG.y;
      g.z = gAlpha * g.z + (1 - gAlpha) * accWithG.z;

      // Project total acceleration onto gravity direction (dot product / |g|)
      // This gives us the acceleration component along the vertical axis only.
      // Walking creates a bounce along gravity; waving phone sideways/up-down doesn't
      // consistently align with gravity direction.
      const gMag = Math.sqrt(g.x ** 2 + g.y ** 2 + g.z ** 2);
      const verticalAccel = gMag > 0.1
        ? (accWithG.x * g.x + accWithG.y * g.y + accWithG.z * g.z) / gMag
        : 0;

      // Low-pass filter the vertical component
      const filtered =
        FILTER_ALPHA * verticalAccel + (1 - FILTER_ALPHA) * filteredRef.current;
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
    gravityRef.current = { x: 0, y: 0, z: GRAVITY };
    filteredRef.current = 0;
    prevFilteredRef.current = 0;
    valleyRef.current = 0;
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
