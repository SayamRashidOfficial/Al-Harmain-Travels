'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Award, Compass } from 'lucide-react';

export default function MissionVisionSection() {
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
      className="relative pt-6 pb-8 sm:pt-8 sm:pb-10 lg:pt-10 lg:pb-12 overflow-hidden"
      aria-label="Mission and Vision"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Clean Section Header */}
        <div
          className="text-center max-w-xl mx-auto mb-6 sm:mb-8 lg:mb-10 space-y-2 transition-all duration-800 ease-out"
          style={{
            opacity: isInView || prefersReducedMotion ? 1 : 0,
            transform:
              isInView || prefersReducedMotion
                ? 'translateY(0)'
                : 'translateY(30px)',
            transitionDuration: '0.8s',
          }}
        >
          <h2 className="font-display text-3xl sm:text-4xl text-[#fdfbf7] font-normal tracking-tight">
            Our Purpose &amp; Horizon
          </h2>
        </div>

        {/* Two Clean Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">

          {/* ── Column 1: Mission ── */}
          <div
            className="p-6 sm:p-8 rounded-2xl bg-[#06241a]/45 border border-[#d4af37]/20 backdrop-blur-xs space-y-3.5 sm:space-y-4 hover:border-[#d4af37]/40 transition-all duration-300"
            style={{
              opacity: isInView || prefersReducedMotion ? 1 : 0,
              transform:
                isInView || prefersReducedMotion
                  ? 'translateY(0)'
                  : 'translateY(30px)',
              transitionDuration: '0.8s',
              transitionDelay: '100ms',
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#0a3326] border border-[#d4af37]/35 flex items-center justify-center text-[#f0d484] shadow-xs">
              <Award className="w-5 h-5 text-[#f0d484]" />
            </div>

            <h3 className="font-display text-2xl sm:text-3xl text-[#fdfbf7] font-normal tracking-tight">
              Our Mission
            </h3>

            <p className="font-sans text-base sm:text-[17px] text-[#d1e0d7] leading-[1.65] font-normal max-w-[60ch]">
              To provide safe, reliable, and comfortable transportation with genuine Islamic hospitality and care.
            </p>
          </div>

          {/* ── Column 2: Vision ── */}
          <div
            className="p-6 sm:p-8 rounded-2xl bg-[#06241a]/45 border border-[#d4af37]/20 backdrop-blur-xs space-y-3.5 sm:space-y-4 hover:border-[#d4af37]/40 transition-all duration-300"
            style={{
              opacity: isInView || prefersReducedMotion ? 1 : 0,
              transform:
                isInView || prefersReducedMotion
                  ? 'translateY(0)'
                  : 'translateY(30px)',
              transitionDuration: '0.8s',
              transitionDelay: '200ms',
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#0a3326] border border-[#d4af37]/35 flex items-center justify-center text-[#f0d484] shadow-xs">
              <Compass className="w-5 h-5 text-[#f0d484]" />
            </div>

            <h3 className="font-display text-2xl sm:text-3xl text-[#fdfbf7] font-normal tracking-tight">
              Our Vision
            </h3>

            <p className="font-sans text-base sm:text-[17px] text-[#d1e0d7] leading-[1.65] font-normal max-w-[60ch]">
              To be the Kingdom’s most trusted transport partner for pilgrims, delivering punctual, transparent, and caring service.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
