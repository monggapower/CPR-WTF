# CPR Training & Assist (AHA 2025 BLS 3D) — React Edition

An interactive Web application for Basic Life Support (BLS) training and real-time CPR assistance, updated to AHA 2025 guidelines and rewritten in React with TypeScript, Vite, and Three.js.

## Key Features

1. **AHA 2025 5-Step BLS Run-Through**:
   - **Step 1: Verify Scene Safety (3D)** — Interactive 3D scene where the user surveys hazardous objects and clears them before approaching the patient.
   - **Step 2: Check Response (3D + Voice)** — Tap patient shoulder on the 3D model while saying *"คุณ คุณ!"* with Web Speech API recognition (plus manual voice simulator fallback).
   - **Step 3: Call for Help (3D + Voice)** — Speak the 3 key phrases: *"โทร 1669"*, *"มีคนหมดสติ"*, *"ขอเครื่อง AED"* with live keyword recognition.
   - **Step 4: Camera Posture & Arm Calibration** —
     - Step 4.1: Side calibration checking shoulder vertical alignment over wrists with directional lean guidance.
     - Step 4.2: Front calibration checking elbow lock (>150°) on both arms.
   - **Step 5A: Active CPR (2 Minutes = 120s)** — Real-time shoulder vertical tracking, 100–120 CPM speed feedback, straight-arm posture enforcement, 110 BPM metronome rhythm guide, and manual tap compression simulator.
   - **Step 5B: Interactive 3D AED Model** — Touch/click green power button, drag conductive pads to anatomical target positions (right upper chest & left lower rib), connect cable plug to AED socket, automated 3-second rhythm analysis, and shock delivery button.
   - **Step 6: Quality CPR Percentage Dashboard** —
     - Quality CPR % (Meeting both 100–120 CPM rate AND locked elbows)
     - Straight Arm %
     - Target Rate (100–120 CPM) %
     - Compressions count and quality breakdown

2. **Real-Time Mode**:
   - Immediate chest compression assist with live camera posture tracking and 110 BPM metronome.

## Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **3D Engine**: Three.js (WebGL rendering, interactive raycasting, physics plane dragging, dynamic animations)
- **Computer Vision**: MediaPipe Pose for real-time skeletal joint tracking
- **Audio Engine**: Web Audio API (110 BPM metronome ticks, countdown ticks, 2-note success chimes)
- **Styling**: Tailwind CSS