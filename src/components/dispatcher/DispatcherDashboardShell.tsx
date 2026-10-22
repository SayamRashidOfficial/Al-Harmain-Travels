'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Compass,
  Clock,
  Car,
  Users,
  PhoneCall,
  Sparkles,
  LogOut,
} from 'lucide-react';

interface DispatcherDashboardShellProps {
  children: React.ReactNode;
}

export default function DispatcherDashboardShell({ children }: DispatcherDashboardShellProps) {
  const pathname = usePathname();
  const { currentUser, bookings, drivers, signOut } = useApp();
  const { dir, isRTL, t } = useLanguage();

  const [isHovered, setIsHovered] = useState(false);

  // When route changes, blur active element and reset hover state
  useEffect(() => {
    setIsHovered(false);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  // Count pending & actionable bookings awaiting review or driver assignment
  const pendingQueueCount = useMemo(() => {
    return bookings.filter((b) => {
      return (
        b.status === 'pending' ||
        b.status === 'pending_review' ||
        b.status === 'pending_verification' ||
        b.status === 'confirmed'
      );
    }).length;
  }, [bookings]);

  // Count online / active fleet chauffeurs
  const activeDriversCount = useMemo(() => {
    return drivers.filter((d) => d.status !== 'offline').length;
  }, [drivers]);

  // Check if there are active in-progress trips on the road
  const hasActiveTrips = useMemo(() => {
    return bookings.some((b) => {
      return (
        b.status === 'driver_assigned' ||
        b.status === 'driver_accepted' ||
        b.status === 'accepted' ||
        b.status === 'driver_arriving' ||
        b.status === 'on_the_way' ||
        b.status === 'driver_arrived' ||
        b.status === 'arrived' ||
        b.status === 'trip_started' ||
        b.status === 'started' ||
        b.status === 'ride_started'
      );
    });
  }, [bookings]);

  // Primary 5 Dispatcher Navigation Items (single source of truth with translation)
  const navLinks = [
    {
      href: '/dispatcher',
      label: t('nav.radar', 'Fleet Radar'),
      subtitle: t('nav.radarSub', 'Live Vehicle Tracking'),
      icon: Compass,
      exact: true,
      badge: t('nav.live', 'LIVE'),
      isLive: hasActiveTrips,
    },
    {
      href: '/dispatcher/queue',
      label: t('nav.queue', 'Ride Queue'),
      subtitle: t('nav.queueSub', 'Assignments & Review'),
      icon: Clock,
      exact: false,
      badge: pendingQueueCount > 0 ? pendingQueueCount : null,
      isLive: false,
    },
    {
      href: '/dispatcher/drivers',
      label: t('nav.drivers', 'Chauffeurs'),
      subtitle: t('nav.driversSub', 'Fleet Captain Roster'),
      icon: Car,
      exact: false,
      badge: activeDriversCount > 0 ? `${activeDriversCount} on` : null,
      isLive: false,
    },
    {
      href: '/dispatcher/customers',
      label: t('nav.customers', 'Customers'),
      subtitle: t('nav.customersSub', 'Pilgrim Directory'),
      icon: Users,
      exact: false,
      badge: null,
      isLive: false,
    },
    {
      href: '/dispatcher/new-booking',
      label: t('nav.newBooking', 'New Booking'),
      subtitle: t('nav.newBookingSub', 'Manual Intake'),
      icon: PhoneCall,
      exact: false,
      badge: null,
      isLive: false,
    },
  ];

  const slideHiddenClass = isRTL ? 'translate-x-3' : '-translate-x-3';

  return (
    <div
      dir={dir}
      className="dispatcher-portal customer-portal relative min-h-[calc(100vh-5rem)] w-full bg-page text-primary antialiased overflow-x-hidden"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (lg+ screen size)
          Compact icon-only by default (w-16), expands smoothly on hover (w-64).
          When mouse leaves into main area, smoothly collapses back to w-16.
      ───────────────────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Dispatcher Sidebar Navigation"
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
              {currentUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="w-8 h-8 rounded-xl object-cover border-2 border-emerald-500/50 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-900 text-amber-400 font-bold flex items-center justify-center border border-emerald-500/40 shadow-xs text-xs">
                  {currentUser.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 ${
                  isRTL ? '-left-0.5' : '-right-0.5'
                } w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card`}
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
                {currentUser.full_name?.split(' ')[0] || (isRTL ? 'مشرف العمليات' : 'Dispatcher')}
              </span>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mt-0.5">
              {isRTL ? 'تحكم الأسطول' : 'Fleet Dispatcher'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          className="p-2 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none bg-white dark:bg-card"
          aria-label="Dispatcher Sidebar Navigation"
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
        aria-label="Mobile Dispatcher Navigation"
      >
        <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
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
                    <span className={`absolute -top-1 ${isRTL ? '-left-1.5' : '-right-1.5'} w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping`} />
                  )}
                  {item.badge && !item.isLive && (
                    <span className={`absolute -top-1 ${isRTL ? '-left-2' : '-right-2'} px-1 py-0.2 bg-emerald-600 text-white rounded-full text-[8.5px] font-bold`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] tracking-tight mt-0.5 truncate max-w-[62px] text-center">
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
