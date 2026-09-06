import React, { useState, useEffect } from 'react';
import { keywordAPI, agentAPI } from '../services/api';
import { Plus, Trash2, Edit2, X, MessageSquare, Settings2, Hash, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KeywordTriggersPage() {
  const [keywords, setKeywords] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [newKeyword, setNewKeyword] = useState({ 
    keyword: '', 
    matchType: 'exact', 
    action: 'SEND_MESSAGE', 
    response: '',
    platforms: ['whatsapp'],
    replyType: 'ALL',
    mediaType: 'none',
    mediaUrl: '',
    agent: '' // empty means universal
  });

  useEffect(() => {
    fetchData();
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [kwRes, agentsRes] = await Promise.all([
        keywordAPI.getAll(),
        agentAPI.getAll()
      ]);
      setKeywords(kwRes.data.data.keywords);
      setAgents(agentsRes.data.data.agents);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewKeyword({ 
      keyword: '', 
      matchType: 'exact', 
      action: 'SEND_MESSAGE', 
      response: '',
      platforms: ['whatsapp'],
      replyType: 'ALL',
      mediaType: 'none',
      mediaUrl: '',
      agent: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!newKeyword.keyword || !newKeyword.response) return toast.error('Keyword and response are required');
    if (newKeyword.platforms.length === 0) return toast.error('Please select at least one platform');
    setIsSaving(true);
    try {
      const payload = { ...newKeyword };
      if (!payload.agent) payload.agent = null;
      if (editingId) {
        await keywordAPI.update(editingId, payload);
        toast.success('Keyword updated successfully');
      } else {
        await keywordAPI.create(payload);
        toast.success('Keyword added successfully');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save keyword');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (kw) => {
    setNewKeyword({
      keyword: kw.keyword,
      matchType: (kw.matchType || 'EXACT').toLowerCase(),
      action: kw.action || 'SEND_MESSAGE',
      response: kw.response || '',
      platforms: kw.platforms || ['whatsapp'],
      replyType: kw.replyType || 'ALL',
      mediaType: kw.mediaType || 'none',
      mediaUrl: kw.mediaUrl || '',
      agent: kw.agent || ''
    });
    setEditingId(kw._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trigger?')) return;
    try {
      await keywordAPI.delete(id);
      toast.success('Keyword deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete keyword');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in pb-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6A00] to-rose-500 flex items-center justify-center text-white shadow-lg shadow-[#FF6A00]/20">
              <Hash size={24} />
            </div>
            <div>
              <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Keyword Triggers
              </h1>
              <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Automate replies, assign agents, or trigger workflows instantly based on specific keywords.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`mb-10 p-1 rounded-[2rem] bg-gradient-to-b ${isDark ? 'from-white/10 to-transparent' : 'from-slate-200 to-transparent'}`}>
        <div className={`p-6 sm:p-8 rounded-[1.85rem] backdrop-blur-xl ${isDark ? 'bg-slate-900/90' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00]">
              <Settings2 size={20} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {editingId ? 'Edit Trigger Configuration' : 'Create New Trigger'}
            </h2>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keyword</label>
                <input 
                  type="text" 
                  placeholder="e.g. 'pricing'" 
                  className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Match Type</label>
                <select 
                  className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={newKeyword.matchType}
                  onChange={(e) => setNewKeyword({...newKeyword, matchType: e.target.value})}
                >
                  <option value="exact">Exact Match</option>
                  <option value="contains">Contains Word</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assign to Agent</label>
                <select 
                  className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={newKeyword.agent}
                  onChange={(e) => setNewKeyword({...newKeyword, agent: e.target.value})}
                >
                  <option value="">Universal (No Agent)</option>
                  {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reply Location</label>
                <select 
                  className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={newKeyword.replyType}
                  onChange={(e) => {
                    const newReplyType = e.target.value;
                    let newMediaType = newKeyword.mediaType;
                    if (newReplyType === 'COMMENT') newMediaType = 'none';
                    setNewKeyword({...newKeyword, replyType: newReplyType, mediaType: newMediaType});
                  }}
                >
                  <option value="ALL">DM & Comment</option>
                  <option value="DM">DM Only</option>
                  <option value="COMMENT">Comment Only</option>
                </select>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} flex flex-col gap-3`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Platforms</span>
              <div className="flex flex-wrap gap-4">
                {['whatsapp', 'instagram', 'facebook', 'telegram'].map(platform => (
                  <label key={platform} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={newKeyword.platforms.includes(platform)}
                        onChange={(e) => {
                          let updated = [...newKeyword.platforms];
                          if (e.target.checked) updated.push(platform);
                          else updated = updated.filter(p => p !== platform);
                          setNewKeyword({ ...newKeyword, platforms: updated });
                        }}
                        className={`w-5 h-5 rounded-md border-2 appearance-none transition-all cursor-pointer ${
                          newKeyword.platforms.includes(platform)
                            ? 'bg-[#FF6A00] border-[#FF6A00]'
                            : isDark ? 'border-slate-600 bg-slate-700 group-hover:border-slate-500' : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}
                      />
                      {newKeyword.platforms.includes(platform) && (
                        <svg className="absolute w-3 h-3 text-white left-1 top-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      )}
                    </div>
                    <span className={`text-sm font-semibold capitalize transition-colors ${
                      newKeyword.platforms.includes(platform)
                        ? isDark ? 'text-white' : 'text-slate-900'
                        : isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="flex flex-col gap-2 lg:col-span-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Response Message</label>
                <input 
                  type="text" 
                  placeholder="Type the automated response..." 
                  className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  value={newKeyword.response}
                  onChange={(e) => setNewKeyword({...newKeyword, response: e.target.value})}
                />
              </div>

              {newKeyword.replyType !== 'COMMENT' && (
                <div className="flex flex-col gap-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Include Media</label>
                  <select 
                    className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    value={newKeyword.mediaType}
                    onChange={(e) => setNewKeyword({...newKeyword, mediaType: e.target.value})}
                  >
                    <option value="none">No Media</option>
                    <option value="image">Image Attachment</option>
                    <option value="video">Video Attachment</option>
                    <option value="audio">Audio File</option>
                    <option value="document" disabled={newKeyword.platforms.includes('instagram') || newKeyword.platforms.includes('facebook') || newKeyword.platforms.includes('telegram')}>Document (PDF)</option>
                  </select>
                </div>
              )}

              {newKeyword.mediaType !== 'none' && newKeyword.replyType !== 'COMMENT' && (
                <div className="flex flex-col gap-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Media URL</label>
                  <input 
                    type="url" 
                    placeholder="https://..." 
                    className={`w-full rounded-xl px-4 py-3 border focus:ring-2 focus:ring-[#FF6A00] focus:border-[#FF6A00] outline-none transition-all text-sm font-medium shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    value={newKeyword.mediaUrl}
                    onChange={(e) => setNewKeyword({...newKeyword, mediaUrl: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              {editingId && (
                <button 
                  onClick={resetForm} 
                  className={`rounded-xl px-6 py-3 font-bold flex justify-center items-center gap-2 transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                >
                  <X size={18} /> Cancel
                </button>
              )}
              <button 
                onClick={handleSubmit} 
                disabled={isSaving}
                className="bg-gradient-to-r from-[#FF6A00] to-rose-500 text-white rounded-xl px-8 py-3 font-bold flex justify-center items-center gap-2 shadow-lg shadow-[#FF6A00]/20 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(255,106,0,0.4)] disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSaving ? (
                   <Loader2 size={18} className="animate-spin" />
                ) : editingId ? (
                  <><Edit2 size={18} /> Update Trigger</>
                ) : (
                  <><Plus size={18} /> Save Trigger</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Table Section */}
      <div className={`rounded-3xl border overflow-hidden shadow-xl ${isDark ? 'bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <div className="px-8 py-5 border-b flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Configured Triggers</h3>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{keywords.length} Total</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              <tr>
                <th className="px-8 py-4 font-bold text-xs uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Platforms</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Routing</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Response</th>
                <th className="px-8 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <Loader2 size={32} className="animate-spin text-[#FF6A00] mx-auto mb-4" />
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading triggers...</p>
                  </td>
                </tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="inline-flex p-5 rounded-full mb-4 bg-[#FF6A00]/10 text-[#FF6A00]">
                      <MessageSquare size={36} />
                    </div>
                    <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>No Triggers Found</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Create your first keyword trigger using the form above.</p>
                  </td>
                </tr>
              ) : (
                keywords.map(kw => (
                  <tr key={kw._id} className={`transition-all ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/80'} group`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${isDark ? 'bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20' : 'bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20'}`}>
                          "{kw.keyword}"
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2 flex-wrap">
                        {(kw.platforms || ['whatsapp']).map(p => (
                          <span key={p} className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {kw.matchType} Match
                        </span>
                        {kw.agent ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-md w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            {agents.find(a => a._id === kw.agent)?.name || 'Agent'}
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md w-fit ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            Universal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 max-w-xs">
                        <span className={`text-sm font-medium line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{kw.response}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {kw.replyType || 'DM'}
                          </span>
                          {kw.mediaType && kw.mediaType !== 'none' && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <LinkIcon size={10} /> {kw.mediaType}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(kw)} className={`p-2.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300' : 'bg-white border border-slate-200 text-blue-600 hover:bg-blue-50'}`}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(kw._id)} className={`p-2.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 ${isDark ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300' : 'bg-white border border-slate-200 text-rose-600 hover:bg-rose-50'}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
