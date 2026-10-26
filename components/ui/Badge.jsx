'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60',
  emerald:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30',
  success:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30',
  rose:
    'bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/20 dark:border-rose-500/30',
  danger:
    'bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/20 dark:border-rose-500/30',
  amber:
    'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30',
  warning:
    'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30',
  sky:
    'bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/20 dark:border-sky-500/30',
  info:
    'bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/20 dark:border-sky-500/30',
  indigo:
    'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30',
  purple:
    'bg-purple-500/12 text-purple-700 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30',
  violet:
    'bg-violet-500/12 text-violet-700 dark:text-violet-300 border border-violet-500/20 dark:border-violet-500/30',
  blue:
    'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30',
  orange:
    'bg-orange-500/12 text-orange-700 dark:text-orange-300 border border-orange-500/20 dark:border-orange-500/30',
  teal:
    'bg-teal-500/12 text-teal-700 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30',
  outline:
    'border border-zinc-200 dark:border-zinc-700 bg-zinc-100/80 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200',
};

export const badgeSizes = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
  sm: 'text-[11px] px-2 py-0.5 rounded-full font-semibold',
  md: 'text-xs px-2.5 py-0.5 rounded-full font-semibold',
};

export default function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  dotColor,
  children,
  ...props
}) {
  const variantClass = badgeVariants[variant] || badgeVariants.neutral;
  const sizeClass = badgeSizes[size] || badgeSizes.sm;

  const dotClasses = {
    emerald: 'bg-emerald-500',
    success: 'bg-emerald-500',
    rose: 'bg-rose-500',
    danger: 'bg-rose-500',
    amber: 'bg-amber-500',
    warning: 'bg-amber-500',
    sky: 'bg-sky-500',
    info: 'bg-sky-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    neutral: 'bg-zinc-400 dark:bg-zinc-500',
  };

  const resolvedDotColor =
    dotColor || (typeof dot === 'string' ? dot : variant);
  const dotBg = dotClasses[resolvedDotColor] || 'bg-current';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 leading-none transition-colors select-none shrink-0',
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotBg)} />}
      {children}
    </span>
  );
}
