'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/30 ring-1 ring-black/[0.03] dark:ring-white/[0.05]',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-4 shrink-0 shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
