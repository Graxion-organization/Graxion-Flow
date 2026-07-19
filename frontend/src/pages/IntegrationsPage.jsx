import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ExternalLink, 
  X, 
  CheckCircle2, 
  Trash2, 
  Sparkles,
  Puzzle,
  Search,
  ShoppingCart,
  CreditCard,
  Database,
  Table,
  MessageSquare,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Filter,
  Loader2,
  Settings2,
  ArrowRight
} from 'lucide-react';
import { integrationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Social', 'E-commerce', 'Payment', 'CRM', 'Productivity'];

const INTEGRATIONS_CONFIG = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'Social',
    description: 'Connect your WhatsApp Business API account for automated messaging and broadcasts.',
    icon: MessageSquare,
    color: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    route: '/app/whatsapp'
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    category: 'Social',
    description: 'Connect Facebook Pages for messaging automation, auto-replies, and AI handling.',
    icon: Facebook,
    color: 'from-blue-600/20 to-blue-600/5',
    borderColor: 'border-blue-600/30',
    textColor: 'text-blue-500',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]',
    route: '/app/automation/facebook'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social',
    description: 'Automate DM replies, story mentions, and post comments seamlessly.',
    icon: Instagram,
    color: 'from-pink-500/20 to-pink-500/5',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]',
    route: '/app/automation/instagram'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Social',
    description: 'Automate comment replies and engage with your audience 24/7 using AI.',
    icon: Youtube,
    color: 'from-red-500/20 to-red-500/5',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
    route: '/app/automation/youtube'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Social',
    description: 'Automate connection requests, messaging, and view detailed post analytics.',
    icon: Linkedin,
    color: 'from-blue-400/20 to-blue-400/5',
    borderColor: 'border-blue-400/30',
    textColor: 'text-blue-400',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.15)]',
    route: '/app/automation/linkedin'
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'E-commerce',
    description: 'Sync your products, process orders, and send cart recovery messages.',
    icon: ShoppingCart,
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
    category: 'Payment',
    description: 'Generate payment links and send automated invoice reminders directly.',
    icon: CreditCard,
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
    category: 'CRM',
    description: 'Two-way sync of contacts, deals, and utilize AI-driven lead scoring.',
    icon: Database,
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
    category: 'Productivity',
    description: 'Export all your captured leads and chat logs instantly to a spreadsheet.',
    icon: Table,
    color: 'from-emerald-600/20 to-emerald-600/5',
    borderColor: 'border-emerald-600/30',
    textColor: 'text-emerald-500',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(5,150,105,0.15)]',
    fields: [
      { name: 'spreadsheetId', label: 'Spreadsheet ID (from URL)', type: 'text' },
      { name: 'accessToken', label: 'Google Service Account JSON or Token', type: 'password' }
    ]
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let isMounted = true;
    const fetchIntegrations = async () => {
      try {
        const res = await integrationsAPI.getAll();
        if (isMounted) {
          setIntegrations(res.data?.data?.integrations || []);
        }
      } catch (err) {
        if (isMounted && err?.response?.status !== 404 && err?.response?.status !== 401) {
          console.error('Failed to fetch integrations:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchIntegrations();
    return () => { isMounted = false; };
  }, []);

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
      
      const res = await integrationsAPI.getAll();
      setIntegrations(res.data?.data?.integrations || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (platformId, name) => {
    if (!window.confirm(`Are you sure you want to disconnect ${name}? This may interrupt active workflows.`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      toast.success(`${name} disconnected!`);
      
      const res = await integrationsAPI.getAll();
      setIntegrations(res.data?.data?.integrations || []);
    } catch (err) {
      toast.error('Failed to disconnect application');
    }
  };

  const getIntegrationStatus = (id) => {
    const found = integrations.find(i => i.platform === id);
    if (found && found.status === 'connected') return 'connected';
    return 'disconnected';
  };

  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS_CONFIG;
    
    // Apply tab filter
    if (activeTab === 'connected') {
      filtered = filtered.filter(int => getIntegrationStatus(int.id) === 'connected');
    } else {
      filtered = filtered.filter(int => getIntegrationStatus(int.id) !== 'connected');
    }
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(int => int.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(int => 
        int.name.toLowerCase().includes(q) || 
        int.description.toLowerCase().includes(q) ||
        int.category.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [integrations, activeTab, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-purple-500 h-10 w-10" />
      </div>
    );
  }

  const connectedCount = INTEGRATIONS_CONFIG.filter(int => getIntegrationStatus(int.id) === 'connected').length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        
        {/* Modern Header Section */}
        <div className="relative mb-12 rounded-3xl overflow-hidden bg-gradient-to-b from-purple-500/10 to-transparent border border-white/5 p-8 sm:p-12">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -z-10 h-[300px] w-[500px] bg-purple-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[500px] bg-blue-500/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white mb-4 flex items-center gap-4">
              <Puzzle className="h-10 w-10 text-purple-400" />
              Integration Hub
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Supercharge your workspace by seamlessly connecting your favorite applications, 
              automating workflows, and centralizing your customer data.
            </p>
          </div>
        </div>

        {/* Filters and Navigation */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
          {/* Custom Tabs */}
          <div className="flex w-full lg:w-auto p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === 'directory' 
                  ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Puzzle className="h-4 w-4" /> App Directory
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" /> Connected Apps 
              {connectedCount > 0 && (
                <span className="ml-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-emerald-500/30 text-xs font-bold text-emerald-200">
                  {connectedCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredIntegrations.map((int) => {
                const isConnected = getIntegrationStatus(int.id) === 'connected';
                const Icon = int.icon;
                
                return (
                  <div 
                    key={int.id} 
                    className={`group relative flex flex-col rounded-3xl bg-white/[0.02] border border-white/5 p-6 transition-all duration-300 hover:bg-white/[0.04] ${int.hoverGlow}`}
                  >
                    {/* Top Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${int.color} border ${int.borderColor} shadow-lg`}>
                        <Icon className={`h-7 w-7 ${int.textColor}`} strokeWidth={1.5} />
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-400 border border-white/10">
                          {int.category}
                        </span>
                      )}
                    </div>
                    
                    {/* Content Section */}
                    <div className="mb-6 flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">{int.name}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                        {int.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                      {isConnected ? (
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => int.route ? navigate(int.route) : null}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20 ${!int.route && 'cursor-default opacity-80'}`}
                          >
                            {int.route ? (
                              <>
                                <Settings2 className="h-4 w-4" /> Manage
                              </>
                            ) : (
                              'Configured'
                            )}
                          </button>
                          {!int.route && (
                            <button 
                              onClick={() => handleDisconnect(int.id, int.name)}
                              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                              title="Disconnect Integration"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => int.route ? navigate(int.route) : openModal(int)}
                          className={`group/btn flex w-full items-center justify-between rounded-xl bg-purple-600/10 border border-purple-500/30 px-5 py-3 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-600 hover:text-white hover:border-purple-500`}
                        >
                          <span>{int.route ? 'Start Setup' : 'Connect Integration'}</span>
                          <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4 shadow-inner">
                {activeTab === 'connected' ? (
                  <Sparkles className="h-8 w-8 text-slate-400" />
                ) : (
                  <Search className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {activeTab === 'connected' 
                  ? "No connected apps yet" 
                  : "No applications found"}
              </h3>
              <p className="text-slate-400 max-w-sm mx-auto mb-6">
                {activeTab === 'connected'
                  ? "Connect applications from the directory to start automating your workflows."
                  : "Try adjusting your search query or category filter to find what you're looking for."}
              </p>
              {activeTab === 'connected' && (
                <button 
                  onClick={() => setActiveTab('directory')}
                  className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 hover:scale-105"
                >
                  Browse App Directory
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Modern Connection Modal (Glassmorphic) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${activeModal.color.replace('from-', 'from-').replace('to-', 'to-')}`}></div>
            
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${activeModal.color}`}>
                  <activeModal.icon className={`h-5 w-5 ${activeModal.textColor}`} />
                </div>
                <h2 className="text-lg font-bold text-white">Connect {activeModal.name}</h2>
              </div>
              <button 
                onClick={closeModal} 
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-6">
              <div className="space-y-5">
                {activeModal.fields.map((field) => (
                  <div key={field.name}>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      required
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:bg-purple-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
                    </>
                  ) : (
                    'Connect Integration'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
