'use strict';

/**
 * CameraController — browser port of CameraPreviewView.swift
 * - Opens the front camera via getUserMedia (mirrored preview, like the iOS app)
 * - Runs MediaPipe Pose (Vision's VNDetectHumanBodyPoseRequest equivalent)
 * - Draws the arm/joint overlays on a full-screen canvas
 */
class CameraController {
  constructor(analyzer, videoEl, canvasEl, onResult) {
    this.analyzer = analyzer;
    this.video = videoEl;
    this.canvas = canvasEl;
    this.onResult = onResult || (() => {});
    this.onError = null;

    this.stream = null;
    this.pose = null;
    this.active = false;
    this._lastTime = -1;
    this._rect = null;
    this._ctx = null;
  }

  get isCameraMode() {
    return ['sideCalibration', 'transitionSideToFront', 'frontCalibration', 'activeCPR'].includes(this.analyzer.appMode);
  }

  async start() {
    if (this.active) return;
    this.active = true;

    if (!this.stream) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        this.active = false;
        if (this.onError) this.onError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
        return;
      }
      this.video.srcObject = this.stream;
      try { await this.video.play(); } catch (e) { /* ignore */ }
      await this._ready();
    }

    if (!this.pose) {
      if (typeof Pose === 'undefined') {
        this.active = false;
        if (this.onError) this.onError('ไม่สามารถโหลดระบบวิเคราะห์ท่าทางได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)');
        return;
      }
      this.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.pose.onResults((results) => this._handleResults(results));
    }

    this.updateRect();
    this._loop();
  }

  stop() {
    this.active = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
    this._lastTime = -1;
    this._clearCanvas();
  }

  _ready() {
    return new Promise((resolve) => {
      if (this.video.readyState >= 2) return resolve();
      this.video.addEventListener('loadeddata', () => resolve(), { once: true });
    });
  }

  async _loop() {
    while (this.active) {
      if (this.video.readyState >= 2 && this.video.currentTime !== this._lastTime) {
        this._lastTime = this.video.currentTime;
        try {
          await this.pose.send({ image: this.video });
        } catch (e) {
          // frame dropped — keep looping
        }
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  _handleResults(results) {
    if (!this.active) return;
    const landmarks = (results && results.poseLandmarks && results.poseLandmarks.length) ? results.poseLandmarks : null;
    this.analyzer.processFrame(landmarks);
    this.onResult();
  }

  updateRect() {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.round(sw * dpr);
    this.canvas.height = Math.round(sh * dpr);
    this.canvas.style.width = sw + 'px';
    this.canvas.style.height = sh + 'px';
    this._ctx = this.canvas.getContext('2d');
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!vw || !vh) { this._rect = null; return; }
    const scale = Math.max(sw / vw, sh / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    this._rect = { x: (sw - dw) / 2, y: (sh - dh) / 2, w: dw, h: dh };
  }

  draw() {
    const ctx = this._ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const r = this._rect;
    if (!r) return;

    const A = this.analyzer;
    const sx = (p) => ({ x: r.x + p.x * r.w, y: r.y + (1 - p.y) * r.h });

    if (A.appMode === 'sideCalibration') {
      const s = A.visibleShoulder ? sx(A.visibleShoulder) : null;
      const e = A.visibleElbow ? sx(A.visibleElbow) : null;
      const w = A.visibleWrist ? sx(A.visibleWrist) : null;
      const hip = A.visibleHip ? sx(A.visibleHip) : null;

      if (s && e && w) {
        this._armPath([s, e, w], A.isArmStraight);
        this._joints([s, e, w]);
      }
      if (s && hip) {
        this._line(s, hip, 'rgba(0, 122, 255, 0.8)', 6);
        this._dot(hip);
      }
    } else if (A.appMode === 'frontCalibration' || A.appMode === 'activeCPR') {
      const rS = A.rightShoulder, rE = A.rightElbow, rW = A.rightWrist;
      const lS = A.leftShoulder, lE = A.leftElbow, lW = A.leftWrist;

      if (rS && rE && rW) {
        const pts = [sx(rS), sx(rE), sx(rW)];
        this._armPath(pts, A.isRightArmStraight);
        this._joints(pts);
      }
      if (lS && lE && lW) {
        const pts = [sx(lS), sx(lE), sx(lW)];
        this._armPath(pts, A.isLeftArmStraight);
        this._joints(pts);
      }
    }
  }

  _armPath(pts, straight) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.strokeStyle = straight ? '#34c759' : '#ff3b30';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  _joints(pts) {
    const ctx = this._ctx;
    ctx.fillStyle = '#ffcc00';
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _line(a, b, color, width) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  _dot(p) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
  }

  _clearCanvas() {
    const ctx = this._ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}
