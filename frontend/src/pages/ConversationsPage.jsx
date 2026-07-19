import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Search, Filter, CheckCircle2, Clock, UserX, ChevronLeft, X, Smartphone, Bot, Facebook, Send, ArrowDown, Maximize, Minimize, Check, CheckCheck, Zap, User, Info, Calendar, Hash, Tag, FileText, ExternalLink, Shield, Activity, Copy, MoreVertical, Star, Link2 } from 'lucide-react';
import { conversationAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'human_handoff', label: 'Handoff' },
  { key: 'closed', label: 'Closed' },
];

const StatusIndicator = ({ status }) => {
  if (status === 'active') return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>;
  if (status === 'human_handoff') return <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>;
  if (status === 'closed') return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
  return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
};

function MessageBubble({ msg, platform, isDark }) {
  const isBot = msg.role === 'assistant';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center mb-4 mt-2">
        <div className={`font-medium text-xs px-4 py-1.5 rounded-full border shadow-sm ${
          'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/20'
        }`}>
          {msg.content}
        </div>
      </div>
    );
  }

  let userBgClass = 'bg-whatsapp text-white';
  if (platform === 'instagram') userBgClass = 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white';
  if (platform === 'facebook') userBgClass = 'bg-[#1877F2] text-white';
  if (platform === 'telegram') userBgClass = 'bg-[#229ED9] text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isBot ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isBot ? `${userBgClass} rounded-br-sm` : `${'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-100 dark:border dark:border-white/10'} rounded-bl-sm`}`}>
        <div className={`markdown-content text-sm leading-relaxed ${isBot ? 'prose-invert' : 'prose-gray'}`}>
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
              a: ({ node, ...props }) => <a className="underline decoration-2 underline-offset-2 opacity-90 hover:opacity-100" target="_blank" rel="noopener noreferrer" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
              code: ({ node, ...props }) => <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${isBot ? 'bg-white/20' : ('bg-gray-200 dark:bg-white/10 dark:text-slate-100')}`} {...props} />,
              pre: ({ node, ...props }) => <pre className={`p-3 rounded-lg overflow-x-auto mb-2 font-mono text-xs ${isBot ? 'bg-black/20' : ('bg-gray-800 text-white dark:bg-slate-900 dark:text-slate-100')}`} {...props} />,
              h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-1.5" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className={`border-l-4 pl-3 italic opacity-80 mb-2 ${isBot ? 'border-white/30' : ('border-gray-300 dark:border-white/20')}`} {...props} />,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        <div className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${isBot ? 'text-white/80' : ('text-gray-400 dark:text-slate-400')}`}>
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.tokens && <span> · {msg.tokens} tokens</span>}
          {isBot && (
            <span className="ml-0.5 flex items-center">
              {msg.status === 'read' ? (
                <div className="bg-white rounded-full p-[1px] inline-flex items-center justify-center">
                  <CheckCheck size={11} className="text-blue-500" />
                </div>
              ) : msg.status === 'delivered' ? (
                <CheckCheck size={14} />
              ) : msg.status === 'failed' ? (
                <X size={14} className="text-red-300" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const PLATFORM_TABS = [
  { key: '', label: 'All', icon: null, activeClass: 'bg-gray-800 text-white', colorClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  { key: 'whatsapp', label: 'WhatsApp', icon: <Smartphone size={14} />, activeClass: 'bg-whatsapp text-white shadow-md shadow-green-200', colorClass: 'bg-green-50 text-whatsapp hover:bg-green-100' },
  { key: 'instagram', label: 'Instagram', icon: <Bot size={14} />, activeClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-200', colorClass: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
  { key: 'facebook', label: 'Facebook', icon: <Facebook size={14} />, activeClass: 'bg-[#1877F2] text-white shadow-md shadow-blue-200', colorClass: 'bg-blue-50 text-[#1877F2] hover:bg-blue-100' },
  { key: 'telegram', label: 'Telegram', icon: <MessageSquare size={14} />, activeClass: 'bg-[#229ED9] text-white shadow-md shadow-blue-200', colorClass: 'bg-blue-50 text-[#229ED9] hover:bg-blue-100' },
];

const getTheme = (platform) => {
  switch (platform) {
    case 'whatsapp':
      return {
        bgChat: 'bg-[#efeae2]/40',
        activeList: 'bg-whatsapp/5 border-l-whatsapp',
        btnPrimary: 'bg-whatsapp hover:bg-green-600 text-white',
        ringPrimary: 'focus:ring-whatsapp/30 focus:border-whatsapp/50',
        iconColor: 'text-whatsapp',
        inputBg: 'bg-white',
      };
    case 'instagram':
      return {
        bgChat: 'bg-gradient-to-br from-purple-50/30 via-pink-50/30 to-orange-50/30',
        activeList: 'bg-pink-50 border-l-pink-500',
        btnPrimary: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white hover:opacity-90',
        ringPrimary: 'focus:ring-pink-300 focus:border-pink-300',
        iconColor: 'text-pink-500',
        inputBg: 'bg-white/80',
      };
    case 'telegram':
      return {
        bgChat: 'bg-[#9DBBDB]/20',
        activeList: 'bg-blue-50 border-l-[#229ED9]',
        btnPrimary: 'bg-[#229ED9] hover:bg-[#1E8CC2] text-white',
        ringPrimary: 'focus:ring-[#229ED9]/30 focus:border-[#229ED9]/50',
        iconColor: 'text-[#229ED9]',
        inputBg: 'bg-white',
      };
    case 'facebook':
      return {
        bgChat: 'bg-blue-50/30',
        activeList: 'bg-blue-50 border-l-[#1877F2]',
        btnPrimary: 'bg-[#1877F2] hover:bg-[#166FE5] text-white',
        ringPrimary: 'focus:ring-[#1877F2]/30 focus:border-[#1877F2]/50',
        iconColor: 'text-[#1877F2]',
        inputBg: 'bg-white',
      };
    default:
      return {
        bgChat: 'bg-gray-50/50',
        activeList: 'bg-gray-50 border-l-gray-800',
        btnPrimary: 'bg-gray-800 hover:bg-gray-700 text-white',
        ringPrimary: 'focus:ring-gray-300 focus:border-gray-300',
        iconColor: 'text-gray-500',
        inputBg: 'bg-white',
      };
  }
};

const check24hWindow = (conv) => {
  if (!conv || conv.platform !== 'whatsapp') return false;
  const userMessages = (conv.messages || []).filter((m) => m.role === 'user');
  if (userMessages.length === 0) return true;
  const lastUserMsg = userMessages[userMessages.length - 1];
  return (Date.now() - new Date(lastUserMsg.timestamp).getTime()) > 24 * 60 * 60 * 1000;
};

export default function ConversationsPage() {
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || '');
  const [activePlatform, setActivePlatform] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(12);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Template States
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Template Creation States
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create'
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '',
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Track if we already auto-opened from URL param
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const handleMessagesScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);

    if (scrollTop === 0 && selected?.messages?.length > visibleMessagesCount) {
      const oldScrollHeight = scrollHeight;
      setVisibleMessagesCount((prev) => Math.min(prev + 12, selected.messages.length));
      
      setTimeout(() => {
        if (messagesContainerRef.current) {
          const newScrollHeight = messagesContainerRef.current.scrollHeight;
          messagesContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 0);
    }
  };

  useEffect(() => {
    // Only auto-scroll to bottom if the last message is new, or on first load. 
    // To keep it simple, we just scroll to bottom if visibleMessagesCount hasn't changed.
    scrollToBottom();
  }, [selected?._id, selected?.messages?.length]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationAPI.getAll({ status: activeTab || undefined, platform: activePlatform || undefined, search: search || undefined, page, limit: 25 });
      setConversations(res.data.data.conversations);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load conversations'); }
    finally { setLoading(false); }
  }, [activeTab, activePlatform, search, page]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Auto-open a conversation if ?conv=<id> is in the URL (from notification click)
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (!convId || autoOpenedRef.current || loading) return;
    // Try to find in loaded list first
    const found = conversations.find((c) => c._id === convId);
    if (found || conversations.length > 0) {
      autoOpenedRef.current = true;
      // Remove the param so re-navigation works cleanly
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('conv'); return p; }, { replace: true });
      if (found) {
        selectConversation(found);
      } else {
        // Conversation not in current filter - load it directly by id
        conversationAPI.getOne(convId)
          .then((res) => {
            setSelected(res.data.data.conversation);
            setShowDetail(true);
            setVisibleMessagesCount(12);
          })
          .catch(() => toast.error('Could not open conversation'));
      }
    }
  }, [conversations, loading, searchParams]);


  useEffect(() => {
    // JWT is handled automatically via HttpOnly cookies

    const socketUrl = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
      
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket']
    });

    socket.on('conversation_updated', (data) => {
      // 1. Update selected conversation if currently viewing
      setSelected((prevSelected) => {
        if (prevSelected && prevSelected._id === data.conversationId) {
          return { 
            ...prevSelected, 
            messages: data.messages,
            customerPhone: data.customerPhone || prevSelected.customerPhone
          };
        }
        return prevSelected;
      });

      // 2. Update conversations list (move to top, update last message time)
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === data.conversationId);
        if (index > -1) {
          const newConversations = [...prev];
          const updated = {
            ...newConversations[index],
            lastMessageAt: data.messages[data.messages.length - 1]?.timestamp || new Date(),
            customerPhone: data.customerPhone || newConversations[index].customerPhone
          };
          newConversations.splice(index, 1);
          return [updated, ...newConversations];
        }
        return prev;
      });
    });

    return () => socket.disconnect();
  }, []);

  const selectConversation = async (conv) => {
    try {
      const res = await conversationAPI.getOne(conv._id);
      setSelected(res.data.data.conversation);
      setShowDetail(true);
      setVisibleMessagesCount(12);
      setConversations((prev) => prev.map((c) => c._id === conv._id ? { ...c, isRead: true } : c));
    } catch { toast.error('Failed to load conversation'); }
  };

  const handleClose = async (id) => {
    try {
      await conversationAPI.close(id);
      setSelected((prev) => prev && ({ ...prev, status: 'closed' }));
      setConversations((prev) => prev.map((c) => c._id === id ? { ...c, status: 'closed' } : c));
      toast.success('Conversation closed');
    } catch { toast.error('Failed to close conversation'); }
  };

  const handleToggleStatus = async (id, newStatus) => {
    try {
      const res = await conversationAPI.toggleStatus(id, newStatus);
      setSelected(res.data.data.conversation);
      setConversations((prev) => prev.map((c) => c._id === id ? { ...c, status: newStatus } : c));
      toast.success(newStatus === 'active' ? 'AI Agent activated' : 'Human mode activated');
    } catch { toast.error('Failed to update status'); }
  };


  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selected) return;
    
    setSendingReply(true);
    try {
      await conversationAPI.reply(selected._id, replyMessage.trim());
      setReplyMessage('');
      // Optimistic update is not strictly needed because the socket will instantly give us the conversation_updated event.
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleOpenTemplateModal = async () => {
    if (!selected) return;
    setLoadingTemplates(true);
    setShowTemplateModal(true);
    setViewMode('list');
    setNewTemplate({
      name: '',
      category: 'UTILITY',
      language: 'en_US',
      bodyText: '',
    });
    try {
      const res = await conversationAPI.getTemplates(selected._id);
      setTemplates(res.data.data.templates || []);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (err) {
      toast.error('Failed to load message templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleVariableChange = (varIndex, value) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [varIndex]: value,
    }));
  };

  const getTemplateBodyText = (template) => {
    if (!template || !template.components) return '';
    const bodyComponent = template.components.find((c) => c.type === 'BODY' || c.type === 'body');
    return bodyComponent ? bodyComponent.text : '';
  };

  const getTemplateVariables = (template) => {
    const text = getTemplateBodyText(template);
    const matches = text.match(/\{\{\d+\}\}/g) || [];
    const uniqueVars = [...new Set(matches.map((m) => parseInt(m.replace(/[\{\}]/g, ''))))].sort((a, b) => a - b);
    return uniqueVars;
  };

  const getTemplatePreview = (template) => {
    let text = getTemplateBodyText(template);
    if (!text) return '';
    const vars = getTemplateVariables(template);
    vars.forEach((v) => {
      const val = templateVariables[v] !== undefined && templateVariables[v] !== '' 
        ? templateVariables[v] 
        : `[Variable {{${v}}}]`;
      text = text.split(`{{${v}}}`).join(val);
    });
    return text;
  };

  const handleSendTemplate = async () => {
    if (!selected || !selectedTemplate) return;
    setSendingTemplate(true);
    try {
      const vars = getTemplateVariables(selectedTemplate);
      const parameters = vars.map((v) => ({
        type: 'text',
        text: templateVariables[v] || '',
      }));

      const components = parameters.length > 0 ? [
        {
          type: 'body',
          parameters,
        }
      ] : [];

      await conversationAPI.sendTemplate(selected._id, {
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language || 'en_US',
        components,
      });

      toast.success('Template message sent successfully');
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send template message';
      toast.error(errorMsg);
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const { name, category, language, bodyText } = newTemplate;
    if (!name.trim() || !bodyText.trim()) {
      toast.error('Template Name and Body Text are required');
      return;
    }

    setCreatingTemplate(true);
    try {
      await conversationAPI.createTemplate(selected._id, {
        name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category,
        language,
        bodyText: bodyText.trim(),
      });
      toast.success('Template submitted for approval');
      setViewMode('list');
      setLoadingTemplates(true);
      const res = await conversationAPI.getTemplates(selected._id);
      setTemplates(res.data.data.templates || []);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create template';
      toast.error(errorMsg);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const isExpired = selected && selected.platform === 'whatsapp' && check24hWindow(selected);
  const theme = getTheme(selected?.platform);
  const searchTheme = getTheme(activePlatform);
  const panelClass = 'bg-white border-gray-100 shadow-sm dark:bg-white/5 dark:border-white/10';
  const sectionBorder = 'border-gray-100 dark:border-white/10';
  const titleClass = 'text-gray-900 dark:text-white';
  const mutedClass = 'text-gray-600 dark:text-slate-300';
  const subtleClass = 'text-gray-400 dark:text-slate-400';

  return (
    <div className={isFullScreen 
      ? `fixed inset-0 z-[100] p-2 sm:p-4 flex flex-col animate-fade-in ${'bg-gray-50 dark:bg-slate-950'}` 
      : "h-[calc(100vh-10rem)] flex flex-col animate-fade-in"}>
      <div className="flex-1 flex gap-4 min-h-0 h-full w-full relative">
        {/* Sidebar list */}
        <div className={`${showDetail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] rounded-2xl border shrink-0 min-h-0 h-full ${panelClass}`}>
          {/* Header & Search */}
          <div className={`p-4 border-b space-y-3 shrink-0 ${sectionBorder}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-lg tracking-tight ${titleClass}`}>Chats</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-slate-200'}`}>{total}</span>
              </div>
              <button onClick={() => setIsFullScreen(!isFullScreen)} className={`p-1.5 rounded-lg transition-colors ${'text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10'}`} title="Toggle Full Screen">
                {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
            
            <div className="relative">
              <Search size={15} className={`absolute left-3 top-3 ${searchTheme.iconColor}`} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or phone..."
                className={`w-full pl-9 pr-4 py-2.5 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${'bg-gray-50 text-gray-900 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400'} ${searchTheme.ringPrimary}`}
              />
            </div>

            {/* Platform Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {PLATFORM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActivePlatform(tab.key); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                    ${activePlatform === tab.key ? tab.activeClass : tab.colorClass}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setPage(1); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${activeTab === tab.key ? 'bg-[#FF6A00] text-white' : ('bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15')}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-4 border-whatsapp border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-48 ${subtleClass}`}>
                <MessageSquare size={36} className="mb-2 opacity-30" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : (
              conversations.map((conv, index) => {
                const itemTheme = getTheme(conv.platform);
                return (
                  <motion.button
                    key={conv._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.18) }}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left px-4 py-3.5 border-b transition-all duration-200 ${'border-gray-50 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5'}
                      ${selected?._id === conv._id ? `${itemTheme.activeList} border-l-2` : 'border-l-2 border-l-transparent'}
                      ${!conv.isRead ? ('font-semibold bg-gray-50/50 dark:font-semibold dark:bg-white/5') : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full ${selected?._id === conv._id ? itemTheme.btnPrimary : ('bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-slate-200')} flex items-center justify-center text-sm font-bold shrink-0 shadow-sm relative`}>
                          {(conv.customerName || conv.customerPhone || conv.customerIgId || conv.customerTelegramId || 'U')[0]?.toUpperCase()}
                          {!conv.isRead && selected?._id !== conv._id && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${selected?._id === conv._id ? ('text-gray-900 font-medium dark:text-white dark:font-medium') : (!conv.isRead ? ('text-gray-900 font-bold dark:text-slate-100 dark:font-bold') : ('text-gray-700 dark:text-slate-300'))}`}>
                            {conv.customerName || conv.customerPhone || conv.customerIgId || conv.customerTelegramId || 'Unknown'}
                          </p>
                          <p className={`text-xs truncate ${selected?._id === conv._id ? itemTheme.iconColor : (!conv.isRead ? ('text-gray-600 font-medium dark:text-slate-300 dark:font-medium') : ('text-gray-400 dark:text-slate-400'))}`}>
                            {conv.platform || 'whatsapp'} {conv.customerPhone ? ` - ${conv.customerPhone}` : ''}
                          </p>
                        </div>
                      </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className={`text-[10px] font-medium ${selected?._id === conv._id ? itemTheme.iconColor : (!conv.isRead ? 'text-[#FF6A00] font-bold' : ('text-gray-400 dark:text-slate-400'))}`}>
                          {formatDistanceToNow(new Date(conv.lastMessageAt || conv.updatedAt), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusIndicator status={conv.status} />
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs mt-1 ml-11 truncate ${selected?._id === conv._id ? mutedClass : subtleClass} ${!conv.isRead && selected?._id !== conv._id ? ('font-bold text-gray-800 dark:font-bold dark:text-slate-200') : ''}`}>
                      {conv.agent?.name} - {conv.totalMessages} msgs
                    </p>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat detail */}
        <div className={`${!showDetail ? 'hidden lg:flex' : 'flex'} flex-col flex-1 rounded-2xl border min-h-0 min-w-0 xl:min-w-[500px] relative overflow-hidden ${panelClass}`}>
          {!selected ? (
            <div className={`flex-1 flex flex-col items-center justify-center ${searchTheme.bgChat} ${subtleClass} transition-colors duration-500`}>
              <MessageSquare size={48} className={`mb-3 opacity-20 ${searchTheme.iconColor}`} />
              <p className="text-sm">Select a conversation to view</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <motion.div
                key={`chat-header-${selected._id}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`px-5 py-4 backdrop-blur-md border-b flex items-center gap-3 shrink-0 z-10 ${'bg-white/90 border-gray-100 dark:bg-slate-900/70 dark:border-white/10'}`}
              >
                <button onClick={() => setShowDetail(false)} className={`lg:hidden p-1.5 rounded-lg ${'hover:bg-gray-100 dark:hover:bg-white/10'} ${theme.iconColor}`}>
                  <ChevronLeft size={18} />
                </button>
                <div className={`w-10 h-10 rounded-full ${theme.btnPrimary} flex items-center justify-center font-bold shrink-0 shadow-sm`}>
                  {(selected.customerName || selected.customerPhone || selected.customerIgId || selected.customerTelegramId || 'U')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${titleClass}`}>{selected.customerName || selected.customerPhone || selected.customerIgId || selected.customerTelegramId || 'Unknown'}</p>
                  <p className={`text-xs ${theme.iconColor}`}>
                    {selected.platform || 'whatsapp'} 
                    <span className={`ml-1.5 ${subtleClass}`}>- {selected.agent?.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Toggle */}
                  {selected.status !== 'closed' && (
                    <div className={`flex p-0.5 rounded-xl border ${'bg-gray-100 border-gray-200 dark:bg-white/10 dark:border-white/10'}`}>
                      <button
                        onClick={() => handleToggleStatus(selected._id, 'active')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selected.status === 'active' 
                            ? ('bg-white text-[#FF6A00] shadow-sm dark:bg-slate-800 dark:text-[#FF6A00] dark:shadow-sm') 
                            : ('text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-white')
                        }`}
                        title="AI Agent Mode"
                      >
                        <Zap size={13} fill={selected.status === 'active' ? 'currentColor' : 'none'} />
                        <span className="hidden sm:inline">AI Mode</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(selected._id, 'human_handoff')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selected.status === 'human_handoff' 
                            ? ('bg-white text-amber-600 shadow-sm dark:bg-slate-800 dark:text-amber-400 dark:shadow-sm') 
                            : ('text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-white')
                        }`}
                        title="Human Mode"
                      >
                        <User size={13} fill={selected.status === 'human_handoff' ? 'currentColor' : 'none'} />
                        <span className="hidden sm:inline">Human</span>
                      </button>
                    </div>
                  )}

                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    selected.status === 'active' ? 'bg-green-100 text-green-700' :
                    selected.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-100 text-amber-700'}`}>
                    {selected.status.replace('_', ' ')}
                  </span>
                  {selected.status !== 'closed' && (
                    <button
                      onClick={() => handleClose(selected._id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-xl transition-colors ${'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10'}`}
                    >
                      <CheckCircle2 size={13} /> Close
                    </button>
                  )}
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={`p-1.5 rounded-lg transition-colors hidden sm:block ${'text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10'}`} title="Toggle Full Screen">
                    {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                  <button 
                    onClick={() => setShowContactModal(true)} 
                    className={`p-1.5 rounded-lg transition-colors ${'hover:bg-gray-100 text-gray-500 dark:hover:bg-white/10 dark:text-slate-300'}`} 
                    title="Contact Information"
                  >
                    <Info size={18} />
                  </button>
                </div>

              </motion.div>

              {/* Messages */}
              <div className="relative flex-1 min-h-0">
                <div 
                  className={`absolute inset-0 overflow-y-auto px-5 py-4 ${theme.bgChat} transition-colors duration-500`}
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                >
                  <div className={`pointer-events-none absolute inset-0 ${'bg-[radial-gradient(circle_at_top,rgba(255,106,0,0.05),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,106,0,0.08),transparent_55%)]'}`} />
                  {selected.messages?.length === 0 ? (
                  <p className={`text-center text-sm mt-8 ${'text-gray-500/50 dark:text-slate-400/70'}`}>No messages yet</p>
                ) : (
                  <>
                    {selected.messages?.length > visibleMessagesCount && (
                      <div className="flex justify-center mb-4">
                        <span className={`text-xs px-3 py-1 rounded-full border backdrop-blur-sm ${'bg-white/60 text-gray-400 border-gray-100 dark:bg-slate-900/60 dark:text-slate-400 dark:border-white/10'}`}>
                          Scroll up to load older messages
                        </span>
                      </div>
                    )}
                    {selected.messages?.slice(-visibleMessagesCount).map((msg, i) => <MessageBubble key={i} msg={msg} platform={selected.platform || 'whatsapp'}  />)}
                    <div ref={messagesEndRef} />
                  </>
                )}
                </div>
                {showScrollButton && (
                  <button
                    onClick={scrollToBottom}
                    className={`absolute bottom-4 right-6 p-2.5 rounded-full shadow-lg border transition-all z-20 flex items-center justify-center ${'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:border-white/10'}`}
                    title="Scroll to bottom"
                  >
                    <ArrowDown size={20} />
                  </button>
                )}
              </div>

              {/* Stats footer & Input */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-t shrink-0 z-10 ${'bg-white border-gray-100 dark:bg-slate-900/70 dark:border-white/10'}`}
              >
                <div className={`px-5 py-2 flex items-center justify-between text-[11px] ${subtleClass}`}>
                  <span>Messages: {selected.totalMessages} - Tokens: {selected.totalTokensUsed || 0}</span>
                  {selected.agent && <span>Agent: {selected.agent.name}</span>}
                </div>
                
                {selected.status !== 'closed' && (
                  isExpired ? (
                    <div className={`mx-5 mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md ${'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
                      <div className="flex items-center gap-2.5">
                        <Clock className="text-amber-500 shrink-0" size={20} />
                        <div className="text-left">
                          <p className={`text-xs font-bold ${'text-amber-800 dark:text-amber-300'}`}>
                            24-Hour Customer Service Window Expired
                          </p>
                          <p className={`text-[10px] mt-0.5 ${'text-slate-600 dark:text-slate-300'}`}>
                            ⚠️ You can only reply using a pre-approved template message.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenTemplateModal}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 hover:scale-102 flex items-center justify-center gap-2 shrink-0"
                      >
                        <Zap size={14} fill="currentColor" />
                        Send Template Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleReply} className="px-5 pb-4 flex gap-2">
                      <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type a message to reply directly..."
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-white/10 text-slate-100 border border-white/10 placeholder:text-slate-400' : `${theme.inputBg} border border-gray-200 text-gray-900`} ${theme.ringPrimary}`}
                        disabled={sendingReply}
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className={`px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm ${theme.btnPrimary}`}
                      >
                        <Send size={16} />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </form>
                  )
                )}
              </motion.div>
            </>
          )}
        </div>

        {/* Contact Info Modal */}
        <AnimatePresence>
          {selected && showContactModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowContactModal(false)}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`relative w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border ${'bg-white border-white/20 dark:bg-slate-900 dark:border-white/10'}`}
              >
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between shrink-0 ${'bg-white border-gray-100 dark:bg-slate-900 dark:border-white/10'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${theme.bgChat} ${theme.iconColor} shadow-inner`}>
                      <User size={22} />
                    </div>
                    <div>
                        <h3 className={`font-black text-lg leading-tight ${titleClass}`}>Lead Intelligence</h3>
                        <p className={`text-xs font-bold uppercase mt-0.5 tracking-wider ${subtleClass}`}>Contact Profile & Analytics</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowContactModal(false)} 
                    className={`p-2.5 rounded-2xl transition-all ${'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'}`}
                  >
                    <X size={22} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                  {/* Profile Header Card */}
                  <div className={`rounded-[2rem] p-6 border flex flex-col sm:flex-row items-center gap-6 shadow-sm ${'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:border-white/10'}`}>
                    <div className="relative shrink-0">
                      <div className={`w-28 h-28 rounded-[2.5rem] ${theme.btnPrimary} flex items-center justify-center text-4xl font-black shadow-2xl shadow-blue-500/20 rotate-3 ring-8 ring-white`}>
                        {(selected.customerName || selected.customerPhone || selected.customerIgId || selected.customerTelegramId || 'U')[0]?.toUpperCase()}
                      </div>
                        <div className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl shadow-xl border flex items-center justify-center ${theme.iconColor} ${'bg-white border-gray-50 dark:bg-slate-800 dark:border-white/10'}`}>
                        {selected.platform === 'whatsapp' ? <Smartphone size={20} /> : selected.platform === 'instagram' ? <Bot size={20} /> : <MessageSquare size={20} />}
                      </div>
                    </div>
                    
                    <div className="text-center sm:text-left flex-1 min-w-0">
                      <h4 className={`font-black text-2xl break-words leading-tight ${titleClass}`}>{selected.customerName || 'Unknown Contact'}</h4>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3">
                        <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm ${
                          selected.platform === 'whatsapp' ? 'bg-green-500 text-white' :
                          selected.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {selected.platform || 'whatsapp'}
                        </span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-tight ${'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-slate-300'}`}>
                          <Hash size={12} />
                          ID: {selected._id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Identity & Connection */}
                    <div className="space-y-4">
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${subtleClass}`}>Identity & Comms</p>
                      <div className={`rounded-[2rem] p-5 border space-y-5 ${'bg-gray-50/50 border-gray-100 dark:bg-slate-800/40 dark:border-white/10'}`}>
                        {/* Platform Handle */}
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center ${'bg-white text-gray-400 dark:bg-slate-800 dark:text-slate-300'}`}>
                              <Hash size={18} />
                            </div>
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-tight ${subtleClass}`}>Platform Handle</p>
                              <p className={`text-sm font-black truncate max-w-[120px] ${mutedClass}`}>
                                {selected.customerUsername ? `@${selected.customerUsername}` : (selected.customerIgId || selected.customerTelegramId || 'N/A')}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const val = selected.customerUsername || selected.customerIgId || selected.customerTelegramId;
                              if (val) {
                                navigator.clipboard.writeText(val);
                                toast.success('Handle copied');
                              }
                            }}
                            className={`p-2.5 rounded-xl shadow-sm transition-all ${'text-gray-400 hover:text-blue-500 hover:bg-white dark:text-slate-400 dark:hover:text-[#FF6A00] dark:hover:bg-slate-800'}`}
                          >
                            <Copy size={16} />
                          </button>
                        </div>

                        {/* Verified Phone */}
                        {selected.customerPhone && (
                          <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center text-green-500 border ${'bg-white border-green-50 dark:bg-slate-800 dark:border-white/10'}`}>
                                <Smartphone size={18} />
                              </div>
                              <div>
                                <p className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 ${subtleClass}`}>
                                  Verified Phone
                                  <Shield size={10} className="text-blue-500" />
                                </p>
                                <p className={`text-sm font-black truncate max-w-[140px] ${mutedClass}`}>
                                  {selected.customerPhone}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(selected.customerPhone);
                                toast.success('Phone number copied');
                              }}
                              className={`p-2.5 rounded-xl shadow-sm transition-all ${'text-gray-400 hover:text-blue-500 hover:bg-white dark:text-slate-400 dark:hover:text-[#FF6A00] dark:hover:bg-slate-800'}`}
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        )}

                        {/* Status */}
                        <div className={`flex items-center gap-4 border-t pt-4 ${sectionBorder}`}>
                          <div className={`w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center ${'bg-white text-gray-400 dark:bg-slate-800 dark:text-slate-300'}`}>
                            <Activity size={18} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${subtleClass}`}>Current Status</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${
                                selected.status === 'active' ? 'bg-green-500' :
                                selected.status === 'closed' ? 'bg-gray-400' :
                                'bg-amber-500'
                              }`}></div>
                              <p className={`text-sm font-black capitalize ${mutedClass}`}>{selected.status.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Analytics */}
                    <div className="space-y-4">
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${subtleClass}`}>Engagement</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div className={`p-5 rounded-[2rem] border flex items-center justify-between group ${'bg-gradient-to-br from-blue-50/50 to-white border-blue-100/50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:border-white/10'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl text-blue-500 shadow-sm group-hover:scale-110 transition-transform ${'bg-white dark:bg-slate-800'}`}>
                              <MessageSquare size={18} />
                            </div>
                            <span className={`text-[11px] font-black tracking-wider ${subtleClass}`}>TOTAL MESSAGES</span>
                          </div>
                          <p className={`text-2xl font-black ${titleClass}`}>{selected.totalMessages}</p>
                        </div>
                        <div className={`p-5 rounded-[2rem] border flex items-center justify-between group ${'bg-gradient-to-br from-purple-50/50 to-white border-purple-100/50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:border-white/10'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl text-purple-500 shadow-sm group-hover:scale-110 transition-transform ${'bg-white dark:bg-slate-800'}`}>
                              <Zap size={18} />
                            </div>
                            <span className={`text-[11px] font-black tracking-wider ${subtleClass}`}>AI TOKENS USED</span>
                          </div>
                          <p className={`text-2xl font-black ${titleClass}`}>{selected.totalTokensUsed || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline section */}
                  <div className="space-y-4">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${subtleClass}`}>Interaction History</p>
                    <div className={`rounded-[2.5rem] p-6 border flex flex-col md:flex-row gap-8 ${'bg-gray-50/30 border-gray-100 dark:bg-slate-800/30 dark:border-white/10'}`}>
                      <div className="flex-1 flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center text-blue-500 shrink-0 border ${'bg-white border-blue-50 dark:bg-slate-800 dark:border-white/10'}`}>
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-tight ${subtleClass}`}>Onboarded On</p>
                          <p className={`text-sm font-black mt-0.5 ${mutedClass}`}>
                            {selected.createdAt ? format(new Date(selected.createdAt), 'MMMM dd, yyyy') : 'N/A'}
                          </p>
                          <p className={`text-[11px] font-bold mt-0.5 ${subtleClass}`}>
                            {selected.createdAt ? format(new Date(selected.createdAt), 'HH:mm aa') : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`w-px hidden md:block ${'bg-gray-100 dark:bg-white/10'}`} />
                      <div className="flex-1 flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center text-amber-500 shrink-0 border ${'bg-white border-amber-50 dark:bg-slate-800 dark:border-white/10'}`}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-tight ${subtleClass}`}>Last Active</p>
                          <p className={`text-sm font-black mt-0.5 ${mutedClass}`}>
                            {selected.lastMessageAt ? formatDistanceToNow(new Date(selected.lastMessageAt), { addSuffix: true }) : 'N/A'}
                          </p>
                          <p className={`text-[11px] font-bold mt-0.5 uppercase ${subtleClass}`}>Latest Interaction</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segmentations & Intelligence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-2">
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${subtleClass}`}>Labels</p>
                        <button className="text-[10px] text-blue-600 font-black hover:underline flex items-center gap-1 uppercase">
                          <Tag size={10} /> Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.tags && selected.tags.length > 0 ? (
                          selected.tags.map((tag, i) => (
                            <span key={i} className={`px-4 py-2 border text-[11px] font-black rounded-2xl shadow-sm transition-all cursor-pointer ${'bg-white border-gray-100 text-gray-700 hover:border-blue-200 dark:bg-slate-800 dark:border-white/10 dark:text-slate-200 dark:hover:border-[#FF6A00]/40'}`}>
                              {tag}
                            </span>
                          ))
                        ) : (
                          <div className={`w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center group transition-all cursor-pointer ${'border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50/50 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-slate-800/40'}`}>
                            <Tag size={24} className="mb-2 opacity-20 group-hover:opacity-40" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Add customer labels</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-2">
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${subtleClass}`}>Intelligence Notes</p>
                        <button className="text-[10px] text-amber-600 font-black hover:underline flex items-center gap-1 uppercase">
                          <FileText size={10} /> Update
                        </button>
                      </div>
                      <div className={`p-5 border rounded-3xl min-h-[100px] shadow-inner relative group ${'bg-gradient-to-br from-amber-50/20 to-white border-amber-100/50 dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900 dark:border-white/10'}`}>
                        {selected.notes ? (
                          <p className={`text-xs leading-relaxed font-bold italic ${mutedClass}`}>"{selected.notes}"</p>
                        ) : (
                          <div className={`flex flex-col items-center justify-center h-full gap-2 opacity-40 ${subtleClass}`}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-center px-4 leading-tight italic">No private agent notes found for this lead</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className={`p-6 border-t flex justify-center shrink-0 ${'bg-gray-50 border-gray-100 dark:bg-slate-900 dark:border-white/10'}`}>
                  <button 
                    onClick={() => setShowContactModal(false)}
                    className="px-10 py-3.5 bg-[#FF6A00] text-white rounded-2xl text-sm font-black shadow-xl hover:bg-[#e35f00] transition-all transform hover:scale-105"
                  >
                    Close Information
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Template Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { if (!sendingTemplate && !creatingTemplate) setShowTemplateModal(false); }}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`relative w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border ${'bg-white border-white/20 dark:bg-slate-900 dark:border-white/10'}`}
              >
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between shrink-0 ${'bg-white border-gray-100 dark:bg-slate-900 dark:border-white/10'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${theme.bgChat || 'bg-green-500/10'} ${theme.iconColor || 'text-green-500'} shadow-inner`}>
                      <Zap size={22} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className={`font-black text-lg leading-tight ${titleClass}`}>
                        {viewMode === 'list' ? 'WhatsApp Templates' : 'Create Template'}
                      </h3>
                      <p className={`text-xs font-bold uppercase mt-0.5 tracking-wider ${subtleClass}`}>
                        {viewMode === 'list' ? 'Select and personalize template reply' : 'Submit template to Meta for approval'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode === 'list' && (
                      <button
                        onClick={() => setViewMode('create')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          'bg-orange-50 text-[#FF6A00] hover:bg-orange-100 border border-orange-100 shadow-sm dark:bg-[#FF6A00]/25 dark:text-[#FF6A00] dark:hover:bg-[#FF6A00]/35 dark:border dark:border-[#FF6A00]/30'
                        }`}
                      >
                        + Create Template
                      </button>
                    )}
                    <button 
                      onClick={() => setShowTemplateModal(false)}
                      disabled={sendingTemplate || creatingTemplate}
                      className={`p-2.5 rounded-2xl transition-all ${'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'}`}
                    >
                      <X size={22} />
                    </button>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {loadingTemplates ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <div className="w-10 h-10 border-4 border-whatsapp border-t-transparent rounded-full animate-spin" />
                          <p className={`text-sm ${mutedClass}`}>Syncing templates from WhatsApp Account...</p>
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                          <Bot size={48} className={`mx-auto opacity-25 ${'text-gray-400 dark:text-slate-400'}`} />
                          <p className={`text-sm font-bold ${mutedClass}`}>No templates available</p>
                          <p className={`text-xs max-w-sm mx-auto ${subtleClass}`}>
                            Make sure you have approved templates in your Meta WhatsApp Business Manager dashboard.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[300px]">
                          {/* Left: Templates List */}
                          <div className="space-y-3">
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${subtleClass}`}>Templates List</p>
                            <div className={`border rounded-[2rem] p-3 max-h-[350px] overflow-y-auto space-y-2 ${'bg-gray-50/50 border-gray-150 dark:bg-slate-950/40 dark:border-white/10'}`}>
                              {templates.map((tpl) => {
                                const isSelected = selectedTemplate?.name === tpl.name;
                                return (
                                  <button
                                    key={tpl.name}
                                    onClick={() => {
                                      setSelectedTemplate(tpl);
                                      setTemplateVariables({});
                                    }}
                                    className={`w-full text-left p-3.5 rounded-2xl border transition-all text-xs font-bold flex flex-col gap-1.5 ${
                                      isSelected
                                        ? 'bg-[#FF6A00] text-white border-transparent shadow-md'
                                        : ('bg-white border-gray-100 text-gray-700 hover:bg-gray-50 shadow-sm dark:bg-slate-900 dark:border-white/5 dark:text-slate-200 dark:hover:bg-slate-800')
                                    }`}
                                  >
                                    <span className="font-black text-sm truncate max-w-full">{tpl.name.replace(/_/g, ' ')}</span>
                                    <div className="flex items-center justify-between text-[9px] opacity-80">
                                      <span className="uppercase tracking-wider">{tpl.category}</span>
                                      <span className="uppercase tracking-wider">{tpl.language}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right: Personalization & Preview */}
                          <div className="space-y-4 flex flex-col justify-between">
                            {!selectedTemplate ? (
                              <div className={`flex-1 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-6 text-center ${'border-gray-200 bg-gray-50/30 dark:border-white/10 dark:bg-slate-950/20'}`}>
                                <Zap size={32} className={`mb-2 opacity-20 ${'text-gray-400 dark:text-slate-400'}`} />
                                <p className={`text-xs font-black uppercase tracking-wider ${subtleClass}`}>Select template to customize</p>
                              </div>
                            ) : (
                              <div className="space-y-4 flex-1 flex flex-col">
                                {/* Variables input */}
                                {getTemplateVariables(selectedTemplate).length > 0 && (
                                  <div className="space-y-3 shrink-0">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${subtleClass}`}>Template Variables</p>
                                    <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                                      {getTemplateVariables(selectedTemplate).map((v) => (
                                        <div key={v} className="flex items-center gap-2">
                                          <span className={`text-[10px] font-bold w-12 text-center py-1.5 rounded-lg shrink-0 ${'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                            {`{{${v}}}`}
                                          </span>
                                          <input
                                            type="text"
                                            value={templateVariables[v] || ''}
                                            onChange={(e) => handleVariableChange(v, e.target.value)}
                                            placeholder={`Value for var ${v}`}
                                            className={`flex-1 px-3 py-1.5 rounded-xl border-0 text-xs focus:outline-none focus:ring-2 transition-all ${
                                              'bg-gray-50 text-gray-900 placeholder:text-gray-450 focus:ring-[#FF6A00]/50 border border-gray-200 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#FF6A00]/50'
                                            }`}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Message Preview */}
                                <div className="space-y-2 flex-1 flex flex-col">
                                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${subtleClass}`}>Live Preview</p>
                                  <div className={`flex-1 p-4 rounded-3xl border text-xs leading-relaxed font-medium overflow-y-auto shadow-inner relative min-h-[100px] ${
                                    'bg-green-50/20 border-green-100/50 text-gray-800 dark:bg-slate-950/70 dark:border-white/10 dark:text-slate-200'
                                  }`}>
                                    <div className={`pointer-events-none absolute inset-0 ${'bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.04),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.06),transparent_55%)]'}`} />
                                    <p className="relative z-10 whitespace-pre-wrap">{getTemplatePreview(selectedTemplate)}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className={`p-6 border-t flex items-center justify-end gap-3 shrink-0 ${'bg-gray-50 border-gray-100 dark:bg-slate-900 dark:border-white/10'}`}>
                      <button 
                        type="button"
                        onClick={() => setShowTemplateModal(false)}
                        disabled={sendingTemplate}
                        className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
                          'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                        }`}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={handleSendTemplate}
                        disabled={sendingTemplate || !selectedTemplate}
                        className="px-10 py-3 bg-[#FF6A00] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-xl hover:bg-[#e35f00] hover:scale-102 active:scale-98 transition-all flex items-center gap-2"
                      >
                        {sendingTemplate ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Send Template</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleCreateTemplate} className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Template Name */}
                      <div className="space-y-2 text-left">
                        <label className={`text-xs font-black uppercase tracking-wider ${subtleClass}`}>Template Name</label>
                        <input
                          type="text"
                          required
                          value={newTemplate.name}
                          onChange={(e) => {
                            const sanitizedValue = e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '_')
                              .replace(/[^a-z0-9_]/g, '');
                            setNewTemplate((prev) => ({ ...prev, name: sanitizedValue }));
                          }}
                          placeholder="e.g. order_update (lowercase & underscores only)"
                          className={`w-full px-4 py-3 rounded-2xl border-0 text-sm focus:outline-none focus:ring-2 transition-all ${
                            'bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:ring-[#FF6A00]/50 border border-gray-200 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#FF6A00]/50'
                          }`}
                        />
                        <p className={`text-[10px] ${subtleClass}`}>
                          Spaces and special characters will automatically be converted to underscores (`_`).
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        {/* Category */}
                        <div className="space-y-2">
                          <label className={`text-xs font-black uppercase tracking-wider ${subtleClass}`}>Category</label>
                          <select
                            value={newTemplate.category}
                            onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
                            className={`w-full px-4 py-3 rounded-2xl border-0 text-sm focus:outline-none focus:ring-2 transition-all ${
                              'bg-gray-50 text-gray-900 focus:ring-[#FF6A00]/50 border border-gray-250 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-[#FF6A00]/50'
                            }`}
                          >
                            <option value="UTILITY">Utility (Transaction notifications, OTPs)</option>
                            <option value="MARKETING">Marketing (Offers, updates, feedback)</option>
                          </select>
                        </div>

                        {/* Language */}
                        <div className="space-y-2">
                          <label className={`text-xs font-black uppercase tracking-wider ${subtleClass}`}>Language</label>
                          <select
                            value={newTemplate.language}
                            onChange={(e) => setNewTemplate((prev) => ({ ...prev, language: e.target.value }))}
                            className={`w-full px-4 py-3 rounded-2xl border-0 text-sm focus:outline-none focus:ring-2 transition-all ${
                              'bg-gray-50 text-gray-900 focus:ring-[#FF6A00]/50 border border-gray-200 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-[#FF6A00]/50'
                            }`}
                          >
                            <option value="en_US">English (US)</option>
                            <option value="en_GB">English (UK)</option>
                            <option value="es">Spanish</option>
                            <option value="hi">Hindi</option>
                            <option value="pt_BR">Portuguese (Brazil)</option>
                          </select>
                        </div>
                      </div>

                      {/* Body Text */}
                      <div className="space-y-2 text-left">
                        <label className={`text-xs font-black uppercase tracking-wider ${subtleClass}`}>Body Text</label>
                        <textarea
                          required
                          rows={5}
                          value={newTemplate.bodyText}
                          onChange={(e) => setNewTemplate((prev) => ({ ...prev, bodyText: e.target.value }))}
                          placeholder="Enter the template body text here... Use {{1}}, {{2}} to denote variables."
                          className={`w-full px-4 py-3 rounded-2xl border-0 text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                            'bg-gray-50 text-gray-900 placeholder:text-gray-450 focus:ring-[#FF6A00]/50 border border-gray-200 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#FF6A00]/50'
                          }`}
                        />
                        <div className={`p-4 rounded-2xl border text-[11px] leading-relaxed ${
                          'bg-gray-50/50 border-gray-100 text-gray-600 dark:bg-slate-950/40 dark:border-white/5 dark:text-slate-300'
                        }`}>
                          <strong>Variable Guidelines:</strong> Add variables like {"{{1}}"}, {"{{2}}"} to personalize messages. Note that variables must be numbered sequentially starting at 1.
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className={`p-6 border-t flex items-center justify-end gap-3 shrink-0 ${'bg-gray-50 border-gray-100 dark:bg-slate-900 dark:border-white/10'}`}>
                      <button 
                        type="button"
                        onClick={() => setViewMode('list')}
                        disabled={creatingTemplate}
                        className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
                          'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                        }`}
                      >
                        Back to Templates
                      </button>
                      <button 
                        type="submit"
                        disabled={creatingTemplate}
                        className="px-10 py-3 bg-[#FF6A00] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-xl hover:bg-[#e35f00] hover:scale-102 active:scale-98 transition-all flex items-center gap-2"
                      >
                        {creatingTemplate ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            <span>Submit for Approval</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
