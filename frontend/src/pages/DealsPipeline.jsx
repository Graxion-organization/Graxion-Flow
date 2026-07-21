import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, DollarSign, Calendar, User, X, TrendingUp, Activity, Target, Inbox } from 'lucide-react';
import { dealAPI, contactAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL_STAGES = [
  { id: 'LEAD', label: 'Lead', color: 'bg-indigo-500', border: 'border-indigo-500/50', bgLight: 'bg-indigo-500/10' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-500', border: 'border-blue-500/50', bgLight: 'bg-blue-500/10' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500', border: 'border-orange-500/50', bgLight: 'bg-orange-500/10' },
  { id: 'WON', label: 'Won', color: 'bg-emerald-500', border: 'border-emerald-500/50', bgLight: 'bg-emerald-500/10' },
  { id: 'LOST', label: 'Lost', color: 'bg-rose-500', border: 'border-rose-500/50', bgLight: 'bg-rose-500/10' }
];

export default function DealsPipeline() {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        dealAPI.getAll(),
        contactAPI.getAll({ limit: 100 })
      ]);
      setDeals(dealsRes.data.data.deals);
      setContacts(contactsRes.data.data.contacts);
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
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
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
      <div className="p-4 sm:p-6 h-full flex flex-col relative overflow-hidden">
        
        {/* Background Premium Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 z-10">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Deals Pipeline</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your sales opportunities and track revenue.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            New Deal
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 z-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-slate-400 text-xs sm:text-sm font-medium">Total Pipeline Value</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-slate-400 text-xs sm:text-sm font-medium">Active Deals</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{activeDealsCount}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-slate-400 text-xs sm:text-sm font-medium">Deals Won</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{wonDealsCount}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-slate-400 text-xs sm:text-sm font-medium">Win Rate</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{winRate}%</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 sm:gap-6 overflow-x-auto pb-4 custom-scrollbar items-start z-10 snap-x sm:snap-none">
            {INITIAL_STAGES.map((stage) => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const stageValue = stageDeals.reduce((acc, deal) => acc + (Number(deal.amount) || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  className="min-w-[85vw] w-[85vw] sm:min-w-[320px] sm:w-[320px] shrink-0 flex flex-col bg-[#0f1522]/80 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl snap-center"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className={`p-4 border-b border-white/5 flex justify-between items-center rounded-t-2xl bg-gradient-to-r from-transparent to-${stage.color.replace('bg-', '')}/5`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-[0_0_10px_currentColor]`} />
                      <h3 className="font-bold text-slate-100 tracking-wide">{stage.label}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.border} ${stage.bgLight} text-slate-200`}>
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                        ${stageValue.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[250px] custom-scrollbar">
                    {stageDeals.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                          <Inbox className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">No deals yet</p>
                        <p className="text-xs text-slate-500 mt-1">Drag and drop a deal here</p>
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <motion.div 
                          layoutId={deal._id}
                          key={deal._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal._id)}
                          onDragEnd={handleDragEnd}
                          className="bg-white/[0.03] p-4 rounded-xl border border-white/10 cursor-grab active:cursor-grabbing hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 group relative overflow-hidden backdrop-blur-sm"
                        >
                          {/* Decorative stage color line */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${stage.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                          
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <h4 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors leading-tight pr-4">{deal.title}</h4>
                            <button className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-2 pl-2">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span className="truncate">{deal.contact?.name || deal.contact?.phone || 'Unknown Contact'}</span>
                            </div>

                            {deal.expectedCloseDate && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>{format(new Date(deal.expectedCloseDate), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between pl-2">
                            <div className="flex items-center text-emerald-400 font-bold text-sm bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                              <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                              {deal.amount?.toLocaleString() || '0'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
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
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0f1522] rounded-2xl w-full max-w-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/5">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Plus className="w-4 h-4" />
                    </div>
                    Create New Deal
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateDeal} className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deal Title *</label>
                    <input 
                      type="text" 
                      required
                      value={newDeal.title}
                      onChange={(e) => setNewDeal({...newDeal, title: e.target.value})}
                      placeholder="e.g. Enterprise Upgrade"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact *</label>
                    <select
                      required
                      value={newDeal.contactId}
                      onChange={(e) => setNewDeal({...newDeal, contactId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    >
                      <option value="" className="bg-[#0f1522]">Select a contact</option>
                      {contacts.map(c => (
                        <option key={c._id} value={c._id} className="bg-[#0f1522]">{c.name || c.phone}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="number" 
                          min="0"
                          value={newDeal.amount}
                          onChange={(e) => setNewDeal({...newDeal, amount: e.target.value})}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Initial Stage</label>
                      <select
                        value={newDeal.stage}
                        onChange={(e) => setNewDeal({...newDeal, stage: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                      >
                        {INITIAL_STAGES.map(s => (
                          <option key={s.id} value={s.id} className="bg-[#0f1522]">{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expected Close Date</label>
                    <input 
                      type="date" 
                      value={newDeal.expectedCloseDate}
                      onChange={(e) => setNewDeal({...newDeal, expectedCloseDate: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={creating}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.4)]"
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
