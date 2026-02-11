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

  const startCapture = useCallback(async () => {
    try {
      setCaptureState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 5 }, 
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load to ensure dimensions are correct
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
        };
      }

      setCaptureState({
        isSharing: true,
        stream,
        error: null,
      });

      // Handle stream stop (e.g. user clicks "Stop sharing" in browser UI)
      const track = stream.getVideoTracks()[0];
      if (track) {
          track.onended = () => {
            stopCapture();
          };
      }

    } catch (err: any) {
      console.error("Error starting screen capture:", err);
      
      let errorMessage = "Failed to share screen. Please try again.";

      // Handle specific error cases
      if (err.name === 'NotAllowedError') {
         errorMessage = "Permission denied. You must grant screen recording permissions.";
      } 
      else if (err.message && (err.message.includes('permissions policy') || err.message.includes('denied by system'))) {
         errorMessage = "Screen sharing blocked by browser environment. Try opening this app in a new tab or window.";
      }
      else if (err.name === 'NotFoundError') {
         errorMessage = "No screen video source found.";
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
      return {
        isSharing: false,
        stream: null,
        error: null,
      };
    });
  }, []);

  const takeSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !captureState.isSharing) {
      return null;
    }

    const video = videoRef.current;
    
    // Safety check: ensure video has data and dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        // console.warn("Video not ready for snapshot yet"); 
        return null;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress heavily to save bandwidth/tokens (JPEG, quality 0.6)
    return canvas.toDataURL('image/jpeg', 0.6);
  }, [captureState.isSharing]);

  // Cleanup on unmount
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