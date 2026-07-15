import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, DollarSign, Calendar, User, X } from 'lucide-react';
import { dealAPI, contactAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL_STAGES = [
  { id: 'LEAD', label: 'Lead', color: 'bg-neutral-500' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-500' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'WON', label: 'Won', color: 'bg-green-500' },
  { id: 'LOST', label: 'Lost', color: 'bg-red-500' }
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

  return (
    <>
      <div className="p-6 h-full flex flex-col relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Deals Pipeline</h1>
            <p className="text-neutral-400">Manage your sales opportunities and track revenue.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
            {INITIAL_STAGES.map((stage) => (
              <div 
                key={stage.id} 
                className="min-w-[320px] w-[320px] flex flex-col bg-neutral-900/60 rounded-xl border border-neutral-800 shadow-xl"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-4 border-b border-neutral-800/50 flex justify-between items-center bg-neutral-800/40 rounded-t-xl backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color} shadow-[0_0_8px_currentColor]`} />
                    <h3 className="font-semibold text-white tracking-wide">{stage.label}</h3>
                    <span className="text-xs font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                      {deals.filter(d => d.stage === stage.id).length}
                    </span>
                  </div>
                  <button className="text-neutral-500 hover:text-white transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                  {deals.filter(d => d.stage === stage.id).map(deal => (
                    <motion.div 
                      layoutId={deal._id}
                      key={deal._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal._id)}
                      onDragEnd={handleDragEnd}
                      className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/50 cursor-grab active:cursor-grabbing hover:border-neutral-500 transition-all shadow-lg hover:shadow-xl group"
                    >
                      <h4 className="font-semibold text-white mb-1.5 group-hover:text-blue-400 transition-colors">{deal.title}</h4>
                      
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-3">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{deal.contact?.name || deal.contact?.phone || 'Unknown Contact'}</span>
                      </div>

                      {deal.expectedCloseDate && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(new Date(deal.expectedCloseDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-700/50">
                        <div className="flex items-center text-green-400 font-bold text-sm bg-green-400/10 px-2 py-1 rounded-lg">
                          <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                          {deal.amount?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-800 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center p-5 border-b border-neutral-800 bg-neutral-900/50">
                  <h2 className="text-lg font-bold text-white">Create New Deal</h2>
                  <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white transition-colors bg-neutral-800 hover:bg-neutral-700 p-1.5 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateDeal} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Deal Title *</label>
                    <input 
                      type="text" 
                      required
                      value={newDeal.title}
                      onChange={(e) => setNewDeal({...newDeal, title: e.target.value})}
                      placeholder="e.g. Enterprise Upgrade"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Contact *</label>
                    <select
                      required
                      value={newDeal.contactId}
                      onChange={(e) => setNewDeal({...newDeal, contactId: e.target.value})}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    >
                      <option value="">Select a contact</option>
                      {contacts.map(c => (
                        <option key={c._id} value={c._id}>{c.name || c.phone}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">Amount ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                        <input 
                          type="number" 
                          min="0"
                          value={newDeal.amount}
                          onChange={(e) => setNewDeal({...newDeal, amount: e.target.value})}
                          placeholder="0"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">Initial Stage</label>
                      <select
                        value={newDeal.stage}
                        onChange={(e) => setNewDeal({...newDeal, stage: e.target.value})}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                      >
                        {INITIAL_STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Expected Close Date</label>
                    <input 
                      type="date" 
                      value={newDeal.expectedCloseDate}
                      onChange={(e) => setNewDeal({...newDeal, expectedCloseDate: e.target.value})}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={creating}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
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
