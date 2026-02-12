import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface UseGeminiLiveProps {
  apiKey: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useGeminiLive = ({ apiKey, videoRef }: UseGeminiLiveProps) => {
  const [isLive, setIsLive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Audio Queue for playback
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Video Interval
  const videoIntervalRef = useRef<number | null>(null);
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Helper: Convert Float32 audio from mic to 16-bit PCM for Gemini
  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Uint8Array(buffer);
  };

  // Helper: Encode to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Decode Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const startLive = useCallback(async () => {
    if (!apiKey) {
      setError("API Key required");
      return;
    }

    try {
      setIsLive(true);
      setError(null);
      
      const ai = new GoogleGenAI({ apiKey });
      
      // 1. Setup Input Audio (Mic)
      // ------------------------------------------------------------
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputSourceRef.current = inputContextRef.current.createMediaStreamSource(stream);
      processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      
      // 2. Setup Output Audio (Speaker)
      // ------------------------------------------------------------
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 3. Connect to Gemini Live
      // ------------------------------------------------------------
      const connectPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: `You are Screen Buddy, a helpful AI copilot. 
          You can see the user's screen. 
          Be concise, friendly, and direct. 
          When the user speaks, listen carefully. 
          If you see something interesting on the screen, you can comment on it briefly.`,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            
            // Stream audio from the microphone to the model.
            if (processorRef.current && inputSourceRef.current && inputContextRef.current) {
                inputSourceRef.current.connect(processorRef.current);
                processorRef.current.connect(inputContextRef.current.destination);
                
                processorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64 = arrayBufferToBase64(pcm16);
                    
                    // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`
                    sessionPromiseRef.current?.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64
                            }
                        });
                    });
                };
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current) {
                setIsAiSpeaking(true);
                const audioBufferChunk = base64ToArrayBuffer(audioData);
                
                // Decode raw PCM
                // Gemini returns raw PCM 16-bit 24kHz usually.
                // We need to decode this manually or use AudioContext.decodeAudioData if headers were present.
                // Since it's raw PCM, we manually float-ify it.
                
                const pcmData = new Int16Array(audioBufferChunk);
                const floatData = new Float32Array(pcmData.length);
                for (let i = 0; i < pcmData.length; i++) {
                    floatData[i] = pcmData[i] / 32768.0;
                }
                
                const audioBuffer = outputContextRef.current.createBuffer(1, floatData.length, 24000);
                audioBuffer.getChannelData(0).set(floatData);

                const source = outputContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputContextRef.current.destination);
                
                // Scheduling
                const currentTime = outputContextRef.current.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                audioSourcesRef.current.add(source);
                source.onended = () => {
                    audioSourcesRef.current.delete(source);
                    if (audioSourcesRef.current.size === 0) setIsAiSpeaking(false);
                };
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
                console.log("Interrupted by user");
                audioSourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsAiSpeaking(false);
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setIsLive(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setError("Connection Error");
            setIsLive(false);
          }
        }
      });

      sessionPromiseRef.current = connectPromise;

      // 4. Start Video Streaming
      // ------------------------------------------------------------
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const targetFPS = 2; // Low FPS to save bandwidth, increase if needed

      videoIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        
        // Resize for performance (e.g., 640px width)
        const scale = 640 / videoRef.current.videoWidth;
        canvas.width = 640;
        canvas.height = videoRef.current.videoHeight * scale;
        
        ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        sessionPromiseRef.current?.then(session => {
             session.sendRealtimeInput({
                 media: { mimeType: 'image/jpeg', data: base64 }
             });
        });

      }, 1000 / targetFPS);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start Live session");
      setIsLive(false);
    }
  }, [apiKey, videoRef]);

  const stopLive = useCallback(() => {
    // 1. Close Session
    sessionPromiseRef.current?.then(session => {
        try { session.close(); } catch(e) {}
    });
    sessionPromiseRef.current = null;

    // 2. Stop Audio Input
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (inputContextRef.current) inputContextRef.current.close();
    
    // 3. Stop Audio Output
    audioSourcesRef.current.forEach(src => {
        try { src.stop(); } catch(e) {}
    });
    audioSourcesRef.current.clear();
    if (outputContextRef.current) outputContextRef.current.close();

    // 4. Stop Video Interval
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }

    setIsLive(false);
    setIsAiSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
        stopLive();
    };
  }, []);

  return {
    isLive,
    isAiSpeaking,
    error,
    startLive,
    stopLive
  };
};