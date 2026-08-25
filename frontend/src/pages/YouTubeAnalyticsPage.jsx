import React, { useState, useEffect } from 'react';
import { ArrowLeft, PlayCircle, Users, Activity, Eye, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

// Mock Data
const viewsData = [
  { date: 'Mon', views: 12000, watchTime: 850 },
  { date: 'Tue', views: 15000, watchTime: 1100 },
  { date: 'Wed', views: 13500, watchTime: 920 },
  { date: 'Thu', views: 18000, watchTime: 1350 },
  { date: 'Fri', views: 22000, watchTime: 1700 },
  { date: 'Sat', views: 28000, watchTime: 2100 },
  { date: 'Sun', views: 25000, watchTime: 1900 }
];

const trafficSourceData = [
  { source: 'Suggested Videos', value: 45 },
  { source: 'YouTube Search', value: 25 },
  { source: 'Browse Features', value: 15 },
  { source: 'External', value: 10 },
  { source: 'Direct', value: 5 }
];

const StatCard = ({ icon: Icon, title, value, trend, isDark }) => (
  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
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

export default function YouTubeAnalyticsPage() {
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
            <div className="p-1.5 rounded-md bg-rose-600 text-white">
              <PlayCircle size={18} />
            </div>
            YouTube Automation Analytics
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Measure channel growth and auto-comment performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} icon={Eye} title="Total Views (7d)" value="133,500" trend={15.3} />
        <StatCard isDark={isDark} icon={Users} title="Subscribers Gained" value="1,842" trend={8.1} />
        <StatCard isDark={isDark} icon={Clock} title="Watch Time (Hrs)" value="9,920" trend={12.4} />
        <StatCard isDark={isDark} icon={MessageSquare} title="AI Auto-Replies" value="4,105" trend={31.2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>View Velocity & Watch Time</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Area type="monotone" dataKey="views" name="Views" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Traffic Sources (%)</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficSourceData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis type="number" hide />
                <YAxis dataKey="source" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} width={100} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Bar dataKey="value" name="Traffic %" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
