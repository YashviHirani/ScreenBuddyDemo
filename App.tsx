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
  
  // Audio / TTS State
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const lastSpokenRef = useRef('');
  
  // API Key Rotation State
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('screen_buddy_api_keys');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { console.error(e); }
        }
        const old = localStorage.getItem('screen_buddy_api_key');
        if (old) return [old];
    }
    return [];
  });
  
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [quotaExceeded, setQuotaExceeded] = useState(false); 
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Hook for Floating Overlay (PiP)
  const { pipVideoRef, pipCanvasRef, togglePip, isPipActive } = usePipOverlay(currentAnalysis);

  // Persist keys changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('screen_buddy_api_keys', JSON.stringify(apiKeys));
    }
    if (apiKeys.length === 0) {
        setShowKeyModal(true);
    }
  }, [apiKeys]);
  
  useEffect(() => {
    if (quotaExceeded) {
        setShowKeyModal(true);
    }
  }, [quotaExceeded]);

  // TTS Effect
  useEffect(() => {
    if (!isAudioEnabled || !currentAnalysis?.microAssist) {
        return;
    }
    if (currentAnalysis.microAssist !== lastSpokenRef.current) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentAnalysis.microAssist);
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
        lastSpokenRef.current = currentAnalysis.microAssist;
    }
  }, [currentAnalysis, isAudioEnabled]);

  const handleSaveKeys = (keys: string[]) => {
    setApiKeys(keys);
    setCurrentKeyIndex(0);
    setQuotaExceeded(false);
    setShowKeyModal(false);
    
    if (captureState.isSharing) {
        setCurrentAnalysis(prev => prev ? ({
            ...prev, 
            state: AnalysisState.UNKNOWN, 
            microAssist: "Keys updated. Resuming...", 
            observation: "System update...",
            confidence: ConfidenceLevel.MEDIUM
        }) : null);
    }
  };

  const intervalRef = useRef<number | null>(null);

  // Optimized Analysis Loop with Immediate Retry
  const performAnalysis = useCallback(async () => {
    if (!captureState.isSharing || isAnalyzing) return;
    if (apiKeys.length === 0) return;

    const snapshotBase64 = takeSnapshot();
    if (!snapshotBase64) return;

    setIsAnalyzing(true);
    
    let attempts = 0;
    let successful = false;
    let tempKeyIndex = currentKeyIndex;
    let finalResult: AnalysisResult | null = null;

    // Try loop: if Key A fails quota, immediately try Key B
    while (attempts < apiKeys.length && !successful) {
        const activeKey = apiKeys[tempKeyIndex];
        
        try {
            const result = await analyzeScreenCapture(snapshotBase64, goal, activeKey);
            
            // Success!
            finalResult = {
                ...result,
                timestamp: Date.now(),
                screenshot: snapshotBase64 
            };
            successful = true;
            
            // Update the global index to stay on this working key
            if (tempKeyIndex !== currentKeyIndex) {
                setCurrentKeyIndex(tempKeyIndex);
            }
            setQuotaExceeded(false);

        } catch (error: any) {
            if (error.isQuotaError) {
                console.warn(`Key Index ${tempKeyIndex} (${activeKey.slice(0,6)}...) exhausted. Rotating...`);
                tempKeyIndex = (tempKeyIndex + 1) % apiKeys.length;
                attempts++;
                
                // Small delay to prevent tight loop burning CPU or triggering client-side flood protection
                await new Promise(r => setTimeout(r, 200)); 
            } else {
                // Non-quota error (network etc), break loop and show error
                console.error("Non-quota error in analysis loop:", error);
                break;
            }
        }
    }

    if (successful && finalResult) {
        setCurrentAnalysis(finalResult);
        setHistory(prev => {
            const lastItem = prev[0];
            if (lastItem && 
                lastItem.microAssist === finalResult?.microAssist && 
                lastItem.state === finalResult?.state) {
                return prev;
            }
            if (finalResult && finalResult.state !== AnalysisState.SMOOTH && finalResult.state !== AnalysisState.UNKNOWN) {
                return [finalResult, ...prev];
            }
            return prev;
        });
    } else if (attempts >= apiKeys.length) {
        // All keys failed
        setQuotaExceeded(true);
        setCurrentAnalysis(prev => prev ? ({
            ...prev,
            state: AnalysisState.FRICTION,
            microAssist: "All API Quotas Exceeded.",
            observation: "Paused.",
            confidence: ConfidenceLevel.LOW
        }) : null);
    }

    setIsAnalyzing(false);
  }, [captureState.isSharing, isAnalyzing, takeSnapshot, goal, apiKeys, currentKeyIndex]);

  useEffect(() => {
    if (captureState.isSharing) {
      performAnalysis();
      intervalRef.current = window.setInterval(performAnalysis, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.speechSynthesis.cancel();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.speechSynthesis.cancel();
    };
  }, [captureState.isSharing, performAnalysis]);


  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative">
      <Header isLive={captureState.isSharing} />
      
      {showKeyModal && (
        <ApiKeyModal 
            onSave={handleSaveKeys} 
            isError={quotaExceeded}
            onCancel={(!quotaExceeded && apiKeys.length > 0) ? () => setShowKeyModal(false) : undefined} 
        />
      )}

      {captureState.isSharing && (
        <InterventionOverlay 
          result={currentAnalysis}
          goal={goal}
          onStop={stopCapture}
          onTogglePip={togglePip}
          isPipActive={isPipActive}
          isAudioEnabled={isAudioEnabled}
          toggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        />
      )}

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col pb-24">
        
        <div className="fixed top-0 left-0 opacity-0 pointer-events-none -z-50">
           <video ref={videoRef} autoPlay playsInline muted className="w-auto h-auto" />
           <canvas ref={canvasRef} />
           <video ref={pipVideoRef} autoPlay playsInline muted className="w-[800px] h-[600px]" />
           <canvas ref={pipCanvasRef} />
        </div>

        <div className={`mb-8 flex flex-col items-center justify-center w-full transition-opacity duration-500 ${captureState.isSharing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
           
           <div className="w-full flex justify-end mb-2">
             <button 
                onClick={() => setShowKeyModal(true)}
                disabled={captureState.isSharing}
                className="group flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors"
             >
                <div className={`w-2 h-2 rounded-full ${quotaExceeded ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {quotaExceeded ? 'Quota Exceeded - Update Keys' : `${apiKeys.length} API Keys Active`}
                <span className="underline decoration-gray-700 group-hover:decoration-indigo-400 underline-offset-2">Configure</span>
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
               disabled={!goal.trim() || apiKeys.length === 0}
               className={`group relative inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 font-bold text-white transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-gray-900 ${(!goal.trim() || apiKeys.length === 0) ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50'}`}
             >
               {apiKeys.length === 0 ? (
                 <span>Add API Keys to Start</span>
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

        <div className="flex-1 flex flex-col gap-8">
           <AnalysisCard result={currentAnalysis} isLoading={isAnalyzing} />
           <HistoryLog history={history} />
        </div>
        
        <div className="mt-12 text-center text-gray-600 text-xs">
          <p>Screen Buddy uses local screen capture processed by AI. Your data is not stored permanently.</p>
        </div>

      </main>
    </div>
  );
}

export default App;