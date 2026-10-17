import React, { useEffect, useRef, useState } from 'react';
import { CPRPoseAnalyzer } from './services/poseAnalyzer';
import { SoundFX } from './services/sound';
import { MetronomeManager } from './services/metronome';
import { AppMode, CallKeywords } from './types';
import { TopNav } from './components/TopNav';
import { MainMenu } from './components/MainMenu';
import { BLS3DScene } from './components/BLS3DScene';
import { CameraView } from './components/CameraView';
import { HUDStep1SceneSafety } from './components/HUDStep1SceneSafety';
import { HUDStep2CheckResponse } from './components/HUDStep2CheckResponse';
import { HUDStep3CallHelp } from './components/HUDStep3CallHelp';
import { HUDStep4Calibration } from './components/HUDStep4Calibration';
import { HUDActiveCPR } from './components/HUDActiveCPR';
import { HUDStep5AED } from './components/HUDStep5AED';
import { SummaryScreen } from './components/SummaryScreen';

export const App: React.FC = () => {
  // Single instances of core engines
  const soundRef = useRef<SoundFX>(new SoundFX());
  const analyzerRef = useRef<CPRPoseAnalyzer>(new CPRPoseAnalyzer(soundRef.current));
  const metronomeRef = useRef<MetronomeManager>(new MetronomeManager(soundRef.current));

  const [mode, setMode] = useState<AppMode>('mainMenu');
  const [isMetronomePlaying, setIsMetronomePlaying] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // BLS 3D Scenario States
  const [hazardsCleared, setHazardsCleared] = useState<number>(0);
  const [shoulderTapped, setShoulderTapped] = useState<boolean>(false);
  const [voicePassed, setVoicePassed] = useState<boolean>(false);
  const [callKeywords, setCallKeywords] = useState<CallKeywords>({
    call1669: false,
    unconscious: false,
    requestAED: false,
  });
  const [transcript, setTranscript] = useState<string>('');
  const [aedStep, setAedStep] = useState<number>(0);

  // Re-render trigger when analyzer state changes (e.g. countdowns, angles, CPM)
  const [, setTick] = useState<number>(0);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  const THREE_MODES: AppMode[] = ['blsSceneSafety', 'blsCheckResponse', 'blsCallHelp', 'aedScenario'];
  const CAMERA_MODES: AppMode[] = ['sideCalibration', 'transitionSideToFront', 'frontCalibration', 'activeCPR'];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'th-TH';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        const cleaned = text.trim();
        setTranscript(cleaned);
        handleSpeechEvaluation(cleaned);
      };

      rec.onerror = () => {};
      recognitionRef.current = rec;
    } catch (e) {}
  }, []);

  const handleSpeechEvaluation = (text: string) => {
    const norm = text.replace(/\s+/g, '').toLowerCase();
    const currentMode = analyzerRef.current.appMode;

    if (currentMode === 'blsCheckResponse') {
      if (
        norm.includes('คุณคุณ') ||
        (text.match(/คุณ/g) || []).length >= 2 ||
        norm.includes('คุณครับ') ||
        norm.includes('คุณคะ')
      ) {
        completeCheckResponse();
      }
    } else if (currentMode === 'blsCallHelp') {
      let updated = false;
      setCallKeywords((prev) => {
        const next = { ...prev };
        if (!next.call1669 && (norm.includes('โทร1669') || norm.includes('1669'))) {
          next.call1669 = true;
          updated = true;
        }
        if (!next.unconscious && (norm.includes('มีคนหมดสติ') || norm.includes('คนหมดสติ') || norm.includes('หมดสติ'))) {
          next.unconscious = true;
          updated = true;
        }
        if (!next.requestAED && (norm.includes('ขอเครื่องaed') || norm.includes('เครื่องaed') || norm.includes('aed') || norm.includes('เออีดี'))) {
          next.requestAED = true;
          updated = true;
        }
        if (updated) {
          soundRef.current.tick();
        }
        if (next.call1669 && next.unconscious && next.requestAED) {
          setTimeout(() => completeCallHelp(), 500);
        }
        return next;
      });
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e) {}
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
  };

  // Wire analyzer state change listener
  useEffect(() => {
    const A = analyzerRef.current;
    A.onStateChange = () => {
      setMode(A.appMode);
      setTick((t) => t + 1);
    };

    metronomeRef.current.setListener((playing) => {
      setIsMetronomePlaying(playing);
    });

    const unlockAudio = () => soundRef.current.ensure();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Screen WakeLock management
  useEffect(() => {
    let wakeLock: any = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {}
    };

    if (mode !== 'mainMenu') {
      requestLock();
    }

    return () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (e) {}
      }
    };
  }, [mode]);

  // Handle Mode Transitions
  useEffect(() => {
    const currentMode = mode;

    if (currentMode === 'activeCPR') {
      metronomeRef.current.start();
    } else {
      metronomeRef.current.stop();
    }

    if (currentMode === 'blsCheckResponse' || currentMode === 'blsCallHelp') {
      setTranscript('');
      startListening();
    } else {
      stopListening();
    }

    if (currentMode === 'blsSceneSafety') {
      setHazardsCleared(0);
    } else if (currentMode === 'blsCheckResponse') {
      setShoulderTapped(false);
      setVoicePassed(false);
    } else if (currentMode === 'blsCallHelp') {
      setCallKeywords({ call1669: false, unconscious: false, requestAED: false });
    } else if (currentMode === 'aedScenario') {
      setAedStep(0);
    }
  }, [mode]);

  // Step Completion Handlers
  const completeSceneSafety = () => {
    soundRef.current.success();
    analyzerRef.current.blsCompleted.sceneSafety = true;
    setTimeout(() => {
      analyzerRef.current.appMode = 'blsCheckResponse';
      analyzerRef.current.notify();
    }, 800);
  };

  const completeCheckResponse = () => {
    if (voicePassed) return;
    setShoulderTapped(true);
    setVoicePassed(true);
    soundRef.current.success();
    analyzerRef.current.blsCompleted.checkResponse = true;
    setTimeout(() => {
      analyzerRef.current.appMode = 'blsCallHelp';
      analyzerRef.current.notify();
    }, 800);
  };

  const completeCallHelp = () => {
    setCallKeywords({ call1669: true, unconscious: true, requestAED: true });
    soundRef.current.success();
    analyzerRef.current.blsCompleted.callHelp = true;
    stopListening();
    setTimeout(() => {
      analyzerRef.current.appMode = 'sideCalibration';
      analyzerRef.current.notify();
    }, 900);
  };

  const advanceAEDStep = (nextStep: number) => {
    setAedStep(nextStep);
    soundRef.current.tick();

    if (nextStep === 2 || nextStep === 3) {
      soundRef.current.success();
    } else if (nextStep === 4) {
      soundRef.current.success();
      setTimeout(() => {
        advanceAEDStep(5);
      }, 3000);
    } else if (nextStep === 5) {
      soundRef.current.success();
    } else if (nextStep === 6) {
      soundRef.current.success();
      analyzerRef.current.blsCompleted.aedUsed = true;
      setTimeout(() => {
        analyzerRef.current.appMode = 'summary';
        analyzerRef.current.notify();
      }, 1800);
    }
  };

  const handleReturnHome = () => {
    metronomeRef.current.stop();
    analyzerRef.current.resetToMainMenu();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* Top Navigation */}
      <TopNav
        mode={mode}
        isMetronomePlaying={isMetronomePlaying}
        onHomeClick={handleReturnHome}
        onMetronomeToggle={() => metronomeRef.current.toggle()}
      />

      {/* Error banner */}
      {errorBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xl">
          {errorBanner}
        </div>
      )}

      {/* Background 3D Scene (visible for Step 1, 2, 3 and 5B) */}
      <div className={THREE_MODES.includes(mode) ? 'block' : 'hidden'}>
        <BLS3DScene
          mode={mode}
          analyzer={analyzerRef.current}
          sound={soundRef.current}
          hazardsCleared={hazardsCleared}
          setHazardsCleared={setHazardsCleared}
          shoulderTapped={shoulderTapped}
          setShoulderTapped={setShoulderTapped}
          aedStep={aedStep}
          setAedStep={setAedStep}
          callKeywords={callKeywords}
          setCallKeywords={setCallKeywords}
          onAdvanceAED={advanceAEDStep}
          onCompleteSceneSafety={completeSceneSafety}
        />
      </div>

      {/* Camera and Pose Skeleton Overlay (visible for Step 4A, 4C, and 5A) */}
      <CameraView
        mode={mode}
        analyzer={analyzerRef.current}
        onPoseResult={() => setTick((t) => t + 1)}
        onError={(msg) => setErrorBanner(msg)}
      />

      {/* UI Screens */}
      {mode === 'mainMenu' && (
        <MainMenu
          onStartTraining={() => analyzerRef.current.startTrainingMode()}
          onStartRealtime={() => analyzerRef.current.startRealtimeMode()}
        />
      )}

      {mode === 'blsSceneSafety' && (
        <HUDStep1SceneSafety
          hazardsCleared={hazardsCleared}
          totalHazards={2}
          onConfirmSafe={completeSceneSafety}
        />
      )}

      {mode === 'blsCheckResponse' && (
        <HUDStep2CheckResponse
          shoulderTapped={shoulderTapped}
          voicePassed={voicePassed}
          transcript={transcript}
          onSimulateVoice={completeCheckResponse}
        />
      )}

      {mode === 'blsCallHelp' && (
        <HUDStep3CallHelp
          callKeywords={callKeywords}
          transcript={transcript}
          onSimulateCall={completeCallHelp}
        />
      )}

      {(mode === 'sideCalibration' || mode === 'transitionSideToFront' || mode === 'frontCalibration') && (
        <HUDStep4Calibration
          mode={mode}
          analyzer={analyzerRef.current}
          onProceedToFront={() => {
            analyzerRef.current.appMode = 'frontCalibration';
            analyzerRef.current.notify();
          }}
          onSimulateSidePass={() => {
            analyzerRef.current.appMode = 'transitionSideToFront';
            analyzerRef.current.notify();
          }}
          onSimulateFrontPass={() => {
            analyzerRef.current.appMode = 'activeCPR';
            analyzerRef.current.startCPRSessionTimer();
            analyzerRef.current.notify();
          }}
        />
      )}

      {mode === 'activeCPR' && (
        <HUDActiveCPR
          analyzer={analyzerRef.current}
          onFastForward={() => {
            analyzerRef.current.cprTimeRemaining = 3;
            analyzerRef.current.notify();
          }}
          onTapCompression={() => {
            analyzerRef.current.simulateCompression();
          }}
        />
      )}

      {mode === 'aedScenario' && (
        <HUDStep5AED aedStep={aedStep} onAdvanceStep={advanceAEDStep} />
      )}

      {mode === 'summary' && (
        <SummaryScreen
          analyzer={analyzerRef.current}
          onReturnHome={handleReturnHome}
        />
      )}
    </div>
  );
};
