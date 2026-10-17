# CPR Training & Assist — Web App

Browser port of the iOS SwiftUI app **CPR Training & Assist** (CPR train.xcodeproj).

Preserved from the original:
- User interface (main menu → side calibration → transition → front calibration → active CPR → summary)
- Pose analyzing feature — the app's own Vision-based analysis, now running in the browser with MediaPipe Pose
- Assets (SplashLogo splash screen)
- 110 BPM metronome and countdown sounds

Removed:
- Apple Watch connection feature (WatchConnector / WatchConnectivity, depth/recoil dashboard cards, and the watch-status box on the main menu)

## How it maps to the iOS code

| iOS (Swift)                    | Web                              |
| ------------------------------ | -------------------------------- |
| `CPRPoseAnalyzer.swift`        | `js/analyzer.js`                 |
| `CameraPreviewView.swift`      | `js/camera.js` + `<video>/<canvas>` |
| `MetronomeManager.swift`       | `js/metronome.js`                |
| `ContentView.swift`            | `index.html` + `js/app.js` + `css/style.css` |
| `WatchConnector.swift`         | removed                          |
| Vision `VNDetectHumanBodyPoseRequest` | MediaPipe Pose (TensorFlow Lite) |
| iOS system sounds 1057/1322    | Web Audio ticks in `js/metronome.js` |

Pose points are converted into the same "Vision-style" coordinates the Swift
analyzer uses (bottom-left origin, horizontally mirrored), so every threshold —
arm angle 155°/150°, posture `|Δx| < 0.08`, too-close `|Δy| > 0.80`, compression
detection via shoulder-Y movement — is a direct 1:1 port.

## Run it

The app needs a web server (camera + MediaPipe require `https` or `localhost`).

```bash
cd CPR-train-web
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Node:

```bash
cd CPR-train-web
npx serve .
```

## Notes

- Uses the front camera (`facingMode: 'user'`) with a mirrored preview, exactly
  like the iOS app.
- Pose analysis loads the MediaPipe Pose model from a CDN, so internet access
  is required.
- The compression rate (CPM) is estimated from shoulder movement on camera —
  this is the original app's fallback path that was used when no Apple Watch
  was connected.