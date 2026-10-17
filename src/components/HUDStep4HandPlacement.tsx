import React, { useState } from 'react';

interface HUDStep4HandPlacementProps {
  onConfirmStartCPR: () => void;
}

export const HUDStep4HandPlacement: React.FC<HUDStep4HandPlacementProps> = ({
  onConfirmStartCPR,
}) => {
  const [checkedTarget, setCheckedTarget] = useState<boolean>(false);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="max-w-xl w-full my-auto flex flex-col items-center py-6">
        {/* Header Badge */}
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          AHA 2025 — ขั้นตอนที่ 4.3 (ตำแหน่งวางมือ)
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-1">
          ตำแหน่งวางมือกดหน้าอก (Hand Placement on Lower Sternum)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 text-center mb-4 max-w-md">
          การวางมือในตำแหน่งที่ถูกต้องช่วยให้การกดหน้าอกมีประสิทธิภาพสูงสุดและลดโอกาสเกิดกระดูกซี่โครงหัก
        </p>

        {/* Anatomical Torso Landmark Visual */}
        <div className="w-full bg-slate-900/90 border border-white/15 rounded-3xl p-5 mb-4 shadow-2xl relative flex flex-col items-center">
          <div className="relative w-64 h-56 bg-slate-800/80 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden mb-3">
            {/* Torso Silhouette Graphic */}
            <svg viewBox="0 0 200 220" className="w-full h-full p-2" aria-hidden="true">
              {/* Torso Outline */}
              <path
                d="M40 70 C40 40, 70 30, 100 30 C130 30, 160 40, 160 70 L155 190 C155 205, 135 215, 100 215 C65 215, 45 205, 45 190 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="2"
              />
              {/* Clavicles */}
              <path d="M60 45 Q100 55 140 45" fill="none" stroke="#64748b" strokeWidth="2.5" />
              {/* Rib cage outlines */}
              <path d="M65 90 Q100 110 135 90" fill="none" stroke="#334155" strokeWidth="1.5" />
              <path d="M60 115 Q100 135 140 115" fill="none" stroke="#334155" strokeWidth="1.5" />
              <path d="M60 140 Q100 160 140 140" fill="none" stroke="#334155" strokeWidth="1.5" />

              {/* Sternum (Bone Center) */}
              <rect x="94" y="55" width="12" height="75" rx="3" fill="#64748b" opacity="0.6" />

              {/* Nipple Line (Reference) */}
              <line x1="55" y1="105" x2="145" y2="105" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="68" cy="105" r="3.5" fill="#f43f5e" />
              <circle cx="132" cy="105" r="3.5" fill="#f43f5e" />

              {/* Lower Sternum Target Box (Flashing Green) */}
              <g
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setCheckedTarget(true)}
              >
                <rect
                  x="82"
                  y="92"
                  width="36"
                  height="34"
                  rx="6"
                  fill="rgba(34, 197, 94, 0.3)"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
                <circle cx="100" cy="109" r="6" fill="#22c55e" />
                <path d="M96 109 L104 109 M100 105 L100 113" stroke="#ffffff" strokeWidth="2" />
              </g>

              {/* Xiphoid Process (Danger area below) */}
              <polygon points="100,135 96,143 104,143" fill="#ef4444" opacity="0.7" />
            </svg>

            <div className="absolute bottom-2 text-[10px] text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded-full">
              กึ่งกลางหน้าอกระดับราวนม (ครึ่งล่างของกระดูกสันอก)
            </div>
          </div>

          {/* 4 AHA Criteria Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-start gap-2">
              <span className="text-emerald-400 text-sm font-bold">1.</span>
              <div className="text-xs text-slate-200">
                <b className="text-white">วางส้นมือ:</b> กึ่งกลางหน้าอกบน <b>"ครึ่งล่างของกระดูกอก"</b> (เหนือลิ้นปี่ 2 นิ้วมือ)
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-start gap-2">
              <span className="text-emerald-400 text-sm font-bold">2.</span>
              <div className="text-xs text-slate-200">
                <b className="text-white">ประสานนิ้วมือ:</b> วางมืออีกข้างทับลงไป ประสานนิ้วมือทั้งสองข้างเข้าด้วยกัน
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-start gap-2">
              <span className="text-emerald-400 text-sm font-bold">3.</span>
              <div className="text-xs text-slate-200">
                <b className="text-white">ยกปลายนิ้ว:</b> ไม่ให้นิ้วกดลงบนกระดูกซี่โครง เพื่อป้องกันการบาดเจ็บ
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-start gap-2">
              <span className="text-emerald-400 text-sm font-bold">4.</span>
              <div className="text-xs text-slate-200">
                <b className="text-white">แนวแรงตั้งฉาก:</b> แขนเหยียดตึง ล็อกข้อศอก ทิ้งน้ำหนักตัวจากหัวไหล่ตรงจุด
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Button */}
        <button
          onClick={onConfirmStartCPR}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-base px-10 py-3.5 rounded-2xl shadow-xl shadow-emerald-950/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-400/40"
        >
          วางมือถูกต้องแล้ว — เริ่มกดหน้าอก 2 นาที ➔
        </button>
      </div>
    </div>
  );
};
