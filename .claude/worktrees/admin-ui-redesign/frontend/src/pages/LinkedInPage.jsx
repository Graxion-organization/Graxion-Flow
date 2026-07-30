import React, { useEffect, useState } from 'react';
import { Linkedin, Plus, Trash2, Loader2, Link2, Zap, AlertCircle } from 'lucide-react';
import { socialHubAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LinkedInPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchAccounts();
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await socialHubAPI.getAccounts();
      // Filter for linkedin accounts
      const allAccounts = res.data.data || [];
      const linkedinAccs = allAccounts.filter(acc => acc.platform === 'linkedin');
      setAccounts(linkedinAccs);
    } catch (err) {
      toast.error('Failed to load LinkedIn accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await socialHubAPI.getLinkedInAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Could not get LinkedIn authorization URL');
        setConnecting(false);
      }
    } catch (err) {
      toast.error('LinkedIn connection failed to initialize');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this LinkedIn account?')) return;
    try {
      await socialHubAPI.disconnectLinkedIn(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id && a.modelId !== id));
      toast.success('LinkedIn account disconnected');
      fetchAccounts();
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${'text-gray-900 dark:text-slate-100'}`}>LinkedIn Profiles</h2>
          <p className={`text-sm mt-1 ${'text-gray-500 dark:text-slate-400'}`}>Connect and publish content to your LinkedIn personal profile</p>
        </div>
        <button 
          onClick={handleConnect} 
          disabled={connecting}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50" 
          style={{ background: '#0077b5' }}
        >
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Connect Profile
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#0077b5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className={`rounded-3xl border border-dashed p-14 text-center ${
          'bg-white border-gray-200 dark:bg-white/[0.02] dark:border-white/10'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-[#0077b5]/10 flex items-center justify-center mx-auto mb-4 border border-[#0077b5]/20">
            <Linkedin size={32} className="text-[#0077b5]" />
          </div>
          <h3 className={`font-semibold text-base ${'text-gray-700 dark:text-slate-200'}`}>No LinkedIn profiles linked</h3>
          <p className={`text-xs mt-1 mb-6 max-w-sm mx-auto ${'text-gray-400 dark:text-slate-400'}`}>
            Link your personal LinkedIn profile to start posting content and schedule automated system activities.
          </p>
          <button 
            onClick={handleConnect} 
            disabled={connecting}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#0077b5]/15" 
            style={{ background: '#0077b5' }}
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={15} />}
            Connect LinkedIn Profile
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div 
              key={acc.id} 
              className={`rounded-2xl border p-5 transition-all flex items-center justify-between ${
                'bg-white border-gray-100 shadow-sm hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                {acc.profilePicture ? (
                  <img 
                    src={acc.profilePicture} 
                    alt={acc.name} 
                    className="w-12 h-12 rounded-full border border-slate-200 shrink-0 object-cover" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#0077b5]/10 border border-[#0077b5]/20">
                    <Linkedin size={22} className="text-[#0077b5]" />
                  </div>
                )}
                <div>
                  <p className={`font-bold text-sm ${'text-gray-900 dark:text-slate-100'}`}>{acc.name || 'LinkedIn User'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-[#0077b5]/10 text-[#0077b5] border border-[#0077b5]/20">
                      {acc.type || 'Profile'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                      <Link2 size={10} /> Active Connection
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDisconnect(acc.modelId || acc.id)} 
                title="Disconnect Account" 
                className={`p-2.5 rounded-xl border transition-all ${
                  'border-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 dark:border-white/5 dark:hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-500'
                }`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helpful Beta Alert */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
        'bg-purple-50 border-purple-100 text-purple-800 dark:bg-purple-500/5 dark:border-purple-500/20 dark:text-purple-200'
      }`}>
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-purple-500" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Feature Governed by Beta Rules</p>
          <p className="opacity-90">
            LinkedIn integration is currently in Beta. It is protected by Feature Flags, and only Beta Testers and Administrators can view and configure this integration.
          </p>
        </div>
      </div>
    </div>
  );
}
