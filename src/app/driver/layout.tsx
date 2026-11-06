import React from 'react';
import type { Metadata } from 'next';
import RouteGuard from '@/components/auth/RouteGuard';
import DriverDashboardShell from '@/components/driver/DriverDashboardShell';

export const metadata: Metadata = {
  title: 'Captain Driver Cockpit',
  description: 'Captain ride assignments, live navigation, and earnings dashboard.',
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

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['driver']}>
      <DriverDashboardShell>
        {children}
      </DriverDashboardShell>
    </RouteGuard>
  );
}
