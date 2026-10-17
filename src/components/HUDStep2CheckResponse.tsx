import React from 'react';

interface HUDStep2CheckResponseProps {
  shoulderTapped: boolean;
  voicePassed: boolean;
  transcript: string;
  onSimulateVoice: () => void;
}

export const HUDStep2CheckResponse: React.FC<HUDStep2CheckResponseProps> = ({
  shoulderTapped,
  voicePassed,
  transcript,
  onSimulateVoice,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-2xl pointer-events-auto">
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          AHA 2025 — ขั้นตอนที่ 2 / 5
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          2. ปลุกเรียกและประเมินการตอบสนอง (Check Response)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-3">
          แตะที่ไหล่ผู้ป่วยในฉาก 3D พร้อมพูดปลุกเรียกเสียงดังว่า <b>"คุณ คุณ!"</b>
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              shoulderTapped
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/25 text-slate-200'
            }`}
          >
            👆 แตะไหล่ผู้ป่วย (3D) {shoulderTapped ? '✓' : ''}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              voicePassed
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/25 text-slate-200'
            }`}
          >
            🗣️ พูดว่า "คุณ คุณ!" {voicePassed ? '✓' : ''}
          </span>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-sky-300 mb-3 font-mono">
          {transcript ? `เสียงที่ตรวจพบ: "${transcript}"` : '🎙️ กำลังฟังเสียงพูด: "คุณ คุณ!" ...'}
        </div>

        <button
          onClick={onSimulateVoice}
          className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl border border-white/20 transition-all"
        >
          จำลองเสียงพูด "คุณ คุณ!" (กรณีไม่ใช้ไมค์)
        </button>
      </div>
    </div>
  );
};
