import React from 'react';

interface HeaderProps {
  isLive: boolean;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  lastVoiceCommand?: string;
}

export const Header: React.FC<HeaderProps> = ({ isLive, isVoiceActive, onToggleVoice, lastVoiceCommand }) => {
  return (
    <header className="flex items-center justify-between px-6 py-5 glass border-b border-white/5 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
            <svg className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Antigravity</h1>
          <p className="text-[9px] font-mono text-indigo-400 tracking-[0.3em] uppercase opacity-80">Cognitive Assist v3.1</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {lastVoiceCommand && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5 animate-slide-up">
            <span className="w-1 h-1 rounded-full bg-indigo-500 animate-ping"></span>
            <span className="text-[10px] font-mono text-gray-400 uppercase">Command Received: <span className="text-indigo-300">"{lastVoiceCommand}"</span></span>
          </div>
        )}

        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-full border border-white/5">
            <button 
                onClick={onToggleVoice}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${isVoiceActive ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
            >
                {isVoiceActive ? 'VOICE LSN' : 'VOICE OFF'}
            </button>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-white/5 ${isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-gray-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-700'}`} />
              {isLive ? 'LIVE_SYNC' : 'STANDBY'}
            </div>
        </div>
      </div>
    </header>
  );
};