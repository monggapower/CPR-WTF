import React from 'react';
import { CallKeywords } from '../types';

interface HUDStep3CallHelpProps {
  callKeywords: CallKeywords;
  transcript: string;
  onSimulateCall: () => void;
}

export const HUDStep3CallHelp: React.FC<HUDStep3CallHelpProps> = ({
  callKeywords,
  transcript,
  onSimulateCall,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-2xl pointer-events-auto">
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          AHA 2025 — ขั้นตอนที่ 3 / 5
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          3. โทรขอความช่วยเหลือและขอเครื่อง AED (Call for Help)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-3">
          ผู้ป่วยไม่รู้สึกตัวและไม่หายใจ! พูดขอความช่วยเหลือให้ครบทั้ง 3 คำสำคัญ:
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              callKeywords.call1669
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/25 text-slate-200'
            }`}
          >
            📞 "โทร 1669" {callKeywords.call1669 ? '✓' : ''}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              callKeywords.unconscious
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/25 text-slate-200'
            }`}
          >
            🚨 "มีคนหมดสติ" {callKeywords.unconscious ? '✓' : ''}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              callKeywords.requestAED
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/25 text-slate-200'
            }`}
          >
            ⚡ "ขอเครื่อง AED" {callKeywords.requestAED ? '✓' : ''}
          </span>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-sky-300 mb-3 font-mono">
          {transcript
            ? `เสียงที่ตรวจพบ: "${transcript}"`
            : '🎙️ พูดใส่ไมโครโฟน: "โทร 1669 มีคนหมดสติ ขอเครื่อง AED"'}
        </div>

        <button
          onClick={onSimulateCall}
          className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl border border-white/20 transition-all"
        >
          จำลองการพูดครบทั้ง 3 คำสำคัญ
        </button>
      </div>
    </div>
  );
};
