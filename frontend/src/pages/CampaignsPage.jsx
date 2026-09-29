import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, UsersIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { broadcastAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DataCardGridSkeleton, TableSkeleton } from '../components/common/ShimmerSkeleton';

export default function CampaignsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await broadcastAPI.getAll();
      setBroadcasts(res.data?.data?.broadcasts || []);
    } catch (err) {
      toast.error('Failed to load campaigns');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalSent = broadcasts.reduce((acc, b) => acc + (b.sentCount || 0), 0);
  const totalDelivered = broadcasts.reduce((acc, b) => acc + (b.deliveredCount || 0), 0);
  const totalRead = broadcasts.reduce((acc, b) => acc + (b.readCount || 0), 0);

  const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
  const avgReadRate = totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(1) : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'DRAFT': return isDark ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-slate-100 text-slate-500 border border-slate-200';
      default: return isDark ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-28 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="shimmer-sweep h-8 w-60 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="shimmer-sweep h-3.5 w-72 rounded-md bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="shimmer-sweep h-11 w-36 rounded-xl bg-slate-200 dark:bg-white/10" />
        </div>
        <DataCardGridSkeleton count={3} cols="grid-cols-1 sm:grid-cols-2 md:grid-cols-3" isDark={isDark} />
        <TableSkeleton rows={4} isDark={isDark} />
      </div>
    );
  }

  return (
    <div className={`p-3 sm:p-6 max-w-7xl mx-auto pb-28 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Campaign Performance
          </h1>
          <p className={`mt-1 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Track delivery and read performance of your official broadcast campaigns.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/broadcast')}
          className="flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#e05d00] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#FF6A00]/25 shrink-0 self-start sm:self-auto min-h-[44px]"
        >
          <PlusIcon className="w-5 h-5" /> New Broadcast
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6 mb-6 sm:mb-8">
        <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 shadow-xs ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
            <ChartBarIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Sent</p>
            <p className={`text-2xl font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalSent.toLocaleString()}</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 shadow-xs ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
            <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Delivery Rate</p>
            <p className={`text-2xl font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{avgDeliveryRate}%</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 shadow-xs col-span-1 sm:col-span-2 md:col-span-1 ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500 shrink-0">
            <UsersIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Read Rate</p>
            <p className={`text-2xl font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{avgReadRate}%</p>
          </div>
        </div>
      </div>

      {/* Campaigns Container */}
      <div className={`rounded-2xl border shadow-xs overflow-hidden ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
      }`}>
        {broadcasts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No broadcast campaigns executed yet. Click "New Broadcast" to start.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className={`text-[11px] uppercase tracking-wider font-semibold ${
                  isDark ? 'bg-slate-950 text-slate-400 border-b border-white/10' : 'bg-slate-50 text-slate-500 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Campaign Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Audience</th>
                    <th className="p-4 text-right">Sent</th>
                    <th className="p-4 text-right">Delivered</th>
                    <th className="p-4 text-right">Read</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {broadcasts.map((b) => (
                    <tr key={b._id} className={isDark ? 'hover:bg-white/[0.02] transition' : 'hover:bg-slate-50 transition'}>
                      <td className={`p-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className={`p-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.contactGroup?.name || 'All Contacts'}</td>
                      <td className={`p-4 text-right font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{b.sentCount || 0}</td>
                      <td className="p-4 text-right font-medium text-emerald-500">{b.deliveredCount || 0}</td>
                      <td className="p-4 text-right font-medium text-blue-500">{b.readCount || 0}</td>
                      <td className={`p-4 text-right font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {format(new Date(b.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High readability cards on phones */}
            <div className="block md:hidden divide-y divide-inherit">
              {broadcasts.map((b) => (
                <div key={b._id} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </div>

                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Group: {b.contactGroup?.name || 'All Contacts'}
                  </p>

                  <div className={`grid grid-cols-3 gap-2 p-2 rounded-xl text-center text-xs ${
                    isDark ? 'bg-white/5' : 'bg-slate-50'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Sent</span>
                      <span className="font-bold">{b.sentCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Delivered</span>
                      <span className="font-bold text-emerald-500">{b.deliveredCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Read</span>
                      <span className="font-bold text-blue-500">{b.readCount || 0}</span>
                    </div>
                  </div>

                  <p className="text-[10px] font-mono text-slate-400 text-right">
                    {format(new Date(b.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
