'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';

export default function AboutHero() {
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);

      const handleScroll = () => {
        setScrollY(window.scrollY);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToStory = () => {
    const story = document.getElementById('about-story');
    if (story) {
      story.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-[75vh] sm:min-h-[85vh] lg:min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20"
      aria-label="About Hero"
    >
      {/* ── 1. Slow-Zoom Background Image of the Haramain with Parallax ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          transform: prefersReducedMotion ? 'none' : `translateY(${scrollY * 0.22}px)`,
          willChange: 'transform',
        }}
      >
        <div
          className={`relative w-full h-[120%] -top-[10%] ${prefersReducedMotion ? '' : 'animate-kenburns'
            }`}
          style={{
            animation: prefersReducedMotion ? 'none' : 'kenburns 26s ease-in-out infinite alternate',
          }}
        >
          <Image
            src="/images/hero_kaaba.jpg"
            alt="The Holy Kaaba and Al-Masjid Al-Haram at night"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-105"
          />
        </div>

        {/* Cinematic Multi-stop Dark Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 23, 16, 0.72) 0%, rgba(4, 23, 16, 0.84) 45%, rgba(4, 23, 16, 0.94) 80%, #041710 100%)',
          }}
        />

        {/* Soft Radial Gold Spotlight at Center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* ── 2. Hero Content (Centered, Minimal, Calm) ── */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5 sm:space-y-6 lg:space-y-7">

        {/* Eyebrow Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#07251c]/70 backdrop-blur-md shadow-xs transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '100ms',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] font-semibold text-[#f7e8ba]">
            Serving The Guests of The Most Merciful
          </span>
        </div>

        {/* Headline: "A Legacy of Sacred Hospitality & Precision" with Line-by-Line Reveal */}
        <div className="space-y-1">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[4rem] text-[#fdfbf7] font-normal tracking-tight leading-[1.12] sm:leading-[1.14]">
            <span className="block overflow-hidden pb-1">
              <span
                className="block transition-transform duration-800 ease-out"
                style={{
                  transform: mounted || prefersReducedMotion ? 'translateY(0)' : 'translateY(110%)',
                  transitionDelay: '200ms',
                }}
              >
                A Legacy of
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span
                className="block text-[#f0d484] transition-transform duration-800 ease-out font-serif italic"
                style={{
                  transform: mounted || prefersReducedMotion ? 'translateY(0)' : 'translateY(110%)',
                  transitionDelay: '350ms',
                }}
              >
                Sacred Hospitality
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span
                className="block transition-transform duration-800 ease-out"
                style={{
                  transform: mounted || prefersReducedMotion ? 'translateY(0)' : 'translateY(110%)',
                  transitionDelay: '500ms',
                }}
              >
                &amp; Precision
              </span>
            </span>
          </h1>
        </div>

        {/* Subline: Clean, friendly, max ~65 characters per line */}
        <p
          className="font-sans text-sm sm:text-base md:text-lg text-[#d3e3da] max-w-2xl mx-auto leading-relaxed font-normal tracking-wide transition-all duration-800 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted || prefersReducedMotion ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '650ms',
            lineHeight: 1.65,
          }}
        >
          Serving the pilgrims of Makkah and Madinah with sovereign comfort, authorized Haram permits, and clockwork precision.
        </p>

        {/* Apple-style Refined Gold Action Button */}
        <div
          className="pt-2 flex justify-center transition-all duration-800 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted || prefersReducedMotion ? 'translateY(0)' : 'translateY(24px)',
            transitionDelay: '800ms',
          }}
        >
          <Link
            href="/customer"
            className="bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] px-8 py-3.5 sm:px-9 sm:py-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center gap-2.5 cursor-pointer group active:scale-95"
            aria-label="Book Your Ride with Al Harmain Travels"
          >
            <span>Book Your Ride</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* ── 3. Apple-style Frosted Pill Scroll Indicator ── */}
      <button
        type="button"
        onClick={scrollToStory}
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#041710]/60 hover:bg-[#041710]/85 backdrop-blur-md border border-white/15 hover:border-[#d4af37]/45 text-[#d1e0d7] hover:text-[#fdfbf7] shadow-sm hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
        aria-label="Scroll to our story"
      >
        <span className="text-[11px] font-medium tracking-wider uppercase">
          Explore
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#d4af37] transition-transform duration-300 group-hover:translate-y-0.5" />
      </button>

      {/* Inline styles for Ken Burns slow zoom */}
      <style jsx>{`
        @keyframes kenburns {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.08);
          }
        }
      `}</style>
    </section>
  );
}
