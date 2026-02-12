
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, file?: PendingFile) => void;
  isProcessing: boolean;
  hasScreenContext: boolean;
}

interface PendingFile {
  name: string;
  data: string;
  mimeType: string;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-all text-xs font-medium"
      title="Copy code"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

const markdownComponents: Components = {
  code({node, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match && !String(children).includes('\n');
      
      if (isInline) {
        return (
          <code className="bg-gray-950/30 rounded px-1.5 py-0.5 text-indigo-200 font-mono text-sm border border-indigo-500/20" {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="relative group/code my-4 rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950/50">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800/50 backdrop-blur-sm">
            <span className="text-xs font-mono text-gray-500 lowercase">{match ? match[1] : 'code'}</span>
            <CopyButton text={String(children).replace(/\n$/, '')} />
          </div>
          <div className="overflow-x-auto p-4 custom-scrollbar">
            <code className={`${className} bg-transparent p-0 border-none text-sm font-mono leading-relaxed block whitespace-pre`} {...props}>
              {children}
            </code>
          </div>
        </div>
      )
  },
  pre({node, children, ...props}) {
    return <>{children}</>;
  }
};

const LineTypewriter = ({ text, onUpdate, onComplete }: { text: string, onUpdate?: () => void, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const lines = useMemo(() => text.split('\n'), [text]);
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
  }, [onUpdate, onComplete]);

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine >= lines.length) {
        clearInterval(interval);
        onCompleteRef.current?.();
        return;
      }

      setDisplayedText(prev => {
        const next = prev + (prev ? '\n' : '') + lines[currentLine];
        currentLine++;
        return next;
      });
      onUpdateRef.current?.();
    }, 40); // Fast line-by-line typing

    return () => clearInterval(interval);
  }, [lines]);

  return (
    <ReactMarkdown 
      className="prose prose-invert prose-sm max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4"
      components={markdownComponents}
    >
      {displayedText}
    </ReactMarkdown>
  );
};

// Fix for line 344 error: Defined MessageItemProps and used React.FC to support standard JSX attributes like key.
interface MessageItemProps {
  message: ChatMessage;
  isLatest: boolean;
  scrollToBottom: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLatest, scrollToBottom }) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const shouldAnimate = message.role === 'model' && isLatest && !hasAnimated;

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.2s_ease-out]`}>
      <div 
        className={`max-w-[85%] px-6 py-4 rounded-2xl text-base leading-relaxed shadow-sm ${
          message.role === 'user' 
            ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500/50' 
            : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
        }`}
      >
        {shouldAnimate ? (
          <LineTypewriter 
            text={message.text} 
            onUpdate={scrollToBottom} 
            onComplete={() => setHasAnimated(true)} 
          />
        ) : (
          <ReactMarkdown 
            className="prose prose-invert prose-sm max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4"
            components={markdownComponents}
          >
            {message.text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  isProcessing,
  hasScreenContext
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, scrollToBottom]);

  // Speech Recognition Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !pendingFile) || isProcessing) return;
    
    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    onSendMessage(inputValue, pendingFile || undefined);
    setInputValue('');
    setPendingFile(null);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (isImage) {
            const base64 = result.split(',')[1];
            setPendingFile({ name: file.name, data: base64, mimeType: file.type });
        } else {
            setPendingFile({ name: file.name, data: result, mimeType: file.type });
        }
    };

    if (isImage) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <>
      <aside 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`fixed inset-0 w-full h-full bg-gray-950 z-[251] flex flex-col transition-transform duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {isDragging && (
            <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm border-4 border-dashed border-indigo-500/50 z-[260] flex items-center justify-center pointer-events-none">
                <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl border border-indigo-500/30 text-center animate-bounce">
                    <svg className="w-16 h-16 text-indigo-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xl font-black text-white uppercase tracking-tighter italic">Drop to Analyze</p>
                </div>
            </div>
        )}

        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Buddy Chat</h2>
                {hasScreenContext && (
                  <p className="text-[9px] text-indigo-400 font-black uppercase flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Screen Context Active
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-sm italic">Type below or drag a file here to begin...</p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <MessageItem 
                  key={m.timestamp.toString() + idx} 
                  message={m} 
                  isLatest={idx === messages.length - 1} 
                  scrollToBottom={scrollToBottom}
                />
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-gray-800/50 border border-gray-700 px-6 py-4 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1.5 py-1">
                    <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-gray-900/50 border-t border-gray-800">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {pendingFile && (
                <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl animate-slide-up self-start">
                    {pendingFile.mimeType.startsWith('image/') ? (
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )}
                    <span className="text-xs font-bold text-indigo-300 truncate max-w-[200px]">{pendingFile.name}</span>
                    <button 
                        type="button"
                        onClick={() => setPendingFile(null)}
                        className="p-1 hover:bg-indigo-500/20 rounded-full transition-colors text-indigo-400"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            
            <div className="relative flex items-center gap-2">
                <div className="flex-1 relative flex items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute left-3 p-2 text-gray-500 hover:text-indigo-400 transition-colors"
                        title="Upload File"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    
                    {/* Voice Input Button */}
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`absolute left-12 p-2 transition-all duration-300 ${isListening ? 'text-rose-500 bg-rose-500/10 rounded-full' : 'text-gray-500 hover:text-indigo-400'}`}
                        title={isListening ? "Stop Listening" : "Start Voice Input"}
                    >
                        <svg className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Ask Screen Buddy..."}
                        disabled={isProcessing}
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-4 pl-24 pr-14 text-base text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    />
                    <button 
                        type="submit" 
                        disabled={(!inputValue.trim() && !pendingFile) || isProcessing}
                        className="absolute right-3 p-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
};
