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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundElements />
      
      {/* Overriding some background colors for Admin feel */}
      <div className="absolute inset-0 bg-red-950/5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[rgba(10,10,10,0.8)] backdrop-blur-2xl border border-red-500/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.1)]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red-600/10 border border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
              <ShieldAlert size={32} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin <span className="text-red-500">Terminal</span></h1>
            <p className="text-gray-500 mt-2 text-sm uppercase tracking-[0.2em]">Restricted Access Only</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!isLogin && (
               <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Full Name</label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="System Administrator"
                />
                {errors.name && <p className="text-red-500 text-[10px] mt-1">{errors.name.message}</p>}
              </div>
            )}

            <div className="group">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Admin Identity (Email)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-600" />
                <input
                  {...register('email')}
                  type="email"
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="admin@zapiai.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email.message}</p>}
            </div>

            <div className="group">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Secure Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-600" />
                <input
                  {...register('password')}
                  type="password"
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-[10px] mt-1">{errors.password.message}</p>}
            </div>

            {!isLogin && (
               <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Master Access Key</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3.5 text-gray-600" />
                  <input
                    {...register('masterKey')}
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500/50 transition-all"
                    placeholder="ENTER SECRET KEY"
                  />
                </div>
                {errors.masterKey && <p className="text-red-500 text-[10px] mt-1">{errors.masterKey.message}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'AUTHORIZE ACCESS' : 'CREATE ADMIN ACCOUNT')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); reset(); }}
              className="text-[11px] text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors"
            >
              {isLogin ? 'Request Admin Enrollment' : 'Return to Admin Authorization'}
            </button>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-gray-600 mt-8 uppercase tracking-[0.3em]">
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
