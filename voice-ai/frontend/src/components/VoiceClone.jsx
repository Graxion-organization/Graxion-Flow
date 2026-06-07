import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Loader2, Play } from 'lucide-react';

export default function VoiceClone() {
  const [text, setText] = useState('');
  const [refText, setRefText] = useState('');
  const [refAudio, setRefAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleAudioUpload = (e) => {
    setRefAudio(e.target.files[0]);
  };

  const handleClone = async () => {
    if (!text.trim() || !refAudio) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('text', text);
    formData.append('ref_text', refText);
    formData.append('ref_audio', refAudio);

    try {
      const response = await axios.post('http://localhost:8000/api/clone_voice', formData, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
    } catch (err) {
      console.error("Voice Clone Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-6">
      <h2 className="text-3xl font-bold text-indigo-400 mb-4">Voice Cloning (F5-TTS)</h2>
      
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-text/80">Reference Audio</label>
          <label className="flex items-center justify-center space-x-2 w-full h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-400/50 hover:bg-indigo-400/5 cursor-pointer transition-colors">
            <Upload className="w-6 h-6 text-indigo-400" />
            <span className="text-text/80">{refAudio ? refAudio.name : 'Upload Reference Audio (.wav)'}</span>
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
          </label>

          <label className="block text-sm font-medium text-text/80">Reference Text (Optional for F5-TTS)</label>
          <textarea
            className="w-full bg-background/50 text-text p-3 rounded-lg border border-white/10 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all resize-none h-20"
            placeholder="Transcript of reference audio..."
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-text/80">Target Text</label>
          <textarea
            className="w-full bg-background/50 text-text p-4 rounded-xl border border-white/10 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all resize-none h-[220px]"
            placeholder="Enter text for the cloned voice to say..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleClone}
        disabled={isLoading || !text.trim() || !refAudio}
        className="flex items-center space-x-2 px-8 py-3 mt-4 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
        <span>{isLoading ? 'Cloning...' : 'Generate Cloned Voice'}</span>
      </button>

      {audioUrl && (
        <div className="w-full max-w-md mt-6 p-4 bg-surface rounded-xl border border-white/5 flex flex-col items-center space-y-4">
          <audio src={audioUrl} controls className="w-full" autoPlay />
        </div>
      )}
    </div>
  );
}
