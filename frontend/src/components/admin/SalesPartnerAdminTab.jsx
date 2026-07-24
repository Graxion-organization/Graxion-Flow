import React, { useState, useEffect } from 'react';
import { partnerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  Users, 
  Settings, 
  CheckCircle, 
  Clock, 
  CreditCard,
  UserCheck,
  Search,
  Sliders,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Calendar,
  Tag
} from 'lucide-react';

export default function SalesPartnerAdminTab() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [settings, setSettings] = useState({ defaultPartnerCommissionRate: 20, minPayoutThreshold: 1000 });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal / Action states for Payout
  const [payoutModalPartner, setPayoutModalPartner] = useState(null);
  const [payoutTxnId, setPayoutTxnId] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Modal / Action states for Viewing Referred Users
  const [selectedPartnerForUsers, setSelectedPartnerForUsers] = useState(null);
  const [partnerUsersData, setPartnerUsersData] = useState(null);
  const [loadingUsersData, setLoadingUsersData] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Promote User State
  const [promoteUserId, setPromoteUserId] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partnersRes, settingsRes] = await Promise.all([
        partnerAPI.adminGetPartners(),
        partnerAPI.adminGetSettings()
      ]);
      setPartners(partnersRes.data.data.partners);
      setSettings(settingsRes.data.data.settings);
    } catch (err) {
      toast.error('Failed to load Sales Partner admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await partnerAPI.adminUpdateSettings({
        defaultPartnerCommissionRate: Number(settings.defaultPartnerCommissionRate),
        minPayoutThreshold: Number(settings.minPayoutThreshold)
      });
      toast.success('Global partner commission settings saved!');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!payoutModalPartner) return;
    try {
      setProcessingPayout(true);
      await partnerAPI.adminProcessPayout({
        partnerId: payoutModalPartner._id,
        payoutTxnId
      });
      toast.success(`Payout processed for ${payoutModalPartner.name}!`);
      setPayoutModalPartner(null);
      setPayoutTxnId('');
      fetchData();
    } catch (err) {
      toast.error('Failed to process payout');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handlePromotePartner = async (e) => {
    e.preventDefault();
    if (!promoteUserId) return toast.error('Please enter User ID');
    try {
      setPromoting(true);
      await partnerAPI.adminAssignRole({
        userId: promoteUserId,
        role: 'sales_partner',
        customCommissionRate: customRate ? Number(customRate) : undefined
      });
      toast.success('User promoted to Sales Partner!');
      setPromoteUserId('');
      setCustomRate('');
      fetchData();
    } catch (err) {
      toast.error('Failed to promote partner. Check User ID.');
    } finally {
      setPromoting(false);
    }
  };

  const handleViewReferredUsers = async (partner) => {
    try {
      setSelectedPartnerForUsers(partner);
      setLoadingUsersData(true);
      setPartnerUsersData(null);
      setUserSearchQuery('');
      setExpandedUserId(null);

      const res = await partnerAPI.adminGetPartnerUsers(partner._id);
      setPartnerUsersData(res.data.data);
    } catch (err) {
      toast.error('Failed to fetch referred users for this partner');
      console.error(err);
    } finally {
      setLoadingUsersData(false);
    }
  };

  const filteredReferredUsers = partnerUsersData?.referredUsers?.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.subscription?.plan?.toLowerCase().includes(q)
    );
  }) || [];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading Sales Partners Control Panel...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Commission Settings Control Box */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" /> Global Commission & Distribution Controls
        </h2>
        <p className="text-xs text-slate-400">
          Set the default referral profit percentage distributed to Sales Partners strictly upon verified client payments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Default Commission (%)
            </label>
            <input 
              type="number"
              value={settings.defaultPartnerCommissionRate}
              onChange={(e) => setSettings({ ...settings, defaultPartnerCommissionRate: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Min. Payout Threshold (₹)
            </label>
            <input 
              type="number"
              value={settings.minPayoutThreshold}
              onChange={(e) => setSettings({ ...settings, minPayoutThreshold: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="1000"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Commission Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Add / Promote Sales Partner */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" /> Promote User to Sales Partner
        </h2>
        <form onSubmit={handlePromotePartner} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            type="text"
            placeholder="Enter User MongoDB ID"
            value={promoteUserId}
            onChange={(e) => setPromoteUserId(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-emerald-500"
            required
          />
          <input 
            type="number"
            placeholder="Custom Rate % (Optional)"
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={promoting}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white rounded-xl transition shadow-lg"
          >
            {promoting ? 'Promoting...' : 'Make Sales Partner'}
          </button>
        </form>
      </div>

      {/* Partners List Table */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Active Sales Partners ({partners.length})
          </h2>
        </div>

        {partners.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">No sales partners active yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3">Partner Name</th>
                  <th className="p-3">Partner Code</th>
                  <th className="p-3">Comm. Rate</th>
                  <th className="p-3">Referred Users</th>
                  <th className="p-3">Total Sales Revenue</th>
                  <th className="p-3">Total Earned</th>
                  <th className="p-3">Pending Payout</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {partners.map((partner) => (
                  <tr key={partner._id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-semibold text-white">
                      {partner.name}
                      <span className="block text-xs font-normal text-slate-500">{partner.email}</span>
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">{partner.partnerCode}</td>
                    <td className="p-3 font-bold">{partner.partnerCommissionRate || settings.defaultPartnerCommissionRate}%</td>
                    <td className="p-3 font-semibold">
                      <button 
                        onClick={() => handleViewReferredUsers(partner)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/20 transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {partner.referralsCount} Users
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                      </button>
                    </td>
                    <td className="p-3 text-blue-400 font-bold">₹{partner.totalRevenueGenerated?.toLocaleString() || 0}</td>
                    <td className="p-3 text-emerald-400 font-bold">₹{partner.totalEarned?.toLocaleString() || 0}</td>
                    <td className="p-3 text-amber-400 font-bold">₹{partner.pendingPayout?.toLocaleString() || 0}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleViewReferredUsers(partner)}
                        className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        title="View Referred Users Data"
                      >
                        <ExternalLink className="w-3 h-3" /> View Data
                      </button>
                      {partner.pendingPayout > 0 ? (
                        <button
                          onClick={() => setPayoutModalPartner(partner)}
                          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> Payout
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Processing Modal */}
      {payoutModalPartner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Process Payout for {payoutModalPartner.name}</h3>
            <p className="text-xs text-slate-400">
              Pending Payout Amount: <span className="text-amber-400 font-bold text-sm">₹{payoutModalPartner.pendingPayout?.toLocaleString()}</span>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Payment Reference / UTR Number</label>
              <input 
                type="text"
                placeholder="e.g. UTR129304910293"
                value={payoutTxnId}
                onChange={(e) => setPayoutTxnId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setPayoutModalPartner(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleProcessPayout}
                disabled={processingPayout || !payoutTxnId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {processingPayout ? 'Processing...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referred Users Data Modal View */}
      {selectedPartnerForUsers && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Referred Users - {selectedPartnerForUsers.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Partner Code: <span className="text-emerald-400 font-mono font-bold">{selectedPartnerForUsers.partnerCode}</span> | Email: <span className="text-slate-300">{selectedPartnerForUsers.email}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedPartnerForUsers(null);
                  setPartnerUsersData(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingUsersData ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Fetching referred users & payment history...
              </div>
            ) : partnerUsersData ? (
              <div className="space-y-6 overflow-y-auto pr-2">
                
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Total Referred Clients</p>
                    <p className="text-2xl font-bold text-white mt-1">{partnerUsersData.totalReferredUsers}</p>
                  </div>
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Total Sales Revenue Generated</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">₹{partnerUsersData.totalRevenueGenerated?.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Partner Commission Generated</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">₹{partnerUsersData.totalCommissionsEarned?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search referred user by name, email, or plan..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* User Data Table */}
                {filteredReferredUsers.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm">No referred users found.</p>
                ) : (
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-white/10">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Joined Date</th>
                          <th className="p-3">Current Plan</th>
                          <th className="p-3">Captured Payments</th>
                          <th className="p-3">Total Paid</th>
                          <th className="p-3">Comm. Generated</th>
                          <th className="p-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredReferredUsers.map((u) => {
                          const isExpanded = expandedUserId === u._id;
                          return (
                            <React.Fragment key={u._id}>
                              <tr className="hover:bg-white/5 transition cursor-pointer" onClick={() => setExpandedUserId(isExpanded ? null : u._id)}>
                                <td className="p-3 font-semibold text-white">
                                  {u.name}
                                  <span className="block text-[11px] font-normal text-slate-400">{u.email}</span>
                                </td>
                                <td className="p-3 text-slate-400">
                                  {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    u.subscription?.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                    u.subscription?.plan === 'pro' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                    u.subscription?.plan === 'starter' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                    'bg-slate-800 text-slate-400'
                                  }`}>
                                    {u.subscription?.plan || 'free'}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-slate-300">
                                  {u.paymentsCount} payments
                                </td>
                                <td className="p-3 font-bold text-blue-400">
                                  ₹{u.totalPaidAmount?.toLocaleString()}
                                </td>
                                <td className="p-3 font-bold text-emerald-400">
                                  ₹{u.totalCommissionEarned?.toLocaleString()}
                                </td>
                                <td className="p-3 text-right">
                                  <button className="p-1 text-slate-400 hover:text-white">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Payment & Commission Details for this User */}
                              {isExpanded && (
                                <tr className="bg-slate-900/80">
                                  <td colSpan={7} className="p-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                      <ShieldCheck className="w-4 h-4" /> Payment & Commission Audit Breakdown for {u.name}
                                    </div>
                                    
                                    {u.payments.length === 0 ? (
                                      <p className="text-xs text-slate-500 italic">No captured payments yet. Commission triggers only after successful payments.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                        
                                        {/* Captured Payments List */}
                                        <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2">
                                          <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                                            <CreditCard className="w-3 h-3 text-blue-400" /> Captured Payment Records ({u.payments.length})
                                          </p>
                                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {u.payments.map((p) => (
                                              <div key={p._id} className="flex justify-between items-center text-[11px] bg-slate-900 p-2 rounded border border-white/5">
                                                <div>
                                                  <span className="font-bold text-white capitalize">{p.plan} Plan</span>
                                                  <span className="block text-[10px] text-slate-500 font-mono">{p.razorpayPaymentId || p._id}</span>
                                                </div>
                                                <div className="text-right">
                                                  <span className="font-bold text-blue-400">₹{(p.amount / 100).toLocaleString()}</span>
                                                  <span className="block text-[10px] text-slate-500">
                                                    {new Date(p.createdAt).toLocaleDateString()}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Generated Commissions List */}
                                        <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2">
                                          <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                                            <DollarSign className="w-3 h-3 text-emerald-400" /> Distributed Commissions ({u.commissions.length})
                                          </p>
                                          {u.commissions.length === 0 ? (
                                            <p className="text-[11px] text-slate-500 italic">No commissions generated yet.</p>
                                          ) : (
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                              {u.commissions.map((c) => (
                                                <div key={c._id} className="flex justify-between items-center text-[11px] bg-slate-900 p-2 rounded border border-white/5">
                                                  <div>
                                                    <span className="font-semibold text-slate-300">Rate: {c.commissionRate}%</span>
                                                    <span className="block text-[10px] text-slate-500">{c.notes}</span>
                                                  </div>
                                                  <div className="text-right">
                                                    <span className="font-bold text-emerald-400">₹{c.commissionAmount?.toLocaleString()}</span>
                                                    <span className={`block text-[10px] font-semibold ${
                                                      c.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}>{c.status}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}

                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => {
                  setSelectedPartnerForUsers(null);
                  setPartnerUsersData(null);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
