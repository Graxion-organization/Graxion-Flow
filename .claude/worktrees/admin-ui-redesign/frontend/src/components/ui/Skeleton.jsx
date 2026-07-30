import React from 'react';

const Skeleton = ({
  variant = 'text',
  width = 'full',
  height = 'medium',
  className = '',
  animation = true
}) => {
  const variants = {
    text: 'h-4 sm:h-5 rounded',
    title: 'h-6 sm:h-7 rounded',
    subtitle: 'h-3.5 sm:h-4 rounded',
    circle: 'rounded-full',
    rectangular: 'rounded-xl',
    button: 'h-8 sm:h-9 rounded-full'
  };

  const widths = {
    xs: 'w-6 sm:w-8',
    sm: 'w-8 sm:w-10',
    medium: 'w-10 sm:w-12',
    lg: 'w-12 sm:w-16',
    xl: 'w-16 sm:w-20',
    full: 'w-full',
    half: 'w-1/2',
    third: 'w-1/3'
  };

  const heights = {
    sm: 'h-3',
    medium: 'h-4',
    lg: 'h-5',
    xl: 'h-6'
  };

  const baseClasses = `bg-white/10 ${variants[variant]} ${widths[width]} ${heights[height]} ${className}`;

  if (animation) {
    return (
      <div className={`${baseClasses} animate-pulse`} />
    );
  }

  return <div className={baseClasses} />;
};

export default Skeleton;