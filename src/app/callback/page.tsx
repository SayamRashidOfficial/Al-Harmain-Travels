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
        const urlError = searchParams.get('error_description') || searchParams.get('error');
        if (urlError) {
          if (!isCancelled) {
            setStatus('error');
            setErrorMsg(decodeURIComponent(urlError.replace(/\+/g, ' ')));
          }
          return;
        }

        // 1b. Check if this is a password recovery attempt
        const typeParam = searchParams.get('type') as EmailOtpType | null;
        const nextParam = searchParams.get('next');
        const isRecovery =
          typeParam === 'recovery' ||
          nextParam === '/reset-password' ||
          (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

        // 2. Check for PKCE exchange code (?code=...)
        const code = searchParams.get('code');
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
        const tokenHash = searchParams.get('token_hash');
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
          await handleSuccessfulVerification(sessionData.session.user.id, sessionData.session.user.email);
          return;
        }

        // 5. Listen for auth change (hash fragment or background token exchange)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && !isCancelled) {
            if (event === 'PASSWORD_RECOVERY' || isRecovery) {
              router.replace('/reset-password');
              return;
            }
            await handleSuccessfulVerification(session.user.id, session.user.email);
          }
        });

        // 6. Timeout safeguard
        const timer = setTimeout(async () => {
          if (!isCancelled && status === 'loading') {
            const { data: checkData } = await supabase.auth.getSession();
            if (checkData.session) {
              await handleSuccessfulVerification(checkData.session.user.id, checkData.session.user.email);
            } else {
              setStatus('error');
              setErrorMsg('Verification session timed out. Please sign in with your verified email and password.');
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

        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        const dest =
          prof?.role === 'admin'
            ? '/admin'
            : prof?.role === 'driver'
            ? '/driver'
            : prof?.role === 'dispatcher'
            ? '/dispatcher'
            : '/customer';

        setDestUrl(dest);

        setTimeout(() => {
          if (!isCancelled) {
            router.replace(dest);
          }
        }, 1500);
      } catch (err) {
        console.error('Profile update error on confirmation:', err);
        setDestUrl('/customer');
        setTimeout(() => {
          if (!isCancelled) {
            router.replace('/customer');
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
              className="bg-[#0c392c] hover:bg-[#07271e] text-white text-xs py-3 px-6 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md font-semibold transition-all active:scale-95"
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
              className="bg-[#0c392c] hover:bg-[#07271e] text-white text-xs py-2.5 px-4 rounded-xl inline-flex items-center justify-center shadow-md font-semibold transition-all active:scale-95"
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
