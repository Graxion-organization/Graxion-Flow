import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PlayIcon, DocumentTextIcon, ClockIcon, AdjustmentsHorizontalIcon, CogIcon } from '@heroicons/react/24/outline';
import { flowAPI } from '../services/api';
import toast from 'react-hot-toast';

const initialNodes = [
  { id: '1', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Start Flow' } },
];
const initialEdges = [];

export default function FlowBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await flowAPI.getAll();
      const flows = res.data?.data?.flows || [];
      if (flows.length > 0) {
        const flow = flows[0]; // Load the first flow for MVP
        setCurrentFlowId(flow._id);
        setFlowName(flow.name || '');
        setTriggerKeyword(flow.triggerKeyword || '');
        if (flow.nodes && flow.nodes.length > 0) {
          setNodes(flow.nodes);
          setEdges(flow.edges || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type) => {
    const newNode = {
      id: `node_${Date.now()}`,
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { label: `New ${type}` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    if (!flowName.trim()) {
      return toast.error('Please enter a Flow Name');
    }

    try {
      setSaving(true);
      const payload = {
        name: flowName,
        triggerKeyword,
        nodes,
        edges,
        isActive: true
      };

      if (currentFlowId) {
        await flowAPI.update(currentFlowId, payload);
        toast.success('Flow updated successfully!');
      } else {
        const res = await flowAPI.create(payload);
        setCurrentFlowId(res.data?.data?.flow?._id);
        toast.success('Flow created successfully!');
      }
    } catch (err) {
      toast.error('Failed to save flow');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const updateSelectedNodeLabel = (newLabel) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return { ...n, data: { ...n.data, label: newLabel } };
        }
        return n;
      })
    );
    setSelectedNode((prev) => ({ ...prev, data: { ...prev.data, label: newLabel } }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-900 text-white">
      {/* Sidebar Toolbar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900 flex flex-col h-[45vh] md:h-full shrink-0">
        <div className="p-4 border-b border-gray-800 space-y-4 shrink-0">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Flow Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Flow Name</label>
              <input 
                type="text" 
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Welcome Flow"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Trigger Keyword</label>
              <input 
                type="text" 
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. hello, help"
              />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Add Nodes</h3>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <button onClick={() => addNode('Message')} className="w-full flex items-center justify-center md:justify-start gap-2 p-2 sm:p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
              <DocumentTextIcon className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm">Send Message</span>
            </button>
            <button onClick={() => addNode('Condition')} className="w-full flex items-center justify-center md:justify-start gap-2 p-2 sm:p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-green-400 shrink-0" />
              <span className="text-xs sm:text-sm">Condition</span>
            </button>
            <button onClick={() => addNode('Delay')} className="w-full flex items-center justify-center md:justify-start gap-2 p-2 sm:p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
              <ClockIcon className="w-5 h-5 text-yellow-400 shrink-0" />
              <span className="text-xs sm:text-sm">Time Delay</span>
            </button>
            <button onClick={() => addNode('Action')} className="w-full flex items-center justify-center md:justify-start gap-2 p-2 sm:p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
              <CogIcon className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="text-xs sm:text-sm">Action</span>
            </button>
          </div>

          {selectedNode && (
            <div className="mt-4 md:mt-8 p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-blue-400 mb-2">Edit Selected Node</h3>
              <label className="block text-xs text-gray-400 mb-1">Node Label / Content</label>
              <textarea 
                rows="3"
                value={selectedNode.data.label}
                onChange={(e) => updateSelectedNodeLabel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-gray-800 mt-auto shrink-0">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex justify-center items-center gap-2 py-2.5 sm:py-3 rounded-lg transition shadow-lg font-semibold text-sm sm:text-base
              ${saving ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" /> {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative h-[55vh] md:h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          className="bg-gray-950"
        >
          <Controls className="bg-gray-800 border-gray-700 fill-white mb-2 md:mb-0" />
          <MiniMap nodeStrokeColor="#fff" nodeColor="#374151" maskColor="rgba(0,0,0,0.7)" className="bg-gray-900 border border-gray-800 hidden md:block" />
          <Background color="#374151" gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
