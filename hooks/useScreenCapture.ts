import { useState, useRef, useCallback, useEffect } from 'react';
import { ScreenCaptureState } from '../types';

export const useScreenCapture = () => {
  const [captureState, setCaptureState] = useState<ScreenCaptureState>({
    isSharing: false,
    stream: null,
    error: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Refs for Diffing
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPixelDataRef = useRef<Uint8ClampedArray | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setCaptureState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }, // Increased framerate for smoother capture
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
        };
      }

      setCaptureState({
        isSharing: true,
        stream,
        error: null,
      });

      const track = stream.getVideoTracks()[0];
      if (track) {
          track.onended = () => {
            stopCapture();
          };
      }

    } catch (err: any) {
      // Handle specific error types for better UX
      let errorMessage = "Failed to share screen. Please try again.";
      
      if (err.name === 'NotAllowedError') {
          console.warn("User cancelled screen selection.");
          errorMessage = "Screen sharing cancelled. Click Activate to try again.";
      } else if (err.name === 'NotFoundError') {
          errorMessage = "No screen source found.";
      } else if (err.name === 'NotReadableError') {
          errorMessage = "Could not access screen. Check system permissions.";
      } else {
          console.error("Error starting screen capture:", err);
      }

      setCaptureState(prev => ({
        ...prev,
        isSharing: false,
        error: errorMessage,
      }));
    }
  }, []);

  const stopCapture = useCallback(() => {
    setCaptureState(prev => {
      if (prev.stream) {
        prev.stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      prevPixelDataRef.current = null; // Reset diff history
      return {
        isSharing: false,
        stream: null,
        error: null,
      };
    });
  }, []);

  // Returns string if changed, NULL if static (saves API calls)
  const takeSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !captureState.isSharing) {
      return null;
    }

    const video = videoRef.current;
    
    // Safety check
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }

    // ----------------------------------------------------
    // SMART DIFFING LOGIC (Visual Hash Check)
    // ----------------------------------------------------
    const DIFF_RES = 100; // Increase resolution (100x100) for better detection of small text changes
    
    if (!diffCanvasRef.current) {
        diffCanvasRef.current = document.createElement('canvas');
        diffCanvasRef.current.width = DIFF_RES; 
        diffCanvasRef.current.height = DIFF_RES;
    }
    
    const diffCtx = diffCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!diffCtx) return null;

    // Draw small frame
    diffCtx.drawImage(video, 0, 0, DIFF_RES, DIFF_RES);
    const currentPixels = diffCtx.getImageData(0, 0, DIFF_RES, DIFF_RES).data;

    // Compare with previous frame
    if (prevPixelDataRef.current) {
        let diffScore = 0;
        const totalPixels = currentPixels.length; 
        
        // Check every pixel's RGB
        for (let i = 0; i < totalPixels; i += 4) {
            diffScore += Math.abs(currentPixels[i] - prevPixelDataRef.current[i]);     // R
            diffScore += Math.abs(currentPixels[i+1] - prevPixelDataRef.current[i+1]); // G
            diffScore += Math.abs(currentPixels[i+2] - prevPixelDataRef.current[i+2]); // B
        }

        const maxScore = DIFF_RES * DIFF_RES * 3 * 255;
        const changePercentage = diffScore / maxScore;

        // THRESHOLD: 0.2% (0.002).
        // Extremely sensitive: Typing a few characters usually triggers > 0.3%.
        if (changePercentage < 0.002) {
            return null; // SIGNAL: NO CHANGE
        }
    }

    // Store current as previous for next loop
    prevPixelDataRef.current = new Uint8ClampedArray(currentPixels);

    // ----------------------------------------------------
    // TOKEN OPTIMIZATION: RESIZE & COMPRESS
    // ----------------------------------------------------
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return null;

    // Resize to max width 1024px (Better for text reading than 800)
    const MAX_WIDTH = 1024;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // JPEG 0.75 (Better quality for text OCR)
    return canvas.toDataURL('image/jpeg', 0.75);
  }, [captureState.isSharing]);

  useEffect(() => {
    return () => {
      if (captureState.stream) {
        captureState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    captureState,
    startCapture,
    stopCapture,
    takeSnapshot,
    videoRef,
    canvasRef,
  };
};