import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bot, Plus, Pencil, Trash2, Play, ToggleLeft, ToggleRight,
  Loader2, Zap, MessageSquare, X, Send, ChevronDown
} from 'lucide-react';
import { agentAPI, whatsappAPI, telegramAPI, instagramAPI, facebookAPI, youtubeAPI } from '../services/api';
import toast from 'react-hot-toast';

const agentSchema = z.object({
  name:                z.string().min(2, 'Min 2 chars').max(50),
  description:         z.string().max(200).optional(),
  platforms:           z.array(z.string()).min(1, 'Select at least one platform'),
  whatsappAccountId:   z.string().optional(),
  telegramAccountId:   z.string().optional(),
  instagramAccountId:  z.string().optional(),
  facebookAccountId:   z.string().optional(),
  youtubeAccountId:    z.string().optional(),
  aiProvider:          z.enum(['openai', 'anthropic']),
  model:               z.string().min(1, 'Select a model'),
  systemPrompt:        z.string().min(10, 'Min 10 chars').max(4000),
  temperature:         z.coerce.number().min(0).max(2),
  maxTokens:           z.coerce.number().min(50).max(2000),
  fallbackMessage:     z.string().max(500).optional(),
  greetingMessage:     z.string().max(1000).optional(),
  humanHandoffKeywords:z.string().optional(),
  contextWindow:       z.coerce.number().min(1).max(50),
});

const PLATFORMS = [
  { id: 'whatsapp',  label: 'WhatsApp',  color: 'bg-green-50 border-green-200 text-green-700',  active: 'bg-green-500 border-green-500 text-white', emoji: '📱' },
  { id: 'telegram',  label: 'Telegram',  color: 'bg-blue-50 border-blue-200 text-blue-700',    active: 'bg-[#229ED9] border-[#229ED9] text-white', emoji: '✈️' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-50 border-pink-200 text-pink-700',    active: 'bg-gradient-to-r from-purple-500 to-pink-500 border-pink-500 text-white', emoji: '📷' },
  { id: 'facebook',  label: 'Messenger', color: 'bg-blue-50 border-blue-200 text-blue-700',    active: 'bg-[#0084FF] border-[#0084FF] text-white', emoji: '💬' },
  { id: 'youtube',   label: 'YouTube',   color: 'bg-red-50 border-red-200 text-red-700',       active: 'bg-[#FF0000] border-[#FF0000] text-white', emoji: '▶️' },
];

const PROVIDER_MODELS = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
};

const DEFAULT_PROMPTS = {
  customer_support: 'You are a helpful customer support agent. Be polite, concise, and solve problems efficiently. If you cannot help, offer to escalate to a human agent.',
  sales:            'You are an enthusiastic sales assistant. Help customers discover products, answer questions about pricing and features, and guide them toward making a purchase.',
  booking:          'You are an appointment booking assistant. Help customers schedule, reschedule, or cancel appointments. Always confirm details before finalizing.',
};

function AgentFormModal({ onClose, onSave, editingAgent, waAccounts, tgAccounts, igAccounts, fbAccounts, ytAccounts }) {
  const [selectedProvider, setSelectedProvider] = useState(editingAgent?.aiProvider || 'openai');

  // Derive initial platforms from editingAgent's old platform field or new platforms array
  const getInitialPlatforms = () => {
    if (editingAgent?.platforms?.length) return editingAgent.platforms;
    if (editingAgent?.platform) {
      if (editingAgent.platform === 'both') return ['whatsapp', 'telegram'];
      if (editingAgent.platform === 'all') return ['whatsapp', 'telegram', 'instagram'];
      return [editingAgent.platform];
    }
    return ['whatsapp'];
  };

  const [selectedPlatforms, setSelectedPlatforms] = useState(getInitialPlatforms);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(agentSchema),
    defaultValues: editingAgent ? {
      ...editingAgent,
      platforms: getInitialPlatforms(),
      whatsappAccountId: editingAgent.whatsappAccount?._id || editingAgent.whatsappAccount,
      telegramAccountId: editingAgent.telegramAccount?._id || editingAgent.telegramAccount,
      instagramAccountId: editingAgent.instagramAccount?._id || editingAgent.instagramAccount,
      facebookAccountId: editingAgent.facebookAccount?._id || editingAgent.facebookAccount,
      youtubeAccountId: editingAgent.youtubeAccount?._id || editingAgent.youtubeAccount,
      humanHandoffKeywords: editingAgent.humanHandoffKeywords?.join(', ') || '',
    } : {
      platforms: ['whatsapp'],
      aiProvider: 'openai', model: 'gpt-4o', temperature: 0.7,
      maxTokens: 500, contextWindow: 10,
    },
  });

  const togglePlatform = (id) => {
    const next = selectedPlatforms.includes(id)
      ? selectedPlatforms.filter(p => p !== id)
      : [...selectedPlatforms, id];
    if (next.length === 0) return; // at least one
    setSelectedPlatforms(next);
    setValue('platforms', next, { shouldValidate: true });
  };

  const provider = watch('aiProvider');

  useEffect(() => {
    setSelectedProvider(provider);
    if (!editingAgent) setValue('model', PROVIDER_MODELS[provider][0]);
  }, [provider]);

  const onSubmit = async (data) => {
    const plats = selectedPlatforms;
    if (plats.includes('whatsapp') && !data.whatsappAccountId) {
      toast.error('Please select a WhatsApp account'); return;
    }
    if (plats.includes('telegram') && !data.telegramAccountId) {
      toast.error('Please select a Telegram account'); return;
    }
    if (plats.includes('instagram') && !data.instagramAccountId) {
      toast.error('Please select an Instagram account'); return;
    }
    if (plats.includes('facebook') && !data.facebookAccountId) {
      toast.error('Please select a Facebook page'); return;
    }
    if (plats.includes('youtube') && !data.youtubeAccountId) {
      toast.error('Please select a YouTube channel'); return;
    }

    const payload = {
      ...data,
      platforms: plats,
      // Keep legacy platform field for backward compat
      platform: plats.length === 1 ? plats[0] : plats.includes('whatsapp') && plats.includes('telegram') ? 'both' : 'all',
      whatsappAccount:  plats.includes('whatsapp')  ? data.whatsappAccountId  : null,
      telegramAccount:  plats.includes('telegram')  ? data.telegramAccountId  : null,
      instagramAccount: plats.includes('instagram') ? data.instagramAccountId : null,
      facebookAccount:  plats.includes('facebook')  ? data.facebookAccountId  : null,
      youtubeAccount:   plats.includes('youtube')   ? data.youtubeAccountId   : null,
      humanHandoffKeywords: data.humanHandoffKeywords
        ? data.humanHandoffKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [],
    };
    try {
      let res;
      if (editingAgent) {
        res = await agentAPI.update(editingAgent._id, payload);
        toast.success('Agent updated!');
      } else {
        res = await agentAPI.create(payload);
        toast.success('Agent created!');
      }
      onSave(res.data.data.agent, !!editingAgent);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save agent');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">{editingAgent ? 'Edit Agent' : 'Create AI Agent'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Agent Name</label>
              <input {...register('name')} placeholder="e.g. Customer Support Bot" className="input" />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>

          {/* Platform — visual card selector */}
          <div className="sm:col-span-2">
            <label className="label">Platform <span className="text-gray-400 font-normal">(select one or more)</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLATFORMS.map(({ id, label, color, active, emoji }) => {
                const isSelected = selectedPlatforms.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => togglePlatform(id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition-all
                      ${isSelected ? active : color + ' hover:opacity-80'}`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    {label}
                    {isSelected && <span className="text-[10px] opacity-80">✓ Selected</span>}
                  </button>
                );
              })}
            </div>
            {errors.platforms && <p className="err">{errors.platforms.message}</p>}
          </div>

          {/* WhatsApp account picker */}
          {selectedPlatforms.includes('whatsapp') && (
            <div>
              <label className="label">WhatsApp Number</label>
              <select {...register('whatsappAccountId')} className="input">
                <option value="">Select number...</option>
                {waAccounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.displayPhoneNumber} {a.verifiedName ? `(${a.verifiedName})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Telegram account picker */}
          {selectedPlatforms.includes('telegram') && (
            <div>
              <label className="label">Telegram Bot</label>
              <select {...register('telegramAccountId')} className="input">
                <option value="">Select bot...</option>
                {tgAccounts.map((a) => (
                  <option key={a._id} value={a._id}>@{a.botUsername} {a.botName ? `(${a.botName})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Instagram account picker */}
          {selectedPlatforms.includes('instagram') && (
            <div>
              <label className="label">Instagram Account</label>
              <select {...register('instagramAccountId')} className="input">
                <option value="">Select account...</option>
                {igAccounts.map((a) => (
                  <option key={a._id} value={a._id}>@{a.igUsername || a.igAccountId}</option>
                ))}
              </select>
            </div>
          )}

          {/* Facebook account picker */}
          {selectedPlatforms.includes('facebook') && (
            <div>
              <label className="label">Facebook Page</label>
              <select {...register('facebookAccountId')} className="input">
                <option value="">Select page...</option>
                {fbAccounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.pageName || a.pageId}</option>
                ))}
              </select>
            </div>
          )}

          {/* YouTube account picker */}
          {selectedPlatforms.includes('youtube') && (
            <div>
              <label className="label">YouTube Channel</label>
              <select {...register('youtubeAccountId')} className="input">
                <option value="">Select channel...</option>
                {ytAccounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.channelName || a.channelId}</option>
                ))}
              </select>
              {ytAccounts.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No YouTube channels connected. Go to Integrations → YouTube first.</p>
              )}
            </div>
          )}

            <div>
              <label className="label">Description</label>
              <input {...register('description')} placeholder="What does this agent do?" className="input" />
            </div>
          </div>

          {/* AI Config */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-700">AI Configuration</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">AI Provider</label>
                <select {...register('aiProvider')} className="input">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              <div>
                <label className="label">Model</label>
                <select {...register('model')} className="input">
                  {PROVIDER_MODELS[selectedProvider].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Temperature ({watch('temperature')})</label>
                <input {...register('temperature')} type="range" min="0" max="2" step="0.1" className="w-full accent-whatsapp" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Precise</span><span>Creative</span></div>
              </div>
              <div>
                <label className="label">Max Response Tokens ({watch('maxTokens')})</label>
                <input {...register('maxTokens')} type="range" min="50" max="2000" step="50" className="w-full accent-whatsapp" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50</span><span>2000</span></div>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">System Prompt</label>
              <div className="flex gap-1">
                {Object.entries({ 'Support': 'customer_support', 'Sales': 'sales', 'Booking': 'booking' }).map(([label, key]) => (
                  <button key={key} type="button" onClick={() => setValue('systemPrompt', DEFAULT_PROMPTS[key])}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-whatsapp/10 hover:text-whatsapp rounded-lg transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              {...register('systemPrompt')}
              rows={5}
              placeholder="You are a helpful assistant for [Business Name]..."
              className="input resize-none font-mono text-xs"
            />
            {errors.systemPrompt && <p className="err">{errors.systemPrompt.message}</p>}
          </div>

          {/* Behavior */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Greeting Message</label>
              <textarea {...register('greetingMessage')} rows={2} placeholder="Hi! How can I help you today?" className="input resize-none text-sm" />
            </div>
            <div>
              <label className="label">Fallback Message</label>
              <textarea {...register('fallbackMessage')} rows={2} placeholder="Sorry, I didn't understand. Please rephrase." className="input resize-none text-sm" />
            </div>
            <div>
              <label className="label">Human Handoff Keywords</label>
              <input {...register('humanHandoffKeywords')} placeholder="human, agent, support, help" className="input text-sm" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated. Message that triggers human takeover.</p>
            </div>
            <div>
              <label className="label">Context Window ({watch('contextWindow')} messages)</label>
              <input {...register('contextWindow')} type="range" min="1" max="50" className="w-full accent-whatsapp mt-2" />
              <p className="text-xs text-gray-400 mt-1">How many past messages AI remembers.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-whatsapp text-white py-3 rounded-xl font-medium hover:bg-whatsapp-dark disabled:opacity-60 transition-colors">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingAgent ? 'Update Agent' : 'Create Agent'}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestModal({ agent, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await agentAPI.test(agent._id, userMsg);
      const { response, responseTime, tokensUsed } = res.data.data;
      setMessages((prev) => [...prev, { role: 'assistant', content: response, meta: `${(responseTime / 1000).toFixed(2)}s · ${tokensUsed} tokens` }]);
    } catch { toast.error('Test failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col" style={{ height: '560px' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-whatsapp/10 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-whatsapp" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{agent.name}</p>
              <p className="text-xs text-gray-400">{agent.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-8">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p>Send a message to test your agent</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'bg-whatsapp text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                <p className="text-sm">{m.content}</p>
                {m.meta && <p className="text-xs opacity-60 mt-1">{m.meta}</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a test message..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp/30 focus:border-whatsapp"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="p-2.5 bg-whatsapp text-white rounded-xl hover:bg-whatsapp-dark disabled:opacity-50 transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [agents, setAgents] = useState([]);
  const [waAccounts, setWaAccounts] = useState([]);
  const [tgAccounts, setTgAccounts] = useState([]);
  const [igAccounts, setIgAccounts] = useState([]);
  const [fbAccounts, setFbAccounts] = useState([]);
  const [ytAccounts, setYtAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [testingAgent, setTestingAgent] = useState(null);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  useEffect(() => {
    Promise.all([
      agentAPI.getAll().then((r) => setAgents(r.data.data.agents)),
      whatsappAPI.getAll().then((r) => setWaAccounts(r.data.data.accounts)),
      telegramAPI.getAll().then(r => setTgAccounts(r.data.data.accounts)).catch(() => {}),
      instagramAPI.getAll().then(r => setIgAccounts(r.data.data.accounts)).catch(() => {}),
      facebookAPI.getAll().then(r => setFbAccounts(r.data.data.accounts)).catch(() => {}),
      youtubeAPI.getAutomationSettings().then(r => {
        // If YouTube channel connected, add it as a selectable account
        const d = r.data?.data;
        if (d?.isConnected && d?.channelId) {
          setYtAccounts([{ _id: d.channelId, channelId: d.channelId, channelName: d.channelName || d.channelId }]);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSave = (agent, isEdit) => {
    if (isEdit) setAgents((prev) => prev.map((a) => a._id === agent._id ? agent : a));
    else setAgents((prev) => [...prev, agent]);
  };

  const handleToggle = async (id) => {
    try {
      const res = await agentAPI.toggle(id);
      setAgents((prev) => prev.map((a) => a._id === id ? res.data.data.agent : a));
    } catch { toast.error('Toggle failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this agent?')) return;
    try {
      await agentAPI.delete(id);
      setAgents((prev) => prev.filter((a) => a._id !== id));
      toast.success('Agent deleted');
    } catch { toast.error('Delete failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-whatsapp border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-extrabold ${'text-gray-900 dark:text-slate-100'}`}>AI Agents</h1>
          <p className={`text-sm mt-1 ${'text-gray-500 dark:text-slate-400'}`}>{agents.length} agent{agents.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={() => { setEditingAgent(null); setShowForm(true); }}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{ background: '#FF6A00' }}
        >
          <Plus size={16} /> New Agent
        </button>
      </div>

      {waAccounts.filter((a) => a.status === 'connected').length === 0 && tgAccounts.filter((a) => a.status === 'connected').length === 0 && igAccounts.filter((a) => a.status === 'connected').length === 0 && fbAccounts.filter((a) => a.status === 'connected').length === 0 && (
        <div className={`rounded-2xl p-4 text-sm border ${'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200'}`}>
          No connected messaging accounts. Please connect an account first before creating an agent.
        </div>
      )}

      {agents.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-12 text-center ${'bg-white border-gray-300 dark:bg-white/5 dark:border-white/20'}`}>
          <Bot size={48} className={`mx-auto mb-4 ${'text-gray-300 dark:text-slate-500'}`} />
          <h3 className={`font-semibold ${'text-gray-700 dark:text-slate-200'}`}>No agents yet</h3>
          <p className={`text-sm mt-1 ${'text-gray-400 dark:text-slate-400'}`}>Create your first AI agent to start automating WhatsApp.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]" style={{ background: '#FF6A00' }}>
            Create Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent._id} className={`rounded-2xl border transition-all p-5 ${'bg-white border-gray-100 shadow-sm hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:shadow-xl dark:hover:shadow-black/20'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-whatsapp/10 rounded-xl flex items-center justify-center">
                    <Bot size={20} className="text-whatsapp" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{agent.name}</p>
                    <p className="text-xs text-gray-400">{agent.model}</p>
                  </div>
                </div>
                <button onClick={() => handleToggle(agent._id)} className={`transition-colors ${agent.isActive ? 'text-whatsapp' : 'text-gray-300'}`}>
                  {agent.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              {agent.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.description}</p>}

              <div className="text-xs text-gray-400 space-y-1 mb-4">
                <p>📱 {agent.platform === 'all' ? 'WA, TG & IG' : (agent.platform === 'both' ? 'WhatsApp & Telegram' : (agent.platform === 'telegram' ? (agent.telegramAccount?.botUsername ? `@${agent.telegramAccount.botUsername}` : 'No bot') : (agent.platform === 'instagram' ? `@${agent.instagramAccount?.igUsername || 'IG'}` : (agent.platform === 'facebook' ? agent.facebookAccount?.pageName || 'Facebook' : (agent.whatsappAccount?.displayPhoneNumber || 'No number')))))}</p>
                <p>🤖 {agent.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} · Temp {agent.temperature}</p>
                <p>💬 {agent.stats?.totalMessages || 0} messages sent</p>
              </div>

              <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-4 ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {agent.isActive ? 'Active' : 'Inactive'}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <button onClick={() => setTestingAgent(agent)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-whatsapp hover:bg-whatsapp/5 rounded-lg transition-colors">
                  <Play size={13} /> Test
                </button>
                <button onClick={() => { setEditingAgent(agent); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(agent._id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AgentFormModal
          onClose={() => { setShowForm(false); setEditingAgent(null); }}
          onSave={handleSave}
          editingAgent={editingAgent}
          waAccounts={waAccounts.filter((a) => a.status === 'connected')}
          tgAccounts={tgAccounts.filter((a) => a.status === 'connected')}
          igAccounts={igAccounts.filter((a) => a.status === 'connected')}
          fbAccounts={fbAccounts.filter((a) => a.status === 'connected')}
          ytAccounts={ytAccounts}
        />
      )}
      {testingAgent && <TestModal agent={testingAgent} onClose={() => setTestingAgent(null)} />}
    </div>
  );
}
