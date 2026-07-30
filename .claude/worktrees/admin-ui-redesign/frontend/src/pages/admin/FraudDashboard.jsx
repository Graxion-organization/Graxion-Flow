import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShieldAlert, ShieldBan, Key, EyeOff, Activity, Trash2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import toast from 'react-hot-toast';

const FraudDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, eventsRes, blockedRes] = await Promise.all([
        api.get('/fraud-admin/analytics'),
        api.get('/fraud-admin/events?limit=50'),
        api.get('/fraud-admin/blocked-ips')
      ]);

      setAnalytics(analyticsRes.data.data);
      setEvents(eventsRes.data.data.events);
      setBlockedIPs(blockedRes.data.data.blockedIPs);
    } catch (error) {
      toast.error('Failed to load fraud analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUnblock = async (ip) => {
    try {
      await api.post('/fraud-admin/unblock', { ip });
      toast.success(`IP ${ip} unblocked successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to unblock IP');
    }
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-gray-400">Loading fraud metrics...</div>;
  }

  const statCards = [
    { title: "Total Events", value: analytics?.totalEvents || 0, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Blocked Requests", value: analytics?.breakdown?.blocked || 0, icon: ShieldBan, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "OTP Challenged", value: analytics?.breakdown?.otp || 0, icon: Key, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Captcha Required", value: analytics?.breakdown?.captcha || 0, icon: EyeOff, color: "text-yellow-500", bg: "bg-yellow-500/10" }
  ];

  const getActionColor = (action) => {
    switch(action) {
      case 'block': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'require_otp': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'require_captcha': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            7-Day Risk Trend
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="_id" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" name="Total Events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="blocked" name="Blocked" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blocked IPs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-500">
            <ShieldAlert className="w-5 h-5" />
            Active IP Blocks
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {blockedIPs.length === 0 ? (
              <p className="text-gray-400 text-center mt-10">No IPs currently blocked.</p>
            ) : (
              blockedIPs.map(ip => (
                <div key={ip} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                  <span className="font-mono text-sm">{ip}</span>
                  <button 
                    onClick={() => handleUnblock(ip)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Unblock IP"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Suspicious Activity Log */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold">Recent Suspicious Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Identity</th>
                <th className="px-6 py-4 font-medium">IP / Location</th>
                <th className="px-6 py-4 font-medium">Risk Score</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {events.map((event) => (
                <tr key={event._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{event.email || 'Unknown'}</div>
                    {event.userId && <div className="text-xs text-gray-500">ID: {event.userId._id}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-gray-300">{event.ip}</div>
                    <div className="text-xs text-gray-500">{event.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${event.riskScore >= 85 ? 'text-red-500' : event.riskScore >= 60 ? 'text-orange-500' : 'text-yellow-500'}`}>
                      {event.riskScore}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full border text-xs font-medium uppercase ${getActionColor(event.action)}`}>
                      {event.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="list-disc pl-4 space-y-1 text-gray-400 text-xs">
                      {event.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    No suspicious events logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FraudDashboard;
