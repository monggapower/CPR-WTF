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
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between items-center p-5 pt-16">
      {/* Timer Bar (for Training session) */}
      {analyzer.sessionType === 'training' && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl pointer-events-auto">
          <span className="text-white text-sm sm:text-base font-semibold">
            กดหน้าอกต่อเนื่อง (เหลือเวลา:{' '}
            <b className="text-amber-300 font-mono text-lg">{formatMMSS(analyzer.cprTimeRemaining)}</b>{' '}
            นาที)
          </span>
          <button
            onClick={onFastForward}
            title="ข้ามไปตอนเครื่อง AED มาถึง"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow"
          >
            ⏩ จำลองครบ 2 นาที (AED มาถึง)
          </button>
        </div>
      )}

      {/* Manual compression tap button (floating helper for touch/mouse testing) */}
      <div className="pointer-events-auto my-auto">
        <button
          onClick={onTapCompression}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm flex flex-col items-center justify-center gap-1 shadow-2xl border-4 border-white/40 active:scale-95 transition-transform"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>แตะกดหน้าอก</span>
          <span className="text-[10px] font-normal text-white/80">หรือใช้กล้อง</span>
        </button>
      </div>

      {/* Floating Dashboard Cards */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 pointer-events-auto">
        {/* Arm card */}
        <div
          className={`p-4 rounded-2xl backdrop-blur-md border text-center transition-all shadow-xl ${
            analyzer.isArmStraight
              ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-200'
              : 'bg-amber-950/80 border-amber-400/60 text-amber-200'
          }`}
        >
          <div className="text-xs uppercase tracking-wider font-semibold opacity-80 mb-1">แขนตึง</div>
          <div className="text-lg sm:text-xl font-black">
            {analyzer.isArmStraight ? 'ยอดเยี่ยม' : 'ล็อกศอก!'}
          </div>
        </div>

        {/* Speed card */}
        <div
          className={`p-4 rounded-2xl backdrop-blur-md border text-center transition-all shadow-xl ${
            isSpeedIdle
              ? 'bg-slate-900/80 border-white/20 text-slate-300'
              : isSpeedGood
              ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-200'
              : 'bg-rose-950/80 border-rose-400/60 text-rose-200'
          }`}
        >
          <div className="text-xs uppercase tracking-wider font-semibold opacity-80 mb-1">
            ความเร็ว (100-120 CPM)
          </div>
          <div className="text-lg sm:text-xl font-black">
            {analyzer.speedFeedbackText}
          </div>
        </div>
      </div>
    </div>
  );
};
