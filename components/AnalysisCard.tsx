import React from 'react';
import { AnalysisResult, AnalysisState, ConfidenceLevel } from '../types';

interface AnalysisCardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ result, isLoading }) => {
  if (!result) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl bg-gray-900/50">
        <svg className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-base md:text-lg font-medium">Ready to analyze</p>
        <p className="text-xs md:text-sm opacity-60">Start screen sharing to begin.</p>
      </div>
    );
  }

  const getStateColor = (state: AnalysisState) => {
    switch (state) {
      case AnalysisState.COMPLETED: return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
      case AnalysisState.SMOOTH: return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case AnalysisState.FRICTION: return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case AnalysisState.ERROR: return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      case AnalysisState.DISTRACTED: return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
      default: return 'text-gray-400 border-gray-700 bg-gray-800';
    }
  };

  const getConfidenceColor = (conf: ConfidenceLevel) => {
    switch (conf) {
      case ConfidenceLevel.HIGH: return 'bg-emerald-500';
      case ConfidenceLevel.MEDIUM: return 'bg-amber-500';
      case ConfidenceLevel.LOW: return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative group">
       {/* Glow effect based on state */}
      <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 transition duration-1000 group-hover:opacity-40 ${getStateColor(result.state).split(' ')[0].replace('text-', 'bg-')}`}></div>
      
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-8 shadow-2xl transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4 sm:gap-0">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Current State</span>
            <div className={`self-start inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getStateColor(result.state)}`}>
               {result.state === AnalysisState.COMPLETED && (
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
               )}
               {result.state}
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 sm:gap-1">
             <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Confidence</span>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">{result.confidence}</span>
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(result.confidence)}`} />
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm text-gray-400 mb-2 font-medium uppercase tracking-wide">Observation</h3>
            <p className="text-base md:text-lg text-gray-200 leading-relaxed">
              {result.observation}
            </p>
          </div>

          <div className="bg-gradient-to-r from-gray-800 to-gray-800/50 p-4 md:p-5 rounded-xl border border-gray-700/50 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${result.state === AnalysisState.COMPLETED ? 'bg-cyan-500' : 'bg-blue-500'}`}></div>
            <h3 className={`${result.state === AnalysisState.COMPLETED ? 'text-cyan-400' : 'text-blue-400'} text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Micro-Assist
            </h3>
            <p className="text-lg md:text-xl font-medium text-white leading-snug">
              {result.microAssist}
            </p>
          </div>
        </div>
        
        {isLoading && (
          <div className="absolute top-4 right-4">
             <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin opacity-50"></div>
          </div>
        )}
      </div>
    </div>
  );
};