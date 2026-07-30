import React from 'react';

const Card = ({
  children,
  variant = 'default',
  padding = 'medium',
  elevated = false,
  className = '',
  onClick
}) => {
  const variants = {
    default: 'bg-white/5 border border-white/10',
    elevated: 'bg-white/5 border border-white/10 shadow-lg',
    flat: 'bg-white/[0.02] border border-white/5',
    gradient: 'bg-gradient-to-br from-brand-500/10 to-emerald-400/5 border border-brand-500/20'
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    medium: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6 lg:p-8',
    xl: 'p-6 sm:p-8 lg:p-10'
  };

  return (
    <div
      className={`rounded-xl ${variants[variant]} ${paddings[padding]} ${elevated ? 'shadow-xl' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;