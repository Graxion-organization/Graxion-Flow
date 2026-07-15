import React, { useState, useCallback } from 'react';
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

const initialNodes = [
  { id: '1', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Start Flow' } },
];
const initialEdges = [];

export default function FlowBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type) => {
    const newNode = {
      id: `node_${Date.now()}`,
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { label: `New ${type} Node` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-900 text-white">
      {/* Sidebar Toolbar */}
      <div className="w-64 border-r border-gray-800 p-4 bg-gray-900 flex flex-col gap-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">Flow Nodes</h2>
        
        <button onClick={() => addNode('Message')} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
          <DocumentTextIcon className="w-5 h-5 text-blue-400" />
          <span>Send Message</span>
        </button>

        <button onClick={() => addNode('Condition')} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-green-400" />
          <span>Condition (If/Else)</span>
        </button>

        <button onClick={() => addNode('Delay')} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
          <ClockIcon className="w-5 h-5 text-yellow-400" />
          <span>Time Delay</span>
        </button>
        
        <button onClick={() => addNode('Action')} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700">
          <CogIcon className="w-5 h-5 text-purple-400" />
          <span>Action / API</span>
        </button>

        <div className="mt-auto">
          <button className="w-full flex justify-center items-center gap-2 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition shadow-lg font-semibold">
            <PlayIcon className="w-5 h-5" /> Save & Publish
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-gray-950"
        >
          <Controls className="bg-gray-800 border-gray-700 fill-white" />
          <MiniMap nodeStrokeColor="#fff" nodeColor="#374151" maskColor="rgba(0,0,0,0.7)" className="bg-gray-900 border border-gray-800" />
          <Background color="#374151" gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
