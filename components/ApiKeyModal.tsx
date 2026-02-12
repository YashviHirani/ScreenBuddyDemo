import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSave: (keys: string[]) => void;
  onCancel?: () => void;
  isError?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onCancel, isError }) => {
  const [inputContent, setInputContent] = useState('');

  const handleSave = () => {
    // Parse keys from textarea (split by newlines, commas, spaces)
    const keys = inputContent
      .split(/[\n, ]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length > 0) {
      onSave(keys);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity duration-300">
      <div className={`w-full max-w-md bg-gray-900 border ${isError ? 'border-red-500/50' : 'border-gray-800'} rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100`}>
        
        {/* Error Banner */}
        {isError && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-bold text-red-400">All keys exhausted. Please add new keys.</p>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-800 bg-gray-900/50">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isError ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
              <svg className={`w-6 h-6 ${isError ? 'text-red-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 11 13 12.464l-2.828 2.829-1.415-1.414-.707.707 1.414 1.414L6 19l-4-4 14.142-14.142A6 6 0 0121 9zM7 14l2.5 2.5" />
              </svg>
           </div>
           <h2 className="text-xl font-bold text-white">
             {isError ? 'Update API Keys' : 'Configure API Key Pool'}
           </h2>
           <p className="mt-2 text-sm text-gray-400 leading-relaxed">
             Supported Providers:
             <br/>
             • <strong>Google Gemini</strong> (Standard keys)
             <br/>
             • <strong>OpenAI ChatGPT</strong> (Starts with <code>sk-</code>)
             <br/><br/>
             Screen Buddy automatically detects the provider. You can even mix them to ensure uninterrupted service!
           </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-gray-900">
           <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
               Paste API Keys (One per line)
             </label>
             <textarea 
               value={inputContent}
               onChange={(e) => setInputContent(e.target.value)}
               placeholder={`AIzaSy... (Gemini)\nsk-proj... (OpenAI)`}
               rows={6}
               className={`w-full bg-gray-950 border text-white rounded-lg px-4 py-3 outline-none transition-all font-mono text-xs placeholder-gray-700 resize-none ${isError ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 ring-2 ring-transparent'}`}
               autoFocus
             />
             <div className="mt-3 flex justify-between items-center">
               <span className="text-xs text-gray-600">Keys stored locally. Never sent to us.</span>
               <div className="flex gap-4">
                   <a 
                     href="https://aistudio.google.com/app/apikey" 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                   >
                     Get Gemini Key
                   </a>
                   <a 
                     href="https://platform.openai.com/api-keys" 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                   >
                     Get OpenAI Key
                   </a>
               </div>
             </div>
           </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-800 flex justify-end gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!inputContent.trim()}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all transform flex items-center gap-2 ${
               !inputContent.trim() 
                 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                 : isError 
                    ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 active:scale-95'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 active:scale-95'
            }`}
          >
            {isError ? 'Update & Resume' : 'Save Keys'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};