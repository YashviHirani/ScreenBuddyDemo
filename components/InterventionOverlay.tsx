import React, { useRef, useEffect, useState } from 'react';
import { AnalysisState, AnalysisResult } from '../types';

interface InterventionOverlayProps {
  result: AnalysisResult | null;
  goal: string;
  onStop: () => void;
  onTogglePip?: () => void;
  isPipActive?: boolean;
  isAudioEnabled?: boolean;
  toggleAudio?: () => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
}

export const InterventionOverlay: React.FC<InterventionOverlayProps> = ({ 
  result, 
  goal, 
  onStop, 
  onTogglePip, 
  isPipActive,
  isAudioEnabled,
  toggleAudio,
  isMinimized,
  setIsMinimized
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [dimensions, setDimensions] = useState({ width: 380, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isMinimized) {
      const startX = window.innerWidth > 768 ? window.innerWidth - dimensions.width - 40 : 20;
      setPosition(prev => ({ ...prev, x: startX }));
    }
  }, [isMinimized, dimensions.width]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMinimized || isResizing) return;
    setIsDragging(true);
    const overlayRect = overlayRef.current?.getBoundingClientRect();
    if (overlayRect) {
        dragOffset.current = {
            x: e.clientX - overlayRect.left,
            y: e.clientY - overlayRect.top
        };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      setDimensions({
        width: Math.max(300, Math.min(600, resizeStart.current.w + deltaX)),
        height: Math.max(200, Math.min(600, resizeStart.current.h + deltaY))
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: dimensions.width, h: dimensions.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const state = result?.state || AnalysisState.UNKNOWN;
  const isDistracted = state === AnalysisState.DISTRACTED;
  const isClarify = state === AnalysisState.CLARIFY;

  const getTheme = () => {
    if (isDistracted) return { accent: 'rose-500', text: 'text-rose-400', border: 'border-rose-500/40', glow: 'shadow-rose-500/20' };
    if (isClarify) return { accent: 'fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-500/40', glow: 'shadow-fuchsia-500/20' };
    return { accent: 'indigo-500', text: 'text-indigo-400', border: 'border-white/10', glow: 'shadow-indigo-500/20' };
  };

  const theme = getTheme();

  if (isMinimized) {
    return (
        <div className={`fixed bottom-0 left-0 right-0 z-[100] h-16 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 flex items-center px-8 justify-between shadow-[0_-20px_50px_rgba(0,0,0,0.5)]`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full bg-${theme.accent} ${isDistracted || isClarify ? 'animate-pulse' : ''} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                <p className="text-white font-black text-sm uppercase italic truncate max-w-[60%] tracking-tight">
                    {result?.microAssist || "Systems Initializing..."}
                </p>
                <span className="hidden md:block text-[9px] font-mono text-slate-500 border-l border-white/5 pl-4 uppercase tracking-[0.2em]">{goal}</span>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={onTogglePip} className={`p-2 rounded-xl glass border border-white/5 ${isPipActive ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}>
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => setIsMinimized(false)} className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Restore HUD</button>
                <button onClick={onStop} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div 
      ref={overlayRef}
      className={`fixed z-[100] bg-slate-900/90 backdrop-blur-2xl rounded-3xl border ${theme.border} shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden group/overlay transition-shadow duration-500 ${theme.glow}`}
      style={{ left: position.x, top: position.y, width: dimensions.width, height: dimensions.height, touchAction: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div 
        className={`h-12 w-full bg-black/40 flex items-center justify-between px-4 cursor-grab border-b border-white/5 active:cursor-grabbing`}
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-3">
           <div className={`w-2 h-2 rounded-full bg-${theme.accent} ${isDistracted ? 'animate-pulse' : ''}`}></div>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational HUD</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={toggleAudio} className={`p-2 rounded-lg hover:bg-white/5 ${isAudioEnabled ? 'text-indigo-400' : 'text-slate-600'}`}>
                {isAudioEnabled ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
            </button>
            <button onClick={() => setIsMinimized(true)} className="p-2 rounded-lg hover:bg-white/5 text-slate-600 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme.text}`}>Tactical Alert</span>
             <div className={`flex-1 h-[1px] ${theme.text.replace('text-', 'bg-')} opacity-20`}></div>
           </div>
           <p className={`text-2xl font-black italic tracking-tighter uppercase leading-tight ${isClarify ? 'text-fuchsia-300' : 'text-white'}`}>
             {result?.microAssist || "Analyzing..."}
           </p>
        </div>

        <div className="mt-8 space-y-3">
            <div className="flex gap-2">
               <button onClick={onTogglePip} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${isPipActive ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  {isPipActive ? 'FLOAT_ON' : 'FLOAT_WINDOW'}
               </button>
               <button onClick={onStop} className="w-14 flex items-center justify-center py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-end justify-end p-2 z-10 opacity-40 group-hover/overlay:opacity-100 transition-opacity"
        onPointerDown={handleResizeDown}
      >
        <div className="w-4 h-4 border-r-2 border-b-2 border-white/20 rounded-br-sm"></div>
      </div>
    </div>
  );
};