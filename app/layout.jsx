import './globals.css';

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
  viewportFit: 'cover',
  themeColor: '#047857',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className="min-h-screen bg-[#f8faf9] text-gray-900 selection:bg-emerald-100 selection:text-emerald-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
