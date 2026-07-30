import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Instagram, Facebook, Youtube, Linkedin, Send,
  MessageSquare, Clock, CheckCircle2, AlertCircle,
  Image as ImageIcon, Video, Eye
} from 'lucide-react';
import { socialHubAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PLATFORM_ICON = {
  instagram: <Instagram size={14} className="text-pink-500" />,
  facebook: <Facebook size={14} className="text-blue-500" />,
  youtube: <Youtube size={14} className="text-red-600" />,
  linkedin: <Linkedin size={14} className="text-[#0077b5]" />,
  whatsapp: <MessageSquare size={14} className="text-green-500" />,
  telegram: <Send size={14} className="text-sky-500" />,
};

const STATUS_COLORS = {
  success: { bg: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-400' },
  completed: { bg: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-400' },
  scheduled: { bg: 'bg-blue-500', text: 'text-blue-500', dot: 'bg-blue-400' },
  failed: { bg: 'bg-rose-500', text: 'text-rose-500', dot: 'bg-rose-400' },
  partially_failed: { bg: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-400' },
  pending: { bg: 'bg-slate-400', text: 'text-slate-400', dot: 'bg-slate-400' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SocialCalendarTab() {
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await socialHubAPI.getFeed();
      setFeed(res.data.data || []);
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Group feed items by date
  const postsByDate = useMemo(() => {
    const map = {};
    feed.forEach(post => {
      const date = new Date(post.timestamp || post.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [feed]);

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    // Next month leading days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  }, [currentDate]);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayKey = getDateKey(today);

  const selectedDayPosts = selectedDay ? (postsByDate[getDateKey(selectedDay)] || []) : [];

  // Stats for current month
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let totalPosts = 0;
    let scheduled = 0;
    let failed = 0;
    let platforms = new Set();

    Object.entries(postsByDate).forEach(([key, posts]) => {
      const d = new Date(key);
      if (d.getFullYear() === year && d.getMonth() === month) {
        totalPosts += posts.length;
        posts.forEach(p => {
          if (p.mode === 'scheduled' && new Date(p.timestamp) > new Date()) scheduled++;
          if (p.overallStatus === 'failed' || p.overallStatus === 'partially_failed') failed++;
          if (p.platforms) p.platforms.forEach(pl => platforms.add(pl));
          else if (p.platform) platforms.add(p.platform);
        });
      }
    });

    return { totalPosts, scheduled, failed, platforms: platforms.size };
  }, [postsByDate, currentDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Posts This Month', value: monthStats.totalPosts, icon: ImageIcon, tint: '#3B82F6' },
          { label: 'Upcoming Scheduled', value: monthStats.scheduled, icon: Clock, tint: '#8B5CF6' },
          { label: 'Failed Posts', value: monthStats.failed, icon: AlertCircle, tint: '#F43F5E' },
          { label: 'Platforms Used', value: monthStats.platforms, icon: Send, tint: '#FF6A00' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
                  <p className={`text-xl font-extrabold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{s.value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: `${s.tint}18`, color: s.tint }}><Icon size={16} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className={`lg:col-span-2 rounded-2xl border p-5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigateMonth(-1)} className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                <ChevronLeft size={18} />
              </button>
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={() => navigateMonth(1)} className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={goToToday} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isDark ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              Today
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              const key = getDateKey(cell.date);
              const posts = postsByDate[key] || [];
              const isToday = key === todayKey;
              const isSelected = selectedDay && getDateKey(selectedDay) === key;
              const hasPosts = posts.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(cell.date)}
                  className={`relative min-h-[72px] sm:min-h-[80px] p-1.5 rounded-xl border text-left transition-all duration-150 ${
                    !cell.isCurrentMonth
                      ? isDark ? 'opacity-30 border-transparent' : 'opacity-30 border-transparent'
                      : isSelected
                        ? isDark ? 'border-[#FF6A00] bg-[#FF6A00]/10' : 'border-[#FF6A00] bg-orange-50'
                        : isToday
                          ? isDark ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-300 bg-blue-50'
                          : isDark ? 'border-white/5 hover:border-white/15 hover:bg-white/5' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${
                    isToday ? 'text-blue-500' : isSelected ? 'text-[#FF6A00]' : isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {cell.day}
                  </span>

                  {hasPosts && (
                    <div className="mt-1 space-y-0.5">
                      {posts.slice(0, 2).map((post, pi) => {
                        const statusColor = STATUS_COLORS[post.overallStatus || post.status] || STATUS_COLORS.pending;
                        return (
                          <div key={pi} className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor.dot}`} />
                            <span className={`text-[8px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(post.caption || 'Post').substring(0, 12)}
                            </span>
                          </div>
                        );
                      })}
                      {posts.length > 2 && (
                        <span className={`text-[8px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>+{posts.length - 2} more</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail Panel */}
        <div className={`rounded-2xl border p-5 flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {selectedDay ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 -mr-1">
            {!selectedDay ? (
              <div className={`h-full flex flex-col items-center justify-center text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <CalendarIcon size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Click on a date</p>
                <p className="text-xs mt-1 opacity-70">to see posts for that day</p>
              </div>
            ) : selectedDayPosts.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <ImageIcon size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No posts on this day</p>
                <p className="text-xs mt-1 opacity-70">Schedule one from the Auto Post tab</p>
              </div>
            ) : (
              selectedDayPosts.map((post, i) => {
                const statusColor = STATUS_COLORS[post.overallStatus || post.status] || STATUS_COLORS.pending;
                const time = new Date(post.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const platforms = post.platforms || [post.platform];

                return (
                  <div key={i} className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        {post.mediaUrl ? (
                          /\.(mp4|mov|webm)/i.test(post.mediaUrl) ? (
                            <video src={post.mediaUrl} className="w-full h-full object-cover" />
                          ) : (
                            <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={18} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs line-clamp-2 mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {post.caption || 'No caption'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {platforms.map((p, pi) => (
                            <span key={pi} className="flex items-center">
                              {PLATFORM_ICON[p]}
                            </span>
                          ))}
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{time}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${statusColor.text} ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                            {post.overallStatus || post.status || 'posted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Executions */}
                    {post.executions && post.executions.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <div className="flex flex-wrap gap-1.5">
                          {post.executions.map((ex, ei) => {
                            const exColor = STATUS_COLORS[ex.status] || STATUS_COLORS.pending;
                            return (
                              <div key={ei} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                {PLATFORM_ICON[ex.platform]}
                                <div className={`w-1.5 h-1.5 rounded-full ${exColor.dot}`} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
