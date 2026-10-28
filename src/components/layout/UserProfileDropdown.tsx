'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase/client';
import { UserRole } from '@/types';
import {
  User,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Loader2,
  Shield,
  Compass,
  Car,
  LayoutDashboard,
} from 'lucide-react';
import { BrandEmblem } from '@/components/ui/BrandLogo';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

interface UserProfileDropdownProps {
  /** Optional custom class for the outer wrapper */
  className?: string;
  /** Force light theme styling for headers */
  forceLight?: boolean;
}

export default function UserProfileDropdown({
  className = '',
  forceLight = false,
}: UserProfileDropdownProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { t, language, dir, isRTL } = useLanguage();
  const {
    currentUser,
    userRole,
    isAuthenticated,
    isAuthLoading,
    signOut,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [liveUserEmail, setLiveUserEmail] = useState<string | null>(null);
  const [liveUserRole, setLiveUserRole] = useState<UserRole | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Synchronize live session data directly from Supabase Auth & profiles table
  const syncSupabaseProfile = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        setLiveUserEmail(null);
        setLiveUserRole(null);
        return;
      }

      setLiveUserEmail(session.user.email ?? null);

      // Fetch verified profile role from database schema
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profileError && profile) {
        if (profile.email) {
          setLiveUserEmail(profile.email);
        }
        if (profile.role) {
          setLiveUserRole(profile.role as UserRole);
        }
      } else if (session.user.user_metadata?.role) {
        setLiveUserRole(session.user.user_metadata.role as UserRole);
      }
    } catch (err) {
      console.warn('Error fetching Supabase user profile in dropdown:', err);
    }
  }, []);

  useEffect(() => {
    syncSupabaseProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setLiveUserEmail(session.user.email ?? null);
        syncSupabaseProfile();
      } else {
        setLiveUserEmail(null);
        setLiveUserRole(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [syncSupabaseProfile]);

  // Compute position to ensure dropdown is directly beneath trigger and clamped within viewport
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    // Desired dropdown width: ~330px on desktop, or clamped to viewport minus 24px safe padding
    const targetWidth = Math.min(330, Math.max(280, vw - 24));

    // Align dropdown right edge with trigger button right edge
    let rightOffset = Math.max(12, vw - triggerRect.right);

    // Prevent overflow off the left side of viewport (guarantee at least 12px padding)
    if (vw - rightOffset - targetWidth < 12) {
      rightOffset = Math.max(12, vw - targetWidth - 12);
    }

    setDropdownPosition({
      top: triggerRect.bottom + 8,
      right: rightOffset,
      width: targetWidth,
    });
  }, []);

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        // Synchronously calculate position for instant layout
        if (triggerRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const vw = window.innerWidth;
          const targetWidth = Math.min(330, Math.max(280, vw - 24));
          let rightOffset = Math.max(12, vw - triggerRect.right);
          if (vw - rightOffset - targetWidth < 12) {
            rightOffset = Math.max(12, vw - targetWidth - 12);
          }
          setDropdownPosition({
            top: triggerRect.bottom + 8,
            right: rightOffset,
            width: targetWidth,
          });
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    const handleScroll = () => {
      // If user scrolls by more than 15px, close dropdown cleanly
      if (Math.abs(window.scrollY - initialScrollY) > 15) {
        setIsOpen(false);
      } else {
        calculatePosition();
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, calculatePosition]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key and restore trigger focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown upon client navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Role resolution priority: live DB role -> AppContext userRole -> fallback 'customer'
  const resolvedRole: UserRole = liveUserRole || userRole || 'customer';

  // Actual user email resolution priority: live DB email -> AppContext email -> empty
  const resolvedEmail: string =
    liveUserEmail ||
    currentUser?.email ||
    '';

  const getFormattedRole = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return isRTL ? 'المشرف العام' : 'Admin';
      case 'dispatcher':
        return isRTL ? 'الترحيل والعمليات' : 'Dispatcher';
      case 'driver':
        return isRTL ? 'سائق VIP' : 'Driver';
      case 'customer':
      default:
        return isRTL ? 'عميل VIP' : 'Customer';
    }
  };

  const getDashboardUrl = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'dispatcher':
        return '/dispatcher';
      case 'driver':
        return '/driver';
      case 'customer':
      default:
        return '/customer';
    }
  };

  const getProfileUrl = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '/admin/settings';
      case 'driver':
        return '/driver/profile';
      case 'dispatcher':
        return '/dispatcher';
      case 'customer':
      default:
        return '/customer/profile';
    }
  };

  const getRoleBadgeStyle = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'bg-amber-50 text-amber-900 border-amber-200/90';
      case 'dispatcher':
        return 'bg-blue-50 text-blue-900 border-blue-200/90';
      case 'driver':
        return 'bg-teal-50 text-teal-900 border-teal-200/90';
      case 'customer':
      default:
        // Matches the subtle green pill badge in the reference image
        return 'bg-[#edf5ef] text-[#244b32] border-[#cde2d3]';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 shrink-0 text-amber-700" />;
      case 'dispatcher':
        return <Compass className="w-3.5 h-3.5 shrink-0 text-blue-700" />;
      case 'driver':
        return <Car className="w-3.5 h-3.5 shrink-0 text-teal-700" />;
      case 'customer':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#244b32]" />;
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setIsOpen(false);
      await signOut();
      toast.success('Signed out successfully.');
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Profile Trigger Icon Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        aria-label="User account menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`p-2.5 rounded-xl border relative transition-all cursor-pointer active:scale-95 flex items-center justify-center w-10 h-10 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/25 ${
          isOpen
            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 text-charcoal'
            : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-slate-200/90'
        }`}
      >
        {isAuthLoading ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-400" />
        ) : (
          <User className="w-[18px] h-[18px] text-slate-700 transition-colors" />
        )}
      </button>

      {/* 
        Profile Dropdown Panel
        - Dimensions: ~330px width on desktop, responsive max-width on mobile
        - Positioning: Fixed with viewport clamp directly beneath trigger button
        - Visual: Clean light theme matching reference image, soft shadow, rounded-2xl (16px)
      */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          style={
            dropdownPosition
              ? {
                  position: 'fixed',
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`,
                  width: `${dropdownPosition.width}px`,
                }
              : undefined
          }
          className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl shadow-slate-900/10 z-[100] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 p-4 select-none"
          dir={dir}
        >
          {isAuthLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>{isRTL ? 'التحقق من حالة الحساب...' : 'Verifying account status...'}</span>
            </div>
          ) : isAuthenticated ? (
            <>
              {/* Header: User avatar + Signed in as + Email + Role Badge (matching reference image) */}
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  {/* User Avatar Circle */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 font-bold text-xs shadow-2xs mt-0.5">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : currentUser?.full_name ? (
                      currentUser.full_name.charAt(0).toUpperCase()
                    ) : (
                      <User className="w-4.5 h-4.5 text-slate-600" />
                    )}
                  </div>

                  {/* User Email & Identity Details */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal text-slate-500 leading-tight">
                      {isRTL ? 'مسجل الدخول باسم' : 'Signed in as'}
                    </p>
                    <p
                      className="text-sm font-semibold text-slate-900 truncate mt-0.5 tracking-tight"
                      title={resolvedEmail}
                    >
                      {resolvedEmail || (isRTL ? 'مستخدم موثق' : 'Verified User')}
                    </p>

                    {/* Compact Role Badge matching reference design */}
                    <div className="mt-1.5 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border shadow-2xs ${getRoleBadgeStyle(
                          resolvedRole
                        )}`}
                      >
                        {getRoleIcon(resolvedRole)}
                        <span>{getFormattedRole(resolvedRole)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Actions: Dashboard, My Profile, Sign Out */}
              <div className="pt-2 space-y-0.5">
                {/* 1. Dashboard */}
                <Link
                  href={getDashboardUrl(resolvedRole)}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 active:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{isRTL ? 'لوحة التحكم' : 'Dashboard'}</span>
                </Link>

                {/* 2. My Profile */}
                <Link
                  href={getProfileUrl(resolvedRole)}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 active:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{isRTL ? 'الملف الشخصي' : 'My Profile'}</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                {/* 3. Red Sign Out Button */}
                <button
                  type="button"
                  role="menuitem"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50/70 active:bg-rose-100/60 transition-colors text-left rtl:text-right cursor-pointer disabled:opacity-50 focus:outline-none focus:bg-rose-50/70 focus:ring-1 focus:ring-rose-500/20"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500 shrink-0" />
                  ) : (
                    <LogOut className={`w-4 h-4 text-rose-500 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                  )}
                  <span>{isSigningOut ? (isRTL ? 'جاري تسجيل الخروج...' : 'Signing out...') : (isRTL ? 'تسجيل الخروج' : 'Sign Out')}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logged Out / Guest Visitor State */}
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center shrink-0 border border-emerald-800/40 shadow-xs mt-0.5 p-1">
                    <BrandEmblem size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal text-slate-500 leading-tight">
                      {isRTL ? 'مرحباً بالضيف الكريم' : 'Welcome Guest'}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate mt-0.5 tracking-tight">
                      {isRTL ? 'شركة الحرمين للنقل' : 'Al Harmain Travels'}
                    </p>
                    <div className="mt-1.5 flex items-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border bg-[#edf5ef] text-[#244b32] border-[#cde2d3] shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#244b32]" />
                        <span>{isRTL ? 'ضيف VIP' : 'VIP Guest'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Actions */}
              <div className="pt-2 space-y-0.5">
                <Link
                  href="/sign-in"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 active:bg-emerald-100/70 transition-colors focus:outline-none focus:bg-emerald-50/80"
                >
                  <LogIn className={`w-4 h-4 text-emerald-600 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                  <span>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
                </Link>

                <Link
                  href="/sign-up"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50/80 active:bg-amber-100/70 transition-colors focus:outline-none focus:bg-amber-50/80"
                >
                  <UserPlus className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isRTL ? 'إنشاء حساب جديد' : 'Create Account'}</span>
                </Link>
              </div>

              {/* Discreet Brand Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <BrandEmblem size="xs" className="scale-75 origin-left rtl:origin-right" />
                  <span className="font-semibold text-slate-600">{isRTL ? 'شركة الحرمين للنقل الفاخر' : 'Al Harmain Travels'}</span>
                </div>
                <span>{isRTL ? 'نقل مرخص ومعتمد' : 'Licensed Chauffeur'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
