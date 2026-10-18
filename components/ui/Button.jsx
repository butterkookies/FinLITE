'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-xs focus-visible:ring-emerald-500/50',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shadow-2xs focus-visible:ring-zinc-400',
  outline:
    'border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 focus-visible:ring-zinc-400',
  ghost:
    'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 focus-visible:ring-zinc-400',
  destructive:
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 focus-visible:ring-rose-500/40',
  'emerald-subtle':
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 focus-visible:ring-emerald-500/40',
  'amber-subtle':
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 focus-visible:ring-amber-500/40',
};

export const buttonSizes = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-10 px-4 text-sm font-semibold rounded-lg gap-2',
  'icon-xs': 'h-7 w-7 p-0 rounded-md justify-center',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg justify-center',
  'icon-md': 'h-9 w-9 p-0 rounded-lg justify-center',
  'icon-lg': 'h-10 w-10 p-0 rounded-lg justify-center',
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
        'inline-flex items-center justify-center font-medium transition-[color,background-color,border-color,opacity,transform] duration-150 select-none cursor-pointer max-w-full touch-manipulation active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {isButtonLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
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
