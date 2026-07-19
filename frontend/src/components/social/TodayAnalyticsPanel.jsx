import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar, RefreshCw, CheckCircle2, XCircle, Clock, Loader2,
  Instagram, Facebook, Linkedin, Youtube, Send, MessageSquare,
  AlertTriangle, ExternalLink, TrendingUp, Zap, BarChart2,
  ChevronDown, ChevronUp, Image as ImageIcon,
} from 'lucide-react';
import { socialHubAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PLATFORM_META = {
  instagram: { label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', Icon: Instagram },
  facebook: { label: 'Facebook', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', Icon: Facebook },
  linkedin: { label: 'LinkedIn', color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20', Icon: Linkedin },
  youtube: { label: 'YouTube', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', Icon: Youtube },
  telegram: { label: 'Telegram', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', Icon: Send },
};

const STATUS_META = {
  success: { label: 'Published', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', Icon: XCircle },
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', Icon: Clock },
  connecting: { label: 'Connecting', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/20', Icon: Loader2 },
  publishing: { label: 'Publishing', color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', Icon: Loader2 },
  queued: { label: 'Scheduled', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', Icon: Calendar },
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatToday = () => {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function StatCard({ label, value, icon: Icon, color, isDark }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3.5 border transition-all ${'bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-white/10'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className={`text-xl font-bold leading-none ${'text-slate-800 dark:text-slate-100'}`}>{value}</p>
        <p className={`text-[11px] mt-1 ${'text-slate-500 dark:text-slate-400'}`}>{label}</p>
      </div>
    </div>
  );
}

function PlatformBadge({ platform, isDark }) {
  const meta = PLATFORM_META[platform] || { label: platform, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', Icon: MessageSquare };
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status, isDark }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const { Icon } = meta;
  const isSpinning = ['connecting', 'publishing'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
      <Icon size={11} className={isSpinning ? 'animate-spin' : ''} />
      {meta.label}
    </span>
  );
}

function PostRow({ post, isDark, platform }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b transition-colors cursor-pointer ${'border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]'}`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Time */}
        <td className={`py-3 pl-4 pr-2 text-xs whitespace-nowrap ${'text-slate-500 dark:text-slate-400'}`}>
          {post.mode === 'scheduled' && !post.publishedAt
            ? <span className="text-orange-500 font-medium">{formatTime(post.scheduledAt)}</span>
            : formatTime(post.publishedAt || post.createdAt)
          }
        </td>
        {/* Type */}
        <td className="py-3 px-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            {post.type || 'post'}
          </span>
        </td>
        {/* Caption */}
        <td className={`py-3 px-2 max-w-[220px] text-sm ${'text-slate-700 dark:text-slate-300'}`}>
          {post.mediaUrl && (
            <div className="inline-flex items-center gap-1 mr-1.5">
              <ImageIcon size={11} className={'text-slate-400 dark:text-slate-500'} />
            </div>
          )}
          <span className="line-clamp-1">{post.caption || <span className="opacity-40 italic">No caption</span>}</span>
        </td>
        {/* Status */}
        <td className="py-3 px-2 text-center">
          <StatusBadge status={post.status}  />
        </td>
        {/* Expand */}
        <td className="py-3 pl-2 pr-4 text-center">
          {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
        </td>
      </tr>
      {/* Expanded detail row */}
      {expanded && (
        <tr className={`border-b ${'border-slate-100 bg-slate-50 dark:border-white/5 dark:bg-slate-950/50'}`}>
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-wrap gap-4 items-start">
              {post.mediaUrl && (
                <img src={post.mediaUrl} alt="media" className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0" />
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                {post.caption && (
                  <p className={`text-xs leading-relaxed ${'text-slate-600 dark:text-slate-300'}`}>{post.caption}</p>
                )}
                {post.errorMessage && (
                  <div className={`flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    {post.errorMessage}
                  </div>
                )}
                {post.externalPostId && (
                  <span className={`inline-flex items-center gap-1 text-[10px] ${'text-emerald-600 dark:text-emerald-400'}`}>
                    <ExternalLink size={10} /> Post ID: {post.externalPostId}
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PlatformSection({ row, isDark }) {
  const [open, setOpen] = useState(true);
  const meta = PLATFORM_META[row.platform] || { label: row.platform, color: 'text-slate-400', bg: 'bg-slate-500/10', Icon: MessageSquare };
  const { Icon } = meta;

  if (row.total === 0) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden ${'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900'}`}>
      {/* Platform header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${'hover:bg-slate-50 dark:hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg}`}>
            <Icon size={18} className={meta.color} />
          </div>
          <div className="text-left">
            <p className={`font-semibold text-sm ${'text-slate-800 dark:text-slate-100'}`}>{meta.label}</p>
            <p className={`text-[11px] ${'text-slate-500 dark:text-slate-400'}`}>{row.total} post{row.total !== 1 ? 's' : ''} today</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {row.success > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
              <CheckCircle2 size={13} /> {row.success}
            </span>
          )}
          {row.failed > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
              <XCircle size={13} /> {row.failed}
            </span>
          )}
          {row.scheduled > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
              <Clock size={13} /> {row.scheduled}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Table */}
      {open && row.posts.length > 0 && (
        <div className={`border-t ${'border-slate-100 dark:border-white/10'}`}>
          <table className="w-full table-fixed">
            <thead>
              <tr className={`text-[10px] uppercase tracking-widest font-bold ${'text-slate-400 bg-slate-50 dark:text-slate-500 dark:bg-slate-950/50'}`}>
                <th className="py-2 pl-4 pr-2 text-left w-20">Time</th>
                <th className="py-2 px-2 text-left w-20">Type</th>
                <th className="py-2 px-2 text-left">Caption</th>
                <th className="py-2 px-2 text-center w-28">Status</th>
                <th className="py-2 pl-2 pr-4 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {row.posts.map((post, i) => (
                <PostRow key={`${post.jobId}-${i}`} post={post}  platform={row.platform} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TodayAnalyticsPanel({ isDark, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await socialHubAPI.getTodayAnalytics();
      setAnalytics(res.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error('Failed to load today\'s analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <div className={`rounded-2xl border p-12 flex flex-col items-center justify-center gap-3 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
        <Loader2 size={28} className="animate-spin text-violet-500" />
        <p className={`text-sm ${'text-slate-500 dark:text-slate-400'}`}>Loading today's activity...</p>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const platforms = analytics?.platforms || [];
  const allPlatforms = analytics?.allPlatforms || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${'text-slate-800 dark:text-slate-100'}`}>
            📅 Today's Publishing Activity
          </h2>
          <p className={`text-xs mt-0.5 ${'text-slate-500 dark:text-slate-400'}`}>{formatToday()}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className={`text-[10px] ${'text-slate-400 dark:text-slate-500'}`}>
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all ${'border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-400'}`}
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Posts"
          value={summary.totalJobs ?? 0}
          icon={BarChart2}
          color={`${'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'}`}
          
        />
        <StatCard
          label="Published"
          value={summary.successExecutions ?? 0}
          icon={CheckCircle2}
          color={`${'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}
          
        />
        <StatCard
          label="Failed"
          value={summary.failedExecutions ?? 0}
          icon={XCircle}
          color={`${'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}
          
        />
        <StatCard
          label="Scheduled"
          value={summary.scheduledJobs ?? 0}
          icon={Calendar}
          color={`${'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'}`}
          
        />
      </div>

      {/* Success rate bar */}
      {summary.totalExecutions > 0 && (
        <div className={`rounded-xl border p-4 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${'text-slate-600 dark:text-slate-300'}`}>
              <TrendingUp size={13} /> Success Rate Today
            </span>
            <span className={`text-sm font-bold ${summary.successRate >= 80 ? 'text-emerald-500' : summary.successRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {summary.successRate}%
            </span>
          </div>
          <div className={`h-2 rounded-full ${'bg-slate-100 dark:bg-slate-800'}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${summary.successRate >= 80 ? 'bg-emerald-500' : summary.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${summary.successRate}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1.5 ${'text-slate-400 dark:text-slate-500'}`}>
            {summary.successExecutions} of {summary.totalExecutions} executions succeeded
          </p>
        </div>
      )}

      {/* No activity today */}
      {platforms.length === 0 && (
        <div className={`rounded-2xl border p-10 flex flex-col items-center justify-center gap-3 text-center ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${'bg-slate-100 dark:bg-slate-800'}`}>
            <Zap size={26} className={'text-slate-400 dark:text-slate-600'} />
          </div>
          <div>
            <p className={`font-semibold ${'text-slate-600 dark:text-slate-300'}`}>No posts today yet</p>
            <p className={`text-sm mt-1 ${'text-slate-400 dark:text-slate-500'}`}>Publish your first post and it will appear here in real time</p>
          </div>
        </div>
      )}

      {/* Per-platform tables */}
      {platforms.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${'text-slate-600 dark:text-slate-300'}`}>
            <BarChart2 size={15} /> Posts by Platform
          </h3>
          {allPlatforms.map(row => (
            <PlatformSection key={row.platform} row={row}  />
          ))}
        </div>
      )}
    </div>
  );
}
