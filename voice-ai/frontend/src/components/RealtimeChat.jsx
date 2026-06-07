import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Zap } from 'lucide-react';

export default function RealtimeChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket
    wsRef.current = new WebSocket('ws://localhost:8000/ws/chat');
    
    wsRef.current.onopen = () => setIsConnected(true);
    wsRef.current.onclose = () => setIsConnected(false);
    
    wsRef.current.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
          setMessages(prev => [...prev, { role: 'user', text: data.text }]);
        } else if (data.type === 'llm_response') {
          setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
        }
      } else if (event.data instanceof Blob) {
        // Handle audio response
        const audioUrl = URL.createObjectURL(event.data);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    if (!isConnected) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      // Send audio in chunks every 2 seconds or when stopped
      mediaRecorderRef.current.start(2000);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-6 h-[600px]">
      <div className="flex items-center justify-between w-full max-w-2xl mb-4">
        <h2 className="text-3xl font-bold text-green-400 flex items-center space-x-2">
          <Zap className="w-8 h-8" />
          <span>Real-time Voice Chat</span>
        </h2>
        <div className={`flex items-center space-x-2 px-4 py-1 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl bg-background/50 border border-white/5 rounded-2xl p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text/40 italic">
            Start talking to see the conversation...
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-6 py-3 ${
                msg.role === 'user' 
                  ? 'bg-primary/20 text-primary border border-primary/20 rounded-br-none' 
                  : 'bg-surface border border-white/10 text-text rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="w-full max-w-2xl flex justify-center pt-4">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={!isConnected}
          className={`group relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-95' 
              : 'bg-surface hover:bg-surface/80 border border-white/10 hover:border-primary/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <Square className="w-10 h-10 text-white animate-pulse" />
          ) : (
            <Mic className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
          )}
          
          <div className="absolute -bottom-8 text-sm font-medium text-text/60 whitespace-nowrap">
            {isRecording ? 'Release to Send' : 'Hold to Talk'}
          </div>
        </button>
      </div>
    </div>
  );
}
