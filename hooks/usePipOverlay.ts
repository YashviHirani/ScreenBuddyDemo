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

    const width = 600;
    const height = 200;
    
    // Set explicit resolution
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Background
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, width, height);

    if (!currentResult) {
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Screen Buddy Active', 20, 50);
      ctx.font = '20px sans-serif';
      ctx.fillText('Analyzing...', 20, 90);
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

    // Draw Status Bar
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Left Accent Bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 10, height);

    // State Text
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(currentResult.state.toUpperCase(), 30, 40);

    // Micro Assist Text (Main Content)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    
    // Simple text wrapping
    const text = currentResult.microAssist;
    const maxCharsPerLine = 40;
    const words = text.split(' ');
    let line = '';
    let y = 90;

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (testLine.length > maxCharsPerLine && n > 0) {
        ctx.fillText(line, 30, y);
        line = words[n] + ' ';
        y += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 30, y);

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