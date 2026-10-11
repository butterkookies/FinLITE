import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
  themeColor: '#047857',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body 
        className={`${inter.className} min-h-screen bg-[#f8faf9] text-gray-900 selection:bg-emerald-100 selection:text-emerald-900 select-none overscroll-none`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
