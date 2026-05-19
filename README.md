# VR-Racer

Drive a virtual car around your real room from your iPhone. The car detects
your real walls (LiDAR-assisted via ARKit) and crashes when it hits one.

## What it does

- Opens an AR session on iPhone Safari (`immersive-ar` via WebXR).
- Uses ARKit plane detection — on iPhone 15 Pro this is LiDAR-assisted, so
  walls and floor come out sharp.
- Lets you place a small virtual car on the floor with a tap.
- On-screen joystick steers, **GO** accelerates, **BRAKE** stops.
- AABB collision against detected vertical planes → red **CRASH!** overlay,
  then tap **Reset car** to lift back to the last safe spot.

## iPhone setup (one time)

1. **Settings → Apps → Safari → Advanced → Feature Flags → WebXR Device API**
   — turn on.
2. The page must be served over **HTTPS** (Vite's dev server and GitHub
   Pages both qualify).

## Run locally

```bash
npm install
npm run dev       # https://<your-lan-ip>:5173
npm test          # unit test for collision math
npm run build     # static build into dist/
```

Open the LAN URL on your iPhone. Safari will warn about the self-signed
cert; accept it and tap **Start AR**.

## Car model

Bundled: **Kenney Car Kit** sedan (CC0) at `public/assets/car.glb`. Credit
to Kenney — <https://kenney.nl/assets/car-kit>. Swap it for any other `.glb`
of the same name. If the file is missing, the app falls back to a built-in
primitive car so it still runs.

## Files

- `index.html` — landing + in-AR DOM overlay
- `src/main.js` — scene + XR frame loop
- `src/ar-session.js` — WebXR session request
- `src/world.js` — tracks `frame.detectedPlanes`, builds wall/floor meshes
- `src/car.js` — loads GLB (or primitive fallback), simple driving model
- `src/controls.js` — touch joystick + GO/BRAKE buttons
- `src/collision.js` — pure AABB intersection (unit-tested)
- `src/ui.js` — overlay state
- `test/collision.test.js` — `node --test`

## Known limits

- iOS Safari does not expose raw LiDAR point clouds to web pages, so walls
  come from ARKit plane detection rather than a direct mesh. Accuracy is
  best after panning the phone slowly around the room.
- Real-time WebXR mesh detection is not consistently exposed on iOS yet;
  this app relies on the plane-detection feature with a hit-test fallback
  for the floor.
- Android phones without LiDAR get plane detection too, just less accurate.
