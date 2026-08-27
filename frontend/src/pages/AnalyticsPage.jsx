import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, MessageSquare, Bot, Users, Zap,
  DollarSign, Send, Eye, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Activity, Filter, RefreshCw, Award,
  Briefcase, Radio, PlayCircle, Share2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, RadialBarChart, RadialBar
} from 'recharts';
import { analyticsAPI, conversationAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

// ─── Mini Stat Card ────────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, sub, tint, isDark }) => (
  <div className={`rounded-2xl p-5 border transition-all duration-200 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-2xl font-extrabold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>}
      </div>
      <div className="p-2.5 rounded-xl" style={{ background: `${tint}18`, color: tint }}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

// ─── Chart Card Wrapper ────────────────────────────────────────────────────────
const ChartCard = ({ title, icon: Icon, children, isDark, className = '' }) => (
  <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{title}</h2>
      {Icon && <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}`}><Icon size={16} /></div>}
    </div>
    {children}
  </div>
);

const PLATFORM_COLORS = { WhatsApp: '#25D366', Instagram: '#E1306C', Telegram: '#0088cc', Facebook: '#1877F2' };
const PIE_COLORS = ['#FF6A00', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#F59E0B'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const [volumeData, setVolumeData] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [broadcastStats, setBroadcastStats] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [templatePerf, setTemplatePerf] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [volRes, aiRes, creditRes, broadcastRes, agentRes, templateRes, statsRes] = await Promise.all([
        analyticsAPI.getVolume({ timeframe }),
        analyticsAPI.getAi(),
        analyticsAPI.getCredits(),
        analyticsAPI.getBroadcasts(),
        analyticsAPI.getAgents(),
        analyticsAPI.getTemplates(),
        conversationAPI.getStats()
      ]);

      const vol = (volRes.data?.data?.volume || []).map(d => ({
        date: d.date,
        sent: d.sent,
        received: d.received,
        total: d.sent + d.received
      }));
      setVolumeData(vol);
      setTotalPosts(volRes.data?.data?.totalPosts || 0);
      setTotalComments(volRes.data?.data?.totalComments || 0);
      setAiMetrics(aiRes.data?.data?.metrics);
      setCreditData(creditRes.data?.data);
      setBroadcastStats(broadcastRes.data?.data?.stats);
      setAgentPerformance(agentRes.data?.data?.performance || []);
      setTemplatePerf(templateRes.data?.data?.templates || []);
      setDashStats(statsRes.data?.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived stats
  const totalSent = volumeData.reduce((a, c) => a + c.sent, 0);
  const totalReceived = volumeData.reduce((a, c) => a + c.received, 0);
  const totalMessages = totalSent + totalReceived;
  const platformData = dashStats?.platformBreakdown?.map(p => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    value: p.count
  })) || [];

  // Conversation status distribution for radial chart
  const statusData = aiMetrics ? [
    { name: 'Resolved', value: aiMetrics.closedConversations || 0, fill: '#10B981' },
    { name: 'Active', value: aiMetrics.activeConversations || 0, fill: '#3B82F6' },
    { name: 'Handoff', value: aiMetrics.handoffConversations || 0, fill: '#F43F5E' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Business Analytics
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Deep insights into your entire business operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeframe Filter */}
          <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {['7d', '30d', '90d'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${timeframe === tf
                  ? 'bg-[#FF6A00] text-white'
                  : isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-50'}`}>
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className={`p-2 rounded-xl border transition-all ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniStat isDark={isDark} icon={MessageSquare} label="Total Messages" value={totalMessages.toLocaleString()} sub={`${totalSent} sent / ${totalReceived} received`} tint="#3B82F6" />
        <MiniStat isDark={isDark} icon={Award} label="Active Agents" value={agentPerformance.length.toLocaleString()} sub="Handling conversations" tint="#F59E0B" />
        <MiniStat isDark={isDark} icon={Radio} label="Broadcasts Sent" value={(broadcastStats?.totalSent || 0).toLocaleString()} sub="Marketing messages" tint="#10B981" />
        <MiniStat isDark={isDark} icon={Users} label="Conversations" value={(aiMetrics?.totalConversations || 0).toLocaleString()} sub={`${aiMetrics?.closedConversations || 0} resolved`} tint="#8B5CF6" />
        <MiniStat isDark={isDark} icon={Zap} label="Tokens Used" value={(aiMetrics?.tokensUsed || 0).toLocaleString()} sub={aiMetrics?.costSaved ? `${aiMetrics.costSaved} saved` : '-'} tint="#EC4899" />
      </div>

      {/* Platform Deep-Dives Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/app/instagram')} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isDark ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/20 hover:bg-pink-500/20' : 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-100 hover:bg-pink-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white"><Radio size={16} /></div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Instagram Live Analysis</span>
          </div>
          <ArrowUpRight size={16} className="text-pink-500" />
        </button>
        <button onClick={() => navigate('/app/youtube')} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isDark ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-100 hover:bg-rose-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500 text-white"><PlayCircle size={16} /></div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>YouTube Automation</span>
          </div>
          <ArrowUpRight size={16} className="text-rose-500" />
        </button>
        <button onClick={() => navigate('/app/facebook')} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isDark ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white"><Share2 size={16} /></div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Facebook Engagement</span>
          </div>
          <ArrowUpRight size={16} className="text-blue-500" />
        </button>
        <button onClick={() => navigate('/app/whatsapp')} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-white"><MessageSquare size={16} /></div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>WhatsApp Campaigns</span>
          </div>
          <ArrowUpRight size={16} className="text-emerald-500" />
        </button>
      </div>

      {/* Charts Row 1: Message Volume + Platform Split */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard title="Message Volume Trend" icon={TrendingUp} isDark={isDark} className="lg:col-span-2">
          <div className="min-h-[280px]">
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff10' : '#e2e8f0'} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }} />
                  <Area type="monotone" dataKey="sent" name="AI Replies" stroke="#FF6A00" strokeWidth={2.5} fill="url(#gradSent)" dot={false} />
                  <Area type="monotone" dataKey="received" name="Customer Messages" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gradReceived)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[280px] flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <TrendingUp size={36} className="mb-2 opacity-30" />
                <p className="text-sm">No message data for this period.</p>
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Platform Distribution" icon={BarChart3} isDark={isDark}>
          <div className="min-h-[280px]">
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {platformData.map((entry, i) => (
                      <Cell key={i} fill={PLATFORM_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <text x="50%" y="45%" dy="-8" textAnchor="middle" dominantBaseline="middle" className={`text-3xl font-bold ${isDark ? 'fill-slate-100' : 'fill-slate-900'}`}>
                    {platformData.length}
                  </text>
                  <text x="50%" y="45%" dy="16" textAnchor="middle" dominantBaseline="middle" className={`text-xs ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}>
                    Channels
                  </text>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[280px] flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <p className="text-sm">Connect channels to see data.</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2: Conversation Status + Agent Performance */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversation Status */}
        <ChartCard title="Conversation Status" icon={Activity} isDark={isDark}>
          <div className="min-h-[240px]">
            {statusData.length > 0 && aiMetrics?.totalConversations > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <text x="50%" y="50%" dy="-8" textAnchor="middle" dominantBaseline="middle" className={`text-2xl font-bold ${isDark ? 'fill-slate-100' : 'fill-slate-900'}`}>
                      {aiMetrics?.totalConversations || 0}
                    </text>
                    <text x="50%" y="50%" dy="14" textAnchor="middle" dominantBaseline="middle" className={`text-[10px] ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}>
                      Total
                    </text>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {statusData.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                      <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`h-[240px] flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <p className="text-sm">No conversations yet.</p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Agent Performance Bar Chart */}
        <ChartCard title="Agent Performance" icon={Bot} isDark={isDark} className="lg:col-span-2">
          <div className="min-h-[240px]">
            {agentPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={agentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff10' : '#e2e8f0'} />
                  <XAxis dataKey="agent" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="escalated" name="Escalated" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[240px] flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <p className="text-sm">No agent data available.</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Broadcast Stats + Credit Usage + AI Resolution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Broadcast Performance */}
        <ChartCard title="Broadcast Performance" icon={Radio} isDark={isDark}>
          <div className="space-y-4">
            {[
              { label: 'Total Campaigns', value: broadcastStats?.totalBroadcasts || 0, tint: '#3B82F6' },
              { label: 'Messages Sent', value: (broadcastStats?.totalSent || 0).toLocaleString(), tint: '#FF6A00' },
              { label: 'Delivered', value: (broadcastStats?.totalDelivered || 0).toLocaleString(), tint: '#10B981' },
              { label: 'Read', value: (broadcastStats?.totalRead || 0).toLocaleString(), tint: '#8B5CF6' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.tint }} />
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.value}</span>
              </div>
            ))}
            <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{broadcastStats?.deliveryRate || '0%'}</p>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delivery Rate</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{broadcastStats?.readRate || '0%'}</p>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Read Rate</p>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Credit Usage */}
        <ChartCard title="Credit Consumption" icon={Zap} isDark={isDark}>
          <div className="min-h-[220px]">
            {creditData?.usage?.length > 0 && creditData.usage[0].value > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={creditData.usage} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {creditData.usage.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <text x="50%" y="50%" dy="-8" textAnchor="middle" dominantBaseline="middle" className={`text-2xl font-bold ${isDark ? 'fill-slate-100' : 'fill-slate-900'}`}>
                    {((creditData?.totalCredits || 0) - (creditData?.creditsRemaining || 0)).toLocaleString()}
                  </text>
                  <text x="50%" y="50%" dy="14" textAnchor="middle" dominantBaseline="middle" className={`text-[10px] ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}>
                    Used
                  </text>
                  <Tooltip contentStyle={{ borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isDark ? '#f8fafc' : '#0f172a' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[200px] flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <p className="text-sm">No credit usage data.</p>
              </div>
            )}
            <div className={`mt-2 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Credits Remaining</span>
                <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{(creditData?.creditsRemaining || 0).toLocaleString()} / {(creditData?.totalCredits || 0).toLocaleString()}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div className="h-full rounded-full bg-[#FF6A00] transition-all duration-500" style={{ width: `${Math.min((creditData?.creditsRemaining || 0) / Math.max(creditData?.totalCredits || 1, 1) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </ChartCard>

        {/* AI Resolution Summary */}
        <ChartCard title="AI Efficiency" icon={Bot} isDark={isDark}>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-3xl font-extrabold ${isDark ? 'text-[#10B981]' : 'text-emerald-600'}`}>{aiMetrics?.resolutionRate || '0%'}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI Resolution Rate</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{aiMetrics?.handoffRate || '0%'}</p>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hand-off Rate</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{aiMetrics?.averageResponseTime || '-'}</p>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Response</p>
              </div>
            </div>
            <div className={`p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
              <span className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Cost Saved by AI</span>
              <span className={`text-lg font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{aiMetrics?.costSaved || '$0'}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Deals & Agents */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Deals Widget */}
        <ChartCard title="Recent Deals" icon={Briefcase} isDark={isDark}>
          <div className="flex-1 space-y-3">
            {dashStats?.recentDeals && dashStats.recentDeals.length > 0 ? (
              dashStats.recentDeals.map((deal) => (
                <div key={deal._id} onClick={() => navigate(`/app/deals`)} className={`p-3 rounded-xl border cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5 text-[#10B981]' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold truncate max-w-[120px] sm:max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{deal.title}</p>
                      <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{deal.stage}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isDark ? 'text-[#10B981]' : 'text-emerald-600'}`}>
                    ₹{(deal.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            ) : (
              <div className={`h-full flex flex-col items-center justify-center text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <div className={`p-3 rounded-full mb-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Briefcase size={24} className="opacity-50" />
                </div>
                <p className="text-sm">No recent deals</p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Top Agents Widget */}
        <ChartCard title="Top Performing Agents" icon={Award} isDark={isDark}>
          <div className="flex-1 space-y-4">
            {dashStats?.topAgents && dashStats.topAgents.length > 0 ? (
              dashStats.topAgents.map((agent, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{agent.name}</p>
                      <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.count} conversations</p>
                    </div>
                  </div>
                  <div className="w-1/3">
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                      <div className="h-full rounded-full bg-[#FF6A00]" style={{ width: `${Math.min((agent.count / (dashStats.topAgents[0]?.count || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No agent data available.</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 5: Template Performance Table */}
      {templatePerf.length > 0 && (
        <ChartCard title="Template & Broadcast Performance" icon={Send} isDark={isDark}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  <th className="text-left py-3 px-2 font-medium">Template</th>
                  <th className="text-right py-3 px-2 font-medium">Sent</th>
                  <th className="text-right py-3 px-2 font-medium">Delivered</th>
                  <th className="text-right py-3 px-2 font-medium">Read</th>
                  <th className="text-right py-3 px-2 font-medium">Failed</th>
                  <th className="text-right py-3 px-2 font-medium">Read %</th>
                  <th className="text-right py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {templatePerf.map((t, i) => {
                  const readPct = t.sent > 0 ? ((t.read / t.sent) * 100).toFixed(1) : '0';
                  return (
                    <tr key={i} className={`border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <td className={`py-3 px-2 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.name}</td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.sent.toLocaleString()}</td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.delivered.toLocaleString()}</td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.read.toLocaleString()}</td>
                      <td className={`py-3 px-2 text-right text-rose-400`}>{(t.failed || 0).toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${Number(readPct) >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{readPct}%</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${t.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' : t.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'}`}>{t.status || '-'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Row 5: Agent Leaderboard */}
      {agentPerformance.length > 0 && (
        <ChartCard title="Agent Leaderboard" icon={Award} isDark={isDark}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentPerformance.map((agent, i) => (
              <div key={i} className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    #{i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{agent.agent}</p>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.totalConversations} conversations</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-bold text-emerald-500`}>{agent.resolved}</p>
                    <p className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Resolved</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold text-rose-400`}>{agent.escalated}</p>
                    <p className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Escalated</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-[#FF6A00]' : 'text-orange-500'}`}>{agent.resolutionRate}%</p>
                    <p className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
