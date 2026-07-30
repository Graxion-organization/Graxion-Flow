import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Bot, CheckCircle2, ChevronRight, AlertCircle, CreditCard } from 'lucide-react';

export default function ActionGuard({ status, isDark, title, description, mode = 'full' }) {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-[60vh] p-4 sm:p-6 nav-fade-up ${isDark ? 'text-slate-100' : 'text-slate-900'} w-full`}>
      <div className={`max-w-xl w-full p-6 sm:p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-slate-900/80 border-white/10 shadow-black/50 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-slate-200/50 backdrop-blur-xl'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">{title || 'Action Required'}</h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {description || 'You need to complete your setup before you can use this feature.'}
          </p>
        </div>

        <div className="space-y-4">
          <div 
            onClick={() => navigate('/app/integrations')}
            className={`group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
              status?.hasIntegration
                ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                : isDark ? 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                status?.hasIntegration 
                  ? 'bg-emerald-500 text-white' 
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
              }`}>
                {status?.hasIntegration ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
              </div>
              <div>
                <h3 className={`text-base font-bold mb-0.5 ${status?.hasIntegration ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  Connect an Account
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Link a social media platform to get started.
                </p>
              </div>
            </div>
            {!status?.hasIntegration && (
              <ChevronRight className={`shrink-0 transition-transform group-hover:translate-x-1 ${isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
            )}
          </div>
          
          {mode === 'full' && (
            <div 
              onClick={() => navigate('/app/agents')}
              className={`group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                status?.hasAgent
                  ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                  : isDark ? 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  status?.hasAgent 
                    ? 'bg-emerald-500 text-white' 
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
                }`}>
                  {status?.hasAgent ? <CheckCircle2 size={24} /> : <Bot size={24} />}
                </div>
                <div>
                  <h3 className={`text-base font-bold mb-0.5 ${status?.hasAgent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    Create your AI Agent
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Build an AI assistant to handle your messages.
                  </p>
                </div>
              </div>
              {!status?.hasAgent && (
                <ChevronRight className={`shrink-0 transition-transform group-hover:translate-x-1 ${isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
