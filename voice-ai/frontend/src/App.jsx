import React, { useState } from 'react';
import { Mic, Volume2, Users, MessageSquare } from 'lucide-react';
import STT from './components/STT';
import TTS from './components/TTS';
import VoiceClone from './components/VoiceClone';
import RealtimeChat from './components/RealtimeChat';

function App() {
  const [activeTab, setActiveTab] = useState('stt');

  const tabs = [
    { id: 'stt', label: 'Speech to Text', icon: <Mic className="w-5 h-5" /> },
    { id: 'tts', label: 'Text to Speech', icon: <Volume2 className="w-5 h-5" /> },
    { id: 'clone', label: 'Voice Clone', icon: <Users className="w-5 h-5" /> },
    { id: 'chat', label: 'Realtime Chat', icon: <MessageSquare className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-primary via-secondary to-indigo-400 text-transparent bg-clip-text drop-shadow-sm">
          Local Voice AI Platform
        </h1>
        <p className="text-xl text-text/60 max-w-2xl mx-auto">
          Private, powerful, and completely offline voice processing.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 bg-surface/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm mb-12 shadow-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(102,252,241,0.1)]'
                : 'text-text/70 hover:text-text hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl transition-all duration-500 ease-in-out transform">
        {activeTab === 'stt' && <STT />}
        {activeTab === 'tts' && <TTS />}
        {activeTab === 'clone' && <VoiceClone />}
        {activeTab === 'chat' && <RealtimeChat />}
      </div>

      {/* Background Ornaments */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

    </div>
  );
}

export default App;
