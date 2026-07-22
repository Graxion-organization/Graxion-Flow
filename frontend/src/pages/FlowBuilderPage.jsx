import React, { useState, useEffect } from 'react';
import { flowAPI } from '../services/api';
import toast from 'react-hot-toast';
import FlowEditor from '../components/flow/FlowEditor';
import { PlusIcon, TrashIcon, PencilSquareIcon, BoltIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function FlowBuilderPage() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State to manage the full-screen editor overlay
  const [isEditing, setIsEditing] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    fetchFlows();
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
    <div className="p-6 max-w-7xl mx-auto text-white">
      {/* Dashboard Header & Advantages */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Flow Builder Dashboard
        </h1>
        <p className="text-gray-400 text-lg max-w-3xl mx-auto">
          Automate your WhatsApp conversations visually. Build 24/7 chatbots without writing a single line of code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition duration-300">
          <BoltIcon className="w-10 h-10 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Instant Setup</h3>
          <p className="text-gray-400 text-sm">Drag and drop blocks to instantly create complex routing logic based on user replies.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition duration-300">
          <ChartBarIcon className="w-10 h-10 text-purple-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Lead Qualification</h3>
          <p className="text-gray-400 text-sm">Collect names, emails, and exact requirements automatically before routing to a human agent.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition duration-300">
          <ArrowPathIcon className="w-10 h-10 text-green-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Cost Efficiency</h3>
          <p className="text-gray-400 text-sm">Save expensive AI API tokens by handling generic FAQs and menus completely for free.</p>
        </div>
      </div>

      {/* History & Controls */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Your Flows</h2>
          <p className="text-gray-400 text-sm mt-1">Manage and edit your existing automation flows.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-lg shadow-blue-500/20"
        >
          <PlusIcon className="w-5 h-5" /> Create New Flow
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading your flows...
          </div>
        ) : flows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <BoltIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No flows yet</h3>
            <p className="text-gray-500 mb-6">Create your first automated journey to engage with your customers.</p>
            <button 
              onClick={handleCreateNew}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Get Started
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Flow Name</th>
                <th className="p-4 font-medium">Trigger Keyword</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {flows.map((flow) => (
                <tr key={flow._id} onClick={() => handleEdit(flow)} className="hover:bg-gray-800/30 transition cursor-pointer group">
                  <td className="p-4 font-semibold">{flow.name}</td>
                  <td className="p-4">
                    {flow.triggerKeyword ? (
                      <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-mono">
                        {flow.triggerKeyword}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs italic">Every Message</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${flow.isActive ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {flow.isActive ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(flow); }}
                      className="p-2 text-gray-400 hover:text-blue-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                      title="Edit Flow"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(flow._id, e)}
                      className="p-2 text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-red-500/10 rounded-lg transition"
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
