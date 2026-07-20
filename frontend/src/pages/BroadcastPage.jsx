import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Calendar, 
  Send,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { templateAPI, contactGroupAPI, whatsappAPI, broadcastAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BroadcastPage() {
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendType, setSendType] = useState('now'); // 'now' | 'later'
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Broadcast History states
  const [broadcasts, setBroadcasts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [tplRes, grpRes, accRes] = await Promise.all([
        templateAPI.getAll(),
        contactGroupAPI.getAll(),
        whatsappAPI.getAll()
      ]);
      
      setTemplates(tplRes.data?.data?.templates || []);
      setGroups(grpRes.data?.data?.groups || []);
      
      const accounts = accRes.data?.data?.accounts || [];
      setWhatsappAccounts(accounts);
      if (accounts.length > 0) {
        setActiveAccount(accounts[0]);
      }
    } catch (err) {
      toast.error("Failed to load broadcast configurations");
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await broadcastAPI.getAll();
      setBroadcasts(res.data?.data?.broadcasts || []);
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
    loadHistory();
  }, []);

  const handleSend = async () => {
    if (!name) return toast.error("Please enter a broadcast name");
    if (!selectedTemplate) return toast.error("Please select a template");
    if (!activeAccount) return toast.error("No active WhatsApp account found");
    if (sendType === 'later' && !scheduledAt) {
      return toast.error("Please specify a date and time to schedule the broadcast");
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name,
        template: selectedTemplate,
        contactGroup: selectedGroup === 'all' ? null : selectedGroup,
        whatsappAccountId: activeAccount._id,
        scheduledAt: sendType === 'later' ? new Date(scheduledAt).toISOString() : null
      };

      await broadcastAPI.create(payload);
      toast.success(sendType === 'later' ? "Broadcast scheduled successfully!" : "Broadcast queued for immediate delivery!");
      
      // Reset form
      setName('');
      setSelectedTemplate('');
      setSelectedGroup('all');
      setSendType('now');
      setScheduledAt('');
      
      // Reload history
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTemplatePreview = () => {
    if (!selectedTemplate) return "Select a template to view preview here...";
    const tpl = templates.find(t => t._id === selectedTemplate);
    if (!tpl) return "";
    
    const bodyComponent = tpl.components?.find(c => c.type === 'BODY');
    return bodyComponent ? bodyComponent.text : "Preview not available.";
  };

  const getRecipientsCount = () => {
    if (selectedGroup === 'all') return "All Opted-In Contacts";
    const group = groups.find(g => g._id === selectedGroup);
    return group ? `${group.contactCount || 0} Contacts` : "0 Contacts";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Sent
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Loader2 size={12} className="animate-spin" /> In Progress
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={12} /> Scheduled
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6A00] h-9 w-9" />
          <p className="text-sm text-slate-400 font-medium">Loading broadcast panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-[#FF6A00]" />
            Official Broadcast Campaigns
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Send bulk WhatsApp messages using pre-approved Meta templates to segmented customer groups.
          </p>
        </div>
      </div>

      {/* Main Send Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Fields (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] text-xs font-bold">1</span>
              Configure Campaign details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campaign name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Festive Discount 2026"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              {/* Account Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">WhatsApp Sender Account</label>
                <select
                  value={activeAccount?._id || ''}
                  onChange={(e) => setActiveAccount(whatsappAccounts.find(a => a._id === e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                >
                  {whatsappAccounts.map(a => (
                    <option key={a._id} value={a._id}>{a.verifiedName} ({a.displayPhoneNumber})</option>
                  ))}
                  {whatsappAccounts.length === 0 && (
                    <option value="">No connected accounts found</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] text-xs font-bold">2</span>
              Target Segment & Template
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Audience Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                >
                  <option value="all">All Contacts</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.contactCount || 0} contacts)</option>
                  ))}
                </select>
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Meta Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                >
                  <option value="">Select an approved template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.language})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Preview */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Template Body Preview</span>
              <p className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {getTemplatePreview()}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] text-xs font-bold">3</span>
              Schedule Broadcast
            </h2>

            <div className="flex gap-4 p-1.5 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button
                type="button"
                onClick={() => setSendType('now')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sendType === 'now' ? 'bg-[#FF6A00] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Send Instantly
              </button>
              <button
                type="button"
                onClick={() => setSendType('later')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sendType === 'later' ? 'bg-[#FF6A00] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Schedule Delivery
              </button>
            </div>

            {sendType === 'later' && (
              <div className="space-y-1.5 max-w-sm animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-slate-300">Target Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary (1 col) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-6 lg:sticky lg:top-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Summary</h2>
            
            <div className="space-y-3.5 border-b border-white/5 pb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Recipients Segment</span>
                <span className="text-slate-200 font-bold">{selectedGroup === 'all' ? 'All Contacts' : groups.find(g => g._id === selectedGroup)?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Estimated Recipients</span>
                <span className="text-slate-200 font-bold">{getRecipientsCount()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Delivery Mode</span>
                <span className="text-slate-200 font-bold capitalize">{sendType === 'now' ? 'Instant Send' : 'Delayed Schedule'}</span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={isSubmitting || !activeAccount}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF6A00]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Queueing...
                </>
              ) : (
                <>
                  <Send size={14} /> Send Broadcast
                </>
              )}
            </button>

            {!activeAccount && (
              <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>You must connect at least one WhatsApp Business account in the App Store to dispatch broadcasts.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast History & Status section */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Broadcast history & analytics</h2>
            <p className="text-[11px] text-slate-400 mt-1">Real-time status updates of scheduled and processed broadcast campaigns.</p>
          </div>
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition hover:bg-white/10"
            title="Refresh History"
          >
            <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-white/5">
                <th className="p-4">Campaign Name</th>
                <th className="p-4">Target Group</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Sent / Failed</th>
                <th className="p-4">Date scheduled / executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {broadcasts.map((b) => (
                <tr key={b._id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-bold text-white">{b.name}</td>
                  <td className="p-4">{b.contactGroup?.name || 'All Contacts'}</td>
                  <td className="p-4">{getStatusBadge(b.status)}</td>
                  <td className="p-4 text-center font-semibold">
                    <span className="text-emerald-400">{b.sentCount || 0}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-red-400">{b.failedCount || 0}</span>
                  </td>
                  <td className="p-4 text-slate-400 font-mono">
                    {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : new Date(b.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {broadcasts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    No broadcast campaigns dispatched yet. Use the fields above to configure your first send!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
