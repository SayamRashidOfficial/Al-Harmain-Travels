import type { Metadata } from 'next';

// Auth pages have no SEO value and must not appear in search results.
export const metadata: Metadata = {
  title: 'Sign In',
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

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
