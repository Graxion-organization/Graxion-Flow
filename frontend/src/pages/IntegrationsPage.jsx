import React from 'react';
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
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${int.color}`}>
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
