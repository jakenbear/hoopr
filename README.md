# hoopr

A basketball shot tracking web app. Track your shooting sessions using your phone's motion sensors and voice commands. Get zone-by-zone shot charts and stats.

## How It Works

Hoopr uses your phone's accelerometer, gyroscope, and compass to track your position on the court relative to the hoop. No extra hardware needed — just your phone.

### Setup (Before Each Session)

1. **Stand under the basket** facing the free throw line. Hold your phone in front of you.
2. Tap **"Set Hoop & Start Walking"** — this locks the hoop location and court direction.
3. **Walk to the free throw line** at a normal pace — the app counts your steps to calibrate your step length.
4. Tap **"Done"** — calibration complete, you're ready to shoot.

### Shooting

The app tracks your position as you move around the court. The flow for each shot:

1. Walk to your spot
2. Say **"MARK"** (or tap MARK SPOT) — locks your shooting position. The app says **"Ready"**.
3. Shoot the ball, chase the rebound
4. Say **"HIT"** or **"MISS"** — logs the shot at your marked position

HIT/MISS are ignored unless you've marked your spot first. This prevents accidental logging while rebounding.

### Voice Commands

| Command | Alternatives | What it does |
|---------|-------------|--------------|
| **MARK** | "spot", "here" | Locks your current position as the shot location |
| **HIT** | "swish", "bucket" | Logs a make at the marked position |
| **MISS** | "brick", "nope" | Logs a miss at the marked position |
| **DONE** | "finish", "end session" | Ends the session with a spoken summary |

### Pocket Mode

Tap **"Pocket Mode"** before putting your phone in your pocket. This:
- Blacks out the screen to save battery
- Blocks all touch input (no accidental pocket taps)
- Voice commands still work normally
- Hold the screen for 1.5 seconds to unlock

### After Your Session

Say **"DONE"** or tap **"End Session"** to finish. The app will:
- Speak a full summary (makes/attempts, FG%, best zone, zone to work on)
- Give you a random congratulations message
- Show a court map with zone-by-zone percentages and individual shot dots
- Save the session to your history

### Session History

Past sessions are saved locally and visible on the home screen. Tap any session to view the full court map and stats.

## Court Zones

The court is divided into 14 zones based on NBA court dimensions:

- **Paint** — under the basket
- **Left/Right Block** — low post
- **Left/Right Elbow** — free throw line extended
- **Free Throw** — free throw line
- **Left/Right Wing Mid** — midrange wings
- **Top of Key Mid** — midrange top of key
- **Left/Right Corner 3** — corner threes
- **Left/Right Wing 3** — wing threes
- **Top of Key 3** — top of the arc

## Features

- **Motion tracking** — step detection via accelerometer with gravity-axis filtering (no false triggers from phone handling)
- **Compass navigation** — tracks which direction you walk relative to the court
- **Voice recognition** — hands-free shot logging via Web Speech API
- **Voice announcements** — spoken feedback after each shot (zone, running stats)
- **Haptic feedback** — vibration on makes and misses
- **Wake lock** — screen stays on during sessions
- **Pocket mode** — voice-only mode for phone-in-pocket play
- **Session history** — saved to localStorage, viewable with full court maps
- **Live debug court** — real-time mini court showing your position trail and shot dots

## Tech Stack

- React + TypeScript + Vite
- Web Geolocation API (hoop GPS position)
- Web DeviceMotion / DeviceOrientation API (step detection + compass)
- Web Speech Recognition API (voice commands)
- Web Speech Synthesis API (voice announcements)
- Vibration API (haptic feedback)
- Wake Lock API (screen on)
- localStorage (session persistence)

## Development

```bash
npm install
npm run dev
```

To test on your phone over local network:

```bash
npx vite --host
```

Note: Voice recognition requires HTTPS on mobile. Deploy to a hosting service (Render, Vercel, Netlify) for full functionality on phone.

## Deploy to Render

1. Push to GitHub
2. Create a new **Static Site** on Render
3. **Build command:** `npm install && npm run build`
4. **Publish directory:** `dist`

## Known Limitations

- **GPS accuracy** — only used for initial hoop position. Motion tracking handles the rest.
- **Compass interference** — metal objects (backboard, fences) can affect compass readings. Calibrate with the phone away from metal.
- **Step drift** — dead reckoning accumulates small errors over time. Acceptable for typical 20-30 minute sessions.
- **Voice recognition** — requires HTTPS in production. Chrome and Samsung Internet supported. Firefox not supported.
- **Vibration API** — not supported on iOS Safari. Works on Android.
