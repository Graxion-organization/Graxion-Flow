import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Mic, Upload, StopCircle, Play, Loader2 } from 'lucide-react';

export default function STT() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await handleAudioUpload(file);
    }
  };

  const handleAudioUpload = async (fileOrBlob) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', fileOrBlob, 'recording.wav');

    try {
      const response = await axios.post('http://localhost:8000/api/stt', formData);
      setTranscription(response.data.text);
    } catch (err) {
      console.error("STT Error", err);
      setTranscription("Error processing audio.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-6">
      <h2 className="text-3xl font-bold text-primary mb-4">Speech to Text</h2>
      
      <div className="flex space-x-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all ${
            isRecording 
              ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 animate-pulse' 
              : 'bg-primary/10 text-primary border border-primary/50 hover:bg-primary/20'
          }`}
        >
          {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
        </button>

        <label className="flex items-center space-x-2 px-6 py-3 rounded-full font-semibold bg-surface border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
          <Upload className="w-5 h-5 text-secondary" />
          <span className="text-text">Upload Audio</span>
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="w-full max-w-2xl mt-8">
        <div className="bg-background/50 rounded-xl p-6 min-h-[150px] border border-white/5 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <p className="text-lg text-text/80 whitespace-pre-wrap">
              {transcription || "Your transcription will appear here..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
