'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BrandLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the location tagline / micro-subtitle */
  showSubtitle?: boolean;
  /** Custom subtitle text (defaults to 'MAKKAH · MADINAH · JEDDAH') */
  subtitle?: string;
  /** Whether clicking the logo navigates to '/' */
  href?: string;
  /** Additional CSS classes on the outer container */
  className?: string;
  /** Compact mode: hides subtitle even on larger screens */
  compact?: boolean;
  /** Force light theme colors (no white text) */
  forceLight?: boolean;
  /** Theme variant: 'light' (default, for light backgrounds) or 'dark' (for dark surfaces like footer) */
  variant?: 'light' | 'dark';
  /** Optional click handler (e.g. to close drawers) */
  onClick?: () => void;
  /** Only show emblem/logo image without typography */
  emblemOnly?: boolean;
}

/**
 * Official Al Harmain Travels Luxury Architectural Emblem
 * Displays the official Kaaba sanctuary, golden arch, airline flight trail,
 * and luxury chauffeur fleet (GMC Yukon XL SUV, Toyota Camry Sedan, and Toyota HiAce Van)
 * with transparent alpha styling and responsive scaling.
 */
export function BrandEmblem({
  size = 'md',
  className = '',
  priority = true,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}) {
  const sizeMap: Record<string, string> = {
    xs: 'h-7 sm:h-8 w-auto',
    sm: 'h-9 sm:h-10 w-auto',
    md: 'h-10 sm:h-11 w-auto',
    lg: 'h-16 sm:h-18 w-auto',
    xl: 'h-22 sm:h-26 w-auto',
  };

  const dimensions: Record<string, { width: number; height: number }> = {
    xs: { width: 56, height: 32 },
    sm: { width: 70, height: 40 },
    md: { width: 78, height: 44 },
    lg: { width: 125, height: 72 },
    xl: { width: 182, height: 104 },
  };

  const dim = dimensions[size] || dimensions.md;
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.05] ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Al Harmain Travels"
        width={dim.width}
        height={dim.height}
        priority={priority}
        className={`${sizeClass} object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.22)] select-none pointer-events-none`}
      />
    </div>
  );
}

/**
 * Unified Official Brand Logo for Al Harmain Travels.
 * Features the official emblem, luxury display typography, and clear location subtitle.
 */
export default function BrandLogo({
  size = 'md',
  showSubtitle = true,
  subtitle = 'Makkah · Madinah · Jeddah',
  href = '/',
  className = '',
  compact = false,
  forceLight = true,
  variant = 'light',
  onClick,
  emblemOnly = false,
}: BrandLogoProps) {
  const isDark = variant === 'dark' || forceLight === false;

  const brandTextColor = isDark
    ? 'text-white group-hover:text-[#dfc15a]'
    : 'text-slate-900 group-hover:text-emerald-700';

  const travelsTextColor = isDark
    ? 'text-[#dfc15a] group-hover:text-[#f3e5ab]'
    : 'text-[#a07c1e]';

  const subtitleTextColor = isDark
    ? 'text-emerald-300/85'
    : 'text-emerald-700';

  const titleSizeMap: Record<string, string> = {
    xs: 'text-sm sm:text-base',
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-[1.3rem]',
    lg: 'text-2xl sm:text-[1.85rem]',
    xl: 'text-3xl sm:text-4xl',
  };

  const subtitleSizeMap: Record<string, string> = {
    xs: 'text-[7.5px] sm:text-[8px]',
    sm: 'text-[8.5px] sm:text-[9px]',
    md: 'text-[9px] sm:text-[10px]',
    lg: 'text-[11px] sm:text-[12px]',
    xl: 'text-[12.5px] sm:text-[14px]',
  };

  if (emblemOnly) {
    if (href) {
      return (
        <Link
          href={href}
          onClick={onClick}
          className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
          title="Al Harmain Travels"
        >
          <BrandEmblem size={size} className={className} />
        </Link>
      );
    }
    return <BrandEmblem size={size} className={className} />;
  }

  const content = (
    <div className={`flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none ${className}`}>
      <BrandEmblem size={size} />
      <div className="flex flex-col min-w-0 leading-none">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-display ${titleSizeMap[size] || titleSizeMap.md} font-semibold tracking-heading ${brandTextColor} transition-colors`}
          >
            Al Harmain
          </span>
          <span
            className={`font-display ${titleSizeMap[size] || titleSizeMap.md} font-medium italic tracking-heading ${travelsTextColor} transition-colors`}
          >
            Travels
          </span>
        </div>

        {showSubtitle && !compact && (
          <p
            className={`${subtitleSizeMap[size] || subtitleSizeMap.md} uppercase tracking-[0.2em] font-semibold ${subtitleTextColor} mt-1 truncate transition-opacity hidden xs:block`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
        title="Al Harmain Travels — Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}

