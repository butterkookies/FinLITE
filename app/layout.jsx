import './globals.css';

export const metadata = {
  title: 'FinLITE — Financial Assistant System',
  description: 'A Web-Based Financial Assistant System for the League of Information Technology Enthusiasts (LITE)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8faf9] text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
