import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, MessageCircle, ThumbsUp, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

// Mock Data
const engagementData = [
  { day: '01', reach: 4000, comments: 240 },
  { day: '02', reach: 3000, comments: 139 },
  { day: '03', reach: 5000, comments: 480 },
  { day: '04', reach: 7000, comments: 690 },
  { day: '05', reach: 6000, comments: 550 },
  { day: '06', reach: 8000, comments: 850 },
  { day: '07', reach: 11000, comments: 1200 }
];

const campaignData = [
  { name: 'Summer Sale', roi: 120, leads: 400 },
  { name: 'Lead Gen', roi: 90, leads: 350 },
  { name: 'Brand Aware', roi: 45, leads: 150 },
  { name: 'Retargeting', roi: 180, leads: 220 }
];

const StatCard = ({ icon: Icon, title, value, trend, isDark }) => (
  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
        <Icon size={20} />
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-md ${trend > 0 ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    </div>
    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
    <h3 className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</h3>
  </div>
);

export default function FacebookAnalyticsPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-full border transition-all ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <div className="p-1.5 rounded-md bg-blue-600 text-white">
              <Share2 size={18} />
            </div>
            Facebook Engagement & Ads
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Track page reach, comment automation, and ad campaign ROI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} icon={Users} title="Total Page Reach" value="44,201" trend={14.1} />
        <StatCard isDark={isDark} icon={MessageCircle} title="Auto-Comments" value="3,149" trend={8.8} />
        <StatCard isDark={isDark} icon={ThumbsUp} title="Reactions" value="12,504" trend={5.2} />
        <StatCard isDark={isDark} icon={Activity} title="Bot Handoffs" value="412" trend={-1.5} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Reach vs Comments Trend</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Line yAxisId="left" type="monotone" dataKey="reach" name="Reach" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="comments" name="Comments" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Campaign ROI Index</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} width={80} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Bar dataKey="roi" name="ROI Score" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
