'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUp, Phone, Mail, MapPin, ShieldCheck, Award, Clock, Globe } from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';

export default function Footer() {
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement>(null);

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

  if (isDashboard || isAuthPage) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isCurrent = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const exploreLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Customer Portal', href: '/customer' },
  ];

  const serviceLinks = [
    { label: 'Airport Transfers', href: '/services' },
    { label: 'Umrah & Hajj Transport', href: '/services' },
    { label: 'Private Chauffeur', href: '/services' },
    { label: 'Intercity Transfers', href: '/services' },
    { label: 'Family Transportation', href: '/services' },
  ];

  const standardItems = [
    { label: 'Licensed Chauffeurs', icon: ShieldCheck },
    { label: 'Fixed Transparent Rates', icon: Award },
    { label: 'Flight Delay Protection', icon: Clock },
    { label: 'Multilingual Concierge', icon: Globe },
  ];

  return (
    <footer
      ref={footerRef}
      className="relative mt-auto bg-[#072118] text-[#e8e4d8] font-sans rounded-none overflow-hidden border-t border-[#d4a24c]/30 shadow-2xl pb-20 sm:pb-0"
      aria-label="Al Harmain Travels Footer"
    >
      {/* ── Living Cinematic Animated Texture (Canvas 2D, mouse-reactive particles & arabesque) ── */}
      <CinematicTexture variant="footer" parentRef={footerRef} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-14 pb-5 sm:pb-6">
        {/* ─────────────────────────────────────────────────────────────
            MAIN 4-COLUMN RESPONSIVE GRID
            (Desktop: 4 columns with wider brand column, Tablet: 2 cols, Mobile: 1 col)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-7 lg:gap-8 pb-7 sm:pb-9">
          {/* ── 1. BRAND COLUMN (Wider on desktop: 4 of 12 cols) ── */}
          <div className="md:col-span-1 lg:col-span-4 space-y-5">
            {/* Logo: Gold triangular/mountain icon next to AL HARMAIN TRAVELS with navbar animated line */}
            <Link
              href="/"
              className="inline-flex items-center gap-3 group focus:outline-none"
              aria-label="Al Harmain Travels Home"
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <svg
                  viewBox="0 0 32 32"
                  className="w-8 h-8 text-[#d4a24c] fill-none stroke-current"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="16,3 3,27 29,27" fill="rgba(212,162,76,0.18)" stroke="#d4a24c" strokeWidth="2.2" />
                  <polygon points="16,10 8,27 24,27" fill="rgba(212,162,76,0.36)" stroke="#d4a24c" strokeWidth="1.8" />
                  <line x1="16" y1="3" x2="16" y2="27" stroke="#d4a24c" strokeWidth="1.2" strokeDasharray="2 2" />
                </svg>
              </div>
              <span className="relative py-1 font-bold text-white uppercase tracking-[0.18em] text-base sm:text-lg leading-tight font-sans group-hover:text-[#d4a24c] transition-colors">
                <span>AL HARMAIN TRAVELS</span>
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
              </span>
            </Link>


            <div className="pt-1 flex items-center gap-2.5" aria-label="Social media links">
              {/* X / Twitter */}
              <a
                href="https://x.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="w-9 h-9 rounded-md border border-white/20 hover:border-[#d4a24c] flex items-center justify-center text-white/80 hover:text-[#d4a24c] hover:bg-[#d4a24c]/10 active:scale-95 transition-all duration-200"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-md border border-white/20 hover:border-[#d4a24c] flex items-center justify-center text-white/80 hover:text-[#d4a24c] hover:bg-[#d4a24c]/10 active:scale-95 transition-all duration-200"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-md border border-white/20 hover:border-[#d4a24c] flex items-center justify-center text-white/80 hover:text-[#d4a24c] hover:bg-[#d4a24c]/10 active:scale-95 transition-all duration-200"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/alharmaintravels"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-md border border-white/20 hover:border-[#d4a24c] flex items-center justify-center text-white/80 hover:text-[#d4a24c] hover:bg-[#d4a24c]/10 active:scale-95 transition-all duration-200"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── 2. "EXPLORE" COLUMN (lg:col-span-2) ── */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a24c] font-sans">
              EXPLORE
            </h4>
            <ul className="space-y-3 text-sm">
              {exploreLinks.map((link) => {
                const active = isCurrent(link.href);
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`relative inline-block py-1 text-sm font-bold tracking-tight transition-colors duration-200 group focus:outline-none ${active ? 'text-white' : 'text-[#e8e4d8]/85 hover:text-white'
                        }`}
                    >
                      <span>{link.label}</span>
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out ${active
                          ? 'scale-x-100'
                          : 'scale-x-0 group-hover:scale-x-100 group-active:scale-x-100'
                          }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── 3. "OUR SERVICES" COLUMN (lg:col-span-3) ── */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a24c] font-sans">
              OUR SERVICES
            </h4>
            <ul className="space-y-3 text-sm">
              {serviceLinks.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="relative inline-block py-1 text-sm font-bold tracking-tight text-[#e8e4d8]/85 hover:text-white transition-colors duration-200 group focus:outline-none"
                  >
                    <span>{service.label}</span>
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── 4. "CONTACT" + "AL HARMAIN STANDARD" COLUMN (lg:col-span-3, stacked) ── */}
          <div className="md:col-span-1 lg:col-span-3 space-y-7">
            {/* CONTACT Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a24c] font-sans">
                CONTACT
              </h4>
              <ul className="space-y-2.5 text-sm text-[#e8e4d8]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-medium text-emerald-200">24/7 Customer Support</span>
                </li>
                <li>
                  <a
                    href="tel:+966548881234"
                    className="relative inline-flex items-center gap-2 text-[#e8e4d8]/85 hover:text-white transition-colors duration-200 group py-1 focus:outline-none"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#d4a24c] shrink-0" />
                    <span className="relative">
                      <span>Phone: +966 54 888 1234</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:alharmaintravels@gmail.com"
                    className="relative inline-flex items-center gap-2 text-[#e8e4d8]/85 hover:text-white transition-colors duration-200 group py-1 truncate max-w-full focus:outline-none"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#d4a24c] shrink-0" />
                    <span className="relative truncate">
                      <span>Email: alharmaintravels@gmail.com</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
                    </span>
                  </a>
                </li>
                <li className="inline-flex items-center gap-2 text-[#e8e4d8]/90">
                  <MapPin className="w-3.5 h-3.5 text-[#d4a24c] shrink-0" />
                  <span>Saudi Arabia</span>
                </li>
              </ul>
            </div>

            {/* AL HARMAIN STANDARD Section */}
            <div className="space-y-3 pt-1 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4a24c] font-sans pt-2">
                AL HARMAIN STANDARD
              </h4>
              <ul className="space-y-2 text-sm text-[#e8e4d8]">
                {standardItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="flex items-center gap-2 text-xs text-[#e8e4d8]/90">
                      <Icon className="w-3.5 h-3.5 text-[#d4a24c] shrink-0" />
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM BAR
            - Centered "BACK TO TOP" action button with navbar underline animation
            - Separated by a thin divider line
            - Centered text: "Makkah • Madinah • Jeddah"
            - Copyright + "Privacy Policy | Terms & Conditions"
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-4 sm:pt-5 pb-2 border-t border-[#d4a24c]/20 space-y-3.5 sm:space-y-4">
          {/* Centered BACK TO TOP button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={scrollToTop}
              className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[#d4a24c] text-[#d4a24c] hover:bg-[#d4a24c] hover:text-[#072118] text-xs font-bold tracking-[0.18em] uppercase transition-all duration-200 cursor-pointer group shadow-sm focus:outline-none focus:ring-1 focus:ring-[#d4a24c] active:scale-95"
              aria-label="Back to top"
            >
              <ArrowUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
              <span className="relative">
                <span>BACK TO TOP</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-current rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
              </span>
            </button>
          </div>

          {/* Centered holy destinations line */}
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-[#d4a24c] uppercase font-sans">
              Makkah &bull; Madinah &bull; Jeddah
            </p>
          </div>

          {/* Bottom split-row: Copyright & Policy links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#e8e4d8]/70 pt-1 font-sans">
            <p className="text-center sm:text-left">
              &copy; 2026 Al Harmain Travels. All Rights Reserved.
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/contact"
                className="relative py-1 text-[#e8e4d8]/70 hover:text-white transition-colors duration-200 group focus:outline-none"
              >
                <span>Privacy Policy</span>
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
              </Link>
              <span className="text-white/20">|</span>
              <Link
                href="/contact"
                className="relative py-1 text-[#e8e4d8]/70 hover:text-white transition-colors duration-200 group focus:outline-none"
              >
                <span>Terms &amp; Conditions</span>
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#d4a24c] rounded-full transition-transform duration-300 origin-left ease-out scale-x-0 group-hover:scale-x-100 group-active:scale-x-100" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Solid gold/amber strip along the very bottom edge as a decorative border ── */}
      <div className="h-1.5 w-full bg-[#d4a24c]" aria-hidden="true" />
    </footer>
  );
}
