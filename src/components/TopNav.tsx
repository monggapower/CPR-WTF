import React from 'react';
import { AppMode } from '../types';

interface TopNavProps {
  mode: AppMode;
  isMetronomePlaying: boolean;
  onHomeClick: () => void;
  onMetronomeToggle: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  mode,
  isMetronomePlaying,
  onHomeClick,
  onMetronomeToggle,
}) => {
  const isVisible = mode !== 'mainMenu' && mode !== 'summary';
  const showMetronome = mode === 'activeCPR';

  if (!isVisible) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-3 pointer-events-auto">
      <button
        onClick={onHomeClick}
        className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white px-4 py-2 rounded-xl backdrop-blur-md border border-white/15 transition-all text-sm font-semibold shadow-lg"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 3.1 2.6 11h2.2v9.4c0 .6.5 1.1 1.1 1.1h4.2v-6.5h3.8v6.5h4.2c.6 0 1.1-.5 1.1-1.1V11h2.2L12 3.1z" />
        </svg>
        <span>หน้าหลัก</span>
      </button>

      {showMetronome && (
        <button
          onClick={onMetronomeToggle}
          title={isMetronomePlaying ? 'ปิดเมโทรนอม (110 BPM)' : 'เปิดเมโทรนอม (110 BPM)'}
          className={`p-2.5 rounded-xl backdrop-blur-md border border-white/15 transition-all shadow-lg ${
            isMetronomePlaying
              ? 'bg-emerald-600 text-white animate-pulse'
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          aria-label="Metronome"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 21h16" />
            <path d="M12 5l5 16H7l5-16z" />
            <path d="M12 5v6" />
          </svg>
        </button>
      )}
    </nav>
  );
};
