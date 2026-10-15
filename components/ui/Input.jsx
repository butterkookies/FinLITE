'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input(
  {
    className,
    type = 'text',
    size = 'md',
    leftIcon,
    rightElement,
    disabled = false,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-9 text-xs sm:text-sm px-3',
    lg: 'h-10 text-sm px-3.5',
  };

  const inputSizeClass = sizeClasses[size] || sizeClasses.md;

  if (leftIcon || rightElement) {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border transition-colors',
            'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            inputSizeClass,
            leftIcon && 'pl-8',
            rightElement && 'pr-8',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border transition-colors',
        'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100',
        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
        'focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        inputSizeClass,
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
