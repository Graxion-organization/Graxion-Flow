import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Bot, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

export default function OnboardingGateway({ status, isDark }) {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] p-6 nav-fade-up ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      <div className={`max-w-2xl w-full p-8 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900/50 border-white/10 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-3">Complete Your Setup</h1>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Welcome aboard! Before accessing the dashboard, you need to connect a social media account and create your first AI agent.
          </p>
        </div>

        <div className="space-y-4">
          {/* Step 1: Integrations */}
          <div 
            onClick={() => navigate('/app/integrations')}
            className={`group flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer ${
              status.hasIntegration
                ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                : isDark ? 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                status.hasIntegration 
                  ? 'bg-emerald-500 text-white' 
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
              }`}>
                {status.hasIntegration ? <CheckCircle2 size={24} /> : <Smartphone size={24} />}
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-1 ${status.hasIntegration ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  1. Connect an Account
                </h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Link WhatsApp, Instagram, Facebook, or Telegram to start capturing leads and messages.
                </p>
              </div>
            </div>
            {!status.hasIntegration && (
              <ChevronRight className={`shrink-0 transition-transform group-hover:translate-x-1 ${isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
            )}
          </div>

          {/* Step 2: Agent */}
          <div 
            onClick={() => navigate('/app/agents')}
            className={`group flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer ${
              status.hasAgent
                ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                : isDark ? 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                status.hasAgent 
                  ? 'bg-emerald-500 text-white' 
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
              }`}>
                {status.hasAgent ? <CheckCircle2 size={24} /> : <Bot size={24} />}
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-1 ${status.hasAgent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  2. Create your AI Agent
                </h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Build and train an AI assistant to handle your connected accounts automatically.
                </p>
              </div>
            </div>
            {!status.hasAgent && (
              <ChevronRight className={`shrink-0 transition-transform group-hover:translate-x-1 ${isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
            )}
          </div>
        </div>

        <div className={`mt-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Need help? Contact support or check our integration guides.
        </div>
      </div>
    </div>
  );
}
