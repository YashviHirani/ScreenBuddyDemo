import React from 'react';

interface ApiKeyInputProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasError: boolean;
  disabled: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey, hasError, disabled }) => {
  return (
    <div className={`w-full mb-4 transition-all duration-300 ${hasError ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-end mb-1">
        <label htmlFor="apiKey" className={`block text-xs font-medium uppercase tracking-wider ${hasError ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
            {hasError ? '⚠️ Quota Exceeded - Update Key' : 'Custom Gemini API Key'}
        </label>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline">
            Get Key →
        </a>
      </div>
      <input
        type="password"
        id="apiKey"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        disabled={disabled}
        placeholder={hasError ? "Paste new key here..." : "Enter key (optional if using default)"}
        className={`w-full bg-gray-900 border ${hasError ? 'border-red-500 text-red-100 placeholder-red-300/50 focus:ring-red-500' : 'border-gray-800 text-gray-400 placeholder-gray-700 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 transition-colors shadow-inner`}
      />
    </div>
  );
};