import { AppMode, BLSCompleted, Point2D, PoseLandmarks, SessionType } from '../types';
import { SoundFX } from './sound';

export class CPRPoseAnalyzer {
  public appMode: AppMode = 'mainMenu';
  public sessionType: SessionType = 'training';

  // Timer & Statistics (2 minutes = 120 seconds per AHA 2025 guideline)
  public cprDuration: number = 120;
  public cprTimeRemaining: number = 120;
  private sessionTimer: number | null = null;

  public totalFrames: number = 0;
  public straightArmFrames: number = 0;
  public totalCompressions: number = 0;
  public goodSpeedCompressions: number = 0;
  public goodArmCompressions: number = 0;
  public qualityCompressions: number = 0; // Both 100-120 CPM AND straight arms

  // BLS & AED Step Tracking
  public blsCompleted: BLSCompleted = {
    sceneSafety: false,
    checkResponse: false,
    callHelp: false,
    aedUsed: false,
  };

  // Countdowns
  public sideCountdown: number = 3;
  public frontCountdown: number = 3;
  private sideStartTime: number | null = null;
  private frontStartTime: number | null = null;

  // Front Joints
  public isRightArmStraight: boolean = false;
  public isLeftArmStraight: boolean = false;
  public rightShoulder: Point2D | null = null;
  public rightElbow: Point2D | null = null;
  public rightWrist: Point2D | null = null;
  public leftShoulder: Point2D | null = null;
  public leftElbow: Point2D | null = null;
  public leftWrist: Point2D | null = null;

  // Side Joints
  public visibleShoulder: Point2D | null = null;
  public visibleElbow: Point2D | null = null;
  public visibleWrist: Point2D | null = null;
  public visibleHip: Point2D | null = null;

  // Feedback State
  public isArmStraight: boolean = false;
  public isPostureGood: boolean = false;
  public arrowDirection: 'left' | 'right' | null = null;

  public formFeedbackText: string = 'กำลังค้นหาผู้ใช้งาน...';
  public cpm: number = 0;
  public speedFeedbackText: string = 'ความเร็ว: -';

  // Camera Fallback Tracking
  private lastShoulderY: number = 0;
  private isPushingDown: boolean = false;
  private compressionTimestamps: number[] = [];
  private currentCycleMinY: number = 1.0;

  public onStateChange: (() => void) | null = null;
  public sound: SoundFX;

  constructor(sound?: SoundFX) {
    this.sound = sound || new SoundFX();
  }

  notify(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  startTrainingMode(): void {
    this.sessionType = 'training';
    this.resetStats();
    this.appMode = 'blsSceneSafety';
    this.notify();
  }

  startRealtimeMode(): void {
    this.sessionType = 'realtime';
    this.resetStats();
    this.appMode = 'activeCPR';
    this.notify();
  }

  resetStats(): void {
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
    this.isPushingDown = false;
    this.compressionTimestamps = [];
    this.blsCompleted = {
      sceneSafety: false,
      checkResponse: false,
      callHelp: false,
      aedUsed: false,
    };
    this.clearSidePoints();
    this.clearFrontPoints();
  }

  startCPRSessionTimer(): void {
    if (this.sessionType !== 'training') return;
    this.cprTimeRemaining = this.cprDuration; // 120 seconds
    if (this.sessionTimer !== null) {
      clearInterval(this.sessionTimer);
    }
    this.sessionTimer = window.setInterval(() => {
      if (this.cprTimeRemaining > 0) {
        this.cprTimeRemaining -= 1;
        this.notify();
      } else {
        if (this.sessionTimer !== null) {
          clearInterval(this.sessionTimer);
          this.sessionTimer = null;
        }
        this.sound.success();
        this.appMode = 'aedScenario';
        this.notify();
      }
    }, 1000);
  }

  stopCPRSessionTimer(): void {
    if (this.sessionTimer !== null) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  getArmPercentage(): number {
    if (this.totalFrames === 0) return 0;
    return Math.round((this.straightArmFrames / this.totalFrames) * 100);
  }

  getSpeedPercentage(): number {
    if (this.totalCompressions === 0) return 0;
    return Math.round((this.goodSpeedCompressions / this.totalCompressions) * 100);
  }

  getQualityCompressionPercentage(): number {
    if (this.totalCompressions === 0) return 0;
    return Math.round((this.qualityCompressions / this.totalCompressions) * 100);
  }

  // Frame debounce counters to avoid jitter resets
  private sideBadFrameCount: number = 0;
  private frontBadFrameCount: number = 0;

  processFrame(landmarks: Array<{ x: number; y: number; visibility?: number }> | null): void {
    if (!['sideCalibration', 'frontCalibration', 'activeCPR'].includes(this.appMode)) return;

    if (!landmarks || landmarks.length < 17) {
      this.clearPoints('กำลังค้นหาผู้ใช้งาน...');
      this.notify();
      return;
    }

    const pts = CPRPoseAnalyzer.mapLandmarks(landmarks);

    if (this.appMode === 'sideCalibration') this.runSideCalibration(pts);
    else if (this.appMode === 'frontCalibration') this.runFrontCalibration(pts);
    else if (this.appMode === 'activeCPR') this.runActiveCPR(pts);

    this.notify();
  }

  static mapLandmarks(lm: Array<{ x: number; y: number; visibility?: number }>): PoseLandmarks {
    const P = (i: number): Point2D | null => {
      const p = lm[i];
      if (!p) return null;
      const conf =
        p.visibility != null
          ? p.visibility
          : (p as any).score != null
          ? (p as any).score
          : 0.8;
      // Normalization: mirrored X (0=left, 1=right on screen), natural Y (0=top, 1=bottom)
      return { x: 1 - p.x, y: p.y, conf };
    };
    return {
      leftShoulder: P(11),
      leftElbow: P(13),
      leftWrist: P(15),
      leftHip: P(23),
      rightShoulder: P(12),
      rightElbow: P(14),
      rightWrist: P(16),
      rightHip: P(24),
    };
  }

  private runSideCalibration(pts: PoseLandmarks): void {
    const side = this.extractSideData(pts);
    const s = side.shoulder;
    const e = side.elbow;
    const w = side.wrist;

    if (!s || !e || !w) {
      this.sideBadFrameCount++;
      if (this.sideBadFrameCount > 10) {
        this.resetSideCountdown(side.hasShoulder ? '⚠️ ขยับกล้องให้เห็นข้อมือ' : 'กรุณาหันด้านข้างเข้ากล้อง');
        this.arrowDirection = null;
      }
      return;
    }

    this.visibleShoulder = s;
    this.visibleElbow = e;
    this.visibleWrist = w;
    this.visibleHip = side.hip;

    // Generous and realistic clinical thresholds
    this.isArmStraight = side.armAngle > 130.0;

    const xDiff = s.x - w.x;
    // Good posture when shoulder is vertically aligned above wrists (within tolerance)
    this.isPostureGood = Math.abs(xDiff) < 0.20;

    if (!this.isPostureGood) {
      this.arrowDirection = xDiff > 0.08 ? 'left' : (xDiff < -0.08 ? 'right' : null);
    } else {
      this.arrowDirection = null;
    }

    if (!this.isArmStraight) {
      this.sideBadFrameCount++;
      if (this.sideBadFrameCount > 10) {
        this.resetSideCountdown('กรุณาล็อกข้อศอกให้ตึง (>130°)');
      }
    } else if (!this.isPostureGood) {
      this.sideBadFrameCount++;
      if (this.sideBadFrameCount > 10) {
        this.resetSideCountdown("โถมตัวตามลูกศร ให้ 'ไหล่ตรงข้อมือ'");
      }
    } else {
      // Good posture frame!
      this.sideBadFrameCount = 0;
      this.formFeedbackText = 'ท่าทางถูกต้อง! ค้างไว้...';

      if (this.sideStartTime === null) {
        this.sideStartTime = Date.now();
        this.sideCountdown = 3;
        this.sound.tick();
      }

      const elapsed = (Date.now() - this.sideStartTime) / 1000.0;
      const remaining = Math.max(0, Math.ceil(3.0 - elapsed));

      if (remaining !== this.sideCountdown) {
        this.sideCountdown = remaining;
        if (remaining > 0) this.sound.tick();
        else if (remaining === 0) this.sound.success();
      }

      if (elapsed >= 3.0) {
        this.appMode = 'transitionSideToFront';
        this.sideStartTime = null;
        this.arrowDirection = null;
        this.clearSidePoints();
      }
    }
  }

  private runFrontCalibration(pts: PoseLandmarks): void {
    const rShoulder = pts.rightShoulder || pts.leftShoulder;
    const rElbow = pts.rightElbow || pts.leftElbow;
    const rWrist = pts.rightWrist || pts.leftWrist;
    const lShoulder = pts.leftShoulder || pts.rightShoulder;
    const lElbow = pts.leftElbow || pts.rightElbow;
    const lWrist = pts.leftWrist || pts.rightWrist;

    if (!rShoulder || !rElbow || !rWrist) {
      this.frontBadFrameCount++;
      if (this.frontBadFrameCount > 10) {
        this.resetFrontCountdown('กรุณาหันหน้าเข้ากล้องและเหยียดแขน');
      }
      return;
    }

    const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
    const lAngle = lShoulder && lElbow && lWrist ? this.calculateAngle(lShoulder, lElbow, lWrist) : rAngle;

    this.rightShoulder = pts.rightShoulder;
    this.rightElbow = pts.rightElbow;
    this.rightWrist = pts.rightWrist;
    this.leftShoulder = pts.leftShoulder;
    this.leftElbow = pts.leftElbow;
    this.leftWrist = pts.leftWrist;

    this.isRightArmStraight = rAngle > 130.0;
    this.isLeftArmStraight = lAngle > 130.0;

    const bothStraight = this.isRightArmStraight && this.isLeftArmStraight;

    if (bothStraight) {
      this.frontBadFrameCount = 0;
      this.formFeedbackText = 'แขนตึงคู่! ค้างไว้...';
      if (this.frontStartTime === null) {
        this.frontStartTime = Date.now();
        this.frontCountdown = 3;
        this.sound.tick();
      }

      const elapsed = (Date.now() - this.frontStartTime) / 1000.0;
      const remaining = Math.max(0, Math.ceil(3.0 - elapsed));

      if (remaining !== this.frontCountdown) {
        this.frontCountdown = remaining;
        if (remaining > 0) this.sound.tick();
        else if (remaining === 0) this.sound.success();
      }

      if (elapsed >= 3.0) {
        this.frontStartTime = null;
        this.arrowDirection = null;
        if (this.sessionType === 'training') {
          this.appMode = 'handPlacement';
        } else {
          this.appMode = 'activeCPR';
          this.startCPRSessionTimer();
        }
      }
    } else {
      this.frontBadFrameCount++;
      if (this.frontBadFrameCount > 10) {
        this.resetFrontCountdown('กรุณาล็อกข้อศอกให้ตรง (>130°)');
      }
    }
  }

  private runActiveCPR(pts: PoseLandmarks): void {
    const rShoulder = pts.rightShoulder || pts.leftShoulder;
    const rElbow = pts.rightElbow || pts.leftElbow;
    const rWrist = pts.rightWrist || pts.leftWrist;
    const lShoulder = pts.leftShoulder || pts.rightShoulder;
    const lElbow = pts.leftElbow || pts.rightElbow;
    const lWrist = pts.leftWrist || pts.rightWrist;

    if (!rShoulder || !rElbow || !rWrist) {
      this.clearPoints('กำลังค้นหาผู้ใช้งาน (ตรวจจับการกดหน้าอก)');
      return;
    }

    const rAngle = this.calculateAngle(rShoulder, rElbow, rWrist);
    const lAngle = lShoulder && lElbow && lWrist ? this.calculateAngle(lShoulder, lElbow, lWrist) : rAngle;
    const midShoulderY = lShoulder ? (rShoulder.y + lShoulder.y) / 2.0 : rShoulder.y;

    this.rightShoulder = pts.rightShoulder;
    this.rightElbow = pts.rightElbow;
    this.rightWrist = pts.rightWrist;
    this.leftShoulder = pts.leftShoulder;
    this.leftElbow = pts.leftElbow;
    this.leftWrist = pts.leftWrist;

    this.isRightArmStraight = rAngle > 130.0;
    this.isLeftArmStraight = lAngle > 130.0;
    this.isArmStraight = this.isRightArmStraight || this.isLeftArmStraight;
    this.formFeedbackText = this.isArmStraight ? 'แขนตึง: ยอดเยี่ยม' : '⚠️ แขนงอ! กรุณาล็อกข้อศอก';

    if (this.sessionType === 'training') {
      this.totalFrames += 1;
      if (this.isArmStraight) this.straightArmFrames += 1;
    }

    this.detectCompressionFront(midShoulderY);
  }

  private detectCompressionFront(currentShoulderY: number): void {
    const movementThreshold = 0.006;
    const now = Date.now();

    const lastPush = this.compressionTimestamps[this.compressionTimestamps.length - 1];
    if (lastPush !== undefined && (now - lastPush) / 1000.0 > 2.0) {
      this.compressionTimestamps = [];
      this.cpm = 0;
      this.speedFeedbackText = 'ความเร็ว: หยุดนิ่ง';
      this.isPushingDown = false;
    }

    // In natural Y coords, pressing down means Y INCREASES (towards bottom of screen)
    if (currentShoulderY > this.lastShoulderY + movementThreshold && !this.isPushingDown) {
      this.isPushingDown = true;
      this.currentCycleMinY = currentShoulderY; // peak depth
    } else if (this.isPushingDown) {
      if (currentShoulderY > this.currentCycleMinY) {
        this.currentCycleMinY = currentShoulderY;
      }

      // Releasing back up means Y DECREASES below the peak depth
      if (currentShoulderY < this.currentCycleMinY - movementThreshold) {
        this.isPushingDown = false;
        this.compressionTimestamps.push(now);

        if (this.sessionType === 'training') {
          this.totalCompressions += 1;
          if (this.isArmStraight) this.goodArmCompressions += 1;
        }

        if (this.compressionTimestamps.length > 5) {
          this.compressionTimestamps.shift();
        }
        if (this.compressionTimestamps.length >= 2) {
          const timeDiff =
            (this.compressionTimestamps[this.compressionTimestamps.length - 1] -
              this.compressionTimestamps[0]) /
            1000.0;
          const count = this.compressionTimestamps.length - 1;
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
    this.lastShoulderY = currentShoulderY;
  }

  // Simulated manual compression trigger (helpful for testing or interactive assist)
  simulateCompression(): void {
    const now = Date.now();
    this.compressionTimestamps.push(now);
    if (this.compressionTimestamps.length > 5) this.compressionTimestamps.shift();
    this.totalCompressions += 1;
    this.isArmStraight = true;
    this.goodArmCompressions += 1;
    this.totalFrames += 1;
    this.straightArmFrames += 1;

    if (this.compressionTimestamps.length >= 2) {
      const timeDiff =
        (this.compressionTimestamps[this.compressionTimestamps.length - 1] -
          this.compressionTimestamps[0]) /
        1000.0;
      const count = this.compressionTimestamps.length - 1;
      this.cpm = Math.round((count / timeDiff) * 60.0);
    } else {
      this.cpm = 110;
    }
    const isSpeedGood = this.cpm >= 100 && this.cpm <= 120;
    if (this.cpm < 100) this.speedFeedbackText = this.cpm + ' CPM (ช้าไป)';
    else if (this.cpm > 120) this.speedFeedbackText = this.cpm + ' CPM (เร็วไป)';
    else this.speedFeedbackText = this.cpm + ' CPM (เยี่ยม)';

    if (isSpeedGood) this.goodSpeedCompressions += 1;
    if (isSpeedGood && this.isArmStraight) this.qualityCompressions += 1;

    this.sound.tick();
    this.notify();
  }

  resetToMainMenu(): void {
    this.stopCPRSessionTimer();
    this.appMode = 'mainMenu';
    this.sideCountdown = 3;
    this.frontCountdown = 3;
    this.sideStartTime = null;
    this.frontStartTime = null;
    this.resetStats();
    this.arrowDirection = null;
    this.clearSidePoints();
    this.clearFrontPoints();
    this.notify();
  }

  private extractSideData(pts: PoseLandmarks): {
    shoulder: Point2D | null;
    elbow: Point2D | null;
    wrist: Point2D | null;
    hip: Point2D | null;
    armAngle: number;
    hasShoulder: boolean;
  } {
    const leftHasAll =
      pts.leftShoulder &&
      pts.leftElbow &&
      pts.leftWrist &&
      pts.leftShoulder.conf > 0.05 &&
      pts.leftElbow.conf > 0.05 &&
      pts.leftWrist.conf > 0.05;

    const rightHasAll =
      pts.rightShoulder &&
      pts.rightElbow &&
      pts.rightWrist &&
      pts.rightShoulder.conf > 0.05 &&
      pts.rightElbow.conf > 0.05 &&
      pts.rightWrist.conf > 0.05;

    const leftConf = (pts.leftShoulder?.conf || 0) + (pts.leftElbow?.conf || 0);
    const rightConf = (pts.rightShoulder?.conf || 0) + (pts.rightElbow?.conf || 0);

    let useLeft = false;
    if (leftHasAll && rightHasAll) {
      useLeft = leftConf >= rightConf;
    } else if (leftHasAll) {
      useLeft = true;
    } else if (rightHasAll) {
      useLeft = false;
    } else {
      // Neither has complete joints
      return {
        shoulder: null,
        elbow: null,
        wrist: null,
        hip: null,
        armAngle: 0,
        hasShoulder: (pts.leftShoulder?.conf || 0) > 0.05 || (pts.rightShoulder?.conf || 0) > 0.05,
      };
    }

    const shoulder = useLeft ? pts.leftShoulder : pts.rightShoulder;
    const elbow = useLeft ? pts.leftElbow : pts.rightElbow;
    const wrist = useLeft ? pts.leftWrist : pts.rightWrist;
    const hip = useLeft ? pts.leftHip : pts.rightHip;
    const armAngle = this.calculateAngle(shoulder!, elbow!, wrist!);

    return {
      shoulder,
      elbow,
      wrist,
      hip: hip && hip.conf > 0.05 ? hip : null,
      armAngle,
      hasShoulder: true,
    };
  }

  private calculateAngle(first: Point2D, mid: Point2D, last: Point2D): number {
    const dx1 = first.x - mid.x;
    const dy1 = first.y - mid.y;
    const dx2 = last.x - mid.x;
    const dy2 = last.y - mid.y;
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag1 = Math.hypot(dx1, dy1);
    const mag2 = Math.hypot(dx2, dy2);
    if (mag1 === 0 || mag2 === 0) return 0;
    return (Math.acos(Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)))) * 180.0) / Math.PI;
  }

  private resetSideCountdown(message: string): void {
    this.sideStartTime = null;
    this.sideCountdown = 3;
    this.formFeedbackText = message;
    this.arrowDirection = null;
  }

  private resetFrontCountdown(message: string): void {
    this.frontStartTime = null;
    this.frontCountdown = 3;
    this.formFeedbackText = message;
  }

  private clearPoints(message: string): void {
    this.clearSidePoints();
    this.clearFrontPoints();
    this.formFeedbackText = message;
  }

  private clearSidePoints(): void {
    this.visibleShoulder = null;
    this.visibleElbow = null;
    this.visibleWrist = null;
    this.visibleHip = null;
  }

  private clearFrontPoints(): void {
    this.rightShoulder = null;
    this.rightElbow = null;
    this.rightWrist = null;
    this.leftShoulder = null;
    this.leftElbow = null;
    this.leftWrist = null;
  }
}
