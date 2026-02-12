import React from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean; // Is the AI speaking?
  isListening: boolean; // Is the User speaking?
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, isSpeaking, isListening }) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-8 px-4 py-2 bg-gray-900/80 rounded-full border border-gray-700/50 backdrop-blur-sm transition-all duration-300">
      <div className={`text-[10px] font-bold uppercase mr-3 ${isListening ? 'text-indigo-400' : isSpeaking ? 'text-emerald-400' : 'text-gray-500'}`}>
        {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Live'}
      </div>
      
      {/* Animated Bars */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isListening 
              ? 'bg-indigo-500 animate-pulse' 
              : isSpeaking 
                ? 'bg-emerald-500' 
                : 'bg-gray-600'
          }`}
          style={{
            height: (isListening || isSpeaking) ? `${Math.random() * 16 + 8}px` : '4px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.4s'
          }}
        />
      ))}
    </div>
  );
};