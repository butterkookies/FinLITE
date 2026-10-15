'use client';

import { useTheme } from '@/components/theme/ThemeProvider';

export default function TechWaveBackground() {
  const { isLight } = useTheme();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none transition-colors duration-300"
    >
      {isLight ? (
        // Pure, clean light mode canvas with minimal hairline ambient light
        <div className="absolute inset-0 bg-[#ffffff]">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-50/50 to-transparent rounded-full blur-3xl opacity-50" />
        </div>
      ) : (
        // High-contrast True Obsidian Black canvas with restrained ambient highlight
        <div className="absolute inset-0 bg-[#09090b]">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-950/30 to-transparent rounded-full blur-3xl opacity-40" />
        </div>
      )}
    </div>
  );
}
