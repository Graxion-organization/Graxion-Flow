import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, X, Facebook } from 'lucide-react';
import { facebookAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function FacebookPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchAccounts();
    import('../utils/scriptLoader').then(({ loadFbSdk }) => loadFbSdk().catch(() => {}));
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await facebookAPI.getAll();
      setAccounts(res.data.data.accounts);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConnect = async (accessToken) => {
    setAutoConnecting(true);
    try {
      const res = await facebookAPI.autoConnect(accessToken);
      toast.success(res.data.message || 'Facebook pages connected!');
      setAccounts((prev) => {
        const next = [...prev];
        res.data.data.accounts.forEach((acc) => {
          const i = next.findIndex((a) => a._id === acc._id);
          if (i !== -1) next[i] = acc;
          else next.push(acc);
        });
        return next;
      });
      setShowAddPanel(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-connect failed');
    } finally {
      setAutoConnecting(false);
    }
  };

  const launchFacebookLogin = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please wait and try again.');
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) handleAutoConnect(response.authResponse.accessToken);
        else toast.error('Facebook login cancelled or permission denied.');
      },
      { scope: 'pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,public_profile', return_scopes: true }
    );
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this Facebook Page?')) return;
    try {
      await facebookAPI.disconnectAccount(id);
      setAccounts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleUpdateBot = async (id, data) => {
    try {
      const res = await facebookAPI.updateBot(id, data);
      setAccounts((prev) => prev.map((acc) => (acc._id === id ? res.data.data.account : acc)));
      toast.success('Bot settings updated');
    } catch {
      toast.error('Failed to update bot settings');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Facebook Pages</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Connect your Facebook Pages for messaging and posting</p>
        </div>
        <button onClick={() => setShowAddPanel(!showAddPanel)} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: '#FF6A00' }}>
          <Plus size={16} /> Add Page
        </button>
      </div>

      {showAddPanel && (
        <div className={`rounded-2xl border p-6 space-y-5 animate-slide-up ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Connect Facebook Page</h2>
            <button onClick={() => setShowAddPanel(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={16} /></button>
          </div>

          <button onClick={launchFacebookLogin} disabled={autoConnecting} className="w-full flex items-center justify-center gap-3 text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-70" style={{ background: '#FF6A00' }}>
            {autoConnecting ? <><Loader2 size={20} className="animate-spin" /> Connecting...</> : <><Facebook size={20} /> Connect via Facebook</>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-14 text-center ${isDark ? 'bg-white/5 border-white/20' : 'bg-white border-gray-300'}`}>
          <Facebook size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-300'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>No Facebook Pages connected</h3>
          <p className={`text-sm mt-1 mb-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Connect your first Facebook Page to start automating DMs and Posts.</p>
          <button onClick={launchFacebookLogin} disabled={autoConnecting} className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-70" style={{ background: '#FF6A00' }}>
            {autoConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : <><Facebook size={16} /> Connect via Facebook</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <div key={acc._id} className={`rounded-2xl border p-6 transition-shadow ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FF6A0022' }}>
                    <Facebook size={24} style={{ color: '#FF6A00' }} />
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{acc.pageName || 'Facebook Page'}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>ID: {acc.pageId}</p>
                  </div>
                </div>
                <button onClick={() => handleDisconnect(acc._id)} title="Disconnect" className="p-2.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>Messenger AI Bot</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Automatically reply to messages using AI</p>
                  </div>
                  <button onClick={() => handleUpdateBot(acc._id, { messengerBotEnabled: !acc.messengerBotEnabled })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${acc.messengerBotEnabled ? 'bg-[#FF6A00]' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${acc.messengerBotEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {acc.messengerBotEnabled && (
                  <div className="space-y-3 animate-fade-in">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Messenger Bot Prompt</label>
                    <textarea
                      defaultValue={acc.messengerBotPrompt}
                      onBlur={(e) => handleUpdateBot(acc._id, { messengerBotPrompt: e.target.value })}
                      placeholder="Enter instructions for the AI bot..."
                      className={`w-full px-4 py-3 border rounded-2xl text-sm outline-none transition-all h-24 resize-none ${isDark ? 'border-white/10 bg-white/5 text-slate-100 focus:ring-2 focus:ring-orange-300' : 'border-gray-100 bg-gray-50/50 focus:ring-2 focus:ring-orange-200'}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
