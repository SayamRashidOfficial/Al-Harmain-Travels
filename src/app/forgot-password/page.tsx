'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : 'http://localhost:3000/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        return;
      }

      setIsSubmitted(true);
      toast.success('Password reset instructions dispatched to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch reset email.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Account Recovery · End-to-End Encrypted"
      title="Reset Your Password"
      subtitle="Enter your registered email address to receive secure password recovery instructions"
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
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="p-6 text-center space-y-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fade-in shadow-inner">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-primary font-display">Instructions Dispatched</h4>
            <p className="text-xs text-secondary leading-relaxed">
              If an account exists for <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{email}</strong>, you will receive password reset instructions within 2 minutes.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="btn-brand inline-flex items-center justify-center gap-2 text-xs !py-3 !px-4 shadow-lg shadow-emerald-950/25"
            >
              <span>Proceed to Password Reset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-xs text-muted hover:text-primary transition-colors py-1 underline font-medium"
            >
              Didn&apos;t receive it? Try another email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="type-label flex items-center justify-between">
              <span>Registered Email Address</span>
              <span className="text-[10px] text-muted font-normal">Account identity</span>
            </label>
            <div className="relative group/field">
              <Mail className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 group-focus-within/field:scale-110 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input pl-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all duration-300"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e2ddd5] text-[11px] text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0c392c] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              To protect account privacy and security, we never publicly disclose whether a specific email address is registered on Al Harmain Travels.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Sending Instructions…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Send Reset Instructions</span>
              </div>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
