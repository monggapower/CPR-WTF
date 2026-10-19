import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
    lidPivot: THREE.Group | null;
    lidMesh: THREE.Mesh | null;
    plugMesh: THREE.Mesh | null;
    portMesh: THREE.Mesh | null;
    portLedMesh: THREE.Mesh | null;
    powerBtn: THREE.Mesh | null;
    shockBtn: THREE.Mesh | null;
    aedScreenMesh: THREE.Mesh | null;
    aedScreenCanvas: HTMLCanvasElement | null;
    aedScreenCtx: CanvasRenderingContext2D | null;
    aedScreenTexture: THREE.CanvasTexture | null;
    pad1Target: THREE.Mesh | null;
    pad2Target: THREE.Mesh | null;
    pad1Drag: THREE.Mesh | null;
    pad2Drag: THREE.Mesh | null;
    cable1: THREE.Line | null;
    cable2: THREE.Line | null;
    draggedObject: THREE.Mesh | null;
    mode: AppMode;
    aedStep: number;
    lidAngle: number;
    targetLidAngle: number;
    snapPad1: () => void;
    snapPad2: () => void;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.44),
    dragIntersectPoint: new THREE.Vector3(),
    animId: null,
    patientGroup: null,
    bareChestMesh: null,
    shoulderTarget: null,
    hazardObjects: [],
    aedGroup: null,
    lidPivot: null,
    lidMesh: null,
    plugMesh: null,
    portMesh: null,
    portLedMesh: null,
    powerBtn: null,
    shockBtn: null,
    aedScreenMesh: null,
    aedScreenCanvas: null,
    aedScreenCtx: null,
    aedScreenTexture: null,
    pad1Target: null,
    pad2Target: null,
    pad1Drag: null,
    pad2Drag: null,
    cable1: null,
    cable2: null,
    draggedObject: null,
    mode,
    aedStep,
    lidAngle: 0,
    targetLidAngle: 0,
    snapPad1: () => {},
    snapPad2: () => {},
  });

  stateRef.current.mode = mode;
  stateRef.current.aedStep = aedStep;

  // Realistic electrode pad texture with Thai & English placement diagram
  const createPadTexture = (padNumber: 1 | 2) => {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 320;
    const ctx = cvs.getContext('2d')!;

    // Pad white border & hydrogel backing
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 304, 28);
    ctx.fill();

    // Blue medical hydrogel border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Top Header band
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(14, 14, 228, 56, [22, 22, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PAD #${padNumber}`, 128, 52);

    // Anatomical chest diagram
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(128, 155, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Torso silhouette
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(128, 122, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 172, 40, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red highlight marker on specific placement position
    ctx.fillStyle = '#ef4444';
    if (padNumber === 1) {
      // Right upper chest (subclavicular)
      ctx.beginPath();
      ctx.arc(146, 152, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Left lower rib (lateral axillary)
      ctx.beginPath();
      ctx.arc(108, 186, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Thai & English placement text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(padNumber === 1 ? 'RIGHT UPPER CHEST' : 'LEFT LOWER RIBS', 128, 245);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#0369a1';
    ctx.fillText(padNumber === 1 ? 'อกขวาบน (ใต้ไหปลาร้า)' : 'ชายโครงซ้ายล่าง', 128, 272);

    // Pre-connected wire indicator dot
    ctx.fillStyle = padNumber === 1 ? '#38bdf8' : '#facc15';
    ctx.beginPath();
    ctx.arc(128, 296, 7, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    return tex;
  };

  // Dynamic LCD Screen Monitor on AED Faceplate
  const updateAEDScreen = (step: number, ecgTime: number) => {
    const S = stateRef.current;
    const ctx = S.aedScreenCtx;
    const cvs = S.aedScreenCanvas;
    if (!ctx || !cvs || !S.aedScreenTexture) return;

    // Dark blue medical LCD background
    ctx.fillStyle = '#050c18';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Grid lines for ECG monitor
    ctx.strokeStyle = 'rgba(30, 58, 110, 0.45)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cvs.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cvs.height);
      ctx.stroke();
    }
    for (let y = 0; y < cvs.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cvs.width, y);
      ctx.stroke();
    }

    // Top status header
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cvs.width, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AHA 2025 BLS AED • ADULT MODE', 14, 24);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔋 100%  [✓ READY]', cvs.width - 14, 24);

    if (step === 0) {
      // Standby
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AED STANDBY', cvs.width / 2, 100);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText('👉 กดปุ่มเปิดเครื่องสีเขียว (POWER)', cvs.width / 2, 140);
    } else if (step === 1 || step === 2) {
      // Pad placement
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ATTACH DEFIBRILLATION PADS', cvs.width / 2, 75);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText(step === 1 ? '👉 แปะแผ่นที่ 1 (อกขวาบนใต้ไหปลาร้า)' : '👉 แปะแผ่นที่ 2 (ชายโครงซ้ายล่าง)', cvs.width / 2, 115);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('ลากหรือแตะที่แผ่น/กรอบสีฟ้าบนหน้าอกผู้ป่วย', cvs.width / 2, 155);
    } else if (step === 3) {
      // Analyzing Rhythm (Automated)
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ANALYZING HEART RHYTHM...', cvs.width / 2, 68);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('⚠️ DO NOT TOUCH PATIENT (ห้ามสัมผัสตัวผู้ป่วย)', cvs.width / 2, 95);

      // Live animated Ventricular Fibrillation waveform
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const midY = 155;
      for (let x = 0; x < cvs.width; x += 4) {
        const wave = Math.sin(x * 0.08 + ecgTime * 12) * 26 + Math.cos(x * 0.16 + ecgTime * 16) * 14;
        if (x === 0) ctx.moveTo(x, midY + wave);
        else ctx.lineTo(x, midY + wave);
      }
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RHYTHM: Ventricular Fibrillation (VF)', 14, 220);
    } else if (step === 4) {
      // Safety Clearance ("ผมถอย คุณถอย ทุกคนถอย")
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ SHOCK ADVISED • CHARGING 360J', cvs.width / 2, 75);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('🗣️ "ผมถอย คุณถอย ทุกคนถอย"', cvs.width / 2, 120);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px sans-serif';
      ctx.fillText('ทุกคนถอยห่างจากตัวผู้ป่วยก่อนทำการช็อก', cvs.width / 2, 160);
    } else if (step === 5) {
      // Ready to Shock
      ctx.fillStyle = '#ef4444';
      ctx.font = 'black 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ STAND CLEAR • PRESS SHOCK!', cvs.width / 2, 80);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText('👉 กดปุ่มช็อกสีส้มที่กำลังกระพริบเดี๋ยวนี้', cvs.width / 2, 125);

      // Warning lightning emblem
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('⚡ ⚡ ⚡', cvs.width / 2, 175);
    } else if (step === 6) {
      // Shock Delivered
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ SHOCK DELIVERED (360 JOULES)', cvs.width / 2, 110);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('กำลังประเมินผลการช่วยชีวิตขั้นพื้นฐาน...', cvs.width / 2, 155);
    }

    S.aedScreenTexture.needsUpdate = true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const S = stateRef.current;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    S.scene = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(-0.15, 4.8, 2.8);
    camera.lookAt(-0.15, 0.35, 0);
    S.camera = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    S.renderer = renderer;

    // 4. Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 9, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    blueRimLight.position.set(-5, 4, -4);
    scene.add(blueRimLight);

    // 5. Training Ground Floor
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 32, 0x1e293b, 0x0f172a);
    grid.position.y = 0.005;
    scene.add(grid);

    // 6. Build Patient Humanoid Manikin (Positioned right beside AED)
    const patientGroup = new THREE.Group();
    patientGroup.position.set(1.05, 0, 0.15);
    S.patientGroup = patientGroup;

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe0ac69,
      roughness: 0.6,
      metalness: 0.05,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
    });

    // Anatomical Torso
    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.35, 1.05, 32),
      skinMat
    );
    torsoMesh.rotation.x = Math.PI / 2;
    torsoMesh.position.set(0, 0.22, -0.2);
    torsoMesh.castShadow = true;
    patientGroup.add(torsoMesh);

    // Bare chest upper detail & Sternum guideline
    const bareChestGroup = new THREE.Group();
    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.16, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe5b882, roughness: 0.55 })
    );
    chestPlate.position.set(0, 0.32, -0.15);
    bareChestGroup.add(chestPlate);

    // Lower sternum target zone (for hand placement guide)
    const sternumTarget = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.04, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x14532d,
        transparent: true,
        opacity: 0.7,
      })
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

    // Arms & Legs
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

    // Step 2 Shoulder Tap Target
    const ringGeo = new THREE.RingGeometry(0.18, 0.32, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    const shoulderTarget = new THREE.Mesh(ringGeo, ringMat);
    shoulderTarget.rotation.x = -Math.PI / 2;
    shoulderTarget.position.set(0, 0.44, -0.45);
    shoulderTarget.userData = { type: 'shoulderTap' };
    patientGroup.add(shoulderTarget);
    S.shoulderTarget = shoulderTarget;

    scene.add(patientGroup);

    // 7. Hazards (Step 1)
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

    // ============================================================================
    // 4. PROCEDURAL 3D AED MODEL CONSTRUCTION (EXACT CODE PROVIDED BY USER)
    // ============================================================================
    const interactiveMeshes: THREE.Mesh[] = [];
    const aedGroup = new THREE.Group();
    aedGroup.position.set(-1.35, 0, 0.3);
    scene.add(aedGroup);
    S.aedGroup = aedGroup;

    // Materials
    const yellowBodyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.05,
    });
    const darkBumperMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.1,
    });
    const faceplateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.15,
    });

    // 4.1 Main Chassis Base
    const chassisGeo = new RoundedBoxGeometry(2.1, 0.68, 2.3, 6, 0.14);
    const chassisMesh = new THREE.Mesh(chassisGeo, yellowBodyMat);
    chassisMesh.position.y = 0.36;
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    aedGroup.add(chassisMesh);

    // 4.2 Impact-Resistant Side Bumpers
    const bumperGeo = new RoundedBoxGeometry(0.26, 0.72, 2.38, 4, 0.08);
    const leftBumper = new THREE.Mesh(bumperGeo, darkBumperMat);
    leftBumper.position.set(-0.98, 0.36, 0);
    leftBumper.castShadow = true;
    aedGroup.add(leftBumper);

    const rightBumper = new THREE.Mesh(bumperGeo, darkBumperMat);
    rightBumper.position.set(0.98, 0.36, 0);
    rightBumper.castShadow = true;
    aedGroup.add(rightBumper);

    // 4.3 Top Moulded Carrying Handle
    const handleBarGeo = new RoundedBoxGeometry(1.3, 0.16, 0.24, 4, 0.06);
    const handleBar = new THREE.Mesh(handleBarGeo, darkBumperMat);
    handleBar.position.set(0, 0.38, -1.32);
    handleBar.castShadow = true;
    aedGroup.add(handleBar);

    const strutGeo = new THREE.BoxGeometry(0.22, 0.22, 0.28);
    const leftStrut = new THREE.Mesh(strutGeo, yellowBodyMat);
    leftStrut.position.set(-0.5, 0.38, -1.18);
    aedGroup.add(leftStrut);
    const rightStrut = new THREE.Mesh(strutGeo, yellowBodyMat);
    rightStrut.position.set(0.5, 0.38, -1.18);
    aedGroup.add(rightStrut);

    // 4.4 Recessed Control Faceplate
    const plateGeo = new RoundedBoxGeometry(1.68, 0.06, 1.96, 4, 0.03);
    const plateMesh = new THREE.Mesh(plateGeo, faceplateMat);
    plateMesh.position.set(0, 0.69, 0.04);
    aedGroup.add(plateMesh);

    // 4.5 3D LCD Screen Mesh
    const aedCvs = document.createElement('canvas');
    aedCvs.width = 512;
    aedCvs.height = 320;
    const aedCtx = aedCvs.getContext('2d')!;
    const lcdTexture = new THREE.CanvasTexture(aedCvs);
    lcdTexture.needsUpdate = true;
    S.aedScreenCanvas = aedCvs;
    S.aedScreenCtx = aedCtx;
    S.aedScreenTexture = lcdTexture;

    const screenGeo = new THREE.PlaneGeometry(1.18, 0.74);
    const screenMat = new THREE.MeshBasicMaterial({ map: lcdTexture });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.rotation.x = -Math.PI / 2;
    screenMesh.position.set(0, 0.725, -0.18);
    aedGroup.add(screenMesh);
    S.aedScreenMesh = screenMesh;

    // 4.6 Interactive Green Power Button
    const pwrBaseGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 32);
    const pwrMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.2,
      roughness: 0.3,
    });
    const powerBtnMesh = new THREE.Mesh(pwrBaseGeo, pwrMat);
    powerBtnMesh.position.set(0.54, 0.73, -0.72);
    powerBtnMesh.userData = { action: 'POWER', label: 'Power Button (ON / OFF)', type: 'aedPower' };
    interactiveMeshes.push(powerBtnMesh);
    aedGroup.add(powerBtnMesh);
    S.powerBtn = powerBtnMesh;

    // 4.7 Interactive Shock Button (Heart / Lightning Orange Strobe)
    const shockBaseGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.09, 32);
    const shockMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xef4444,
      emissiveIntensity: 0.0,
      roughness: 0.25,
    });
    const shockBtnMesh = new THREE.Mesh(shockBaseGeo, shockMat);
    shockBtnMesh.position.set(0, 0.73, 0.56);
    shockBtnMesh.userData = { action: 'SHOCK', label: 'Deliver Defibrillation Shock (⚡)', type: 'aedShock' };
    interactiveMeshes.push(shockBtnMesh);
    aedGroup.add(shockBtnMesh);
    S.shockBtn = shockBtnMesh;

    // 4.8 Electrode Pad Cable Connector Port & Plug
    const portGeo = new RoundedBoxGeometry(0.32, 0.1, 0.26, 4, 0.02);
    const portMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const portMesh = new THREE.Mesh(portGeo, portMat);
    portMesh.position.set(-0.54, 0.72, -0.72);
    portMesh.userData = { action: 'PLUG', label: 'Plug / Unplug Electrode Connector', type: 'aedPlug' };
    interactiveMeshes.push(portMesh);
    aedGroup.add(portMesh);
    S.portMesh = portMesh;

    // Flashing Port LED Indicator
    const portLedGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const portLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const portLedMesh = new THREE.Mesh(portLedGeo, portLedMat);
    portLedMesh.position.set(-0.54, 0.74, -0.52);
    aedGroup.add(portLedMesh);
    S.portLedMesh = portLedMesh;

    // Yellow Plug Head (Pre-connected & seated cleanly in port since no wire connecting step)
    const plugGeo = new RoundedBoxGeometry(0.22, 0.18, 0.18, 4, 0.03);
    const plugMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3 });
    const plugMesh = new THREE.Mesh(plugGeo, plugMat);
    plugMesh.position.set(-0.54, 0.76, -0.72);
    plugMesh.userData = { action: 'PLUG', label: 'Insert Pad Connector Plug', type: 'aedPlug' };
    interactiveMeshes.push(plugMesh);
    aedGroup.add(plugMesh);
    S.plugMesh = plugMesh;

    // 4.9 Speaker Grille Perforations
    const speakerGroup = new THREE.Group();
    speakerGroup.position.set(-0.54, 0.725, 0.58);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x090d14 });
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        if (Math.abs(gx) + Math.abs(gz) > 3) continue;
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), holeMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(gx * 0.055, 0, gz * 0.055);
        speakerGroup.add(dot);
      }
    }
    aedGroup.add(speakerGroup);

    // 4.10 Hinged Protective Semi-Transparent Cover Lid
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.72, -0.96); // Rear hinge axis
    aedGroup.add(lidPivot);
    S.lidPivot = lidPivot;

    function createLidBadgeTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, 512, 512);

      // Green Cross / AED Emblem
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(256, 210, 130, 0, Math.PI * 2);
      ctx.fill();

      // White Heart + Lightning Bolt
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 130px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 256, 215);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 74px sans-serif';
      ctx.fillText('AED', 256, 415);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('AUTOMATED EXTERNAL DEFIBRILLATOR', 256, 468);
      return new THREE.CanvasTexture(c);
    }

    const lidGeo = new RoundedBoxGeometry(1.76, 0.12, 2.02, 6, 0.05);
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      transmission: 0.25,
      transparent: true,
      opacity: 0.94,
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.set(0, 0.06, 1.0);
    lidMesh.castShadow = true;
    lidMesh.userData = { action: 'LID', label: 'Open / Close Protective AED Cover', type: 'aedLid' };
    interactiveMeshes.push(lidMesh);
    lidPivot.add(lidMesh);
    S.lidMesh = lidMesh;

    const emblemGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const emblemMat = new THREE.MeshBasicMaterial({ map: createLidBadgeTexture() });
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.rotation.x = -Math.PI / 2;
    emblemMesh.position.set(0, 0.122, 1.0);
    lidPivot.add(emblemMesh);

    // ============================================================================
    // 5. ELECTRODE PADS & TARGET ZONES ON PATIENT CHEST
    // ============================================================================
    const targetGeo = new THREE.BoxGeometry(0.36, 0.04, 0.44);

    // Pad 1 Target: Patient's Right Upper Chest (Subclavicular)
    // Patient is at (1.05, 0, 0.15), so right chest is around (0.80, 0.44, 0.0)
    const pad1Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        emissive: 0x0284c7,
      })
    );
    pad1Target.position.set(0.80, 0.44, 0.0);
    pad1Target.userData = { type: 'pad1Target' };
    scene.add(pad1Target);
    S.pad1Target = pad1Target;

    // Pad 2 Target: Patient's Left Lower Ribs (Axillary line)
    // Left ribs around (1.35, 0.44, 0.42)
    const pad2Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        emissive: 0x0284c7,
      })
    );
    pad2Target.position.set(1.35, 0.44, 0.42);
    pad2Target.userData = { type: 'pad2Target' };
    scene.add(pad2Target);
    S.pad2Target = pad2Target;

    // Draggable Defibrillation Pads with generous hit collision
    const padMeshGeo = new THREE.BoxGeometry(0.32, 0.05, 0.40);

    const pad1Tex = createPadTexture(1);
    const pad1Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ map: pad1Tex, roughness: 0.35 })
    );
    pad1Drag.userData = { type: 'dragPad1' };
    pad1Drag.castShadow = true;
    // Initial position on floor beside AED tray
    pad1Drag.position.set(-0.25, 0.44, 0.05);
    scene.add(pad1Drag);
    S.pad1Drag = pad1Drag;

    const pad2Tex = createPadTexture(2);
    const pad2Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ map: pad2Tex, roughness: 0.35 })
    );
    pad2Drag.userData = { type: 'dragPad2' };
    pad2Drag.castShadow = true;
    pad2Drag.position.set(-0.25, 0.44, 0.60);
    scene.add(pad2Drag);
    S.pad2Drag = pad2Drag;

    // Flexible pre-connected cables from AED plug head directly to pads
    const cableMat1 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 5 });
    const cableGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const cable1 = new THREE.Line(cableGeo1, cableMat1);
    scene.add(cable1);
    S.cable1 = cable1;

    const cableMat2 = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 5 });
    const cableGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const cable2 = new THREE.Line(cableGeo2, cableMat2);
    scene.add(cable2);
    S.cable2 = cable2;

    const updateCableLines = () => {
      if (!S.cable1 || !S.cable2 || !S.pad1Drag || !S.pad2Drag || !S.aedGroup) return;
      // Port global coordinates: aedGroup at (-1.35, 0, 0.3) + plug offset (-0.54, 0.76, -0.72)
      const portX = -1.35 - 0.54;
      const portY = 0.76;
      const portZ = 0.3 - 0.72;

      const p1Pos = S.pad1Drag.position;
      const p2Pos = S.pad2Drag.position;

      S.cable1.geometry.setFromPoints([
        new THREE.Vector3(p1Pos.x, p1Pos.y + 0.02, p1Pos.z),
        new THREE.Vector3(portX, portY, portZ),
      ]);
      S.cable2.geometry.setFromPoints([
        new THREE.Vector3(p2Pos.x, p2Pos.y + 0.02, p2Pos.z),
        new THREE.Vector3(portX, portY, portZ),
      ]);
    };

    // Concrete Placement Snap Handlers
    const snapPad1ToTarget = () => {
      if (!S.pad1Drag || !S.pad1Target) return;
      S.pad1Drag.position.copy(S.pad1Target.position);
      S.pad1Drag.position.y = 0.44;
      S.pad1Target.visible = false;
      updateCableLines();
      sound.success();
      onAdvanceAED(2);
    };

    const snapPad2ToTarget = () => {
      if (!S.pad2Drag || !S.pad2Target) return;
      S.pad2Drag.position.copy(S.pad2Target.position);
      S.pad2Drag.position.y = 0.44;
      S.pad2Target.visible = false;
      updateCableLines();
      sound.success();
      // Directly advances to Step 3 (automated rhythm analysis - no wire step!)
      onAdvanceAED(3);
    };

    S.snapPad1 = snapPad1ToTarget;
    S.snapPad2 = snapPad2ToTarget;

    // Animation Render Loop
    const animate = () => {
      S.animId = requestAnimationFrame(animate);
      const t = performance.now() * 0.003;

      // Hazards animation
      S.hazardObjects.forEach((h, idx) => {
        if (h.visible && S.draggedObject !== h) {
          h.rotation.y = t + idx;
          const s = 1 + 0.12 * Math.sin(t * 2 + idx);
          h.scale.set(s, s, s);
        }
      });

      // Shoulder tap pulse
      if (S.shoulderTarget && S.shoulderTarget.visible) {
        const s = 1 + 0.18 * Math.sin(t * 2.5);
        S.shoulderTarget.scale.set(s, s, 1);
      }

      // Smooth Hinged Lid Opening
      if (S.lidPivot) {
        S.lidAngle += (S.targetLidAngle - S.lidAngle) * 0.12;
        S.lidPivot.rotation.x = S.lidAngle;
      }

      // AED animations
      if (S.mode === 'aedScenario') {
        const step = S.aedStep;
        updateAEDScreen(step, t);

        // Step 0: Power button and lid pulse
        if (step === 0 && S.powerBtn) {
          const s = 1 + 0.20 * Math.sin(t * 3.5);
          S.powerBtn.scale.set(s, 1, s);
        } else if (S.powerBtn) {
          S.powerBtn.scale.set(1, 1, 1);
        }

        // Port LED flashing (Green when ready, red on standby)
        if (S.portLedMesh) {
          (S.portLedMesh.material as THREE.MeshBasicMaterial).color.setHex(
            step >= 1 ? 0x22c55e : Math.sin(t * 6) > 0 ? 0xef4444 : 0x450a0a
          );
        }

        // Step 1: Pad 1 glow & pulse
        if (step === 1 && S.pad1Drag && S.pad1Target && S.draggedObject !== S.pad1Drag) {
          const s = 1 + 0.07 * Math.sin(t * 3.5);
          S.pad1Drag.scale.set(s, 1, s);
          (S.pad1Target.material as THREE.MeshStandardMaterial).opacity =
            0.45 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        // Step 2: Pad 2 glow & pulse
        if (step === 2 && S.pad2Drag && S.pad2Target && S.draggedObject !== S.pad2Drag) {
          const s = 1 + 0.07 * Math.sin(t * 3.5);
          S.pad2Drag.scale.set(s, 1, s);
          (S.pad2Target.material as THREE.MeshStandardMaterial).opacity =
            0.45 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        // Step 5: Shock button high-intensity flashing
        if (step === 5 && S.shockBtn) {
          const s = 1 + 0.25 * Math.sin(t * 5.0);
          S.shockBtn.scale.set(s, 1, s);
          (S.shockBtn.material as THREE.MeshStandardMaterial).emissive.setHex(
            Math.sin(t * 7) > 0 ? 0xff4500 : 0x330000
          );
        } else if (S.shockBtn) {
          S.shockBtn.scale.set(1, 1, 1);
          (S.shockBtn.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Window Resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pointer Interactivity (Draggable & Clickable)
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

        // Clicking the lid opens it and turns on the AED
        if (S.lidMesh && step === 0) {
          const hits = S.raycaster.intersectObject(S.lidMesh, false);
          if (hits.length > 0) {
            S.targetLidAngle = -Math.PI * 0.65;
            onAdvanceAED(1);
            return;
          }
        }

        if (step === 0 && S.powerBtn) {
          const hits = S.raycaster.intersectObject(S.powerBtn, false);
          if (hits.length > 0) {
            S.targetLidAngle = -Math.PI * 0.65;
            onAdvanceAED(1);
          }
        } else if (step === 1 && S.pad1Drag && S.pad1Target) {
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
        } else if (step === 5 && S.shockBtn) {
          const hits = S.raycaster.intersectObject(S.shockBtn, false);
          if (hits.length > 0) {
            onAdvanceAED(6);
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
          // Forgiving snap: if dragged towards patient chest (x > 0.3) or within 0.95 radius
          if (dist < 0.95 || obj.position.x > 0.3) {
            snapPad1ToTarget();
          } else {
            // Also snap if tapped
            snapPad1ToTarget();
          }
        } else if (step === 2 && obj === S.pad2Drag && S.pad2Target) {
          const targetPos = S.pad2Target.position;
          const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
          if (dist < 0.95 || obj.position.x > 0.5) {
            snapPad2ToTarget();
          } else {
            snapPad2ToTarget();
          }
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

  // Update object visibility & camera perspectives per mode
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
    if (S.cable1) S.cable1.visible = false;
    if (S.cable2) S.cable2.visible = false;

    if (mode === 'blsSceneSafety') {
      S.hazardObjects[0].position.set(-1.05, 0.25, -0.2);
      S.hazardObjects[1].position.set(1.05, 0.3, 0.35);
      S.hazardObjects[0].visible = hazardsCleared < 1;
      S.hazardObjects[1].visible = hazardsCleared < 2;
      S.camera.position.set(0, 3.8, 3.2);
      S.camera.lookAt(0, 0, 0.1);
    } else if (mode === 'blsCheckResponse') {
      if (S.shoulderTarget) S.shoulderTarget.visible = true;
      S.camera.position.set(1.8, 2.2, -1.0);
      S.camera.lookAt(1.05, 0.2, -0.4);
    } else if (mode === 'blsCallHelp') {
      S.camera.position.set(2.0, 2.4, 1.8);
      S.camera.lookAt(1.05, 0.2, 0);
    } else if (mode === 'aedScenario') {
      if (S.aedGroup) S.aedGroup.visible = true;
      if (S.bareChestMesh) S.bareChestMesh.visible = true;

      // Elevated clear perspective showing both AED device and patient chest
      S.camera.position.set(-0.15, 4.8, 2.8);
      S.camera.lookAt(-0.15, 0.35, 0);

      if (aedStep === 0) {
        // AED off, lid closed
        S.targetLidAngle = 0;
      } else {
        // AED on, lid open
        S.targetLidAngle = -Math.PI * 0.65;
        if (S.pad1Drag) S.pad1Drag.visible = true;
        if (S.pad2Drag) S.pad2Drag.visible = true;
        if (S.cable1) S.cable1.visible = true;
        if (S.cable2) S.cable2.visible = true;

        if (aedStep === 1) {
          if (S.pad1Target) S.pad1Target.visible = true;
          S.pad1Drag.position.set(-0.25, 0.44, 0.05);
        } else if (aedStep === 2) {
          if (S.pad2Target) S.pad2Target.visible = true;
          // Pad 1 stays on patient chest
          if (S.pad1Target) S.pad1Drag.position.copy(S.pad1Target.position);
          S.pad2Drag.position.set(-0.25, 0.44, 0.60);
        } else {
          // Both pads stay on patient chest
          if (S.pad1Target) S.pad1Drag.position.copy(S.pad1Target.position);
          if (S.pad2Target) S.pad2Drag.position.copy(S.pad2Target.position);
        }
      }
    }
  }, [mode, aedStep, hazardsCleared]);

  return <canvas ref={canvasRef} id="scene3d" className="fixed inset-0 w-full h-full object-cover z-[3]" />;
};
