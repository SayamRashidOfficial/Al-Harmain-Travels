'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  Car,
  Wallet,
  UserCheck,
  Globe,
  LogOut,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { categorizeDriverAssignments } from '@/lib/assignment-utils';

interface DriverMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DriverMobileSidebar({ isOpen, onClose }: DriverMobileSidebarProps) {
  const pathname = usePathname();
  const { currentUser, userRole, drivers, bookings, signOut } = useApp();
  const { dir, isRTL, t } = useLanguage();

  // Close sidebar only when pathname actually changes from the current path
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll and prevent background gestures when sidebar is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const currentDriver = useMemo(() => {
    return (
      drivers.find((d) => d.id === currentUser.id || d.profile?.id === currentUser.id) ||
      (userRole === 'admin' ? drivers[0] : undefined)
    );
  }, [drivers, currentUser, userRole]);

  const { todayAssignments, activeAssignment } = useMemo(() => {
    if (!currentDriver?.id) {
      return { todayAssignments: [], activeAssignment: null };
    }
    const cat = categorizeDriverAssignments(currentDriver.id, bookings);
    return {
      todayAssignments: cat.today,
      activeAssignment: cat.activeAssignment,
    };
  }, [currentDriver?.id, bookings]);

  const statusColorClass = useMemo(() => {
    if (!currentDriver) return 'bg-emerald-500';
    switch (currentDriver.status) {
      case 'available':
        return 'bg-emerald-500';
      case 'on_trip':
        return 'bg-purple-500';
      case 'assigned':
        return 'bg-amber-500';
      case 'offline':
        return 'bg-rose-500';
      default:
        return 'bg-emerald-500';
    }
  }, [currentDriver]);

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const driverDisplayName =
    currentDriver?.profile?.full_name ||
    currentDriver?.full_name ||
    currentUser?.full_name ||
    (isRTL ? 'كابتن السائق' : 'Captain Driver');

  const driverVehicleText = useMemo(() => {
    const make = currentDriver?.vehicle?.make || currentDriver?.assigned_vehicle?.make || 'GMC';
    const model = currentDriver?.vehicle?.model || currentDriver?.assigned_vehicle?.model || 'Yukon XL';
    const plate = currentDriver?.vehicle?.plate_number || currentDriver?.assigned_vehicle?.plate_number || 'VIP KSA 7788';
    return `${make} ${model} · ${plate}`;
  }, [currentDriver]);

  const navLinks = [
    {
      href: '/driver',
      label: t('nav.cockpit', 'Cockpit & Missions'),
      description: t('nav.cockpitSub', 'Active VIP Missions & Roster'),
      icon: Car,
      exact: true,
      badge: activeAssignment
        ? t('nav.live', 'LIVE')
        : todayAssignments.length > 0
        ? `${todayAssignments.length} today`
        : null,
      isLive: !!activeAssignment,
    },
    {
      href: '/driver/earnings',
      label: t('nav.earnings', 'Earnings & Financials'),
      description: t('nav.earningsSub', 'Fares, Tips & Cash Ledger'),
      icon: Wallet,
      exact: false,
      badge: null,
      isLive: false,
    },
    {
      href: '/driver/profile',
      label: t('nav.driverProfile', 'Chauffeur Profile & Vehicle'),
      description: t('nav.driverProfileSub', 'MOT License & Credentials'),
      icon: UserCheck,
      exact: false,
      badge: null,
      isLive: false,
    },
  ];

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. BACKDROP (Semi-transparent overlay with smooth fade)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SIDEBAR DRAWER (Slides smoothly from side)
      ───────────────────────────────────────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Driver navigation drawer"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className={`lg:hidden fixed top-0 bottom-0 ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } z-[70] w-[min(280px,80vw)] max-w-xs h-full flex flex-col bg-white text-slate-900 border-slate-200/90 shadow-2xl transition-transform duration-300 ease-out transform ${
          isOpen
            ? 'translate-x-0 pointer-events-auto'
            : isRTL
            ? 'translate-x-full pointer-events-none'
            : '-translate-x-full pointer-events-none'
        }`}
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: isRTL ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: isRTL ? 'max(0.75rem, env(safe-area-inset-right))' : '0.75rem',
        }}
      >
        {/* Header: Title + Close Button */}
        <div className="flex items-center justify-between px-3.5 pb-3 border-b border-slate-200/90 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {isRTL ? 'بوابة الكابتن السائق' : 'Captain Driver Cockpit'}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {isRTL ? 'إدارة الرحلات والأسطول' : 'VIP Missions & Fleet Controls'}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200/90 transition-colors w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div
          className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Driver Profile card */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {currentUser?.avatar_url || currentDriver?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url || currentDriver?.avatar_url || ''}
                    alt={driverDisplayName}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/50 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-950 text-amber-400 font-bold flex items-center justify-center border border-emerald-500/40 shadow-xs text-sm">
                    {driverDisplayName.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 ${
                    isRTL ? '-left-0.5' : '-right-0.5'
                  } w-2.5 h-2.5 rounded-full ${statusColorClass} border-2 border-white`}
                  title={`Status: ${currentDriver?.status || 'Active'}`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {driverDisplayName}
                  </h3>
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.phone || currentDriver?.phone || currentUser?.email || 'Captain Chauffeur'}
                </p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                    {isRTL ? 'كابتن معتمد' : 'VIP Chauffeur'}
                  </span>
                  {currentDriver?.status && (
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {currentDriver.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle info snippet */}
            <div className="px-2.5 py-1 rounded-lg bg-white/70 border border-slate-200 text-[10px] text-slate-600 font-mono truncate">
              {driverVehicleText}
            </div>

            {/* Profile Settings Access */}
            <Link
              href="/driver/profile"
              onClick={onClose}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors shadow-2xs group"
            >
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>{isRTL ? 'الملف الشخصي والمركبة' : 'Profile & Vehicle'}</span>
              </span>
              <ChevronIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1.5">
              {isRTL ? 'قائمة التنقل' : 'Navigation'}
            </p>

            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 text-left rtl:text-right">
                      <div className="text-xs font-bold truncate">
                        {item.label}
                      </div>
                      <p
                        className={`text-[9.5px] truncate ${
                          isActive ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          item.badge === t('nav.live', 'LIVE') || item.badge === 'LIVE'
                            ? 'bg-amber-400 text-slate-950 animate-pulse'
                            : isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronIcon
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Links */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1.5">
              {isRTL ? 'روابط عامة' : 'Quick Access'}
            </p>

            {/* Visit Public Website */}
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200/90 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:text-amber-600 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-left rtl:text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {isRTL ? 'الموقع العام' : 'Visit Public Website'}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {isRTL ? 'الصفحة الرئيسية والأسطول' : 'Home & Fleet Overview'}
                  </p>
                </div>
              </div>
              <ChevronIcon className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* SIGN OUT */}
        <div className="p-3 border-t border-slate-200/90 shrink-0 bg-slate-50/80 space-y-1.5">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('signOut', 'Sign Out')}</span>
          </button>
          <p className="text-[9px] text-center text-slate-400">
            {isRTL ? 'نقل مرخص من الهيئة العامة للنقل · الحرمين' : 'KSA MOT Licensed Transport · Al Harmain'}
          </p>
        </div>
      </aside>
    </>
  );
}
