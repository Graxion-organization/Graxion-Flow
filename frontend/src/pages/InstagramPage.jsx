import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Plus, Trash2, Loader2, X, Zap, MessageCircle } from 'lucide-react';
import { instagramAPI } from '../services/api';
import toast from 'react-hot-toast';

const connectSchema = z.object({
  igAccountId: z.string().min(5, 'Required'),
  pageId: z.string().min(5, 'Required'),
  pageAccessToken: z.string().min(20, 'Required'),
  igUsername: z.string().optional(),
});

function ConnectForm({ onSuccess, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(connectSchema) });

  const onSubmit = async (data) => {
    try {
      const res = await instagramAPI.connect(data);
      toast.success(res.data.message || 'Instagram connected!');
      onSuccess(res.data.data.account);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram Account ID</label>
          <input {...register('igAccountId')} placeholder="e.g. 178414..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" />
          {errors.igAccountId && <p className="text-red-500 text-xs mt-1">{errors.igAccountId.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook Page ID</label>
          <input {...register('pageId')} placeholder="e.g. 10103..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" />
          {errors.pageId && <p className="text-red-500 text-xs mt-1">{errors.pageId.message}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Page Access Token</label>
        <input {...register('pageAccessToken')} placeholder="EAA..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" />
        {errors.pageAccessToken && <p className="text-red-500 text-xs mt-1">{errors.pageAccessToken.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram Username (Optional)</label>
        <input {...register('igUsername')} placeholder="@your_business" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors" style={{ background: '#FF6A00' }}>
          {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : 'Connect Account'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function CommentBotSettings({ account, onUpdate }) {
  const [enabled, setEnabled] = useState(account.commentBotEnabled || false);
  const [prompt, setPrompt] = useState(account.commentBotPrompt || "You are a helpful assistant. Reply to this Instagram comment in a friendly way. Keep it short.");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await instagramAPI.updateBotSettings(account._id, { commentBotEnabled: enabled, commentBotPrompt: prompt });
      toast.success('Bot settings updated');
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">AI Comment Reply Bot</span>
        <button type="button" onClick={() => setEnabled(!enabled)} className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? 'bg-[#FF6A00]' : 'bg-gray-200'}`}>
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-2 animate-fade-in">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Bot Prompt</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" placeholder="How should the bot reply?" />
          <button type="button" onClick={handleSave} disabled={loading} className="w-full text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider disabled:opacity-50" style={{ background: '#FF6A00' }}>
            {loading ? 'Saving...' : 'Save Bot Config'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InstagramPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showManual, setShowManual] = useState(false);
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
      const res = await instagramAPI.getAll();
      setAccounts(res.data.data.accounts);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccount = (account) => {
    setAccounts((prev) => {
      const exists = prev.find((a) => a._id === account._id);
      return exists ? prev.map((a) => (a._id === account._id ? account : a)) : [...prev, account];
    });
    setShowAddPanel(false);
    setShowManual(false);
  };

  const handleAutoConnect = async (accessToken) => {
    setAutoConnecting(true);
    try {
      const res = await instagramAPI.autoConnect({ accessToken });
      toast.success(res.data.message || 'Instagram accounts connected!');
      setAccounts((prev) => {
        const newAccounts = [...prev];
        res.data.data.accounts.forEach((acc) => {
          const index = newAccounts.findIndex((a) => a._id === acc._id);
          if (index !== -1) newAccounts[index] = acc;
          else newAccounts.push(acc);
        });
        return newAccounts;
      });
      setShowAddPanel(false);
      setShowManual(false);
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
        else toast.error('Facebook login cancelled.');
      },
      { scope: 'instagram_basic,pages_show_list,instagram_manage_messages,instagram_manage_comments,pages_manage_metadata,pages_read_engagement,instagram_content_publish,pages_manage_posts', return_scopes: true }
    );
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this Instagram account?')) return;
    try {
      await instagramAPI.disconnect(id);
      setAccounts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${'text-gray-900 dark:text-slate-100'}`}>Instagram</h2>
          <p className={`text-sm mt-1 ${'text-gray-500 dark:text-slate-400'}`}>Connect your Instagram Professional accounts</p>
        </div>
        <button onClick={() => setShowAddPanel(!showAddPanel)} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#FF6A00' }}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showAddPanel && (
        <div className={`rounded-2xl border p-6 space-y-5 animate-slide-up ${'bg-white border-gray-100 shadow-sm dark:bg-white/5 dark:border-white/10'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold ${'text-gray-800 dark:text-slate-100'}`}>Connect Instagram Account</h2>
            <button onClick={() => { setShowAddPanel(false); setShowManual(false); }} className={`p-1.5 rounded-lg ${'hover:bg-gray-100 dark:hover:bg-white/10'}`}><X size={16} /></button>
          </div>

          <button onClick={launchFacebookLogin} disabled={autoConnecting} className="w-full flex items-center justify-center gap-3 text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-70" style={{ background: '#FF6A00' }}>
            {autoConnecting ? <><Loader2 size={20} className="animate-spin" /> Connecting...</> : <><Camera size={20} /> Connect via Facebook</>}
          </button>

          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or manually</span><div className="flex-1 h-px bg-gray-200" /></div>

          <button onClick={() => setShowManual(!showManual)} className={`flex items-center justify-between w-full text-sm ${'text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-100'}`}>
            <span className="font-medium">Manual setup (advanced)</span>
            {showManual ? <X size={16} /> : <Plus size={16} />}
          </button>

          {showManual && <ConnectForm onSuccess={handleNewAccount} onCancel={() => setShowManual(false)} />}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-14 text-center ${'bg-white border-gray-300 dark:bg-white/5 dark:border-white/20'}`}>
          <Camera size={48} className={`mx-auto mb-4 ${'text-gray-300 dark:text-slate-500'}`} />
          <h3 className={`font-semibold ${'text-gray-700 dark:text-slate-200'}`}>No accounts connected</h3>
          <p className={`text-sm mt-1 mb-4 ${'text-gray-400 dark:text-slate-400'}`}>Connect your first Instagram account to start automating DMs and Comments.</p>
          <button onClick={launchFacebookLogin} disabled={autoConnecting} className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-70" style={{ background: '#FF6A00' }}>
            {autoConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : <><Camera size={16} /> Connect via Facebook</>}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc._id} className={`rounded-2xl border p-5 transition-shadow ${'bg-white border-gray-100 shadow-sm hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FF6A0022' }}>
                    <Camera size={22} style={{ color: '#FF6A00' }} />
                  </div>
                  <div>
                    <p className={`font-semibold ${'text-gray-900 dark:text-slate-100'}`}>{acc.igUsername || 'Instagram Account'}</p>
                    <p className={`text-sm ${'text-gray-500 dark:text-slate-300'}`}>ID: {acc.igAccountId}</p>
                  </div>
                </div>
                <button onClick={() => handleDisconnect(acc._id)} title="Disconnect" className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>

              <CommentBotSettings account={acc} onUpdate={fetchAccounts} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
