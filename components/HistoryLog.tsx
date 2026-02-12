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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Session Steps
      </h3>
      
      <div className="space-y-3">
        {history.slice(0, 8).map((item, index) => (
          <div 
            key={item.timestamp} 
            className="group relative bg-gray-900/40 border border-gray-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all duration-300 hover:bg-gray-800/80 hover:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 history-item-enter"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Status Dot */}
            <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                <div className={`mt-1.5 sm:mt-0 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  item.state === AnalysisState.COMPLETED ? 'bg-cyan-900 text-cyan-300 border-cyan-700' :
                  item.state === AnalysisState.SMOOTH ? 'bg-emerald-900 text-emerald-300 border-emerald-700' :
                  'bg-gray-800 text-gray-400 border-gray-600'
                }`}>
                    {history.length - index}
                </div>
                
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors duration-200">
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