'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase/client';
import { calculateDistanceKm, estimateDurationMinutes } from '@/lib/geo';
import { VehicleType } from '@/types';
import { formatDriverRating } from '@/lib/driver-stats';
import {
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  Navigation,
  Phone,
  Star,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Bell,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Portal } from '@/components/ui/Modal';

export interface MatchedDriverData {
  id: string;
  name: string;
  photo?: string | null;
  rating: number;
  totalRides: number;
  location?: { latitude: number; longitude: number; heading?: number } | null;
}

export interface MatchedVehicleData {
  vehicleType: string;
  make: string;
  model: string;
  color?: string | null;
  plateNumber: string;
}

interface DriverMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string | null;
  bookingReference?: string | null;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationAddress?: string;
  vehicleType?: VehicleType;
  estimatedFare?: number;
  onAssigned?: (driver: MatchedDriverData, vehicle: MatchedVehicleData) => void;
}

// Phase order:
// 1. searching       — calling matching API, radar animation
// 2. awaiting_driver — driver dispatched, waiting for driver to tap Accept
// 3. assigned        — driver confirmed (driver_accepted status received)
// 4. no_driver       — no driver found / timeout
// 5. error           — API / network error
type MatchPhase = 'searching' | 'awaiting_driver' | 'assigned' | 'no_driver' | 'error';

export default function DriverMatchingModal({
  isOpen,
  onClose,
  bookingId,
  bookingReference,
  pickupAddress,
  pickupLatitude = 21.4225,
  pickupLongitude = 39.8262,
  destinationAddress,
  vehicleType = 'vip_gmc',
  estimatedFare,
  onAssigned,
}: DriverMatchingModalProps) {
  const { settings, cancelBooking, bookings, updateBookingStatus } = useApp();

  const [phase, setPhase] = useState<MatchPhase>('searching');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [awaitingSeconds, setAwaitingSeconds] = useState<number>(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Matched Driver & Vehicle Data (populated after dispatch, shown after acceptance)
  const [matchedDriver, setMatchedDriver] = useState<MatchedDriverData | null>(null);
  const [matchedVehicle, setMatchedVehicle] = useState<MatchedVehicleData | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaFormatted, setEtaFormatted] = useState<string | null>(null);
  const [realBookingId, setRealBookingId] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const awaitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const maxSearchSeconds = 35;
  const maxAwaitSeconds = 120; // Captain has 2 minutes to accept before timeout

  const searchMessages = [
    'Locating nearby executive captains...',
    'Checking chauffeur availability in Makkah & Jeddah...',
    'Matching vehicle class and luxury amenities...',
    'Optimising pickup route and proximity...',
    'Securing captain confirmation...',
  ];

  const awaitMessages = [
    'Notifying your assigned captain...',
    'Captain is reviewing your booking details...',
    'Awaiting captain confirmation...',
    'Captain is preparing to accept...',
    'Waiting for chauffeur to accept ride...',
  ];

  // Recalculate live ETA from driver location to pickup
  const recalculateEta = useCallback(
    (driverLat: number, driverLng: number) => {
      const dist = calculateDistanceKm(driverLat, driverLng, pickupLatitude, pickupLongitude);
      const mins = Math.max(3, estimateDurationMinutes(dist));
      setEtaMinutes(mins);
      const arrival = new Date(Date.now() + mins * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setEtaFormatted(`${mins} mins (${arrival})`);
    },
    [pickupLatitude, pickupLongitude]
  );

  // Called when driver actually confirms (from Realtime or driver portal)
  const handleDriverConfirmed = useCallback(() => {
    setPhase('assigned');
    toast.success('Captain confirmed your ride! They are on the way.', { duration: 5000 });
    if (matchedDriver && matchedVehicle && onAssigned) {
      onAssigned(matchedDriver, matchedVehicle);
    }
  }, [matchedDriver, matchedVehicle, onAssigned]);

  // Trigger server-side matching API
  const runMatching = useCallback(async () => {
    if (!bookingId && !bookingReference) return;

    setPhase('searching');
    setSecondsElapsed(0);
    setAwaitingSeconds(0);
    setErrorMessage('');
    setMatchedDriver(null);
    setMatchedVehicle(null);

    try {
      const res = await fetch('/api/bookings/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId || undefined,
          bookingReference: bookingReference || undefined,
          vehicleType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server error during matching');
      }

      if (data.dispatched && data.driver) {
        // Store driver & vehicle data — driver is dispatched, awaiting manual acceptance
        setMatchedDriver(data.driver);
        setMatchedVehicle(data.vehicle);
        setEtaMinutes(data.etaMinutes);
        setEtaFormatted(data.etaFormatted);
        setRealBookingId(data.bookingId || null);
        setPhase('awaiting_driver');
      } else {
        setPhase('no_driver');
        setErrorMessage(data.message || 'All chauffeurs of this class are currently occupied.');
      }
    } catch (err: any) {
      console.error('Matching failed:', err);
      setPhase('error');
      setErrorMessage(err.message || 'Could not complete driver matching. Please retry.');
    }
  }, [bookingId, bookingReference, vehicleType]);

  // Handle open / close reset
  useEffect(() => {
    if (isOpen) {
      runMatching();
    } else {
      setPhase('searching');
      setSecondsElapsed(0);
      setAwaitingSeconds(0);
      setMatchedDriver(null);
      setMatchedVehicle(null);
      setEtaMinutes(null);
      setEtaFormatted(null);
      setRealBookingId(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: searching phase — elapsed counter + status message rotation + timeout
  useEffect(() => {
    if (phase !== 'searching' || !isOpen) return;
    searchTimerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxSearchSeconds) {
          clearInterval(searchTimerRef.current!);
          setPhase('no_driver');
          setErrorMessage('Search timed out. No available captains responded in time.');
        }
        return next;
      });
      setStatusMessageIndex((prev) => (prev + 1) % searchMessages.length);
    }, 3000);
    return () => { if (searchTimerRef.current) clearInterval(searchTimerRef.current); };
  }, [phase, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: awaiting_driver phase — elapsed counter + message rotation + timeout
  useEffect(() => {
    if (phase !== 'awaiting_driver' || !isOpen) return;
    awaitTimerRef.current = setInterval(() => {
      setAwaitingSeconds((prev) => {
        const next = prev + 1;
        if (next >= maxAwaitSeconds) {
          clearInterval(awaitTimerRef.current!);
          setPhase('no_driver');
          setErrorMessage('The captain did not respond in time. Please search again or contact dispatch.');
        }
        return next;
      });
      setStatusMessageIndex((prev) => (prev + 1) % awaitMessages.length);
    }, 3000);
    return () => { if (awaitTimerRef.current) clearInterval(awaitTimerRef.current); };
  }, [phase, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback to check if captain accepted the booking
  useEffect(() => {
    if (phase !== 'awaiting_driver') return;
    const interval = setInterval(async () => {
      // 1. Check in-memory AppContext
      const targetId = realBookingId || bookingId;
      const memBooking = bookings.find(
        (b) => (targetId && b.id === targetId) || (bookingReference && b.booking_reference === bookingReference)
      );
      if (
        memBooking &&
        (memBooking.status === 'driver_accepted' ||
          memBooking.status === 'driver_arriving' ||
          memBooking.status === 'trip_started' ||
          memBooking.status === 'ride_started')
      ) {
        handleDriverConfirmed();
        return;
      }

      // 2. Check Supabase DB
      if (realBookingId) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realBookingId);
          if (isUuid) {
            const { data } = await supabase
              .from('bookings')
              .select('status')
              .eq('id', realBookingId)
              .maybeSingle();
            if (
              data &&
              (data.status === 'driver_accepted' ||
                data.status === 'driver_arriving' ||
                data.status === 'trip_started' ||
                data.status === 'ride_started')
            ) {
              handleDriverConfirmed();
            }
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [phase, bookingId, bookingReference, realBookingId, bookings, handleDriverConfirmed]);

  // Realtime: listen for booking status → driver_accepted on the real booking row
  useEffect(() => {
    if (!realBookingId || phase !== 'awaiting_driver') return;

    const channel = supabase
      .channel(`booking-accept:${realBookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${realBookingId}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'driver_accepted' || newStatus === 'driver_arriving' || newStatus === 'trip_started') {
            handleDriverConfirmed();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realBookingId, phase, handleDriverConfirmed]);

  // Also watch AppContext bookings in-memory for the driver_accepted change
  // (covers cases where the driver accepts from the same browser session)
  useEffect(() => {
    if (phase !== 'awaiting_driver' || !bookingId) return;
    const booking = bookings.find(
      (b) => b.id === bookingId || b.booking_reference === bookingReference
    );
    if (booking && (booking.status === 'driver_accepted' || booking.status === 'driver_arriving' || booking.status === 'trip_started')) {
      handleDriverConfirmed();
    }
  }, [bookings, phase, bookingId, bookingReference, handleDriverConfirmed]);

  // Realtime: live driver location updates once confirmed
  useEffect(() => {
    if (!matchedDriver?.id || phase !== 'assigned') return;
    const channel = supabase
      .channel(`matching:driver:${matchedDriver.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${matchedDriver.id}`,
        },
        (payload: any) => {
          if (payload.new?.latitude && payload.new?.longitude) {
            const { latitude, longitude, heading } = payload.new;
            setMatchedDriver((prev) =>
              prev ? { ...prev, location: { latitude, longitude, heading: heading || 0 } } : null
            );
            recalculateEta(latitude, longitude);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchedDriver?.id, phase, recalculateEta]);

  const handleCopyRef = () => {
    if (!bookingReference) return;
    navigator.clipboard.writeText(bookingReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast.success('Booking reference copied to clipboard.');
  };

  const handleCancelSearch = async () => {
    if (bookingId) {
      await cancelBooking(bookingId, 'Customer cancelled during chauffeur search');
    }
    toast.info('Driver search cancelled.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="presentation"
        data-modal-overlay="true"
        className="modal-backdrop modal-overlay fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-70 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      >
        <div
          role="dialog"
          aria-modal="true"
          className="bg-card border border-base rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-all duration-300"
        >

        {/* Header Ribbon */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-base flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              phase === 'assigned' ? 'bg-emerald-500' :
              phase === 'awaiting_driver' ? 'bg-amber-400 animate-pulse' :
              phase === 'searching' ? 'bg-amber-500 animate-ping' :
              'bg-rose-500'
            }`} />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Al Harmain VIP Dispatch
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Based on Phase */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">

          {/* ========================================================= */}
          {/* PHASE 1: SEARCHING FOR DRIVER                             */}
          {/* ========================================================= */}
          {phase === 'searching' && (
            <div className="space-y-4 text-center">
              {/* Radar Scanner */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-40" />
                <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-emerald-500/40 animate-spin" style={{ animationDuration: '10s' }} />
                <div className="absolute inset-4 rounded-full bg-emerald-500/10 border border-emerald-500/30" />
                <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white/20">
                  <Car className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-primary">Searching for a Captain...</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium h-4 transition-all">
                  {searchMessages[statusMessageIndex]}
                </p>
                <p className="text-[10px] text-muted">
                  Scanning nearby executive drivers ({secondsElapsed}s / {maxSearchSeconds}s)
                </p>
              </div>

              {/* Booking info pill */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-surface border border-base space-y-2 text-left text-xs">
                {bookingReference && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-base/60">
                    <span className="text-muted text-[11px]">Booking Reference:</span>
                    <button onClick={handleCopyRef} className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline text-xs">
                      <span>{bookingReference}</span>
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-muted block">Pickup</span>
                    <span className="text-primary font-medium truncate block text-xs">{pickupAddress || 'Current Pinned Location'}</span>
                  </div>
                </div>
                {destinationAddress && (
                  <div className="flex items-start gap-2">
                    <Navigation className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] uppercase font-bold text-muted block">Destination</span>
                      <span className="text-primary font-medium truncate block text-xs">{destinationAddress}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <span className="text-muted">Vehicle Class:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 uppercase">{vehicleType.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, (secondsElapsed / maxSearchSeconds) * 100)}%` }}
                />
              </div>

              <div className="pt-1">
                <button type="button" onClick={handleCancelSearch} className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors py-0.5">
                  Cancel Search
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 2: AWAITING DRIVER ACCEPTANCE                       */}
          {/* ========================================================= */}
          {phase === 'awaiting_driver' && matchedDriver && matchedVehicle && (
            <div className="space-y-4 animate-fade-up">

              {/* Banner: Captain Notified */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-400/50 text-amber-800 dark:text-amber-200">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider">Captain Notified — Awaiting Acceptance</h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    {awaitMessages[statusMessageIndex % awaitMessages.length]}
                  </p>
                </div>
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
              </div>

              {/* Driver preview card (greyed until confirmed) */}
              <div className="p-3.5 rounded-xl bg-surface border border-base space-y-3 opacity-80">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {matchedDriver.photo ? (
                      <img
                        src={matchedDriver.photo}
                        alt={matchedDriver.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400/60 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-base border border-amber-400/40">
                        {matchedDriver.name?.charAt(0) || 'C'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white">
                      <Clock className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Assigned Captain</span>
                    <h3 className="text-sm font-bold text-primary truncate">Captain {matchedDriver.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {(() => {
                        const rInfo = formatDriverRating(matchedDriver.rating);
                        if (rInfo.isNew) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                              <span>New Captain (Verified)</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {rInfo.display}
                          </span>
                        );
                      })()}
                      <span className="text-muted text-xs">&bull;</span>
                      <span className="text-xs text-secondary">{matchedDriver.totalRides || 0} completed {matchedDriver.totalRides === 1 ? 'trip' : 'trips'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-base/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase text-muted font-bold block">Vehicle</span>
                      <span className="text-xs font-bold text-primary">{matchedVehicle.make} {matchedVehicle.model}</span>
                    </div>
                    {matchedVehicle.color && (
                      <span className="chip text-[10px]">{matchedVehicle.color}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-base/60">
                    <span className="text-[10px] text-muted">Plate Number:</span>
                    <div className="px-2 py-0.5 rounded-md bg-white text-slate-950 font-mono font-black text-xs tracking-wider border border-slate-900 shadow-xs flex items-center gap-1.5">
                      <span className="text-[9px] text-emerald-700 font-bold">KSA</span>
                      <span>{matchedVehicle.plateNumber}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-center text-muted italic">
                  Ride details will be confirmed once the captain accepts
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-1000 rounded-full"
                  style={{ width: `${Math.min(100, (awaitingSeconds / maxAwaitSeconds) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-center text-muted">
                Waiting for captain acceptance ({awaitingSeconds}s / {maxAwaitSeconds}s)
              </p>

              <button type="button" onClick={handleCancelSearch} className="w-full text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors py-0.5">
                Cancel and find another captain
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 3: DRIVER ACCEPTED — CONFIRMED SUCCESS              */}
          {/* ========================================================= */}
          {phase === 'assigned' && matchedDriver && matchedVehicle && (
            <div className="space-y-4 animate-fade-up">

              {/* Success Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Captain Accepted & Confirmed</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Your chauffeur has confirmed the ride and is en route to your pickup.
                  </p>
                </div>
              </div>

              {/* ETA Card */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Estimated Arrival</span>
                    <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                      {etaFormatted || `${etaMinutes || 5} mins`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted block">Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Route
                  </span>
                </div>
              </div>

              {/* Driver Profile */}
              <div className="p-3.5 rounded-xl bg-surface border border-base space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {matchedDriver.photo ? (
                      <img
                        src={matchedDriver.photo}
                        alt={matchedDriver.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm border border-emerald-400">
                        {matchedDriver.name?.charAt(0) || 'C'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white">
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Executive Chauffeur</span>
                    </div>
                    <h3 className="text-sm font-bold text-primary truncate">Captain {matchedDriver.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {(() => {
                        const rInfo = formatDriverRating(matchedDriver.rating);
                        if (rInfo.isNew) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                              <span>New Captain (Verified)</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {rInfo.display}
                          </span>
                        );
                      })()}
                      <span className="text-muted text-xs">&bull;</span>
                      <span className="text-xs text-secondary">{matchedDriver.totalRides || 0} completed {matchedDriver.totalRides === 1 ? 'trip' : 'trips'}</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-2.5 rounded-lg bg-card border border-base/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase text-muted font-bold block">Vehicle</span>
                      <span className="text-xs font-bold text-primary">{matchedVehicle.make} {matchedVehicle.model}</span>
                    </div>
                    {matchedVehicle.color && (
                      <span className="chip text-[10px]">{matchedVehicle.color}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-base/60">
                    <span className="text-[10px] text-muted">Plate Number:</span>
                    <div className="px-2 py-0.5 rounded-md bg-white text-slate-950 font-mono font-black text-xs tracking-wider border border-slate-900 shadow-xs flex items-center gap-1.5">
                      <span className="text-[9px] text-emerald-700 font-bold">KSA</span>
                      <span>{matchedVehicle.plateNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Link
                  href="/customer/track"
                  onClick={onClose}
                  className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Live Radar Tracking</span>
                </Link>
                <Link
                  href="/customer/bookings"
                  onClick={onClose}
                  className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl"
                >
                  <span>View All Bookings</span>
                </Link>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 4: NO DRIVER / TIMEOUT / ERROR                      */}
          {/* ========================================================= */}
          {(phase === 'no_driver' || phase === 'error') && (
            <div className="space-y-4 text-center animate-fade-up">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-primary">
                  {phase === 'error' ? 'Matching Error' : 'No Captains Immediately Available'}
                </h3>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  {errorMessage || 'All chauffeurs of this class are currently on active journeys in this sector.'}
                </p>
              </div>

              {bookingReference && (
                <div className="p-2.5 rounded-xl bg-surface border border-base text-xs flex items-center justify-between">
                  <span className="text-muted text-[11px]">Booking Reference:</span>
                  <span className="font-mono font-bold text-amber-500">{bookingReference}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={runMatching}
                  className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Driver Search</span>
                </button>

                <Link
                  href="/customer/bookings"
                  onClick={onClose}
                  className="btn-secondary w-full py-2 text-xs text-center rounded-xl"
                >
                  Keep in Queue &amp; View Bookings
                </Link>

                <button type="button" onClick={handleCancelSearch} className="text-xs text-rose-500 hover:text-rose-600 py-0.5">
                  Cancel Booking
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </Portal>
  );
}
