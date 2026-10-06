'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';

export default function AboutCtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
    }

    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-10 sm:py-14 lg:py-16 overflow-hidden"
      aria-label="Book Your Spiritual Journey"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-9 text-center space-y-5 sm:space-y-6 border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xs transition-all duration-800 ease-out"
          style={{
            background:
              'linear-gradient(145deg, rgba(7, 33, 24, 0.9) 0%, rgba(13, 56, 43, 0.85) 60%, rgba(4, 23, 16, 0.95) 100%)',
            opacity: isInView || prefersReducedMotion ? 1 : 0,
            transform:
              isInView || prefersReducedMotion
                ? 'translateY(0)'
                : 'translateY(30px)',
            transitionDuration: '0.8s',
          }}
        >
          {/* Subtle Radial Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 space-y-3.5 sm:space-y-4 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] text-[#fdfbf7] font-normal tracking-tight leading-[1.18]">
              Let Us Accompany Your Spiritual Itinerary
            </h2>

            <p className="font-sans text-base sm:text-lg text-[#d1e0d7] font-normal leading-[1.65] max-w-[65ch] mx-auto">
              Reserve your VIP chauffeur for Makkah, Madinah, or Jeddah with guaranteed on-time airport arrivals and dedicated sanctuary drop-off clearances.
            </p>

            {/* Buttons: Home Page Signature Style */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                href="/customer"
                className="bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] px-8 py-3.5 sm:px-9 sm:py-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center gap-2.5 cursor-pointer group active:scale-95"
                aria-label="Book Your Ride"
              >
                <span>Book Your Ride</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <a
                href="https://wa.me/966548881234"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase text-white/90 bg-white/10 hover:bg-white/20 hover:text-white border border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer group active:scale-95"
                aria-label="Contact Al-Haramain Travels via WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-[#d4af37] transition-transform group-hover:scale-110" />
                <span>WhatsApp 24/7</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
