import { useGeolocation } from "./hooks/useGeolocation";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useSession } from "./hooks/useSession";
import { ActiveSession } from "./components/ActiveSession";
import { CourtMap } from "./components/CourtMap";
import type { ShotResult } from "./types";
import "./App.css";

function App() {
  const geo = useGeolocation();
  const {
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
  } = useSession();

  const handleShotResult = (result: ShotResult) => {
    const pos = geo.capturePosition();
    if (pos) {
      logShot(pos, result);
    }
  };

  const voice = useVoiceRecognition(handleShotResult);

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">hoopr</h1>
        {phase === "active" && session && (
          <span className="shot-count">{session.shots.length} shots</span>
        )}
      </header>

      <main className="main">
        {/* IDLE — Start screen */}
        {phase === "idle" && (
          <div className="screen-center">
            <div className="hero-icon">🏀</div>
            <h2 className="title">Track Your Shots</h2>
            <p className="subtitle">
              Set your hoop location, then shoot around. Log makes and misses
              with tap or voice. See your shot chart when you're done.
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                geo.startTracking();
                startSetup();
              }}
            >
              Start Session
            </button>
          </div>
        )}

        {/* SETTING HOOP — Stand at the hoop */}
        {phase === "setting_hoop" && (
          <div className="screen-center">
            <div className="step-badge">Step 1 of 2</div>
            <h2 className="title">Stand at the Hoop</h2>
            <p className="subtitle">
              Go stand directly under the basket, then tap the button below.
            </p>
            <div className="gps-status">
              {geo.position
                ? `GPS locked — ±${geo.accuracy?.toFixed(0)}m accuracy`
                : "Acquiring GPS..."}
            </div>
            <button
              className="btn-primary"
              disabled={!geo.position}
              onClick={() => geo.position && setHoopPosition(geo.position)}
            >
              {geo.position ? "Set Hoop Here" : "Waiting for GPS..."}
            </button>
          </div>
        )}

        {/* SETTING DIRECTION — Walk to free throw line */}
        {phase === "setting_direction" && (
          <div className="screen-center">
            <div className="step-badge">Step 2 of 2</div>
            <h2 className="title">Walk to the Free Throw Line</h2>
            <p className="subtitle">
              Walk straight out from the hoop to the free throw line (or center
              of the court), then tap the button. This tells the app which
              direction the court faces.
            </p>
            <button
              className="btn-primary"
              onClick={() => geo.position && setCourtDirection(geo.position)}
              disabled={!geo.position}
            >
              Set Court Direction
            </button>
          </div>
        )}

        {/* ACTIVE — Shooting */}
        {phase === "active" && session && (
          <ActiveSession
            position={geo.position}
            accuracy={geo.accuracy}
            isListening={voice.isListening}
            lastHeard={voice.lastHeard}
            shots={session.shots}
            onHit={() => handleShotResult("hit")}
            onMiss={() => handleShotResult("miss")}
            onEnd={endSession}
            onToggleVoice={() => {
              if (voice.isListening) {
                voice.stopListening();
              } else {
                voice.startListening();
              }
            }}
          />
        )}

        {/* REVIEW — Shot chart */}
        {phase === "review" && session && (
          <div>
            <h2 className="title" style={{ textAlign: "center" }}>Session Summary</h2>

            {/* Overall stats */}
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

            {/* Court map */}
            <CourtMap stats={stats} />

            {/* New session */}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button className="btn-primary" onClick={resetSession}>
                New Session
              </button>
            </div>
          </div>
        )}

        {/* Errors */}
        {geo.error && (
          <div className="error-bar">GPS Error: {geo.error}</div>
        )}
        {voice.error && (
          <div className="error-bar">Voice Error: {voice.error}</div>
        )}
      </main>
    </div>
  );
}

export default App;
