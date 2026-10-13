import './globals.css';
import TechWaveBackground from '@/components/layout/TechWaveBackground';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Session-based theme: defaults to dark mode whenever system is opened
                  var t = sessionStorage.getItem('finlite-theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', t);
                  if (t === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen text-[var(--text-main)] selection:bg-emerald-400 selection:text-black select-none overscroll-none transition-colors duration-200"
        suppressHydrationWarning
      >
        <ThemeProvider>
          {/* Modern Animated Wavy Technology Background */}
          <TechWaveBackground />

          {/* Content sits above the background layers */}
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
