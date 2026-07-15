import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageCircle, Plus, Trash2, Loader2, X, Zap } from 'lucide-react';
import { telegramAPI } from '../services/api';
import toast from 'react-hot-toast';

const connectSchema = z.object({
  botToken: z.string().min(10, 'Required'),
});

function ConnectForm({ onSuccess, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(connectSchema) });

  const onSubmit = async (data) => {
    try {
      const res = await telegramAPI.connect(data);
      toast.success(res.data.message || 'Bot connected!');
      onSuccess(res.data.data.account);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Telegram Bot Token</label>
        <input
          {...register('botToken')}
          placeholder="1234567890:AAH_XXXXXXXXXXXXXXX"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]"
        />
        {errors.botToken && <p className="text-red-500 text-xs mt-1">{errors.botToken.message}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors" style={{ background: '#FF6A00' }}>
          {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : 'Connect Bot'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function TelegramPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchAccounts();
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await telegramAPI.getAll();
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
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this bot?')) return;
    try {
      await telegramAPI.disconnect(id);
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
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Telegram Bots</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Connect your Telegram bots to AI agents</p>
        </div>
        <button onClick={() => setShowAddPanel(!showAddPanel)} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: '#FF6A00' }}>
          <Plus size={16} /> Add Bot
        </button>
      </div>

      {showAddPanel && (
        <div className={`rounded-2xl border p-6 space-y-5 animate-slide-up ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Connect Telegram Bot</h2>
            <button onClick={() => setShowAddPanel(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={16} /></button>
          </div>

          <div className={`rounded-xl p-4 text-sm border ${isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-200' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
            <h4 className="font-semibold mb-2">How to get a Token:</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code className="bg-blue-100 px-1 rounded">/newbot</code> and follow the instructions</li>
              <li>Copy the HTTP API Token provided and paste it below</li>
            </ol>
          </div>

          <ConnectForm onSuccess={handleNewAccount} onCancel={() => setShowAddPanel(false)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-14 text-center ${isDark ? 'bg-white/5 border-white/20' : 'bg-white border-gray-300'}`}>
          <MessageCircle size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-300'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>No bots connected</h3>
          <p className={`text-sm mt-1 mb-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Connect your first Telegram bot.</p>
          <button onClick={() => setShowAddPanel(true)} className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#FF6A00' }}>
            <Zap size={15} /> Connect Bot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc._id} className={`rounded-2xl border p-5 transition-shadow flex items-start justify-between ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FF6A0022' }}>
                  <MessageCircle size={22} style={{ color: '#FF6A00' }} />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{acc.botName || 'Telegram Bot'}</p>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>@{acc.botUsername}</p>
                </div>
              </div>
              <button onClick={() => handleDisconnect(acc._id)} title="Disconnect" className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
