'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  X,
  User,
  Navigation,
  PhoneCall,
  Globe,
  LogOut,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

interface CustomerMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerMobileSidebar({ isOpen, onClose }: CustomerMobileSidebarProps) {
  const pathname = usePathname();
  const { currentUser, activeCustomerBooking, signOut } = useApp();

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
          2. MOBILE SIDEBAR DRAWER (Slides smoothly from left to right)
      ───────────────────────────────────────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Customer navigation drawer"
        onClick={(e) => e.stopPropagation()}
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-[70] w-[min(340px,86vw)] max-w-sm h-full flex flex-col bg-white text-slate-900 border-r border-[#e8e4dc] shadow-2xl transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        }}
      >
        {/* Header: Brand Emblem + Title + Close Button (Static brand prevents accidental click-throughs) */}
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
                VIP Customer Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* ─────────────────────────────────────────────────────────
              ITEM 1: CUSTOMER PROFILE
              Profile photo, customer name, VIP Pilgrim badge, and settings link
          ───────────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-[#faf8f4] border border-[#e8e4dc] p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {currentUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name || 'Customer'}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-950 text-amber-400 font-bold flex items-center justify-center border border-emerald-500/40 shadow-sm text-base">
                    {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {currentUser?.full_name || 'VIP Guest'}
                  </h3>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.email || currentUser?.phone || 'Verified VIP Account'}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    VIP Pilgrim
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Settings Access */}
            <Link
              href="/customer/profile"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors shadow-xs group"
            >
              <span className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Profile &amp; Settings</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Active Booking Live Banner (if any) */}
          {activeCustomerBooking && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Active Ride Underway
                </span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  #{activeCustomerBooking.booking_reference.slice(-5)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate">
                {activeCustomerBooking.destination_address || 'En route to destination'}
              </p>
              <Link
                href="/customer/track"
                onClick={onClose}
                className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Track Chauffeur Live</span>
              </Link>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              VIP SERVICES & PUBLIC ACCESS
          ───────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              VIP Services &amp; Concierge
            </p>

            {/* 24/7 VIP Concierge */}
            <a
              href="https://wa.me/966548881234"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>24/7 VIP Concierge</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    Instant Chauffeur &amp; Desk Support
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0c392c] text-white shrink-0 shadow-sm flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Chat
              </span>
            </a>

            {/* Visit Public Website */}
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:text-amber-600 transition-colors">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-slate-900">
                    Visit Public Website
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    Explore fleet, routes &amp; packages
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SIGN OUT (Secure session termination)
        ───────────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-[#e8e4dc] shrink-0 bg-slate-50/50 space-y-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <p className="text-[10px] text-center text-slate-400">
            KSA MOT Licensed Transport · Al Harmain
          </p>
        </div>
      </aside>
    </>
  );
}
