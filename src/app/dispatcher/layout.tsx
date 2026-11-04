import React from 'react';
import type { Metadata } from 'next';
import RouteGuard from '@/components/auth/RouteGuard';
import DispatcherDashboardShell from '@/components/dispatcher/DispatcherDashboardShell';

export const metadata: Metadata = {
  title: 'Operations & Dispatch',
  description: 'Live ride queue, fleet tracking, and automated assignment control.',
  // Private portal — never expose to search engines
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

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['dispatcher']}>
      <DispatcherDashboardShell>
        {children}
      </DispatcherDashboardShell>
    </RouteGuard>
  );
}
