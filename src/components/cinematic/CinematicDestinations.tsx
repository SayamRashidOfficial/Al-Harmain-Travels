'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/* ─────────────────────────────────────────────────────────────────────────────
   SINGLE EDITABLE DESTINATIONS ARRAY (EDITABLE FROM HERE)
   Format: { id, title, country, subtitle, image, link, pickup, destination }
───────────────────────────────────────────────────────────────────────────── */
export interface DestinationPanel {
  id: string;
  title: string;
  country: string;
  subtitle: string;
  image: string;
  link: string;
  pickup: string;
  destination: string;
}

export const DESTINATIONS_DATA: DestinationPanel[] = [
  {
    id: 'makkah',
    title: 'MAKKAH',
    country: 'SAUDI ARABIA • THE SACRED SANCTUARY',
    subtitle: 'Direct transfers from Jeddah Airport to your hotel suite with authorized Haram Gate permits.',
    image: '/images/dest_makkah.jpg',
    link: '/services',
    pickup: 'King Abdulaziz Airport (JED)',
    destination: 'Makkah Clock Royal Tower',
  },
  {
    id: 'madinah',
    title: 'MADINAH',
    country: "SAUDI ARABIA • THE PROPHET'S CITY",
    subtitle: 'Peaceful, air-conditioned intercity journeys to the marble courtyards of the Prophet’s Mosque.',
    image: '/images/dest_madinah.jpg',
    link: '/services',
    pickup: 'Makkah Clock Royal Tower',
    destination: "Madinah Prophet's Mosque Gate 1",
  },
  {
    id: 'jeddah',
    title: 'JEDDAH',
    country: 'SAUDI ARABIA • RED SEA GATEWAY',
    subtitle: 'Personal terminal arrivals meet & greet with luggage assistance and flight delay protection.',
    image: '/images/dest_jeddah.jpg',
    link: '/services',
    pickup: 'King Abdulaziz Airport (JED)',
    destination: 'Jeddah Corniche Luxury Hotel',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM PROCEDURAL SVG COMPASS
   Features: Thin-line circle, N/E/S/W tick marks, gold 4-point star needle
   which rotates and subtly tracks cursor coordinates on desktop.
───────────────────────────────────────────────────────────────────────────── */
export function CompassSVG({
  size = 64,
  needleRotation = 0,
  showTicks = true,
  className = '',
}: {
  size?: number;
  needleRotation?: number;
  showTicks?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* Outer subtle circle */}
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />

      {/* Inner dashed navigation ring */}
      <circle
        cx="50"
        cy="50"
        r="41"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 3"
        strokeOpacity="0.6"
      />

      {/* Cardinal Ticks */}
      {showTicks && (
        <>
          <line x1="50" y1="5" x2="50" y2="11" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="89" x2="50" y2="95" stroke="currentColor" strokeWidth="1.5" />
          <line x1="5" y1="50" x2="11" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <line x1="89" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="1.5" />

          {/* North gold marker dot */}
          <circle cx="50" cy="8" r="1.5" fill="#d4af37" />
        </>
      )}

      {/* Rotating 4-Point Star Needle */}
      <g
        style={{
          transform: `rotate(${needleRotation}deg)`,
          transformOrigin: '50px 50px',
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* North Diamond Point (Warm Gold) */}
        <polygon points="50,14 54.5,50 50,46 45.5,50" fill="#d4af37" />

        {/* South Diamond Point (Silver/White) */}
        <polygon points="50,86 54.5,50 50,54 45.5,50" fill="#ffffff" fillOpacity="0.85" />

        {/* East Small Point */}
        <polygon points="82,50 50,47 53,50 50,53" fill="#ffffff" fillOpacity="0.45" />

        {/* West Small Point */}
        <polygon points="18,50 50,47 47,50 50,53" fill="#ffffff" fillOpacity="0.45" />

        {/* Center Pivot Ring */}
        <circle cx="50" cy="50" r="4.5" fill="#06101e" stroke="#d4af37" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="1.5" fill="#d4af37" />
      </g>
    </svg>
  );
}

export const SACRED_DESTINATIONS = [
  { name: 'Makkah Al-Mukarramah', bearing: 214, cardinal: 'SW', label: 'Qibla Direction' },
  { name: 'Al-Madinah Al-Munawwarah', bearing: 352, cardinal: 'N', label: 'Prophet’s Sanctuary' },
  { name: 'Jeddah Corniche', bearing: 260, cardinal: 'W', label: 'Red Sea Gateway' },
];

export function getCardinalDirection(angle: number): string {
  const norm = ((angle % 360) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(norm / 45) % 8;
  return directions[index];
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CINEMATIC DESTINATIONS COMPONENT
───────────────────────────────────────────────────────────────────────────── */
interface CinematicDestinationsProps {
  onSelectDestination?: (pickup: string, destination: string) => void;
}

export default function CinematicDestinations({
  onSelectDestination,
}: CinematicDestinationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const compassContainerRef = useRef<HTMLDivElement>(null);

  // Active state for HUD & Gyro Compass
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [needleAngle, setNeedleAngle] = useState(214);
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const [sensorHeading, setSensorHeading] = useState<number | null>(null);
  const [touchPulse, setTouchPulse] = useState(false);
  const [selectedSacredIdx, setSelectedSacredIdx] = useState(0);
  const lastInteractionTimeRef = useRef<number>(0);

  const totalPanels = DESTINATIONS_DATA.length; // 3 panels + 1 outro

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // 1. Initialize Lenis for Smooth Inertial Scrolling
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let lenis: Lenis | null = null;
    if (!prefersReducedMotion) {
      try {
        lenis = new Lenis({
          lerp: isTouch ? 1 : 0.08,
          smoothWheel: true,
          syncTouch: false,
        });

        lenis.on('scroll', ScrollTrigger.update);
        const tickerCallback = (time: number) => {
          lenis?.raf(time * 1000);
        };
        gsap.ticker.add(tickerCallback);
        gsap.ticker.lagSmoothing(0);
      } catch {
        // Lenis fallback if window constraints exist
      }
    }

    // 2. Setup GSAP ScrollTrigger Pinned Wipe Animation
    const ctx = gsap.context(() => {
      if (!containerRef.current || !stageRef.current) return;

      if (prefersReducedMotion) {
        // Fallback: simple stack without pin
        return;
      }

      // Panels: Panel 0 (Makkah), Panel 1 (Madinah), Panel 2 (Jeddah), Panel 3 (Outro Compass)
      const panels = gsap.utils.toArray<HTMLElement>('.cinematic-panel');
      const images = gsap.utils.toArray<HTMLElement>('.cinematic-panel-img');
      const titles = gsap.utils.toArray<HTMLElement>('.cinematic-title-block');
      const outroPanel = document.querySelector<HTMLElement>('.cinematic-outro-panel');

      // Initial Setup:
      // Panel 0 is visible base. Subsequent panels start clipped at inset(100% 0 0 0)
      panels.forEach((panel, i) => {
        if (i === 0) {
          gsap.set(panel, { clipPath: 'inset(0% 0% 0% 0%)', zIndex: 10 });
        } else {
          gsap.set(panel, { clipPath: 'inset(100% 0% 0% 0%)', zIndex: 10 + i * 10 });
        }
      });

      if (outroPanel) {
        gsap.set(outroPanel, { clipPath: 'inset(100% 0% 0% 0%)', zIndex: 50 });
      }

      // Set initial scale and opacity on images
      images.forEach((img, i) => {
        if (i === 0) {
          gsap.set(img, { scale: 1.0, yPercent: 0 });
        } else {
          gsap.set(img, { scale: 1.15, yPercent: 0 });
        }
      });

      // Set initial titles
      titles.forEach((t, i) => {
        if (i === 0) {
          gsap.set(t, { yPercent: 0, opacity: 1 });
        } else {
          gsap.set(t, { yPercent: 60, opacity: 0 });
        }
      });

      // Create Scrubbed Timeline:
      // Total scroll distance = 100vh per transition + outro
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${totalPanels * 100}%`,
          pin: stageRef.current,
          scrub: 1.0, // Smooth lag
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            setScrollProgress(p);
            if (p > 0.02) setHasScrolled(true);

            // Determine active panel index (0, 1, 2, or 3 for outro)
            const panelStep = 1 / (totalPanels + 0.5);
            const activeIdx = Math.min(Math.floor(p / panelStep), totalPanels - 1);
            setActivePanelIndex(activeIdx);
          },
        },
      });

      // Easing: cubic-bezier(0.76, 0, 0.24, 1) or power2.inOut
      const easeCurve = 'power2.inOut';

      // ── WIPE 1: Makkah -> Madinah ──
      tl.to(
        titles[0],
        { yPercent: -40, opacity: 0, duration: 0.5, ease: 'power2.in' },
        0.15
      );
      tl.to(
        images[0],
        { yPercent: -12, scale: 1.08, duration: 1.0, ease: easeCurve },
        0.2
      );
      tl.to(
        panels[1],
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: easeCurve },
        0.2
      );
      tl.to(
        images[1],
        { scale: 1.0, duration: 1.0, ease: easeCurve },
        0.2
      );
      tl.to(
        titles[1],
        { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
        0.45
      );

      // ── WIPE 2: Madinah -> Jeddah ──
      tl.to(
        titles[1],
        { yPercent: -40, opacity: 0, duration: 0.5, ease: 'power2.in' },
        1.15
      );
      tl.to(
        images[1],
        { yPercent: -12, scale: 1.08, duration: 1.0, ease: easeCurve },
        1.2
      );
      tl.to(
        panels[2],
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: easeCurve },
        1.2
      );
      tl.to(
        images[2],
        { scale: 1.0, duration: 1.0, ease: easeCurve },
        1.2
      );
      tl.to(
        titles[2],
        { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
        1.45
      );

      // ── OUTRO WIPE: Jeddah -> Dark Navy Compass Screen ──
      if (outroPanel) {
        tl.to(
          titles[2],
          { yPercent: -40, opacity: 0, duration: 0.5, ease: 'power2.in' },
          2.15
        );
        tl.to(
          images[2],
          { yPercent: -12, scale: 1.08, duration: 1.0, ease: easeCurve },
          2.2
        );
        tl.to(
          outroPanel,
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: easeCurve },
          2.2
        );
        tl.fromTo(
          '.outro-content',
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
          2.5
        );
      }
    }, containerRef);

    return () => {
      ctx.revert();
      if (lenis) {
        lenis.destroy();
      }
    };
  }, [totalPanels]);

  // Gyroscope, Device Orientation & Continuous Magnetic Needle Drift
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && typeof e.alpha === 'number') {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        lastInteractionTimeRef.current = Date.now();
        setSensorHeading(Math.round(heading));
        setNeedleAngle(Math.round(heading));
      }

      if (e.gamma !== null && e.beta !== null) {
        const tiltX = Math.max(-14, Math.min(14, e.gamma * 0.45));
        const tiltY = Math.max(-10, Math.min(10, (e.beta - 45) * 0.35));
        setMouseParallax({ x: tiltX, y: tiltY });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });

    // Subtle magnetic needle breathing loop when idle
    const loop = (time: number) => {
      // If no recent direct interaction within 1.4 seconds, smoothly oscillate towards current destination bearing
      if (Date.now() - lastInteractionTimeRef.current > 1400) {
        const baseBearing = SACRED_DESTINATIONS[activePanelIndex]?.bearing ?? 214;
        const drift = Math.sin(time * 0.0022) * 3.5;
        setNeedleAngle((prev) => {
          const target = baseBearing + drift;
          const diff = ((target - prev + 540) % 360) - 180;
          return prev + diff * 0.06;
        });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(rafId);
    };
  }, [activePanelIndex]);

  // Unified coordinate tracking for mouse and mobile touch
  const updateAngleFromCoords = (clientX: number, clientY: number) => {
    if (typeof window === 'undefined') return;
    lastInteractionTimeRef.current = Date.now();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Fluid parallax translation for backdrops (both mobile and desktop)
    const normX = (clientX - centerX) / (centerX || 1);
    const normY = (clientY - centerY) / (centerY || 1);
    setMouseParallax({ x: normX * -14, y: normY * -10 });

    // Compass needle angle calculation (points subtly towards touch/cursor)
    if (compassContainerRef.current) {
      const rect = compassContainerRef.current.getBoundingClientRect();
      const compassX = rect.left + rect.width / 2;
      const compassY = rect.top + rect.height / 2;
      const rad = Math.atan2(clientY - compassY, clientX - compassX);
      const deg = (rad * 180) / Math.PI + 90;
      setNeedleAngle(deg);
    } else {
      // Relative to screen center (where mini explore compass sits)
      const rad = Math.atan2(clientY - centerY, clientX - centerX);
      const deg = (rad * 180) / Math.PI + 90;
      setNeedleAngle(deg);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateAngleFromCoords(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches.length > 0) {
      updateAngleFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleCompassTap = () => {
    // Tap to cycle sacred bearings or calibrate
    setTouchPulse(true);
    setTimeout(() => setTouchPulse(false), 500);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch { }
    }

    setSelectedSacredIdx((prev) => {
      const next = (prev + 1) % SACRED_DESTINATIONS.length;
      lastInteractionTimeRef.current = Date.now() + 2000;
      setNeedleAngle(SACRED_DESTINATIONS[next].bearing);
      return next;
    });
  };

  const currentDestination = DESTINATIONS_DATA[activePanelIndex] || DESTINATIONS_DATA[0];

  const handleExploreClick = () => {
    if (onSelectDestination && currentDestination.pickup && currentDestination.destination) {
      onSelectDestination(currentDestination.pickup, currentDestination.destination);
    } else {
      const el = document.getElementById('booking-form');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="destinations"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
      className="relative bg-[#06101e] text-white selection:bg-[#d4af37] selection:text-[#06101e] w-full touch-pan-y"
      style={{
        // Total height provides enough scrub distance for smooth yacht-brand wiped transitions
        minHeight: `${(totalPanels + 1) * 100}vh`,
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          STICKY / PINNED VIEWPORT STAGE (100VH)
      ───────────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between"
      >
        {/* ── PANELS STACK ── */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {DESTINATIONS_DATA.map((panel, idx) => (
            <div
              key={panel.id}
              className={`cinematic-panel absolute inset-0 w-full h-full will-change-[clip-path]`}
              style={{
                zIndex: 10 + idx * 10,
              }}
            >
              {/* Full-bleed background image with scale & parallax */}
              <div
                className="cinematic-panel-img absolute inset-0 w-full h-full will-change-transform"
                style={{
                  transform: `translate3d(${mouseParallax.x}px, ${mouseParallax.y}px, 0)`,
                  transition: 'transform 0.4s ease-out',
                }}
              >
                <img
                  src={panel.image}
                  alt={panel.title}
                  loading={idx < 2 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Editorial Gradient Scrims: Dark gradient overlay at bottom so text stays readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06101e]/90 via-[#06101e]/40 to-black/25 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06101e]/80 via-transparent to-transparent pointer-events-none" />
            </div>
          ))}

          {/* ────────────────── OUTRO PANEL: DARK NAVY WITH PROCEDURAL COMPASS ────────────────── */}
          <div
            className="cinematic-outro-panel absolute inset-0 w-full h-full bg-[#06101e] flex flex-col items-center justify-center p-6 text-center will-change-[clip-path]"
            style={{ zIndex: 50 }}
          >
            {/* Subtle atmospheric glow behind compass */}
            <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#0b4736]/30 via-[#b8922a]/15 to-transparent blur-3xl pointer-events-none" />

            <div className="outro-content relative z-10 flex flex-col items-center max-w-lg space-y-4 sm:space-y-5">
              {/* Procedural SVG Compass: Rotates and reacts to touch/mouse/sensor */}
              <div
                ref={compassContainerRef}
                onClick={handleCompassTap}
                onTouchStart={handleCompassTap}
                className={`relative p-6 sm:p-7 rounded-full bg-white/5 border border-white/15 backdrop-blur-md shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${touchPulse ? 'ring-4 ring-[#d4af37]/60 shadow-[0_0_40px_rgba(212,175,55,0.4)]' : ''
                  }`}
                title="Tap to align compass"
              >
                <CompassSVG size={114} needleRotation={needleAngle} showTicks={true} />
              </div>

              {/* Compass Live Bearing HUD Readout */}
              <div className="flex flex-col items-center gap-1.5 pt-0.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#d4af37]/40 text-[10px] sm:text-xs font-mono tracking-widest text-[#d4af37] backdrop-blur-md shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                  <span>
                    {Math.round(((needleAngle % 360) + 360) % 360)}° {getCardinalDirection(needleAngle)} &bull; {SACRED_DESTINATIONS[selectedSacredIdx].name.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Outro Typography */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-[0.28em] text-[#d4af37] uppercase font-bold">
                  EXPEDITION &bull; CONCIERGE
                </span>
                <h3 className="font-serif text-3xl sm:text-5xl text-white font-normal tracking-tight">
                  Where to next?
                </h3>

              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('booking-form');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] px-7 py-3.5 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center gap-2.5 cursor-pointer group active:scale-95"
                >
                  <span>Plan Your Sacred Journey</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── TOP SECTION HEADER (MINIMAL & LUXURIOUS) ── */}
        <div className="relative z-40 w-full px-5 sm:px-10 lg:px-14 pt-6 sm:pt-8 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.25em] uppercase text-[#d4af37]">
              AL HARMAIN
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[10px] sm:text-xs font-sans tracking-[0.2em] uppercase text-white/70">
              SACRED DESTINATIONS
            </span>
          </div>

          <Link
            href="/services"
            className="pointer-events-auto text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-white/80 hover:text-white transition-colors inline-flex items-center gap-1.5 group bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 active:scale-95"
          >
            <span>All Packages</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* ── CENTER EXPLORE CIRCULAR BUTTON (64PX GLASS BLUR WITH MINI COMPASS) ── */}
        {scrollProgress < 0.78 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto transition-opacity duration-300">
            <button
              type="button"
              onClick={handleExploreClick}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex flex-col items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:border-white shadow-2xl cursor-pointer group focus:outline-none"
              aria-label={`Explore ${currentDestination.title}`}
            >
              {/* Mini Procedural Compass */}
              <CompassSVG
                size={24}
                needleRotation={needleAngle}
                showTicks={false}
                className="text-white group-hover:text-[#d4af37] transition-colors"
              />
              <span className="text-[9px] sm:text-[10px] font-sans font-bold tracking-[0.16em] uppercase mt-1">
                Explore
              </span>
            </button>
          </div>
        )}

        {/* ── BOTTOM ROW: LARGE EDITORIAL TITLE + COUNTER + SCROLL HINT ── */}
        <div className="relative z-40 w-full px-5 sm:px-10 lg:px-14 pb-8 sm:pb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pointer-events-none">
          {/* Bottom-Left: Large Destination Title (clamp(3rem, 9vw, 9rem)) with Line-Mask Reveal */}
          <div className="max-w-2xl overflow-hidden pointer-events-auto">
            {DESTINATIONS_DATA.map((dest, idx) => {
              const isActive = activePanelIndex === idx && scrollProgress < 0.8;
              return (
                <div
                  key={`title-${dest.id}`}
                  className={`cinematic-title-block will-change-transform ${isActive ? 'block' : 'hidden'
                    }`}
                >
                  {/* Small Subtitle (Country / Tagline) */}
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.24em] uppercase text-[#d4af37]">
                      {dest.country}
                    </span>
                  </div>

                  {/* Giant Editorial Serif Title */}
                  <h2
                    className="font-serif uppercase tracking-tight text-white leading-[0.92] font-normal"
                    style={{
                      fontSize: 'clamp(2.75rem, 8.5vw, 8.5rem)',
                      textShadow: '0 2px 20px rgba(0,0,0,0.6)',
                    }}
                  >
                    {dest.title}
                  </h2>

                  {/* Subtitle / Caption */}
                  <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed mt-2 sm:mt-3 max-w-md">
                    {dest.subtitle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom-Center: Tiny "Scroll" Hint (Fades out after initial scroll, visible on mobile) */}
          <div
            className={`flex flex-col items-center gap-1.5 text-white/70 transition-opacity duration-500 absolute left-1/2 -translate-x-1/2 bottom-5 sm:bottom-8 ${hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
          >
            <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase">
              SWIPE / SCROLL
            </span>
            <div className="w-[1px] h-5 sm:h-6 bg-gradient-to-b from-[#d4af37] via-white to-transparent animate-pulse" />
          </div>

          {/* Bottom-Right: Panel Counter ("01 / 03") */}
          <div className="pointer-events-auto flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 self-start sm:self-auto">
            <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-widest">
              0{activePanelIndex + 1}
            </span>
            <span className="text-white/30 text-xs">/</span>
            <span className="font-mono text-xs text-[#d4af37] font-semibold">
              0{totalPanels}
            </span>
          </div>
        </div>

        {/* ── THIN PROGRESS LINE AT THE BOTTOM EDGE ── */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/15 overflow-hidden z-50">
          <div
            style={{
              width: `${Math.min(Math.round(scrollProgress * 100), 100)}%`,
            }}
            className="h-full bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-white transition-all duration-75"
          />
        </div>
      </div>
    </section>
  );
}
