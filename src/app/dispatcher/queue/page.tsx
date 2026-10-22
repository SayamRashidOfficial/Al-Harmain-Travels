'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatFareSAR } from '@/lib/fixed-fare';
import { SAUDI_LANDMARKS } from '@/lib/geo';
import { VehicleType, Booking, BookingStatus, RatingFeedback } from '@/types';
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
  Star,
} from 'lucide-react';
import { TableSkeletonRows } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';
import { checkDriverOverlap } from '@/lib/assignment-utils';

type QueueStatusFilter =
  | 'all'
  | 'pending_review'
  | 'pending_verification'
  | 'confirmed'
  | 'assigned'
  | 'active'
  | 'completed';

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

export default function DispatcherQueuePage() {
  const {
    bookings,
    drivers,
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
    };
  }, [deduplicatedBookings]);

  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalBooking, setAssignModalBooking] = useState<Booking | null>(null);
  const [isReassignMode, setIsReassignMode] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  
  // Verification Modal State
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('all');

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
      await rejectBooking(rejectModalBooking.id, bookingRejectReason.trim());
      setRejectModalBooking(null);
      toast.info(`Booking ${rejectModalBooking.booking_reference} rejected.`);
    } catch {
      toast.error('Failed to reject booking.');
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
    toast.success(`Booking ${booking.booking_reference} registered and auto-dispatched!`);
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
        b.destination_address.toLowerCase().includes(q)
      );
    });
  }, [deduplicatedBookings, statusFilter, search]);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Quote Review
          </span>
        );
      case 'pending_verification':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Verification
          </span>
        );
      case 'payment_rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Payment Rejected
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmed / Ready
          </span>
        );
      case 'driver_assigned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Driver Assigned
          </span>
        );
      case 'accepted':
      case 'driver_accepted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Driver Accepted
          </span>
        );
      case 'on_the_way':
      case 'driver_arriving':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Car className="w-3 h-3" /> On The Way
          </span>
        );
      case 'arrived':
      case 'driver_arrived':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Arrived
          </span>
        );
      case 'started':
      case 'trip_started':
      case 'ride_started':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Car className="w-3 h-3" /> Trip In Progress
          </span>
        );
      case 'completed':
      case 'trip_completed':
      case 'ride_completed':
      case 'payment_completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="page-shell space-y-6">
      {/* Header */}
      <div className="bg-card border border-base p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="type-eyebrow">Staff / Dispatch Operations</span>
          <h1 className="type-page-title mt-1">Bookings Queue &amp; VIP Chauffeur Dispatch</h1>
          <p className="text-xs text-secondary">
            Verify passenger transfer proofs, schedule VIP departures, and assign executive drivers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-surface hover:bg-card-hover border border-base text-secondary hover:text-primary text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Refresh ride queue directly from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+ Create Call-In Booking</span>
          </button>
        </div>
      </div>

      {/* Pending Custom Route Review Alert */}
      {pendingReviewCount > 0 && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-purple-300">
                {pendingReviewCount} Custom Route Booking{pendingReviewCount > 1 ? 's' : ''} Awaiting Fare Review &amp; Confirmation
              </h4>
              <p className="text-xs text-purple-300/80">
                Customers requested custom itineraries without upfront fares. Contact passenger, agree on price, and quote the fare.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_review')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors shadow self-end sm:self-auto shrink-0"
          >
            Review Custom Routes &rarr;
          </button>
        </div>
      )}

      {/* Pending Payment Verification Banner Alert */}
      {pendingVerificationCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                {pendingVerificationCount} Booking{pendingVerificationCount > 1 ? 's' : ''} Awaiting Payment Proof Verification
              </h4>
              <p className="text-xs text-amber-400/80">
                Customers have uploaded bank transfer receipts. Verify funds to release bookings for driver assignment.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_verification')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow self-end sm:self-auto shrink-0"
          >
            Review Pending &rarr;
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-card border border-base p-2.5 rounded-3xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 xl:pb-0 scrollbar-none -mx-0.5 px-0.5">
          {[
            {
              id: 'all' as QueueStatusFilter,
              label: 'All',
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
              color: 'text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
              activeColor: 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: counts.pending_review > 0 ? 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold' : 'bg-surface text-muted border-base',
              highlight: counts.pending_review > 0,
            },
            {
              id: 'pending_verification' as QueueStatusFilter,
              label: 'Pending Payment',
              count: counts.pending_verification,
              icon: CreditCard,
              color: 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
              activeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-950/20',
              badgeActiveColor: 'bg-slate-950/20 text-slate-950 border-slate-950/30 font-extrabold',
              badgeInactiveColor: counts.pending_verification > 0 ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold' : 'bg-surface text-muted border-base',
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
              color: 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
              activeColor: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/20',
              badgeActiveColor: 'bg-white/20 text-white border-white/30',
              badgeInactiveColor: counts.active > 0 ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-surface text-muted border-base',
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
                <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-current' : 'opacity-80 group-hover:opacity-100'}`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold border tabular-nums transition-colors shadow-xs ${
                    isActive
                      ? tab.badgeActiveColor
                      : tab.badgeInactiveColor
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
            placeholder="Search passenger, phone, ref..."
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
            <span className="font-semibold text-emerald-500 dark:text-emerald-400">
              {filtered.length} ride{filtered.length === 1 ? '' : 's'} matching
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear search
          </button>
        </div>
      )}

      {/* Bookings Queue Table */}
      <div className="bg-card border border-base rounded-3xl p-6 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs text-secondary">
          <thead className="bg-surface text-secondary uppercase font-bold text-[10px] border-b border-base">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3">Passenger &amp; Contact</th>
              <th className="p-3">Route (Pickup &rarr; Drop-off)</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment Proof</th>
              <th className="p-3">Assigned Chauffeur</th>
              <th className="p-3 text-right">Fare</th>
              <th className="p-3 text-center">Dispatch Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {isDataLoading ? (
              <TableSkeletonRows rows={6} cols={9} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted text-xs">
                  No bookings match the specified criteria.
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const assignedDriver =
                  b.driver || (b.assigned_driver_id ? drivers.find((d) => d.id === b.assigned_driver_id) : null);

                return (
                  <tr key={b.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{b.booking_reference}</span>
                        {b.booking_method === 'custom' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Custom
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Fixed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted block">{formatDateTime(b.created_at)}</span>
                        {b.trip_type === 'round_trip' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            Round-Trip
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-primary">{b.passenger_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={`tel:${b.passenger_phone}`}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] flex items-center gap-1"
                          title="Call Customer"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>{b.passenger_phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/${b.passenger_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-500 hover:text-emerald-400 hover:underline text-[11px] flex items-center gap-1 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="line-clamp-1 font-medium text-primary">{b.pickup_address}</p>
                      {b.intermediate_stops && b.intermediate_stops.length > 0 && (
                        <div className="my-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailModalBooking(b)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30 transition-colors"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            <span>+{b.intermediate_stops.length} stop{b.intermediate_stops.length > 1 ? 's' : ''} (view)</span>
                          </button>
                        </div>
                      )}
                      <p className="line-clamp-1 text-muted text-[11px]">&rarr; {b.destination_address}</p>
                      {b.return_scheduled_at && (
                        <p className="text-[10px] text-sky-400 font-medium mt-0.5">
                          Return: {formatDateTime(b.return_scheduled_at)}
                        </p>
                      )}
                      {b.notes && (
                        <p className="text-[10px] text-muted italic line-clamp-1 mt-0.5">Note: {b.notes}</p>
                      )}
                      {b.dispatcher_notes && (
                        <p className="text-[10px] text-amber-400/90 italic line-clamp-1 mt-0.5">
                          Dispatcher: {b.dispatcher_notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3 uppercase text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                      {b.vehicle_type?.replace('_', ' ') || 'Sedan'}
                    </td>
                    <td className="p-3 whitespace-nowrap">{getStatusBadge(b.status)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {b.payment_screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => setViewScreenshotUrl(b.payment_screenshot_url!)}
                          className="px-2 py-1 bg-card hover:bg-card-hover border border-base rounded-lg text-[11px] text-amber-400 flex items-center gap-1 font-medium transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View Proof
                        </button>
                      ) : (
                        <span className="text-muted text-[11px] italic">No receipt</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {assignedDriver ? (
                        <div>
                          <span className="text-primary font-bold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            {assignedDriver.profile?.full_name || assignedDriver.full_name || 'Assigned Driver'}
                          </span>
                          <span className="text-[10px] text-muted block">
                            {assignedDriver.vehicle?.model || assignedDriver.assigned_vehicle?.model || 'Fleet Vehicle'} &bull;{' '}
                            {assignedDriver.vehicle?.plate_number || assignedDriver.assigned_vehicle?.plate_number || 'VIP'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {b.booking_method === 'custom' && !b.confirmed_fare && !b.final_fare ? (
                        <div className="space-y-0.5">
                          <span className="text-amber-400 italic font-semibold text-xs block">Awaiting Quote</span>
                          <span className="text-[9px] text-muted block uppercase tracking-wider">custom route</span>
                        </div>
                      ) : b.confirmed_fare ? (
                        <div className="space-y-0.5">
                          <div className="font-bold tabular-nums text-primary text-sm">
                            {formatFareSAR(b.confirmed_fare)}
                          </div>
                          <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">
                            Quote Confirmed
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold tabular-nums text-primary">
                            {b.fixed_fare_amount
                              ? formatFareSAR(b.fixed_fare_amount)
                              : formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                          </div>
                          {b.fixed_fare_amount && (
                            <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5 text-right">
                              fixed · no surge
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Step 0: Custom Route Quote & Review Action */}
                        {b.status === 'pending_review' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setQuoteModalBooking(b);
                                setQuoteFareAmount(b.confirmed_fare ? String(b.confirmed_fare) : '');
                                setQuoteNotes(b.dispatcher_notes || '');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow transition-all flex items-center gap-1"
                              title="Set Custom Fare & Confirm"
                            >
                              <DollarSign className="w-3 h-3" /> Quote Fare
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalBooking(b);
                                setBookingRejectReason('Vehicle or route unavailable for requested schedule');
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors flex items-center gap-1"
                              title="Decline / Reject Custom Booking"
                            >
                              <XCircle className="w-3 h-3" /> Decline
                            </button>
                          </div>
                        )}

                        {/* Step 1: Payment Verification Action */}
                        {b.status === 'pending_verification' && (
                          <button
                            onClick={() => {
                              setVerifyModalBooking(b);
                              setShowRejectForm(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow transition-colors flex items-center gap-1"
                            title="Verify or Reject Payment Proof"
                          >
                            <ShieldAlert className="w-3 h-3" /> Review Payment
                          </button>
                        )}

                        {/* Step 2: Driver Assignment Action (after verification / confirmed) */}
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => {
                                setAssignModalBooking(b);
                                setIsReassignMode(false);
                                setSelectedDriverId(activeFleetDrivers[0]?.id || '');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors flex items-center gap-1"
                              title="Assign an available driver"
                            >
                              <UserCheck className="w-3 h-3" /> Assign Driver
                            </button>
                            <button
                              onClick={() => autoAssignDriver(b.id)}
                              className="p-1 rounded-lg text-[11px] bg-surface hover:bg-amber-500 hover:text-slate-950 text-amber-500 border border-base transition-colors"
                              title="Auto-match nearest available driver"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Step 3: Driver Reassignment Action */}
                        {b.status === 'driver_assigned' && (
                          <button
                            onClick={() => {
                              setAssignModalBooking(b);
                              setIsReassignMode(true);
                              setSelectedDriverId(activeFleetDrivers[0]?.id || '');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-card hover:bg-card-hover border border-base text-secondary hover:text-primary transition-colors flex items-center gap-1"
                            title="Reassign to a different chauffeur"
                          >
                            <RefreshCw className="w-3 h-3 text-cyan-400" /> Reassign
                          </button>
                        )}

                        {/* Status detail when already active or other */}
                        {b.status !== 'pending_review' &&
                          b.status !== 'pending_verification' &&
                          b.status !== 'confirmed' &&
                          b.status !== 'driver_assigned' && (
                            ['completed', 'trip_completed', 'ride_completed', 'payment_completed'].includes(b.status) ? (
                              (() => {
                                const bRating = ratings.find((r) => r.booking_id === b.id);
                                if (bRating) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReviewBooking({ booking: b, rating: bRating })}
                                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Click to view passenger review"
                                    >
                                      <Star className="w-3 h-3 fill-amber-500" />
                                      <span>Rated {bRating.rating}.0 ★</span>
                                    </button>
                                  );
                                }
                                return (
                                  <span className="text-[11px] text-muted italic">Completed (Unrated)</span>
                                );
                              })()
                            ) : (
                              <span className="text-[11px] text-muted italic">In Progress / Logged</span>
                            )
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Proof Verification Modal */}
      {verifyModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="type-card-title">Verify Bank Transfer Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalBooking(null)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Booking Summary */}
            <div className="bg-surface p-3.5 rounded-2xl border border-base space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-400">
                  {verifyModalBooking.booking_reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Passenger:</span>
                <span className="font-bold text-primary">
                  {verifyModalBooking.passenger_name} ({verifyModalBooking.passenger_phone})
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
                <span className="text-sm font-bold text-emerald-400">
                  {verifyModalBooking.fixed_fare_amount
                    ? formatFareSAR(verifyModalBooking.fixed_fare_amount)
                    : formatCurrency(
                        verifyModalBooking.final_fare || verifyModalBooking.estimated_fare,
                        settings.currency
                      )}
                </span>
              </div>
              {verifyModalBooking.fixed_fare_amount && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">Pricing Type:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    Fixed Fare · No Hidden Charges
                  </span>
                </div>
              )}
              {verifyModalBooking.service_type && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">Service Route:</span>
                  <span className="font-medium text-primary capitalize">
                    {(verifyModalBooking.service_type as string).replace(/_/g, ' ')}
                    {verifyModalBooking.terminal && (
                      <span className="ml-1 text-amber-400">
                        · {(verifyModalBooking.terminal as string).replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject Proof
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalBooking(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-card-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifySubmit}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify &amp; Confirm Booking
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRejectSubmit} className="space-y-3 pt-2 border-t border-base">
                <div className="space-y-1 text-xs">
                  <label className="text-secondary font-bold text-rose-400">
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
                    className="px-3 py-1.5 rounded-xl text-xs text-muted hover:text-primary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manual Driver Assignment & Reassignment Modal */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-500" />
                <h3 className="type-card-title">
                  {isReassignMode ? 'Reassign VIP Chauffeur' : 'Assign Available VIP Chauffeur'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalBooking(null)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-surface p-3 rounded-xl border border-base">
              <div>
                <span className="text-muted">Booking: </span>
                <span className="text-amber-500 font-bold">{assignModalBooking.booking_reference}</span>
              </div>
              <div>
                <span className="text-muted">Route: </span>
                <span className="text-primary">
                  {assignModalBooking.pickup_address} &rarr; {assignModalBooking.destination_address}
                </span>
              </div>
              <div>
                <span className="text-muted">Vehicle Class Required: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  {assignModalBooking.vehicle_type?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Select Fleet Chauffeur ({activeFleetDrivers.length} on duty)
              </label>
              {activeFleetDrivers.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  No chauffeurs are currently on duty in the fleet pool.
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
                  >
                    {activeFleetDrivers.map((d) => {
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

                      return (
                        <option key={d.id} value={d.id}>
                          {conflict.hasOverlap ? '⚠️ [CONFLICT] ' : ''}
                          {d.profile?.full_name || d.full_name || 'Captain'} &bull;{' '}
                          {d.vehicle?.make || d.assigned_vehicle?.make || 'Fleet'} (
                          {d.vehicle?.plate_number || d.assigned_vehicle?.plate_number || 'VIP'})
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
                      <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Schedule Collision Detected
                        </div>
                        <p>{conflict.message}</p>
                        <p className="text-[11px] text-rose-400/80">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-elevated hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !selectedDriverId ||
                  activeFleetDrivers.length === 0 ||
                  Boolean(
                    assignModalBooking &&
                      selectedDriverId &&
                      checkDriverOverlap(
                        bookings.filter((bk) => bk.assigned_driver_id === selectedDriverId),
                        assignModalBooking
                      ).hasOverlap
                  )
                }
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow transition-all"
              >
                {isReassignMode ? 'Confirm Reassignment' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick View Screenshot Modal */}
      {viewScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Customer Payment Proof
              </div>
              <button
                onClick={() => setViewScreenshotUrl(null)}
                className="p-1 rounded-lg hover:bg-card-hover text-muted hover:text-primary transition-colors"
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
                className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Open full resolution &rarr;
              </a>
              <button
                onClick={() => setViewScreenshotUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted-surface hover:bg-card-hover border border-base text-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telephone Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePhoneBooking}
            className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-500" />
                <h3 className="type-card-title">Telephone Booking (Staff Dispatch)</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-primary transition-colors"
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
                  <option value="van">Royal Van</option>
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:bg-elevated hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Create &amp; Dispatch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Route Quote Fare Modal */}
      {quoteModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleQuoteSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                <h3 className="type-card-title">Quote &amp; Confirm Custom Route Fare</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalBooking(null)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passenger & Contact summary */}
            <div className="bg-surface p-3.5 rounded-2xl border border-base space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-400">
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
                <span className="text-muted">Direct Contact:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${quoteModalBooking.passenger_phone}`}
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>{quoteModalBooking.passenger_phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${quoteModalBooking.passenger_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-500/25"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
              <div className="pt-2 border-t border-base/60 space-y-1">
                <div className="flex items-start gap-1.5 text-primary">
                  <span className="text-emerald-400 font-bold shrink-0">Pickup:</span>
                  <span className="truncate">{quoteModalBooking.pickup_address}</span>
                </div>
                {quoteModalBooking.intermediate_stops && quoteModalBooking.intermediate_stops.length > 0 && (
                  <div className="text-purple-300 text-[11px] pl-3 py-0.5 space-y-0.5">
                    {quoteModalBooking.intermediate_stops.map((st, i) => (
                      <div key={st.id || i} className="truncate">
                        &bull; Stop {i + 1}: {st.address}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-1.5 text-primary">
                  <span className="text-rose-400 font-bold shrink-0">Drop-off:</span>
                  <span className="truncate">{quoteModalBooking.destination_address}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-base/60 text-[11px]">
                <span className="text-muted">Vehicle Class &amp; Pax:</span>
                <span className="font-semibold text-emerald-400 uppercase">
                  {quoteModalBooking.vehicle_type?.replace('_', ' ')} &bull; {quoteModalBooking.passenger_count || 1} Guests
                </span>
              </div>
              {quoteModalBooking.trip_type === 'round_trip' && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Trip Type:</span>
                  <span className="text-sky-400 font-semibold">
                    Round-Trip {quoteModalBooking.return_scheduled_at ? `(Return: ${formatDateTime(quoteModalBooking.return_scheduled_at)})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Input Fare Amount */}
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
                  className="w-full bg-input border border-base rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold text-amber-400 placeholder:text-muted focus:outline-none focus:border-purple-500"
                />
              </div>
              <p className="text-[11px] text-muted">
                This exact amount will be communicated to the customer. No hidden surcharges apply.
              </p>
            </div>

            {/* Dispatcher Notes */}
            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-secondary">
                Dispatcher Notes &amp; Transfer Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="e.g. Rate includes 2 intermediate stops in Jeddah Corniche. Transfer to Al Rajhi bank."
                className="w-full bg-input border border-base rounded-xl p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-base">
              <button
                type="button"
                onClick={() => setQuoteModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isQuoting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isQuoting ? 'Confirming...' : 'Confirm Fare & Release Quote'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Custom Booking Modal */}
      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleRejectBookingSubmit}
            className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="type-card-title">Decline Custom Booking Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface p-3 rounded-xl border border-base text-xs space-y-1">
              <div>
                <span className="text-muted">Booking Reference: </span>
                <span className="font-mono font-bold text-amber-400">{rejectModalBooking.booking_reference}</span>
              </div>
              <div>
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
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-base">
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow disabled:opacity-50"
              >
                {isRejecting ? 'Declining...' : 'Decline Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stops & Itinerary Detail Modal */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                <h3 className="type-card-title">Route &amp; Intermediate Stops Itinerary</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Booking Reference:</span>
                <span className="font-mono font-bold text-amber-400">{detailModalBooking.booking_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Passenger:</span>
                <span className="font-bold text-primary">{detailModalBooking.passenger_name} ({detailModalBooking.passenger_phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trip Mode:</span>
                <span className="text-primary font-medium capitalize">
                  {detailModalBooking.trip_type === 'round_trip' ? 'Round-Trip' : 'One-Way Journey'}
                </span>
              </div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-base space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                    Pickup Location
                  </span>
                  <p className="font-medium text-primary mt-0.5">{detailModalBooking.pickup_address}</p>
                </div>
              </div>

              {detailModalBooking.intermediate_stops?.map((st, i) => (
                <div key={st.id || i} className="flex items-start gap-3 pl-0.5">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30">
                    {i + 2}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-300 block tracking-wider">
                      Intermediate Stop {i + 1}
                    </span>
                    <p className="font-medium text-primary mt-0.5">{st.address}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {(detailModalBooking.intermediate_stops?.length || 0) + 2}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">
                    Final Destination
                  </span>
                  <p className="font-medium text-primary mt-0.5">{detailModalBooking.destination_address}</p>
                </div>
              </div>
            </div>

            {detailModalBooking.notes && (
              <div className="p-3 bg-card border border-base rounded-xl text-xs space-y-1">
                <span className="font-semibold text-secondary">Customer Instructions:</span>
                <p className="text-primary italic">{detailModalBooking.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-card-hover text-primary transition-colors border border-base"
              >
                Close Itinerary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Review Detail Modal */}
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
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h3 className="type-card-title">Passenger Rating &amp; Review</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReviewBooking(null)}
                  className="text-muted hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-surface rounded-2xl border border-base space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Booking Reference:</span>
                  <span className="font-mono font-bold text-amber-400">{b.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Passenger:</span>
                  <span className="font-bold text-primary">{b.passenger_name} ({b.passenger_phone})</span>
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
                          star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-600'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-amber-500 ml-1">{r.rating}.0 / 5.0</span>
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
    </div>
  );
}
