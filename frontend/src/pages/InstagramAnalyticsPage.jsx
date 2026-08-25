import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Users, Radio, MessageSquare, Heart, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';

// Mock Data
const retentionData = [
  { time: '0:00', viewers: 5000 },
  { time: '5:00', viewers: 4800 },
  { time: '10:00', viewers: 4950 },
  { time: '15:00', viewers: 4200 },
  { time: '20:00', viewers: 3900 },
  { time: '25:00', viewers: 4500 },
  { time: '30:00', viewers: 4100 }
];

const contentPerfData = [
  { name: 'Reels', engagement: 85, reach: 95 },
  { name: 'Carousel', engagement: 65, reach: 70 },
  { name: 'Single Post', engagement: 45, reach: 50 },
  { name: 'Stories', engagement: 90, reach: 85 }
];

const StatCard = ({ icon: Icon, title, value, trend, isDark }) => (
  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-50 text-pink-600'}`}>
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

export default function InstagramAnalyticsPage() {
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
            <div className="p-1.5 rounded-md bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white">
              <Radio size={18} />
            </div>
            Instagram Live & Engagement
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Deep dive into your Instagram automation and audience retention metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} icon={Eye} title="Peak Live Viewers" value="5,102" trend={12.5} />
        <StatCard isDark={isDark} icon={Heart} title="Engagement Rate" value="8.4%" trend={4.2} />
        <StatCard isDark={isDark} icon={MessageSquare} title="Story Replies" value="1,244" trend={-2.1} />
        <StatCard isDark={isDark} icon={Radio} title="DM Automations" value="12,845" trend={24.8} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Live Viewer Retention</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Area type="monotone" dataKey="viewers" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorViewers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Content Type Performance</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contentPerfData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} width={80} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="reach" name="Reach Index" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="engagement" name="Engagement Index" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
