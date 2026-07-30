import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { authAPI } from '../services/api';
import { AlertTriangle, Clock, RotateCcw, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PendingDeletionPage() {
  const { user, logout, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel the deletion request and restore your account?')) return;
    
    setLoading(true);
    try {
      await authAPI.cancelDeletionRequest();
      toast.success('Your account has been restored!');
      await fetchUser(); // Update user state to clear the pending flag
    } catch (err) {
      toast.error('Failed to restore account');
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = user?.deletionRequestedAt 
    ? Math.ceil((new Date(new Date(user.deletionRequestedAt).getTime() + 30 * 24 * 60 * 60 * 1000) - new Date()) / (1000 * 60 * 60 * 24))
    : 30;

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        <div className="bg-red-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-lg">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-bold">Account Scheduled for Deletion</h1>
          <p className="text-red-100 mt-2 text-sm">
            Hi {user?.name}, your request is being processed.
          </p>
        </div>
        
        <div className="p-8">
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-6">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">{daysLeft} Days Remaining</p>
              <p className="text-xs text-amber-700">Scheduled for permanent deletion on {user?.deletionRequestedAt && format(new Date(new Date(user.deletionRequestedAt).getTime() + 30 * 24 * 60 * 60 * 1000), 'PPP')}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-600 mb-8">
            <p className="font-medium text-gray-900">What does this mean?</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Your account is currently disabled.</li>
              <li>All active bots and tasks are paused.</li>
              <li>Data will be permanently erased after the countdown.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
              Restore My Account
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <a href="/data-deletion-policy" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <ShieldCheck size={14} /> View Data Deletion Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
