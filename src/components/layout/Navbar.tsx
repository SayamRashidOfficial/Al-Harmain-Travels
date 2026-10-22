'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import {
  Car,
  Compass,
  Bell,
  Shield,
  User,
  Menu,
  X,
  Clock,
  LogIn,
  LogOut,
  Users,
  Briefcase,
  DollarSign,
  PhoneCall,
  Info,
  ChevronRight,
  Sliders,
  Phone,
  Globe,
} from 'lucide-react';

import BrandLogo from '@/components/ui/BrandLogo';
import CustomerMobileSidebar from '@/components/customer/CustomerMobileSidebar';
import DispatcherMobileSidebar from '@/components/dispatcher/DispatcherMobileSidebar';
import AdminMobileSidebar from '@/components/admin/AdminMobileSidebar';
import DriverMobileSidebar from '@/components/driver/DriverMobileSidebar';
import UserProfileDropdown from '@/components/layout/UserProfileDropdown';
import { useLanguage } from '@/context/LanguageContext';

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
    activeCustomerBooking,
    settings,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomerSidebarOpen, setIsCustomerSidebarOpen] = useState(false);
  const [isDispatcherSidebarOpen, setIsDispatcherSidebarOpen] = useState(false);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [isDriverSidebarOpen, setIsDriverSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const isVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  // Synchronize 'navbar-hidden' utility class on documentElement for fluid desktop sidebar tracking
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isVisible) {
        document.documentElement.classList.remove('navbar-hidden');
      } else {
        document.documentElement.classList.add('navbar-hidden');
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('navbar-hidden');
      }
    };
  }, [isVisible]);

  // Robust scroll-direction detection with jitter threshold & top-zone anchoring
  useEffect(() => {
    const TOP_SCROLL_THRESHOLD = 64; // Height of navbar: keep visible in top zone
    const SCROLL_DELTA_THRESHOLD = 10; // Meaningful delta threshold to prevent jitter/flicker

    const updateScroll = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const lastScrollY = lastScrollYRef.current;
      const scrollDiff = currentScrollY - lastScrollY;

      // Subtle shadow & border contrast after initial 16px scroll
      const isScrolledNow = currentScrollY > 16;
      setScrolled((prev) => (prev !== isScrolledNow ? isScrolledNow : prev));

      // 1. Keep navbar visible at the very top of the page without animation
      if (currentScrollY <= TOP_SCROLL_THRESHOLD) {
        if (!isVisibleRef.current) {
          isVisibleRef.current = true;
          setIsVisible(true);
        }
        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
        return;
      }

      // 2. Never hide navbar if mobile menus or sidebars are open
      if (isMobileMenuOpen || isCustomerSidebarOpen || isDispatcherSidebarOpen || isAdminSidebarOpen || isDriverSidebarOpen) {
        if (!isVisibleRef.current) {
          isVisibleRef.current = true;
          setIsVisible(true);
        }
        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
        return;
      }

      // 3. Ignore downward scroll bounce at the bottom of the page
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      if (currentScrollY >= maxScrollY - 10 && scrollDiff > 0) {
        tickingRef.current = false;
        return;
      }

      // 4. Meaningful scroll threshold check
      if (Math.abs(scrollDiff) >= SCROLL_DELTA_THRESHOLD) {
        if (scrollDiff > 0) {
          // Scrolling DOWN: smoothly slide upward out of view
          if (isVisibleRef.current) {
            isVisibleRef.current = false;
            setIsVisible(false);
            setIsNotifOpen(false); // smoothly dismiss notification popovers
          }
        } else {
          // Scrolling UP: smoothly slide downward into view
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            setIsVisible(true);
          }
        }
        lastScrollYRef.current = currentScrollY;
      }

      tickingRef.current = false;
    };

    const handleScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        window.requestAnimationFrame(updateScroll);
      }
    };

    // Initialize with current scroll offset
    lastScrollYRef.current = Math.max(0, window.scrollY);
    setScrolled(window.scrollY > 16);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobileMenuOpen, isCustomerSidebarOpen, isDispatcherSidebarOpen, isAdminSidebarOpen]);

  const handleCloseCustomerSidebar = useCallback(() => {
    setIsCustomerSidebarOpen(false);
  }, []);

  const handleToggleCustomerSidebar = useCallback(() => {
    setIsCustomerSidebarOpen((prev) => !prev);
    setIsNotifOpen(false);
  }, []);

  const handleCloseDispatcherSidebar = useCallback(() => {
    setIsDispatcherSidebarOpen(false);
  }, []);

  const handleToggleDispatcherSidebar = useCallback(() => {
    setIsDispatcherSidebarOpen((prev) => !prev);
    setIsNotifOpen(false);
  }, []);

  const handleCloseAdminSidebar = useCallback(() => {
    setIsAdminSidebarOpen(false);
  }, []);

  const handleToggleAdminSidebar = useCallback(() => {
    setIsAdminSidebarOpen((prev) => !prev);
    setIsNotifOpen(false);
  }, []);

  const handleCloseDriverSidebar = useCallback(() => {
    setIsDriverSidebarOpen(false);
  }, []);

  const handleToggleDriverSidebar = useCallback(() => {
    setIsDriverSidebarOpen((prev) => !prev);
    setIsNotifOpen(false);
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const customerMobileNotifRef = useRef<HTMLDivElement>(null);
  const dispatcherMobileNotifRef = useRef<HTMLDivElement>(null);
  const adminMobileNotifRef = useRef<HTMLDivElement>(null);
  const driverMobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isCustomer = userRole === 'customer';
  const isCustomerPortal = pathname.startsWith('/customer');
  const isAdminPortal = pathname.startsWith('/admin');
  const isDispatcherPortal = pathname.startsWith('/dispatcher');
  const isDriverPortal = pathname.startsWith('/driver');
  const isAuthRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/verify-phone') ||
    pathname.startsWith('/callback') ||
    pathname.startsWith('/auth');

  const showBookCta =
    (!isAuthenticated || isCustomer) &&
    !isCustomerPortal &&
    !isAdminPortal &&
    !isDispatcherPortal &&
    !isDriverPortal &&
    !isAuthRoute;

  const getAdminPageTitle = (path: string) => {
    if (path === '/admin') return 'Overview';
    if (path.startsWith('/admin/users')) return 'Users & Access';
    if (path.startsWith('/admin/reviews')) return 'Reviews & Ratings';
    if (path.startsWith('/admin/rates')) return 'Rates & Tariff';
    if (path.startsWith('/admin/services')) return 'Services CMS';
    if (path.startsWith('/admin/reports')) return 'Reports & Ledger';
    if (path.startsWith('/admin/audit-logs')) return 'Audit Logs';
    if (path.startsWith('/admin/settings')) return 'System Settings';
    return 'Admin HQ';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDesktopNotif = notifRef.current?.contains(target);
      const insideMobileNotif = customerMobileNotifRef.current?.contains(target);
      const insideDispatcherMobileNotif = dispatcherMobileNotifRef.current?.contains(target);
      const insideAdminMobileNotif = adminMobileNotifRef.current?.contains(target);
      const insideDriverMobileNotif = driverMobileNotifRef.current?.contains(target);
      if (!insideDesktopNotif && !insideMobileNotif && !insideDispatcherMobileNotif && !insideAdminMobileNotif && !insideDriverMobileNotif) {
        setIsNotifOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        mobileMenuBtnRef.current &&
        !mobileMenuBtnRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCustomerSidebarOpen(false);
    setIsDispatcherSidebarOpen(false);
    setIsAdminSidebarOpen(false);
    setIsDriverSidebarOpen(false);
    setIsNotifOpen(false);
    // Ensure navbar is immediately revealed on route transition
    setIsVisible(true);
    isVisibleRef.current = true;
    lastScrollYRef.current = 0;
  }, [pathname]);

  // Clean, minimal public navigation links (strictly 4 items)
  const publicLinks = [
    { label: 'Home', href: '/', icon: Compass },
    { label: 'About', href: '/about', icon: Info },
    { label: 'Services', href: '/services', icon: Briefcase },
    { label: 'Contact', href: '/contact', icon: PhoneCall },
  ];


  // Dispatcher Portal Navigation (5 modules)
  const dispatcherLinks = [
    { label: 'Radar', href: '/dispatcher', icon: Compass },
    { label: 'Queue', href: '/dispatcher/queue', icon: Clock },
    { label: 'Drivers', href: '/dispatcher/drivers', icon: Car },
    { label: 'Customers', href: '/dispatcher/customers', icon: Users },
    { label: 'New Booking', href: '/dispatcher/new-booking', icon: Briefcase },
  ];

  // Driver Portal Navigation (3 modules)
  const driverLinks = [
    { label: 'Cockpit', href: '/driver', icon: Car },
    { label: 'Earnings', href: '/driver/earnings', icon: DollarSign },
    { label: 'Profile', href: '/driver/profile', icon: User },
  ];

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

  return (
    <>
      <style>{`
        #main-content {
          padding-top: 3.5rem !important;
        }
        @media (min-width: 640px) {
          #main-content {
            padding-top: 4rem !important;
          }
        }
        aside {
          top: 4rem !important;
          height: calc(100vh - 4rem) !important;
          transition: top 300ms cubic-bezier(0.4, 0, 0.2, 1), height 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms ease-in-out;
        }
        html.navbar-hidden aside {
          top: 0rem !important;
          height: 100vh !important;
        }
        .customer-portal, .dispatcher-portal, .driver-portal, .admin-portal {
          min-height: calc(100vh - 4rem) !important;
        }
        html.navbar-hidden .customer-portal, html.navbar-hidden .dispatcher-portal, html.navbar-hidden .driver-portal, html.navbar-hidden .admin-portal {
          min-height: 100vh !important;
        }
      `}</style>
      {/* ─── SHARED GLASSMORPHISM HEADER ─────────────────────────────────── */}
      <header
        onFocusCapture={() => {
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            setIsVisible(true);
          }
        }}
        className={`fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-in-out will-change-transform motion-reduce:transition-none ${
          isVisible ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none'
        } ${scrolled ? 'shadow-sm shadow-slate-900/5' : ''}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* ─────────────────────────────────────────────────────────────
              1. CUSTOMER DASHBOARD MOBILE NAVBAR (< lg screens)
              - Preserves dedicated customer portal layout with sidebar toggle
          ───────────────────────────────────────────────────────────── */}
          {isCustomerPortal && (
            <div className="lg:hidden relative flex items-center justify-between h-14 sm:h-16 w-full transition-all duration-300">
              {/* Left corner: Hamburger menu icon */}
              <div className="flex items-center z-10 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleCustomerSidebar();
                  }}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                  aria-label={isCustomerSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isCustomerSidebarOpen}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Center: Official Al Harmain Travel Logo (centered) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 select-none">
                <div className="pointer-events-auto">
                  <BrandLogo size="sm" href="/customer" showSubtitle={false} forceLight />
                </div>
              </div>

              {/* Right corner: Notification bell icon with unread badge */}
              <div className="flex items-center z-10 shrink-0 gap-1.5">
                <div className="relative" ref={customerMobileNotifRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                      if (isCustomerSidebarOpen) setIsCustomerSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={isNotifOpen}
                  >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Mobile Notification Popover */}
                  {isNotifOpen && (
                    <div className="fixed sm:absolute top-[70px] sm:top-full sm:mt-2 right-2 sm:right-0 w-[min(22rem,calc(100vw-1rem))] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                      <NotificationDropdownContent
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markNotificationAsRead={markNotificationAsRead}
                        clearNotifications={clearNotifications}
                      />
                    </div>
                  )}
                </div>
                <UserProfileDropdown forceLight />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              1C. DISPATCHER DASHBOARD MOBILE NAVBAR (< lg screens)
              - Preserves dedicated dispatcher portal layout with sidebar toggle
          ───────────────────────────────────────────────────────────── */}
          {isDispatcherPortal && (
            <div className="lg:hidden relative flex items-center justify-between h-14 sm:h-16 w-full transition-all duration-300">
              {/* Left corner: Hamburger menu icon */}
              <div className="flex items-center z-10 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleDispatcherSidebar();
                  }}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                  aria-label={isDispatcherSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isDispatcherSidebarOpen}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Center: Official Al Harmain Travel Logo (centered) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 select-none">
                <div className="pointer-events-auto">
                  <BrandLogo size="sm" href="/dispatcher" showSubtitle={false} forceLight />
                </div>
              </div>

              {/* Right corner: Notification bell icon with unread badge */}
              <div className="flex items-center z-10 shrink-0 gap-1.5">
                <div className="relative" ref={dispatcherMobileNotifRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                      if (isDispatcherSidebarOpen) setIsDispatcherSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={isNotifOpen}
                  >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Mobile Notification Popover */}
                  {isNotifOpen && (
                    <div className="fixed sm:absolute top-[70px] sm:top-full sm:mt-2 right-2 sm:right-0 w-[min(22rem,calc(100vw-1rem))] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                      <NotificationDropdownContent
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markNotificationAsRead={markNotificationAsRead}
                        clearNotifications={clearNotifications}
                      />
                    </div>
                  )}
                </div>
                <UserProfileDropdown forceLight />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              1B. ADMIN DASHBOARD MOBILE NAVBAR (< lg screens)
              - Mobile menu trigger, page title/breadcrumb, notifications & profile
          ───────────────────────────────────────────────────────────── */}
          {isAdminPortal && (
            <div className="lg:hidden relative flex items-center justify-between h-14 sm:h-16 w-full transition-all duration-300">
              {/* Left corner: Hamburger menu icon */}
              <div className="flex items-center z-10 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleAdminSidebar();
                  }}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                  aria-label={isAdminSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isAdminSidebarOpen}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Center: Admin Brand Logo (centered) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 select-none">
                <div className="pointer-events-auto">
                  <BrandLogo size="sm" href="/admin" showSubtitle={false} forceLight />
                </div>
              </div>

              {/* Right corner: Notification bell icon with unread badge */}
              <div className="flex items-center z-10 shrink-0 gap-1.5">
                <div className="relative" ref={adminMobileNotifRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                      if (isAdminSidebarOpen) setIsAdminSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={isNotifOpen}
                  >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Mobile Notification Popover */}
                  {isNotifOpen && (
                    <div className="fixed sm:absolute top-[70px] sm:top-full sm:mt-2 right-2 sm:right-0 w-[min(22rem,calc(100vw-1rem))] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                      <NotificationDropdownContent
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markNotificationAsRead={markNotificationAsRead}
                        clearNotifications={clearNotifications}
                      />
                    </div>
                  )}
                </div>
                <UserProfileDropdown forceLight />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              1D. DRIVER DASHBOARD MOBILE NAVBAR (< lg screens)
              - Dedicated driver portal layout with mobile sidebar toggle
          ───────────────────────────────────────────────────────────── */}
          {isDriverPortal && (
            <div className="lg:hidden relative flex items-center justify-between h-14 sm:h-16 w-full transition-all duration-300">
              {/* Left corner: Hamburger menu icon */}
              <div className="flex items-center z-10 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleDriverSidebar();
                  }}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                  aria-label={isDriverSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
                  aria-expanded={isDriverSidebarOpen}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Center: Official Al Harmain Travel Logo (centered) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 select-none">
                <div className="pointer-events-auto">
                  <BrandLogo size="sm" href="/driver" showSubtitle={false} forceLight />
                </div>
              </div>

              {/* Right corner: Notification bell icon with unread badge */}
              <div className="flex items-center z-10 shrink-0 gap-1.5">
                <div className="relative" ref={driverMobileNotifRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                      if (isDriverSidebarOpen) setIsDriverSidebarOpen(false);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-all flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={isNotifOpen}
                  >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Mobile Notification Popover */}
                  {isNotifOpen && (
                    <div className="fixed sm:absolute top-[70px] sm:top-full sm:mt-2 right-2 sm:right-0 w-[min(22rem,calc(100vw-1rem))] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                      <NotificationDropdownContent
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markNotificationAsRead={markNotificationAsRead}
                        clearNotifications={clearNotifications}
                      />
                    </div>
                  )}
                </div>
                <UserProfileDropdown forceLight />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. DESKTOP ROW (lg+) OR PUBLIC PAGES ROW (all screens)
          ───────────────────────────────────────────────────────────── */}
          <div
            className={`${(isCustomerPortal || isAdminPortal || isDispatcherPortal || isDriverPortal) ? 'hidden lg:flex' : 'flex'
              } h-14 sm:h-16 items-center justify-between gap-4 transition-all duration-300`}
          >
            {/* Unified Official Brand Logo */}
            <BrandLogo
              size="md"
              forceLight
              href={
                isAdminPortal
                  ? '/admin'
                  : isDispatcherPortal
                    ? '/dispatcher'
                    : isDriverPortal
                      ? '/driver'
                      : isCustomerPortal
                        ? '/customer'
                        : '/'
              }
              subtitle={
                isAdminPortal
                  ? 'Executive Admin HQ'
                  : isDispatcherPortal
                    ? 'Fleet Operations HQ'
                    : isDriverPortal
                      ? 'Captain Driver Cockpit'
                      : isCustomerPortal
                        ? 'VIP Customer Portal'
                        : 'Makkah · Madinah · Jeddah'
              }
            />

            {/* Center Navigation: Portal-specific (Admin Breadcrumb, Dispatcher, Driver, Customer) or Clean Public Links */}
            {isAdminPortal ? (
              <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium shadow-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Executive Admin HQ
                </span>
                <span className="text-slate-400 font-mono">/</span>
                <span className="font-semibold text-slate-700">
                  {getAdminPageTitle(pathname)}
                </span>
              </div>
            ) : isDispatcherPortal ? (
              <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium shadow-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Fleet Operations HQ
                </span>
                <span className="text-slate-400 font-mono">/</span>
                <span className="font-semibold text-slate-700">
                  {pathname === '/dispatcher'
                    ? 'Live Radar & Telemetry'
                    : pathname.startsWith('/dispatcher/queue')
                      ? 'Live Ride Queue'
                      : pathname.startsWith('/dispatcher/drivers')
                        ? 'Chauffeur Roster'
                        : pathname.startsWith('/dispatcher/customers')
                          ? 'Customer Directory'
                          : pathname.startsWith('/dispatcher/new-booking')
                            ? 'Manual Telephone Booking'
                            : 'Operations Control'}
                </span>
              </div>
            ) : isDriverPortal ? (
              <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium shadow-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Captain Driver Cockpit
                </span>
                <span className="text-slate-400 font-mono">/</span>
                <span className="font-semibold text-slate-700">
                  {pathname === '/driver'
                    ? 'Cockpit & Missions'
                    : pathname.startsWith('/driver/earnings')
                      ? 'Earnings & Payouts'
                      : pathname.startsWith('/driver/profile')
                        ? 'Chauffeur Profile & Vehicle'
                        : 'Captain Cockpit'}
                </span>
              </div>
            ) : isCustomerPortal ? (
              <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium shadow-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  VIP Customer Portal
                </span>
                <span className="text-slate-400 font-mono">/</span>
                <span className="font-semibold text-slate-700">
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
              <nav
                className="hidden lg:flex items-center gap-6 xl:gap-8"
                aria-label="Primary Navigation"
              >
                {publicLinks.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-body flex items-center gap-1 py-2 sm:py-2.5 transition-colors duration-200 hover:text-roseGold font-semibold ${isActive
                          ? 'text-roseGold border-b-2 border-roseGold -mb-[2px]'
                          : 'text-charcoal'
                        }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Quick Live Public Site link on Admin portal */}
              {isAdminPortal && (
                <Link
                  href="/"
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-all cursor-pointer"
                  title="Visit Public Website"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span>Live Site</span>
                </Link>
              )}

              {/* If on Public page but authenticated user is admin: Quick Admin HQ button */}
              {userRole === 'admin' && !isAdminPortal && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin HQ</span>
                </Link>
              )}
              {/* Active Trip Tracker Badge (Customer) */}
              {activeCustomerBooking && (isCustomer || isCustomerPortal) && (
                <Link
                  href="/customer/track"
                  className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-1.5 rounded-full hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-xs font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-soft-pulse shrink-0" />
                  <span className="font-semibold capitalize">
                    {activeCustomerBooking.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              )}

              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 relative transition-all cursor-pointer active:scale-95 shadow-xs"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={isNotifOpen}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-200">
                    <NotificationDropdownContent
                      notifications={notifications}
                      unreadCount={unreadCount}
                      markNotificationAsRead={markNotificationAsRead}
                      clearNotifications={clearNotifications}
                    />
                  </div>
                )}
              </div>

              {/* User Profile Dropdown */}
              <UserProfileDropdown forceLight />

              {/* Guest Sign In Quick Access */}
              {!isAuthenticated && !isAuthLoading && (
                <Link
                  href="/sign-in"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-all cursor-pointer active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Primary Call to Action: Book a Ride */}
              {showBookCta && (
                <Link
                  href="/customer"
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#d4af37] via-[#f0d484] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] shadow-md shadow-amber-500/15 hover:shadow-amber-500/25 transition-all duration-300 active:scale-95 group cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-slate-950 transition-transform group-hover:rotate-45" />
                  <span>Book a Ride</span>
                </Link>
              )}

              {/* Mobile Menu Button for Public Pages */}
              {!isCustomerPortal && !isAdminPortal && !isDispatcherPortal && (
                <button
                  ref={mobileMenuBtnRef}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center w-10 h-10 shadow-xs cursor-pointer active:scale-95"
                  aria-label="Toggle navigation menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-600" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. LUXURY RESPONSIVE MOBILE MENU (Smooth, Reliable, Elegant)
        ───────────────────────────────────────────────────────────── */}
        {!isCustomerPortal && !isAdminPortal && !isDispatcherPortal && isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
          className="lg:hidden bg-white/98 backdrop-blur-2xl border-t border-slate-200/70 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto animate-in slide-in-from-top-2 fade-in-50 duration-200"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
              {/* Top Mobile Menu Brand Identity */}
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <BrandLogo
                  size="sm"
                  href="/"
                  subtitle="VIP Makkah · Madinah Transport"
                  onClick={() => setIsMobileMenuOpen(false)}
                  forceLight
                />
              </div>

              {/* Authenticated User Status Bar in Mobile Menu */}
              {isAuthenticated && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-700 to-teal-950 border border-[#d4af37]/40 flex items-center justify-center font-bold text-sm text-amber-300 shrink-0">
                      {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.full_name}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(
                          userRole
                        )}`}
                      >
                        {getRoleIcon(userRole)}
                        {userRole}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={getDashboardUrl(userRole)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="shrink-0 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
              )}

              {/* Portal or Public Navigation Links */}
              {isDispatcherPortal ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2 px-1">
                    Dispatcher Operations
                  </p>
                  <div className="space-y-1">
                    {dispatcherLinks.map((item) => {
                      const isActive =
                        item.href === '/dispatcher'
                          ? pathname === '/dispatcher'
                          : pathname === item.href || pathname.startsWith(item.href + '/');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 ${isActive
                              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200 font-bold'
                              : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-100'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {isActive ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : isDriverPortal ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 mb-2 px-1">
                    Driver Cockpit
                  </p>
                  <div className="space-y-1">
                    {driverLinks.map((item) => {
                      const isActive =
                        item.href === '/driver'
                          ? pathname === '/driver'
                          : pathname === item.href || pathname.startsWith(item.href + '/');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 ${isActive
                              ? 'text-teal-800 bg-teal-50 border border-teal-200 font-bold'
                              : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {isActive ? (
                            <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">
                    Menu
                  </p>
                  <div className="space-y-1">
                    {publicLinks.map((item) => {
                      const isActive =
                        item.href === '/'
                          ? pathname === '/'
                          : pathname === item.href || pathname.startsWith(item.href + '/');

                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-body font-semibold transition-all duration-200 ${isActive
                              ? 'text-roseGold bg-roseGold/10 border border-roseGold/20'
                              : 'text-charcoal hover:text-roseGold hover:bg-roseGold/5'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-roseGold' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {isActive ? (
                            <span className="w-2 h-2 rounded-full bg-roseGold shadow-[0_0_8px_rgba(197,168,128,0.9)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile Menu Footer Actions */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                {/* For Admin/Staff Portals: Quick Public Site Switcher */}
                {(isAdminPortal || isDispatcherPortal || isDriverPortal) && (
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-amber-700 bg-slate-50 border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-500" />
                      <span>View Public Website</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* Support Hotline */}
                <div className="flex items-center justify-center gap-2 px-1">
                  <a
                    href={`tel:${settings.support_phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>24/7 Support: {settings.support_phone}</span>
                  </a>
                </div>

                {/* Primary CTA and Auth Controls */}
                {isAuthenticated ? (
                  <div className="space-y-2 pt-1">
                    {isAdminPortal && (
                      <Link
                        href="/admin/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#d4af37] via-[#f0d484] to-[#d4af37] shadow-lg shadow-amber-500/20"
                      >
                        <Sliders className="w-4 h-4" />
                        <span>System Settings</span>
                      </Link>
                    )}
                    {showBookCta && (
                      <Link
                        href="/customer"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#d4af37] via-[#f0d484] to-[#d4af37] shadow-lg shadow-amber-500/20"
                      >
                        <Compass className="w-4 h-4" />
                        <span>Book Your Journey</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <Link
                      href="/customer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#d4af37] via-[#f0d484] to-[#d4af37] shadow-lg shadow-amber-500/20"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Book a Ride</span>
                    </Link>
                    <Link
                      href="/sign-in"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Customer Portal Mobile Sidebar Drawer */}
      {isCustomerPortal && (
        <CustomerMobileSidebar
          isOpen={isCustomerSidebarOpen}
          onClose={handleCloseCustomerSidebar}
        />
      )}

      {/* Dispatcher Portal Mobile Sidebar Drawer */}
      {isDispatcherPortal && (
        <DispatcherMobileSidebar
          isOpen={isDispatcherSidebarOpen}
          onClose={handleCloseDispatcherSidebar}
        />
      )}

      {/* Admin Portal Mobile Sidebar Drawer */}
      {isAdminPortal && (
        <AdminMobileSidebar
          isOpen={isAdminSidebarOpen}
          onClose={handleCloseAdminSidebar}
        />
      )}

      {/* Driver Portal Mobile Sidebar Drawer */}
      {isDriverPortal && (
        <DriverMobileSidebar
          isOpen={isDriverSidebarOpen}
          onClose={handleCloseDriverSidebar}
        />
      )}

      {/* Mobile sticky book bar: only for customers and guests (hidden on all auth flows & customer portal) */}
      {showBookCta && !pathname.startsWith('/customer') && !isAuthRoute && (!isAuthenticated || userRole === 'customer') && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
          <Link
            href="/customer"
            className="pointer-events-auto w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#d4af37] via-[#f0d484] to-[#d4af37] shadow-2xl shadow-amber-950/50 hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Book Your Journey</span>
            <span aria-hidden className="text-base leading-none">→</span>
          </Link>
        </div>
      )}
    </>
  );
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
}

function NotificationDropdownContent({
  notifications,
  unreadCount,
  markNotificationAsRead,
  clearNotifications,
}: NotificationDropdownProps) {
  const { dir, isRTL } = useLanguage();
  return (
    <div className="bg-white text-slate-900" dir={dir}>
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          {isRTL ? 'الإشعارات' : 'Notifications'}
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              {unreadCount} {isRTL ? 'جديد' : 'new'}
            </span>
          )}
        </span>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            {isRTL ? 'مسح الكل' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center bg-white">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {isRTL ? 'لا توجد إشعارات حالياً' : "You're all caught up"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isRTL ? 'ستظهر تحديثات الرحلة هنا فور توفرها' : 'Trip updates will appear here'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markNotificationAsRead(n.id)}
              className={`w-full text-left rtl:text-right px-4 py-3 text-xs transition-colors cursor-pointer ${
                n.read
                  ? 'bg-white text-slate-600 hover:bg-slate-50'
                  : 'bg-emerald-50/70 text-slate-900 hover:bg-emerald-50 font-medium'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5 gap-2">
                <span className={`font-semibold ${n.read ? 'text-slate-700' : 'text-emerald-800'}`}>
                  {n.title}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
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
    </div>
  );
}
