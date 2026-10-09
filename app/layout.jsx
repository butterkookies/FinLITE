import './globals.css';
import TechWaveBackground from '@/components/layout/TechWaveBackground';

export const metadata = {
  title: 'FinLITE — Financial Management & Automated Document Generation System',
  description: 'A Web-Based Financial Management and Automated Document Generation System for the League of Information Technology Enthusiasts (LITE)',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinLITE',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d3824',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen text-white selection:bg-emerald-400 selection:text-black select-none overscroll-none"
        suppressHydrationWarning
      >
        {/* Modern Animated Wavy Technology Background */}
        <TechWaveBackground />

        {/* Content sits above the background layers */}
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
