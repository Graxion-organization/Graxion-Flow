import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SsoCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithSsoToken } = useAuthStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('Invalid or missing SSO token.');
      return;
    }

    const authenticate = async () => {
      try {
        const result = await loginWithSsoToken(token);
        
        if (result.success) {
          toast.success('Successfully logged in via Graxion Accounts!');
          navigate('/app/dashboard');
        } else {
          setError(result.message || 'Failed to authenticate via SSO.');
          toast.error(result.message || 'SSO authentication failed.');
        }
      } catch (err) {
        setError('An unexpected error occurred during SSO login.');
        console.error('SSO error', err);
      }
    };

    authenticate();
  }, [searchParams, navigate, loginWithSsoToken]);

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-4">
      <div className="text-center">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-4 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="animate-spin text-brand-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authenticating...</h2>
            <p className="text-gray-400">Please wait while we log you in securely.</p>
          </div>
        )}
      </div>
    </div>
  );
}
