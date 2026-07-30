import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Search, 
  Server, 
  Activity, 
  ChevronRight, 
  ChevronDown, 
  Code,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

const MethodBadge = ({ method }) => {
  const colors = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    PATCH: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DELETE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${colors[method] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
      {method}
    </span>
  );
};

export default function ApiExplorer() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selected endpoint state
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [requestBody, setRequestBody] = useState('{\n  \n}');
  const [queryParams, setQueryParams] = useState('');
  
  // Response state
  const [response, setResponse] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      // Direct axios call because it's a new endpoint not in services/api.js yet
      // JWT via cookies
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/system-routes`, {
        withCredentials: true
      });
      setRoutes(res.data.data.routes || []);
    } catch (err) {
      toast.error('Failed to load system routes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedEndpoint) return;
    
    setIsSending(true);
    setResponse(null);
    
    try {
      // JWT via cookies
      const baseURL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';
      
      let finalPath = selectedEndpoint.path;
      
      // Replace Express path params like :id with actual values if provided, or default "test_id"
      if (finalPath.includes(':')) {
        finalPath = finalPath.replace(/:[a-zA-Z0-9_]+/g, 'test_id_123');
      }

      const url = `${baseURL}${finalPath}${queryParams ? '?' + queryParams : ''}`;
      
      const startTime = Date.now();
      
      let parsedBody = null;
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          toast.error('Invalid JSON body');
          setIsSending(false);
          return;
        }
      }

      const config = {
        method: selectedEndpoint.method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: parsedBody
      };

      try {
        const res = await axios(config);
        const endTime = Date.now();
        setResponse({
          status: res.status,
          time: endTime - startTime,
          data: res.data
        });
      } catch (err) {
        const endTime = Date.now();
        setResponse({
          status: err.response?.status || 500,
          time: endTime - startTime,
          data: err.response?.data || err.message,
          isError: true
        });
      }
    } catch (err) {
      toast.error('Request failed to initiate');
    } finally {
      setIsSending(false);
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.path.toLowerCase().includes(search.toLowerCase()) || 
    r.module.toLowerCase().includes(search.toLowerCase())
  );

  // Group by module
  const groupedRoutes = filteredRoutes.reduce((acc, route) => {
    if (!acc[route.module]) acc[route.module] = [];
    acc[route.module].push(route);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 pb-6">
      
      {/* LEFT PANEL: Routes List */}
      <div className="w-1/3 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-emerald-500" />
            Endpoints ({routes.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search endpoints..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {Object.entries(groupedRoutes).map(([module, moduleRoutes]) => (
            <div key={module}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{module || 'core'}</h3>
              <div className="space-y-1">
                {moduleRoutes.map((route, idx) => {
                  const isSelected = selectedEndpoint?.path === route.path && selectedEndpoint?.method === route.method;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedEndpoint(route);
                        setResponse(null);
                        if (!['POST', 'PUT', 'PATCH'].includes(route.method)) {
                          setRequestBody('');
                        } else {
                          setRequestBody('{\n  \n}');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <MethodBadge method={route.method} />
                      <span className="truncate text-gray-300 font-mono text-[11px]">{route.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Request / Response */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Request Configurator */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shrink-0 shadow-lg">
          {selectedEndpoint ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 w-full">
                  <MethodBadge method={selectedEndpoint.method} />
                  <span className="font-mono text-sm text-gray-200">{selectedEndpoint.path}</span>
                </div>
                <button 
                  onClick={handleTest}
                  disabled={isSending}
                  className="ml-4 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Send
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Query Parameters</label>
                  <input 
                    type="text" 
                    placeholder="key=value&id=123" 
                    value={queryParams}
                    onChange={e => setQueryParams(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Authorization</label>
                  <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-emerald-500 truncate opacity-60 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Bearer Token (Auto-injected)
                  </div>
                </div>
              </div>

              {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
                    <span>JSON Body</span>
                    <span className="text-emerald-500">application/json</span>
                  </label>
                  <textarea 
                    value={requestBody}
                    onChange={e => setRequestBody(e.target.value)}
                    rows={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-blue-300 focus:outline-none focus:border-emerald-500 custom-scrollbar"
                    spellCheck="false"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
              <Code className="w-12 h-12 mb-4 opacity-20" />
              <p>Select an endpoint from the left to configure and test</p>
            </div>
          )}
        </div>

        {/* Response Viewer */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/20">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-purple-500" />
              Response
            </h3>
            {response && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className={`flex items-center gap-1 ${response.status >= 400 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {response.status >= 400 ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {response.status}
                </span>
                <span className="text-gray-400">{response.time} ms</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-[#0d1117]">
            {!response ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                Awaiting request execution...
              </div>
            ) : (
              <pre className={`text-xs font-mono ${response.status >= 400 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {JSON.stringify(response.data, null, 2)}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
