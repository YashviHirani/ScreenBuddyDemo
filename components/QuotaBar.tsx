import React from 'react';
import { MAX_QUOTA, SAFETY_LIMIT } from '../services/quotaManager';

interface QuotaBarProps {
  current: number;
  isGlobalLimit?: boolean;
}

export const QuotaBar: React.FC<QuotaBarProps> = ({ current, isGlobalLimit = false }) => {
  const percentage = Math.min(100, (current / MAX_QUOTA) * 100);
  
  // Determine Visual State
  let colorClass = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let labelText = `${current} / ${MAX_QUOTA}`;
  let statusText = null;

  // Logic: If the App thinks we are okay (count < limit), but the API says NO (isGlobalLimit),
  // then the Key is dead externally.
  if (isGlobalLimit && current < SAFETY_LIMIT) {
    colorClass = 'bg-red-600 animate-pulse';
    textColor = 'text-red-500';
    labelText = "API KEY EXHAUSTED";
    statusText = "Google-side limit reached (0 remaining)";
  } 
  else if (current >= SAFETY_LIMIT) {
    colorClass = 'bg-red-500';
    textColor = 'text-red-400';
    statusText = "Safety Lock Active";
  } 
  else if (current >= 1300) {
    colorClass = 'bg-amber-500';
    textColor = 'text-amber-400';
  } else if (current >= 1000) {
    colorClass = 'bg-yellow-500';
    textColor = 'text-yellow-400';
  }

  return (
    <div className="w-full max-w-xs flex flex-col gap-1">
      <div className="flex justify-between items-end px-1">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          Daily Quota
        </span>
        <span className={`text-[10px] font-mono font-bold ${textColor}`}>
          {labelText}
        </span>
      </div>
      
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
        <div 
          className={`h-full ${colorClass} transition-all duration-500 ease-out`}
          style={{ width: isGlobalLimit ? '100%' : `${percentage}%` }}
        />
      </div>

      {statusText && (
        <p className={`text-[10px] font-bold text-center mt-1 ${isGlobalLimit ? 'text-red-400' : 'text-amber-400'}`}>
          ⚠️ {statusText.toUpperCase()}
        </p>
      )}
    </div>
  );
};