const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  rounded = 'full',
  className = ''
}) => {
  const variants = {
    default: 'bg-white/10 text-white border border-white/10',
    primary: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dark: 'bg-white/5 text-white border-white/10',
    outline: 'bg-transparent text-white border-white/10',
    ghost: 'bg-transparent text-white/60 hover:bg-white/10'
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-sm',
    medium: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const radius = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
    none: 'rounded-none'
  };

  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap ${variants[variant]} ${sizes[size]} ${radius[rounded]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;