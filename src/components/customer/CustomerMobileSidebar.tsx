'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  User,
  Globe,
  LogOut,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

interface CustomerMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerMobileSidebar({ isOpen, onClose }: CustomerMobileSidebarProps) {
  const pathname = usePathname() || '';
  const { currentUser, signOut } = useApp();
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

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

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
        aria-label="Customer navigation drawer"
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
              {isRTL ? 'بوابة العملاء' : 'Customer Portal'}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {isRTL ? 'إدارة الحساب والخدمات' : 'Account & VIP Services'}
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
          {/* Customer Profile card */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {currentUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name || 'Customer'}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/50 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-950 text-amber-400 font-bold flex items-center justify-center border border-emerald-500/40 shadow-xs text-sm">
                    {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {currentUser?.full_name || (isRTL ? 'ضيف الرحمن' : 'VIP Guest')}
                  </h3>
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email || currentUser?.phone || (isRTL ? 'حساب VIP موثق' : 'Verified VIP Account')}
                </p>
                <div className="mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                    {t('vipPilgrim', 'VIP Pilgrim')}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Settings Access */}
            <Link
              href="/customer/profile"
              onClick={onClose}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors shadow-2xs group"
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>{isRTL ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}</span>
              </span>
              <ChevronIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1.5">
              {isRTL ? 'روابط سريعة' : 'Quick Navigation'}
            </p>

            {/* Visit Public Website */}
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200/90 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:text-amber-600 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-left rtl:text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {isRTL ? 'الموقع العام' : 'Visit Public Website'}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {isRTL ? 'الأسطول، المسارات والأسعار' : 'Fleet, routes & packages'}
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
