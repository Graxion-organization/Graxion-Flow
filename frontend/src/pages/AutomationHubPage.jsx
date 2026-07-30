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
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Sparkles className="text-[#FF6A00]" />
            Automation Hub
          </h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Manage AI auto-replies and comment history across all platforms</p>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto w-full md:w-auto custom-scrollbar shrink-0 bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10">
          {PLATFORM_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(`/app/automation/${key}`)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activePlatform === key
                  ? 'text-white shadow-lg shadow-[#FF6A00]/25'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10'
              }`}
              style={activePlatform === key ? { background: '#FF6A00' } : undefined}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
