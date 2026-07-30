import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleNext = () => setStep((s) => s + 1);

  const handleScrape = () => {
    setIsScraping(true);
    setTimeout(() => {
      setIsScraping(false);
      handleNext();
    }, 2500);
  };

  const finishOnboarding = () => {
    // In a real app, save the onboarding state to the user profile
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-text font-sans">
      <div className="max-w-2xl w-full">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface border border-border'}`} />
          ))}
        </div>

        {/* Step 1: The Goal */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || 'Friend'}.</h1>
            <p className="text-text/70 text-lg mb-8">What's the #1 thing eating up your time right now?</p>
            
            <div className="grid gap-4">
              {[
                { id: 'support', title: 'Answering FAQs on WhatsApp', icon: MessageSquare },
                { id: 'leads', title: 'Capturing leads on my website', icon: Bot },
                { id: 'sales', title: 'Chasing abandoned carts', icon: Briefcase },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setGoal(item.id); handleNext(); }}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border border-border bg-surface hover:border-accent/30 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center text-accent shadow-sm">
                      <item.icon size={24} />
                    </div>
                    <span className="text-lg font-medium">{item.title}</span>
                  </div>
                  <ChevronRight className="text-text/40 group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Training */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-2">Let's make your AI smart.</h1>
            <p className="text-text/70 text-lg mb-8">Enter your website URL so your AI teammate can learn your business instantly.</p>
            
            <div className="p-1 rounded-2xl bg-surface border border-border flex items-center mb-6 shadow-sm">
              <input 
                type="url" 
                placeholder="https://yourwebsite.com" 
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-transparent border-none text-text px-4 py-3 outline-none text-lg placeholder:text-text/40"
              />
              <button 
                onClick={handleScrape}
                disabled={!websiteUrl || isScraping}
                className="bg-accent hover:bg-hover text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
              >
                {isScraping ? 'Reading website...' : 'Train AI'}
              </button>
            </div>

            {isScraping && (
              <div className="flex flex-col items-center justify-center py-8 text-text/70">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
                <p>Reading your return policy, pricing, and FAQs...</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Aha Moment */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Your AI Teammate is ready!</h1>
            <p className="text-text/70 text-lg mb-8">They read {websiteUrl || 'your website'} and know everything about your business.</p>
            
            <div className="bg-surface border border-border rounded-3xl p-8 mb-8 text-left max-w-md mx-auto shadow-sm">
              <p className="text-sm text-text/60 font-medium mb-4">Try it right now on your phone:</p>
              <div className="bg-white rounded-xl p-4 border border-border flex gap-3 items-center shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-[#25D366] flex items-center justify-center text-white">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <p className="font-semibold text-text">Text "Hi" to:</p>
                  <p className="text-2xl font-bold text-primary tracking-wider">+1 800 AI-DEMO</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleNext}
              className="bg-accent hover:bg-hover text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors w-full shadow-sm"
            >
              Looks good! Let's connect my real WhatsApp
            </button>
          </div>
        )}

        {/* Step 4: Connect Channel */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
            <h1 className="text-3xl font-bold mb-2">Give them the tools to work.</h1>
            <p className="text-text/70 text-lg mb-8">Connect your WhatsApp Business account.</p>
            
            <div className="bg-surface border border-border rounded-3xl p-12 mb-8 flex flex-col items-center justify-center shadow-sm">
              {/* Fake QR Code */}
              <div className="w-48 h-48 bg-white border border-border p-2 rounded-xl mb-6 shadow-sm">
                <div className="w-full h-full bg-surface flex items-center justify-center text-text/50 font-mono text-sm text-center">
                  [QR CODE PLACEHOLDER]
                </div>
              </div>
              <p className="text-text/70">Scan this QR code using WhatsApp on your phone.</p>
            </div>

            <button 
              onClick={finishOnboarding}
              className="text-text/60 hover:text-accent font-medium underline"
            >
              Skip for now, I'll do this later
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
