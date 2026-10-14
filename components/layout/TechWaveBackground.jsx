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
        // Pure, clean light mode canvas with subtle institutional emerald aura
        <div className="absolute inset-0 bg-[#f8faf9]">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-emerald-100/60 to-transparent rounded-full blur-3xl opacity-70" />
        </div>
      ) : (
        // Refined matte dark session canvas with subtle ambient top glow
        <div className="absolute inset-0 bg-[#07130d]">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-950/60 via-emerald-900/20 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-emerald-950/20 rounded-full blur-3xl opacity-40" />
        </div>
      )}
    </div>
  );
}
