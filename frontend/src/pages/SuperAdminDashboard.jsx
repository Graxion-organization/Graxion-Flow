import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Users, Database, Globe, 
  Settings, Save, Search, ShieldAlert,
  Server, Smartphone, Monitor
} from 'lucide-react';
import api from '../services/api';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [rateLimits, setRateLimits] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [limitForm, setLimitForm] = useState({
    scope: 'global',
    userId: '',
    platform: 'all',
    limitPerHour: 1000,
    limitPerDay: 10000,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes, limitsRes] = await Promise.all([
        api.get('/superadmin/stats/global'),
        api.get('/superadmin/stats/top-users'),
        api.get('/superadmin/rate-limits')
      ]);

      setStats(statsRes.data.data);
      setTopUsers(usersRes.data.data.topUsers);
      setRateLimits(limitsRes.data.data.limits);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/rate-limits', limitForm);
      alert('Rate limit saved successfully!');
      fetchData(); // refresh list
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteLimit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this limit?')) return;
    try {
      await api.delete(`/superadmin/rate-limits/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Activity className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-slate-900 min-h-screen">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-500" />
            System Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">
            Monitor global API usage, incoming webhooks, and manage system rate limits.
          </p>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total API Calls</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.totals?.apiCalls?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Webhooks</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.totals?.webhooks?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                <Database className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Platforms</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.stats?.length || 0}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <Globe className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Users Leaderboard */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Top Consumers Leaderboard
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium text-right">API Calls</th>
                    <th className="px-6 py-4 font-medium text-right">Webhooks</th>
                    <th className="px-6 py-4 font-medium">Platform Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {topUsers.map((u, i) => (
                    <tr key={u.userId} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                          {u.name}
                        </div>
                        <div className="text-xs text-gray-500 ml-6">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        {u.totalApi.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-slate-300">
                        {u.totalWebhooks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.platforms.map(p => (
                            <span key={p.platform} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 capitalize">
                              {p.platform}: {p.apiCalls}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rate Limit Management */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-gray-400" />
                Configure Rate Limits
              </h3>
              
              <form onSubmit={handleSaveLimit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Scope</label>
                  <select 
                    value={limitForm.scope}
                    onChange={e => setLimitForm({...limitForm, scope: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  >
                    <option value="global">Global (All Users)</option>
                    <option value="user">Specific User Override</option>
                  </select>
                </div>

                {limitForm.scope === 'user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">User ID</label>
                    <input 
                      type="text" 
                      placeholder="Paste User ObjectId"
                      required
                      value={limitForm.userId}
                      onChange={e => setLimitForm({...limitForm, userId: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Platform</label>
                  <select 
                    value={limitForm.platform}
                    onChange={e => setLimitForm({...limitForm, platform: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  >
                    <option value="all">All Platforms</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="telegram">Telegram</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Per Hour</label>
                    <input 
                      type="number" 
                      required
                      value={limitForm.limitPerHour}
                      onChange={e => setLimitForm({...limitForm, limitPerHour: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Per Day</label>
                    <input 
                      type="number" 
                      required
                      value={limitForm.limitPerDay}
                      onChange={e => setLimitForm({...limitForm, limitPerDay: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
                >
                  <Save className="w-4 h-4" /> Save Limit
                </button>
              </form>
            </div>

            {/* Existing Limits List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 overflow-hidden max-h-[400px] overflow-y-auto">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Active Configurations</h4>
              <div className="space-y-3">
                {rateLimits.map(limit => (
                  <div key={limit._id} className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${limit.scope === 'global' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'}`}>
                        {limit.scope} - {limit.platform}
                      </span>
                      <button 
                        onClick={() => handleDeleteLimit(limit._id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    {limit.scope === 'user' && (
                      <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 truncate">
                        User: {limit.user?.name || limit.user}
                      </div>
                    )}
                    <div className="flex gap-4 text-xs font-medium text-gray-900 dark:text-white">
                      <span>{limit.limitPerHour} / hr</span>
                      <span>{limit.limitPerDay} / day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
