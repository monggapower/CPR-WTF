import React from 'react';

interface HUDStep1SceneSafetyProps {
  hazardsCleared: number;
  totalHazards: number;
  onConfirmSafe: () => void;
}

export const HUDStep1SceneSafety: React.FC<HUDStep1SceneSafetyProps> = ({
  hazardsCleared,
  totalHazards,
  onConfirmSafe,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-2xl pointer-events-auto">
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          AHA 2025 — ขั้นตอนที่ 1 / 5
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          1. ตรวจสอบความปลอดภัยของสถานที่ (Verify Scene Safety)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-3">
          สำรวจรอบตัวผู้ป่วยในฉาก 3D และแตะ/ลากสิ่งกีดขวางอันตรายออกก่อนเข้าไปช่วยเหลือ
        </p>

        <div className="bg-white/10 text-amber-300 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl mb-4 border border-amber-300/20">
          เคลียร์จุดเสี่ยงแล้ว: {hazardsCleared} / {totalHazards} จุด (แตะหรือลากวัตถุอันตรายในฉาก 3D ออก)
        </div>

        <button
          onClick={onConfirmSafe}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
        >
          สถานที่ปลอดภัยแล้ว (ยืนยัน)
        </button>
      </div>
    </div>
  );
};
