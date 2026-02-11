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

    // Standard 4:3 Aspect Ratio
    const width = 800; 
    const height = 600; 
    
    // Ensure canvas size
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Background
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, width, height);

    if (!currentResult) {
      // Waiting State
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Screen Buddy Active', 40, 300);
      ctx.font = '24px sans-serif';
      ctx.fillText('Waiting for analysis...', 40, 350);
    } else {
      // Active State
      let bgColor = '#374151'; // default gray
      let accentColor = '#6366f1'; // indigo
      
      switch (currentResult.state) {
        case AnalysisState.COMPLETED: 
          bgColor = '#083344'; // cyan-950
          accentColor = '#22d3ee'; // cyan-400
          break;
        case AnalysisState.DISTRACTED: 
          bgColor = '#450a0a'; // red-950
          accentColor = '#f87171'; // red-400
          break;
        case AnalysisState.FRICTION: 
        case AnalysisState.ERROR:
          bgColor = '#451a03'; // amber-950
          accentColor = '#fbbf24'; // amber-400
          break;
        case AnalysisState.SMOOTH: 
          bgColor = '#064e3b'; // emerald-950
          accentColor = '#34d399'; // emerald-400
          break;
      }

      // Draw Color Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      
      // Left Accent Bar
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, 20, height);

      // State Text
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(currentResult.state.toUpperCase(), 50, 60);

      // Micro Assist Text (Wrapping)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif'; 
      
      const text = currentResult.microAssist;
      const words = text.split(' ');
      let line = '';
      let y = 140; 
      const lineHeight = 55;

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > (width - 90) && n > 0) {
          ctx.fillText(line, 50, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 50, y);

      // Observation
      if (y < height - 60) {
          ctx.fillStyle = '#9ca3af'; 
          ctx.font = 'italic 24px sans-serif';
          const obs = "Obs: " + currentResult.observation;
          ctx.fillText(obs, 50, height - 30);
      }
    }
    
    // Tiny ticker pixel to force visual change for the stream
    // This ensures the video stream sends frames
    const time = Date.now();
    ctx.fillStyle = (time % 1000 < 500) ? '#1f2937' : '#111827';
    ctx.fillRect(width - 1, height - 1, 1, 1);

  }, [currentResult]);

  // Initial Draw
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Continuous Draw Loop
  // Keeps the stream alive. 100ms = 10fps visual update, plenty for UI.
  useEffect(() => {
    if (isPipActive) {
      intervalRef.current = window.setInterval(() => {
        drawCanvas();
      }, 100);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPipActive, drawCanvas]);

  const togglePip = async () => {
    const video = pipVideoRef.current;
    const canvas = pipCanvasRef.current;

    if (!video || !canvas) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else {
        // 1. Draw immediately
        drawCanvas();

        // 2. Setup Stream (Simple captureStream for Mac compatibility)
        if (!video.srcObject) {
            // @ts-ignore - standard API
            const stream = canvas.captureStream ? canvas.captureStream() : (canvas as any).mozCaptureStream();
            video.srcObject = stream;
        }

        // 3. Play & Request PiP
        video.muted = true;
        await video.play();
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (error) {
      console.error("Failed to toggle PiP:", error);
      setIsPipActive(false);
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