import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Server,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Repeat,
  Filter
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const SERVICE_OPTIONS = [
  { value: '', label: 'All Services & Providers' },
  { value: 'webhookController', label: 'Webhook Controller' },
  { value: 'whatsappService', label: 'WhatsApp Service' },
  { value: 'orchestrationEngine', label: 'AI Orchestration' },
  { value: 'aiService', label: 'AI Service' },
  { value: 'webhookQueue', label: 'BullMQ Webhook Queue' },
  { value: 'database', label: 'MongoDB Database' },
  { value: 'redis', label: 'Redis Cache/Queue' },
  { value: 'socket', label: 'Socket.IO Realtime' },
  { value: 'express', label: 'Express API' },
  { value: 'whatsapp', label: 'Provider: WhatsApp' },
  { value: 'openai', label: 'Provider: OpenAI / LLM' },
  { value: 'instagram', label: 'Provider: Instagram' },
  { value: 'telegram', label: 'Provider: Telegram' },
];

const RESOLVED_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'false', label: 'Unresolved Only' },
  { value: 'true', label: 'Resolved Only' },
];

const getSeverityBadgeClass = (severity) => {
  switch ((severity || 'error').toLowerCase()) {
    case 'critical':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'error':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'warn':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    default:
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  }
};

export default function AdminLogsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 25 });

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const fetchErrorLogs = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
      };
      if (search.trim()) params.search = search.trim();
      if (severity) params.severity = severity;
      if (serviceFilter) {
        if (['whatsapp', 'openai', 'instagram', 'telegram'].includes(serviceFilter)) {
          params.provider = serviceFilter;
        } else {
          params.service = serviceFilter;
        }
      }
      if (resolvedFilter !== '') params.resolved = resolvedFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await adminAPI.getErrorLogs(params);
      const data = res?.data?.data || {};
      const normalizedLogs = (data.logs || []).map((item) => ({
        ...item,
        _id: typeof item?._id === 'string' ? item._id : String(item?._id || item?.id || ''),
      }));
      setLogs(normalizedLogs);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1, limit: 25 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load system error logs');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, search, severity, serviceFilter, resolvedFilter, startDate, endDate]);

  useEffect(() => {
    fetchErrorLogs();
  }, [fetchErrorLogs]);

  const handleToggleResolve = async (log, e) => {
    if (e) e.stopPropagation();
    const logId = typeof log === 'object' && log !== null ? String(log._id || log.id || '') : String(log || '');
    if (!logId || logId === '[object Object]') {
      toast.error('Invalid error log ID');
      return;
    }
    const nextResolved = typeof log === 'object' && log !== null ? !log.resolved : true;
    try {
      const res = await adminAPI.resolveErrorLog(logId, nextResolved);
      const updated = res?.data?.data?.log
        ? { ...res.data.data.log, _id: String(res.data.data.log._id || logId) }
        : { ...(typeof log === 'object' ? log : {}), _id: logId, resolved: nextResolved };
      setLogs((prev) => prev.map((item) => (String(item._id) === logId ? updated : item)));
      if (selectedLog && String(selectedLog._id) === logId) {
        setSelectedLog(updated);
      }
      toast.success(nextResolved ? 'Marked as resolved' : 'Reopened error log');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update error status');
    }
  };

  const handleDeleteLog = async (idOrLog, e) => {
    if (e) e.stopPropagation();
    const logId = typeof idOrLog === 'object' && idOrLog !== null ? String(idOrLog._id || idOrLog.id || '') : String(idOrLog || '');
    if (!logId || logId === '[object Object]') {
      toast.error('Invalid error log ID');
      return;
    }
    try {
      await adminAPI.deleteErrorLog(logId);
      setLogs((prev) => prev.filter((item) => String(item._id) !== logId));
      if (selectedLog && String(selectedLog._id) === logId) {
        setSelectedLog(null);
      }
      toast.success('Error log deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete error log');
    }
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          Only authorized platform administrators can view centralized system error logs.
        </p>
        <button
          onClick={() => navigate('/app/dashboard')}
          className="px-5 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#e05d00] text-white text-sm font-semibold transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const unresolvedCount = logs.filter((l) => !l.resolved).length;
  const criticalCount = logs.filter((l) => (l.severity || l.level) === 'critical').length;
  const repeatedCount = logs.filter((l) => (l.count || 1) > 1).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Server className="w-6 h-6 text-[#FF6A00]" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              System Error Logs
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centralized diagnostics across webhooks, AI orchestration, queues, database, Redis, and external APIs.
          </p>
        </div>

        <button
          onClick={fetchErrorLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white/10 dark:hover:bg-white/15 text-sm font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Matching</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{pagination.total || logs.length}</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Unresolved (Page)</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{unresolvedCount}</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Critical Alerts</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{criticalCount}</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Repeated Failures</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{repeatedCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search message, errorCode, requestId, workspaceId..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border bg-slate-50 border-slate-200 text-slate-900 dark:bg-black/20 dark:border-white/10 dark:text-white focus:outline-none focus:border-[#FF6A00]"
            />
          </div>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium border bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-white/10 dark:text-white focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Service / Provider */}
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium border bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-white/10 dark:text-white focus:outline-none"
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={resolvedFilter}
            onChange={(e) => {
              setResolvedFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium border bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-white/10 dark:text-white focus:outline-none"
          >
            {RESOLVED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Filter size={13} />
            <span>Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-white/10 dark:text-slate-200 text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-white/10 dark:text-slate-200 text-xs"
            />
          </div>

          {(search || severity || serviceFilter || resolvedFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setSeverity('');
                setServiceFilter('');
                setResolvedFilter('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-xs font-semibold text-[#FF6A00] hover:underline"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Table */}
      <div className="rounded-2xl border bg-white border-slate-200 dark:bg-white/5 dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
            <p className="text-base font-bold text-slate-900 dark:text-white">No matching error logs</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All monitored services are healthy or no records matched your current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {logs.map((log) => {
              const sev = log.severity || log.level || 'error';
              const lastSeen = log.lastOccurredAt || log.firstOccurredAt || log.createdAt;
              return (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    log.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getSeverityBadgeClass(
                          sev
                        )}`}
                      >
                        {sev}
                      </span>

                      {log.service && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          {log.service}
                        </span>
                      )}

                      {log.provider && log.provider !== 'internal' && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {log.provider}
                        </span>
                      )}

                      {log.errorCode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Code: {log.errorCode}
                        </span>
                      )}

                      {log.statusCode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400">
                          HTTP {log.statusCode}
                        </span>
                      )}

                      {(log.count || 1) > 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Repeat size={11} />
                          {log.count}x occurrences
                        </span>
                      )}

                      {log.resolved && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {log.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {lastSeen && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
                        </span>
                      )}
                      {log.endpoint && <span className="font-mono">{log.endpoint}</span>}
                      {log.workspaceId && <span>Workspace: {log.workspaceId}</span>}
                      {log.requestId && <span>Req: {log.requestId}</span>}
                      {log.jobId && <span>Job: {log.jobId}</span>}
                      {log.retryAttempt && <span>Attempt #{log.retryAttempt}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleToggleResolve(log, e)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        log.resolved
                          ? 'border-slate-300 text-slate-600 dark:border-white/10 dark:text-slate-300'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {log.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      onClick={(e) => handleDeleteLog(log._id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete Log"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10 p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getSeverityBadgeClass(
                      selectedLog.severity || selectedLog.level
                    )}`}
                  >
                    {selectedLog.severity || selectedLog.level || 'error'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {selectedLog.service} / {selectedLog.provider || 'internal'}
                  </span>
                  {(selectedLog.count || 1) > 1 && (
                    <span className="text-xs font-bold text-purple-400">
                      ({selectedLog.count} occurrences)
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white break-words">
                  {selectedLog.message}
                </h3>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Structured Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Service', value: selectedLog.service },
                { label: 'Provider', value: selectedLog.provider },
                { label: 'Stage', value: selectedLog.stage },
                { label: 'Error Code', value: selectedLog.errorCode },
                { label: 'HTTP Status', value: selectedLog.statusCode },
                { label: 'Endpoint', value: selectedLog.endpoint },
                { label: 'Request ID', value: selectedLog.requestId },
                { label: 'Workspace ID', value: selectedLog.workspaceId },
                { label: 'User ID', value: selectedLog.userId },
                { label: 'Conversation ID', value: selectedLog.conversationId },
                { label: 'Message ID', value: selectedLog.messageId },
                { label: 'Queue / Job', value: selectedLog.jobId ? `${selectedLog.queueName || 'queue'} (${selectedLog.jobId})` : selectedLog.queueName },
                { label: 'Retry Attempt', value: selectedLog.retryAttempt },
                {
                  label: 'First Seen',
                  value: selectedLog.firstOccurredAt
                    ? format(new Date(selectedLog.firstOccurredAt), 'PPpp')
                    : undefined,
                },
                {
                  label: 'Last Seen',
                  value: selectedLog.lastOccurredAt
                    ? format(new Date(selectedLog.lastOccurredAt), 'PPpp')
                    : undefined,
                },
              ]
                .filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
                .map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5"
                  >
                    <p className="text-[10px] font-semibold uppercase text-slate-400">{item.label}</p>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="font-mono text-slate-800 dark:text-slate-200 truncate" title={String(item.value)}>
                        {String(item.value)}
                      </p>
                      <button
                        onClick={() => handleCopy(String(item.value), item.label)}
                        className="text-slate-400 hover:text-slate-200 shrink-0"
                        title="Copy"
                      >
                        {copiedId === item.label ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Stack Trace */}
            {selectedLog.stack && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Stack Trace (Sanitized)</p>
                  <button
                    onClick={() => handleCopy(selectedLog.stack, 'stack')}
                    className="text-xs text-[#FF6A00] hover:underline flex items-center gap-1"
                  >
                    {copiedId === 'stack' ? <Check size={12} /> : <Copy size={12} />}
                    Copy Stack
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/10">
                  {selectedLog.stack}
                </pre>
              </div>
            )}

            {/* Sanitized Metadata / Response Body */}
            {(selectedLog.metadata || selectedLog.responseBody) && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Diagnostic Context & Sanitized Payload
                </p>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/10">
                  {JSON.stringify(
                    {
                      metadata: selectedLog.metadata,
                      responseBody: selectedLog.responseBody,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
