'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  disabled = false,
  size = 'md',
  className,
  triggerClassName,
  align = 'left',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null
      ? opt
      : { value: opt, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg',
    md: 'h-9 px-3 text-xs sm:text-sm rounded-xl',
    lg: 'h-10 px-3.5 text-sm rounded-xl',
  };

  const triggerSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)} {...props}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 text-left font-medium transition-all select-none cursor-pointer',
          'bg-zinc-100/75 dark:bg-zinc-850/80 text-zinc-900 dark:text-zinc-100',
          'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
          'hover:bg-zinc-200/60 dark:hover:bg-zinc-800',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/50',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          triggerSize,
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute mt-1.5 min-w-full max-h-60 overflow-y-auto rounded-xl p-1 z-50',
            'bg-white dark:bg-[#18181b] shadow-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
            'animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="listbox"
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange?.(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 font-medium'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="truncate">
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
