'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  IntermediateStop,
  LocationPoint,
  TripType,
  VehicleCategory,
  VehicleType,
} from '@/types';
import {
  Navigation,
  MapPin,
  Search,
  Crosshair,
  Plus,
  Trash2,
  Car,
  Users,
  Luggage,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Check,
  Copy,
  Sparkles,
  RotateCcw,
  Info,
  Phone,
  User,
  MessageSquare,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CustomRouteBookingPanelProps {
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  stops: IntermediateStop[];
  onOpenSearch: (field: 'pickup' | 'destination' | `stop_${number}`) => void;
  onUseCurrentLocation: () => void;
  onAddStop: () => void;
  onRemoveStop: (stopId: string) => void;
  onSwapPickupDestination: () => void;
  distanceKm: number;
  durationMinutes: number;
  isRouting: boolean;
  routeError: string | null;

  // Passenger & Travel State
  passengerName: string;
  setPassengerName: (val: string) => void;
  passengerPhone: string;
  setPassengerPhone: (val: string) => void;
  passengerCount: number;
  setPassengerCount: (val: number) => void;
  journeyDate: string;
  setJourneyDate: (val: string) => void;
  journeyTime: string;
  setJourneyTime: (val: string) => void;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;

  // Trip Type & Return Schedule
  tripType: TripType;
  setTripType: (val: TripType) => void;
  returnDate: string;
  setReturnDate: (val: string) => void;
  returnTime: string;
  setReturnTime: (val: string) => void;

  // Vehicle Category
  selectedVehicle: VehicleCategory | null;
  setSelectedVehicle: (val: VehicleCategory | null) => void;

  // Submission
  onSubmitCustomBooking: () => Promise<void>;
  isSubmitting: boolean;
  confirmedBookingRef: string | null;
  onResetCustomBooking: () => void;
}

export const CUSTOM_VEHICLE_OPTIONS: {
  category: VehicleCategory;
  vehicleType: VehicleType;
  title: string;
  subtitle: string;
  capacityPax: number;
  capacityLuggage: number;
  badge: string;
  perks: string[];
}[] = [
    {
      category: 'sedan',
      vehicleType: 'sedan',
      title: 'Executive Sedan',
      subtitle: 'Toyota Camry / Hyundai Sonata / Lexus ES',
      capacityPax: 3,
      capacityLuggage: 2,
      badge: 'Chauffeur Driven',
      perks: ['Ideal for individuals & small families', 'Bottled water & mobile chargers', 'Executive chauffeur'],
    },
    {
      category: 'staria',
      vehicleType: 'van',
      title: 'Luxury Family MPV',
      subtitle: 'Hyundai Staria VIP / Executive Van',
      capacityPax: 6,
      capacityLuggage: 5,
      badge: 'Family & Umrah',
      perks: ['Spacious captain seats', 'Ample luggage room for Umrah groups', 'Independent rear climate control'],
    },
    {
      category: 'gmc',
      vehicleType: 'vip_gmc',
      title: 'VIP Yukon XL',
      subtitle: 'GMC Yukon / Chevrolet Suburban XL',
      capacityPax: 7,
      capacityLuggage: 6,
      badge: 'Royal VIP Class',
      perks: ['VIP Royal class comfort & leather seating', 'Maximum privacy & luxury tinted glass', 'Supreme comfort for long-distance travel'],
    },
    {
      category: 'hiroof',
      vehicleType: 'van',
      title: 'HiRoof VIP Minibus',
      subtitle: 'Toyota HiAce High Roof VIP',
      capacityPax: 12,
      capacityLuggage: 10,
      badge: 'Delegation & Group',
      perks: ['Full delegation & large group capacity', 'High ceiling & wide walking aisle', 'Huge dedicated luggage hold'],
    },
  ];

type CustomBookingStep = 'route' | 'vehicle' | 'details' | 'review';

const STEPS_CONFIG = [
  { id: 'route' as const, label: 'Route', fullTitle: 'Define Custom Route & Stops', icon: Navigation },
  { id: 'vehicle' as const, label: 'Vehicle', fullTitle: 'Choose Preferred VIP Fleet', icon: Car },
  { id: 'details' as const, label: 'Schedule', fullTitle: 'Schedule & Passenger Details', icon: Calendar },
  { id: 'review' as const, label: 'Review', fullTitle: 'Review & Dispatcher Quote', icon: ShieldCheck },
] as const;

export default function CustomRouteBookingPanel({
  pickup,
  destination,
  stops,
  onOpenSearch,
  onUseCurrentLocation,
  onAddStop,
  onRemoveStop,
  onSwapPickupDestination,
  distanceKm,
  durationMinutes,
  isRouting,
  routeError,

  passengerName,
  setPassengerName,
  passengerPhone,
  setPassengerPhone,
  passengerCount,
  setPassengerCount,
  journeyDate,
  setJourneyDate,
  journeyTime,
  setJourneyTime,
  specialInstructions,
  setSpecialInstructions,

  tripType,
  setTripType,
  returnDate,
  setReturnDate,
  returnTime,
  setReturnTime,

  selectedVehicle,
  setSelectedVehicle,

  onSubmitCustomBooking,
  isSubmitting,
  confirmedBookingRef,
  onResetCustomBooking,
}: CustomRouteBookingPanelProps) {
  const [step, setStep] = useState<CustomBookingStep>('route');
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  // Today's ISO date for datepicker min attribute
  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Current step index (0 to 3)
  const currentStepIndex = useMemo(() => {
    const idx = STEPS_CONFIG.findIndex((s) => s.id === step);
    return idx >= 0 ? idx : 0;
  }, [step]);

  // Check if a step can be navigated to by clicking the stepper
  const canJumpToStep = (index: number) => {
    if (confirmedBookingRef) return false;
    // Always permit backwards navigation
    if (index < currentStepIndex) return true;
    // Permit forward navigation only if prerequisites exist
    if (index === 1 && pickup && destination) return true;
    if (index === 2 && pickup && destination && selectedVehicle) return true;
    if (index === 3 && pickup && destination && selectedVehicle && passengerName.trim() && passengerPhone.trim()) return true;
    return false;
  };

  const handleStepJump = (index: number) => {
    if (canJumpToStep(index)) {
      setStep(STEPS_CONFIG[index].id);
    }
  };

  // Step 1 -> 2: Route validation
  const handleProceedToVehicle = () => {
    if (!pickup) {
      toast.error('Please specify your pickup location.');
      return;
    }
    if (!destination) {
      toast.error('Please specify your final destination.');
      return;
    }
    setStep('vehicle');
  };

  // Step 2 -> 3: Vehicle validation
  const handleProceedToDetails = () => {
    if (!selectedVehicle) {
      toast.error('Please select a preferred vehicle category.');
      return;
    }
    setStep('details');
  };

  // Step 3 -> 4: Details & Schedule validation
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim()) {
      toast.error('Please provide the lead passenger name.');
      return;
    }
    if (!passengerPhone.trim()) {
      toast.error('Please provide your WhatsApp contact number.');
      return;
    }
    if (!journeyDate || !journeyTime) {
      toast.error('Please select your departure date and time.');
      return;
    }
    if (tripType === 'round_trip') {
      if (!returnDate || !returnTime) {
        toast.error('Please select your return date and pickup time.');
        return;
      }
      if (returnDate < journeyDate) {
        toast.error('Return date cannot be earlier than departure date.');
        return;
      }
    }
    setStep('review');
  };

  const handleCopyBookingRef = (ref: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(ref);
      setIsCopiedRef(true);
      toast.success('Booking reference copied to clipboard!');
      setTimeout(() => setIsCopiedRef(false), 2500);
    } else {
      toast.info(`Reference: ${ref}`);
    }
  };

  const selectedVehicleObj = useMemo(
    () => CUSTOM_VEHICLE_OPTIONS.find((v) => v.category === selectedVehicle),
    [selectedVehicle]
  );

  return (
    <div className="bg-card border border-base rounded-2xl shadow-lg overflow-hidden flex flex-col w-full transition-all">
      {/* ── TOP STEPPER HEADER (When not in confirmed submitted state) ─────── */}
      {!confirmedBookingRef && (
        <div className="border-b border-base bg-surface/50 backdrop-blur-md px-3 sm:px-4 pt-3 pb-2.5 space-y-2.5">
          {/* Universal 4-Step Stepper Nodes with connecting track line */}
          <div className="relative w-full">
            {/* Background Connecting Track Line */}
            <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-0.5 bg-base -translate-y-1/2 z-0">
              <div
                className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${(currentStepIndex / (STEPS_CONFIG.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* 4 Step Nodes in a 4-column grid: 100% width, exactly 25% each */}
            <div className="grid grid-cols-4 relative z-10">
              {STEPS_CONFIG.map((s, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const canJump = canJumpToStep(idx);

                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canJump}
                    onClick={() => handleStepJump(idx)}
                    className={`flex flex-col items-center group transition-all text-center px-0.5 ${canJump ? 'cursor-pointer' : 'cursor-default'
                      }`}
                  >
                    {/* Circle Node */}
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${isCompleted
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/25 group-hover:scale-110 ring-2 ring-amber-500/30'
                          : isActive
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/25 shadow-md shadow-amber-900/40 scale-105'
                            : 'bg-elevated border border-base text-muted/60'
                        }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] sm:text-[11px] font-black">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Title Label */}
                    <div className="mt-1 w-full">
                      <span
                        className={`block text-[9.5px] sm:text-[10px] font-bold tracking-tight truncate leading-tight transition-colors ${isActive
                            ? 'text-amber-500 dark:text-amber-400 font-extrabold'
                            : isCompleted
                              ? 'text-primary group-hover:text-amber-500'
                              : 'text-muted/60'
                          }`}
                      >
                        {s.label}
                      </span>
                      <span className="hidden sm:block text-[8.5px] uppercase font-semibold text-muted/50 tracking-wider">
                        Step {idx + 1}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Active Step Banner with percentage and back button */}
          <div className="pt-1.5 border-t border-base/50 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                Step {currentStepIndex + 1} of 4
              </span>
              <span className="font-bold text-slate-900 font-sans truncate text-xs">
                {STEPS_CONFIG[currentStepIndex].fullTitle}
              </span>
            </div>

            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => handleStepJump(currentStepIndex - 1)}
                className="text-[10px] font-semibold text-muted hover:text-primary px-2 py-0.5 rounded-lg bg-elevated hover:bg-surface border border-base hover:border-strong transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUBMISSION CELEBRATION (Rendered in-card when confirmedBookingRef exists)
          ══════════════════════════════════════════════════════════════════════ */}
      {confirmedBookingRef ? (
        <div className="p-4 sm:p-6 space-y-4 text-center animate-fade-in">
          {/* Animated Status Icon */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-500" /> Request Dispatched
            </span>
            <h2 className="text-base sm:text-lg font-bold text-primary">Custom Booking Submitted!</h2>
            <p className="text-xs text-secondary max-w-md mx-auto">
              Your customized itinerary has reached our 24/7 Operations Desk for manual review and competitive quote calculation.
            </p>
          </div>

          {/* Booking Card Details */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-base space-y-2.5 text-left text-xs max-w-lg mx-auto">
            {/* Booking Reference Box */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-elevated border border-base">
              <div>
                <span className="text-[9.5px] text-muted uppercase font-bold tracking-wider block">Booking Reference</span>
                <span className="font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                  {confirmedBookingRef}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyBookingRef(confirmedBookingRef)}
                className="px-2.5 py-1 rounded-md bg-surface hover:bg-base text-primary font-semibold text-xs border border-base flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Copy reference code"
              >
                {isCopiedRef ? (
                  <>
                    <CheckCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-muted" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-base/60">
              <span className="text-muted">Booking Status:</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Pending Dispatcher Review
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-base/60">
              <span className="text-muted">Quoted Fare:</span>
              <span className="font-bold text-amber-500 italic text-[11px]">To be confirmed by Dispatcher (0 SAR Paid)</span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-base/60">
              <span className="text-muted">Assigned Fleet:</span>
              <span className="font-semibold text-primary capitalize">{selectedVehicle?.replace('_', ' ')}</span>
            </div>

            <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong className="block text-amber-700 dark:text-amber-300 font-bold mb-0.5">Next Steps from Our Dispatch Desk:</strong>
                Our operations team will review route stops, compute optimal pricing, and contact you via WhatsApp / call at{' '}
                <strong className="text-primary font-bold">{passengerPhone}</strong> within minutes.
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 max-w-lg mx-auto">
            <Link
              href="/customer/bookings"
              className="btn-primary w-full sm:flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 font-bold shadow-md"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>View Booking in My Rides</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                onResetCustomBooking();
                setStep('route');
              }}
              className="btn-secondary w-full sm:flex-1 py-2.5 text-xs rounded-xl font-semibold cursor-pointer"
            >
              + Book Another Journey
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: ROUTE & INTERMEDIATE STOPS
              ══════════════════════════════════════════════════════════════════ */}
          {step === 'route' && (
            <div className="p-3.5 sm:p-4 space-y-3.5 animate-fade-in">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 mb-1 shadow-2xs">
                    <Navigation className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>Dispatcher Confirmed Route</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Define Your Custom Route</h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    Specify any pickup, destination, and intermediate stops. Our operations desk will quote you directly.
                  </p>
                </div>
              </div>

              {/* Trip Type Selector Toggle (One-Way vs Round Trip) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider">Journey Type</label>
                <div className="grid grid-cols-2 gap-1.5 bg-surface p-1 rounded-xl border border-base">
                  <button
                    type="button"
                    onClick={() => setTripType('one_way')}
                    className={`py-1.5 px-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tripType === 'one_way'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                        : 'text-secondary hover:text-primary hover:bg-elevated'
                      }`}
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>One-Way Journey</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripType('round_trip')}
                    className={`py-1.5 px-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tripType === 'round_trip'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                        : 'text-secondary hover:text-primary hover:bg-elevated'
                      }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Round Trip</span>
                  </button>
                </div>
              </div>

              {/* Locations Card: Pickup, Stops, Destination */}
              <div className="space-y-3">
                {/* 1. Pickup Location */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                      Pickup Location *
                    </label>
                    <button
                      type="button"
                      onClick={onUseCurrentLocation}
                      className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      Use GPS
                    </button>
                  </div>

                  <div
                    onClick={() => onOpenSearch('pickup')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenSearch('pickup')}
                    className="w-full text-left p-2.5 rounded-xl border border-base bg-surface hover:bg-elevated hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between gap-2.5 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={`text-xs truncate ${pickup ? 'font-semibold text-primary' : 'text-muted'}`}>
                        {pickup?.address || 'Search pickup hotel, terminal, or address…'}
                      </span>
                    </div>
                    <Search className="w-3.5 h-3.5 text-muted group-hover:text-emerald-500 transition-colors shrink-0" />
                  </div>
                </div>

                {/* 2. Intermediate Stops */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-cyan-500/30" />
                      Intermediate Stops (Optional)
                    </label>
                    {stops.length < 5 && (
                      <button
                        type="button"
                        onClick={onAddStop}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        + Add Stop
                      </button>
                    )}
                  </div>

                  {stops.length === 0 ? (
                    <div className="p-2.5 rounded-xl border border-dashed border-base/80 bg-surface/30 text-center space-y-0.5">
                      <p className="text-[11px] text-muted">
                        No intermediate stops added yet.
                      </p>
                      <p className="text-[10px] text-muted/70">
                        (e.g., Ziyarat sacred shrines, hotel luggage drop, grocery stopover, prayer pause).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {stops.map((stop, idx) => (
                        <div
                          key={stop.id}
                          className="p-2.5 rounded-xl border border-base bg-surface flex items-center justify-between gap-2 transition-all hover:border-cyan-500/40"
                        >
                          <div
                            onClick={() => onOpenSearch(`stop_${idx}` as any)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onOpenSearch(`stop_${idx}` as any)}
                            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          >
                            <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[9.5px] font-black flex items-center justify-center shrink-0 border border-cyan-500/30">
                              {idx + 1}
                            </span>
                            <div className="truncate flex-1 min-w-0">
                              <span className="text-[9px] text-muted block uppercase font-bold">Stop #{idx + 1}</span>
                              <span className={`text-xs truncate block ${stop.address ? 'font-semibold text-primary' : 'text-muted'}`}>
                                {stop.address || 'Select stop location…'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveStop(stop.id)}
                            className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer active:scale-95"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Destination Location */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
                      Final Destination *
                    </label>
                    {pickup && destination && (
                      <button
                        type="button"
                        onClick={onSwapPickupDestination}
                        className="text-[10px] font-semibold text-muted hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                        title="Swap Pickup and Destination"
                      >
                        Swap ⇄
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => onOpenSearch('destination')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenSearch('destination')}
                    className="w-full text-left p-2.5 rounded-xl border border-base bg-surface hover:bg-elevated hover:border-amber-500/50 transition-all cursor-pointer flex items-center justify-between gap-2.5 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className={`text-xs truncate ${destination ? 'font-semibold text-primary' : 'text-muted'}`}>
                        {destination?.address || 'Search destination city, hotel, or landmark…'}
                      </span>
                    </div>
                    <Search className="w-3.5 h-3.5 text-muted group-hover:text-amber-500 transition-colors shrink-0" />
                  </div>
                </div>
              </div>

              {/* Journey Metrics Display (Distance & Driving Duration strictly without fare) */}
              {isRouting ? (
                <div className="p-2.5 rounded-xl bg-surface border border-base flex items-center justify-center gap-2 text-xs text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Computing route distance and driving duration…</span>
                </div>
              ) : distanceKm > 0 ? (
                <div className="p-2.5 rounded-xl bg-surface/70 border border-base text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-secondary">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Est. Driving: <strong className="text-primary">{durationMinutes} min</strong></span>
                  </div>
                  <div className="text-muted text-[11px] shrink-0">
                    Distance: <strong className="text-secondary">{distanceKm.toFixed(1)} km</strong>
                  </div>
                </div>
              ) : null}

              {routeError && (
                <p className="text-xs text-rose-500 italic bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {routeError}
                </p>
              )}

              {/* Mandatory Dispatcher Confirmation Notice Banner */}
              <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-700 dark:text-amber-300 block text-xs">
                    Fare will be confirmed by our dispatcher.
                  </span>
                  <p className="text-[10.5px] text-amber-700/90 dark:text-amber-200/90 leading-relaxed">
                    Custom multi-stop itineraries are individually priced based on exact distance, wait time, and vehicle availability. No payment is required until you approve the quote.
                  </p>
                </div>
              </div>

              {/* Continue Action Button */}
              <button
                type="button"
                onClick={handleProceedToVehicle}
                disabled={!pickup || !destination}
                className="btn-primary w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                <span>Continue to Vehicle Selection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: VEHICLE CATEGORY SELECTION
              ══════════════════════════════════════════════════════════════════ */}
          {step === 'vehicle' && (
            <div className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 mb-1 shadow-2xs">
                    <Car className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>VIP Fleet Selection</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Choose Preferred Vehicle</h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    Select the ideal VIP vehicle category for your custom route itinerary.
                  </p>
                </div>
              </div>

              {/* Vehicle Options Grid */}
              <div className="space-y-2.5">
                {CUSTOM_VEHICLE_OPTIONS.map((item) => {
                  const isSelected = selectedVehicle === item.category;
                  return (
                    <div
                      key={item.category}
                      onClick={() => setSelectedVehicle(item.category)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedVehicle(item.category)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${isSelected
                          ? 'bg-amber-500/10 border-amber-500/70 shadow-sm ring-2 ring-amber-500/30'
                          : 'bg-surface border-base hover:border-amber-500/30 hover:bg-elevated'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-primary">{item.title}</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-surface border border-base text-muted">
                              {item.badge}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted font-medium mt-0.5">{item.subtitle}</p>

                          {/* Capacity badges */}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-secondary">
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="w-3 h-3 text-amber-500" />
                              Up to {item.capacityPax} Pax
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Luggage className="w-3 h-3 text-amber-500" />
                              Up to {item.capacityLuggage} Bags
                            </span>
                          </div>

                          {/* Perks */}
                          <div className="mt-2 space-y-1">
                            {item.perks.map((p, i) => (
                              <div key={i} className="text-[10px] text-muted flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dispatcher Rate Badge */}
                        <div className="text-right shrink-0">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Custom Quote
                          </span>
                          <span className="block text-[9.5px] text-muted mt-0.5">By Dispatcher</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mandatory Dispatcher Confirmation Callout */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-bold text-amber-700 dark:text-amber-300 block">
                    No upfront automated rate is billed.
                  </span>
                  <span className="text-[10.5px] text-amber-700/80 dark:text-amber-200/80">
                    Our operations desk calculates the best available VIP quote based on your route distance and vehicle category.
                  </span>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('route')}
                  className="btn-secondary flex-1 py-2.5 text-xs rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProceedToDetails}
                  disabled={!selectedVehicle}
                  className="btn-primary flex-[2] py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  <span>Continue to Passenger Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: PASSENGER & SCHEDULE DETAILS
              ══════════════════════════════════════════════════════════════════ */}
          {step === 'details' && (
            <form onSubmit={handleProceedToReview} className="p-3.5 sm:p-4 space-y-3 animate-fade-in text-xs">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 mb-1 shadow-2xs">
                    <Calendar className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>Schedule &amp; Contact</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Schedule &amp; Passenger Information</h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    Provide your travel details so our operations desk can coordinate vehicle dispatch and contact you.
                  </p>
                </div>
              </div>

              {/* Lead Passenger Name & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-amber-500" /> Lead Passenger Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="e.g., Ahsan Rashid"
                    className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-emerald-500" /> WhatsApp Contact *
                  </label>
                  <input
                    type="tel"
                    required
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="+966 5x xxx xxxx / International"
                    className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9.5px] text-muted block mt-0.5">Dispatcher will quote you via WhatsApp</span>
                </div>
              </div>

              {/* Schedule: Date, Time & Pax Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Pickup Date *</label>
                  <input
                    type="date"
                    required
                    min={todayDateString}
                    value={journeyDate}
                    onChange={(e) => setJourneyDate(e.target.value)}
                    className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Pickup Time *</label>
                  <input
                    type="time"
                    required
                    value={journeyTime}
                    onChange={(e) => setJourneyTime(e.target.value)}
                    className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Passengers</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedVehicleObj?.capacityPax || 14}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs text-center font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Round Trip Return Schedule Card */}
              {tripType === 'round_trip' && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Return Journey Schedule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Return Date *</label>
                      <input
                        type="date"
                        required
                        min={journeyDate || todayDateString}
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Return Pickup Time *</label>
                      <input
                        type="time"
                        required
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="w-full px-3 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-muted" /> Special Instructions / Requests (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Flight number, waiting request at stops, child car seats, luggage notes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary placeholder:text-muted text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('vehicle')}
                  className="btn-secondary flex-1 py-2.5 text-xs rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-[2] py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Review Journey Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 4: REVIEW & DISPATCHER SUBMISSION
              ══════════════════════════════════════════════════════════════════ */}
          {step === 'review' && (
            <div className="p-3.5 sm:p-4 space-y-3 animate-fade-in text-xs">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 mb-1 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>Dispatcher Itinerary Review</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Review Journey &amp; Submit</h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    Verify your custom route specifications. Our dispatch desk will confirm the best direct fare.
                  </p>
                </div>
              </div>

              {/* Itinerary Summary Card */}
              <div className="p-3 rounded-xl bg-surface border border-base space-y-2.5">
                <div className="flex items-center justify-between text-muted text-[10.5px] border-b border-base/60 pb-1.5">
                  <span className="font-bold text-secondary uppercase tracking-wider">Itinerary Details</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {tripType === 'round_trip' ? 'Round Trip Journey' : 'One-Way Journey'}
                  </span>
                </div>

                {/* Route Trail */}
                <div className="space-y-1.5">
                  {pickup && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0 ring-2 ring-emerald-500/30" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted text-[9.5px] uppercase font-bold block">Pickup Location</span>
                        <p className="font-semibold text-primary text-xs break-words">{pickup.address}</p>
                      </div>
                    </div>
                  )}

                  {stops.map((stop, i) => (
                    <div key={stop.id} className="flex items-start gap-2 pl-2.5 border-l-2 border-dashed border-cyan-500/40 my-0.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted text-[9.5px] uppercase font-bold block">Stop #{i + 1}</span>
                        <p className="font-semibold text-secondary text-xs break-words">{stop.address}</p>
                      </div>
                    </div>
                  ))}

                  {destination && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0 ring-2 ring-amber-500/30" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted text-[9.5px] uppercase font-bold block">Final Destination</span>
                        <p className="font-semibold text-amber-600 dark:text-amber-400 text-xs break-words">{destination.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule, Fleet, Passenger Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-base/60 text-[10.5px]">
                  <div>
                    <span className="text-muted text-[9.5px] block">Departure</span>
                    <span className="font-semibold text-primary">{journeyDate} at {journeyTime}</span>
                  </div>
                  {tripType === 'round_trip' && (
                    <div>
                      <span className="text-muted text-[9.5px] block">Return Pickup</span>
                      <span className="font-semibold text-primary">{returnDate} at {returnTime}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted text-[9.5px] block">Selected Fleet</span>
                    <span className="font-semibold text-amber-500 capitalize">{selectedVehicle?.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9.5px] block">Passengers</span>
                    <span className="font-semibold text-primary">{passengerCount} Pax</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9.5px] block">Lead Passenger</span>
                    <span className="font-semibold text-primary truncate block">{passengerName}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9.5px] block">WhatsApp Contact</span>
                    <span className="font-semibold text-primary truncate block">{passengerPhone}</span>
                  </div>
                </div>

                {/* Route statistics */}
                {distanceKm > 0 && (
                  <div className="pt-1.5 border-t border-base/60 flex items-center justify-between text-[10.5px] text-muted">
                    <span>Est. Distance: <strong className="text-primary">{distanceKm.toFixed(1)} km</strong></span>
                    <span>Est. Driving: <strong className="text-primary">{durationMinutes} min</strong></span>
                  </div>
                )}

                {specialInstructions && (
                  <div className="pt-1.5 border-t border-base/60 text-[10.5px]">
                    <span className="text-muted">Special Requests: </span>
                    <span className="text-secondary italic">{specialInstructions}</span>
                  </div>
                )}
              </div>

              {/* CRITICAL REQUIREMENT: Prominent High-Visibility Dispatcher Fare Notice */}
              <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/50 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Fare will be confirmed by our dispatcher.</span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Because your journey involves customized routing and stops, our dispatch team will review vehicle availability and calculate our best direct quotation.
                </p>

                {/* Fare quotation status box */}
                <div className="bg-surface/90 p-2.5 rounded-lg border border-amber-500/30 font-semibold text-xs flex items-center justify-between">
                  <span className="text-secondary text-[11px]">Quotation Status:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold italic text-[11px]">
                    To be confirmed by Dispatcher (0 SAR upfront)
                  </span>
                </div>

                <p className="text-[10px] text-muted italic">
                  * You do not need to make any payment right now. The dispatcher will contact you via WhatsApp / phone to confirm the price and payment options.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="btn-secondary flex-1 py-2.5 text-xs rounded-xl cursor-pointer"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={onSubmitCustomBooking}
                  disabled={isSubmitting}
                  className="btn-primary flex-[2] py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submit Custom Booking Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
