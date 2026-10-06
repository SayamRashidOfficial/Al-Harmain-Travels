'use client';

// Home page with side drawer slide-in navigation
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VehicleType } from '@/types';
import {
  MapPin,
  Calendar,
  Users,
  Car,
  Plane,
  ArrowRight,
  ChevronDown,
  Navigation,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Headphones,
  Award,
} from 'lucide-react';
import CinematicDestinations from '@/components/cinematic/CinematicDestinations';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import IntroAnimation from '@/components/intro/IntroAnimation';
import AlHarmainStandard from '@/components/home/AlHarmainStandard';

/* ── Vehicle Fleet Data ── */
interface VehicleFleetItem {
  id: VehicleType;
  name: string;
  category: string;
  capacity: string;
  luggage: string;
  image: string;
}

const FLEET_ITEMS: VehicleFleetItem[] = [
  {
    id: 'vip_gmc',
    name: 'VIP GMC Yukon XL Denali',
    category: 'VIP Luxury SUV',
    capacity: 'Up to 6 Passengers',
    luggage: '6 Large Bags',
    image: '/images/fleet_yukon.jpg',
  },
  {
    id: 'sedan',
    name: 'Executive Sedan',
    category: 'Lexus ES / Camry Hybrid',
    capacity: 'Up to 3 Passengers',
    luggage: '2 Large Bags',
    image: '/images/fleet_sedan.jpg',
  },
  {
    id: 'suv',
    name: 'Hyundai Staria',
    category: 'Premium Family Van',
    capacity: 'Up to 7 Passengers',
    luggage: '5 Large Bags',
    image: '/images/fleet_staria.jpg',
  },
  {
    id: 'van',
    name: 'Royal Pilgrimage Van',
    category: 'Toyota HiAce VIP Lounge',
    capacity: 'Up to 10 Passengers',
    luggage: '10 Large Bags',
    image: '/images/fleet_van.jpg',
  },
];

/* ── Destinations Data ── */
const DESTINATIONS = [
  {
    title: 'Makkah Al-Mukarramah',
    subtitle: 'The Sacred Sanctuary',
    tag: 'Holy Sanctuary',
    caption: 'Direct transfers from Jeddah Airport to your hotel suite with authorized Haram Gate permits.',
    image: '/images/dest_makkah.jpg',
    pickup: 'King Abdulaziz Airport (JED)',
    destination: 'Makkah Clock Royal Tower',
  },
  {
    title: 'Madinah Al-Munawwarah',
    subtitle: 'The City of Peace',
    tag: "The Prophet's City",
    caption: 'Peaceful, air-conditioned intercity journeys to the marble courtyards of the Prophet’s Mosque.',
    image: '/images/dest_madinah.jpg',
    pickup: 'Makkah Clock Royal Tower',
    destination: "Madinah Prophet's Mosque Gate 1",
  },
  {
    title: 'Jeddah International Gateway',
    subtitle: 'Coastal Gateway & Airport Meet & Greet',
    tag: 'Red Sea Gateway',
    caption: 'Personal terminal arrivals meet & greet with luggage assistance and flight delay protection.',
    image: '/images/dest_jeddah.jpg',
    pickup: 'King Abdulaziz Airport (JED)',
    destination: 'Jeddah Corniche Luxury Hotel',
  },
];


/* ── Trust Strip Items ── */
const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Trusted by Pilgrims',
    subtitle: 'Over 15,000+ Journeys',
    iconHoverClass: 'group-hover/item:-translate-y-0.5 group-hover/item:scale-110',
  },
  {
    icon: UserCheck,
    title: 'Licensed Chauffeurs',
    subtitle: 'Ministry of Transport Approved',
    iconHoverClass: 'group-hover/item:rotate-[-5deg] group-hover/item:scale-110',
  },
  {
    icon: Car,
    title: 'Premium Open Fleet',
    subtitle: 'Pristine 2024–2026 Models',
    iconHoverClass: 'group-hover/item:translate-x-1 group-hover/item:scale-105',
  },
  {
    icon: Plane,
    title: 'Flight Monitoring',
    subtitle: 'Automated Delay Protection',
    iconHoverClass: 'group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 group-hover/item:-rotate-6 group-hover/item:scale-110',
  },
  {
    icon: Headphones,
    title: 'Dedicated 24/7 Desk',
    subtitle: 'Multilingual Concierge',
    iconHoverClass: 'group-hover/item:rotate-6 group-hover/item:scale-110',
  },
];

export default function HomePage() {
  const router = useRouter();

  // Booking Form State
  const [pickup, setPickup] = useState('King Abdulaziz Airport (JED)');
  const [destination, setDestination] = useState('Makkah Clock Royal Tower');
  const [journeyDate, setJourneyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState('3 Passengers');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('vip_gmc');

  // Hero Entrance Animation State
  const [isHeroMounted, setIsHeroMounted] = useState(false);
  useEffect(() => {
    setIsHeroMounted(true);
  }, []);

  // Trust Ribbon scroll-entry state
  const [isTrustRibbonVisible, setIsTrustRibbonVisible] = useState(false);
  const trustRibbonRef = useRef<HTMLElement>(null);

  // Destinations scroll-entry and parallax state
  const [isDestinationsVisible, setIsDestinationsVisible] = useState(false);
  const destinationsRef = useRef<HTMLElement>(null);
  const [destParallax, setDestParallax] = useState(0);

  // Fleet scroll-entry and parallax state
  const [isFleetVisible, setIsFleetVisible] = useState(false);
  const fleetRef = useRef<HTMLElement>(null);
  const [fleetParallax, setFleetParallax] = useState(0);

  // Services Banner scroll-entry and parallax state
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  const [bannerParallax, setBannerParallax] = useState(0);


  // 1. Trust Ribbon Observer
  useEffect(() => {
    const el = trustRibbonRef.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsTrustRibbonVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsTrustRibbonVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Destinations Observer
  useEffect(() => {
    const el = destinationsRef.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsDestinationsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsDestinationsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 3. Fleet Observer
  useEffect(() => {
    const el = fleetRef.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsFleetVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsFleetVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 4. Services Banner Observer
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsBannerVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsBannerVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  // 6. Smooth Cinematic Parallax Scroll Listener (GPU friendly, RAF optimized)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const windowHeight = window.innerHeight;
          const isMobile = window.innerWidth < 768;
          const maxShift = isMobile ? 14 : 18;

          if (destinationsRef.current) {
            const rect = destinationsRef.current.getBoundingClientRect();
            if (rect.top < windowHeight && rect.bottom > 0) {
              const centerDist = rect.top + rect.height / 2 - windowHeight / 2;
              const shift = Math.max(-maxShift, Math.min(maxShift, -centerDist * (isMobile ? 0.03 : 0.035)));
              setDestParallax(shift);
            }
          }

          if (fleetRef.current) {
            const rect = fleetRef.current.getBoundingClientRect();
            if (rect.top < windowHeight && rect.bottom > 0) {
              const centerDist = rect.top + rect.height / 2 - windowHeight / 2;
              const shift = Math.max(-maxShift, Math.min(maxShift, -centerDist * (isMobile ? 0.028 : 0.032)));
              setFleetParallax(shift);
            }
          }

          if (bannerRef.current) {
            const rect = bannerRef.current.getBoundingClientRect();
            if (rect.top < windowHeight && rect.bottom > 0) {
              const centerDist = rect.top + rect.height / 2 - windowHeight / 2;
              const shift = Math.max(-maxShift, Math.min(maxShift, -centerDist * (isMobile ? 0.035 : 0.04)));
              setBannerParallax(shift);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Booking Submit Handler: Preserves existing booking logic, sessionStorage, and /customer route
  const handlePlanJourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined') {
        const passengerCount = parseInt(passengers, 10) || 3;
        sessionStorage.setItem(
          'alharmain_customer_planner',
          JSON.stringify({
            pickup,
            destination,
            date: journeyDate,
            time: '14:00',
            passengers: passengerCount,
            vehicle: selectedVehicle,
          })
        );
      }
    } catch { }
    router.push('/customer');
  };

  // Pre-fill destination from card
  const handleDestinationSelect = (pick: string, dest: string) => {
    setPickup(pick);
    setDestination(dest);
    const formElement = document.getElementById('booking-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Pre-fill vehicle from fleet carousel
  const handleVehicleSelect = (type: VehicleType) => {
    setSelectedVehicle(type);
    const formElement = document.getElementById('booking-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#fcfbf7] text-[#19241f] min-h-screen selection:bg-emerald-800 selection:text-white font-sans">
      <IntroAnimation />
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION — EXACT SPLIT SCREEN (45% IVORY / 55% MAKKAH)
          WITH INTERACTIVE CINEMATIC HOVER ZOOM ON MAKKAH IMAGE
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#faf8f4] border-b border-[#e8e4dc]">
        <div className="max-w-[1400px] mx-auto min-h-auto lg:min-h-[460px] grid grid-cols-1 lg:grid-cols-12 items-stretch">

          {/* Left Side: 45% Ivory Content Area */}
          <div className="lg:col-span-5 flex flex-col justify-center px-4 xs:px-6 sm:px-10 lg:px-12 py-8 xs:py-10 sm:py-12 lg:py-14 z-20">
            {/* Small uppercase label */}
            <div
              style={{
                transitionDuration: '650ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`flex items-center gap-2 mb-2.5 sm:mb-3 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isHeroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] sm:tracking-[0.24em] uppercase text-[#55635c]">
                PRIVATE CHAUFFEUR &bull; SAUDI ARABIA
              </span>
            </div>

            {/* Large elegant dark-green serif headline with responsive scaling & floating reveal */}
            <h1
              style={{
                transitionDuration: '750ms',
                transitionDelay: '100ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`font-serif text-3xl xs:text-4xl sm:text-5xl lg:text-[52px] leading-[1.14] text-[#0d2e23] font-normal tracking-tight transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 ${isHeroMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.985]'
                }`}
            >
              A More Peaceful<br className="hidden xs:inline" />{' '}
              Way to Travel.
            </h1>

            {/* Short description */}
            <p
              style={{
                transitionDuration: '750ms',
                transitionDelay: '200ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`mt-3 sm:mt-4 text-[#4a5851] text-xs sm:text-sm lg:text-[15px] leading-relaxed max-w-md font-normal transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isHeroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
            >
              Thoughtful private transfers between Makkah, Madinah and Jeddah, with comfort and care throughout your journey.
            </p>

            {/* Action buttons - full-width vertical stack on small mobile, row on tablet/desktop */}
            <div
              style={{
                transitionDuration: '750ms',
                transitionDelay: '280ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`mt-6 sm:mt-7 flex flex-col xs:flex-row items-stretch xs:items-center gap-3.5 sm:gap-6 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isHeroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
            >
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('booking-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#0c392c] hover:bg-[#07271e] text-white px-5 sm:px-6 py-3 min-h-[44px] rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                <span>Plan Your Journey</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>

              <Link
                href="/services"
                className="text-[#0d2e23] hover:text-[#0c392c] text-xs sm:text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 group py-2 xs:py-0 min-h-[44px] xs:min-h-0"
              >
                <span>Discover Our Services</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Side: 55% Makkah Skyline & Kaaba Photo with Cinematic Hover Zoom */}
          <div
            style={{
              transitionDuration: '900ms',
              transitionDelay: '120ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`lg:col-span-7 relative min-h-[240px] xs:min-h-[280px] sm:min-h-[340px] lg:min-h-full overflow-hidden group/hero transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 ${isHeroMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
              }`}
          >
            {/* Subtle soft gradient fade into the ivory left section on desktop */}
            <div className="hidden lg:block absolute left-0 inset-y-0 w-28 bg-gradient-to-r from-[#faf8f4] via-[#faf8f4]/60 to-transparent z-10 pointer-events-none" />

            {/* Photographic Video with cinematic slow motion (0.75x) and seamless loop */}
            <video
              ref={(el) => {
                if (el) el.playbackRate = 0.75;
              }}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = 0.75;
              }}
              onPlay={(e) => {
                e.currentTarget.playbackRate = 0.75;
              }}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/images/hero_kaaba.jpg"
              aria-label="Masjid al-Haram, Holy Kaaba and Makkah Clock Tower"
              className="w-full h-full object-cover object-center transform scale-100 group-hover/hero:scale-[1.038] transition-transform duration-700 ease-out will-change-transform"
            >
              <source src="/images/hero_kaaba.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. HORIZONTAL BOOKING BAR — COMPACT FLOATING PANEL
      ───────────────────────────────────────────────────────────── */}
      <section
        id="booking-form"
        style={{
          transitionDuration: '800ms',
          transitionDelay: '320ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`max-w-[1320px] mx-auto px-3 sm:px-6 -mt-4 sm:-mt-8 relative z-30 mb-6 sm:mb-8 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 ${isHeroMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.99]'
          }`}
      >
        <div className="bg-white rounded-xl shadow-lg border border-[#e8e4dc] p-3.5 sm:p-4">
          <form
            onSubmit={handlePlanJourneySubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-0 items-center divide-y lg:divide-y-0 lg:divide-x divide-slate-100"
          >
            {/* 1. Pickup Location */}
            <div className="lg:col-span-3 px-2 sm:px-3 py-2 lg:py-1.5 flex flex-col justify-center">
              <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                <MapPin className="w-3 h-3 text-[#0c392c] shrink-0" />
                <span>Pickup Location</span>
              </label>
              <div className="relative">
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-6 py-1 truncate"
                >
                  <option value="King Abdulaziz Airport (JED)">King Abdulaziz Airport (JED)</option>
                  <option value="Jeddah Islamic Port">Jeddah Islamic Port</option>
                  <option value="Makkah Clock Royal Tower">Makkah Clock Royal Tower</option>
                  <option value="Jabal Omar Hyatt Regency">Jabal Omar Hyatt Regency</option>
                  <option value="Madinah Prince Mohammad Airport (MED)">Madinah Airport (MED)</option>
                  <option value="Madinah Prophet's Mosque Gate 1">Madinah Prophet's Mosque Gate 1</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Destination */}
            <div className="lg:col-span-3 px-2 sm:px-3 py-2 lg:py-1.5 flex flex-col justify-center pt-2.5 lg:pt-1.5">
              <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                <Navigation className="w-3 h-3 text-[#0c392c] shrink-0" />
                <span>Destination</span>
              </label>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-6 py-1 truncate"
                >
                  <option value="Makkah Clock Royal Tower">Makkah Clock Royal Tower</option>
                  <option value="Fairmont Makkah Clock Royal Tower">Fairmont Makkah Clock Royal Tower</option>
                  <option value="Swissotel Al Maqam Makkah">Swissotel Al Maqam Makkah</option>
                  <option value="Madinah Prophet's Mosque Gate 1">Madinah Prophet's Mosque Gate 1</option>
                  <option value="The Oberoi Madinah">The Oberoi Madinah</option>
                  <option value="King Abdulaziz Airport (JED)">King Abdulaziz Airport (JED)</option>
                  <option value="Jeddah Corniche Luxury Hotel">Jeddah Corniche Luxury Hotel</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 3. Date */}
            <div className="lg:col-span-2 px-2 sm:px-3 py-2 lg:py-1.5 flex flex-col justify-center pt-2.5 lg:pt-1.5">
              <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                <Calendar className="w-3 h-3 text-[#0c392c] shrink-0" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={journeyDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setJourneyDate(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer py-1"
              />
            </div>

            {/* 4. Passengers */}
            <div className="lg:col-span-1 px-2 sm:px-3 py-2 lg:py-1.5 flex flex-col justify-center pt-2.5 lg:pt-1.5">
              <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                <Users className="w-3 h-3 text-[#0c392c] shrink-0" />
                <span>Passengers</span>
              </label>
              <div className="relative">
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-5 py-1"
                >
                  <option value="1 Passenger">1 Pax</option>
                  <option value="2 Passengers">2 Pax</option>
                  <option value="3 Passengers">3 Pax</option>
                  <option value="4 Passengers">4 Pax</option>
                  <option value="6 Passengers">6 Pax</option>
                  <option value="10+ Passengers">10+ Pax</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 5. Vehicle Type */}
            <div className="lg:col-span-1 px-2 sm:px-3 py-2 lg:py-1.5 flex flex-col justify-center pt-2.5 lg:pt-1.5">
              <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                <Car className="w-3 h-3 text-[#0c392c] shrink-0" />
                <span>Vehicle Type</span>
              </label>
              <div className="relative">
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value as VehicleType)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-5 py-1"
                >
                  <option value="vip_gmc">VIP GMC</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 6. Find My Ride Button */}
            <div className="lg:col-span-2 px-2 py-1 flex items-center justify-end pt-3 lg:pt-1">
              <button
                type="submit"
                className="w-full bg-[#0c392c] hover:bg-[#07271e] text-white min-h-[46px] py-3 px-5 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none"
              >
                <span>Find My Ride</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. SIGNATURE PUBLIC TRUST RIBBON (CONTINUOUS BIDIRECTIONAL MARQUEE)
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={trustRibbonRef}
        className="max-w-[1320px] mx-auto px-3 sm:px-6 pt-2 sm:pt-3 mb-6 sm:mb-8 lg:mb-10 overflow-hidden w-full max-w-full"
        aria-label="Service Trust Standards"
      >
        {/* Scoped Keyframes for Continuous Bidirectional Movement and Divider Gleam */}
        <style>{`
          @keyframes ribbonMarqueeBidirectional {
            0% {
              transform: translate3d(0%, 0, 0);
            }
            50% {
              transform: translate3d(-33.3333%, 0, 0);
            }
            100% {
              transform: translate3d(0%, 0, 0);
            }
          }

          @keyframes dividerGleam {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            25% {
              opacity: 0.9;
            }
            50%, 100% {
              transform: translateY(200%);
              opacity: 0;
            }
          }

          .trust-marquee-track {
            display: flex;
            align-items: center;
            width: max-content;
            will-change: transform;
            animation: ribbonMarqueeBidirectional 38s ease-in-out infinite;
          }

          .trust-marquee-track:hover,
          .trust-marquee-track:focus-within {
            animation-play-state: paused;
          }

          .anim-divider-gleam {
            animation: dividerGleam 4.5s ease-in-out infinite;
            will-change: transform;
          }

          @media (prefers-reduced-motion: reduce) {
            .trust-marquee-track {
              animation: none !important;
              transform: none !important;
            }
            .anim-divider-gleam {
              animation: none !important;
              opacity: 0.3 !important;
            }
          }
        `}</style>

        <div
          className={`relative bg-[#f7f5ef] border border-[#e8e4dc] rounded-xl py-3.5 sm:py-4 px-2 sm:px-4 shadow-sm overflow-hidden touch-pan-y transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isTrustRibbonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
          {/* Subtle Left & Right Fade Masks for Smooth In/Out Flow */}
          <div className="pointer-events-none absolute left-0 inset-y-0 w-8 sm:w-16 bg-gradient-to-r from-[#f7f5ef] via-[#f7f5ef]/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-8 sm:w-16 bg-gradient-to-l from-[#f7f5ef] via-[#f7f5ef]/80 to-transparent z-10" />

          {/* Marquee Track with 3 Sets for Seamless Infinite Looping */}
          <div className="trust-marquee-track">
            {[0, 1, 2].map((setIdx) => {
              const isDuplicate = setIdx > 0;
              return (
                <div
                  key={`trust-set-${setIdx}`}
                  className="flex items-center shrink-0"
                  aria-hidden={isDuplicate ? 'true' : undefined}
                >
                  {TRUST_ITEMS.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <React.Fragment key={`${item.title}-${setIdx}-${idx}`}>
                        <div
                          tabIndex={isDuplicate ? -1 : 0}
                          style={{
                            transitionDelay: (!isDuplicate && isTrustRibbonVisible) ? `${idx * 90}ms` : '0ms',
                          }}
                          className={`group/item relative flex items-center gap-2.5 xs:gap-3 px-2.5 xs:px-3 sm:px-4 py-2 rounded-lg cursor-default transition-all duration-300 ease-out hover:bg-white/80 hover:shadow-xs hover:-translate-y-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0c392c] shrink-0 w-[220px] xs:w-[240px] sm:w-[260px] lg:w-[280px] ${isTrustRibbonVisible ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                          <div className="w-8.5 h-8.5 xs:w-9 xs:h-9 rounded-lg bg-[#0e3b2f] border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 shadow-xs transition-all duration-300 ease-out group-hover/item:scale-105 group-hover/item:border-amber-400/70 group-hover/item:bg-[#07271e] group-hover/item:shadow-sm">
                            <Icon className={`w-4 h-4 text-amber-300 transition-transform duration-300 ease-out ${item.iconHoverClass}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#0d2e23] tracking-tight leading-tight truncate transition-colors duration-200 group-hover/item:text-[#0b4736]">
                              {item.title}
                            </h4>
                            <p className="text-[10.5px] xs:text-[11px] text-[#55635c] mt-0.5 truncate font-normal transition-colors duration-200 group-hover/item:text-[#1e2e26]">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Animated Separator Line between items */}
                        <div
                          className="relative h-7 sm:h-8 w-[1px] bg-[#e8e4dc] overflow-hidden my-auto mx-1 xs:mx-1.5 sm:mx-2 shrink-0 pointer-events-none"
                          aria-hidden="true"
                        >
                          <div
                            className="w-full h-3.5 bg-gradient-to-b from-transparent via-[#c5a059]/70 to-transparent anim-divider-gleam"
                            style={{ animationDelay: `${(idx + setIdx * 5) * 0.4}s` }}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. OUR DESTINATIONS — FULL-SCREEN PINNED SCROLL-THROUGH CINEMATIC SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      <CinematicDestinations onSelectDestination={handleDestinationSelect} />


      {/* ─────────────────────────────────────────────────────────────
          5. VEHICLE SHOWCASE (OUR FLEET) — PRIMARY FOCUS: CINEMATIC FLOATING SCROLL & VEHICLE DEPTH
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={fleetRef}
        id="the-fleet"
        className="relative max-w-[1320px] mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-7 mb-8 sm:mb-12 lg:mb-14 overflow-hidden w-full max-w-full rounded-2xl"
      >
        {/* Subtle Geometric Texture Layer */}
        <CinematicTexture variant="light" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">

          {/* Left Narrative Column: Floating reveal with choreograph */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            <span
              style={{
                transitionDuration: '700ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#6f7e75] block transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isFleetVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
            >
              OUR FLEET
            </span>
            <h2
              style={{
                transitionDuration: '750ms',
                transitionDelay: '120ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`font-serif text-2xl xs:text-3xl sm:text-4xl text-[#0d2e23] font-normal leading-[1.18] tracking-tight transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isFleetVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
                }`}
            >
              Premium Vehicles<br className="hidden xs:inline" />{' '}
              for Every Journey.
            </h2>
            <p
              style={{
                transitionDuration: '750ms',
                transitionDelay: '220ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`text-xs sm:text-sm text-[#4a5851] leading-relaxed font-normal transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isFleetVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
            >
              Thoughtfully appointed fleet engineered for peaceful intercity journeys and VIP Haram arrivals.
            </p>
          </div>

          {/* Right Fleet Showcase Column: Continuous Horizontal Loop with Floating Entrance and Vehicle Depth Parallax */}
          <div
            style={{
              transitionDuration: '850ms',
              transitionDelay: '260ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`lg:col-span-8 overflow-hidden relative group/fleet w-full transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 ${isFleetVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-[0.985]'
              }`}
          >
            {/* Subtle soft gradient fade masks on edges */}
            <div className="pointer-events-none absolute left-0 inset-y-0 w-6 sm:w-10 bg-gradient-to-r from-[#fcfbf7] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 inset-y-0 w-6 sm:w-10 bg-gradient-to-l from-[#fcfbf7] to-transparent z-10" />

            <div className="flex w-max items-stretch py-2 select-none">
              {/* Primary Track */}
              <div className="flex shrink-0 items-stretch animate-marquee-fleet will-change-transform group-hover/fleet:[animation-play-state:paused]">
                {[...FLEET_ITEMS, ...FLEET_ITEMS].map((car, index) => {
                  const isSelected = selectedVehicle === car.id;
                  return (
                    <div
                      key={`track1-${car.id}-${index}`}
                      onClick={() => handleVehicleSelect(car.id)}
                      className="pr-4 sm:pr-5 shrink-0 flex"
                    >
                      <div
                        className={`w-[230px] xs:w-[260px] sm:w-[290px] flex flex-col justify-between bg-[#fdfbf7] rounded-xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-md ${isSelected
                          ? 'border-[#0c392c] ring-1 ring-[#0c392c]'
                          : 'border-[#e8e4dc] hover:border-slate-300'
                          }`}
                      >
                        {/* Vehicle image with subtle depth/parallax float relative to card */}
                        <div
                          style={{
                            transform: `translateY(${fleetParallax * 0.75}px)`,
                          }}
                          className="aspect-[4/3] w-full flex items-center justify-center overflow-hidden mb-3 will-change-transform transition-transform duration-300 ease-out"
                        >
                          <img
                            src={car.image}
                            alt={car.name}
                            className="w-full h-full object-contain transform transition-transform duration-300 hover:scale-105"
                          />
                        </div>

                        {/* Vehicle Title & Specs */}
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                            {car.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {car.capacity}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {car.luggage}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Duplicate Clone Track running simultaneously in sequence with ZERO blank space */}
              <div
                aria-hidden="true"
                className="flex shrink-0 items-stretch animate-marquee-fleet will-change-transform group-hover/fleet:[animation-play-state:paused]"
              >
                {[...FLEET_ITEMS, ...FLEET_ITEMS].map((car, index) => {
                  const isSelected = selectedVehicle === car.id;
                  return (
                    <div
                      key={`track2-${car.id}-${index}`}
                      onClick={() => handleVehicleSelect(car.id)}
                      className="pr-4 sm:pr-5 shrink-0 flex"
                    >
                      <div
                        className={`w-[230px] xs:w-[260px] sm:w-[290px] flex flex-col justify-between bg-[#fdfbf7] rounded-xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-md ${isSelected
                          ? 'border-[#0c392c] ring-1 ring-[#0c392c]'
                          : 'border-[#e8e4dc] hover:border-slate-300'
                          }`}
                      >
                        {/* Vehicle image with subtle depth/parallax float relative to card */}
                        <div
                          style={{
                            transform: `translateY(${fleetParallax * 0.75}px)`,
                          }}
                          className="aspect-[4/3] w-full flex items-center justify-center overflow-hidden mb-3 will-change-transform transition-transform duration-300 ease-out"
                        >
                          <img
                            src={car.image}
                            alt={car.name}
                            className="w-full h-full object-contain transform transition-transform duration-300 hover:scale-105"
                          />
                        </div>

                        {/* Vehicle Title & Specs */}
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                            {car.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {car.capacity}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {car.luggage}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. TRAVEL CONFIDENCE & SERVICES BANNER — CINEMATIC DEEP GREEN (FLOATING ENTRANCE & PARALLAX)
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={bannerRef}
        className="max-w-[1320px] mx-auto px-4 sm:px-6 mb-8 sm:mb-12 lg:mb-14"
      >
        <div
          style={{
            transitionDuration: '850ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`relative rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[340px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-8 lg:p-10 text-white shadow-xl transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 ${isBannerVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-[0.985]'
            }`}
        >
          {/* Background Video with subtle vertical parallax depth, 0.75x slow motion, and seamless loop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <video
              ref={(el) => {
                if (el) el.playbackRate = 0.75;
              }}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = 0.75;
              }}
              onPlay={(e) => {
                e.currentTarget.playbackRate = 0.75;
              }}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/images/services_banner.jpg"
              aria-label="Luxury SUV on Saudi desert road with mountains"
              style={{
                transform: `scale(1.08) translateY(${bannerParallax * 0.6}px)`,
              }}
              className="w-full h-full object-cover object-center will-change-transform transition-transform duration-700 ease-out"
            >
              <source src="/images/services_banner.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Deep Forest-Green Scrim overlay on left side for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#07221a]/95 via-[#07221a]/75 to-transparent" />

          {/* Living Dark Geometric Texture & Gold Ambient Glow */}
          <CinematicTexture variant="dark" />

          {/* Top content: Floating reveals */}
          <div className="relative z-10 max-w-xl space-y-2.5 sm:space-y-3">
            <span
              style={{
                transitionDuration: '700ms',
                transitionDelay: '100ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-amber-400 block transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isBannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
              OUR SERVICES
            </span>
            <h2
              style={{
                transitionDuration: '750ms',
                transitionDelay: '180ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`font-serif text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight tracking-tight text-white transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isBannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
            >
              More Than a Ride.<br className="hidden xs:inline" />{' '}
              It’s Our Commitment.
            </h2>
            <p
              style={{
                transitionDuration: '750ms',
                transitionDelay: '260ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`text-xs sm:text-sm text-white/80 leading-relaxed font-normal pt-1 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isBannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
              Authorized sanctuary clearances, flight-synchronized monitoring, and dedicated luggage protocol across the Kingdom.
            </p>
          </div>

          {/* Bottom Row: 5 Service Badges + Right Signature */}
          <div className="relative z-10 pt-4 sm:pt-6 lg:pt-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-5 border-t border-white/10 mt-4 sm:mt-5">
            {/* 5 Service badges with gentle staggered reveal */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 lg:gap-6 text-xs text-white/90 font-medium">
              {[
                { icon: Plane, label: 'Airport Transfers' },
                { icon: Sparkles, label: 'Umrah & Hajj Transport' },
                { icon: Users, label: 'Private Chauffeur' },
                { icon: Navigation, label: 'Intercity Transfers' },
                { icon: Car, label: 'Family Transportation' },
              ].map((badge, bIdx) => {
                const BadgeIcon = badge.icon;
                return (
                  <span
                    key={badge.label}
                    style={{
                      transitionDuration: '600ms',
                      transitionDelay: isBannerVisible ? `${320 + bIdx * 65}ms` : '0ms',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className={`inline-flex items-center gap-1.5 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isBannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                      }`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                );
              })}
            </div>

            {/* Right Signature Quote */}
            <div
              style={{
                transitionDuration: '700ms',
                transitionDelay: isBannerVisible ? '480ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`text-left sm:text-right sm:shrink-0 space-y-1 transition-all motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isBannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
              <p className="text-xs text-white/70 italic">Your comfort.</p>
              <p className="text-xs font-semibold text-white">Our priority.</p>
              <div className="h-[1px] bg-amber-400/60 w-16 sm:ml-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. THE AL HARMAIN STANDARD (CINEMATIC FEATURE BANNERS)
      ───────────────────────────────────────────────────────────── */}
      <AlHarmainStandard />
    </div>
  );
}
