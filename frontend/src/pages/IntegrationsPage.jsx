import React, { useState, useEffect } from 'react';
import { ArrowTopRightOnSquareIcon, XMarkIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { integrationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const INTEGRATIONS_CONFIG = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync your products and process orders directly in WhatsApp.',
    icon: '🛍️',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    fields: [
      { name: 'shopUrl', label: 'Shopify Store URL (e.g., store.myshopify.com)', type: 'text' },
      { name: 'accessToken', label: 'Admin API Access Token', type: 'password' }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Send payment links and invoice reminders via WhatsApp flows.',
    icon: '💳',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    fields: [
      { name: 'apiKey', label: 'Secret API Key', type: 'password' }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Two-way sync of contacts, deals, and lead scoring.',
    icon: '📊',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    fields: [
      { name: 'accessToken', label: 'Private App Access Token', type: 'password' }
    ]
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export all lead data instantly to a spreadsheet.',
    icon: '📄',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    fields: [
      { name: 'spreadsheetId', label: 'Spreadsheet ID (from URL)', type: 'text' },
      { name: 'accessToken', label: 'Google Service Account JSON or Token', type: 'password' }
    ]
  }
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await integrationsAPI.getAll();
      setIntegrations(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (config) => {
    setActiveModal(config);
    setFormData({});
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await integrationsAPI.connect(activeModal.id, formData);
      toast.success(`${activeModal.name} connected successfully!`);
      closeModal();
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (platformId, name) => {
    if (!window.confirm(`Are you sure you want to disconnect ${name}?`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      toast.success(`${name} disconnected!`);
      fetchIntegrations();
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const getIntegrationStatus = (id) => {
    const found = integrations.find(i => i.platform === id);
    if (found && found.status === 'connected') return 'connected';
    return 'disconnected';
  };

  if (loading) {
    return <div className="p-6 max-w-7xl mx-auto text-white">Loading integrations...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Integrations</h1>
        <p className="text-gray-400 mt-1">Connect your workspace with your favorite tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS_CONFIG.map(int => {
          const status = getIntegrationStatus(int.id);
          const isConnected = status === 'connected';

          return (
            <div key={int.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition shadow-xl relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{int.icon}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : int.color}`}>
                  {isConnected ? 'Connected' : 'Connect'}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition">{int.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {int.description}
              </p>

              {isConnected ? (
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-gray-800 rounded-lg text-emerald-400 hover:bg-gray-700 transition flex items-center justify-center gap-2 font-medium">
                    <CheckCircleIcon className="w-5 h-5" /> Configured
                  </button>
                  <button 
                    onClick={() => handleDisconnect(int.id, int.name)}
                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                    title="Disconnect"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => openModal(int)}
                  className="w-full py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 font-medium"
                >
                  Configure <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>{activeModal.icon}</span> Connect {activeModal.name}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-6">
              <div className="space-y-5">
                {activeModal.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      placeholder={`Enter ${field.label}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect Integration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
