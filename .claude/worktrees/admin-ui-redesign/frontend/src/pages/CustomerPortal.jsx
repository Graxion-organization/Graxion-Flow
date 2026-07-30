import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, MessageSquare, ToggleRight, XCircle } from 'lucide-react';

export default function CustomerPortal() {
  const [optIn, setOptIn] = useState(true);

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex justify-center items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-neutral-700 bg-neutral-800/50">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Privacy Portal
          </h1>
          <p className="text-neutral-400 mt-2">Manage your communication preferences and data.</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-neutral-400" />
              Communication Preferences
            </h2>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-700 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-lg">WhatsApp Updates</h3>
                <p className="text-neutral-400 text-sm mt-1">Receive order updates, alerts, and promotional messages on WhatsApp.</p>
              </div>
              <button 
                onClick={() => setOptIn(!optIn)}
                className={`p-2 rounded-full transition-colors ${optIn ? 'text-green-400 bg-green-400/10' : 'text-neutral-500 bg-neutral-800'}`}
              >
                <ToggleRight className={`w-8 h-8 ${optIn ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              Data Deletion
            </h2>
            <div className="bg-red-500/10 p-6 rounded-xl border border-red-500/20">
              <h3 className="font-medium text-lg text-red-400">Request Account Deletion</h3>
              <p className="text-red-400/80 text-sm mt-1 mb-4">Permanently delete your profile and all associated conversation history from our systems.</p>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium">
                Submit Deletion Request
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
