const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const flowBuilderPage = `import React, { useState, useCallback } from 'react';
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
      id: \`node_\${Date.now()}\`,
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { label: \`New \${type} Node\` },
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
`;

const keywordTriggersPage = `import React, { useState, useEffect } from 'react';
import { keywordAPI } from '../services/api';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function KeywordTriggersPage() {
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', matchType: 'exact', action: 'SEND_MESSAGE', response: '' });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setIsLoading(true);
    try {
      const { data } = await keywordAPI.getAll();
      setKeywords(data.data.keywords);
    } catch (err) {
      toast.error('Failed to load keywords');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKeyword.keyword || !newKeyword.response) return toast.error('Keyword and response are required');
    try {
      await keywordAPI.create(newKeyword);
      toast.success('Keyword added');
      setNewKeyword({ keyword: '', matchType: 'exact', action: 'SEND_MESSAGE', response: '' });
      fetchKeywords();
    } catch (err) {
      toast.error('Failed to add keyword');
    }
  };

  const handleDelete = async (id) => {
    try {
      await keywordAPI.delete(id);
      toast.success('Keyword deleted');
      fetchKeywords();
    } catch (err) {
      toast.error('Failed to delete keyword');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Keyword Triggers</h1>
        <p className="text-gray-400 mt-1">Automate simple replies or start flows based on specific words.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Trigger</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            type="text" 
            placeholder="If user says (e.g. 'pricing')..." 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.keyword}
            onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
          />
          <select 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.matchType}
            onChange={(e) => setNewKeyword({...newKeyword, matchType: e.target.value})}
          >
            <option value="exact">Exact Match</option>
            <option value="contains">Contains</option>
          </select>
          <input 
            type="text" 
            placeholder="Then reply with..." 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.response}
            onChange={(e) => setNewKeyword({...newKeyword, response: e.target.value})}
          />
          <button onClick={handleAdd} className="bg-blue-600 rounded-lg p-3 hover:bg-blue-500 font-semibold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20">
            <PlusIcon className="w-5 h-5" /> Add Trigger
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-300">Keyword</th>
              <th className="p-4 font-medium text-gray-300">Match Type</th>
              <th className="p-4 font-medium text-gray-300">Action</th>
              <th className="p-4 font-medium text-gray-300">Response</th>
              <th className="p-4 font-medium text-gray-300 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading triggers...</td></tr>
            ) : keywords.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No triggers configured yet.</td></tr>
            ) : (
              keywords.map(kw => (
                <tr key={kw._id} className="hover:bg-gray-800/30 transition">
                  <td className="p-4 font-semibold text-blue-400">"{kw.keyword}"</td>
                  <td className="p-4 text-gray-400 capitalize">{kw.matchType}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-800 rounded text-xs">Reply</span></td>
                  <td className="p-4 text-gray-300">{kw.response}</td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(kw._id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded transition">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(pagesDir, 'FlowBuilderPage.jsx'), flowBuilderPage);
fs.writeFileSync(path.join(pagesDir, 'KeywordTriggersPage.jsx'), keywordTriggersPage);

console.log('Group 3: Automation Hub generated');
