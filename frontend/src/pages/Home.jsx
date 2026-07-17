import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Users
} from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../store';

export default function Home() {
  const navigate = useNavigate();
  const { branding, fetchBranding } = useBrandingStore();
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic branding variables from Admin Settings
  const brandName = useMemo(() => branding?.branding_site_name || "WhatsAgent", [branding]);
  const contactEmail = useMemo(() => branding?.branding_contact_email || "support@graxion.com", [branding]);
  const contactPhone = useMemo(() => branding?.branding_contact_phone || "+1 (800) 123-4567", [branding]);
  const footerText = useMemo(() => branding?.branding_footer_text || "© 2026 Graxion Inc. All rights reserved.", [branding]);
  const logoUrl = useMemo(() => branding?.branding_logo_url, [branding]);

  useEffect(() => {
    fetchBranding().catch(() => {});
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchBranding]);

  useEffect(() => {
    document.title = `${brandName} — Premium Automation by Graxion`;
  }, [brandName]);

  const goAuth = (path) => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
      
      {/* ─── NAVBAR ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/70 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <MessageSquare className="text-white h-5 w-5" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {brandName}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">How it Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Customers</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => goAuth('/login')} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </button>
            <button
              onClick={() => goAuth('/register')}
              className="px-5 py-2.5 text-sm font-semibold rounded-full bg-white text-black hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              Get Started
            </button>
          </div>

          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col p-6">
          <div className="flex justify-end">
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
              <X className="h-8 w-8" />
            </button>
          </div>
          <div className="flex flex-col gap-6 mt-12 text-2xl font-semibold text-center">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <button onClick={() => { setMobileMenuOpen(false); goAuth('/login'); }} className="text-brand-400">Sign In</button>
          </div>
        </div>
      )}

      {/* ─── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
            A Premium Product by <strong className="text-white">Graxion</strong>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            The Ultimate <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-300 to-blue-500">
              Conversational OS
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Supercharge your business with autonomous AI agents across WhatsApp, Instagram, and Telegram. Automate support, qualify leads, and sync with your CRM in real-time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => goAuth('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transform hover:-translate-y-1"
            >
              Start Building Free <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => goAuth('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all backdrop-blur-sm"
            >
              Book a Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── DASHBOARD MOCKUP ─────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-8 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-2xl md:rounded-[2rem] border border-white/10 bg-black/50 p-2 md:p-4 backdrop-blur-xl shadow-2xl shadow-brand-500/10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="rounded-xl overflow-hidden border border-white/5 relative bg-[#0f0f0f]">
            {/* Fake Dashboard UI */}
            <div className="flex h-12 bg-[#1a1a1a] items-center px-4 border-b border-white/5 gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="mx-auto px-4 py-1 rounded bg-black/50 text-xs text-gray-500 flex items-center gap-2 border border-white/5">
                <Shield className="w-3 h-3" /> {brandName} Mission Control
              </div>
            </div>
            <div className="flex h-[400px] md:h-[600px]">
              <div className="w-64 bg-[#111] border-r border-white/5 p-4 hidden md:block">
                <div className="space-y-2">
                  <div className="h-8 bg-white/5 rounded w-full mb-6"></div>
                  {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-white/5 rounded w-3/4"></div>)}
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-6">
                <div className="flex gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex-1 h-24 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl"></div>
                  ))}
                </div>
                <div className="flex-1 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                   <div className="relative flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center animate-pulse-slow">
                        <MessageSquare className="text-brand-400 w-8 h-8" />
                     </div>
                     <div className="w-16 h-[2px] bg-gradient-to-r from-brand-500/50 to-blue-500/50"></div>
                     <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                        <Bot className="text-blue-400 w-8 h-8" />
                     </div>
                     <div className="w-16 h-[2px] bg-gradient-to-r from-blue-500/50 to-purple-500/50"></div>
                     <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                        <Workflow className="text-purple-400 w-8 h-8" />
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FEATURES BENTO GRID ─────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-[#050505] relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Enterprise-Grade <span className="text-brand-400">Intelligence</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to automate your social pipelines, built by Graxion.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-8 rounded-3xl hover:border-brand-500/30 transition-colors group">
              <Bot className="w-12 h-12 text-brand-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Cognitive AI Agents</h3>
              <p className="text-gray-400 leading-relaxed">
                Deploy advanced LLMs (Claude, GPT-4) that understand context, handle objections, and close deals autonomously across multiple languages.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-8 rounded-3xl hover:border-blue-500/30 transition-colors group">
              <Workflow className="w-12 h-12 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Visual Flow Builder</h3>
              <p className="text-gray-400 leading-relaxed">
                Drag and drop your way to complex automation sequences without writing a single line of code.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-8 rounded-3xl hover:border-purple-500/30 transition-colors group">
              <Globe className="w-12 h-12 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Omnichannel</h3>
              <p className="text-gray-400 leading-relaxed">
                WhatsApp, Instagram, Telegram, and Facebook. One unified inbox to rule them all.
              </p>
            </div>
            {/* Feature 4 */}
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full"></div>
              <BarChart3 className="w-12 h-12 text-emerald-400 mb-6 group-hover:scale-110 transition-transform relative z-10" />
              <h3 className="text-2xl font-bold mb-3 relative z-10">Real-Time CRM Sync & Analytics</h3>
              <p className="text-gray-400 leading-relaxed relative z-10 max-w-lg">
                Automatically push qualified leads to HubSpot, Zoho, or Salesforce. Track engagement metrics, token usage, and conversion rates live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="h-6 w-auto grayscale opacity-80" />
                ) : (
                  <MessageSquare className="text-brand-500 h-6 w-6" />
                )}
                <span className="text-lg font-bold text-white">{brandName}</span>
              </div>
              <p className="text-gray-500 max-w-sm">
                A premium product crafted by Graxion. Empowering businesses to automate communications intelligently.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-500">
                <li><a href="#features" className="hover:text-brand-400 transition-colors">Features</a></li>
                <li><Link to="/contact" className="hover:text-brand-400 transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link to="/privacy-policy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-brand-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/data-deletion-policy" className="hover:text-brand-400 transition-colors">Data Deletion Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>{footerText}</p>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-gray-300">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-gray-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
