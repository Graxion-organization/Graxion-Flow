import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Play, Loader2, Volume2 } from 'lucide-react';

export default function TTS() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/tts', { text }, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
    } catch (err) {
      console.error("TTS Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-6">
      <h2 className="text-3xl font-bold text-secondary mb-4">Text to Speech</h2>
      
      <div className="w-full max-w-2xl">
        <textarea
          className="w-full bg-background/50 text-text p-4 rounded-xl border border-white/10 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all resize-none h-32"
          placeholder="Enter text to synthesize..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading || !text.trim()}
        className="flex items-center space-x-2 px-8 py-3 rounded-full font-semibold bg-secondary/10 text-secondary border border-secondary/50 hover:bg-secondary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
        <span>{isLoading ? 'Generating...' : 'Generate Audio'}</span>
      </button>

      {audioUrl && (
        <div className="w-full max-w-md mt-6 p-4 bg-surface rounded-xl border border-white/5 flex flex-col items-center space-y-4">
          <audio ref={audioRef} src={audioUrl} controls className="w-full" autoPlay />
        </div>
      )}
    </div>
  );
}
