import React from 'react';
import { Shield, Trash2, Clock, CheckCircle2, AlertTriangle, ArrowRight, Lock, Mail } from 'lucide-react';

export default function DataDeletion() {
  const steps = [
    {
      title: "Step 1: Request Deletion",
      desc: "Go to your account settings and initiate the data deletion process. You'll be asked to provide a reason for leaving.",
      icon: Trash2,
      color: "blue"
    },
    {
      title: "Step 2: Multi-Step Verification",
      desc: "For your security, we'll send 3 unique verification codes to your registered email. You must enter all 3 codes correctly.",
      icon: Lock,
      color: "purple"
    },
    {
      title: "Step 3: Immediate Account Disabling",
      desc: "Once verified, your account is immediately disabled. All automated tasks, bots, and agents will be paused.",
      icon: AlertTriangle,
      color: "amber"
    },
    {
      title: "Step 4: 30-Day Grace Period",
      desc: "Your data is kept for 30 days. You can cancel the request at any time during this period by logging in and clicking 'Restore'.",
      icon: Clock,
      color: "green"
    },
    {
      title: "Step 5: Permanent Deletion",
      desc: "After 30 days, all your data, including profile, connected accounts, and chat history, is permanently deleted from our servers.",
      icon: CheckCircle2,
      color: "red"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-bold mb-6">
            <Shield size={16} /> Data Privacy & Deletion
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Your Data, Your Choice.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We believe in complete transparency. If you decide to leave our platform, 
            we make it simple and secure to permanently delete your data.
          </p>
        </div>
      </div>

      {/* Process Section */}
      <div className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">How the Deletion Process Works</h2>
          
          <div className="grid md:grid-cols-1 gap-8 relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100 hidden md:block" />
            
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-6 relative group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-110 shadow-lg
                  ${step.color === 'blue' ? 'bg-blue-600 text-white' : 
                    step.color === 'purple' ? 'bg-purple-600 text-white' :
                    step.color === 'amber' ? 'bg-amber-500 text-white' :
                    step.color === 'green' ? 'bg-green-600 text-white' :
                    'bg-red-600 text-white'}`}>
                  <step.icon size={28} />
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed max-w-2xl">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Shield size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Maximum Security Verification</h3>
                <p className="text-gray-400 leading-relaxed mb-6">
                  To prevent unauthorized account deletions, we require a **3-step OTP verification** sent to your registered email. 
                  This ensures that only the rightful owner can initiate a data wipe. 
                  Once confirmed, the process is automated and follows strict privacy protocols.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Multi-factor Auth
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500" /> 30-Day Recovery
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Automated Purge
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 px-6 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-8">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Can I stop the deletion once it's started?</h4>
            <p className="text-gray-600">Yes! You have 30 days from the moment of verification to cancel the request. Simply log in to your account and click the "Cancel Deletion Request" button on your dashboard.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">What data exactly gets deleted?</h4>
            <p className="text-gray-600">Everything. We purge your personal profile, all connected social media tokens, API keys, AI agent configurations, and every message in your conversation history.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Why do you need 3 OTPs?</h4>
            <p className="text-gray-600">This is an extra layer of security to ensure that account deletion—which is irreversible after 30 days—is a deliberate and verified action by the account owner.</p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-20 text-center border-t border-gray-100">
        <h3 className="text-2xl font-bold mb-6">Ready to manage your privacy?</h3>
        <a href="/app/settings" className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">
          Go to Settings <ArrowRight size={18} />
        </a>
      </div>
    </div>
  );
}
