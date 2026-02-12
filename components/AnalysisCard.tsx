import React from 'react';
import { AnalysisResult, AnalysisState, ConfidenceLevel } from '../types';

interface AnalysisCardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  statusMessage?: string;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ result, isLoading, statusMessage }) => {
  if (!result) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-[2.5rem] bg-slate-900/20 glass transition-all duration-700 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse-slow"></div>
          <div className="w-24 h-24 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-center relative transform group-hover:scale-110 transition-transform duration-500">
             <svg className="w-12 h-12 text-slate-700 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
             </svg>
          </div>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tighter mb-2 uppercase italic">Awaiting Directives</h2>
        <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">
          Screen Buddy is in standby mode. Input your operational goal above to initialize real-time navigation assist.
        </p>
      </div>
    );
  }

  const getStateStyles = (state: AnalysisState) => {
    switch (state) {
      case AnalysisState.COMPLETED: return { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.2)]' };
      case AnalysisState.SMOOTH: return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' };
      case AnalysisState.DISTRACTED: return { text: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]', animate: 'animate-[pulse_1s_infinite]' };
      case AnalysisState.CLARIFY: return { text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/10', glow: 'shadow-[0_0_20px_rgba(232,121,249,0.2)]' };
      default: return { text: 'text-indigo-400', border: 'border-white/10', bg: 'bg-white/5', glow: '' };
    }
  };

  const styles = getStateStyles(result.state);

  return (
    <div className={`relative group animate-slide-up`}>
      {/* HUD Border Accents */}
      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-lg"></div>
      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-lg"></div>
      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-lg"></div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-indigo-500/50 rounded-br-lg"></div>

      <div className={`relative glass-card rounded-[2rem] overflow-hidden transition-all duration-500 border ${styles.border} ${styles.glow}`}>
        
        {/* Progress Scanner Animation */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
           <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-scan"></div>
        </div>

        {/* HUD Header */}
        <div className="flex items-center justify-between p-8 pb-4 border-b border-white/5 bg-white/2">
           <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Processing Engine</span>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black border tracking-widest ${styles.bg} ${styles.text} ${styles.border} ${styles.animate || ''}`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${styles.text.replace('text-', 'bg-')} shadow-sm`}></span>
                 {result.state}
              </div>
           </div>
           
           <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Signal Confidence</span>
              <div className="flex items-center justify-end gap-3 mt-1">
                <span className="text-xs font-mono font-bold text-white">{result.confidence}</span>
                <div className="flex gap-1">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className={`w-3 h-1.5 rounded-sm ${
                        result.confidence === ConfidenceLevel.HIGH ? (i < 3 ? 'bg-emerald-500' : 'bg-white/10') :
                        result.confidence === ConfidenceLevel.MEDIUM ? (i < 2 ? 'bg-amber-500' : 'bg-white/10') :
                        (i < 1 ? 'bg-rose-500' : 'bg-white/10')
                     }`}></div>
                   ))}
                </div>
              </div>
           </div>
        </div>

        {/* HUD Main Display */}
        <div className="p-8 md:p-10 space-y-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-indigo-500"></div>
              Current Scene Analysis
            </h3>
            <p className="text-xl md:text-2xl text-slate-100 font-medium leading-relaxed tracking-tight">
              {result.observation}
            </p>
          </div>

          <div className="relative">
             <div className={`absolute inset-0 blur-xl opacity-20 ${styles.text.replace('text-', 'bg-')}`}></div>
             <div className={`relative p-8 rounded-3xl border ${styles.border} ${styles.bg} overflow-hidden group/assist`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                
                <h3 className={`text-[10px] font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2 ${styles.text}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Tactical Recommendation
                </h3>
                
                <p className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none group-hover/assist:translate-x-1 transition-transform">
                  {result.microAssist}
                </p>
             </div>
          </div>

          {result.automationSuggestion && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 shadow-inner">
               <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Efficiency Shortcut Detected</h4>
                  <p className="text-sm text-slate-400 italic font-medium">"{result.automationSuggestion}"</p>
               </div>
            </div>
          )}
        </div>
        
        {/* Status Bar */}
        <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
           <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                 <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                 SYS_TIME: {new Date().toLocaleTimeString()}
              </div>
           </div>
           {isLoading && (
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 animate-pulse">Syncing Frame...</span>
                 <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};