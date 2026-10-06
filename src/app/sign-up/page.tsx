'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

const COUNTRY_CODES = [
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰', placeholder: '300 1234567' },
  { code: '+971', name: 'UAE', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸', placeholder: '202 555 0123' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷', placeholder: '532 123 4567' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', placeholder: '812 3456 7890' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', placeholder: '12 345 6789' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', placeholder: '10 1234 5678' },
];

export default function SignUpPage() {
  const router = useRouter();
  const { signUpCustomer } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password strength calculation
  const passwordCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    return Object.values(passwordCriteria).filter(Boolean).length;
  }, [passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (password.length === 0) return { label: 'Password Strength', color: 'bg-slate-300 dark:bg-slate-700', text: 'text-muted' };
    if (strengthScore <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500 font-semibold' };
    if (strengthScore <= 4) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-500 font-semibold' };
    return { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-500 font-semibold' };
  }, [password, strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg('Please enter your full legal name (at least 3 characters).');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }
    const cleanPhoneDigits = localPhone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 12) {
      setErrorMsg('Please enter a valid phone number for the selected country.');
      return;
    }
    if (strengthScore < 3 || password.length < 8) {
      setErrorMsg('Please choose a stronger password meeting the security criteria below.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password entry.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    const fullPhone = `${selectedCountry.code} ${localPhone.trim()}`;

    try {
      setIsLoading(true);
      const res = await signUpCustomer({
        fullName,
        email,
        phone: fullPhone,
        password,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed. Please check your information.');
        return;
      }

      if (res.requiresVerification) {
        toast.success('Account created! Please verify your email to activate your account.');
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        toast.success('Account created successfully! Welcome to Al Harmain Travels.');
        router.push('/customer');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Customer Account"
      subtitle="Sign up for executive pilgrimage transfers, real-time chauffeur radar, and flight pickups"
      maxWidth="max-w-[540px]"
    >
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake shadow-sm"
        >
          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Full Legal Name */}
        <div>
          <label className="type-label flex items-center justify-between">
            <span>Full Legal Name</span>
            <span className="text-[10px] text-muted font-normal">As shown on passport / ID</span>
          </label>
          <div className="relative group/field">
            <User className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
            <input
              type="text"
              required
              placeholder="e.g. Dr. Abdullah Rahman"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field-input pl-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 transition-all duration-200"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="type-label flex items-center justify-between">
            <span>Email Address</span>
            <span className="text-[10px] text-muted font-normal">Booking confirmations</span>
          </label>
          <div className="relative group/field">
            <Mail className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input pl-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 transition-all duration-200"
            />
          </div>
        </div>

        {/* Phone Number with Country Code */}
        <div>
          <label className="type-label flex items-center justify-between">
            <span>Phone Number (WhatsApp Active)</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Chauffeur dispatch sync</span>
          </label>
          <div className="flex gap-2">
            <div className="relative w-36 shrink-0">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-full h-11 pl-3 pr-8 rounded-xl bg-input/70 border border-base text-primary text-xs font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 cursor-pointer appearance-none transition-all"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-card text-primary py-1">
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 group/field">
              <Phone className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
              <input
                type="tel"
                required
                placeholder={selectedCountry.placeholder}
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                className="field-input pl-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 transition-all duration-200"
              />
            </div>
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            Trip telemetry and driver arrival notifications will be sent directly via WhatsApp &amp; SMS.
          </span>
        </div>

        {/* Passwords in 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="type-label !mb-0">Password *</label>
              <span className={`text-[10px] ${strengthLabel.text}`}>
                {strengthLabel.label}
              </span>
            </div>
            <div className="relative group/field">
              <Lock className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Min. 8 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-10 pr-10 h-11 text-xs sm:text-sm bg-input/70 group-hover/field:border-emerald-500/40 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary rounded-lg transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="type-label">Confirm Password *</label>
            <div className="relative group/field">
              <Lock className="w-4 h-4 text-muted group-focus-within/field:text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`field-input pl-10 pr-10 h-11 text-xs sm:text-sm bg-input/70 transition-all duration-200 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'group-hover/field:border-emerald-500/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary rounded-lg transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-rose-500 mt-1 font-medium">Passwords do not match.</p>
            )}
          </div>
        </div>

        {/* Password Strength Progress Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx <= strengthScore ? strengthLabel.color : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 rounded-2xl bg-surface/70 border border-base/70">
            <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold mb-1.5">
              Password Security Requirements
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.length ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {passwordCriteria.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>8+ characters</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasUpper ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {passwordCriteria.hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Uppercase letter</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasLower ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {passwordCriteria.hasLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Lowercase letter</span>
              </span>
              <span className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasNumber ? 'text-emerald-500 font-semibold' : 'text-muted'}`}>
                {passwordCriteria.hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted inline-block text-center text-[9px] leading-3 shrink-0">○</span>}
                <span>Number (0-9)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Terms Acceptance */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-secondary select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-md border-base text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="leading-snug">
              I agree to the{' '}
              <span className="text-amber-500 dark:text-amber-400 underline font-semibold hover:text-amber-600 dark:hover:text-amber-300">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-amber-500 dark:text-amber-400 underline font-semibold hover:text-amber-600 dark:hover:text-amber-300">
                Privacy Policy
              </span>.
            </span>
          </label>
        </div>

        {/* Role Notice */}
        <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e2ddd5] text-[11px] text-slate-600 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#0c392c] shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Public registration activates a <strong>Customer</strong> account for VIP transfer reservations. Fleet drivers and dispatch operators are onboarded directly through Administration.
          </span>
        </div>

        {/* Action Buttons: Create Account (Primary) & Sign In (Secondary underneath) */}
        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0c392c] hover:bg-[#07271e] text-white text-sm font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Creating your account…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Create Customer Account</span>
              </div>
            )}
          </button>

          <Link
            href="/sign-in"
            className="w-full py-3.5 px-6 rounded-xl border-2 border-[#0c392c] bg-white hover:bg-slate-50 text-[#0c392c] text-sm font-bold tracking-wide transition-all duration-200 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Sign In to Existing Account</span>
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
