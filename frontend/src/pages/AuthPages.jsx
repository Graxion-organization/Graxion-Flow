import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Eye, EyeOff, Loader2, Sparkles, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../store';
import SecurityChallengeModal from '../components/auth/SecurityChallengeModal';
import toast from 'react-hot-toast';

/* ─── Background Effects (exported for AdminAuthPage) ─── */
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
      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)' }}
    />
  );
};

export const BackgroundElements = () => (
  <>
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 10% 5%, rgba(34,197,94,0.08) 0%, transparent 58%), radial-gradient(ellipse 60% 45% at 90% 85%, rgba(34,197,94,0.06) 0%, transparent 55%)' }} />
    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
    <div className="absolute top-[8%] left-[12%] w-80 h-80 bg-brand-500 rounded-full blur-[150px] opacity-[0.06] animate-pulse" />
    <div className="absolute bottom-[8%] right-[10%] w-64 h-64 sm:w-[360px] sm:h-[360px] bg-cyan-500 rounded-full blur-[150px] opacity-[0.04] animate-pulse" style={{ animationDelay: '1.2s' }} />
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

/* ─── Input component ─── */
const AuthInput = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
  </div>
);

/* ─── Auth Shell ─── */
function AuthShell({ children, subtitle, title }) {
  const navigate = useNavigate();
  const { branding } = useBrandingStore();
  const brandName = branding?.branding_site_name || 'Graxion';
  const logoUrl = "https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png";
  const tagline = branding?.branding_tagline || 'The Next-Gen Automation Platform';

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundElements />

      <div className="w-full max-w-5xl relative z-10 grid lg:grid-cols-[1fr_1fr] rounded-[2rem] overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-glass-lg">
        {/* Left Panel */}
        <aside className="hidden lg:flex flex-col justify-between p-10 border-r border-white/[0.06] bg-gradient-to-br from-[#0a1020]/80 to-[#060912]/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-500/[0.06] blur-[100px] rounded-full" />
          
          <div className="relative z-10">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
              {logoUrl ? (
                <img src={logoUrl} alt="Graxion Flow Logo" className="h-10 max-w-[150px] object-contain rounded-lg" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center shadow-glow-sm">
                  <MessageSquare size={18} />
                </div>
              )}
              <span className="text-slate-100 font-bold tracking-tight text-lg">{brandName}</span>
            </button>

            <h2 className="mt-12 text-3xl font-extrabold text-slate-100 leading-tight">
              Premium AI CRM for
              <span className="block text-gradient mt-1">modern businesses</span>
            </h2>
            <p className="mt-4 text-sm text-gray-400 max-w-sm leading-relaxed">
              Build faster response loops, convert more leads, and run a sharper customer experience across every chat channel.
            </p>
          </div>

          <div className="space-y-3 text-sm text-gray-400 relative z-10">
            {['Unified inbox for all channels', 'AI + human handoff in seconds', 'Security-first onboarding flow'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-500/70 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel - Form */}
        <section className="p-6 sm:p-8 lg:p-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Graxion Flow Logo" className="h-8 w-auto" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center">
                <MessageSquare size={16} />
              </div>
            )}
            <span className="text-white font-bold">{brandName}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold uppercase tracking-[0.18em]">
            <Shield size={14} />
            Secure Access
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-100 tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </div>
  );
}

const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all";

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
        
        {/* SSO Button */}
        <button
          type="button"
          onClick={() => window.location.href = `https://accounts.graxion.in/login?redirect_to=${encodeURIComponent(window.location.origin)}&product=flow`}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 mb-6"
        >
          <div className="h-6 w-6 rounded bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center text-xs font-bold">G</div>
          Continue with Graxion Account
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase tracking-widest">Or sign in with email</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <AuthInput label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </AuthInput>

        <AuthInput label="Password" error={errors.password?.message}>
          <div className="flex items-center justify-end mb-0 -mt-6">
            <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">Forgot password?</Link>
          </div>
          <div className="relative mt-2">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="********"
              className={`${inputClass} pr-12`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-gray-500 hover:text-slate-200 transition-colors">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </AuthInput>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_10px_24px_rgba(34,197,94,0.2)] hover:shadow-[0_14px_34px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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

      <p className="text-center text-sm text-gray-400 mt-8">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-400 font-semibold hover:text-brand-300 transition-colors">Sign up free</Link>
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
        
        {/* SSO Button */}
        <button
          type="button"
          onClick={() => window.location.href = `https://accounts.graxion.in/register?redirect_to=${encodeURIComponent(window.location.origin)}&product=flow`}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 mb-6"
        >
          <div className="h-6 w-6 rounded bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center text-xs font-bold">G</div>
          Sign up with Graxion Account
        </button>

        <div className="relative flex items-center py-2 mb-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase tracking-widest">Or create with email</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {[
          { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
          { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
          { name: 'password', label: 'Password', type: showPass ? 'text' : 'password', placeholder: 'Minimum 8 characters', hasToggle: true },
          { name: 'confirmPassword', label: 'Confirm Password', type: showPass ? 'text' : 'password', placeholder: 'Re-enter password' },
        ].map((field) => (
          <AuthInput key={field.name} label={field.label} error={errors[field.name]?.message}>
            <div className="relative">
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className={`${inputClass} ${field.hasToggle ? 'pr-12' : ''}`}
              />
              {field.hasToggle && (
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-gray-500 hover:text-slate-200 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </AuthInput>
        ))}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_10px_24px_rgba(34,197,94,0.2)] hover:shadow-[0_14px_34px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-6"
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

      <p className="text-center text-sm text-gray-400 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 font-semibold hover:text-brand-300 transition-colors">Sign in</Link>
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
