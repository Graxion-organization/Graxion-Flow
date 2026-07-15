import React, { useState, useEffect } from 'react';
import { MegaphoneIcon } from '@heroicons/react/24/outline';
import { templateAPI, contactGroupAPI, whatsappAPI, broadcastAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BroadcastPage() {
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  
  const [name, setName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
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
        if (accounts.length > 0) setActiveAccount(accounts[0]);

      } catch (err) {
        toast.error("Failed to load broadcast options");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleSend = async () => {
    if (!name) return toast.error("Please enter a broadcast name");
    if (!selectedTemplate) return toast.error("Please select a template");
    if (!activeAccount) return toast.error("No active WhatsApp account found");

    try {
      setIsSubmitting(true);
      await broadcastAPI.create({
        name,
        template: selectedTemplate,
        contactGroup: selectedGroup === 'all' ? null : selectedGroup,
        whatsappAccountId: activeAccount._id
      });
      toast.success("Broadcast queued successfully!");
      setName('');
      setSelectedTemplate('');
      setSelectedGroup('all');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTemplatePreview = () => {
    if (!selectedTemplate) return "Select a template to preview its content.";
    const tpl = templates.find(t => t._id === selectedTemplate);
    if (!tpl) return "";
    
    const bodyComponent = tpl.components?.find(c => c.type === 'BODY');
    return bodyComponent ? bodyComponent.text : "Preview not available.";
  };

  const getRecipientsCount = () => {
    if (selectedGroup === 'all') return "All Contacts";
    const group = groups.find(g => g._id === selectedGroup);
    return group ? group.contactCount || 0 : 0;
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">New Broadcast</h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">Send a mass message to your audience segments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">1. Broadcast Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Sale 2024"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 sm:p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">2. Select Audience</h2>
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 sm:p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Contacts</option>
              {groups.map(g => (
                <option key={g._id} value={g._id}>{g.name} ({g.contactCount || 0})</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">3. Select Template</h2>
            <select 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 sm:p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select an approved template...</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.language})</option>
              ))}
            </select>
            
            <div className="mt-4 p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">Template Preview:</p>
              <p className="font-mono text-xs sm:text-sm text-gray-200 whitespace-pre-wrap">{getTemplatePreview()}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Recipients</span>
                <span className="font-semibold">{getRecipientsCount()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold text-yellow-400">Ready to Queue</span>
              </div>
            </div>
            <button 
              onClick={handleSend}
              disabled={isSubmitting || !activeAccount}
              className={`w-full py-2.5 sm:py-3 rounded-lg transition shadow-lg font-semibold flex items-center justify-center gap-2
                ${isSubmitting || !activeAccount ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
            >
              <MegaphoneIcon className="w-5 h-5" /> 
              {isSubmitting ? 'Queueing...' : 'Send Broadcast'}
            </button>
            {!activeAccount && (
              <p className="text-xs text-red-400 mt-2 text-center">Connect a WhatsApp account first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
