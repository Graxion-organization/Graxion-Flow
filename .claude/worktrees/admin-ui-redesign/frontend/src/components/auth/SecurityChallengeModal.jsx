import React, { useState, useEffect } from 'react';
import { Shield, Key, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecurityChallengeModal = ({ isOpen, type, onVerify, onCancel, isLoading }) => {
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaTask, setCaptchaTask] = useState({ q: '', a: 0 });
  const [error, setError] = useState('');

  // Generate a simple but clean math captcha
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaTask({
      q: `${num1} + ${num2}`,
      a: num1 + num2
    });
    setCaptchaInput('');
  };

  useEffect(() => {
    if (isOpen && type === 'require_captcha') {
      generateCaptcha();
    }
    if (isOpen) {
      setError('');
      setOtpCode(['', '', '', '', '', '']);
    }
  }, [isOpen, type]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (type === 'require_captcha') {
      if (parseInt(captchaInput) !== captchaTask.a) {
        setError('Incorrect CAPTCHA answer. Please try again.');
        generateCaptcha();
        return;
      }
      onVerify({ captchaToken: 'verified_custom_captcha' });
    } else {
      const code = otpCode.join('');
      if (code.length < 6) {
        setError('Please enter the full 6-digit code.');
        return;
      }
      onVerify({ otpCode: code });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
        >
          {/* Decorative Gradient */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

          <div className="text-center mb-8">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${type === 'require_otp' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
              {type === 'require_otp' ? <Key className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {type === 'require_otp' ? 'Enter Verification Code' : 'Security Check'}
            </h2>
            <p className="text-gray-400 text-sm">
              {type === 'require_otp' 
                ? 'We sent a 6-digit security code to your email. Please enter it below to continue.' 
                : 'To protect your account, please complete this quick verification.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'require_otp' ? (
              <div className="flex justify-center gap-3">
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="text-2xl font-mono tracking-widest text-blue-400 select-none">
                    {captchaTask.q} = ?
                  </span>
                  <button 
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="Enter answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-center text-lg focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-rose-500 text-sm bg-rose-500/10 p-3 rounded-xl"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/20 ${
                  type === 'require_otp' 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <Shield className="w-3 h-3 text-emerald-500" />
              Protected by Graxion Security Engine
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SecurityChallengeModal;
