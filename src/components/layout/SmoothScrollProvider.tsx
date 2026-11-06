'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis with ultra-smooth, gentle, relaxing motion ("aram se")
    // lerp: 0.055 creates a velvety floating glide, wheelMultiplier: 0.6 prevents sudden fast jumps
    const lenis = new Lenis({
      lerp: 0.055, // Silky smooth damping — gently floats and decelerates
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.6, // Smaller, calm distance per wheel notch for relaxed scrolling
      touchMultiplier: 1.0,
      syncTouch: false, // Natural responsive touch on mobile
      autoRaf: true, // Native 60-144fps smooth animation loop
      infinite: false,
      allowNestedScroll: true, // Allow nested scrollable elements to scroll naturally
      prevent: (node) => {
        if (!(node instanceof HTMLElement)) return false;
        return Boolean(
          node.hasAttribute('data-lenis-prevent') ||
          node.closest('[data-lenis-prevent]') ||
          node.closest('aside') ||
          node.closest('[role="dialog"]') ||
          node.closest('.overflow-y-auto') ||
          node.closest('.overflow-auto')
        );
      },
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll events directly with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const handleResize = () => {
      lenis.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // On route change, reset scroll to top smoothly or immediately
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return <>{children}</>;
}
