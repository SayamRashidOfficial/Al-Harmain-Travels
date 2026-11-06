'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  ArrowUp,
  Compass,
} from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import BrandLogo from '@/components/ui/BrandLogo';
import { SITE_CONFIG } from '@/config/siteConfig';

export default function Footer() {
  const pathname = usePathname() || '';
  const footerRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Completely remove footer from all dashboard portals (customer, driver, dispatcher, admin)
  const isDashboard =
    Boolean(pathname) &&
    (pathname.startsWith('/customer') ||
      pathname.startsWith('/driver') ||
      pathname.startsWith('/dispatcher') ||
      pathname.startsWith('/admin'));

  // Completely remove footer from all auth flows (sign-in, sign-up, forgot-password, reset-password, verify, callback, etc.)
  const isAuthPage =
    Boolean(pathname) &&
    (pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/verify-email') ||
      pathname.startsWith('/verify-phone') ||
      pathname.startsWith('/callback') ||
      pathname.startsWith('/auth'));

  const shouldHideFooter = isDashboard || isAuthPage;

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (shouldHideFooter || typeof window === 'undefined') return;

    // Detect user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const motionListener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setIsInView(true);
    };
    mediaQuery.addEventListener?.('change', motionListener);

    if (mediaQuery.matches) {
      setIsInView(true);
      return () => {
        mediaQuery.removeEventListener?.('change', motionListener);
      };
    }

    const node = footerRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return () => {
        mediaQuery.removeEventListener?.('change', motionListener);
      };
    }

    // Immediately reveal if footer is already visible or near viewport on mount
    const rect = node.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 150) {
      setIsInView(true);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.02,
        rootMargin: '100px 0px 0px 0px',
      }
    );

    observer.observe(node);

    // Guaranteed fallback: ensure footer content is shown even if observer fails or doesn't trigger
    const fallbackTimer = setTimeout(() => {
      setIsInView(true);
    }, 600);

    return () => {
      mediaQuery.removeEventListener?.('change', motionListener);
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [pathname, shouldHideFooter]);

  // Helper for smooth downward-to-upward staggered reveal
  const getRevealStyle = (delayMs: number) => {
    if (prefersReducedMotion) return {};
    return {
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      willChange: 'opacity, transform',
    };
  };

  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer
      ref={footerRef}
      className="relative overflow-hidden bg-[#072118] border-t border-emerald-900/60 text-emerald-100/80 font-sans pb-24 sm:pb-0"
      aria-label="Al Harmain Travels Footer"
    >
      {/* ── Reusable Cinematic Texture Layer (Default Footer Preset: Deep Green + Gold) ── */}
      <CinematicTexture variant="footer" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ─────────────────────────────────────────────────────────────
            1. TOP: FORMAL CALL-TO-ACTION ROW (DOWNWARD TO UPWARD REVEAL)
        ───────────────────────────────────────────────────────────── */}
        <div
          className="py-10 sm:py-12 border-b border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          style={getRevealStyle(100)}
        >
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight font-sans">
              Ready for a dignified journey?
            </h3>
            <p className="font-sans text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
              To become the Middle East’s most trusted sacred transport network through excellence, innovation, and exceptional service.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            <Link
              href="/customer"
              className="bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] px-8 py-3.5 sm:px-9 sm:py-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center gap-2.5 cursor-pointer group active:scale-95"
              aria-label="Book Your Ride"
            >
              <Compass className="w-4 h-4 text-[#06101e]" />
              <span>Book Your Ride</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href={SITE_CONFIG.contact.whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase text-white/90 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 hover:border-[#d4af37]/60 transition-all duration-300 cursor-pointer active:scale-95 shadow-md"
            >
              <MessageCircle className="w-4 h-4 text-[#d4af37]" />
              <span>WhatsApp 24/7</span>
            </a>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. MAIN FOOTER CONTENT (4 STAGGERED RISING COLUMNS)
        ───────────────────────────────────────────────────────────── */}
        <div className="py-12 sm:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* ── COL 1: BRAND, TGA LICENSE & MONOCHROME SOCIAL ICONS (4 COLS) ── */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4" style={getRevealStyle(180)}>
            <BrandLogo size="md" href="/" subtitle="VIP Chauffeur · Makkah · Madinah" variant="dark" />

            {/* Clean Formal TGA License Info */}
            <div className="flex items-center gap-2 text-xs text-emerald-200/80 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>{SITE_CONFIG.regulatory.licenseLabel}</span>
            </div>

            {/* Minimalist Social Media Icons (White by default, brand color & animated on hover) */}
            <div className="flex items-center gap-5 mt-6">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-white hover:text-[#1877F2] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(24,119,242,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="https://x.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-white hover:text-[#1DA1F2] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(29,161,242,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-white hover:text-[#E4405F] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(228,64,95,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-white hover:text-[#FF0050] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(255,0,80,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-white hover:text-[#0A66C2] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(10,102,194,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.54a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={SITE_CONFIG.contact.whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-white hover:text-[#25D366] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 active:scale-95 hover:drop-shadow-[0_2px_10px_rgba(37,211,102,0.6)] inline-flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.41a8.175 8.175 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── COL 2: QUICK LINKS (2 COLS) ── */}
          <div className="lg:col-span-2 space-y-3.5" style={getRevealStyle(260)}>
            <h4 className="text-xs font-semibold tracking-wider text-[#d4af37] uppercase font-sans">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Book a journey', href: '/customer' },
                { label: 'Services & fleet', href: '/services' },
                { label: 'Track my ride', href: '/customer/track' },
                { label: 'About us', href: '/about' },
                { label: 'Contact support', href: '/contact' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-emerald-100/75 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── COL 3: POPULAR ROUTES (3 COLS) ── */}
          <div className="lg:col-span-3 space-y-3.5" style={getRevealStyle(340)}>
            <h4 className="text-xs font-semibold tracking-wider text-[#d4af37] uppercase font-sans">
              Popular Routes
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { title: 'Jeddah Airport ⇄ Makkah', desc: '55m &bull; VIP Terminal Meet' },
                { title: 'Makkah ⇄ Madinah', desc: 'Intercity Highway Express' },
                { title: 'Madinah Airport ⇄ Hotels', desc: '25m &bull; Central Markaziyah & Hotel Drop-Offs' },
                { title: 'Ziyarat Holy Sites Tours', desc: 'Ghar Hira, Quba & Uhud' },
              ].map((r) => (
                <li key={r.title}>
                  <Link
                    href="/customer"
                    className="group block transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                  >
                    <span className="text-emerald-100/85 group-hover:text-white group-hover:translate-x-0.5 inline-flex items-center gap-1.5 transition-all duration-200 font-medium text-sm">
                      <span>{r.title}</span>
                    </span>
                    <span
                      dangerouslySetInnerHTML={{ __html: r.desc }}
                      className="block text-[11px] text-emerald-200/50 group-hover:text-emerald-200/70 transition-colors font-sans"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── COL 4: CONTACT & DISPATCH (3 COLS) ── */}
          <div className="lg:col-span-3 space-y-3.5" style={getRevealStyle(420)}>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold tracking-wider text-[#d4af37] uppercase font-sans">
                Need Help?
              </h4>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                24/7
              </span>
            </div>

            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={SITE_CONFIG.contact.phoneTel}
                  className="flex items-center gap-2.5 text-emerald-100/80 hover:text-white transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  <Phone className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span>{SITE_CONFIG.contact.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.contact.whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-emerald-100/80 hover:text-emerald-300 transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>WhatsApp Dispatch Desk</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE_CONFIG.contact.email}`}
                  className="flex items-center gap-2.5 text-emerald-100/80 hover:text-white transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  <Mail className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span className="truncate">{SITE_CONFIG.contact.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-emerald-100/80">
                <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>{SITE_CONFIG.contact.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. BOTTOM BAR (CLEAN, FORMAL DIVIDER & COPYRIGHT)
        ───────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-slate-800/80 text-xs text-slate-400 font-sans"
          style={getRevealStyle(500)}
        >
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} {SITE_CONFIG.brandName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-amber-400 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-700 select-none">
                •
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-amber-400 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-700 select-none">
                •
              </li>
              <li>
                <Link
                  href="/cancellation-policy"
                  className="hover:text-amber-400 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  Cancellation Policy
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-700 select-none">
                •
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-amber-400 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  Support
                </Link>
              </li>
            </ul>

            {/* Clean, Simple Back to Top Button */}
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
              aria-label="Back to top"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
