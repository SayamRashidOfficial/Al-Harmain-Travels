'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Compass,
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Truck,
  Users,
  UserCog,
  Receipt,
  Route,
  Wallet,
  Star,
  Bell,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string | number | null;
  badgeTone?: 'green' | 'amber' | 'blue' | 'purple' | 'neutral';
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'Core HQ',
    items: [
      {
        href: '/admin',
        label: 'Overview',
        subtitle: 'Executive Cockpit',
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        href: '/admin/bookings',
        label: 'Bookings',
        subtitle: 'Global Book Registry',
        icon: CalendarCheck,
      },
      {
        href: '/admin/dispatch',
        label: 'Live Dispatch',
        subtitle: 'Telemetry & Assignments',
        icon: Compass,
      },
      {
        href: '/admin/payments',
        label: 'Payments',
        subtitle: 'Verification & History',
        icon: CreditCard,
      },
      {
        href: '/admin/drivers',
        label: 'Drivers',
        subtitle: 'Chauffeur Management',
        icon: UserCheck,
      },
      {
        href: '/admin/fleet',
        label: 'Fleet & Vehicles',
        subtitle: 'Vehicle Registry',
        icon: Truck,
      },
      {
        href: '/admin/users',
        label: 'Users & Roles',
        subtitle: 'Global Accounts & RBAC',
        icon: Users,
      },
      {
        href: '/admin/customers',
        label: 'Customers',
        subtitle: 'Pilgrim Profiles',
        icon: Users,
      },
      {
        href: '/admin/staff',
        label: 'Dispatchers & Staff',
        subtitle: 'Role & Access Control',
        icon: UserCog,
      },
    ],
  },
  {
    title: 'Tariff & Finance',
    items: [
      {
        href: '/admin/rates',
        label: 'Fixed Fares',
        subtitle: 'Rate Master',
        icon: Receipt,
      },
      {
        href: '/admin/routes',
        label: 'Routes & Areas',
        subtitle: 'Service Zones',
        icon: Route,
      },
      {
        href: '/admin/earnings',
        label: 'Driver Earnings',
        subtitle: 'Payroll & Settlement',
        icon: Wallet,
      },
    ],
  },
  {
    title: 'Governance',
    items: [
      {
        href: '/admin/reviews',
        label: 'Reviews & Ratings',
        subtitle: 'Ride Quality',
        icon: Star,
      },
      {
        href: '/admin/notifications',
        label: 'Notifications',
        subtitle: 'System Alerts',
        icon: Bell,
      },
      {
        href: '/admin/analytics',
        label: 'Reports & Analytics',
        subtitle: 'Business Intelligence',
        icon: BarChart3,
      },
      {
        href: '/admin/audit-logs',
        label: 'Audit Logs',
        subtitle: 'Security & Activities',
        icon: FileText,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        href: '/admin/settings',
        label: 'Settings',
        subtitle: 'Company & Policies',
        icon: Settings,
      },
      {
        href: '/admin/services',
        label: 'Services CMS',
        subtitle: 'Marketing Packages',
        icon: Sparkles,
      },
      {
        href: '/admin/profile',
        label: 'Admin Profile',
        subtitle: 'Account & Security',
        icon: UserCircle,
      },
    ],
  },
];

interface AdminDashboardShellProps {
  children: React.ReactNode;
}

export default function AdminDashboardShell({ children }: AdminDashboardShellProps) {
  const pathname = usePathname();
  const { currentUser, signOut, bookings, drivers } = useApp();
  const { dir, isRTL, t } = useLanguage();

  const [isHovered, setIsHovered] = useState(false);

  // When route changes, blur active element and reset hover state
  useEffect(() => {
    setIsHovered(false);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  // Global mouse move guard: if cursor moves outside the desktop sidebar bounds, collapse immediately
  useEffect(() => {
    if (!isHovered) return;

    const handleMouseMove = (e: MouseEvent) => {
      const sidebar = document.getElementById('admin-desktop-sidebar');
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        const isOutside = isRTL
          ? e.clientX < rect.left - 8 || e.clientY < rect.top || e.clientY > rect.bottom
          : e.clientX > rect.right + 8 || e.clientY < rect.top || e.clientY > rect.bottom;

        if (isOutside) {
          setIsHovered(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered, isRTL]);

  // Pending bookings count for Overview badge
  const pendingCount = useMemo(() => {
    return bookings.filter((b) => b.status === 'pending').length;
  }, [bookings]);

  // Unread notifications count for Notifications badge
  const pendingPaymentsCount = useMemo(() => {
    return bookings.filter(
      (b) => b.payment_status === 'pending' && b.payment_screenshot_url
    ).length;
  }, [bookings]);

  // Mobile Bottom Navigation Bar Links (5 primary modules)
  const mobileNavLinks = [
    {
      href: '/admin',
      label: isRTL ? 'الرئيسية' : 'Overview',
      icon: LayoutDashboard,
      exact: true,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      href: '/admin/bookings',
      label: isRTL ? 'الحجوزات' : 'Bookings',
      icon: CalendarCheck,
      exact: false,
      badge: null,
    },
    {
      href: '/admin/drivers',
      label: isRTL ? 'السائقون' : 'Drivers',
      icon: UserCheck,
      exact: false,
      badge: null,
    },
    {
      href: '/admin/earnings',
      label: isRTL ? 'الأرباح' : 'Earnings',
      icon: Wallet,
      exact: false,
      badge: null,
    },
    {
      href: '/admin/settings',
      label: isRTL ? 'الإعدادات' : 'Settings',
      icon: Settings,
      exact: false,
      badge: null,
    },
  ];

  const slideHiddenClass = isRTL ? 'translate-x-3' : '-translate-x-3';

  const getSectionTitle = (title: string) => {
    switch (title) {
      case 'Core HQ': return isRTL ? 'المقر الرئيسي' : 'Core HQ';
      case 'Operations': return isRTL ? 'العمليات' : 'Operations';
      case 'Tariff & Finance': return isRTL ? 'التعريفات والمالية' : 'Tariff & Finance';
      case 'Governance': return isRTL ? 'الحوكمة والأمان' : 'Governance';
      case 'System': return isRTL ? 'النظام' : 'System';
      default: return title;
    }
  };

  // Determine badge for nav items
  const getItemBadge = (item: AdminNavItem): number | string | null | undefined => {
    if (item.href === '/admin' && pendingCount > 0) return pendingCount;
    if (item.href === '/admin/payments' && pendingPaymentsCount > 0) return pendingPaymentsCount;
    return item.badge;
  };

  return (
    <div
      dir={dir}
      className="admin-portal customer-portal relative min-h-[calc(100vh-5rem)] w-full bg-page text-primary antialiased overflow-x-hidden"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (lg+ screen size)
          Compact icon-only by default (w-16), expands smoothly on hover (w-64).
          When mouse leaves into main area, smoothly collapses back to w-16.
      ───────────────────────────────────────────────────────────── */}
      <aside
        id="admin-desktop-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Executive Admin Sidebar Navigation"
        aria-expanded={isHovered}
        className={`hidden lg:flex flex-col shrink-0 fixed top-16 sm:top-20 bottom-0 z-40 ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } border-slate-200 bg-white transition-all duration-300 ease-in-out select-none overflow-hidden group/sidebar ${
          isHovered
            ? 'w-64 shadow-xl shadow-slate-200/90 border-emerald-500/40'
            : 'w-16 hover:w-64 hover:shadow-xl hover:shadow-slate-200/90 hover:border-emerald-500/40'
        }`}
      >
        {/* Top Header / Profile Banner */}
        <div className="p-2 border-b border-slate-200 bg-white flex items-center gap-1.5 shrink-0 h-16">
          <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
            <div className="relative">
              {currentUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="w-8 h-8 rounded-xl object-cover border-2 border-amber-500/50 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold flex items-center justify-center border border-amber-400/40 shadow-xs text-xs">
                  {currentUser.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 ${
                  isRTL ? '-left-0.5' : '-right-0.5'
                } w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white`}
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
                {currentUser.full_name?.split(' ')[0] || (isRTL ? 'المشرف العام' : 'Admin HQ')}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-0.5">
              <Shield className="w-2.5 h-2.5 text-amber-500" />
              {isRTL ? 'إدارة عليا' : 'Single Authority'}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav
          className="p-2 space-y-1 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none bg-white"
          aria-label="Executive Admin Navigation Links"
        >
          {ADMIN_NAV_SECTIONS.map((section, sIdx) => (
            <div key={section.title} className="space-y-0.5">
              {/* Section Divider / Label */}
              {sIdx > 0 && (
                <div className="py-0.5">
                  <div
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                      isHovered
                        ? 'opacity-100 max-h-6 px-2.5 pb-0.5 pointer-events-auto'
                        : `opacity-0 max-h-0 pointer-events-none ${slideHiddenClass} group-hover/sidebar:opacity-100 group-hover/sidebar:max-h-6 group-hover/sidebar:px-2.5 group-hover/sidebar:pb-0.5 group-hover/sidebar:pointer-events-auto`
                    }`}
                  >
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted font-sans">
                      {getSectionTitle(section.title)}
                    </p>
                  </div>
                  <div
                    className={`border-t border-base/60 my-1 mx-2 transition-opacity duration-300 ${
                      isHovered ? 'hidden' : 'block group-hover/sidebar:hidden'
                    }`}
                  />
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                const itemBadge = getItemBadge(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setIsHovered(false);
                    }}
                    className={`flex items-center rounded-xl font-medium text-xs transition-all duration-200 relative group/item h-10 w-full ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-900/20'
                        : 'text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base'
                    }`}
                  >
                    {/* Fixed Icon container (always centered at 32px from sidebar edge) */}
                    <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover/item:scale-110 ${
                          isActive ? 'text-amber-300' : 'text-emerald-700'
                        }`}
                      />
                      {itemBadge && (
                        <span
                          className={`group-hover/sidebar:hidden absolute top-1.5 ${
                            isRTL ? 'left-2.5' : 'right-2.5'
                          } w-2 h-2 rounded-full bg-amber-400 ${isHovered ? 'hidden' : ''}`}
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
                        {itemBadge && (
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                            }`}
                          >
                            {itemBadge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9.5px] block truncate mt-0.5 ${
                          isActive ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Sign Out */}
        <div className="p-2 border-t border-slate-200 bg-white mt-auto shrink-0">
          {/* Sign Out */}
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              setIsHovered(false);
              signOut();
            }}
            className="w-full flex items-center rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer h-10"
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
              <span className="truncate font-semibold">{t('signOut', 'Sign Out')} HQ</span>
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
        onMouseEnter={() => setIsHovered(false)}
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
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl px-2 py-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile Admin Navigation"
      >
        <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
          {mobileNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'scale-105 text-emerald-700' : ''
                    }`}
                  />
                  {item.badge && (
                    <span className={`absolute -top-1 ${isRTL ? '-left-2' : '-right-2'} px-1 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[8.5px] font-bold`}>
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
