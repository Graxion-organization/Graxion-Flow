import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function FailedMessagesModal({ broadcastId, onClose, isDark }) {
  const [failures, setFailures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFailures = async () => {
      try {
        const res = await api.get(`/broadcasts/${broadcastId}/failures`);
        setFailures(res.data.data.failures);
      } catch (err) {
        console.error('Error fetching broadcast failures:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFailures();
  }, [broadcastId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Failed Messages</h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Detailed error reasons from Meta</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
            </div>
          ) : failures.length === 0 ? (
            <div className="text-center py-12">
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No failed messages found for this broadcast.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failures.map((f, i) => (
                <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium px-2 py-1 rounded-md ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}>
                      {f.phone}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(f.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-sm break-words ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {f.errorReason || 'Unknown error from Meta.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
