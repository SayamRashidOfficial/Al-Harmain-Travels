'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatFareSAR, VEHICLE_LABELS } from '@/lib/fixed-fare';
import { SAUDI_LANDMARKS } from '@/lib/geo';
import {
  VehicleType,
  Booking,
  BookingStatus,
  RatingFeedback,
  PaymentMethod,
  PaymentStatus,
} from '@/types';
import {
  PhoneCall,
  PlusCircle,
  Search,
  Filter,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  CheckCircle,
  XCircle,
  UserCheck,
  Zap,
  X,
  User,
  ShieldAlert,
  ShieldCheck,
  Eye,
  RefreshCw,
  AlertCircle,
  FileCheck,
  FileText,
  CreditCard,
  Navigation,
  Layers,
  DollarSign,
  MessageSquare,
  MessageCircle,
  Star,
  Building2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Luggage,
  Banknote,
  Receipt,
  Calendar,
  CalendarClock,
  Edit3,
  Loader2,
} from 'lucide-react';
import { TableSkeletonRows } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';
import {
  checkDriverOverlap,
  getEligibleDriversForBooking,
  getDriverAssignedVehicle,
} from '@/lib/assignment-utils';
import dynamic from 'next/dynamic';
const EditScheduleModal = dynamic(() => import('@/components/shared/EditScheduleModal'), { ssr: false });

type QueueStatusFilter =
  | 'all'
  | 'pending_review'
  | 'pending_verification'
  | 'confirmed'
  | 'assigned'
  | 'active'
  | 'completed'
  | 'cancelled';

function isCustomRouteReviewBooking(b: Booking): boolean {
  return b.status === 'pending_review';
}

function isPendingPaymentBooking(b: Booking): boolean {
  return b.status === 'pending_verification' || b.status === 'payment_pending';
}

function isConfirmedBooking(b: Booking): boolean {
  return b.status === 'confirmed' || b.status === 'payment_verified';
}

function isAssignedBooking(b: Booking): boolean {
  return b.status === 'driver_assigned';
}

function isActiveTripBooking(b: Booking): boolean {
  return (
    b.status === 'driver_accepted' ||
    b.status === 'accepted' ||
    b.status === 'driver_arriving' ||
    b.status === 'on_the_way' ||
    b.status === 'driver_arrived' ||
    b.status === 'arrived' ||
    b.status === 'trip_started' ||
    b.status === 'started' ||
    b.status === 'ride_started'
  );
}

function isCompletedBooking(b: Booking): boolean {
  return (
    b.status === 'trip_completed' ||
    b.status === 'ride_completed' ||
    b.status === 'payment_completed' ||
    b.status === 'completed'
  );
}

function isCancelledBooking(b: Booking): boolean {
  return (
    b.status === 'cancelled' ||
    b.status === 'rejected' ||
    b.status === 'payment_rejected' ||
    b.status === 'no_show'
  );
}

function getFormattedVehicleName(b: Booking): string {
  if (b.vehicle_category && VEHICLE_LABELS[b.vehicle_category]) {
    return VEHICLE_LABELS[b.vehicle_category];
  }
  if (b.vehicle_type) {
    switch (b.vehicle_type) {
      case 'vip_gmc':
        return 'VIP GMC Yukon XL';
      case 'sedan':
        return 'Executive Sedan';
      case 'suv':
        return 'Family SUV';
      case 'van':
        return 'Hyundai Staria VIP';
      case 'bus':
        return 'Luxury Bus / HiRoof';
      default:
        return String(b.vehicle_type).replace(/_/g, ' ');
    }
  }
  return 'VIP Vehicle';
}

export default function DispatcherQueuePage() {
  const {
    bookings,
    drivers,
    vehicles,
    rateVehicles,
    usersList,
    createBooking,
    confirmBooking,
    verifyPayment,
    rejectPayment,
    rejectBooking,
    setCustomBookingFare,
    assignDriver,
    reassignDriver,
    autoAssignDriver,
    settings,
    ratings,
    isDataLoading,
    refreshData,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync fresh bookings directly from Supabase on mount
  useEffect(() => {
    refreshData().catch(() => {});
  }, [refreshData]);

  // Live Supabase Realtime subscription for instant queue updates on bookings and payment actions
  useEffect(() => {
    const channel = supabase
      .channel('dispatcher-queue-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        refreshData().catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        refreshData().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Live ride queue synchronized with Supabase');
    } catch {
      toast.error('Failed to sync queue data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Deduplicate bookings by ID to prevent duplicate counting and duplicate table records
  const deduplicatedBookings = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings) {
      if (b?.id && !map.has(b.id)) {
        map.set(b.id, b);
      }
    }
    return Array.from(map.values());
  }, [bookings]);

  // Compute live, mutually exclusive counts matching each filter
  const counts = useMemo(() => {
    let all = 0;
    let pending_review = 0;
    let pending_verification = 0;
    let confirmed = 0;
    let assigned = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;

    for (const b of deduplicatedBookings) {
      all++;
      if (isCustomRouteReviewBooking(b)) {
        pending_review++;
      } else if (isPendingPaymentBooking(b)) {
        pending_verification++;
      } else if (isConfirmedBooking(b)) {
        confirmed++;
      } else if (isAssignedBooking(b)) {
        assigned++;
      } else if (isActiveTripBooking(b)) {
        active++;
      } else if (isCompletedBooking(b)) {
        completed++;
      } else if (isCancelledBooking(b)) {
        cancelled++;
      }
    }

    return {
      all,
      pending_review,
      pending_verification,
      confirmed,
      assigned,
      active,
      completed,
      cancelled,
    };
  }, [deduplicatedBookings]);

  // Comprehensive View Details Modal
  const [viewBookingModal, setViewBookingModal] = useState<Booking | null>(null);

  // Edit / Reschedule Schedule Modal State
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<Booking | null>(null);

  // Phone Call-In Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);

  // Driver Assignment Modal State
  const [assignModalBooking, setAssignModalBooking] = useState<Booking | null>(null);
  const [isReassignMode, setIsReassignMode] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Payment Verification Modal State
  const [verifyModalBooking, setVerifyModalBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('Transaction reference not found in bank statement');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Custom Route Quote Modal State
  const [quoteModalBooking, setQuoteModalBooking] = useState<Booking | null>(null);
  const [quoteFareAmount, setQuoteFareAmount] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [isQuoting, setIsQuoting] = useState<boolean>(false);

  // Reject Booking Request Modal State
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [bookingRejectReason, setBookingRejectReason] = useState<string>('Vehicle unavailable for requested schedule');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Stops Detail Modal State
  const [detailModalBooking, setDetailModalBooking] = useState<Booking | null>(null);

  // Quick receipt view modal
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);

  // Review view modal
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<{ booking: Booking; rating: RatingFeedback } | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form for dispatcher creating booking for call-in customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [pickupLm, setPickupLm] = useState(SAUDI_LANDMARKS[0].id);
  const [destLm, setDestLm] = useState(SAUDI_LANDMARKS[2].id);
  const [vType, setVType] = useState<VehicleType>('vip_gmc');
  const [pax, setPax] = useState(2);
  const [notes, setNotes] = useState('');

  const pendingVerificationCount = counts.pending_verification;
  const pendingReviewCount = counts.pending_review;

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModalBooking) return;
    const num = parseFloat(quoteFareAmount);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid fare amount in SAR.');
      return;
    }
    setIsQuoting(true);
    try {
      await setCustomBookingFare(quoteModalBooking.id, num, quoteNotes.trim());
      await confirmBooking(quoteModalBooking.id);
      setQuoteModalBooking(null);
      setQuoteFareAmount('');
      setQuoteNotes('');
      toast.success(`Fare of SAR ${num} confirmed for ${quoteModalBooking.booking_reference}`);
    } catch {
      toast.error('Failed to confirm fare.');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleRejectBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalBooking) return;
    setIsRejecting(true);
    try {
      const finalReason =
        bookingRejectReason === 'other'
          ? customRejectReason.trim() || 'Vehicle or route unavailable for requested schedule'
          : bookingRejectReason.trim();
      await rejectBooking(rejectModalBooking.id, finalReason);
      setRejectModalBooking(null);
      setCustomRejectReason('');
      toast.info(`Booking ${rejectModalBooking.booking_reference} declined.`);
    } catch {
      toast.error('Failed to decline booking.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePhoneBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      toast.error('Customer name and phone are required for dispatch.');
      return;
    }

    const p = SAUDI_LANDMARKS.find((l) => l.id === pickupLm) || SAUDI_LANDMARKS[0];
    const d = SAUDI_LANDMARKS.find((l) => l.id === destLm) || SAUDI_LANDMARKS[2];

    const booking = await createBooking({
      passenger_name: custName,
      passenger_phone: custPhone,
      booking_type: 'immediate',
      pickup_address: `${p.name} (${p.city})`,
      pickup_latitude: p.latitude,
      pickup_longitude: p.longitude,
      destination_address: `${d.name} (${d.city})`,
      destination_latitude: d.latitude,
      destination_longitude: d.longitude,
      vehicle_type: vType,
      passenger_count: pax,
      notes: `[Phone Booking via Dispatch] ${notes}`,
    });

    // Auto-verify phone reservation created by staff directly
    await confirmBooking(booking.id);
    await autoAssignDriver(booking.id);
    setModalOpen(false);
    setCustName('');
    setCustPhone('');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalBooking || !selectedDriverId) return;

    if (isReassignMode) {
      await reassignDriver(assignModalBooking.id, selectedDriverId);
    } else {
      await assignDriver(assignModalBooking.id, selectedDriverId);
    }

    setAssignModalBooking(null);
    setSelectedDriverId('');
    setIsReassignMode(false);
  };

  const handleVerifySubmit = async () => {
    if (!verifyModalBooking) return;
    await verifyPayment(verifyModalBooking.id);
    setVerifyModalBooking(null);
    setShowRejectForm(false);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalBooking) return;
    const finalReason = customRejectReason.trim() || rejectReason;
    await rejectPayment(verifyModalBooking.id, finalReason);
    setVerifyModalBooking(null);
    setShowRejectForm(false);
    setCustomRejectReason('');
  };

  const activeFleetDrivers = drivers.filter((d) => d.status !== 'offline');

  // Compute drivers strictly eligible for the modal booking:
  // 1. Must have an assigned vehicle.
  // 2. Assigned vehicle MUST match the customer's demanded vehicle category.
  const eligibleDriversForModal = useMemo(() => {
    if (!assignModalBooking) return [];
    return getEligibleDriversForBooking(assignModalBooking, drivers, rateVehicles, vehicles);
  }, [assignModalBooking, drivers, rateVehicles, vehicles]);

  const handleOpenAssignModal = (b: Booking, isReassign: boolean = false) => {
    const eligible = getEligibleDriversForBooking(b, drivers, rateVehicles, vehicles);
    const currentAssigned = isReassign ? eligible.find((d) => d.id === b.assigned_driver_id) : undefined;
    const firstNonConflicting = eligible.find(
      (d) =>
        d.id !== b.assigned_driver_id &&
        !checkDriverOverlap(
          bookings.filter((bk) => bk.assigned_driver_id === d.id),
          b
        ).hasOverlap
    );

    setAssignModalBooking(b);
    setIsReassignMode(isReassign);
    setSelectedDriverId(currentAssigned?.id || firstNonConflicting?.id || eligible[0]?.id || '');
  };

  const filtered = useMemo(() => {
    return deduplicatedBookings.filter((b) => {
      // 1. Status Filter matching
      let matchesStatus = true;
      switch (statusFilter) {
        case 'all':
          matchesStatus = true;
          break;
        case 'pending_review':
          matchesStatus = isCustomRouteReviewBooking(b);
          break;
        case 'pending_verification':
          matchesStatus = isPendingPaymentBooking(b);
          break;
        case 'confirmed':
          matchesStatus = isConfirmedBooking(b);
          break;
        case 'assigned':
          matchesStatus = isAssignedBooking(b);
          break;
        case 'active':
          matchesStatus = isActiveTripBooking(b);
          break;
        case 'completed':
          matchesStatus = isCompletedBooking(b);
          break;
        case 'cancelled':
          matchesStatus = isCancelledBooking(b);
          break;
        default:
          matchesStatus = true;
          break;
      }

      if (!matchesStatus) return false;

      // 2. Search query matching
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.booking_reference.toLowerCase().includes(q) ||
        b.passenger_name.toLowerCase().includes(q) ||
        b.passenger_phone.includes(q) ||
        b.pickup_address.toLowerCase().includes(q) ||
        b.destination_address.toLowerCase().includes(q) ||
        (b.vehicle_category && b.vehicle_category.toLowerCase().includes(q)) ||
        (b.status && b.status.toLowerCase().includes(q))
      );
    });
  }, [deduplicatedBookings, statusFilter, search]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-700 shrink-0" /> Awaiting Quote Review
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-950 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700 shrink-0" /> Awaiting Verification
          </span>
        );
      case 'payment_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" /> Pending Payment
          </span>
        );
      case 'payment_rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-900 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-700 shrink-0" /> Payment Rejected
          </span>
        );
      case 'confirmed':
      case 'payment_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-900 border border-sky-300">
            <CheckCircle2 className="w-3 h-3 text-sky-700 shrink-0" /> Confirmed / Ready
          </span>
        );
      case 'driver_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-900 border border-teal-300">
            <UserCheck className="w-3 h-3 text-teal-700 shrink-0" /> Driver Assigned
          </span>
        );
      case 'accepted':
      case 'driver_accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-300">
            <CheckCircle2 className="w-3 h-3 text-indigo-700 shrink-0" /> Driver Accepted
          </span>
        );
      case 'on_the_way':
      case 'driver_arriving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-300">
            <Car className="w-3 h-3 text-emerald-700 shrink-0" /> On The Way
          </span>
        );
      case 'arrived':
      case 'driver_arrived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-300">
            <MapPin className="w-3 h-3 text-cyan-700 shrink-0" /> Arrived at Pickup
          </span>
        );
      case 'started':
      case 'trip_started':
      case 'ride_started':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-400">
            <Navigation className="w-3 h-3 text-emerald-800 shrink-0" /> Trip In Progress
          </span>
        );
      case 'completed':
      case 'trip_completed':
      case 'ride_completed':
      case 'payment_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" /> Completed
          </span>
        );
      case 'cancelled':
      case 'rejected':
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-900 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600 shrink-0" /> Cancelled / Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface text-slate-700 border border-base">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (b: Booking) => {
    const isPaid =
      b.payment_status === 'paid' ||
      b.payment_status === 'confirmed' ||
      b.status === 'payment_verified' ||
      b.status === 'payment_completed';
    const isRejected =
      b.status === 'payment_rejected' ||
      b.payment_status === 'failed';
    const isPendingProof = b.status === 'pending_verification' && !isRejected;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          {b.payment_method === 'cash' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              <Banknote className="w-3 h-3 text-slate-600" /> Cash
            </span>
          ) : b.payment_method === 'card' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
              <CreditCard className="w-3 h-3 text-blue-700" /> Card
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-950 border border-amber-200">
              <Building2 className="w-3 h-3 text-amber-700" /> Bank Transfer
            </span>
          )}

          {isPaid ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <CheckCircle className="w-2.5 h-2.5 text-emerald-700" /> Paid
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
              <XCircle className="w-2.5 h-2.5 text-rose-700" /> Rejected
            </span>
          ) : isPendingProof ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
              <Clock className="w-2.5 h-2.5 text-amber-700" /> Pending Audit
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Pending
            </span>
          )}
        </div>

        {b.payment_screenshot_url && (
          <button
            type="button"
            onClick={() => setViewScreenshotUrl(b.payment_screenshot_url!)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 hover:text-amber-950 hover:underline cursor-pointer"
            title="View customer payment receipt screenshot"
          >
            <Eye className="w-3 h-3 text-amber-700" /> View Proof
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="page-shell space-y-6">
      {/* Header */}
      <div className="bg-card border border-base p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="type-eyebrow">Staff / Dispatch Operations</span>
          <h1 className="type-page-title mt-1">Bookings Queue &amp; VIP Chauffeur Dispatch</h1>
          <p className="text-xs text-secondary">
            Live database queue: audit customer transfer proofs, inspect itineraries, verify schedules, and assign executive drivers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-surface hover:bg-card-hover border border-base text-secondary hover:text-primary text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh ride queue directly from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+ Create Call-In Booking</span>
          </button>
        </div>
      </div>

      {/* Pending Custom Route Review Alert */}
      {pendingReviewCount > 0 && (
        <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-purple-950">
                {pendingReviewCount} Custom Route Booking{pendingReviewCount > 1 ? 's' : ''} Awaiting Fare Review &amp; Confirmation
              </h4>
              <p className="text-xs text-purple-900 font-medium">
                Customers requested custom itineraries without upfront fares. Contact passenger, agree on price, and quote the fare.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_review')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm self-end sm:self-auto shrink-0 cursor-pointer"
          >
            Review Custom Routes &rarr;
          </button>
        </div>
      )}

      {/* Pending Payment Verification Banner Alert */}
      {pendingVerificationCount > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                {pendingVerificationCount} Booking{pendingVerificationCount > 1 ? 's' : ''} Awaiting Payment Proof Verification
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                Customers have uploaded bank transfer receipts. Verify funds to release bookings for driver assignment.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_verification')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow self-end sm:self-auto shrink-0 cursor-pointer"
          >
            Review Pending &rarr;
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-card border border-base p-3 rounded-3xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 xl:pb-0 scrollbar-none -mx-0.5 px-0.5">
          {[
            {
              id: 'all' as QueueStatusFilter,
              label: 'All Bookings',
              count: counts.all,
              icon: Layers,
              activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: 'bg-surface text-secondary border-base/80',
            },
            {
              id: 'pending_review' as QueueStatusFilter,
              label: 'Custom Route Review',
              count: counts.pending_review,
              icon: FileText,
              color: 'text-purple-900 hover:text-purple-950 bg-purple-100 hover:bg-purple-200 border-purple-300 font-bold',
              activeColor: 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor:
                counts.pending_review > 0
                  ? 'bg-purple-100 text-purple-950 border-purple-300 font-bold'
                  : 'bg-surface text-slate-700 border-base',
              highlight: counts.pending_review > 0,
            },
            {
              id: 'pending_verification' as QueueStatusFilter,
              label: 'Pending Payment',
              count: counts.pending_verification,
              icon: CreditCard,
              color: 'text-amber-950 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300 font-bold',
              activeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-950/20',
              badgeActiveColor: 'bg-slate-950/20 text-slate-950 border-slate-950/30 font-extrabold',
              badgeInactiveColor:
                counts.pending_verification > 0
                  ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                  : 'bg-surface text-slate-700 border-base',
              highlight: counts.pending_verification > 0,
            },
            {
              id: 'confirmed' as QueueStatusFilter,
              label: 'Confirmed',
              count: counts.confirmed,
              icon: CheckCircle2,
              activeColor: 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-md shadow-sky-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: 'bg-surface text-secondary border-base/80',
            },
            {
              id: 'assigned' as QueueStatusFilter,
              label: 'Assigned',
              count: counts.assigned,
              icon: UserCheck,
              activeColor: 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md shadow-teal-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: 'bg-surface text-secondary border-base/80',
            },
            {
              id: 'active' as QueueStatusFilter,
              label: 'Active Trips',
              count: counts.active,
              icon: Navigation,
              color: 'text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border-emerald-300',
              activeColor: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor:
                counts.active > 0
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold'
                  : 'bg-surface text-muted border-base',
              highlight: counts.active > 0,
            },
            {
              id: 'completed' as QueueStatusFilter,
              label: 'Completed',
              count: counts.completed,
              icon: CheckCircle,
              activeColor: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md shadow-slate-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: 'bg-surface text-secondary border-base/80',
            },
            {
              id: 'cancelled' as QueueStatusFilter,
              label: 'Cancelled',
              count: counts.cancelled,
              icon: XCircle,
              activeColor: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: 'bg-surface text-secondary border-base/80',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                aria-label={`${tab.label} (${tab.count})`}
                title={`${tab.label} (${tab.count})`}
                className={`group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer border shrink-0 select-none ${
                  isActive
                    ? `${tab.activeColor} border-transparent font-bold`
                    : tab.highlight
                    ? tab.color
                    : 'text-secondary hover:text-primary bg-surface/50 hover:bg-surface border-base/70 hover:border-base'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-current' : 'opacity-80 group-hover:opacity-100'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold border tabular-nums transition-colors shadow-xs ${
                    isActive ? tab.badgeActiveColor : tab.badgeInactiveColor
                  }`}
                >
                  {tab.count}
                </span>
                {tab.id === 'active' && tab.count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full xl:w-80 shrink-0">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
          <input
            type="text"
            placeholder="Search ref, customer, phone, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearch('');
            }}
            className="w-full bg-input/80 border border-base rounded-2xl pl-10 pr-9 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-muted bg-surface border border-base/80 pointer-events-none">
              ESC
            </span>
          )}
        </div>
      </div>

      {/* Active Search Feedback Bar */}
      {search.trim() && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface/70 border border-base rounded-2xl text-xs text-secondary animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Searching for &ldquo;<strong className="text-primary">{search}</strong>&rdquo;
            </span>
            <span className="text-muted">&bull;</span>
            <span className="font-semibold text-emerald-700">
              {filtered.length} ride{filtered.length === 1 ? '' : 's'} matching
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear search
          </button>
        </div>
      )}

      {/* Bookings Queue Table */}
      <div className="bg-card border border-base rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-secondary border-collapse">
            <thead className="bg-surface/90 text-slate-800 uppercase font-bold text-[10.5px] tracking-wider border-b border-base sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[190px]">Booking Ref</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[185px]">Customer</th>
                <th className="py-3.5 px-3.5 min-w-[210px]">Pickup Location</th>
                <th className="py-3.5 px-3.5 min-w-[210px]">Destination</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Scheduled Date/Time</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Vehicle</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Fare (SAR)</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Payment</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Ride Status</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Assigned Driver</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap text-center min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {isDataLoading ? (
                <TableSkeletonRows rows={6} cols={11} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted text-xs">
                    <div className="max-w-xs mx-auto space-y-1">
                      <Layers className="w-8 h-8 text-muted/40 mx-auto" />
                      <p className="font-semibold text-primary">No bookings found</p>
                      <p className="text-[11px] text-muted">
                        No bookings match the selected status filter or search keyword.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const assignedDriver =
                    b.driver ||
                    (b.assigned_driver_id ? drivers.find((d) => d.id === b.assigned_driver_id) : null);

                  const vehicleDisplay = getFormattedVehicleName(b);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-surface/60 transition-colors group"
                    >
                      {/* 1. Booking Reference & Creation */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono align-top">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewBookingModal(b)}
                            className="font-bold text-amber-900 hover:text-amber-950 hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to view full booking details"
                          >
                            <span>{b.booking_reference}</span>
                          </button>
                          {b.booking_type === 'immediate' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500/20" /> Book Now
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5 text-sky-600" /> Scheduled
                            </span>
                          )}
                          {b.booking_method === 'custom' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                              Custom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                              Fixed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-sans">
                          <span className="text-[10px] text-muted block tabular-nums">
                            {formatDateTime(b.created_at)}
                          </span>
                          {b.trip_type === 'round_trip' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              Round-Trip
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Customer & Contact */}
                      <td className="py-3 px-3.5 align-top min-w-[185px]">
                        <p className="font-bold text-primary truncate max-w-[175px]" title={b.passenger_name}>
                          {b.passenger_name}
                        </p>
                        {b.passenger_phone ? (
                          <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
                            <a
                              href={`tel:${b.passenger_phone}`}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 hover:text-emerald-700 hover:underline transition-colors whitespace-nowrap shrink-0"
                              title={`Call ${b.passenger_name} (${b.passenger_phone})`}
                            >
                              <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="whitespace-nowrap tabular-nums">{b.passenger_phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(b.passenger_phone, 'Phone number')}
                              className="text-muted hover:text-primary p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                              title="Copy phone number"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted italic mt-0.5">No phone provided</p>
                        )}
                      </td>

                      {/* 3. Pickup Location */}
                      <td className="py-3 px-3.5 max-w-[240px] align-top">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className="text-xs font-semibold text-primary line-clamp-2 select-text"
                            title={b.pickup_address}
                          >
                            {b.pickup_address}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(b.pickup_address, 'Pickup address')}
                            className="text-muted hover:text-primary p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="Copy pickup address"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {b.intermediate_stops && b.intermediate_stops.length > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => setDetailModalBooking(b)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-900 hover:text-purple-950 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition-colors cursor-pointer"
                              title="Click to view all intermediate stops"
                            >
                              <MapPin className="w-2.5 h-2.5 text-purple-700" />
                              <span>
                                +{b.intermediate_stops.length} stop{b.intermediate_stops.length > 1 ? 's' : ''} (view)
                              </span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 4. Destination */}
                      <td className="py-3 px-3.5 max-w-[240px] align-top">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className="text-xs font-semibold text-primary line-clamp-2 select-text"
                            title={b.destination_address}
                          >
                            {b.destination_address}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(b.destination_address, 'Destination address')}
                            className="text-muted hover:text-primary p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="Copy destination address"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {b.return_scheduled_at && (
                          <p className="text-[10px] text-sky-700 font-semibold mt-1">
                            Return: {formatDateTime(b.return_scheduled_at)}
                          </p>
                        )}
                        {b.notes && (
                          <p
                            className="text-[10px] text-muted italic line-clamp-1 mt-0.5 select-text"
                            title={`Note: ${b.notes}`}
                          >
                            Note: {b.notes}
                          </p>
                        )}
                      </td>

                      {/* 5. Scheduled Date / Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        {b.booking_type === 'immediate' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-500/20" />
                              <span>Immediate / ASAP</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted block">
                                Book Now &bull; ASAP
                              </span>
                              <button
                                type="button"
                                onClick={() => setRescheduleModalBooking(b)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                                title="Set Schedule Date & Time"
                              >
                                <CalendarClock className="w-3 h-3 text-amber-600" />
                                <span>Set Schedule</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-primary font-bold">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{b.scheduled_at ? formatDateTime(b.scheduled_at) : '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-800 font-medium block">
                                Scheduled Pickup (AST)
                              </span>
                              <button
                                type="button"
                                onClick={() => setRescheduleModalBooking(b)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                                title="Edit / Reschedule Date & Time according to customer wish"
                              >
                                <Edit3 className="w-3 h-3 text-emerald-600" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Vehicle */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <p className="font-bold text-primary truncate max-w-[150px]" title={vehicleDisplay}>
                          {vehicleDisplay}
                        </p>
                      </td>

                      {/* 7. Exact Fare in SAR */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right align-top">
                        {b.booking_method === 'custom' && !b.confirmed_fare && !b.final_fare ? (
                          <div className="space-y-0.5">
                            <span className="text-amber-900 italic font-bold text-xs block">Awaiting Quote</span>
                            <span className="text-[9px] text-muted block uppercase tracking-wider">Custom Route</span>
                          </div>
                        ) : b.confirmed_fare ? (
                          <div className="space-y-0.5">
                            <div className="font-extrabold tabular-nums text-slate-900 text-sm">
                              {formatFareSAR(Number(b.confirmed_fare))}
                            </div>
                            <div className="text-[9px] text-purple-800 font-bold uppercase tracking-wider">
                              Quote Confirmed
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-extrabold tabular-nums text-slate-900 text-sm">
                              {b.fixed_fare_amount
                                ? formatFareSAR(Number(b.fixed_fare_amount))
                                : formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                            </div>
                            {b.fixed_fare_amount && (
                              <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-widest">
                                Fixed Tariff
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Payment Method & Proof */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        {getPaymentBadge(b)}
                      </td>

                      {/* 9. Ride Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        {getStatusBadge(b.status)}
                      </td>

                      {/* 10. Assigned Chauffeur */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        {assignedDriver ? (
                          <div>
                            <span className="text-primary font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {assignedDriver.profile?.full_name || assignedDriver.full_name || 'VIP Chauffeur'}
                            </span>
                            <span className="text-[10px] text-secondary block mt-0.5">
                              {assignedDriver.vehicle?.model ||
                                assignedDriver.assigned_vehicle?.model ||
                                'Fleet Vehicle'}{' '}
                              &bull;{' '}
                              <span className="font-mono">
                                {assignedDriver.vehicle?.plate_number ||
                                  assignedDriver.assigned_vehicle?.plate_number ||
                                  'VIP'}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Primary Action: View Complete Booking Details Modal (Eye icon only) */}
                          <button
                            type="button"
                            onClick={() => setViewBookingModal(b)}
                            className="p-1.5 rounded-xl bg-surface hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-base shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
                            title="View complete booking details"
                            aria-label="View complete booking details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          </button>

                          {/* Contextual Action: Custom Route Quote & Decline */}
                          {b.status === 'pending_review' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuoteModalBooking(b);
                                  setQuoteFareAmount(b.confirmed_fare ? String(b.confirmed_fare) : '');
                                  setQuoteNotes(b.dispatcher_notes || '');
                                }}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Set Custom Fare & Confirm"
                              >
                                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                <span>Quote</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalBooking(b);
                                  setBookingRejectReason('Vehicle or route unavailable for requested schedule');
                                  setCustomRejectReason('');
                                }}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Decline / Reject Custom Booking"
                              >
                                <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {/* Contextual Action: Payment Verification & Reject */}
                          {(b.status === 'pending_verification' || b.status === 'payment_rejected') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyModalBooking(b);
                                  setShowRejectForm(false);
                                }}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Review & Verify Payment Proof"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                <span>{b.status === 'payment_rejected' ? 'Re-audit' : 'Review'}</span>
                              </button>
                              {b.status !== 'payment_rejected' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerifyModalBooking(b);
                                    setShowRejectForm(true);
                                  }}
                                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                  title="Reject Payment Proof"
                                >
                                  <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>Reject</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Contextual Action: Driver Assignment */}
                          {b.status === 'confirmed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(b, false)}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Assign an available driver"
                              >
                                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>Assign</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => autoAssignDriver(b.id)}
                                className="px-2 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Auto-match nearest available driver"
                              >
                                <Zap className="w-3.5 h-3.5 shrink-0 text-amber-600 fill-amber-500/20" />
                                <span>Auto</span>
                              </button>
                            </>
                          )}

                          {/* Contextual Action: Driver Reassignment */}
                          {b.status === 'driver_assigned' && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(b, true)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-card hover:bg-surface border border-base text-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                              title="Reassign to a different chauffeur"
                            >
                              <RefreshCw className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                              <span>Reassign</span>
                            </button>
                          )}

                          {/* Contextual Action: Completed Rating View */}
                          {['completed', 'trip_completed', 'ride_completed', 'payment_completed'].includes(b.status) &&
                            (() => {
                              const bRating = ratings.find((r) => r.booking_id === b.id);
                              if (bRating) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReviewBooking({ booking: b, rating: bRating })}
                                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
                                    title="Click to view passenger review"
                                  >
                                    <Star className="w-3.5 h-3.5 shrink-0 fill-amber-500 text-amber-500" />
                                    <span>{bRating.rating}.0 ★</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Professional Pagination Footer */}
        <div className="bg-surface/80 border-t border-base px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-primary font-semibold">
                {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-primary font-semibold">
                {Math.min(currentPage * pageSize, filtered.length)}
              </strong>{' '}
              of <strong className="text-primary font-semibold">{filtered.length}</strong> bookings
            </span>
            <span className="text-muted">&bull;</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-card border border-base rounded-lg px-2 py-1 text-xs text-primary font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-base bg-card hover:bg-surface text-secondary hover:text-primary font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <span className="px-3 py-1 font-mono font-bold text-primary">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-base bg-card hover:bg-surface text-secondary hover:text-primary font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. COMPREHENSIVE BOOKING DETAILS MODAL                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewBookingModal && (() => {
        const b = viewBookingModal;
        const assignedDriver =
          b.driver || (b.assigned_driver_id ? drivers.find((d) => d.id === b.assigned_driver_id) : null);
        const vehicleDisplay = getFormattedVehicleName(b);
        const isPaid =
          b.payment_status === 'paid' ||
          b.status === 'payment_verified' ||
          b.status === 'payment_completed';

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-card border border-base rounded-3xl max-w-3xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-base bg-surface/50 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-extrabold text-amber-900 select-all">
                      {b.booking_reference}
                    </span>
                    {b.booking_method === 'custom' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                        Custom Route
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                        Fixed Tariff
                      </span>
                    )}
                    {b.trip_type === 'round_trip' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        Round-Trip Journey
                      </span>
                    )}
                    {getStatusBadge(b.status)}
                  </div>
                  <p className="text-xs text-secondary">
                    Registered on: <strong className="text-primary">{formatDateTime(b.created_at)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewBookingModal(null)}
                  className="p-2 rounded-xl hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Close Dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* 1. Passenger & Contact */}
                <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-base/70 pb-2">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm">
                      <User className="w-4 h-4 text-emerald-600" /> Passenger Information
                    </h4>
                    <span className="text-[11px] text-muted font-mono">
                      ID: {b.customer_id ? b.customer_id.substring(0, 8) : 'Guest Booking'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-muted block text-[11px]">Passenger Full Name</span>
                      <strong className="text-primary font-bold text-sm block mt-0.5">
                        {b.passenger_name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Primary Phone</span>
                      <a
                        href={`tel:${b.passenger_phone}`}
                        className="text-emerald-700 hover:underline font-mono font-bold mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap"
                        title="Click to call"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="whitespace-nowrap tabular-nums">{b.passenger_phone}</span>
                      </a>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Instant Messaging</span>
                      <a
                        href={`https://wa.me/${b.passenger_phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors whitespace-nowrap shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        Open WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                {/* 2. Schedule, Route & Intermediate Stops */}
                <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-base/70 pb-2">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm">
                      <Navigation className="w-4 h-4 text-sky-600" /> Route &amp; Departure Schedule
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleModalBooking(b);
                        }}
                        className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Edit or Reschedule Date & Time according to customer wish"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Edit Schedule</span>
                      </button>
                      {b.booking_type === 'immediate' ? (
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" /> Book Now (Immediate ASAP)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-600" /> Scheduled Reservation
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-base/70">
                    <div>
                      <span className="text-muted block text-[11px]">
                        {b.booking_type === 'immediate' ? 'Service Timing' : 'Scheduled Pickup Time (AST)'}
                      </span>
                      <strong className="text-primary font-bold text-sm flex items-center gap-1 mt-0.5">
                        {b.booking_type === 'immediate' ? (
                          <span className="text-amber-800 flex items-center gap-1">
                            <Zap className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                            Immediate / ASAP
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            {b.scheduled_at ? formatDateTime(b.scheduled_at) : '—'}
                          </span>
                        )}
                      </strong>
                    </div>
                    {b.return_scheduled_at && (
                      <div>
                        <span className="text-muted block text-[11px]">Scheduled Return Time</span>
                        <strong className="text-sky-800 font-bold text-sm flex items-center gap-1 mt-0.5">
                          <Calendar className="w-4 h-4 text-sky-600" />
                          {formatDateTime(b.return_scheduled_at)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Route Timeline */}
                  <div className="space-y-3 pt-1">
                    {/* Pickup */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-300">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                            Origin / Pickup Point
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(b.pickup_address, 'Pickup address')}
                            className="text-muted hover:text-primary flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-primary font-bold text-xs mt-0.5 select-text bg-card p-2.5 rounded-xl border border-base">
                          {b.pickup_address}
                        </p>
                      </div>
                    </div>

                    {/* Intermediate Stops */}
                    {b.intermediate_stops &&
                      b.intermediate_stops.map((stop, idx) => (
                        <div key={stop.id || idx} className="flex items-start gap-3 pl-0.5">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 border border-purple-300">
                            {idx + 2}
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">
                              Intermediate Stop #{idx + 1}
                            </span>
                            <p className="text-primary font-semibold text-xs mt-0.5 select-text bg-card p-2.5 rounded-xl border border-base">
                              {stop.address}
                            </p>
                          </div>
                        </div>
                      ))}

                    {/* Destination */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 border border-rose-300">
                        {(b.intermediate_stops?.length || 0) + 2}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                            Final Destination / Drop-Off
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(b.destination_address, 'Destination address')}
                            className="text-muted hover:text-primary flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-primary font-bold text-xs mt-0.5 select-text bg-card p-2.5 rounded-xl border border-base">
                          {b.destination_address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle, Capacity & Pricing Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vehicle & Capacity Card */}
                  <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-2.5">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm border-b border-base/70 pb-2">
                      <Car className="w-4 h-4 text-emerald-600" /> Vehicle &amp; Passenger Capacity
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Vehicle Class:</span>
                        <strong className="text-primary font-bold">{vehicleDisplay}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Passenger Count:</span>
                        <span className="font-semibold text-primary">{b.passenger_count || 1} Passengers</span>
                      </div>
                      {b.service_type && (
                        <div className="flex justify-between">
                          <span className="text-muted">Service Route:</span>
                          <span className="font-semibold text-primary capitalize">
                            {String(b.service_type).replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                      {b.terminal && (
                        <div className="flex justify-between">
                          <span className="text-muted">Airport Terminal:</span>
                          <span className="font-bold text-amber-900 uppercase">
                            {String(b.terminal).replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fare & Financials Card */}
                  <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-2.5">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm border-b border-base/70 pb-2">
                      <DollarSign className="w-4 h-4 text-amber-600" /> Fare &amp; Financials
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-muted">Confirmed Total Fare:</span>
                        <strong className="text-base font-extrabold text-slate-900 font-mono">
                          {b.confirmed_fare
                            ? formatFareSAR(Number(b.confirmed_fare))
                            : b.fixed_fare_amount
                            ? formatFareSAR(Number(b.fixed_fare_amount))
                            : b.final_fare
                            ? formatFareSAR(Number(b.final_fare))
                            : 'Awaiting Quote'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Pricing System:</span>
                        <span className="font-bold text-emerald-700">
                          {b.booking_method === 'custom' ? 'Custom Route Agreed Quote' : 'Fixed Standard Tariff (No Surge)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Currency:</span>
                        <span className="font-mono font-bold text-primary">SAR (Saudi Riyal)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Method & Proof Audit Card */}
                <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-base/70 pb-2">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm">
                      <CreditCard className="w-4 h-4 text-amber-600" /> Payment Details &amp; Proof Audit
                    </h4>
                    <span className="font-bold">
                      {isPaid ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          Payment Verified &amp; Cleared
                        </span>
                      ) : (
                        <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          Verification Pending
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Payment Method:</span>
                        <span className="font-bold text-primary capitalize">
                          {b.payment_method === 'cash'
                            ? 'Cash on Pickup'
                            : b.payment_method === 'card'
                            ? 'Credit/Debit Card'
                            : 'Bank Transfer / STC Pay'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Payment Status:</span>
                        <span className="font-bold capitalize text-primary">{b.payment_status || 'Pending'}</span>
                      </div>

                      {/* Bank account snapshot if bank transfer */}
                      {b.payment_account_details && (
                        <div className="p-3 bg-card border border-base rounded-xl space-y-1 mt-2">
                          <span className="text-[10px] text-muted uppercase font-bold block">
                            Target Company Account:
                          </span>
                          <p className="font-bold text-primary">{b.payment_account_details.provider_name}</p>
                          <p className="text-[11px] text-secondary">
                            Holder: {b.payment_account_details.account_holder_name}
                          </p>
                          {b.payment_account_details.iban && (
                            <p className="text-[10px] font-mono text-amber-900 font-bold break-all select-all">
                              IBAN: {b.payment_account_details.iban}
                            </p>
                          )}
                        </div>
                      )}

                      {b.payment_rejected_reason && (
                        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900">
                          <span className="font-bold block text-[11px]">Rejection Reason:</span>
                          <p className="text-[11px] mt-0.5">{b.payment_rejected_reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Receipt Screenshot Preview */}
                    <div>
                      <span className="text-muted block text-[11px] mb-1 font-semibold">
                        Uploaded Receipt Screenshot:
                      </span>
                      {b.payment_screenshot_url ? (
                        <div className="space-y-2">
                          <div
                            onClick={() => setViewScreenshotUrl(b.payment_screenshot_url!)}
                            className="h-32 rounded-xl border border-base bg-black/5 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={b.payment_screenshot_url}
                              alt="Payment Proof Receipt"
                              className="h-full w-auto object-contain"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(b.payment_screenshot_url!)}
                            className="text-amber-800 hover:text-amber-950 font-bold text-[11px] flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Open Full Resolution Receipt
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-card border border-base rounded-xl text-center text-muted italic">
                          No transfer receipt uploaded by customer.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Assigned Chauffeur & Vehicle */}
                <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-base/70 pb-2">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm">
                      <UserCheck className="w-4 h-4 text-emerald-600" /> Assigned VIP Chauffeur
                    </h4>
                    {assignedDriver ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        Chauffeur Assigned
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {assignedDriver ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-muted block text-[11px]">Chauffeur Name</span>
                        <strong className="text-primary font-bold text-sm block mt-0.5">
                          {assignedDriver.profile?.full_name || assignedDriver.full_name || 'Captain'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Contact Phone</span>
                        <a
                          href={`tel:${assignedDriver.profile?.phone || assignedDriver.phone}`}
                          className="text-emerald-700 hover:underline font-mono font-bold block mt-0.5"
                        >
                          {assignedDriver.profile?.phone || assignedDriver.phone || '—'}
                        </a>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Fleet Vehicle</span>
                        <strong className="text-primary font-bold block mt-0.5">
                          {assignedDriver.vehicle?.model || assignedDriver.assigned_vehicle?.model || 'Fleet Vehicle'}{' '}
                          &bull;{' '}
                          <span className="font-mono">
                            {assignedDriver.vehicle?.plate_number ||
                              assignedDriver.assigned_vehicle?.plate_number ||
                              'VIP'}
                          </span>
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-card border border-base rounded-xl">
                      <span className="text-muted italic">No chauffeur has been assigned to this trip yet.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewBookingModal(null);
                          handleOpenAssignModal(b, false);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        Assign Driver Now
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Notes & Special Instructions */}
                {(b.notes || b.dispatcher_notes || b.cancellation_reason) && (
                  <div className="bg-surface/70 border border-base rounded-2xl p-4 space-y-2">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5 text-sm border-b border-base/70 pb-2">
                      <FileCheck className="w-4 h-4 text-purple-600" /> Instructions &amp; Notes
                    </h4>
                    {b.notes && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted block">
                          Customer Instructions:
                        </span>
                        <p className="text-primary italic mt-0.5 bg-card p-2.5 rounded-xl border border-base select-text">
                          {b.notes}
                        </p>
                      </div>
                    )}
                    {b.dispatcher_notes && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-900 block">
                          Dispatcher Operational Notes:
                        </span>
                        <p className="text-amber-950 font-medium mt-0.5 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200 select-text">
                          {b.dispatcher_notes}
                        </p>
                      </div>
                    )}
                    {b.cancellation_reason && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-700 block">
                          Cancellation Reason:
                        </span>
                        <p className="text-rose-900 mt-0.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200 select-text">
                          {b.cancellation_reason}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-base bg-surface/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(b.booking_reference, 'Booking reference')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-card hover:bg-surface border border-base text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Reference</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Contextual actions inside modal */}
                  {b.status === 'pending_verification' && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewBookingModal(null);
                        setVerifyModalBooking(b);
                        setShowRejectForm(false);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4" /> Review Payment
                    </button>
                  )}

                  {b.status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setViewBookingModal(null);
                          setRejectModalBooking(b);
                          setBookingRejectReason('Vehicle or route unavailable for requested schedule');
                          setCustomRejectReason('');
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Decline / Reject Custom Booking"
                      >
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Decline Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewBookingModal(null);
                          setQuoteModalBooking(b);
                          setQuoteFareAmount(b.confirmed_fare ? String(b.confirmed_fare) : '');
                          setQuoteNotes(b.dispatcher_notes || '');
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <DollarSign className="w-4 h-4 shrink-0" />
                        <span>Quote Fare</span>
                      </button>
                    </>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewBookingModal(null);
                        handleOpenAssignModal(b, false);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" /> Assign Driver
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewBookingModal(null)}
                    className="px-5 py-2 bg-surface hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-base transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. PAYMENT PROOF VERIFICATION MODAL                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {verifyModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="type-card-title">Verify Bank Transfer Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalBooking(null)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Booking Summary */}
            <div className="bg-surface p-3.5 rounded-2xl border border-base space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-950">
                  {verifyModalBooking.booking_reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Passenger:</span>
                <span className="font-bold text-primary">
                  {verifyModalBooking.passenger_name} ({verifyModalBooking.passenger_phone})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Timing:</span>
                <span className="font-bold text-primary">
                  {verifyModalBooking.booking_type === 'immediate' ? (
                    <span className="text-amber-800 inline-flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" /> Immediate / ASAP
                    </span>
                  ) : (
                    <span className="text-emerald-800 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" /> {verifyModalBooking.scheduled_at ? formatDateTime(verifyModalBooking.scheduled_at) : '—'} (AST)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Route:</span>
                <span className="text-primary truncate max-w-[280px]">
                  {verifyModalBooking.pickup_address} &rarr; {verifyModalBooking.destination_address}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-base">
                <span className="text-muted font-semibold">
                  {verifyModalBooking.fixed_fare_amount ? 'Fixed Fare (verify exact amount):' : 'Expected Fare:'}
                </span>
                <span className="text-sm font-extrabold text-emerald-800">
                  {verifyModalBooking.fixed_fare_amount
                    ? formatFareSAR(Number(verifyModalBooking.fixed_fare_amount))
                    : formatCurrency(
                        verifyModalBooking.final_fare || verifyModalBooking.estimated_fare,
                        settings.currency
                      )}
                </span>
              </div>
              {verifyModalBooking.fixed_fare_amount && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">Pricing Type:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    Fixed Fare &bull; No Hidden Charges
                  </span>
                </div>
              )}
            </div>

            {/* Selected Business Payment Account */}
            {verifyModalBooking.payment_account_details && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-amber-950 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    Selected Payment Account:
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                    {verifyModalBooking.payment_account_details.provider_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-amber-200/80 font-mono">
                  <div>
                    <span className="font-sans text-[10px] text-slate-500 block">Account Holder</span>
                    <strong className="text-slate-900 font-sans font-bold">
                      {verifyModalBooking.payment_account_details.account_holder_name}
                    </strong>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-slate-500 block">Channel</span>
                    <span className="text-slate-700 capitalize font-sans">
                      {verifyModalBooking.payment_account_details.payment_method_type.replace('_', ' ')}
                    </span>
                  </div>
                  {verifyModalBooking.payment_account_details.iban && (
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="font-sans text-[10px] text-slate-500 block">IBAN</span>
                      <span className="text-amber-950 font-black break-all select-all">
                        {verifyModalBooking.payment_account_details.iban}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uploaded Screenshot Preview */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Uploaded Payment Screenshot / Receipt:
              </label>
              {verifyModalBooking.payment_screenshot_url ? (
                <div className="rounded-2xl overflow-hidden border border-base bg-black/40 max-h-72 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={verifyModalBooking.payment_screenshot_url}
                    alt="Customer Payment Receipt"
                    className="max-h-64 w-auto object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="p-4 bg-muted/20 border border-base rounded-2xl text-center text-xs text-muted">
                  No screenshot uploaded by customer.
                </div>
              )}
            </div>

            {/* Action Buttons or Reject Form */}
            {!showRejectForm ? (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Proof
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalBooking(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-card-hover transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifySubmit}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {verifyModalBooking.status === 'payment_rejected' ? 'Re-verify & Confirm Booking' : 'Verify & Confirm Booking'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRejectSubmit} className="space-y-3 pt-2 border-t border-base">
                <div className="space-y-1 text-xs">
                  <label className="text-secondary font-bold text-rose-600">
                    Reason for Payment Proof Rejection:
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-rose-500"
                  >
                    <option value="Transaction reference not found in bank statement">
                      Transaction reference not found in bank statement
                    </option>
                    <option value="Transferred amount does not match booking total fare">
                      Transferred amount does not match booking total fare
                    </option>
                    <option value="Screenshot is blurred, unreadable, or missing transaction ID">
                      Screenshot is blurred, unreadable, or missing transaction ID
                    </option>
                    <option value="Account name or timestamp does not match booking details">
                      Account name or timestamp does not match booking details
                    </option>
                    <option value="other">Other reason (specify below)</option>
                  </select>
                </div>

                {rejectReason === 'other' && (
                  <div className="space-y-1 text-xs">
                    <label className="text-secondary font-semibold">Custom Explanation</label>
                    <input
                      type="text"
                      required
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      placeholder="Enter specific reason for rejection..."
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-muted hover:text-primary cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MANUAL DRIVER ASSIGNMENT & REASSIGNMENT MODAL                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <h3 className="type-card-title">
                  {isReassignMode ? 'Reassign VIP Chauffeur' : 'Assign Available VIP Chauffeur'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalBooking(null)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-surface p-3 rounded-xl border border-base">
              <div>
                <span className="text-muted">Booking: </span>
                <span className="text-amber-900 font-bold">{assignModalBooking.booking_reference}</span>
              </div>
              <div>
                <span className="text-muted">Route: </span>
                <span className="text-primary">
                  {assignModalBooking.pickup_address} &rarr; {assignModalBooking.destination_address}
                </span>
              </div>
              <div>
                <span className="text-muted">Schedule / Timing: </span>
                <span className="font-bold text-primary">
                  {assignModalBooking.booking_type === 'immediate' ? (
                    <span className="text-amber-800 inline-flex items-center gap-1 font-bold">
                      <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" /> Book Now (Immediate / ASAP)
                    </span>
                  ) : (
                    <span className="text-emerald-800 inline-flex items-center gap-1 font-bold">
                      <Calendar className="w-3 h-3 text-emerald-600" /> {assignModalBooking.scheduled_at ? formatDateTime(assignModalBooking.scheduled_at) : '—'} (AST)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted">Vehicle Class Required: </span>
                <span className="text-emerald-700 font-bold uppercase">
                  {getFormattedVehicleName(assignModalBooking)}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-secondary">
                  Select Fleet Chauffeur ({eligibleDriversForModal.length} available)
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Vehicle Class Matched
                </span>
              </div>
              {eligibleDriversForModal.length === 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>No Matching Chauffeurs Found</span>
                  </div>
                  <p>
                    No active chauffeurs currently have an assigned vehicle matching <strong>{getFormattedVehicleName(assignModalBooking)}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Drivers without assigned vehicles or with other vehicle categories are excluded. Please assign a matching vehicle in Fleet Management or wait for an eligible driver to come online.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {eligibleDriversForModal.map((d) => {
                      const driverVeh = getDriverAssignedVehicle(d, rateVehicles, vehicles);
                      const conflict = assignModalBooking
                        ? checkDriverOverlap(
                            bookings.filter((bk) => bk.assigned_driver_id === d.id),
                            assignModalBooking
                          )
                        : { hasOverlap: false };
                      const activeAssignedCount = bookings.filter(
                        (bk) =>
                          bk.assigned_driver_id === d.id &&
                          bk.status !== 'cancelled' &&
                          bk.status !== 'completed' &&
                          bk.status !== 'trip_completed'
                      ).length;

                      const vehName = driverVeh
                        ? `${driverVeh.make || 'Fleet'} ${driverVeh.model || ''}`.trim()
                        : 'Fleet Vehicle';
                      const vehPlate = driverVeh?.plate_number || 'VIP';

                      return (
                        <option key={d.id} value={d.id}>
                          {conflict.hasOverlap ? '⚠️ [CONFLICT] ' : ''}
                          {d.profile?.full_name || d.full_name || 'Captain'} &bull; {vehName} ({vehPlate})
                          {activeAssignedCount > 0 ? ` [${activeAssignedCount} trips booked]` : ' [Free schedule]'}
                        </option>
                      );
                    })}
                  </select>

                  {/* Overlap schedule conflict warning */}
                  {(() => {
                    if (!assignModalBooking || !selectedDriverId) return null;
                    const conflict = checkDriverOverlap(
                      bookings.filter((bk) => bk.assigned_driver_id === selectedDriverId),
                      assignModalBooking
                    );
                    if (!conflict.hasOverlap) return null;
                    return (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Schedule Collision Detected
                        </div>
                        <p>{conflict.message}</p>
                        <p className="text-[11px] text-rose-700">
                          Overlapping assignments for the same chauffeur are prevented. Please select another chauffeur.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-elevated hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !selectedDriverId ||
                  eligibleDriversForModal.length === 0 ||
                  Boolean(
                    assignModalBooking &&
                      selectedDriverId &&
                      checkDriverOverlap(
                        bookings.filter((bk) => bk.assigned_driver_id === selectedDriverId),
                        assignModalBooking
                      ).hasOverlap
                  )
                }
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow transition-all cursor-pointer"
              >
                {isReassignMode ? 'Confirm Reassignment' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. QUICK VIEW RECEIPT MODAL                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Customer Payment Proof
              </div>
              <button
                onClick={() => setViewScreenshotUrl(null)}
                className="p-1 rounded-lg hover:bg-card-hover text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-base bg-black/40 flex items-center justify-center max-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewScreenshotUrl}
                alt="Payment Receipt Screenshot"
                className="w-full h-auto object-contain max-h-[450px]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <a
                href={viewScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-800 hover:underline flex items-center gap-1 font-semibold"
              >
                Open full resolution &rarr;
              </a>
              <button
                onClick={() => setViewScreenshotUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-card-hover border border-base text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. TELEPHONE CALL-IN BOOKING MODAL                                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePhoneBooking}
            className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <h3 className="type-card-title">Telephone Booking (Staff Dispatch)</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-secondary font-semibold">Caller Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Sheikh Salem"
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-secondary font-semibold">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-secondary font-semibold">Pickup Location</label>
              <select
                value={pickupLm}
                onChange={(e) => setPickupLm(e.target.value)}
                className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
              >
                {SAUDI_LANDMARKS.map((l) => (
                  <option key={`p-${l.id}`} value={l.id}>
                    {l.city}: {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-secondary font-semibold">Destination</label>
              <select
                value={destLm}
                onChange={(e) => setDestLm(e.target.value)}
                className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
              >
                {SAUDI_LANDMARKS.map((l) => (
                  <option key={`d-${l.id}`} value={l.id}>
                    {l.city}: {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-secondary font-semibold">Vehicle Class</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value as VehicleType)}
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                >
                  <option value="vip_gmc">VIP GMC Yukon XL</option>
                  <option value="suv">Family SUV</option>
                  <option value="sedan">Executive Sedan</option>
                  <option value="van">Royal Van / Staria</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-secondary font-semibold">Passenger Count</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-secondary font-semibold">Dispatch Notes / Flight Info</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Terminal details, luggage count..."
                className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-elevated hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Create &amp; Dispatch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6. CUSTOM ROUTE QUOTE FARE MODAL                                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {quoteModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleQuoteSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h3 className="type-card-title">Quote &amp; Confirm Custom Route Fare</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalBooking(null)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface p-3.5 rounded-2xl border border-base space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-950">
                  {quoteModalBooking.booking_reference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Passenger:</span>
                <span className="font-bold text-primary">
                  {quoteModalBooking.passenger_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Schedule &amp; Timing:</span>
                <span className="font-bold text-primary">
                  {quoteModalBooking.booking_type === 'immediate' ? (
                    <span className="text-amber-800 inline-flex items-center gap-1 font-bold">
                      <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" /> Book Now (Immediate ASAP)
                    </span>
                  ) : (
                    <span className="text-emerald-800 inline-flex items-center gap-1 font-bold">
                      <Calendar className="w-3 h-3 text-emerald-600" /> {quoteModalBooking.scheduled_at ? formatDateTime(quoteModalBooking.scheduled_at) : '—'} (AST)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Direct Contact:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${quoteModalBooking.passenger_phone}`}
                    className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono text-[11px] whitespace-nowrap"
                    title="Click to call"
                  >
                    <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="whitespace-nowrap tabular-nums">{quoteModalBooking.passenger_phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${quoteModalBooking.passenger_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold inline-flex items-center gap-1 hover:bg-emerald-100 whitespace-nowrap shrink-0 transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
              <div className="pt-2 border-t border-base space-y-1">
                <div className="flex items-start gap-1.5 text-primary">
                  <span className="text-emerald-700 font-bold shrink-0">Pickup:</span>
                  <span className="truncate">{quoteModalBooking.pickup_address}</span>
                </div>
                {quoteModalBooking.intermediate_stops && quoteModalBooking.intermediate_stops.length > 0 && (
                  <div className="text-purple-900 text-[11px] pl-3 py-0.5 space-y-0.5 font-medium">
                    {quoteModalBooking.intermediate_stops.map((st, i) => (
                      <div key={st.id || i} className="truncate">
                        &bull; Stop {i + 1}: {st.address}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-1.5 text-primary">
                  <span className="text-rose-700 font-bold shrink-0">Drop-off:</span>
                  <span className="truncate">{quoteModalBooking.destination_address}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-primary">
                Agreed Fare in SAR (Saudi Riyals) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-muted">
                  SAR
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 450.00"
                  value={quoteFareAmount}
                  onChange={(e) => setQuoteFareAmount(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-muted focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-secondary">
                Dispatcher Notes &amp; Transfer Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="e.g. Rate includes 2 intermediate stops. Direct bank transfer."
                className="w-full bg-input border border-base rounded-xl p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-base">
              <button
                type="button"
                onClick={() => {
                  const currentBooking = quoteModalBooking;
                  setQuoteModalBooking(null);
                  setRejectModalBooking(currentBooking);
                  setBookingRejectReason('Vehicle or route unavailable for requested schedule');
                  setCustomRejectReason('');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                title="Decline / Reject this booking request instead"
              >
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Decline request instead</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuoting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isQuoting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Confirm Fare &amp; Release Quote</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 7. REJECT CUSTOM BOOKING MODAL                                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRejectBookingSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title text-slate-900 font-bold">Decline / Reject Booking</h3>
                  <p className="text-[11px] text-muted">Decline this custom booking request with an explanation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="text-muted hover:text-primary transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface p-3 rounded-xl border border-base text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted">Booking Reference: </span>
                <span className="font-mono font-bold text-amber-950">{rejectModalBooking.booking_reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Passenger: </span>
                <span className="font-bold text-primary">{rejectModalBooking.passenger_name}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-secondary">Reason for Declining</label>
              <select
                value={bookingRejectReason}
                onChange={(e) => setBookingRejectReason(e.target.value)}
                className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-rose-500"
              >
                <option value="Vehicle unavailable for requested schedule">Vehicle unavailable for requested schedule</option>
                <option value="Route cannot be serviced in current operating hours">Route cannot be serviced in current operating hours</option>
                <option value="Customer requested cancellation via phone/WhatsApp">Customer requested cancellation via phone/WhatsApp</option>
                <option value="Fare could not be agreed upon with customer">Fare could not be agreed upon with customer</option>
                <option value="Duplicate or test booking request">Duplicate or test booking request</option>
                <option value="other">Other reason (specify below)</option>
              </select>
            </div>

            {bookingRejectReason === 'other' && (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-secondary">Specific Reason</label>
                <input
                  type="text"
                  required
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Enter specific reason for declining..."
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-base">
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Declining...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Decline Booking</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 8. STOPS & ITINERARY DETAIL MODAL                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="type-card-title">Route &amp; Intermediate Stops Itinerary</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-950">{detailModalBooking.booking_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Passenger:</span>
                <span className="font-bold text-primary">
                  {detailModalBooking.passenger_name} ({detailModalBooking.passenger_phone})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Schedule &amp; Timing:</span>
                <span className="font-bold text-primary">
                  {detailModalBooking.booking_type === 'immediate' ? (
                    <span className="text-amber-800 inline-flex items-center gap-1 font-bold">
                      <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" /> Book Now (Immediate ASAP)
                    </span>
                  ) : (
                    <span className="text-emerald-800 inline-flex items-center gap-1 font-bold">
                      <Calendar className="w-3 h-3 text-emerald-600" /> {detailModalBooking.scheduled_at ? formatDateTime(detailModalBooking.scheduled_at) : '—'} (AST)
                    </span>
                  )}
                </span>
              </div>
              {detailModalBooking.return_scheduled_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">Return Schedule:</span>
                  <span className="font-bold text-sky-800 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-sky-600" /> {formatDateTime(detailModalBooking.return_scheduled_at)} (AST)
                  </span>
                </div>
              )}
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-base space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                  1
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
                    Pickup Location
                  </span>
                  <p className="font-medium text-primary mt-0.5 select-text">{detailModalBooking.pickup_address}</p>
                </div>
              </div>

              {detailModalBooking.intermediate_stops?.map((st, i) => (
                <div key={st.id || i} className="flex items-start gap-3 pl-0.5">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-200">
                    {i + 2}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-900 block tracking-wider">
                      Intermediate Stop {i + 1}
                    </span>
                    <p className="font-medium text-primary mt-0.5 select-text">{st.address}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-rose-300">
                  {(detailModalBooking.intermediate_stops?.length || 0) + 2}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wider">
                    Final Destination
                  </span>
                  <p className="font-medium text-primary mt-0.5 select-text">{detailModalBooking.destination_address}</p>
                </div>
              </div>
            </div>

            {detailModalBooking.notes && (
              <div className="p-3 bg-card border border-base rounded-xl text-xs space-y-1">
                <span className="font-semibold text-secondary">Customer Instructions:</span>
                <p className="text-primary italic select-text">{detailModalBooking.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-card-hover text-primary transition-colors border border-base cursor-pointer"
              >
                Close Itinerary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 9. PASSENGER REVIEW DETAIL MODAL                                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedReviewBooking && (() => {
        const { booking: b, rating: r } = selectedReviewBooking;
        const assignedDriver =
          b.driver || (b.assigned_driver_id ? drivers.find((d) => d.id === b.assigned_driver_id) : undefined);
        const driverName = assignedDriver?.profile?.full_name || assignedDriver?.full_name || 'Assigned Chauffeur';

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-base pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="type-card-title">Passenger Rating &amp; Review</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReviewBooking(null)}
                  className="text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-surface rounded-2xl border border-base space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Booking Reference:</span>
                  <span className="font-mono font-bold text-amber-950">{b.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Passenger:</span>
                  <span className="font-bold text-primary">
                    {b.passenger_name} ({b.passenger_phone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Chauffeur:</span>
                  <span className="font-bold text-primary">{driverName}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-base/50">
                  <span className="text-muted">Rating Given:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-amber-700 ml-1">{r.rating}.0 / 5.0</span>
                  </div>
                </div>
                {r.feedback && (
                  <div className="pt-2 border-t border-base/50">
                    <span className="text-muted block text-[11px] mb-1">Feedback:</span>
                    <p className="text-primary italic bg-input/40 p-2.5 rounded-xl border border-base">
                      &ldquo;{r.feedback}&rdquo;
                    </p>
                  </div>
                )}
                <div className="text-[10.5px] text-muted pt-1">
                  Submitted: {formatDateTime(r.created_at)}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedReviewBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-elevated border border-base text-primary transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 10. EDIT SCHEDULE / RESCHEDULE MODAL */}
      <EditScheduleModal
        isOpen={!!rescheduleModalBooking}
        onClose={() => setRescheduleModalBooking(null)}
        booking={rescheduleModalBooking}
        onSuccess={(updatedBookingId) => {
          if (viewBookingModal && viewBookingModal.id === updatedBookingId) {
            const updated = bookings.find((b) => b.id === updatedBookingId);
            if (updated) setViewBookingModal(updated);
          }
        }}
      />
    </div>
  );
}
