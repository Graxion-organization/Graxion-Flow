import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, Calendar, User, X, TrendingUp, Activity, Target, Inbox, GripVertical } from 'lucide-react';
import { dealAPI, contactAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL_STAGES = [
  { id: 'LEAD', label: 'Lead', color: 'bg-indigo-500', text: 'text-indigo-500', bgLight: 'bg-indigo-500/10', bgDark: 'bg-indigo-500/20' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-500', text: 'text-blue-500', bgLight: 'bg-blue-500/10', bgDark: 'bg-blue-500/20' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500', text: 'text-orange-500', bgLight: 'bg-orange-500/10', bgDark: 'bg-orange-500/20' },
  { id: 'OBJECTION', label: 'Objection', color: 'bg-amber-500', text: 'text-amber-500', bgLight: 'bg-amber-500/10', bgDark: 'bg-amber-500/20' },
  { id: 'WON', label: 'Won', color: 'bg-emerald-500', text: 'text-emerald-500', bgLight: 'bg-emerald-500/10', bgDark: 'bg-emerald-500/20' },
  { id: 'LOST', label: 'Lost', color: 'bg-rose-500', text: 'text-rose-500', bgLight: 'bg-rose-500/10', bgDark: 'bg-rose-500/20' }
];

export default function DealsPipeline() {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  
  const [newDeal, setNewDeal] = useState({
    title: '',
    amount: '',
    contactId: '',
    stage: 'LEAD',
    expectedCloseDate: '',
    notes: ''
  });
  const [creating, setCreating] = useState(false);
  const [draggedDealId, setDraggedDealId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        dealAPI.getAll(),
        contactAPI.getAll({ limit: 100 })
      ]);
      setDeals(dealsRes.data.data.deals || []);
      setContacts(contactsRes.data.data.contacts || []);
    } catch (error) {
      toast.error('Failed to load deals or contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.contactId) {
      toast.error('Title and Contact are required');
      return;
    }
    
    setCreating(true);
    try {
      const payload = {
        ...newDeal,
        amount: Number(newDeal.amount) || 0
      };
      await dealAPI.create(payload);
      toast.success('Deal created successfully!');
      setShowModal(false);
      setNewDeal({ title: '', amount: '', contactId: '', stage: 'LEAD', expectedCloseDate: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create deal');
    } finally {
      setCreating(false);
    }
  };

  const handleDragStart = (e, dealId) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if(e.target) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if(e.target) e.target.style.opacity = '1';
    setDraggedDealId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, stageId) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const deal = deals.find(d => d._id === draggedDealId);
    if (!deal || deal.stage === stageId) return;

    setDeals(prevDeals => 
      prevDeals.map(d => 
        d._id === draggedDealId ? { ...d, stage: stageId } : d
      )
    );

    try {
      await dealAPI.update(draggedDealId, { stage: stageId });
      toast.success('Deal moved successfully');
    } catch (err) {
      toast.error('Failed to move deal');
      fetchData();
    }
    setDraggedDealId(null);
  };

  // Metrics Calculations
  const totalValue = deals.reduce((acc, deal) => acc + (Number(deal.amount) || 0), 0);
  const activeDealsCount = deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST').length;
  const wonDealsCount = deals.filter(d => d.stage === 'WON').length;
  const totalDealsCount = deals.length || 1; // Prevent division by zero
  const winRate = Math.round((wonDealsCount / totalDealsCount) * 100) || 0;

  return (
    <>
      <div className="p-4 sm:p-6 h-[calc(100vh-80px)] flex flex-col relative overflow-hidden">
        
        {/* Background Premium Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6A00]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none -z-10"></div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 z-10 shrink-0">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Deals Pipeline</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage your sales opportunities and track revenue.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#e05d00] transition-colors shadow-lg shadow-[#FF6A00]/20 shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            New Deal
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 z-10 shrink-0">
          <div className={`p-5 rounded-2xl border flex flex-col justify-between group transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-[#FF6A00]/50' : 'bg-white border-slate-200 hover:border-[#FF6A00]/50'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Pipeline</p>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>${totalValue.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/10 flex items-center justify-center text-[#FF6A00] group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className={`p-5 rounded-2xl border flex flex-col justify-between group transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-500/50'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Deals</p>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeDealsCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border flex flex-col justify-between group transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Deals Won</p>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{wonDealsCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border flex flex-col justify-between group transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-500/50'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Win Rate</p>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{winRate}%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start z-10 snap-x sm:snap-none">
            {INITIAL_STAGES.map((stage) => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const stageValue = stageDeals.reduce((acc, deal) => acc + (Number(deal.amount) || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  className={`min-w-[85vw] w-[85vw] sm:min-w-[340px] sm:w-[340px] shrink-0 flex flex-col h-full border rounded-2xl snap-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Stage Header */}
                  <div className={`p-4 border-b flex justify-between items-center rounded-t-2xl ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stage.label}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isDark ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        ${stageValue.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Stage Content / Drop Zone */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {stageDeals.length === 0 ? (
                      <div className={`h-full min-h-[150px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100/50'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                          <Inbox className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Drop deals here</p>
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <motion.div 
                          layoutId={deal._id}
                          key={deal._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal._id)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1 hover:shadow-md group relative ${isDark ? 'bg-slate-800 border-white/10 hover:border-[#FF6A00]/40' : 'bg-white border-slate-200 hover:border-[#FF6A00]/40'}`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${stage.color} opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl`} />
                          
                          <div className="flex justify-between items-start mb-3">
                            <h4 className={`font-semibold transition-colors leading-snug group-hover:text-[#FF6A00] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{deal.title}</h4>
                            <GripVertical className={`w-4 h-4 group-hover:opacity-100 opacity-0 transition-opacity ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          </div>
                          
                          <div className="flex flex-col gap-2 mb-4">
                            <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border w-fit ${isDark ? 'text-slate-400 bg-slate-900 border-white/10' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                              <User className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{deal.contact?.name || deal.contact?.phone || 'Unknown Contact'}</span>
                            </div>

                            {deal.expectedCloseDate && (
                              <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border w-fit ${isDark ? 'text-slate-400 bg-slate-900 border-white/10' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(new Date(deal.expectedCloseDate), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex items-center text-emerald-500 font-semibold text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                              <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                              {deal.amount?.toLocaleString() || '0'}
                            </div>
                            <div className={`text-[10px] font-medium uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              ID: {deal._id.slice(-4)}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className={`rounded-2xl w-full max-w-md border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
              >
                <div className={`flex justify-between items-center p-5 border-b ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#FF6A00]/10 flex items-center justify-center text-[#FF6A00]">
                      <Plus className="w-4 h-4" />
                    </div>
                    Create New Deal
                  </h2>
                  <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateDeal} className={`p-5 space-y-4 overflow-y-auto custom-scrollbar ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Deal Title *</label>
                    <input 
                      type="text" 
                      required
                      value={newDeal.title}
                      onChange={(e) => setNewDeal({...newDeal, title: e.target.value})}
                      placeholder="e.g. Enterprise Upgrade"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] transition-all duration-200 ${isDark ? 'bg-slate-950 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Contact *</label>
                    <select
                      required
                      value={newDeal.contactId}
                      onChange={(e) => setNewDeal({...newDeal, contactId: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-xl text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] transition-all duration-200 ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    >
                      <option value="">Select a contact</option>
                      {contacts.map(c => (
                        <option key={c._id} value={c._id}>{c.name || c.phone}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount ($)</label>
                      <div className="relative">
                        <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input 
                          type="number" 
                          min="0"
                          value={newDeal.amount}
                          onChange={(e) => setNewDeal({...newDeal, amount: e.target.value})}
                          placeholder="0"
                          className={`w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] transition-all duration-200 ${isDark ? 'bg-slate-950 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Initial Stage</label>
                      <select
                        value={newDeal.stage}
                        onChange={(e) => setNewDeal({...newDeal, stage: e.target.value})}
                        className={`w-full px-4 py-3 border rounded-xl text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] transition-all duration-200 ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                      >
                        {INITIAL_STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Expected Close Date</label>
                    <input 
                      type="date" 
                      value={newDeal.expectedCloseDate}
                      onChange={(e) => setNewDeal({...newDeal, expectedCloseDate: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] transition-all duration-200 ${isDark ? 'bg-slate-950 border-white/10 text-white [color-scheme:dark]' : 'bg-white border-slate-200 text-slate-900 [color-scheme:light]'}`}
                    />
                  </div>

                  <div className={`pt-4 flex justify-end gap-3 border-t mt-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={creating}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#e05d00] transition-colors shadow-lg shadow-[#FF6A00]/20 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Deal'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
