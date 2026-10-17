import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CPRPoseAnalyzer } from '../services/poseAnalyzer';
import { SoundFX } from '../services/sound';
import { AppMode, CallKeywords } from '../types';

interface BLS3DSceneProps {
  mode: AppMode;
  analyzer: CPRPoseAnalyzer;
  sound: SoundFX;
  hazardsCleared: number;
  setHazardsCleared: React.Dispatch<React.SetStateAction<number>>;
  shoulderTapped: boolean;
  setShoulderTapped: React.Dispatch<React.SetStateAction<boolean>>;
  aedStep: number;
  setAedStep: React.Dispatch<React.SetStateAction<number>>;
  callKeywords: CallKeywords;
  setCallKeywords: React.Dispatch<React.SetStateAction<CallKeywords>>;
  onAdvanceAED: (step: number) => void;
  onCompleteSceneSafety: () => void;
}

export const BLS3DScene: React.FC<BLS3DSceneProps> = ({
  mode,
  analyzer,
  sound,
  hazardsCleared,
  setHazardsCleared,
  shoulderTapped,
  setShoulderTapped,
  aedStep,
  setAedStep,
  callKeywords,
  setCallKeywords,
  onAdvanceAED,
  onCompleteSceneSafety,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    dragPlane: THREE.Plane;
    dragIntersectPoint: THREE.Vector3;
    animId: number | null;
    patientGroup: THREE.Group | null;
    bareChestMesh: THREE.Group | null;
    shoulderTarget: THREE.Mesh | null;
    hazardObjects: THREE.Mesh[];
    aedGroup: THREE.Group | null;
    aedScreenMesh: THREE.Mesh | null;
    aedScreenCanvas: HTMLCanvasElement | null;
    aedScreenCtx: CanvasRenderingContext2D | null;
    aedScreenTexture: THREE.CanvasTexture | null;
    powerBtn: THREE.Mesh | null;
    shockBtn: THREE.Mesh | null;
    socketMesh: THREE.Mesh | null;
    pad1Target: THREE.Mesh | null;
    pad2Target: THREE.Mesh | null;
    pad1Drag: THREE.Mesh | null;
    pad2Drag: THREE.Mesh | null;
    plugDrag: THREE.Mesh | null;
    line1: THREE.Line | null;
    line2: THREE.Line | null;
    draggedObject: THREE.Mesh | null;
    mode: AppMode;
    aedStep: number;
    snapPad1: () => void;
    snapPad2: () => void;
    snapPlug: () => void;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4),
    dragIntersectPoint: new THREE.Vector3(),
    animId: null,
    patientGroup: null,
    bareChestMesh: null,
    shoulderTarget: null,
    hazardObjects: [],
    aedGroup: null,
    aedScreenMesh: null,
    aedScreenCanvas: null,
    aedScreenCtx: null,
    aedScreenTexture: null,
    powerBtn: null,
    shockBtn: null,
    socketMesh: null,
    pad1Target: null,
    pad2Target: null,
    pad1Drag: null,
    pad2Drag: null,
    plugDrag: null,
    line1: null,
    line2: null,
    draggedObject: null,
    mode,
    aedStep,
    snapPad1: () => {},
    snapPad2: () => {},
    snapPlug: () => {},
  });

  stateRef.current.mode = mode;
  stateRef.current.aedStep = aedStep;

  // Helper to create anatomical pad texture
  const createPadTexture = (padNumber: 1 | 2) => {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 320;
    const ctx = cvs.getContext('2d')!;

    // Pad background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 304, 32);
    ctx.fill();

    // Blue medical border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Top Header
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 60, [24, 24, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PAD #${padNumber}`, 128, 54);

    // Anatomical placement schematic
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(128, 160, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chest silhouette
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(128, 125, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 175, 42, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red highlight dot on pad target position
    ctx.fillStyle = '#ef4444';
    if (padNumber === 1) {
      // Right upper chest (on mirror graphic: top right)
      ctx.beginPath();
      ctx.arc(148, 155, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Left lower rib
      ctx.beginPath();
      ctx.arc(108, 188, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Text instructions
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(padNumber === 1 ? 'RIGHT UPPER' : 'LEFT LOWER', 128, 250);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(padNumber === 1 ? 'อกขวาบน (ใต้ไหปลาร้า)' : 'ชายโครงซ้ายล่าง', 128, 276);

    // Cable plug circle indicator
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 296, 7, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    return tex;
  };

  // Helper to draw realistic AED screen monitor
  const updateAEDScreen = (step: number, ecgTime: number) => {
    const S = stateRef.current;
    const ctx = S.aedScreenCtx;
    const cvs = S.aedScreenCanvas;
    if (!ctx || !cvs || !S.aedScreenTexture) return;

    // Dark high-tech LCD monitor background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Subtle grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < cvs.width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cvs.height);
      ctx.stroke();
    }
    for (let y = 0; y < cvs.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cvs.width, y);
      ctx.stroke();
    }

    // Header bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, cvs.width, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AED PRO 2025 • ADULT MODE', 12, 24);

    // Battery & OK checkmark
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔋 98%  [✓ OK]', cvs.width - 12, 24);

    if (step === 0) {
      // Standby
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STANDBY — PRESS POWER', cvs.width / 2, cvs.height / 2 + 10);
    } else if (step === 1 || step === 2) {
      // Attach pads
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ATTACH ELECTRODE PADS', cvs.width / 2, 80);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(step === 1 ? '👉 ติดแผ่นที่ 1 (อกขวาบน)' : '👉 ติดแผ่นที่ 2 (ชายโครงซ้าย)', cvs.width / 2, 120);

      // Pad icon animation
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(cvs.width / 2 - 60, 140, 120, 60);
    } else if (step === 3) {
      // Plug in connector
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLUG IN CABLE CONNECTOR', cvs.width / 2, 95);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('🔌 เสียบขั้วสายเข้าช่องสีเหลือง', cvs.width / 2, 145);
    } else if (step === 4) {
      // Analyzing rhythm with chaotic VFib wave
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ANALYZING RHYTHM...', cvs.width / 2, 70);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('⚠️ DO NOT TOUCH PATIENT (ห้ามสัมผัส)', cvs.width / 2, 95);

      // Live animated ECG waveform (VFib)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const midY = 155;
      for (let x = 0; x < cvs.width; x += 4) {
        const freq = 0.08;
        const noise = Math.sin(x * freq + ecgTime * 12) * 28 + Math.cos(x * 0.18 + ecgTime * 18) * 16;
        if (x === 0) ctx.moveTo(x, midY + noise);
        else ctx.lineTo(x, midY + noise);
      }
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HR: 0 bpm (Ventricular Fibrillation)', 16, 215);
    } else if (step === 5) {
      // Safety Clearance
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHOCK ADVISED • CHARGING 360J', cvs.width / 2, 80);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('🗣️ "ผมถอย คุณถอย ทุกคนถอย"', cvs.width / 2, 125);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '15px sans-serif';
      ctx.fillText('ตรวจความปลอดภัยรอบตัวผู้ป่วยก่อนช็อก', cvs.width / 2, 160);
    } else if (step === 6) {
      // Ready to shock
      ctx.fillStyle = '#ef4444';
      ctx.font = 'black 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ STAND CLEAR • PRESS SHOCK!', cvs.width / 2, 85);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('กดปุ่มช็อกสีส้มกระพริบเดี๋ยวนี้', cvs.width / 2, 130);
    } else if (step >= 7) {
      // Shock delivered, rhythm restored
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHOCK DELIVERED (360J)', cvs.width / 2, 80);

      // Normal Sinus Rhythm ECG trace
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const midY = 150;
      for (let x = 0; x < cvs.width; x += 4) {
        let y = midY;
        const cycle = (x + ecgTime * 80) % 180;
        if (cycle > 40 && cycle < 55) y -= 12; // P wave
        else if (cycle >= 65 && cycle < 72) y += 14; // Q wave
        else if (cycle >= 72 && cycle < 82) y -= 55; // R wave
        else if (cycle >= 82 && cycle < 90) y += 22; // S wave
        else if (cycle >= 110 && cycle < 135) y -= 20; // T wave
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HR: 72 bpm (Normal Sinus Rhythm Restored)', 16, 215);
    }

    S.aedScreenTexture.needsUpdate = true;
  };

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const S = stateRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    S.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
    S.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    S.renderer = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(3, 7, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(18, 18, 0x334155, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // --- Build Realistic Patient Model ---
    const patientGroup = new THREE.Group();
    S.patientGroup = patientGroup;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

    // Torso with Shirt (for steps 1-3)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, 1.35), shirtMat);
    torso.position.set(0, 0.2, 0);
    torso.castShadow = true;
    patientGroup.add(torso);

    // Detailed Bare Chest (visible for AED scenario and Hand Placement)
    const bareChestGroup = new THREE.Group();
    bareChestGroup.visible = false;

    const bareChest = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.38, 1.35),
      skinMat
    );
    bareChest.position.set(0, 0.2, 0);
    bareChest.castShadow = true;
    bareChestGroup.add(bareChest);

    // Clavicles (collarbones)
    const clavicleMat = new THREE.MeshStandardMaterial({ color: 0xd49b56, roughness: 0.5 });
    const clavicleL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 12), clavicleMat);
    clavicleL.rotation.z = Math.PI / 2.3;
    clavicleL.position.set(0.24, 0.40, -0.48);
    bareChestGroup.add(clavicleL);

    const clavicleR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 12), clavicleMat);
    clavicleR.rotation.z = -Math.PI / 2.3;
    clavicleR.position.set(-0.24, 0.40, -0.48);
    bareChestGroup.add(clavicleR);

    // Pectoral contours
    const pecGeo = new THREE.BoxGeometry(0.36, 0.05, 0.32);
    const pecR = new THREE.Mesh(pecGeo, skinMat);
    pecR.position.set(-0.22, 0.395, -0.22);
    bareChestGroup.add(pecR);

    const pecL = new THREE.Mesh(pecGeo, skinMat);
    pecL.position.set(0.22, 0.395, -0.22);
    bareChestGroup.add(pecL);

    // Nipple landmarks
    const nipMat = new THREE.MeshBasicMaterial({ color: 0x9f582d });
    const nipR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), nipMat);
    nipR.position.set(-0.28, 0.42, -0.15);
    bareChestGroup.add(nipR);

    const nipL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), nipMat);
    nipL.position.set(0.28, 0.42, -0.15);
    bareChestGroup.add(nipL);

    // Lower sternum target zone (for Step 4.3 hand placement guide)
    const sternumTarget = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.03, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d, transparent: true, opacity: 0.6 })
    );
    sternumTarget.position.set(0, 0.41, -0.06);
    bareChestGroup.add(sternumTarget);

    patientGroup.add(bareChestGroup);
    S.bareChestMesh = bareChestGroup;

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), skinMat);
    head.position.set(0, 0.28, -0.98);
    head.castShadow = true;
    patientGroup.add(head);

    // Limbs
    const armGeo = new THREE.CylinderGeometry(0.11, 0.1, 1.1, 16);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.rotation.x = Math.PI / 2;
    leftArm.position.set(0.65, 0.16, 0.05);
    patientGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.rotation.x = Math.PI / 2;
    rightArm.position.set(-0.65, 0.16, 0.05);
    patientGroup.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 1.35, 16);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.rotation.x = Math.PI / 2;
    leftLeg.position.set(0.24, 0.16, 1.35);
    patientGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.rotation.x = Math.PI / 2;
    rightLeg.position.set(-0.24, 0.16, 1.35);
    patientGroup.add(rightLeg);

    // Step 2 Shoulder target
    const ringGeo = new THREE.RingGeometry(0.18, 0.32, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    const shoulderTarget = new THREE.Mesh(ringGeo, ringMat);
    shoulderTarget.rotation.x = -Math.PI / 2;
    shoulderTarget.position.set(0, 0.44, -0.45);
    shoulderTarget.userData = { type: 'shoulderTap' };
    patientGroup.add(shoulderTarget);
    S.shoulderTarget = shoulderTarget;

    scene.add(patientGroup);

    // --- Build Hazards (Step 1) ---
    const h1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d })
    );
    h1.rotation.z = Math.PI / 3;
    h1.position.set(-1.05, 0.25, -0.2);
    h1.userData = { type: 'hazard', id: 1 };
    scene.add(h1);

    const h2 = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12 })
    );
    h2.position.set(1.05, 0.3, 0.35);
    h2.userData = { type: 'hazard', id: 2 };
    scene.add(h2);
    S.hazardObjects = [h1, h2];

    // --- Build Realistic AED Model & Accessories ---
    const aedGroup = new THREE.Group();
    aedGroup.position.set(1.10, 0, -0.15);
    S.aedGroup = aedGroup;

    // 1. AED Main Body Case (Paramedic Red & Safety Yellow Trim)
    const aedCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.26, 0.68),
      new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.3, metalness: 0.1 })
    );
    aedCase.position.y = 0.13;
    aedCase.castShadow = true;
    aedGroup.add(aedCase);

    // Yellow protective bumper corners
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
    const bumperTop = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.05, 0.70), bumperMat);
    bumperTop.position.y = 0.24;
    aedGroup.add(bumperTop);

    // Carry Handle on top
    const handleGeo = new THREE.TorusGeometry(0.16, 0.035, 16, 24, Math.PI);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0.25, -0.34);
    handle.rotation.x = -Math.PI / 4;
    aedGroup.add(handle);

    // 2. Realistic Canvas-rendered LCD Screen
    const aedCvs = document.createElement('canvas');
    aedCvs.width = 512;
    aedCvs.height = 256;
    const aedCtx = aedCvs.getContext('2d')!;
    const aedTex = new THREE.CanvasTexture(aedCvs);
    aedTex.needsUpdate = true;
    S.aedScreenCanvas = aedCvs;
    S.aedScreenCtx = aedCtx;
    S.aedScreenTexture = aedTex;

    const scrMat = new THREE.MeshBasicMaterial({ map: aedTex });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.24), scrMat);
    scr.rotation.x = -Math.PI / 2;
    scr.position.set(0, 0.268, -0.06);
    aedGroup.add(scr);
    S.aedScreenMesh = scr;

    // 3. Green Power Button (with power symbol)
    const pwrBtnGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 24);
    const pwrBtnMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d, roughness: 0.3 });
    const pwrBtn = new THREE.Mesh(pwrBtnGeo, pwrBtnMat);
    pwrBtn.position.set(-0.24, 0.27, 0.18);
    pwrBtn.userData = { type: 'aedPower' };
    aedGroup.add(pwrBtn);
    S.powerBtn = pwrBtn;

    // 4. Safety Orange Shock Button (with lightning emblem)
    const shkBtnGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 24);
    const shkBtnMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x000000, roughness: 0.25 });
    const shkBtn = new THREE.Mesh(shkBtnGeo, shkBtnMat);
    shkBtn.position.set(0.24, 0.27, 0.18);
    shkBtn.userData = { type: 'aedShock' };
    aedGroup.add(shkBtn);
    S.shockBtn = shkBtn;

    // 5. Cable Socket Port
    const socketGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24);
    const socketMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x000000, metalness: 0.4 });
    const socketMesh = new THREE.Mesh(socketGeo, socketMat);
    socketMesh.position.set(-0.26, 0.27, -0.22);
    socketMesh.userData = { type: 'aedSocket' };
    aedGroup.add(socketMesh);
    S.socketMesh = socketMesh;

    scene.add(aedGroup);

    // --- Pad Targets on Patient Chest ---
    const targetGeo = new THREE.BoxGeometry(0.30, 0.03, 0.38);

    const pad1Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        emissive: 0x0284c7,
      })
    );
    pad1Target.position.set(-0.26, 0.42, -0.32);
    pad1Target.userData = { type: 'pad1Target' };
    scene.add(pad1Target);
    S.pad1Target = pad1Target;

    const pad2Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        emissive: 0x0284c7,
      })
    );
    pad2Target.position.set(0.34, 0.42, 0.22);
    pad2Target.userData = { type: 'pad2Target' };
    scene.add(pad2Target);
    S.pad2Target = pad2Target;

    // --- Realistic Defibrillation Pads (Draggable / Clickable) ---
    const padMeshGeo = new THREE.BoxGeometry(0.28, 0.035, 0.36);

    const pad1Tex = createPadTexture(1);
    const pad1Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({
        map: pad1Tex,
        roughness: 0.35,
        metalness: 0.05,
      })
    );
    pad1Drag.userData = { type: 'dragPad1' };
    scene.add(pad1Drag);
    S.pad1Drag = pad1Drag;

    const pad2Tex = createPadTexture(2);
    const pad2Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({
        map: pad2Tex,
        roughness: 0.35,
        metalness: 0.05,
      })
    );
    pad2Drag.userData = { type: 'dragPad2' };
    scene.add(pad2Drag);
    S.pad2Drag = pad2Drag;

    // Yellow Connector Plug
    const plugDrag = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.09, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e, roughness: 0.3 })
    );
    plugDrag.userData = { type: 'dragPlug' };
    scene.add(plugDrag);
    S.plugDrag = plugDrag;

    // Lead Cables
    const lineMat1 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 });
    const lineGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line1 = new THREE.Line(lineGeo1, lineMat1);
    scene.add(line1);
    S.line1 = line1;

    const lineMat2 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 });
    const lineGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line2 = new THREE.Line(lineGeo2, lineMat2);
    scene.add(line2);
    S.line2 = line2;

    const updateCableLines = () => {
      if (!S.line1 || !S.line2 || !S.plugDrag || !S.pad1Drag || !S.pad2Drag) return;
      const plugPos = S.plugDrag.position;
      const p1Pos = S.pad1Drag.position;
      const p2Pos = S.pad2Drag.position;

      S.line1.geometry.setFromPoints([
        new THREE.Vector3(p1Pos.x, p1Pos.y + 0.02, p1Pos.z),
        new THREE.Vector3(plugPos.x, plugPos.y + 0.02, plugPos.z),
      ]);
      S.line2.geometry.setFromPoints([
        new THREE.Vector3(p2Pos.x, p2Pos.y + 0.02, p2Pos.z),
        new THREE.Vector3(plugPos.x, plugPos.y + 0.02, plugPos.z),
      ]);
    };

    // Concrete snap functions so clicking or dragging places the pad reliably
    const snapPad1ToTarget = () => {
      if (!S.pad1Drag || !S.pad1Target) return;
      S.pad1Drag.position.copy(S.pad1Target.position);
      S.pad1Drag.position.y = 0.425;
      S.pad1Target.visible = false;
      updateCableLines();
      sound.success();
      onAdvanceAED(2);
    };

    const snapPad2ToTarget = () => {
      if (!S.pad2Drag || !S.pad2Target) return;
      S.pad2Drag.position.copy(S.pad2Target.position);
      S.pad2Drag.position.y = 0.425;
      S.pad2Target.visible = false;
      updateCableLines();
      sound.success();
      onAdvanceAED(3);
    };

    const snapPlugToSocket = () => {
      if (!S.socketMesh || !S.plugDrag) return;
      const socketWorld = new THREE.Vector3();
      S.socketMesh.getWorldPosition(socketWorld);
      S.plugDrag.position.set(socketWorld.x, socketWorld.y + 0.04, socketWorld.z);
      (S.plugDrag.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      updateCableLines();
      sound.success();
      onAdvanceAED(4);
    };

    S.snapPad1 = snapPad1ToTarget;
    S.snapPad2 = snapPad2ToTarget;
    S.snapPlug = snapPlugToSocket;

    // Animation Loop
    const animate = () => {
      S.animId = requestAnimationFrame(animate);
      const t = performance.now() * 0.003;

      // Hazards pulsating
      S.hazardObjects.forEach((h, idx) => {
        if (h.visible && S.draggedObject !== h) {
          h.rotation.y = t + idx;
          const s = 1 + 0.12 * Math.sin(t * 2 + idx);
          h.scale.set(s, s, s);
        }
      });

      // Shoulder pulsing
      if (S.shoulderTarget && S.shoulderTarget.visible) {
        const s = 1 + 0.18 * Math.sin(t * 2.5);
        S.shoulderTarget.scale.set(s, s, 1);
      }

      // AED animations and screen rendering
      if (S.mode === 'aedScenario') {
        const step = S.aedStep;
        updateAEDScreen(step, t);

        if (step === 0 && S.powerBtn) {
          const s = 1 + 0.22 * Math.sin(t * 3.5);
          S.powerBtn.scale.set(s, 1, s);
        } else if (S.powerBtn) {
          S.powerBtn.scale.set(1, 1, 1);
        }

        if (step === 1 && S.pad1Drag && S.pad1Target && S.draggedObject !== S.pad1Drag) {
          const s = 1 + 0.08 * Math.sin(t * 3.5);
          S.pad1Drag.scale.set(s, 1, s);
          (S.pad1Target.material as THREE.MeshStandardMaterial).opacity =
            0.4 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        if (step === 2 && S.pad2Drag && S.pad2Target && S.draggedObject !== S.pad2Drag) {
          const s = 1 + 0.08 * Math.sin(t * 3.5);
          S.pad2Drag.scale.set(s, 1, s);
          (S.pad2Target.material as THREE.MeshStandardMaterial).opacity =
            0.4 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        if (step === 3 && S.plugDrag && S.socketMesh && S.draggedObject !== S.plugDrag) {
          const s = 1 + 0.14 * Math.sin(t * 3.5);
          S.plugDrag.scale.set(s, 1, s);
          (S.socketMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            Math.sin(t * 5) > 0 ? 0xfacc15 : 0x1e293b
          );
        } else if (S.socketMesh) {
          (S.socketMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }

        if (step === 6 && S.shockBtn) {
          const s = 1 + 0.25 * Math.sin(t * 4.5);
          S.shockBtn.scale.set(s, 1, s);
          (S.shockBtn.material as THREE.MeshStandardMaterial).emissive.setHex(
            Math.sin(t * 6) > 0 ? 0xff5500 : 0x220000
          );
        } else if (S.shockBtn) {
          S.shockBtn.scale.set(1, 1, 1);
          (S.shockBtn.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!camera || !renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pointer events
    const updateMouseNDC = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      S.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      S.raycaster.setFromCamera(S.mouse, S.camera!);
    };

    const handlePointerDown = (ev: PointerEvent) => {
      updateMouseNDC(ev);
      const currentMode = S.mode;

      if (currentMode === 'blsSceneSafety') {
        const visibleHazards = S.hazardObjects.filter((h) => h.visible);
        const hits = S.raycaster.intersectObjects(visibleHazards, false);
        if (hits.length > 0) {
          S.draggedObject = hits[0].object as THREE.Mesh;
          sound.tick();
        }
      } else if (currentMode === 'blsCheckResponse') {
        if (S.shoulderTarget) {
          const hits = S.raycaster.intersectObject(S.shoulderTarget, false);
          if (hits.length > 0) {
            setShoulderTapped(true);
            sound.tick();
          }
        }
      } else if (currentMode === 'aedScenario') {
        const step = S.aedStep;
        if (step === 0 && S.powerBtn) {
          const hits = S.raycaster.intersectObject(S.powerBtn, false);
          if (hits.length > 0) {
            onAdvanceAED(1);
          }
        } else if (step === 1 && S.pad1Drag && S.pad1Target) {
          // Check if user clicked pad OR target
          const hits = S.raycaster.intersectObjects([S.pad1Drag, S.pad1Target], false);
          if (hits.length > 0) {
            if (hits[0].object === S.pad1Target) {
              snapPad1ToTarget();
            } else {
              S.draggedObject = S.pad1Drag;
              sound.tick();
              try {
                canvas.setPointerCapture(ev.pointerId);
              } catch (e) {}
            }
          }
        } else if (step === 2 && S.pad2Drag && S.pad2Target) {
          const hits = S.raycaster.intersectObjects([S.pad2Drag, S.pad2Target], false);
          if (hits.length > 0) {
            if (hits[0].object === S.pad2Target) {
              snapPad2ToTarget();
            } else {
              S.draggedObject = S.pad2Drag;
              sound.tick();
              try {
                canvas.setPointerCapture(ev.pointerId);
              } catch (e) {}
            }
          }
        } else if (step === 3 && S.plugDrag && S.socketMesh) {
          const hits = S.raycaster.intersectObjects([S.plugDrag, S.socketMesh], false);
          if (hits.length > 0) {
            snapPlugToSocket();
          }
        } else if (step === 6 && S.shockBtn) {
          const hits = S.raycaster.intersectObject(S.shockBtn, false);
          if (hits.length > 0) {
            onAdvanceAED(7);
          }
        }
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!S.draggedObject) return;
      updateMouseNDC(ev);

      if (S.raycaster.ray.intersectPlane(S.dragPlane, S.dragIntersectPoint)) {
        S.draggedObject.position.x = S.dragIntersectPoint.x;
        S.draggedObject.position.z = S.dragIntersectPoint.z;
        S.draggedObject.position.y = 0.44;

        if (S.mode === 'aedScenario') {
          updateCableLines();
        }
      }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (!S.draggedObject) return;
      const obj = S.draggedObject;
      S.draggedObject = null;

      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (e) {}

      const currentMode = S.mode;

      if (currentMode === 'blsSceneSafety' && obj.userData.type === 'hazard') {
        obj.visible = false;
        sound.tick();
        setHazardsCleared((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            onCompleteSceneSafety();
          }
          return next;
        });
        return;
      }

      if (currentMode === 'aedScenario') {
        const step = S.aedStep;
        if (step === 1 && obj === S.pad1Drag && S.pad1Target) {
          const targetPos = S.pad1Target.position;
          const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
          // Forgiving snap: if dragged towards patient chest (x < 0.35) or within 0.85
          if (dist < 0.85 || obj.position.x < 0.35) {
            snapPad1ToTarget();
          } else {
            // Tap/click placement fallback: if user tapped on it without dragging far, place it!
            snapPad1ToTarget();
          }
        } else if (step === 2 && obj === S.pad2Drag && S.pad2Target) {
          const targetPos = S.pad2Target.position;
          const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
          if (dist < 0.85 || (obj.position.x < 0.65 && obj.position.z > 0.0)) {
            snapPad2ToTarget();
          } else {
            snapPad2ToTarget();
          }
        } else if (step === 3 && obj === S.plugDrag && S.socketMesh) {
          snapPlugToSocket();
        }
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      if (S.animId !== null) cancelAnimationFrame(S.animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      renderer.dispose();
    };
  }, []);

  // Update object visibility & camera angle per mode
  useEffect(() => {
    const S = stateRef.current;
    if (!S.camera) return;

    S.hazardObjects.forEach((h) => {
      h.visible = false;
    });
    if (S.shoulderTarget) S.shoulderTarget.visible = false;
    if (S.aedGroup) S.aedGroup.visible = false;
    if (S.bareChestMesh) S.bareChestMesh.visible = false;
    if (S.pad1Target) S.pad1Target.visible = false;
    if (S.pad2Target) S.pad2Target.visible = false;
    if (S.pad1Drag) S.pad1Drag.visible = false;
    if (S.pad2Drag) S.pad2Drag.visible = false;
    if (S.plugDrag) S.plugDrag.visible = false;
    if (S.line1) S.line1.visible = false;
    if (S.line2) S.line2.visible = false;

    if (mode === 'blsSceneSafety') {
      S.hazardObjects[0].position.set(-1.05, 0.25, -0.2);
      S.hazardObjects[1].position.set(1.05, 0.3, 0.35);
      S.hazardObjects[0].visible = hazardsCleared < 1;
      S.hazardObjects[1].visible = hazardsCleared < 2;
      S.camera.position.set(0, 3.8, 3.2);
      S.camera.lookAt(0, 0, 0.1);
    } else if (mode === 'blsCheckResponse') {
      if (S.shoulderTarget) S.shoulderTarget.visible = true;
      S.camera.position.set(0.9, 2.2, -1.2);
      S.camera.lookAt(0, 0.2, -0.5);
    } else if (mode === 'blsCallHelp') {
      S.camera.position.set(1.4, 2.4, 1.8);
      S.camera.lookAt(0, 0.2, 0);
    } else if (mode === 'aedScenario') {
      if (S.aedGroup) S.aedGroup.visible = true;
      if (S.bareChestMesh) S.bareChestMesh.visible = true;

      // Elevated spacious camera view
      S.camera.position.set(0.25, 3.2, 1.55);
      S.camera.lookAt(0.25, 0.2, 0);

      if (aedStep === 0) {
        // Just powered off
      } else {
        if (S.pad1Drag) S.pad1Drag.visible = true;
        if (S.pad2Drag) S.pad2Drag.visible = true;
        if (S.plugDrag) S.plugDrag.visible = true;
        if (S.line1) S.line1.visible = true;
        if (S.line2) S.line2.visible = true;

        if (aedStep === 1) {
          if (S.pad1Target) S.pad1Target.visible = true;
          S.pad1Drag.position.set(0.92, 0.40, 0.38);
        } else if (aedStep === 2) {
          if (S.pad2Target) S.pad2Target.visible = true;
          S.pad2Drag.position.set(1.24, 0.40, 0.38);
        }
      }
    }
  }, [mode, aedStep, hazardsCleared]);

  return <canvas ref={canvasRef} id="scene3d" className="fixed inset-0 w-full h-full object-cover z-[3]" />;
};
