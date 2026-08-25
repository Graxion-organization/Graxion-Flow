import React, { useState, useEffect } from 'react';
import { keywordAPI, agentAPI } from '../services/api';
import { Plus, Trash2, Edit2, X, MessageSquare, Settings2, Hash, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KeywordTriggersPage() {
  const [keywords, setKeywords] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      await keywordAPI.delete(id);
      toast.success('Keyword deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete keyword');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-10">
      <div className="mb-8">
        <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <div className={`p-1.5 rounded-md ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
            <Hash size={20} />
          </div>
          Keyword Triggers
        </h1>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1 ml-10`}>
          Automate simple replies, assign agents, or trigger flows based on specific words.
        </p>
      </div>

      <div className={`mb-8 p-6 rounded-2xl border shadow-xl ${isDark ? 'bg-white/5 border-white/10 shadow-black/20' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <div className="flex items-center gap-2 mb-6">
          <Settings2 size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {editingId ? 'Edit Trigger Configuration' : 'Create New Trigger'}
          </h2>
        </div>
        
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keyword</label>
              <input 
                type="text" 
                placeholder="e.g. 'pricing'" 
                className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Match Type</label>
              <select 
                className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                value={newKeyword.matchType}
                onChange={(e) => setNewKeyword({...newKeyword, matchType: e.target.value})}
              >
                <option value="exact">Exact Match</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assign to Agent</label>
              <select 
                className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                value={newKeyword.agent}
                onChange={(e) => setNewKeyword({...newKeyword, agent: e.target.value})}
              >
                <option value="">Universal (No Agent)</option>
                {agents.map(a => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reply Location</label>
              <select 
                className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex flex-col gap-3`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Platforms</span>
            <div className="flex flex-wrap gap-4">
              {['whatsapp', 'instagram', 'facebook', 'telegram'].map(platform => (
                <label key={platform} className={`flex items-center gap-2 cursor-pointer text-sm font-medium transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>
                  <input
                    type="checkbox"
                    checked={newKeyword.platforms.includes(platform)}
                    onChange={(e) => {
                      let updated = [...newKeyword.platforms];
                      if (e.target.checked) updated.push(platform);
                      else updated = updated.filter(p => p !== platform);
                      setNewKeyword({ ...newKeyword, platforms: updated });
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={`capitalize ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{platform}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Response Text</label>
              <input 
                type="text" 
                placeholder="What should the bot say?" 
                className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                value={newKeyword.response}
                onChange={(e) => setNewKeyword({...newKeyword, response: e.target.value})}
              />
            </div>

            {newKeyword.replyType !== 'COMMENT' && (
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Media Type</label>
                <select 
                  className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={newKeyword.mediaType}
                  onChange={(e) => setNewKeyword({...newKeyword, mediaType: e.target.value})}
                >
                  <option value="none">No Media</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="document" disabled={newKeyword.platforms.includes('instagram') || newKeyword.platforms.includes('facebook') || newKeyword.platforms.includes('telegram')}>Document (PDF)</option>
                </select>
              </div>
            )}

            {newKeyword.mediaType !== 'none' && newKeyword.replyType !== 'COMMENT' && (
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Media URL</label>
                <input 
                  type="url" 
                  placeholder="https://..." 
                  className={`w-full rounded-xl p-3 border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={newKeyword.mediaUrl}
                  onChange={(e) => setNewKeyword({...newKeyword, mediaUrl: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-inherit" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
            {editingId && (
              <button onClick={resetForm} className={`rounded-xl px-6 py-2.5 font-semibold flex justify-center items-center gap-2 transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}>
                <X size={18} /> Cancel
              </button>
            )}
            <button onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-2.5 font-semibold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
              {editingId ? (
                <><Edit2 size={18} /> Update Trigger</>
              ) : (
                <><Plus size={18} /> Add Trigger</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={`rounded-2xl border overflow-hidden shadow-xl ${isDark ? 'bg-white/5 border-white/10 shadow-black/20' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-500'}`}>
              <tr>
                <th className="p-5 font-semibold text-sm">Keyword</th>
                <th className="p-5 font-semibold text-sm">Platforms</th>
                <th className="p-5 font-semibold text-sm">Match Type</th>
                <th className="p-5 font-semibold text-sm">Agent</th>
                <th className="p-5 font-semibold text-sm">Response</th>
                <th className="p-5 font-semibold text-sm w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr><td colSpan="6" className={`p-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading triggers...</td></tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className={`inline-flex p-4 rounded-full mb-3 ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                      <Hash size={32} />
                    </div>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No triggers configured yet. Create one above.</p>
                  </td>
                </tr>
              ) : (
                keywords.map(kw => (
                  <tr key={kw._id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                    <td className="p-5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        "{kw.keyword}"
                      </span>
                    </td>
                    <td className="p-5 text-sm capitalize">
                      <div className="flex gap-1.5 flex-wrap">
                        {(kw.platforms || ['whatsapp']).map(p => (
                          <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isDark ? 'border-slate-700 text-slate-300 bg-slate-800' : 'border-slate-200 text-slate-600 bg-white'}`}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`p-5 text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{kw.matchType}</td>
                    <td className="p-5 text-sm">
                      {kw.agent ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                          {agents.find(a => a._id === kw.agent)?.name || 'Agent'}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Universal</span>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-sm line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{kw.response}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                            {kw.replyType || 'DM'}
                          </span>
                          {kw.mediaType && kw.mediaType !== 'none' && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-amber-500/20 text-amber-500">
                              <LinkIcon size={10} /> {kw.mediaType}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(kw)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-blue-500/20' : 'text-blue-600 hover:bg-blue-50'}`}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(kw._id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-600 hover:bg-rose-50'}`}>
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
