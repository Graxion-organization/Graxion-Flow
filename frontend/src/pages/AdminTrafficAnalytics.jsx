import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import { Users, Link2, Zap, TrendingUp, Globe, Loader2, ArrowUpRight } from 'lucide-react';
import api from '../services/api'; // Make sure api uses authenticated requests

export default function AdminTrafficAnalytics() {
  const [data, setData] = useState({ sourceStats: [], dailyTrend: [] });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');

  useEffect(() => {
    fetchTrafficStats();
  }, [timeframe]);

  const fetchTrafficStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/traffic?timeframe=${timeframe}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch traffic stats', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVisitors = data.sourceStats.reduce((acc, curr) => acc + curr.uniqueVisitors, 0);
  const totalSignups = data.sourceStats.reduce((acc, curr) => acc + (curr.signups || 0), 0);
  const conversionRate = totalVisitors > 0 ? ((totalSignups / totalVisitors) * 100).toFixed(2) : 0;

  const topSource = data.sourceStats.length > 0 ? data.sourceStats[0].source : 'None';

  return (
    <div className="min-h-screen bg-[#030712] p-8 text-white w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Globe className="text-emerald-500 w-8 h-8" />
              Traffic Analytics Console
            </h1>
            <p className="text-gray-400 mt-2">Track user acquisition sources and UTM conversion rates across all entry points.</p>
          </div>
          
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
            {['7d', '30d', '90d', '1y'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeframe === tf 
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Unique Visitors</h3>
                </div>
                <p className="text-4xl font-bold text-white">{totalVisitors.toLocaleString()}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Signups</h3>
                </div>
                <p className="text-4xl font-bold text-white">{totalSignups.toLocaleString()}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Avg Conversion Rate</h3>
                </div>
                <p className="text-4xl font-bold text-white">{conversionRate}%</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Top Source</h3>
                </div>
                <p className="text-3xl font-bold text-white capitalize">{topSource}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Daily Trend Line Chart */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-6">Traffic Trend (Last {timeframe})</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280" 
                        tick={{fill: '#6b7280', fontSize: 12}}
                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="uniqueVisitors" name="Unique Visitors" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="visits" name="Total Hits" stroke="#3b82f6" strokeWidth={2} dot={false} opacity={0.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Source Breakdown Bar Chart */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-6">Acquisition Sources</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.sourceStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                      <XAxis type="number" stroke="#6b7280" tick={{fill: '#6b7280'}} />
                      <YAxis dataKey="source" type="category" stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12, textTransform: 'capitalize'}} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: '#1f2937'}}
                      />
                      <Legend />
                      <Bar dataKey="uniqueVisitors" name="Visitors" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="signups" name="Signups" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Source Breakdown Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Hits</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Unique Visitors</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Signups</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.sourceStats.map((stat, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gray-300">
                              <Globe size={14} />
                            </div>
                            <span className="font-medium text-white capitalize">{stat.source}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                          {stat.totalVisits.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                          {stat.uniqueVisitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-emerald-400 font-medium">
                          {stat.signups ? stat.signups.toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-400 font-medium">
                              {stat.uniqueVisitors > 0 ? ((stat.signups / stat.uniqueVisitors) * 100).toFixed(1) : 0}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${stat.uniqueVisitors > 0 ? ((stat.signups / stat.uniqueVisitors) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.sourceStats.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No traffic data available for the selected timeframe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </>
        )}
      </div>
    </div>
  );
}
