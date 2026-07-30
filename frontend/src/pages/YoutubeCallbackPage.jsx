import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { youtubeAPI, fetchCsrfToken } from '../services/api';
import toast from 'react-hot-toast';
import { Loader2, Youtube, CheckCircle2, AlertCircle } from 'lucide-react';

export default function YoutubeCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        setStatus('error');
        setError('No authorization code received from Google.');
        return;
      }

      try {
        await fetchCsrfToken();
        await youtubeAPI.callback(code);
        setStatus('success');
        toast.success('YouTube channel connected successfully!');
        // Removed auto redirect to allow user to choose their next step
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to connect YouTube account.');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center">
            <Youtube className="text-red-600 w-10 h-10" />
          </div>
        </div>

        {status === 'processing' && (
          <>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Connecting YouTube...</h1>
            <p className="text-slate-500 mb-6">Please wait while we sync your channel details.</p>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="text-emerald-500 w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Successfully Connected!</h1>
            <p className="text-slate-500 mb-6">Your YouTube channel is now ready. Would you like to create an AI Agent for it now?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/app/agents?create=true&platform=youtube')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg shadow-red-500/30"
              >
                Create AI Agent
              </button>
              <button
                onClick={() => navigate('/app/integrations')}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 flex justify-center">
              <AlertCircle className="text-red-500 w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Connection Failed</h1>
            <p className="text-red-600 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/app/integrations')}
              className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
