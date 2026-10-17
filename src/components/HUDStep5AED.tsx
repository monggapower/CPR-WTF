import React from 'react';

interface HUDStep5AEDProps {
  aedStep: number;
  onAdvanceStep: (step: number) => void;
}

export const HUDStep5AED: React.FC<HUDStep5AEDProps> = ({ aedStep, onAdvanceStep }) => {
  const stepMessages = [
    '👆 ขั้นตอนที่ 1/5 (Click): แตะ/คลิกที่ "ปุ่มเปิดเครื่องสีเขียว" บนโมเดล 3D AED',
    '✋ ขั้นตอนที่ 2/5 (Drag & Drop): ลาก "แผ่นนำไฟฟ้าแผ่นที่ 1" ไปวางที่กรอบสีฟ้า "หน้าอกขวาบน (ใต้ไหปลาร้า)"',
    '✋ ขั้นตอนที่ 3/5 (Drag & Drop): ลาก "แผ่นนำไฟฟ้าแผ่นที่ 2" ไปวางที่กรอบสีฟ้า "ชายโครงซ้ายล่าง"',
    '🔌 ขั้นตอนที่ 4/5 (Drag & Click): ลาก "ขั้วสายสีเหลือง" ไปเสียบที่ช่องเสียบสายบนเครื่อง AED',
    '⏳ กำลังวิเคราะห์คลื่นไฟฟ้าหัวใจ... ห้ามสัมผัสตัวผู้ป่วย!',
    '⚡ ขั้นตอนที่ 5/5 (Click): แนะนำให้ช็อก! แตะ/คลิกที่ "ปุ่ม SHOCK สีส้มกระพริบ" บนโมเดล 3D AED',
    '✅ ทำการช็อกไฟฟ้าสำเร็จ! กำลังเข้าสู่หน้าสรุปผล...',
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-2xl pointer-events-auto">
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          AHA 2025 — ขั้นตอนที่ 5 / 5 (ครบ 2 นาที เครื่อง AED มาถึง)
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          5. การใช้เครื่อง AED 3D (แตะ / ลากวาง &amp; คลิกบนโมเดล 3D)
        </h2>

        {/* 5 Step Pills */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              aedStep > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 0
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/20 text-slate-400'
            }`}
          >
            1. กดเปิดเครื่อง {aedStep > 0 ? '✓' : ''}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              aedStep > 1
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 1
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/20 text-slate-400'
            }`}
          >
            2. ลากแผ่นที่ 1 (อกขวาบน) {aedStep > 1 ? '✓' : ''}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              aedStep > 2
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 2
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/20 text-slate-400'
            }`}
          >
            3. ลากแผ่นที่ 2 (ชายโครงซ้าย) {aedStep > 2 ? '✓' : ''}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              aedStep > 4
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 3 || aedStep === 4
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/20 text-slate-400'
            }`}
          >
            4. เสียบขั้วสาย &amp; วิเคราะห์ {aedStep > 4 ? '✓' : ''}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              aedStep > 5
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 5
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/20 text-slate-400'
            }`}
          >
            5. กดปุ่ม SHOCK {aedStep > 5 ? '✓' : ''}
          </span>
        </div>

        <p className="bg-white/10 text-amber-300 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl mb-3 border border-amber-300/20">
          {stepMessages[aedStep] || ''}
        </p>

        {/* Fallback button to help advance step if needed */}
        {aedStep < 6 && aedStep !== 4 && (
          <button
            onClick={() => onAdvanceStep(aedStep === 3 ? 4 : aedStep + 1)}
            className="text-xs text-slate-300 hover:text-white underline"
          >
            จำลองทำขั้นตอนนี้ (ทางลัด)
          </button>
        )}
      </div>
    </div>
  );
};
