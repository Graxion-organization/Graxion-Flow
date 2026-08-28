import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, UsersIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { broadcastAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
      case 'COMPLETED': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'FAILED': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'DRAFT': return isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500';
      default: return isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6A00]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Campaigns</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track the performance of your broadcast campaigns</p>
        </div>
        <button
          onClick={() => navigate('/app/broadcast')}
          className="flex items-center gap-2 bg-[#FF6A00] hover:bg-[#e05d00] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF6A00]/20 shrink-0"
        >
          <PlusIcon className="w-5 h-5" /> New Broadcast
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
            <ChartBarIcon className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Sent</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalSent.toLocaleString()}</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
            <CheckCircleIcon className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Delivery Rate</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{avgDeliveryRate}%</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500">
            <UsersIcon className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Read Rate</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{avgReadRate}%</p>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className={`rounded-2xl border overflow-x-auto shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <table className="w-full text-left min-w-[800px]">
          <thead className={`text-xs uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <tr>
              <th className="p-4 font-semibold">Campaign Name</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Audience</th>
              <th className="p-4 font-semibold">Sent</th>
              <th className="p-4 font-semibold">Delivered</th>
              <th className="p-4 font-semibold">Read</th>
              <th className="p-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
            {broadcasts.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-12 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <ChartBarIcon className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No campaigns yet</h3>
                  <p className={`text-sm mb-5 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Send your first broadcast to see campaign performance here.
                  </p>
                  <button
                    onClick={() => navigate('/app/broadcast')}
                    className="bg-[#FF6A00] hover:bg-[#e05d00] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF6A00]/20"
                  >
                    Create Broadcast
                  </button>
                </td>
              </tr>
            ) : (
              broadcasts.map(b => {
                const deliveredPct = b.sentCount > 0 ? Math.round((b.deliveredCount / b.sentCount) * 100) : 0;
                const readPct = b.sentCount > 0 ? Math.round((b.readCount / b.sentCount) * 100) : 0;
                return (
                  <tr key={b._id} className={`transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                    <td className={`p-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{b.name}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap font-medium ${getStatusColor(b.status)}`}>{b.status}</span></td>
                    <td className={`p-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{b.contactGroup ? b.contactGroup.name : 'All Contacts'}</td>
                    <td className={`p-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.sentCount || 0}</td>
                    <td className="p-4 text-green-600 dark:text-green-400">{b.deliveredCount || 0} ({deliveredPct}%)</td>
                    <td className="p-4 text-blue-600 dark:text-blue-400">{b.readCount || 0} ({readPct}%)</td>
                    <td className={`p-4 text-sm whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{format(new Date(b.createdAt), 'MMM d, yyyy')}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
