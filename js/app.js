'use strict';

/**
 * App — AHA 2025 Layperson BLS Full Run-Through Training & Real-time Assist
 *
 * Training Sequence:
 *   1. blsSceneSafety   (3D Scene Safety Check — Click/Drag Hazards)
 *   2. blsCheckResponse (3D Tap Shoulder + Voice "คุณ คุณ!")
 *   3. blsCallHelp      (Voice "โทร 1669", "มีคนหมดสติ", "ขอเครื่อง AED")
 *   4. sideCalibration -> transitionSideToFront -> frontCalibration -> activeCPR (2 mins)
 *   5. aedScenario      (3D Interactive AED by Touch/Point, Drag & Click — No Voice)
 *   6. summary          (Dashboard with % Quality Compressions instead of stars)
 */
(() => {
  const $ = (id) => document.getElementById(id);

  const sound = new SoundFX();
  const analyzer = new CPRPoseAnalyzer();
  const metronome = new MetronomeManager(sound);
  analyzer.sound = sound;

  const camera = new CameraController(analyzer, $('camera'), $('overlay'), syncUI);
  const scenario3D = new BLSScenario3D($('scene3d'), analyzer, sound, sync3DUI);

  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, () => sound.ensure(), { once: true, passive: true })
  );

  let curMode = analyzer.appMode;
  const THREE_MODES = ['blsSceneSafety', 'blsCheckResponse', 'blsCallHelp', 'aedScenario'];

  function setScreen(mode) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    const sec = $('screen-' + mode);
    if (sec) sec.classList.remove('hidden');
    document.body.dataset.mode = mode;

    $('topnav').classList.toggle('hidden', mode === 'mainMenu' || mode === 'summary');
    $('btn-metronome').classList.toggle('hidden', mode !== 'activeCPR');

    if (mode === 'activeCPR') metronome.start();
    else metronome.stop();
    syncMetronomeIcon();

    if (THREE_MODES.includes(mode)) {
      camera.stop();
      scenario3D.start(mode);
      requestWakeLock();
    } else if (camera.isCameraMode) {
      scenario3D.stop();
      camera.start();
      requestWakeLock();
    } else {
      scenario3D.stop();
      camera.stop();
      releaseWakeLock();
    }

    if (mode === 'summary') renderSummary();
    sync3DUI();
  }

  function handleStateChange() {
    if (analyzer.appMode !== curMode) {
      curMode = analyzer.appMode;
      setScreen(curMode);
    }
    syncUI();
    camera.draw();
  }

  analyzer.onStateChange = handleStateChange;

  function sync3DUI() {
    const mode = analyzer.appMode;

    if (mode === 'blsSceneSafety') {
      $('safety-progress').textContent =
        `เคลียร์จุดเสี่ยงแล้ว: ${scenario3D.hazardsCleared} / ${scenario3D.totalHazards} จุด (แตะหรือลากวัตถุอันตรายในฉาก 3D ออก)`;
    } else if (mode === 'blsCheckResponse') {
      $('check-tap-badge').className = 'kw-badge ' + (scenario3D.shoulderTapped ? 'done' : '');
      $('check-voice-badge').className = 'kw-badge ' + (scenario3D.voiceResponsePassed ? 'done' : '');
      $('voice-transcript-response').textContent =
        scenario3D.lastTranscript ? `เสียงที่ตรวจพบ: "${scenario3D.lastTranscript}"` : '🎙️ กำลังฟังเสียงพูด: "คุณ คุณ!" ...';
    } else if (mode === 'blsCallHelp') {
      const kw = scenario3D.callKeywords;
      $('kw-1669').className = 'kw-badge ' + (kw.call1669 ? 'done' : '');
      $('kw-unconscious').className = 'kw-badge ' + (kw.unconscious ? 'done' : '');
      $('kw-aed').className = 'kw-badge ' + (kw.requestAED ? 'done' : '');
      $('voice-transcript-call').textContent =
        scenario3D.lastTranscript ? `เสียงที่ตรวจพบ: "${scenario3D.lastTranscript}"` : '🎙️ พูดใส่ไมโครโฟน: "โทร 1669 มีคนหมดสติ ขอเครื่อง AED"';
    } else if (mode === 'aedScenario') {
      const s = scenario3D.aedStep;
      const stepMessages = [
        '👆 ขั้นตอนที่ 1/5 (Click): แตะ/คลิกที่ "ปุ่มเปิดเครื่องสีเขียว" บนโมเดล 3D AED',
        '✋ ขั้นตอนที่ 2/5 (Drag & Drop): ลาก "แผ่นนำไฟฟ้าแผ่นที่ 1" ไปวางที่กรอบสีฟ้า "หน้าอกขวาบน (ใต้ไหปลาร้า)"',
        '✋ ขั้นตอนที่ 3/5 (Drag & Drop): ลาก "แผ่นนำไฟฟ้าแผ่นที่ 2" ไปวางที่กรอบสีฟ้า "ชายโครงซ้ายล่าง"',
        '🔌 ขั้นตอนที่ 4/5 (Drag & Click): ลาก "ขั้วสายสีเหลือง" ไปเสียบที่ช่องเสียบสายบนเครื่อง AED',
        '⏳ กำลังวิเคราะห์คลื่นไฟฟ้าหัวใจ... ห้ามสัมผัสตัวผู้ป่วย!',
        '⚡ ขั้นตอนที่ 5/5 (Click): แนะนำให้ช็อก! แตะ/คลิกที่ "ปุ่ม SHOCK สีส้มกระพริบ" บนโมเดล 3D AED',
        '✅ ทำการช็อกไฟฟ้าสำเร็จ! กำลังเข้าสู่หน้าสรุปผล...',
      ];
      $('aed-step-instruction').textContent = stepMessages[s] || '';

      $('aed-pill-1').className = 'kw-badge ' + (s > 0 ? 'done' : s === 0 ? 'active-pill' : '');
      $('aed-pill-2').className = 'kw-badge ' + (s > 1 ? 'done' : s === 1 ? 'active-pill' : '');
      $('aed-pill-3').className = 'kw-badge ' + (s > 2 ? 'done' : s === 2 ? 'active-pill' : '');
      $('aed-pill-4').className = 'kw-badge ' + (s > 4 ? 'done' : (s === 3 || s === 4) ? 'active-pill' : '');
      $('aed-pill-5').className = 'kw-badge ' + (s > 5 ? 'done' : s === 5 ? 'active-pill' : '');
    }
  }

  function formatMMSS(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function syncUI() {
    const A = analyzer;

    const sideFB = $('side-feedback');
    sideFB.textContent = A.formFeedbackText;
    sideFB.className = 'hint-box ' + (A.sideCountdown < 3 ? 'good' : 'warn');

    const sc = $('side-countdown');
    const showSc = A.sideCountdown <= 3 && A.sideCountdown > 0 && A.isPostureGood && A.isArmStraight;
    sc.textContent = A.sideCountdown;
    sc.classList.toggle('hidden', !showSc);

    const arrow = $('side-arrow');
    if (A.arrowDirection) {
      arrow.dataset.dir = A.arrowDirection;
      arrow.classList.remove('hidden');
    } else {
      arrow.classList.add('hidden');
      arrow.dataset.dir = '';
    }

    const frontFB = $('front-feedback');
    frontFB.textContent = A.formFeedbackText;
    frontFB.className = 'hint-box ' + (A.frontCountdown < 3 ? 'good' : 'warn');

    const fc = $('front-countdown');
    const showFc = A.frontCountdown <= 3 && A.frontCountdown > 0 && A.isRightArmStraight && A.isLeftArmStraight;
    fc.textContent = A.frontCountdown;
    fc.classList.toggle('hidden', !showFc);

    $('cpr-timer').classList.toggle('hidden', A.appMode !== 'activeCPR' || A.sessionType !== 'training');
    $('cpr-time').textContent = formatMMSS(A.cprTimeRemaining);

    $('dash-arm-value').textContent = A.isArmStraight ? 'ยอดเยี่ยม' : 'ล็อกศอก!';
    $('dash-arm').className = 'dash-card ' + (A.isArmStraight ? 'good' : 'warn');
    $('dash-speed-value').textContent = A.speedFeedbackText;
    $('dash-speed').className = 'dash-card ' + (A.cpm === 0 ? 'idle' : (A.cpm >= 100 && A.cpm <= 120 ? 'good' : 'bad'));
  }

  function renderSummary() {
    const qualityPct = analyzer.getQualityCompressionPercentage();
    const armPct = analyzer.getArmPercentage();
    const speedPct = analyzer.getSpeedPercentage();

    $('pct-quality').textContent = `${qualityPct}%`;
    $('bar-quality').style.width = `${qualityPct}%`;

    $('pct-arm').textContent = `${armPct}%`;
    $('bar-arm').style.width = `${armPct}%`;

    $('pct-speed').textContent = `${speedPct}%`;
    $('bar-speed').style.width = `${speedPct}%`;

    $('stat-total-compressions').textContent =
      `จำนวนการกดหน้าอกทั้งหมด: ${analyzer.totalCompressions} ครั้ง (กดที่มีคุณภาพครบเกณฑ์: ${analyzer.qualityCompressions} ครั้ง)`;
  }

  function syncMetronomeIcon() {
    $('btn-metronome').classList.toggle('playing', metronome.isPlaying);
  }

  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if (!wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* ignore */ }
  }
  function releaseWakeLock() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) { /* ignore */ }
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && camera.isCameraMode) requestWakeLock();
  });

  camera.onError = (message) => {
    const b = $('error-banner');
    b.textContent = message;
    b.classList.remove('hidden');
  };

  window.addEventListener('resize', () => {
    camera.updateRect();
    camera.draw();
  });

  $('btn-training').addEventListener('click', () => analyzer.startTrainingMode());
  $('btn-realtime').addEventListener('click', () => analyzer.startRealtimeMode());
  $('btn-proceed').addEventListener('click', () => {
    analyzer.appMode = 'frontCalibration';
    analyzer.notify();
  });

  $('btn-safety-confirm').addEventListener('click', () => scenario3D.completeSceneSafety());
  $('btn-sim-response').addEventListener('click', () => scenario3D.completeCheckResponse());
  $('btn-sim-call').addEventListener('click', () => scenario3D.completeCallHelp());
  $('btn-fastforward-cpr').addEventListener('click', () => {
    analyzer.cprTimeRemaining = 3;
    analyzer.notify();
  });

  $('btn-home').addEventListener('click', () => {
    scenario3D.stop();
    analyzer.resetToMainMenu();
    metronome.stop();
  });
  $('btn-summary-home').addEventListener('click', () => analyzer.resetToMainMenu());
  $('btn-metronome').addEventListener('click', () => {
    metronome.toggle();
    syncMetronomeIcon();
  });

  setScreen('mainMenu');
})();
