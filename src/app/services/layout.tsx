import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chauffeur & Umrah Services, Luxury Fleet',
  description:
    'Explore Al Harmain Travels VIP chauffeur packages, luxury GMC Yukon & sedan fleet, intercity transfers between Makkah, Madinah, and Jeddah airport pickups.',
  alternates: {
    canonical: 'https://alharmaintravels.com/services',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alharmaintravels.com/services',
    siteName: 'Al Harmain Travels',
    title: 'Chauffeur & Umrah Services, Luxury Fleet | Al Harmain Travels',
    description:
      'Explore Al Harmain Travels VIP chauffeur packages, luxury GMC Yukon & sedan fleet, intercity transfers between Makkah, Madinah, and Jeddah airport pickups.',
    images: [
      {
        url: 'https://alharmaintravels.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Al Harmain Travels Luxury Vehicle Fleet & Chauffeur Services',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chauffeur & Umrah Services, Luxury Fleet | Al Harmain Travels',
    description:
      'Explore Al Harmain Travels VIP chauffeur packages, luxury GMC Yukon & sedan fleet, intercity transfers between Makkah, Madinah, and Jeddah airport pickups.',
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

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

