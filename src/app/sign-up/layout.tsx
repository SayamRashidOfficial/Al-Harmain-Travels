import type { Metadata } from 'next';

// Auth pages have no SEO value and must not appear in search results.
export const metadata: Metadata = {
  title: 'Create Account',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
