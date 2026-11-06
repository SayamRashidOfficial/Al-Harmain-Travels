'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Award, Headphones } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { SITE_CONFIG } from '@/config/siteConfig';

interface AuthShellProps {
  badge?: string;
  title: string | React.ReactNode;
  subtitle: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  showTrustBadges?: boolean;
}

export default function AuthShell({
  badge,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-[480px]',
  showTrustBadges = true,
}: AuthShellProps) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-page text-primary flex items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* ─────────────────────────────────────────────────
          BACKGROUND TEXTURES & DYNAMIC AMBIENT AURA
      ───────────────────────────────────────────────── */}
      {/* Subtle Islamic Geometric Lattice Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.045] mix-blend-luminosity bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%2310b981' stroke-width='1'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3Cpath d='M30 10l20 20-20 20-20-20z'/%3E%3Cpath d='M30 20l10 10-10 10-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Emerald Ambient Floating Aura (Top Left / Center) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[580px] h-[580px] bg-gradient-to-br from-emerald-600/18 via-emerald-800/12 to-teal-950/0 rounded-full blur-3xl pointer-events-none animate-float-slow" />

      {/* Warm Royal Gold Ambient Pulsing Aura (Bottom Right) */}
      <div className="absolute bottom-10 right-1/4 w-[440px] h-[440px] bg-gradient-to-tr from-amber-500/12 via-amber-600/8 to-transparent rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

      {/* Subtle Radial Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-page/75 pointer-events-none" />

      {/* ─────────────────────────────────────────────────
          SHELL CONTAINER
      ───────────────────────────────────────────────── */}
      <div className={`w-full ${maxWidth} relative z-10 space-y-5 animate-fade-up`}>
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {/* Logo & Wordmark */}
          <div className="flex justify-center">
            <BrandLogo size="lg" href="/" subtitle="Makkah · Madinah · Jeddah" />
          </div>

          {/* Page Heading & Contextual Subtitle */}
          <div className="space-y-1">
            {typeof title === 'string' ? (
              <h1 className="type-page-title text-2xl sm:text-3xl font-display font-semibold text-primary">
                {title}
              </h1>
            ) : (
              title
            )}
            {typeof subtitle === 'string' ? (
              <p className="type-muted text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                {subtitle}
              </p>
            ) : (
              subtitle
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            CARD CONTAINER
        ───────────────────────────────────────────────── */}
        <div className="relative group">
          {/* Animated Card Border Highlight Shimmer */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-emerald-500/40 via-amber-500/20 to-emerald-500/30 opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-[0.5px]" />

          <div className="relative surface-card overflow-hidden backdrop-blur-xl bg-card/95 border border-base/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] transition-all duration-300">
            {/* Top shimmering animated gradient edge */}
            <div className="relative h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep pointer-events-none" />
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {children}
            </div>

            {/* Optional Card Bottom Bar */}
            {footer && (
              <div className="border-t border-base/70 px-6 sm:px-8 py-4 bg-surface/50 text-center text-xs text-muted">
                {footer}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            TRUST REASSURANCE ROW
        ───────────────────────────────────────────────── */}
        {showTrustBadges && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-muted">
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface/50 border border-base/60 text-center">
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-medium truncate">Encrypted Auth</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface/50 border border-base/60 text-center">
              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-medium truncate">{SITE_CONFIG.regulatory.badge}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface/50 border border-base/60 text-center">
              <Headphones className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-medium truncate">24/7 Dispatch</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
