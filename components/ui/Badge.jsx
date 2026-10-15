'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60',
  emerald:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rose:
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  danger:
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  amber:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  sky:
    'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  info:
    'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  orange:
    'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  teal:
    'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  outline:
    'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400',
};

export const badgeSizes = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded font-medium',
  sm: 'text-[11px] px-2 py-0.5 rounded-full font-medium',
  md: 'text-xs px-2.5 py-0.5 rounded-full font-medium',
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
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    neutral: 'bg-zinc-400',
  };

  const resolvedDotColor =
    dotColor || (typeof dot === 'string' ? dot : variant);
  const dotBg = dotClasses[resolvedDotColor] || 'bg-current';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border leading-none transition-colors select-none shrink-0',
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
