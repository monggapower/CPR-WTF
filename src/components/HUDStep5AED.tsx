import React, { useState } from 'react';
import { ClearanceKeywords } from '../types';

interface HUDStep5AEDProps {
  aedStep: number;
  clearanceKeywords: ClearanceKeywords;
  transcript: string;
  onAdvanceStep: (step: number) => void;
  onSimulateClearance: () => void;
  onReplayVoice?: () => void;
}

export const HUDStep5AED: React.FC<HUDStep5AEDProps> = ({
  aedStep,
  clearanceKeywords,
  transcript,
  onAdvanceStep,
  onSimulateClearance,
  onReplayVoice,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Updated steps without connecting wire (pre-connected pads)
  const stepMessages: Record<number, string> = {
    0: '👆 ขั้นตอนที่ 1/5: เปิดฝาเครื่อง AED เพื่อเปิดใช้งานอัตโนมัติ (หรือคลิกที่ฝาเครื่อง / ปุ่ม POWER บนโมเดล 3D)',
    1: '✋ ขั้นตอนที่ 2/5: ลาก "แผ่นนำไฟฟ้าที่ 1" ไปวางที่กรอบสีฟ้า "หน้าอกขวาบน (ใต้กระดูกไหปลาร้า)"',
    2: '✋ ขั้นตอนที่ 3/5: ลาก "แผ่นนำไฟฟ้าที่ 2" ไปวางที่กรอบสีฟ้า "ชายโครงซ้ายล่าง (ใต้ราวนม)"',
    3: '⏳ ขั้นตอนที่ 4/5: เครื่อง AED กำลังวิเคราะห์คลื่นหัวใจอัตโนมัติ... ห้ามสัมผัสตัวผู้ป่วย!',
    4: '🗣️ ขั้นตอนที่ 5/5: แนะนำให้ช็อก! กำลังชาร์จพลังงาน... ถอยห่างจากตัวผู้ป่วย (พูดเตือน "ผมถอย คุณถอย ทุกคนถอย")',
    5: '⚡ ทุกคนถอยปลอดภัยแล้ว! แตะที่ "ปุ่ม SHOCK สีส้มกระพริบ" บนตัวเครื่อง 3D AED เพื่อปล่อยไฟฟ้า',
    6: '✅ ทำการช็อกไฟฟ้าสำเร็จ! ปล่อยพลังงานเข้าสู่หัวใจ กำลังเข้าสู่หน้าสรุปผล...',
  };

  const isSafetyClearanceDone =
    clearanceKeywords.iClear && clearanceKeywords.youClear && clearanceKeywords.everybodyClear;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-3 pointer-events-none transition-all">
      <div className="bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 text-center shadow-2xl pointer-events-auto transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-rose-600 text-white text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              AHA 2025 BLS
            </span>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              ฝึกซ้อมใช้เครื่องกระตุกหัวใจ AED (3D)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Replay Thai Voice Instruction */}
            {onReplayVoice && (
              <button
                onClick={onReplayVoice}
                className="bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 hover:text-white border border-sky-400/40 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                title="ฟังเสียงคำสั่งภาษาไทยอีกครั้ง"
              >
                🔊 เสียงคำสั่งไทย
              </button>
            )}

            {/* Quick Skip button */}
            {aedStep < 6 && aedStep !== 3 && aedStep !== 4 && (
              <button
                onClick={() => onAdvanceStep(aedStep === 2 ? 3 : aedStep + 1)}
                className="text-[11px] text-amber-300 hover:text-white underline font-semibold transition-colors"
                title="ข้ามไปขั้นตอนถัดไป"
              >
                ข้าม ⏩
              </button>
            )}

            {/* Collapse / Expand Toggle to keep 3D view clean */}
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-white/15 transition-all"
            >
              {isCollapsed ? 'ขยายคำแนะนำ ▼' : 'ย่อคำแนะนำ ▲'}
            </button>
          </div>
        </div>

        {/* 6 Core Progress Pills - No connecting wire step */}
        <div className="flex flex-wrap gap-1 justify-center mb-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 0
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            1. เปิดฝาเครื่อง (Auto-ON) {aedStep > 0 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep > 1
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 1
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            2. แผ่นที่ 1 (อกขวาบน) {aedStep > 1 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep > 2
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 2
                ? 'bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            3. แผ่นที่ 2 (ชายโครงซ้าย) {aedStep > 2 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep > 3
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 3
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            4. วิเคราะห์คลื่นหัวใจ {aedStep > 3 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep > 4
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 4
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            5. เคลียร์ความปลอดภัย {aedStep > 4 ? '✓' : ''}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
              aedStep >= 6
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : aedStep === 5
                ? 'bg-rose-500/30 border-rose-400 text-rose-200 ring-2 ring-rose-400/50 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            6. ช็อก (SHOCK) {aedStep >= 6 ? '✓' : ''}
          </span>
        </div>

        {/* Current Instruction Banner */}
        <p
          className={`font-semibold text-xs sm:text-sm py-1.5 px-3 rounded-xl border transition-all ${
            aedStep === 4
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              : aedStep === 5
              ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
              : aedStep === 3
              ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/40 animate-pulse'
              : 'bg-white/10 text-amber-300 border-white/15'
          }`}
        >
          {stepMessages[aedStep] || ''}
        </p>

        {/* Interactive Controls (collapsed when user wants clean 3D view) */}
        {!isCollapsed && (
          <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-col items-center gap-2">
            {/* Step 0: Open Lid / Power Button */}
            {aedStep === 0 && (
              <button
                onClick={() => onAdvanceStep(1)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-1.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <span>🔓 เปิดฝาครอบเครื่อง AED (เครื่องเปิดทำงานอัตโนมัติ) / แตะปุ่ม POWER</span>
              </button>
            )}

            {/* Step 1: Pad 1 Placement */}
            {aedStep === 1 && (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="text-[11px] text-slate-300">
                  💡 ลากแผ่นที่ 1 หรือแตะที่แผ่น/กรอบสีฟ้าบนหน้าอก
                </span>
                <button
                  onClick={() => onAdvanceStep(2)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow transition-all"
                >
                  📍 วางแผ่นที่ 1 (อกขวาบน) ทันที
                </button>
              </div>
            )}

            {/* Step 2: Pad 2 Placement */}
            {aedStep === 2 && (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="text-[11px] text-slate-300">
                  💡 ลากแผ่นที่ 2 หรือแตะที่แผ่น/กรอบสีฟ้าชายโครงซ้าย
                </span>
                <button
                  onClick={() => onAdvanceStep(3)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow transition-all"
                >
                  📍 วางแผ่นที่ 2 (ชายโครงซ้าย) ทันที
                </button>
              </div>
            )}

            {/* Step 3: Automated ECG Analysis Status */}
            {aedStep === 3 && (
              <div className="flex items-center gap-2 text-xs text-yellow-300 font-mono py-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></span>
                <span>AED กำลังตรวจสอบจังหวะการเต้นของหัวใจ... (3 วินาที)</span>
              </div>
            )}

            {/* Step 4: Safety Clearance via Voice ('ผม/ฉันถอย คุณถอย ทุกคนถอย') */}
            {aedStep === 4 && (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="text-[11px] text-slate-200">
                  พูดเคลียร์ความปลอดภัยให้ครบ 3 คำสำคัญ หรือกดจำลองเสียง:
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

                <div className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-sky-300 font-mono text-center">
                  {transcript
                    ? `เสียงที่ตรวจพบ: "${transcript}"`
                    : '🎙️ กำลังฟังไมโครโฟน: "ผมถอย คุณถอย ทุกคนถอย" ...'}
                </div>

                <button
                  onClick={onSimulateClearance}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow transition-all"
                >
                  จำลองการพูด "ฉันถอย คุณถอย ทุกคนถอย" (ผ่านความปลอดภัย)
                </button>
              </div>
            )}

            {/* Step 5: Deliver Shock */}
            {aedStep === 5 && (
              <button
                onClick={() => onAdvanceStep(6)}
                className="bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-black text-sm sm:text-base py-2.5 px-8 rounded-2xl shadow-xl shadow-rose-950/60 border border-rose-400/50 animate-pulse transition-all transform hover:scale-105"
              >
                ⚡ กดปุ่ม SHOCK ทำการช็อกไฟฟ้า (หรือคลิกปุ่มส้มบน 3D)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
