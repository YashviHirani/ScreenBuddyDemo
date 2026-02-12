
import React, { useState } from 'react';
import { AnalysisResult, ChatMessage } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisResult[];
  chatHistory: ChatMessage[];
}

type TabType = 'insights' | 'chat';

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, chatHistory }) => {
  const [activeTab, setActiveTab] = useState<TabType>('insights');

  // Group analysis history by goal
  const groupedInsights = history.reduce((acc, item) => {
    const goal = (item as any).goal || 'Unknown Goal';
    if (!acc[goal]) acc[goal] = [];
    acc[goal].push(item);
    return acc;
  }, {} as Record<string, AnalysisResult[]>);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 right-0 h-full w-[380px] bg-gray-950 border-l border-gray-800 z-[201] shadow-2xl transition-transform duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Archive</h2>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-0.5">Cloud Persistent Memory</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-all border border-transparent hover:border-gray-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                <button 
                  onClick={() => setActiveTab('insights')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   Insights
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   Conversations
                </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'insights' ? (
              /* --- INSIGHTS VIEW --- */
              <div className="space-y-8 py-2">
                {Object.entries(groupedInsights).length === 0 ? (
                  <div className="h-full py-20 flex flex-col items-center justify-center text-center opacity-30">
                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-bold uppercase tracking-widest">No Insights Found</p>
                  </div>
                ) : (
                  (Object.entries(groupedInsights) as [string, AnalysisResult[]][]).map(([goal, steps]) => (
                    <div key={goal} className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest truncate">{goal}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {steps.map((step, idx) => (
                          <div 
                            key={step.timestamp + idx} 
                            className="group p-4 bg-gray-900/40 border border-white/5 rounded-2xl hover:bg-gray-800 hover:border-indigo-500/30 transition-all cursor-default relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-[13px] font-black text-indigo-300 group-hover:text-indigo-200 leading-snug">
                                {step.microAssist}
                              </p>
                              <span className="text-[9px] font-mono text-gray-600 shrink-0">
                                {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 italic line-clamp-2 leading-relaxed">
                              {step.observation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* --- CHAT HISTORY VIEW --- */
              <div className="space-y-4 py-2">
                {chatHistory.length === 0 ? (
                  <div className="h-full py-20 flex flex-col items-center justify-center text-center opacity-30">
                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="text-sm font-bold uppercase tracking-widest">No Chats Recorded</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div 
                      key={msg.timestamp + idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600/10 border-indigo-500/20 ml-6' 
                          : 'bg-gray-900 border-white/5 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                          {msg.role === 'user' ? 'Question' : 'ScreenBuddy'}
                        </span>
                        <span className="text-[9px] font-mono text-gray-600 italic">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-300 leading-relaxed line-clamp-3 overflow-hidden text-ellipsis">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                 Cloud Storage Synchronized
               </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
