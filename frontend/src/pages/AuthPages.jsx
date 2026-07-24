import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Eye, EyeOff, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../store';
import SecurityChallengeModal from '../components/auth/SecurityChallengeModal';
import toast from 'react-hot-toast';

export const CursorGlow = () => {
  const ref = useRef(null);

  useEffect(() => {
    const move = (e) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX}px`;
        ref.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed w-64 h-64 sm:w-[320px] sm:h-[320px] rounded-full pointer-events-none z-[5] -translate-x-1/2 -translate-y-1/2 transition-[left_top] duration-100 ease-out"
      style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.14) 0%, transparent 70%)' }}
    />
  );
};

export const BackgroundElements = () => (
  <>
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 10% 5%, rgba(255,106,0,0.12) 0%, transparent 58%), radial-gradient(ellipse 60% 45% at 90% 85%, rgba(255,138,0,0.1) 0%, transparent 55%)' }} />
    <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,106,0,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,106,0,0.14) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
    <div className="absolute top-[8%] left-[12%] w-80 h-80 bg-[#FF6A00] rounded-full blur-[120px] opacity-20 animate-pulse" />
    <div className="absolute bottom-[8%] right-[10%] w-64 h-64 sm:w-[360px] sm:h-[360px] bg-[#FF8A00] rounded-full blur-[130px] opacity-20 animate-pulse" style={{ animationDelay: '1.2s' }} />
    <CursorGlow />
  </>
);

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name too short'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function AuthShell({ children, subtitle, title }) {
  const navigate = useNavigate();
  const { branding } = useBrandingStore();

  return (
    <div className="min-h-screen bg-[#070B12] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundElements />

      <div className="w-full max-w-5xl relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] rounded-[28px] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <aside className="hidden lg:flex flex-col justify-between p-9 border-r border-white/10 bg-gradient-to-br from-[#0e1726]/90 to-[#0b111d]/90">
          <div>
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              {branding?.branding_logo_url ? (
                <img src={branding.branding_logo_url} alt={branding.branding_site_name} className="h-10 max-w-[150px] object-contain rounded-lg" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#FF8A00] text-white flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
              )}
              <span className="text-slate-100 font-bold tracking-tight">{branding?.branding_site_name || 'Graxion'}</span>
            </button>

            <h2 className="mt-10 text-3xl font-extrabold text-slate-100 leading-tight">
              Premium AI CRM for
              <span className="block text-[#FF8A00]">high-growth India teams</span>
            </h2>
            <p className="mt-4 text-sm text-slate-300 max-w-sm">
              Build faster response loops, convert more leads, and run a sharper customer experience across every chat channel.
            </p>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            {['Unified inbox for all channels', 'AI + human handoff in seconds', 'Security-first onboarding flow'].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="p-6 sm:p-8 lg:p-9">
          <div className="flex items-center gap-2 text-xs text-[#FF8A00] font-semibold uppercase tracking-[0.18em]">
            <Sparkles size={14} />
            Secure Access
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-100 tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const [challenge, setChallenge] = useState({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState(null);

  const onSubmit = async (data) => {
    setFormData(data);
    const result = await login(data);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/app/dashboard');
    } else if (result.action) {
      setChallenge({ isOpen: true, type: result.action, data: { otpToken: result.otpToken } });
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  const handleVerifyChallenge = async (verificationData) => {
    const result = await login({ ...formData, ...verificationData, otpToken: challenge.data?.otpToken });

    if (result.success) {
      setChallenge({ isOpen: false, type: null, data: null });
      toast.success('Security verified. Welcome back!');
      navigate('/app/dashboard');
    } else if (result.action) {
      setChallenge((prev) => ({ ...prev, data: { ...prev.data, otpToken: result.otpToken } }));
      toast.error(result.message);
    } else {
      setChallenge({ isOpen: false, type: null, data: null });
      toast.error(result.message || 'Verification failed');
    }
  };

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to continue managing conversations and growth.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-[#0B1220] border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/40 focus:border-[#FF6A00]/70 transition-all"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <Link to="/forgot-password" className="text-xs text-[#FF8A00] hover:text-[#FFC48D] transition-colors font-medium">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="********"
              className="w-full px-4 py-3 bg-[#0B1220] border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/40 focus:border-[#FF6A00]/70 transition-all pr-12"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-200 transition-colors">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_10px_24px_rgba(255,106,0,0.32)] hover:shadow-[0_14px_34px_rgba(255,106,0,0.42)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Signing in...
            </>
          ) : (
            <>
              Sign In <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-8">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#FF8A00] font-semibold hover:text-[#FFC48D] transition-colors">Sign up free</Link>
      </p>

      <SecurityChallengeModal
        isOpen={challenge.isOpen}
        type={challenge.type}
        isLoading={isLoading}
        onVerify={handleVerifyChallenge}
        onCancel={() => setChallenge({ isOpen: false, type: null, data: null })}
      />
    </AuthShell>
  );
}

export function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref') || searchParams.get('partnerCode') || searchParams.get('ref_code');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const [challenge, setChallenge] = useState({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState(null);

  const onSubmit = async (data) => {
    const refCode = searchParams.get('ref') || searchParams.get('partnerCode') || searchParams.get('ref_code') || localStorage.getItem('referralCode');
    const payload = { ...data, ref: refCode || undefined };
    setFormData(payload);
    const result = await registerUser(payload);

    if (result.success) {
      toast.success('Account created! Check your email to verify.');
      navigate('/app/dashboard');
    } else if (result.action) {
      setChallenge({ isOpen: true, type: result.action, data: { otpToken: result.otpToken } });
    } else {
      toast.error(result.message || 'Registration failed');
    }
  };

  const handleVerifyChallenge = async (verificationData) => {
    const result = await registerUser({ ...formData, ...verificationData, otpToken: challenge.data?.otpToken });

    if (result.success) {
      setChallenge({ isOpen: false, type: null, data: null });
      toast.success('Security verified. Account created!');
      navigate('/app/dashboard');
    } else if (result.action) {
      setChallenge((prev) => ({ ...prev, data: { ...prev.data, otpToken: result.otpToken } }));
      toast.error(result.message);
    } else {
      setChallenge({ isOpen: false, type: null, data: null });
      toast.error(result.message || 'Verification failed');
    }
  };

  return (
    <AuthShell title="Create Account" subtitle="Start with a premium onboarding flow and launch quickly.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {[
          { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
          { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
          { name: 'password', label: 'Password', type: showPass ? 'text' : 'password', placeholder: 'Minimum 8 characters', hasToggle: true },
          { name: 'confirmPassword', label: 'Confirm Password', type: showPass ? 'text' : 'password', placeholder: 'Re-enter password' },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{field.label}</label>
            <div className="relative">
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 bg-[#0B1220] border border-white/10 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/40 focus:border-[#FF6A00]/70 transition-all"
              />
              {field.hasToggle && (
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-200 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
            {errors[field.name] && <p className="text-red-400 text-xs mt-1.5">{errors[field.name].message}</p>}
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_10px_24px_rgba(255,106,0,0.32)] hover:shadow-[0_14px_34px_rgba(255,106,0,0.42)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Creating account...
            </>
          ) : (
            <>
              Create Account <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-[#FF8A00] font-semibold hover:text-[#FFC48D] transition-colors">Sign in</Link>
      </p>

      <SecurityChallengeModal
        isOpen={challenge.isOpen}
        type={challenge.type}
        isLoading={isLoading}
        onVerify={handleVerifyChallenge}
        onCancel={() => setChallenge({ isOpen: false, type: null, data: null })}
      />
    </AuthShell>
  );
}
