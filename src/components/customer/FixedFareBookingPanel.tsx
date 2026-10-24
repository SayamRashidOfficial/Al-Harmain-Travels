'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ServiceType,
  TerminalCode,
  VehicleCategory,
  LocationPoint,
  SavedPlace,
  RecentLocation,
  SavedPlaceType,
  FixedFareRate,
} from '@/types';
import {
  resolveFixedFare,
  formatFareSAR,
  SERVICE_LABELS,
  VEHICLE_LABELS,
  VEHICLE_CAPACITY,
  TERMINAL_LABELS,
  getActiveServiceTypes,
  getActiveTerminalsForService,
  getVehicleLabel,
  getServiceLabel,
  getVehicleCapacity,
} from '@/lib/fixed-fare';
import { useApp } from '@/context/AppContext';
import {
  Route,
  MapPin,
  Plane,
  Car,
  Users,
  Luggage,
  User,
  Phone,
  Calendar,
  Clock,
  Receipt,
  UploadCloud,
  FileImage,
  CheckCircle2,
  Check,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Copy,
  RotateCcw,
  X,
  Crosshair,
  Sparkles,
  Navigation,
  Building2,
  Star,
  Bookmark,
  Home,
  Briefcase,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const TERMINAL_OPTIONS: { code: NonNullable<TerminalCode>; label: string; sub: string }[] = [
  { code: 'terminal_1', label: 'Terminal 1', sub: 'New Main Terminal' },
  { code: 'terminal_h', label: 'Terminal H', sub: 'Hajj & Umrah' },
  { code: 'terminal_n', label: 'Terminal N', sub: 'North Terminal' },
];

export const VEHICLE_CATEGORIES: VehicleCategory[] = ['sedan', 'staria', 'gmc', 'hiroof'];

export const VEHICLE_DESCRIPTIONS: Record<VehicleCategory, { subtitle: string; highlights: string }> = {
  sedan: {
    subtitle: 'Toyota Camry / Lexus ES or equivalent',
    highlights: 'Executive private sedan for small families or solo pilgrims',
  },
  staria: {
    subtitle: 'Hyundai Staria VIP Business Lounge',
    highlights: 'Ultra-spacious VIP cabin with captain seats & panoramic windows',
  },
  gmc: {
    subtitle: 'GMC Yukon XL / Chevrolet Suburban Royal VIP',
    highlights: 'Flagship presidential SUV with supreme comfort & heavy luggage hold',
  },
  hiroof: {
    subtitle: 'Toyota HiAce High Roof VIP Minibus',
    highlights: 'Luxury high-ceiling minivan perfect for large groups & delegations',
  },
};

export const SERVICE_OPTIONS: {
  type: ServiceType;
  label: string;
  icon: React.ReactNode;
  desc: string;
  badge?: string;
}[] = [
    {
      type: 'intercity_jeddah_makkah',
      label: 'Jeddah → Makkah',
      icon: <Plane className="w-4 h-4" />,
      desc: 'Airport & city transfer to Makkah hotels',
      badge: 'Popular',
    },
    {
      type: 'intercity_makkah_jeddah',
      label: 'Makkah → Jeddah',
      icon: <Navigation className="w-4 h-4" />,
      desc: 'Transfer back to Jeddah city or airport',
    },
    {
      type: 'intercity_makkah_madinah',
      label: 'Makkah → Madinah',
      icon: <Route className="w-4 h-4" />,
      desc: 'Direct highway VIP transfer between holy cities',
      badge: 'Holy Cities',
    },
    {
      type: 'intercity_makkah_madinah_sameday',
      label: 'Makkah → Madinah (Same Day)',
      icon: <Clock className="w-4 h-4" />,
      desc: 'Full-day Makkah ↔ Madinah round-trip transfer',
    },
    {
      type: 'ziyarat_makkah',
      label: 'Makkah Ziyarat',
      icon: <Star className="w-4 h-4" />,
      desc: 'Sacred holy sites tour within Makkah Al-Mukarramah',
      badge: 'Ziyarat',
    },
    {
      type: 'ziyarat_taif',
      label: 'Taif Ziyarat',
      icon: <Star className="w-4 h-4" />,
      desc: 'Scenic mountain excursion & holy sites in Taif',
      badge: 'Ziyarat',
    },
    {
      type: 'ziyarat_taif_bani_saad',
      label: 'Taif + Bani Saad',
      icon: <Star className="w-4 h-4" />,
      desc: 'Comprehensive Taif tour including historical Bani Saad',
      badge: 'Ziyarat',
    },
  ];

export type FixedBookingStep = 'service' | 'route' | 'vehicle' | 'details' | 'summary_payment' | 'submitted';

export interface FixedFareBookingPanelProps {
  bookingStep: FixedBookingStep;
  setBookingStep: (step: FixedBookingStep) => void;
  onResetBooking: () => void;

  // Step 1: Service
  selectedService: ServiceType | null;
  onSelectService: (service: ServiceType) => void;

  // Step 2: Route & Terminal
  selectedTerminal: TerminalCode;
  onSelectTerminal: (terminal: TerminalCode) => void;
  needsTerminal: boolean;
  isZiyarat: boolean;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  onOpenSearch: (field: 'pickup' | 'destination') => void;
  onClearPickup: () => void;
  onClearDestination: () => void;
  onUseCurrentLocation: () => Promise<void>;
  interactiveMode: 'none' | 'pickup' | 'destination';
  onToggleInteractiveMode: (mode: 'none' | 'pickup' | 'destination') => void;
  routeError: string | null;
  savedPlaces: SavedPlace[];
  recentLocations: RecentLocation[];
  onSelectPlace: (place: SavedPlace | RecentLocation | { address: string; latitude: number; longitude: number; name?: string }) => void;
  onOpenAddPlaceModal: (type: SavedPlaceType) => void;
  onClearRecentLocations: () => void;
  onConfirmRoute: () => void;

  // Step 3: Vehicle
  selectedVehicle: VehicleCategory | null;
  onSelectVehicle: (vehicle: VehicleCategory) => void;
  availableVehicles: VehicleCategory[];
  farePreview: ReturnType<typeof resolveFixedFare> | null;
  isFareValidating: boolean;
  onConfirmVehicle: () => Promise<void>;

  // Step 4: Passenger Details
  passengerName: string;
  setPassengerName: (name: string) => void;
  passengerPhone: string;
  setPassengerPhone: (phone: string) => void;
  passengerCount: number;
  setPassengerCount: (count: number) => void;
  journeyDate: string;
  setJourneyDate: (date: string) => void;
  journeyTime: string;
  setJourneyTime: (time: string) => void;
  specialInstructions: string;
  setSpecialInstructions: (instructions: string) => void;
  onDetailsSubmit: (e: React.FormEvent) => void;

  // Step 5: Summary & Payment
  paymentFile: File | null;
  paymentPreviewUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPaymentFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePaymentFile: () => void;
  onConfirmBooking: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;

  // Step 6: Submitted
  confirmedBookingRef: string | null;

  // Live Admin Rates
  activeRates?: FixedFareRate[];
}

const STEPS_CONFIG = [
  { id: 'service', label: 'Service', fullTitle: 'Select Your Service', icon: Route },
  { id: 'route', label: 'Route', fullTitle: 'Route & Airport Terminal', icon: MapPin },
  { id: 'vehicle', label: 'Vehicle', fullTitle: 'Choose Vehicle & Fare', icon: Car },
  { id: 'details', label: 'Details', fullTitle: 'Passenger Details & Schedule', icon: User },
  { id: 'summary_payment', label: 'Payment', fullTitle: 'Summary & Payment Proof', icon: Receipt },
] as const;

export default function FixedFareBookingPanel({
  bookingStep,
  setBookingStep,
  onResetBooking,
  selectedService,
  onSelectService,
  selectedTerminal,
  onSelectTerminal,
  needsTerminal,
  isZiyarat,
  pickup,
  destination,
  onOpenSearch,
  onClearPickup,
  onClearDestination,
  onUseCurrentLocation,
  interactiveMode,
  onToggleInteractiveMode,
  routeError,
  savedPlaces,
  recentLocations,
  onSelectPlace,
  onOpenAddPlaceModal,
  onClearRecentLocations,
  onConfirmRoute,
  selectedVehicle,
  onSelectVehicle,
  availableVehicles,
  farePreview,
  isFareValidating,
  onConfirmVehicle,
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
  onDetailsSubmit,
  paymentFile,
  paymentPreviewUrl,
  fileInputRef,
  onPaymentFileChange,
  onRemovePaymentFile,
  onConfirmBooking,
  isSubmitting,
  confirmedBookingRef,
  activeRates: propActiveRates,
}: FixedFareBookingPanelProps) {
  const { fixedFareRates, rateVehicles, rateRoutes, rateTerminals } = useApp();

  // Compute active rates: prioritize passed prop or fetch from global store
  const activeRates = useMemo(() => {
    if (propActiveRates && propActiveRates.length > 0) return propActiveRates;
    return (fixedFareRates || []).filter((r) => r.is_active);
  }, [propActiveRates, fixedFareRates]);

  // Determine active services configured in Admin Rate List
  const activeServiceTypes = useMemo(() => {
    return getActiveServiceTypes(activeRates, rateRoutes);
  }, [activeRates, rateRoutes]);

  // Determine active terminals for currently selected route
  const activeTerminals = useMemo(() => {
    if (!selectedService) return [];
    return getActiveTerminalsForService(selectedService, activeRates, rateTerminals);
  }, [selectedService, activeRates, rateTerminals]);

  // Build service options list: dynamically populated from rateRoutes and active rates
  const displayedServices = useMemo(() => {
    const list: typeof SERVICE_OPTIONS = [];
    const processed = new Set<string>();

    // 1. Add active routes from database
    if (rateRoutes && rateRoutes.length > 0) {
      rateRoutes
        .filter((r) => r.is_active)
        .forEach((r) => {
          if (activeServiceTypes.length === 0 || activeServiceTypes.includes(r.id)) {
            list.push({
              type: r.id as ServiceType,
              label: r.route_name,
              icon: r.is_airport ? <Plane className="w-4 h-4 text-emerald-500" /> : <Route className="w-4 h-4 text-emerald-500" />,
              desc: `${r.origin_name} → ${r.destination_name}`,
              badge: r.is_airport ? 'Airport KAIA' : undefined,
            });
            processed.add(r.id);
          }
        });
    }

    // 2. Add canonical standard options that are active and not yet added
    SERVICE_OPTIONS.forEach((svc) => {
      if (activeServiceTypes.includes(svc.type) && !processed.has(svc.type)) {
        list.push(svc);
        processed.add(svc.type);
      }
    });

    // 3. Fallback to any remaining active service types
    activeServiceTypes.forEach((st) => {
      if (!processed.has(st)) {
        list.push({
          type: st as ServiceType,
          label: getServiceLabel(st, rateRoutes),
          icon: <Route className="w-4 h-4 text-emerald-500" />,
          desc: 'VIP route configured by Operations',
          badge: 'Available',
        });
        processed.add(st);
      }
    });

    return list;
  }, [activeServiceTypes, rateRoutes]);

  // Current step index (0 to 4)
  const currentStepIndex = useMemo(() => {
    const idx = STEPS_CONFIG.findIndex((s) => s.id === bookingStep);
    return idx >= 0 ? idx : 0;
  }, [bookingStep]);

  // Check if a specific step is accessible (can click to jump back)
  const canJumpToStep = (index: number) => {
    if (bookingStep === 'submitted') return false;
    // Can jump backwards to any completed step
    if (index < currentStepIndex) return true;
    return false;
  };

  const handleStepJump = (index: number) => {
    if (canJumpToStep(index)) {
      setBookingStep(STEPS_CONFIG[index].id);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } else {
      toast.info(`${label}: ${text}`);
    }
  };

  // Find saved home & work
  const homePlace = useMemo(() => savedPlaces.find((p) => p.type === 'home'), [savedPlaces]);
  const workPlace = useMemo(() => savedPlaces.find((p) => p.type === 'work'), [savedPlaces]);
  const customPlaces = useMemo(() => savedPlaces.filter((p) => p.type === 'custom'), [savedPlaces]);

  // Dynamic Max capacity for current vehicle
  const currentVehicleObj = useMemo(() => {
    return rateVehicles?.find((v) => v.id === selectedVehicle || v.category === selectedVehicle);
  }, [rateVehicles, selectedVehicle]);

  const currentMaxPax = currentVehicleObj?.seating_capacity || (selectedVehicle ? (VEHICLE_CAPACITY[selectedVehicle]?.passengers || 7) : 7);

  // Dynamic available vehicle categories list
  const displayVehicles = useMemo(() => {
    const list: string[] = [];
    if (rateVehicles && rateVehicles.length > 0) {
      rateVehicles.filter(v => v.is_active).forEach(v => {
        if (!list.includes(v.category)) list.push(v.category);
      });
    }
    VEHICLE_CATEGORIES.forEach(c => {
      if (!list.includes(c)) list.push(c);
    });
    return list;
  }, [rateVehicles]);

  return (
    <div className="bg-card border border-base rounded-2xl shadow-lg overflow-hidden flex flex-col w-full transition-all">
      {/* ── TOP STEPPER HEADER ──────────────────────────────────────────────── */}
      {bookingStep !== 'submitted' && (
        <div className="border-b border-base bg-surface/50 backdrop-blur-md px-3 sm:px-4 pt-3 pb-2.5 space-y-2">
          {/* Universal 5-Step Stepper Nodes with connecting track line */}
          <div className="relative w-full">
            {/* Background Connecting Track Line (connecting center of first to last node) */}
            <div className="absolute top-3 sm:top-3.5 left-[10%] right-[10%] h-0.5 bg-base -translate-y-1/2 z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${(currentStepIndex / (STEPS_CONFIG.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* 5 Step Nodes in a 5-column grid: 100% width, exactly 20% each */}
            <div className="grid grid-cols-5 relative z-10">
              {STEPS_CONFIG.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const isUpcoming = idx > currentStepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isCompleted}
                    onClick={() => handleStepJump(idx)}
                    className={`flex flex-col items-center group transition-all text-center px-0.5 ${isCompleted ? 'cursor-pointer' : 'cursor-default'
                      }`}
                  >
                    {/* Circle Node */}
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${isCompleted
                        ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25 group-hover:scale-110 ring-2 ring-emerald-500/30'
                        : isActive
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/25 shadow-md shadow-emerald-900/40 scale-105'
                          : 'bg-slate-100 border border-slate-300 text-slate-700 font-bold'
                        }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] sm:text-xs font-black">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Title Label */}
                    <div className="mt-1 w-full">
                      <span
                        className={`block text-[9.5px] sm:text-[10.5px] font-bold tracking-tight truncate leading-tight transition-colors ${isActive
                          ? 'text-emerald-700 font-black'
                          : isCompleted
                            ? 'text-slate-900 group-hover:text-emerald-600'
                            : 'text-slate-700 font-bold'
                          }`}
                      >
                        {step.label}
                      </span>
                      <span className="hidden sm:block text-[8.5px] uppercase font-bold text-slate-600 tracking-wider">
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
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Step {currentStepIndex + 1} of 5
              </span>
              <span className="font-bold text-slate-900 font-sans truncate text-xs">
                {STEPS_CONFIG[currentStepIndex].fullTitle}
              </span>
            </div>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => handleStepJump(currentStepIndex - 1)}
                className="text-[10.5px] font-bold text-slate-700 hover:text-slate-950 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 1: SERVICE SELECTION ────────────────────────────────────────── */}
      {bookingStep === 'service' && (
        <div className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 mb-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Guaranteed Fixed Pricing</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Select Your Service</h2>
              <p className="text-[11.5px] text-slate-600 mt-0.5">
                Choose a predefined VIP route or sacred holy tour with all-inclusive rates.
              </p>
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
            {displayedServices.length === 0 ? (
              <div className="p-6 text-center bg-surface/40 rounded-xl border border-base space-y-1.5">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-primary">No Fixed-Fare Routes Currently Active</p>
                <p className="text-[10.5px] text-muted">
                  The operations desk is currently updating tariffs. Please choose Custom Route Booking or check back shortly.
                </p>
              </div>
            ) : (
              displayedServices.map((svc) => {
                const isSelected = selectedService === svc.type;

                return (
                  <button
                    key={svc.type}
                    type="button"
                    onClick={() => onSelectService(svc.type)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all group cursor-pointer flex items-center justify-between gap-2.5 relative overflow-hidden ${isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-surface/60 border-base hover:border-emerald-500/50 hover:bg-surface hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/25'
                          : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 group-hover:scale-105'
                          }`}
                      >
                        {svc.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-primary group-hover:text-emerald-700 transition-colors">
                            {svc.label}
                          </span>
                          {svc.badge && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              {svc.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 truncate mt-0.5 font-medium">{svc.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-elevated border border-base/70 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-700 transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-base/80 flex items-center gap-2 text-[11px] text-slate-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>All fixed-fare rates are licensed by KSA Transport General Authority.</span>
          </div>
        </div>
      )}

      {/* ── STEP 2: ROUTE & TERMINAL SELECTION ────────────────────────────────── */}
      {bookingStep === 'route' && selectedService && (
        <div className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
          {/* Header — dynamic route identity */}
          {(() => {
            // Derive Origin → Destination from rateRoutes (live admin data), fallback to SERVICE_LABELS
            const matchedRoute = rateRoutes?.find((r) => r.id === selectedService);
            const originName = matchedRoute?.origin_name || '';
            const destinationName = matchedRoute?.destination_name || '';
            const routeLabel =
              originName && destinationName
                ? `${originName} → ${destinationName}`
                : SERVICE_LABELS[selectedService] || selectedService;
            return (
              <div className="space-y-2">
                {/* Route identity: location icon + Origin → Destination */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                    <MapPin className="w-3.5 h-3.5 text-slate-950" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-950 leading-tight tracking-tight">
                    {routeLabel}
                  </span>
                </div>

                {/* Heading & description */}
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans leading-tight">Specify Pickup &amp; Route</h2>
                  <p className="text-[11.5px] text-slate-700 font-medium mt-0.5">
                    {isZiyarat
                      ? 'Enter your hotel or accommodation for sacred tour pickup.'
                      : 'Enter pickup and destination details for this VIP transfer.'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Jeddah Airport Terminal Selector (if applicable) */}
          {needsTerminal && (
            <div className="p-3 rounded-xl bg-surface/70 border border-amber-400/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-amber-600" />
                  Jeddah Airport Terminal <span className="text-rose-500">*</span>
                </label>
                <span className="text-[9.5px] font-bold text-amber-900 uppercase tracking-wider">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {TERMINAL_OPTIONS.map((t) => {
                  const isAvailable =
                    activeTerminals.length === 0 ||
                    activeTerminals.includes('all_terminals' as any) ||
                    activeTerminals.includes(t.code as any);
                  const isSelected = selectedTerminal === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelectTerminal(t.code)}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${!isAvailable
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-500'
                        : isSelected
                          ? 'bg-amber-100 border-amber-500 text-amber-950 ring-1 ring-amber-500/30 font-bold shadow-sm'
                          : 'bg-card border-slate-200 text-slate-800 hover:border-amber-500/40 hover:bg-slate-50 font-medium'
                        }`}
                    >
                      <Plane className={`w-3 h-3 mb-0.5 ${isSelected ? 'text-amber-700' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold leading-tight">{t.label}</span>
                      <span className="text-[9px] text-slate-600 font-medium truncate max-w-full hidden xs:block">
                        {isAvailable ? t.sub : 'Unavailable'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!selectedTerminal && (
                <p className="text-[10.5px] text-amber-900 font-semibold flex items-center gap-1 pt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                  Please select your arrival or departure terminal at Jeddah Airport.
                </p>
              )}
            </div>
          )}

          {/* Pickup Location Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pickup Location {isZiyarat && '(Hotel / Residence)'}
              </span>

              <button
                type="button"
                onClick={onUseCurrentLocation}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Crosshair className="w-3 h-3 text-emerald-500" />
                <span>Use Live GPS</span>
              </button>
            </div>

            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-sm">
                  <MapPin className="w-3 h-3" />
                </div>
              </div>

              <input
                type="text"
                readOnly
                onClick={() => onOpenSearch('pickup')}
                value={pickup?.address || ''}
                placeholder="Search pickup: hotel, landmark, airport…"
                className="w-full pl-10 pr-8 py-2 rounded-xl bg-input border border-base text-primary font-medium text-xs h-9 sm:h-9.5 focus:outline-none focus:border-emerald-500 cursor-pointer transition-all shadow-sm placeholder:text-muted truncate hover:border-strong"
              />

              {pickup && (
                <button
                  type="button"
                  onClick={onClearPickup}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-rose-500 hover:bg-elevated transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Destination Box (if not Ziyarat) */}
          {!isZiyarat && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Destination
                </span>

                <button
                  type="button"
                  onClick={() => onToggleInteractiveMode(interactiveMode === 'destination' ? 'none' : 'destination')}
                  className={`text-[9.5px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all cursor-pointer ${interactiveMode === 'destination'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-elevated border-base text-muted hover:text-primary'
                    }`}
                >
                  <MapPin className="w-2.5 h-2.5" />
                  <span>{interactiveMode === 'destination' ? 'Pinning Mode' : 'Pick on Map'}</span>
                </button>
              </div>

              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                    <Navigation className="w-3 h-3" />
                  </div>
                </div>

                <input
                  type="text"
                  readOnly
                  onClick={() => onOpenSearch('destination')}
                  value={destination?.address || ''}
                  placeholder="Search destination: holy mosque, hotel, city…"
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-input border border-base text-primary font-medium text-xs h-9 sm:h-9.5 focus:outline-none focus:border-amber-500 cursor-pointer transition-all shadow-sm placeholder:text-muted truncate hover:border-strong"
                />

                {destination && (
                  <button
                    type="button"
                    onClick={onClearDestination}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-rose-500 hover:bg-elevated transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ziyarat Tour Info Banner */}
          {isZiyarat && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200 space-y-0.5">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Predefined Sacred Sites Itinerary</span>
              </div>
              <p className="text-[10.5px] text-muted leading-relaxed">
                Your VIP chauffeur picks you up from your hotel and guides you through all sacred Ziyarat locations. No destination address is required.
              </p>
            </div>
          )}

          {/* Saved Places Shortcuts */}
          {(homePlace || workPlace || customPlaces.length > 0) && !isZiyarat && (
            <div className="pt-1.5 border-t border-base/70">
              <div className="text-[9.5px] font-bold text-muted uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saved Shortcuts</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {homePlace && (
                  <button
                    type="button"
                    onClick={() => onSelectPlace(homePlace)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-elevated hover:bg-emerald-500/10 border border-base hover:border-emerald-500/30 text-primary text-[10.5px] font-semibold transition-all cursor-pointer"
                  >
                    <Home className="w-3 h-3 text-emerald-500" />
                    <span>Home</span>
                  </button>
                )}
                {workPlace && (
                  <button
                    type="button"
                    onClick={() => onSelectPlace(workPlace)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-elevated hover:bg-amber-500/10 border border-base hover:border-amber-500/30 text-primary text-[10.5px] font-semibold transition-all cursor-pointer"
                  >
                    <Briefcase className="w-3 h-3 text-amber-500" />
                    <span>Work</span>
                  </button>
                )}
                {customPlaces.slice(0, 2).map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => onSelectPlace(cp)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-elevated border border-base text-primary text-[10.5px] font-semibold transition-all cursor-pointer"
                  >
                    <Bookmark className="w-3 h-3 text-emerald-500" />
                    <span className="truncate max-w-[85px]">{cp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Route Error */}
          {routeError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{routeError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1.5">
            <button
              type="button"
              disabled={(!isZiyarat && !pickup) || (needsTerminal && !selectedTerminal)}
              onClick={onConfirmRoute}
              className="w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-500 flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              <span>Continue to Vehicle Selection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: VEHICLE SELECTION ────────────────────────────────────────── */}
      {bookingStep === 'vehicle' && selectedService && (
        <div className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 mb-1 shadow-2xs">
                <Car className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>Fleet &amp; Fixed Fares</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Choose Your Vehicle</h2>
              <p className="text-[11.5px] text-slate-600 mt-0.5">
                Exact fixed fares verified by Al Harmain operations. No meter, no surge.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBookingStep('route')}
              className="px-2 py-1 rounded-lg bg-elevated border border-base hover:border-strong text-secondary text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          {/* Current Route Snapshot */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-base flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-primary truncate text-xs">{getServiceLabel(selectedService, rateRoutes)}</span>
            </div>
            {selectedTerminal && (
              <span className="px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9.5px] font-bold border border-amber-500/30 shrink-0">
                {TERMINAL_LABELS[selectedTerminal as NonNullable<TerminalCode>] || rateTerminals.find(t => t.id === selectedTerminal || t.code === selectedTerminal)?.name || selectedTerminal}
              </span>
            )}
          </div>

          {/* Vehicle Cards Grid */}
          <div className="space-y-2">
            {displayVehicles.map((cat) => {
              const isAvailable = availableVehicles.includes(cat);
              const fare = isAvailable ? resolveFixedFare(cat, selectedService, selectedTerminal, activeRates) : null;
              const isSelected = selectedVehicle === cat;
              const dynV = rateVehicles?.find((v) => v.id === cat || v.category === cat);
              const cap = dynV
                ? { passengers: dynV.seating_capacity, luggage: dynV.luggage_capacity }
                : getVehicleCapacity(cat, rateVehicles);
              const desc = (VEHICLE_DESCRIPTIONS as any)[cat] || {
                subtitle: dynV?.description || `${cap.passengers}-seater executive VIP vehicle`,
                highlights: 'Private VIP chauffeur service with flight tracking and direct pickup',
              };
              const vLabel = dynV?.name || getVehicleLabel(cat, rateVehicles);

              return (
                <button
                  key={cat}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelectVehicle(cat)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-1.5 ${!isAvailable
                    ? 'opacity-40 cursor-not-allowed bg-surface/40 border-base'
                    : isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20 shadow-sm'
                      : 'bg-card border-base hover:border-emerald-500/40 hover:bg-surface'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Selection Radio Dot */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                          : 'border-muted bg-transparent'
                          }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-emerald-700 font-extrabold' : 'text-primary'
                              }`}
                          >
                            {vLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 truncate font-medium">{desc.subtitle}</p>
                      </div>
                    </div>

                    {/* Fare Display */}
                    <div className="text-right shrink-0">
                      {fare?.found ? (
                        <div>
                          <div className="font-black text-sm sm:text-base text-emerald-700 leading-tight">
                            {formatFareSAR(fare.fare)}
                          </div>
                          <div className="text-[8.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1 justify-end">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            Fixed Fare
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold">Unavailable</span>
                      )}
                    </div>
                  </div>

                  {/* Specs footer */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-base/60 text-[11px] text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 font-bold text-slate-900">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> {cap.passengers} Pax
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-slate-900">
                        <Luggage className="w-3.5 h-3.5 text-amber-600" /> {cap.luggage} Bags
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium italic hidden xs:inline">{desc.highlights}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="pt-1.5">
            <button
              type="button"
              disabled={!selectedVehicle || isFareValidating}
              onClick={onConfirmVehicle}
              className="w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-500 flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              {isFareValidating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Verifying Server Fare…</span>
                </>
              ) : (
                <>
                  <span>Continue to Passenger Details</span>
                  {selectedVehicle && farePreview?.found && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-white font-black text-[11px]">
                      {formatFareSAR(farePreview.fare)}
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: PASSENGER DETAILS & SCHEDULE ──────────────────────────────── */}
      {bookingStep === 'details' && selectedService && selectedVehicle && (
        <form onSubmit={onDetailsSubmit} className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 mb-1 shadow-2xs">
                <User className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>Step 4 of 5</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Passenger &amp; Schedule</h2>
              <p className="text-[11.5px] text-slate-600 mt-0.5">
                Provide passenger details and exact pickup timing for your VIP chauffeur.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBookingStep('vehicle')}
              className="px-2 py-1 rounded-lg bg-elevated border border-base hover:border-strong text-secondary text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          {/* Quick Itinerary Pill */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-base flex items-center justify-between text-xs gap-2">
            <div className="truncate">
              <span className="font-bold text-primary">{SERVICE_LABELS[selectedService]}</span>
              {selectedTerminal && (
                <span className="text-amber-500 ml-1 font-semibold">({TERMINAL_LABELS[selectedTerminal]})</span>
              )}
              <div className="text-[10px] text-muted">{VEHICLE_LABELS[selectedVehicle]}</div>
            </div>
            {farePreview?.found && (
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm shrink-0">
                {formatFareSAR(farePreview.fare)}
              </span>
            )}
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                Lead Passenger Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="e.g. Sheikh Mohammed"
                  className="w-full pl-8 pr-2.5 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                Phone (WhatsApp Enabled) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="w-full pl-8 pr-2.5 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                Journey Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                Pickup Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  required
                  value={journeyTime}
                  onChange={(e) => setJourneyTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                Passengers (Max {currentMaxPax})
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min={1}
                  max={currentMaxPax}
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  className="w-full pl-8 pr-2.5 py-1.5 h-8.5 sm:h-9 rounded-lg bg-input border border-base text-primary text-xs text-center font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
              Flight Details / Special Requests (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Flight SV-124 arriving from London, child seat needed, extra baggage assistance"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary placeholder:text-muted text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setBookingStep('vehicle')}
              className="btn-secondary flex-1 py-2.5 text-xs rounded-xl"
            >
              Back
            </button>
            <button
              type="submit"
              className="btn-primary flex-[2] py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer"
            >
              <span>Continue to Summary &amp; Payment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 5: SUMMARY & PAYMENT ────────────────────────────────────────── */}
      {bookingStep === 'summary_payment' && selectedService && selectedVehicle && (
        <form onSubmit={onConfirmBooking} className="p-3.5 sm:p-4 space-y-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 mb-1 shadow-2xs">
                <Receipt className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Final Step 5 of 5</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">Summary &amp; Payment Proof</h2>
              <p className="text-[11.5px] text-slate-600 mt-0.5">
                Review your VIP itinerary and upload transfer confirmation screenshot.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBookingStep('details')}
              className="px-2 py-1 rounded-lg bg-elevated border border-base hover:border-strong text-secondary text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          {/* Comprehensive Itinerary Card */}
          <div className="rounded-xl bg-surface border border-base p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-700 text-[11px] border-b border-base/60 pb-1.5">
              <span className="font-extrabold text-slate-900 uppercase tracking-wider">VIP Itinerary Overview</span>
              <span className="font-bold text-slate-900">
                {journeyDate} at {journeyTime}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-600 font-bold block text-[10px] uppercase">Service</span>
                <span className="font-bold text-slate-900 truncate block">{SERVICE_LABELS[selectedService]}</span>
              </div>
              {selectedTerminal && (
                <div>
                  <span className="text-slate-600 font-bold block text-[10px] uppercase">Terminal</span>
                  <span className="font-bold text-amber-950 truncate block">{TERMINAL_LABELS[selectedTerminal]}</span>
                </div>
              )}
              <div>
                <span className="text-slate-600 font-bold block text-[10px] uppercase">Chauffeur Vehicle</span>
                <span className="font-bold text-slate-900 truncate block">{VEHICLE_LABELS[selectedVehicle]}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block text-[10px] uppercase">Passengers</span>
                <span className="font-bold text-slate-900">{passengerCount} Pax</span>
              </div>
            </div>

            {/* Route Pins */}
            <div className="pt-1.5 border-t border-base/60 space-y-1">
              {pickup && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-slate-700 text-[10px] uppercase font-bold block">Pickup</span>
                    <p className="font-semibold text-slate-950 text-[11.5px] truncate">{pickup.address}</p>
                  </div>
                </div>
              )}
              {destination && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-slate-700 text-[10px] uppercase font-bold block">Destination</span>
                    <p className="font-semibold text-amber-950 text-[11.5px] truncate">{destination.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Total Fixed Fare Box */}
            {farePreview?.found && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2.5">
                <div>
                  <div className="text-[11.5px] font-black text-emerald-950">
                    Total Guaranteed Fixed Fare
                  </div>
                  <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>All-inclusive VIP rate · Zero surge</span>
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-700 shrink-0">
                  {formatFareSAR(farePreview.fare)}
                </div>
              </div>
            )}
          </div>

          {/* Corporate Bank Payment Details */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300 space-y-2 text-xs">
            <div className="flex items-center justify-between text-amber-950 font-black">
              <span className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                Bank Transfer / Mobile Pay Details
              </span>
              <span className="text-[9.5px] font-mono font-bold uppercase bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                Official Account
              </span>
            </div>

            <p className="text-[11px] text-slate-800 font-medium">
              Transfer <strong className="font-black text-slate-950">{farePreview?.found ? formatFareSAR(farePreview.fare) : 'the fare amount'}</strong> to
              our official verified business account:
            </p>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] space-y-1.5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-800 font-medium">
                <span>Bank:</span>
                <strong className="text-slate-950 font-bold">Al Rajhi Bank / SNB</strong>
              </div>
              <div className="flex justify-between items-center text-slate-800 font-medium">
                <span>Account Name:</span>
                <strong className="text-slate-950 font-bold truncate max-w-[160px]">Al Harmain VIP Transport</strong>
              </div>
              <div className="flex justify-between items-center text-slate-800 font-medium gap-2 pt-1 border-t border-slate-200">
                <span className="shrink-0 font-bold text-slate-900">IBAN:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-amber-950 font-black break-all select-all text-right text-[11px]">
                    SA44 8000 0456 6080 1012 3456
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText('SA4480000456608010123456', 'IBAN')}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-amber-700 transition-colors shrink-0"
                    title="Copy IBAN"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-800 font-medium gap-2">
                <span className="shrink-0 font-bold text-slate-900">STC Pay / Urpay:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-950 font-black select-all text-[11px]">
                    +966 54 888 1234
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText('+966548881234', 'STC Pay')}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition-colors shrink-0"
                    title="Copy Phone"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Proof File Upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                Upload Transfer Screenshot / Receipt <span className="text-rose-500">*</span>
              </span>
              <span className="text-[9.5px] text-muted">Required</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={onPaymentFileChange}
              className="hidden"
              id="payment-receipt-upload"
            />

            {!paymentPreviewUrl ? (
              <label
                htmlFor="payment-receipt-upload"
                className="cursor-pointer border-2 border-dashed border-base hover:border-emerald-500/60 rounded-xl p-3.5 bg-surface/40 hover:bg-surface flex flex-col items-center justify-center text-center gap-1.5 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-primary group-hover:text-emerald-500 transition-colors">
                    Click to Upload Transfer Screenshot
                  </span>
                  <p className="text-[10px] text-muted mt-0.5">PNG, JPG, or WebP (max 10MB)</p>
                </div>
              </label>
            ) : (
              <div className="rounded-xl bg-surface border border-emerald-500/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-primary truncate max-w-[80%]">
                    <FileImage className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate text-xs">{paymentFile?.name || 'Payment Receipt'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemovePaymentFile}
                    className="text-[10px] text-rose-500 hover:text-rose-400 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="relative rounded-lg overflow-hidden max-h-32 border border-base bg-card flex items-center justify-center p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentPreviewUrl}
                    alt="Payment Screenshot Preview"
                    className="max-h-28 object-contain w-full rounded"
                  />
                </div>

                <div className="flex items-center justify-between text-[9.5px] text-muted">
                  <span>Size: {paymentFile ? (paymentFile.size / 1024).toFixed(1) + ' KB' : ''}</span>
                  <label
                    htmlFor="payment-receipt-upload"
                    className="cursor-pointer text-emerald-500 hover:underline font-bold"
                  >
                    Replace Image
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setBookingStep('details')}
              className="btn-secondary flex-1 py-2.5 text-xs rounded-xl"
            >
              Back to Details
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !paymentFile}
              className="btn-primary flex-[2] py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                  <span>Submitting Booking…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Booking &amp; Pay</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 6: BOOKING SUBMITTED (SUCCESS) ──────────────────────────────── */}
      {bookingStep === 'submitted' && confirmedBookingRef && (
        <div className="p-4 sm:p-6 space-y-4 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-0.5">
            <h3 className="text-base sm:text-lg font-bold text-primary">Booking Confirmed &amp; Submitted!</h3>
            <p className="text-xs text-secondary">
              Your VIP chauffeur booking and payment receipt are securely logged in our dispatch desk.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-base space-y-2 text-left text-xs">
            <div className="flex items-center justify-between border-b border-base/60 pb-1.5">
              <span className="text-muted">Booking Reference:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                  {confirmedBookingRef}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(confirmedBookingRef, 'Booking Reference')}
                  className="p-1 rounded-md hover:bg-elevated text-muted hover:text-amber-500"
                  title="Copy Reference"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {selectedService && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Service:</span>
                <span className="font-semibold text-primary">{SERVICE_LABELS[selectedService]}</span>
              </div>
            )}

            {selectedVehicle && farePreview?.found && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Total Fare:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatFareSAR(farePreview.fare)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-muted">Status:</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Pending Verification
              </span>
            </div>

            <p className="text-[10.5px] text-muted pt-1.5 border-t border-base/60 leading-relaxed">
              Our operations desk will verify your payment screenshot. You will receive real-time notifications on
              chauffeur assignment and arrival.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link
              href="/customer/bookings"
              className="btn-primary flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 font-bold"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>View in My Trips</span>
            </Link>

            <Link
              href="/customer/track"
              className="btn-secondary flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 font-bold"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open Live Radar</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={onResetBooking}
            className="text-xs text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer pt-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Book Another Ride</span>
          </button>
        </div>
      )}
    </div>
  );
}
