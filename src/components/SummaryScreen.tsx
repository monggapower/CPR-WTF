import React from 'react';
import { CPRPoseAnalyzer } from '../services/poseAnalyzer';

interface SummaryScreenProps {
  analyzer: CPRPoseAnalyzer;
  onReturnHome: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ analyzer, onReturnHome }) => {
  const qualityPct = analyzer.getQualityCompressionPercentage();
  const armPct = analyzer.getArmPercentage();
  const speedPct = analyzer.getSpeedPercentage();

  return (
    <section className="fixed inset-0 z-30 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950/95 overflow-y-auto">
      <div className="max-w-xl w-full flex flex-col items-center my-auto py-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white mb-6">
          สรุปผลการฝึกซ้อมช่วยชีวิตขั้นพื้นฐาน (AHA 2025 BLS)
        </h1>

        {/* Dashboard Card */}
        <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 w-full shadow-2xl backdrop-blur-xl mb-6 text-left">
          {/* Quality CPR % (Highlight) */}
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm sm:text-base font-bold text-white">
                คุณภาพการกดหน้าอกรวม (Quality CPR %)
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {qualityPct}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${qualityPct}%` }}
              />
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-1.5">
              * เกณฑ์คุณภาพ: ความเร็ว 100–120 ครั้ง/นาที ร่วมกับล็อกแขนตึง
            </div>
          </div>

          {/* Straight Arm % */}
          <div className="mb-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-semibold text-slate-200">
                ความตึงของแขน (Straight Arm %)
              </span>
              <span className="text-xl font-bold text-sky-400">{armPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${armPct}%` }}
              />
            </div>
          </div>

          {/* Target Rate % */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-semibold text-slate-200">
                ความเร็วตามเกณฑ์ 100–120 ครั้ง/นาที (Target Rate %)
              </span>
              <span className="text-xl font-bold text-sky-400">{speedPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${speedPct}%` }}
              />
            </div>
          </div>

          {/* Statistics summary caption */}
          <div className="text-center text-xs sm:text-sm text-slate-400 pt-4 border-t border-white/10 font-medium">
            จำนวนการกดหน้าอกทั้งหมด: <b className="text-white">{analyzer.totalCompressions}</b> ครั้ง
            <span className="block sm:inline sm:ml-2 text-emerald-300">
              (กดที่มีคุณภาพครบเกณฑ์: <b>{analyzer.qualityCompressions}</b> ครั้ง)
            </span>
          </div>
        </div>

        <button
          onClick={onReturnHome}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-10 py-3.5 rounded-2xl shadow-xl shadow-blue-900/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    </section>
  );
};
