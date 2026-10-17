import React from 'react';

interface MainMenuProps {
  onStartTraining: () => void;
  onStartRealtime: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartTraining, onStartRealtime }) => {
  return (
    <section className="fixed inset-0 z-30 flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Background Image with Dark Tint */}
      <img
        src="/assets/SplashLogo.png"
        alt="CPR Training"
        className="absolute inset-0 w-full h-full object-cover filter blur-[2px] opacity-40 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950/95" />

      {/* Content */}
      <div className="relative z-10 max-w-xl w-full flex flex-col items-center">
        <div className="w-24 h-24 mb-4 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900/60 p-2 flex items-center justify-center">
          <img src="/assets/SplashLogo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-md">
          CPR Training &amp; Assist
        </h1>
        <p className="text-sm sm:text-base text-slate-300 font-medium mb-10 max-w-md drop-shadow">
          AHA Guideline 2025 — Basic Life Support (3D Scenario)
        </p>

        <div className="flex flex-col sm:flex-row gap-5 w-full">
          <button
            onClick={onStartTraining}
            className="group flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-xl shadow-blue-900/40 border border-blue-400/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                viewBox="0 0 24 24"
                width="36"
                height="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 10L12 5 2 10l10 5 10-5z" />
                <path d="M6 12v5.5c0 1.9 2.7 2.6 6 2.6s6-.7 6-2.6V12" />
                <path d="M22 10v6" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold leading-tight">
              โหมดฝึกซ้อมเต็มรูปแบบ 3D
              <br />
              <span className="text-xs sm:text-sm font-normal text-blue-200">
                (BLS Full Run-Through 5 ขั้นตอน)
              </span>
            </span>
          </button>

          <button
            onClick={onStartRealtime}
            className="group flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-xl shadow-red-900/40 border border-red-400/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
                <path fill="#ffffff" d="M13.2 7.2L9.4 12h2.6l-1.2 4.2 3.8-4.8h-2.6l1.2-4.2z" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold leading-tight">
              ทำ CPR ทันที
              <br />
              <span className="text-xs sm:text-sm font-normal text-red-200">
                (Real-time Camera &amp; Metronome)
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
