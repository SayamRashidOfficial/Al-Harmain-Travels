'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isAuthenticated, userRole, currentUser, isAuthLoading } = useApp();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    // 1. Wait until initial Supabase session check completes
    if (isAuthLoading) {
      return;
    }

    // 2. Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Authentication required. Please sign in.');
      const fullPath = typeof window !== 'undefined' && window.location.search ? `${pathname}${window.location.search}` : pathname;
      router.replace(`/sign-in?redirect=${encodeURIComponent(fullPath)}`);
      return;
    }

    // 2b. Enforce account active status (reject deactivated/suspended accounts)
    if (currentUser && (currentUser.status === 'suspended' || currentUser.status === 'deactivated')) {
      toast.error(`Your account has been ${currentUser.status}. Access denied.`);
      router.replace('/sign-in');
      return;
    }

    // 3. Enforce email verification
    if (currentUser && currentUser.email && !currentUser.email_verified) {
      toast.error('Please verify your email address before accessing your account.');
      router.replace(`/verify-email?email=${encodeURIComponent(currentUser.email)}`);
      return;
    }

    // 4. Check if user's verified database role is permitted
    if (!allowedRoles.includes(userRole)) {
      if (userRole === 'customer') {
        toast.error('Access restricted: Customer accounts cannot access this operations portal.');
        router.replace('/customer');
      } else if (userRole === 'driver') {
        toast.error('Access restricted: Captain accounts are limited to the Driver Cockpit.');
        router.replace('/driver');
      } else if (userRole === 'dispatcher') {
        toast.error('Access restricted: Staff accounts are limited to Dispatch Operations.');
        router.replace('/dispatcher');
      } else if (userRole === 'admin') {
        toast.error('Access restricted: Please access internal operations from Admin HQ.');
        router.replace('/admin');
      } else {
        router.replace('/sign-in');
      }
      return;
    }

    // Authorized
    setIsAuthorized(true);
  }, [isAuthenticated, userRole, allowedRoles, router, pathname, isAuthLoading]);

  if (isAuthLoading || !isAuthenticated || !isAuthorized) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center space-y-4 p-6 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-primary">Verifying Authorization</h4>
          <p className="text-xs text-muted mt-1">Securing transportation session privileges...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
