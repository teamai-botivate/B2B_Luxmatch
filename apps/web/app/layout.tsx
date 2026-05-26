import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ClientProviders } from '@/components/ClientProviders';
import { DocumentTitle } from '@/components/DocumentTitle';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Home \\ LuxeMatch',
    template: '%s \\ LuxeMatch',
  },
  description:
    'Discover premium jewellery with AI-powered search, virtual try-on, and personalised recommendations. India\'s intelligent jewellery marketplace.',
  icons: {
    icon: '/logo-icon.png',
    shortcut: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  keywords: [
    'jewellery',
    'jewelry',
    'gold',
    'diamond',
    'Indian jewellery',
    'virtual try-on',
    'AI jewellery',
    'BIS hallmark',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased bg-background text-foreground">
        <ClientProviders>
          <DocumentTitle />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
