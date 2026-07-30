import React, { useState, useEffect } from 'react';
import { ChartBarIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { broadcastAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CampaignsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBroadcasts();
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
      case 'COMPLETED': return 'bg-green-500/10 text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400';
      case 'FAILED': return 'bg-red-500/10 text-red-400';
      case 'DRAFT': return 'bg-gray-500/10 text-gray-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Campaigns</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Track the performance of your broadcast campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-lg text-blue-400">
            <ChartBarIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Sent</p>
            <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-green-500/10 rounded-lg text-green-400">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg. Delivery Rate</p>
            <p className="text-2xl font-bold">{avgDeliveryRate}%</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-lg text-purple-400">
            <UsersIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg. Read Rate</p>
            <p className="text-2xl font-bold">{avgReadRate}%</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto shadow-xl">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-300">Campaign Name</th>
              <th className="p-4 font-medium text-gray-300">Status</th>
              <th className="p-4 font-medium text-gray-300">Audience</th>
              <th className="p-4 font-medium text-gray-300">Sent</th>
              <th className="p-4 font-medium text-gray-300">Delivered</th>
              <th className="p-4 font-medium text-gray-300">Read</th>
              <th className="p-4 font-medium text-gray-300">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {broadcasts.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No campaigns found. Send a broadcast to see it here!</td>
              </tr>
            ) : (
              broadcasts.map(b => {
                const deliveredPct = b.sentCount > 0 ? Math.round((b.deliveredCount / b.sentCount) * 100) : 0;
                const readPct = b.sentCount > 0 ? Math.round((b.readCount / b.sentCount) * 100) : 0;
                return (
                  <tr key={b._id} className="hover:bg-gray-800/30 transition">
                    <td className="p-4 font-semibold">{b.name}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStatusColor(b.status)}`}>{b.status}</span></td>
                    <td className="p-4 text-gray-400">{b.contactGroup ? b.contactGroup.name : 'All Contacts'}</td>
                    <td className="p-4">{b.sentCount || 0}</td>
                    <td className="p-4 text-green-400">{b.deliveredCount || 0} ({deliveredPct}%)</td>
                    <td className="p-4 text-blue-400">{b.readCount || 0} ({readPct}%)</td>
                    <td className="p-4 text-gray-500 text-sm whitespace-nowrap">{format(new Date(b.createdAt), 'MMM d, yyyy')}</td>
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
