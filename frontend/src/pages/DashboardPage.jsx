import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MessageSquare, Zap, Activity, AlertCircle, PieChart as PieChartIcon,
  Smartphone, Bot, RefreshCw, Search, ArrowUpRight, Sparkles, CheckCircle2,
  Workflow, Share2, Layers, ChevronRight, TrendingUp, ShieldCheck
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSkeleton } from '../components/common/ShimmerSkeleton';

const COLORS = ['#FF6A00', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgencyData();
  }, [timeframe]);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAgencyData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await analyticsAPI.getAgencyOverview({ timeframe });
      if (res?.data?.data) {
        setData(res.data.data);
      } else if (res?.data) {
        setData(res.data);
      }
      if (isManualRefresh) {
        toast.success('Dashboard metrics refreshed');
      }
    } catch (err) {
      console.warn('Agency overview fetch warning:', err);
      // Fallback data in case server is warming up
      if (!data) {
        setData({
          globalQuota: {
            messagesLimit: 10000,
            messagesUsed: 0,
            creditsTotal: 50000,
            creditsUsed: 0,
          },
          organizations: [
            {
              _id: 'default_org',
              name: user?.name ? `${user.name}'s Workspace` : 'Main Workspace',
              messages: 0,
              tokens: 0,
              conversations: 0,
            }
          ]
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const { globalQuota, organizations } = data || { globalQuota: {}, organizations: [] };
  const messagesLimit = globalQuota?.messagesLimit || 10000;
  const messagesUsed = globalQuota?.messagesUsed || 0;
  const displayPercent = Math.round((messagesUsed / Math.max(messagesLimit, 1)) * 100);
  const usagePercent = Math.min(displayPercent, 100);

  const totalOrgs = organizations?.length || 0;
  const totalTokens = organizations?.reduce((acc, org) => acc + (org.tokens || 0), 0) || 0;
  const totalConversations = organizations?.reduce((acc, org) => acc + (org.conversations || 0), 0) || 0;

  // Filtered organizations for search
  const filteredOrganizations = useMemo(() => {
    if (!organizations || !Array.isArray(organizations)) return [];
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter(o => 
      o.name?.toLowerCase().includes(q) || 
      o.slug?.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  // Pie chart data
  const pieData = useMemo(() => {
    const activeOrgs = organizations?.filter(o => (o.messages || 0) > 0) || [];
    if (activeOrgs.length === 0) return [];
    return activeOrgs.slice(0, 5).map(o => ({
      name: o.name,
      value: o.messages
    }));
  }, [organizations]);

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading && !data) {
    return <DashboardSkeleton isDark={isDark} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 max-w-7xl mx-auto px-1 sm:px-2">
      {/* 🚀 Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              • Graxion Flow
            </span>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs sm:text-sm mt-1 max-w-2xl`}>
            Real-time omnichannel engagement, AI token consumption, and client usage metrics across all channels.
          </p>
        </div>

        {/* Action Bar (Timeframe & Refresh) */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Timeframe Selector */}
          <div className={`inline-flex p-1 rounded-xl border ${isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-slate-100/80'} shadow-xs`}>
            {[
              { id: 'current', label: 'Current Cycle' },
              { id: 'all', label: 'All Time' },
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  timeframe === tf.id
                    ? isDark
                      ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAgencyData(true)}
            disabled={refreshing}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              isDark
                ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs'
            }`}
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-[#FF6A00]' : ''} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={timeframe}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="space-y-6 sm:space-y-8"
        >
          {/* ⚠️ Usage Warning Banner */}
      {usagePercent >= 80 && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
            displayPercent >= 100
              ? isDark
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-800'
              : isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 ${displayPercent >= 100 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-500'}`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {displayPercent >= 100 ? 'Quota Limit Exceeded' : 'Approaching Global Message Limit'}
              </h2>
              <p className="text-xs mt-0.5 opacity-90 max-w-xl">
                Your agency has consumed {displayPercent}% of its allocated message volume for this billing cycle.
                Upgrade your subscription to ensure zero message disruptions for connected clients.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/app/billing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all self-start sm:self-auto ${
              displayPercent >= 100
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30'
            }`}
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* 📊 Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Organizations */}
        <div
          onClick={() => navigate('/app/settings')}
          className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
            isDark
              ? 'bg-slate-900/60 border-white/10 hover:border-blue-500/40 hover:bg-slate-900/90'
              : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Client Workspaces
              </p>
              <p className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {totalOrgs}
              </p>
            </div>
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${isDark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
              <Building2 size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-inherit">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Multi-tenant isolation</span>
            <span className="text-blue-500 flex items-center font-medium group-hover:translate-x-0.5 transition-transform">
              Manage <ArrowUpRight size={14} className="ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Messages Consumed */}
        <div
          onClick={() => navigate('/app/conversations')}
          className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
            isDark
              ? 'bg-slate-900/60 border-white/10 hover:border-emerald-500/40 hover:bg-slate-900/90'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Messages Processed
              </p>
              <p className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {messagesUsed.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              <MessageSquare size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-inherit">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{totalConversations.toLocaleString()} active threads</span>
            <span className="text-emerald-500 flex items-center font-medium group-hover:translate-x-0.5 transition-transform">
              Inbox <ArrowUpRight size={14} className="ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 3: AI Tokens Used */}
        <div
          onClick={() => navigate('/app/agents')}
          className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
            isDark
              ? 'bg-slate-900/60 border-white/10 hover:border-violet-500/40 hover:bg-slate-900/90'
              : 'bg-white border-slate-200/90 hover:border-violet-300 hover:shadow-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                AI Tokens Consumed
              </p>
              <p className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {totalTokens.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${isDark ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
              <Zap size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-inherit">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Agent inference & skills</span>
            <span className="text-violet-500 flex items-center font-medium group-hover:translate-x-0.5 transition-transform">
              Studio <ArrowUpRight size={14} className="ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Global Plan Quota Widget */}
        <div
          onClick={() => navigate('/app/billing')}
          className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
            isDark
              ? 'bg-slate-900/60 border-white/10 hover:border-[#FF6A00]/40 hover:bg-slate-900/90'
              : 'bg-white border-slate-200/90 hover:border-[#FF6A00]/40 hover:shadow-lg'
          }`}
        >
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Plan Consumption
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    displayPercent >= 100 ? 'text-rose-500' : displayPercent >= 80 ? 'text-amber-500' : isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {displayPercent}%
                  </span>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    used
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${isDark ? 'bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/20' : 'bg-orange-50 text-[#FF6A00] border border-orange-100'}`}>
                <Activity size={22} />
              </div>
            </div>

            {/* Custom Progress Bar */}
            <div className={`h-2.5 rounded-full overflow-hidden mt-4 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  displayPercent >= 100
                    ? 'bg-rose-500'
                    : displayPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[#FF6A00] to-[#FF4500]'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-inherit">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {messagesUsed.toLocaleString()} / {messagesLimit.toLocaleString()}
            </span>
            <span className="text-[#FF6A00] flex items-center font-medium group-hover:translate-x-0.5 transition-transform">
              Plan <ArrowUpRight size={14} className="ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ⚡ Fast Operations Hub (Shortcuts) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF6A00]" />
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Fast-Action Operations Hub
            </h2>
          </div>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Direct Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* WhatsApp Marketing */}
          <button
            onClick={() => navigate('/app/broadcast')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between ${
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                : 'bg-slate-50 border-slate-200/70 hover:bg-emerald-50 hover:border-emerald-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                WhatsApp Broadcast
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Templates & bulk alerts
              </p>
            </div>
          </button>

          {/* AI Agents Studio */}
          <button
            onClick={() => navigate('/app/agents')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between ${
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-violet-500/10 hover:border-violet-500/30'
                : 'bg-slate-50 border-slate-200/70 hover:bg-violet-50 hover:border-violet-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Bot size={18} />
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                AI Agent Studio
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Prompts & behavior
              </p>
            </div>
          </button>

          {/* Flow Builder */}
          <button
            onClick={() => navigate('/app/flow-builder')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between ${
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-[#FF6A00]/10 hover:border-[#FF6A00]/30'
                : 'bg-slate-50 border-slate-200/70 hover:bg-orange-50 hover:border-orange-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF6A00]/15 text-[#FF6A00] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Workflow size={18} />
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Automation Flows
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Visual drag & drop
              </p>
            </div>
          </button>

          {/* Social Hub */}
          <button
            onClick={() => navigate('/app/social-hub')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between ${
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30'
                : 'bg-slate-50 border-slate-200/70 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Share2 size={18} />
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Social Hub
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Schedule & auto-post
              </p>
            </div>
          </button>

          {/* Channel Integrations */}
          <button
            onClick={() => navigate('/app/integrations')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between col-span-2 sm:col-span-1 ${
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-amber-500/10 hover:border-amber-500/30'
                : 'bg-slate-50 border-slate-200/70 hover:bg-amber-50 hover:border-amber-200'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Smartphone size={18} />
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Channels & API
              </p>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                WhatsApp, IG, Telegram
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 🏢 Main Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Client Leaderboard */}
        <div className={`lg:col-span-2 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
          {/* Card Header with Search */}
          <div className="p-4 sm:p-6 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Activity size={18} />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Client Organization Leaderboard
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Usage breakdown and traffic allocation across active clients
                </p>
              </div>
            </div>

            {/* Organization Search Input */}
            <div className="relative min-w-[200px] w-full sm:w-auto">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-8 pr-3 py-2 border outline-none transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#FF6A00]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#FF6A00]'
                }`}
              />
            </div>
          </div>

          {/* Desktop View: Clean Responsive Table (Hidden on small mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className={`uppercase text-[11px] font-semibold tracking-wider ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <tr>
                  <th className="px-5 py-3.5">Client Workspace</th>
                  <th className="px-5 py-3.5 text-right">Messages</th>
                  <th className="px-5 py-3.5 text-right">AI Tokens</th>
                  <th className="px-5 py-3.5 text-right">Conversations</th>
                  <th className="px-5 py-3.5 text-right">Traffic Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredOrganizations.map((org) => {
                  const trafficPct = messagesUsed > 0 ? ((org.messages / messagesUsed) * 100).toFixed(1) : '0.0';
                  return (
                    <tr
                      key={org._id}
                      className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00]/10 text-[#FF6A00]'
                          }`}>
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {org.name}
                            </p>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ID: {org.slug || org._id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-right font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {org.messages.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-purple-400">
                        {org.tokens.toLocaleString()}
                      </td>
                      <td className={`px-5 py-4 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {org.conversations.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00]/10 text-[#FF6A00]'
                        }`}>
                          {trafficPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrganizations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="max-w-xs mx-auto text-center">
                        <Layers size={32} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          No organizations found
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {searchQuery ? 'Try clearing your search query.' : 'Create or invite organizations to see analytics.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: High-Readability Organization Cards (Visible on phones) */}
          <div className="block md:hidden divide-y divide-inherit">
            {filteredOrganizations.map((org) => {
              const trafficPct = messagesUsed > 0 ? ((org.messages / messagesUsed) * 100).toFixed(1) : '0.0';
              return (
                <div key={org._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00]/10 text-[#FF6A00]'
                      }`}>
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {org.name}
                        </p>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ID: {org.slug || org._id.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00]/10 text-[#FF6A00]'
                    }`}>
                      {trafficPct}% share
                    </span>
                  </div>

                  {/* 3-metric mini grid */}
                  <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Messages</p>
                      <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{org.messages.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tokens</p>
                      <p className="text-xs font-bold mt-0.5 text-purple-400">{org.tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Threads</p>
                      <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{org.conversations.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Mini Traffic Bar */}
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full bg-[#FF6A00]"
                      style={{ width: `${Math.min(parseFloat(trafficPct), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredOrganizations.length === 0 && (
              <div className="p-8 text-center">
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No organizations found
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3.5 sm:p-4 border-t border-inherit text-xs flex items-center justify-between mt-auto">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {filteredOrganizations.length} of {totalOrgs} organizations
            </span>
            <button
              onClick={() => navigate('/app/analytics')}
              className="text-[#FF6A00] font-semibold flex items-center gap-1 hover:underline"
            >
              Advanced Analytics <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Column (1 col): Traffic Distribution & Channel Status */}
        <div className="space-y-6">
          {/* Traffic Distribution Chart */}
          <div className={`rounded-2xl border flex flex-col ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
            <div className="p-4 sm:p-6 border-b border-inherit flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <PieChartIcon size={18} />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Traffic Distribution
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Volume concentration by client
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[260px]">
              {pieData.length > 0 ? (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          background: isDark ? '#0f172a' : '#ffffff',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                    <TrendingUp size={22} />
                  </div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    No traffic data recorded yet
                  </p>
                  <p className={`text-xs mt-1 max-w-[200px] mx-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Send test messages through WhatsApp or Instagram to view distribution.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Omnichannel Platform Health */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Channel Connectivity
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Healthy
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>WhatsApp Cloud API</span>
                </div>
                <span className="text-emerald-500 font-medium">Ready</span>
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Instagram Messaging</span>
                </div>
                <span className="text-emerald-500 font-medium">Active</span>
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Telegram Bot</span>
                </div>
                <span className="text-emerald-500 font-medium">Listening</span>
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>YouTube Hub</span>
                </div>
                <span className="text-blue-500 font-medium">Synced</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/app/integrations')}
              className={`w-full mt-4 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                isDark
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Configure Connected Channels
            </button>
          </div>
        </div>
      </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
