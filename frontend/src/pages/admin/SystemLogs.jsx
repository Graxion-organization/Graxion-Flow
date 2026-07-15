import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { RefreshCw, FileText, AlertTriangle, Info, Terminal, Search, Filter, X, Play, Square, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await adminAPI.getLogs({ limit: 500 });
      setLogs(res.data?.data?.logs || []);
    } catch (err) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(true);
      }, 5000); // Poll every 5s
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.sourceFile?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level) => {
    switch(level) {
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warn': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'info': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getLevelIcon = (level) => {
    switch(level) {
      case 'error': return <AlertTriangle size={14} />;
      case 'warn': return <AlertTriangle size={14} />;
      case 'info': return <Info size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-[#0a0f1c] border border-white/10 rounded-xl py-2 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              autoRefresh 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {autoRefresh ? <Square size={14} /> : <Play size={14} />}
            {autoRefresh ? 'Stop Live' : 'Live Tail'}
          </button>
          
          <button 
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Log Terminal Container */}
      <div className="flex-1 bg-[#0a0f1c] border border-white/10 rounded-2xl overflow-hidden flex flex-col font-mono text-sm relative">
        {/* Terminal Header */}
        <div className="bg-[#030712] border-b border-white/10 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Terminal size={14} />
            <span>system_logs.sh — {filteredLogs.length} entries</span>
          </div>
          {autoRefresh && (
            <div className="flex items-center gap-2 text-emerald-500 text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live
            </div>
          )}
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && !refreshing ? (
            <div className="text-gray-500 text-center py-8">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No matching logs found.</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                onClick={() => setSelectedLog(log)}
                className="flex items-start gap-3 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer group transition-colors"
              >
                <div className="shrink-0 text-gray-500 w-[180px]">
                  {new Date(log.timestamp).toLocaleString(undefined, {
                    month: 'short', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
                  })}
                </div>
                <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getLevelColor(log.level)}`}>
                  {getLevelIcon(log.level)}
                  {log.level}
                </div>
                <div className="flex-1 text-gray-300 truncate group-hover:text-white transition-colors">
                  {log.message}
                </div>
                <div className="shrink-0 text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {log.sourceFile}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0f1c] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#030712] rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getLevelColor(selectedLog.level)}`}>
                    {getLevelIcon(selectedLog.level)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">{selectedLog.level} Event</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                  <X size={20}/>
                </button>
              </div>

              <div className="p-6 overflow-y-auto font-mono text-sm space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</h4>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white whitespace-pre-wrap">
                    {selectedLog.message}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Metadata & Context</h4>
                  <div className="bg-black/50 border border-white/10 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-emerald-400 text-xs">
                      {JSON.stringify(
                        Object.keys(selectedLog).reduce((acc, key) => {
                          if (key !== 'message' && key !== 'level' && key !== 'timestamp') {
                            acc[key] = selectedLog[key];
                          }
                          return acc;
                        }, {}),
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
