import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  DollarSign, 
  Layers, 
  CreditCard, 
  MessageSquare, 
  Bot, 
  Zap, 
  X, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price: 0,
    credits: 0,
    messageLimit: 1000,
    agentLimit: 3,
    postCreditCost: 1,
    agentMsgCreditCost: 1,
    description: "",
    isActive: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPlans();
      setPlans(response.data.data.plans);
    } catch (error) {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      code: "",
      price: 0,
      credits: 0,
      messageLimit: 1000,
      agentLimit: 3,
      postCreditCost: 1,
      agentMsgCreditCost: 1,
      description: "",
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code,
      price: plan.price,
      credits: plan.credits,
      messageLimit: plan.messageLimit || 1000,
      agentLimit: plan.agentLimit || 3,
      postCreditCost: plan.postCreditCost || 1,
      agentMsgCreditCost: plan.agentMsgCreditCost || 1,
      description: plan.description || "",
      isActive: plan.isActive !== undefined ? plan.isActive : true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code || formData.price === undefined || formData.credits === undefined) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      if (editingPlan) {
        // Update Plan
        await adminAPI.updatePlan(editingPlan._id, formData);
        toast.success("Plan updated successfully!");
      } else {
        // Create Plan
        await adminAPI.createPlan(formData);
        toast.success("Plan created successfully!");
      }
      setShowModal(false);
      fetchPlans();
    } catch (error) {
      // Backend error handled by global interceptor, but toggle off loading if needed
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this subscription plan? Users currently subscribed will not be affected but no new users can purchase it.")) return;

    try {
      await adminAPI.deletePlan(planId);
      toast.success("Plan deleted successfully");
      fetchPlans();
    } catch (error) {
      toast.error("Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header with Create Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-300">Plan Management</h2>
          <p className="text-gray-400 text-sm">Add, remove and manage client subscription tiers, credits, and AI pricing rules.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create New Plan
        </button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Plans Available</h3>
          <p className="text-gray-400 mb-6">Create your first subscription plan to allow users to purchase upgrades.</p>
          <button 
            onClick={handleOpenCreateModal}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              layout
              key={plan._id}
              className={`relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e293b] border ${
                plan.isActive ? 'border-white/10 shadow-lg hover:shadow-emerald-950/20' : 'border-white/5 opacity-70'
              } rounded-[2rem] p-6 flex flex-col group transition-all duration-300`}
            >
              {/* Badge for Inactive Tiers */}
              {!plan.isActive && (
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Disabled
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <span className="text-xs font-bold uppercase text-emerald-500 tracking-wider">
                  {plan.code}
                </span>
                <h3 className="text-2xl font-black text-white mt-1 group-hover:text-emerald-400 transition-colors">
                  {plan.name}
                </h3>
                <p className="text-gray-400 text-sm mt-2 line-clamp-2 h-10">
                  {plan.description || "No description provided."}
                </p>
              </div>

              {/* Pricing Tag */}
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">₹{plan.price}</span>
                <span className="text-gray-400 ml-1.5 text-sm">/ month</span>
              </div>

              {/* Highlights & Limits */}
              <div className="space-y-4 py-4 border-t border-b border-white/5 mb-6 text-sm text-gray-300 flex-1">
                {/* Total Credits */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-400">
                    <Zap className="w-4 h-4 text-amber-500" /> Allocated Credits
                  </span>
                  <span className="font-bold text-white text-base">
                    {plan.credits.toLocaleString()}
                  </span>
                </div>

                {/* Msg Limits */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-400">
                    <MessageSquare className="w-4 h-4 text-emerald-500" /> Messages/Mo
                  </span>
                  <span className="font-bold text-white">
                    {plan.messageLimit?.toLocaleString() || "1,000"}
                  </span>
                </div>

                {/* Agent limits */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-400">
                    <Bot className="w-4 h-4 text-blue-500" /> Maximum AI Agents
                  </span>
                  <span className="font-bold text-white">
                    {plan.agentLimit || "3"}
                  </span>
                </div>

                {/* Custom Costs Rules */}
                <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Credit Costs Matrix</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Credit cost per Social Post</span>
                    <span className="font-bold text-white">{plan.postCreditCost || 1} CR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Credit cost per AI Response</span>
                    <span className="font-bold text-white">{plan.agentMsgCreditCost || 1} CR</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3 mt-auto">
                <button
                  onClick={() => handleOpenEditModal(plan)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-medium text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Plan
                </button>
                <button
                  onClick={() => handleDelete(plan._id)}
                  className="p-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dynamic Modal for Create / Edit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-500/10"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
                    </h3>
                    <p className="text-xs text-gray-400">Configure client limits, costs and pricing matrix.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-5">
                {/* Name & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Plan Name*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starter Pack, Pro Elite"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Plan Unique Code*</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingPlan} // Don't change plan code after creation to keep bindings safe
                      placeholder="e.g. starter, pro, enterprise"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Price & Credits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (INR / Month)*</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0 for Free Plan"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Allocated Credits*</label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="e.g. 5000"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Message Limit & Agent Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Message Limit / Mo*</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 1000"
                        value={formData.messageLimit}
                        onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) || 1000 })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Max AI Agents Allowed*</label>
                    <div className="relative">
                      <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 3"
                        value={formData.agentLimit}
                        onChange={(e) => setFormData({ ...formData, agentLimit: parseInt(e.target.value) || 3 })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Credit Cost Matrix Rules */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-gray-400 flex items-center gap-1.5 tracking-wider">
                    <Layers className="w-4 h-4 text-emerald-500" /> Dynamic Credits Cost Matrix
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400">Post Credit Cost (per platform)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 1"
                        value={formData.postCreditCost}
                        onChange={(e) => setFormData({ ...formData, postCreditCost: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400">Agent Msg Credit Cost (per AI reply)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 1"
                        value={formData.agentMsgCreditCost}
                        onChange={(e) => setFormData({ ...formData, agentMsgCreditCost: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Plan Description</label>
                  <textarea
                    rows="3"
                    placeholder="Short description highlighting key plan features..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white resize-none text-sm"
                  />
                </div>

                {/* Toggle Status */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div>
                    <p className="text-sm font-semibold text-white">Active Status</p>
                    <p className="text-xs text-gray-400">Clients can view and purchase active plans on checkout.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/10 transition-all"
                  >
                    {editingPlan ? "Save Changes" : "Create Plan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Subscriptions;
