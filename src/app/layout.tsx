import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
// Global site navigation & living footer
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthRecoveryListener from '@/components/auth/AuthRecoveryListener';
import { Toaster } from 'sonner';

/* Display: elegant serif for brand & marketing headings */
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  adjustFontFallback: true,
});

/* Body: geometric sans for UI, forms, dashboards, and high-readability copy */
const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
  adjustFontFallback: true,
});

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
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`light ${display.variable} ${body.variable}`}>
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white bg-[var(--background)] text-[var(--foreground)] font-sans text-body">
        <ThemeProvider>
          <AppProvider>
            <AuthRecoveryListener />
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Navbar />
            <main id="main-content" className="flex-1 w-full">
              {children}
            </main>
            <Footer />
            <Toaster position="top-right" richColors theme="system" closeButton />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
