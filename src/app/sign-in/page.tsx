'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { signIn } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setUnverifiedEmail(null);

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn(email, password);
      if (res.success) {
        toast.success("Welcome back — you're signed in.");

        // Strict role validation for redirect: Only follow redirect if it belongs to the user's role
        const isValidRedirectForRole = (url: string | null, role?: string) => {
          if (!url || !url.startsWith('/') || url.startsWith('/auth')) return false;
          if (role === 'admin') return url.startsWith('/admin');
          if (role === 'dispatcher') return url.startsWith('/dispatcher') || url.startsWith('/staff');
          if (role === 'driver') return url.startsWith('/driver');
          if (role === 'customer') return url.startsWith('/customer');
          return false;
        };

        if (redirectParam && isValidRedirectForRole(redirectParam, res.role)) {
          router.push(redirectParam);
          return;
        }

        // Dedicated dashboard per role
        switch (res.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'dispatcher':
            router.push('/dispatcher');
            break;
          case 'driver':
            router.push('/driver');
            break;
          case 'customer':
          default:
            router.push('/customer');
            break;
        }
      } else {
        if (res.requiresVerification) {
          setUnverifiedEmail(res.email || email.trim().toLowerCase());
        }
        setErrorMsg(res.error || 'Invalid email or password. Please verify your credentials.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your account to reserve, track, or manage executive journeys"
    >
      {/* Verification notice for unverified accounts */}
      {unverifiedEmail ? (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-3 animate-fade-in shadow-sm"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-primary block text-sm">Email Verification Required</span>
              <p className="leading-relaxed text-secondary text-xs">
                {errorMsg || 'Your email address has not been confirmed yet. Please verify your email before signing in.'}
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <Link
              href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
              className="bg-[#0c392c] hover:bg-[#07271e] text-white text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5 shadow-md transition-all active:scale-95 font-semibold"
            >
              <span>Resend / Verify Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : errorMsg ? (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      ) : null}

      <form onSubmit={handleSignIn} className="space-y-4 text-xs">
        {/* Email Address */}
        <div>
          <label htmlFor="email" className="type-label flex items-center justify-between">
            <span>Email Address</span>
            <span className="text-[10px] text-slate-500 font-normal">Registered account</span>
          </label>
          <div className="relative group/field">
            <Mail className="w-4 h-4 text-[#0c392c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input pl-10 h-11 text-xs sm:text-sm bg-white border border-[#e2ddd5] group-hover/field:border-[#0c392c]/50 focus:border-[#0c392c] focus:ring-2 focus:ring-[#0c392c]/15 transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="type-label !mb-0">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-[#0c392c] hover:text-[#07271e] font-semibold hover:underline transition-colors focus-visible:outline-none"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative group/field">
            <Lock className="w-4 h-4 text-[#0c392c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input pl-10 pr-11 h-11 text-xs sm:text-sm bg-white border border-[#e2ddd5] group-hover/field:border-[#0c392c]/50 focus:border-[#0c392c] focus:ring-2 focus:ring-[#0c392c]/15 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#0c392c] hover:opacity-75 active:scale-95 rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Session */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 select-none group/check">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-md border-base text-[#0c392c] focus:ring-[#0c392c] focus:ring-offset-0 transition-all cursor-pointer"
            />
            <span className="group-hover/check:text-slate-900 transition-colors">Remember session on this device</span>
          </label>
        </div>

        {/* Action Buttons: Sign In (Primary) & Register (Secondary) stacked with clean solid styling */}
        <div className="space-y-3 pt-2">
          {/* Primary Sign In Button (Solid, No Gradients) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing in…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Sign In</span>
              </div>
            )}
          </button>

          {/* Secondary Register Button (Solid, No Gradients) */}
          <Link
            href="/sign-up"
            className="w-full py-3.5 px-6 rounded-xl border-2 border-[#0c392c] bg-white hover:bg-slate-50 text-[#0c392c] text-sm font-bold tracking-wide transition-all duration-200 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Register</span>
          </Link>
        </div>
      </form>

      {/* RBAC Notice */}
      <div className="flex items-start gap-2.5 text-[11px] text-slate-600 bg-[#faf8f4] rounded-2xl p-3.5 border border-[#e2ddd5]">
        <ShieldCheck className="w-4 h-4 text-[#0c392c] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Pilgrims and travelers access booking history. Captains, dispatchers, and administrators are securely dispatched to their respective operational portals.
        </p>
      </div>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-page text-primary">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#0c392c] animate-spin" />
            <p className="text-xs text-muted">Securing session…</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
