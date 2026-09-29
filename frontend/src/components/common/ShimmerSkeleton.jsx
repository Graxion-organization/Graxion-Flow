import React from 'react';

/**
 * Single Shimmer Block with reflective light-sweep animation
 */
export const ShimmerBlock = ({ className = '', style = {} }) => {
  return (
    <div
      className={`shimmer-sweep rounded-xl bg-slate-200/90 dark:bg-white/10 ${className}`}
      style={style}
    />
  );
};

/**
 * Reusable Metric / KPI Data Card Skeleton
 */
export const DataCardSkeleton = ({ isDark = false, className = '' }) => {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200/90'
      } ${className}`}
    >
      {/* Top Row: Label & Icon */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <ShimmerBlock className="h-3 w-24 sm:w-28 rounded-md" />
        <ShimmerBlock className="h-9 w-9 rounded-xl shrink-0" />
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5">
        <ShimmerBlock className="h-7 sm:h-8 w-32 sm:w-36 rounded-lg" />
      </div>

      {/* Bottom Subtext / Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 mt-3">
        <ShimmerBlock className="h-2.5 w-20 rounded-md" />
        <ShimmerBlock className="h-2.5 w-12 rounded-md" />
      </div>
    </div>
  );
};

/**
 * Grid of Data Cards Skeleton
 */
export const DataCardGridSkeleton = ({ count = 4, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', isDark = false }) => {
  return (
    <div className={`grid ${cols} gap-3.5 sm:gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <DataCardSkeleton key={i} isDark={isDark} />
      ))}
    </div>
  );
};

/**
 * Quota / Progress Banner Skeleton
 */
export const QuotaBannerSkeleton = ({ isDark = false }) => {
  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-sm overflow-hidden relative ${
        isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="space-y-2">
          <ShimmerBlock className="h-5 w-44 rounded-md" />
          <ShimmerBlock className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-9 w-24 rounded-xl" />
          <ShimmerBlock className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Progress Bar Placeholder */}
      <div className="space-y-1.5 pt-2">
        <div className="flex justify-between items-center">
          <ShimmerBlock className="h-3 w-32 rounded-md" />
          <ShimmerBlock className="h-3 w-16 rounded-md" />
        </div>
        <ShimmerBlock className="h-2.5 w-full rounded-full" />
      </div>
    </div>
  );
};

/**
 * Chart Widget Card Skeleton
 */
export const ChartCardSkeleton = ({ titleWidth = 'w-36', height = 'h-72', isDark = false, className = '' }) => {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 shadow-xs relative overflow-hidden ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <ShimmerBlock className={`h-4 ${titleWidth} rounded-md`} />
          <ShimmerBlock className="h-3 w-48 rounded-md opacity-70" />
        </div>
        <ShimmerBlock className="h-8 w-24 rounded-xl" />
      </div>

      {/* Body Graph / Bars Simulation */}
      <div className={`${height} flex items-end gap-2 sm:gap-4 pt-4`}>
        {[45, 75, 30, 90, 60, 85, 40, 70, 95, 55, 80, 65].map((h, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full">
            <ShimmerBlock
              className="w-full rounded-t-md opacity-85"
              style={{ height: `${h}%` }}
            />
            <ShimmerBlock className="h-2 w-full mt-2 rounded-sm opacity-50" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Table Rows Skeleton (Responsive Cards on Mobile / Table Rows on Desktop)
 */
export const TableSkeleton = ({ rows = 5, isDark = false, className = '' }) => {
  return (
    <div
      className={`rounded-2xl border shadow-xs overflow-hidden ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
      } ${className}`}
    >
      {/* Table Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShimmerBlock className="h-8 w-8 rounded-xl" />
          <ShimmerBlock className="h-4 w-36 rounded-md" />
        </div>
        <ShimmerBlock className="h-8 w-44 rounded-xl" />
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block divide-y divide-slate-100 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <ShimmerBlock className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <ShimmerBlock className="h-3.5 w-3/4 rounded-md" />
                <ShimmerBlock className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            <ShimmerBlock className="h-6 w-20 rounded-full" />
            <ShimmerBlock className="h-4 w-24 rounded-md" />
            <ShimmerBlock className="h-8 w-16 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden divide-y divide-slate-100 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShimmerBlock className="h-8 w-8 rounded-lg shrink-0" />
                <ShimmerBlock className="h-3.5 w-28 rounded-md" />
              </div>
              <ShimmerBlock className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
              <ShimmerBlock className="h-3 w-20 rounded-md" />
              <ShimmerBlock className="h-3 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Complete Dashboard Overview Shimmer Skeleton
 */
export const DashboardSkeleton = ({ isDark = false }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-5 w-36 rounded-full" />
            <ShimmerBlock className="h-4 w-20 rounded-md" />
          </div>
          <ShimmerBlock className="h-8 sm:h-9 w-64 rounded-xl" />
          <ShimmerBlock className="h-3.5 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <ShimmerBlock className="h-10 w-28 rounded-xl" />
          <ShimmerBlock className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Quota Progress Banner */}
      <QuotaBannerSkeleton isDark={isDark} />

      {/* 4 Primary Data Cards */}
      <DataCardGridSkeleton count={4} isDark={isDark} />

      {/* Analytics & Distribution Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCardSkeleton isDark={isDark} className="lg:col-span-2" />
        <div
          className={`rounded-2xl border p-4 sm:p-6 shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <ShimmerBlock className="h-4 w-32 rounded-md" />
            <ShimmerBlock className="h-7 w-7 rounded-lg" />
          </div>
          <div className="h-56 flex items-center justify-center">
            <ShimmerBlock className="h-40 w-40 rounded-full" />
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <div className="flex justify-between">
              <ShimmerBlock className="h-3 w-20 rounded-md" />
              <ShimmerBlock className="h-3 w-10 rounded-md" />
            </div>
            <div className="flex justify-between">
              <ShimmerBlock className="h-3 w-24 rounded-md" />
              <ShimmerBlock className="h-3 w-10 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Table of Workspaces */}
      <TableSkeleton rows={4} isDark={isDark} />
    </div>
  );
};

/**
 * Complete Sales Partner Dashboard Shimmer Skeleton
 */
export const SalesPartnerSkeleton = ({ isDark = false }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner Skeleton */}
      <div
        className={`rounded-3xl border p-5 sm:p-7 md:p-8 relative overflow-hidden ${
          isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <ShimmerBlock className="h-5 w-40 rounded-full" />
            <ShimmerBlock className="h-8 sm:h-9 w-72 rounded-xl" />
            <ShimmerBlock className="h-4 w-full rounded-md" />
            <ShimmerBlock className="h-4 w-3/4 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-16 w-28 rounded-2xl" />
            <ShimmerBlock className="h-16 w-28 rounded-2xl" />
            <ShimmerBlock className="h-12 w-12 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Referral Link Box Skeleton */}
      <div
        className={`rounded-2xl border p-4 sm:p-6 space-y-4 ${
          isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <ShimmerBlock className="h-3.5 w-48 rounded-md" />
          <ShimmerBlock className="h-4 w-24 rounded-md" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <ShimmerBlock className="h-11 w-full rounded-xl flex-1" />
          <ShimmerBlock className="h-11 w-full sm:w-36 rounded-xl shrink-0" />
        </div>
        <div className="flex gap-2 pt-1">
          <ShimmerBlock className="h-8 w-24 rounded-lg" />
          <ShimmerBlock className="h-8 w-24 rounded-lg" />
          <ShimmerBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 4 Stats Cards */}
      <DataCardGridSkeleton count={4} isDark={isDark} />

      {/* Payout Callout Banner Skeleton */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <ShimmerBlock className="h-8 w-8 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <ShimmerBlock className="h-3.5 w-60 rounded-md" />
            <ShimmerBlock className="h-3 w-80 rounded-md" />
          </div>
        </div>
        <ShimmerBlock className="h-9 w-36 rounded-xl shrink-0" />
      </div>

      {/* Referred Clients Table Skeleton */}
      <TableSkeleton rows={4} isDark={isDark} />
    </div>
  );
};

/**
 * Complete Analytics Dashboard Shimmer Skeleton
 */
export const AnalyticsSkeleton = ({ isDark = false }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-28 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <ShimmerBlock className="h-8 w-56 rounded-xl" />
          <ShimmerBlock className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <ShimmerBlock className="h-9 w-28 rounded-xl" />
          <ShimmerBlock className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* 4 Mini Stat Cards */}
      <DataCardGridSkeleton count={4} isDark={isDark} />

      {/* Large Volume Chart */}
      <ChartCardSkeleton isDark={isDark} height="h-80" />

      {/* Bottom Grid: 2 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCardSkeleton isDark={isDark} height="h-64" titleWidth="w-44" />
        <ChartCardSkeleton isDark={isDark} height="h-64" titleWidth="w-40" />
      </div>
    </div>
  );
};

export default {
  ShimmerBlock,
  DataCardSkeleton,
  DataCardGridSkeleton,
  QuotaBannerSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  SalesPartnerSkeleton,
  AnalyticsSkeleton,
};
