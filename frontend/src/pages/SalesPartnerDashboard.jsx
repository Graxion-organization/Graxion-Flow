import React, { useState, useEffect } from 'react';
import { partnerAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  Users, 
  Copy, 
  Check, 
  TrendingUp, 
  Clock, 
  CreditCard,
  Share2,
  Award,
  Sparkles
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
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await partnerAPI.getDashboard();
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load Sales Partner dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!data?.partnerCode) return;
    const link = `${window.location.origin}/register?ref=${data.partnerCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading Partner Dashboard...</span>
        </div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/register?ref=${data?.partnerCode || ''}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900/40 via-slate-900 to-teal-900/30 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold mb-3">
              <Award size={14} /> Official Sales Partner
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
              Sales Partner Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Earn <span className="text-emerald-400 font-bold">{data?.commissionRate}% commission</span> on every client who subscribes through your referral link.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 text-center min-w-[130px]">
              <span className="text-xs text-slate-400 uppercase font-semibold">Min. Payout</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">₹{data?.minPayoutThreshold}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Copy Card */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Share2 size={14} className="text-emerald-400" /> Your Exclusive Partner Referral Link
          </label>
          <span className="text-xs text-slate-500">Code: <code className="text-emerald-400 font-mono font-bold">{data?.partnerCode}</code></span>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="text" 
            readOnly 
            value={referralLink} 
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 font-mono outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={copyReferralLink}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Referrals</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{data?.totalReferrals || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Referred accounts created</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Profit Earned</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">₹{data?.totalEarned?.toLocaleString() || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime total earnings</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">₹{data?.pendingPayout?.toLocaleString() || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting admin processing</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Paid Out</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400">₹{data?.paidOut?.toLocaleString() || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Successfully transferred</p>
        </div>

      </div>

      {/* Referred Clients Table */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> Referred Clients ({data?.referredUsers?.length || 0})
        </h2>

        {data?.referredUsers?.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No clients have signed up using your link yet.</p>
            <p className="text-xs text-slate-600 mt-1">Share your referral link above to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Earnings</th>
                  <th className="p-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.referredUsers?.map((client) => (
                  <tr key={client._id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-semibold text-white">{client.name}</td>
                    <td className="p-3 text-slate-400">{maskEmail(client.email)}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        client.subscription?.plan === 'free' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {client.subscription?.plan || 'free'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-emerald-400">
                      {client.commissionEarned > 0 ? `₹${client.commissionEarned.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-slate-400">{new Date(client.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
