import React from 'react';
import type { Metadata } from 'next';
import RouteGuard from '@/components/auth/RouteGuard';
import CustomerDashboardShell from '@/components/customer/CustomerDashboardShell';

export const metadata: Metadata = {
  title: 'Customer VIP Portal',
  description: 'Manage luxury pilgrimage and city transfers across Makkah, Madinah, and Jeddah.',
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

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['customer']}>
      <CustomerDashboardShell>
        {children}
      </CustomerDashboardShell>
    </RouteGuard>
  );
}
