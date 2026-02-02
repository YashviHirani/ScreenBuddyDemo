import React from 'react';

interface HeaderProps {
  isLive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isLive }) => {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white truncate">Screen Buddy</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs font-medium border ${isLive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="hidden sm:inline">{isLive ? 'MONITORING ACTIVE' : 'STANDBY'}</span>
          <span className="sm:hidden">{isLive ? 'ACTIVE' : 'IDLE'}</span>
        </div>
      </div>
    </header>
  );
};