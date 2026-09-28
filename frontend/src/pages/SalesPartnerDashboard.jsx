import React, { useState, useEffect, useMemo } from 'react';
import { partnerAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Users, 
  Copy, 
  Check, 
  TrendingUp, 
  Clock, 
  CreditCard,
  Share2,
  Award,
  Sparkles,
  RefreshCw,
  Search,
  MessageCircle,
  Send,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ChevronRight,
  Filter
} from 'lucide-react';

const maskEmail = (email) => {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.substring(0, 2)}***@${domain}`;
};

export default function SalesPartnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await partnerAPI.getDashboard();
      if (res?.data?.data) {
        setData(res.data.data);
      } else if (res?.data) {
        setData(res.data);
      }
      if (isManual) toast.success('Partner metrics refreshed');
    } catch (err) {
      console.warn('Sales partner dashboard error:', err);
      // Safe fallback data if backend is warming up
      if (!data) {
        setData({
          partnerCode: 'SP-PARTNER',
          commissionRate: 20,
          commissionType: 'PERCENTAGE',
          minPayoutThreshold: 1000,
          totalReferrals: 0,
          totalEarned: 0,
          pendingPayout: 0,
          paidOut: 0,
          referredUsers: []
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const referralLink = useMemo(() => {
    if (!data?.partnerCode) return '';
    return `${window.location.origin}/register?ref=${data.partnerCode}`;
  }, [data?.partnerCode]);

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(
      `Manage WhatsApp, Instagram, and YouTube operations with Graxion Flow. Use my exclusive invite link to start: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const shareOnTelegram = () => {
    const url = encodeURIComponent(referralLink);
    const text = encodeURIComponent('Join Graxion Flow - AI Social Media & WhatsApp Automation');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Exclusive Invitation to Graxion Flow');
    const body = encodeURIComponent(
      `Hi,\n\nI recommend trying Graxion Flow for social media and WhatsApp automation:\n${referralLink}\n\nBest regards.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Filtered referred users
  const filteredUsers = useMemo(() => {
    const users = data?.referredUsers || [];
    return users.filter((u) => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const plan = u.subscription?.plan?.toLowerCase() || 'free';
      const matchesPlan = 
        selectedPlanFilter === 'ALL' ||
        (selectedPlanFilter === 'PAID' && plan !== 'free') ||
        (selectedPlanFilter === 'FREE' && plan === 'free') ||
        plan === selectedPlanFilter.toLowerCase();

      return matchesSearch && matchesPlan;
    });
  }, [data?.referredUsers, searchQuery, selectedPlanFilter]);

  const minPayout = data?.minPayoutThreshold || 1000;
  const pendingPayout = data?.pendingPayout || 0;
  const payoutProgress = Math.min(Math.round((pendingPayout / minPayout) * 100), 100);
  const isPayoutEligible = pendingPayout >= minPayout;

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 pb-28 max-w-7xl mx-auto">
        <div className="h-44 bg-white/5 rounded-3xl" />
        <div className="h-28 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 max-w-7xl mx-auto px-2 sm:px-4">
      
      {/* 🌟 Header Banner */}
      <div className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-xl transition-all shadow-xl ${
        isDark 
          ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/30 border-emerald-500/20' 
          : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 text-xs font-bold">
                <Award size={14} /> Official Sales Partner
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                • Verified Affiliate Tier
              </span>
            </div>

            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Sales Partner Dashboard
            </h1>

            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Earn <span className="text-emerald-500 font-bold">{data?.commissionRate || 20}% lifetime recurring commission</span> on every business that subscribes to Graxion Flow through your referral link.
            </p>
          </div>

          {/* Quick Metrics Strip on Header */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
            <div className={`p-3 sm:p-3.5 rounded-2xl border text-center min-w-[110px] sm:min-w-[125px] flex-1 sm:flex-initial ${
              isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Commission
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-500 mt-0.5">
                {data?.commissionRate || 20}%
              </p>
            </div>

            <div className={`p-3 sm:p-3.5 rounded-2xl border text-center min-w-[110px] sm:min-w-[125px] flex-1 sm:flex-initial ${
              isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Min Payout
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-500 mt-0.5">
                ₹{minPayout.toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center ${
                isDark 
                  ? 'border-white/10 bg-slate-900/80 hover:bg-white/10 text-slate-300' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs'
              }`}
              title="Refresh Partner Data"
              aria-label="Refresh Partner Data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin text-emerald-500' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 🔗 Exclusive Referral Link Card (Mobile First) */}
      <div className={`rounded-2xl border p-4 sm:p-6 backdrop-blur-md shadow-lg space-y-4 transition-all ${
        isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <Share2 size={16} className="text-emerald-500" /> Exclusive Partner Referral Link
          </label>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Your Code:</span>
            <code className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              {data?.partnerCode || 'SP-PARTNER'}
            </code>
          </div>
        </div>

        {/* Input + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              onFocus={(e) => e.target.select()}
              className={`w-full rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none border transition-all ${
                isDark 
                  ? 'bg-slate-950 border-white/10 text-slate-200 focus:border-emerald-500/50' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>

          <button
            onClick={copyReferralLink}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 shrink-0 min-h-[44px]"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Quick Social Share Buttons */}
        <div className="pt-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Quick Share:
          </span>

          <button
            onClick={shareOnWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all min-h-[36px]"
          >
            <MessageCircle size={14} /> WhatsApp
          </button>

          <button
            onClick={shareOnTelegram}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 transition-all min-h-[36px]"
          >
            <Send size={14} /> Telegram
          </button>

          <button
            onClick={shareViaEmail}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[36px] ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Mail size={14} /> Email Invite
          </button>
        </div>
      </div>

      {/* 💰 Stats Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Referrals */}
        <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-md ${
          isDark ? 'bg-slate-900/60 border-white/10 hover:border-blue-500/40' : 'bg-white border-slate-200 hover:shadow-lg'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Referrals
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
              isDark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              <Users size={18} />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(data?.totalReferrals || 0).toLocaleString()}
          </p>
          <div className="mt-3 pt-3 border-t border-inherit flex items-center justify-between text-xs">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Referred clients</span>
            <span className="text-blue-500 font-semibold">Active Tracker</span>
          </div>
        </div>

        {/* Card 2: Total Profit Earned */}
        <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-md ${
          isDark ? 'bg-slate-900/60 border-white/10 hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:shadow-lg'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Lifetime Earnings
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
              isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
            ₹{(data?.totalEarned || 0).toLocaleString()}
          </p>
          <div className="mt-3 pt-3 border-t border-inherit flex items-center justify-between text-xs">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total commission</span>
            <span className="text-emerald-500 font-semibold">20% Tier</span>
          </div>
        </div>

        {/* Card 3: Pending Payout */}
        <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-md ${
          isDark ? 'bg-slate-900/60 border-white/10 hover:border-amber-500/40' : 'bg-white border-slate-200 hover:shadow-lg'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pending Payout
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
              isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight">
              ₹{(pendingPayout).toLocaleString()}
            </p>
            {isPayoutEligible && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                Eligible
              </span>
            )}
          </div>

          {/* Mini progress bar towards threshold */}
          <div className="mt-3 pt-3 border-t border-inherit">
            <div className="flex justify-between text-[11px] mb-1">
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Min: ₹{minPayout}</span>
              <span className="font-bold text-amber-500">{payoutProgress}%</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isPayoutEligible ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${payoutProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Paid Out */}
        <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-md ${
          isDark ? 'bg-slate-900/60 border-white/10 hover:border-purple-500/40' : 'bg-white border-slate-200 hover:shadow-lg'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Successfully Disbursed
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
              isDark ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-100'
            }`}>
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-500 tracking-tight">
            ₹{(data?.paidOut || 0).toLocaleString()}
          </p>
          <div className="mt-3 pt-3 border-t border-inherit flex items-center justify-between text-xs">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bank / UPI transferred</span>
            <span className="text-purple-500 font-semibold">Processed</span>
          </div>
        </div>

      </div>

      {/* 🚀 Payout Threshold Status Callout Banner */}
      {isPayoutEligible ? (
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 mt-0.5 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Payout Threshold Reached (₹{pendingPayout.toLocaleString()})
              </h2>
              <p className="text-xs mt-0.5 opacity-90 max-w-xl">
                You have exceeded the minimum payout threshold of ₹{minPayout}. Payouts are automatically audited and disbursed bi-weekly to your configured payout method.
              </p>
            </div>
          </div>

          <a
            href="mailto:partner-support@graxion.in?subject=Partner%20Payout%20Request%20-%20"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all text-center whitespace-nowrap shadow-md shadow-emerald-600/20"
          >
            Update Bank / UPI Details
          </a>
        </div>
      ) : (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
          isDark ? 'bg-slate-900/40 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
          <span>
            Payouts are automatically unlocked once your pending earnings reach <strong className="text-emerald-500">₹{minPayout.toLocaleString()}</strong>. Share your referral link with clients to reach the threshold faster.
          </span>
        </div>
      )}

      {/* 👥 Referred Clients Section */}
      <div className={`rounded-2xl border backdrop-blur-md shadow-lg transition-all ${
        isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200'
      }`}>
        {/* Header with Title and Search/Filters */}
        <div className="p-4 sm:p-6 border-b border-inherit space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Users size={18} />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Referred Clients ({data?.referredUsers?.length || 0})
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  All accounts registered through your partner link and generated commission
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-8 pr-3 py-2 border outline-none transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Plan Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className={`text-[11px] font-semibold mr-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Filter size={12} /> Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Clients' },
              { id: 'PAID', label: 'Paid Plans' },
              { id: 'FREE', label: 'Free Tier' },
              { id: 'pro', label: 'Pro' },
              { id: 'enterprise', label: 'Enterprise' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedPlanFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedPlanFilter === f.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDark
                      ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Responsive Table (Desktop) vs Responsive Cards (Mobile) */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-3">
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
              isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <Users size={24} />
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {searchQuery || selectedPlanFilter !== 'ALL' ? 'No matching clients found' : 'No clients have signed up using your link yet.'}
            </p>
            <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {searchQuery || selectedPlanFilter !== 'ALL' 
                ? 'Try adjusting your search query or plan filter.' 
                : 'Share your exclusive partner referral link with prospects to start accumulating 20% recurring commission.'}
            </p>
            {!searchQuery && selectedPlanFilter === 'ALL' && (
              <button
                onClick={copyReferralLink}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                <Copy size={14} /> Copy Partner Link
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table: Hidden on mobile screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[11px] font-semibold tracking-wider ${
                  isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <tr>
                    <th className="px-6 py-3.5">Client Name</th>
                    <th className="px-6 py-3.5">Contact Email</th>
                    <th className="px-6 py-3.5">Current Plan</th>
                    <th className="px-6 py-3.5 text-right">Commission Earned</th>
                    <th className="px-6 py-3.5 text-right">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {filteredUsers.map((client) => {
                    const plan = client.subscription?.plan || 'free';
                    const isPaid = plan.toLowerCase() !== 'free';
                    return (
                      <tr 
                        key={client._id} 
                        className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 font-bold text-xs flex items-center justify-center">
                              {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <span className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {client.name || 'Anonymous User'}
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {maskEmail(client.email)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isDark
                                ? 'bg-white/10 text-slate-400'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {client.commissionEarned > 0 ? (
                            <span className="font-bold text-emerald-500 text-xs sm:text-sm">
                              ₹{client.commissionEarned.toLocaleString()}
                            </span>
                          ) : (
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              Free Plan
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(client.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards: Visible on phone screens */}
            <div className="block md:hidden divide-y divide-inherit">
              {filteredUsers.map((client) => {
                const plan = client.subscription?.plan || 'free';
                const isPaid = plan.toLowerCase() !== 'free';
                return (
                  <div key={client._id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 font-bold text-xs flex items-center justify-center">
                          {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {client.name || 'Anonymous User'}
                          </p>
                          <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {maskEmail(client.email)}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isDark
                            ? 'bg-white/10 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {plan}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${
                      isDark ? 'bg-white/5' : 'bg-slate-50'
                    }`}>
                      <div>
                        <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Commission Earned
                        </span>
                        <span className="font-bold text-emerald-500 text-sm">
                          {client.commissionEarned > 0 ? `₹${client.commissionEarned.toLocaleString()}` : '₹0 (Free Plan)'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Registered On
                        </span>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                          {new Date(client.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer info bar */}
        <div className={`p-4 border-t border-inherit text-xs flex items-center justify-between ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>
            Showing {filteredUsers.length} of {data?.referredUsers?.length || 0} referred clients
          </span>
          <span className="text-emerald-500 font-medium">
            20% Automated Sync
          </span>
        </div>
      </div>

      {/* 📘 Sales Partner Program Highlights (3 Responsive Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold">
            1
          </div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Recurring Commissions
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            You earn 20% not only on their initial purchase, but also on every subscription renewal month after month.
          </p>
        </div>

        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center font-bold">
            2
          </div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            60-Day Cookie Tracking
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            When a prospect clicks your link, your partner code is securely credited even if they register up to 60 days later.
          </p>
        </div>

        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center font-bold">
            3
          </div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Direct Bank & UPI Payouts
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Commissions exceeding ₹{minPayout} are processed automatically on the 1st and 15th of each calendar month.
          </p>
        </div>
      </div>

    </div>
  );
}
