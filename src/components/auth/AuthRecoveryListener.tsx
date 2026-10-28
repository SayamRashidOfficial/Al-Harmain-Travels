'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Global listener that detects Supabase password recovery redirects.
 * When Supabase emails send the user to http://localhost:3000/#access_token=...&type=recovery
 * or http://localhost:3000/?type=recovery, this listener instantly redirects them to /reset-password
 * while preserving the tokens and session state.
 */
export default function AuthRecoveryListener() {
  const router = useRouter();
  const pathname = usePathname() || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if the current URL hash or query contains password recovery parameters
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    const isRecoveryHash = hash.includes('type=recovery');
    const isRecoverySearch = search.includes('type=recovery');
    const isRecoveryError =
      (hash.includes('error=') || search.includes('error=')) &&
      (hash.includes('recovery') || hash.includes('otp_expired') || search.includes('otp_expired'));

    if (
      (isRecoveryHash || isRecoverySearch || isRecoveryError) &&
      !pathname.startsWith('/reset-password')
    ) {
      // Retain the query parameters and hash fragment so /reset-password can parse tokens
      window.location.replace(`/reset-password${search}${hash}`);
      return;
    }

    // 2. Listen for PASSWORD_RECOVERY auth state event
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (!window.location.pathname.startsWith('/reset-password')) {
          router.replace('/reset-password');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
