import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Support DeepFocus — Keep Focus Tools Free & Open Source',
  description: 'DeepFocus is built independently to help developers stay focused, master DSA, and prepare for interviews. Support development, AI features, and servers.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark selection:bg-violet-500/30 selection:text-white">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;850;900&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}</style>
      </head>
      <body className="antialiased min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-between">
        <main className="flex-1 w-full relative">
          {children}
        </main>
      </body>
    </html>
  );
}
