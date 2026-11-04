import React from 'react';
import type { Metadata } from 'next';
import RouteGuard from '@/components/auth/RouteGuard';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';

export const metadata: Metadata = {
  title: 'Executive Admin HQ',
  description: 'Enterprise operations management, tariff rules, and system oversight.',
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </RouteGuard>
  );
}
