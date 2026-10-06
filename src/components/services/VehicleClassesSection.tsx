'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users,
  Luggage,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Check,
  Crown,
} from 'lucide-react';

interface VehicleClass {
  id: string;
  category: string;
  name: string;
  description: string;
  passengers: string;
  luggage: string;
  suitability: string;
  image: string;
  badge?: string;
  isVip?: boolean;
  amenities: string[];
}

const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'executive_sedan',
    category: 'Executive Sedan',
    name: 'Toyota Camry / Lexus ES',
    description: 'Up to 3 passengers with 2 large luggage bags. Ideal for solo or couple pilgrims seeking quiet comfort.',
    passengers: 'Up to 3 passengers',
    luggage: '2 large luggage bags',
    suitability: 'Ideal for solo or couple pilgrims',
    image: '/images/fleet_sedan.jpg',
    badge: 'Popular Choice',
    amenities: ['Direct Northern Courtyard Clearance', 'Chilled Mineral Water', 'Live Flight Tracking'],
  },
  {
    id: 'premium_van',
    category: 'PREMIUM FAMILY VAN',
    name: 'Hyundai Staria',
    description: 'Up to 7 passengers with ample luggage space. Spacious and comfortable for group pilgrims.',
    passengers: 'Up to 7 passengers',
    luggage: '5 large suitcases',
    suitability: 'Spacious and comfortable for group pilgrims',
    image: '/images/fleet_staria.jpg',
    badge: 'Family Favorite',
    amenities: ['Tri-Zone Climate Control', 'Expansive Luggage Space', 'Sanctuary Door-to-Door Access'],
  },
  {
    id: 'vip_luxury',
    category: 'VIP Ultra Luxury',
    name: 'GMC Yukon XL Denali',
    passengers: 'Up to 7 passengers',
    luggage: 'Expansive trunk',
    suitability: 'VIP & executive delegations',
    image: '/images/fleet_yukon.jpg',
    badge: 'Sovereign Flagship',
    isVip: true,
    amenities: ['VIP Terminal Meet & Greet', 'Executive Leather Reclining', 'Dedicated Senior Chauffeur Protocol'],
  },
  {
    id: 'family_van',
    category: 'Family Caravan Van',
    name: 'Toyota HiAce Royal Lounge',
    // description: 'Up to 11 passengers with dedicated rear luggage compartment for large families & Umrah groups.',
    passengers: 'Up to 11 passengers',
    luggage: 'Dedicated rear luggage compartment',
    suitability: 'Large families & Umrah groups',
    image: '/images/fleet_van.jpg',
    badge: 'Group Umrah',
    amenities: ['High-Roof Reclining Seats', 'Rear Luggage Compartment', 'Multi-City Ziyarat Ready'],
  },
];

// Replicate 3 times to ensure track width (12 cards = ~4968px) exceeds even 4K ultra-wide monitors
const MARQUEE_ITEMS = [...VEHICLE_CLASSES, ...VEHICLE_CLASSES, ...VEHICLE_CLASSES];

/* ── Individual 3D Interactive Tilt Card Component with Uniform Heights ── */
function VehicleCard({
  item,
  index,
  priorityImage = false,
}: {
  item: VehicleClass;
  index: number;
  priorityImage?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtly rotate on X and Y (max 7 degrees for clean Apple-level elegance)
    const rotX = -((y - centerY) / centerY) * 7;
    const rotY = ((x - centerX) / centerX) * 7;

    setRotateX(rotX);
    setRotateY(rotY);
    setSpotlightPos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="group/card relative w-[82vw] max-w-[340px] sm:w-[360px] md:w-[390px] h-[580px] sm:h-[610px] select-none transition-transform duration-300 ease-out flex flex-col"
      style={{
        perspective: '1000px',
      }}
    >
      <div
        className={`relative h-full w-full rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${item.isVip
          ? 'bg-gradient-to-b from-[#09291e] via-[#051c14] to-[#03150e] border-[#d4af37]/50 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(212,175,55,0.18)]'
          : 'bg-gradient-to-b from-[#07241a] via-[#041a13] to-[#02120d] border-[#d4af37]/25 hover:border-[#d4af37]/60 shadow-[0_14px_35px_rgba(0,0,0,0.45)]'
          }`}
        style={{
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
            : 'rotateX(0deg) rotateY(0deg) translateY(0px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Dynamic Specular Mouse Spotlight that follows pointer */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(450px circle at ${spotlightPos.x}% ${spotlightPos.y}%, ${item.isVip ? 'rgba(240, 212, 132, 0.22)' : 'rgba(212, 175, 55, 0.15)'
              }, transparent 65%)`,
          }}
          aria-hidden="true"
        />

        {/* ── Top Image Container (Fixed uniform height across all cards) ── */}
        <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-[#03130d] shrink-0">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 82vw, 390px"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover/card:scale-108"
            priority={priorityImage}
          />

          {/* Luxury Gradient Vignette for Image Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#041a13] via-transparent to-black/35 pointer-events-none" />

          {/* Top Class Tag & Pill */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${item.isVip
                ? 'bg-[#d4af37]/20 text-[#f7e8ba] border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                : 'bg-black/50 text-[#e4ede7] border-white/20'
                }`}
            >
              {item.isVip && <Crown className="w-3.5 h-3.5 text-[#f0d484]" />}
              <span>{item.badge}</span>
            </span>

            <span className="text-[11px] font-mono tracking-wider text-white/70 uppercase bg-black/40 px-2.5 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
              Fleet 0{index + 1}
            </span>
          </div>

          {/* Capacity Quick-Pills Floating on Image Bottom */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#02120d]/80 backdrop-blur-md border border-[#d4af37]/30 text-[#fdfbf7] text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{item.passengers.replace('Up to ', '')}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#02120d]/80 backdrop-blur-md border border-[#d4af37]/30 text-[#fdfbf7] text-xs font-medium">
              <Luggage className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="truncate max-w-[140px]">{item.luggage}</span>
            </div>
          </div>
        </div>

        {/* ── Content Body (Strict vertical alignment so all cards match) ── */}
        <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4 relative z-20">
          <div className="space-y-2">
            {/* Category Eyebrow */}
            <span
              className={`text-xs font-mono uppercase tracking-[0.18em] font-semibold block ${item.isVip ? 'text-[#f0d484]' : 'text-[#d4af37]'
                }`}
            >
              {item.category}
            </span>

            {/* Vehicle Model Title (Equalized height) */}
            <h3 className="font-display text-2xl text-[#fdfbf7] font-normal tracking-tight group-hover/card:text-[#f0d484] transition-colors duration-300 min-h-[32px] sm:min-h-[58px] flex items-center">
              {item.name}
            </h3>

            {/* Description (Equalized height) */}
            <p className="text-sm text-[#cbdad1] leading-relaxed font-normal min-h-[44px] sm:min-h-[48px]">
              {item.description}
            </p>
          </div>

          {/* Amenities & Sovereign Protocol List */}
          <div className="space-y-2 pt-3 border-t border-[#d4af37]/15">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#8ea499] block">
              Standard Inclusions
            </span>
            <div className="space-y-1.5">
              {item.amenities.map((amenity, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#d1e0d7]">
                  <Check className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: Signature Gold Pill Button */}
          <div className="pt-2">
            <Link
              href={`/customer?fleet=${item.id}`}
              className="w-full bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] py-3.5 px-5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center justify-center gap-2.5 cursor-pointer group/btn active:scale-95"
            >
              <span>
                {item.isVip
                  ? 'Reserve VIP Denali'
                  : item.id === 'premium_van'
                    ? 'SELECT PREMIUM FAMILY VAN'
                    : `Select ${item.category}`}
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Vehicle Classes Section with Infinite Automatic Marquee ── */
export default function VehicleClassesSection() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <section
      id="vehicle-classes"
      className="relative py-14 sm:py-20 overflow-hidden"
      aria-label="Our Vehicle Classes Maintained to Sovereign Standards"
    >
      <style>{`
        @keyframes sovereignMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }
        .marquee-track {
          animation: sovereignMarquee 65s linear infinite;
        }
      `}</style>

      <div className="space-y-10">

        {/* ── Section Header ── */}
        <div className="border-b border-slate-200 dark:border-[#d4af37]/20 pb-8">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="font-mono uppercase tracking-[0.16em]">
                Our Vehicle Classes
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] text-slate-900 dark:text-black font-normal tracking-tight leading-[1.18]">
              Maintained to{' '}
              <span className="text-amber-600 dark:text-[#D4AF37] font-serif italic">Sovereign Standards</span>
            </h2>

            <p
              className="text-sm sm:text-base text-black !text-black font-medium leading-relaxed max-w-[65ch]"
              style={{ color: '#000000' }}
            >
            </p>
          </div>
        </div>

        {/* ── Continuous 60fps Marquee Auto-Scroll Track ── */}
        <div
          className="group relative w-full overflow-hidden py-3 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onTouchCancel={() => setIsPaused(false)}
          role="region"
          aria-label="Our Vehicle Classes continuous showcase"
        >
          {/* Subtle edge fade vignettes for seamless entry/exit peek */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#faf8f4] dark:from-[#0b0f1a] to-transparent z-10 opacity-75"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#faf8f4] dark:from-[#0b0f1a] to-transparent z-10 opacity-75"
            aria-hidden="true"
          />

          <div className="flex w-max items-stretch">
            {/* Primary Track */}
            <div
              className="animate-marquee-fleet marquee-track flex shrink-0 items-stretch will-change-transform group-hover:[animation-play-state:paused]"
              style={{
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              {MARQUEE_ITEMS.map((item, index) => (
                <div
                  key={`track1-${item.id}-${index}`}
                  className="pr-5 sm:pr-6 shrink-0 flex"
                >
                  <VehicleCard
                    item={item}
                    index={index % VEHICLE_CLASSES.length}
                    priorityImage={index === 0}
                  />
                </div>
              ))}
            </div>

            {/* Seamless Clone Track for Perfect Infinite Loop */}
            <div
              className="animate-marquee-fleet marquee-track flex shrink-0 items-stretch will-change-transform group-hover:[animation-play-state:paused]"
              aria-hidden="true"
              style={{
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              {MARQUEE_ITEMS.map((item, index) => (
                <div
                  key={`track2-${item.id}-${index}`}
                  className="pr-5 sm:pr-6 shrink-0 flex"
                >
                  <VehicleCard
                    item={item}
                    index={index % VEHICLE_CLASSES.length}
                    priorityImage={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Track Status & Trust Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-[#d4af37]/15">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#8ea499]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

          </div>

          {/* Quick Assurance Badges */}
          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-[#9eb6aa] font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#d4af37]" />
              <span>100% Licensed &amp; Insured Chauffeurs</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-[#d4af37]" />
              <span>Complimentary Zamzam &amp; Wi-Fi</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
