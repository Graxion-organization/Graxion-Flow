import React, { useState, useEffect } from 'react';

import { ShieldCheck, AlertTriangle, XCircle, Activity, MessageCircle, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { whatsappAPI } from '../services/api';

export default function QualityRatingPage() {
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuality = async () => {
      try {
        setLoading(true);
        // 1. Get all accounts to find the ID of the connected one
        const accountsRes = await whatsappAPI.getAll();
        const accounts = accountsRes.data?.data?.accounts || [];
        
        if (accounts.length === 0) {
          setError("No WhatsApp accounts connected.");
          setLoading(false);
          return;
        }

        // Get the first active account
        const activeAccount = accounts[0];

        // 2. Fetch quality rating from our backend which calls Meta API
        const qualityRes = await whatsappAPI.getQualityRating(activeAccount._id);
        const data = qualityRes.data?.data;
        
        setAccountStatus({
          qualityRating: data.qualityRating || 'UNKNOWN', // GREEN, YELLOW, RED
          messagingLimit: data.messagingLimit ? data.messagingLimit.replace('TIER_', '') : 'UNKNOWN',
          status: data.status ? data.status.toUpperCase() : 'UNKNOWN',
          phone: data.phone || activeAccount.displayPhoneNumber || 'Unknown Phone',
          nameStatus: data.nameStatus || 'UNKNOWN'
        });
      } catch (err) {
        console.error("Failed to fetch quality rating:", err);
        setError("Failed to load Meta account details.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuality();
  }, []);

  const getQualityColor = (rating) => {
    switch (rating) {
      case 'GREEN': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'YELLOW': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'RED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20';
    }
  };

  const getQualityIcon = (rating) => {
    switch (rating) {
      case 'GREEN': return <ShieldCheck className="w-12 h-12 text-green-400" />;
      case 'YELLOW': return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
      case 'RED': return <XCircle className="w-12 h-12 text-red-400" />;
      default: return <Activity className="w-12 h-12 text-neutral-400" />;
    }
  };

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Account Quality</h1>
          <p className="text-neutral-400">Monitor your Meta WhatsApp business account standing and limits.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${getQualityColor(accountStatus.qualityRating)} flex flex-col items-center justify-center text-center`}
              >
                {getQualityIcon(accountStatus.qualityRating)}
                <h2 className="text-xl font-bold mt-4">Quality Rating: {accountStatus.qualityRating}</h2>
                <p className="text-sm mt-2 opacity-80">
                  {accountStatus.qualityRating === 'GREEN' ? 'Your account is in good standing.' : 
                   accountStatus.qualityRating === 'YELLOW' ? 'Warning: Watch your block rate.' : 
                   accountStatus.qualityRating === 'RED' ? 'Critical: Your account is at risk.' : 'Status unknown.'}
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center text-center"
              >
                <MessageCircle className="w-12 h-12 text-blue-400 mb-4" />
                <h2 className="text-xl font-bold text-white">Messaging Limit</h2>
                <p className="text-2xl font-black text-blue-400 mt-2">{accountStatus.messagingLimit} <span className="text-sm font-normal text-neutral-400">/ day</span></p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center text-center"
              >
                <BarChart2 className="w-12 h-12 text-purple-400 mb-4" />
                <h2 className="text-xl font-bold text-white">Phone Number</h2>
                <p className="text-lg font-medium text-neutral-300 mt-2">{accountStatus.phone}</p>
                <p className="text-sm text-green-400 mt-1">{accountStatus.status}</p>
              </motion.div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">How to maintain a High Quality Rating?</h3>
              <ul className="space-y-3 text-neutral-300 list-disc list-inside">
                <li>Ensure all contacts have explicitly opted-in to receive messages from you.</li>
                <li>Send highly personalized and relevant messages.</li>
                <li>Avoid sending too many marketing messages in a short time frame.</li>
                <li>Make sure your Business Profile is completely filled out with accurate information.</li>
                <li>Monitor user block rates and feedback carefully.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
