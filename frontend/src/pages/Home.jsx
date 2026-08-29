import React, { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  Shield,
  Workflow,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  Globe,
  Users,
  Send,
  Sparkles,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  MessageCircle,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Activity,
  BadgeCheck
} from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../store';

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

/* ─── Feature Card ─── */
const FeatureCard = ({ icon: Icon, title, description, gradient, delay, span = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.07)] hover:border-brand-300 hover:shadow-[0_20px_50px_rgba(16,185,129,0.13)] transition-all duration-500 hover:-translate-y-1 ${span}`}
  >
    <div className={`absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
    <div className={`absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${gradient.replace('to-transparent', 'to-transparent')} opacity-70`} />
    <div className="relative z-10">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient.replace('/5', '/20')} border border-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7 text-slate-800" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-[15px]">{description}</p>
    </div>
  </motion.div>
);

/* ─── Workflow Step ─── */
const WorkflowStep = ({ number, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="relative flex flex-col items-center text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 border border-brand-500/20 flex items-center justify-center mb-6">
      <span className="text-2xl font-bold text-brand-400">{number}</span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm max-w-xs">{description}</p>
  </motion.div>
);

const DashboardPreview = () => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.75, delay: 0.55 }}
    className="relative mt-16 mx-auto max-w-5xl text-left"
  >
    <div className="absolute -inset-6 rounded-[2.5rem] bg-brand-500/15 blur-3xl" />
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1120]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-6">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
        <div className="text-xs font-medium text-gray-500">Graxion Flow workspace</div>
        <div className="h-5 w-12 rounded-full bg-white/[0.05]" />
      </div>
      <div className="grid grid-cols-[auto_1fr] min-h-[250px] sm:min-h-[320px]">
        <aside className="hidden sm:flex w-48 flex-col gap-2 border-r border-white/[0.07] p-4 text-xs text-gray-500">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><LayoutDashboard className="h-4 w-4 text-brand-400" /> Overview</div>
          <div className="rounded-lg bg-brand-500/15 px-3 py-2 text-brand-300">Publishing</div>
          <div className="px-3 py-2">Conversations</div><div className="px-3 py-2">Automations</div><div className="px-3 py-2">Analytics</div>
        </aside>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-gray-500">Good morning</p><h3 className="text-base font-bold text-white sm:text-xl">Your content is in flow</h3></div><button className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white">Create post</button></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[['12', 'Scheduled'], ['48', 'New replies'], ['92%', 'On track']].map(([value, label], index) => <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 sm:p-4"><div className="mb-2 flex justify-between"><span className="text-xs text-gray-500">{label}</span>{index === 1 ? <MessageSquare className="h-3.5 w-3.5 text-brand-400" /> : <Activity className="h-3.5 w-3.5 text-brand-400" />}</div><p className="text-lg font-bold text-white sm:text-2xl">{value}</p></div>)}
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold text-white">Today’s publishing queue</span><CalendarDays className="h-4 w-4 text-brand-400" /></div><div className="flex items-center gap-3"><div className="flex -space-x-1.5"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b1120] bg-red-500 text-[9px] font-bold">▶</span><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b1120] bg-pink-500 text-[9px] font-bold">◎</span><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b1120] bg-blue-500 text-[9px] font-bold">in</span></div><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full w-2/3 rounded-full bg-brand-500" /></div><Clock3 className="h-4 w-4 text-gray-500" /></div></div>
        </div>
      </div>
    </div>
  </motion.div>
);

const PlatformCard = ({ icon: Icon, name, accent, description, capabilities, delay, className = '', metaVerified = false }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.45, delay }}
    className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_20px_45px_rgba(16,185,129,0.12)] ${className}`}
  >
    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accent} to-transparent opacity-80`} />
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} to-transparent flex items-center justify-center ring-1 ring-white/70`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div><h3 className="text-lg font-bold text-slate-900">{name}</h3>{metaVerified && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1877f2]"><BadgeCheck className="h-3.5 w-3.5 fill-[#1877f2] text-white" /> Meta verified</span>}</div>
    </div>
    <p className="min-h-[48px] text-sm leading-relaxed text-slate-600 mb-5">{description}</p>
    <ul className="space-y-3">
      {capabilities.map(capability => (
        <li key={capability} className="flex items-start gap-2.5 text-sm text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <span>{capability}</span>
        </li>
      ))}
    </ul>
  </motion.article>
);

export default function Home() {
  const navigate = useNavigate();
  const { branding, fetchBranding } = useBrandingStore();
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic branding from Admin Settings (Overridden for Google Compliance)
  const brandName = "Graxion Flow";
  const heroTitle = "AI-Powered Social Media Automation";
  const heroSubtitle = "Graxion Flow is a social media management and automation platform that helps businesses create, schedule, and publish content across supported social media platforms from one centralized dashboard.";
  const tagline = "Graxion Flow is a product by Graxion.";
  const contactEmail = useMemo(() => branding?.branding_contact_email || "support@graxion.in", [branding]);
  const contactPhone = useMemo(() => branding?.branding_contact_phone || "+1 (800) 123-4567", [branding]);
  const footerText = useMemo(() => branding?.branding_footer_text || "© 2026 Graxion. All rights reserved.", [branding]);
  const logoUrl = "https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png";
  const address = useMemo(() => branding?.branding_address || '', [branding]);
  const socialTwitter = useMemo(() => branding?.branding_social_twitter || '', [branding]);
  const socialLinkedin = useMemo(() => branding?.branding_social_linkedin || '', [branding]);
  const socialInstagram = useMemo(() => branding?.branding_social_instagram || '', [branding]);
  const socialYoutube = useMemo(() => branding?.branding_social_youtube || '', [branding]);

  // Parse features from admin or use defaults
  const features = useMemo(() => {
    return [
      { icon: 'Globe', title: 'Social Media Management', description: 'Manage content workflows and oversee all connected social accounts securely.', gradient: 'from-emerald-500/5 to-transparent', span: 'md:col-span-2' },
      { icon: 'Sparkles', title: 'Content Creation', description: 'Create or upload multimedia content directly within the platform.', gradient: 'from-purple-500/5 to-transparent', span: '' },
      { icon: 'Workflow', title: 'Content Scheduling', description: 'Schedule your posts for optimal delivery times across channels.', gradient: 'from-blue-500/5 to-transparent', span: '' },
      { icon: 'Send', title: 'Automated Publishing', description: 'Automatically publish content directly to platforms like YouTube, Facebook, and LinkedIn.', gradient: 'from-cyan-500/5 to-transparent', span: 'md:col-span-2' },
      { icon: 'Bot', title: 'AI-Assisted Marketing Workflows', description: 'Use AI to streamline content ideation and organize your pipeline efficiently.', gradient: 'from-amber-500/5 to-transparent', span: '' },
      { icon: 'BarChart3', title: 'Centralized Dashboard', description: 'Monitor activities and handle all publishing tasks from a single interface.', gradient: 'from-red-500/5 to-transparent', span: '' },
    ];
  }, [branding]);

  const iconMap = { Bot, Workflow, Globe, BarChart3, Shield, Send, Sparkles, Users, Zap, MessageSquare, Star };

  useEffect(() => {
    fetchBranding().catch(() => {});
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchBranding]);

  useEffect(() => {
    document.title = `${brandName} — ${tagline}`;
  }, [brandName, tagline]);

  const goAuth = (path) => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
      return;
    }
    navigate(path);
  };

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Platforms', href: '#platforms' },
    { label: 'How it Works', href: '#workflow' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-x-hidden">
      
      {/* ─── NAVBAR ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/80 py-3 shadow-sm'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={logoUrl} alt="Graxion Flow Logo" className="h-9 w-auto" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
                <MessageSquare className="text-white h-5 w-5" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {brandName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {navLinks.map(link => (
              link.href.startsWith('#') ? (
                <a key={link.label} href={link.href} className="hover:text-brand-600 transition-colors duration-200">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="hover:text-brand-600 transition-colors duration-200">{link.label}</Link>
              )
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => goAuth('/login')} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors">
              Sign In
            </button>
            <button
              onClick={() => goAuth('/register')}
              className="px-6 py-2.5 text-sm font-semibold rounded-full bg-brand-500 text-white hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-[0.98]"
            >
              Get Started Free
            </button>
          </div>

          <button className="md:hidden text-slate-700 hover:text-slate-950 p-2" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* ─── MOBILE MENU ─── */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-[#060912]/98 backdrop-blur-2xl flex flex-col"
        >
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Graxion Flow Logo" className="h-8 w-auto" />
              ) : (
                <div className="h-9 w-9 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center">
                  <MessageSquare className="text-white h-4 w-4" />
                </div>
              )}
              <span className="text-lg font-bold text-white">{brandName}</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-2">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-5 mt-8">
            {navLinks.map(link => (
              link.href.startsWith('#') ? (
                <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-xl font-semibold text-gray-200 py-4 border-b border-white/5 hover:text-brand-400 transition-colors">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} onClick={() => setMobileMenuOpen(false)} className="text-xl font-semibold text-gray-200 py-4 border-b border-white/5 hover:text-brand-400 transition-colors">{link.label}</Link>
              )
            ))}
          </div>
          <div className="mt-auto p-5 space-y-3">
            <button onClick={() => { setMobileMenuOpen(false); goAuth('/register'); }} className="w-full py-4 bg-brand-500 text-white rounded-2xl font-semibold text-lg hover:bg-brand-400 transition-colors">
              Get Started Free
            </button>
            <button onClick={() => { setMobileMenuOpen(false); goAuth('/login'); }} className="w-full py-4 bg-white/5 text-white rounded-2xl font-semibold text-lg border border-white/10 hover:bg-white/10 transition-colors">
              Sign In
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-36 pb-16 lg:pt-48 lg:pb-24 overflow-hidden bg-gradient-to-b from-white via-[#f7fbf8] to-[#eef8f1]">
        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-brand-500/[0.12] blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/[0.10] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/[0.08] blur-[120px] rounded-full pointer-events-none" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:52px_52px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-brand-200 text-sm text-slate-600 mb-8 shadow-sm backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span>{tagline}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-950 leading-[1.08]"
          >
            Graxion Flow
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl lg:text-3xl font-semibold text-brand-600 mb-6"
          >
            AI-Powered Social Media Automation
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            {heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => goAuth('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(34,197,94,0.25)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)] transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Free <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold transition-all shadow-sm text-center"
            >
              Contact Sales
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600"
          >
            {['No credit card required', 'Free tier available', 'Setup in 5 minutes'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500/70" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>

          <DashboardPreview />
        </div>
      </section>


      {/* ─── APP PURPOSE SECTION ─── */}
      <section className="py-24 relative bg-white overflow-hidden border-y border-slate-100">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 lg:px-8 relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-20 items-center">
          <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-brand-600 text-sm font-semibold uppercase tracking-wider mb-4"
          >
            Application Purpose
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-slate-900"
          >
            Purpose of <span className="text-gradient">Graxion Flow</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 text-lg leading-relaxed"
          >
            Graxion Flow is a social media management and automation platform that helps businesses create, schedule, and publish content across supported social media platforms from one centralized dashboard.
          </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="grid grid-cols-2 gap-3">
            {[['Create', 'Plan content with AI'], ['Publish', 'Schedule across channels'], ['Engage', 'Reply without the chaos'], ['Measure', 'Track what performs']].map(([title, text], index) => (
              <div key={title} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${index === 0 || index === 3 ? 'translate-y-4' : ''}`}>
                <span className="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">0{index + 1}</span>
                <h3 className="font-bold text-slate-900 mb-1">{title}</h3><p className="text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="py-24 relative overflow-hidden bg-[#f6f8f7]">
        <div className="absolute -top-32 -left-28 h-80 w-80 rounded-full bg-emerald-200/60 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:52px_52px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-sm font-bold uppercase tracking-wider mb-5"
            >
              Powerful Features
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-slate-900"
            >
              Everything You Need to <span className="text-brand-600">Scale</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed"
            >
              A complete toolkit to automate, engage, and grow your business across every channel.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const IconComp = iconMap[f.icon] || Zap;
              return (
                <FeatureCard
                  key={i}
                  icon={IconComp}
                  title={f.title}
                  description={f.description}
                  gradient={f.gradient || 'from-brand-500/5 to-transparent'}
                  delay={i * 0.1}
                  span={f.span || ''}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PLATFORM AUTOMATIONS ─── */}
      <section id="platforms" className="relative py-24 overflow-hidden border-y border-white/[0.05] bg-white/[0.015]">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.035] blur-[140px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-4"
            >
              One platform, every conversation
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold mb-5"
            >
              What you can automate on <span className="text-gradient">each channel</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg leading-relaxed"
            >
              Connect the accounts you already use and let Graxion Flow handle publishing, engagement, and follow-ups from one place.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5">
            <PlatformCard icon={Youtube} name="YouTube" accent="from-red-500/80" delay={0} className="xl:col-span-2" description="Keep your Shorts and community engagement moving without manually watching every comment." capabilities={['Publish and schedule YouTube Shorts', 'View video comments in one workspace', 'Use AI-assisted replies or respond manually']} />
            <PlatformCard icon={Facebook} name="Facebook" accent="from-blue-500/80" delay={0.08} className="xl:col-span-2" description="Turn Page posts, comments, and Messenger conversations into a more responsive customer experience." capabilities={['Publish and schedule Page content', 'Manage comments and AI-assisted replies', 'Automate Messenger and comment responses']} />
            <PlatformCard icon={Instagram} name="Instagram" accent="from-pink-500/80" delay={0.16} className="xl:col-span-2" description="Create faster engagement around your Instagram content while giving interested people a direct path to your inbox." capabilities={['Publish and schedule posts, Reels, and Stories', 'Reply to comments with AI assistance', 'Send automated DMs from comment triggers']} />
            <PlatformCard icon={Linkedin} name="LinkedIn" accent="from-sky-500/80" delay={0.24} className="xl:col-span-2 xl:col-start-2" description="Stay active on professional conversations and keep your LinkedIn content workflow organised." capabilities={['Publish and schedule LinkedIn content', 'Monitor post comments in one view', 'Reply manually or with AI assistance']} />
            <PlatformCard icon={MessageCircle} name="WhatsApp" accent="from-emerald-500/80" delay={0.32} className="xl:col-span-2" description="Build a faster, more consistent way to communicate with customers over WhatsApp." capabilities={['Manage customer conversations centrally', 'Create automated conversation flows', 'Send campaigns and follow-up broadcasts']} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="workflow" className="py-24 relative bg-[#060912] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand-500/[0.09] blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-4"
            >
              Simple Setup
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold text-white"
            >
              Up and Running in <span className="text-brand-400">Minutes</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-[2px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />

            <WorkflowStep number="01" title="Connect Your Accounts" description="Link your supported social media profiles like YouTube or LinkedIn securely." delay={0} />
            <WorkflowStep number="02" title="Create & Schedule" description="Upload your content and schedule posts for optimal times." delay={0.15} />
            <WorkflowStep number="03" title="Automated Publishing" description="Let Graxion Flow automatically publish your content across channels." delay={0.3} />
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[2rem] overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-400" />
            <div className="absolute inset-0 bg-grid-white bg-grid opacity-25" />
            <div className="absolute -bottom-32 -left-24 w-[400px] h-[400px] bg-cyan-300/30 blur-[100px] rounded-full" />

            <div className="relative z-10 p-10 md:p-16 text-center border border-white/20 rounded-[2rem]">
              <h2 className="text-3xl md:text-5xl font-bold mb-5">
                Ready to transform your business?
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
                Join hundreds of businesses already automating their customer communication with {brandName}.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => goAuth('/register')}
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-white hover:bg-emerald-50 text-brand-700 font-semibold flex items-center justify-center gap-2 transition-all shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Free <ArrowRight className="h-5 w-5" />
                </button>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold transition-all text-center"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-16 pb-8 border-t border-white/[0.06] bg-[#040710]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                {logoUrl ? (
                  <img src={logoUrl} alt="Graxion Flow Logo" className="h-7 w-auto opacity-90" />
                ) : (
                  <div className="h-9 w-9 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center">
                    <MessageSquare className="text-white h-4 w-4" />
                  </div>
                )}
                <span className="text-lg font-bold text-white">{brandName}</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
                {tagline}. Empowering modern businesses to automate omnichannel communications intelligently.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3">
                {socialTwitter && (
                  <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {socialLinkedin && (
                  <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                )}
                {socialInstagram && (
                  <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socialYoutube && (
                  <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Features</a></li>
                <li><a href="#workflow" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">How It Works</a></li>
                <li><Link to="/integrations" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Integrations</Link></li>
                <li><Link to="/changelog" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Changelog</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">About</Link></li>
                <li><Link to="/careers" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Careers</Link></li>
                <li><Link to="/contact" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Contact</Link></li>
                <li><Link to="/blog" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Blog</Link></li>
              </ul>
            </div>

            {/* Legal + Contact */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/privacy-policy" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Terms of Service</Link></li>
                <li><Link to="/data-deletion-policy" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Data Deletion</Link></li>
                <li><Link to="/security" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Security</Link></li>
              </ul>
              {(contactEmail || contactPhone) && (
                <div className="mt-6 space-y-2">
                  {contactEmail && (
                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-gray-500 hover:text-brand-400 transition-colors text-sm">
                      <Mail className="w-3.5 h-3.5" /> {contactEmail}
                    </a>
                  )}
                  {contactPhone && (
                    <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-gray-500 hover:text-brand-400 transition-colors text-sm">
                      <Phone className="w-3.5 h-3.5" /> {contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">{footerText}</p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-gray-300 transition-colors">Terms</Link>
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {address}
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
