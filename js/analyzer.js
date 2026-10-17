'use strict';

/**
 * CPRPoseAnalyzer — Updated for AHA 2025 Layperson BLS Full Run-Through
 *
 * Modes:
 *   'mainMenu'
 *   -> 'blsSceneSafety'     (Step 1: 3D Verify Scene Safety)
 *   -> 'blsCheckResponse'   (Step 2: 3D Check Response + Voice "คุณ คุณ!")
 *   -> 'blsCallHelp'        (Step 3: 3D Call Help + Voice "โทร 1669", "มีคนหมดสติ", "ขอเครื่อง AED")
 *   -> 'sideCalibration'    (Step 4a: Camera Side Posture Check)
 *   -> 'transitionSideToFront'
 *   -> 'frontCalibration'   (Step 4b: Camera Front Arm Check)
 *   -> 'activeCPR'          (Step 5a: 2-Minute [120s] Chest Compressions)
 *   -> 'aedScenario'        (Step 5b: Interactive 3D AED Arrival & Touch/Drag/Click Operation)
 *   -> 'summary'            (Step 6: Percentage Quality Dashboard)
 */
class CPRPoseAnalyzer {
  constructor() {
    this.appMode = 'mainMenu';
    this.sessionType = 'training'; // 'training' | 'realtime'

    // MARK: - Timer & Statistics (2 minutes = 120 seconds per AHA 2025 guideline)
    this.cprDuration = 120;
    this.cprTimeRemaining = 120;
    this._sessionTimer = null;

    this.totalFrames = 0;
    this.straightArmFrames = 0;
    this.totalCompressions = 0;
    this.goodSpeedCompressions = 0;
    this.goodArmCompressions = 0;
    this.qualityCompressions = 0; // Both 100-120 CPM AND straight arms

    // MARK: - BLS & AED Step Tracking
    this.blsCompleted = {
      sceneSafety: false,
      checkResponse: false,
      callHelp: false,
      aedUsed: false,
    };

    // MARK: - Countdowns
    this.sideCountdown = 3;
    this.frontCountdown = 3;
    this._sideStartTime = null;
    this._frontStartTime = null;

    // MARK: - Front Joints
    this.isRightArmStraight = false;
    this.isLeftArmStraight = false;
    this.rightShoulder = null;
    this.rightElbow = null;
    this.rightWrist = null;
    this.leftShoulder = null;
    this.leftElbow = null;
    this.leftWrist = null;

    // MARK: - Side Joints
    this.visibleShoulder = null;
    this.visibleElbow = null;
    this.visibleWrist = null;
    this.visibleHip = null;

    // MARK: - Feedback State
    this.isArmStraight = false;
    this.isPostureGood = false;
    this.arrowDirection = null;

    this.formFeedbackText = 'กำลังค้นหาผู้ใช้งาน...';
    this.cpm = 0;
    this.speedFeedbackText = 'ความเร็ว: -';

    // MARK: - Camera Fallback Tracking
    this._lastShoulderY = 0;
    this._isPushingDown = false;
    this._compressionTimestamps = [];
    this._currentCycleMinY = 1.0;

    // MARK: - Hooks
    this.onStateChange = null;
    this.sound = { tick: () => {}, success: () => {} };
  }

  notify() {
    if (this.onStateChange) this.onStateChange();
  }

  startTrainingMode() {
    this.sessionType = 'training';
    this._resetStats();
    this.appMode = 'blsSceneSafety';
    this.notify();
  }

  startRealtimeMode() {
    this.sessionType = 'realtime';
    this._resetStats();
    this.appMode = 'activeCPR';
    this.notify();
  }

  _resetStats() {
    this.cprTimeRemaining = this.cprDuration;
    this.totalFrames = 0;
    this.straightArmFrames = 0;
    this.totalCompressions = 0;
    this.goodSpeedCompressions = 0;
    this.goodArmCompressions = 0;
    this.qualityCompressions = 0;
    this.cpm = 0;
    this.formFeedbackText = 'กำลังค้นหาผู้ใช้งาน...';
    this.speedFeedbackText = 'ความเร็ว: -';
    this._isPushingDown = false;
    this._compressionTimestamps = [];
    this.blsCompleted = {
      sceneSafety: false,
      checkResponse: false,
      callHelp: false,
      aedUsed: false,
    };
    this._clearSidePoints();
    this._clearFrontPoints();
  }

  startCPRSessionTimer() {
    if (this.sessionType !== 'training') return;
    this.cprTimeRemaining = this.cprDuration; // 120 seconds (2 minutes)
    clearInterval(this._sessionTimer);
    this._sessionTimer = setInterval(() => {
      if (this.cprTimeRemaining > 0) {
        this.cprTimeRemaining -= 1;
        this.notify();
      } else {
        clearInterval(this._sessionTimer);
        this._sessionTimer = null;
        this.sound.success();
        this.appMode = 'aedScenario';
        this.notify();
      }
    }, 1000);
  }

  getArmPercentage() {
    if (this.totalFrames === 0) return 0;
    return Math.round((this.straightArmFrames / this.totalFrames) * 100);
  }

  getSpeedPercentage() {
    if (this.totalCompressions === 0) return 0;
    return Math.round((this.goodSpeedCompressions / this.totalCompressions) * 100);
  }

  getQualityCompressionPercentage() {
    if (this.totalCompressions === 0) return 0;
    return Math.round((this.qualityCompressions / this.totalCompressions) * 100);
  }

  processFrame(landmarks) {
    if (!['sideCalibration', 'frontCalibration', 'activeCPR'].includes(this.appMode)) return;

    if (!landmarks || landmarks.length < 17) {
      this._clearPoints('กำลังค้นหาผู้ใช้งาน...');
      this.notify();
      return;
    }

    const pts = CPRPoseAnalyzer.mapLandmarks(landmarks);

    if (this.appMode === 'sideCalibration') this._runSideCalibration(pts);
    else if (this.appMode === 'frontCalibration') this._runFrontCalibration(pts);
    else if (this.appMode === 'activeCPR') this._runActiveCPR(pts);

    this.notify();
  }

  static mapLandmarks(lm) {
    const P = (i) => {
      const p = lm[i];
      if (!p) return null;
      return { x: 1 - p.x, y: 1 - p.y, conf: p.visibility != null ? p.visibility : 0 };
    };
    return {
      leftShoulder: P(11), leftElbow: P(13), leftWrist: P(15), leftHip: P(23),
      rightShoulder: P(12), rightElbow: P(14), rightWrist: P(16), rightHip: P(24),
    };
  }

  _runSideCalibration(pts) {
    const side = this._extractSideData(pts);
    const s = side.shoulder;
    const e = side.elbow;
    const w = side.wrist;

    if (!s || !e || !w) {
      this._resetSideCountdown(side.hasShoulder ? '⚠️ ขยับกล้องให้เห็นข้อมือ' : 'กรุณาหันด้านข้างเข้ากล้อง');
      this.arrowDirection = null;
      return;
    }

    this.visibleShoulder = s;
    this.visibleElbow = e;
    this.visibleWrist = w;
    this.visibleHip = side.hip;

    const isTooClose = Math.abs(s.y - w.y) > 0.80;
    this.isArmStraight = side.armAngle > 155.0;

    const xDiff = s.x - w.x;
    this.isPostureGood = Math.abs(xDiff) < 0.08;

    if (!this.isPostureGood) {
      this.arrowDirection = xDiff > 0 ? 'left' : 'right';
    } else {
      this.arrowDirection = null;
    }

    if (isTooClose) {
      this._resetSideCountdown('⚠️ ใกล้เกินไป! ถอยออกห่าง');
    } else if (!this.isArmStraight) {
      this._resetSideCountdown('กรุณาล็อกข้อศอกให้ตึง (>160°)');
    } else if (!this.isPostureGood) {
      this._resetSideCountdown('โถมตัวตามลูกศร ให้ \'ไหล่ตรงข้อมือ\'');
    } else {
      this.formFeedbackText = 'ท่าทางถูกต้อง! ค้างไว้...';
      if (this._sideStartTime === null) {
        this._sideStartTime = Date.now();
        this.sideCountdown = 3;
        this.sound.tick();
      }

      const elapsed = (Date.now() - this._sideStartTime) / 1000.0;
      const remaining = Math.max(0, Math.ceil(3.0 - elapsed));

      if (remaining !== this.sideCountdown) {
        this.sideCountdown = remaining;
        if (remaining > 0) this.sound.tick();
        else if (remaining === 0) this.sound.success();
      }

      if (elapsed >= 3.0) {
        this.appMode = 'transitionSideToFront';
        this._sideStartTime = null;
        this.arrowDirection = null;
        this._clearSidePoints();
      }
    }
  }

  _runFrontCalibration(pts) {
    const rShoulder = pts.leftShoulder;
    const rElbow = pts.leftElbow;
    const rWrist = pts.leftWrist;
    const lShoulder = pts.rightShoulder;
    const lElbow = pts.rightElbow;
    const lWrist = pts.rightWrist;

    if (!rShoulder || !rElbow || !rWrist || !lShoulder || !lElbow || !lWrist ||
        rShoulder.conf <= 0.15 || rElbow.conf <= 0.15 || rWrist.conf <= 0.15 ||
        lShoulder.conf <= 0.15 || lElbow.conf <= 0.15 || lWrist.conf <= 0.15) {
      this._resetFrontCountdown('กรุณาหันหน้าเข้ากล้องและเหยียดแขน');
      return;
    }

    const rAngle = this._calculateAngle(rShoulder, rElbow, rWrist);
    const lAngle = this._calculateAngle(lShoulder, lElbow, lWrist);

    this.rightShoulder = rShoulder;
    this.rightElbow = rElbow;
    this.rightWrist = rWrist;
    this.leftShoulder = lShoulder;
    this.leftElbow = lElbow;
    this.leftWrist = lWrist;

    this.isRightArmStraight = rAngle > 150.0;
    this.isLeftArmStraight = lAngle > 150.0;

    if (this.isRightArmStraight && this.isLeftArmStraight) {
      this.formFeedbackText = 'แขนตึงคู่! ค้างไว้...';
      if (this._frontStartTime === null) {
        this._frontStartTime = Date.now();
        this.frontCountdown = 3;
        this.sound.tick();
      }

      const elapsed = (Date.now() - this._frontStartTime) / 1000.0;
      const remaining = Math.max(0, Math.ceil(3.0 - elapsed));

      if (remaining !== this.frontCountdown) {
        this.frontCountdown = remaining;
        if (remaining > 0) this.sound.tick();
        else if (remaining === 0) this.sound.success();
      }

      if (elapsed >= 3.0) {
        this.appMode = 'activeCPR';
        this._frontStartTime = null;
        this.arrowDirection = null;
        this.startCPRSessionTimer();
      }
    } else {
      this._resetFrontCountdown('กรุณาล็อกข้อศอกทั้งสองข้างให้ตรง');
    }
  }

  _runActiveCPR(pts) {
    const rShoulder = pts.leftShoulder;
    const rElbow = pts.leftElbow;
    const rWrist = pts.leftWrist;
    const lShoulder = pts.rightShoulder;
    const lElbow = pts.rightElbow;
    const lWrist = pts.rightWrist;

    if (!rShoulder || !rElbow || !rWrist || !lShoulder || !lElbow || !lWrist ||
        rShoulder.conf <= 0.15 || rElbow.conf <= 0.15 || rWrist.conf <= 0.15 ||
        lShoulder.conf <= 0.15 || lElbow.conf <= 0.15 || lWrist.conf <= 0.15) {
      this._clearPoints('กำลังค้นหาผู้ใช้งาน (หันหน้าเข้ากล้อง)');
      return;
    }

    const rAngle = this._calculateAngle(rShoulder, rElbow, rWrist);
    const lAngle = this._calculateAngle(lShoulder, lElbow, lWrist);
    const midShoulderY = (rShoulder.y + lShoulder.y) / 2.0;

    this.rightShoulder = rShoulder;
    this.rightElbow = rElbow;
    this.rightWrist = rWrist;
    this.leftShoulder = lShoulder;
    this.leftElbow = lElbow;
    this.leftWrist = lWrist;

    this.isRightArmStraight = rAngle > 150.0;
    this.isLeftArmStraight = lAngle > 150.0;
    this.isArmStraight = this.isRightArmStraight && this.isLeftArmStraight;
    this.formFeedbackText = this.isArmStraight ? 'แขนตึง: ยอดเยี่ยมทั้งสองข้าง' : '⚠️ แขนงอ! กรุณาล็อกข้อศอก';

    if (this.sessionType === 'training') {
      this.totalFrames += 1;
      if (this.isArmStraight) this.straightArmFrames += 1;
    }

    this._detectCompressionFront(midShoulderY);
  }

  _detectCompressionFront(currentShoulderY) {
    const movementThreshold = 0.005;
    const now = Date.now();

    const lastPush = this._compressionTimestamps[this._compressionTimestamps.length - 1];
    if (lastPush !== undefined && (now - lastPush) / 1000.0 > 2.0) {
      this._compressionTimestamps = [];
      this.cpm = 0;
      this.speedFeedbackText = 'ความเร็ว: หยุดนิ่ง';
      this._isPushingDown = false;
    }

    if (currentShoulderY < this._lastShoulderY - movementThreshold && !this._isPushingDown) {
      this._isPushingDown = true;
      this._currentCycleMinY = currentShoulderY;
    } else if (this._isPushingDown) {
      if (currentShoulderY < this._currentCycleMinY) this._currentCycleMinY = currentShoulderY;

      if (currentShoulderY > this._currentCycleMinY + movementThreshold) {
        this._isPushingDown = false;
        this._compressionTimestamps.push(now);

        if (this.sessionType === 'training') {
          this.totalCompressions += 1;
          if (this.isArmStraight) this.goodArmCompressions += 1;
        }

        if (this._compressionTimestamps.length > 5) this._compressionTimestamps.shift();
        if (this._compressionTimestamps.length >= 2) {
          const timeDiff = (this._compressionTimestamps[this._compressionTimestamps.length - 1] -
                           this._compressionTimestamps[0]) / 1000.0;
          const count = this._compressionTimestamps.length - 1;
          this.cpm = Math.round((count / timeDiff) * 60.0);

          const isSpeedGood = this.cpm >= 100 && this.cpm <= 120;
          if (this.cpm < 100) this.speedFeedbackText = this.cpm + ' CPM (ช้าไป)';
          else if (this.cpm > 120) this.speedFeedbackText = this.cpm + ' CPM (เร็วไป)';
          else {
            this.speedFeedbackText = this.cpm + ' CPM (เยี่ยม)';
          }

          if (this.sessionType === 'training') {
            if (isSpeedGood) this.goodSpeedCompressions += 1;
            if (isSpeedGood && this.isArmStraight) this.qualityCompressions += 1;
          }
        }
      }
    }
    this._lastShoulderY = currentShoulderY;
  }

  resetToMainMenu() {
    clearInterval(this._sessionTimer);
    this._sessionTimer = null;
    this.appMode = 'mainMenu';
    this.sideCountdown = 3;
    this.frontCountdown = 3;
    this._sideStartTime = null;
    this._frontStartTime = null;
    this._resetStats();
    this.arrowDirection = null;
    this._clearSidePoints();
    this._clearFrontPoints();
    this.notify();
  }

  _extractSideData(pts) {
    const leftConf = (pts.leftShoulder ? pts.leftShoulder.conf : 0) + (pts.leftElbow ? pts.leftElbow.conf : 0);
    const rightConf = (pts.rightShoulder ? pts.rightShoulder.conf : 0) + (pts.rightElbow ? pts.rightElbow.conf : 0);
    let leftSize = 0;
    let rightSize = 0;
    if (pts.leftShoulder && pts.leftElbow) {
      leftSize = Math.hypot(pts.leftShoulder.x - pts.leftElbow.x, pts.leftShoulder.y - pts.leftElbow.y);
    }
    if (pts.rightShoulder && pts.rightElbow) {
      rightSize = Math.hypot(pts.rightShoulder.x - pts.rightElbow.x, pts.rightShoulder.y - pts.rightElbow.y);
    }

    const isLeftCloser = (leftConf + leftSize * 5.0) > (rightConf + rightSize * 5.0);

    const shoulder = isLeftCloser ? pts.leftShoulder : pts.rightShoulder;
    const elbow = isLeftCloser ? pts.leftElbow : pts.rightElbow;
    const wrist = isLeftCloser ? pts.leftWrist : pts.rightWrist;

    if (!shoulder || !elbow || !wrist ||
        shoulder.conf <= 0.15 || elbow.conf <= 0.15 || wrist.conf <= 0.15) {
      return { shoulder: null, elbow: null, wrist: null, hip: null, armAngle: 0, hasShoulder: leftConf > 0.15 || rightConf > 0.15 };
    }

    const hip = isLeftCloser ? pts.leftHip : pts.rightHip;
    const armAngle = this._calculateAngle(shoulder, elbow, wrist);
    return {
      shoulder: shoulder,
      elbow: elbow,
      wrist: wrist,
      hip: (hip && hip.conf > 0.15) ? hip : null,
      armAngle: armAngle,
      hasShoulder: true,
    };
  }

  _calculateAngle(first, mid, last) {
    const dx1 = first.x - mid.x;
    const dy1 = first.y - mid.y;
    const dx2 = last.x - mid.x;
    const dy2 = last.y - mid.y;
    const dot = (dx1 * dx2) + (dy1 * dy2);
    const mag1 = Math.hypot(dx1, dy1);
    const mag2 = Math.hypot(dx2, dy2);
    return Math.acos(Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)))) * 180.0 / Math.PI;
  }

  _resetSideCountdown(message) {
    this._sideStartTime = null;
    this.sideCountdown = 3;
    this.formFeedbackText = message;
    this.arrowDirection = null;
  }

  _resetFrontCountdown(message) {
    this._frontStartTime = null;
    this.frontCountdown = 3;
    this.formFeedbackText = message;
  }

  _clearPoints(message) {
    this._clearSidePoints();
    this._clearFrontPoints();
    this.formFeedbackText = message;
  }

  _clearSidePoints() {
    this.visibleShoulder = null;
    this.visibleElbow = null;
    this.visibleWrist = null;
    this.visibleHip = null;
  }

  _clearFrontPoints() {
    this.rightShoulder = null;
    this.rightElbow = null;
    this.rightWrist = null;
    this.leftShoulder = null;
    this.leftElbow = null;
    this.leftWrist = null;
  }
}
