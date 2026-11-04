import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book VIP Chauffeur & Umrah Taxi Transfers',
  description:
    'Reserve private luxury chauffeur transfers across Makkah, Madinah, and Jeddah. Airport pickups, Haram executive transfers, and pilgrimage journeys in premium GMC Yukon, Camry, and VIP Vans.',
  alternates: {
    canonical: 'https://alharmaintravels.com/booking',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alharmaintravels.com/booking',
    siteName: 'Al Harmain Travels',
    title: 'Book VIP Chauffeur & Umrah Taxi Transfers | Al Harmain Travels',
    description:
      'Reserve private luxury chauffeur transfers across Makkah, Madinah, and Jeddah. Airport pickups, Haram executive transfers, and pilgrimage journeys in premium GMC Yukon, Camry, and VIP Vans.',
    images: [
      {
        url: 'https://alharmaintravels.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Book VIP Chauffeur & Umrah Taxi Transfers — Al Harmain Travels',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book VIP Chauffeur & Umrah Taxi Transfers | Al Harmain Travels',
    description:
      'Reserve private luxury chauffeur transfers across Makkah, Madinah, and Jeddah. Airport pickups, Haram executive transfers, and pilgrimage journeys in premium GMC Yukon, Camry, and VIP Vans.',
    images: ['https://alharmaintravels.com/og-image.jpg'],
  },
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

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

