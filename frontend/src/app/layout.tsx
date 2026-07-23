import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Navbar } from '@/components';
import { AuthProvider } from '@/context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Code Insight',
    template: '%s | Code Insight',
  },
  description: 'Run code securely and understand educational error feedback.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-semibold text-blue-800 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          href="#main-content"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Navbar />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
