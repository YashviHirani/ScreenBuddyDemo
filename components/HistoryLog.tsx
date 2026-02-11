import React from 'react';
import { AnalysisResult, AnalysisState } from '../types';

interface HistoryLogProps {
  history: AnalysisResult[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Inline styles for simple enter animation */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .history-item-enter {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Recent Activity
      </h3>
      
      <div className="space-y-3">
        {history.slice(0, 5).map((item, index) => (
          <div 
            key={item.timestamp} 
            className="group relative bg-gray-900/40 border border-gray-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all duration-300 hover:bg-gray-800/80 hover:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 history-item-enter"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Status Dot */}
            <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                <div className={`mt-1.5 sm:mt-0 w-2.5 h-2.5 shrink-0 rounded-full transition-all duration-300 group-hover:scale-110 ${
                  item.state === AnalysisState.COMPLETED ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] group-hover:shadow-[0_0_12px_rgba(6,182,212,0.8)]' :
                  item.state === AnalysisState.SMOOTH ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' :
                  item.state === AnalysisState.FRICTION ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]' :
                  item.state === AnalysisState.ERROR ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]' :
                  'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]'
                }`} />
                
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors duration-200">
                    {item.microAssist}
                  </p>
                  <p className="text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors duration-200">
                    {item.observation}
                  </p>
                </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center self-end sm:self-auto ml-6 sm:ml-0">
              <span className="text-[10px] font-mono text-gray-600 bg-gray-950/50 px-2 py-1 rounded border border-gray-800 group-hover:border-gray-700 group-hover:text-gray-500 transition-colors duration-200 whitespace-nowrap">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};