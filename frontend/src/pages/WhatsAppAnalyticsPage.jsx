import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, CheckCheck, Send, Zap, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Mock Data
const broadcastData = [
  { name: 'Diwali Offer', sent: 5000, delivered: 4850, read: 4100 },
  { name: 'Flash Sale', sent: 8000, delivered: 7800, read: 6500 },
  { name: 'Newsletter', sent: 3000, delivered: 2950, read: 1200 },
  { name: 'VIP Update', sent: 1200, delivered: 1190, read: 1100 }
];

const templatePerfData = [
  { name: 'Promotional', value: 65 },
  { name: 'Transactional', value: 25 },
  { name: 'Utility', value: 10 }
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

const StatCard = ({ icon: Icon, title, value, trend, isDark }) => (
  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
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

export default function WhatsAppAnalyticsPage() {
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
            <div className="p-1.5 rounded-md bg-emerald-500 text-white">
              <MessageSquare size={18} />
            </div>
            WhatsApp Campaigns & ROI
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Track delivery rates, read receipts, and agent resolution metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} icon={Send} title="Delivery Rate" value="98.2%" trend={0.5} />
        <StatCard isDark={isDark} icon={CheckCheck} title="Read Receipt %" value="82.4%" trend={3.1} />
        <StatCard isDark={isDark} icon={Zap} title="Broadcast ROI" value="4.2x" trend={12.8} />
        <StatCard isDark={isDark} icon={Activity} title="Avg Resolution" value="4m 12s" trend={-15.4} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Broadcast Delivery Funnel</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={broadcastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="sent" name="Sent" fill={isDark ? "#334155" : "#e2e8f0"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" name="Delivered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="read" name="Read" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-base font-semibold mb-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Template Category Split</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={templatePerfData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                  {templatePerfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" className={`text-3xl font-bold ${isDark ? 'fill-slate-100' : 'fill-slate-900'}`}>
                  {templatePerfData.reduce((a, b) => a + b.value, 0)}%
                </text>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className={`text-xs ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}>
                  Total Volume
                </text>
                <Tooltip contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
