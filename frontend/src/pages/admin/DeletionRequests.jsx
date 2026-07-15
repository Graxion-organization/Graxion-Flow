import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Trash2, ShieldCheck, UserX, Loader2, Search, Calendar, MoreHorizontal, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DeletionRequests() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDeletionRequests({ page, limit: 10 });
      setUsers(res.data.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const onCancelDeletion = async (userId) => {
    if (!window.confirm('Are you sure you want to cancel this deletion request and restore the account?')) return;
    
    setProcessingId(userId);
    try {
      await adminAPI.cancelDeletion(userId);
      toast.success('Deletion request cancelled and account restored');
      fetchRequests();
    } catch (err) {
      toast.error('Failed to cancel deletion');
    } finally {
      setProcessingId(null);
    }
  };

  const getDaysRemaining = (requestedAt) => {
    if (!requestedAt) return 30;
    const requestDate = new Date(requestedAt);
    if (isNaN(requestDate.getTime())) return 30;
    const deletionDate = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deletion Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users who have requested to delete their accounts</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested At</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Deletion</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (users?.length || 0) === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck size={40} className="text-gray-200" />
                      <p>No pending deletion requests</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-bold">
                          {user.name ? user.name[0] : '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{user.email || 'No Email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        {user.deletionRequestedAt ? format(new Date(user.deletionRequestedAt), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-xs font-bold text-gray-700 capitalize">{user.deletionReason?.replace(/_/g, ' ') || 'N/A'}</span>
                        {user.deletionFeedback && (
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate" title={user.deletionFeedback}>
                            {user.deletionFeedback}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${getDaysRemaining(user.deletionRequestedAt) < 7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {getDaysRemaining(user.deletionRequestedAt)} days left
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onCancelDeletion(user._id)}
                        disabled={processingId === user._id}
                        className="p-2 text-gray-400 hover:text-whatsapp transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        title="Restore Account"
                      >
                        {processingId === user._id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 10 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {(page-1)*10+1} to {Math.min(page*10, total)} of {total} requests</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded text-xs disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= total}
                className="px-3 py-1 border border-gray-200 rounded text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
            <ShieldCheck size={20} /> Data Policy
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            Accounts in this list are currently disabled. Users cannot login or use any features. 
            After 30 days of the request date, the system will automatically wipe all user data including:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-blue-700 list-disc list-inside">
            <li>Profile & Credentials</li>
            <li>Connected WhatsApp/FB/IG accounts</li>
            <li>AI Agents & Custom Settings</li>
            <li>All conversation history</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6">
          <h3 className="font-bold text-yellow-900 flex items-center gap-2 mb-3">
            <UserX size={20} /> Manual Intervention
          </h3>
          <p className="text-sm text-yellow-800 leading-relaxed">
            If a user contacts you to cancel their deletion request, use the "Restore" button to re-enable their account. 
            This will clear the deletion schedule and allow them to log in again immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
