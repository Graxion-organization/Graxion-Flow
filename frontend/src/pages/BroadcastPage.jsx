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
import FailedMessagesModal from '../components/broadcasts/FailedMessagesModal';

export default function BroadcastPage() {
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  
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
  const [selectedBroadcastFailures, setSelectedBroadcastFailures] = useState(null);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter a campaign name");
    if (!selectedTemplate) return toast.error("Please select a pre-approved template");
    if (!activeAccount) return toast.error("Please select a WhatsApp Business account");
    if (sendType === 'later' && !scheduledAt) return toast.error("Please specify scheduled date/time");

    try {
      setIsSubmitting(true);
      const payload = {
        name,
        whatsappAccountId: activeAccount._id,
        templateId: selectedTemplate,
        contactGroupId: selectedGroup === 'all' ? null : selectedGroup,
        scheduledAt: sendType === 'later' ? scheduledAt : null,
      };

      await broadcastAPI.create(payload);
      toast.success(sendType === 'now' ? "Broadcast queued successfully!" : "Broadcast scheduled!");
      
      // Reset form
      setName('');
      setSelectedTemplate('');
      setScheduledAt('');
      setSendType('now');

      // Refresh list
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create broadcast campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTemplatePreview = () => {
    if (!selectedTemplate) return "Select a template above to preview its message content...";
    const tpl = templates.find(t => t._id === selectedTemplate);
    if (!tpl) return "Template content unavailable";
    const bodyComponent = tpl.components?.find(c => c.type === 'BODY');
    return bodyComponent?.text || "No body content in this template";
  };

  const getRecipientsCount = () => {
    if (selectedGroup === 'all') return 'All Active Audience';
    const group = groups.find(g => g._id === selectedGroup);
    return group ? `${group.contactCount || 0} Contacts` : '0 Contacts';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Processing
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock size={12} /> Scheduled
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
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
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading broadcast panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-28 px-2 sm:px-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Header section */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Megaphone className="h-6 w-6 text-[#FF6A00]" />
            Official Broadcast Campaigns
          </h1>
          <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Send bulk WhatsApp messages using pre-approved Meta templates to segmented customer groups.
          </p>
        </div>
      </div>

      {/* Main Send Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Creation Fields (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className={`rounded-2xl border p-4 sm:p-6 space-y-5 shadow-xs ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/15 text-[#FF6A00] text-xs font-bold">1</span>
              Configure Campaign details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campaign name */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Festive Discount 2026"
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark 
                      ? 'border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:border-[#FF6A00]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-[#FF6A00]'
                  }`}
                />
              </div>

              {/* Account Picker */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>WhatsApp Sender Account</label>
                <select
                  value={activeAccount?._id || ''}
                  onChange={(e) => setActiveAccount(whatsappAccounts.find(a => a._id === e.target.value))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark 
                      ? 'border-white/10 bg-slate-950 text-white focus:border-[#FF6A00]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#FF6A00]'
                  }`}
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

          <div className={`rounded-2xl border p-4 sm:p-6 space-y-5 shadow-xs ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/15 text-[#FF6A00] text-xs font-bold">2</span>
              Target Segment & Template
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Audience */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Audience Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark 
                      ? 'border-white/10 bg-slate-950 text-white focus:border-[#FF6A00]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#FF6A00]'
                  }`}
                >
                  <option value="all">All Contacts</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.contactCount || 0} contacts)</option>
                  ))}
                </select>
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Meta Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark 
                      ? 'border-white/10 bg-slate-950 text-white focus:border-[#FF6A00]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#FF6A00]'
                  }`}
                >
                  <option value="">Select an approved template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.language})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Preview */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Template Body Preview
              </span>
              <p className={`font-mono text-xs whitespace-pre-wrap leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {getTemplatePreview()}
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 sm:p-6 space-y-5 shadow-xs ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6A00]/15 text-[#FF6A00] text-xs font-bold">3</span>
              Schedule Broadcast
            </h2>

            <div className={`flex gap-2 p-1 rounded-xl border w-fit ${
              isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSendType('now')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sendType === 'now' 
                    ? 'bg-[#FF6A00] text-white shadow-xs' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Send Instantly
              </button>
              <button
                type="button"
                onClick={() => setSendType('later')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sendType === 'later' 
                    ? 'bg-[#FF6A00] text-white shadow-xs' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Schedule Delivery
              </button>
            </div>

            {sendType === 'later' && (
              <div className="space-y-1.5 max-w-sm animate-in fade-in duration-200">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Target Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark 
                      ? 'border-white/10 bg-slate-950 text-white focus:border-[#FF6A00]' 
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#FF6A00]'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary (1 col) */}
        <div className="space-y-6">
          <div className={`rounded-2xl border p-5 sm:p-6 space-y-6 lg:sticky lg:top-6 shadow-xs ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Campaign Summary
            </h2>
            
            <div className={`space-y-3.5 border-b pb-5 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Recipients Segment</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {selectedGroup === 'all' ? 'All Contacts' : groups.find(g => g._id === selectedGroup)?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Estimated Recipients</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {getRecipientsCount()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Delivery Mode</span>
                <span className={`font-bold capitalize ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {sendType === 'now' ? 'Instant Send' : 'Delayed Schedule'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={isSubmitting || !activeAccount}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6A00] hover:bg-[#ff7b1a] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF6A00]/20 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
              <div className="flex items-center gap-2 text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0" />
                <span>Connect a WhatsApp Business account in Integrations to dispatch broadcasts.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast History & Status section */}
      <div className={`rounded-2xl border p-4 sm:p-6 space-y-5 shadow-xs ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Broadcast History & Analytics
            </h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time delivery status of scheduled and dispatched campaigns.
            </p>
          </div>
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className={`p-2 rounded-xl border transition-colors ${
              isDark 
                ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Refresh History"
            aria-label="Refresh History"
          >
            <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto border border-inherit rounded-xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className={`font-semibold uppercase tracking-wider text-[11px] ${
                isDark ? 'bg-slate-950 text-slate-400 border-b border-white/10' : 'bg-slate-50 text-slate-500 border-b border-slate-200'
              }`}>
                <th className="p-3.5">Campaign Name</th>
                <th className="p-3.5">Target Group</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Sent / Failed</th>
                <th className="p-3.5">Date Executed</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {broadcasts.map((b) => (
                <tr key={b._id} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}>
                  <td className={`p-3.5 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</td>
                  <td className="p-3.5">{b.contactGroup?.name || 'All Contacts'}</td>
                  <td className="p-3.5">{getStatusBadge(b.status)}</td>
                  <td className="p-3.5 text-center font-semibold">
                    <span className="text-emerald-500">{b.sentCount || 0}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    {b.failedCount > 0 ? (
                      <button 
                        onClick={() => setSelectedBroadcastFailures(b._id)}
                        className="text-red-500 hover:underline"
                        title="View failure reasons"
                      >
                        {b.failedCount}
                      </button>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className={`p-3.5 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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

        {/* Mobile View Cards */}
        <div className="block md:hidden divide-y divide-inherit">
          {broadcasts.map((b) => (
            <div key={b._id} className="py-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</span>
                {getStatusBadge(b.status)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Group: {b.contactGroup?.name || 'All Contacts'}</span>
                <span>
                  Sent: <strong className="text-emerald-500">{b.sentCount || 0}</strong> | Failed: <strong className="text-red-500">{b.failedCount || 0}</strong>
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {broadcasts.length === 0 && (
            <p className="p-6 text-center text-xs text-slate-500">
              No broadcast campaigns yet.
            </p>
          )}
        </div>
      </div>

      {selectedBroadcastFailures && (
        <FailedMessagesModal
          broadcastId={selectedBroadcastFailures}
          onClose={() => setSelectedBroadcastFailures(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
