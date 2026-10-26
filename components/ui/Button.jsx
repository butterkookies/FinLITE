'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-xs focus-visible:ring-emerald-500/50',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 ring-1 ring-black/[0.04] dark:ring-white/[0.08] shadow-xs focus-visible:ring-zinc-400',
  outline:
    'border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/80 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 focus-visible:ring-zinc-400',
  ghost:
    'border border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:border-zinc-200/70 dark:hover:border-zinc-700/80 focus-visible:ring-zinc-400',
  destructive:
    'bg-rose-500/12 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/25 border border-rose-500/20 dark:border-rose-500/30 focus-visible:ring-rose-500/40',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-xs focus-visible:ring-rose-500/50',
  'emerald-subtle':
    'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 border border-emerald-500/20 dark:border-emerald-500/30 focus-visible:ring-emerald-500/40',
  'amber-subtle':
    'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 dark:hover:bg-amber-500/30 border border-amber-500/20 dark:border-amber-500/30 focus-visible:ring-amber-500/40',
  'rose-subtle':
    'bg-rose-500/12 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/25 border border-rose-500/20 dark:border-rose-500/30 focus-visible:ring-rose-500/40',
  'sky-subtle':
    'bg-sky-500/12 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 dark:hover:bg-sky-500/25 active:bg-sky-500/25 focus-visible:ring-sky-500/40 border border-sky-500/20 dark:border-sky-500/30',
};

export const buttonSizes = {
  xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5',
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-10 px-4 text-sm font-semibold rounded-lg gap-2',
  'icon-xs': 'h-7 w-7 p-0 rounded-lg justify-center',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg justify-center',
  'icon-md': 'h-9 w-9 p-0 rounded-lg justify-center',
  'icon-lg': 'h-10 w-10 p-0 rounded-lg justify-center',
  icon: 'h-8 w-8 p-0 rounded-lg justify-center',
};

const Button = forwardRef(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    isLoading = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const isButtonLoading = isLoading || loading;
  const variantClass = buttonVariants[variant] || buttonVariants.secondary;
  const sizeClass = buttonSizes[size] || buttonSizes.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isButtonLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-[color,background-color,box-shadow,opacity,transform] duration-150 select-none cursor-pointer max-w-full touch-manipulation active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {isButtonLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isButtonLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
