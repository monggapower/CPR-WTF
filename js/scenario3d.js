'use strict';

/**
 * BLSScenario3D — Interactive Three.js 3D Environment
 *
 * Interaction Modes:
 *   1. blsSceneSafety   : Touch/Click or Drag 3D hazards away from the patient
 *   2. blsCheckResponse : Touch/Click patient's shoulders in 3D + Voice Recognition ("คุณ คุณ!")
 *   3. blsCallHelp      : Voice Recognition ("โทร 1669", "มีคนหมดสติ", "ขอเครื่อง AED")
 *   5. aedScenario      : Pure Touch-Screen / Pointer Drag-and-Drop & Click on 3D AED Model (NO Voice):
 *        - Substep 0 (Click) : Tap/Click Green Power Button on 3D AED
 *        - Substep 1 (Drag)  : Drag Pad #1 from AED tray onto Right Upper Chest target
 *        - Substep 2 (Drag)  : Drag Pad #2 from AED tray onto Left Lower Chest target
 *        - Substep 3 (Drag/Click) : Drag Pad Connector Plug into AED Socket -> Auto-analyzes rhythm
 *        - Substep 5 (Click) : Tap/Click Flashing Orange SHOCK Button on 3D AED
 */
class BLSScenario3D {
  constructor(canvasEl, analyzer, sound, onStepUpdate) {
    this.canvas = canvasEl;
    this.analyzer = analyzer;
    this.sound = sound;
    this.onStepUpdate = onStepUpdate || (() => {});

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.40);
    this.dragIntersectPoint = new THREE.Vector3();

    this._animId = null;
    this.active = false;

    this.patientGroup = null;
    this.hazardObjects = [];
    this.shoulderTarget = null;
    this.aedGroup = null;
    this.aedInteractiveMeshes = {};
    this.chestPadTargets = {};
    this.draggablePads = {};
    this.cableLines = {};

    this.draggedObject = null;

    this.hazardsCleared = 0;
    this.totalHazards = 2;
    this.shoulderTapped = false;
    this.voiceResponsePassed = false;
    this.callKeywords = {
      call1669: false,
      unconscious: false,
      requestAED: false,
    };

    this.aedStep = 0;
    this._aedTimer = null;

    this.recognition = null;
    this.isListening = false;
    this.lastTranscript = '';
    this._initSpeechRecognition();

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onResize = this.resize.bind(this);
  }

  _initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.lang = 'th-TH';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.lastTranscript = transcript.trim();
      this._evaluateSpeech(this.lastTranscript);
      this.onStepUpdate();
    };

    this.recognition.onerror = () => {
      this.isListening = false;
      this.onStepUpdate();
    };

    this.recognition.onend = () => {
      if (this.active && ['blsCheckResponse', 'blsCallHelp'].includes(this.analyzer.appMode)) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (e) {
          this.isListening = false;
        }
      } else {
        this.isListening = false;
      }
      this.onStepUpdate();
    };
  }

  startListening() {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) { /* already started */ }
    this.onStepUpdate();
  }

  stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) { /* ignore */ }
    this.isListening = false;
  }

  _evaluateSpeech(text) {
    const norm = text.replace(/\s+/g, '').toLowerCase();
    const mode = this.analyzer.appMode;

    if (mode === 'blsCheckResponse') {
      if (norm.includes('คุณคุณ') || (text.match(/คุณ/g) || []).length >= 2 || norm.includes('คุณครับ') || norm.includes('คุณคะ')) {
        this.completeCheckResponse();
      }
    } else if (mode === 'blsCallHelp') {
      let updated = false;
      if (!this.callKeywords.call1669 && (norm.includes('โทร1669') || norm.includes('1669'))) {
        this.callKeywords.call1669 = true;
        updated = true;
      }
      if (!this.callKeywords.unconscious && (norm.includes('มีคนหมดสติ') || norm.includes('คนหมดสติ') || norm.includes('หมดสติ'))) {
        this.callKeywords.unconscious = true;
        updated = true;
      }
      if (!this.callKeywords.requestAED && (norm.includes('ขอเครื่องaed') || norm.includes('เครื่องaed') || norm.includes('aed') || norm.includes('เออีดี'))) {
        this.callKeywords.requestAED = true;
        updated = true;
      }
      if (updated) {
        this.sound.tick();
        this.onStepUpdate();
      }
      if (this.callKeywords.call1669 && this.callKeywords.unconscious && this.callKeywords.requestAED) {
        this.completeCallHelp();
      }
    }
  }

  start(mode) {
    if (!this.renderer) this._initThree();
    this.active = true;
    this.canvas.classList.remove('hidden');
    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);

    this.configureForMode(mode);
    this.resize();
    this._animate();
  }

  stop() {
    this.active = false;
    this.draggedObject = null;
    this.stopListening();
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    clearTimeout(this._aedTimer);
    this.canvas.classList.add('hidden');
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2.5, 6, 3.5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(16, 16, 0x334155, 0x334155);
    grid.position.y = 0.01;
    this.scene.add(grid);

    this._buildPatientModel();
    this._buildHazards();
    this._buildAEDModel();
  }

  _buildPatientModel() {
    this.patientGroup = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, 1.35), shirtMat);
    torso.position.set(0, 0.20, 0);
    torso.castShadow = true;
    this.patientGroup.add(torso);

    const bareChest = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.04, 1.22),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 })
    );
    bareChest.position.set(0, 0.38, 0);
    bareChest.visible = false;
    this.patientGroup.add(bareChest);
    this.bareChestMesh = bareChest;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), skinMat);
    head.position.set(0, 0.28, -0.98);
    head.castShadow = true;
    this.patientGroup.add(head);

    const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 1.1, 16);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.rotation.x = Math.PI / 2;
    leftArm.position.set(0.65, 0.16, 0.05);
    this.patientGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.rotation.x = Math.PI / 2;
    rightArm.position.set(-0.65, 0.16, 0.05);
    this.patientGroup.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 1.35, 16);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.rotation.x = Math.PI / 2;
    leftLeg.position.set(0.24, 0.16, 1.35);
    this.patientGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.rotation.x = Math.PI / 2;
    rightLeg.position.set(-0.24, 0.16, 1.35);
    this.patientGroup.add(rightLeg);

    const ringGeo = new THREE.RingGeometry(0.18, 0.30, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    this.shoulderTarget = new THREE.Mesh(ringGeo, ringMat);
    this.shoulderTarget.rotation.x = -Math.PI / 2;
    this.shoulderTarget.position.set(0, 0.42, -0.45);
    this.shoulderTarget.userData = { type: 'shoulderTap' };
    this.patientGroup.add(this.shoulderTarget);

    this.scene.add(this.patientGroup);
  }

  _buildHazards() {
    this.hazardObjects = [];
    const h1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d })
    );
    h1.rotation.z = Math.PI / 3;
    h1.position.set(-1.05, 0.25, -0.2);
    h1.userData = { type: 'hazard', id: 1 };
    this.scene.add(h1);
    this.hazardObjects.push(h1);

    const h2 = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.30, 0),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12 })
    );
    h2.position.set(1.05, 0.30, 0.35);
    h2.userData = { type: 'hazard', id: 2 };
    this.scene.add(h2);
    this.hazardObjects.push(h2);
  }

  _buildAEDModel() {
    this.aedGroup = new THREE.Group();
    this.aedGroup.position.set(1.08, 0, -0.15);

    const aedCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.24, 0.62),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
    );
    aedCase.position.y = 0.12;
    aedCase.castShadow = true;
    this.aedGroup.add(aedCase);

    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    scr.rotation.x = -Math.PI / 2;
    scr.position.set(0, 0.245, -0.04);
    this.aedGroup.add(scr);
    this.aedScreenMesh = scr;

    const pwrBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d })
    );
    pwrBtn.position.set(-0.20, 0.26, 0.17);
    pwrBtn.userData = { type: 'aedPower' };
    this.aedGroup.add(pwrBtn);
    this.aedInteractiveMeshes.powerBtn = pwrBtn;

    const shkBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x000000 })
    );
    shkBtn.position.set(0.20, 0.26, 0.17);
    shkBtn.userData = { type: 'aedShock' };
    this.aedGroup.add(shkBtn);
    this.aedInteractiveMeshes.shockBtn = shkBtn;

    const socketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x000000 })
    );
    socketMesh.position.set(-0.24, 0.25, -0.20);
    socketMesh.userData = { type: 'aedSocket' };
    this.aedGroup.add(socketMesh);
    this.aedInteractiveMeshes.socket = socketMesh;

    this.scene.add(this.aedGroup);

    const targetGeo = new THREE.BoxGeometry(0.26, 0.02, 0.32);

    const pad1Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, emissive: 0x0284c7 })
    );
    pad1Target.position.set(-0.24, 0.41, -0.32);
    this.scene.add(pad1Target);
    this.chestPadTargets.pad1 = pad1Target;

    const pad2Target = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, emissive: 0x0284c7 })
    );
    pad2Target.position.set(0.30, 0.41, 0.22);
    this.scene.add(pad2Target);
    this.chestPadTargets.pad2 = pad2Target;

    const padMeshGeo = new THREE.BoxGeometry(0.24, 0.04, 0.30);

    const pad1Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, roughness: 0.3 })
    );
    pad1Drag.userData = { type: 'dragPad1' };
    this.scene.add(pad1Drag);
    this.draggablePads.pad1 = pad1Drag;

    const pad2Drag = new THREE.Mesh(
      padMeshGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0ea5e9, roughness: 0.3 })
    );
    pad2Drag.userData = { type: 'dragPad2' };
    this.scene.add(pad2Drag);
    this.draggablePads.pad2 = pad2Drag;

    const plugDrag = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e, roughness: 0.3 })
    );
    plugDrag.userData = { type: 'dragPlug' };
    this.scene.add(plugDrag);
    this.draggablePads.plug = plugDrag;

    const lineMat1 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
    const lineGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.cableLines.line1 = new THREE.Line(lineGeo1, lineMat1);
    this.scene.add(this.cableLines.line1);

    const lineMat2 = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
    const lineGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.cableLines.line2 = new THREE.Line(lineGeo2, lineMat2);
    this.scene.add(this.cableLines.line2);
  }

  _updateCableLines() {
    if (!this.cableLines.line1 || !this.cableLines.line2) return;
    const plugPos = this.draggablePads.plug.position;
    const p1Pos = this.draggablePads.pad1.position;
    const p2Pos = this.draggablePads.pad2.position;

    this.cableLines.line1.geometry.setFromPoints([
      new THREE.Vector3(p1Pos.x, p1Pos.y + 0.02, p1Pos.z),
      new THREE.Vector3(plugPos.x, plugPos.y + 0.02, plugPos.z),
    ]);
    this.cableLines.line2.geometry.setFromPoints([
      new THREE.Vector3(p2Pos.x, p2Pos.y + 0.02, p2Pos.z),
      new THREE.Vector3(plugPos.x, plugPos.y + 0.02, plugPos.z),
    ]);
  }

  configureForMode(mode) {
    clearTimeout(this._aedTimer);
    this.lastTranscript = '';
    this.draggedObject = null;

    this.hazardObjects.forEach((h) => { h.visible = false; });
    this.shoulderTarget.visible = false;
    this.aedGroup.visible = false;
    this.bareChestMesh.visible = false;
    this.chestPadTargets.pad1.visible = false;
    this.chestPadTargets.pad2.visible = false;
    this.draggablePads.pad1.visible = false;
    this.draggablePads.pad2.visible = false;
    this.draggablePads.plug.visible = false;
    this.cableLines.line1.visible = false;
    this.cableLines.line2.visible = false;

    if (mode === 'blsSceneSafety') {
      this.stopListening();
      this.hazardsCleared = 0;
      this.hazardObjects[0].position.set(-1.05, 0.25, -0.2);
      this.hazardObjects[1].position.set(1.05, 0.30, 0.35);
      this.hazardObjects.forEach((h) => { h.visible = true; });
      this.camera.position.set(0, 3.8, 3.2);
      this.camera.lookAt(0, 0, 0.1);
    } else if (mode === 'blsCheckResponse') {
      this.shoulderTapped = false;
      this.voiceResponsePassed = false;
      this.shoulderTarget.visible = true;
      this.camera.position.set(0.9, 2.2, -1.2);
      this.camera.lookAt(0, 0.2, -0.5);
      this.startListening();
    } else if (mode === 'blsCallHelp') {
      this.callKeywords = { call1669: false, unconscious: false, requestAED: false };
      this.camera.position.set(1.4, 2.4, 1.8);
      this.camera.lookAt(0, 0.2, 0);
      this.startListening();
    } else if (mode === 'aedScenario') {
      this.stopListening();
      this.aedStep = 0;
      this.aedGroup.visible = true;
      this.bareChestMesh.visible = true;
      this.aedScreenMesh.material.color.setHex(0x090d16);

      this.draggablePads.pad1.position.set(0.88, 0.40, 0.38);
      this.draggablePads.pad1.material.emissive.setHex(0x0ea5e9);
      this.draggablePads.pad2.position.set(1.22, 0.40, 0.38);
      this.draggablePads.pad2.material.emissive.setHex(0x0ea5e9);
      this.draggablePads.plug.position.set(0.65, 0.35, -0.45);
      this.draggablePads.plug.material.emissive.setHex(0x854d0e);
      this._updateCableLines();

      this.camera.position.set(0.35, 2.85, 1.15);
      this.camera.lookAt(0.35, 0.2, -0.05);
    }
    this.onStepUpdate();
  }

  _updateMouseNDC(ev) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  _handlePointerDown(ev) {
    if (!this.active) return;
    this._updateMouseNDC(ev);
    const mode = this.analyzer.appMode;

    if (mode === 'blsSceneSafety') {
      const visibleHazards = this.hazardObjects.filter((h) => h.visible);
      const hits = this.raycaster.intersectObjects(visibleHazards, false);
      if (hits.length > 0) {
        this.draggedObject = hits[0].object;
        this.sound.tick();
      }
    } else if (mode === 'blsCheckResponse') {
      const hits = this.raycaster.intersectObject(this.shoulderTarget, false);
      if (hits.length > 0) {
        this.shoulderTapped = true;
        this.sound.tick();
        this.onStepUpdate();
      }
    } else if (mode === 'aedScenario') {
      this._handleAEDPointerDown(ev);
    }
  }

  _handleAEDPointerDown(ev) {
    if (this.aedStep === 0) {
      const hits = this.raycaster.intersectObject(this.aedInteractiveMeshes.powerBtn, false);
      if (hits.length > 0) {
        this.advanceAEDStep(1);
      }
    } else if (this.aedStep === 1) {
      const hits = this.raycaster.intersectObject(this.draggablePads.pad1, false);
      if (hits.length > 0) {
        this.draggedObject = this.draggablePads.pad1;
        this.sound.tick();
        if (this.canvas.setPointerCapture && ev.pointerId != null) {
          try { this.canvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
      }
    } else if (this.aedStep === 2) {
      const hits = this.raycaster.intersectObject(this.draggablePads.pad2, false);
      if (hits.length > 0) {
        this.draggedObject = this.draggablePads.pad2;
        this.sound.tick();
        if (this.canvas.setPointerCapture && ev.pointerId != null) {
          try { this.canvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
      }
    } else if (this.aedStep === 3) {
      const hits = this.raycaster.intersectObjects(
        [this.draggablePads.plug, this.aedInteractiveMeshes.socket],
        false
      );
      if (hits.length > 0) {
        if (hits[0].object === this.aedInteractiveMeshes.socket) {
          this._snapPlugToSocket();
        } else {
          this.draggedObject = this.draggablePads.plug;
          this.sound.tick();
          if (this.canvas.setPointerCapture && ev.pointerId != null) {
            try { this.canvas.setPointerCapture(ev.pointerId); } catch (e) {}
          }
        }
      }
    } else if (this.aedStep === 5) {
      const hits = this.raycaster.intersectObject(this.aedInteractiveMeshes.shockBtn, false);
      if (hits.length > 0) {
        this.advanceAEDStep(6);
      }
    }
  }

  _handlePointerMove(ev) {
    if (!this.active || !this.draggedObject) return;
    this._updateMouseNDC(ev);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersectPoint)) {
      this.draggedObject.position.x = this.dragIntersectPoint.x;
      this.draggedObject.position.z = this.dragIntersectPoint.z;
      this.draggedObject.position.y = 0.44;

      if (this.analyzer.appMode === 'aedScenario') {
        this._updateCableLines();
      }
    }
  }

  _handlePointerUp(ev) {
    if (!this.active || !this.draggedObject) return;
    const obj = this.draggedObject;
    this.draggedObject = null;

    if (this.canvas.releasePointerCapture && ev && ev.pointerId != null) {
      try { this.canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
    }

    const mode = this.analyzer.appMode;

    if (mode === 'blsSceneSafety' && obj.userData.type === 'hazard') {
      obj.visible = false;
      this.hazardsCleared += 1;
      this.sound.tick();
      if (this.hazardsCleared >= this.totalHazards) {
        this.completeSceneSafety();
      }
      this.onStepUpdate();
      return;
    }

    if (mode === 'aedScenario') {
      if (this.aedStep === 1 && obj === this.draggablePads.pad1) {
        const targetPos = this.chestPadTargets.pad1.position;
        const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
        if (dist < 0.48) {
          obj.position.copy(targetPos);
          obj.position.y = 0.415;
          obj.material.emissive.setHex(0x000000);
          this.chestPadTargets.pad1.visible = false;
          this._updateCableLines();
          this.advanceAEDStep(2);
        } else {
          obj.position.set(0.88, 0.40, 0.38);
          this._updateCableLines();
        }
      } else if (this.aedStep === 2 && obj === this.draggablePads.pad2) {
        const targetPos = this.chestPadTargets.pad2.position;
        const dist = Math.hypot(obj.position.x - targetPos.x, obj.position.z - targetPos.z);
        if (dist < 0.48) {
          obj.position.copy(targetPos);
          obj.position.y = 0.415;
          obj.material.emissive.setHex(0x000000);
          this.chestPadTargets.pad2.visible = false;
          this._updateCableLines();
          this.advanceAEDStep(3);
        } else {
          obj.position.set(1.22, 0.40, 0.38);
          this._updateCableLines();
        }
      } else if (this.aedStep === 3 && obj === this.draggablePads.plug) {
        const socketWorld = new THREE.Vector3();
        this.aedInteractiveMeshes.socket.getWorldPosition(socketWorld);
        const dist = Math.hypot(obj.position.x - socketWorld.x, obj.position.z - socketWorld.z);
        if (dist < 0.48) {
          this._snapPlugToSocket();
        } else {
          obj.position.set(0.65, 0.35, -0.45);
          this._updateCableLines();
        }
      }
    }
  }

  _snapPlugToSocket() {
    const socketWorld = new THREE.Vector3();
    this.aedInteractiveMeshes.socket.getWorldPosition(socketWorld);
    this.draggablePads.plug.position.set(socketWorld.x, socketWorld.y + 0.04, socketWorld.z);
    this.draggablePads.plug.material.emissive.setHex(0x000000);
    this._updateCableLines();
    this.advanceAEDStep(4);
  }

  advanceAEDStep(nextStep) {
    this.aedStep = nextStep;
    this.sound.tick();

    if (nextStep === 1) {
      this.aedScreenMesh.material.color.setHex(0x22c55e);
      this.draggablePads.pad1.visible = true;
      this.draggablePads.pad2.visible = true;
      this.draggablePads.plug.visible = true;
      this.cableLines.line1.visible = true;
      this.cableLines.line2.visible = true;
      this.chestPadTargets.pad1.visible = true;
      this._updateCableLines();
    } else if (nextStep === 2) {
      this.sound.success();
      this.chestPadTargets.pad2.visible = true;
    } else if (nextStep === 3) {
      this.sound.success();
    } else if (nextStep === 4) {
      this.sound.success();
      this.aedScreenMesh.material.color.setHex(0x38bdf8);
      this._aedTimer = setTimeout(() => {
        this.advanceAEDStep(5);
      }, 3000);
    } else if (nextStep === 5) {
      this.sound.success();
      this.aedScreenMesh.material.color.setHex(0xf97316);
    } else if (nextStep === 6) {
      this.sound.success();
      this.analyzer.blsCompleted.aedUsed = true;
      this.aedScreenMesh.material.color.setHex(0x22c55e);
      this._aedTimer = setTimeout(() => {
        this.analyzer.appMode = 'summary';
        this.analyzer.notify();
      }, 1800);
    }
    this.onStepUpdate();
  }

  completeSceneSafety() {
    this.hazardObjects.forEach((h) => { h.visible = false; });
    this.hazardsCleared = this.totalHazards;
    this.analyzer.blsCompleted.sceneSafety = true;
    this.sound.success();
    this.onStepUpdate();
    setTimeout(() => {
      if (this.analyzer.appMode === 'blsSceneSafety') {
        this.analyzer.appMode = 'blsCheckResponse';
        this.analyzer.notify();
      }
    }, 800);
  }

  completeCheckResponse() {
    if (this.voiceResponsePassed) return;
    this.shoulderTapped = true;
    this.voiceResponsePassed = true;
    this.analyzer.blsCompleted.checkResponse = true;
    this.sound.success();
    this.onStepUpdate();
    setTimeout(() => {
      if (this.analyzer.appMode === 'blsCheckResponse') {
        this.analyzer.appMode = 'blsCallHelp';
        this.analyzer.notify();
      }
    }, 800);
  }

  completeCallHelp() {
    this.callKeywords = { call1669: true, unconscious: true, requestAED: true };
    this.analyzer.blsCompleted.callHelp = true;
    this.stopListening();
    this.sound.success();
    this.onStepUpdate();
    setTimeout(() => {
      if (this.analyzer.appMode === 'blsCallHelp') {
        this.analyzer.appMode = 'sideCalibration';
        this.analyzer.notify();
      }
    }, 900);
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    if (!this.active) return;
    this._animId = requestAnimationFrame(() => this._animate());

    const t = performance.now() * 0.003;

    this.hazardObjects.forEach((h, idx) => {
      if (h.visible && this.draggedObject !== h) {
        h.rotation.y = t + idx;
        const s = 1 + 0.12 * Math.sin(t * 2 + idx);
        h.scale.set(s, s, s);
      }
    });

    if (this.shoulderTarget && this.shoulderTarget.visible) {
      const s = 1 + 0.18 * Math.sin(t * 2.5);
      this.shoulderTarget.scale.set(s, s, 1);
    }

    if (this.analyzer.appMode === 'aedScenario') {
      if (this.aedStep === 0) {
        const s = 1 + 0.22 * Math.sin(t * 3.5);
        this.aedInteractiveMeshes.powerBtn.scale.set(s, 1, s);
      } else {
        this.aedInteractiveMeshes.powerBtn.scale.set(1, 1, 1);
      }

      if (this.aedStep === 1 && this.draggedObject !== this.draggablePads.pad1) {
        const s = 1 + 0.10 * Math.sin(t * 3.5);
        this.draggablePads.pad1.scale.set(s, 1, s);
        this.chestPadTargets.pad1.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 3));
      } else {
        this.draggablePads.pad1.scale.set(1, 1, 1);
      }

      if (this.aedStep === 2 && this.draggedObject !== this.draggablePads.pad2) {
        const s = 1 + 0.10 * Math.sin(t * 3.5);
        this.draggablePads.pad2.scale.set(s, 1, s);
        this.chestPadTargets.pad2.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 3));
      } else {
        this.draggablePads.pad2.scale.set(1, 1, 1);
      }

      if (this.aedStep === 3 && this.draggedObject !== this.draggablePads.plug) {
        const s = 1 + 0.16 * Math.sin(t * 3.5);
        this.draggablePads.plug.scale.set(s, 1, s);
        this.aedInteractiveMeshes.socket.material.emissive.setHex(Math.sin(t * 5) > 0 ? 0xfacc15 : 0x1e293b);
      } else {
        this.draggablePads.plug.scale.set(1, 1, 1);
        this.aedInteractiveMeshes.socket.material.emissive.setHex(0x000000);
      }

      if (this.aedStep === 5) {
        const s = 1 + 0.25 * Math.sin(t * 4.5);
        this.aedInteractiveMeshes.shockBtn.scale.set(s, 1, s);
        this.aedInteractiveMeshes.shockBtn.material.emissive.setHex(Math.sin(t * 6) > 0 ? 0xff5500 : 0x220000);
      } else {
        this.aedInteractiveMeshes.shockBtn.scale.set(1, 1, 1);
        this.aedInteractiveMeshes.shockBtn.material.emissive.setHex(0x000000);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
