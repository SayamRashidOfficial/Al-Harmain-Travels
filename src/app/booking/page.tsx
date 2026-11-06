'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  Luggage,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  Compass,
  MessageCircle,
  HelpCircle,
  Plane,
  ChevronDown,
} from 'lucide-react';
import { VehicleType } from '@/types';
import { useApp } from '@/context/AppContext';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import { trackBookNowClick, trackBookingStarted } from '@/lib/analytics';

interface FleetOption {
  type: VehicleType;
  title: string;
  category: string;
  pax: string;
  bags: string;
  baseEstimate: number;
  image: string;
  description: string;
}

const FLEET_OPTIONS: FleetOption[] = [
  {
    type: 'vip_gmc',
    title: 'VIP GMC Yukon XL Denali',
    category: 'VIP Luxury SUV',
    pax: 'Up to 6 Passengers',
    bags: '6 Large Luggage',
    baseEstimate: 350,
    image: '/images/fleet_yukon.jpg',
    description: 'Executive captain seats, dual-zone climate, tinted privacy glass, and priority Haram gate permits.',
  },
  {
    type: 'sedan',
    title: 'Executive Sedan',
    category: 'Lexus ES / Toyota Camry Hybrid',
    pax: 'Up to 3 Passengers',
    bags: '2 Large Luggage',
    baseEstimate: 180,
    image: '/images/fleet_sedan.jpg',
    description: 'Smooth, silent, fuel-efficient luxury ride tailored for business and solo or couple pilgrims.',
  },
  {
    type: 'suv',
    title: 'Hyundai Staria VIP Lounge',
    category: 'Premium Family Van',
    pax: 'Up to 7 Passengers',
    bags: '5 Large Luggage',
    baseEstimate: 260,
    image: '/images/fleet_staria.jpg',
    description: 'Modern spacious cabin with panoramic windows, ideal for medium families and elder passengers.',
  },
  {
    type: 'van',
    title: 'Royal Pilgrimage Van',
    category: 'Toyota HiAce VIP Lounge',
    pax: 'Up to 10 Passengers',
    bags: '10 Large Luggage',
    baseEstimate: 420,
    image: '/images/fleet_van.jpg',
    description: 'High-roof limousine specification with ample baggage room for larger Umrah and Hajj groups.',
  },
];

const POPULAR_ROUTES = [
  {
    name: 'Jeddah Airport (JED) → Makkah Haram',
    pickup: 'King Abdulaziz Airport (JED)',
    destination: 'Makkah Clock Royal Tower',
    distance: '~95 km',
    duration: '~65 mins',
  },
  {
    name: 'Makkah → Madinah Al-Munawwarah',
    pickup: 'Makkah Clock Royal Tower',
    destination: "Madinah Prophet's Mosque Gate 1",
    distance: '~435 km',
    duration: '~4.5 hours',
  },
  {
    name: 'Madinah Airport (MED) → Prophet’s Mosque',
    pickup: 'Madinah Prince Mohammad Airport (MED)',
    destination: "Madinah Prophet's Mosque Gate 1",
    distance: '~18 km',
    duration: '~25 mins',
  },
  {
    name: 'Makkah Ziyarat Holy Sites Tour',
    pickup: 'Makkah Clock Royal Tower',
    destination: 'Mina, Arafat, Muzdalifah & Jabal Al-Noor',
    distance: '~45 km',
    duration: '~3.5 hours',
  },
];

export default function PublicBookingPage() {
  const router = useRouter();
  const { settings } = useApp();

  // Form states
  const [pickup, setPickup] = useState<string>('King Abdulaziz Airport (JED)');
  const [destination, setDestination] = useState<string>('Makkah Clock Royal Tower');
  const [journeyDate, setJourneyDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState<string>('14:00');
  const [passengers, setPassengers] = useState<number>(3);
  const [luggage, setLuggage] = useState<number>(3);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('vip_gmc');
  const [flightNumber, setFlightNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Selected vehicle details
  const activeFleet = useMemo(
    () => FLEET_OPTIONS.find((v) => v.type === selectedVehicle) || FLEET_OPTIONS[0],
    [selectedVehicle]
  );

  // Dynamic route multiplier for rough estimate
  const estimatedFare = useMemo(() => {
    let multiplier = 1.0;
    const isIntercity =
      (pickup.includes('Makkah') && destination.includes('Madinah')) ||
      (pickup.includes('Madinah') && destination.includes('Makkah'));
    const isAirport = pickup.includes('Airport') || destination.includes('Airport');

    if (isIntercity) multiplier = 2.4;
    else if (isAirport) multiplier = 1.15;

    return Math.round(activeFleet.baseEstimate * multiplier);
  }, [pickup, destination, activeFleet]);

  // Submit Handler: seamlessly links with the customer planner
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    trackBookNowClick({
      location: 'booking_page_form',
      label: 'Proceed to Customer Booking',
      vehicle_type: selectedVehicle,
    });
    trackBookingStarted({
      vehicle_type: selectedVehicle,
      booking_method: 'booking_page',
    });
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'alharmain_customer_planner',
          JSON.stringify({
            pickup,
            destination,
            date: journeyDate,
            time: pickupTime,
            passengers,
            luggage,
            vehicle: selectedVehicle,
            flightNumber,
            notes,
            estimatedFare,
          })
        );
      }
    } catch {
      // Fallback
    }
    router.push('/customer');
  };

  const supportPhone = settings?.support_phone || '+966548881234';
  const whatsappNumber = supportPhone.replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#19241f] selection:bg-emerald-800 selection:text-white font-sans relative overflow-hidden">
      <CinematicTexture variant="light" />

      {/* JSON-LD Structured Data for Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            serviceType: 'Luxury Chauffeur & Umrah Taxi Transfers',
            provider: {
              '@type': 'LocalBusiness',
              name: 'Al Harmain Travels',
              telephone: supportPhone,
              url: 'https://alharmaintravels.com',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Makkah',
                addressCountry: 'SA',
              },
            },
            areaServed: ['Makkah', 'Madinah', 'Jeddah'],
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'SAR',
              lowPrice: '150',
              highPrice: '1200',
            },
          }),
        }}
      />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10 space-y-12 sm:space-y-16">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300/80 text-[#0b4736] text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="uppercase tracking-wider">VIP Chauffeur &amp; Umrah Transfers</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#0d2e23]">
            Book Your Private Chauffeur
          </h1>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto">
            Door-to-door luxury transport between Jeddah Airport, Makkah, and Madinah. Transparent fixed rates, vetted bilingual chauffeurs, and certified Haram gate permits.
          </p>
        </div>

        {/* Main Booking Interface Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Column (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e8e4dc] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Journey Details</h2>
                <p className="text-xs text-slate-500">Configure pickup, destination, and travel party</p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full uppercase">
                Instant Confirmation
              </span>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-5">
              {/* Pickup & Destination Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pickup */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Pickup Location</span>
                  </label>
                  <div className="relative">
                    <select
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 appearance-none pr-8 cursor-pointer"
                    >
                      <option value="King Abdulaziz Airport (JED)">King Abdulaziz Airport (JED) — Jeddah</option>
                      <option value="Jeddah Islamic Port">Jeddah Islamic Port</option>
                      <option value="Makkah Clock Royal Tower">Makkah Clock Royal Tower — Haram</option>
                      <option value="Jabal Omar Hyatt Regency">Jabal Omar Hyatt Regency — Makkah</option>
                      <option value="Fairmont Makkah Clock Royal Tower">Fairmont Makkah Clock Royal Tower</option>
                      <option value="Madinah Prince Mohammad Airport (MED)">Madinah Prince Mohammad Airport (MED)</option>
                      <option value="Madinah Prophet's Mosque Gate 1">Madinah Prophet&apos;s Mosque Gate 1</option>
                      <option value="The Oberoi Madinah">The Oberoi Madinah</option>
                      <option value="Custom Address">Custom Hotel / Villa Address</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Drop-Off Destination</span>
                  </label>
                  <div className="relative">
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 appearance-none pr-8 cursor-pointer"
                    >
                      <option value="Makkah Clock Royal Tower">Makkah Clock Royal Tower — Haram</option>
                      <option value="Swissotel Al Maqam Makkah">Swissotel Al Maqam Makkah</option>
                      <option value="Fairmont Makkah Clock Royal Tower">Fairmont Makkah Clock Royal Tower</option>
                      <option value="Madinah Prophet's Mosque Gate 1">Madinah Prophet&apos;s Mosque Gate 1</option>
                      <option value="The Oberoi Madinah">The Oberoi Madinah</option>
                      <option value="King Abdulaziz Airport (JED)">King Abdulaziz Airport (JED) — Jeddah</option>
                      <option value="Jeddah Corniche Luxury Hotel">Jeddah Corniche Luxury Hotel</option>
                      <option value="Custom Address">Custom Hotel / Residence</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Journey Date</span>
                  </label>
                  <input
                    type="date"
                    value={journeyDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setJourneyDate(e.target.value)}
                    required
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Pickup Time</span>
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    required
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Passengers & Bags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Passengers</span>
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  >
                    <option value={1}>1 Passenger</option>
                    <option value={2}>2 Passengers</option>
                    <option value={3}>3 Passengers</option>
                    <option value={4}>4 Passengers</option>
                    <option value={5}>5 Passengers</option>
                    <option value={6}>6 Passengers</option>
                    <option value={7}>7 Passengers</option>
                    <option value={10}>10+ Passengers (Group Van)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Luggage className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Luggage Bags</span>
                  </label>
                  <select
                    value={luggage}
                    onChange={(e) => setLuggage(parseInt(e.target.value, 10))}
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  >
                    <option value={1}>1 Large Bag</option>
                    <option value={2}>2 Large Bags</option>
                    <option value={3}>3 Large Bags</option>
                    <option value={4}>4 Large Bags</option>
                    <option value={6}>6 Large Bags</option>
                    <option value={10}>10+ Large Bags</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Selection Cards */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Car className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Choose Vehicle Category</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FLEET_OPTIONS.map((fleet) => {
                    const isSelected = selectedVehicle === fleet.type;
                    return (
                      <button
                        type="button"
                        key={fleet.type}
                        onClick={() => setSelectedVehicle(fleet.type)}
                        className={`text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-600 ring-1 ring-emerald-600 shadow-sm'
                            : 'bg-[#faf8f4] border-[#e2ddd3] hover:border-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-950">{fleet.title}</span>
                            <span className="text-[11px] font-mono font-bold text-emerald-800">
                              From {fleet.baseEstimate} SAR
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {fleet.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200/60 text-[10.5px] font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-700" />
                            {fleet.pax.split(' ')[2]} Pax
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Luggage className="w-3 h-3 text-emerald-700" />
                            {fleet.bags.split(' ')[0]} Bags
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Flight & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Plane className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Flight Number (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g. SV 1234 (for terminal tracking)"
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Special Notes / Requests</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Child seats, wheelchair, VIP meet"
                    className="w-full bg-[#faf8f4] border border-[#e2ddd3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] py-4 px-6 rounded-2xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <Compass className="w-4 h-4 text-[#06101e]" />
                  <span>Continue to Review &amp; Reserve Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary & Perks Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Fare Estimate Card */}
            <div className="bg-white rounded-3xl border border-[#e8e4dc] p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fare Estimate
                </span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Fixed Price Guarantee
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-500">Estimated Total (SAR)</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#0d2e23]">
                    {estimatedFare}
                  </span>
                  <span className="text-xs font-bold text-slate-600 uppercase">SAR</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Includes fuel, toll gates, VAT, and licensed VIP chauffeur service.
                </p>
              </div>

              {/* Selected Route Summary */}
              <div className="bg-[#faf8f4] p-4 rounded-2xl border border-[#e2ddd3] space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">From</span>
                    <span className="font-semibold text-slate-900">{pickup}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60">
                  <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">To</span>
                    <span className="font-semibold text-slate-900">{destination}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 font-medium text-slate-700">
                  <span>Vehicle:</span>
                  <span className="font-bold text-slate-900">{activeFleet.title}</span>
                </div>
              </div>

              {/* Included Perks */}
              <div className="space-y-2.5 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Complimentary With Every Transfer
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Free flight delay tracking &amp; 60 min airport wait time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Haram Gate licensed entry permits for Makkah hotels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Complimentary chilled Zamzam water and onboard Wi-Fi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Personal baggage handling from terminal arrivals to lobby</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Direct Dispatch Hotline Card */}
            <div className="bg-[#0b4736] text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="space-y-1">
                <span className="text-[10.5px] uppercase font-bold tracking-widest text-[#d4af37]">
                  24/7 Operations Hotline
                </span>
                <h3 className="font-serif text-xl font-semibold">Prefer Personal Assistance?</h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  Our bilingual dispatchers in Makkah and Madinah can confirm custom itineraries, group buses, or immediate pickups.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Assalam%20o%20Alaikum,%20I%20would%20like%20to%20book%20a%20VIP%20transfer.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white hover:bg-slate-100 text-[#0b4736] px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Dispatch</span>
                </a>
                <a
                  href={`tel:${supportPhone}`}
                  className="flex-1 bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-700/60 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#d4af37]" />
                  <span>Direct Call</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Pilgrimage Routes Showcase */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0d2e23]">
              Curated Pilgrimage Routes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Select one of our frequently requested routes to quick-fill your reservation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_ROUTES.map((route, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setPickup(route.pickup);
                  setDestination(route.destination);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="bg-white p-5 rounded-2xl border border-[#e8e4dc] hover:border-emerald-600 hover:shadow-md transition-all duration-200 cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 font-bold">
                  <span>{route.distance}</span>
                  <span>{route.duration}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {route.name}
                </h3>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 pt-1">
                  <span>Select Route</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section for SEO Rich Answers */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#e8e4dc] p-6 sm:p-10 shadow-lg space-y-6">
          <div className="space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Clear Questions &amp; Answers
            </span>
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              Booking &amp; Chauffeur FAQs
            </h2>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="pt-4 first:pt-0 space-y-1.5">
              <h3 className="font-bold text-slate-900">How do I meet my chauffeur at Jeddah or Madinah Airport?</h3>
              <p className="text-slate-600 leading-relaxed">
                Your designated chauffeur will track your flight arrival in real time and meet you at the arrivals hall holding a personalized welcome signboard with your name or family name.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <h3 className="font-bold text-slate-900">Do you have authorized permits for Haram hotel drop-offs in Makkah?</h3>
              <p className="text-slate-600 leading-relaxed">
                Yes. All Al Harmain Travels fleet vehicles hold official Ministry of Hajj &amp; Umrah access permits, ensuring direct access to hotels within the central Haram zone and Clock Tower.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <h3 className="font-bold text-slate-900">Can I pay in cash or via card upon arrival?</h3>
              <p className="text-slate-600 leading-relaxed">
                We accept cash directly to your chauffeur upon completion of your journey, as well as bank transfers and online cards with instant VAT receipts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

