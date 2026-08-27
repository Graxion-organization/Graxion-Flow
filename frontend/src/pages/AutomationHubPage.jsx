import React, { useEffect, useState } from 'react';
import { Youtube, Instagram, Facebook, Sparkles, Linkedin } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const PLATFORM_TABS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

export default function AutomationHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  // Extract active platform from pathname, default to instagram
  const activePlatform = location.pathname.split('/').pop() || 'instagram';

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 dark:bg-[#0b101e] animate-fade-in z-10">
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-3 px-2 sm:px-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-[#FF4500] flex items-center justify-center shadow-lg shadow-[#FF6A00]/20 shrink-0">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
              Automation Hub
            </h1>
            <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400">Manage AI replies across platforms</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto w-full md:w-auto shrink-0 bg-white border-slate-200 shadow-sm dark:bg-[#151b2b] dark:border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {PLATFORM_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(`/app/automation/${key}`)}
              className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap ${
                activePlatform === key
                  ? 'text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
              }`}
              style={activePlatform === key ? { background: '#FF6A00' } : undefined}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6">
        <Outlet />
      </div>
    </div>
  );
}
