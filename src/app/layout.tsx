import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthRecoveryListener from '@/components/auth/AuthRecoveryListener';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#072118' },
  ],
};

export const metadata: Metadata = {
  title: 'Al Harmain Travels — Premium Taxi & Umrah Booking',
  description:
    'VIP chauffeur transfers across Makkah, Madinah, and Jeddah. Book airport pickups, Haram transfers, and pilgrimage journeys in minutes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Al Harmain',
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white bg-[var(--background)] text-[var(--foreground)] font-sans text-body">
        <AppProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthRecoveryListener />
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Navbar />
              <main id="main-content" className="flex-1 w-full pt-16 sm:pt-20">
                {children}
              </main>
              <Footer />
              <Toaster position="top-right" richColors theme="system" closeButton />
            </LanguageProvider>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
