const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const analyticsPage = `import React from 'react';
import { PresentationChartLineIcon, ChatBubbleLeftRightIcon, CurrencyDollarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', messages: 400, aiCalls: 240 },
  { name: 'Tue', messages: 300, aiCalls: 139 },
  { name: 'Wed', messages: 550, aiCalls: 480 },
  { name: 'Thu', messages: 278, aiCalls: 390 },
  { name: 'Fri', messages: 189, aiCalls: 480 },
  { name: 'Sat', messages: 239, aiCalls: 380 },
  { name: 'Sun', messages: 349, aiCalls: 430 },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Analytics Dashboard</h1>
        <p className="text-gray-400 mt-1">Track your performance and AI costs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Total Messages</p>
          <p className="text-2xl font-bold mt-1">2,305</p>
          <p className="text-green-400 text-xs mt-2">+12% from last week</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">AI Token Usage</p>
          <p className="text-2xl font-bold mt-1">14.2M</p>
          <p className="text-red-400 text-xs mt-2">+5% from last week</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
              <CurrencyDollarIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Est. AI Cost</p>
          <p className="text-2xl font-bold mt-1">$1.42</p>
          <p className="text-gray-500 text-xs mt-2">Based on Gemini Flash</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
              <PresentationChartLineIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Avg. Lead Score</p>
          <p className="text-2xl font-bold mt-1">64</p>
          <p className="text-green-400 text-xs mt-2">+2 from last week</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl h-96">
        <h2 className="text-xl font-semibold mb-6">Traffic & AI Invocation</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={3} />
            <Line type="monotone" dataKey="aiCalls" stroke="#8B5CF6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
`;

const integrationsPage = `import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function IntegrationsPage() {
  const integrations = [
    {
      name: 'Shopify',
      description: 'Sync your products and process orders directly in WhatsApp.',
      icon: '🛍️',
      status: 'Connect',
      color: 'bg-green-500/10 text-green-400 border-green-500/20'
    },
    {
      name: 'Stripe',
      description: 'Send payment links and invoice reminders via WhatsApp flows.',
      icon: '💳',
      status: 'Connected',
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    {
      name: 'HubSpot',
      description: 'Two-way sync of contacts, deals, and lead scoring.',
      icon: '📊',
      status: 'Connect',
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    },
    {
      name: 'Google Sheets',
      description: 'Export all lead data instantly to a spreadsheet.',
      icon: '📄',
      status: 'Connect',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Integrations</h1>
        <p className="text-gray-400 mt-1">Connect your workspace with your favorite tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(int => (
          <div key={int.name} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition shadow-xl relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="text-4xl">{int.icon}</div>
              <span className={\`px-3 py-1 rounded-full text-xs font-semibold border \${int.color}\`}>
                {int.status}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition">{int.name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {int.description}
            </p>
            <button className="w-full py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2">
              Configure <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(pagesDir, 'AnalyticsPage.jsx'), analyticsPage);
fs.writeFileSync(path.join(pagesDir, 'IntegrationsPage.jsx'), integrationsPage);

console.log('Analytics and Integrations pages generated.');
