import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Bot, Users, Video, BrainCircuit, Activity, Settings, 
  PlayCircle, FileText, UploadCloud, Plus, Mic, Calendar, Link, Trash2, X
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dynamic State
  const [agents, setAgents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({ activeAgents: '0', presentations: '0', kbFiles: '0' });
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const fileInputRef = useRef(null);
  const isEmbedded = window.location.search.includes('embed=true');

  // Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ topic: '', date: '', time: '', duration: 30 });

  // Load Initial Data
  useEffect(() => {
    fetchAgents();
    fetchMeetings();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/agents`);
      setAgents(data);
      setStats(prev => ({ ...prev, activeAgents: data.length.toString() }));
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/meetings`);
      setMeetings(data);
      setStats(prev => ({ ...prev, presentations: data.length.toString() }));
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const handleCreateAgent = async () => {
    const name = prompt("Enter Agent Name (e.g., 'Sales Presenter'):");
    if (!name) return;
    const persona = prompt("Enter Agent Persona (e.g., 'You are a professional sales agent...'):", "You are a professional sales agent.");
    const voiceId = prompt("Enter ElevenLabs Voice ID (e.g., '21m00Tcm4TlvDq8ikWAM'):", "21m00Tcm4TlvDq8ikWAM");

    setIsCreatingAgent(true);
    try {
      await axios.post(`${API_BASE_URL}/agents`, {
        name,
        personaPrompt: persona,
        elevenLabsVoiceId: voiceId
      });
      fetchAgents();
      alert('Agent Created Successfully!');
    } catch (error) {
      console.error('Creation error:', error);
      alert('Failed to create agent.');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/agents/${agentId}`);
      fetchAgents();
    } catch (error) {
      console.error('Delete agent error:', error);
      alert('Failed to delete agent.');
    }
  };

  const submitSchedule = async () => {
    if (agents.length === 0) {
      alert("Please create an Agent first.");
      setShowScheduleModal(false);
      return;
    }
    if (!scheduleData.topic || !scheduleData.date || !scheduleData.time) {
      alert("Please fill all fields.");
      return;
    }

    setIsScheduling(true);
    try {
      // Combine Date and Time
      const scheduledStartTime = new Date(`${scheduleData.date}T${scheduleData.time}`);

      await axios.post(`${API_BASE_URL}/meetings`, {
        agentId: agents[0]._id, // Default to first agent
        topic: scheduleData.topic,
        scheduledStartTime,
        durationMinutes: parseInt(scheduleData.duration)
      });
      
      fetchMeetings();
      setShowScheduleModal(false);
      setScheduleData({ topic: '', date: '', time: '', duration: 30 });
      alert('Presentation Scheduled! The AI Bot will automatically run at this time.');
    } catch (error) {
      console.error('Scheduling error:', error);
      alert('Failed to schedule presentation.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to delete this scheduled presentation?")) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/meetings/${meetingId}`);
      fetchMeetings();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete presentation.');
    }
  };

  const handleStartBot = async (meetingId) => {
    try {
      alert("Waking up AI Bot. It will join the Zoom meeting and start presenting shortly...");
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/start`);
    } catch (error) {
      console.error('Start Bot error:', error);
      alert('Failed to start the AI Bot. Make sure backend services are running.');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || agents.length === 0) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/agents/${agents[0]._id}/knowledge-base`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('File uploaded to Knowledge Base successfully!');
      fetchAgents();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        {!isEmbedded && (
          <aside className="w-64 border-r border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <BrainCircuit className="text-white w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  AI Presenter
                </h1>
              </div>

              <nav className="px-4 mt-6 space-y-1">
                {[
                  { id: 'dashboard', icon: Activity, label: 'Dashboard' },
                  { id: 'agents', icon: Bot, label: 'My Agents' },
                  { id: 'materials', icon: FileText, label: 'Knowledge Base' },
                  { id: 'meetings', icon: Calendar, label: 'Presentations' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-purple-400' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 flex flex-col h-full overflow-y-auto ${isEmbedded ? 'bg-transparent' : ''}`}>
          {/* Header */}
          <header className={`h-20 border-b border-white/10 bg-white/[0.01] backdrop-blur-md px-8 flex items-center sticky top-0 z-10 ${isEmbedded ? 'justify-start' : 'justify-between'}`}>
            <div className="flex items-center gap-4">
              {isEmbedded && (
                <nav className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
                   {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'agents', label: 'My Agents' },
                    { id: 'materials', label: 'Knowledge Base' },
                    { id: 'meetings', label: 'Presentations' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        activeTab === item.id 
                          ? 'bg-purple-500/20 text-purple-400 font-medium' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              )}
              <h2 className="text-lg font-medium text-white/80 capitalize">{activeTab}</h2>
            </div>
            
            {!isEmbedded && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-blue-600 border border-white/20 p-[2px]">
                <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" className="w-full h-full rounded-full" />
              </div>
            )}
          </header>

          {/* Views */}
          <div className="p-8 max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Overview</h2>
                    <p className="text-gray-400">Manage your virtual presentation agents and upcoming meetings.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleCreateAgent}
                      disabled={isCreatingAgent}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Plus className="w-5 h-5" />
                      {isCreatingAgent ? 'Creating...' : 'New Agent'}
                    </button>
                    <button 
                      onClick={() => setShowScheduleModal(true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                      <Video className="w-5 h-5" />
                      Schedule Zoom
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[
                    { label: 'Active Agents', value: stats.activeAgents, color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/20', icon: Bot },
                    { label: 'Scheduled Presentations', value: stats.presentations, color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20', icon: Calendar },
                    { label: 'Total Knowledge Files', value: stats.kbFiles, color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', icon: FileText },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-2xl p-6 relative overflow-hidden group`}>
                      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity group-hover:scale-110 duration-500">
                        <stat.icon className="w-16 h-16" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">{stat.label}</p>
                      <h3 className="text-3xl font-bold text-white mb-2 relative z-10">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Agents List Preview */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6">Your Agents</h3>
                    <div className="space-y-4">
                      {agents.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No agents created yet.</p>
                      ) : (
                        agents.map((agent, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <Mic className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{agent.name}</h4>
                                <p className="text-xs text-gray-400 truncate w-48">{agent.personaPrompt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">Active</span>
                              <button onClick={() => handleDeleteAgent(agent._id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500/10 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Upcoming Presentations Preview */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6">Upcoming Presentations</h3>
                    <div className="space-y-4">
                      {meetings.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No presentations scheduled.</p>
                      ) : (
                        meetings.map((meeting, i) => (
                          <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 relative group">
                            
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDeleteMeeting(meeting._id)} className="text-red-400 hover:text-red-300 p-1 bg-red-500/10 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-white pr-8">{meeting.topic}</h4>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">
                                {new Date(meeting.scheduledStartTime).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-400">{meeting.durationMinutes} mins</span>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(meeting.zoomJoinUrl);
                                  alert("Public Join Link copied to clipboard!");
                                }}
                                className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                              >
                                <Link className="w-4 h-4" /> Copy Link
                              </button>
                              
                              <div className="flex gap-2">
                                <a href={meeting.zoomStartUrl} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                  <PlayCircle className="w-4 h-4" /> Host
                                </a>
                                <button 
                                  onClick={() => handleStartBot(meeting._id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                                >
                                  <Bot className="w-4 h-4" /> Start Bot
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'materials' && (
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Knowledge Base</h3>
                    <p className="text-sm text-gray-400 mt-1">Upload PDFs or Videos to train your agents.</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf,.mp4"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    disabled={isUploading}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.flatMap(a => a.knowledgeBase || []).length === 0 ? (
                    <p className="text-gray-500">No knowledge base files found. Upload some to train your agents!</p>
                  ) : (
                    agents.flatMap(a => (a.knowledgeBase || []).map((file, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                        <FileText className="w-6 h-6 text-purple-400 flex-shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-white truncate">{file.fileUrl.split('/').pop().split('\\').pop()}</p>
                          <p className="text-xs text-gray-400 mt-1 uppercase">{file.fileType}</p>
                        </div>
                      </div>
                    )))
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Schedule Presentation</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Topic</label>
                <input 
                  type="text" 
                  value={scheduleData.topic}
                  onChange={(e) => setScheduleData({...scheduleData, topic: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="e.g., Q3 Marketing Plan"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Time</label>
                  <input 
                    type="time" 
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Duration (minutes)</label>
                <select 
                  value={scheduleData.duration}
                  onChange={(e) => setScheduleData({...scheduleData, duration: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="15">15 mins</option>
                  <option value="30">30 mins</option>
                  <option value="45">45 mins</option>
                  <option value="60">60 mins</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={submitSchedule}
                  disabled={isScheduling}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Zoom Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
