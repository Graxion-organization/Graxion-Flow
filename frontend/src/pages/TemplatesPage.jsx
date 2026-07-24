import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  PlusIcon, 
  SparklesIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { templateAPI } from '../services/api';

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('my-templates'); // 'my-templates' | 'system-library' | 'custom-builder'
  
  // Data States
  const [myTemplates, setMyTemplates] = useState([]);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Clone System Modal State
  const [cloneModal, setCloneModal] = useState({ isOpen: false, sysTpl: null, customName: '' });
  const [isCloning, setIsCloning] = useState(false);

  // Custom Builder Form State
  const [builderForm, setBuilderForm] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    headerType: 'NONE', // 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [] // Array of { type: 'QUICK_REPLY' | 'URL', text: '', url: '' }
  });
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [myRes, sysRes] = await Promise.all([
        templateAPI.getAll().catch(() => ({ data: { data: { templates: [] } } })),
        templateAPI.getSystem().catch(() => ({ data: { data: { templates: [] } } }))
      ]);
      setMyTemplates(myRes.data?.data?.templates || []);
      setSystemTemplates(sysRes.data?.data?.templates || []);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const res = await templateAPI.sync();
      toast.success(res.data?.message || 'Synced templates from Meta successfully!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync templates from Meta');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTemplate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}" from Meta and local DB?`)) return;
    try {
      await templateAPI.delete(id);
      toast.success('Template deleted successfully');
      setMyTemplates(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleCloneSubmit = async () => {
    if (!cloneModal.sysTpl) return;
    setIsCloning(true);
    try {
      const res = await templateAPI.cloneSystem({
        systemTemplateId: cloneModal.sysTpl.id,
        customName: cloneModal.customName || undefined
      });
      toast.success(res.data?.message || 'Template cloned and submitted to Meta!');
      setCloneModal({ isOpen: false, sysTpl: null, customName: '' });
      setActiveTab('my-templates');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clone template to Meta');
    } finally {
      setIsCloning(false);
    }
  };

  const handleInsertVariable = () => {
    const matches = builderForm.bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const nextVarIndex = matches.length + 1;
    setBuilderForm(prev => ({
      ...prev,
      bodyText: prev.bodyText + ` {{${nextVarIndex}}}`
    }));
  };

  const handleAddButton = (type) => {
    if (builderForm.buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed per template');
      return;
    }
    setBuilderForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type, text: type === 'QUICK_REPLY' ? 'Quick Action' : 'Visit Website', url: type === 'URL' ? 'https://example.com' : '' }]
    }));
  };

  const handleRemoveButton = (index) => {
    setBuilderForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const handleCreateCustomSubmit = async (e) => {
    e.preventDefault();
    if (!builderForm.name.trim()) return toast.error('Template name is required');
    if (!builderForm.bodyText.trim()) return toast.error('Body text is required');

    setIsSubmittingCustom(true);

    try {
      const components = [];

      // Header component
      if (builderForm.headerType !== 'NONE') {
        if (builderForm.headerType === 'TEXT') {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: builderForm.headerText || 'Announcement'
          });
        } else {
          components.push({
            type: 'HEADER',
            format: builderForm.headerType
          });
        }
      }

      // Body component
      components.push({
        type: 'BODY',
        text: builderForm.bodyText
      });

      // Footer component
      if (builderForm.footerText.trim()) {
        components.push({
          type: 'FOOTER',
          text: builderForm.footerText.trim()
        });
      }

      // Buttons component
      if (builderForm.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: builderForm.buttons.map(b => {
            if (b.type === 'URL') {
              return { type: 'URL', text: b.text, url: b.url };
            }
            return { type: 'QUICK_REPLY', text: b.text };
          })
        });
      }

      const res = await templateAPI.create({
        name: builderForm.name,
        category: builderForm.category,
        language: builderForm.language,
        components
      });

      toast.success(res.data?.message || 'Custom template submitted to Meta for review!');
      setBuilderForm({
        name: '',
        category: 'MARKETING',
        language: 'en_US',
        headerType: 'NONE',
        headerText: '',
        bodyText: '',
        footerText: '',
        buttons: []
      });
      setActiveTab('my-templates');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit custom template to Meta');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Filtered Templates List
  const filteredMyTemplates = myTemplates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100 font-sans min-h-screen">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#0b111d]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-1">
            <SparklesIcon className="w-4 h-4" /> Meta Graph API Integrated
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            WhatsApp Marketing Templates Hub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            1-Click clone pre-approved system templates or submit custom Meta Graph API templates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSyncFromMeta}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#162032] border border-white/10 hover:border-white/20 text-slate-200 rounded-xl font-semibold text-xs transition-all shadow-md disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Meta'}
          </button>

          <button
            onClick={() => setActiveTab('custom-builder')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] hover:from-[#FF7A1A] hover:to-[#FF9A1A] text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(255,106,0,0.3)] transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Create Custom Template
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-8 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('my-templates')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'my-templates'
              ? 'border-[#FF6A00] text-[#FF8A00] bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          My Meta Templates ({myTemplates.length})
        </button>

        <button
          onClick={() => setActiveTab('system-library')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'system-library'
              ? 'border-[#FF6A00] text-[#FF8A00] bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <SparklesIcon className="w-4 h-4 text-[#FF8A00]" />
          System Template Library ({systemTemplates.length})
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FF6A00]/20 text-[#FF8A00] border border-[#FF6A00]/40 font-bold">
            1-Click Clone
          </span>
        </button>

        <button
          onClick={() => setActiveTab('custom-builder')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'custom-builder'
              ? 'border-[#FF6A00] text-[#FF8A00] bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <PlusIcon className="w-4 h-4" />
          Custom Builder & Live Preview
        </button>
      </div>

      {/* TAB 1: MY META TEMPLATES */}
      {activeTab === 'my-templates' && (
        <div>
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6A00]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-[#FF6A00] text-white shadow-md'
                      : 'bg-[#162032] text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="text-center py-20 text-slate-500">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-[#FF6A00]" />
              Loading templates...
            </div>
          ) : filteredMyTemplates.length === 0 ? (
            <div className="bg-[#0b111d]/60 border border-white/10 rounded-2xl p-12 text-center">
              <DocumentDuplicateIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-200">No Meta Templates Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Sync templates directly from your WhatsApp Business Account or clone a pre-approved system template.
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={handleSyncFromMeta}
                  className="px-4 py-2 bg-[#162032] border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl"
                >
                  Sync from Meta
                </button>
                <button
                  onClick={() => setActiveTab('system-library')}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Explore System Library
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyTemplates.map(tpl => {
                const bodyComp = tpl.components?.find(c => c.type === 'BODY');
                const headerComp = tpl.components?.find(c => c.type === 'HEADER');
                const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
                const buttonsComp = tpl.components?.find(c => c.type === 'BUTTONS');

                return (
                  <div
                    key={tpl._id}
                    className="bg-[#0b111d]/90 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-slate-100 group-hover:text-[#FF8A00] transition-colors font-mono">
                            {tpl.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{tpl.category || 'MARKETING'}</span>
                            <span>•</span>
                            <span>{tpl.language || 'en_US'}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {tpl.status === 'APPROVED' && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircleIcon className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                          {tpl.status === 'PENDING' && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <ClockIcon className="w-3.5 h-3.5" /> Reviewing
                            </span>
                          )}
                          {tpl.status === 'REJECTED' && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircleIcon className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rejection Reason Notice if any */}
                      {tpl.status === 'REJECTED' && tpl.rejectedReason && (
                        <div className="mb-2.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300">
                          <span className="font-bold">Meta Reason:</span> {tpl.rejectedReason}
                        </div>
                      )}

                      {/* Header Media / Text if any */}
                      {headerComp && (
                        <div className="mb-2 p-2 bg-[#070B12] rounded-lg border border-white/5 text-xs text-slate-300 font-semibold">
                          {headerComp.format === 'TEXT' ? (
                            <span>📌 {headerComp.text}</span>
                          ) : (
                            <span>🖼️ Header: [{headerComp.format}]</span>
                          )}
                        </div>
                      )}

                      {/* Body Content */}
                      <div className="bg-[#070B12] p-3 rounded-xl border border-white/5 mb-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {bodyComp?.text || 'No body content'}
                      </div>

                      {/* Footer text */}
                      {footerComp && (
                        <p className="text-[10px] text-slate-500 mb-3 italic">
                          {footerComp.text}
                        </p>
                      )}

                      {/* Buttons Preview */}
                      {buttonsComp?.buttons?.length > 0 && (
                        <div className="space-y-1 mb-4">
                          {buttonsComp.buttons.map((btn, idx) => (
                            <div
                              key={idx}
                              className="w-full py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg text-center text-xs font-semibold text-[#FF8A00]"
                            >
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions Bottom Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tpl.name);
                          toast.success('Template name copied to clipboard');
                        }}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Copy Name
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tpl._id, tpl.name)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Template"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SYSTEM TEMPLATE LIBRARY */}
      {activeTab === 'system-library' && (
        <div>
          <div className="mb-6 p-4 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-xl flex items-center gap-3 text-xs text-slate-200">
            <InformationCircleIcon className="w-5 h-5 text-[#FF8A00] shrink-0" />
            <span>
              Select any pre-designed high-converting system template below to submit directly to your Meta WhatsApp account in 1-click. Meta automated AI will review & approve it within minutes.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemTemplates.map(sys => {
              const bodyComp = sys.components.find(c => c.type === 'BODY');
              const headerComp = sys.components.find(c => c.type === 'HEADER');
              const footerComp = sys.components.find(c => c.type === 'FOOTER');
              const buttonsComp = sys.components.find(c => c.type === 'BUTTONS');

              return (
                <div
                  key={sys.id}
                  className="bg-[#0b111d]/90 border border-white/10 rounded-2xl p-5 hover:border-[#FF6A00]/50 transition-all shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FF6A00]/15 text-[#FF8A00] font-bold border border-[#FF6A00]/30">
                        {sys.badge || 'High Converting'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{sys.category}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-100 mb-1">{sys.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{sys.description}</p>

                    {/* Card WhatsApp Preview Box */}
                    <div className="bg-[#070B12] p-4 rounded-xl border border-white/10 mb-4 space-y-2">
                      {headerComp && (
                        <p className="font-bold text-xs text-[#FF8A00]">{headerComp.text}</p>
                      )}
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {bodyComp?.text}
                      </p>
                      {footerComp && (
                        <p className="text-[10px] text-slate-500 italic">{footerComp.text}</p>
                      )}
                      {buttonsComp?.buttons?.map((b, i) => (
                        <div key={i} className="py-1 px-3 bg-white/5 border border-white/10 rounded text-center text-xs font-semibold text-[#FF8A00]">
                          {b.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setCloneModal({ isOpen: true, sysTpl: sys, customName: '' })}
                    className="w-full py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] hover:from-[#FF7A1A] hover:to-[#FF9A1A] text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(255,106,0,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <SparklesIcon className="w-4 h-4" /> 1-Click Clone & Submit to Meta
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM TEMPLATE BUILDER WITH LIVE PHONE MOCKUP */}
      {activeTab === 'custom-builder' && (
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Builder Form */}
          <div className="lg:col-span-7 bg-[#0b111d]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-slate-100 mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-[#FF6A00]" /> Design Custom WhatsApp Template
            </h2>

            <form onSubmit={handleCreateCustomSubmit} className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Template Name (Meta Format)
                </label>
                <input
                  type="text"
                  placeholder="e.g. mega_sale_discount_2026"
                  value={builderForm.name}
                  onChange={e => setBuilderForm({ ...builderForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  className="w-full px-4 py-2.5 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-[#FF6A00]"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Only lowercase letters, numbers, and underscores allowed.</span>
              </div>

              {/* Category & Language Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={builderForm.category}
                    onChange={e => setBuilderForm({ ...builderForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                  >
                    <option value="MARKETING">MARKETING (Promotions & Offers)</option>
                    <option value="UTILITY">UTILITY (Notifications & Updates)</option>
                    <option value="AUTHENTICATION">AUTHENTICATION (OTP & Security)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Language
                  </label>
                  <select
                    value={builderForm.language}
                    onChange={e => setBuilderForm({ ...builderForm, language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                  >
                    <option value="en_US">English (en_US)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                  </select>
                </div>
              </div>

              {/* Header Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Header Type (Optional)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'].map(type => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setBuilderForm({ ...builderForm, headerType: type })}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        builderForm.headerType === type
                          ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
                          : 'bg-[#0B1220] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {builderForm.headerType === 'TEXT' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Enter header title text..."
                      value={builderForm.headerText}
                      onChange={e => setBuilderForm({ ...builderForm, headerText: e.target.value.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F191}-\u{1F251}]/gu, '').replace(/[*_~\n\r'"]/g, '') })}
                      className="w-full mt-2 px-4 py-2 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Meta rules: Emojis and asterisks are not allowed in TEXT headers (allowed in Body text).</span>
                  </div>
                )}
              </div>

              {/* Body Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Message Body Text *
                  </label>
                  <button
                    type="button"
                    onClick={handleInsertVariable}
                    className="text-xs text-[#FF8A00] hover:text-[#FFC48D] font-bold flex items-center gap-1"
                  >
                    + Add Variable {'{{1}}'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Hi {{1}}, thank you for ordering! Your coupon code is {{2}}."
                  value={builderForm.bodyText}
                  onChange={e => setBuilderForm({ ...builderForm, bodyText: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] leading-relaxed"
                  required
                />
              </div>

              {/* Footer Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Footer Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reply STOP to opt out"
                  value={builderForm.footerText}
                  onChange={e => setBuilderForm({ ...builderForm, footerText: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              {/* Buttons Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Interactive Buttons (Max 3)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddButton('QUICK_REPLY')}
                      className="text-[11px] px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg font-semibold"
                    >
                      + Quick Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddButton('URL')}
                      className="text-[11px] px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg font-semibold"
                    >
                      + Website URL
                    </button>
                  </div>
                </div>

                {builderForm.buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 p-2 bg-[#0B1220] rounded-xl border border-white/5 text-xs">
                    <span className="text-slate-400 font-mono text-[10px]">{btn.type}</span>
                    <input
                      type="text"
                      placeholder="Button Text (no emojis allowed)"
                      value={btn.text}
                      onChange={e => {
                        const newBtns = [...builderForm.buttons];
                        newBtns[i].text = e.target.value.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F191}-\u{1F251}]/gu, '').replace(/[*_~\n\r'"]/g, '');
                        setBuilderForm({ ...builderForm, buttons: newBtns });
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#070B12] border border-white/10 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                    />
                    {btn.type === 'URL' && (
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={btn.url}
                        onChange={e => {
                          const newBtns = [...builderForm.buttons];
                          newBtns[i].url = e.target.value;
                          setBuilderForm({ ...builderForm, buttons: newBtns });
                        }}
                        className="flex-1 px-3 py-1.5 bg-[#070B12] border border-white/10 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-[#FF6A00]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(i)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingCustom}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] hover:from-[#FF7A1A] hover:to-[#FF9A1A] text-white font-bold text-sm rounded-xl shadow-[0_6px_20px_rgba(255,106,0,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
              >
                {isSubmittingCustom ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" /> Submitting to Meta...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" /> Submit Template to Meta Graph API
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Smartphone Live Preview Mockup */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-[#FF8A00]" /> WhatsApp Live Message Preview
            </h3>

            <div className="w-full max-w-[320px] bg-[#0c1421] border-4 border-[#1f293d] rounded-[36px] p-4 shadow-2xl relative overflow-hidden">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-[#1f293d] rounded-b-xl mx-auto mb-3" />

              {/* WhatsApp Chat Box */}
              <div className="bg-[#0b141a] rounded-2xl p-3 border border-white/5 text-xs text-slate-100 relative shadow-md space-y-2">
                {/* Header Preview */}
                {builderForm.headerType !== 'NONE' && (
                  <div className="font-bold text-[#FF8A00] border-b border-white/10 pb-1.5">
                    {builderForm.headerType === 'TEXT' ? builderForm.headerText || 'Header Text' : `[Header ${builderForm.headerType}]`}
                  </div>
                )}

                {/* Body Preview with Variable Highlight */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {builderForm.bodyText ? (
                    builderForm.bodyText.split(/(\{\{\d+\}\})/).map((part, idx) => (
                      part.match(/^\{\{\d+\}\}$/) ? (
                        <span key={idx} className="bg-[#FF6A00]/20 text-[#FF8A00] font-bold px-1 rounded border border-[#FF6A00]/40">
                          {part}
                        </span>
                      ) : (
                        <span key={idx}>{part}</span>
                      )
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Your WhatsApp message body content will appear here...</span>
                  )}
                </div>

                {/* Footer Preview */}
                {builderForm.footerText && (
                  <div className="text-[10px] text-slate-500 italic pt-1 border-t border-white/5">
                    {builderForm.footerText}
                  </div>
                )}

                {/* Message Timestamp & Checkmarks */}
                <div className="text-[9px] text-slate-400 text-right font-mono pt-1">
                  12:00 PM ✓✓
                </div>
              </div>

              {/* Buttons Mockup */}
              {builderForm.buttons.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {builderForm.buttons.map((b, i) => (
                    <div key={i} className="w-full py-2 bg-[#1f2c34] hover:bg-[#2a3942] text-[#00a884] text-center font-bold text-xs rounded-xl shadow cursor-pointer">
                      {b.text || 'Button Text'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLONE SYSTEM TEMPLATE MODAL */}
      {cloneModal.isOpen && cloneModal.sysTpl && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b111d] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-[#FF8A00]" />
              Clone & Submit Template to Meta
            </h3>

            <p className="text-xs text-slate-400">
              Submit <strong>{cloneModal.sysTpl.title}</strong> directly to your WhatsApp Business Account. Meta will review it automatically.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Template Name on Meta
              </label>
              <input
                type="text"
                placeholder={`tpl_${cloneModal.sysTpl.id.replace('sys_', '')}`}
                value={cloneModal.customName}
                onChange={e => setCloneModal({ ...cloneModal, customName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                className="w-full px-4 py-2.5 bg-[#0B1220] border border-white/10 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-[#FF6A00]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => setCloneModal({ isOpen: false, sysTpl: null, customName: '' })}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneSubmit}
                disabled={isCloning}
                className="px-5 py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isCloning ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                {isCloning ? 'Submitting to Meta...' : 'Submit to Meta Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
