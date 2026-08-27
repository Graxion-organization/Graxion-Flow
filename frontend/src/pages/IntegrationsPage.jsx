import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    features: ['Official API Support', 'Interactive Flow Builder', 'AI Agent Responses'],
    permissions: [
      { name: 'whatsapp_business_management', purpose: 'Allows reading and managing your WhatsApp Business metadata.' },
      { name: 'whatsapp_business_messaging', purpose: 'Enables sending and receiving messages on behalf of your WhatsApp Business account.' },
      { name: 'business_management', purpose: 'Required to access Facebook Business Manager for account verification.' }
    ]
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
    features: ['Page Comment Replies', 'Direct Message Automation', 'Instant Leads Sync'],
    permissions: [
      { name: 'pages_show_list', purpose: 'Allows the system to see the list of Pages you manage.' },
      { name: 'pages_manage_metadata', purpose: 'Needed to subscribe to webhooks and manage page settings.' },
      { name: 'pages_read_engagement', purpose: 'Allows reading comments and interactions on your Page.' },
      { name: 'pages_manage_posts', purpose: 'Required to reply to comments and manage posts.' },
      { name: 'pages_messaging', purpose: 'Core permission required to send and receive direct messages.' },
      { name: 'public_profile', purpose: 'Used to read basic public profile details.' }
    ]
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
    features: ['DM Auto-Response', 'Story Mention Trigger', 'Comment to DM Flow'],
    permissions: [
      { name: 'instagram_basic', purpose: 'Reads basic account information and media.' },
      { name: 'instagram_manage_messages', purpose: 'Allows the system to send and receive Instagram DMs.' },
      { name: 'instagram_manage_comments', purpose: 'Required to read and reply to Instagram post and Reel comments.' },
      { name: 'instagram_manage_insights', purpose: 'Used to track message and interaction analytics.' }
    ]
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
    features: ['Realtime Comment Sync', 'AI Smart Moderation', 'Subscribe Reminder Automations'],
    permissions: [
      { name: 'youtube.readonly', purpose: 'Allows viewing your YouTube channel details and videos.' },
      { name: 'youtube.force-ssl', purpose: 'Required for reading and replying to comments via the YouTube API.' }
    ]
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
    features: ['Auto Connection Invites', 'AI Warm Outreach Messages', 'Post Engagement Tracking'],
    permissions: [
      { name: 'r_liteprofile', purpose: 'Reads basic profile information for setup.' },
      { name: 'r_emailaddress', purpose: 'Reads email address for account linkage.' },
      { name: 'w_member_social', purpose: 'Required to post content and send direct messages.' },
      { name: 'rw_organization_admin', purpose: 'Needed if automating company page interactions.' }
    ]
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
    features: ['Instant Bot Reply', 'AI Assistant Setup', 'Group & Channel Moderation'],
    permissions: [
      { name: 'bot_api_token', purpose: 'Used to authenticate and control your Telegram bot.' },
      { name: 'send_messages', purpose: 'Allows the bot to send text, media, and interactive messages.' },
      { name: 'read_messages', purpose: 'Allows the bot to read incoming messages from users.' }
    ]
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
    permissions: [
      { name: 'read_orders', purpose: 'Reads order history and status for syncing.' },
      { name: 'write_orders', purpose: 'Allows updating order status.' },
      { name: 'read_products', purpose: 'Reads product catalog and inventory levels.' },
      { name: 'read_customers', purpose: 'Reads customer profiles and purchase history.' }
    ],
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
    permissions: [
      { name: 'read_charges', purpose: 'Reads successful and failed payment charge details.' },
      { name: 'write_invoices', purpose: 'Allows creating and managing customer invoices.' },
      { name: 'read_customers', purpose: 'Reads customer details and subscription status.' }
    ],
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
    permissions: [
      { name: 'crm.objects.contacts.read', purpose: 'Reads contact information from your CRM.' },
      { name: 'crm.objects.contacts.write', purpose: 'Allows creating leads and updating contact properties.' },
      { name: 'timeline', purpose: 'Required to push custom chat interactions to the contact timeline.' }
    ],
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
    permissions: [
      { name: 'spreadsheets', purpose: 'Provides full read and write access to the connected Google Sheets.' }
    ],
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
    if (!window.FB) {
      toast.error("Facebook SDK not loaded. Please wait a moment.");
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse && response.authResponse.code) {
          const code = response.authResponse.code;
          window.location.href = `/callback?code=${encodeURIComponent(code)}`;
        } else {
          toast.error("Embedded signup cancelled or failed.");
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      }
    );
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
      { scope: 'pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,pages_messaging,public_profile', return_scopes: true }
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
      { scope: 'instagram_basic,instagram_manage_messages,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement,pages_manage_metadata,public_profile,business_management', return_scopes: true }
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
        if (acc.id && acc.id.startsWith('fb_native_')) {
          await facebookAPI.disconnectAccount(acc.modelId);
        } else {
          await facebookAPI.disconnectAccount(acc.modelId);
        }
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
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading integration panel...</p>
        </div>
      </div>
    );
  }

  const activeSocialCount = socialAccounts.length;
  const activeToolCount = integrations.filter(int => int.status === 'connected').length;
  const totalActive = activeSocialCount + activeToolCount;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-8 sm:p-12 mb-8">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-[100px] rounded-full mix-blend-screen animate-pulse duration-10000" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[120%] bg-gradient-to-l from-[#FF6A00]/20 to-pink-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-7000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Systems Operational
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
              Connect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-pink-500">Ecosystem</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
              Seamlessly integrate external apps and messaging channels to automate your workflows, unify customer data, and build powerful AI-driven experiences.
            </p>
          </div>
          
          {totalActive > 0 && (
            <div className="shrink-0">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl text-center">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 mb-1">
                  {totalActive}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Links</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="sticky top-0 z-40 flex flex-col sm:flex-row items-center gap-4 justify-between bg-slate-50/80 dark:bg-[#0b101e]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-3 shadow-sm mb-6">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
                selectedCategory === category
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#FF6A00] transition-colors" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="mt-5 p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-3 relative overflow-hidden group-hover:border-slate-300 dark:group-hover:border-white/10 transition-colors">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Linked Accounts</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {connectedAccounts.map((acc) => (
                      <div key={acc.id} className="flex justify-between items-center bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] border border-slate-100 dark:border-white/5 rounded-xl p-2 text-xs transition-colors group/acc">
                        <div className="flex items-center gap-3 min-w-0">
                          {acc.avatar ? (
                            <img src={acc.avatar} alt={acc.name} className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10 shadow-sm" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{acc.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[150px]">{acc.name}</span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{acc.username ? `@${acc.username}` : acc.type}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnectChannel(acc)}
                          className="p-1.5 rounded-lg opacity-0 group-hover/acc:opacity-100 bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:text-white text-red-500 dark:text-red-400 transition-all border border-red-500/20 hover:border-transparent mr-1"
                          title="Disconnect Account"
                        >
                          <Trash2 size={13} />
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
                <div className="mt-5 p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-2 text-[11px] relative overflow-hidden group-hover:border-slate-300 dark:group-hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Sync Status</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Synced</span>
                  </div>
                  {dbInt.shopUrl && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Store URL</span>
                      <span className="text-[#FF6A00] font-bold truncate max-w-[150px]" title={dbInt.shopUrl}>
                        {dbInt.shopUrl}
                      </span>
                    </div>
                  )}
                  {dbInt.spreadsheetId && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Spreadsheet ID</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[150px]" title={dbInt.spreadsheetId}>
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
              className={`group flex flex-col justify-between rounded-3xl bg-white/70 dark:bg-white/[0.02] backdrop-blur-xl border border-slate-200/60 dark:border-white/5 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:bg-white dark:hover:bg-white/[0.04] ${
                isConnected ? 'shadow-[0_0_30px_rgba(34,197,94,0.05)] border-emerald-500/20 dark:border-emerald-500/10' : 'shadow-sm dark:hover:border-white/10'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${int.color} border ${int.borderColor} shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500 overflow-hidden`}>
                      <div className={`absolute inset-0 bg-gradient-to-tr ${int.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                      <Icon className={`relative z-10 h-6 w-6 ${int.textColor}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight">{int.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{int.category}</span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-wide text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      {connectedLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-3 py-1 text-[10px] font-bold tracking-wide text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 shrink-0">
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-5 line-clamp-2">
                  {int.description}
                </p>

                {/* Features Checklist */}
                <div className="space-y-1.5 mb-5">
                  {int.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Required Permissions */}
                {int.permissions && (
                  <div className="mb-5 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-2">Required Permissions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {int.permissions.map((perm, idx) => (
                        <div key={idx} className="group/perm relative">
                          <span className="inline-block px-2 py-1 bg-white dark:bg-black/20 rounded-md text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-help transition-colors hover:bg-slate-100 dark:hover:bg-black/40">
                            {perm.name}
                          </span>
                          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 opacity-0 transition-all group-hover/perm:opacity-100 z-10 translate-y-1 group-hover/perm:-translate-y-0">
                            <div className="rounded-lg bg-slate-800 dark:bg-slate-700 px-3 py-2.5 text-center text-[10px] text-slate-200 shadow-xl border border-slate-700 dark:border-slate-600 leading-relaxed">
                              {perm.purpose}
                              <svg className="absolute left-1/2 top-full -mt-[1px] h-2 w-full -translate-x-1/2 text-slate-800 dark:text-slate-700" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detail View of Connection */}
                {connectedDetails}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 mt-5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {int.type === 'channel' ? (
                  <>
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => openModal(int)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Plus size={14} strokeWidth={3} /> Connect Additional
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openModal(int)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 py-3 text-xs font-black text-white shadow-lg shadow-[#FF6A00]/25 transition-all hover:bg-[#ff7b1a] hover:scale-[1.02]"
                      >
                        <ArrowRight size={14} strokeWidth={3} /> Connect {int.name.split(' ')[0]}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnectTool(int.id, int.name)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-black text-red-500 dark:text-red-400 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={14} strokeWidth={3} /> Disconnect {int.name}
                      </button>
                    ) : (
                      <button
                        onClick={() => openModal(int)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 py-3 text-xs font-black text-white shadow-lg shadow-[#FF6A00]/25 transition-all hover:bg-[#ff7b1a] hover:scale-[1.02]"
                      >
                        <ArrowRight size={14} strokeWidth={3} /> Setup Integration
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/[0.02] py-20 text-center">
          <HelpCircle className="h-10 w-10 text-slate-500 mb-3" />
          <h4 className="text-slate-800 dark:text-white font-bold mb-1 text-sm">No Integrations Found</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs leading-relaxed">
            We couldn't find any app matching your search criteria. Try modifying your filters.
          </p>
        </div>
      )}

      {/* SETUP MODAL */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
              onClick={closeModal} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeModal.color} border ${activeModal.borderColor} shadow-inner shrink-0`}>
                    <activeModal.icon className={`h-6 w-6 ${activeModal.textColor}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight tracking-tight">Setup {activeModal.name}</h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{activeModal.category}</p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
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
                      className="w-full flex items-center justify-center gap-3 bg-[#FF6A00] hover:bg-[#ff7b1a] text-slate-800 dark:text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-[#FF6A00]/25"
                    >
                      <Facebook size={16} /> Connect via Facebook (Embedded Signup)
                    </button>
                    
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                      <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Or Connect Manually</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                    </div>

                    <button
                      onClick={() => setWhatsappSetupStep('manual')}
                      className="w-full py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white font-semibold text-xs transition-all"
                    >
                      Enter Permanent API Tokens manually
                    </button>
                  </div>
                )}

                {whatsappSetupStep === 'manual' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Phone Number ID</label>
                        <input
                          type="text"
                          name="phoneNumberId"
                          required
                          value={formData.phoneNumberId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 1234567890123"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">WABA ID</label>
                        <input
                          type="text"
                          name="wabaId"
                          required
                          value={formData.wabaId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="WhatsApp Business Account ID"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Display Phone Number</label>
                        <input
                          type="text"
                          name="displayPhoneNumber"
                          required
                          value={formData.displayPhoneNumber || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., +1 555-0100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Display Name (optional)</label>
                        <input
                          type="text"
                          name="verifiedName"
                          value={formData.verifiedName || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., My Business"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">System User Access Token</label>
                      <textarea
                        name="accessToken"
                        required
                        rows={3}
                        value={formData.accessToken || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
                        placeholder="EAABm..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setWhatsappSetupStep('picker')}
                        className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-white hover:bg-slate-100 dark:bg-white/10 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-md"
                      >
                        {isSubmitting ? 'Connecting...' : 'Connect Manually'}
                      </button>
                    </div>
                  </form>
                )}

                {whatsappSetupStep === 'picking' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Select the phone number you want to hook up:</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {whatsappPhoneNumbers.map((phone) => (
                        <button
                          key={phone.phoneNumberId}
                          type="button"
                          onClick={() => setSelectedWhatsappPhone(phone)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${
                            selectedWhatsappPhone?.phoneNumberId === phone.phoneNumberId 
                              ? 'border-[#FF6A00] bg-[#FF6A00]/5 text-slate-800 dark:text-white' 
                              : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] hover:border-white/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-white">{phone.displayPhoneNumber}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{phone.verifiedName || 'No Display Name'}</p>
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
                        className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-white hover:bg-slate-100 dark:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedWhatsappPhone || isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
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
                <div className="flex p-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-2">
                  <button
                    onClick={() => setFacebookSetupMethod('oauth')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      facebookSetupMethod === 'oauth' ? 'bg-[#FF6A00] text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white'
                    }`}
                  >
                    OAuth Connect
                  </button>
                  <button
                    onClick={() => setFacebookSetupMethod('manual')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      facebookSetupMethod === 'manual' ? 'bg-[#FF6A00] text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white'
                    }`}
                  >
                    Manual Token
                  </button>
                </div>

                {facebookSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      Connect your Facebook Pages using the standard popup login. We will automatically fetch and list all your pages.
                    </p>
                    <button
                      onClick={handleFacebookLogin}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-slate-800 dark:text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg"
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
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Facebook Access Token
                      </label>
                      <textarea
                        name="accessToken"
                        required
                        rows={4}
                        value={formData.accessToken || ''}
                        onChange={handleInputChange}
                        className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
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
                        className="flex-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white transition hover:bg-slate-100 dark:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white shadow-lg transition disabled:opacity-50"
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
                <div className="flex p-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-2">
                  <button
                    onClick={() => setInstagramSetupMethod('oauth')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      instagramSetupMethod === 'oauth' ? 'bg-[#FF6A00] text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white'
                    }`}
                  >
                    OAuth Connect
                  </button>
                  <button
                    onClick={() => setInstagramSetupMethod('manual')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      instagramSetupMethod === 'manual' ? 'bg-[#FF6A00] text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white'
                    }`}
                  >
                    Manual Inputs
                  </button>
                </div>

                {instagramSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      Connect your Instagram Business accounts linked to your Facebook Pages. We will automatically discover and link them.
                    </p>
                    <button
                      onClick={handleInstagramLogin}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-slate-800 dark:text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg"
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
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Instagram Account ID</label>
                        <input
                          type="text"
                          name="igAccountId"
                          required
                          value={formData.igAccountId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 178414..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Facebook Page ID</label>
                        <input
                          type="text"
                          name="pageId"
                          required
                          value={formData.pageId || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                          placeholder="e.g., 10103..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Instagram Username (optional)</label>
                      <input
                        type="text"
                        name="igUsername"
                        value={formData.igUsername || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                        placeholder="e.g., @my_brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Page Access Token</label>
                      <textarea
                        name="pageAccessToken"
                        required
                        rows={3}
                        value={formData.pageAccessToken || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-[#FF6A00] focus:outline-none resize-none"
                        placeholder="EAABm..."
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white transition hover:bg-slate-100 dark:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white shadow-lg transition disabled:opacity-50"
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    name="botToken"
                    required
                    value={formData.botToken || ''}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
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
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white transition hover:bg-slate-100 dark:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white shadow-lg transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Connecting...' : 'Connect Bot'}
                  </button>
                </div>
              </form>
            )}

            {/* 5. YOUTUBE OAUTH SETUP */}
            {activeModal.id === 'youtube' && (
              <div className="p-6 space-y-4 text-center py-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mb-2">
                  Connect your YouTube Channel via Google Account. We will synchronize comment replies and enable AI automation on your videos.
                </p>
                <div className="text-left bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Requested Permissions:</p>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                    <li><span className="font-semibold">userinfo.profile</span>: See your personal info, including any personal info you've made publicly available</li>
                    <li><span className="font-semibold">youtube.readonly</span>: View your YouTube account</li>
                    <li><span className="font-semibold">youtube.upload</span>: Manage your YouTube videos</li>
                    <li><span className="font-semibold">youtube.force-ssl</span>: See, edit and permanently delete your YouTube videos, ratings, comments and captions</li>
                  </ul>
                </div>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Authenticate your LinkedIn account to sync outreach, connection updates, and post analytics automatically.
                </p>
                <button
                  onClick={handleLinkedinConnect}
                  className="w-full flex items-center justify-center gap-3 bg-[#0077b5] hover:bg-[#00669c] text-slate-800 dark:text-white py-3 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-[#0077b5]/25"
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
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {field.label}
                        </label>
                        {field.helpText && (
                          <div className="group relative">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-200 cursor-pointer" />
                            <div className="absolute right-0 bottom-full mb-2 w-48 hidden group-hover:block bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-[10px] text-slate-500 dark:text-slate-400 leading-normal shadow-xl z-50">
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
                        className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition focus:border-[#FF6A00] focus:outline-none focus:ring-1 focus:ring-[#FF6A00]"
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-3 text-xs font-semibold text-slate-800 dark:text-white transition hover:bg-slate-100 dark:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] px-4 py-3 text-xs font-semibold text-slate-800 dark:text-white shadow-lg shadow-[#FF6A00]/20 transition hover:bg-[#ff7b1a] hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
