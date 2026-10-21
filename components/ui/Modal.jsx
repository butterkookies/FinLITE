'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
  className,
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-5xl',
  };

  const resolvedMaxWidth = maxWidthClasses[maxWidth] || maxWidthClasses.lg;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={cn(
          'w-full rounded-2xl bg-white dark:bg-[#121214] text-zinc-950 dark:text-zinc-100 shadow-2xl ring-1 ring-black/[0.05] dark:ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150',
          resolvedMaxWidth,
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-4 sm:p-5 shrink-0 bg-zinc-50/40 dark:bg-zinc-900/30">
            <div>
              {title && (
                <div className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {title}
                </div>
              )}
              {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-2"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-5 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
