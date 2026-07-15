import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, TrendingUp, Clock, Users,
  ArrowRight, AlertCircle, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { conversationAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { motion, AnimatePresence } from 'framer-motion';

const StatCard = ({ icon: Icon, label, value, sub, tint, onClick, isDark }) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl p-5 border transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
    } ${
      isDark
        ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-xl hover:shadow-black/20'
        : 'bg-white border-slate-200 hover:shadow-lg hover:shadow-slate-300/40'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>}
      </div>
      <div className="p-3 rounded-xl" style={{ background: `${tint}22`, color: tint }}>
        <Icon size={22} />
      </div>
    </div>
  </button>
);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Feature Flag controlled states
  const { isEnabled } = useFeatureFlags();
  

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await conversationAPI.getStats();
      setStats(res.data.data);
    } catch {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const plan = user?.subscription?.plan || 'free';
  const usedMessages = stats?.usage?.messagesThisMonth || 0;
  const limitMessages = stats?.usage?.limit || 100;
  const usagePercent = Math.min(Math.round((usedMessages / limitMessages) * 100), 100);

  const chartData = stats?.dailyStats?.map((d) => ({
    date: formatDate(d._id),
    messages: d.count,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>Here is what is happening with your agents.</p>
        </div>
        <button
          onClick={() => navigate('/app/agents')}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: '#FF6A00' }}
        >
          <Zap size={16} /> New Agent
        </button>
      </div>

      {usagePercent >= 80 && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${usagePercent >= 100
          ? (isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200')
          : (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')}`}>
          <AlertCircle size={18} className={usagePercent >= 100 ? 'text-rose-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {usagePercent >= 100 ? 'Message limit reached' : `${usagePercent}% of message limit used`}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              {usagePercent >= 100 ? 'Your agents are paused.' : 'Upgrade to avoid interruptions.'}{' '}
              <button onClick={() => navigate('/app/billing')} className="underline font-semibold" style={{ color: '#FF6A00' }}>Upgrade plan</button>
            </p>
          </div>
        </div>
      )}

      

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Conversations" value={stats?.totalConversations?.toLocaleString() || 0} sub="All time" tint="#3B82F6" onClick={() => navigate('/app/conversations')} isDark={isDark} />
        <StatCard icon={Users} label="Active Now" value={stats?.activeConversations || 0} sub="Open chats" tint="#10B981" onClick={() => navigate('/app/conversations?status=active')} isDark={isDark} />
        <StatCard icon={TrendingUp} label="This Month" value={stats?.monthlyConversations || 0} sub="New conversations" tint="#8B5CF6" isDark={isDark} />
        <StatCard icon={Clock} label="Avg Response" value={stats?.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : '-'} sub="AI response time" tint="#F59E0B" isDark={isDark} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Messages - Last 7 Days</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }} />
                <Area type="monotone" dataKey="messages" stroke="#FF6A00" strokeWidth={2.5} fill="url(#colorMsg)" dot={{ fill: '#FF6A00', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={`h-48 flex flex-col items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              <TrendingUp size={36} className="mb-2 opacity-30" />
              <p className="text-sm">No data yet. Connect a channel and start chatting.</p>
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Plan Usage</h2>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Messages</span>
                <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{usedMessages.toLocaleString()} / {limitMessages.toLocaleString()}</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, background: usagePercent >= 100 ? '#ef4444' : usagePercent >= 80 ? '#f59e0b' : '#FF6A00' }} />
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{usagePercent}% used this month</p>

              <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex justify-between text-sm mb-2">
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1`}><Zap size={14} style={{ color: '#FF6A00' }} /> Credits Balance</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{Math.max(0, user?.subscription?.credits ?? 0).toLocaleString()} / {(user?.subscription?.totalCredits ?? 0).toLocaleString()}</span>
                </div>
                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.round((Math.max(0, user?.subscription?.credits ?? 0) / Math.max(user?.subscription?.totalCredits ?? 1, 1)) * 100), 100)}%`, background: '#FF6A00' }} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[{ label: 'Plan', value: plan.charAt(0).toUpperCase() + plan.slice(1) }, { label: 'Unread', value: stats?.unreadCount || 0 }, { label: 'Weekly Messages', value: stats?.weeklyMessages || 0 }].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.label}</span>
                  <span className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {plan === 'free' && (
              <button
                onClick={() => navigate('/app/billing')}
                className="mt-4 w-full flex items-center justify-center gap-2 border py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ borderColor: '#FF6A00', color: '#FF6A00' }}
              >
                Upgrade Plan <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
