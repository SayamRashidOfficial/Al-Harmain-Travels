'use client';

import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PatternBackground from '@/components/about/PatternBackground';
import AboutHero from '@/components/about/AboutHero';
import HeritageSection from '@/components/about/HeritageSection';
import StatsSection from '@/components/about/StatsSection';
import MissionVisionSection from '@/components/about/MissionVisionSection';
import AboutCtaSection from '@/components/about/AboutCtaSection';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    // Native browser scrolling with GSAP ScrollTrigger

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <PatternBackground className="min-h-screen text-[#f8f6f0]">
        {/* ── 1. Hero: Full-Screen, Slow-Zoom Haramain, Headline & Gold Button ── */}
        <AboutHero />

        {/* ── 2. Story: Two Short Paragraphs with One Image (Text Left, Image Right) ── */}
        <HeritageSection />

        {/* ── 3. Stats: 3 Minimal Counters with Thin Gold Dividers (Count-up on Scroll) ── */}
        <StatsSection />

        {/* ── 4. Mission & Vision: Two Clean Columns ── */}
        <MissionVisionSection />

        {/* ── 5. CTA: Let Us Accompany Your Spiritual Itinerary (Book Ride & WhatsApp) ── */}
        <AboutCtaSection />
      </PatternBackground>
  );
}
