import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowTopRightOnSquareIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  TrashIcon, 
  SparklesIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { integrationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const INTEGRATIONS_CONFIG = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync your products and process orders directly in WhatsApp.',
    icon: '🛍️',
    color: 'from-green-500/20 to-green-500/5',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]',
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
    color: 'from-indigo-500/20 to-indigo-500/5',
    borderColor: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    fields: [
      { name: 'apiKey', label: 'Secret API Key', type: 'password' }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Two-way sync of contacts, deals, and lead scoring.',
    icon: '📊',
    color: 'from-orange-500/20 to-orange-500/5',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]',
    fields: [
      { name: 'accessToken', label: 'Private App Access Token', type: 'password' }
    ]
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export all lead data instantly to a spreadsheet.',
    icon: '📄',
    color: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    fields: [
      { name: 'spreadsheetId', label: 'Spreadsheet ID (from URL)', type: 'text' },
      { name: 'accessToken', label: 'Google Service Account JSON or Token', type: 'password' }
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Connect your WhatsApp Business API account.',
    icon: '💬',
    color: 'from-green-500/20 to-green-500/5',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]',
    route: '/app/whatsapp'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Connect Facebook Pages for messaging automation.',
    icon: '📘',
    color: 'from-blue-600/20 to-blue-600/5',
    borderColor: 'border-blue-600/30',
    textColor: 'text-blue-500',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]',
    route: '/app/automation/facebook'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Automate DM replies and story mentions.',
    icon: '📸',
    color: 'from-pink-500/20 to-pink-500/5',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]',
    route: '/app/automation/instagram'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Automate comment replies with AI.',
    icon: '▶️',
    color: 'from-red-500/20 to-red-500/5',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
    route: '/app/automation/youtube'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Automate connection requests and messaging.',
    icon: '💼',
    color: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    route: '/app/automation/linkedin'
  }
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('directory');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await integrationsAPI.getAll();
      setIntegrations(res.data?.data?.integrations || []);
    } catch (err) {
      // Don't show toast for 404 since it means no integrations found or endpoint missing
      if (err.response?.status !== 404) {
        toast.error('Failed to fetch integrations');
      }
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
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const connectedIntegrations = INTEGRATIONS_CONFIG.filter(int => getIntegrationStatus(int.id) === 'connected');
  const availableIntegrations = INTEGRATIONS_CONFIG.filter(int => getIntegrationStatus(int.id) !== 'connected');

  const renderIntegrationCard = (int) => {
    const status = getIntegrationStatus(int.id);
    const isConnected = status === 'connected';

    return (
      <div 
        key={int.id} 
        className={`group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 transition-all duration-300 ${int.hoverGlow}`}
      >
        {/* Glow Background Effect */}
        <div className={`absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br ${int.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-5">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${int.color} border ${int.borderColor} text-3xl shadow-lg`}>
              {int.icon}
            </div>
            {isConnected && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <CheckCircleIcon className="h-4 w-4" /> Connected
              </span>
            )}
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-white tracking-tight">{int.name}</h3>
          <p className="mb-8 text-sm text-slate-400 leading-relaxed flex-1">
            {int.description}
          </p>

          <div className="mt-auto">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => int.route ? navigate(int.route) : null}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 ${!int.route && 'cursor-default'}`}
                >
                  {int.route ? 'Manage App' : 'Configured'}
                </button>
                {!int.route && (
                  <button 
                    onClick={() => handleDisconnect(int.id, int.name)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                    title="Disconnect"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={() => int.route ? navigate(int.route) : openModal(int)}
                className={`group/btn flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-lg`}
              >
                {int.route ? 'Set Up Now' : 'Connect'}
                <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-70 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-50 selection:bg-purple-500/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="relative mb-12">
          {/* Subtle background glow */}
          <div className="absolute left-1/2 top-0 -z-10 h-[200px] w-[500px] -translate-x-1/2 bg-purple-500/20 blur-[120px] rounded-full"></div>
          
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">
                App Integrations
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Supercharge your workflow by connecting your favorite tools and platforms directly to your workspace.
            </p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="mb-10 flex justify-center">
          <div className="flex space-x-2 rounded-full bg-white/5 p-1 backdrop-blur-md border border-white/10">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeTab === 'directory' 
                  ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <PuzzlePieceIcon className="h-4 w-4" /> App Directory
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeTab === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <CheckCircleIcon className="h-4 w-4" /> Connected Apps 
              {connectedIntegrations.length > 0 && (
                <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/30 text-xs font-bold text-emerald-200">
                  {connectedIntegrations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'connected' && (
            <div>
              {connectedIntegrations.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {connectedIntegrations.map(renderIntegrationCard)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-24 backdrop-blur-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4 border border-white/10 shadow-inner">
                    <SparklesIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No connected apps yet</h3>
                  <p className="text-slate-400 text-center max-w-sm mb-6">
                    Connect apps from the directory to start automating your workflows and syncing data.
                  </p>
                  <button 
                    onClick={() => setActiveTab('directory')}
                    className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:bg-purple-500 hover:scale-105"
                  >
                    Browse App Directory
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {availableIntegrations.map(renderIntegrationCard)}
              {/* Also show connected ones here slightly dimmed or at the bottom? User preferred them separate. So we just show available. */}
              {availableIntegrations.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                    <CheckCircleIcon className="h-16 w-16 text-emerald-400 mb-4 opacity-50" />
                    <h3 className="text-2xl font-bold text-white mb-2">You've connected everything!</h3>
                    <p className="text-slate-400">All available apps are currently connected to your workspace.</p>
                 </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Connection Modal (Glassmorphic) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111116] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`h-2 w-full bg-gradient-to-r ${activeModal.color.replace('from-', 'from-').replace('to-', 'to-')}`}></div>
            
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">{activeModal.icon}</span> Connect {activeModal.name}
              </h2>
              <button 
                onClick={closeModal} 
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-6">
              <div className="space-y-5">
                {activeModal.fields.map((field) => (
                  <div key={field.name}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      required
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-purple-500 hover:to-indigo-500 ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'}`}
                >
                  {isSubmitting ? 'Connecting...' : 'Connect App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
