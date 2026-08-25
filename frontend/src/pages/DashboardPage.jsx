import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, TrendingUp, Clock, Users,
  ArrowRight, AlertCircle, Zap, Activity,
  Bot, User, Share2, Smartphone, MonitorSmartphone,
  DollarSign, PlayCircle, BarChart3, Award, Briefcase
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { conversationAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, tint, onClick, isDark }) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl p-5 border transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
    } ${
      isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-xl hover:shadow-black/20' : 'bg-white border-slate-200 hover:shadow-lg hover:shadow-slate-300/40'
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

const COLORS = ['#FF6A00', '#3B82F6', '#10B981', '#8B5CF6'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, leadsRes] = await Promise.all([
        conversationAPI.getStats({ global: true }),
        conversationAPI.getLeads({ limit: 10, global: true })
      ]);
      setStats(statsRes.data.data);
      setLeadsData(leadsRes.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
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

  const platformData = stats?.platformBreakdown?.length > 0 
    ? stats.platformBreakdown.map(p => ({
        name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        value: p.count
      }))
    : [{ name: 'WhatsApp', value: 1 }]; // Default if no data

  const totalConversations = stats?.totalConversations || 0;
  const humanHandoffs = stats?.handoffCount || 0;
  
  // AI vs Human Load Chart
  const resolutionData = [
    { name: 'AI Resolved', value: Math.max(0, totalConversations - humanHandoffs) },
    { name: 'Human Handoff', value: humanHandoffs }
  ];

  const needsAttention = leadsData?.leads?.filter(l => l.wantsHuman).slice(0, 5) || [];
  
  // New CRM & Marketing Stats
  const pipelineValue = stats?.pipelineValue || 0;
  const activeBroadcasts = stats?.activeBroadcasts || 0;
  const recentDeals = stats?.recentDeals || [];
  const topAgents = stats?.topAgents || [];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Command Center
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm mt-1`}>
            Welcome back, {user?.name?.split(' ')[0]}. Here is your business overview.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/agents')}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#FF6A00]/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-[#FF6A00] to-[#FF4500]"
        >
          <Zap size={16} /> New Agent
        </button>
      </div>

      {/* Usage Warning */}
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
              <button onClick={() => navigate('/app/billing')} className="underline font-semibold text-[#FF6A00]">Upgrade plan</button>
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Row 1 - Business Focus */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} icon={DollarSign} label="Deals Pipeline" value={`₹${pipelineValue.toLocaleString('en-IN')}`} sub={`${stats?.dealsCount || 0} active deals`} tint="#10B981" onClick={() => navigate('/app/deals')} />
        <StatCard isDark={isDark} icon={Users} label="Total Leads" value={(leadsData?.summary?.totalLeads || 0).toLocaleString()} sub="Unique customers" tint="#3B82F6" onClick={() => navigate('/app/leads')} />
        <StatCard isDark={isDark} icon={MessageSquare} label="Total Conversations" value={totalConversations.toLocaleString()} sub="All time" tint="#8B5CF6" onClick={() => navigate('/app/conversations')} />
        <StatCard isDark={isDark} icon={PlayCircle} label="Active Broadcasts" value={activeBroadcasts.toLocaleString()} sub="Currently running" tint="#F59E0B" onClick={() => navigate('/app/broadcast')} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Main Area Chart */}
        <div className={`lg:col-span-2 rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Message Volume - Last 7 Days</h2>
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Activity size={16} />
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff15' : '#e2e8f0'} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }}
                    itemStyle={{ color: '#FF6A00', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="messages" stroke="#FF6A00" strokeWidth={3} fill="url(#colorMsg)" dot={{ fill: '#FF6A00', r: 4, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff' }} activeDot={{ r: 6, fill: '#FF6A00' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <TrendingUp size={36} className="mb-2 opacity-30" />
                <p className="text-sm">No data yet. Connect a channel.</p>
              </div>
            )}
          </div>
        </div>

        {/* Traffic Donut Chart */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Platform Traffic</h2>
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <MonitorSmartphone size={16} />
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Widgets Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Resolution Donut Chart */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>AI vs Human Hand-off</h2>
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Bot size={16} />
            </div>
          </div>
          <div className="flex-1 min-h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resolutionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10B981" /> {/* AI Resolved (Green) */}
                  <Cell fill="#F43F5E" /> {/* Human Handoff (Rose) */}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f8fafc' : '#0f172a' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Needs Attention Widget */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Needs Attention
              {needsAttention.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {needsAttention.length}
                </span>
              )}
            </h2>
            <button onClick={() => navigate('/app/conversations?status=human_handoff')} className={`text-xs font-semibold hover:underline ${isDark ? 'text-[#FF6A00]' : 'text-[#FF6A00]'}`}>View all</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-3">
            {needsAttention.length > 0 ? (
              needsAttention.map((conv) => (
                <div key={conv._id} onClick={() => navigate(`/app/conversations?conv=${conv._id}`)} className={`p-3 rounded-xl border cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{conv.customerName || conv.customerPhone}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{conv.lastUserMessage || 'Requires human assistance'}</p>
                </div>
              ))
            ) : (
              <div className={`h-full flex flex-col items-center justify-center text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <div className={`p-3 rounded-full mb-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <User size={24} className="opacity-50" />
                </div>
                <p className="text-sm">All caught up!</p>
                <p className="text-xs mt-1 opacity-70">No pending human hand-offs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Plan & Usage Widget */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Subscription & Usage</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${isDark ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "bg-[#FF6A00]/10 text-[#FF6A00]"}`}>
              {plan}
            </span>
          </div>
          
          <div className="space-y-5 flex-1">
            {/* Messages Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Messages</span>
                <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{usedMessages.toLocaleString()} / {limitMessages.toLocaleString()}</span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, background: usagePercent >= 100 ? '#ef4444' : usagePercent >= 80 ? '#f59e0b' : '#FF6A00' }} />
              </div>
            </div>

            {/* AI Credits Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5`}><Zap size={14} className="text-[#FF6A00]" /> Credits</span>
                <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{Math.max(0, user?.subscription?.credits ?? 0).toLocaleString()} / {(user?.subscription?.totalCredits ?? 0).toLocaleString()}</span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.round((Math.max(0, user?.subscription?.credits ?? 0) / Math.max(user?.subscription?.totalCredits ?? 1, 1)) * 100), 100)}%`, background: '#FF6A00' }} />
              </div>
            </div>

            <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Avg AI Response Time</span>
                <span className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{stats?.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Weekly Volume</span>
                <span className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{stats?.weeklyMessages || 0}</span>
              </div>
            </div>
          </div>

          {plan === 'free' && (
            <button
              onClick={() => navigate('/app/billing')}
              className="mt-4 w-full flex items-center justify-center gap-2 border py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[#FF6A00]/10"
              style={{ borderColor: '#FF6A00', color: '#FF6A00' }}
            >
              Upgrade Plan <ArrowRight size={14} />
            </button>
          )}
        </div>

      </div>

      {/* Extra CRM Widgets Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Top Agents Widget */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Top Performing Agents</h2>
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Award size={16} />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {topAgents.length > 0 ? (
              topAgents.map((agent, index) => (
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
                      <div className="h-full rounded-full bg-[#FF6A00]" style={{ width: `${Math.min((agent.count / (topAgents[0]?.count || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No agent data available.</p>
            )}
          </div>
        </div>

        {/* Recent Deals Widget */}
        <div className={`rounded-2xl p-6 border flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Recent Deals
            </h2>
            <button onClick={() => navigate('/app/deals')} className={`text-xs font-semibold hover:underline ${isDark ? 'text-[#FF6A00]' : 'text-[#FF6A00]'}`}>View all</button>
          </div>
          <div className="flex-1 space-y-3">
            {recentDeals.length > 0 ? (
              recentDeals.map((deal) => (
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
        </div>

      </div>
    </div>
  );
}
