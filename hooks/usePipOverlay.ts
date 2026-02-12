import { useEffect, useRef, useState, useCallback } from 'react';
import { AnalysisResult, AnalysisState } from '../types';

export const usePipOverlay = (currentResult: AnalysisResult | null) => {
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Function to draw the analysis card onto the canvas
  const drawCanvas = useCallback(() => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // WIDE SUBTITLE BAR ASPECT RATIO - Perfect for bottom of screen
    const width = 800; 
    const height = 150; 
    
    // Ensure canvas size
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Background - Dark Gray
    ctx.fillStyle = '#0f172a'; // slate-950
    ctx.fillRect(0, 0, width, height);

    if (!currentResult) {
      // Waiting State
      ctx.fillStyle = '#1e293b'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#94a3b8'; 
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Screen Buddy Active', width / 2, height / 2 - 20);
      
      ctx.font = '20px sans-serif';
      ctx.fillText('Waiting for next step...', width / 2, height / 2 + 25);
    } else {
      // Active State Colors
      let accentColor = '#6366f1'; 
      let stateLabel = currentResult.state.toUpperCase();
      
      switch (currentResult.state) {
        case AnalysisState.COMPLETED: 
          accentColor = '#22d3ee'; // cyan-400
          break;
        case AnalysisState.DISTRACTED: 
          accentColor = '#f87171'; // red-400
          stateLabel = "DISTRACTED - FOCUS!";
          break;
        case AnalysisState.FRICTION: 
        case AnalysisState.ERROR:
          accentColor = '#fbbf24'; // amber-400
          break;
        case AnalysisState.SMOOTH: 
          accentColor = '#34d399'; // emerald-400
          break;
      }

      // 1. Progress Bar / Status Line (Top)
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, width, 8); // Top bar

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // 2. State Label
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(stateLabel, 24, 25);
      
      // 3. Micro Assist Text - HUGE & CENTERED VISUALLY
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px sans-serif'; 
      
      const text = currentResult.microAssist;
      // Simple text fitting
      let fontSize = 42;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (ctx.measureText(text).width > (width - 50)) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px sans-serif`;
      }
      
      // Draw Action Text
      ctx.fillText(text, 24, 55);

      // 4. Observation (Subtext)
      ctx.fillStyle = '#94a3b8'; 
      ctx.font = '20px sans-serif';
      const obs = currentResult.observation;
      let displayObs = obs;
      if (ctx.measureText(displayObs).width > (width - 250)) {
         while(ctx.measureText(displayObs + '...').width > (width - 250) && displayObs.length > 0) {
             displayObs = displayObs.slice(0, -1);
         }
         displayObs += '...';
      }
      ctx.fillText(displayObs, 24, 110);
      
      // 5. Logo / Brand
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('SCREEN BUDDY', width - 24, 115);
    }
    
    // Pixel ticker to force video update (Required for captureStream to emit frames)
    const time = Date.now();
    ctx.fillStyle = (time % 1000 < 500) ? '#0f172a' : '#1e293b';
    ctx.fillRect(width - 1, height - 1, 1, 1);

  }, [currentResult]);

  // ALWAYS RUN A SLOW HEARTBEAT
  // This ensures the canvas is drawn to at least once and keeps the stream "alive" even before PiP is clicked.
  // Without this, the canvas might be blank when the user clicks "Float", causing a dead stream.
  useEffect(() => {
    // Initial draw
    drawCanvas();
    
    // Slow loop (2fps) when not active, just to keep canvas fresh
    const id = setInterval(() => {
      drawCanvas();
    }, 500);

    return () => clearInterval(id);
  }, [drawCanvas]);

  // FAST LOOP when PiP IS active
  useEffect(() => {
    if (isPipActive) {
      // Clear the slow loop logic implicitly because the component logic handles it, 
      // but here we set a faster interval that overlaps.
      intervalRef.current = window.setInterval(() => {
        drawCanvas();
      }, 50); // 20fps for smoother UI
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPipActive, drawCanvas]);

  const togglePip = async () => {
    const video = pipVideoRef.current;
    const canvas = pipCanvasRef.current;

    if (!video || !canvas) {
        console.error("Refs missing");
        return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else {
        // 1. Force a draw immediately
        drawCanvas();

        // 2. Setup Stream if needed
        if (!video.srcObject) {
            // @ts-ignore
            const stream = canvas.captureStream(30);
            video.srcObject = stream;
        }

        // 3. Play securely
        video.muted = true;
        
        try {
            await video.play();
        } catch (playError) {
            console.warn("Play failed, trying again", playError);
            // Sometimes resetting the stream helps
            // @ts-ignore
            const stream = canvas.captureStream(30);
            video.srcObject = stream;
            await video.play();
        }

        // 4. Request PiP
        // @ts-ignore
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (error: any) {
      console.error("Failed to toggle PiP:", error);
      setIsPipActive(false);
      
      // Fallback for user
      if (error.name === 'NotAllowedError') {
          // This usually means the user didn't interact enough, or browser blocked it.
          alert("Floating window blocked. Please try clicking again.");
      } else {
          alert(`Error: ${error.message}. Try refreshing if this persists.`);
      }
    }
  };

  // Listen for PiP close event
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;

    const onLeavePip = () => setIsPipActive(false);
    video.addEventListener('leavepictureinpicture', onLeavePip);
    
    return () => {
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  return {
    pipVideoRef,
    pipCanvasRef,
    togglePip,
    isPipActive
  };
};