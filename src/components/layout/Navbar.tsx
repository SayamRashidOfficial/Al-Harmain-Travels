'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import {
  Car,
  Compass,
  LayoutDashboard,
  Bell,
  Shield,
  User,
  Menu,
  X,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  PhoneCall,
  Phone,
  MessageSquare,
  ChevronRight,
  Info,
  ChevronDown,
  Star,
  Sliders,
  Receipt,
} from 'lucide-react';

import CustomerMobileSidebar from '@/components/customer/CustomerMobileSidebar';

export default function Navbar() {
  const pathname = usePathname();
  const {
    userRole,
    currentUser,
    isAuthenticated,
    isAuthLoading,
    signOut,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    addNotification,
    activeCustomerBooking,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomerSidebarOpen, setIsCustomerSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleCloseCustomerSidebar = useCallback(() => {
    setIsCustomerSidebarOpen(false);
  }, []);

  const handleToggleCustomerSidebar = useCallback(() => {
    setIsCustomerSidebarOpen((prev) => !prev);
    setIsNotifOpen(false);
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const customerMobileNotifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const prevUnreadCountRef = useRef(unreadCount);
  const [hasNewNotif, setHasNewNotif] = useState(false);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setHasNewNotif(true);
      const timer = setTimeout(() => {
        setHasNewNotif(false);
      }, 4500);
      prevUnreadCountRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);
  const isCustomer = userRole === 'customer';
  const isCustomerPortal = pathname.startsWith('/customer');
  const isAuthRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/verify-phone') ||
    pathname.startsWith('/callback') ||
    pathname.startsWith('/auth');
  const showBookCta = (!isAuthenticated || isCustomer) && !pathname.startsWith('/customer') && !isAuthRoute;
  const isMarketingPath =
    pathname === '/' ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/auth');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDesktopNotif = notifRef.current?.contains(target);
      const insideMobileNotif = customerMobileNotifRef.current?.contains(target);
      if (!insideDesktopNotif && !insideMobileNotif) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCustomerSidebarOpen(false);
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const publicLinks = [
    { label: 'Home', href: '/', icon: Compass },
    { label: 'About', href: '/about', icon: Info },
    { label: 'Services', href: '/services', icon: Briefcase },
    { label: 'Contact', href: '/contact', icon: PhoneCall },
  ];

  const roleNavItems: Record<UserRole, { label: string; href: string; icon: typeof Car }[]> = {
    customer: [
      { label: 'Book ride', href: '/customer', icon: Compass },
      { label: 'My trips', href: '/customer/bookings', icon: Clock },
      { label: 'Track', href: '/customer/track', icon: MapPin },
      { label: 'Profile', href: '/customer/profile', icon: User },
    ],
    driver: [
      { label: 'Cockpit', href: '/driver', icon: Car },
      { label: 'Earnings', href: '/driver/earnings', icon: DollarSign },
      { label: 'Profile', href: '/driver/profile', icon: User },
    ],
    dispatcher: [
      { label: 'Radar', href: '/dispatcher', icon: Compass },
      { label: 'Queue', href: '/dispatcher/queue', icon: Clock },
      { label: 'Drivers', href: '/dispatcher/drivers', icon: Car },
      { label: 'Customers', href: '/dispatcher/customers', icon: Users },
      { label: 'New booking', href: '/dispatcher/new-booking', icon: Briefcase },
    ],
    admin: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Fleet', href: '/admin/fleet', icon: Car },
      { label: 'Rates', href: '/admin/rates', icon: Receipt },
      { label: 'Services', href: '/admin/services', icon: Star },
      { label: 'Reports', href: '/admin/reports', icon: DollarSign },
      { label: 'Audit', href: '/admin/audit-logs', icon: FileText },
      { label: 'Settings', href: '/admin/settings', icon: Sliders },
    ],
  };

  const currentRoleNav = roleNavItems[userRole] ?? roleNavItems.customer;

  const getDashboardUrl = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'dispatcher':
        return '/dispatcher';
      case 'driver':
        return '/driver';
      default:
        return '/customer';
    }
  };

  const getCtaConfig = () => {
    if (!isAuthenticated || userRole === 'customer') {
      return { href: '/customer', label: 'Book now', icon: Compass };
    }
    if (userRole === 'admin') {
      return { href: '/admin', label: 'Admin HQ', icon: Shield };
    }
    if (userRole === 'dispatcher') {
      return { href: '/dispatcher/new-booking', label: 'New booking', icon: Compass };
    }
    if (userRole === 'driver') {
      return { href: '/driver', label: 'Cockpit', icon: Car };
    }
    return { href: '/customer', label: 'Book now', icon: Compass };
  };

  const cta = getCtaConfig();

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'dispatcher':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'driver':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'dispatcher':
        return <Compass className="w-3 h-3" />;
      case 'driver':
        return <Car className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${active
      ? 'bg-emerald-50 text-[#0b4736] font-semibold border border-emerald-200/80 shadow-xs'
      : 'text-slate-600 hover:text-slate-900 hover:bg-[#faf8f4]'
    }`;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 lg:relative lg:top-auto bg-[#faf8f4]/80 backdrop-blur-md backdrop-saturate-150 border-b border-[#e8e4dc]/80 text-slate-900 transition-all duration-300 ${
          scrolled ? 'shadow-sm bg-white/85' : 'shadow-xs'
        }`}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          {/* ─────────────────────────────────────────────────────────────
              1. CUSTOMER DASHBOARD MOBILE NAVBAR (< lg screens)
              - Left corner: Hamburger menu icon (three lines)
              - Center: Al Harmain Travels Logo (perfectly centered horizontally)
              - Right corner: Notification Bell with unread badge
          ───────────────────────────────────────────────────────────── */}
          {isCustomerPortal && (
            <div className={`lg:hidden relative flex items-center justify-between ${scrolled ? 'h-[56px]' : 'h-[64px]'} w-full transition-all duration-300`}>
              {/* Left corner: Hamburger menu icon */}
              <div className="flex items-center z-10 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleCustomerSidebar();
                  }}
                  className="p-2.5 rounded-xl text-slate-700 hover:text-[#0b4736] hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center w-10 h-10 shadow-sm cursor-pointer"
                  aria-label={isCustomerSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isCustomerSidebarOpen}
                >
                  <Menu className="w-5 h-5 transition-transform" />
                </button>
              </div>

              {/* Center: The Al Harmain Travels logo, perfectly centered horizontally */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 select-none">
                <Link
                  href="/customer"
                  className="flex items-center gap-2 group shrink-0 pointer-events-auto"
                  title="Al Harmain Customer Portal"
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-950 flex items-center justify-center shadow-md border border-emerald-500/30 group-hover:border-amber-400/50 transition-colors shrink-0">
                    <span className="text-base font-bold text-amber-400 tracking-tighter">الح</span>
                  </div>
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="font-display text-lg sm:text-[1.375rem] font-semibold tracking-heading text-slate-900">
                      Al Harmain
                    </span>
                    <span className="font-display text-lg sm:text-[1.375rem] font-semibold tracking-heading text-amber-600">
                      Travel
                    </span>
                  </div>
                </Link>
              </div>

              {/* Right corner: Notification bell icon with unread badge */}
              <div className="flex items-center z-10 shrink-0">
                <div className="relative" ref={customerMobileNotifRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                      setHasNewNotif(false);
                      if (isCustomerSidebarOpen) setIsCustomerSidebarOpen(false);
                    }}
                    className="bell-btn group p-2.5 rounded-xl text-slate-700 hover:text-[#0b4736] hover:bg-slate-100 border border-slate-200 relative transition-colors flex items-center justify-center w-10 h-10 shadow-sm cursor-pointer focus:outline-none"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={isNotifOpen}
                  >
                    <Bell
                      className={`bell-icon w-5 h-5 transition-transform duration-300 origin-top ${
                        hasNewNotif
                          ? 'animate-bell-ring text-amber-500'
                          : unreadCount > 0
                          ? 'animate-bell-alert text-amber-600'
                          : 'text-slate-700 group-hover:text-[#0b4736]'
                      }`}
                    />
                    {unreadCount > 0 && (
                      <span className="relative flex items-center justify-center">
                        {hasNewNotif && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping opacity-75" />
                        )}
                        <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </button>

                  {/* Mobile Notification Popover */}
                  {isNotifOpen && (
                    <div className="fixed sm:absolute top-[68px] sm:top-full sm:mt-2 right-2 sm:right-0 w-[min(22rem,calc(100vw-1rem))] bg-white border border-[#e8e4dc] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                      <NotificationDropdownContent
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markNotificationAsRead={markNotificationAsRead}
                        clearNotifications={clearNotifications}
                        onSimulate={() =>
                          addNotification(
                            'VIP Chauffeur Assigned',
                            'Captain Tariq has been dispatched in GMC Yukon (KSA 7788).',
                            'ride'
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. DESKTOP ROW (lg+) OR NON-CUSTOMER ROW (all screens)
          ───────────────────────────────────────────────────────────── */}
          <div className={`${isCustomerPortal ? 'hidden lg:flex' : 'flex'} items-center justify-between ${scrolled ? 'h-[56px]' : 'h-[64px]'} gap-3 transition-all duration-300 relative`}>
            {/* Left corner on mobile: Hamburger Menu button */}
            <div className="lg:hidden flex items-center z-10 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-xl text-slate-700 hover:text-[#0b4736] hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer focus:outline-none"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 transition-transform" /> : <Menu className="w-5 h-5 transition-transform" />}
              </button>
            </div>

            {/* Logo: Centered in mobile view, left-aligned on desktop */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0 z-10 flex items-center justify-center pointer-events-none lg:pointer-events-auto select-none">
              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0 pointer-events-auto" aria-label="Al Harmain Travels Home">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-950 flex items-center justify-center shadow-md border border-emerald-500/30 group-hover:border-amber-400/50 transition-colors shrink-0">
                  <span className="text-base sm:text-lg font-bold text-amber-400 tracking-tighter">الح</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1 sm:gap-1.5 leading-none">
                    <span className="font-display text-lg sm:text-[1.375rem] font-semibold tracking-heading text-slate-900">
                      Al Harmain
                    </span>
                    <span className="font-display text-lg sm:text-[1.375rem] font-semibold tracking-heading text-amber-600">
                      Travel
                    </span>
                  </div>
                  <p className="hidden sm:block text-2xs text-[#0b4736] tracking-label uppercase font-semibold mt-1">
                    Makkah · Madinah · Jeddah
                  </p>
                </div>
              </Link>
            </div>

            {/* Center Navigation */}
            {isCustomer && pathname.startsWith('/customer') ? (
              <div className="hidden lg:flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  VIP Customer Portal
                </span>
                <span className="text-slate-300 font-mono text-xs">/</span>
                <span className="text-xs font-bold text-slate-800">
                  {pathname === '/customer'
                    ? 'Book a Ride'
                    : pathname.startsWith('/customer/bookings')
                    ? 'My Trips & History'
                    : pathname.startsWith('/customer/track')
                    ? 'Live Vehicle Radar'
                    : pathname.startsWith('/customer/profile')
                    ? 'VIP Profile & Settings'
                    : 'Overview'}
                </span>
              </div>
            ) : (
              <nav className="hidden lg:flex items-center gap-7 lg:gap-8 xl:gap-9" aria-label="Primary">
                {(isAuthenticated && !isMarketingPath ? currentRoleNav : publicLinks).map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative py-1.5 text-sm font-bold tracking-tight transition-colors duration-200 group focus:outline-none ${
                        isActive ? 'text-black' : 'text-black/75 hover:text-black'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`absolute -bottom-0.5 left-0 right-0 h-[2.5px] bg-black rounded-full transition-transform duration-300 origin-left ease-out ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-active:scale-x-100'
                        }`}
                      />
                    </Link>
                  );
                })}
                {isAuthenticated && isMarketingPath && (
                  <Link
                    href={getDashboardUrl(userRole)}
                    className="relative py-1.5 text-sm font-bold tracking-tight transition-colors duration-200 group text-black/75 hover:text-black focus:outline-none"
                  >
                    <span>My portal</span>
                    <span className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] bg-black rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
                  </Link>
                )}
              </nav>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              {activeCustomerBooking && isCustomer && (
                <Link
                  href="/customer/track"
                  className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse shrink-0" />
                  <span className="font-semibold capitalize">
                    {activeCustomerBooking.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              )}

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    setHasNewNotif(false);
                  }}
                  className="bell-btn group p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-colors focus:outline-none cursor-pointer"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={isNotifOpen}
                >
                  <Bell
                    className={`bell-icon w-4 h-4 transition-transform duration-300 origin-top ${
                      hasNewNotif
                        ? 'animate-bell-ring text-amber-500'
                        : unreadCount > 0
                        ? 'animate-bell-alert text-amber-600'
                        : 'text-slate-600 group-hover:text-slate-900'
                    }`}
                  />
                  {unreadCount > 0 && (
                    <span className="relative flex items-center justify-center">
                      {hasNewNotif && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping opacity-75" />
                      )}
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white border border-[#e8e4dc] rounded-2xl shadow-xl overflow-hidden z-50">
                    <NotificationDropdownContent
                      notifications={notifications}
                      unreadCount={unreadCount}
                      markNotificationAsRead={markNotificationAsRead}
                      clearNotifications={clearNotifications}
                      onSimulate={() =>
                        addNotification(
                          'VIP Chauffeur Assigned',
                          'Captain Tariq has been dispatched in GMC Yukon (KSA 7788).',
                          'ride'
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {isAuthLoading ? (
                <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
              ) : isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 py-1.5 pl-1.5 pr-2.5 rounded-2xl bg-white hover:bg-[#faf8f4] border border-[#e8e4dc] transition-colors shadow-xs"
                    aria-expanded={isUserMenuOpen}
                    aria-label="Account menu"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 border border-emerald-700/40 flex items-center justify-center font-bold text-sm text-amber-400 shrink-0">
                      {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:block text-left leading-none">
                      <div className="text-[12px] font-bold text-slate-900 max-w-[100px] truncate">
                        {currentUser.full_name}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(userRole)}`}
                      >
                        {getRoleIcon(userRole)}
                        {userRole}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e8e4dc] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-150">
                      <div className="px-4 py-3 bg-[#faf8f4] border-b border-[#e8e4dc]">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {currentUser.email || 'Verified account'}
                        </p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <Link
                          href={getDashboardUrl(userRole)}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-[#faf8f4] hover:text-[#0b4736] transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                          My dashboard
                        </Link>
                        {userRole === 'customer' && (
                          <Link
                            href="/customer/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-[#faf8f4] hover:text-[#0b4736] transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            Profile &amp; settings
                          </Link>
                        )}
                        {userRole === 'driver' && (
                          <Link
                            href="/driver/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-[#faf8f4] hover:text-[#0b4736] transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            Driver profile
                          </Link>
                        )}
                        {userRole === 'admin' && (
                          <Link
                            href="/admin/settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-[#faf8f4] hover:text-[#0b4736] transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-600" />
                            System settings
                          </Link>
                        )}
                        {userRole === 'dispatcher' && (
                          <Link
                            href="/dispatcher/queue"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-[#faf8f4] hover:text-[#0b4736] transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            Active queue
                          </Link>
                        )}
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center">
                  <Link
                    href="/sign-in"
                    className="btn-brand !py-2 !px-4 !text-xs !shadow-md inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in</span>
                  </Link>
                </div>
              )}

              {showBookCta && (
                <Link href={cta.href} className="hidden sm:inline-flex btn-primary !py-2 !px-4 !text-xs">
                  <cta.icon className="w-3.5 h-3.5" />
                  {cta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed mobile navbar so top page content is not obscured on mobile view */}
      <div className="h-16 lg:hidden shrink-0 pointer-events-none" aria-hidden="true" />

      {/* ─────────────────────────────────────────────────────────────
          PUBLIC / MARKETING MOBILE SIDEBAR DRAWER (Slides smoothly from left side)
      ───────────────────────────────────────────────────────────── */}
      {!isCustomerPortal && (
        <>
          {/* Backdrop overlay with smooth fade */}
          <div
            className={`lg:hidden fixed inset-0 z-[60] bg-slate-950/65 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
              isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide Drawer: slides out from the left side with scrollable content */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className={`lg:hidden fixed top-0 bottom-0 left-0 z-[70] w-[min(320px,84vw)] max-w-sm h-full flex flex-col bg-[#faf8f4] text-slate-900 border-r border-[#e8e4dc] shadow-2xl transition-transform duration-300 ease-out transform ${
              isMobileMenuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
            }`}
            style={{
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Header: Brand Emblem + Title + Close Button */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-[#e8e4dc] shrink-0">
              <div className="flex items-center gap-2.5 select-none min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-950 flex items-center justify-center shadow-md border border-emerald-500/30 shrink-0">
                  <span className="text-base font-bold text-amber-400 tracking-tighter">الح</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="font-display text-base font-semibold tracking-heading text-slate-900">
                      Al Harmain
                    </span>
                    <span className="font-display text-base font-semibold tracking-heading text-amber-600">
                      Travel
                    </span>
                  </div>
                  <p className="text-[10px] text-[#0b4736] tracking-wider uppercase font-bold mt-1">
                    Makkah · Madinah · Jeddah
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-5 overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Authenticated User Banner */}
              {isAuthenticated && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#e8e4dc] shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 flex items-center justify-center font-bold text-amber-400 shrink-0 shadow-sm">
                    {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.full_name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getRoleBadgeStyle(userRole)}`}
                    >
                      {getRoleIcon(userRole)}
                      {userRole}
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                  {isAuthenticated ? 'Portal Navigation' : 'Explore Al Harmain'}
                </p>
                <nav className="space-y-1" aria-label="Mobile Drawer Navigation">
                  {(isAuthenticated && !isMarketingPath ? currentRoleNav : publicLinks).map((item) => {
                    const isActive =
                      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-colors group ${
                          isActive
                            ? 'bg-emerald-50/80 text-black'
                            : 'text-black/75 hover:text-black hover:bg-white'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-emerald-700'} transition-colors`} />
                          <span className="relative py-0.5">
                            {item.label}
                            <span
                              className={`absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full transition-transform duration-300 origin-left ease-out ${
                                isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-active:scale-x-100'
                              }`}
                            />
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* 24/7 VIP Concierge Card */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#e8e4dc] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    24/7 Support Desk
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Concierge
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:+966548881234"
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>Call</span>
                  </a>
                  <a
                    href="https://wa.me/966548881234"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="border-t border-[#e8e4dc] pt-3 space-y-2">
                {showBookCta && (
                  <Link
                    href="/customer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn-primary w-full py-2.5 justify-center text-xs shadow-sm flex items-center gap-2"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Book a journey</span>
                  </Link>
                )}

                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn-brand w-full text-center flex items-center justify-center gap-2 py-2.5 text-xs font-bold shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign in</span>
                  </Link>
                )}
                <p className="text-[10px] text-center text-slate-400 pt-1">
                  Al Harmain Travels · Premium Tourism
                </p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Customer Portal Mobile Sidebar Drawer (slides smoothly left to right) */}
      {isCustomerPortal && (
        <CustomerMobileSidebar
          isOpen={isCustomerSidebarOpen}
          onClose={handleCloseCustomerSidebar}
        />
      )}

      {/* Mobile sticky book bar: only for customers and guests (hidden on all auth flows & customer portal) */}
      {showBookCta && !pathname.startsWith('/customer') && !isAuthRoute && (!isAuthenticated || userRole === 'customer') && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
          <Link
            href="/customer"
            className="pointer-events-auto btn-primary w-full shadow-2xl shadow-amber-950/40 py-3.5"
          >
            <Compass className="w-4 h-4" />
            Book your journey
            <ArrowRightSafe />
          </Link>
        </div>
      )}
    </>
  );
}

function ArrowRightSafe() {
  return <span aria-hidden className="text-base leading-none">→</span>;
}

interface NotificationDropdownProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string | number | Date;
    read: boolean;
  }>;
  unreadCount: number;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  onSimulate?: () => void;
}

function NotificationDropdownContent({
  notifications,
  unreadCount,
  markNotificationAsRead,
  clearNotifications,
  onSimulate,
}: NotificationDropdownProps) {
  return (
    <>
      <div className="px-4 py-3 bg-[#faf8f4] border-b border-[#e8e4dc] flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          Notifications
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {unreadCount} new
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {onSimulate && (
            <button
              type="button"
              onClick={onSimulate}
              className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold hover:underline"
              title="Test notification arrival animation"
            >
              Test alert
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">
              You&apos;re all caught up
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Trip updates will appear here
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markNotificationAsRead(n.id)}
              className={`w-full text-left px-4 py-3 text-xs transition-colors ${
                n.read
                  ? 'bg-white text-slate-500'
                  : 'bg-emerald-50/70 text-slate-800'
              } hover:bg-slate-50`}
            >
              <div className="flex items-center justify-between mb-0.5 gap-2">
                <span className="font-semibold text-emerald-800">
                  {n.title}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(n.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed">
                {n.message}
              </p>
            </button>
          ))
        )}
      </div>
    </>
  );
}
