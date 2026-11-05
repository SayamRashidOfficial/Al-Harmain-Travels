'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type EmailOtpType } from '@supabase/supabase-js';
import AuthShell from '@/components/auth/AuthShell';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [destUrl, setDestUrl] = useState<string>('/customer');

  useEffect(() => {
    let isCancelled = false;

    const processAuth = async () => {
      try {
        // 1. Check if Supabase sent error in URL params
        const urlError = searchParams?.get('error_description') || searchParams?.get('error');
        if (urlError) {
          if (!isCancelled) {
            setStatus('error');
            setErrorMsg(decodeURIComponent(urlError.replace(/\+/g, ' ')));
          }
          return;
        }

        // 1b. Check if this is a password recovery attempt
        const typeParam = searchParams?.get('type') as EmailOtpType | null;
        const nextParam = searchParams?.get('next');
        const isRecovery =
          typeParam === 'recovery' ||
          nextParam === '/reset-password' ||
          (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

        // 1c. Check for custom signed verification token (?action=verify_email&token=... or ?token=...)
        const tokenParam = searchParams?.get('token');
        const actionParam = searchParams?.get('action');
        if (tokenParam && (actionParam === 'verify_email' || !actionParam)) {
          try {
            const verifyRes = await fetch('/api/auth/verify-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: tokenParam }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyRes.ok && verifyJson.success) {
              await handleSuccessfulVerification(verifyJson.user.id, verifyJson.user.email);
              return;
            } else {
              if (!isCancelled) {
                setStatus('error');
                setErrorMsg(verifyJson.error || 'Verification link is invalid or has expired.');
              }
              return;
            }
          } catch (tokErr) {
            console.error('Custom token verification failed:', tokErr);
          }
        }

        // 2. Check for PKCE exchange code (?code=...)
        const code = searchParams?.get('code');
        if (code) {
          const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) {
            console.error('PKCE code exchange error:', codeErr);
            if (!isCancelled) {
              setStatus('error');
              setErrorMsg(codeErr.message || 'Verification link is invalid or has expired.');
            }
            return;
          }
          if (codeData.session) {
            if (isRecovery) {
              router.replace('/reset-password');
              return;
            }
            await handleSuccessfulVerification(codeData.session.user.id, codeData.session.user.email);
            return;
          }
        }

        // 3. Check for Token Hash verification (?token_hash=...&type=...)
        const tokenHash = searchParams?.get('token_hash');
        if (tokenHash) {
          const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam || 'signup',
          });
          if (otpErr) {
            console.error('OTP verification error:', otpErr);
            if (!isCancelled) {
              setStatus('error');
              setErrorMsg(otpErr.message || 'Verification token is invalid or has expired.');
            }
            return;
          }
          if (otpData.session) {
            if (isRecovery || typeParam === 'recovery') {
              router.replace('/reset-password');
              return;
            }
            await handleSuccessfulVerification(otpData.session.user.id, otpData.session.user.email);
            return;
          }
        }

        // 4. Check for active session or hash fragment processed by client
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const isEmailConfirmationHash =
          hash.includes('type=signup') ||
          hash.includes('type=email_change') ||
          hash.includes('type=invite') ||
          hash.includes('confirmation_token');

        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          if (!isCancelled) {
            setStatus('error');
            setErrorMsg(sessionErr.message);
          }
          return;
        }

        if (sessionData.session) {
          if (isRecovery) {
            router.replace('/reset-password');
            return;
          }

          // Fetch fresh user from server to verify actual email_confirmed_at
          const { data: freshUser } = await supabase.auth.getUser();
          const isConfirmed = Boolean(
            freshUser.user?.email_confirmed_at &&
            typeof freshUser.user.email_confirmed_at === 'string' &&
            freshUser.user.email_confirmed_at.trim().length > 0
          );

          if (isConfirmed || isEmailConfirmationHash) {
            await handleSuccessfulVerification(sessionData.session.user.id, sessionData.session.user.email);
            return;
          } else {
            // User is signed in but email has NOT been confirmed
            if (!isCancelled) {
              setStatus('error');
              setErrorMsg('Your email address has not been verified yet. Please check your inbox and click the confirmation link.');
            }
            return;
          }
        }

        // 5. Listen for auth change (hash fragment or background token exchange)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && !isCancelled) {
            if (event === 'PASSWORD_RECOVERY' || isRecovery) {
              router.replace('/reset-password');
              return;
            }
            // Check if user is actually confirmed before accepting
            const isConfirmed = Boolean(
              session.user.email_confirmed_at &&
              typeof session.user.email_confirmed_at === 'string' &&
              session.user.email_confirmed_at.trim().length > 0
            );
            if (isConfirmed || isEmailConfirmationHash) {
              await handleSuccessfulVerification(session.user.id, session.user.email);
            }
          }
        });

        // 6. Timeout safeguard
        const timer = setTimeout(async () => {
          if (!isCancelled && status === 'loading') {
            const { data: checkData } = await supabase.auth.getSession();
            const { data: freshUser } = await supabase.auth.getUser();
            const isConfirmed = Boolean(
              freshUser.user?.email_confirmed_at &&
              typeof freshUser.user.email_confirmed_at === 'string' &&
              freshUser.user.email_confirmed_at.trim().length > 0
            );

            if (checkData.session && (isConfirmed || isEmailConfirmationHash)) {
              await handleSuccessfulVerification(checkData.session.user.id, checkData.session.user.email);
            } else {
              setStatus('error');
              setErrorMsg('Verification session timed out. Please check your inbox and click the confirmation link.');
            }
          }
        }, 5000);

        return () => {
          clearTimeout(timer);
          authListener.subscription.unsubscribe();
        };
      } catch (err: unknown) {
        if (!isCancelled) {
          setStatus('error');
          const msg = err instanceof Error ? err.message : 'Failed to process email confirmation.';
          setErrorMsg(msg);
        }
      }
    };

    const handleSuccessfulVerification = async (userId: string, email?: string) => {
      if (isCancelled) return;
      setStatus('success');
      if (email) setUserEmail(email);

      try {
        // Atomic RPC to mark email verified in both profiles and auth.users
        await supabase.rpc('verify_user_email', { target_user_id: userId });

        await supabase
          .from('profiles')
          .update({
            email_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('aht_pending_verification_email');
        }

        // Production redirect requirement: redirect to https://alharmaintravels.com
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const targetRedirect = isLocal
          ? `${window.location.origin}/customer`
          : (process.env.NEXT_PUBLIC_SITE_URL || 'https://alharmaintravels.com');

        setDestUrl(targetRedirect);

        setTimeout(() => {
          if (!isCancelled) {
            window.location.href = targetRedirect;
          }
        }, 1500);
      } catch (err) {
        console.error('Profile update error on confirmation:', err);
        const fallback = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? `${window.location.origin}/customer`
          : 'https://alharmaintravels.com';
        setDestUrl(fallback);
        setTimeout(() => {
          if (!isCancelled) {
            window.location.href = fallback;
          }
        }, 1500);
      }
    };

    processAuth();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams, status]);

  return (
    <AuthShell
      title={
        status === 'loading'
          ? 'Verifying Confirmation'
          : status === 'success'
          ? 'Account Confirmed!'
          : 'Verification Error'
      }
      subtitle={
        status === 'loading'
          ? 'Securing your Al Harmain Travels account credentials…'
          : status === 'success'
          ? 'Your email is confirmed. Redirecting you to your portal…'
          : 'The verification link may have expired or was already used'
      }
    >
      {status === 'loading' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <p className="text-xs text-muted">Establishing secure session…</p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-4 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary font-display">Email Verified Successfully</h3>
            {userEmail && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {userEmail}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Redirecting you to your authorized dashboard in a moment…
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.replace(destUrl)}
              className="btn-brand text-xs py-3 px-6 inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/25"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="py-2 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary font-display">Confirmation Unsuccessful</h3>
            <p className="text-xs text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
              {errorMsg || 'The verification link may have expired or was already used.'}
            </p>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row justify-center gap-2.5">
            <Link
              href="/verify-email"
              className="btn-brand text-xs py-2.5 px-4 inline-flex items-center justify-center shadow-lg shadow-emerald-950/25"
            >
              Resend Confirmation
            </Link>
            <Link
              href="/sign-in"
              className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center justify-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-page text-primary">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
