import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { AnalysisCard } from './components/AnalysisCard';
import { GoalInput } from './components/GoalInput';
import { ApiKeyModal } from './components/ApiKeyModal';
import { InterventionOverlay } from './components/InterventionOverlay';
import { QuotaBar } from './components/QuotaBar';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { HistorySidebar } from './components/HistorySidebar';
import { ChatPanel } from './components/ChatPanel';
import { useScreenCapture } from './hooks/useScreenCapture';
import { usePipOverlay } from './hooks/usePipOverlay';
import { useVoiceControl } from './hooks/useVoiceControl';
import { useGeminiLive } from './hooks/useGeminiLive';
import { analyzeScreenCapture, sendChatMessage } from './services/geminiService';
import { quotaManager } from './services/quotaManager';
import { fetchHistory, fetchChatHistory, logChatMessage } from './services/insightService';
import { AnalysisResult, AnalysisState, ConfidenceLevel, ChatMessage } from './types';

function App() {
  const { 
    captureState, 
    startCapture, 
    stopCapture, 
    takeSnapshot, 
    videoRef, 
    canvasRef 
  } = useScreenCapture();

  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [goal, setGoal] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>(''); 
  const [quotaUsage, setQuotaUsage] = useState<number>(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);

  const lastSpokenRef = useRef('');
  
  // New State for Voice & UI Control
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('screen_buddy_api_keys');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { console.error(e); }
        }
    }
    return [];
  });
  
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // --- GEMINI LIVE INTEGRATION ---
  const { isLive, isAiSpeaking, startLive, stopLive, error: liveError } = useGeminiLive({
    apiKey: apiKeys[0] || '', 
    videoRef: videoRef
  });

  const { pipVideoRef, pipCanvasRef, togglePip, isPipActive } = usePipOverlay(currentAnalysis);

  // Voice Control Integration
  const { isListening, toggleListening, lastCommand } = useVoiceControl({
    onStart: startCapture,
    onStop: stopCapture,
    onTogglePip: togglePip,
    onMinimize: () => setIsMinimized(true),
    onMaximize: () => setIsMinimized(false),
    isCapturing: captureState.isSharing,
    goal: goal
  });

  // Fetch history from DB on mount
  const refreshHistory = useCallback(async () => {
    const dbHistory = await fetchHistory();
    setHistory(dbHistory);
  }, []);

  const refreshChatHistory = useCallback(async () => {
    const chatHistory = await fetchChatHistory();
    setChatMessages(chatHistory);
  }, []);

  useEffect(() => {
    setQuotaUsage(quotaManager.getUsage());
    refreshHistory();
    refreshChatHistory();
  }, [refreshHistory, refreshChatHistory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('screen_buddy_api_keys', JSON.stringify(apiKeys));
    }
    if (apiKeys.length === 0) setShowKeyModal(true);
  }, [apiKeys]);
  
  useEffect(() => {
    if (isLive) return; 
    if (!isAudioEnabled || !currentAnalysis?.microAssist) return;
    if (currentAnalysis.microAssist !== lastSpokenRef.current) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentAnalysis.microAssist);
        utterance.rate = 1.1; 
        window.speechSynthesis.speak(utterance);
        lastSpokenRef.current = currentAnalysis.microAssist;
    }
  }, [currentAnalysis, isAudioEnabled, isLive]);

  const handleSaveKeys = (keys: string[]) => {
    setApiKeys(keys);
    setCurrentKeyIndex(0);
    setQuotaExceeded(false);
    setShowKeyModal(false);
    setStatusMessage('');
  };

  const timerRef = useRef<number | null>(null);
  const lastAnalysisRef = useRef<AnalysisResult | null>(null);

  const performAnalysis = useCallback(async () => {
    if (isLive) return; 

    if (!captureState.isSharing || isAnalyzing) return;
    if (apiKeys.length === 0) return;
    if (quotaManager.isSafetyLocked()) {
        setStatusMessage("Safety Locked");
        setQuotaExceeded(true);
        return;
    }

    const snapshotBase64 = takeSnapshot();
    if (!snapshotBase64) {
      timerRef.current = window.setTimeout(performAnalysis, 1000); 
      return; 
    }

    setIsAnalyzing(true);
    setStatusMessage(`Analysing...`);
    
    let attempts = 0;
    let successful = false;
    let tempKeyIndex = currentKeyIndex;
    let finalResult: AnalysisResult | null = null;
    
    const context = lastAnalysisRef.current ? {
        lastObservation: lastAnalysisRef.current.observation,
        lastInstruction: lastAnalysisRef.current.microAssist
    } : undefined;

    while (attempts < apiKeys.length && !successful) {
        const activeKey = apiKeys[tempKeyIndex];
        try {
            const result = await analyzeScreenCapture(snapshotBase64, goal, activeKey, context);
            finalResult = { ...result, timestamp: Date.now(), screenshot: snapshotBase64, goal } as any;
            successful = true;
            if (tempKeyIndex !== currentKeyIndex) setCurrentKeyIndex(tempKeyIndex);
            setQuotaExceeded(false);
            setStatusMessage(''); 
            setQuotaUsage(quotaManager.increment());
        } catch (error: any) {
            const isQuota = error.message?.includes('429') || error.status === 429 || error.code === 429 || error.isQuotaError;
            // Also retry on "Failed to fetch" which usually means network error or bad key formatting
            const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError');

            if (isQuota || isNetwork) {
                tempKeyIndex = (tempKeyIndex + 1) % apiKeys.length;
                attempts++;
                await new Promise(r => setTimeout(r, 200)); 
            } else { break; }
        }
    }

    if (successful && finalResult) {
        setCurrentAnalysis(finalResult);
        lastAnalysisRef.current = finalResult;
        refreshHistory();
    } else if (attempts >= apiKeys.length) {
        setQuotaExceeded(true);
        setStatusMessage("All keys exhausted");
    }

    setIsAnalyzing(false);
    timerRef.current = window.setTimeout(performAnalysis, 4000);
  }, [captureState.isSharing, isAnalyzing, takeSnapshot, goal, apiKeys, currentKeyIndex, quotaExceeded, quotaUsage, isLive, refreshHistory]);

  useEffect(() => {
    if (captureState.isSharing) { performAnalysis(); }
    else { if (timerRef.current) clearTimeout(timerRef.current); }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [captureState.isSharing, isLive, performAnalysis]);

  const handleToggleLive = async () => {
      if (isLive) {
          stopLive();
      } else {
          if (!captureState.isSharing) {
              await startCapture();
          }
          if (!apiKeys[0]) {
              setShowKeyModal(true);
              return;
          }
          startLive();
      }
  };

  const handleSendChatMessage = async (text: string, file?: { name: string, data: string, mimeType: string }) => {
    if (apiKeys.length === 0) {
      setShowKeyModal(true);
      return;
    }

    const displayText = file ? `[File: ${file.name}] ${text}` : text;
    const newMessage: ChatMessage = { role: 'user', text: displayText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, newMessage]);
    logChatMessage('user', displayText, goal); 
    
    setIsChatProcessing(true);

    let attempts = 0;
    let successful = false;
    let tempKeyIndex = currentKeyIndex;
    let responseText = "";

    try {
      const currentScreenshot = takeSnapshot();
      
      while (attempts < apiKeys.length && !successful) {
          const activeKey = apiKeys[tempKeyIndex];
          try {
              responseText = await sendChatMessage(
                text, 
                chatMessages, 
                currentScreenshot, 
                goal, 
                activeKey,
                file
              );
              successful = true;
              if (tempKeyIndex !== currentKeyIndex) setCurrentKeyIndex(tempKeyIndex);
              setQuotaExceeded(false);
              setQuotaUsage(quotaManager.increment());
          } catch (error: any) {
             const isQuota = error.message?.includes('429') || error.status === 429 || error.code === 429 || error.message?.toLowerCase().includes('quota');
             const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError');
             
             if (isQuota || isNetwork) {
                 console.warn(`Chat key index ${tempKeyIndex} failed: ${error.message}`);
                 tempKeyIndex = (tempKeyIndex + 1) % apiKeys.length;
                 attempts++;
                 await new Promise(r => setTimeout(r, 200));
             } else {
                 throw error; // Rethrow other errors
             }
          }
      }

      if (!successful) {
          setQuotaExceeded(true);
          setShowKeyModal(true);
          throw new Error("All API keys exhausted.");
      }
      
      const responseMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setChatMessages(prev => [...prev, responseMsg]);
      logChatMessage('model', responseText, goal); 
      
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: ChatMessage = { 
          role: 'model', 
          text: "I'm sorry, I encountered a connection error (likely quota exceeded or network issue). Please check your API keys or try again in a moment.", 
          timestamp: Date.now() 
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-x-hidden">
      <Header 
        isLive={captureState.isSharing} 
        isVoiceActive={isListening}
        onToggleVoice={toggleListening}
        lastVoiceCommand={lastCommand}
      />
      
      {showKeyModal && (
        <ApiKeyModal 
            onSave={handleSaveKeys} 
            isError={quotaExceeded && apiKeys.length === 0} 
            onCancel={apiKeys.length > 0 ? () => setShowKeyModal(false) : undefined} 
        />
      )}

      {/* Persistent UI Controls */}
      <div className="fixed top-20 right-6 z-40 flex flex-col gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-12 h-12 rounded-xl bg-gray-900/80 backdrop-blur-md border border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all shadow-xl group"
            title="Session Archive"
          >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
          </button>
          
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-12 h-12 rounded-xl bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all shadow-xl group"
            title="Open Chat"
          >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
          </button>
      </div>

      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        history={history} 
        chatHistory={chatMessages}
      />

      <ChatPanel 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        isProcessing={isChatProcessing}
        hasScreenContext={captureState.isSharing}
      />

      {/* OVERLAY for Passive Mode */}
      {captureState.isSharing && !isLive && (
        <InterventionOverlay 
          result={currentAnalysis}
          goal={goal}
          onStop={stopCapture}
          onTogglePip={togglePip}
          isPipActive={isPipActive}
          isAudioEnabled={isAudioEnabled}
          toggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
      )}

      {/* LIVE MODE OVERLAY */}
      {isLive && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center gap-4">
             {liveError && <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg text-xs font-bold">{liveError}</div>}
             <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-indigo-500/30 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                    <span className="text-white font-bold text-sm">GEMINI LIVE ACTIVE</span>
                </div>
                <VoiceVisualizer isActive={true} isSpeaking={isAiSpeaking} isListening={true} />
                <button 
                    onClick={stopLive}
                    className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase rounded-full transition-colors"
                >
                    End Call
                </button>
             </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col pb-24">
        <div className="fixed top-0 left-0 pointer-events-none opacity-[0.05] z-[-1] overflow-hidden" style={{ width: '10px', height: '10px' }}>
           <video ref={videoRef} autoPlay playsInline muted />
           <canvas ref={canvasRef} />
           <canvas ref={pipCanvasRef} width={800} height={150} />
           <video ref={pipVideoRef} autoPlay playsInline muted width={800} height={150} />
        </div>

        <div className={`mb-8 flex flex-col items-center justify-center w-full transition-all duration-500 ${captureState.isSharing && !isLive ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-100'}`}>
           <div className="w-full flex justify-end mb-2">
             <button onClick={() => setShowKeyModal(true)} disabled={captureState.isSharing} className="text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors">
                Configure Keys
             </button>
           </div>
           <GoalInput goal={goal} setGoal={setGoal} disabled={captureState.isSharing} />
           
           {!captureState.isSharing && (
             <div className="flex gap-4 w-full justify-center">
                 <button
                   onClick={startCapture}
                   disabled={!goal.trim() || apiKeys.length === 0}
                   className={`flex-1 sm:flex-none px-8 py-4 font-bold text-white rounded-full transition-all ${(!goal.trim() || apiKeys.length === 0) ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95'}`}
                 >
                   Activate Screen Buddy
                 </button>
                 <button
                    onClick={handleToggleLive}
                    disabled={!goal.trim() || apiKeys.length === 0}
                    className={`flex-1 sm:flex-none px-8 py-4 font-bold text-white rounded-full transition-all flex items-center gap-2 justify-center ${(!goal.trim() || apiKeys.length === 0) ? 'bg-gray-800 border border-gray-700 cursor-not-allowed opacity-50' : 'bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-indigo-500 active:scale-95'}`}
                 >
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Live Chat
                 </button>
             </div>
           )}
           
           {captureState.isSharing && !isLive && (
               <button
                  onClick={handleToggleLive}
                  className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700 hover:border-emerald-500 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2"
               >
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   Switch to Live Mode
               </button>
           )}
        </div>

        <div className="flex-1 flex flex-col gap-8">
           <div className="flex justify-end">
              <QuotaBar current={quotaUsage} isGlobalLimit={quotaExceeded && quotaUsage < 1490} />
           </div>
           
           {!isLive ? (
               <AnalysisCard result={currentAnalysis} isLoading={isAnalyzing} statusMessage={statusMessage} />
           ) : (
               <div className="w-full p-12 border border-indigo-500/30 bg-indigo-500/5 rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-2xl">
                   <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse border border-indigo-500/20">
                        <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold text-white mb-2">Gemini Live is Listening</h3>
                     <p className="text-gray-400 max-w-sm mx-auto">Talk to your Screen Buddy naturally. It can see your screen in real-time. Say "Stop" or "Minimize" to control the session.</p>
                   </div>
               </div>
           )}
        </div>
      </main>
      
      {/* Floating Chat Button for quick access */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-500 hover:scale-110 transition-all z-40 active:scale-95 border border-indigo-400/30"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;