import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { AnalysisCard } from './components/AnalysisCard';
import { HistoryLog } from './components/HistoryLog';
import { GoalInput } from './components/GoalInput';
import { ApiKeyModal } from './components/ApiKeyModal';
import { InterventionOverlay } from './components/InterventionOverlay';
import { useScreenCapture } from './hooks/useScreenCapture';
import { usePipOverlay } from './hooks/usePipOverlay';
import { analyzeScreenCapture } from './services/geminiService';
import { AnalysisResult, AnalysisState, ConfidenceLevel } from './types';

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
  
  // API Key State
  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('screen_buddy_api_key') || '';
    }
    return '';
  });
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Hook for Floating Overlay (PiP)
  const { pipVideoRef, pipCanvasRef, togglePip, isPipActive } = usePipOverlay(currentAnalysis);

  // Persist key changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('screen_buddy_api_key', userApiKey);
    }
    // Initial check on mount
    if (!userApiKey) {
        setShowKeyModal(true);
    }
  }, [userApiKey]);
  
  // Watch for quota errors
  useEffect(() => {
    if (quotaExceeded) {
        setShowKeyModal(true);
    }
  }, [quotaExceeded]);

  const handleSaveKey = (key: string) => {
    setUserApiKey(key);
    setQuotaExceeded(false);
    setShowKeyModal(false);
    
    // Visually reset state immediately so user knows we are retrying
    if (captureState.isSharing) {
        setCurrentAnalysis(prev => prev ? ({
            ...prev, 
            state: AnalysisState.UNKNOWN, 
            microAssist: "Verifying new key...", 
            observation: "System update...",
            confidence: ConfidenceLevel.MEDIUM
        }) : null);
    }
  };

  const intervalRef = useRef<number | null>(null);

  // Analysis Loop
  const performAnalysis = useCallback(async () => {
    if (!captureState.isSharing || isAnalyzing) return;

    const snapshotBase64 = takeSnapshot();
    if (!snapshotBase64) {
      // Snapshot isn't ready yet, skip this cycle seamlessly
      return;
    }

    setIsAnalyzing(true);
    // Pass the goal and key to the service
    const result = await analyzeScreenCapture(snapshotBase64, goal, userApiKey);
    
    const newResult: AnalysisResult = {
      ...result,
      timestamp: Date.now(),
      screenshot: snapshotBase64 
    };

    setCurrentAnalysis(newResult);
    
    // Check for Quota or Auth errors
    // Strictly check microAssist messages set in geminiService
    const isQuotaError = result.microAssist.includes("Quota") || 
                         result.microAssist.includes("Key");

    if (isQuotaError) {
        setQuotaExceeded(true);
        // Do not add system errors to history
    } else {
        setQuotaExceeded(false);
        setHistory(prev => {
            const lastItem = prev[0];
            if (lastItem && 
                lastItem.microAssist === result.microAssist && 
                lastItem.state === result.state) {
                return prev;
            }
            if (result.state !== AnalysisState.SMOOTH && result.state !== AnalysisState.UNKNOWN) {
                return [newResult, ...prev];
            }
            return prev;
        });
    }

    setIsAnalyzing(false);
  }, [captureState.isSharing, isAnalyzing, takeSnapshot, goal, userApiKey]);

  // Set up the interval for analysis
  useEffect(() => {
    if (captureState.isSharing) {
      // Execute immediately on mount or when dependencies (like API Key) change
      performAnalysis();
      // Increase frequency slightly for better responsiveness
      intervalRef.current = window.setInterval(performAnalysis, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [captureState.isSharing, performAnalysis]);


  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative">
      <Header isLive={captureState.isSharing} />
      
      {/* Smart Modal logic */}
      {showKeyModal && (
        <ApiKeyModal 
            onSave={handleSaveKey} 
            isError={quotaExceeded}
            onCancel={(!quotaExceeded && !!userApiKey) ? () => setShowKeyModal(false) : undefined} 
        />
      )}

      {/* Draggable HUD Overlay */}
      {captureState.isSharing && (
        <InterventionOverlay 
          result={currentAnalysis}
          goal={goal}
          onStop={stopCapture}
          onTogglePip={togglePip}
          isPipActive={isPipActive}
        />
      )}

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col pb-24">
        
        {/* 
           Capture Infrastructure 
           1. Capture Video/Canvas: Must maintain aspect ratio but can be invisible. 
              Using 'opacity-0' and fixed positioning. Do NOT use display:none or w-1 h-1.
           2. PiP Video/Canvas: Used for generating the floating overlay stream.
        */}
        <div className="fixed top-0 left-0 opacity-0 pointer-events-none -z-50">
           {/* Primary Capture Elements */}
           <video ref={videoRef} autoPlay playsInline muted className="w-auto h-auto" />
           <canvas ref={canvasRef} />
           
           {/* Floating Overlay Elements */}
           <video ref={pipVideoRef} autoPlay playsInline muted className="w-96 h-32" />
           <canvas ref={pipCanvasRef} />
        </div>

        {/* Main Controls */}
        <div className={`mb-8 flex flex-col items-center justify-center w-full transition-opacity duration-500 ${captureState.isSharing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
           
           {/* Change Key Button */}
           <div className="w-full flex justify-end mb-2">
             <button 
                onClick={() => setShowKeyModal(true)}
                disabled={captureState.isSharing}
                className="group flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors"
             >
                <div className={`w-2 h-2 rounded-full ${quotaExceeded ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {quotaExceeded ? 'Quota Exceeded - Change Key' : 'API Key Configured'}
                <span className="underline decoration-gray-700 group-hover:decoration-indigo-400 underline-offset-2">Change</span>
             </button>
           </div>

           <GoalInput 
             goal={goal} 
             setGoal={setGoal} 
             disabled={captureState.isSharing} 
           />

           {!captureState.isSharing && (
             <button
               onClick={startCapture}
               disabled={!goal.trim() || !userApiKey.trim()}
               className={`group relative inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 font-bold text-white transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-gray-900 ${(!goal.trim() || !userApiKey.trim()) ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50'}`}
             >
               {!userApiKey.trim() ? (
                 <span>Configure API Key</span>
               ) : !goal.trim() ? (
                 <span>Enter a Goal to Start</span>
               ) : (
                 <>
                   <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                   <span className="relative flex items-center gap-3">
                     <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     Activate Screen Buddy
                   </span>
                 </>
               )}
             </button>
           )}
           
           {captureState.error && (
             <p className="text-red-400 text-sm mt-2 bg-red-500/10 px-4 py-2 rounded-md border border-red-500/20">
               {captureState.error}
             </p>
           )}
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 flex flex-col gap-8">
           <AnalysisCard result={currentAnalysis} isLoading={isAnalyzing} />
           <HistoryLog history={history} />
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-xs">
          <p>Screen Buddy uses local screen capture processed by AI. Your data is not stored permanently.</p>
        </div>

      </main>
    </div>
  );
}

export default App;