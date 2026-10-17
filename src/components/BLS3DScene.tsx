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

  // References to keep Three.js state persistent across re-renders
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
    bareChestMesh: THREE.Mesh | null;
    shoulderTarget: THREE.Mesh | null;
    hazardObjects: THREE.Mesh[];
    aedGroup: THREE.Group | null;
    aedScreenMesh: THREE.Mesh | null;
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
  });

  stateRef.current.mode = mode;
  stateRef.current.aedStep = aedStep;

  // Initialize Three.js scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const S = stateRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    S.scene = scene;

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    S.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    S.renderer = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(2.5, 6, 3.5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 16, 0x334155, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    // --- Build Patient ---
    const patientGroup = new THREE.Group();
    S.patientGroup = patientGroup;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, 1.35), shirtMat);
    torso.position.set(0, 0.2, 0);
    torso.castShadow = true;
    patientGroup.add(torso);

    const bareChest = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.04, 1.22),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 })
    );
    bareChest.position.set(0, 0.38, 0);
    bareChest.visible = false;
    patientGroup.add(bareChest);
    S.bareChestMesh = bareChest;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), skinMat);
    head.position.set(0, 0.28, -0.98);
    head.castShadow = true;
    patientGroup.add(head);

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

    const ringGeo = new THREE.RingGeometry(0.18, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    const shoulderTarget = new THREE.Mesh(ringGeo, ringMat);
    shoulderTarget.rotation.x = -Math.PI / 2;
    shoulderTarget.position.set(0, 0.42, -0.45);
    shoulderTarget.userData = { type: 'shoulderTap' };
    patientGroup.add(shoulderTarget);
    S.shoulderTarget = shoulderTarget;

    scene.add(patientGroup);

    // --- Build Hazards ---
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

    // --- Build AED Model & Pads ---
    const aedGroup = new THREE.Group();
    aedGroup.position.set(1.08, 0, -0.15);
    S.aedGroup = aedGroup;

    const aedCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.24, 0.62),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
    );
    aedCase.position.y = 0.12;
    aedCase.castShadow = true;
    aedGroup.add(aedCase);

    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    scr.rotation.x = -Math.PI / 2;
    scr.position.set(0, 0.245, -0.04);
    aedGroup.add(scr);
    S.aedScreenMesh = scr;

    const pwrBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d })
    );
    pwrBtn.position.set(-0.2, 0.26, 0.17);
    pwrBtn.userData = { type: 'aedPower' };
    aedGroup.add(pwrBtn);
    S.powerBtn = pwrBtn;

    const shkBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x000000 })
    );
    shkBtn.position.set(0.2, 0.26, 0.17);
    shkBtn.userData = { type: 'aedShock' };
    aedGroup.add(shkBtn);
    S.shockBtn = shkBtn;

    const socketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x000000 })
    );
    socketMesh.position.set(-0.24, 0.25, -0.2);
    socketMesh.userData = { type: 'aedSocket' };
    aedGroup.add(socketMesh);
    S.socketMesh = socketMesh;

    scene.add(aedGroup);

    // Target outlines on patient chest
    const targetGeo = new THREE.BoxGeometry(0.26, 0.02, 0.32);
    const pad1Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, emissive: 0x0284c7 })
    );
    pad1Target.position.set(-0.24, 0.41, -0.32);
    scene.add(pad1Target);
    S.pad1Target = pad1Target;

    const pad2Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, emissive: 0x0284c7 })
    );
    pad2Target.position.set(0.3, 0.41, 0.22);
    scene.add(pad2Target);
    S.pad2Target = pad2Target;

    // Draggable pads and connector plug
    const padMeshGeo = new THREE.BoxGeometry(0.24, 0.04, 0.3);
    const pad1Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, roughness: 0.3 })
    );
    pad1Drag.userData = { type: 'dragPad1' };
    scene.add(pad1Drag);
    S.pad1Drag = pad1Drag;

    const pad2Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, roughness: 0.3 })
    );
    pad2Drag.userData = { type: 'dragPad2' };
    scene.add(pad2Drag);
    S.pad2Drag = pad2Drag;

    const plugDrag = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e, roughness: 0.3 })
    );
    plugDrag.userData = { type: 'dragPlug' };
    scene.add(plugDrag);
    S.plugDrag = plugDrag;

    // Cable lines
    const lineMat1 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
    const lineGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line1 = new THREE.Line(lineGeo1, lineMat1);
    scene.add(line1);
    S.line1 = line1;

    const lineMat2 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
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

    // Animation Loop
    const animate = () => {
      S.animId = requestAnimationFrame(animate);
      const t = performance.now() * 0.003;

      // Hazard pulsing
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

      // AED animations
      if (S.mode === 'aedScenario') {
        const step = S.aedStep;
        if (step === 0 && S.powerBtn) {
          const s = 1 + 0.22 * Math.sin(t * 3.5);
          S.powerBtn.scale.set(s, 1, s);
        } else if (S.powerBtn) {
          S.powerBtn.scale.set(1, 1, 1);
        }

        if (step === 1 && S.pad1Drag && S.pad1Target && S.draggedObject !== S.pad1Drag) {
          const s = 1 + 0.1 * Math.sin(t * 3.5);
          S.pad1Drag.scale.set(s, 1, s);
          (S.pad1Target.material as THREE.MeshStandardMaterial).opacity =
            0.35 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        if (step === 2 && S.pad2Drag && S.pad2Target && S.draggedObject !== S.pad2Drag) {
          const s = 1 + 0.1 * Math.sin(t * 3.5);
          S.pad2Drag.scale.set(s, 1, s);
          (S.pad2Target.material as THREE.MeshStandardMaterial).opacity =
            0.35 + 0.35 * Math.abs(Math.sin(t * 3));
        }

        if (step === 3 && S.plugDrag && S.socketMesh && S.draggedObject !== S.plugDrag) {
          const s = 1 + 0.16 * Math.sin(t * 3.5);
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

    // Pointer event handling
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
        } else if (step === 1 && S.pad1Drag) {
          const hits = S.raycaster.intersectObject(S.pad1Drag, false);
          if (hits.length > 0) {
            S.draggedObject = S.pad1Drag;
            sound.tick();
            try {
              canvas.setPointerCapture(ev.pointerId);
            } catch (e) {}
          }
        } else if (step === 2 && S.pad2Drag) {
          const hits = S.raycaster.intersectObject(S.pad2Drag, false);
          if (hits.length > 0) {
            S.draggedObject = S.pad2Drag;
            sound.tick();
            try {
              canvas.setPointerCapture(ev.pointerId);
            } catch (e) {}
          }
        } else if (step === 3 && S.plugDrag && S.socketMesh) {
          const hits = S.raycaster.intersectObjects([S.plugDrag, S.socketMesh], false);
          if (hits.length > 0) {
            if (hits[0].object === S.socketMesh) {
              snapPlugToSocket();
            } else {
              S.draggedObject = S.plugDrag;
              sound.tick();
              try {
                canvas.setPointerCapture(ev.pointerId);
              } catch (e) {}
            }
          }
        } else if (step === 6 && S.shockBtn) {
          const hits = S.raycaster.intersectObject(S.shockBtn, false);
          if (hits.length > 0) {
            onAdvanceAED(7);
          }
        }
      }
    };

    const snapPlugToSocket = () => {
      if (!S.socketMesh || !S.plugDrag) return;
      const socketWorld = new THREE.Vector3();
      S.socketMesh.getWorldPosition(socketWorld);
      S.plugDrag.position.set(socketWorld.x, socketWorld.y + 0.04, socketWorld.z);
      (S.plugDrag.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      updateCableLines();
      onAdvanceAED(4);
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
          if (dist < 0.48) {
            obj.position.copy(targetPos);
            obj.position.y = 0.415;
            (obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            S.pad1Target.visible = false;
            updateCableLines();
            onAdvanceAED(2);
          } else {
            obj.position.set(0.88, 0.4, 0.38);
            updateCableLines();
          }
        } else if (step === 2 && obj === S.pad2Drag && S.pad2Target) {
          const targetPos = S.pad2Target.position;
          const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
          if (dist < 0.48) {
            obj.position.copy(targetPos);
            obj.position.y = 0.415;
            (obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            S.pad2Target.visible = false;
            updateCableLines();
            onAdvanceAED(3);
          } else {
            obj.position.set(1.22, 0.4, 0.38);
            updateCableLines();
          }
        } else if (step === 3 && obj === S.plugDrag && S.socketMesh) {
          const socketWorld = new THREE.Vector3();
          S.socketMesh.getWorldPosition(socketWorld);
          const dist = Math.hypot(obj.position.x - socketWorld.x, obj.position.z - socketWorld.z);
          if (dist < 0.48) {
            snapPlugToSocket();
          } else {
            obj.position.set(0.65, 0.35, -0.45);
            updateCableLines();
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

  // Update Three.js scene objects visibility & camera position whenever mode or aedStep changes
  useEffect(() => {
    const S = stateRef.current;
    if (!S.camera) return;

    // Reset visibility defaults
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
      S.camera.position.set(0.25, 3.2, 1.55);
      S.camera.lookAt(0.25, 0.2, 0);

      // Configure AED state
      if (aedStep === 0) {
        if (S.aedScreenMesh) {
          (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0x090d16);
        }
      } else {
        if (S.pad1Drag) S.pad1Drag.visible = true;
        if (S.pad2Drag) S.pad2Drag.visible = true;
        if (S.plugDrag) S.plugDrag.visible = true;
        if (S.line1) S.line1.visible = true;
        if (S.line2) S.line2.visible = true;

        if (aedStep === 1) {
          if (S.aedScreenMesh) (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          if (S.pad1Target) S.pad1Target.visible = true;
        } else if (aedStep === 2) {
          if (S.pad2Target) S.pad2Target.visible = true;
        } else if (aedStep === 4) {
          if (S.aedScreenMesh) (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        } else if (aedStep === 5) {
          // Waiting for safety clearance
          if (S.aedScreenMesh) (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0xfbbf24);
        } else if (aedStep === 6) {
          // Safety cleared, shock ready
          if (S.aedScreenMesh) (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf97316);
        } else if (aedStep >= 7) {
          // Shock delivered
          if (S.aedScreenMesh) (S.aedScreenMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
        }
      }
    }
  }, [mode, aedStep, hazardsCleared]);

  return <canvas ref={canvasRef} id="scene3d" className="fixed inset-0 w-full h-full object-cover z-[3]" />;
};
