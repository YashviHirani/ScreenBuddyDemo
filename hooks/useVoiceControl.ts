import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceControlProps {
  onStart: () => void;
  onStop: () => void;
  onTogglePip: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isCapturing: boolean;
  goal: string;
}

export const useVoiceControl = ({
  onStart,
  onStop,
  onTogglePip,
  onMinimize,
  onMaximize,
  isCapturing,
  goal
}: VoiceControlProps) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  
  // Refs to keep callbacks fresh in the event listener without re-binding
  const callbacksRef = useRef({ onStart, onStop, onTogglePip, onMinimize, onMaximize, isCapturing, goal });
  useEffect(() => {
    callbacksRef.current = { onStart, onStop, onTogglePip, onMinimize, onMaximize, isCapturing, goal };
  }, [onStart, onStop, onTogglePip, onMinimize, onMaximize, isCapturing, goal]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Voice control not supported in this browser.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim().toLowerCase();
      setLastCommand(transcript);

      const { onStart, onStop, onTogglePip, onMinimize, onMaximize, isCapturing, goal } = callbacksRef.current;

      console.log("Voice Command:", transcript);

      if (transcript.includes('start') || transcript.includes('begin') || transcript.includes('activate')) {
        if (!isCapturing && goal.trim()) {
             // Attempt start. Note: Browsers may block getDisplayMedia if not triggered by a click.
             try { onStart(); } catch(e) { console.warn("Voice start blocked", e); }
        }
      }
      else if (transcript.includes('stop') || transcript.includes('terminate') || transcript.includes('end session')) {
        if (isCapturing) onStop();
      }
      else if (transcript.includes('float') || transcript.includes('pop') || transcript.includes('overlay') || transcript.includes('window')) {
        onTogglePip();
      }
      else if (transcript.includes('minimize') || transcript.includes('bottom') || transcript.includes('hide') || transcript.includes('down')) {
        onMinimize();
      }
      else if (transcript.includes('maximize') || transcript.includes('expand') || transcript.includes('show') || transcript.includes('restore') || transcript.includes('up')) {
        onMaximize();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      if (event.error === 'not-allowed') {
          setIsListening(false);
          shouldListenRef.current = false;
          setError("Microphone access denied.");
      }
    };

    recognition.onend = () => {
        // Auto-restart if we are supposed to be listening
        if (shouldListenRef.current) {
            try {
                recognition.start();
            } catch (e) {
                setIsListening(false);
            }
        } else {
            setIsListening(false);
        }
    };

    try {
        recognition.start();
        shouldListenRef.current = true;
        setIsListening(true);
        setError(null);
        recognitionRef.current = recognition;
    } catch (e) {
        console.error("Failed to start recognition", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
      if (isListening) stopListening();
      else startListening();
  }, [isListening, startListening, stopListening]);

  return { isListening, toggleListening, lastCommand, error };
};