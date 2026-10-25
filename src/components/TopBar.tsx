import React from 'react';
import { Sparkles } from 'lucide-react';

export type ActiveTab = 'mock-test' | 'transcript-trace';

interface TopBarProps {
  activeTab: ActiveTab;
  activePart: 1 | 2 | 3;
  onSelectTab: (tab: ActiveTab) => void;
  onJumpToPart: (part: 1 | 2 | 3) => void;
  onQuickStartNew: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  activePart,
  onSelectTab,
  onJumpToPart,
  onQuickStartNew,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white/95 border-b border-pink-200/80">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#cozyspeak"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('mock-test');
        }}
        className="text-lg font-bold tracking-tight text-[#4A1D3E] whitespace-nowrap shrink-0 font-display"
      >
        🍓 CozySpeak IELTS
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav
        aria-label="Main Navigation"
        className="flex items-center gap-6 text-sm font-medium text-[#7A496B] overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => onJumpToPart(1)}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'mock-test' && activePart === 1
              ? 'border-pink-500 text-[#4A1D3E] font-bold'
              : 'border-transparent hover:text-[#4A1D3E] hover:border-pink-200'
          }`}
        >
          Part 1 · Warm-up
        </button>
        <button
          type="button"
          onClick={() => onJumpToPart(2)}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'mock-test' && activePart === 2
              ? 'border-pink-500 text-[#4A1D3E] font-bold'
              : 'border-transparent hover:text-[#4A1D3E] hover:border-pink-200'
          }`}
        >
          Part 2 · Cue Card
        </button>
        <button
          type="button"
          onClick={() => onJumpToPart(3)}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'mock-test' && activePart === 3
              ? 'border-pink-500 text-[#4A1D3E] font-bold'
              : 'border-transparent hover:text-[#4A1D3E] hover:border-pink-200'
          }`}
        >
          Part 3 · Discussion
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('transcript-trace')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'transcript-trace'
              ? 'border-pink-500 text-[#4A1D3E] font-bold'
              : 'border-transparent hover:text-[#4A1D3E] hover:border-pink-200'
          }`}
        >
          Transcript &amp; Log
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onQuickStartNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-pink-500 rounded-xl hover:bg-pink-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>New Mock Test</span>
        </button>
      </div>
    </header>
  );
};
