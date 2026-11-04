import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Discover the legacy, mission, and luxury chauffeur standards of Al Harmain Travels. Premium Umrah and executive pilgrimage transfers across Saudi Arabia.',
  alternates: {
    canonical: 'https://alharmaintravels.com/about',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alharmaintravels.com/about',
    siteName: 'Al Harmain Travels',
    title: 'About Us | Al Harmain Travels',
    description:
      'Discover the legacy, mission, and luxury chauffeur standards of Al Harmain Travels. Premium Umrah and executive pilgrimage transfers across Saudi Arabia.',
    images: [
      {
        url: '/images/dest_madinah.jpg',
        width: 1200,
        height: 630,
        alt: 'Al Harmain Travels Heritage & Fleet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Al Harmain Travels',
    description:
      'Discover the legacy, mission, and luxury chauffeur standards of Al Harmain Travels. Premium Umrah and executive pilgrimage transfers across Saudi Arabia.',
    images: ['/images/dest_madinah.jpg'],
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

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

