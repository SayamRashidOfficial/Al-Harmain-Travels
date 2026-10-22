'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Car,
  Wallet,
  UserCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { categorizeDriverAssignments } from '@/lib/assignment-utils';

interface DriverDashboardShellProps {
  children: React.ReactNode;
}

export default function DriverDashboardShell({ children }: DriverDashboardShellProps) {
  const pathname = usePathname();
  const { currentUser, userRole, drivers, bookings, signOut } = useApp();
  const { dir, isRTL, t } = useLanguage();

  const [isHovered, setIsHovered] = useState(false);

  // When route changes, blur active element and reset hover state
  useEffect(() => {
    setIsHovered(false);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  // Identify active driver record
  const currentDriver = useMemo(() => {
    return (
      drivers.find((d) => d.id === currentUser.id || d.profile?.id === currentUser.id) ||
      (userRole === 'admin' ? drivers[0] : undefined)
    );
  }, [drivers, currentUser, userRole]);

  // Driver assignments telemetry
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

  // Status dot color
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

  // Primary Driver Navigation Items (single source of truth with translations)
  const navLinks = [
    {
      href: '/driver',
      label: t('nav.cockpit', 'Cockpit'),
      subtitle: t('nav.cockpitSub', 'Missions & Roster'),
      icon: Car,
      exact: true,
      badge: activeAssignment
        ? t('nav.live', 'LIVE')
        : todayAssignments.length > 0
        ? todayAssignments.length
        : null,
      isLive: !!activeAssignment,
    },
    {
      href: '/driver/earnings',
      label: t('nav.earnings', 'Earnings'),
      subtitle: t('nav.earningsSub', 'Payouts & Ledger'),
      icon: Wallet,
      exact: false,
      badge: null,
      isLive: false,
    },
    {
      href: '/driver/profile',
      label: t('nav.driverProfile', 'Chauffeur Profile'),
      subtitle: t('nav.driverProfileSub', 'Credentials & Vehicle'),
      icon: UserCheck,
      exact: false,
      badge: null,
      isLive: false,
    },
  ];

  const slideHiddenClass = isRTL ? 'translate-x-3' : '-translate-x-3';

  const driverDisplayName =
    currentDriver?.profile?.full_name ||
    currentDriver?.full_name ||
    currentUser?.full_name ||
    (isRTL ? 'كابتن السائق' : 'Captain Driver');

  const driverPlate =
    currentDriver?.vehicle?.plate_number ||
    currentDriver?.assigned_vehicle?.plate_number ||
    'VIP KSA';

  return (
    <div
      dir={dir}
      className="driver-portal customer-portal relative min-h-[calc(100vh-5rem)] w-full bg-page text-primary antialiased overflow-x-hidden"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (lg+ screen size)
          Compact icon-only by default (w-16), expands smoothly on hover (w-64).
          When mouse leaves into main area, smoothly collapses back to w-16.
      ───────────────────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Driver Sidebar Navigation"
        aria-expanded={isHovered}
        className={`hidden lg:flex flex-col shrink-0 fixed top-16 sm:top-20 bottom-0 z-40 ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } border-base bg-white dark:bg-card transition-all duration-300 ease-in-out select-none overflow-hidden group/sidebar ${
          isHovered
            ? 'w-64 shadow-2xl shadow-black/10 dark:shadow-black/50 border-emerald-500/40'
            : 'w-16 hover:w-64 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/50 hover:border-emerald-500/40'
        }`}
      >
        {/* Top Header / Profile Banner */}
        <div className="p-2 border-b border-base bg-white dark:bg-card flex items-center gap-1.5 shrink-0 h-16">
          <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
            <div className="relative">
              {currentUser.avatar_url || currentDriver?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatar_url || currentDriver?.avatar_url || ''}
                  alt={driverDisplayName}
                  className="w-8 h-8 rounded-xl object-cover border-2 border-emerald-500/50 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-900 text-amber-400 font-bold flex items-center justify-center border border-emerald-500/40 shadow-xs text-xs">
                  {driverDisplayName.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 ${
                  isRTL ? '-left-0.5' : '-right-0.5'
                } w-2.5 h-2.5 rounded-full ${statusColorClass} border-2 border-card`}
                title={`Status: ${currentDriver?.status || 'Active'}`}
              />
            </div>
          </div>

          <div
            className={`flex-1 min-w-0 ${
              isRTL ? 'pr-1.5 pl-2 text-right' : 'pl-1.5 pr-2 text-left'
            } overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              isHovered
                ? 'opacity-100 max-w-[170px] translate-x-0 pointer-events-auto'
                : `opacity-0 max-w-0 pointer-events-none ${slideHiddenClass} group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[170px] group-hover/sidebar:translate-x-0 group-hover/sidebar:pointer-events-auto`
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-primary truncate block">
                {driverDisplayName.split(' ')[0]}
              </span>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {isRTL ? 'كابتن معتمد' : 'VIP Chauffeur'}
              </span>
              {driverPlate && (
                <span className="text-[8.5px] font-mono text-muted truncate">
                  {driverPlate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          className="p-2 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none bg-white dark:bg-card"
          aria-label="Driver Sidebar Navigation"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.currentTarget.blur();
                }}
                className={`flex items-center rounded-xl font-medium text-xs transition-all duration-200 relative group/item h-11 w-full ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-900/20'
                    : 'text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base'
                }`}
              >
                {/* Fixed Icon container (always centered at 32px from sidebar edge) */}
                <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover/item:scale-110 ${
                      isActive ? 'text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  />
                  {item.isLive && (
                    <span
                      className={`absolute top-1.5 ${
                        isRTL ? 'left-2.5' : 'right-2.5'
                      } w-2 h-2 rounded-full bg-amber-400 animate-ping`}
                    />
                  )}
                  {item.badge && !item.isLive && (
                    <span
                      className={`group-hover/sidebar:hidden absolute top-1.5 ${
                        isRTL ? 'left-2.5' : 'right-2.5'
                      } w-2 h-2 rounded-full bg-emerald-500 ${isHovered ? 'hidden' : ''}`}
                    />
                  )}
                </div>

                {/* Animated label, subtitle, and badge */}
                <div
                  className={`flex-1 min-w-0 ${
                    isRTL ? 'pr-1.5 pl-2 text-right' : 'pl-1.5 pr-2 text-left'
                  } overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                    isHovered
                      ? 'opacity-100 max-w-[180px] translate-x-0 pointer-events-auto'
                      : `opacity-0 max-w-0 pointer-events-none ${slideHiddenClass} group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[180px] group-hover/sidebar:translate-x-0 group-hover/sidebar:pointer-events-auto`
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          item.badge === t('nav.live', 'LIVE') || item.badge === 'LIVE'
                            ? 'bg-amber-400 text-slate-950 animate-pulse'
                            : isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9.5px] block truncate mt-0.5 ${
                      isActive ? 'text-emerald-100' : 'text-muted'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: Sign Out */}
        <div className="p-2 border-t border-base bg-white dark:bg-card mt-auto shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              signOut();
            }}
            className="w-full flex items-center rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer h-11"
            aria-label={t('signOut', 'Sign Out')}
          >
            <div className="w-12 h-10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover/item:scale-105" />
            </div>
            <div
              className={`flex-1 min-w-0 ${
                isRTL ? 'pr-1.5 pl-2 text-right' : 'pl-1.5 pr-2 text-left'
              } overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                isHovered
                  ? 'opacity-100 max-w-[170px] translate-x-0 pointer-events-auto'
                  : `opacity-0 max-w-0 pointer-events-none ${slideHiddenClass} group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[170px] group-hover/sidebar:translate-x-0 group-hover/sidebar:pointer-events-auto`
              }`}
            >
              <span className="truncate font-semibold">{t('signOut', 'Sign Out')}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
          Fixed padding (lg:pl-16 or lg:pr-16) ensures dashboard content
          NEVER shifts or resizes when the sidebar expands on hover.
      ───────────────────────────────────────────────────────────── */}
      <main
        className={`min-w-0 w-full overflow-x-hidden pb-20 lg:pb-6 ${
          isRTL ? 'lg:pr-16 lg:pl-0' : 'lg:pl-16 lg:pr-0'
        }`}
      >
        {children}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE BOTTOM NAVIGATION BAR (< lg screen size)
          Provides quick, ergonomic, single-tap access to primary modules
      ───────────────────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-base shadow-2xl px-2 py-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile Driver Navigation"
      >
        <div className="grid grid-cols-3 gap-1 items-center max-w-sm mx-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'scale-105 text-emerald-700 dark:text-emerald-400' : ''
                    }`}
                  />
                  {item.isLive && (
                    <span
                      className={`absolute -top-1 ${
                        isRTL ? '-left-1.5' : '-right-1.5'
                      } w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping`}
                    />
                  )}
                  {item.badge && !item.isLive && (
                    <span
                      className={`absolute -top-1 ${
                        isRTL ? '-left-2' : '-right-2'
                      } px-1 py-0.2 bg-emerald-600 text-white rounded-full text-[8.5px] font-bold`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9.5px] tracking-tight mt-0.5 truncate max-w-[80px] text-center">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
