import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Support & Booking Inquiries',
  description:
    'Get in touch with Al Harmain Travels 24/7 VIP concierge. Reach our dispatch headquarters for bespoke Umrah transfers, fleet inquiries, and booking assistance.',
  alternates: {
    canonical: 'https://alharmaintravels.com/contact',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alharmaintravels.com/contact',
    siteName: 'Al Harmain Travels',
    title: 'Contact Support & Booking Inquiries | Al Harmain Travels',
    description:
      'Get in touch with Al Harmain Travels 24/7 VIP concierge. Reach our dispatch headquarters for bespoke Umrah transfers, fleet inquiries, and booking assistance.',
    images: [
      {
        url: '/images/dest_makkah.jpg',
        width: 1200,
        height: 630,
        alt: 'Contact Al Harmain Travels VIP Concierge',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Support & Booking Inquiries | Al Harmain Travels',
    description:
      'Get in touch with Al Harmain Travels 24/7 VIP concierge. Reach our dispatch headquarters for bespoke Umrah transfers, fleet inquiries, and booking assistance.',
    images: ['/images/dest_makkah.jpg'],
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

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

