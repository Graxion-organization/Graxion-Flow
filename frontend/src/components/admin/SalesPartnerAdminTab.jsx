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
  Sliders
} from 'lucide-react';

export default function SalesPartnerAdminTab() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [settings, setSettings] = useState({ defaultPartnerCommissionRate: 20, minPayoutThreshold: 1000 });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal / Action states
  const [payoutModalPartner, setPayoutModalPartner] = useState(null);
  const [payoutTxnId, setPayoutTxnId] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

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
          Set the default referral profit percentage distributed to Sales Partners upon client payments.
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
                  <th className="p-3">Code</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3">Referrals</th>
                  <th className="p-3">Total Earned</th>
                  <th className="p-3">Pending Payout</th>
                  <th className="p-3 text-right">Action</th>
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
                    <td className="p-3 font-semibold">{partner.referralsCount}</td>
                    <td className="p-3 text-emerald-400 font-bold">₹{partner.totalEarned?.toLocaleString()}</td>
                    <td className="p-3 text-amber-400 font-bold">₹{partner.pendingPayout?.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      {partner.pendingPayout > 0 ? (
                        <button
                          onClick={() => setPayoutModalPartner(partner)}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition"
                        >
                          Process Payout
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No Pending</span>
                      )}
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

    </div>
  );
}
