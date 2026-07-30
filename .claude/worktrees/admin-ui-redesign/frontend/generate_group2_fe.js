const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const templatesPage = `import React, { useEffect } from 'react';
import { useCrmStore } from '../store/crmStore';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export default function TemplatesPage() {
  const { templates, fetchTemplates, isLoading } = useCrmStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Message Templates</h1>
          <p className="text-gray-400 mt-1">Manage your WhatsApp approved templates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
          <ArrowPathIcon className="w-5 h-5" /> Sync from Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-gray-500 col-span-full">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <DocumentDuplicateIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No templates found. Sync from your WhatsApp Business Account.</p>
          </div>
        ) : (
          templates.map(tpl => (
            <div key={tpl._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{tpl.name}</h3>
                <span className={\`px-2 py-1 rounded text-xs \${tpl.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}\`}>
                  {tpl.status || 'PENDING'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700 font-mono whitespace-pre-wrap">
                {tpl.components?.find(c => c.type === 'BODY')?.text || 'No body content'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Category: {tpl.category || 'MARKETING'}</span>
                <span>Language: {tpl.language || 'en'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
`;

const broadcastPage = `import React from 'react';
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
`;

const campaignsPage = `import React from 'react';
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
`;

fs.writeFileSync(path.join(pagesDir, 'TemplatesPage.jsx'), templatesPage);
fs.writeFileSync(path.join(pagesDir, 'BroadcastPage.jsx'), broadcastPage);
fs.writeFileSync(path.join(pagesDir, 'CampaignsPage.jsx'), campaignsPage);

console.log('Group 2: Campaigns & Templates generated');
