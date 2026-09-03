import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, PlayCircle, FileText, Users, MessageSquare, 
  Settings, ExternalLink, Plus, CheckCircle2, ShieldCheck, 
  ArrowRight, Activity, Zap, Loader2, AlertTriangle 
} from 'lucide-react';
import { whatsappAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function WhatsAppMarketingSetup() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await whatsappAPI.getAll();
      setAccounts(res.data?.data?.accounts || []);
    } catch (err) {
      console.error('Failed to load WA accounts:', err);
      toast.error('Failed to load connected WhatsApp accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    import('../utils/scriptLoader').then(({ loadFbSdk }) => loadFbSdk().catch(() => {}));
  }, []);

  const handleEmbeddedSignup = () => {
    const META_APP_ID = import.meta.env.VITE_META_APP_ID || process.env.REACT_APP_META_APP_ID;
    const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || process.env.REACT_APP_META_CONFIG_ID;
    
    if (!window.FB) {
      toast.error("Facebook SDK is still loading. Please wait a moment.");
      return;
    }

    setIsConnecting(true);
    
    window.FB.login(
      (response) => {
        if (response.authResponse && response.authResponse.code) {
          const code = response.authResponse.code;
          window.location.href = `/callback?code=${encodeURIComponent(code)}&platform=whatsapp`;
        } else {
          toast.error("Signup cancelled or failed.");
          setIsConnecting(false);
        }
      },
      { 
        config_id: META_CONFIG_ID || "789393257580981", 
        response_type: "code", 
        override_default_response_type: true, 
        extras: { setup: {} } 
      }
    );
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp account?')) return;
    try {
      await whatsappAPI.disconnect(id);
      toast.success('Account disconnected successfully');
      loadAccounts();
    } catch (err) {
      toast.error('Failed to disconnect account');
    }
  };

  const FeatureCard = ({ title, desc, icon: Icon, color, onClick, cta }) => (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer group rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDark ? 'bg-[#12141c] border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 ${color}`}></div>
      <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center shadow-md ${color} bg-opacity-20 backdrop-blur-sm`}>
        <Icon className="text-white" size={24} />
      </div>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
      <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500 group-hover:text-emerald-400 transition-colors">
        {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
              <Smartphone size={24} />
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              WhatsApp Marketing Hub
            </h1>
          </div>
          <p className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your Official Meta WhatsApp API, Campaigns, Templates, and Audiences from one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/app/whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}
          >
            <Activity size={18} className="text-blue-500" />
            View Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Connections & Quick Actions */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Connection Status Card */}
          <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-gradient-to-b from-[#1a1f2e] to-[#12141c] border-white/5' : 'bg-white border-slate-200 shadow-md'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                <ShieldCheck size={20} className="text-emerald-500" /> WhatsApp Connection
              </h2>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-slate-500">Checking connection status...</p>
                </div>
              ) : accounts.length > 0 ? (
                <div className="space-y-4">
                  {accounts.map(acc => (
                    <div key={acc._id} className={`p-4 rounded-2xl border flex flex-col gap-3 ${isDark ? 'bg-white/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" className="w-8 h-8 drop-shadow-sm" />
                          <div>
                            <h3 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{acc.verifiedName || 'WhatsApp Business'}</h3>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.displayPhoneNumber}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span> Active
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => navigate('/app/integrations')} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'bg-[#1a1f2e] border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                          Manage Setup
                        </button>
                        <button onClick={() => handleDisconnect(acc._id)} className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-600'}`}>
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {accounts.length < 2 && (
                    <button 
                      onClick={handleEmbeddedSignup}
                      disabled={isConnecting}
                      className={`w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'border-white/20 hover:bg-white/5 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400' : 'border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                    >
                      {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Add Another Account
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <AlertTriangle size={28} className="text-amber-500" />
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>No Account Connected</h3>
                  <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Connect your WhatsApp Business API account via Facebook to start sending campaigns.
                  </p>
                  <button 
                    onClick={handleEmbeddedSignup}
                    disabled={isConnecting}
                    className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/c/cd/Facebook_logo_%28square%29.png" alt="FB" className="w-5 h-5 rounded-sm" />}
                    Connect via Facebook
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics (Static preview, similar to WhatsAppAnalyticsPage) */}
          <div className={`rounded-3xl border p-6 ${isDark ? 'bg-[#12141c] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
             <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>This Month's Usage</h3>
             <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5 font-medium">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Messages Sent</span>
                    <span className="text-emerald-500 font-bold">8,450 / 10k</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div className="h-full bg-emerald-500 w-[84.5%] rounded-full shadow-[0_0_10px_#10b981]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5 font-medium">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Active Contacts</span>
                    <span className="text-blue-500 font-bold">12,305</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div className="h-full bg-blue-500 w-[60%] rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Features Grid */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FeatureCard 
              title="Broadcasts"
              desc="Send bulk WhatsApp messages to your audience segments. High open rates guaranteed."
              icon={PlayCircle}
              color="bg-purple-500"
              cta="Create Broadcast"
              onClick={() => navigate('/app/broadcast')}
            />
            <FeatureCard 
              title="Campaigns"
              desc="Set up automated drip marketing sequences on WhatsApp to nurture your leads."
              icon={Zap}
              color="bg-[#FF6A00]"
              cta="Manage Campaigns"
              onClick={() => navigate('/app/campaigns')}
            />
            <FeatureCard 
              title="Message Templates"
              desc="Create and submit Meta-approved message templates for your marketing campaigns."
              icon={FileText}
              color="bg-blue-500"
              cta="View Templates"
              onClick={() => navigate('/app/templates')}
            />
            <FeatureCard 
              title="Audience & Contacts"
              desc="Import, manage, and segment your WhatsApp contact lists and opt-ins."
              icon={Users}
              color="bg-pink-500"
              cta="Manage Contacts"
              onClick={() => navigate('/app/contacts')}
            />
            <FeatureCard 
              title="Chatbot & Flows"
              desc="Build interactive conversational flows and automated keyword responses."
              icon={MessageSquare}
              color="bg-indigo-500"
              cta="Open Flow Builder"
              onClick={() => navigate('/app/flow-builder')}
            />
            <FeatureCard 
              title="Global Settings"
              desc="Configure webhooks, auto-replies, business profile, and default behaviors."
              icon={Settings}
              color="bg-slate-500"
              cta="View Settings"
              onClick={() => navigate('/app/integrations')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
