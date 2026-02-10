import React, { useState, useRef, useEffect } from 'react';
import { AnalysisState, AnalysisResult } from '../types';

interface InterventionOverlayProps {
  result: AnalysisResult | null;
  goal: string;
  onStop: () => void;
  onTogglePip?: () => void;
  isPipActive?: boolean;
  isAudioEnabled?: boolean;
  toggleAudio?: () => void;
}

export const InterventionOverlay: React.FC<InterventionOverlayProps> = ({ 
  result, 
  goal, 
  onStop, 
  onTogglePip, 
  isPipActive,
  isAudioEnabled,
  toggleAudio
}) => {
  // Initialize position
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount to be in a nice spot (top right)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const startX = window.innerWidth > 768 ? window.innerWidth - 360 : 20;
      setPosition({ x: startX, y: 80 });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // We need to calculate offset relative to the draggable element's top-left
    // The currentTarget is the header/grip. We need the parent overlay position.
    
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
    if (!isDragging) return;
    e.preventDefault();
    
    // Calculate new position
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    // Relaxed Boundaries: Allow dragging partially off-screen
    // Keep at least 40px visible on any side
    const elementWidth = overlayRef.current?.offsetWidth || 320;
    
    const minX = -elementWidth + 40; // Allow moving left until only 40px remains
    const maxX = window.innerWidth - 40; // Allow moving right until only 40px remains
    const minY = 0; // Keep top visible so we don't lose the drag handle
    const maxY = window.innerHeight - 40; // Allow moving down

    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Determine State Styles
  const state = result?.state || AnalysisState.UNKNOWN;
  const isDistracted = state === AnalysisState.DISTRACTED;
  const isError = state === AnalysisState.ERROR || state === AnalysisState.FRICTION;
  const isCompleted = state === AnalysisState.COMPLETED;

  let borderColor = "border-gray-700";
  let glowColor = "shadow-indigo-500/10";
  let statusColor = "bg-gray-700 text-gray-300";

  if (isDistracted) {
    borderColor = "border-red-500";
    glowColor = "shadow-red-500/30";
    statusColor = "bg-red-500 text-white animate-pulse";
  } else if (isError) {
    borderColor = "border-amber-500";
    glowColor = "shadow-amber-500/30";
    statusColor = "bg-amber-500 text-black";
  } else if (isCompleted) {
    borderColor = "border-cyan-500";
    glowColor = "shadow-cyan-500/40";
    statusColor = "bg-cyan-500 text-black font-bold";
  } else if (state === AnalysisState.SMOOTH) {
    borderColor = "border-emerald-500/50";
    glowColor = "shadow-emerald-500/20";
    statusColor = "bg-emerald-500/20 text-emerald-400";
  }

  return (
    <div 
      ref={overlayRef}
      className={`fixed z-[100] w-[320px] md:w-[350px] bg-gray-900/95 backdrop-blur-md rounded-xl border ${borderColor} shadow-2xl ${glowColor} flex flex-col overflow-hidden transition-shadow duration-300`}
      style={{ 
        left: position.x, 
        top: position.y,
        touchAction: 'none' // Important for dragging on touch devices
      }}
    >
      {/* Draggable Header / Grip */}
      <div 
        className={`h-8 w-full bg-gray-800/50 flex items-center justify-between px-3 cursor-move border-b border-white/5 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2 pointer-events-none">
           <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-red-500/50" />
             <div className="w-2 h-2 rounded-full bg-amber-500/50" />
             <div className="w-2 h-2 rounded-full bg-green-500/50" />
           </div>
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Screen Buddy Live</span>
        </div>
        
        <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button 
                onClick={toggleAudio}
                title={isAudioEnabled ? "Mute Voice Assistant" : "Enable Voice Assistant"}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${isAudioEnabled ? 'text-indigo-400' : 'text-gray-500'}`}
            >
                {isAudioEnabled ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                )}
            </button>

            {/* PiP Toggle Button */}
            <button 
                onClick={onTogglePip} 
                title="Float Overlay (Picture-in-Picture)"
                className={`p-1 rounded hover:bg-white/10 transition-colors ${isPipActive ? 'text-indigo-400' : 'text-gray-400'}`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        
        {/* Status Badge */}
        <div className="flex justify-between items-center">
           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor} flex items-center gap-1`}>
             {isCompleted && (
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
             )}
             {state === AnalysisState.UNKNOWN ? 'CONNECTING...' : state}
           </span>
        </div>

        {/* Goal & Instruction */}
        <div>
           <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Current Goal</p>
           <p className="text-xs text-gray-300 font-medium truncate mb-3 border-b border-gray-800 pb-2">
             {goal || "No goal set"}
           </p>

           <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Micro-Assist</p>
           <p className="text-lg leading-snug font-bold text-white">
             {result?.microAssist || "Analyzing screen..."}
           </p>
        </div>

        {/* Stop Button */}
        <button
          onClick={onStop}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded border border-red-500/20 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Stop Session
        </button>
      </div>
    </div>
  );
};