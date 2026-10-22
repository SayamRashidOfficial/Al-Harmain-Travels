'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  VehicleType,
  SavedPlace,
  RecentLocation,
  LocationPoint,
  SavedPlaceType,
  Booking,
  VehicleCategory,
  ServiceType,
  TerminalCode,
  IntermediateStop,
  BookingMethod,
  TripType,
} from '@/types';
import CustomRouteBookingPanel from '@/components/customer/CustomRouteBookingPanel';
import FixedFareBookingPanel from '@/components/customer/FixedFareBookingPanel';
import { useLanguage } from '@/context/LanguageContext';
import { usePickupLocation } from '@/hooks/usePickupLocation';
import {
  getCurrentLocation,
  reverseGeocode,
  searchPlaces,
  calculateRoute,
  formatDistance,
  formatDuration,
  isSameLocation,
  isValidCoordinate,
  PlaceSuggestion,
} from '@/lib/maps/location-service';
import {
  resolveFixedFare,
  formatFareSAR,
  getAvailableVehicles,
  SERVICE_LABELS,
  VEHICLE_LABELS,
  VEHICLE_CAPACITY,
  TERMINAL_LABELS,
  TERMINAL_REQUIRED_SERVICES,
  ZIYARAT_SERVICES,
  isAirportRoute,
} from '@/lib/fixed-fare';
import { formatCurrency } from '@/lib/utils';
import { isBookingForCustomer } from '@/lib/assignment-utils';
import {
  MapPin,
  Search,
  Navigation,
  Crosshair,
  Clock,
  Home,
  Briefcase,
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Car,
  Users,
  Luggage,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  Check,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  UploadCloud,
  FileImage,
  Receipt,
  Building2,
  CreditCard,
  Plane,
  Route,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import BookingMap with SSR disabled (Leaflet requires window)
const BookingMap = dynamic(() => import('@/components/map/BookingMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[360px] rounded-3xl bg-surface border border-base animate-pulse flex flex-col items-center justify-center text-muted text-sm gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      <span>Loading Al Harmain Radar Map…</span>
    </div>
  ),
});

// ─── Service option definitions ────────────────────────────────────────────
const SERVICE_OPTIONS: { type: ServiceType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    type: 'intercity_jeddah_makkah',
    label: 'Jeddah → Makkah',
    icon: <Plane className="w-4 h-4" />,
    desc: 'Airport / city transfer to Makkah',
  },
  {
    type: 'intercity_makkah_jeddah',
    label: 'Makkah → Jeddah',
    icon: <Navigation className="w-4 h-4" />,
    desc: 'Transfer back to Jeddah / airport',
  },
  {
    type: 'intercity_makkah_madinah',
    label: 'Makkah → Madinah',
    icon: <Route className="w-4 h-4" />,
    desc: 'Round-trip Makkah ↔ Madinah',
  },
  {
    type: 'intercity_makkah_madinah_sameday',
    label: 'Makkah → Madinah (Same Day)',
    icon: <Clock className="w-4 h-4" />,
    desc: 'Same-day Makkah ↔ Madinah round trip',
  },
  {
    type: 'ziyarat_makkah',
    label: 'Makkah Ziyarat',
    icon: <Star className="w-4 h-4" />,
    desc: 'Sacred sites tour within Makkah',
  },
  {
    type: 'ziyarat_taif',
    label: 'Taif Ziyarat',
    icon: <Star className="w-4 h-4" />,
    desc: 'Holy sites tour in Taif',
  },
  {
    type: 'ziyarat_taif_bani_saad',
    label: 'Taif + Bani Saad',
    icon: <Star className="w-4 h-4" />,
    desc: 'Taif Ziyarat including Bani Saad',
  },
];

const TERMINAL_OPTIONS: { code: NonNullable<TerminalCode>; label: string }[] = [
  { code: 'terminal_1', label: 'Terminal 1' },
  { code: 'terminal_h', label: 'Terminal H' },
  { code: 'terminal_n', label: 'Terminal N' },
];

const VEHICLE_CATEGORIES: VehicleCategory[] = ['sedan', 'staria', 'gmc', 'hiroof'];

// Map VehicleCategory → existing VehicleType for booking insert compatibility
const CATEGORY_TO_VEHICLE_TYPE: Record<VehicleCategory, VehicleType> = {
  sedan: 'sedan',
  staria: 'van',
  gmc: 'vip_gmc',
  hiroof: 'van',
};

export default function CustomerHomePage() {
  const { t, language, dir, isRTL } = useLanguage();
  const {
    currentUser,
    activeCustomerBooking,
    bookings,
    savedPlaces,
    recentLocations,
    addSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    addRecentLocation,
    clearRecentLocations,
    createBooking,
    uploadPaymentScreenshot,
    settings,
    fixedFareRates,
    rateVehicles,
    rateRoutes,
    rateTerminals,
  } = useApp();

  // Location & Selection State
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);

  // Active assigned driver info for active trip card (if available)
  const activeDriver = activeCustomerBooking?.driver || null;

  // ── Paginated Recent & Active Bookings ────────────────────────────────
  const BOOKINGS_PER_PAGE = 4;
  const [bookingsPage, setBookingsPage] = useState<number>(0);

  // Always sort newest-first by created_at (DESC), filter for this customer.
  const allCustomerBookings = useMemo(() => {
    return bookings
      .filter((b) => isBookingForCustomer(b, currentUser))
      .slice()
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta; // newest first
      });
  }, [bookings, currentUser]);

  const totalBookingPages = Math.max(1, Math.ceil(allCustomerBookings.length / BOOKINGS_PER_PAGE));

  // Reset to first page when a new booking arrives so it is immediately visible
  const prevBookingCountRef = useRef<number>(allCustomerBookings.length);
  useEffect(() => {
    if (allCustomerBookings.length > prevBookingCountRef.current) {
      setBookingsPage(0);
    }
    prevBookingCountRef.current = allCustomerBookings.length;
  }, [allCustomerBookings.length]);

  // Clamp the page index whenever the total changes
  useEffect(() => {
    setBookingsPage((p) => Math.min(p, Math.max(0, totalBookingPages - 1)));
  }, [totalBookingPages]);

  const customerRecentBookings = useMemo(() => {
    const start = bookingsPage * BOOKINGS_PER_PAGE;
    return allCustomerBookings.slice(start, start + BOOKINGS_PER_PAGE);
  }, [allCustomerBookings, bookingsPage]);

  const {
    status: gpsStatus,
    coords: userLocation,
    pickupAddress: detectedAddress,
    accuracyMeters: gpsAccuracy,
    errorMessage: gpsErrorMsg,
    setManualPickup,
    resetToCurrentLocation,
  } = usePickupLocation();

  // ─── Dual Booking Method State ──────────────────────────────────────────
  const [bookingMethod, setBookingMethod] = useState<BookingMethod>('fixed');

  // ─── Custom Route Booking State ─────────────────────────────────────────
  const [customPickup, setCustomPickup] = useState<LocationPoint | null>(null);
  const [customDestination, setCustomDestination] = useState<LocationPoint | null>(null);
  const [customStops, setCustomStops] = useState<IntermediateStop[]>([]);
  const [customTripType, setCustomTripType] = useState<TripType>('one_way');
  const [customReturnDate, setCustomReturnDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [customReturnTime, setCustomReturnTime] = useState<string>('18:00');
  const [selectedCustomVehicle, setSelectedCustomVehicle] = useState<VehicleCategory | null>(null);
  const [customConfirmedRef, setCustomConfirmedRef] = useState<string | null>(null);
  const [isCustomSubmitting, setIsCustomSubmitting] = useState<boolean>(false);

  // Custom route visual estimate (map rendering only — strictly NO fare)
  const [customRouteCoords, setCustomRouteCoords] = useState<[number, number][]>([]);
  const [customDistanceKm, setCustomDistanceKm] = useState<number>(0);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(0);
  const [isCustomRouting, setIsCustomRouting] = useState<boolean>(false);
  const [customRouteError, setCustomRouteError] = useState<string | null>(null);

  // ─── Fixed-fare booking state ──────────────────────────────────────────
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalCode>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory | null>(null);

  // Search input & suggestions state (supports pickup, destination, and intermediate stops)
  const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'destination' | 'custom_pickup' | 'custom_destination' | `stop_${number}` | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive map pinning mode
  const [interactiveMode, setInteractiveMode] = useState<'none' | 'pickup' | 'destination'>('none');

  // Route & visual estimate (for map drawing only — NOT used for fare)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Booking step
  const [bookingStep, setBookingStep] = useState<'service' | 'route' | 'vehicle' | 'details' | 'summary_payment' | 'submitted'>('service');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFareValidating, setIsFareValidating] = useState<boolean>(false);

  // Payment Screenshot State
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Additional Passenger Details
  const [passengerName, setPassengerName] = useState<string>(currentUser.full_name || 'Al Harmain Guest');
  const [passengerPhone, setPassengerPhone] = useState<string>(currentUser.phone || '');
  const [passengerCount, setPassengerCount] = useState<number>(3);
  const [journeyDate, setJourneyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [journeyTime, setJourneyTime] = useState<string>('15:00');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Saved Places Modal State
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState<boolean>(false);
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);
  const [placeName, setPlaceName] = useState<string>('');
  const [placeType, setPlaceType] = useState<SavedPlaceType>('custom');
  const [placeAddress, setPlaceAddress] = useState<string>('');
  const [placeLat, setPlaceLat] = useState<number>(0);
  const [placeLng, setPlaceLng] = useState<number>(0);

  // ─── Active Rates Configured by Admin ──────────────────────────────────
  // Only active rates are available for customer booking
  const activeRates = useMemo(() => {
    return fixedFareRates.filter((r) => r.is_active);
  }, [fixedFareRates]);

  // ─── Derived fare resolution (client-side preview) ─────────────────────
  // This is purely for display. The server re-validates on booking submission.
  const farePreview = useMemo(() => {
    if (!selectedService || !selectedVehicle) return null;
    return resolveFixedFare(selectedVehicle, selectedService, selectedTerminal, activeRates);
  }, [selectedService, selectedVehicle, selectedTerminal, activeRates]);

  // Vehicles available for the current service + terminal selection
  const availableVehicles = useMemo(() => {
    if (!selectedService) {
      return (rateVehicles && rateVehicles.length > 0)
        ? rateVehicles.filter((v) => v.is_active).map((v) => v.category as VehicleCategory)
        : VEHICLE_CATEGORIES;
    }
    return getAvailableVehicles(selectedService, selectedTerminal ?? undefined, activeRates, rateVehicles);
  }, [selectedService, selectedTerminal, activeRates, rateVehicles]);

  // Whether the selected service requires a terminal
  const needsTerminal = useMemo(
    () => selectedService ? isAirportRoute(selectedService, rateRoutes) : false,
    [selectedService, rateRoutes],
  );

  // Whether the selected service is a Ziyarat (no separate destination input)
  const isZiyarat = useMemo(
    () => selectedService ? ZIYARAT_SERVICES.includes(selectedService) : false,
    [selectedService],
  );

  // Reset vehicle when service changes (stale vehicle may not apply)
  useEffect(() => {
    setSelectedVehicle(null);
    setSelectedTerminal(null);
  }, [selectedService]);

  // Reset vehicle when terminal changes
  useEffect(() => {
    if (selectedVehicle && !availableVehicles.includes(selectedVehicle)) {
      setSelectedVehicle(null);
    }
  }, [availableVehicles, selectedVehicle]);

  // On page refresh/mount: ensure both fields start empty
  useEffect(() => {
    try {
      sessionStorage.removeItem('alharmain_customer_destination');
      sessionStorage.removeItem('alharmain_customer_pickup');
      localStorage.removeItem('alharmain_customer_destination');
      localStorage.removeItem('alharmain_customer_pickup');
    } catch { }
  }, []);

  // Sync passenger name/phone with the authenticated user's profile whenever
  // the currentUser changes (e.g. after auth loads or profile is updated).
  // This prevents stale initial-render values being used in submitted bookings.
  useEffect(() => {
    if (currentUser && currentUser.id && currentUser.id !== 'guest') {
      if (currentUser.full_name) {
        setPassengerName(currentUser.full_name);
      }
      if (currentUser.phone) {
        setPassengerPhone(currentUser.phone);
      }
    }
  }, [currentUser.id, currentUser.full_name, currentUser.phone]);

  // Debounced Place Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchQuery, userLocation);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, userLocation]);

  // Route visual calculation (map display only — no fare impact)
  useEffect(() => {
    if (!pickup || !destination || isZiyarat) {
      setRouteCoords([]);
      setDistanceKm(0);
      setDurationMinutes(0);
      setRouteError(null);
      return;
    }

    if (isSameLocation(pickup, destination)) {
      setRouteError('Pickup and destination cannot be the same location.');
      setRouteCoords([]);
      return;
    }

    let isCurrent = true;
    const fetchRoute = async () => {
      setIsRouting(true);
      setRouteError(null);
      try {
        const route = await calculateRoute(
          { lat: pickup.latitude, lng: pickup.longitude },
          { lat: destination.latitude, lng: destination.longitude },
        );
        if (isCurrent) {
          setDistanceKm(route.distanceKm);
          setDurationMinutes(route.durationMinutes);
          setRouteCoords(route.polylineCoords || []);
        }
      } catch {
        if (isCurrent) setRouteError('Could not calculate driving route.');
      } finally {
        if (isCurrent) setIsRouting(false);
      }
    };

    fetchRoute();
    return () => { isCurrent = false; };
  }, [pickup, destination, isZiyarat]);

  // Route visual calculation for custom route (map display only — strictly NO fare)
  useEffect(() => {
    if (bookingMethod !== 'custom') return;
    if (!customPickup || !customDestination) {
      setCustomRouteCoords([]);
      setCustomDistanceKm(0);
      setCustomDurationMinutes(0);
      setCustomRouteError(null);
      return;
    }

    if (isSameLocation(customPickup, customDestination)) {
      setCustomRouteError('Pickup and destination cannot be the same location.');
      setCustomRouteCoords([]);
      return;
    }

    let isCurrent = true;
    const fetchCustomRoute = async () => {
      setIsCustomRouting(true);
      setCustomRouteError(null);
      try {
        const waypoints = customStops
          .filter((s) => s.latitude && s.longitude && s.address)
          .map((s) => ({ lat: s.latitude, lng: s.longitude }));

        const route = await calculateRoute(
          { lat: customPickup.latitude, lng: customPickup.longitude },
          { lat: customDestination.latitude, lng: customDestination.longitude },
          waypoints
        );
        if (isCurrent) {
          setCustomDistanceKm(route.distanceKm);
          setCustomDurationMinutes(route.durationMinutes);
          setCustomRouteCoords(route.polylineCoords || []);
        }
      } catch {
        if (isCurrent) setCustomRouteError('Could not calculate custom driving route.');
      } finally {
        if (isCurrent) setIsCustomRouting(false);
      }
    };

    fetchCustomRoute();
    return () => { isCurrent = false; };
  }, [bookingMethod, customPickup, customDestination, customStops]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleUseCurrentLocation = useCallback(async () => {
    toast.loading('Acquiring fresh high-accuracy GPS fix…', { id: 'gps-pickup' });
    try {
      let activeCoords = userLocation;
      let activeAddress = detectedAddress;

      if (!activeCoords || !isValidCoordinate(activeCoords.latitude, activeCoords.longitude)) {
        activeCoords = await resetToCurrentLocation();
      }

      if (activeCoords && isValidCoordinate(activeCoords.latitude, activeCoords.longitude)) {
        if (!activeAddress) {
          activeAddress = await reverseGeocode(activeCoords.latitude, activeCoords.longitude);
        }
        const finalAddress = activeAddress || `GPS Location (${activeCoords.latitude.toFixed(4)}, ${activeCoords.longitude.toFixed(4)})`;
        const newPickup = { address: finalAddress, latitude: activeCoords.latitude, longitude: activeCoords.longitude };
        setPickup(newPickup);
        setManualPickup(newPickup);
        const accInfo = activeCoords.accuracy != null ? ` (±${Math.round(activeCoords.accuracy)}m)` : '';
        toast.success(`Pickup set to your current GPS position${accInfo}`, { id: 'gps-pickup' });
      } else {
        toast.error(gpsErrorMsg || 'Could not acquire precise GPS fix.', { id: 'gps-pickup' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not acquire GPS position.', { id: 'gps-pickup' });
    }
  }, [userLocation, detectedAddress, resetToCurrentLocation, gpsErrorMsg, setManualPickup]);

  const handleCustomUseCurrentLocation = useCallback(async () => {
    toast.loading('Acquiring fresh high-accuracy GPS fix…', { id: 'custom-gps-pickup' });
    try {
      let activeCoords = userLocation;
      let activeAddress = detectedAddress;

      if (!activeCoords || !isValidCoordinate(activeCoords.latitude, activeCoords.longitude)) {
        activeCoords = await resetToCurrentLocation();
      }

      if (activeCoords && isValidCoordinate(activeCoords.latitude, activeCoords.longitude)) {
        if (!activeAddress) {
          activeAddress = await reverseGeocode(activeCoords.latitude, activeCoords.longitude);
        }
        const finalAddress = activeAddress || `GPS Location (${activeCoords.latitude.toFixed(4)}, ${activeCoords.longitude.toFixed(4)})`;
        const newPickup = { address: finalAddress, latitude: activeCoords.latitude, longitude: activeCoords.longitude };
        setCustomPickup(newPickup);
        const accInfo = activeCoords.accuracy != null ? ` (±${Math.round(activeCoords.accuracy)}m)` : '';
        toast.success(`Custom pickup set to your current GPS position${accInfo}`, { id: 'custom-gps-pickup' });
      } else {
        toast.error(gpsErrorMsg || 'Could not acquire precise GPS fix.', { id: 'custom-gps-pickup' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not acquire GPS position.', { id: 'custom-gps-pickup' });
    }
  }, [userLocation, detectedAddress, resetToCurrentLocation, gpsErrorMsg]);

  const handleSelectPlace = (place: { address: string; latitude: number; longitude: number; placeId?: string | null }) => {
    if (activeSearchField === 'pickup') {
      const newPickup = { address: place.address, latitude: place.latitude, longitude: place.longitude, placeId: place.placeId };
      setPickup(newPickup);
      setManualPickup(newPickup);
    } else if (activeSearchField === 'custom_pickup') {
      const newPickup = { address: place.address, latitude: place.latitude, longitude: place.longitude, placeId: place.placeId };
      setCustomPickup(newPickup);
    } else if (activeSearchField === 'custom_destination') {
      const newDest = { address: place.address, latitude: place.latitude, longitude: place.longitude, placeId: place.placeId };
      setCustomDestination(newDest);
      addRecentLocation({ address: place.address, latitude: place.latitude, longitude: place.longitude, place_id: place.placeId });
    } else if (activeSearchField && typeof activeSearchField === 'string' && activeSearchField.startsWith('stop_')) {
      const idx = parseInt(activeSearchField.replace('stop_', ''), 10);
      setCustomStops((prev) =>
        prev.map((s, i) =>
          i === idx
            ? { ...s, address: place.address, latitude: place.latitude, longitude: place.longitude, placeId: place.placeId }
            : s
        )
      );
    } else {
      const newDest = { address: place.address, latitude: place.latitude, longitude: place.longitude, placeId: place.placeId };
      setDestination(newDest);
      addRecentLocation({ address: place.address, latitude: place.latitude, longitude: place.longitude, place_id: place.placeId });
    }
    setActiveSearchField(null);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handlePickupAdjust = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocode(lat, lng);
      const newPickup = { address, latitude: lat, longitude: lng };
      setPickup(newPickup);
      setManualPickup(newPickup);
      toast.success(`Pickup adjusted: ${address}`, { id: 'marker-adjust' });
    } catch {
      const fallback = `Pickup (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const newPickup = { address: fallback, latitude: lat, longitude: lng };
      setPickup(newPickup);
      setManualPickup(newPickup);
    }
  };

  const handleDestinationAdjust = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocode(lat, lng);
      const newDest = { address, latitude: lat, longitude: lng };
      setDestination(newDest);
      addRecentLocation({ address, latitude: lat, longitude: lng });
      toast.success(`Destination adjusted: ${address}`, { id: 'marker-adjust' });
    } catch {
      const fallback = `Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setDestination({ address: fallback, latitude: lat, longitude: lng });
    }
  };

  const handleMapLocationPick = async (lat: number, lng: number) => {
    const targetMode = interactiveMode !== 'none'
      ? interactiveMode
      : (!pickup ? 'pickup' : (!destination ? 'destination' : 'pickup'));
    toast.loading('Resolving address…', { id: 'map-pick' });
    try {
      const address = await reverseGeocode(lat, lng);
      toast.dismiss('map-pick');
      if (targetMode === 'pickup') {
        const newPickup = { address, latitude: lat, longitude: lng };
        setPickup(newPickup);
        setManualPickup(newPickup);
        toast.success(`Pickup set: ${address}`);
      } else {
        const newDest = { address, latitude: lat, longitude: lng };
        setDestination(newDest);
        addRecentLocation({ address, latitude: lat, longitude: lng });
        toast.success(`Destination set: ${address}`);
      }
    } catch {
      toast.dismiss('map-pick');
      const fallback = `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      if (targetMode === 'pickup') {
        const p = { address: fallback, latitude: lat, longitude: lng };
        setPickup(p);
        setManualPickup(p);
      } else {
        setDestination({ address: fallback, latitude: lat, longitude: lng });
      }
    } finally {
      setInteractiveMode('none');
    }
  };

  const handleSwapLocations = () => {
    if (!pickup && !destination) return;
    const tmp = pickup;
    setPickup(destination);
    setDestination(tmp);
    if (destination) setManualPickup(destination);
    toast.info('Swapped pickup and destination');
  };

  const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload a valid image file (PNG, JPG, or WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Receipt screenshot size exceeds 10MB limit.'); return; }
    setPaymentFile(file);
    setPaymentPreviewUrl(URL.createObjectURL(file));
    toast.success('Payment receipt screenshot loaded!');
  };

  const removePaymentFile = () => {
    setPaymentFile(null);
    if (paymentPreviewUrl) { URL.revokeObjectURL(paymentPreviewUrl); setPaymentPreviewUrl(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Service selection → advance to route step
  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setSelectedTerminal(null);
    setSelectedVehicle(null);
    setPickup(null);
    setDestination(null);
    setBookingStep('route');
  };

  // Route/terminal confirmed → advance to vehicle step
  const handleRouteConfirmed = () => {
    if (!selectedService) return;
    // For non-ziyarat, require pickup (destination auto-populated for some services)
    if (!isZiyarat && !pickup) {
      toast.error('Please enter your pickup location.');
      return;
    }
    // For intercity not-ziyarat, require destination
    if (!isZiyarat && !destination && !pickup) {
      toast.error('Please enter your destination.');
      return;
    }
    // For terminal-required services (non-sedan), require terminal
    if (needsTerminal && !selectedTerminal) {
      toast.error('Please select the Jeddah Airport terminal.');
      return;
    }
    setBookingStep('vehicle');
  };

  // Vehicle selected → advance to passenger details
  const handleVehicleConfirmed = async () => {
    if (!selectedVehicle || !selectedService) return;
    // Server-side fare validation
    setIsFareValidating(true);
    try {
      const res = await fetch('/api/fares/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleCategory: selectedVehicle,
          serviceType: selectedService,
          terminal: selectedTerminal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        toast.error(data.error || 'Fare not available for this combination. Please contact us.');
        return;
      }
      // Fare is confirmed by server — proceed
      setBookingStep('details');
    } catch {
      toast.error('Could not validate fare. Please check your internet connection and retry.');
    } finally {
      setIsFareValidating(false);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerPhone.trim()) {
      toast.error('Please provide lead passenger name and WhatsApp phone.');
      return;
    }
    setBookingStep('summary_payment');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.status === 'deactivated' || currentUser.status === 'suspended') {
      toast.error('Your customer account is currently deactivated. You cannot make new bookings. Please contact dispatch.');
      return;
    }

    if (!selectedService || !selectedVehicle) {
      toast.error('Booking is incomplete. Please restart the booking process.');
      return;
    }
    if (!paymentFile) {
      toast.error('Payment receipt screenshot is required before booking can be submitted.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Final server-side fare validation (prevents tampering between steps)
      const fareRes = await fetch('/api/fares/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleCategory: selectedVehicle,
          serviceType: selectedService,
          terminal: selectedTerminal,
        }),
      });
      const fareData = await fareRes.json();
      if (!fareRes.ok || !fareData.found) {
        toast.error(fareData.error || 'Fare is no longer available. Please restart your booking.');
        setIsSubmitting(false);
        return;
      }

      // 2. Upload payment proof
      toast.loading('Uploading payment proof to secure storage…', { id: 'booking-upload' });
      const uploadedScreenshotUrl = await uploadPaymentScreenshot(paymentFile);
      toast.dismiss('booking-upload');

      // 3. Determine pickup/destination
      const serviceLabel = SERVICE_LABELS[selectedService];
      const termLabel = selectedTerminal ? ` (${TERMINAL_LABELS[selectedTerminal]})` : '';
      const pickupAddr = pickup?.address || `Service: ${serviceLabel}${termLabel}`;
      const destAddr = destination?.address || serviceLabel;

      // 4. Create booking with confirmed fixed fare from server
      const booking = await createBooking({
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        booking_type: 'scheduled',
        pickup_address: pickupAddr,
        pickup_latitude: pickup?.latitude ?? 21.4225,
        pickup_longitude: pickup?.longitude ?? 39.8262,
        destination_address: destAddr,
        destination_latitude: destination?.latitude ?? 24.4672,
        destination_longitude: destination?.longitude ?? 39.6151,
        vehicle_type: CATEGORY_TO_VEHICLE_TYPE[selectedVehicle],
        passenger_count: passengerCount,
        notes: `Fixed-Fare Booking | Service: ${serviceLabel}${termLabel} | Vehicle: ${VEHICLE_LABELS[selectedVehicle]} | ${journeyDate} at ${journeyTime}${specialInstructions ? ` | Special: ${specialInstructions}` : ''}`,
        scheduled_at: `${journeyDate}T${journeyTime}:00Z`,
        payment_screenshot_url: uploadedScreenshotUrl || undefined,
        // Fixed-fare extra fields
        vehicle_category: selectedVehicle,
        service_type: selectedService,
        terminal: selectedTerminal,
        fixed_fare_amount: fareData.fare,
        fare_rate_id: fareData.rateId,
      });

      setConfirmedBookingRef(booking.booking_reference);
      setBookingStep('submitted');
      toast.success(`Booking ${booking.booking_reference} submitted for payment verification!`);
    } catch {
      toast.dismiss('booking-upload');
      toast.error('Failed to reserve ride. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Saved Places Modal Handlers
  const openAddPlaceModal = (type: SavedPlaceType = 'custom') => {
    setEditingPlace(null);
    setPlaceName(type === 'home' ? 'Home' : type === 'work' ? 'Work' : '');
    setPlaceType(type);
    setPlaceAddress(pickup?.address || '');
    setPlaceLat(pickup?.latitude || (userLocation?.latitude || 21.4225));
    setPlaceLng(pickup?.longitude || (userLocation?.longitude || 39.8262));
    setIsSavedPlacesModalOpen(true);
  };

  const openEditPlaceModal = (place: SavedPlace) => {
    setEditingPlace(place);
    setPlaceName(place.name);
    setPlaceType(place.type);
    setPlaceAddress(place.address);
    setPlaceLat(place.latitude);
    setPlaceLng(place.longitude);
    setIsSavedPlacesModalOpen(true);
  };

  const handleSavePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !placeAddress.trim()) {
      toast.error('Please provide a name and address for this place.');
      return;
    }
    if (editingPlace) {
      await updateSavedPlace(editingPlace.id, { name: placeName.trim(), type: placeType, address: placeAddress.trim(), latitude: placeLat, longitude: placeLng });
    } else {
      await addSavedPlace({ name: placeName.trim(), type: placeType, address: placeAddress.trim(), latitude: placeLat, longitude: placeLng });
    }
    setIsSavedPlacesModalOpen(false);
  };

  const homePlace = savedPlaces.find((p) => p.type === 'home');
  const workPlace = savedPlaces.find((p) => p.type === 'work');
  const customPlaces = savedPlaces.filter((p) => p.type === 'custom');

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedTerminal(null);
    setSelectedVehicle(null);
    setPickup(null);
    setDestination(null);
    setRouteCoords([]);
    setDistanceKm(0);
    setDurationMinutes(0);
    setRouteError(null);
    setBookingStep('service');
    setPaymentFile(null);
    setPaymentPreviewUrl(null);
    setConfirmedBookingRef(null);
  };

  const handleCustomPickupAdjust = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocode(lat, lng);
      setCustomPickup({ address, latitude: lat, longitude: lng });
      toast.success(`Pickup adjusted: ${address}`, { id: 'marker-adjust' });
    } catch {
      const fallback = `Pickup (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setCustomPickup({ address: fallback, latitude: lat, longitude: lng });
    }
  };

  const handleCustomDestinationAdjust = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocode(lat, lng);
      setCustomDestination({ address, latitude: lat, longitude: lng });
      toast.success(`Destination adjusted: ${address}`, { id: 'marker-adjust' });
    } catch {
      const fallback = `Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setCustomDestination({ address: fallback, latitude: lat, longitude: lng });
    }
  };

  const handleAddCustomStop = () => {
    if (customStops.length >= 5) {
      toast.warning('Maximum 5 intermediate stops permitted per custom route.');
      return;
    }
    const newStop: IntermediateStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      address: '',
      latitude: customPickup?.latitude ?? 21.4225,
      longitude: customPickup?.longitude ?? 39.8262,
      stop_order: customStops.length + 1,
    };
    setCustomStops((prev) => [...prev, newStop]);
    setActiveSearchField(`stop_${customStops.length}` as any);
  };

  const handleRemoveCustomStop = (stopId: string) => {
    setCustomStops((prev) =>
      prev.filter((s) => s.id !== stopId).map((s, idx) => ({ ...s, stop_order: idx + 1 }))
    );
  };

  const handleSwapCustomPickupDestination = () => {
    if (!customPickup && !customDestination) return;
    const tmp = customPickup;
    setCustomPickup(customDestination);
    setCustomDestination(tmp);
    toast.info('Swapped custom pickup and destination');
  };

  const resetCustomBooking = () => {
    setCustomPickup(null);
    setCustomDestination(null);
    setCustomStops([]);
    setSelectedCustomVehicle(null);
    setCustomConfirmedRef(null);
    setCustomRouteCoords([]);
    setCustomDistanceKm(0);
    setCustomDurationMinutes(0);
  };

  const handleSubmitCustomBooking = async () => {
    if (currentUser.status === 'deactivated' || currentUser.status === 'suspended') {
      toast.error('Your customer account is currently deactivated. You cannot make new bookings. Please contact dispatch.');
      return;
    }

    if (!customPickup) {
      toast.error('Please enter your pickup location.');
      return;
    }
    if (!customDestination) {
      toast.error('Please enter your destination.');
      return;
    }
    if (!selectedCustomVehicle) {
      toast.error('Please select a vehicle category.');
      return;
    }

    setIsCustomSubmitting(true);
    try {
      const validStops = customStops.filter((s) => s.address && s.latitude && s.longitude);
      const vehicleLabel = VEHICLE_LABELS[selectedCustomVehicle] || selectedCustomVehicle;

      const booking = await createBooking({
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        booking_type: 'scheduled',
        booking_method: 'custom',
        trip_type: customTripType,
        intermediate_stops: validStops,
        return_scheduled_at:
          customTripType === 'round_trip' && customReturnDate && customReturnTime
            ? `${customReturnDate}T${customReturnTime}:00Z`
            : undefined,
        pickup_address: customPickup.address,
        pickup_latitude: customPickup.latitude,
        pickup_longitude: customPickup.longitude,
        destination_address: customDestination.address,
        destination_latitude: customDestination.latitude,
        destination_longitude: customDestination.longitude,
        vehicle_type: CATEGORY_TO_VEHICLE_TYPE[selectedCustomVehicle],
        vehicle_category: selectedCustomVehicle,
        passenger_count: passengerCount,
        notes: `Custom Route Booking | ${customTripType === 'round_trip' ? 'Round Trip' : 'One Way'} | Vehicle: ${vehicleLabel} | Stops: ${validStops.length}${specialInstructions ? ` | Notes: ${specialInstructions}` : ''}`,
        scheduled_at: `${journeyDate}T${journeyTime}:00Z`,
      });

      setCustomConfirmedRef(booking.booking_reference);
      toast.success(`Custom booking ${booking.booking_reference} submitted for dispatcher review!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit custom booking request.');
    } finally {
      setIsCustomSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="page-shell space-y-4 sm:space-y-5 pb-20 sm:pb-6" dir={dir}>

      {/* ── Active Journey Banner ──────────────────────────────────────── */}
      {activeCustomerBooking && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 border border-emerald-500/50 shadow-lg relative overflow-hidden animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 text-[11px] font-bold border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isRTL ? 'الرحلة النشطة:' : 'ACTIVE JOURNEY:'} {activeCustomerBooking.status.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <div className="text-white font-semibold text-xs sm:text-sm">
                {isRTL ? 'المرجع:' : 'Ref:'} <span className="text-amber-300 font-mono">{activeCustomerBooking.booking_reference}</span> &bull; {activeCustomerBooking.pickup_address} &rarr; {activeCustomerBooking.destination_address}
              </div>
              {activeDriver && (
                <div className="text-emerald-200 text-xs flex flex-wrap items-center gap-1.5 pt-0.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isRTL ? 'الكابتن:' : 'Chauffeur:'} <strong className="text-white font-bold">{activeDriver.profile?.full_name || activeDriver.full_name || (isRTL ? 'كابتن معتمد' : 'Assigned Chauffeur')}</strong>
                    {(activeDriver.assigned_vehicle?.plate_number || activeDriver.vehicle?.plate_number) ? ` (${activeDriver.assigned_vehicle?.plate_number || activeDriver.vehicle?.plate_number})` : ''}
                  </span>
                </div>
              )}
            </div>
            <Link
              href="/customer/track"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs shadow-sm transition-all self-start md:self-center shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{isRTL ? 'فتح رادار التتبع المباشر' : 'Open Live Tracking Radar'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Welcome Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {isRTL ? 'شركة الحرمين للنقل الفاخر' : 'Al Harmain Fixed-Fare Booking'}
          </span>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary">
            {isRTL ? `إلى أين ترغب بالذهاب يا ${currentUser.full_name.split(' ')[0]}؟` : `Where would you like to go, ${currentUser.full_name.split(' ')[0]}?`}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* GPS badge */}
          {gpsStatus === 'success' ? (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Crosshair className="w-3 h-3 text-emerald-500" />
              <span>{isRTL ? 'تحديد الموقع نشط' : 'Live GPS Active'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Crosshair className="w-3 h-3 text-amber-500" />
              <span>{isRTL ? 'تحديد موقعي' : 'Use GPS'}</span>
            </button>
          )}

          {selectedService && (
            <button
              type="button"
              onClick={resetBooking}
              className="text-xs font-semibold text-muted hover:text-rose-500 px-2.5 py-1 rounded-full border border-base bg-card hover:bg-elevated transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isRTL ? 'إعادة تعيين' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Deactivated Account Alert ────────────────────────────────────────── */}
      {(currentUser.status === 'deactivated' || currentUser.status === 'suspended') && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-amber-800 dark:text-amber-200">
              {isRTL ? 'الحساب غير مفعّل' : 'Customer Account Deactivated'}
            </p>
            <p className="opacity-90 leading-relaxed">
              {isRTL
                ? 'تم تعطيل حسابك مؤقتًا من قِبل إدارة الرحلات. لا يمكنك إجراء حجوزات جديدة حالياً. يُرجى التواصل مع فريق التنسيق والترحيل لإعادة تفعيل الحساب.'
                : 'Your customer account has been temporarily disabled by dispatch operations. New bookings cannot be submitted at this time. Please contact dispatch support to restore account privileges.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Booking Mode Switcher ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-card/60 p-1.5 rounded-xl border border-base shadow-sm">
        <button
          type="button"
          onClick={() => setBookingMethod('fixed')}
          className={`p-2.5 sm:p-3 rounded-lg border text-left rtl:text-right transition-all flex items-start gap-2.5 cursor-pointer ${bookingMethod === 'fixed'
              ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border-emerald-500/50 shadow-sm text-primary'
              : 'bg-surface/50 border-transparent hover:bg-surface text-secondary hover:text-primary'
            }`}
        >
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${bookingMethod === 'fixed'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-surface text-muted border border-base'
              }`}
          >
            <Route className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">{isRTL ? 'حجز بأسعار ثابتة' : 'Fixed Fare Booking'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {isRTL ? 'أسعار محددة' : 'Predefined Rates'}
              </span>
            </div>
            <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
              {isRTL ? 'مسارات مسبقة التحديد (جدة، مكة، المدينة، المزارات) بأسعار ثابتة ومضمونة.' : 'Predefined routes (Jeddah, Makkah, Madinah, Ziyarat) with guaranteed fixed prices.'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setBookingMethod('custom')}
          className={`p-2.5 sm:p-3 rounded-lg border text-left rtl:text-right transition-all flex items-start gap-2.5 cursor-pointer ${bookingMethod === 'custom'
              ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 border-amber-500/50 shadow-sm text-primary'
              : 'bg-surface/50 border-transparent hover:bg-surface text-secondary hover:text-primary'
            }`}
        >
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${bookingMethod === 'custom'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-surface text-muted border border-base'
              }`}
          >
            <Navigation className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">{isRTL ? 'حجز مسار مخصص' : 'Custom Route Booking'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {isRTL ? 'بتأكيد الترحيل' : 'Dispatcher Confirmed'}
              </span>
            </div>
            <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
              {isRTL ? 'حدد نقطة الانطلاق والوجهة مع توقفات اختيارية. يتم تأكيد السعر من قبل المشرف.' : 'Choose your own pickup & destination with optional stops. Fare confirmed by dispatcher.'}
            </p>
          </div>
        </button>
      </div>

      {/* ── Main Layout: Booking Panel + Map ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">

        {/* ── Booking Panel (left / top on mobile) ──────────────────── */}
        <div className="order-1 lg:order-1 lg:col-span-6 xl:col-span-5 space-y-4">
          {bookingMethod === 'custom' ? (
            <CustomRouteBookingPanel
              pickup={customPickup}
              destination={customDestination}
              stops={customStops}
              onOpenSearch={(field) => {
                if (field === 'pickup') setActiveSearchField('custom_pickup');
                else if (field === 'destination') setActiveSearchField('custom_destination');
                else setActiveSearchField(field as any);
              }}
              onUseCurrentLocation={handleCustomUseCurrentLocation}
              onAddStop={handleAddCustomStop}
              onRemoveStop={handleRemoveCustomStop}
              onSwapPickupDestination={handleSwapCustomPickupDestination}
              distanceKm={customDistanceKm}
              durationMinutes={customDurationMinutes}
              isRouting={isCustomRouting}
              routeError={customRouteError}
              passengerName={passengerName}
              setPassengerName={setPassengerName}
              passengerPhone={passengerPhone}
              setPassengerPhone={setPassengerPhone}
              passengerCount={passengerCount}
              setPassengerCount={setPassengerCount}
              journeyDate={journeyDate}
              setJourneyDate={setJourneyDate}
              journeyTime={journeyTime}
              setJourneyTime={setJourneyTime}
              specialInstructions={specialInstructions}
              setSpecialInstructions={setSpecialInstructions}
              tripType={customTripType}
              setTripType={setCustomTripType}
              returnDate={customReturnDate}
              setReturnDate={setCustomReturnDate}
              returnTime={customReturnTime}
              setReturnTime={setCustomReturnTime}
              selectedVehicle={selectedCustomVehicle}
              setSelectedVehicle={setSelectedCustomVehicle}
              onSubmitCustomBooking={handleSubmitCustomBooking}
              isSubmitting={isCustomSubmitting}
              confirmedBookingRef={customConfirmedRef}
              onResetCustomBooking={resetCustomBooking}
            />
          ) : (
            <FixedFareBookingPanel
              bookingStep={bookingStep}
              setBookingStep={setBookingStep}
              onResetBooking={resetBooking}
              selectedService={selectedService}
              onSelectService={handleServiceSelect}
              selectedTerminal={selectedTerminal}
              onSelectTerminal={setSelectedTerminal}
              needsTerminal={needsTerminal}
              isZiyarat={isZiyarat}
              pickup={pickup}
              destination={destination}
              onOpenSearch={(field) => {
                setActiveSearchField(field);
                setSearchQuery(field === 'pickup' ? pickup?.address || '' : destination?.address || '');
              }}
              onClearPickup={() => setPickup(null)}
              onClearDestination={() => setDestination(null)}
              onUseCurrentLocation={handleUseCurrentLocation}
              interactiveMode={interactiveMode}
              onToggleInteractiveMode={setInteractiveMode}
              routeError={routeError}
              savedPlaces={savedPlaces}
              recentLocations={recentLocations}
              onSelectPlace={handleSelectPlace}
              onOpenAddPlaceModal={openAddPlaceModal}
              onClearRecentLocations={clearRecentLocations}
              onConfirmRoute={handleRouteConfirmed}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              availableVehicles={availableVehicles}
              activeRates={activeRates}
              farePreview={farePreview}
              isFareValidating={isFareValidating}
              onConfirmVehicle={handleVehicleConfirmed}
              passengerName={passengerName}
              setPassengerName={setPassengerName}
              passengerPhone={passengerPhone}
              setPassengerPhone={setPassengerPhone}
              passengerCount={passengerCount}
              setPassengerCount={setPassengerCount}
              journeyDate={journeyDate}
              setJourneyDate={setJourneyDate}
              journeyTime={journeyTime}
              setJourneyTime={setJourneyTime}
              specialInstructions={specialInstructions}
              setSpecialInstructions={setSpecialInstructions}
              onDetailsSubmit={handleDetailsSubmit}
              paymentFile={paymentFile}
              paymentPreviewUrl={paymentPreviewUrl}
              fileInputRef={fileInputRef}
              onPaymentFileChange={handlePaymentFileChange}
              onRemovePaymentFile={removePaymentFile}
              onConfirmBooking={handleConfirmBooking}
              isSubmitting={isSubmitting}
              confirmedBookingRef={confirmedBookingRef}
            />
          )}
        </div>

        {/* ── Interactive Map (right / bottom on mobile) ───────────────── */}
        <div className="order-2 lg:order-2 lg:col-span-6 xl:col-span-7 h-[280px] sm:h-[340px] lg:h-[500px] xl:h-[520px] relative lg:sticky lg:top-20 rounded-2xl overflow-hidden shadow-xl border border-base">
          <BookingMap
            pickup={bookingMethod === 'custom' ? customPickup : pickup}
            destination={bookingMethod === 'custom' ? customDestination : destination}
            stops={bookingMethod === 'custom' ? customStops : undefined}
            userLocation={userLocation}
            routeCoords={bookingMethod === 'custom' ? customRouteCoords : routeCoords}
            distanceKm={bookingMethod === 'custom' ? customDistanceKm : distanceKm}
            durationMinutes={bookingMethod === 'custom' ? customDurationMinutes : durationMinutes}
            interactiveMode={interactiveMode}
            onLocationPick={handleMapLocationPick}
            onPickupAdjust={bookingMethod === 'custom' ? handleCustomPickupAdjust : handlePickupAdjust}
            onDestinationAdjust={bookingMethod === 'custom' ? handleCustomDestinationAdjust : handleDestinationAdjust}
            onRecenterClick={bookingMethod === 'custom' ? handleCustomUseCurrentLocation : handleUseCurrentLocation}
            className="h-full w-full rounded-2xl"
          />
        </div>
      </div>

      {/* ── Customer Recent & Active Rides Card ─────────────────────── */}
      {allCustomerBookings.length > 0 && (
        <div className="rounded-2xl bg-card border border-base p-4 sm:p-5 shadow-lg space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-sm sm:text-base">{isRTL ? 'رحلاتك الأخيرة والنشطة' : 'Your Recent & Active Bookings'}</h3>
                <p className="text-[11px] text-muted">{isRTL ? 'تحديثات الحالة اللحظية من رادار ترحيل VIP' : 'Real-time status updates from our VIP dispatch radar'}</p>
              </div>
            </div>
            <Link
              href="/customer/bookings"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>{isRTL ? 'عرض جميع الرحلات' : 'View All Trips'}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customerRecentBookings.map((b) => {
              const isDone =
                b.status === 'trip_completed' ||
                b.status === 'ride_completed' ||
                b.status === 'payment_completed' ||
                b.status === 'completed';
              const isCancelled =
                b.status === 'cancelled' || b.status === 'rejected' || b.status === 'payment_rejected';
              const isActive = !isDone && !isCancelled;

              return (
                <div
                  key={b.id || b.booking_reference}
                  className="rounded-xl bg-surface border border-base/80 hover:border-emerald-500/40 p-3 sm:p-3.5 transition-all shadow-sm flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">{b.booking_reference}</span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            {isRTL ? 'مباشر' : 'LIVE'}
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-elevated text-secondary border border-base/60">
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-secondary space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <span className="truncate">{b.pickup_address}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                        <span className="truncate">{b.destination_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-base/60 text-xs">
                    <div className="text-muted text-[11px]">
                      {b.final_fare || b.confirmed_fare || b.estimated_fare ? (
                        <span className="font-bold text-primary">
                          {isRTL ? 'ر.س ' : 'SAR '}{b.final_fare || b.confirmed_fare || b.estimated_fare}
                        </span>
                      ) : (
                        <span className="italic text-amber-500">{isRTL ? 'السعر قيد المراجعة' : 'Fare pending review'}</span>
                      )}
                      {b.driver?.profile?.full_name && (
                        <span className="block text-[10px] text-muted">
                          {isRTL ? 'الكابتن:' : 'Chauffeur:'} {b.driver.profile.full_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <Link
                          href="/customer/track"
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10.5px] font-semibold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{isRTL ? 'تتبع مباشر' : 'Track Live'}</span>
                        </Link>
                      )}
                      <Link
                        href="/customer/bookings"
                        className="px-2 py-1 rounded-lg bg-elevated hover:bg-surface text-secondary text-[10.5px] font-semibold transition-colors"
                      >
                        {isRTL ? 'التفاصيل' : 'Details'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination Controls ──────────────────────────────────── */}
          {totalBookingPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-base/60">
              <span className="text-[11px] text-muted">
                Page {bookingsPage + 1} of {totalBookingPages}
                <span className="ml-1 text-muted/70">({allCustomerBookings.length} total)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bookingsPage === 0}
                  onClick={() => setBookingsPage((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-elevated hover:bg-surface text-secondary border border-base/60 hover:border-emerald-500/40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={bookingsPage >= totalBookingPages - 1}
                  onClick={() => setBookingsPage((p) => Math.min(totalBookingPages - 1, p + 1))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-elevated hover:bg-surface text-secondary border border-base/60 hover:border-emerald-500/40"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Address Search Modal ─────────────────────────────────────── */}
      {activeSearchField && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-20 animate-fade-up">
          <div className="bg-card border border-base rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 sm:p-4 border-b border-base flex items-center gap-2.5">
              <Search className="w-4 h-4 text-emerald-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSearchField === 'pickup' || activeSearchField === 'custom_pickup'
                    ? 'Search pickup address, hotel, or landmark…'
                    : typeof activeSearchField === 'string' && activeSearchField.startsWith('stop_')
                      ? 'Search intermediate stop address, mosque, or landmark…'
                      : 'Search destination, airport, market, or city…'
                }
                className="w-full bg-transparent text-primary text-sm sm:text-base placeholder:text-muted focus:outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-elevated text-muted hover:text-primary">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setActiveSearchField(null); setSearchQuery(''); }}
                className="px-3 py-1.5 rounded-xl bg-elevated hover:bg-surface text-secondary text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-1">
              {isSearching && (
                <div className="py-8 text-center text-muted text-xs flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  <span>Searching locations…</span>
                </div>
              )}

              {(activeSearchField === 'pickup' || activeSearchField === 'custom_pickup') && !searchQuery && (
                <button
                  type="button"
                  onClick={async () => {
                    setActiveSearchField(null);
                    setSearchQuery('');
                    if (activeSearchField === 'custom_pickup') {
                      await handleCustomUseCurrentLocation();
                    } else {
                      await handleUseCurrentLocation();
                    }
                  }}
                  className="w-full text-left p-3 rounded-2xl hover:bg-surface border border-transparent hover:border-base flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Crosshair className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-primary text-xs sm:text-sm">Use Current Location</div>
                    <div className="text-[11px] text-muted truncate">{detectedAddress || 'Tap to detect live GPS coordinates'}</div>
                  </div>
                </button>
              )}

              {!searchQuery && savedPlaces.length > 0 && (
                <div className="py-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 mb-1">Saved Places</div>
                  {savedPlaces.map((sp) => (
                    <button key={sp.id} type="button" onClick={() => handleSelectPlace(sp)} className="w-full text-left p-3 rounded-2xl hover:bg-surface flex items-center gap-3 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        {sp.type === 'home' ? <Home className="w-4 h-4" /> : sp.type === 'work' ? <Briefcase className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-primary text-xs">{sp.name}</div>
                        <div className="text-[11px] text-muted truncate">{sp.address}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.map((item) => (
                <button key={item.placeId} type="button" onClick={() => handleSelectPlace(item)} className="w-full text-left p-3 rounded-2xl hover:bg-surface flex items-center gap-3 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-primary text-xs sm:text-sm truncate">{item.title}</div>
                    <div className="text-[11px] text-muted truncate">{item.subtitle || item.address}</div>
                  </div>
                </button>
              ))}

              {searchQuery && !isSearching && suggestions.length === 0 && (
                <div className="py-8 text-center text-muted text-xs">No exact matches found. Try checking the spelling or use the map pin.</div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ── Manage Saved Places Modal ─────────────────────────────────── */}
      {isSavedPlacesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="bg-card border border-base rounded-2xl w-full max-w-sm shadow-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-primary">{editingPlace ? 'Edit Saved Place' : 'Save a New Place'}</h3>
              <button type="button" onClick={() => setIsSavedPlacesModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-primary hover:bg-elevated">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlaceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="type-label block text-[11px] mb-1">Place Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['home', 'work', 'custom'] as SavedPlaceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setPlaceType(t); if (t === 'home') setPlaceName('Home'); else if (t === 'work') setPlaceName('Work'); }}
                      className={`py-1.5 px-2.5 rounded-lg border font-semibold capitalize text-xs flex items-center justify-center gap-1.5 ${placeType === t ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-surface border-base text-secondary'}`}
                    >
                      {t === 'home' ? <Home className="w-3 h-3" /> : t === 'work' ? <Briefcase className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="type-label block text-[11px] mb-1">Label Name *</label>
                <input type="text" required value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="e.g. Home, Work, Hotel" className="w-full px-3 py-2 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="type-label block text-[11px] mb-1">Full Address *</label>
                <input type="text" required value={placeAddress} onChange={(e) => setPlaceAddress(e.target.value)} placeholder="Street, City, Landmark" className="w-full px-3 py-2 rounded-lg bg-input border border-base text-primary text-xs focus:outline-none focus:border-emerald-500" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (userLocation) {
                    setPlaceLat(userLocation.latitude);
                    setPlaceLng(userLocation.longitude);
                    try { const addr = await reverseGeocode(userLocation.latitude, userLocation.longitude); if (addr) setPlaceAddress(addr); } catch { }
                    toast.success('Filled with current GPS location');
                  } else {
                    await handleUseCurrentLocation();
                  }
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                Use Current Location
              </button>

              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-base">
                {editingPlace && (
                  <button type="button" onClick={async () => { await deleteSavedPlace(editingPlace.id); setIsSavedPlacesModalOpen(false); }} className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete place">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button type="button" onClick={() => setIsSavedPlacesModalOpen(false)} className="btn-secondary py-2 px-3 text-xs">Cancel</button>
                  <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">Save Place</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
