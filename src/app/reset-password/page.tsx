'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/types';
import AuthShell from '@/components/auth/AuthShell';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query parameters
  const codeParam = searchParams.get('code');
  const tokenHashParam = searchParams.get('token_hash');
  const typeParam = searchParams.get('type');
  const urlEmail = searchParams.get('email') || '';

  // Component state
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'ready' | 'invalid' | 'success'>('checking');
  const [targetEmail, setTargetEmail] = useState<string>(urlEmail);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password criteria check
  const criteria = useMemo(() => {
    return {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, [password]);

  const isValid = criteria.length && criteria.hasUpper && criteria.hasLower && criteria.hasNumber;

  // Initialize and verify password recovery session
  useEffect(() => {
    let isCancelled = false;

    const verifyRecoverySession = async () => {
      try {
        // 1. Check for error in URL hash or query parameters (e.g. otp_expired)
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          if (hash.includes('error_code=') || hash.includes('error_description=')) {
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const errorDesc = hashParams.get('error_description') || hashParams.get('error') || '';
            if (!isCancelled) {
              setSessionStatus('invalid');
              setErrorMsg(decodeURIComponent(errorDesc.replace(/\+/g, ' ')) || 'This password reset link has expired or is invalid.');
            }
            return;
          }
        }

        const queryError = searchParams.get('error_description') || searchParams.get('error');
        if (queryError) {
          if (!isCancelled) {
            setSessionStatus('invalid');
            setErrorMsg(decodeURIComponent(queryError.replace(/\+/g, ' ')));
          }
          return;
        }

        // 2. Check for PKCE exchange code (?code=...)
        if (codeParam) {
          const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(codeParam);
          if (codeErr) {
            console.error('PKCE recovery exchange error:', codeErr);
            if (!isCancelled) {
              setSessionStatus('invalid');
              setErrorMsg(codeErr.message || 'The password reset link has expired or was already used.');
            }
            return;
          }
          if (codeData.session) {
            if (!isCancelled) {
              setSessionStatus('ready');
              if (codeData.session.user.email) setTargetEmail(codeData.session.user.email);
              fetchUserRole(codeData.session.user.id);
            }
            return;
          }
        }

        // 3. Check for Token Hash verification (?token_hash=...&type=recovery)
        if (tokenHashParam && typeParam === 'recovery') {
          const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHashParam,
            type: 'recovery',
          });
          if (otpErr) {
            console.error('OTP recovery error:', otpErr);
            if (!isCancelled) {
              setSessionStatus('invalid');
              setErrorMsg(otpErr.message || 'The recovery token has expired or is invalid.');
            }
            return;
          }
          if (otpData.session) {
            if (!isCancelled) {
              setSessionStatus('ready');
              if (otpData.session.user.email) setTargetEmail(otpData.session.user.email);
              fetchUserRole(otpData.session.user.id);
            }
            return;
          }
        }

        // 4. Check for active Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (!isCancelled) {
            setSessionStatus('ready');
            if (sessionData.session.user.email) setTargetEmail(sessionData.session.user.email);
            fetchUserRole(sessionData.session.user.id);
          }
          return;
        }

        // 5. Listen for PASSWORD_RECOVERY auth event
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (isCancelled) return;
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setSessionStatus('ready');
            if (session?.user?.email) setTargetEmail(session.user.email);
            if (session?.user?.id) fetchUserRole(session.user.id);
          }
        });

        // 6. Safeguard timeout: if after 3.5s no session or token is detected
        const timer = setTimeout(() => {
          if (!isCancelled && sessionStatus === 'checking') {
            setSessionStatus('invalid');
            setErrorMsg('No active password reset session found. Please request a new password reset link.');
          }
        }, 3500);

        return () => {
          clearTimeout(timer);
          authListener.subscription.unsubscribe();
        };
      } catch (err: unknown) {
        if (!isCancelled) {
          setSessionStatus('invalid');
          const msg = err instanceof Error ? err.message : 'Failed to verify password recovery session.';
          setErrorMsg(msg);
        }
      }
    };

    const fetchUserRole = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.role && !isCancelled) {
          setUserRole(profile.role as UserRole);
        }
      } catch {
        // ignore profile lookup failure
      }
    };

    verifyRecoverySession();

    return () => {
      isCancelled = true;
    };
  }, [codeParam, tokenHashParam, typeParam, searchParams, sessionStatus]);

  // Handle password update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValid) {
      setErrorMsg('Password must be at least 8 characters long and include uppercase, lowercase, and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your new password.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        return;
      }

      if (data?.user) {
        if (data.user.email) setTargetEmail(data.user.email);
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (prof?.role) {
          setUserRole(prof.role as UserRole);
        }
      }

      setSessionStatus('success');
      toast.success('Your password has been successfully updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while updating your password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDashboardDestination = () => {
    if (userRole === 'admin') return '/admin';
    if (userRole === 'driver') return '/driver';
    if (userRole === 'dispatcher') return '/dispatcher';
    return '/customer';
  };

  return (
    <AuthShell
      title={
        sessionStatus === 'success'
          ? 'Password Reset Complete'
          : sessionStatus === 'invalid'
          ? 'Reset Link Expired'
          : sessionStatus === 'checking'
          ? 'Verifying Authorization'
          : 'Create New Password'
      }
      subtitle={
        sessionStatus === 'ready'
          ? targetEmail
            ? `Set a new secure password for ${targetEmail}`
            : 'Enter and confirm your new account password below'
          : sessionStatus === 'checking'
          ? 'Verifying end-to-end encrypted session with Supabase…'
          : sessionStatus === 'invalid'
          ? 'The password recovery link could not be validated or has expired'
          : 'Your new password is now active across all authorized platforms'
      }
      footer={
        <div className="flex items-center justify-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      }
    >
      {/* Checking Status */}
      {sessionStatus === 'checking' && (
        <div className="py-10 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto shadow-sm">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-primary">Validating Reset Credentials</h3>
            <p className="text-xs text-muted">Establishing encrypted session with security gateway…</p>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && sessionStatus !== 'checking' && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Invalid or Expired State */}
      {sessionStatus === 'invalid' && (
        <div className="space-y-4 text-center py-2 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <RotateCcw className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-primary font-display">Reset Link Invalid or Expired</h4>
            <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
              For security compliance, password reset links expire after 1 hour or after single use.
            </p>
          </div>
          <div className="pt-3 flex flex-col gap-2">
            <Link
              href="/forgot-password"
              className="btn-brand text-xs !py-3 inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/25"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Request New Reset Link</span>
            </Link>
            <Link
              href="/sign-in"
              className="btn-secondary text-xs !py-2.5 inline-flex items-center justify-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}

      {/* Success State */}
      {sessionStatus === 'success' && (
        <div className="p-6 text-center space-y-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fade-in shadow-inner">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-primary font-display">
              {userRole === 'admin' ? 'Admin Password Updated' : 'Password Successfully Changed'}
            </h4>
            <p className="text-xs text-secondary leading-relaxed">
              Your account password for <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{targetEmail}</strong> is now updated and active.
            </p>
          </div>

          <div className="pt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.replace(getDashboardDestination())}
              className="btn-brand inline-flex items-center justify-center gap-2 text-xs !py-3 !px-5 cursor-pointer shadow-lg shadow-emerald-950/25"
            >
              <span>{userRole === 'admin' ? 'Proceed to Admin Portal' : 'Continue to Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/sign-in"
              className="btn-secondary text-xs !py-2.5 inline-flex items-center justify-center"
            >
              Sign In with New Password
            </Link>
          </div>
        </div>
      )}

      {/* Active Password Reset Form */}
      {sessionStatus === 'ready' && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {targetEmail && (
            <div className="p-3 rounded-2xl bg-surface/70 border border-base/80 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Account Email</span>
                <span className="font-mono text-primary font-medium">{targetEmail}</span>
              </div>
            </div>
          )}

          <div>
            <label className="type-label flex items-center justify-between">
              <span>New Password</span>
              <span className="text-[10px] text-muted font-normal">Min. 8 characters</span>
            </label>
            <div className="relative group/field">
              <Lock className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 group-focus-within/field:scale-110 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-10 pr-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all duration-300"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-primary hover:scale-110 active:scale-95 rounded-lg transition-all duration-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="type-label">Confirm New Password</label>
            <div className="relative group/field">
              <Lock className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 group-focus-within/field:scale-110 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`field-input pl-10 pr-10 h-11 text-xs sm:text-sm bg-input/70 transition-all duration-300 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'group-hover/field:border-emerald-500/40 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15'
                }`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-primary hover:scale-110 active:scale-95 rounded-lg transition-all duration-200 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Passwords do not match.</span>
              </p>
            )}
          </div>

          {/* Password Criteria Checklist */}
          <div className="p-3.5 rounded-2xl bg-surface/70 border border-base/80 space-y-1.5">
            <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold mb-1">
              Security Requirements
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className={`flex items-center gap-1.5 transition-colors ${criteria.length ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {criteria.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>8+ characters</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${criteria.hasUpper ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {criteria.hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Uppercase letter</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${criteria.hasLower ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {criteria.hasLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Lowercase letter</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${criteria.hasNumber ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {criteria.hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Number (0-9)</span>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isValid || password !== confirmPassword}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Updating Password…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Update &amp; Secure Account</span>
              </div>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-page text-primary">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-muted">Loading reset credentials…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
