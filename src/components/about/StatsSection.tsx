'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [pilgrimCount, setPilgrimCount] = useState(0);
  const [punctualityCount, setPunctualityCount] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
      if (media.matches) {
        setPilgrimCount(150000);
        setPunctualityCount(99.8);
        setHasAnimated(true);
      }
    }

    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          startCountUp();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const startCountUp = () => {
    const duration = 3500; // ms - luxurious, slower and more captivating count-up
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Smooth ease-out curve (quartic-like) for graceful deceleration
      const ease = 1 - Math.pow(1 - progress, 3.5);

      setPilgrimCount(Math.floor(ease * 150000));
      setPunctualityCount(Number((ease * 99.8).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setPilgrimCount(150000);
        setPunctualityCount(99.8);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-6 sm:py-8 lg:py-9 border-y border-[#d4af37]/20 bg-[#062117]/50 backdrop-blur-xs"
      aria-label="Pilgrim Trust and Sanctuary Performance Statistics"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-center justify-center text-center">

          {/* ── Stat 1 (Left): 150,000+ Pilgrims ── */}
          <div className="flex flex-col items-center px-4 space-y-1.5 sm:space-y-2">
            <span className="font-display tabular-nums text-4xl sm:text-5xl lg:text-[3.25rem] font-normal text-[#f0d484] tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(240,212,132,0.2)]">
              {pilgrimCount.toLocaleString()}+
            </span>
            <p className="text-sm sm:text-base text-[#d1e0d7] font-medium tracking-wide">
              Pilgrims Transported
            </p>

          </div>

          {/* ── Stat 2 (Middle): MOT Certified & Officially Licensed & Insured ── */}
          <div className="flex flex-col items-center px-4 py-4 md:py-1 space-y-1.5 sm:space-y-2 md:border-x md:border-[#d4af37]/25 border-y md:border-y-0 border-[#d4af37]/15">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#d4af37] shrink-0 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
              <span className="font-display text-2xl sm:text-3xl lg:text-[2.35rem] font-normal text-[#f0d484] tracking-tight leading-none">
                MOT Certified
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#d1e0d7] font-medium tracking-wide">
              Officially Licensed &amp; Insured
            </p>
            <p className="text-xs text-[#9cb4a8] font-mono tracking-wider max-w-[28ch]">
              License #KSA-MOT-99201
            </p>
          </div>

          {/* ── Stat 3 (Right): 99.8% Punctuality ── */}
          <div className="flex flex-col items-center px-4 space-y-1.5 sm:space-y-2">
            <span className="font-display tabular-nums text-4xl sm:text-5xl lg:text-[3.25rem] font-normal text-[#f0d484] tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(240,212,132,0.2)]">
              {punctualityCount.toFixed(1)}%
            </span>
            <p className="text-sm sm:text-base text-[#d1e0d7] font-medium tracking-wide">
              Punctuality Score
            </p>

          </div>

        </div>
      </div>
    </section>
  );
}
