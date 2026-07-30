import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert, Lock, Mail, Loader2, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store';
import SecurityChallengeModal from '../components/auth/SecurityChallengeModal';
import toast from 'react-hot-toast';
import { BackgroundElements } from './AuthPages';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid admin email'),
  password: z.string().min(1, 'Password required'),
});

const adminRegisterSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  masterKey: z.string().min(1, 'Master Access Key required'),
});

const inputClass = "w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/40 transition-all";

export function AdminAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { adminLogin, adminRegister, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ 
    resolver: zodResolver(isLogin ? adminLoginSchema : adminRegisterSchema) 
  });
  
  const [challenge, setChallenge] = useState({ isOpen: false, data: null });
  const [formData, setFormData] = useState(null);

  const onSubmit = async (data) => {
    setFormData(data);
    const result = isLogin ? await adminLogin(data) : await adminRegister(data);
    
    if (result.success) {
      if (result.pendingApproval) {
        toast.success(result.message || 'Admin signup request submitted successfully. Awaiting administrator approval.', { duration: 6000 });
        setIsLogin(true);
        reset();
      } else {
        toast.success(isLogin ? 'Admin authenticated. Welcome back.' : 'Admin account created.');
        navigate('/admin/dashboard');
      }
    } else if (result.action === 'require_otp') {
      setChallenge({
        isOpen: true,
        data: { otpToken: result.otpToken }
      });
    } else {
      toast.error(result.message || 'Authentication failed');
    }
  };

  const handleVerifyOTP = async (verificationData) => {
    const result = await adminLogin({ ...formData, ...verificationData, otpToken: challenge.data?.otpToken });
    
    if (result.success) {
      setChallenge({ isOpen: false, data: null });
      toast.success('Identity verified. Accessing Admin Panel...');
      navigate('/admin/dashboard');
    } else {
      toast.error(result.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Keeping base background elements but adding red tint */}
      <BackgroundElements />
      <div className="absolute inset-0 bg-rose-950/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/[0.04] blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/[0.02] backdrop-blur-xl border border-rose-500/20 rounded-[2rem] p-8 sm:p-10 shadow-glass-lg shadow-rose-900/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/30 shadow-glow-sm shadow-rose-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert size={32} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin <span className="text-rose-500">Terminal</span></h1>
            <p className="text-gray-500 mt-2 text-xs font-semibold uppercase tracking-[0.2em]">Restricted Access Only</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!isLogin && (
               <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/40 transition-all"
                  placeholder="System Administrator"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name.message}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin Identity</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-gray-500" />
                <input
                  {...register('email')}
                  type="email"
                  className={inputClass}
                  placeholder="admin@graxion.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Secure Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-gray-500" />
                <input
                  {...register('password')}
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {!isLogin && (
               <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Master Access Key</label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-3.5 text-gray-500" />
                  <input
                    {...register('masterKey')}
                    type="password"
                    className={inputClass}
                    placeholder="ENTER SECRET KEY"
                  />
                </div>
                {errors.masterKey && <p className="text-red-400 text-xs mt-1.5">{errors.masterKey.message}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-rose-600 hover:bg-rose-500 text-white font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_10px_24px_rgba(225,29,72,0.2)] hover:shadow-[0_14px_34px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'AUTHORIZE ACCESS' : 'CREATE ADMIN ACCOUNT')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); reset(); }}
              className="text-xs font-semibold text-gray-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
            >
              {isLogin ? 'Request Admin Enrollment' : 'Return to Admin Authorization'}
            </button>
          </div>
        </div>
        
        <p className="text-center text-[10px] font-semibold text-gray-600 mt-8 uppercase tracking-[0.3em]">
          End-to-End Encrypted Session
        </p>
      </div>

      <SecurityChallengeModal
        isOpen={challenge.isOpen}
        type="require_otp"
        isLoading={isLoading}
        onVerify={handleVerifyOTP}
        onCancel={() => setChallenge({ isOpen: false, data: null })}
      />
    </div>
  );
}

export default AdminAuthPage;
