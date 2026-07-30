import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  CheckCircle2, 
  Trash2, 
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
  Send,
  Loader2,
  ArrowRight,
  HelpCircle,
  Workflow,
  Plus
} from 'lucide-react';
import { integrationsAPI, socialHubAPI, whatsappAPI, facebookAPI, instagramAPI, telegramAPI, youtubeAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Social Channels', 'Data & Business'];

const INTEGRATIONS_CONFIG = [
  // Messaging Channels (OAuth / Dialog Setup based)
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    type: 'channel',
    category: 'Social Channels',
    description: 'Automate WhatsApp Business API chats with AI agents, send broadcasts, and manage campaigns.',
    icon: MessageSquare,
    color: 'from-emerald-500/10 to-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    accentColor: '#10b981',
    features: ['Official API Support', 'Interactive Flow Builder', 'AI Agent Responses']
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    type: 'channel',
    category: 'Social Channels',
    description: 'Integrate Facebook Page Messenger to handle user queries via AI copilot automatically.',
    icon: Facebook,
    color: 'from-blue-600/10 to-blue-600/5',
    borderColor: 'border-blue-600/20',
    textColor: 'text-blue-400',
    accentColor: '#2563eb',
    features: ['Page Comment Replies', 'Direct Message Automation', 'Instant Leads Sync']
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    type: 'channel',
    category: 'Social Channels',
    description: 'Drive automated interactions via Instagram Direct Messages, story mentions, and comment replies.',
    icon: Instagram,
    color: 'from-pink-500/10 to-pink-500/5',
    borderColor: 'border-pink-500/20',
    textColor: 'text-pink-400',
    accentColor: '#ec4899',
    features: ['DM Auto-Response', 'Story Mention Trigger', 'Comment to DM Flow']
  },
  {
    id: 'youtube',
    name: 'YouTube Comments',
    type: 'channel',
    category: 'Social Channels',
    description: 'Engage with YouTube viewers 24/7 by automating comment moderation and AI agent replies.',
    icon: Youtube,
    color: 'from-red-500/10 to-red-500/5',
    borderColor: 'border-red-500/20',
    textColor: 'text-red-400',
    accentColor: '#ef4444',
    features: ['Realtime Comment Sync', 'AI Smart Moderation', 'Subscribe Reminder Automations']
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Automation',
    type: 'channel',
    category: 'Social Channels',
    description: 'Enhance B2B client acquisition with automated connection requests and message automation.',
    icon: Linkedin,
    color: 'from-sky-500/10 to-sky-500/5',
    borderColor: 'border-sky-500/20',
    textColor: 'text-sky-400',
    accentColor: '#0ea5e9',
    features: ['Auto Connection Invites', 'AI Warm Outreach Messages', 'Post Engagement Tracking']
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    type: 'channel',
    category: 'Social Channels',
    description: 'Connect Telegram bots to AI agents for automated client chat support.',
    icon: Send,
    color: 'from-blue-400/10 to-blue-400/5',
    borderColor: 'border-blue-400/20',
    textColor: 'text-blue-300',
    accentColor: '#38bdf8',
    features: ['Instant Bot Reply', 'AI Assistant Setup', 'Group & Channel Moderation']
  },

  // Tools & External Apps (API Key based)
  {
    id: 'shopify',
    name: 'Shopify Store',
    type: 'tool',
    category: 'Data & Business',
    description: 'Sync customer orders, check product stock levels, and send abandoned cart notifications.',
    icon: ShoppingCart,
    color: 'from-lime-500/10 to-lime-500/5',
    borderColor: 'border-lime-500/20',
    textColor: 'text-lime-400',
    accentColor: '#84cc16',
    features: ['Order Sync & Status', 'Abandoned Cart Recovery', 'Inventory Notification Alerts'],
    fields: [
      { 
        name: 'shopUrl', 
        label: 'Shopify Store URL', 
        type: 'text',
        placeholder: 'your-store.myshopify.com',
        helpText: 'The main .myshopify.com subdomain of your online store.'
      },
      { 
        name: 'accessToken', 
        label: 'Admin API Access Token', 
        type: 'password',
        placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx',
        helpText: 'Generated inside your Shopify Admin under Settings > Apps and sales channels > Develop apps.'
      }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    type: 'tool',
    category: 'Data & Business',
    description: 'Send payment links, track invoice status, and automatically alert customers on failures.',
    icon: CreditCard,
    color: 'from-violet-500/10 to-violet-500/5',
    borderColor: 'border-violet-500/20',
    textColor: 'text-violet-400',
    accentColor: '#8b5cf6',
    features: ['Direct Checkout Links', 'Automatic Invoice Alerts', 'Subscription State Sync'],
    fields: [
      { 
        name: 'apiKey', 
        label: 'Stripe Secret API Key', 
        type: 'password',
        placeholder: 'sk_test_xxxxxxxxxx / sk_live_xxxxxxxxxx',
        helpText: 'Obtained from your Stripe Dashboard under Developers > API Keys.'
      }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    type: 'tool',
    category: 'Data & Business',
    description: 'Seamlessly export fresh leads, update customer timeline notes, and sync deal status.',
    icon: Database,
    color: 'from-orange-500/10 to-orange-500/5',
    borderColor: 'border-orange-500/20',
    textColor: 'text-orange-400',
    accentColor: '#f97316',
    features: ['Contact Synchronization', 'Custom Timeline Activities', 'Deal pipeline updates'],
    fields: [
      { 
        name: 'accessToken', 
        label: 'Private App Access Token', 
        type: 'password',
        placeholder: 'pat-na1-xxxxxxxxxxxxxxxxxxxxxxxx',
        helpText: 'Generate a Private App inside HubSpot Settings > Integrations > Private Apps.'
      }
    ]
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    type: 'tool',
    category: 'Data & Business',
    description: 'Log new customer details, campaign signups, and conversation metadata to spreadsheets.',
    icon: Table,
    color: 'from-emerald-600/10 to-emerald-600/5',
    borderColor: 'border-emerald-600/20',
    textColor: 'text-emerald-500',
    accentColor: '#059669',
    features: ['Export Contact Lists', 'Log Broadcast Responses', 'Custom Sheets Formatting'],
    fields: [
      { 
        name: 'spreadsheetId', 
        label: 'Spreadsheet ID', 
        type: 'text',
        placeholder: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ...',
        helpText: 'The long alphanumeric string between /d/ and /edit in your Google Sheet URL.'
      },
      { 
        name: 'accessToken', 
        label: 'Google OAuth API Access Token', 
        type: 'password',
        placeholder: 'ya29.a0AfB_...',
        helpText: 'Google Cloud console OAuth credential token for Spreadsheet API access.'
      }
    ]
  }
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp Embedded Setup specific variables
  const [whatsappSetupStep, setWhatsappSetupStep] = useState('picker'); // 'picker' (choose OAuth/Manual) | 'manual' | 'picking'
  const [whatsappPhoneNumbers, setWhatsappPhoneNumbers] = useState([]);
  const [whatsappLongLivedToken, setWhatsappLongLivedToken] = useState('');
  const [selectedWhatsappPhone, setSelectedWhatsappPhone] = useState(null);

  // Facebook Connection specific variables
  const [facebookSetupMethod, setFacebookSetupMethod] = useState('oauth'); // 'oauth' | 'manual'

  // Instagram Connection specific variables
  const [instagramSetupMethod, setInstagramSetupMethod] = useState('oauth'); // 'oauth' | 'manual'

  const loadData = async () => {
    try {
      const [integrationsRes, socialAccountsRes] = await Promise.all([
        integrationsAPI.getAll(),
        socialHubAPI.getAccounts()
      ]);
      setIntegrations(integrationsRes.data?.data || []);
      setSocialAccounts(socialAccountsRes.data?.data || []);
    } catch (err) {
      if (err?.response?.status !== 404 && err?.response?.status !== 401) {
        console.error('Failed to load integrations:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Load Facebook SDK
    import('../utils/scriptLoader').then(({ loadFbSdk }) => loadFbSdk().catch(() => {}));
  }, []);

  // Capture callback state from WhatsApp embedded signup
  useEffect(() => {
    const storedData = localStorage.getItem("wa_data");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.phoneNumbers && parsed.phoneNumbers.length > 0) {
          setWhatsappLongLivedToken(parsed.longLivedToken);
          setWhatsappPhoneNumbers(parsed.phoneNumbers);
          const waConfig = INTEGRATIONS_CONFIG.find(i => i.id === 'whatsapp');
          setActiveModal(waConfig);
          setWhatsappSetupStep('picking');
        }
      } catch (err) {
        console.error("Failed to parse wa_data", err);
      }
      localStorage.removeItem("wa_data");
    }
  }, []);

  const openModal = (config) => {
    setActiveModal(config);
    setFormData({});
    setWhatsappSetupStep('picker');
    setFacebookSetupMethod('oauth');
    setInstagramSetupMethod('oauth');
    setSelectedWhatsappPhone(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submission handler for forms
  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const platform = activeModal.id;
      if (platform === 'whatsapp') {
        if (whatsappSetupStep === 'manual') {
          const payload = {
            phoneNumberId: formData.phoneNumberId,
            wabaId: formData.wabaId,
            displayPhoneNumber: formData.displayPhoneNumber,
            accessToken: formData.accessToken,
            verifiedName: formData.verifiedName
          };
          await whatsappAPI.connect(payload);
        } else if (whatsappSetupStep === 'picking') {
          if (!selectedWhatsappPhone) {
            toast.error('Please select a phone number to connect.');
            setIsSubmitting(false);
            return;
          }
          await whatsappAPI.embeddedSignupSave({ ...selectedWhatsappPhone, accessToken: whatsappLongLivedToken });
        }
      } else if (platform === 'facebook') {
        await facebookAPI.autoConnect(formData.accessToken);
      } else if (platform === 'instagram') {
        await instagramAPI.connect(formData);
      } else if (platform === 'telegram') {
        await telegramAPI.connect(formData);
      } else {
        // Shopify, Stripe, HubSpot, Google Sheets
        await integrationsAPI.connect(platform, formData);
      }
      toast.success(`${activeModal.name} integrated successfully!`);
      closeModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OAuth redirects
  const handleYoutubeConnect = async () => {
    try {
      const res = await youtubeAPI.getAuthUrl();
      if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
        toast.error('API Route not found. Please restart your backend server.');
        return;
      }
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Google Auth URL not found');
      }
    } catch (err) {
      toast.error('Failed to get authorization URL');
    }
  };

  const handleLinkedinConnect = async () => {
    try {
      const res = await socialHubAPI.getLinkedInAuthUrl();
      if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
        toast.error('API Route not found. Please restart your backend server.');
        return;
      }
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('LinkedIn Auth URL not found');
      }
    } catch (err) {
      toast.error('Failed to get authorization URL');
    }
  };

  const handleWhatsappEmbeddedSignup = () => {
    const META_APP_ID = process.env.REACT_APP_META_APP_ID;
    const META_CONFIG_ID = process.env.REACT_APP_META_CONFIG_ID;
    if (!META_APP_ID) {
      toast.error("META APP ID missing in environment");
      return;
    }
    const redirectUriUrl = window.location.origin + "/callback";
    const redirectUri = encodeURIComponent(redirectUriUrl);
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&response_type=code&config_id=${META_CONFIG_ID}&scope=whatsapp_business_management,whatsapp_business_messaging`;
    window.location.href = url;
  };

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please wait a moment and try again.');
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          handleFacebookAutoConnect(response.authResponse.accessToken);
        } else {
          toast.error('Facebook login cancelled or permission denied.');
        }
      },
      { scope: 'pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,public_profile', return_scopes: true }
    );
  };

  const handleFacebookAutoConnect = async (token) => {
    setIsSubmitting(true);
    try {
      await facebookAPI.autoConnect(token);
      toast.success('Facebook pages connected successfully!');
      closeModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect automatically.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstagramLogin = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please wait a moment and try again.');
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          handleInstagramAutoConnect(response.authResponse.accessToken);
        } else {
          toast.error('Facebook login for Instagram cancelled.');
        }
      },
      { scope: 'instagram_basic,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement,pages_manage_metadata,public_profile', return_scopes: true }
    );
  };

  const handleInstagramAutoConnect = async (token) => {
    setIsSubmitting(true);
    try {
      await instagramAPI.autoConnect({ accessToken: token });
      toast.success('Instagram Account connected successfully!');
      closeModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to auto-connect Instagram Account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disconnect Channel handlers
  const handleDisconnectChannel = async (acc) => {
    if (!window.confirm(`Disconnect ${acc.name} from this workspace?`)) return;
    try {
      if (acc.platform === 'whatsapp') {
        await whatsappAPI.disconnect(acc.modelId);
      } else if (acc.platform === 'facebook') {
        await facebookAPI.disconnectAccount(acc.modelId);
      } else if (acc.platform === 'instagram') {
        await instagramAPI.disconnect(acc.modelId);
      } else if (acc.platform === 'telegram') {
        await telegramAPI.disconnect(acc.modelId);
      } else if (acc.platform === 'youtube') {
        await youtubeAPI.disconnect();
      } else if (acc.platform === 'linkedin') {
        await socialHubAPI.disconnectLinkedIn(acc.modelId);
      }
      toast.success(`${acc.name} disconnected successfully!`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect account');
    }
  };

  // Disconnect Tool handlers
  const handleDisconnectTool = async (platformId, name) => {
    if (!window.confirm(`Disconnect ${name}? This will stop related automations.`)) return;
    try {
      await integrationsAPI.disconnect(platformId);
      toast.success(`${name} disconnected.`);
      loadData();
    } catch (err) {
      toast.error('Failed to disconnect application');
    }
  };

  const getIntegrationData = (id) => {
    return integrations.find(i => i.platform === id);
  };

  const getConnectedAccounts = (platform) => {
    return socialAccounts.filter(acc => acc.platform === platform);
  };

  const filteredIntegrations = useMemo(() => {
    return INTEGRATIONS_CONFIG.filter(int => {
      // Apply category filter
      if (selectedCategory !== 'All' && int.category !== selectedCategory) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          int.name.toLowerCase().includes(q) || 
          int.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6A00] h-9 w-9" />
          <p className="text-sm text-slate-400 font-medium">Loading integration panel...</p>
        </div>
      </div>
    );
  }

  const activeSocialCount = socialAccounts.length;
  const activeToolCount = integrations.filter(int => int.status === 'connected').length;
  const totalActive = activeSocialCount + activeToolCount;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Workflow className="h-6 w-6 text-[#FF6A00]" />
            App Store & Integrations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect external apps and messaging channels to automate workflows and unify customer data.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            API Status: Operational
          </div>
          {totalActive > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/20 text-xs font-bold text-[#FF6A00]">
              {totalActive} Active Connections
            </div>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                selectedCategory === category
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#FF6A00]/50 focus:border-[#FF6A00] transition-all"
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredIntegrations.map((int) => {
          let isConnected = false;
          let connectedLabel = '';
          let connectedDetails = null;

          if (int.type === 'channel') {
            const connectedAccounts = getConnectedAccounts(int.id);
            isConnected = connectedAccounts.length > 0;
            if (isConnected) {
              connectedLabel = `${connectedAccounts.length} Connected`;
              connectedDetails = (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Linked Accounts</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {connectedAccounts.map((acc) => (
                      <div key={acc.id} className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-lg p-2 text-xs">
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-200 font-bold truncate max-w-[160px]">{acc.name}</span>
                          <span className="text-[9px] text-slate-400">{acc.type}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnectChannel(acc)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-all border border-red-500/20 hover:border-transparent"
                          title="Disconnect Account"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          } else {
            const dbInt = getIntegrationData(int.id);
            isConnected = dbInt?.status === 'connected';
            if (isConnected) {
              connectedLabel = 'Active';
              connectedDetails = (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Sync Status</span>
                    <span className="text-emerald-400 font-bold">Synced</span>
                  </div>
                  {dbInt.shopUrl && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Store URL</span>
                      <span className="text-[#FF6A00] font-bold truncate max-w-[150px]" title={dbInt.shopUrl}>
                        {dbInt.shopUrl}
                      </span>
                    </div>
                  )}
                  {dbInt.spreadsheetId && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Spreadsheet ID</span>
                      <span className="text-slate-300 font-bold truncate max-w-[150px]" title={dbInt.spreadsheetId}>
                        {dbInt.spreadsheetId}
                      </span>
                    </div>
                  )}
                </div>
              );
            }
          }

          const Icon = int.icon;
          
          return (
            <div 
              key={int.id}
              className={`group flex flex-col justify-between rounded-2xl bg-slate-900/40 border border-white/5 p-6 transition-all duration-300 hover:border-white/10 ${
                isConnected ? 'shadow-[0_0_20px_rgba(34,197,94,0.03)]' : ''
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${int.color} border ${int.borderColor} shadow-inner`}>
                      <Icon className={`h-6 w-6 ${int.textColor}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{int.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{int.category}</span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {connectedLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-400 border border-white/10">
                      Ready
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-5">
                  {int.description}
                </p>

                {/* Features Checklist */}
                <div className="space-y-2 mb-6">
                  {int.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Detail View of Connection */}
                {connectedDetails}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-white/5 mt-6 flex items-center justify-between gap-3">
                {int.type === 'channel' ? (
                  <>
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => openModal(int)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                        >
                          <Plus size={13} /> Connect Additional
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openModal(int)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 px-4 py-2.5 text-xs font-semibold text-[#FF6A00] transition-all hover:bg-[#FF6A00] hover:text-white hover:border-transparent group/btn"
                      >
                        <span>Configure Integration</span>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => openModal(int)}
                          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                        >
                          Modify Setup
                        </button>
                        <button
                          onClick={() => handleDisconnectTool(int.id, int.name)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 transition-all hover:bg-red-500 hover:text-white hover:border-transparent"
                          title="Disconnect Integration"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openModal(int)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 px-4 py-2.5 text-xs font-semibold text-[#FF6A00] transition-all hover:bg-[#FF6A00] hover:text-white hover:border-transparent"
                      >
                        Connect Workspace
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
          <HelpCircle className="h-10 w-10 text-slate-500 mb-3" />
          <h4 className="text-white font-bold mb-1 text-sm">No Integrations Found</h4>
          <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
            We couldn't find any app matching your search criteria. Try modifying your filters.
          </p>
        </div>
      )}

      {/* Setup Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>
          
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Top colored border */}
            <div className="h-1" style={{ backgroundColor: activeModal.accentColor }}></div>
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${activeModal.color}`}>
                  <activeModal.icon className={`h-5 w-5 ${activeModal.textColor}`} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Setup {activeModal.name}</h2>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Connection Window</span>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Platform Setup Conditionals */}

            {/* 1. WHATSAPP SETUP */}
            {activeModal.id === 'whatsapp' && (
              <div className="p-6 space-y-4">
                {whatsappSetupStep === 'picker' && (
                  <div className="space-y-3">
                    <button
                      onClick={handleWhatsappEmbeddedSignup}
                      className="w-full flex items-center justify-center gap-3 bg-[#FF6A00] hover:bg-[#ff7b1a] text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-[#FF6A00]/25"
                    >
                      <Facebook size={16} /> Connect via Facebook (Embedded Signup)
                    </button>
                    
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Or Connect Manually</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    <button
                      onClick={() => setWhatsappSetupStep('manual')}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs transition-all"
                    >
                      Enter Permanent API Tokens manually
                    </button>
                  </div>
                )}

                {whatsappSetupStep === 'manual' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Phone Number ID</label>
                        <input
                          type="text"
                          name="phoneNumberId"
                          required
                          value={formData.phoneNumberId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 1234567890123"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">WABA ID</label>
                        <input
                          type="text"
                          name="wabaId"
                          required
                          value={formData.wabaId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="WhatsApp Business Account ID"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Display Phone Number</label>
                        <input
                          type="text"
                          name="displayPhoneNumber"
                          required
                          value={formData.displayPhoneNumber || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., +1 555-0100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Display Name (optional)</label>
                        <input
                          type="text"
                          name="verifiedName"
                          value={formData.verifiedName || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., My Business"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">System User Access Token</label>
                      <textarea
                        name="accessToken"
                        required
                        rows={3}
                        value={formData.accessToken || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
                        placeholder="EAABm..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setWhatsappSetupStep('picker')}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white hover:bg-white/10 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-white font-semibold text-xs transition-all shadow-md"
                      >
                        {isSubmitting ? 'Connecting...' : 'Connect Manually'}
                      </button>
                    </div>
                  </form>
                )}

                {whatsappSetupStep === 'picking' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <span className="text-xs text-slate-400 block font-medium">Select the phone number you want to hook up:</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {whatsappPhoneNumbers.map((phone) => (
                        <button
                          key={phone.phoneNumberId}
                          type="button"
                          onClick={() => setSelectedWhatsappPhone(phone)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${
                            selectedWhatsappPhone?.phoneNumberId === phone.phoneNumberId 
                              ? 'border-[#FF6A00] bg-[#FF6A00]/5 text-white' 
                              : 'border-white/5 bg-white/[0.01] hover:border-white/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-white">{phone.displayPhoneNumber}</p>
                            <p className="text-[10px] text-slate-400">{phone.verifiedName || 'No Display Name'}</p>
                            <p className="text-[9px] text-slate-500 font-mono">WABA ID: {phone.wabaId}</p>
                          </div>
                          {selectedWhatsappPhone?.phoneNumberId === phone.phoneNumberId && (
                            <CheckCircle2 className="h-4 w-4 text-[#FF6A00]" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedWhatsappPhone || isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Connect Number'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2. FACEBOOK MESSENGER SETUP */}
            {activeModal.id === 'facebook' && (
              <div className="p-6 space-y-4">
                <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-2">
                  <button
                    onClick={() => setFacebookSetupMethod('oauth')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      facebookSetupMethod === 'oauth' ? 'bg-[#FF6A00] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OAuth Connect
                  </button>
                  <button
                    onClick={() => setFacebookSetupMethod('manual')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      facebookSetupMethod === 'manual' ? 'bg-[#FF6A00] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual Token
                  </button>
                </div>

                {facebookSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-400 leading-normal">
                      Connect your Facebook Pages using the standard popup login. We will automatically fetch and list all your pages.
                    </p>
                    <button
                      onClick={handleFacebookLogin}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Facebook size={16} />
                      )}
                      <span>Connect with Facebook</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Facebook Access Token
                      </label>
                      <textarea
                        name="accessToken"
                        required
                        rows={4}
                        value={formData.accessToken || ''}
                        onChange={handleInputChange}
                        className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
                        placeholder="EAABm..."
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Provide a Facebook User or Page Access Token with `pages_manage_metadata` & `pages_show_list` permissions.
                      </p>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-xs text-white transition hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Connect Page'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 3. INSTAGRAM SETUP */}
            {activeModal.id === 'instagram' && (
              <div className="p-6 space-y-4">
                <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-2">
                  <button
                    onClick={() => setInstagramSetupMethod('oauth')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      instagramSetupMethod === 'oauth' ? 'bg-[#FF6A00] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OAuth Connect
                  </button>
                  <button
                    onClick={() => setInstagramSetupMethod('manual')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      instagramSetupMethod === 'manual' ? 'bg-[#FF6A00] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual Inputs
                  </button>
                </div>

                {instagramSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-400 leading-normal">
                      Connect your Instagram Business accounts linked to your Facebook Pages. We will automatically discover and link them.
                    </p>
                    <button
                      onClick={handleInstagramLogin}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Instagram size={16} />
                      )}
                      <span>Connect with Instagram via Meta</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Instagram Account ID</label>
                        <input
                          type="text"
                          name="igAccountId"
                          required
                          value={formData.igAccountId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 178414..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Facebook Page ID</label>
                        <input
                          type="text"
                          name="pageId"
                          required
                          value={formData.pageId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 10103..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Instagram Username (optional)</label>
                      <input
                        type="text"
                        name="igUsername"
                        value={formData.igUsername || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                        placeholder="e.g., @my_brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Page Access Token</label>
                      <textarea
                        name="pageAccessToken"
                        required
                        rows={3}
                        value={formData.pageAccessToken || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
                        placeholder="EAABm..."
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-xs text-white transition hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Connect Instagram'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 4. TELEGRAM BOT SETUP */}
            {activeModal.id === 'telegram' && (
              <form onSubmit={handleConnectSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    name="botToken"
                    required
                    value={formData.botToken || ''}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                    placeholder="e.g. 1234567890:AAH_XXXXXXXXXXXXXXX"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Obtained from Telegram BotFather when you create your custom Telegram Bot.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-xs text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Connecting...' : 'Connect Bot'}
                  </button>
                </div>
              </form>
            )}

            {/* 5. YOUTUBE OAUTH SETUP */}
            {activeModal.id === 'youtube' && (
              <div className="p-6 space-y-4 text-center py-6">
                <p className="text-xs text-slate-400 leading-normal">
                  Connect your YouTube Channel via Google Account. We will synchronize comment replies and enable AI automation on your videos.
                </p>
                <button
                  onClick={handleYoutubeConnect}
                  className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-red-600/25"
                >
                  <Youtube size={16} />
                  <span>Authorize YouTube Channel</span>
                </button>
              </div>
            )}

            {/* 6. LINKEDIN OAUTH SETUP */}
            {activeModal.id === 'linkedin' && (
              <div className="p-6 space-y-4 text-center py-6">
                <p className="text-xs text-slate-400 leading-normal">
                  Authenticate your LinkedIn account to sync outreach, connection updates, and post analytics automatically.
                </p>
                <button
                  onClick={handleLinkedinConnect}
                  className="w-full flex items-center justify-center gap-3 bg-[#0077b5] hover:bg-[#00669c] text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-[#0077b5]/25"
                >
                  <Linkedin size={16} />
                  <span>Authorize LinkedIn Profile</span>
                </button>
              </div>
            )}

            {/* 7. STANDARD TOOLS (Shopify, Stripe, HubSpot, Google Sheets) */}
            {!['whatsapp', 'facebook', 'instagram', 'telegram', 'youtube', 'linkedin'].includes(activeModal.id) && (
              <form onSubmit={handleConnectSubmit} className="p-6 space-y-5">
                <div className="space-y-4">
                  {activeModal.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">
                          {field.label}
                        </label>
                        {field.helpText && (
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200 cursor-pointer" />
                            <div className="absolute right-0 bottom-full mb-2 w-48 hidden group-hover:block bg-slate-900 border border-white/10 rounded-lg p-2.5 text-[10px] text-slate-400 leading-normal shadow-xl z-50">
                              {field.helpText}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type={field.type}
                        name={field.name}
                        required
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-600 transition focus:border-[#FF6A00] focus:outline-none focus:ring-1 focus:ring-[#FF6A00]"
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl bg-white/5 border border-white/5 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-[#FF6A00]/20 transition hover:bg-[#ff7b1a] hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Integration'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
