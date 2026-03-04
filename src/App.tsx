import { useState, useCallback } from "react";
import type { Session } from "./types";
import { useGeolocation } from "./hooks/useGeolocation";
import { useMotionTracking } from "./hooks/useMotionTracking";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useSession } from "./hooks/useSession";
import { useWakeLock } from "./hooks/useWakeLock";
import { useVibration } from "./hooks/useVibration";
import { useSessionHistory } from "./hooks/useSessionHistory";
import { useAnnouncer } from "./hooks/useAnnouncer";
import { ActiveSession } from "./components/ActiveSession";
import { CourtMap } from "./components/CourtMap";
import { SessionHistoryList } from "./components/SessionHistory";
import { SessionDetail } from "./components/SessionDetail";
import { classifyZoneFromCoords } from "./utils/zones";
import type { ShotResult } from "./types";
import "./App.css";

function App() {
  const geo = useGeolocation();
  const motion = useMotionTracking();
  const wakeLock = useWakeLock();
  const vibration = useVibration();
  const announcer = useAnnouncer();
  const { history, saveSession, deleteSession } = useSessionHistory();
  const {
    session,
    phase,
    startSetup,
    setHoopPosition,
    finishCalibrationPhase,
    logShot,
    endSession,
    resetSession,
    stats,
    totalStats,
  } = useSession();

  // Pending shot position — set by MARK, consumed by HIT/MISS
  const [markedPosition, setMarkedPosition] = useState<{ x: number; y: number } | null>(null);

  // Viewing a past session
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  // Pocket mode — disables touch, voice only
  const [pocketMode, setPocketMode] = useState(false);

  const handleMark = useCallback(() => {
    setMarkedPosition({ x: motion.position.x, y: motion.position.y });
    vibration.vibrateHit(); // quick feedback that mark was registered
  }, [motion.position, vibration]);

  const handleShotResult = useCallback((result: ShotResult) => {
    // Require a mark before logging — ignore if no position marked
    if (!markedPosition) return;

    const x = markedPosition.x;
    const y = markedPosition.y;
    logShot(x, y, result);

    // Clear the mark
    setMarkedPosition(null);

    // Haptic feedback
    if (result === "hit") {
      vibration.vibrateHit();
    } else {
      vibration.vibrateMiss();
    }

    // Voice announcement
    if (session) {
      const zone = classifyZoneFromCoords(x, y);
      const newMakes = session.shots.filter((s) => s.result === "hit").length + (result === "hit" ? 1 : 0);
      const newAttempts = session.shots.length + 1;
      announcer.announceShot(result, zone, newMakes, newAttempts);
    }
  }, [markedPosition, logShot, vibration, session, announcer]);

  const handleVoice = useCallback((word: "hit" | "miss" | "mark") => {
    if (word === "mark") {
      handleMark();
    } else {
      handleShotResult(word);
    }
  }, [handleMark, handleShotResult]);

  const voice = useVoiceRecognition(handleVoice);

  const handleEndAndSave = () => {
    motion.stopTracking();
    geo.stopTracking();
    voice.stopListening();
    wakeLock.release();
    announcer.setEnabled(false);
    endSession();
    if (session && session.shots.length > 0) {
      saveSession({ ...session, endTime: Date.now() });
    }
    setMarkedPosition(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">hoopr</h1>
        {phase === "active" && session && (
          <span className="shot-count">{session.shots.length} shots</span>
        )}
      </header>

      <main className="main">
        {/* IDLE — Start screen or viewing a past session */}
        {phase === "idle" && !viewingSession && (
          <div>
            <div className="screen-center">
              <div className="hero-icon">🏀</div>
              <h2 className="title">Track Your Shots</h2>
              <p className="subtitle">
                Set your hoop location, walk to the free throw line to calibrate,
                then shoot around. Say "MARK" to lock your spot, then "HIT" or "MISS" after.
              </p>
              <button
                className="btn-primary"
                onClick={async () => {
                  const granted = await motion.requestPermissions();
                  if (granted) {
                    geo.startTracking();
                    wakeLock.request();
                    announcer.setEnabled(true);
                    startSetup();
                  }
                }}
              >
                Start Session
              </button>
            </div>

            {history.length > 0 && (
              <SessionHistoryList
                history={history}
                onSelect={setViewingSession}
                onDelete={deleteSession}
              />
            )}
          </div>
        )}

        {/* Viewing a past session */}
        {phase === "idle" && viewingSession && (
          <SessionDetail
            session={viewingSession}
            onBack={() => setViewingSession(null)}
          />
        )}

        {/* SETTING HOOP */}
        {phase === "setting_hoop" && (
          <div className="screen-center">
            <div className="step-badge">Step 1 of 2</div>
            <h2 className="title">Stand Under the Basket</h2>
            <p className="subtitle">
              Stand directly under the hoop and <strong>face the free throw line</strong>.
              Hold your phone in front of you pointing the same direction you're facing.
            </p>
            <div className="gps-status">
              {geo.position
                ? `GPS locked — ±${geo.accuracy?.toFixed(0)}m`
                : "Acquiring GPS..."}
              {motion.heading != null && (
                <span> · Compass: {motion.heading.toFixed(0)}°</span>
              )}
            </div>
            <button
              className="btn-primary"
              disabled={!geo.position || motion.heading == null}
              onClick={() => {
                if (geo.position && motion.heading != null) {
                  setHoopPosition(geo.position);
                  motion.startCalibration(motion.heading);
                }
              }}
            >
              {geo.position && motion.heading != null
                ? "Set Hoop & Start Walking"
                : "Waiting for sensors..."}
            </button>
          </div>
        )}

        {/* CALIBRATING */}
        {phase === "calibrating" && (
          <div className="screen-center">
            <div className="step-badge">Step 2 of 2</div>
            <h2 className="title">Walk to the Free Throw Line</h2>
            <p className="subtitle">
              Walk at a normal pace straight to the free throw line. This
              calibrates your step length for accurate tracking.
            </p>
            <div className="calibration-info">
              <div className="calibration-stat">
                <span className="calibration-value">{motion.stepCount}</span>
                <span className="calibration-label">steps detected</span>
              </div>
            </div>
            <button
              className="btn-primary"
              disabled={motion.stepCount < 2}
              onClick={() => {
                motion.finishCalibration();
                motion.startTracking();
                finishCalibrationPhase();
              }}
            >
              {motion.stepCount < 2
                ? "Start walking..."
                : `Done — ${motion.stepCount} steps detected`}
            </button>
            <p className="hint">
              Step length will be calibrated to ~4.6m (free throw distance)
            </p>
          </div>
        )}

        {/* ACTIVE — Shooting */}
        {phase === "active" && session && (
          <ActiveSession
            motionPosition={motion.position}
            trail={motion.trail}
            heading={motion.heading}
            stepLength={motion.stepLength}
            isListening={voice.isListening}
            lastHeard={voice.lastHeard}
            shots={session.shots}
            markedPosition={markedPosition}
            pocketMode={pocketMode}
            onMark={handleMark}
            onHit={() => handleShotResult("hit")}
            onMiss={() => handleShotResult("miss")}
            onEnd={handleEndAndSave}
            onToggleVoice={() => {
              if (voice.isListening) {
                voice.stopListening();
              } else {
                voice.startListening();
              }
            }}
            onTogglePocketMode={() => setPocketMode((p) => !p)}
          />
        )}

        {/* REVIEW — Shot chart */}
        {phase === "review" && session && (
          <div>
            <h2 className="title" style={{ textAlign: "center" }}>Session Summary</h2>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{totalStats.attempts}</div>
                <div className="stat-label">Shots</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{totalStats.makes}</div>
                <div className="stat-label">Makes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{totalStats.percentage}%</div>
                <div className="stat-label">FG%</div>
              </div>
            </div>

            <CourtMap stats={stats} shots={session.shots} />

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button className="btn-primary" onClick={resetSession}>
                New Session
              </button>
            </div>
          </div>
        )}

        {/* Errors */}
        {geo.error && <div className="error-bar">GPS Error: {geo.error}</div>}
        {motion.error && <div className="error-bar">Sensor Error: {motion.error}</div>}
        {voice.error && <div className="error-bar">Voice Error: {voice.error}</div>}
      </main>
    </div>
  );
}

export default App;
