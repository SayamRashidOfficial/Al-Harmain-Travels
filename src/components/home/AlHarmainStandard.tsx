'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Award, Plane, ShieldCheck, Headphones } from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import { BrandEmblem } from '@/components/ui/BrandLogo';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
  isVisible: boolean;
  prefersReducedMotion: boolean;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
  isVisible,
  prefersReducedMotion,
}: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    xPercent: 50,
    yPercent: 50,
    isHovered: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth subtle 3D tilt calculation
    const rotateX = ((y - centerY) / centerY) * -7;
    const rotateY = ((x - centerX) / centerX) * 7;

    setTilt({
      rotateX,
      rotateY,
      xPercent: (x / rect.width) * 100,
      yPercent: (y / rect.height) * 100,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      xPercent: 50,
      yPercent: 50,
      isHovered: false,
    });
  };

  const delayMs = index * 120;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
        transitionDelay: prefersReducedMotion ? '0ms' : `${delayMs}ms`,
        transitionDuration: prefersReducedMotion ? '0ms' : '800ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        opacity: isVisible || prefersReducedMotion ? 1 : 0,
        transform: prefersReducedMotion
          ? 'none'
          : isVisible
            ? 'translateY(0px)'
            : 'translateY(36px)',
        filter: prefersReducedMotion
          ? 'none'
          : isVisible
            ? 'blur(0px)'
            : 'blur(10px)',
      }}
      className="relative will-change-transform"
    >
      {/* 3D Tilted Card Body */}
      <div
        style={{
          transform:
            !prefersReducedMotion && tilt.isHovered
              ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.02, 1.02, 1)`
              : 'none',
          transition: tilt.isHovered ? 'transform 0.12s ease-out' : 'transform 0.5s ease-out',
        }}
        className="group relative h-full rounded-2xl bg-white/85 backdrop-blur-xl p-6 sm:p-7 border border-[#e8dfcb]/80 hover:border-[#d4af37]/60 shadow-[0_4px_24px_-4px_rgba(11,71,54,0.06),0_12px_36px_-8px_rgba(212,175,55,0.08)] hover:shadow-[0_16px_48px_-10px_rgba(11,71,54,0.12),0_24px_56px_-12px_rgba(212,175,55,0.2)] transition-shadow duration-500 overflow-hidden flex flex-col justify-between"
      >
        {/* Soft Inner Glow Layer */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_1px_2px_rgba(212,175,55,0.2),inset_0_0_16px_rgba(255,255,255,0.9)]" />

        {/* Dynamic Specular Light Sweep Following Cursor */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered && !prefersReducedMotion ? 1 : 0,
            background: `radial-gradient(circle 220px at ${tilt.xPercent}% ${tilt.yPercent}%, rgba(212,175,55,0.18), transparent 75%)`,
          }}
        />

        {/* Card Content */}
        <div className="relative z-10 space-y-4">
          {/* Floating Icon Tile with Rotating Geometric Ring */}
          <div className="relative w-14 h-14">
            {/* Faint Rotating Geometric Ring */}
            <div className="absolute -inset-1.5 rounded-2xl pointer-events-none">
              <svg
                className="w-full h-full animate-spin-slow text-[#d4af37]/35"
                viewBox="0 0 68 68"
                fill="none"
              >
                <circle
                  cx="34"
                  cy="34"
                  r="31"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx="34"
                  cy="34"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="0.75"
                  strokeDasharray="2 3"
                  opacity="0.5"
                />
              </svg>
            </div>

            {/* Emerald-to-Dark-Green Gradient Icon Tile with Soft Float */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0e4d3a] via-[#083024] to-[#041a13] border border-[#d4af37]/40 shadow-md flex items-center justify-center text-[#d4af37] animate-float-slow group-hover:-translate-y-1.5 group-hover:shadow-[0_0_24px_rgba(212,175,55,0.4)] transition-all duration-300">
              <Icon className="w-6 h-6 text-[#f3df93] group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg sm:text-xl font-normal text-[#08281e] tracking-tight group-hover:text-[#0b4736] transition-colors">
              {title}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#1e3328] leading-relaxed font-sans font-medium">
              {description}
            </p>
          </div>
        </div>

        {/* Subtle Bottom Gold Accent Indicator that expands on hover */}
        <div className="relative z-10 pt-4 mt-2">
          <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />
        </div>
      </div>
    </div>
  );
}

export default function AlHarmainStandard() {
  const containerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Award,
      title: 'Fixed Transparent Rates',
      description:
        'Guaranteed upfront pricing without peak hour surges, hidden parking fees, or fuel surcharges.',
    },
    {
      icon: Plane,
      title: 'Flight Delay Shield',
      description:
        'Real-time flight arrival monitoring so your chauffeur is at the terminal exactly when you land.',
    },
    {
      icon: ShieldCheck,
      title: 'Haram Gate Permits',
      description:
        'Authorized access permits for hotel drop-offs and luggage drop directly at the Haram perimeter.',
    },
    {
      icon: Headphones,
      title: 'Multilingual Concierge',
      description:
        '24/7 dedicated support desk via WhatsApp and phone in Arabic, English, and Urdu.',
    },
  ];

  return (
    <section
      ref={containerRef}
      id="al-harmain-standard"
      aria-label="The Al Harmain Standard"
      className="relative overflow-hidden max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20 lg:mb-24 rounded-3xl"
    >
      {/* ── Cinematic Reusable Texture (Light Mode Preset) ── */}
      <CinematicTexture variant="light" />

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(250,248,244,0.75)_100%)] pointer-events-none" />

      {/* Ambient Drifting Gold Light Rays (CSS GPU Only) */}
      <div
        className="absolute -top-24 left-1/4 w-96 h-96 bg-gradient-to-br from-[#b8922a]/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute -bottom-24 right-1/4 w-96 h-96 bg-gradient-to-tl from-[#0b4736]/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '10s' }}
      />

      <div className="relative z-10 py-10 sm:py-14">
        {/* ── Section Header with Brand Logo, Letter-Spacing Animation & Shimmer Sweep ── */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3 px-2">
          {/* Centered Brand Emblem */}
          <div className="flex justify-center mb-1">
            <BrandEmblem size="sm" />
          </div>

          {/* Eyebrow Label with Animated Letter-Spacing */}
          <div
            style={{
              letterSpacing: isVisible || prefersReducedMotion ? '0.26em' : '0.12em',
              transition: prefersReducedMotion
                ? 'none'
                : 'letter-spacing 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
            }}
            className={`inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono font-bold uppercase text-[#b8922a] ${isVisible || prefersReducedMotion ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8922a] animate-pulse" />
            <span>THE AL HARMAIN STANDARD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8922a] animate-pulse" />
          </div>

          {/* Heading with Gold Shimmer Sweep on Reveal */}
          <div className="overflow-hidden">
            <h2
              style={{
                transition: prefersReducedMotion
                  ? 'none'
                  : 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
                opacity: isVisible || prefersReducedMotion ? 1 : 0,
                transform: prefersReducedMotion
                  ? 'none'
                  : isVisible
                    ? 'translateY(0)'
                    : 'translateY(24px)',
              }}
              className="font-serif text-2xl xs:text-3xl sm:text-4xl lg:text-5xl text-[#08281e] font-normal tracking-tight relative inline-block"
            >
              <span>Designed for Dignity &amp; Peace of Mind</span>

              {/* Shimmer sweep effect */}
              {isVisible && !prefersReducedMotion && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent bg-clip-text text-transparent pointer-events-none animate-shimmer-sweep"
                >
                  Designed for Dignity &amp; Peace of Mind
                </span>
              )}
            </h2>
          </div>

          {/* Supporting Paragraph */}
          <p
            style={{
              transition: prefersReducedMotion
                ? 'none'
                : 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
              opacity: isVisible || prefersReducedMotion ? 1 : 0,
              transform: prefersReducedMotion
                ? 'none'
                : isVisible
                  ? 'translateY(0)'
                  : 'translateY(16px)',
            }}
            className="text-xs sm:text-sm md:text-base text-[#55635c] leading-relaxed font-sans font-normal max-w-xl mx-auto"
          >
          </p>
        </div>

        {/* ── 4 Feature Glassmorphism Cards: Responsive Grid (1 col on mobile, 2x2 tablet, 4 desktop) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((feature, idx) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={idx}
              isVisible={isVisible}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
