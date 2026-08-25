import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CustomQuoteModal({ onClose, user }) {
  const [formData, setFormData] = useState({
    businessName: '',
    requiredOrgs: '20+',
    monthlyMessages: '1,000,000+',
    features: [],
    customMessage: ''
  });
  const [loading, setLoading] = useState(false);

  const featureOptions = [
    'Dedicated Server/IP',
    'Custom AI Models',
    'White-label Dashboard',
    'Premium SLA Guarantee',
    'Dedicated Account Manager'
  ];

  const handleToggleFeature = (feat) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feat) 
        ? prev.features.filter(f => f !== feat)
        : [...prev.features, feat]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const messageBody = `
Business Name: ${formData.businessName}
Required Orgs: ${formData.requiredOrgs}
Monthly Messages: ${formData.monthlyMessages}
Interested Features: ${formData.features.join(', ') || 'None'}

Custom Message: 
${formData.customMessage}
      `.trim();

      await api.post('/public/contact', {
        name: user?.name || 'Dashboard User',
        email: user?.email || 'Unknown',
        subject: `Enterprise Custom Quote Request - ${formData.businessName}`,
        message: messageBody
      });
      toast.success('Custom quote request sent successfully! Our team will contact you soon.');
      onClose();
    } catch (err) {
      toast.error('Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/50 focus:border-[#FF6A00]/50 transition-all";
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2";

  return (
    <AnimatePresence>
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
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Custom Enterprise Quote</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tell us your requirements and scale with us.</p>
            </div>
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            <form id="custom-quote-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Business / Agency Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Acme Corp"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Required Organizations</label>
                  <input 
                    type="text" 
                    value={formData.requiredOrgs}
                    onChange={(e) => setFormData({...formData, requiredOrgs: e.target.value})}
                    placeholder="e.g. 50+"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Expected Monthly Messages</label>
                <select 
                  value={formData.monthlyMessages}
                  onChange={(e) => setFormData({...formData, monthlyMessages: e.target.value})}
                  className={inputClass}
                >
                  <option value="500,000+">500,000+ Messages</option>
                  <option value="1,000,000+">1,000,000+ Messages</option>
                  <option value="5,000,000+">5,000,000+ Messages</option>
                  <option value="10,000,000+">10,000,000+ Messages</option>
                  <option value="Custom Volume">Custom Volume</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Features of Interest</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {featureOptions.map(feat => (
                    <label key={feat} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formData.features.includes(feat) ? 'bg-[#FF6A00]/10 border-[#FF6A00]/50 text-[#FF6A00]' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${formData.features.includes(feat) ? 'bg-[#FF6A00] border-[#FF6A00]' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}>
                        {formData.features.includes(feat) && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{feat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Custom Message / Additional Needs</label>
                <textarea 
                  rows="4" 
                  value={formData.customMessage}
                  onChange={(e) => setFormData({...formData, customMessage: e.target.value})}
                  placeholder="Tell us about your specific use case, required integrations, or any custom AI model requirements..."
                  className={`${inputClass} resize-none`}
                ></textarea>
              </div>

            </form>
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="custom-quote-form"
              disabled={loading}
              className="bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:shadow-[0_0_20px_rgba(255,106,0,0.4)]"
            >
              {loading ? 'Submitting...' : <><Send size={16} /> Submit Request</>}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
