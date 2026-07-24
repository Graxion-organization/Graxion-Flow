import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield, Check, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { fetchCsrfToken } from '../../services/api';
import toast from 'react-hot-toast';

export const openCookieConsentModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open_cookie_consent'));
  }
};

export default function CookieConsentModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always required
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const handleOpenModal = () => setIsVisible(true);
    window.addEventListener('open_cookie_consent', handleOpenModal);

    const consent = localStorage.getItem('graxion_cookie_consent');
    if (!consent) {
      // Delay entrance slightly for smooth UX
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('open_cookie_consent', handleOpenModal);
      };
    }

    return () => window.removeEventListener('open_cookie_consent', handleOpenModal);
  }, []);

  const requestBrowserAccess = async () => {
    try {
      // Storage Access API for Safari / Mobile Webviews / Chrome cross-site cookies
      if (typeof document !== 'undefined' && document.requestStorageAccess) {
        await document.requestStorageAccess().catch(() => {});
      }
      // Instantly trigger CSRF token fetch to set & verify secure cookies
      await fetchCsrfToken();
    } catch (err) {
      console.warn('Browser storage access request info:', err);
    }
  };

  const handleAcceptAll = async () => {
    const consentData = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('graxion_cookie_consent', JSON.stringify(consentData));
    await requestBrowserAccess();
    toast.success('Cookie permissions granted & session cookies activated!');
    setIsVisible(false);
  };

  const handleSavePreferences = async () => {
    const consentData = {
      ...preferences,
      essential: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('graxion_cookie_consent', JSON.stringify(consentData));
    await requestBrowserAccess();
    toast.success('Preferences saved!');
    setIsVisible(false);
  };

  const handleEssentialOnly = async () => {
    const consentData = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('graxion_cookie_consent', JSON.stringify(consentData));
    await requestBrowserAccess();
    toast.success('Essential cookies allowed!');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-6 duration-500 font-sans">
      <div className="bg-[#0b111d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-slate-200 relative overflow-hidden">
        {/* Top Glow Divider */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6A00] to-transparent opacity-80" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#FF8A00] p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(255,106,0,0.35)] shrink-0">
              <div className="w-full h-full bg-[#070B12] rounded-[10px] flex items-center justify-center">
                <Cookie size={20} className="text-[#FF8A00]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 tracking-tight">
                Cookie Preferences
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6A00]/15 text-[#FF8A00] font-semibold border border-[#FF6A00]/30 uppercase tracking-wider">
                  Privacy Policy
                </span>
              </h3>
              <p className="text-xs text-slate-400">Essential session & security cookies</p>
            </div>
          </div>
          <button
            onClick={handleEssentialOnly}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
            title="Accept Essential Only"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          We use cookies to maintain secure login sessions, protect CSRF requests, and improve application functionality. 
          By accepting, you agree to our processing of essential authentication cookies.
        </p>

        {/* Accordion / Customize Preferences */}
        {showDetails && (
          <div className="space-y-2.5 my-3 p-3 bg-[#070B12]/80 rounded-xl border border-white/5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#FF8A00]" />
                <div>
                  <span className="font-semibold text-slate-200 block">Strictly Necessary</span>
                  <span className="text-[10px] text-slate-400">Auth, CSRF security, & active sessions</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">Required</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-200 block">Performance & Health</span>
                  <span className="text-[10px] text-slate-400">System diagnostics & feature evaluation</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="w-4 h-4 rounded accent-[#FF6A00] bg-[#0B1220] border-white/10 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAcceptAll}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(255,106,0,0.3)] hover:shadow-[0_6px_22px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Accept All
            </button>

            <button
              onClick={showDetails ? handleSavePreferences : handleEssentialOnly}
              className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs rounded-xl border border-white/10 transition-all text-center"
            >
              {showDetails ? 'Save Choice' : 'Essential Only'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 border-t border-white/5">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[#FF8A00] hover:text-[#FFC48D] transition-colors font-medium"
            >
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showDetails ? 'Hide Preferences' : 'Customize Cookies'}
            </button>

            <div className="flex items-center gap-2">
              <Link to="/privacy-policy" className="hover:text-slate-200 transition-colors underline underline-offset-2">
                Privacy
              </Link>
              <span>•</span>
              <Link to="/terms-of-service" className="hover:text-slate-200 transition-colors underline underline-offset-2">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
