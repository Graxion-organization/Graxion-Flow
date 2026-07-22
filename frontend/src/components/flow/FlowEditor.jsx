import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import Draggable from 'react-draggable';
import 'reactflow/dist/style.css';
import { 
  PlayIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  AdjustmentsHorizontalIcon, 
  CogIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  StopCircleIcon,
  Bars3BottomLeftIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import { flowAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { nodeTypes } from './FlowNodes';

export default function FlowEditor({ flowId, initialData, onClose, onSaved }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [flowName, setFlowName] = useState('New Flow');
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Undo / Redo State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false); // Flag to prevent snapshotting during undo

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Initialize Data
  useEffect(() => {
    if (initialData) {
      setFlowName(initialData.name || 'New Flow');
      let loadedNodes = initialData.nodes || [];
      const loadedEdges = initialData.edges || [];

      if (loadedNodes.some(n => n.type === 'start')) {
        loadedNodes = loadedNodes.map(n => {
          if (n.type === 'start') {
            return {
              ...n,
              type: 'trigger',
              data: { ...n.data, triggerKeyword: initialData.triggerKeyword || '' }
            };
          }
          return n;
        });
      }

      setNodes(loadedNodes);
      setEdges(loadedEdges);
      
      // Initial History Snapshot
      setHistory([{ nodes: loadedNodes, edges: loadedEdges }]);
      setHistoryIndex(0);
    } else {
      const initialTriggerNode = [
        { id: 'trigger_1', type: 'trigger', position: { x: 250, y: 250 }, data: { label: 'Trigger Keyword', triggerKeyword: '' } }
      ];
      setNodes(initialTriggerNode);
      setHistory([{ nodes: initialTriggerNode, edges: [] }]);
      setHistoryIndex(0);
    }
  }, [initialData, setNodes, setEdges]);

  // Take Snapshot for Undo/Redo
  const takeSnapshot = useCallback((newNodes, newEdges) => {
    if (isUndoing) return; // Prevent snapshotting while undoing/redoing

    setHistory(prev => {
      // Truncate history if we were in the middle of undoing
      const truncated = prev.slice(0, historyIndex + 1);
      const snapshot = { nodes: newNodes, edges: newEdges };
      return [...truncated, snapshot];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, isUndoing]);

  // Trigger Snapshot on meaningful changes (Nodes/Edges length change, connections)
  // We don't snapshot every mouse move (onNodesChange), we manually snapshot on specific actions.

  // Keyboard Listeners (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo: Ctrl + Shift + Z
          if (historyIndex < history.length - 1) {
            setIsUndoing(true);
            const nextState = history[historyIndex + 1];
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setHistoryIndex(historyIndex + 1);
            toast.success('Redo', { icon: '↪️', duration: 1000 });
            setTimeout(() => setIsUndoing(false), 100);
          }
        } else {
          // Undo: Ctrl + Z
          if (historyIndex > 0) {
            setIsUndoing(true);
            const prevState = history[historyIndex - 1];
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            setHistoryIndex(historyIndex - 1);
            toast.success('Undo', { icon: '↩️', duration: 1000 });
            setTimeout(() => setIsUndoing(false), 100);
          }
        }
      }
      
      // Redo: Ctrl + Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          setIsUndoing(true);
          const nextState = history[historyIndex + 1];
          setNodes(nextState.nodes);
          setEdges(nextState.edges);
          setHistoryIndex(historyIndex + 1);
          toast.success('Redo', { icon: '↪️', duration: 1000 });
          setTimeout(() => setIsUndoing(false), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, setNodes, setEdges]);

  // Edges Connection
  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const newEdges = addEdge(params, eds);
      takeSnapshot(nodes, newEdges);
      return newEdges;
    });
  }, [setEdges, nodes, takeSnapshot]);

  // Add Node
  const addNode = (typeLabel, backendType) => {
    let max_X = 0;
    let target_Y = 250;
    
    if (nodes.length > 0) {
      const rightMostNode = nodes.reduce((prev, current) => 
        (prev.position.x > current.position.x) ? prev : current
      );
      max_X = rightMostNode.position.x;
      target_Y = rightMostNode.position.y;
    }

    const x = max_X + 250; // Gap for compact nodes
    const y = target_Y;
    
    const newNode = {
      id: `node_${Date.now()}`,
      type: backendType,
      position: { x, y },
      data: { label: `New ${typeLabel}` },
    };
    
    const newNodes = nodes.concat(newNode);
    setNodes(newNodes);
    setSelectedNodeId(newNode.id);
    takeSnapshot(newNodes, edges);
  };

  // Delete Node
  const deleteNodeById = (nodeId) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (nodeToDelete?.type === 'trigger' || nodeToDelete?.type === 'start') {
      return toast.error('Trigger Node cannot be deleted.');
    }
    const newNodes = nodes.filter((n) => n.id !== nodeId);
    const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    
    setNodes(newNodes);
    setEdges(newEdges);
    
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setContextMenu(null);
    
    takeSnapshot(newNodes, newEdges);
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) deleteNodeById(selectedNodeId);
  };

  const handleSave = async () => {
    if (!flowName.trim()) {
      return toast.error('Please enter a Flow Name');
    }

    const triggerNode = nodes.find(n => n.type === 'trigger' || n.type === 'start');
    if (!triggerNode) {
      return toast.error('Flow must have a Trigger Node');
    }

    const triggerKeyword = triggerNode.data.triggerKeyword || '';

    try {
      setSaving(true);
      const payload = {
        name: flowName,
        triggerKeyword,
        nodes,
        edges,
        isActive: true
      };

      if (flowId) {
        await flowAPI.update(flowId, payload);
        toast.success('Flow updated successfully!');
      } else {
        await flowAPI.create(payload);
        toast.success('Flow created successfully!');
      }
      onSaved(); 
    } catch (err) {
      toast.error('Failed to save flow');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
    setContextMenu(null); 
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setContextMenu(null); 
  };

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault(); 
    setContextMenu({
      id: node.id,
      top: event.clientY,
      left: event.clientX,
      nodeType: node.type
    });
  }, []);

  const updateNodeData = (key, value) => {
    if (!selectedNodeId) return;
    
    const newNodes = nodes.map((n) => {
      if (n.id === selectedNodeId) {
        return { ...n, data: { ...n.data, [key]: value } };
      }
      return n;
    });
    
    setNodes(newNodes);
    
    // Using a debounce/timeout for snapshotting data edits would be better,
    // but for simplicity, we snapshot when the dialog closes or immediately for checkboxes.
    // To avoid massive history stacks for every keystroke, we will NOT snapshot here.
    // In a real app, you'd snapshot on `onBlur`.
  };

  // Node Drag Stop
  const onNodeDragStop = (event, node) => {
    const newNodes = nodes.map((n) => n.id === node.id ? node : n);
    setNodes(newNodes);
    takeSnapshot(newNodes, edges);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Header Bar */}
      <div className="h-14 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-4 shrink-0 shadow-lg z-10 relative">
        <div className="flex items-center gap-3 w-1/3">
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="h-5 w-px bg-gray-800 mx-1"></div>
          
          <div className="flex items-center group relative w-full">
            <input 
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="bg-transparent border border-transparent hover:border-gray-700 focus:border-blue-500 rounded px-2 py-1 text-sm font-bold text-gray-200 w-full outline-none transition"
              placeholder="Untitled Flow"
            />
            <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Bars3BottomLeftIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-1/3 justify-end">
          <span className="text-[10px] text-gray-500 hidden sm:inline mr-2">
            Ctrl+Z to Undo
          </span>
          <button 
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className={`p-1.5 rounded-lg transition ${isHelpOpen ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            title="Help Guide"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-gray-800"></div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg transition font-semibold
              ${saving ? 'bg-emerald-900 cursor-not-allowed text-gray-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
          >
            <PlayIcon className="w-4 h-4" /> {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 h-[calc(100vh-56px)] relative">
        
        {/* Canvas Area */}
        <div className="flex-1 relative h-full bg-[#030712]" onClick={() => setContextMenu(null)}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragStop={onNodeDragStop}
            fitView
            proOptions={{ hideAttribution: true }}
            className="react-flow-dark"
          >
            <Background color="#1f2937" gap={20} size={1} />
          </ReactFlow>

          {/* Context Menu Dropdown */}
          {contextMenu && (
            <div 
              style={{ top: contextMenu.top, left: contextMenu.left }}
              className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1 border-b border-gray-800 mb-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{contextMenu.nodeType} Node</p>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); deleteNodeById(contextMenu.id); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition
                  ${contextMenu.nodeType === 'trigger' || contextMenu.nodeType === 'start' ? 'text-gray-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'}`}
                disabled={contextMenu.nodeType === 'trigger' || contextMenu.nodeType === 'start'}
              >
                <TrashIcon className="w-3.5 h-3.5" /> Delete Node
              </button>
            </div>
          )}

          {/* Right Floating Toolbar for Add Nodes */}
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-full p-2 z-30 shadow-2xl">
            
            <div className="group relative">
              <button onClick={() => addNode('Message', 'message')} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-blue-500/20 border border-gray-700 hover:border-blue-500/50 flex items-center justify-center text-blue-400 transition-all duration-300 hover:scale-110 shadow-lg">
                <DocumentTextIcon className="w-4 h-4" />
              </button>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                Add Message
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-800 border-r border-t border-gray-700 transform rotate-45"></div>
              </div>
            </div>

            <div className="group relative">
              <button onClick={() => addNode('Condition', 'condition')} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-yellow-500/20 border border-gray-700 hover:border-yellow-500/50 flex items-center justify-center text-yellow-400 transition-all duration-300 hover:scale-110 shadow-lg">
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
              </button>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                Add Condition
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-800 border-r border-t border-gray-700 transform rotate-45"></div>
              </div>
            </div>

            <div className="group relative">
              <button onClick={() => addNode('Delay', 'delay')} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-500/20 border border-gray-700 hover:border-purple-500/50 flex items-center justify-center text-purple-400 transition-all duration-300 hover:scale-110 shadow-lg">
                <ClockIcon className="w-4 h-4" />
              </button>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                Add Delay
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-800 border-r border-t border-gray-700 transform rotate-45"></div>
              </div>
            </div>

            <div className="group relative">
              <button onClick={() => addNode('Action', 'action')} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-pink-500/20 border border-gray-700 hover:border-pink-500/50 flex items-center justify-center text-pink-400 transition-all duration-300 hover:scale-110 shadow-lg">
                <CogIcon className="w-4 h-4" />
              </button>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                Add Action
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-800 border-r border-t border-gray-700 transform rotate-45"></div>
              </div>
            </div>

            <div className="w-6 h-px bg-gray-700 mx-auto my-1"></div>

            <div className="group relative">
              <button onClick={() => addNode('End Flow', 'end')} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-red-500/20 border border-gray-700 hover:border-red-500/50 flex items-center justify-center text-red-500 transition-all duration-300 hover:scale-110 shadow-lg">
                <StopCircleIcon className="w-4 h-4" />
              </button>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                End Flow
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-800 border-r border-t border-gray-700 transform rotate-45"></div>
              </div>
            </div>

          </div>

          {/* Draggable Property Dialog */}
          {selectedNode && (
            <Draggable handle=".drag-handle" defaultPosition={{x: 20, y: 20}} bounds="parent">
              <div className="absolute w-72 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-40">
                
                {/* Drag Handle (Header) */}
                <div className="drag-handle px-3 py-2 border-b border-gray-800 flex justify-between items-center bg-gray-800/60 rounded-t-xl cursor-move select-none hover:bg-gray-800/80 transition group">
                  <div className="flex items-center gap-2">
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
                    <h3 className="text-xs font-bold text-gray-200 capitalize flex items-center gap-1.5">
                      <CogIcon className="w-3.5 h-3.5 text-blue-400" /> Edit {selectedNode.type}
                    </h3>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }}
                    className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-700 transition"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="p-4 space-y-3">
                  {/* Generic Label Editor */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Internal Label</label>
                    <input 
                      type="text"
                      value={selectedNode.data.label || ''}
                      onChange={(e) => updateNodeData('label', e.target.value)}
                      onBlur={() => takeSnapshot(nodes, edges)} // Save history on blur
                      className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  {/* Specific Editors Based on Type */}
                  {(selectedNode.type === 'trigger' || selectedNode.type === 'start') && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Trigger Keyword</label>
                      <input 
                        type="text"
                        placeholder="e.g. hello, help"
                        value={selectedNode.data.triggerKeyword || ''}
                        onChange={(e) => updateNodeData('triggerKeyword', e.target.value)}
                        onBlur={() => takeSnapshot(nodes, edges)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                      <p className="text-[9px] text-gray-500 mt-1">Leave empty to run on every message</p>
                    </div>
                  )}

                  {selectedNode.type === 'message' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">WhatsApp Message</label>
                      <textarea 
                        rows="3"
                        placeholder="Type what the bot should say..."
                        value={selectedNode.data.text || ''}
                        onChange={(e) => updateNodeData('text', e.target.value)}
                        onBlur={() => takeSnapshot(nodes, edges)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'condition' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Expected Reply</label>
                      <input 
                        type="text"
                        placeholder="e.g. 1, Yes, Buy"
                        value={selectedNode.data.expectedAnswer || ''}
                        onChange={(e) => updateNodeData('expectedAnswer', e.target.value)}
                        onBlur={() => takeSnapshot(nodes, edges)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                      <div className="flex gap-2 mt-2 bg-gray-950/50 p-2 rounded border border-gray-800/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0"></div>
                        <p className="text-[9px] text-gray-400 leading-tight">If exact match, routes to True.</p>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'delay' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Wait Time (MS)</label>
                      <input 
                        type="number"
                        placeholder="2000"
                        value={selectedNode.data.delayMs || ''}
                        onChange={(e) => updateNodeData('delayMs', parseInt(e.target.value, 10))}
                        onBlur={() => takeSnapshot(nodes, edges)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'action' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Action Type</label>
                      <select 
                        value={selectedNode.data.actionType || ''}
                        onChange={(e) => {
                          updateNodeData('actionType', e.target.value);
                          // timeout to allow react to update state before snapshot
                          setTimeout(() => takeSnapshot(nodes, edges), 0);
                        }}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-white"
                      >
                        <option value="" disabled>Select an action...</option>
                        <option value="Assign to Agent">Assign to Human Agent</option>
                        <option value="Add Tag">Add Tag to Contact</option>
                        <option value="Remove Tag">Remove Tag</option>
                      </select>
                    </div>
                  )}

                  {selectedNode.type !== 'trigger' && selectedNode.type !== 'start' && (
                    <button 
                      onClick={deleteSelectedNode}
                      className="w-full mt-2 py-1.5 flex justify-center items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition border border-red-500/20 text-[10px] font-bold uppercase tracking-wider"
                    >
                      <TrashIcon className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </Draggable>
          )}

        </div>

        {/* Right Side Help Panel */}
        <div className={`absolute top-0 right-0 bottom-0 bg-gray-900/95 backdrop-blur-md border-l border-gray-800 w-72 shadow-2xl z-40 transition-transform duration-300 ease-in-out transform
          ${isHelpOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
            <h2 className="font-bold text-gray-200 text-sm flex items-center gap-2">
              <QuestionMarkCircleIcon className="w-4 h-4 text-blue-400" /> Help Guide
            </h2>
            <button onClick={() => setIsHelpOpen(false)} className="text-gray-400 hover:text-white p-1">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-130px)] custom-scrollbar space-y-5">
            <div>
              <h3 className="font-bold text-xs text-green-400 mb-1 flex items-center gap-1.5">
                <PlayIcon className="w-3.5 h-3.5" /> Trigger Node
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">The entry point of your flow. Set the exact keyword that triggers this automation.</p>
            </div>
            <div>
              <h3 className="font-bold text-xs text-blue-400 mb-1 flex items-center gap-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5" /> Message Node
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">Sends a WhatsApp text message to the customer.</p>
            </div>
            <div>
              <h3 className="font-bold text-xs text-yellow-400 mb-1 flex items-center gap-1.5">
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" /> Condition Node
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">Checks the customer's reply. If exact match, routes to <span className="text-green-400 font-semibold">True</span>, otherwise <span className="text-red-400 font-semibold">False</span>.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
