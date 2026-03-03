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
const STEP_THRESHOLD = 10.5; // acceleration magnitude threshold for step detection
const STEP_COOLDOWN_MS = 300; // minimum time between steps

export function useMotionTracking(): UseMotionTrackingReturn {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [heading, setHeading] = useState<number | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [stepLength, setStepLength] = useState(DEFAULT_STEP_LENGTH);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking state without re-renders
  const courtBearingRef = useRef<number>(0); // compass bearing from hoop toward FT line
  const headingRef = useRef<number>(0);
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const lastStepTimeRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const calibrationRef = useRef<{
    active: boolean;
    startHeading: number;
    steps: number;
  } | null>(null);

  // Step detection state
  const prevMagnitudeRef = useRef<number>(9.8);
  const risingRef = useRef(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    // iOS 13+ requires explicit permission for motion sensors
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
      // Use webkitCompassHeading on iOS, alpha on Android
      const webkit = e as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };
      let compassHeading: number | null = null;

      if (webkit.webkitCompassHeading != null) {
        compassHeading = webkit.webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android: alpha is relative to device orientation, convert to compass
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

  // Step detection via accelerometer
  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      if (!isTrackingRef.current && !calibrationRef.current?.active) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      // Magnitude of acceleration
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

      const now = Date.now();
      const prev = prevMagnitudeRef.current;

      // Detect a step as a peak in acceleration magnitude
      if (magnitude > prev && !risingRef.current) {
        risingRef.current = true;
      } else if (
        magnitude < prev &&
        risingRef.current &&
        prev > STEP_THRESHOLD &&
        now - lastStepTimeRef.current > STEP_COOLDOWN_MS
      ) {
        risingRef.current = false;
        lastStepTimeRef.current = now;

        // Always update step count in UI
        setStepCount((c) => c + 1);

        // Count step for calibration
        if (calibrationRef.current?.active) {
          calibrationRef.current.steps++;
        }

        // Update position if actively tracking
        if (isTrackingRef.current) {
          const courtBearing = courtBearingRef.current;
          const currentHeading = headingRef.current;

          // Relative angle: which direction am I walking relative to the court
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

      prevMagnitudeRef.current = magnitude;
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [stepLength]);

  const startCalibration = useCallback((compassHeading: number) => {
    // User is under the hoop, facing the free throw line
    // compassHeading = the direction from hoop toward the court
    courtBearingRef.current = compassHeading;
    calibrationRef.current = {
      active: true,
      startHeading: compassHeading,
      steps: 0,
    };
    positionRef.current = { x: 0, y: 0 };
    setPosition({ x: 0, y: 0 });
    setStepCount(0);
  }, []);

  const finishCalibration = useCallback(() => {
    if (!calibrationRef.current) return;

    const steps = calibrationRef.current.steps;
    calibrationRef.current.active = false;

    if (steps > 0) {
      // We know the free throw line is ~4.57m away
      const calibrated = FREE_THROW_DISTANCE / steps;
      setStepLength(calibrated);
    }

    // Reset position — user is now at the free throw line
    // which is (0, FREE_THROW_DISTANCE) in court coords
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
