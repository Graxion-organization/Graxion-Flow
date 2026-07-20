import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Linkedin, CheckCircle2, XCircle } from 'lucide-react';
import { socialHubAPI } from '../services/api';
import toast from 'react-hot-toast';

const LinkedinCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(searchParams.get('error_description') || 'LinkedIn connection cancelled.');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received.');
        return;
      }

      try {
        await socialHubAPI.linkedinCallback(code);
        setStatus('success');
        toast.success('LinkedIn account connected successfully!');
        setTimeout(() => {
          navigate('/app/integrations');
        }, 2000);
      } catch (err) {
        console.error('LinkedIn connection failed:', err);
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to connect LinkedIn account.');
      }
    };
 
    handleCallback();
  }, [searchParams, navigate]);
 
  return (
    <div className="min-h-screen bg-[#060a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-[rgba(37,211,102,0.18)] rounded-3xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-[#0077b5] shadow-[0_0_20px_rgba(0,119,181,0.4)]">
          <Linkedin size={32} className="text-white" />
        </div>
 
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 size={40} className="text-[#0077b5] animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[#e8f5ee]">Connecting LinkedIn...</h2>
            <p className="text-[#7a9b8a]">Please wait while we secure your account access.</p>
          </div>
        )}
 
        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 size={48} className="text-[#25D366]" />
            </div>
            <h2 className="text-xl font-bold text-[#e8f5ee]">Connected!</h2>
            <p className="text-[#7a9b8a]">LinkedIn account linked successfully. Redirecting...</p>
          </div>
        )}
 
        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#e8f5ee]">Connection Failed</h2>
            <p className="text-red-400/80">{error}</p>
            <button
              onClick={() => navigate('/app/integrations')}
              className="mt-4 px-6 py-2 bg-[#0077b5] text-white rounded-xl hover:bg-[#00669c] transition-colors"
            >
              Back to Integrations
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedinCallbackPage;
