import React, { useState, useEffect } from 'react';
import { flowAPI } from '../services/api';
import toast from 'react-hot-toast';
import FlowEditor from '../components/flow/FlowEditor';
import { PlusIcon, TrashIcon, PencilSquareIcon, BoltIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function FlowBuilderPage() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  
  // State to manage the full-screen editor overlay
  const [isEditing, setIsEditing] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await flowAPI.getAll();
      setFlows(res.data?.data?.flows || []);
    } catch (err) {
      toast.error('Failed to load flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingFlowId(null);
    setInitialData(null);
    setIsEditing(true);
  };

  const handleEdit = (flow) => {
    setEditingFlowId(flow._id);
    setInitialData({
      name: flow.name,
      triggerKeyword: flow.triggerKeyword,
      nodes: flow.nodes,
      edges: flow.edges
    });
    setIsEditing(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // prevent opening the editor
    if (!window.confirm("Are you sure you want to delete this flow? This cannot be undone.")) return;
    
    try {
      await flowAPI.delete(id);
      toast.success('Flow deleted successfully');
      setFlows(flows.filter(f => f._id !== id));
    } catch (err) {
      toast.error('Failed to delete flow');
    }
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
    setEditingFlowId(null);
    setInitialData(null);
  };

  const handleSaved = () => {
    fetchFlows(); // Refresh the list
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page Header — Primary: Title + Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Chat Flows
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Automate conversations visually — build 24/7 chatbots without code
          </p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#FF6A00] hover:bg-[#e05d00] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF6A00]/20 shrink-0"
        >
          <PlusIcon className="w-5 h-5" /> Create New Flow
        </button>
      </div>

      {/* Flows Table — Primary Content (above fold) */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        {loading ? (
          <div className={`p-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
            Loading your flows...
          </div>
        ) : flows.length === 0 ? (
          <div className="p-16 text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <BoltIcon className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create your first chat flow</h3>
            <p className={`mb-6 text-sm max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Build automated conversation journeys to capture leads, answer FAQs, and route customers — without AI tokens.
            </p>
            <button 
              onClick={handleCreateNew}
              className="bg-[#FF6A00] hover:bg-[#e05d00] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF6A00]/20"
            >
              Get Started
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <th className="p-4 font-semibold">Flow Name</th>
                <th className="p-4 font-semibold">Trigger Keyword</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {flows.map((flow) => (
                <tr key={flow._id} onClick={() => handleEdit(flow)} className={`transition cursor-pointer group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                  <td className={`p-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{flow.name}</td>
                  <td className="p-4">
                    {flow.triggerKeyword ? (
                      <span className="bg-blue-500/10 text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-md text-xs font-mono">
                        {flow.triggerKeyword}
                      </span>
                    ) : (
                      <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Every Message</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${flow.isActive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                      {flow.isActive ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(flow); }}
                      className={`p-2 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-blue-400 bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-slate-100'}`}
                      title="Edit Flow"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(flow._id, e)}
                      className={`p-2 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50'}`}
                      title="Delete Flow"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Feature Highlights — Tertiary (below the fold, collapsed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className={`rounded-2xl p-5 border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
          <BoltIcon className="w-8 h-8 text-blue-500 mb-3" />
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Instant Setup</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Drag and drop blocks to create complex routing logic based on user replies.</p>
        </div>
        <div className={`rounded-2xl p-5 border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:border-violet-500/30' : 'bg-white border-slate-200 hover:border-violet-200'}`}>
          <ChartBarIcon className="w-8 h-8 text-violet-500 mb-3" />
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Lead Qualification</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Collect names, emails, and requirements automatically before routing to a human.</p>
        </div>
        <div className={`rounded-2xl p-5 border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
          <ArrowPathIcon className="w-8 h-8 text-emerald-500 mb-3" />
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cost Efficiency</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Save AI tokens by handling generic FAQs and menus completely for free.</p>
        </div>
      </div>

      {/* Full Screen Overlay Editor */}
      {isEditing && (
        <FlowEditor 
          flowId={editingFlowId}
          initialData={initialData}
          onClose={handleCloseEditor}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
