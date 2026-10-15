'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isLight = mounted && theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer select-none border bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 ${className}`}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (shown in dark mode or when switching to light) */}
        <Sun
          className={`w-4 h-4 text-amber-400 transition-all duration-300 absolute ${
            isLight
              ? 'scale-0 rotate-90 opacity-0 pointer-events-none'
              : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        {/* Moon Icon (shown in light mode or when switching to dark) */}
        <Moon
          className={`w-4 h-4 text-emerald-700 transition-all duration-300 absolute ${
            isLight
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {showLabel && (
        <span className="font-semibold text-xs capitalize">
          {isLight ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
