'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-white dark:bg-[#121214] text-zinc-950 dark:text-zinc-100 shadow-sm shadow-zinc-950/5 ring-1 ring-black/[0.04] dark:ring-white/[0.06] transition-all',
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

export const CardHeader = forwardRef(function CardHeader(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-4 sm:p-5', className)}
      {...props}
    />
  );
});
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef(function CardTitle(
  { className, ...props },
  ref
) {
  return (
    <h3
      ref={ref}
      className={cn(
        'text-base font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-100',
        className
      )}
      {...props}
    />
  );
});
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef(function CardDescription(
  { className, ...props },
  ref
) {
  return (
    <p
      ref={ref}
      className={cn('text-xs text-zinc-500 dark:text-zinc-400 leading-normal', className)}
      {...props}
    />
  );
});
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('p-4 sm:p-5 pt-0', className)} {...props} />;
});
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef(function CardFooter(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center p-4 sm:p-5 pt-0 text-xs text-zinc-500 dark:text-zinc-400',
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';

export default Card;
