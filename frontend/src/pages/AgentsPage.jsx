import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Plus, Pencil, Trash2, Play, ToggleLeft, ToggleRight,
  Loader2, MessageSquare, X, Send, Lock, ChevronRight, Activity, Cpu
} from 'lucide-react';
import { agentAPI, whatsappAPI, telegramAPI, instagramAPI, facebookAPI, youtubeAPI, socialHubAPI } from '../services/api';
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
  linkedinAccountId:   z.string().optional(),
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
  { id: 'whatsapp',  label: 'WhatsApp',  color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', active: 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30', emoji: '📱' },
  { id: 'telegram',  label: 'Telegram',  color: 'bg-[#229ED9]/10 border-[#229ED9]/20 text-[#229ED9] dark:text-[#229ED9]', active: 'bg-[#229ED9] border-[#229ED9] text-white shadow-lg shadow-[#229ED9]/30', emoji: '✈️' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400', active: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 border-transparent text-white shadow-lg shadow-pink-500/30', emoji: '📷' },
  { id: 'facebook',  label: 'Messenger', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400', active: 'bg-[#0084FF] border-[#0084FF] text-white shadow-lg shadow-[#0084FF]/30', emoji: '💬' },
  { id: 'linkedin',  label: 'LinkedIn',  color: 'bg-[#0A66C2]/10 border-[#0A66C2]/20 text-[#0A66C2] dark:text-[#0A66C2]', active: 'bg-[#0A66C2] border-[#0A66C2] text-white shadow-lg shadow-[#0A66C2]/30', emoji: '💼' },
  { id: 'youtube',   label: 'YouTube',   color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400', active: 'bg-[#FF0000] border-[#FF0000] text-white shadow-lg shadow-[#FF0000]/30', emoji: '▶️' },
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

function AgentFormModal({ onClose, onSave, editingAgent, connectedPlatforms, waAccounts, tgAccounts, igAccounts, fbAccounts, ytAccounts, lnAccounts, isDark }) {
  const [selectedProvider, setSelectedProvider] = useState(editingAgent?.aiProvider || 'openai');

  const getInitialPlatforms = () => {
    if (!editingAgent) return [];
    
    if (editingAgent.platforms && editingAgent.platforms.length > 0) {
      return editingAgent.platforms;
    }

    const plats = [];
    if (editingAgent.whatsappAccount) plats.push('whatsapp');
    if (editingAgent.telegramAccount) plats.push('telegram');
    if (editingAgent.instagramAccount) plats.push('instagram');
    if (editingAgent.facebookAccount) plats.push('facebook');
    if (editingAgent.youtubeAccount) plats.push('youtube');
    if (editingAgent.linkedinAccount) plats.push('linkedin');
    
    if (plats.length > 0) return plats;

    if (editingAgent.platform) {
      if (editingAgent.platform === 'both') return ['whatsapp', 'telegram'];
      if (editingAgent.platform === 'all') return ['whatsapp', 'telegram', 'instagram', 'facebook'];
      return [editingAgent.platform];
    }
    return [];
  };

  const [selectedPlatforms, setSelectedPlatforms] = useState(getInitialPlatforms);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(agentSchema),
    defaultValues: editingAgent ? {
      ...editingAgent,
      platforms: getInitialPlatforms(),
      whatsappAccountId: editingAgent.whatsappAccount?._id || editingAgent.whatsappAccount,
      telegramAccountId: editingAgent.telegramAccount?._id || editingAgent.telegramAccount,
      instagramAccountId: editingAgent.instagramAccount?._id || editingAgent.instagramAccount,
      facebookAccountId: editingAgent.facebookAccount?._id || editingAgent.facebookAccount,
      youtubeAccountId: editingAgent.youtubeAccount?._id || editingAgent.youtubeAccount,
      linkedinAccountId: editingAgent.linkedinAccount?._id || editingAgent.linkedinAccount,
      humanHandoffKeywords: editingAgent.humanHandoffKeywords?.join(', ') || '',
    } : {
      platforms: [],
      aiProvider: 'openai', model: 'gpt-4o', temperature: 0.7,
      maxTokens: 500, contextWindow: 10,
    },
  });

  const togglePlatform = (id) => {
    if (!connectedPlatforms[id]) return; // Block disconnected platforms
    const next = selectedPlatforms.includes(id)
      ? selectedPlatforms.filter(p => p !== id)
      : [...selectedPlatforms, id];
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
    if (plats.length === 0) {
      toast.error('Please select at least one platform.'); return;
    }
    if (plats.includes('whatsapp') && !data.whatsappAccountId) { toast.error('Please select a WhatsApp account'); return; }
    if (plats.includes('telegram') && !data.telegramAccountId) { toast.error('Please select a Telegram account'); return; }
    if (plats.includes('instagram') && !data.instagramAccountId) { toast.error('Please select an Instagram account'); return; }
    if (plats.includes('facebook') && !data.facebookAccountId) { toast.error('Please select a Facebook page'); return; }
    if (plats.includes('youtube') && !data.youtubeAccountId) { toast.error('Please select a YouTube channel'); return; }
    if (plats.includes('linkedin') && !data.linkedinAccountId) { toast.error('Please select a LinkedIn account'); return; }

    const payload = {
      ...data,
      platforms: plats,
      platform: plats.length === 1 ? plats[0] : plats.includes('whatsapp') && plats.includes('telegram') ? 'both' : 'all',
      whatsappAccount:  plats.includes('whatsapp')  ? data.whatsappAccountId  : null,
      telegramAccount:  plats.includes('telegram')  ? data.telegramAccountId  : null,
      instagramAccount: plats.includes('instagram') ? data.instagramAccountId : null,
      facebookAccount:  plats.includes('facebook')  ? data.facebookAccountId  : null,
      youtubeAccount:   plats.includes('youtube')   ? data.youtubeAccountId   : null,
      linkedinAccount:  plats.includes('linkedin')  ? data.linkedinAccountId  : null,
      humanHandoffKeywords: data.humanHandoffKeywords ? data.humanHandoffKeywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
    };
    try {
      let res;
      if (editingAgent) {
        res = await agentAPI.update(editingAgent._id, payload);
        toast.success('Agent updated successfully!');
      } else {
        res = await agentAPI.create(payload);
        toast.success('Agent created successfully!');
      }
      onSave(res.data.data.agent, !!editingAgent);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save agent');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 border ${isDark ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-200 shadow-slate-300'}`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-100'}`}>
          <div>
            <h2 className="text-xl font-bold">{editingAgent ? 'Edit AI Agent' : 'Create New AI Agent'}</h2>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure your agent's personality and connections.</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          {/* Platform Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Bot size={18} /></div>
              <h3 className="text-lg font-bold">1. Select Platforms</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLATFORMS.map(({ id, label, color, active, emoji }) => {
                const isSelected = selectedPlatforms.includes(id);
                const isConnected = connectedPlatforms[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => togglePlatform(id)}
                    disabled={!isConnected}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-semibold text-sm
                      ${!isConnected ? 'opacity-40 grayscale cursor-not-allowed border-transparent bg-slate-100 dark:bg-slate-800' 
                      : isSelected ? active : `${color} hover:scale-105 hover:shadow-md`}`}
                  >
                    {!isConnected && (
                      <div className="absolute top-2 right-2 text-slate-500"><Lock size={14} /></div>
                    )}
                    <span className="text-3xl mb-1">{emoji}</span>
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.platforms && <p className="text-red-500 text-sm mt-2">{errors.platforms.message}</p>}
          </div>

          {/* Account Pickers - Only show if platform is selected */}
          {selectedPlatforms.length > 0 && (
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div className="grid md:grid-cols-2 gap-4">
                {selectedPlatforms.includes('whatsapp') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">WhatsApp Account</label>
                    <select {...register('whatsappAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select number...</option>
                      {waAccounts.map((a) => <option key={a._id} value={a._id}>{a.displayPhoneNumber} {a.verifiedName ? `(${a.verifiedName})` : ''}</option>)}
                    </select>
                  </div>
                )}
                {selectedPlatforms.includes('telegram') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Telegram Bot</label>
                    <select {...register('telegramAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select bot...</option>
                      {tgAccounts.map((a) => <option key={a._id} value={a._id}>@{a.botUsername}</option>)}
                    </select>
                  </div>
                )}
                {selectedPlatforms.includes('instagram') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Instagram Account</label>
                    <select {...register('instagramAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select account...</option>
                      {igAccounts.map((a) => <option key={a._id} value={a._id}>@{a.igUsername}</option>)}
                    </select>
                  </div>
                )}
                {selectedPlatforms.includes('facebook') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Facebook Page</label>
                    <select {...register('facebookAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select page...</option>
                      {fbAccounts.map((a) => <option key={a._id} value={a._id}>{a.pageName}</option>)}
                    </select>
                  </div>
                )}
                {selectedPlatforms.includes('youtube') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">YouTube Channel</label>
                    <select {...register('youtubeAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select channel...</option>
                      {ytAccounts.map((a) => <option key={a._id} value={a._id}>{a.channelName}</option>)}
                    </select>
                  </div>
                )}
                {selectedPlatforms.includes('linkedin') && (
                  <div>
                    <label className="text-sm font-semibold mb-1 block">LinkedIn Account</label>
                    <select {...register('linkedinAccountId')} className={`w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                      <option value="">Select account...</option>
                      {lnAccounts.map((a) => <option key={a._id} value={a._id}>{a.name || a.urn}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className={isDark ? 'border-white/10' : 'border-slate-100'} />

          {/* Basic Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Cpu size={18} /></div>
              <h3 className="text-lg font-bold">2. Agent Details</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Agent Name</label>
                <input {...register('name')} placeholder="e.g. Sales Assistant" className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Short Description</label>
                <input {...register('description')} placeholder="What does it do?" className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} />
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block">AI Provider</label>
                <select {...register('aiProvider')} className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">AI Model</label>
                <select {...register('model')} className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                  {PROVIDER_MODELS[selectedProvider].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <hr className={isDark ? 'border-white/10' : 'border-slate-100'} />

          {/* Prompting */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center"><MessageSquare size={18} /></div>
                <h3 className="text-lg font-bold">3. System Prompt & Behavior</h3>
              </div>
              <div className="hidden sm:flex gap-2">
                {Object.entries({ 'Support': 'customer_support', 'Sales': 'sales', 'Booking': 'booking' }).map(([label, key]) => (
                  <button key={key} type="button" onClick={() => setValue('systemPrompt', DEFAULT_PROMPTS[key])}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    {label} Template
                  </button>
                ))}
              </div>
            </div>

            <textarea
              {...register('systemPrompt')}
              rows={4}
              placeholder="You are a helpful assistant for [Business Name]..."
              className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none font-mono text-sm leading-relaxed ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
            />
            {errors.systemPrompt && <p className="text-red-500 text-xs mt-1">{errors.systemPrompt.message}</p>}

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Greeting Message <span className="text-xs font-normal opacity-50">(Optional)</span></label>
                <textarea {...register('greetingMessage')} rows={2} placeholder="Hi! How can I help you today?" className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none text-sm resize-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Human Handoff Keywords</label>
                <input {...register('humanHandoffKeywords')} placeholder="e.g. human, agent, support" className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#FF6A00]/50 outline-none text-sm ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} />
                <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keywords that trigger human takeover.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-inherit z-10 pb-2">
            <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-[#FF6A00]/30 transition-all disabled:opacity-60">
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Saving...</> : editingAgent ? 'Update Agent' : 'Launch Agent'}
            </button>
            <button type="button" onClick={onClose} className={`px-8 py-3.5 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestModal({ agent, onClose, isDark }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-md h-[600px] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#FF6A00] to-[#FF4500] rounded-full flex items-center justify-center text-white shadow-md">
                <Bot size={20} />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div>
              <p className="font-bold text-sm">{agent.name}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.model}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><X size={20} /></button>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <MessageSquare size={48} className="mb-4" />
              <p className="font-medium">Say hello to {agent.name}!</p>
              <p className="text-xs mt-1">This is a safe sandbox environment.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed
                ${m.role === 'user' 
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white rounded-br-sm' 
                  : isDark ? 'bg-slate-800 text-slate-100 rounded-bl-sm border border-white/5' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'}`}
              >
                {m.content}
              </div>
              {m.meta && <span className={`text-[10px] mt-1.5 px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{m.meta}</span>}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className={`px-4 py-3 rounded-2xl rounded-bl-sm border ${isDark ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-100'}`}>
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/50 ${isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-50 border-slate-200'}`}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="p-3 bg-[#FF6A00] text-white rounded-2xl hover:bg-[#FF4500] disabled:opacity-50 transition-colors flex items-center justify-center shadow-lg shadow-[#FF6A00]/20">
              <Send size={18} />
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
  const [lnAccounts, setLnAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [testingAgent, setTestingAgent] = useState(null);
  const navigate = useNavigate();

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
      youtubeAPI.getAll().then(r => setYtAccounts(r.data.data.accounts)).catch(() => {}),
      socialHubAPI.getAllLinkedInAccounts().then(r => setLnAccounts(r.data.data.accounts || r.data.accounts)).catch(() => {}),
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
    if (!window.confirm('Are you sure you want to delete this agent? This cannot be undone.')) return;
    try {
      await agentAPI.delete(id);
      setAgents((prev) => prev.filter((a) => a._id !== id));
      toast.success('Agent deleted');
    } catch { toast.error('Delete failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#FF6A00]/20" />
    </div>
  );

  // Determine connected platforms
  const connectedPlatforms = {
    whatsapp: waAccounts.some(a => a.status === 'connected'),
    telegram: tgAccounts.some(a => a.status === 'connected'),
    instagram: igAccounts.some(a => a.status === 'connected'),
    facebook: fbAccounts.some(a => a.status === 'connected'),
    youtube: ytAccounts.length > 0,
    linkedin: lnAccounts.length > 0
  };

  const hasAnyConnected = Object.values(connectedPlatforms).some(Boolean);

  return (
    <div className={`space-y-8 animate-fade-in ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            AI Agents
          </h1>
          <p className={`text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your intelligent assistants across all connected platforms.
          </p>
        </div>
        
        {hasAnyConnected && (
          <button
            onClick={() => { setEditingAgent(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-[#FF6A00]/20 hover:shadow-[#FF6A00]/40 transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[#FF6A00] to-[#FF4500]"
          >
            <Plus size={18} /> Create New Agent
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {!hasAnyConnected ? (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900/50 border-white/10 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <div className="w-20 h-20 bg-[#FF6A00]/10 text-[#FF6A00] rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <Lock size={36} />
          </div>
          <h3 className="text-2xl font-bold mb-3">No Platforms Connected</h3>
          <p className={`max-w-md mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Before you can create an AI agent, you must connect at least one social media account (WhatsApp, Instagram, etc.).
          </p>
          <button 
            onClick={() => navigate('/app/integrations')}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[#FF6A00]/20 hover:scale-105 transition-all"
          >
            Go to Integrations <ChevronRight size={18} />
          </button>
        </div>
      ) : agents.length === 0 ? (
        <div className={`flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed ${isDark ? 'bg-slate-900/30 border-white/20' : 'bg-slate-50 border-slate-300'}`}>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400'}`}>
            <Bot size={40} />
          </div>
          <h3 className="text-xl font-bold mb-2">No Agents Active</h3>
          <p className={`mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your workspace is quiet. Deploy your first AI agent to start automating responses.
          </p>
          <button 
            onClick={() => { setEditingAgent(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[#FF6A00]/20 hover:scale-105 transition-all"
          >
            <Plus size={18} /> Build First Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent._id} className={`group relative rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${isDark ? 'bg-slate-900/40 border-white/10 hover:border-white/20 hover:bg-slate-900/80 hover:shadow-black/60 backdrop-blur-sm' : 'bg-white border-slate-200 hover:shadow-slate-200/80 hover:border-slate-300'}`}>
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6A00] to-[#FF4500] flex items-center justify-center text-white shadow-md">
                      <Bot size={24} />
                    </div>
                    {/* Glowing status dot */}
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      {agent.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-4 w-4 border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${agent.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight truncate max-w-[140px]">{agent.name}</h3>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.model}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleToggle(agent._id)} 
                  className={`transition-all duration-300 hover:scale-110 ${agent.isActive ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-slate-300 dark:text-slate-600'}`}
                  title={agent.isActive ? "Deactivate" : "Activate"}
                >
                  {agent.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {agent.description && (
                <p className={`text-sm mb-5 line-clamp-2 h-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {agent.description}
                </p>
              )}

              {/* Stats & Info */}
              <div className={`p-4 rounded-2xl space-y-3 mb-5 border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3 text-sm">
                  <Activity size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                  <span className="font-medium">{agent.stats?.totalMessages || 0}</span> messages sent
                </div>
                <div className="flex flex-wrap gap-2">
                  {(agent.platforms || []).map(p => {
                    const platformMeta = PLATFORMS.find(pl => pl.id === p);
                    if(!platformMeta) return null;
                    return (
                      <span key={p} className={`text-xs px-2 py-1 rounded-lg border font-medium flex items-center gap-1 ${isDark ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
                        <span>{platformMeta.emoji}</span> {platformMeta.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <button onClick={() => setTestingAgent(agent)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  <Play size={16} /> Test
                </button>
                <button onClick={() => { setEditingAgent(agent); setShowForm(true); }} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  <Pencil size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(agent._id)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AgentFormModal
          isDark={isDark}
          onClose={() => { setShowForm(false); setEditingAgent(null); }}
          onSave={handleSave}
          editingAgent={editingAgent}
          connectedPlatforms={connectedPlatforms}
          waAccounts={waAccounts.filter(a => a.status === 'connected')}
          tgAccounts={tgAccounts.filter(a => a.status === 'connected')}
          igAccounts={igAccounts.filter(a => a.status === 'connected')}
          fbAccounts={fbAccounts.filter(a => a.status === 'connected')}
          ytAccounts={ytAccounts}
          lnAccounts={lnAccounts}
        />
      )}
      {testingAgent && <TestModal isDark={isDark} agent={testingAgent} onClose={() => setTestingAgent(null)} />}
    </div>
  );
}
