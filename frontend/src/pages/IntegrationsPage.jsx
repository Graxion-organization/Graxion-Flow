import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, Trash2, Search, ShoppingCart, CreditCard, 
  Database, Table, MessageSquare, Facebook, Instagram, Youtube, 
  Linkedin, Send, Loader2, ArrowRight, HelpCircle, Workflow, 
  Plus, MoreVertical, LayoutGrid, List, Activity, Key, Book,
  Code
} from 'lucide-react';
import { 
  integrationsAPI, socialHubAPI, whatsappAPI, facebookAPI, 
  instagramAPI, telegramAPI, youtubeAPI, organizationAPI 
} from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['All Integrations', 'Social Media', 'Messaging', 'Data & Business', 'API & Tools'];

const INTEGRATIONS_CONFIG = [
  // Messaging
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    type: 'channel',
    category: 'Messaging',
    description: 'API chats, broadcasts, and campaign automation.',
    logo: 'https://cdn.simpleicons.org/whatsapp/25D366',
    features: ['Official API Support', 'Interactive Flow Builder', 'AI Agent Responses', 'Broadcasts'],
    permissions: [
      { name: 'whatsapp_business_management', purpose: 'Allows reading and managing your WhatsApp Business metadata.' },
      { name: 'whatsapp_business_messaging', purpose: 'Enables sending and receiving messages on behalf of your WhatsApp Business account.' },
      { name: 'business_management', purpose: 'Required to access Facebook Business Manager for account verification.' }
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram',
    type: 'channel',
    category: 'Messaging',
    description: 'Bot automation, channel posts, and user management.',
    logo: 'https://cdn.simpleicons.org/telegram/26A5E4',
    features: ['Instant Bot Reply', 'AI Assistant Setup', 'Group & Channel Moderation'],
    permissions: [
      { name: 'bot_api_token', purpose: 'Used to authenticate and control your Telegram bot.' },
      { name: 'send_messages', purpose: 'Allows the bot to send text, media, and interactive messages.' },
      { name: 'read_messages', purpose: 'Allows the bot to read incoming messages from users.' }
    ]
  },
  
  // Social Media
  {
    id: 'instagram',
    name: 'Instagram DM',
    type: 'channel',
    category: 'Social Media',
    description: 'Automate Instagram DMs, story mentions, and comment replies.',
    logo: 'https://cdn.simpleicons.org/instagram/E4405F',
    features: ['DM Auto-Response', 'Story Mention Trigger', 'Comment to DM Flow'],
    permissions: [
      { name: 'instagram_basic', purpose: 'Reads basic account information and media.' },
      { name: 'instagram_manage_messages', purpose: 'Allows the system to send and receive Instagram DMs.' },
      { name: 'instagram_manage_comments', purpose: 'Required to read and reply to Instagram post and Reel comments.' },
      { name: 'instagram_manage_insights', purpose: 'Used to track message and interaction analytics.' }
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    type: 'channel',
    category: 'Social Media',
    description: 'Handle page messages, comments, and leads.',
    logo: 'https://cdn.simpleicons.org/facebook/1877F2',
    features: ['Page Comment Replies', 'Direct Message Automation'],
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
    id: 'youtube',
    name: 'YouTube',
    type: 'channel',
    category: 'Social Media',
    description: 'Comment management and video analytics.',
    logo: 'https://cdn.simpleicons.org/youtube/FF0000',
    features: ['Realtime Comment Sync', 'AI Smart Moderation', 'Subscribe Reminder Automations'],
    permissions: [
      { name: 'youtube.readonly', purpose: 'Allows viewing your YouTube channel details and videos.' },
      { name: 'youtube.force-ssl', purpose: 'Required for reading and replying to comments via the YouTube API.' }
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'channel',
    category: 'Social Media',
    description: 'Profile automation, connections, and messaging.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    features: ['Auto Connection Invites', 'AI Warm Outreach Messages', 'Post Engagement Tracking'],
    permissions: [
      { name: 'r_liteprofile', purpose: 'Reads basic profile information for setup.' },
      { name: 'r_emailaddress', purpose: 'Reads email address for account linkage.' },
      { name: 'w_member_social', purpose: 'Required to post content and send direct messages.' },
      { name: 'rw_organization_admin', purpose: 'Needed if automating company page interactions.' }
    ]
  },

  // Data & Business
  {
    id: 'shopify',
    name: 'Shopify Store',
    type: 'tool',
    category: 'Data & Business',
    description: 'Sync customer orders, check product stock levels, and send abandoned cart notifications.',
    logo: 'https://cdn.simpleicons.org/shopify/95BF47',
    features: ['Order Sync & Status', 'Abandoned Cart Recovery', 'Inventory Notification Alerts'],
    permissions: [
      { name: 'read_orders', purpose: 'Reads order history and status for syncing.' },
      { name: 'write_orders', purpose: 'Allows updating order status.' },
      { name: 'read_products', purpose: 'Reads product catalog and inventory levels.' },
      { name: 'read_customers', purpose: 'Reads customer profiles and purchase history.' }
    ],
    fields: [
      { name: 'shopUrl', label: 'Shopify Store URL', type: 'text', placeholder: 'your-store.myshopify.com', helpText: 'The main .myshopify.com subdomain of your online store.' },
      { name: 'accessToken', label: 'Admin API Access Token', type: 'password', placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx', helpText: 'Generated inside your Shopify Admin.' }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    type: 'tool',
    category: 'Data & Business',
    description: 'Send payment links, track invoice status, and automatically alert customers on failures.',
    logo: 'https://cdn.simpleicons.org/stripe/008CDD',
    features: ['Direct Checkout Links', 'Automatic Invoice Alerts', 'Subscription State Sync'],
    permissions: [
      { name: 'read_charges', purpose: 'Reads successful and failed payment charge details.' },
      { name: 'write_invoices', purpose: 'Allows creating and managing customer invoices.' },
      { name: 'read_customers', purpose: 'Reads customer details and subscription status.' }
    ],
    fields: [
      { name: 'apiKey', label: 'Stripe Secret API Key', type: 'password', placeholder: 'sk_test_xxxxxxxxxx / sk_live_xxxxxxxxxx', helpText: 'Obtained from your Stripe Dashboard under Developers > API Keys.' }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    type: 'tool',
    category: 'Data & Business',
    description: 'Seamlessly export fresh leads, update customer timeline notes, and sync deal status.',
    logo: 'https://cdn.simpleicons.org/hubspot/FF7A59',
    features: ['Contact Synchronization', 'Custom Timeline Activities', 'Deal pipeline updates'],
    permissions: [
      { name: 'crm.objects.contacts.read', purpose: 'Reads contact information from your CRM.' },
      { name: 'crm.objects.contacts.write', purpose: 'Allows creating leads and updating contact properties.' },
      { name: 'timeline', purpose: 'Required to push custom chat interactions to the contact timeline.' }
    ],
    fields: [
      { name: 'accessToken', label: 'Private App Access Token', type: 'password', placeholder: 'pat-na1-xxxxxxxxxxxxxxxxxxxxxxxx', helpText: 'Generate a Private App inside HubSpot Settings.' }
    ]
  },
  
  // API & Tools
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    type: 'tool',
    category: 'API & Tools',
    description: 'Sync data, leads, and reports automatically.',
    logo: 'https://cdn.simpleicons.org/googlesheets/34A853',
    features: ['Export Contact Lists', 'Log Broadcast Responses', 'Custom Sheets Formatting'],
    permissions: [
      { name: 'spreadsheets', purpose: 'Provides full read and write access to the connected Google Sheets.' }
    ],
    fields: [
      { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', placeholder: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ...', helpText: 'The long alphanumeric string in your Google Sheet URL.' },
      { name: 'accessToken', label: 'Google OAuth API Access Token', type: 'password', placeholder: 'ya29.a0AfB_...', helpText: 'Google Cloud console OAuth credential token.' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'tool',
    category: 'API & Tools',
    description: 'Power your AI agents and smart automations.',
    logo: 'https://cdn.simpleicons.org/openai/412991',
    features: ['AI Active', 'Model Customization'],
    permissions: [],
    fields: [
      { name: 'apiKey', label: 'OpenAI API Key', type: 'password', placeholder: 'sk-proj-...', helpText: 'Get this from your OpenAI API Dashboard.' }
    ]
  }
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [integrations, setIntegrations] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Integrations');
  const [activeModal, setActiveModal] = useState(null);
  const [activeManageModal, setActiveManageModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortOrder, setSortOrder] = useState('Recent');

  // WhatsApp Embedded Setup specific variables
  const [whatsappSetupStep, setWhatsappSetupStep] = useState('picker'); 
  const [whatsappPhoneNumbers, setWhatsappPhoneNumbers] = useState([]);
  const [whatsappLongLivedToken, setWhatsappLongLivedToken] = useState('');
  const [selectedWhatsappPhone, setSelectedWhatsappPhone] = useState(null);

  const [facebookSetupMethod, setFacebookSetupMethod] = useState('oauth');
  const [instagramSetupMethod, setInstagramSetupMethod] = useState('oauth');

  const loadData = async () => {
    try {
      const [integrationsRes, socialAccountsRes] = await Promise.all([
        integrationsAPI.getAll(),
        socialHubAPI.getAccounts()
      ]);
      setIntegrations(integrationsRes.data?.data || []);
      setSocialAccounts(socialAccountsRes.data?.data || []);
      
      if (user?.organizationId) {
        try {
          const actRes = await organizationAPI.getActivity(user.organizationId);
          if (actRes.data?.data?.logs) {
             setActivities(actRes.data.data.logs.slice(0, 5));
          }
        } catch(e) {
          console.error("Failed to load activity");
        }
      }
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
    import('../utils/scriptLoader').then(({ loadFbSdk }) => loadFbSdk().catch(() => {}));
  }, []);

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
    setActiveManageModal(null);
    setActiveModal(config);
    setFormData({});
    setWhatsappSetupStep('picker');
    setFacebookSetupMethod('oauth');
    setInstagramSetupMethod('oauth');
    setSelectedWhatsappPhone(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveManageModal(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
      { config_id: META_CONFIG_ID, response_type: "code", override_default_response_type: true, extras: { setup: {} } }
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

  const getIntegrationData = (id) => integrations.find(i => i.platform === id);
  const getConnectedAccounts = (platform) => socialAccounts.filter(acc => acc.platform === platform);

  const filteredConfig = useMemo(() => {
    return INTEGRATIONS_CONFIG.filter(int => {
      if (selectedCategory !== 'All Integrations' && int.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return int.name.toLowerCase().includes(q) || int.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const connectedList = [];
  const availableList = [];

  filteredConfig.forEach(int => {
    let isConnected = false;
    let connectedAccounts = [];
    let dbInt = null;
    
    if (int.type === 'channel') {
      connectedAccounts = getConnectedAccounts(int.id);
      isConnected = connectedAccounts.length > 0;
    } else {
      dbInt = getIntegrationData(int.id);
      isConnected = dbInt?.status === 'connected';
    }

    if (isConnected) {
      connectedList.push({ ...int, connectedAccounts, dbInt });
    } else {
      availableList.push({ ...int });
    }
  });

  const totalConnected = connectedList.length;
  const totalAvailable = availableList.length;
  
  const chartData = [
    { name: 'Connected', value: totalConnected, color: '#10b981' },
    { name: 'Available', value: totalAvailable, color: '#8b5cf6' },
    { name: 'Setup Required', value: 0, color: '#f97316' },
    { name: 'Error', value: 0, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-violet-500 h-9 w-9" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading integration panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200">

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pb-28">
        
        {/* Main Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Integrations</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Connect your messaging channels, social media, and CRM tools</p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-xl pl-8 pr-7 py-2 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-violet-500 shadow-xs transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <a 
              href="https://docs.graxion.com/api" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-xs shrink-0"
            >
              <Book size={14} className="text-slate-500 dark:text-slate-400" /> 
              <span className="hidden sm:inline text-slate-700 dark:text-slate-300">Docs</span>
            </a>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-4 mb-6 overflow-x-auto custom-scrollbar pb-1 border-b border-slate-200 dark:border-white/5">
          {CATEGORIES.map(category => {
            const count = category === 'All Integrations' 
              ? INTEGRATIONS_CONFIG.length 
              : INTEGRATIONS_CONFIG.filter(i => i.category === category).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 px-2.5 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  selectedCategory === category
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {category}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedCategory === category 
                    ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 items-start">
          
          {/* MAIN CONTENT COLUMN */}
          <div className="flex-1 w-full space-y-8 sm:space-y-10">
            
            {/* CONNECTED INTEGRATIONS */}
            {connectedList.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Connected Channels & Apps
                      <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {connectedList.length}
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative hidden sm:block">
                      <select 
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="appearance-none bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/5 rounded-xl pl-3 pr-7 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option>Sort: Recent</option>
                        <option>Sort: Name A-Z</option>
                      </select>
                      <MoreVertical className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    </div>

                    <div className="flex items-center bg-white dark:bg-[#12141c] rounded-xl p-0.5 border border-slate-200 dark:border-white/5 shadow-xs">
                      <button 
                        onClick={() => setViewMode('grid')} 
                        className={`p-1.5 rounded-lg transition-colors ${
                          viewMode === 'grid' 
                            ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold' 
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 rounded-lg transition-colors ${
                          viewMode === 'list' 
                            ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold' 
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title="List View"
                      >
                        <List size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div key={viewMode} className={`animate-view-fade ${viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4" : "flex flex-col gap-2.5"}`}>
                  {connectedList.map(int => (
                    viewMode === 'grid' ? (
                      /* Compact, Balanced Grid Card */
                      <div 
                        key={int.id} 
                        className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#12141c]/90 border border-slate-200 dark:border-white/10 p-3.5 sm:p-4 md:p-5 transition-all hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md hover:bg-slate-50/50 dark:hover:bg-[#161923] shadow-xs"
                      >
                        <div>
                          {/* Header: Logo, Name & Status Badge */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0b0c10] border border-slate-200/80 dark:border-white/10 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <img src={int.logo} alt={int.name} className="h-5 w-5 object-contain" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                                  {int.name}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {int.category}
                                </p>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                              Connected
                            </span>
                          </div>

                          {/* Body: Description */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mt-2.5 mb-2.5">
                            {int.description}
                          </p>

                          {/* Meta tags */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center text-[10px] font-semibold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 px-2 py-0.5 rounded-md">
                              {int.features?.length || 0} Features
                            </span>
                            {int.connectedAccounts?.length > 0 && (
                              <span className="inline-flex items-center text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2 py-0.5 rounded-md">
                                {int.connectedAccounts.length} {int.connectedAccounts.length === 1 ? 'account' : 'accounts'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Footer: Manage + Disconnect Action */}
                        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/5">
                          <button 
                            onClick={() => setActiveManageModal(int)} 
                            className="flex-1 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-all text-center"
                          >
                            Manage
                          </button>
                          <div className="relative group/menu">
                            <button 
                              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                              aria-label="Options"
                            >
                              <MoreVertical size={15} />
                            </button>
                            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/menu:block w-36 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                              <button 
                                onClick={() => int.type === 'channel' ? handleDisconnectChannel(int.connectedAccounts[0] || int) : handleDisconnectTool(int.id, int.name)} 
                                className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors font-medium"
                              >
                                <Trash2 size={12} /> Disconnect
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Compact List Card */
                      <div 
                        key={int.id} 
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white dark:bg-[#12141c]/90 border border-slate-200 dark:border-white/10 p-3 sm:p-4 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0b0c10] border border-slate-200/80 dark:border-white/10 shrink-0">
                            <img src={int.logo} alt={int.name} className="h-5 w-5 object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{int.name}</h3>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1 h-1 rounded-full bg-emerald-500" /> Connected
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">{int.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                          <button 
                            onClick={() => setActiveManageModal(int)} 
                            className="flex-1 sm:flex-initial px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-all"
                          >
                            Manage
                          </button>
                          <button 
                            onClick={() => int.type === 'channel' ? handleDisconnectChannel(int.connectedAccounts[0] || int) : handleDisconnectTool(int.id, int.name)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 border border-slate-200/70 dark:border-white/10 text-slate-400 transition-all"
                            title="Disconnect"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </section>
            )}

            {/* AVAILABLE INTEGRATIONS */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Available Integrations
                  <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    {availableList.length}
                  </span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {availableList.map(int => (
                  <div 
                    key={int.id}
                    onClick={() => openModal(int)}
                    className="group flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-[#12141c]/60 border border-slate-200 dark:border-white/10 p-3 sm:p-3.5 cursor-pointer transition-all hover:border-violet-400/50 hover:bg-slate-50 dark:hover:bg-[#161923] shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0b0c10] border border-slate-200/80 dark:border-white/10 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <img src={int.logo} alt={int.name} className="h-5 w-5 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{int.name}</h3>
                          <span className="hidden sm:inline-block text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-1.5 py-0.2 rounded-md">
                            {int.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate mt-0.5">
                          {int.description}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-500/20 group-hover:bg-violet-600 group-hover:text-white transition-all shrink-0">
                      <Plus size={12} /> Connect
                    </span>
                  </div>
                ))}
              </div>
              
              {availableList.length === 0 && (
                <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#12141c]/30 px-4">
                  <HelpCircle className="h-9 w-9 text-slate-400 dark:text-slate-600 mb-2.5" />
                  <h4 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-1">No Available Integrations</h4>
                  <p className="text-slate-500 text-xs max-w-xs">
                    {searchQuery ? 'No integrations match your search query.' : 'All apps in this category are already connected.'}
                  </p>
                </div>
              )}
            </section>
          </div>


          {/* RIGHT SIDEBAR */}
          <div className="w-full xl:w-[320px] shrink-0 space-y-4">
            
            {/* OVERVIEW DONUT CHART */}
            <div className="bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-6 uppercase tracking-wider">Integration Overview</h3>
              <div className="relative h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white mb-0.5">{totalConnected + totalAvailable}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold text-center leading-tight">Total<br/>Integrations</span>
                </div>
              </div>
              <div className="mt-6 space-y-2.5">
                {chartData.map(stat => (
                  <div key={stat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: stat.color, boxShadow: `0 0 8px ${stat.color}60` }}></span>
                      <span className="text-slate-600 dark:text-slate-400">{stat.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-1.5">
                <button onClick={() => navigate('/app/settings')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-slate-100 dark:hover:border-transparent">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/10 flex items-center justify-center shrink-0">
                    <Code size={14} className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Add Custom API</h4>
                    <p className="text-[10px] text-slate-500">Connect any REST API</p>
                  </div>
                </button>
                <button onClick={() => navigate('/app/settings')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-slate-100 dark:hover:border-transparent">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/10 flex items-center justify-center shrink-0">
                    <Workflow size={14} className="text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Webhook Settings</h4>
                    <p className="text-[10px] text-slate-500">Manage webhook endpoints</p>
                  </div>
                </button>
                <button onClick={() => navigate('/app/settings')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-slate-100 dark:hover:border-transparent">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/10 flex items-center justify-center shrink-0">
                    <Key size={14} className="text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">API Keys</h4>
                    <p className="text-[10px] text-slate-500">Manage your API credentials</p>
                  </div>
                </button>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
               <h3 className="text-xs font-semibold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Recent Activity</h3>
               <div className="space-y-4">
                 {activities.length > 0 ? (
                    activities.map(act => (
                      <div key={act.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                           <Activity size={12} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{act.action}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{new Date(act.createdAt).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          </div>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="flex flex-col gap-4">
                       <div className="flex gap-3 items-start">
                         <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-gradient-to-br dark:from-pink-500/20 dark:to-pink-500/5 border border-pink-100 dark:border-pink-500/20 flex items-center justify-center shrink-0">
                           <Instagram size={12} className="text-pink-600 dark:text-pink-400" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 truncate">Instagram DM</h4>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Connected successfully</p>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-[9px] text-slate-400 dark:text-slate-500">2h ago</span>
                           <CheckCircle2 size={10} className="text-emerald-500" />
                         </div>
                       </div>
                       <div className="flex gap-3 items-start">
                         <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-500/20 dark:to-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                           <MessageSquare size={12} className="text-emerald-600 dark:text-emerald-400" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 truncate">WhatsApp Business</h4>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Feature enabled: Broadcasts</p>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-[9px] text-slate-400 dark:text-slate-500">5h ago</span>
                           <CheckCircle2 size={10} className="text-emerald-500" />
                         </div>
                       </div>
                       <div className="flex gap-3 items-start">
                         <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-gradient-to-br dark:from-blue-600/20 dark:to-blue-600/5 border border-blue-100 dark:border-blue-600/20 flex items-center justify-center shrink-0">
                           <Facebook size={12} className="text-blue-600 dark:text-blue-400" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 truncate">Facebook Messenger</h4>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Webhooks updated</p>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-[9px] text-slate-400 dark:text-slate-500">1d ago</span>
                           <div className="w-2.5 h-2.5 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/50 flex items-center justify-center">
                             <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                           </div>
                         </div>
                       </div>
                       <div className="flex gap-3 items-start">
                         <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-600/20 dark:to-slate-600/5 border border-slate-200 dark:border-slate-600/20 flex items-center justify-center shrink-0">
                           <Code size={12} className="text-slate-600 dark:text-slate-400" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 truncate">OpenAI</h4>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">API key refreshed</p>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-[9px] text-slate-400 dark:text-slate-500">2d ago</span>
                           <CheckCircle2 size={10} className="text-emerald-500" />
                         </div>
                       </div>
                    </div>
                 )}
               </div>
               <button className="mt-5 text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors flex items-center gap-1.5">
                 View All Activity <ArrowRight size={12} />
               </button>
            </div>

          </div>
        </div>
      </div>
      
      {/* SETUP MODALS */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" 
              onClick={closeModal} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#161923]">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-white/5 shrink-0 shadow-sm`}>
                    <img src={activeModal.logo} alt={activeModal.name} className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">Setup {activeModal.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{activeModal.category}</p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <X size={18} strokeWidth={2} />
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
                      className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg"
                    >
                      <Facebook size={16} /> Connect via Facebook
                    </button>
                    
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                      <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Or Connect Manually</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                    </div>

                    <button
                      onClick={() => setWhatsappSetupStep('manual')}
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-medium text-sm transition-all"
                    >
                      Enter Permanent API Tokens manually
                    </button>
                  </div>
                )}

                {whatsappSetupStep === 'manual' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Phone Number ID</label>
                        <input type="text" name="phoneNumberId" required value={formData.phoneNumberId || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="1234567890" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">WABA ID</label>
                        <input type="text" name="wabaId" required value={formData.wabaId || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="1234567890" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Display Phone Number</label>
                        <input type="text" name="displayPhoneNumber" required value={formData.displayPhoneNumber || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="+1 555-0100" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Display Name</label>
                        <input type="text" name="verifiedName" value={formData.verifiedName || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="My Business" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">System User Access Token</label>
                      <textarea name="accessToken" required rows={3} value={formData.accessToken || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-violet-500 focus:outline-none resize-none" placeholder="EAABm..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setWhatsappSetupStep('picker')} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Back</button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition-all shadow-md">{isSubmitting ? 'Connecting...' : 'Connect'}</button>
                    </div>
                  </form>
                )}

                {whatsappSetupStep === 'picking' && (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Select the phone number you want to hook up:</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {whatsappPhoneNumbers.map((phone) => (
                        <button key={phone.phoneNumberId} type="button" onClick={() => setSelectedWhatsappPhone(phone)} className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${selectedWhatsappPhone?.phoneNumberId === phone.phoneNumberId ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-900 dark:text-white' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'}`}>
                          <div className="min-w-0">
                            <p className="font-bold text-xs">{phone.displayPhoneNumber}</p>
                            <p className="text-[10px] text-slate-500">{phone.verifiedName || 'No Display Name'}</p>
                          </div>
                          {selectedWhatsappPhone?.phoneNumberId === phone.phoneNumberId && <CheckCircle2 className="h-4 w-4 text-violet-500" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={closeModal} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
                      <button type="submit" disabled={!selectedWhatsappPhone || isSubmitting} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition-all shadow-md disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Connect'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2. FACEBOOK MESSENGER SETUP */}
            {activeModal.id === 'facebook' && (
              <div className="p-6 space-y-4">
                <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#0b0c10] border border-slate-200 dark:border-white/10 mb-2">
                  <button onClick={() => setFacebookSetupMethod('oauth')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${facebookSetupMethod === 'oauth' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>OAuth Connect</button>
                  <button onClick={() => setFacebookSetupMethod('manual')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${facebookSetupMethod === 'manual' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Manual Token</button>
                </div>

                {facebookSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Connect your Facebook Pages using the standard popup login. We will automatically fetch and list all your pages.</p>
                    <button onClick={handleFacebookLogin} disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook size={16} />}
                      <span>Connect with Facebook</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Facebook Access Token</label>
                      <textarea name="accessToken" required rows={4} value={formData.accessToken || ''} onChange={handleInputChange} className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-violet-500 focus:outline-none resize-none" placeholder="EAABm..." />
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2 text-xs text-slate-700 dark:text-white transition hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-medium text-white shadow-lg transition disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Connect Page'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 3. INSTAGRAM SETUP */}
            {activeModal.id === 'instagram' && (
              <div className="p-6 space-y-4">
                <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#0b0c10] border border-slate-200 dark:border-white/10 mb-2">
                  <button onClick={() => setInstagramSetupMethod('oauth')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${instagramSetupMethod === 'oauth' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>OAuth Connect</button>
                  <button onClick={() => setInstagramSetupMethod('manual')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${instagramSetupMethod === 'manual' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Manual Inputs</button>
                </div>

                {instagramSetupMethod === 'oauth' ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Connect your Instagram Business accounts linked to your Facebook Pages. We will automatically discover and link them.</p>
                    <button onClick={handleInstagramLogin} disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram size={16} />}
                      <span>Connect with Instagram</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Instagram Account ID</label>
                        <input type="text" name="igAccountId" required value={formData.igAccountId || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="178414..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Facebook Page ID</label>
                        <input type="text" name="pageId" required value={formData.pageId || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="10103..." />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Page Access Token</label>
                      <textarea name="pageAccessToken" required rows={3} value={formData.pageAccessToken || ''} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:border-violet-500 focus:outline-none resize-none" placeholder="EAABm..." />
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2 text-xs text-slate-700 dark:text-white transition hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-medium text-white shadow-lg transition disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Connect'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 4. TELEGRAM BOT SETUP */}
            {activeModal.id === 'telegram' && (
              <form onSubmit={handleConnectSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Telegram Bot Token</label>
                  <input type="text" name="botToken" required value={formData.botToken || ''} onChange={handleInputChange} className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-violet-500 focus:outline-none" placeholder="1234567890:AAH_..." />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2 text-xs text-slate-700 dark:text-white transition hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-medium text-white shadow-lg transition disabled:opacity-50">{isSubmitting ? 'Connecting...' : 'Connect Bot'}</button>
                </div>
              </form>
            )}

            {/* 5. YOUTUBE OAUTH SETUP */}
            {activeModal.id === 'youtube' && (
              <div className="p-6 space-y-4 text-center py-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Connect your YouTube Channel via Google Account. We will synchronize comment replies and enable AI automation on your videos.</p>
                <button onClick={handleYoutubeConnect} className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg">
                  <Youtube size={16} /> <span>Authorize YouTube</span>
                </button>
              </div>
            )}

            {/* 6. LINKEDIN OAUTH SETUP */}
            {activeModal.id === 'linkedin' && (
              <div className="p-6 space-y-4 text-center py-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">Authenticate your LinkedIn account to sync outreach, connection updates, and post analytics automatically.</p>
                <button onClick={handleLinkedinConnect} className="w-full flex items-center justify-center gap-3 bg-[#0077b5] hover:bg-[#00669c] text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg">
                  <Linkedin size={16} /> <span>Authorize LinkedIn</span>
                </button>
              </div>
            )}

            {/* 7. STANDARD TOOLS */}
            {!['whatsapp', 'facebook', 'instagram', 'telegram', 'youtube', 'linkedin'].includes(activeModal.id) && (
              <form onSubmit={handleConnectSubmit} className="p-6 space-y-5">
                <div className="space-y-4">
                  {activeModal.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">{field.label}</label>
                      </div>
                      <input type={field.type} name={field.name} required value={formData[field.name] || ''} onChange={handleInputChange} className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10] px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition focus:border-violet-500 focus:outline-none" placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} />
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg transition hover:bg-violet-700 disabled:opacity-75">{isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : 'Save Integration'}</button>
                </div>
              </form>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE INTEGRATION MODAL */}
      <AnimatePresence>
        {activeManageModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" 
              onClick={() => setActiveManageModal(null)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#12141c] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#161923]">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-white/5 shrink-0 shadow-sm`}>
                    <img src={activeManageModal.logo} alt={activeManageModal.name} className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">Manage {activeManageModal.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{activeManageModal.connectedAccounts?.length || 0} Connected</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveManageModal(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                  {activeManageModal.connectedAccounts && activeManageModal.connectedAccounts.length > 0 ? (
                    activeManageModal.connectedAccounts.map((acc, i) => (
                      <div key={acc._id || i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10]">
                        <div className="flex items-center gap-3">
                          <img src={acc.avatar || activeManageModal.logo} className="w-8 h-8 rounded-full object-cover bg-white shrink-0" onError={(e) => { e.target.src = activeManageModal.logo || 'https://via.placeholder.com/150'; }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{acc.name || 'Account'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{acc.username || acc.platform || 'Connected'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveManageModal(null);
                            activeManageModal.type === 'channel' ? handleDisconnectChannel(acc) : handleDisconnectTool(activeManageModal.id, activeManageModal.name);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Disconnect"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-sm text-slate-500">
                      {activeManageModal.type === 'tool' && activeManageModal.dbInt ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c10]">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                               <CheckCircle2 size={16} />
                             </div>
                             <div>
                               <p className="text-sm font-semibold text-slate-800 dark:text-white">Active Connection</p>
                               <p className="text-[10px] text-slate-500">Connected</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveManageModal(null);
                              handleDisconnectTool(activeManageModal.id, activeManageModal.name);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            title="Disconnect"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        "No accounts connected."
                      )}
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    onClick={() => openModal(activeManageModal)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-all shadow-md"
                  >
                    <Plus size={16} /> {activeManageModal.type === 'tool' ? 'Reconfigure Settings' : 'Connect Another Account'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
