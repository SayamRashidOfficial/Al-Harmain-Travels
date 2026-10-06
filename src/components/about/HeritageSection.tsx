'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

const HERITAGE_SLIDES = [
  {
    src: '/images/dest_madinah.jpg',
    alt: "Prophet's Mosque Al-Masjid An-Nabawi in Madinah",
    title: 'Madinah Al-Munawwarah',
    subtitle: 'Direct Northern Courtyard Clearance',
  },
  {
    src: '/images/dest_makkah.jpg',
    alt: 'Holy Kaaba and Al-Masjid Al-Haram in Makkah',
    title: 'Makkah Al-Mukarramah',
    subtitle: 'Ajyad & Ibrahim Al-Khalil Access',
  },
  {
    src: '/images/dest_jeddah.jpg',
    alt: 'King Abdulaziz International Airport Jeddah Gateway',
    title: 'Jeddah International Airport',
    subtitle: 'VIP Terminal Meet & Greet',
  },
];

export default function HeritageSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
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

  // Parallax for image container on scroll
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const offset = (window.innerHeight - rect.top) * 0.04;
        setScrollY(offset);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  // Automated image slideshow every 2.5 seconds (changes every 2500ms)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERITAGE_SLIDES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section
      id="about-story"
      ref={sectionRef}
      className="relative pt-10 pb-6 sm:pt-14 sm:pb-8 lg:pt-16 lg:pb-10 overflow-hidden"
      aria-label="Our Story and Heritage"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* ─────────────────────────────────────────────────────────
              LEFT COLUMN: STORY COPY (TEXT LEFT, 7 COLS)
              - Eyebrow
              - Section Title (32-40px)
              - Two short, clear, friendly paragraphs (max ~65 chars)
          ───────────────────────────────────────────────────────── */}
          <div
            className="lg:col-span-7 space-y-4 sm:space-y-5 transition-all duration-800 ease-out"
            style={{
              opacity: isInView || prefersReducedMotion ? 1 : 0,
              transform:
                isInView || prefersReducedMotion
                  ? 'translateY(0)'
                  : 'translateY(30px)',
              transitionDuration: '0.8s',
            }}
          >
            {/* Eyebrow */}
            <span className="text-xs font-mono uppercase tracking-[0.2em] font-semibold text-[#d4af37] block">
              Our Heritage &amp; Purpose
            </span>

            {/* Section Title: Clean, calm serif (32-40px) */}
            <h2 className="font-display text-3xl sm:text-4xl text-[#fdfbf7] font-normal tracking-tight leading-[1.2]">
              Dedicated to Spiritual{' '}
              <span className="text-[#f0d484] font-serif italic">Serenity</span> &amp;
              Punctuality
            </h2>

            {/* Two Short Paragraphs */}
            <div className="space-y-3 sm:space-y-3.5 text-sm sm:text-base md:text-lg text-[#d1e0d7] font-normal leading-[1.65] max-w-[65ch]">
              <p>
                Founded with a sacred commitment to serve Dhuyuf Al-Rahman (Guests of The Most Merciful), Al-Haramain Travels provides calm, dependable chauffeured journeys between the holy sanctuaries and airport terminals.
              </p>
              <p>
                Every itinerary is supported by real-time flight telemetry, courteous multilingual chauffeurs, and pre-cleared sanctuary courtyard access.
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              RIGHT COLUMN: ANIMATED SLIDESHOW (IMAGE RIGHT, 5 COLS)
              - Changes automatically every 2 to 3 seconds
              - Animated Ken Burns zoom + cross-fade
              - Location pill badge + mini indicator dots
          ───────────────────────────────────────────────────────── */}
          <div
            className="lg:col-span-5 flex justify-center lg:justify-end transition-all duration-800 ease-out"
            style={{
              opacity: isInView || prefersReducedMotion ? 1 : 0,
              transform:
                isInView || prefersReducedMotion
                  ? 'translateY(0)'
                  : 'translateY(30px)',
              transitionDuration: '0.8s',
              transitionDelay: '150ms',
            }}
          >
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="relative w-full max-w-[430px] aspect-[4/3] rounded-2xl overflow-hidden border border-[#d4af37]/35 shadow-[0_18px_45px_rgba(0,0,0,0.6)] bg-[#07241b] group select-none"
              style={{
                transform: prefersReducedMotion ? 'none' : `translateY(${-scrollY * 0.35}px)`,
                transition: 'transform 0.1s linear',
              }}
            >
              {/* Slides Container */}
              {HERITAGE_SLIDES.map((slide, index) => {
                const isActive = index === activeIndex;
                return (
                  <div
                    key={slide.src}
                    className="absolute inset-0 transition-opacity duration-800 ease-in-out"
                    style={{
                      opacity: isActive ? 1 : 0,
                      zIndex: isActive ? 10 : 1,
                      pointerEvents: isActive ? 'auto' : 'none',
                    }}
                  >
                    <div
                      className="relative w-full h-full"
                      style={{
                        transform:
                          isActive && !prefersReducedMotion ? 'scale(1.04)' : 'scale(1)',
                        transition: prefersReducedMotion
                          ? 'none'
                          : 'transform 2.8s cubic-bezier(0.25, 1, 0.5, 1)',
                      }}
                    >
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 430px"
                        priority={index === 0}
                        className="object-cover object-center"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Multi-stop Dark Vignette Overlay for Depth and Text Legibility */}
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(4, 23, 16, 0.15) 0%, transparent 40%, rgba(4, 23, 16, 0.85) 100%)',
                }}
              />

              {/* Location Badge (Bottom Left) */}
              <div className="absolute bottom-3.5 left-3.5 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#041710]/80 backdrop-blur-md border border-[#d4af37]/30 shadow-md">
                <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#fdfbf7] tracking-tight leading-none font-sans">
                    {HERITAGE_SLIDES[activeIndex].title}
                  </span>
                  <span className="text-[10px] text-[#f7e8ba]/80 font-mono tracking-wide mt-0.5">
                    {HERITAGE_SLIDES[activeIndex].subtitle}
                  </span>
                </div>
              </div>

              {/* Progress Indicator Dots (Bottom Right) */}
              <div className="absolute bottom-3.5 right-3.5 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#041710]/70 backdrop-blur-md border border-[#d4af37]/25">
                {HERITAGE_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className="relative cursor-pointer transition-all duration-300"
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${i === activeIndex
                        ? 'w-5 h-1.5 bg-[#d4af37] shadow-[0_0_6px_rgba(212,175,55,0.8)]'
                        : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                    />
                  </button>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
