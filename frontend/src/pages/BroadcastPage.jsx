import React from 'react';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

export default function BroadcastPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">New Broadcast</h1>
        <p className="text-gray-400 mt-1">Send a mass message to your audience segments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">1. Select Audience</h2>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select a segment...</option>
              <option value="all">All Contacts (120)</option>
              <option value="vip">VIP Customers (15)</option>
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">2. Select Template</h2>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select an approved template...</option>
              <option value="promo">Summer Sale Promo (Marketing)</option>
              <option value="update">Account Update (Utility)</option>
            </select>
            
            <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Template Preview:</p>
              <p className="font-mono text-sm text-gray-200">Hi {{1}}, our summer sale is now live! Use code {{2}}.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Recipients</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Cost</span>
                <span className="font-semibold">$0.00</span>
              </div>
            </div>
            <button className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 font-semibold flex items-center justify-center gap-2">
              <MegaphoneIcon className="w-5 h-5" /> Send Broadcast
            </button>
            <button className="w-full py-3 mt-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition font-semibold text-gray-300">
              Schedule for Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
