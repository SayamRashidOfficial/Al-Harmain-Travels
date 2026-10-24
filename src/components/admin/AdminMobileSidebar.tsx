'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  Shield,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sliders,
} from 'lucide-react';
import { ADMIN_NAV_SECTIONS } from './AdminDashboardShell';

interface AdminMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMobileSidebar({ isOpen, onClose }: AdminMobileSidebarProps) {
  const pathname = usePathname();
  const { currentUser, signOut } = useApp();
  const { dir, isRTL, t } = useLanguage();

  // Close sidebar only when pathname actually changes
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

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const getSectionTitle = (title: string) => {
    switch (title) {
      case 'Core HQ': return isRTL ? 'المقر الرئيسي' : 'Core HQ';
      case 'Operations': return isRTL ? 'العمليات' : 'Operations';
      case 'Tariff & Finance': return isRTL ? 'التعريفات والمالية' : 'Tariff & Finance';
      case 'Governance': return isRTL ? 'الحوكمة والأمان' : 'Governance';
      default: return title;
    }
  };

  const getItemLabel = (item: (typeof ADMIN_NAV_SECTIONS)[0]['items'][0]) => {
    switch (item.href) {
      case '/admin': return t('nav.overview', item.label);
      case '/admin/users': return t('nav.users', item.label);
      case '/admin/reviews': return t('nav.reviews', item.label);
      case '/admin/services': return t('nav.services', item.label);
      case '/admin/rates': return t('nav.rates', item.label);
      case '/admin/reports': return t('nav.reports', item.label);
      case '/admin/audit-logs': return t('nav.auditLogs', item.label);
      case '/admin/settings': return t('nav.settings', item.label);
      default: return item.label;
    }
  };

  const getItemSubtitle = (item: (typeof ADMIN_NAV_SECTIONS)[0]['items'][0]) => {
    switch (item.href) {
      case '/admin': return t('nav.overviewSub', item.subtitle);
      case '/admin/users': return t('nav.usersSub', item.subtitle);
      case '/admin/reviews': return t('nav.reviewsSub', item.subtitle);
      case '/admin/services': return t('nav.servicesSub', item.subtitle);
      case '/admin/rates': return t('nav.ratesSub', item.subtitle);
      case '/admin/reports': return t('nav.reportsSub', item.subtitle);
      case '/admin/audit-logs': return t('nav.auditLogsSub', item.subtitle);
      case '/admin/settings': return t('nav.settingsSub', item.subtitle);
      default: return item.subtitle;
    }
  };

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
        aria-label="Admin Navigation Drawer"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className={`lg:hidden fixed top-0 bottom-0 ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } z-[70] w-[min(300px,85vw)] max-w-sm h-full flex flex-col bg-white text-slate-900 border-slate-200/90 shadow-2xl transition-transform duration-300 ease-out transform ${
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
              {isRTL ? 'بوابة الإدارة العليا' : 'Executive Admin HQ'}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {isRTL ? 'التحكم بالعمليات والتعريفات' : 'Operations & Tariff Control'}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 transition-colors w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div
          className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Admin Identity Card */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {currentUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name || 'Admin'}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500/60 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold flex items-center justify-center border border-amber-400/50 shadow-xs text-sm">
                    {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {currentUser?.full_name || (isRTL ? 'مدير النظام' : 'Administrator')}
                  </h3>
                  <ShieldCheck className="w-3 h-3 text-amber-500 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email || 'admin@alharmaintravels.com'}
                </p>
                <div className="mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    <Shield className="w-2.5 h-2.5 text-amber-600" />
                    {isRTL ? 'إدارة عليا موحدة' : 'Single Authority HQ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick System Settings Link */}
            <Link
              href="/admin/settings"
              onClick={onClose}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors shadow-2xs group"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-45 transition-transform" />
                <span>{isRTL ? 'إعدادات النظام والشركة' : 'System Configuration'}</span>
              </span>
              <ChevronIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Organized Navigation Sections */}
          <div className="space-y-4">
            {ADMIN_NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 px-1.5">
                  {getSectionTitle(section.title)}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold shadow-2xs'
                            : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 text-left rtl:text-right">
                            <span className="block truncate text-xs font-bold leading-tight">
                              {getItemLabel(item)}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                              {getItemSubtitle(item)}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        ) : (
                          <ChevronIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIGN OUT & FOOTER */}
        <div className="p-3 border-t border-slate-200/90 shrink-0 bg-slate-50/80 space-y-2">

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('signOut', 'Sign Out')} HQ</span>
          </button>
          <p className="text-[9px] text-center text-slate-400">
            {isRTL ? 'نقل مرخص من الهيئة العامة للنقل · الحرمين' : 'KSA MOT Licensed Transport · Al Harmain'}
          </p>
        </div>
      </aside>
    </>
  );
}
