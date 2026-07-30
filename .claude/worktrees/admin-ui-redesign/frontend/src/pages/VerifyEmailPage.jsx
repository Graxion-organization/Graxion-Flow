import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MessageSquare } from 'lucide-react';
import { authAPI } from '../services/api';
import { BackgroundElements } from './AuthPages';
import toast from 'react-hot-toast';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token.');
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        toast.success('Email verified! You can now log in.');
        
        // Optional: Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The link may be expired.');
      }
    };

    verifyToken();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#060a0f] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundElements />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-[rgba(37,211,102,0.18)] rounded-3xl p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-[#25D366] to-[#1aab52] shadow-[0_0_20px_rgba(37,211,102,0.4)]">
              <MessageSquare size={30} className="text-[#060a0f]" />
            </div>
            <h1 className="text-3xl font-[800] text-[#e8f5ee] tracking-tight">
              Zapi<span className="text-[#25D366]" style={{ textShadow: '0 0 12px rgba(37,211,102,0.7)' }}>AI</span>
            </h1>
          </div>

          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Loader2 size={48} className="text-[#25D366] animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-[#e8f5ee]">Verifying your email...</h2>
              <p className="text-[#7a9b8a]">Please wait while we confirm your account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 size={64} className="text-[#25D366] animate-bounce-slow" />
              </div>
              <h2 className="text-2xl font-bold text-[#e8f5ee]">Email Verified!</h2>
              <p className="text-[#7a9b8a]">{message}</p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block w-full bg-gradient-to-r from-[#25D366] to-[#1aab52] text-[#060a0f] font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_35px_rgba(37,211,102,0.6)] transition-all"
                >
                  Proceed to Login
                </Link>
              </div>
              <p className="text-xs text-[#7a9b8a] pt-4">Redirecting you to login in 5 seconds...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <XCircle size={64} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-[#e8f5ee]">Verification Failed</h2>
              <p className="text-[#7a9b8a]">{message}</p>
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  to="/register"
                  className="w-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-bold py-3 rounded-xl hover:bg-[#25D366]/20 transition-all"
                >
                  Back to Signup
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-[#7a9b8a] hover:text-[#25D366] transition-colors"
                >
                  Need help? Contact support
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
