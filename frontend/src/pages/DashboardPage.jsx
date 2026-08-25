import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MessageSquare, Zap, Activity, AlertCircle, PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const COLORS = ['#FF6A00', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgencyData();
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAgencyData = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getAgencyOverview();
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load agency overview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { globalQuota, organizations } = data || { globalQuota: {}, organizations: [] };
  const messagesLimit = globalQuota?.messagesLimit || 1000;
  const messagesUsed = globalQuota?.messagesUsed || 0;
  const usagePercent = Math.min(Math.round((messagesUsed / Math.max(messagesLimit, 1)) * 100), 100);

  const totalOrgs = organizations?.length || 0;
  const totalTokens = organizations?.reduce((acc, org) => acc + (org.tokens || 0), 0) || 0;

  // Pie chart data
  const pieData = organizations?.filter(o => o.messages > 0).slice(0, 5).map(o => ({
    name: o.name,
    value: o.messages
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Agency Command Center
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Overview of all client organizations and global consumption.
          </p>
        </div>
      </div>

      {/* Usage Warning */}
      {usagePercent >= 80 && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${usagePercent >= 100
          ? (isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200')
          : (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')}`}>
          <AlertCircle size={18} className={usagePercent >= 100 ? 'text-rose-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
          <div>
            <h3 className={`text-sm font-bold ${usagePercent >= 100 ? 'text-rose-500' : 'text-amber-600'}`}>
              {usagePercent >= 100 ? 'Quota Exceeded' : 'Approaching Global Limit'}
            </h3>
            <p className={`text-xs mt-1 ${usagePercent >= 100 ? 'text-rose-400' : 'text-amber-500'}`}>
              Your agency has used {usagePercent}% of its global message quota. Consider upgrading your plan to avoid service interruption for your clients.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Organizations</p>
              <p className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{totalOrgs}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Messages Consumed</p>
              <p className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{messagesUsed.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <MessageSquare size={22} />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI Tokens Used</p>
              <p className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{totalTokens.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Zap size={22} />
            </div>
          </div>
        </div>

        {/* Quota Widget */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} flex flex-col justify-center`}>
          <div className="flex justify-between text-sm mb-2">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Global Quota</span>
            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{usagePercent}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-500 ${usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 75 ? 'bg-amber-500' : 'bg-[#FF6A00]'}`}
              style={{ width: `${usagePercent}%` }} 
            />
          </div>
          <p className={`text-xs mt-2 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {messagesUsed.toLocaleString()} / {messagesLimit.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard Table */}
        <div className={`lg:col-span-2 rounded-2xl border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="p-6 border-b border-inherit flex items-center gap-2">
            <Activity className={isDark ? 'text-slate-400' : 'text-slate-500'} size={20} />
            <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Client Organization Leaderboard</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <tr>
                  <th className="px-6 py-4 font-semibold rounded-tl-xl">Organization</th>
                  <th className="px-6 py-4 font-semibold text-right">Messages</th>
                  <th className="px-6 py-4 font-semibold text-right">Tokens Used</th>
                  <th className="px-6 py-4 font-semibold text-right">Conversations</th>
                  <th className="px-6 py-4 font-semibold text-right rounded-tr-xl">% of Traffic</th>
                </tr>
              </thead>
              <tbody>
                {organizations?.map((org, idx) => {
                  const trafficPct = messagesUsed > 0 ? ((org.messages / messagesUsed) * 100).toFixed(1) : 0;
                  return (
                    <tr key={org._id} className={`border-b last:border-0 ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {org.name}
                      </td>
                      <td className="px-6 py-4 text-right">{org.messages.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-purple-500 font-medium">{org.tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">{org.conversations.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00]/10 text-[#FF6A00]'}`}>
                          {trafficPct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {organizations?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Traffic Chart */}
        <div className={`rounded-2xl border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="p-6 border-b border-inherit flex items-center gap-2">
            <PieChartIcon className={isDark ? 'text-slate-400' : 'text-slate-500'} size={20} />
            <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Traffic Distribution</h2>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      background: isDark ? '#1e293b' : '#fff', 
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', 
                      color: isDark ? '#f8fafc' : '#0f172a' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Not enough data to display.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
