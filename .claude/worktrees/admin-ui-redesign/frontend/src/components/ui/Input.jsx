import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  size = 'medium',
  variant = 'default',
  icon: LeftIcon,
  iconRight: RightIcon,
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    medium: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  };

  const variantStyles = {
    default: 'bg-white/5 border border-white/10 focus:border-brand-500/50',
    filled: 'bg-white/10 border border-transparent focus:bg-white/15',
    outline: 'bg-transparent border-2 border-white/20 focus:border-brand-500'
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            <LeftIcon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={`${sizes[size]} ${variantStyles[variant]} rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all w-full ${LeftIcon ? 'pl-10' : ''} ${RightIcon ? 'pr-10' : ''} ${error ? 'border-rose-500/50 focus:border-rose-500/50' : ''} ${className}`}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
            <RightIcon size={18} />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {helperText && !error && <p className="text-xs text-white/30">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;