import React from 'react';
import { motion } from 'framer-motion';
import Card from './Card';
import Skeleton from './Skeleton';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'brand',
  trend,
  description,
  loading = false,
  delay = 0,
  onClick
}) => {
  const colorConfig = {
    brand: { bg: 'bg-brand-500/10', text: 'text-brand-400', border: 'border-brand-500/10' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/10' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/10' },
    error: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/10' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/10' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/10' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/10' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/10' }
  };

  const { bg, text, border } = colorConfig[color] || colorConfig.brand;

  if (loading) {
    return (
      <Card variant="default" padding="medium">
        <div className="flex justify-between items-start mb-4">
          <Skeleton variant="circle" size="sm" />
          <Skeleton variant="text" width="sm" />
        </div>
        <Skeleton variant="title" width="full" />
        <Skeleton variant="text" width="half" className="mt-2" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={onClick}
    >
      <Card
        variant="default"
        padding="medium"
        className="group hover:border-white/10 transition-all duration-300"
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${bg} ${text}`}>
            {Icon && <Icon className="w-5 h-5" />}
          </div>
          {trend !== undefined && trend !== null && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              trend > 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}>
              {trend > 0 ? '▲' : '▼'}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</h3>
        <p className="text-2xl font-bold mt-1 text-white">{value ?? '—'}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </Card>
    </motion.div>
  );
};

export default StatCard;