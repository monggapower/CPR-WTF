import React from 'react';
import { ClearanceKeywords } from '../types';

interface HUDStep5AEDProps {
  aedStep: number;
  clearanceKeywords: ClearanceKeywords;
  transcript: string;
  onAdvanceStep: (step: number) => void;
  onSimulateClearance: () => void;
}

export const HUDStep5AED: React.FC<HUDStep5AEDProps> = ({
  aedStep,
  clearanceKeywords,
  transcript,
  onAdvanceStep,
  onSimulateClearance,
}) => {
  const stepMessages: Record<number, string> = {
    0: '👆 ขั้นตอนที่ 1/5: แตะ/คลิกที่ "ปุ่มเปิดเครื่องสีเขียว" บนโมเดล 3D AED',
    1: '✋ ขั้นตอนที่ 2/5: ลาก "แผ่นที่ 1" ไปวางที่กรอบสีฟ้า "หน้าอกขวาบน (ใต้ไหปลาร้า)"',
    2: '✋ ขั้นตอนที่ 3/5: ลาก "แผ่นที่ 2" ไปวางที่กรอบสีฟ้า "ชายโครงซ้ายล่าง"',
    3: '🔌 ขั้นตอนที่ 4/5: ลาก "ขั้วสายสีเหลือง" ไปเสียบที่ช่องเสียบสายบนเครื่อง AED',
    4: '⏳ กำลังวิเคราะห์คลื่นไฟฟ้าหัวใจ... ห้ามสัมผัสตัวผู้ป่วย!',
    5: '🗣️ แนะนำให้ช็อก! พูดเตือนรอบข้าง: "ผมถอย คุณถอย ทุกคนถอย" (หรือ "ฉันถอย...")',
    6: '⚡ ทุกคนถอยแล้ว! แตะ/คลิกที่ "ปุ่ม SHOCK สีส้มกระพริบ" บนโมเดล 3D AED',
    7: '✅ ทำการช็อกไฟฟ้าสำเร็จ! กำลังเข้าสู่หน้าสรุปผล...',
  };

  const isSafetyClearanceDone =
    clearanceKeywords.iClear && clearanceKeywords.youClear && clearanceKeywords.everybodyClear;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shadow-2xl pointer-events-auto transition-all">
        {/* Step Badge & Title Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-block bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            AHA 2025 — ขั้นตอนที่ 5/5
          </div>
          <span className="text-xs sm:text-sm font-bold text-white truncate">
            การใช้เครื่อง AED 3D
          </span>
          {aedStep < 7 && aedStep !== 4 && aedStep !== 5 && (
            <button
              onClick={() => onAdvanceStep(aedStep === 3 ? 4 : aedStep + 1)}
              className="text-[11px] text-amber-300 hover:text-white underline font-medium"
            >
              ทางลัด ⏩
            </button>
          )}
        </div>

        {/* 6 Step Pills Header */}
        <div className="flex flex-wrap gap-1 justify-center mb-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 0
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            1. เปิดเครื่อง {aedStep > 0 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep > 1
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 1
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            2. แผ่นที่ 1 {aedStep > 1 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep > 2
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 2
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            3. แผ่นที่ 2 {aedStep > 2 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep > 3
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 3
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            4. เสียบสาย {aedStep > 3 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep > 5
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 5
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            5. เคลียร์ความปลอดภัย {aedStep > 5 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
              aedStep >= 7
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 6
                ? 'bg-rose-500/30 border-rose-400 text-rose-200 ring-2 ring-rose-400/50 animate-pulse'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}
          >
            6. ช็อก (SHOCK) {aedStep >= 7 ? '✓' : ''}
          </span>
        </div>

        {/* Current Instruction Banner */}
        <p
          className={`font-semibold text-xs sm:text-sm py-2 px-3 rounded-xl border ${
            aedStep === 5
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              : aedStep === 6
              ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
              : 'bg-white/10 text-amber-300 border-white/15'
          }`}
        >
          {stepMessages[aedStep] || ''}
        </p>

        {/* Special Safety Clearance Section (Step 5) */}
        {aedStep === 5 && (
          <div className="mt-2.5 pt-2 border-t border-white/15 flex flex-col items-center gap-2">
            <div className="text-[11px] text-slate-200">
              กรุณาพูดเคลียร์ความปลอดภัยให้ครบทั้ง 3 ส่วน:
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  clearanceKeywords.iClear
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                🗣️ "ผม/ฉันถอย" {clearanceKeywords.iClear ? '✓' : ''}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  clearanceKeywords.youClear
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                🗣️ "คุณถอย" {clearanceKeywords.youClear ? '✓' : ''}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  clearanceKeywords.everybodyClear
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                🗣️ "ทุกคนถอย" {clearanceKeywords.everybodyClear ? '✓' : ''}
              </span>
            </div>

            <div className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-sky-300 font-mono">
              {transcript
                ? `เสียงที่ตรวจพบ: "${transcript}"`
                : '🎙️ กำลังฟังเสียง: "ผมถอย คุณถอย ทุกคนถอย" ...'}
            </div>

            <button
              onClick={onSimulateClearance}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg shadow transition-all"
            >
              จำลองพูด "ฉันถอย คุณถอย ทุกคนถอย" (ผ่านความปลอดภัย)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
