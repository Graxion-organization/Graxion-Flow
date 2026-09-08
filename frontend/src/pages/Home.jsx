import React, { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Home as HomeIcon,
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
  BadgeCheck,
  Play,
  Layers,
  PieChart,
  TrendingUp,
  MousePointerClick,
  BellRing,
  Eye
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

/* ─── Dashboard Mockup Component ─── */
const DashboardMockup = () => (
  <div className="dashboard-mockup p-1.5 sm:p-2">
    {/* Title bar */}
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
      </div>
      <div className="flex-1 mx-4">
        <div className="max-w-[200px] mx-auto h-5 bg-white/5 rounded-md flex items-center justify-center">
          <span className="text-[10px] text-white/30 font-medium">flow.graxion.in/app</span>
        </div>
      </div>
    </div>
    
    {/* Dashboard content */}
    <div className="flex h-[220px] sm:h-[280px] lg:h-[340px]">
      {/* Sidebar */}
      <div className="w-12 sm:w-14 border-r border-white/5 py-3 flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
          <LayoutDashboard className="w-3.5 h-3.5 text-brand-400" />
        </div>
        {[MessageCircle, Users, Send, BarChart3, Workflow].map((Icon, i) => (
          <div key={i} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
            <Icon className="w-3.5 h-3.5 text-white/30" />
          </div>
        ))}
      </div>
      
      {/* Main area */}
      <div className="flex-1 p-3 sm:p-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
          {[
            { label: 'Messages', value: '12.4K', color: 'text-brand-400', bg: 'bg-brand-500/10' },
            { label: 'Engagement', value: '89%', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Published', value: '234', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((stat) => (
            <div key={stat.label} className="dashboard-mockup-inner p-2 sm:p-3">
              <p className="text-[9px] sm:text-[10px] text-white/40 mb-1">{stat.label}</p>
              <p className={`text-sm sm:text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        
        {/* Chart area */}
        <div className="dashboard-mockup-inner p-3 sm:p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs text-white/40 font-medium">Engagement Overview</span>
            <div className="flex gap-1">
              {['7D', '30D', '90D'].map(p => (
                <span key={p} className={`text-[8px] sm:text-[10px] px-2 py-0.5 rounded ${p === '30D' ? 'bg-brand-500/20 text-brand-400' : 'text-white/30'}`}>{p}</span>
              ))}
            </div>
          </div>
          {/* Mini chart bars */}
          <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-24">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm sm:rounded" style={{ height: `${h}%`, background: `linear-gradient(180deg, rgba(34,197,94,${0.3 + (h/200)}) 0%, rgba(34,197,94,0.05) 100%)` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - hidden on small screens */}
      <div className="hidden lg:block w-48 border-l border-white/5 p-3">
        <p className="text-[10px] text-white/40 font-medium mb-3">Recent Activity</p>
        {[
          { platform: 'Instagram', action: 'Post published', time: '2m ago', color: 'text-pink-400' },
          { platform: 'YouTube', action: 'Comment replied', time: '5m ago', color: 'text-red-400' },
          { platform: 'WhatsApp', action: 'Broadcast sent', time: '12m ago', color: 'text-green-400' },
          { platform: 'Facebook', action: 'Scheduled post', time: '18m ago', color: 'text-blue-400' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 py-2 border-b border-white/[0.03] last:border-0">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${item.color.replace('text-', 'bg-')}`} />
            <div>
              <p className="text-[10px] text-white/60 font-medium">{item.platform}</p>
              <p className="text-[9px] text-white/30">{item.action}</p>
              <p className="text-[8px] text-white/20 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Floating Platform Icon ─── */
const FloatingPlatformIcon = ({ icon: Icon, color, position, delay, size = 'w-10 h-10' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, delay }}
    className={`absolute ${position} ${size} rounded-xl flex items-center justify-center shadow-lg animate-float-slow z-20`}
    style={{ 
      background: `linear-gradient(135deg, ${color}20, ${color}40)`,
      border: `1px solid ${color}30`,
      animationDelay: `${delay}s` 
    }}
  >
    <Icon className="w-5 h-5" style={{ color }} />
  </motion.div>
);

/* ─── How It Works Step ─── */
const FlowStep = ({ number, title, description, icon: Icon, delay, isLast }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="relative flex flex-col items-center text-center flex-1"
  >
    {/* Step circle */}
    <div className="relative mb-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 border border-brand-500/20 flex items-center justify-center shadow-lg shadow-brand-500/10">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-brand-400" />
      </div>
      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-brand-500/30">
        {number}
      </div>
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">{description}</p>
  </motion.div>
);

/* ─── Feature Bento Card ─── */
const BentoFeatureCard = ({ icon: Icon, title, description, delay, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`bento-card p-6 sm:p-8 group cursor-default ${className}`}
  >
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-500/15 to-brand-500/5 border border-brand-200/50 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-brand-500/10 transition-all duration-300">
      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600" />
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm sm:text-[15px]">{description}</p>
  </motion.div>
);

/* ─── Platform Card ─── */
const PlatformShowcaseCard = ({ icon: Icon, name, color, description, capabilities, delay, metaVerified = false }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.45, delay }}
    className="platform-glow group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1"
  >
    <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}18, ${color}35)` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{name}</h3>
        {metaVerified && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1877f2]">
            <BadgeCheck className="h-3.5 w-3.5 fill-[#1877f2] text-white" /> Meta verified
          </span>
        )}
      </div>
    </div>
    <p className="min-h-[48px] text-sm leading-relaxed text-slate-500 mb-4">{description}</p>
    <ul className="space-y-2.5">
      {capabilities.map(cap => (
        <li key={cap} className="flex items-start gap-2 text-sm text-slate-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <span>{cap}</span>
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
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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

  const testimonials = [
    {
      quote: "Graxion Flow basically gave me my weekends back. The AI automation is like having a full-time social media manager who never sleeps. Absolutely a game-changer for our agency.",
      name: "Sarah Jenkins",
      role: "Marketing Director",
      initials: "SJ",
      color: "from-brand-500 to-emerald-400"
    },
    {
      quote: "I was skeptical about automated replies feeling 'robotic', but the AI assistance here feels incredibly natural. Our customer engagement has gone up by 300% since we started.",
      name: "Michael Chen",
      role: "E-commerce Founder",
      initials: "MC",
      color: "from-cyan-500 to-blue-400"
    },
    {
      quote: "The unified dashboard is a lifesaver. No more jumping between 5 different tabs just to reply to comments. It's clean, intuitive, and just works beautifully.",
      name: "Elena Rodriguez",
      role: "Content Creator",
      initials: "ER",
      color: "from-purple-500 to-pink-400"
    }
  ];

  useEffect(() => {
    fetchBranding().catch(() => {});
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchBranding]);

  useEffect(() => {
    document.title = `${brandName} — ${tagline}`;
  }, [brandName, tagline]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

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
      
      {/* ═══════════════════════════════════════════ */}
      {/* ─── NAVBAR ─── */}
      {/* ═══════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/80 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.06)]'
            : 'bg-transparent py-4 sm:py-5'
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
            <span className={`text-xl font-bold tracking-tight transition-colors ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
              {brandName}
            </span>
          </Link>

          <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${isScrolled ? 'text-slate-600' : 'text-white/70'}`}>
            {navLinks.map(link => (
              link.href.startsWith('#') ? (
                <a key={link.label} href={link.href} className={`hover:${isScrolled ? 'text-brand-600' : 'text-white'} transition-colors duration-200`}>{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className={`hover:${isScrolled ? 'text-brand-600' : 'text-white'} transition-colors duration-200`}>{link.label}</Link>
              )
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => goAuth('/login')} className={`px-5 py-2.5 text-sm font-medium transition-colors ${isScrolled ? 'text-slate-600 hover:text-slate-950' : 'text-white/80 hover:text-white'}`}>
              Sign In
            </button>
            <button
              onClick={() => goAuth('/register')}
              className="px-6 py-2.5 text-sm font-semibold rounded-full bg-brand-500 text-white hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-[0.98]"
            >
              Get Started Free
            </button>
          </div>

          <button className={`md:hidden p-2 ${isScrolled ? 'text-slate-700' : 'text-white'}`} onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* ─── MOBILE MENU ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#030712]/98 backdrop-blur-2xl flex flex-col"
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
      </AnimatePresence>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── HERO SECTION (Dark, Premium) ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section id="hero" className="relative pt-28 sm:pt-36 pb-8 lg:pt-44 lg:pb-16 overflow-hidden hero-gradient-mesh min-h-screen flex items-center">
        {/* Animated background mesh orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/[0.08] blur-[150px] rounded-full pointer-events-none animate-mesh-shift" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/[0.06] blur-[120px] rounded-full pointer-events-none animate-mesh-shift" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-brand-500/[0.05] blur-[100px] rounded-full pointer-events-none animate-mesh-shift" style={{ animationDelay: '8s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
            
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white/60 mb-8 backdrop-blur-sm"
              >
                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                <span>AI-Powered Social Media Platform</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]"
              >
                <span className="text-white">Automate Your</span>
                <br />
                <span className="text-white">Social.</span>{' '}
                <span className="text-gradient">Amplify</span>
                <br />
                <span className="text-gradient">Your Brand.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-white/50 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed"
              >
                Create, schedule, and publish content across YouTube, Instagram, Facebook, LinkedIn & WhatsApp — all from one powerful dashboard with AI assistance.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
              >
                <button
                  onClick={() => goAuth('/register')}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] transform hover:-translate-y-0.5 active:scale-[0.98] text-base"
                >
                  Start Free <ArrowRight className="h-5 w-5" />
                </button>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-semibold transition-all text-center backdrop-blur-sm flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" /> Watch Demo
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-white/40"
              >
                {['No credit card required', 'Free tier available', '5-minute setup'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-500/70" />
                    <span>{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Floating platform icons around the mockup */}
              <FloatingPlatformIcon icon={Youtube} color="#FF0000" position="top-0 -left-4 sm:-left-6" delay={0.8} />
              <FloatingPlatformIcon icon={Instagram} color="#E4405F" position="-top-4 right-12 sm:right-20" delay={1.0} />
              <FloatingPlatformIcon icon={Facebook} color="#1877F2" position="top-1/3 -right-4 sm:-right-6" delay={1.2} />
              <FloatingPlatformIcon icon={Linkedin} color="#0A66C2" position="bottom-12 -right-3 sm:-right-5" delay={1.4} />
              <FloatingPlatformIcon icon={MessageCircle} color="#25D366" position="bottom-8 -left-3 sm:-left-5" delay={1.6} />

              {/* Green glow behind mockup */}
              <div className="absolute inset-0 bg-brand-500/[0.06] blur-[60px] rounded-3xl" />
              
              <DashboardMockup />
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8fafc] to-transparent pointer-events-none" />
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── SOCIAL PROOF / STATS BAR ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 bg-[#f8fafc] relative -mt-8">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10"
          >
            {[
              { value: '5', suffix: '+', label: 'Platforms Connected', icon: Globe },
              { value: '10', suffix: 'K+', label: 'Messages Automated', icon: Send },
              { value: '99', suffix: '%', label: 'Uptime Guaranteed', icon: Shield },
              { value: '50', suffix: '+', label: 'Countries Served', icon: Users },
            ].map((stat, i) => (
              <div key={i} className="text-center p-5 rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] hover:border-brand-200 transition-all duration-300">
                <stat.icon className="w-6 h-6 text-brand-500 mx-auto mb-3" />
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
                  <AnimatedCounter target={parseInt(stat.value)} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Platform marquee */}
          <div className="marquee-container py-4">
            <div className="flex animate-marquee gap-12 items-center w-max">
              {[...Array(2)].flatMap((_, setIdx) => 
                ['YouTube', 'Instagram', 'Facebook', 'LinkedIn', 'WhatsApp', 'Telegram'].map((platform, i) => (
                  <div key={`${setIdx}-${i}`} className="flex items-center gap-2 text-slate-400/60 whitespace-nowrap">
                    {platform === 'YouTube' && <Youtube className="w-5 h-5" />}
                    {platform === 'Instagram' && <Instagram className="w-5 h-5" />}
                    {platform === 'Facebook' && <Facebook className="w-5 h-5" />}
                    {platform === 'LinkedIn' && <Linkedin className="w-5 h-5" />}
                    {platform === 'WhatsApp' && <MessageCircle className="w-5 h-5" />}
                    {platform === 'Telegram' && <Send className="w-5 h-5" />}
                    <span className="text-sm font-semibold">{platform}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── WHAT IS GRAXION FLOW? (Product Explainer) ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative bg-white overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-50/50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-6"
              >
                Why Graxion Flow?
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight"
              >
                One Platform to{' '}
                <span className="text-brand-600">Rule All</span>{' '}
                Your Social Channels
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 text-lg leading-relaxed mb-8"
              >
                Stop switching between tabs. Graxion Flow brings YouTube, Instagram, Facebook, LinkedIn, and WhatsApp into a single dashboard where you can create content, schedule posts, manage conversations, and automate engagement — powered by AI.
              </motion.p>

              {/* Value props */}
              <div className="space-y-5">
                {[
                  { icon: LayoutDashboard, title: 'One Dashboard, Every Platform', desc: 'Manage all your social accounts from a single unified interface.' },
                  { icon: Bot, title: 'AI-Powered Smart Replies', desc: 'Let AI handle repetitive conversations while you focus on strategy.' },
                  { icon: CalendarDays, title: 'Schedule & Publish Everywhere', desc: 'Plan your content calendar and auto-publish at the best times.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (i * 0.1) }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 group-hover:bg-brand-100 group-hover:scale-105 transition-all duration-300">
                      <item.icon className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Visual grid */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { num: '01', title: 'Create', text: 'Plan content with AI assistance', icon: Sparkles },
                { num: '02', title: 'Publish', text: 'Schedule across all channels', icon: Send },
                { num: '03', title: 'Engage', text: 'Reply without the chaos', icon: MessageCircle },
                { num: '04', title: 'Measure', text: 'Track what performs best', icon: TrendingUp },
              ].map((card, i) => (
                <div
                  key={card.num}
                  className={`rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] hover:border-brand-200 transition-all duration-300 ${i === 0 || i === 3 ? 'translate-y-4' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                    <card.icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">{card.num}</span>
                  <h3 className="font-bold text-slate-900 mt-1 mb-1">{card.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.text}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>


      {/* Section divider */}
      <div className="section-divider mx-auto max-w-5xl" />


      {/* ═══════════════════════════════════════════ */}
      {/* ─── HOW IT WORKS — Animated Flow ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section id="workflow" className="py-20 sm:py-28 relative bg-white overflow-hidden">
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand-50 blur-[100px] pointer-events-none opacity-50" />
        <div className="max-w-6xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-16 sm:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-5"
            >
              How It Works
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-5"
            >
              Up and Running in{' '}
              <span className="text-brand-600">Minutes</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 max-w-2xl mx-auto text-lg"
            >
              Four simple steps to transform your social media management forever.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] flow-timeline-line" />

            <FlowStep number="1" title="Connect Accounts" description="Link your YouTube, Instagram, Facebook, LinkedIn & WhatsApp in seconds." icon={Layers} delay={0} />
            <FlowStep number="2" title="Create Content" description="Use AI-powered tools to craft engaging posts, reels, and stories." icon={Sparkles} delay={0.15} />
            <FlowStep number="3" title="Schedule Posts" description="Pick the optimal times and let the smart scheduler do the rest." icon={CalendarDays} delay={0.3} />
            <FlowStep number="4" title="Auto-Publish" description="Sit back as Graxion Flow publishes and manages engagement for you." icon={Zap} delay={0.45} isLast />
          </div>
        </div>
      </section>


      {/* Section divider */}
      <div className="section-divider mx-auto max-w-5xl" />


      {/* ═══════════════════════════════════════════ */}
      {/* ─── FEATURES BENTO GRID ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section id="features" className="py-20 sm:py-28 relative overflow-hidden bg-[#f8fafc]">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-100/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-emerald-100/30 blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-5"
            >
              Powerful Features
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 text-slate-900"
            >
              Everything You Need to{' '}
              <span className="text-brand-600">Scale</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed"
            >
              A complete toolkit to create, automate, engage, and grow your business across every social channel.
            </motion.p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <BentoFeatureCard
              icon={Globe}
              title="Social Media Management"
              description="Manage content workflows and oversee all connected social accounts securely from one centralized hub."
              delay={0}
              className="lg:col-span-2"
            />
            <BentoFeatureCard
              icon={Sparkles}
              title="AI Content Creation"
              description="Generate engaging posts, captions, and replies using AI that understands your brand voice."
              delay={0.1}
            />
            <BentoFeatureCard
              icon={CalendarDays}
              title="Smart Scheduling"
              description="Schedule your posts for optimal delivery times across all channels with intelligent recommendations."
              delay={0.2}
            />
            <BentoFeatureCard
              icon={Send}
              title="Automated Publishing"
              description="Automatically publish content directly to YouTube, Facebook, Instagram, LinkedIn, and more."
              delay={0.3}
              className="lg:col-span-2"
            />
            <BentoFeatureCard
              icon={Bot}
              title="AI Marketing Workflows"
              description="Use AI to streamline content ideation, automate responses, and organize your engagement pipeline."
              delay={0.4}
            />
            <BentoFeatureCard
              icon={BarChart3}
              title="Analytics Dashboard"
              description="Monitor engagement, track growth, and measure ROI across all your platforms in real-time."
              delay={0.5}
            />
            <BentoFeatureCard
              icon={Workflow}
              title="Automation Flows"
              description="Build custom automation workflows with our visual flow builder — no coding required."
              delay={0.6}
            />
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── PLATFORM AUTOMATIONS ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section id="platforms" className="relative py-20 sm:py-28 overflow-hidden bg-white">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-50/50 blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-5"
            >
              One platform, every channel
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 text-slate-900"
            >
              What You Can Automate on{' '}
              <span className="text-brand-600">Each Channel</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 text-lg leading-relaxed"
            >
              Connect the accounts you already use and let Graxion Flow handle publishing, engagement, and follow-ups from one place.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <PlatformShowcaseCard
              icon={Youtube}
              name="YouTube"
              color="#FF0000"
              delay={0}
              description="Keep your Shorts and community engagement moving without manually watching every comment."
              capabilities={['Publish and schedule YouTube Shorts', 'View video comments in one workspace', 'Use AI-assisted replies or respond manually']}
            />
            <PlatformShowcaseCard
              icon={Facebook}
              name="Facebook"
              color="#1877F2"
              delay={0.08}
              metaVerified
              description="Turn Page posts, comments, and Messenger conversations into a more responsive customer experience."
              capabilities={['Publish and schedule Page content', 'Manage comments and AI-assisted replies', 'Automate Messenger and comment responses']}
            />
            <PlatformShowcaseCard
              icon={Instagram}
              name="Instagram"
              color="#E4405F"
              delay={0.16}
              metaVerified
              description="Create faster engagement around your Instagram content while giving interested people a direct path to your inbox."
              capabilities={['Publish and schedule posts, Reels, and Stories', 'Reply to comments with AI assistance', 'Send automated DMs from comment triggers']}
            />
            <PlatformShowcaseCard
              icon={Linkedin}
              name="LinkedIn"
              color="#0A66C2"
              delay={0.24}
              description="Stay active on professional conversations and keep your LinkedIn content workflow organised."
              capabilities={['Publish and schedule LinkedIn content', 'Monitor post comments in one view', 'Reply manually or with AI assistance']}
            />
            <PlatformShowcaseCard
              icon={MessageCircle}
              name="WhatsApp"
              color="#25D366"
              delay={0.32}
              metaVerified
              description="Build a faster, more consistent way to communicate with customers over WhatsApp."
              capabilities={['Manage customer conversations centrally', 'Create automated conversation flows', 'Send campaigns and follow-up broadcasts']}
            />
            {/* Coming soon card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.4 }}
              className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-500 mb-2">More Coming Soon</h3>
              <p className="text-sm text-slate-400">Telegram, Twitter/X and more integrations are on the way.</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── TESTIMONIALS ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative bg-[#f8fafc] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-100/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-5"
            >
              Testimonials
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4"
            >
              Real People,{' '}
              <span className="text-brand-600">Real Results</span>
            </motion.h2>
          </div>

          {/* Testimonial carousel */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="testimonial-card p-8 sm:p-12 relative"
              >
                {/* Quote icon */}
                <div className="absolute top-8 right-8 text-brand-100 opacity-40">
                  <svg width="50" height="40" viewBox="0 0 45 36" fill="currentColor">
                    <path d="M13.5 0C6.04416 0 0 6.04416 0 13.5V36H18V13.5H9C9 8.52943 13.0294 4.5 18 4.5V0H13.5ZM40.5 0C33.0442 0 27 6.04416 27 13.5V36H45V13.5H36C36 8.52943 40.0294 4.5 45 4.5V0H40.5Z" />
                  </svg>
                </div>
                
                <div className="flex items-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                </div>
                
                <p className="text-slate-700 text-lg sm:text-xl leading-relaxed mb-8 max-w-3xl relative z-10">
                  "{testimonials[activeTestimonial].quote}"
                </p>
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonials[activeTestimonial].color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {testimonials[activeTestimonial].initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{testimonials[activeTestimonial].name}</h4>
                    <p className="text-sm text-slate-500">{testimonials[activeTestimonial].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-8 h-2.5 bg-brand-500' : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── CTA SECTION ─── */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative overflow-hidden bg-white">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[2rem] overflow-hidden"
          >
            {/* Background */}
            <div className="cta-gradient absolute inset-0" />
            <div className="absolute inset-0 bg-grid-white bg-grid opacity-20" />
            <div className="absolute -bottom-32 -left-24 w-[400px] h-[400px] bg-white/10 blur-[100px] rounded-full" />
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-white/10 blur-[80px] rounded-full" />

            <div className="relative z-10 p-10 md:p-16 lg:p-20 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 text-white"
              >
                Ready to Transform Your{' '}
                <span className="underline decoration-white/30 underline-offset-4">Social Media?</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-white/80 text-lg max-w-2xl mx-auto mb-10"
              >
                Join thousands of businesses already automating their social media management with {brandName}. Start free, no credit card needed.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={() => goAuth('/register')}
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-white hover:bg-emerald-50 text-brand-700 font-bold flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                >
                  Start Free <ArrowRight className="h-5 w-5" />
                </button>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold transition-all text-center backdrop-blur-sm"
                >
                  Talk to Sales
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* ─── FOOTER ─── */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="pt-16 pb-8 bg-[#030712]">
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
                AI-powered social media management platform. Create, schedule, publish, and automate across every channel from one dashboard.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3">
                {socialTwitter && (
                  <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10 transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {socialLinkedin && (
                  <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10 transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                )}
                {socialInstagram && (
                  <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10 transition-all">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socialYoutube && (
                  <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10 transition-all">
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

      {/* ═══════════════════════════════════════════ */}
      {/* ─── FLOATING DYNAMIC ISLAND PILL (MOBILE) ─── */}
      {/* ═══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-5 sm:bottom-7 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 p-1.5 sm:p-2.5 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-black/5">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Home"
          >
            <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400" />
            <span className="text-[11px] sm:text-xs">Home</span>
          </button>

          <a
            href="#features"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Features"
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">Features</span>
          </a>

          <a
            href="#platforms"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Channels"
          >
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <span className="text-[11px] sm:text-xs">Channels</span>
          </a>

          <button
            onClick={() => goAuth('/login')}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Sign In"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
            <span className="text-[11px] sm:text-xs">Sign In</span>
          </button>

          <button
            onClick={() => goAuth('/register')}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-500 to-emerald-500 hover:from-brand-400 hover:to-emerald-400 shadow-md shadow-brand-500/30 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[11px] sm:text-xs">Start</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
