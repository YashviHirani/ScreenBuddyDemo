import { useEffect, useRef, useState, useCallback } from 'react';
import { AnalysisResult, AnalysisState } from '../types';

export const usePipOverlay = (currentResult: AnalysisResult | null) => {
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  // Function to draw the analysis card onto the canvas
  const drawCanvas = useCallback(() => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Increased resolution for better text visibility (4:3 aspect ratio)
    const width = 800; 
    const height = 600; 
    
    // Set explicit resolution
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Background
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, width, height);

    if (!currentResult) {
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Screen Buddy Active', 40, 300);
      ctx.font = '24px sans-serif';
      ctx.fillText('Waiting for analysis...', 40, 350);
      return;
    }

    // Determine colors
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

    // Draw Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Left Accent Bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 20, height);

    // State Text (Top Left)
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(currentResult.state.toUpperCase(), 50, 60);

    // Micro Assist Text (Main Content) - Improved wrapping
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif'; // Larger font
    
    const text = currentResult.microAssist;
    const maxCharsPerLine = 35; // Adjusted for larger font
    const words = text.split(' ');
    let line = '';
    let y = 140; // Start lower down
    const lineHeight = 55;

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      // Calculate width based on canvas width minus padding (50px left + 40px right)
      if (testWidth > (width - 90) && n > 0) {
        ctx.fillText(line, 50, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 50, y);

    // Observation (Smaller text at bottom)
    if (y < height - 60) {
        ctx.fillStyle = '#9ca3af'; // gray-400
        ctx.font = 'italic 24px sans-serif';
        // Wrap observation if needed, but usually short
        const obs = "Obs: " + currentResult.observation;
        ctx.fillText(obs, 50, height - 30);
    }

  }, [currentResult]);

  // Update canvas whenever result changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, currentResult]);

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (pipVideoRef.current && pipCanvasRef.current) {
        drawCanvas(); // Ensure initial draw
        
        // Ensure stream is capturing
        const stream = pipCanvasRef.current.captureStream(30); // 30 FPS
        pipVideoRef.current.srcObject = stream;
        
        // IMPORTANT: Play the video to allow PiP
        await pipVideoRef.current.play();
        
        await pipVideoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (error) {
      console.error("Failed to toggle PiP:", error);
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