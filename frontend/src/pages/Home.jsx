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
  Youtube
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
    className={`group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1 ${span}`}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
    <div className="relative z-10">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient.replace('/5', '/20')} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-[15px]">{description}</p>
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
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm max-w-xs">{description}</p>
  </motion.div>
);

export default function Home() {
  const navigate = useNavigate();
  const { branding, fetchBranding } = useBrandingStore();
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic branding from Admin Settings (Overridden for Google Compliance)
  const brandName = "Graxion Flow";
  const heroTitle = useMemo(() => branding?.branding_hero_title || "Automate Your Business Communication", [branding]);
  const heroSubtitle = "Deploy AI-powered agents across WhatsApp, Instagram, Telegram, and YouTube. Automate your YouTube channel, manage social media comments, schedule Shorts, and scale your operations effortlessly.";
  const tagline = useMemo(() => branding?.branding_tagline || "The Next-Gen Automation Platform", [branding]);
  const contactEmail = useMemo(() => branding?.branding_contact_email || "support@graxion.com", [branding]);
  const contactPhone = useMemo(() => branding?.branding_contact_phone || "+1 (800) 123-4567", [branding]);
  const footerText = useMemo(() => branding?.branding_footer_text || "© 2026 Graxion Inc. All rights reserved.", [branding]);
  const logoUrl = useMemo(() => branding?.branding_logo_url, [branding]);
  const address = useMemo(() => branding?.branding_address || '', [branding]);
  const socialTwitter = useMemo(() => branding?.branding_social_twitter || '', [branding]);
  const socialLinkedin = useMemo(() => branding?.branding_social_linkedin || '', [branding]);
  const socialInstagram = useMemo(() => branding?.branding_social_instagram || '', [branding]);
  const socialYoutube = useMemo(() => branding?.branding_social_youtube || '', [branding]);

  // Parse features from admin or use defaults
  const features = useMemo(() => {
    // FORCE YOUTUBE FEATURE OVERRIDE FOR GOOGLE COMPLIANCE
    return [
      { icon: 'Bot', title: 'Cognitive AI Agents', description: 'Deploy advanced LLMs that understand context, handle objections, and close deals autonomously across multiple languages.', gradient: 'from-emerald-500/5 to-transparent', span: 'md:col-span-2' },
      { icon: 'Youtube', title: 'YouTube Automation', description: 'Schedule YouTube Shorts, auto-reply to comments, and manage your channel growth on autopilot.', gradient: 'from-red-500/5 to-transparent', span: '' },
      { icon: 'Globe', title: 'Omnichannel Inbox', description: 'WhatsApp, Instagram, Telegram, and Facebook — one unified inbox to manage all conversations.', gradient: 'from-purple-500/5 to-transparent', span: '' },
      { icon: 'BarChart3', title: 'Real-Time Analytics & CRM Sync', description: 'Push qualified leads to HubSpot, Zoho, or Salesforce. Track engagement, token usage, and conversion rates live.', gradient: 'from-cyan-500/5 to-transparent', span: 'md:col-span-2' },
      { icon: 'Shield', title: 'Enterprise Security', description: 'End-to-end encryption, GDPR compliance, role-based access controls, and audit logging built in.', gradient: 'from-amber-500/5 to-transparent', span: '' },
      { icon: 'Workflow', title: 'Visual Flow Builder', description: 'Design complex automation sequences with a drag-and-drop interface. No coding required.', gradient: 'from-blue-500/5 to-transparent', span: '' },
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
    if (isAuthenticated) navigate('/app/dashboard');
    else navigate(path);
  };

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#workflow' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-[#060912] text-white font-sans overflow-x-hidden">
      
      {/* ─── NAVBAR ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#060912]/80 backdrop-blur-xl border-b border-white/[0.06] py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
                <MessageSquare className="text-white h-5 w-5" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-white">
              {brandName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            {navLinks.map(link => (
              link.href.startsWith('#') ? (
                <a key={link.label} href={link.href} className="hover:text-white transition-colors duration-200">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="hover:text-white transition-colors duration-200">{link.label}</Link>
              )
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => goAuth('/login')} className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </button>
            <button
              onClick={() => goAuth('/register')}
              className="px-6 py-2.5 text-sm font-semibold rounded-full bg-brand-500 text-white hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-[0.98]"
            >
              Get Started Free
            </button>
          </div>

          <button className="md:hidden text-gray-300 hover:text-white p-2" onClick={() => setMobileMenuOpen(true)}>
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
                <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
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
      <section className="relative pt-36 pb-16 lg:pt-48 lg:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-brand-500/[0.07] blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/[0.04] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-white bg-grid opacity-30 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 mb-8 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span>{tagline}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.08]"
          >
            <span className="text-white">{heroTitle.split(' ').slice(0, -2).join(' ')} </span>
            <span className="text-gradient">{heroTitle.split(' ').slice(-2).join(' ')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            {heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => goAuth('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(34,197,94,0.25)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)] transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Building Free <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-semibold transition-all backdrop-blur-sm text-center"
            >
              Contact Sales
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500"
          >
            {['No credit card required', 'Free tier available', 'Setup in 5 minutes'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-500/70" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section className="py-16 relative">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { value: 50000, suffix: '+', label: 'Messages Processed' },
              { value: 500, suffix: '+', label: 'Active Users' },
              { value: 99.9, suffix: '%', label: 'Uptime SLA' },
              { value: 24, suffix: '/7', label: 'AI Agent Support' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-4"
            >
              Powerful Features
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold mb-5"
            >
              Everything You Need to <span className="text-gradient">Scale</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 max-w-2xl mx-auto text-lg"
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

      {/* ─── HOW IT WORKS ─── */}
      <section id="workflow" className="py-24 relative">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
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
              className="text-3xl md:text-5xl font-bold"
            >
              Up and Running in <span className="text-gradient">Minutes</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-[2px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />

            <WorkflowStep number="01" title="Connect Your Channels" description="Link your WhatsApp, Instagram, Telegram, or Facebook accounts in one click." delay={0} />
            <WorkflowStep number="02" title="Configure AI Agents" description="Set up intelligent AI agents with custom personalities, knowledge bases, and response rules." delay={0.15} />
            <WorkflowStep number="03" title="Go Live & Scale" description="Start automating conversations, capturing leads, and growing your business instantly." delay={0.3} />
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[2rem] overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent" />
            <div className="absolute inset-0 bg-grid-white bg-grid opacity-20" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 blur-[100px] rounded-full" />

            <div className="relative z-10 p-10 md:p-16 text-center border border-white/[0.06] rounded-[2rem]">
              <h2 className="text-3xl md:text-5xl font-bold mb-5">
                Ready to <span className="text-gradient">Transform</span> Your Business?
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
                Join hundreds of businesses already automating their customer communication with {brandName}.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => goAuth('/register')}
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(34,197,94,0.25)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)] transform hover:-translate-y-0.5"
                >
                  Get Started Free <ArrowRight className="h-5 w-5" />
                </button>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-semibold transition-all text-center"
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
                  <img src={logoUrl} alt={brandName} className="h-7 w-auto opacity-90" />
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
