'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  emerald:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  success:
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  rose:
    'bg-rose-500/12 text-rose-700 dark:text-rose-400',
  danger:
    'bg-rose-500/12 text-rose-700 dark:text-rose-400',
  amber:
    'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  warning:
    'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  sky:
    'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  info:
    'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  orange:
    'bg-orange-500/12 text-orange-700 dark:text-orange-300',
  teal:
    'bg-teal-500/12 text-teal-700 dark:text-teal-300',
  outline:
    'bg-zinc-100/80 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300',
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
