'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verificationState, resendEmailConfirmation, checkEmailVerification, userRole } = useApp();

  const targetDashboard =
    userRole === 'admin'
      ? '/admin'
      : userRole === 'dispatcher'
      ? '/dispatcher'
      : userRole === 'driver'
      ? '/driver'
      : '/customer';

  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const queryEmail = searchParams.get('email');
  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('aht_pending_verification_email') : null;
  const emailTarget = queryEmail || verificationState?.email || storedEmail || '';

  // Cooldown countdown
  useEffect(() => {
    if (!verificationState?.emailSentAt) return;
    const updateCooldown = () => {
      const elapsed = Math.floor((Date.now() - verificationState.emailSentAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setCooldown(remaining);
    };
    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [verificationState?.emailSentAt]);

  // Auto-poll for email confirmation every 5 seconds
  const handleCheckVerification = useCallback(async (isManual = false) => {
    if (isManual) setIsChecking(true);
    setErrorMsg('');
    try {
      const confirmed = await checkEmailVerification();
      if (confirmed) {
        setIsVerified(true);
        toast.success('Email confirmed! Redirecting to your dashboard…');
        setTimeout(() => router.push(targetDashboard), 1200);
      } else if (isManual) {
        setErrorMsg('Email has not been confirmed yet. Please check your inbox and click the confirmation link, or click Resend.');
      }
    } finally {
      if (isManual) setIsChecking(false);
    }
  }, [checkEmailVerification, router, targetDashboard]);

  useEffect(() => {
    const interval = setInterval(() => handleCheckVerification(false), 5000);
    return () => clearInterval(interval);
  }, [handleCheckVerification]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);
    try {
      const res = await resendEmailConfirmation(emailTarget);
      if (!res.success) {
        setErrorMsg(res.error || 'Could not resend confirmation email.');
      } else {
        setCooldown(60);
        setSuccessMsg(`Confirmation email successfully resent to ${emailTarget || 'your email'}.`);
        toast.success('Confirmation email resent — please check your inbox.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      title={isVerified ? 'Email Confirmed!' : 'Check Your Inbox'}
      subtitle={
        isVerified ? (
          'Your email has been verified. Redirecting you to the customer dashboard…'
        ) : (
          <span>
            We sent an activation link to{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
              {emailTarget || 'your email address'}
            </strong>
            .
          </span>
        )
      }
      footer={
        <p className="text-xs text-muted">
          Wrong email address?{' '}
          <Link href="/sign-up" className="text-amber-500 dark:text-amber-400 font-bold hover:underline">
            Register again
          </Link>
          {' · '}
          Already confirmed?{' '}
          <Link href="/sign-in" className="text-amber-500 dark:text-amber-400 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      }
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 text-xs font-semibold py-1">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 dark:border-emerald-400 flex items-center justify-center text-[10px] font-bold">
            {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
          </span>
          Email Confirmation
        </span>
        <span className="text-muted/60">&rarr;</span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="w-5 h-5 rounded-full bg-elevated border border-base flex items-center justify-center text-[10px]">
            2
          </span>
          VIP Portal
        </span>
      </div>

      {/* Central Status Icon */}
      <div className="text-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all shadow-md ${
            isVerified
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
          }`}
        >
          {isVerified ? <CheckCircle2 className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-start gap-2.5 animate-fade-in shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <span className="leading-relaxed">{successMsg}</span>
        </div>
      )}

      {!isVerified ? (
        <div className="space-y-4">
          {/* Instructions card */}
          <div className="p-4 rounded-2xl bg-surface/70 border border-base/80 space-y-3">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Next Steps to Verify</span>
            </p>
            <ol className="space-y-2 text-xs text-secondary list-none">
              {[
                `Open the inbox for ${emailTarget || 'your registered email address'}`,
                'Find the verification email from Al Harmain Travels (check Spam/Promotions if needed)',
                'Click "Confirm your email" or the secure verification link inside',
                'Return to this window or click the button below to proceed',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Manual Check */}
          <button
            type="button"
            onClick={() => handleCheckVerification(true)}
            disabled={isChecking}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group/btn"
          >
            {isChecking ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Checking confirmation status…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>I&apos;ve Confirmed My Email</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </div>
            )}
          </button>

          {/* Resend Action */}
          <div className="pt-1 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <span>Didn&apos;t receive the email?</span>
              <button
                type="button"
                disabled={cooldown > 0 || isResending}
                onClick={handleResend}
                className="text-amber-500 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Resend in {cooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend Confirmation Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Webmail Shortcuts */}
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <span className="text-[10px] text-muted">Quick open:</span>
            {[
              { label: 'Gmail', href: 'https://mail.google.com' },
              { label: 'Outlook', href: 'https://outlook.live.com' },
              { label: 'Yahoo', href: 'https://mail.yahoo.com' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 px-2.5 rounded-lg bg-surface/60 border border-base/70 text-[11px] text-amber-500 dark:text-amber-400 font-semibold hover:border-amber-400/40 hover:bg-surface transition-all flex items-center gap-1"
              >
                <span>{label}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => router.push(targetDashboard)}
          className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-page text-primary">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
