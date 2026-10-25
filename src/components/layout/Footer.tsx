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

export default function Footer() {
  const pathname = usePathname();
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
  }, [pathname]);

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
              href="https://wa.me/966548881234"
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

          {/* ── COL 1: BRAND & MOT LICENSE (4 COLS) ── */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4" style={getRevealStyle(180)}>
            <BrandLogo size="md" href="/" subtitle="VIP Chauffeur · Makkah · Madinah" variant="dark" />

            {/* Clean Formal MOT License Info */}
            <div className="flex items-center gap-2 text-xs text-emerald-200/80 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>KSA Ministry of Transport Licensed Operator #4029</span>
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
                { title: 'Madinah Airport ⇄ Hotels', desc: '25m &bull; Direct Haram Gates' },
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
                  href="tel:+966548881234"
                  className="flex items-center gap-2.5 text-emerald-100/80 hover:text-white transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  <Phone className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span>+966 54 888 1234</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/966548881234"
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
                  href="mailto:bookings@alharmaintravels.com"
                  className="flex items-center gap-2.5 text-emerald-100/80 hover:text-white transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  <Mail className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span className="truncate">bookings@alharmaintravels.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-emerald-100/80">
                <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>Ibrahim Al Khalil St, Makkah</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. BOTTOM BAR (CLEAN, FORMAL DIVIDER & COPYRIGHT)
        ───────────────────────────────────────────────────────────── */}
        <div
          className="py-6 border-t border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-200/60 font-sans"
          style={getRevealStyle(500)}
        >
          <p className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Al Harmain Travels. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
            >
              Staff sign in
            </Link>
            <Link
              href="/contact"
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
            >
              Support
            </Link>
            {/* Social Media Icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="transform transition-transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(0,119,181,0.8)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-[#0A66C2]"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.039-1.852-3.039-1.853 0-2.136 1.445-2.136 2.939v5.669h-3.554V9h3.413v1.561h.047c.476-.9 1.637-1.852 3.371-1.852 3.603 0 4.267 2.37 4.267 5.452v6.291zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.069 0-1.144.925-2.069 2.069-2.069 1.144 0 2.069.925 2.069 2.069 0 1.143-.925 2.069-2.069 2.069zm1.777 13.019H3.56V9h3.554v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.723v20.554C0 23.229.792 24 1.771 24h20.451C23.208 24 24 23.229 24 22.277V1.723C24 .771 23.208 0 22.225 0z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="transform transition-transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-[#FF0050]"
                >
                  <path d="M9.5 3c0 2.97-.22 5.83-.74 8.55-1.06-.5-2.27-.8-3.66-.8C2.47 10.75 0 13.22 0 16.25s2.47 5.5 5.5 5.5 5.5-2.47 5.5-5.5c0-.94-.23-1.83-.63-2.6 2.02.39 4.28.61 6.63.61v-3c-3.14 0-5.83-1.68-7.1-4.16C12.07 10.86 12 9.93 12 9c0-3.31 2.69-6 6-6V0c-4.97 0-9 4.03-9 9z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transform transition-transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(59,89,152,0.8)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-[#3B5998]"
                >
                  <path d="M22.676 0H1.324C.593 0 0 .593 0 1.324v21.352C0 23.407.593 24 1.324 24h11.495v-9.294H9.69V11.01h3.129V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.796.144v3.24l-1.918.001c-1.504 0-1.795.716-1.795 1.765v2.313h3.587l-.467 3.696h-3.12V24h6.116C23.407 24 24 23.407 24 22.676V1.324C24 .593 23.407 0 22.676 0z" />
                </svg>
              </a>
              <a
                href="https://x.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="transform transition-transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-[#000000]"
                >
                  <path d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.607 1.794-1.566 2.163-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-2.722 0-4.928 2.206-4.928 4.928 0 .386.043.762.127 1.124-4.094-.205-7.725-2.168-10.152-5.152-.424.727-.666 1.571-.666 2.475 0 1.708.87 3.216 2.188 4.099-.807-.026-1.566-.247-2.228-.616v.062c0 2.385 1.697 4.374 3.946 4.824-.413.112-.849.171-1.296.171-.317 0-.626-.031-.928-.088.626 1.956 2.444 3.379 4.6 3.418-1.68 1.317-3.808 2.103-6.115 2.103-.398 0-.79-.023-1.176-.069 2.179 1.397 4.768 2.212 7.557 2.212 9.054 0 14.003-7.496 14.003-13.986 0-.21-.005-.423-.014-.634.962-.694 1.8-1.562 2.46-2.549z" />
                </svg>
              </a>
            </div>

            {/* Clean, Simple Back to Top Button */}
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-emerald-200/70 hover:text-[#d4af37] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
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
