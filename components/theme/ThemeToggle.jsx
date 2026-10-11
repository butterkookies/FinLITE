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
      className={`relative h-9 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer select-none group ${
        isLight
          ? 'bg-emerald-50 hover:bg-emerald-100/90 active:bg-emerald-200/80 text-emerald-900 border border-emerald-200/80'
          : 'bg-[#0c1e16] hover:bg-[#122b20] active:bg-[#163527] text-emerald-100 border border-[#1a382b]'
      } ${className}`}
      title={isLight ? 'Switch to Dark Mode (Forest Mist)' : 'Switch to Light Mode'}
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
