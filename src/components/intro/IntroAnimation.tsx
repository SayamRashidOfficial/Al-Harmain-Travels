'use client';

import React, { useState, useEffect, useRef } from 'react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import './intro.css';

interface WordDef {
  text: string;
  chars: string[];
  isGold?: boolean;
}

const WORDS: WordDef[] = [
  { text: 'Al', chars: ['A', 'l'] },
  { text: 'Harmain', chars: ['H', 'a', 'r', 'm', 'a', 'i', 'n'], isGold: true },
  { text: 'Travels', chars: ['T', 'r', 'a', 'v', 'e', 'l', 's'] },
];

export default function IntroAnimation() {
  const [isMounted, setIsMounted] = useState<boolean>(true);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(14);
  const [statusText, setStatusText] = useState<string>('Initializing luxury sanctuary fleet...');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Accessibility: reduced motion check
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) {
      const quickTimer = setTimeout(() => {
        setIsMounted(false);
      }, 500);
      return () => clearTimeout(quickTimer);
    }

    // 2. Lock scrolling during intro loader
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const restoreScroll = () => {
      document.body.style.overflow = originalBodyOverflow || '';
      document.documentElement.style.overflow = originalDocOverflow || '';
    };

    // 3. Track real page load completion
    let currentProgress = 14;
    const startTime = Date.now();
    const MIN_CINEMATIC_DURATION_MS = 2200; // Graceful minimum time so animations feel majestic
    let isPageFullyLoaded = false;
    let exitTriggered = false;

    // Smooth incremental progress while waiting for assets
    const progressInterval = setInterval(() => {
      if (currentProgress < 88 && !isPageFullyLoaded) {
        currentProgress += Math.floor(Math.random() * 7) + 3;
        if (currentProgress > 88) currentProgress = 88;
        setProgress(currentProgress);

        if (currentProgress < 40) {
          setStatusText('Initializing luxury sanctuary fleet...');
        } else if (currentProgress < 70) {
          setStatusText('Synchronizing real-time transfer routes...');
        } else {
          setStatusText('Preparing VIP concierge itinerary...');
        }
      }
    }, 140);

    // Finalize when page and assets are fully loaded
    const triggerCompletion = () => {
      if (exitTriggered) return;
      exitTriggered = true;
      isPageFullyLoaded = true;
      clearInterval(progressInterval);

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_CINEMATIC_DURATION_MS - elapsed);

      setTimeout(() => {
        setProgress(100);
        setStatusText('Welcome to Al Harmain Travels');

        // Allow 100% state to linger for 400ms before smooth curtain lift
        setTimeout(() => {
          setIsDismissing(true);
          restoreScroll();

          // Wait for curtain reveal animation (0.9s) then unmount cleanly
          setTimeout(() => {
            setIsMounted(false);
          }, 920);
        }, 400);
      }, remainingTime);
    };

    // Check if document is already complete
    if (document.readyState === 'complete') {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(triggerCompletion).catch(triggerCompletion);
      } else {
        triggerCompletion();
      }
    } else {
      const handleWindowLoad = () => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(triggerCompletion).catch(triggerCompletion);
        } else {
          triggerCompletion();
        }
      };

      window.addEventListener('load', handleWindowLoad, { once: true });

      // Safety timeout: max 6.5s to ensure user is never blocked by slow external assets
      const safetyTimeout = setTimeout(() => {
        triggerCompletion();
      }, 6500);

      return () => {
        clearInterval(progressInterval);
        window.removeEventListener('load', handleWindowLoad);
        clearTimeout(safetyTimeout);
        restoreScroll();
      };
    }

    return () => {
      clearInterval(progressInterval);
      restoreScroll();
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  // Pre-calculate cumulative character index for continuous stagger
  let runningCharIdx = 0;

  return (
    <div
      id="intro-overlay"
      ref={overlayRef}
      className={`intro-overlay ${isDismissing ? 'intro-dismissing' : ''}`}
      aria-hidden="true"
      role="presentation"
      suppressHydrationWarning
    >
      {/* ── 1. Animated Moving Kinetic Texture (Arabesque Lattice & Floating Gold Embers) ── */}
      <CinematicTexture
        variant="light"
        intensity={1.5}
        particleCount={45}
        patternType="arabesque"
        className="pointer-events-none absolute inset-0 z-0"
      />

      {/* ── 2. Ambient Radial Golden Shimmer ── */}
      <div className="intro-ambient-aura" />

      {/* ── 3. Center Cinematic Stage ── */}
      <div className="intro-stage">
        {/* Sacred Geometric Emblem Framing the Official Al Harmain Travels Logo */}
        <div className="intro-emblem-wrap">
          <svg className="intro-emblem-svg absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
            {/* Outer Rotating Dotted Halo */}
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="url(#introGoldGrad)"
              strokeWidth="1.2"
              strokeDasharray="4 5"
              opacity="0.65"
              className="intro-spin-slow"
            />

            {/* Rub el Hizb (Two Interlocking Golden Squares) */}
            <rect
              x="24"
              y="24"
              width="52"
              height="52"
              rx="2.5"
              stroke="url(#introGoldGrad)"
              strokeWidth="1.5"
              className="intro-star-1"
            />
            <rect
              x="24"
              y="24"
              width="52"
              height="52"
              rx="2.5"
              stroke="url(#introGoldGrad)"
              strokeWidth="1.5"
              transform="rotate(45 50 50)"
              className="intro-star-2"
            />

            <defs>
              <linearGradient id="introGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#b8922a" />
                <stop offset="100%" stopColor="#f5edd9" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Official Logo with Golden Halo */}
          <div className="relative z-10 w-[72%] h-[72%] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Al Harmain Travels"
              className="w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(212,175,55,0.7)] select-none"
            />
          </div>
        </div>

        {/* Brand Title: Al Harmain Travels with Kinetic Letter Stagger */}
        <h2 className="intro-title" aria-label="Al Harmain Travels">
          {WORDS.map((w, wIdx) => (
            <span key={wIdx} className={`intro-word ${w.isGold ? 'intro-word-gold' : ''}`}>
              {w.chars.map((char, cIdx) => {
                const charIndex = runningCharIdx++;
                return (
                  <span
                    key={cIdx}
                    className="intro-char"
                    style={{ '--char-idx': charIndex } as React.CSSProperties}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          ))}
        </h2>

        {/* Elegant Tagline */}
        <div className="intro-tagline">
          VIP Chauffeur &bull; Sacred Pilgrimage Sanctuaries
        </div>

        {/* Real-time Cinematic Progress Indicator */}
        <div className="intro-progress-container">
          <div className="intro-progress-bar">
            <div className="intro-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="intro-progress-meta">
            <span className="intro-status-text">{statusText}</span>
            <span className="intro-percentage-num">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
