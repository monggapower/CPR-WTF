import React from 'react';
import { CPRPoseAnalyzer } from '../services/poseAnalyzer';
import { AppMode } from '../types';

interface HUDStep4CalibrationProps {
  mode: AppMode;
  analyzer: CPRPoseAnalyzer;
  onProceedToFront: () => void;
  onSimulateSidePass: () => void;
  onSimulateFrontPass: () => void;
}

export const HUDStep4Calibration: React.FC<HUDStep4CalibrationProps> = ({
  mode,
  analyzer,
  onProceedToFront,
  onSimulateSidePass,
  onSimulateFrontPass,
}) => {
  if (mode === 'sideCalibration') {
    const showCountdown =
      analyzer.sideCountdown <= 3 &&
      analyzer.sideCountdown > 0 &&
      analyzer.isPostureGood &&
      analyzer.isArmStraight;

    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between items-center p-6 pt-16">
        {/* Instruction and feedback header */}
        <div className="flex flex-col items-center gap-3 max-w-md w-full">
          <div className="bg-slate-900/85 backdrop-blur-md border border-white/20 text-white font-bold text-center px-5 py-3 rounded-2xl shadow-xl text-sm sm:text-base">
            STEP 4.1: ตั้งกล้องด้านข้าง
            <br />
            <span className="text-amber-300 font-normal">โน้มตัวให้ 'ไหล่ตั้งฉากตรงกับข้อมือ'</span>
          </div>

          <div
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg text-center backdrop-blur-md border transition-all ${
              analyzer.sideCountdown < 3 || analyzer.isPostureGood
                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : 'bg-amber-600/90 border-amber-400 text-white'
            }`}
          >
            {analyzer.formFeedbackText}
          </div>
        </div>

        {/* Center Countdown Circle */}
        {showCountdown && (
          <div className="w-28 h-28 rounded-full bg-emerald-500/90 border-4 border-white text-white flex items-center justify-center text-6xl font-black shadow-2xl animate-bounce">
            {analyzer.sideCountdown}
          </div>
        )}

        {/* Arrow direction guidance */}
        {analyzer.arrowDirection && (
          <div className="flex items-center justify-center p-4">
            {analyzer.arrowDirection === 'left' ? (
              <div className="flex flex-col items-center animate-pulse">
                <svg viewBox="0 0 24 24" width="80" height="80" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.85)" />
                  <path d="M17.5 12h-11" stroke="#ff9500" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d="M11.5 7.5L7 12l4.5 4.5"
                    fill="none"
                    stroke="#ff9500"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="bg-slate-900/80 text-amber-300 px-3 py-1 rounded-full text-xs font-bold mt-1">
                  โถมตัวไปข้างหน้า (ซ้าย)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-pulse">
                <svg viewBox="0 0 24 24" width="80" height="80" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.85)" />
                  <path d="M6.5 12h11" stroke="#ff9500" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d="M12.5 7.5l4.5 4.5-4.5 4.5"
                    fill="none"
                    stroke="#ff9500"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="bg-slate-900/80 text-amber-300 px-3 py-1 rounded-full text-xs font-bold mt-1">
                  โถมตัวถอยหลัง (ขวา)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Helper fallback action */}
        <div className="pointer-events-auto">
          <button
            onClick={onSimulateSidePass}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-4 py-2 rounded-xl border border-white/20 backdrop-blur-md transition-all shadow-md"
          >
            จำลองท่าทางถูกต้อง (ผ่าน Step 4.1)
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'transitionSideToFront') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950/80 backdrop-blur-md">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-4 animate-scale">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          ยอดเยี่ยม! ท่าทางถูกต้อง
        </h2>
        <p className="text-slate-300 text-sm sm:text-base max-w-sm mb-8 leading-relaxed">
          กรุณานำกล้องไปตั้งไว้ <b className="text-emerald-400">'ด้านหน้า'</b>
          <br />
          เพื่อเช็คแขนทั้งสองข้างให้ตรง
        </p>

        <button
          onClick={onProceedToFront}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-xl shadow-blue-900/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          พร้อมเช็คด้านหน้า
        </button>
      </div>
    );
  }

  if (mode === 'frontCalibration') {
    const showCountdown =
      analyzer.frontCountdown <= 3 &&
      analyzer.frontCountdown > 0 &&
      analyzer.isRightArmStraight &&
      analyzer.isLeftArmStraight;

    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between items-center p-6 pt-16">
        <div className="flex flex-col items-center gap-3 max-w-md w-full">
          <div className="bg-slate-900/85 backdrop-blur-md border border-white/20 text-white font-bold text-center px-5 py-3 rounded-2xl shadow-xl text-sm sm:text-base">
            STEP 4.2: หันหน้าเข้ากล้อง
            <br />
            <span className="text-amber-300 font-normal">เหยียดแขนทั้งสองข้างให้ตึง</span>
          </div>

          <div
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg text-center backdrop-blur-md border transition-all ${
              analyzer.frontCountdown < 3 || (analyzer.isRightArmStraight && analyzer.isLeftArmStraight)
                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : 'bg-amber-600/90 border-amber-400 text-white'
            }`}
          >
            {analyzer.formFeedbackText}
          </div>
        </div>

        {showCountdown && (
          <div className="w-28 h-28 rounded-full bg-emerald-500/90 border-4 border-white text-white flex items-center justify-center text-6xl font-black shadow-2xl animate-bounce">
            {analyzer.frontCountdown}
          </div>
        )}

        <div className="pointer-events-auto">
          <button
            onClick={onSimulateFrontPass}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-4 py-2 rounded-xl border border-white/20 backdrop-blur-md transition-all shadow-md"
          >
            จำลองแขนตึงทั้งสองข้าง (เริ่มทำ CPR)
          </button>
        </div>
      </div>
    );
  }

  return null;
};
