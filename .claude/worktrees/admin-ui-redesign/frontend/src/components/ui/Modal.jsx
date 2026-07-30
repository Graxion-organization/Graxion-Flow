import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  size = 'medium',
  backdropClass = '',
  disableScroll = true
}) => {
  useEffect(() => {
    if (disableScroll && isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (disableScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, disableScroll]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md w-full',
    medium: 'max-w-2xl w-full',
    lg: 'max-w-4xl w-full',
    xl: 'max-w-5xl w-full',
    full: 'w-full h-full'
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ${backdropClass}`}
        onClick={onClose}
      >
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`relative ${sizes[size]} bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6 max-h-[85vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/6 hover:bg-white/8 text-white/70 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="space-y-4">{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
};

Modal.displayName = 'Modal';

export default Modal;