'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Award, Headphones } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-64px)] bg-[#faf8f4] text-slate-900 flex items-center justify-center py-6 sm:py-8 lg:py-10 px-4 sm:px-6 relative overflow-hidden selection:bg-[#0c392c] selection:text-white">
      {/* ─────────────────────────────────────────────────
          BACKGROUND LATTICE
      ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-luminosity bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%230c392c' stroke-width='1'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3Cpath d='M30 10l20 20-20 20-20-20z'/%3E%3Cpath d='M30 20l10 10-10 10-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ─────────────────────────────────────────────────
          SHELL CONTAINER
      ───────────────────────────────────────────────── */}
      <div className={`w-full ${maxWidth} relative z-10 space-y-5 animate-fade-up`}>
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {/* Logo & Wordmark */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 group transition-transform active:scale-[0.98] focus-visible:outline-none"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0c392c] flex items-center justify-center text-white font-bold text-xl border border-[#0c392c]/30 shadow-md transition-all duration-300">
                <span className="font-serif tracking-tight drop-shadow">الح</span>
              </div>
              <div className="text-left">
                <div className="font-display text-2xl font-bold text-slate-900 leading-none tracking-tight transition-colors">
                  Al Harmain Travel
                </div>
                <div className="text-[10px] text-[#0c392c] tracking-label uppercase font-semibold mt-1 flex items-center gap-1.5">
                  <span>Makkah</span>
                  <span className="text-[#0c392c]/50">&bull;</span>
                  <span>Madinah</span>
                  <span className="text-[#0c392c]/50">&bull;</span>
                  <span>Jeddah</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Page Heading & Contextual Subtitle */}
          <div className="space-y-1">
            {typeof title === 'string' ? (
              <h1 className="type-page-title text-2xl sm:text-3xl font-display font-semibold text-slate-900">
                {title}
              </h1>
            ) : (
              title
            )}
            {typeof subtitle === 'string' ? (
              <p className="type-muted text-xs sm:text-sm max-w-sm mx-auto leading-relaxed text-slate-500">
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
        <div className="relative">
          <div className="relative surface-card overflow-hidden bg-white border border-[#e2ddd5] shadow-lg rounded-3xl transition-all duration-300">
            {/* Top solid accent bar in unified brand color */}
            <div className="h-1 w-full bg-[#0c392c]" />

            <div className="p-5 sm:p-7 space-y-4 sm:space-y-5">
              {children}
            </div>

            {/* Optional Card Bottom Bar */}
            {footer && (
              <div className="border-t border-[#e2ddd5] px-6 sm:px-8 py-4 bg-[#faf8f4] text-center text-xs text-slate-500">
                {footer}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            TRUST REASSURANCE ROW
        ───────────────────────────────────────────────── */}
        {showTrustBadges && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-[#e2ddd5] text-center shadow-xs">
              <Lock className="w-3.5 h-3.5 text-[#0c392c] shrink-0" />
              <span className="font-semibold truncate text-[#0c392c]">Encrypted Auth</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-[#e2ddd5] text-center shadow-xs">
              <Award className="w-3.5 h-3.5 text-[#0c392c] shrink-0" />
              <span className="font-semibold truncate text-[#0c392c]">GTA Licensed</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-[#e2ddd5] text-center shadow-xs">
              <Headphones className="w-3.5 h-3.5 text-[#0c392c] shrink-0" />
              <span className="font-semibold truncate text-[#0c392c]">24/7 Dispatch</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
