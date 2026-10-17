import React from 'react';
import { CPRPoseAnalyzer } from '../services/poseAnalyzer';

interface HUDActiveCPRProps {
  analyzer: CPRPoseAnalyzer;
  onFastForward: () => void;
  onTapCompression: () => void;
}

export const HUDActiveCPR: React.FC<HUDActiveCPRProps> = ({
  analyzer,
  onFastForward,
  onTapCompression,
}) => {
  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isSpeedGood = analyzer.cpm >= 100 && analyzer.cpm <= 120;
  const isSpeedIdle = analyzer.cpm === 0;

  return (
    <>
      {/* Top Timer Bar (for Training session) */}
      {analyzer.sessionType === 'training' && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
            <span className="text-white text-xs sm:text-sm font-semibold">
              กดหน้าอกต่อเนื่อง (เหลือเวลา:{' '}
              <b className="text-amber-300 font-mono text-base">{formatMMSS(analyzer.cprTimeRemaining)}</b>{' '}
              นาที)
            </span>
            <button
              onClick={onFastForward}
              title="ข้ามไปตอนเครื่อง AED มาถึง"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1 rounded-lg transition-all shadow"
            >
              ⏩ ข้ามไป AED
            </button>
          </div>
        </div>
      )}

      {/* Floating Dashboard Cards (Bottom Center) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4 pointer-events-auto">
        <div className="grid grid-cols-2 gap-3">
          {/* Arm card */}
          <div
            className={`p-3.5 rounded-2xl backdrop-blur-md border text-center transition-all shadow-xl ${
              analyzer.isArmStraight
                ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-200'
                : 'bg-amber-950/80 border-amber-400/60 text-amber-200'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 mb-0.5">
              แขนตึง
            </div>
            <div className="text-base sm:text-lg font-black">
              {analyzer.isArmStraight ? 'ยอดเยี่ยม' : 'ล็อกศอก!'}
            </div>
          </div>

          {/* Speed card */}
          <div
            className={`p-3.5 rounded-2xl backdrop-blur-md border text-center transition-all shadow-xl ${
              isSpeedIdle
                ? 'bg-slate-900/80 border-white/20 text-slate-300'
                : isSpeedGood
                ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-200'
                : 'bg-rose-950/80 border-rose-400/60 text-rose-200'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 mb-0.5">
              ความเร็ว (100-120 CPM)
            </div>
            <div className="text-base sm:text-lg font-black">
              {analyzer.speedFeedbackText}
            </div>
          </div>
        </div>
      </div>

      {/* Manual compression tap button - Moved to bottom right corner so center POV is unobstructed */}
      <div className="fixed bottom-6 right-5 z-30 pointer-events-auto">
        <button
          onClick={onTapCompression}
          title="แตะจำลองการกดหน้าอก"
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-2xl border-2 border-white/40 active:scale-95 transition-transform"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="leading-tight">แตะกด</span>
        </button>
      </div>
    </>
  );
};
