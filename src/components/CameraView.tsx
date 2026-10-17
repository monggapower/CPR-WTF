import React, { useEffect, useRef, useState } from 'react';
import { CPRPoseAnalyzer } from '../services/poseAnalyzer';
import { AppMode } from '../types';

interface CameraViewProps {
  mode: AppMode;
  analyzer: CPRPoseAnalyzer;
  onPoseResult: () => void;
  onError: (msg: string) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ mode, analyzer, onPoseResult, onError }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const loopRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const rectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const lastTimeRef = useRef<number>(-1);

  const isCameraMode = ['sideCalibration', 'transitionSideToFront', 'frontCalibration', 'activeCPR'].includes(mode);

  const updateRect = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(sw * dpr);
    canvas.height = Math.round(sh * dpr);
    canvas.style.width = sw + 'px';
    canvas.style.height = sh + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (!vw || !vh) {
      rectRef.current = null;
      return;
    }
    const scale = Math.max(sw / vw, sh / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    rectRef.current = { x: (sw - dw) / 2, y: (sh - dh) / 2, w: dw, h: dh };
  };

  const drawOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const r = rectRef.current;
    if (!r) return;

    const A = analyzer;
    // Map normalized pose landmark to canvas coordinates
    const sx = (p: { x: number; y: number }) => ({ x: r.x + p.x * r.w, y: r.y + (1 - p.y) * r.h });

    if (A.appMode === 'sideCalibration') {
      const s = A.visibleShoulder ? sx(A.visibleShoulder) : null;
      const e = A.visibleElbow ? sx(A.visibleElbow) : null;
      const w = A.visibleWrist ? sx(A.visibleWrist) : null;
      const hip = A.visibleHip ? sx(A.visibleHip) : null;

      if (s && e && w) {
        drawArmPath(ctx, [s, e, w], A.isArmStraight);
        drawJoints(ctx, [s, e, w]);
      }
      if (s && hip) {
        drawLine(ctx, s, hip, 'rgba(0, 122, 255, 0.8)', 6);
        drawDot(ctx, hip);
      }
    } else if (A.appMode === 'frontCalibration' || A.appMode === 'activeCPR') {
      const rS = A.rightShoulder,
        rE = A.rightElbow,
        rW = A.rightWrist;
      const lS = A.leftShoulder,
        lE = A.leftElbow,
        lW = A.leftWrist;

      if (rS && rE && rW) {
        const pts = [sx(rS), sx(rE), sx(rW)];
        drawArmPath(ctx, pts, A.isRightArmStraight);
        drawJoints(ctx, pts);
      }
      if (lS && lE && lW) {
        const pts = [sx(lS), sx(lE), sx(lW)];
        drawArmPath(ctx, pts, A.isLeftArmStraight);
        drawJoints(ctx, pts);
      }
    }
  };

  const drawArmPath = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], straight: boolean) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.strokeStyle = straight ? '#34c759' : '#ff3b30';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const drawJoints = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => {
    pts.forEach((p) => {
      // Glow ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 204, 0, 0.35)';
      ctx.fill();

      // Solid joint dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc00';
      ctx.fill();
    });
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    a: { x: number; y: number },
    b: { x: number; y: number },
    color: string,
    width: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const drawDot = (ctx: CanvasRenderingContext2D, p: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
  };

  const ensurePoseDetector = (): Promise<any> => {
    return new Promise((resolve) => {
      if (poseRef.current) return resolve(poseRef.current);

      const checkOrInit = () => {
        const PoseConstructor = (window as any).Pose;
        if (PoseConstructor) {
          try {
            const pose = new PoseConstructor({
              locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675466862/${file}`,
            });
            pose.setOptions({
              modelComplexity: 1,
              smoothLandmarks: true,
              enableSegmentation: false,
              smoothSegmentation: false,
              minDetectionConfidence: 0.4,
              minTrackingConfidence: 0.4,
            });
            pose.onResults((results: any) => {
              if (!loopRef.current) return;
              const landmarks = results?.poseLandmarks?.length ? results.poseLandmarks : null;
              analyzer.processFrame(landmarks);
              onPoseResult();
              drawOverlay();
            });
            poseRef.current = pose;
            resolve(pose);
            return true;
          } catch (e) {
            console.error('Error initializing MediaPipe Pose:', e);
          }
        }
        return false;
      };

      if (checkOrInit()) return;

      // Poll until window.Pose becomes available
      const interval = setInterval(() => {
        if (checkOrInit()) {
          clearInterval(interval);
        }
      }, 250);

      // Timeout after 12 seconds
      setTimeout(() => clearInterval(interval), 12000);
    });
  };

  useEffect(() => {
    if (!isCameraMode) {
      loopRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            updateRect();
          };
          try {
            await video.play();
            updateRect();
          } catch (e) {}
        }

        // Initialize Pose model
        await ensurePoseDetector();

        updateRect();
        loopRef.current = true;
        startDetectionLoop();
      } catch (err: any) {
        const errorMsg = 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง';
        setCameraError(errorMsg);
        onError(errorMsg);
      }
    };

    const startDetectionLoop = async () => {
      while (loopRef.current) {
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          if (!rectRef.current && video.videoWidth > 0) {
            updateRect();
          }

          if (video.currentTime !== lastTimeRef.current) {
            lastTimeRef.current = video.currentTime;
            if (poseRef.current) {
              try {
                await poseRef.current.send({ image: video });
              } catch (e) {}
            } else {
              // Retry init
              ensurePoseDetector();
            }
          }
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
    };

    startCamera();

    const handleResize = () => {
      updateRect();
      drawOverlay();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      loopRef.current = false;
      window.removeEventListener('resize', handleResize);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraMode]);

  return (
    <>
      <video
        ref={videoRef}
        id="camera"
        autoPlay
        playsInline
        muted
        className={`fixed inset-0 w-full h-full object-cover -scale-x-100 z-[1] ${
          !isCameraMode ? 'hidden' : ''
        }`}
      />
      <canvas
        ref={canvasRef}
        id="overlay"
        className={`fixed inset-0 w-full h-full pointer-events-none z-[2] ${
          !isCameraMode ? 'hidden' : ''
        }`}
      />
      {cameraError && isCameraMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-5 py-3 rounded-2xl backdrop-blur-md shadow-2xl text-center text-sm font-semibold max-w-md border border-white/20">
          {cameraError}
        </div>
      )}
    </>
  );
};
