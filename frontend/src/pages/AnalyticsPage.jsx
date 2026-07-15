import React, { useState, useEffect } from 'react';
import { PresentationChartLineIcon, ChatBubbleLeftRightIcon, CurrencyDollarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [volumeData, setVolumeData] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Fetch volume data and ai metrics
        const [volRes, aiRes] = await Promise.all([
          analyticsAPI.getVolume({ timeframe: '7d' }),
          analyticsAPI.getAi()
        ]);
        
        // Transform the mock data format (date/sent/received) to map to our Recharts lines (messages, aiCalls)
        const mappedVolume = (volRes.data?.data?.volume || []).map(d => ({
          name: d.date,
          messages: d.sent + d.received,
          aiCalls: Math.floor((d.sent + d.received) * 0.7) // Mocking AI calls as a subset
        }));
        setVolumeData(mappedVolume);
        
        setMetrics(aiRes.data?.data?.metrics);
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-white">Loading analytics...</div>;
  }

  const totalMessages = volumeData.reduce((acc, curr) => acc + curr.messages, 0);
  const totalAiCalls = volumeData.reduce((acc, curr) => acc + curr.aiCalls, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Analytics Dashboard</h1>
        <p className="text-gray-400 mt-1">Track your performance and AI costs over the last 7 days</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Total Messages</p>
          <p className="text-2xl font-bold mt-1">{totalMessages.toLocaleString()}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">AI Token Usage</p>
          <p className="text-2xl font-bold mt-1">
            {metrics?.tokensUsed !== undefined ? metrics.tokensUsed.toLocaleString() : '0'}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
              <CurrencyDollarIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Est. AI Cost Saved</p>
          <p className="text-2xl font-bold mt-1">
            {metrics?.costSaved !== undefined ? metrics.costSaved : '$0'}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
              <PresentationChartLineIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">AI Resolution Rate</p>
          <p className="text-2xl font-bold mt-1">
            {metrics?.resolutionRate !== undefined ? metrics.resolutionRate : '0%'}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl h-96">
        <h2 className="text-xl font-semibold mb-6">Traffic & AI Invocation</h2>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="messages" name="Total Messages" stroke="#3B82F6" strokeWidth={3} />
              <Line type="monotone" dataKey="aiCalls" name="AI Invocations" stroke="#8B5CF6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
        )}
      </div>
    </div>
  );
}
