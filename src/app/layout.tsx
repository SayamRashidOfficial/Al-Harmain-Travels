import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthRecoveryListener from '@/components/auth/AuthRecoveryListener';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import SmoothScrollProvider from '@/components/layout/SmoothScrollProvider';
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
  metadataBase: new URL('https://alharmaintravels.com'),
  title: {
    default: 'Al Harmain Travels — Premium Taxi & Umrah Booking',
    template: '%s | Al Harmain Travels',
  },
  description:
    'VIP chauffeur transfers across Makkah, Madinah, and Jeddah. Book airport pickups, Haram transfers, and pilgrimage journeys in minutes.',
  alternates: {
    canonical: 'https://alharmaintravels.com',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Al Harmain Travels',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alharmaintravels.com',
    siteName: 'Al Harmain Travels',
    title: 'Al Harmain Travels — Premium Taxi & Umrah Booking',
    description:
      'VIP chauffeur transfers across Makkah, Madinah, and Jeddah. Book airport pickups, Haram transfers, and pilgrimage journeys in minutes.',
    images: [
      {
        url: 'https://alharmaintravels.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Al Harmain Travels — Premium VIP Chauffeur & Umrah Taxi Transfers',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Al Harmain Travels — Premium Taxi & Umrah Booking',
    description:
      'VIP chauffeur transfers across Makkah, Madinah, and Jeddah. Book airport pickups, Haram transfers, and pilgrimage journeys in minutes.',
    images: ['https://alharmaintravels.com/og-image.jpg'],
  },
  // Explicitly permit search engine crawling for all public-facing pages.
  // Private portal layouts (admin, dispatcher, driver, customer) each
  // override this with robots: { index: false, follow: false }.
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="auto" className="light">
      <head>
        <meta name="msvalidate.01" content="4213E221CD0EABFB91B4A63482E36652" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white bg-[var(--background)] text-[var(--foreground)] font-sans text-body">
        <GoogleAnalytics />
        <AppProvider>
          <ThemeProvider>
            <LanguageProvider>
              <SmoothScrollProvider>
                <AuthRecoveryListener />
                <a href="#main-content" className="skip-link">
                  Skip to main content
                </a>
                <Navbar />
                <main id="main-content" className="flex-1 w-full pt-16 sm:pt-20">
                  {children}
                </main>
                <Footer />
                <Toaster position="top-right" richColors theme="light" closeButton visibleToasts={3} duration={4500} />
              </SmoothScrollProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
