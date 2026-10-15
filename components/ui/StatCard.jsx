'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import Badge from './Badge';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeVariant = 'neutral',
  accentColor = 'zinc',
  onClick,
  className,
  children,
}) {
  const iconAccentClasses = {
    emerald:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    zinc: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 text-zinc-200 border-zinc-200 dark:border-zinc-800',
    amber:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  const isClickable = Boolean(onClick);

  return (
    <Card
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'group relative p-4.5 sm:p-5 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-sm transition-all',
        isClickable &&
          'cursor-pointer active:scale-[0.99] hover:border-zinc-300 dark:hover:border-zinc-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
                iconAccentClasses[accentColor] || iconAccentClasses.zinc
              )}
            >
              {icon}
            </div>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 truncate">
            {title}
          </span>
        </div>

        {badgeText && (
          <Badge variant={badgeVariant} size="xs">
            {badgeText}
          </Badge>
        )}
      </div>

      {/* Value */}
      <div className="my-1 relative z-10">
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate text-zinc-950 dark:text-white">
          {value}
        </p>
      </div>

      {/* Subtitle / Footer children */}
      {subtitle && (
        <p className="text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              accentColor === 'emerald'
                ? 'bg-emerald-500'
                : accentColor === 'amber'
                ? 'bg-amber-500'
                : accentColor === 'rose'
                ? 'bg-rose-500'
                : 'bg-zinc-400'
            )}
          />
          <span className="truncate">{subtitle}</span>
        </p>
      )}

      {children}
    </Card>
  );
}
