'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { SAUDI_LANDMARKS } from '@/lib/geo';
import {
  VehicleType,
  VehicleCategory,
  TerminalCode,
  Profile,
  BookingStatus,
} from '@/types';
import {
  resolveFixedFare,
  formatFareSAR,
  SERVICE_LABELS,
  VEHICLE_LABELS,
  VEHICLE_CAPACITY,
  TERMINAL_LABELS,
  isAirportRoute,
  getServiceLabel,
  getVehicleLabel,
  getVehicleCapacity,
  getActiveTerminalsForService,
  getActiveServiceTypes,
} from '@/lib/fixed-fare';
import {
  Briefcase,
  Car,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
  UploadCloud,
  FileImage,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  X,
  Search,
  Building2,
  ExternalLink,
  Plane,
  Route,
  DollarSign,
  AlertCircle,
  Lock,
  UserPlus,
  Receipt,
  Navigation,
  Check,
  Users,
  Luggage,
  RotateCcw,
  AlertTriangle,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_TO_VEHICLE_TYPE: Record<VehicleCategory, VehicleType> = {
  sedan: 'sedan',
  staria: 'van',
  gmc: 'vip_gmc',
  hiroof: 'bus',
};

const STANDARD_TERMINALS: { code: NonNullable<TerminalCode>; label: string; sub: string }[] = [
  { code: 'terminal_1', label: 'Terminal 1', sub: 'New Main KAIA Terminal' },
  { code: 'terminal_h', label: 'Terminal H', sub: 'Hajj & Umrah Pilgrims Terminal' },
  { code: 'terminal_n', label: 'Terminal N', sub: 'North International Terminal' },
  { code: 'all_terminals', label: 'All Terminals', sub: 'Uniform Airport Tariff' },
];

export default function DispatcherNewBookingPage() {
  const router = useRouter();
  const {
    currentUser,
    usersList,
    rateRoutes,
    rateVehicles,
    rateTerminals,
    fixedFareRates,
    createBooking,
    uploadPaymentScreenshot,
  } = useApp();

  // ─── Booking Mode: Fixed Fare vs Custom Route ─────────────────────────────
  const [bookingMode, setBookingMode] = useState<'fixed' | 'custom'>('fixed');

  // ─── Customer Selection State ──────────────────────────────────────────────
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Customer Contact Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+966 5');
  const [customerEmail, setCustomerEmail] = useState('');

  // ─── Route & Location State ───────────────────────────────────────────────
  // Fixed Fare mode route
  const [selectedRouteId, setSelectedRouteId] = useState<string>('intercity_jeddah_makkah');
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalCode | null>(null);

  // Custom Locations & Landmarks
  const [pickupLandmarkId, setPickupLandmarkId] = useState<string>(SAUDI_LANDMARKS[0].id);
  const [destLandmarkId, setDestLandmarkId] = useState<string>(SAUDI_LANDMARKS[2].id);
  const [customPickupAddress, setCustomPickupAddress] = useState<string>('');
  const [customDestAddress, setCustomDestAddress] = useState<string>('');
  const [customRouteNotes, setCustomRouteNotes] = useState<string>('');

  // ─── Vehicle & Passengers State ───────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('gmc');
  const [passengerCount, setPassengerCount] = useState<number>(3);

  // ─── Travel Schedule State ────────────────────────────────────────────────
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [travelDate, setTravelDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [travelTime, setTravelTime] = useState<string>(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  // ─── Custom Fare State (for Custom Route) ──────────────────────────────────
  const [customFareInput, setCustomFareInput] = useState<string>('');

  // ─── Payment & Screenshot State ───────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'screenshot' | 'cash'>('screenshot');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Notes & Submission State ─────────────────────────────────────────────
  const [flightOrDispatchNotes, setFlightOrDispatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    reference: string;
    id: string;
    status: BookingStatus;
  } | null>(null);

  // ─── Available Customers List ─────────────────────────────────────────────
  const customersList = useMemo(() => {
    return (usersList || []).filter((u) => u.role === 'customer');
  }, [usersList]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customersList.slice(0, 8);
    const q = customerSearch.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customersList, customerSearch]);

  const selectedCustomerObj = useMemo(() => {
    return customersList.find((c) => c.id === selectedCustomerId) || null;
  }, [customersList, selectedCustomerId]);

  // Handle selecting an existing customer
  const handleSelectCustomer = (customer: Profile) => {
    if (customer.status === 'deactivated' || customer.status === 'suspended') {
      toast.error(`Customer ${customer.full_name} is ${customer.status}. Inactive customers cannot make new bookings.`);
      return;
    }
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.full_name || '');
    setCustomerPhone(customer.phone || '+966 5');
    setCustomerEmail(customer.email || '');
    setIsCustomerDropdownOpen(false);
    setCustomerSearch('');
    toast.success(`Selected customer: ${customer.full_name}`);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('+966 5');
    setCustomerEmail('');
  };

  // ─── Active Rates and Routes Resolution ───────────────────────────────────
  const activeRates = useMemo(() => {
    return (fixedFareRates || []).filter((r) => r.is_active !== false);
  }, [fixedFareRates]);

  const activeServiceTypes = useMemo(() => {
    return getActiveServiceTypes(activeRates, rateRoutes);
  }, [activeRates, rateRoutes]);

  // Combine rateRoutes from DB with default standard labels
  const availableRoutes = useMemo(() => {
    const list: { id: string; name: string; origin: string; dest: string; isAirport: boolean }[] = [];
    const addedIds = new Set<string>();

    if (rateRoutes && rateRoutes.length > 0) {
      rateRoutes
        .filter((r) => r.is_active !== false)
        .forEach((r) => {
          list.push({
            id: r.id,
            name: r.route_name,
            origin: r.origin_name,
            dest: r.destination_name,
            isAirport: Boolean(r.is_airport),
          });
          addedIds.add(r.id);
        });
    }

    // Default canonical routes if not already added
    Object.entries(SERVICE_LABELS).forEach(([id, name]) => {
      if (!addedIds.has(id)) {
        list.push({
          id,
          name,
          origin: id.includes('jeddah') ? 'Jeddah KAIA Airport / Hotel' : 'Makkah Al-Mukarramah',
          dest: id.includes('madinah') ? 'Madinah Al-Munawwarah' : id.includes('taif') ? 'Taif Holy Places' : 'Makkah Al-Mukarramah',
          isAirport: isAirportRoute(id),
        });
        addedIds.add(id);
      }
    });

    return list;
  }, [rateRoutes]);

  // Current route object
  const currentRouteObj = useMemo(() => {
    return availableRoutes.find((r) => r.id === selectedRouteId) || availableRoutes[0] || null;
  }, [availableRoutes, selectedRouteId]);

  const isCurrentRouteAirport = useMemo(() => {
    if (!selectedRouteId) return false;
    return isAirportRoute(selectedRouteId, rateRoutes);
  }, [selectedRouteId, rateRoutes]);

  // Available terminals for current route
  const availableTerminalsForRoute = useMemo(() => {
    if (!isCurrentRouteAirport) return [];
    const dbTerminals = getActiveTerminalsForService(selectedRouteId, activeRates, rateTerminals);
    if (dbTerminals.length > 0) {
      return STANDARD_TERMINALS.filter((t) => dbTerminals.includes(t.code) || t.code === 'all_terminals');
    }
    return STANDARD_TERMINALS;
  }, [isCurrentRouteAirport, selectedRouteId, activeRates, rateTerminals]);

  // Reset or initialize terminal when route changes
  useEffect(() => {
    if (isCurrentRouteAirport) {
      if (!selectedTerminal) {
        setSelectedTerminal(availableTerminalsForRoute[0]?.code || 'terminal_1');
      }
    } else {
      setSelectedTerminal(null);
    }
  }, [selectedRouteId, isCurrentRouteAirport, availableTerminalsForRoute, selectedTerminal]);

  // Populate default pickup & destination when fixed route changes
  useEffect(() => {
    if (bookingMode === 'fixed' && currentRouteObj) {
      if (!customPickupAddress) {
        setCustomPickupAddress(currentRouteObj.origin);
      }
      if (!customDestAddress) {
        setCustomDestAddress(currentRouteObj.dest);
      }
    }
  }, [bookingMode, currentRouteObj]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Vehicles & Dynamic Fixed Fare Calculation ───────────────────────────
  const vehicleCategoriesList: VehicleCategory[] = ['sedan', 'staria', 'gmc', 'hiroof'];

  // Resolve fixed fare for selected combination
  const fixedFareResolution = useMemo(() => {
    if (bookingMode !== 'fixed' || !selectedRouteId) return null;
    return resolveFixedFare(selectedCategory, selectedRouteId, selectedTerminal, activeRates);
  }, [bookingMode, selectedCategory, selectedRouteId, selectedTerminal, activeRates]);

  // Dynamic vehicle fares preview table for current route
  const vehicleFaresPreview = useMemo(() => {
    if (bookingMode !== 'fixed' || !selectedRouteId) return {};
    const map: Record<string, { fare: number | null; found: boolean }> = {};
    vehicleCategoriesList.forEach((cat) => {
      const res = resolveFixedFare(cat, selectedRouteId, selectedTerminal, activeRates);
      map[cat] = {
        fare: res.found ? res.fare : null,
        found: res.found,
      };
    });
    return map;
  }, [bookingMode, selectedRouteId, selectedTerminal, activeRates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Max passengers for chosen vehicle
  const maxPaxForVehicle = useMemo(() => {
    const cap = getVehicleCapacity(selectedCategory, rateVehicles);
    return cap.passengers || 7;
  }, [selectedCategory, rateVehicles]);

  // Keep passenger count clamped within vehicle capacity
  useEffect(() => {
    if (passengerCount > maxPaxForVehicle) {
      setPassengerCount(maxPaxForVehicle);
    }
  }, [maxPaxForVehicle, passengerCount]);

  // Resolved Fare Amount for Preview & Cash card
  const displayFareAmount = useMemo(() => {
    if (bookingMode === 'fixed') {
      return fixedFareResolution?.found ? fixedFareResolution.fare : null;
    }
    const val = parseFloat(customFareInput);
    return isNaN(val) ? null : val;
  }, [bookingMode, fixedFareResolution, customFareInput]);

  // ─── Payment Screenshot Handlers ──────────────────────────────────────────
  const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Receipt file size exceeds 10MB limit.');
      return;
    }

    setPaymentFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPaymentPreviewUrl(objectUrl);
    setPaymentMethod('screenshot');
    toast.success(`Attached receipt: ${file.name}`);
  };

  const handleRemovePaymentFile = () => {
    setPaymentFile(null);
    if (paymentPreviewUrl) {
      URL.revokeObjectURL(paymentPreviewUrl);
      setPaymentPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Removed payment screenshot.');
  };

  // ─── Submission & Validation Handler ──────────────────────────────────────
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // 1. Validate Customer Information
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();

    if (!trimmedName) {
      toast.error('Customer full name is required.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 8) {
      toast.error('Valid customer contact telephone number is required.');
      return;
    }

    // 2. Validate Locations
    const finalPickup = customPickupAddress.trim() ||
      (SAUDI_LANDMARKS.find((l) => l.id === pickupLandmarkId)?.name || 'Makkah Hotel');
    const finalDest = customDestAddress.trim() ||
      (SAUDI_LANDMARKS.find((l) => l.id === destLandmarkId)?.name || 'Jeddah KAIA Terminal');

    if (!finalPickup) {
      toast.error('Pickup origin location is required.');
      return;
    }
    if (!finalDest) {
      toast.error('Destination location is required.');
      return;
    }

    // 3. Mode-Specific Fare Validation
    let resolvedFareAmount: number | null = null;
    let rateId: string | null = null;

    if (bookingMode === 'fixed') {
      if (!fixedFareResolution || !fixedFareResolution.found) {
        toast.error('The selected route and vehicle combination has no active tariff configured. Please choose another vehicle or use Custom Booking.');
        return;
      }
      resolvedFareAmount = fixedFareResolution.fare;
      rateId = fixedFareResolution.rateId;
    } else {
      // Custom Booking: validate manual fare
      const parsedCustomFare = parseFloat(customFareInput);
      if (isNaN(parsedCustomFare) || parsedCustomFare <= 0) {
        toast.error('Please enter a valid agreed custom fare in SAR (greater than 0).');
        return;
      }
      resolvedFareAmount = Math.round(parsedCustomFare * 100) / 100;
    }

    // 4. Validate Terminal for Airport Routes
    if (bookingMode === 'fixed' && isCurrentRouteAirport && !selectedTerminal) {
      toast.error('Airport terminal selection is required for this route.');
      return;
    }

    // 5. Validate Passenger Count
    if (passengerCount < 1 || passengerCount > maxPaxForVehicle) {
      toast.error(`Passenger count must be between 1 and ${maxPaxForVehicle} for this vehicle.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 6. Upload Payment Screenshot (only if paymentMethod is screenshot and file attached)
      let uploadedScreenshotUrl: string | null = null;
      if (paymentMethod === 'screenshot' && paymentFile) {
        toast.loading('Uploading customer transfer proof to Supabase Storage…', { id: 'booking-upload' });
        uploadedScreenshotUrl = await uploadPaymentScreenshot(paymentFile);
        toast.dismiss('booking-upload');
      }

      // 7. Resolve Coordinates
      const pLm = SAUDI_LANDMARKS.find((l) => l.id === pickupLandmarkId) || SAUDI_LANDMARKS[0];
      const dLm = SAUDI_LANDMARKS.find((l) => l.id === destLandmarkId) || SAUDI_LANDMARKS[2];

      const pickupLat = pLm.latitude;
      const pickupLng = pLm.longitude;
      const destLat = dLm.latitude;
      const destLng = dLm.longitude;

      // 8. Determine Scheduled Timestamp
      const scheduledDateTime = scheduleType === 'immediate'
        ? new Date().toISOString()
        : `${travelDate}T${travelTime}:00Z`;

      // 9. Format Notes & Audit Trail
      const routeTitle = bookingMode === 'fixed'
        ? (currentRouteObj?.name || selectedRouteId)
        : `Custom Route: ${finalPickup} → ${finalDest}`;

      const terminalTag = selectedTerminal ? ` | Terminal: ${TERMINAL_LABELS[selectedTerminal] || selectedTerminal}` : '';
      const customTag = bookingMode === 'custom' ? ` [CUSTOM CHARTERED FARE: ${resolvedFareAmount} SAR]` : ` [FIXED TARIFF: ${resolvedFareAmount} SAR]`;
      const staffNotes = `[Created by Dispatcher on behalf of customer] ${routeTitle}${terminalTag}${customTag}${customRouteNotes ? ` | Itinerary: ${customRouteNotes}` : ''}${flightOrDispatchNotes ? ` | Staff Notes: ${flightOrDispatchNotes}` : ''}`;

      // 10. Determine Initial Status
      // If screenshot uploaded -> ALWAYS 'pending_verification' as per Requirement 5!
      // If Cash on Pickup -> 'confirmed' (No screenshot required!)
      const initialStatus: BookingStatus = (paymentMethod === 'screenshot' && uploadedScreenshotUrl)
        ? 'pending_verification'
        : 'confirmed';

      // 11. Create Booking in Supabase
      const newBooking = await createBooking({
        passenger_name: trimmedName,
        passenger_phone: trimmedPhone,
        booking_type: scheduleType,
        booking_method: bookingMode,
        trip_type: 'one_way',
        pickup_address: finalPickup,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        destination_address: finalDest,
        destination_latitude: destLat,
        destination_longitude: destLng,
        vehicle_type: CATEGORY_TO_VEHICLE_TYPE[selectedCategory],
        vehicle_category: selectedCategory,
        service_type: bookingMode === 'fixed' ? selectedRouteId : 'custom_transfer',
        terminal: selectedTerminal,
        fixed_fare_amount: bookingMode === 'fixed' ? resolvedFareAmount : null,
        custom_fare: bookingMode === 'custom' ? resolvedFareAmount : null,
        fare_rate_id: rateId,
        passenger_count: passengerCount,
        notes: staffNotes,
        dispatcher_notes: `Booked by staff desk. Payment Method: ${paymentMethod === 'cash' ? 'Cash on Pickup (Pending Chauffeur Collection)' : (uploadedScreenshotUrl ? 'Bank Transfer (Proof Attached)' : 'Prepaid Online')}.`,
        scheduled_at: scheduledDateTime,
        payment_screenshot_url: (paymentMethod === 'screenshot' && uploadedScreenshotUrl) ? uploadedScreenshotUrl : undefined,
        payment_method: paymentMethod === 'cash' ? 'cash' : (uploadedScreenshotUrl ? 'online' : 'cash'),
        customer_id: selectedCustomerId,
        initial_status: initialStatus,
      });

      setSubmissionSuccess({
        reference: newBooking.booking_reference,
        id: newBooking.id,
        status: newBooking.status,
      });

      if (initialStatus === 'pending_verification') {
        toast.success(`Booking ${newBooking.booking_reference} registered! Placed in 'Pending Verification' queue for payment audit.`);
      } else if (paymentMethod === 'cash') {
        toast.success(`Booking ${newBooking.booking_reference} confirmed with Cash on Pickup! Pending chauffeur cash collection.`);
      } else {
        toast.success(`Booking ${newBooking.booking_reference} registered and confirmed!`);
      }
    } catch (err: unknown) {
      toast.dismiss('booking-upload');
      const msg = err instanceof Error ? err.message : 'Error creating booking.';
      toast.error(msg);
      console.error('Booking submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmissionSuccess(null);
    setCustomerName('');
    setCustomerPhone('+966 5');
    setCustomerEmail('');
    setSelectedCustomerId(null);
    setCustomPickupAddress('');
    setCustomDestAddress('');
    setCustomRouteNotes('');
    setCustomFareInput('');
    setFlightOrDispatchNotes('');
    handleRemovePaymentFile();
  };

  // ─── Render Success Confirmation View ──────────────────────────────────────
  if (submissionSuccess) {
    const isPendingVerification = submissionSuccess.status === 'pending_verification';

    return (
      <div className="page-shell max-w-2xl mx-auto py-12 px-4 animate-fade-in">
        <div className="rounded-3xl bg-card border border-base p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {isPendingVerification ? (
              <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            )}
          </div>

          <div className="space-y-2">
            <span className="type-eyebrow">
              {isPendingVerification ? 'Awaiting Payment Verification' : 'Booking Successfully Registered'}
            </span>
            <h1 className="text-2xl font-black text-primary">
              Reference: <span className="text-emerald-500 font-mono">{submissionSuccess.reference}</span>
            </h1>
            <p className="text-xs text-secondary max-w-md mx-auto">
              {isPendingVerification ? (
                <>
                  The booking and payment screenshot have been safely stored in Supabase. It is currently placed in the{' '}
                  <strong className="text-amber-500">Pending Verification</strong> queue until an authorized dispatcher audits the transfer receipt.
                </>
              ) : (
                <>
                  The booking is confirmed and immediately visible in the active dispatcher queue and customer portal.
                </>
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/80 border border-base max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted">Passenger:</span>
              <strong className="text-primary">{customerName}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Contact:</span>
              <span className="font-mono text-primary">{customerPhone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Service Mode:</span>
              <span className="capitalize font-bold text-emerald-500">{bookingMode} Fare</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Payment Proof:</span>
              <span className={paymentFile ? 'text-emerald-500 font-bold' : 'text-muted'}>
                {paymentFile ? 'Uploaded to Storage' : 'Cash on Pickup'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-3 rounded-xl bg-elevated hover:bg-surface border border-base font-bold text-xs text-primary transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-secondary" />
              <span>Create Another Booking</span>
            </button>
            <Link
              href="/dispatcher/queue"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>View Ride Queue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-5xl space-y-6 pb-16">
      {/* ─── Header & Breadcrumbs ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="type-eyebrow">Staff Operations</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live Supabase Integration
            </span>
          </div>
          <h1 className="type-page-title">Create Booking On Behalf of Customer</h1>
          <p className="text-xs text-secondary">
            Process telephone reservations, airport arrivals, VIP Umrah groups, or custom private charters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dispatcher/queue"
            className="px-3.5 py-2 rounded-xl bg-surface border border-base hover:border-emerald-500/50 text-secondary hover:text-primary text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ride Queue</span>
          </Link>
          <Link
            href="/dispatcher/customers"
            className="px-3.5 py-2 rounded-xl bg-surface border border-base hover:border-emerald-500/50 text-secondary hover:text-primary text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Customers</span>
          </Link>
        </div>
      </div>

      {/* ─── Booking Mode Toggle: Fixed Fare vs Custom ────────────────────── */}
      <div className="p-1.5 rounded-2xl bg-card border border-base flex items-center gap-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setBookingMode('fixed')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            bookingMode === 'fixed'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Fixed-Fare Route (Configured Rates)</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/90">
            System Locked
          </span>
        </button>

        <button
          type="button"
          onClick={() => setBookingMode('custom')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            bookingMode === 'custom'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Route className="w-4 h-4 text-amber-200" />
          <span>Custom Route Booking (Chartered / Bespoke)</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/90">
            Manual Quote
          </span>
        </button>
      </div>

      {/* ─── Main Form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmitBooking} className="space-y-6">
        {/* ── SECTION 1: CUSTOMER SELECTION ───────────────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Customer Identification &amp; Contact</h2>
                <p className="text-[11px] text-muted">Link to an existing customer record or register a new caller.</p>
              </div>
            </div>

            {/* Existing vs New Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-base text-xs">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('existing');
                }}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  customerMode === 'existing'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('new');
                  handleClearSelectedCustomer();
                }}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  customerMode === 'new'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                New / Walk-in
              </button>
            </div>
          </div>

          {/* Searchable Customer Picker (when in Existing mode) */}
          {customerMode === 'existing' && (
            <div className="space-y-2">
              <label className="type-label">Search Registered Customers</label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-muted absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, phone (+966), or email..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-3 text-muted hover:text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isCustomerDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-2xl bg-surface border border-base shadow-2xl p-1.5 space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted">
                        No customers found matching &quot;{customerSearch}&quot;.
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const isDeactivated = cust.status === 'deactivated' || cust.status === 'suspended';
                        const isSelected = selectedCustomerId === cust.id;

                        return (
                          <button
                            key={cust.id}
                            type="button"
                            disabled={isDeactivated}
                            onClick={() => handleSelectCustomer(cust)}
                            className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                                : isDeactivated
                                ? 'opacity-50 cursor-not-allowed bg-rose-500/5'
                                : 'hover:bg-card text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center shrink-0 text-xs border border-emerald-500/20">
                                {cust.full_name?.charAt(0).toUpperCase() || 'P'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold truncate flex items-center gap-1.5">
                                  <span>{cust.full_name || 'Pilgrim Guest'}</span>
                                  {isDeactivated && (
                                    <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-400 font-mono">
                                      Deactivated
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted font-mono">{cust.phone || 'No phone'}</div>
                              </div>
                            </div>

                            {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customer Pill */}
              {selectedCustomerObj && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      {selectedCustomerObj.full_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-primary truncate flex items-center gap-2">
                        <span>{selectedCustomerObj.full_name}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold">
                          Linked Profile
                        </span>
                      </div>
                      <div className="text-[10.5px] text-muted flex items-center gap-3">
                        <span className="font-mono">{selectedCustomerObj.phone}</span>
                        {selectedCustomerObj.email && <span>{selectedCustomerObj.email}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="p-1 rounded-lg hover:bg-surface text-muted hover:text-rose-400 transition-colors"
                    title="Deselect Customer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Customer Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <label className="type-label">Passenger Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Haji Mansoor Al-Harbi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="type-label">Passenger Contact Telephone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="+966 5X XXX XXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-base text-primary font-mono placeholder:text-muted focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: ROUTE & SERVICE SPECIFICATION ────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-base pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary">
                {bookingMode === 'fixed' ? 'Fixed-Fare Route & Terminal' : 'Custom Route Specification'}
              </h2>
              <p className="text-[11px] text-muted">
                {bookingMode === 'fixed'
                  ? 'Select an active route tariff configured in Admin Rates.'
                  : 'Define custom pickup and destination points for non-standard routes.'}
              </p>
            </div>
          </div>

          {/* FIXED FARE MODE: Route & Terminal Dropdowns */}
          {bookingMode === 'fixed' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="type-label">Select Pre-Configured Route *</label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedRouteId(newId);
                      const r = availableRoutes.find((x) => x.id === newId);
                      if (r) {
                        setCustomPickupAddress(r.origin);
                        setCustomDestAddress(r.dest);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs cursor-pointer font-medium"
                  >
                    {availableRoutes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isAirport ? '✈️ (Airport)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Airport Terminal Selector */}
                {isCurrentRouteAirport ? (
                  <div>
                    <label className="type-label flex items-center justify-between">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Plane className="w-3.5 h-3.5" /> Airport Terminal *
                      </span>
                      <span className="text-[10px] text-muted font-normal">Terminal-specific pricing</span>
                    </label>
                    <select
                      value={selectedTerminal || ''}
                      onChange={(e) => setSelectedTerminal(e.target.value as TerminalCode)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-amber-500/40 text-primary focus:outline-none focus:border-amber-500 text-xs cursor-pointer font-medium"
                    >
                      {availableTerminalsForRoute.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label} — {t.sub}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="type-label">Service Category</label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-surface border border-base text-secondary text-xs flex items-center justify-between">
                      <span>Intercity VIP / Sacred Ziyarat Tour</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        Direct Highway
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup and Destination Details for Fixed Route */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="type-label">Pickup Origin &amp; Gate Details *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KAIA Terminal 1, Gate 4 or Hotel Lobby"
                    value={customPickupAddress}
                    onChange={(e) => setCustomPickupAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <div className="flex items-center gap-1 mt-1 text-[10.5px] text-muted">
                    <span>Quick Landmark:</span>
                    <select
                      onChange={(e) => {
                        const lm = SAUDI_LANDMARKS.find((l) => l.id === e.target.value);
                        if (lm) {
                          setPickupLandmarkId(lm.id);
                          setCustomPickupAddress(`${lm.name} (${lm.city})`);
                        }
                      }}
                      className="bg-transparent text-emerald-500 hover:underline cursor-pointer border-none outline-none text-[10.5px]"
                    >
                      <option value="">Select popular place...</option>
                      {SAUDI_LANDMARKS.map((l) => (
                        <option key={`p-${l.id}`} value={l.id}>
                          {l.city}: {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="type-label">Destination Address or Hotel *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jabal Omar Hilton Makkah / Clock Tower"
                    value={customDestAddress}
                    onChange={(e) => setCustomDestAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <div className="flex items-center gap-1 mt-1 text-[10.5px] text-muted">
                    <span>Quick Landmark:</span>
                    <select
                      onChange={(e) => {
                        const lm = SAUDI_LANDMARKS.find((l) => l.id === e.target.value);
                        if (lm) {
                          setDestLandmarkId(lm.id);
                          setCustomDestAddress(`${lm.name} (${lm.city})`);
                        }
                      }}
                      className="bg-transparent text-emerald-500 hover:underline cursor-pointer border-none outline-none text-[10.5px]"
                    >
                      <option value="">Select popular place...</option>
                      {SAUDI_LANDMARKS.map((l) => (
                        <option key={`d-${l.id}`} value={l.id}>
                          {l.city}: {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM BOOKING MODE: Freeform Origin, Destination, Itinerary */}
          {bookingMode === 'custom' && (
            <div className="space-y-4 text-xs animate-fade-in">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-secondary">
                  Custom routes allow you to arrange private chartered transfers for cities or stops not listed in standard tariffs.
                  Enter the exact pickup and drop-off addresses along with the manually agreed custom fare.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="type-label">Custom Pickup Origin *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Hamra Corniche, Jeddah or Yanbu Port"
                    value={customPickupAddress}
                    onChange={(e) => setCustomPickupAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <div className="flex items-center gap-1 mt-1 text-[10.5px] text-muted">
                    <span>Or pick standard landmark:</span>
                    <select
                      onChange={(e) => {
                        const lm = SAUDI_LANDMARKS.find((l) => l.id === e.target.value);
                        if (lm) {
                          setPickupLandmarkId(lm.id);
                          setCustomPickupAddress(`${lm.name} (${lm.city})`);
                        }
                      }}
                      className="bg-transparent text-amber-500 hover:underline cursor-pointer border-none outline-none text-[10.5px]"
                    >
                      <option value="">Select landmark...</option>
                      {SAUDI_LANDMARKS.map((l) => (
                        <option key={`cp-${l.id}`} value={l.id}>
                          {l.city}: {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="type-label">Custom Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al Ula Heritage Site or King Abdullah Economic City"
                    value={customDestAddress}
                    onChange={(e) => setCustomDestAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <div className="flex items-center gap-1 mt-1 text-[10.5px] text-muted">
                    <span>Or pick standard landmark:</span>
                    <select
                      onChange={(e) => {
                        const lm = SAUDI_LANDMARKS.find((l) => l.id === e.target.value);
                        if (lm) {
                          setDestLandmarkId(lm.id);
                          setCustomDestAddress(`${lm.name} (${lm.city})`);
                        }
                      }}
                      className="bg-transparent text-amber-500 hover:underline cursor-pointer border-none outline-none text-[10.5px]"
                    >
                      <option value="">Select landmark...</option>
                      {SAUDI_LANDMARKS.map((l) => (
                        <option key={`cd-${l.id}`} value={l.id}>
                          {l.city}: {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="type-label">Custom Route Details &amp; Intermediate Stops</label>
                <textarea
                  rows={2}
                  placeholder="Specify waypoints, road preferences, waiting time, or multi-day itinerary details..."
                  value={customRouteNotes}
                  onChange={(e) => setCustomRouteNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: VEHICLE CLASS & PASSENGERS ───────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Vehicle Class &amp; Capacity</h2>
                <p className="text-[11px] text-muted">Choose the VIP luxury fleet class and verify passenger capacity.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="type-label mb-0">Passengers:</label>
              <input
                type="number"
                min={1}
                max={maxPaxForVehicle}
                value={passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                className="w-16 px-2.5 py-1.5 rounded-lg bg-input border border-base text-primary text-center font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-muted">Max: {maxPaxForVehicle}</span>
            </div>
          </div>

          {/* Vehicle Selection Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {vehicleCategoriesList.map((category) => {
              const isSelected = selectedCategory === category;
              const cap = getVehicleCapacity(category, rateVehicles);
              const preview = vehicleFaresPreview[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-surface/50 border-base hover:border-emerald-500/40 hover:bg-surface'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-xs">
                        {getVehicleLabel(category, rateVehicles)}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10.5px] text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {cap.passengers} Pax
                      </span>
                      <span className="flex items-center gap-1">
                        <Luggage className="w-3 h-3 text-amber-500" />
                        {cap.luggage} Bags
                      </span>
                    </div>
                  </div>

                  {/* Price display in card (for Fixed Fare mode) */}
                  {bookingMode === 'fixed' && (
                    <div className="pt-2 border-t border-base/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted">Tariff:</span>
                      {preview?.found ? (
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatFareSAR(preview.fare || 0)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted italic">Unavailable</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 4: TRAVEL SCHEDULE ──────────────────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Travel Schedule &amp; Timing</h2>
                <p className="text-[11px] text-muted">Dispatch immediately as ASAP or schedule for an upcoming flight arrival.</p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-base text-xs">
              <button
                type="button"
                onClick={() => setScheduleType('immediate')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  scheduleType === 'immediate'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Immediate / ASAP
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('scheduled')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  scheduleType === 'scheduled'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Scheduled Trip
              </button>
            </div>
          </div>

          {scheduleType === 'scheduled' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="type-label">Travel Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="type-label">Travel Time *</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 5: FARE & CALCULATION (FIXED vs CUSTOM) ──────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-base pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary">Fare Calculation &amp; Tariff</h2>
              <p className="text-[11px] text-muted">
                {bookingMode === 'fixed'
                  ? 'Guaranteed tariff automatically retrieved from active rates.'
                  : 'Manually agreed custom fare in Saudi Riyal (SAR).'}
              </p>
            </div>
          </div>

          {/* FIXED FARE BOX */}
          {bookingMode === 'fixed' && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Guaranteed Pre-Configured Tariff
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Lock className="w-2.5 h-2.5" /> Non-Editable
                  </span>
                </div>
                <p className="text-[11px] text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>All-inclusive VIP rate · Zero surge pricing · Confirmed from Supabase database</span>
                </p>
              </div>

              <div className="text-right shrink-0">
                {fixedFareResolution?.found ? (
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatFareSAR(fixedFareResolution.fare)}
                  </div>
                ) : (
                  <div className="text-sm font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30">
                    Tariff Not Configured
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOM FARE INPUT */}
          {bookingMode === 'custom' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-950">
                      Manually Agreed Custom Fare *
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                      Custom Quote
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Enter the exact rate agreed upon with the customer for this custom transfer.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-56">
                  <span className="text-xs font-bold text-primary shrink-0">SAR</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 450"
                    value={customFareInput}
                    onChange={(e) => setCustomFareInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-amber-500/50 text-primary font-mono text-base font-bold placeholder:text-muted focus:outline-none focus:border-amber-400 text-right"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 6: PAYMENT & PROOF SCREENSHOT ───────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Payment Details &amp; Proof Screenshot</h2>
                <p className="text-[11px] text-muted">
                  Attach WhatsApp or banking transfer receipts received from the customer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-base text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('screenshot')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  paymentMethod === 'screenshot'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Bank Transfer / Proof
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  if (paymentFile) {
                    setPaymentFile(null);
                  }
                  if (paymentPreviewUrl) {
                    URL.revokeObjectURL(paymentPreviewUrl);
                    setPaymentPreviewUrl(null);
                  }
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Cash on Pickup
              </button>
            </div>
          </div>

          {/* Conditional Payment UI: Cash on Pickup VS Screenshot Proof */}
          {paymentMethod === 'cash' ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3.5 text-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950 text-sm">Cash on Pickup</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-200 text-amber-950 border border-amber-400">
                      Pending Cash Collection
                    </span>
                  </div>
                  <span className="text-amber-950 font-mono font-bold text-xs bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                    {displayFareAmount ? `${displayFareAmount} SAR` : 'Agreed Tariff'}
                  </span>
                </div>
                <p className="text-secondary text-xs leading-relaxed">
                  No customer payment screenshot is required. The assigned chauffeur will collect the total fare of{' '}
                  <strong className="text-primary font-semibold">
                    {displayFareAmount ? `${displayFareAmount} SAR` : 'agreed tariff'}
                  </strong>{' '}
                  directly from the passenger upon pickup or dropoff.
                </p>
                <div className="text-[11px] text-muted flex items-center gap-1.5 pt-1 border-t border-amber-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Click <strong>Confirm Payment &amp; Dispatch Booking</strong> to immediately confirm booking and place it in the dispatch queue.</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Audit Notice Badge (Requirement 5) */}
              <div className="p-3 rounded-2xl bg-surface border border-base/80 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-secondary space-y-0.5">
                  <strong className="text-primary block">Payment Verification Policy</strong>
                  <span>
                    Uploading a screenshot will safely save the proof in Supabase Storage and register the booking as{' '}
                    <strong className="text-amber-500 font-semibold">Pending Verification</strong>.
                    It will NOT mark the payment as verified automatically until staff reviews and verifies it in the Queue.
                  </span>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePaymentFileChange}
                className="hidden"
                id="dispatcher-payment-proof-upload"
              />

              {/* Screenshot Upload or Preview Area */}
              {!paymentPreviewUrl ? (
                <label
                  htmlFor="dispatcher-payment-proof-upload"
                  className="cursor-pointer border-2 border-dashed border-base hover:border-emerald-500/60 rounded-2xl p-6 bg-surface/40 hover:bg-surface flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-primary group-hover:text-emerald-500 transition-colors">
                      Click to Upload Customer Payment Screenshot / Transfer Slip
                    </span>
                    <p className="text-[10.5px] text-muted mt-0.5">
                      Supports JPG, PNG, or WebP files up to 10MB (stored in Supabase Storage)
                    </p>
                  </div>
                </label>
              ) : (
                <div className="rounded-2xl bg-surface border border-emerald-500/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-primary truncate max-w-[70%]">
                      <FileImage className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{paymentFile?.name || 'Attached Receipt Slip'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="dispatcher-payment-proof-upload"
                        className="text-[11px] text-emerald-500 hover:underline font-bold cursor-pointer"
                      >
                        Replace Image
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePaymentFile}
                        className="text-[11px] text-rose-500 hover:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="relative rounded-xl overflow-hidden max-h-48 border border-base bg-card flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentPreviewUrl}
                      alt="Customer Payment Receipt"
                      className="max-h-44 object-contain w-full rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>File Size: {paymentFile ? (paymentFile.size / 1024).toFixed(1) + ' KB' : 'N/A'}</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for upload to Supabase
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── SECTION 7: FLIGHT / DISPATCH NOTES ───────────────────────────── */}
        <div className="rounded-3xl bg-card border border-base p-6 space-y-3 shadow-xl text-xs">
          <label className="type-label">Flight Number, Baggage or Meetup Notes</label>
          <textarea
            rows={2}
            value={flightOrDispatchNotes}
            onChange={(e) => setFlightOrDispatchNotes(e.target.value)}
            placeholder="e.g. Flight SV382 from Jakarta, terminal greeting sign 'Haji Mansoor Group', heavy luggage..."
            className="w-full px-4 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* ── SECTION 8: SUBMIT BUTTON ────────────────────────────────────── */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={isSubmitting || (bookingMode === 'fixed' && !fixedFareResolution?.found)}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>
                  {paymentMethod === 'cash'
                    ? 'Confirming Payment & Registering…'
                    : 'Registering Booking & Uploading Proof…'}
                </span>
              </>
            ) : (
              <>
                <Briefcase className="w-4 h-4" />
                <span>
                  {paymentMethod === 'cash'
                    ? 'Confirm Payment & Dispatch Booking'
                    : paymentFile
                    ? 'Confirm & Register Booking (Pending Verification)'
                    : 'Confirm & Dispatch Booking'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-[10.5px] text-muted">
            The booking will be immediately persisted to Supabase and published to the Ride Queue and Customer Portal.
          </p>
        </div>
      </form>
    </div>
  );
}
