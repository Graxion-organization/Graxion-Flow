import React from 'react';
import { ChartBarIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Campaigns</h1>
          <p className="text-gray-400 mt-1">Track the performance of your broadcast campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-lg text-blue-400">
            <ChartBarIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Sent</p>
            <p className="text-2xl font-bold">12,450</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-green-500/10 rounded-lg text-green-400">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg. Delivery Rate</p>
            <p className="text-2xl font-bold">98.2%</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-lg text-purple-400">
            <UsersIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg. Read Rate</p>
            <p className="text-2xl font-bold">76.4%</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
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
            <tr className="hover:bg-gray-800/30 transition">
              <td className="p-4 font-semibold">Summer Sale 2026</td>
              <td className="p-4"><span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs">Completed</span></td>
              <td className="p-4 text-gray-400">All Customers</td>
              <td className="p-4">1,200</td>
              <td className="p-4 text-green-400">1,195 (99%)</td>
              <td className="p-4 text-blue-400">950 (79%)</td>
              <td className="p-4 text-gray-500 text-sm">Jul 12, 2026</td>
            </tr>
            <tr className="hover:bg-gray-800/30 transition">
              <td className="p-4 font-semibold">VIP Exclusive Invite</td>
              <td className="p-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">Sending</span></td>
              <td className="p-4 text-gray-400">VIP Segment</td>
              <td className="p-4">15</td>
              <td className="p-4 text-gray-400">-</td>
              <td className="p-4 text-gray-400">-</td>
              <td className="p-4 text-gray-500 text-sm">Jul 15, 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
