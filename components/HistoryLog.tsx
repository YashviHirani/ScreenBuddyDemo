import React from 'react';
import { AnalysisResult, AnalysisState } from '../types';

interface HistoryLogProps {
  history: AnalysisResult[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Recent Interventions</h3>
      <div className="space-y-3">
        {history.slice(0, 5).map((item) => (
          <div key={item.timestamp} className="bg-gray-900/40 border border-gray-800/60 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors hover:bg-gray-800/40 hover:border-gray-700">
            <div className="flex items-start gap-3 w-full sm:w-auto flex-1 min-w-0">
                <div className={`mt-1.5 sm:mt-0 w-2 h-2 shrink-0 rounded-full ${
                  item.state === AnalysisState.COMPLETED ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' :
                  item.state === AnalysisState.SMOOTH ? 'bg-emerald-500' :
                  item.state === AnalysisState.FRICTION ? 'bg-amber-500' :
                  item.state === AnalysisState.ERROR ? 'bg-rose-500' :
                  'bg-indigo-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{item.microAssist}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.observation}</p>
                </div>
            </div>
            <span className="text-xs text-gray-600 font-mono whitespace-nowrap ml-5 sm:ml-0 self-start sm:self-auto">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};