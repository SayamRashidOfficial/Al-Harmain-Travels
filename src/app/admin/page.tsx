'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Booking } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  DollarSign,
  Coins,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  User,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Settings,
  Briefcase,
  UserCheck,
  FileText,
  Search,
  X,
  Eye,
  ExternalLink,
  Receipt,
  MapPin,
  RefreshCw,
  Phone,
  Plane,
  Calendar,
  Star,
  Sparkles,
  ArrowRight,
  Compass,
  Building,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
  AdminTableCard,
} from '@/components/admin/AdminUIComponents';
import { TableSkeletonRows } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const {
    bookings,
    drivers,
    vehicles,
    usersList,
    settings,
    ratings,
    isDataLoading,
    refreshData,
  } = useApp();

  // Search, Filter & Sort state for Bookings Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'fare_high' | 'fare_low'>('newest');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('24 Oct 2026, 08:41 AM');

  // Format real-time or initial timestamp matching the operational blueprint
  useEffect(() => {
    try {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLastUpdated(`${datePart}, ${timePart}`);
    } catch {
      // Keep blueprint default
    }
  }, [bookings]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(0);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);

  // ── Helper: Safe User / Driver Initials ─────────────────────────────────────
  const getInitials = useCallback((name?: string | null): string => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, []);

  // ── 100% Real-Time Executive Metrics (Derived from Live Database State) ────
  const metrics = useMemo(() => {
    // 1. Eligible Revenue & Financials (from actual completed/paid records)
    const eligibleBookings = bookings.filter(
      (b) =>
        b.status === 'trip_completed' ||
        b.status === 'ride_completed' ||
        b.status === 'payment_completed' ||
        b.payment_status === 'paid'
    );
    const totalRevenue = eligibleBookings.reduce(
      (sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0),
      0
    );

    // Month-over-month revenue comparison based on actual booking created_at dates
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const currentMonthRev = eligibleBookings
      .filter((b) => {
        if (!b.created_at) return false;
        const d = new Date(b.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);

    const prevMonthRev = eligibleBookings
      .filter((b) => {
        if (!b.created_at) return false;
        const d = new Date(b.created_at);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);

    const revenueMoM = prevMonthRev > 0
      ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100
      : null;

    // Dynamic wave points from recent settled bookings (normalized to viewBox 100 x 24)
    const recentSettled = eligibleBookings
      .slice(0, 8)
      .map((b) => Number(b.final_fare ?? b.estimated_fare ?? 0))
      .reverse();
    const maxSettled = Math.max(...recentSettled, 1);
    const wavePoints = recentSettled.length >= 2
      ? recentSettled.map((fare, idx) => ({
          x: Math.round((idx / (recentSettled.length - 1)) * 100),
          y: Math.max(3, Math.min(22, Math.round(22 - (fare / maxSettled) * 18))),
        }))
      : null;

    // 2. Chauffeur Fleet & Readiness
    const totalDrivers = drivers.length;
    const availableDrivers = drivers.filter((d) => d.status === 'available').length;
    const onTripDrivers = drivers.filter(
      (d) => d.status === 'assigned' || d.status === 'busy' || d.status === 'on_trip'
    ).length;
    const offlineDrivers = drivers.filter((d) => d.status === 'offline').length;
    const driverAvailabilityRate = totalDrivers > 0
      ? Math.round((availableDrivers / totalDrivers) * 100)
      : 0;

    // 3. Reservations & Real Trip Statuses
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
    const activeTrips = bookings.filter((b) =>
      [
        'driver_assigned',
        'driver_accepted',
        'driver_arriving',
        'driver_arrived',
        'trip_started',
        'ride_started',
      ].includes(b.status)
    ).length;
    const completedTrips = bookings.filter((b) =>
      ['trip_completed', 'ride_completed', 'payment_completed'].includes(b.status)
    ).length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

    // Month-over-month booking count comparison
    const currentMonthBookings = bookings.filter((b) => {
      if (!b.created_at) return false;
      const d = new Date(b.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const prevMonthBookings = bookings.filter((b) => {
      if (!b.created_at) return false;
      const d = new Date(b.created_at);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;
    const bookingsMoM = prevMonthBookings > 0
      ? ((currentMonthBookings - prevMonthBookings) / prevMonthBookings) * 100
      : null;

    // Dynamic 15 equalizer bars from actual recent bookings distribution over last 15 days
    const recentDaysCounts = Array.from({ length: 15 }, (_, i) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (14 - i));
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      return bookings.filter((b) => b.created_at?.slice(0, 10) === targetDateStr).length;
    });
    const maxDayCount = Math.max(...recentDaysCounts, 1);
    const equalizerBars = recentDaysCounts.map((count) =>
      count > 0 ? Math.max(25, Math.round((count / maxDayCount) * 100)) : 15
    );

    // 4. Registered Accounts & Real Roles & Verification Statuses
    const totalAccounts = usersList.length;
    const customerAccounts = usersList.filter((u) => u.role === 'customer').length;
    const dispatcherAccounts = usersList.filter((u) => u.role === 'dispatcher').length;
    const driverAccounts = usersList.filter((u) => u.role === 'driver').length;
    const adminAccounts = usersList.filter((u) => u.role === 'admin').length;
    const verifiedAccounts = usersList.filter(
      (u) => Boolean(u.email_verified || (u as any).phone_verified)
    ).length;
    const verifiedPilgrims = usersList.filter(
      (u) => u.role === 'customer' && Boolean(u.email_verified || (u as any).phone_verified)
    ).length;
    const verifiedRate = totalAccounts > 0
      ? Math.round((verifiedAccounts / totalAccounts) * 100)
      : 0;

    return {
      totalRevenue,
      eligibleBookingsCount: eligibleBookings.length,
      revenueMoM,
      currentMonthRev,
      wavePoints,
      totalDrivers,
      availableDrivers,
      onTripDrivers,
      offlineDrivers,
      driverAvailabilityRate,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeTrips,
      completedTrips,
      cancelledBookings,
      bookingsMoM,
      equalizerBars,
      totalAccounts,
      customerAccounts,
      dispatcherAccounts,
      driverAccounts,
      adminAccounts,
      verifiedAccounts,
      verifiedPilgrims,
      verifiedRate,
    };
  }, [bookings, drivers, usersList]);

  // Backward-compatible variables for existing components & handlers
  const {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    activeTrips,
    completedTrips,
    cancelledBookings,
    totalDrivers,
    availableDrivers,
    totalRevenue,
  } = metrics;
  const totalCustomers = metrics.customerAccounts;
  const totalStaff = metrics.dispatcherAccounts;

  // Construct dynamic SVG wave path for revenue card
  const revenueWavePath = useMemo(() => {
    if (!metrics.wavePoints || metrics.wavePoints.length < 2) {
      if (metrics.totalRevenue === 0) {
        return {
          line: 'M 0 20 L 100 20',
          area: 'M 0 20 L 100 20 L 100 24 L 0 24 Z',
        };
      }
      return {
        line: 'M 0 20 Q 20 18, 40 14 T 75 9 T 100 3',
        area: 'M 0 20 Q 20 18, 40 14 T 75 9 T 100 3 L 100 24 L 0 24 Z',
      };
    }
    const pts = metrics.wavePoints;
    const line = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const area = `${line} L 100 24 L 0 24 Z`;
    return { line, area };
  }, [metrics.wavePoints, metrics.totalRevenue]);

  // Vehicle class distribution
  const vehicleStats = useMemo(() => {
    const stats: Record<string, { count: number; name: string }> = {
      vip_gmc: { count: 0, name: 'VIP GMC Yukon' },
      sedan: { count: 0, name: 'Luxury Sedan' },
      suv: { count: 0, name: 'Family SUV' },
      van: { count: 0, name: 'Family Van' },
      bus: { count: 0, name: 'VIP Coach / Bus' },
    };

    bookings.forEach((b) => {
      const type = b.vehicle_type || 'sedan';
      if (stats[type]) {
        stats[type].count += 1;
      }
    });

    return stats;
  }, [bookings]);

  // ── Server-Side Bookings Pagination with Resilient Fallback ───────────────
  const fetchBookingsPage = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let query = supabase.from('bookings').select(
        `
        *,
        driver:drivers(*, profile:profiles(*), assigned_vehicle:rate_vehicle_types(*), location:driver_locations(*)),
        payments(*)
      `,
        { count: 'exact' }
      );

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active_trips') {
          query = query.in('status', [
            'driver_assigned',
            'driver_accepted',
            'driver_arriving',
            'driver_arrived',
            'trip_started',
            'ride_started',
          ]);
        } else if (statusFilter === 'completed') {
          query = query.in('status', ['trip_completed', 'ride_completed', 'payment_completed']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const term = `%${searchQuery.trim()}%`;
        query = query.or(
          `booking_reference.ilike.${term},passenger_name.ilike.${term},passenger_phone.ilike.${term},pickup_address.ilike.${term},destination_address.ilike.${term},vehicle_type.ilike.${term}`
        );
      }

      // Sort
      if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'fare_high') {
        query = query.order('final_fare', { ascending: false });
      } else if (sortBy === 'fare_low') {
        query = query.order('final_fare', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setPaginatedBookings((data as Booking[]) || []);
      setTotalFilteredCount(count ?? 0);
    } catch (err) {
      console.warn('Server-side query notice, falling back to cached local state:', err);

      // Resilient local fallback from AppContext
      const filtered = bookings.filter((b) => {
        if (statusFilter !== 'all') {
          if (statusFilter === 'active_trips') {
            const isActive =
              b.status === 'driver_assigned' ||
              b.status === 'driver_accepted' ||
              b.status === 'driver_arriving' ||
              b.status === 'driver_arrived' ||
              b.status === 'trip_started' ||
              b.status === 'ride_started';
            if (!isActive) return false;
          } else if (statusFilter === 'completed') {
            const isDone =
              b.status === 'trip_completed' ||
              b.status === 'ride_completed' ||
              b.status === 'payment_completed';
            if (!isDone) return false;
          } else if (b.status !== statusFilter) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            b.booking_reference?.toLowerCase().includes(q) ||
            b.passenger_name?.toLowerCase().includes(q) ||
            b.passenger_phone?.includes(q) ||
            b.pickup_address?.toLowerCase().includes(q) ||
            b.destination_address?.toLowerCase().includes(q) ||
            b.vehicle_type?.toLowerCase().includes(q)
          );
        }

        return true;
      });

      // Sort locally
      filtered.sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'fare_high') {
          return (b.final_fare || b.estimated_fare || 0) - (a.final_fare || a.estimated_fare || 0);
        }
        if (sortBy === 'fare_low') {
          return (a.final_fare || a.estimated_fare || 0) - (b.final_fare || b.estimated_fare || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTotalFilteredCount(filtered.length);
      const from = (currentPage - 1) * pageSize;
      setPaginatedBookings(filtered.slice(from, from + pageSize));
    } finally {
      setIsTableLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchQuery, sortBy, bookings]);

  // Trigger fetch whenever page, page size, filter, or search changes
  useEffect(() => {
    fetchBookingsPage();
  }, [fetchBookingsPage]);

  // Reset page to 1 when filters or search change
  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // ── Sync Live Data ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchBookingsPage()]);
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLastUpdated(`${datePart}, ${timePart}`);
      toast.success('Admin headquarters synchronized.');
    } catch {
      toast.error('Failed to sync live data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Pagination Math ───────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const startRecord = totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalFilteredCount);

  // Dynamic visible page numbers (sliding window of up to 5 pages)
  const visiblePageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  if (isDataLoading) {
    return (
      <div className="page-shell space-y-8 animate-pulse">
        <div className="bg-card border border-base p-8 rounded-3xl h-32" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-card border border-base h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-card border border-base h-40" />
          ))}
        </div>
        <div className="bg-card border border-base rounded-3xl p-6 h-72" />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      {/* ── 1. Top Executive Banner ────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Executive Headquarters"
        badge="Single Authority Command"
        title="Al Harmain Management Dashboard"
        description="Comprehensive real-time command of verified pilgrims, chauffeur fleet operations, staff dispatchers, and sacred journey finances."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          title="Refresh headquarters data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
          <span>Sync Data</span>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </button>

        <Link
          href="/admin/users"
          className="px-4 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <Users className="w-4 h-4 text-emerald-200" />
          <span>Manage Users</span>
        </Link>

        <Link
          href="/admin/reviews"
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Reviews &amp; Ratings ({ratings.length})</span>
        </Link>
      </AdminPageHeader>

      {/* ── 2. Primary 4 High-Level Summary Cards (100% Database-Driven & Real-Time) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Gross Revenue */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white via-white to-emerald-50/20 border border-emerald-100/90 shadow-[0_2px_12px_-2px_rgba(16,185,129,0.06)] hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800 truncate" title="Gross Pilgrimage Revenue">
                  Gross Pilgrimage Revenue
                </span>
              </div>
              {metrics.revenueMoM !== null ? (
                <span
                  className={`text-[10.5px] font-bold inline-flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded-full border shadow-2xs ${
                    metrics.revenueMoM >= 0
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70'
                      : 'text-slate-700 bg-slate-50 border-slate-200/70'
                  }`}
                >
                  {metrics.revenueMoM >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-slate-500" />
                  )}
                  {metrics.revenueMoM >= 0 ? `+${metrics.revenueMoM.toFixed(1)}%` : `${metrics.revenueMoM.toFixed(1)}%`} MoM
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5 text-[10.5px] font-bold inline-flex items-center gap-0.5 shrink-0 shadow-2xs">
                  <Coins className="w-3 h-3 text-emerald-600" />
                  {metrics.eligibleBookingsCount} Settled
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {formatCurrency(metrics.totalRevenue, settings.currency)}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                {metrics.totalRevenue > 0
                  ? `${metrics.eligibleBookingsCount} settled journeys • ${metrics.pendingBookings} awaiting payment.`
                  : 'No settled journeys recorded in database yet.'}
              </p>
            </div>
          </div>

          {/* Dynamic database-backed revenue wave path */}
          <div className="h-6 w-full my-1 flex items-end">
            <svg className="w-full h-5 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="emeraldRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={revenueWavePath.area} fill="url(#emeraldRevenueGrad)" />
              <path d={revenueWavePath.line} fill="none" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </div>

          <div className="pt-0.5">
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 font-semibold text-[11px] py-1.5 px-3 transition-colors group/btn shadow-2xs"
            >
              <span>Inspect Financial Ledger</span>
              <ArrowRight className="w-3 h-3 text-emerald-700 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Chauffeur Fleet Readiness */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white via-white to-amber-50/20 border border-amber-100/90 shadow-[0_2px_12px_-2px_rgba(245,158,11,0.06)] hover:shadow-md hover:border-amber-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Car className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800 truncate" title="Chauffeur Fleet">
                  Chauffeur Fleet
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold inline-flex items-center gap-1 shrink-0 shadow-2xs ${
                  metrics.availableDrivers > 0
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                    : 'text-amber-800 bg-amber-50 border border-amber-200/70'
                }`}
              >
                {metrics.availableDrivers > 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
                {metrics.totalDrivers > 0 ? `${metrics.driverAvailabilityRate}% Available` : '0 Chauffeurs'}
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {metrics.availableDrivers} / {metrics.totalDrivers} Ready
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                {metrics.totalDrivers > 0
                  ? `${metrics.onTripDrivers} on duty • ${metrics.offlineDrivers} offline • ${vehicles.length} fleet vehicles.`
                  : 'No chauffeurs currently registered in the system.'}
              </p>
            </div>
          </div>

          {/* Dynamic real driver avatars & car watermark */}
          <div className="h-6 w-full my-1 flex items-center justify-between">
            <div className="flex items-center -space-x-1.5">
              {drivers.length > 0 ? (
                drivers.slice(0, 3).map((d, i) => {
                  const name = d.profile?.full_name || (d as any).full_name || 'Driver';
                  const initials = getInitials(name);
                  const isAvail = d.status === 'available';
                  const isOnDuty = d.status === 'assigned' || d.status === 'busy' || d.status === 'on_trip';
                  const bgClass = isAvail
                    ? 'bg-emerald-500 text-white'
                    : isOnDuty
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-400 text-white';

                  return (
                    <div
                      key={d.id || i}
                      title={`${name} (${d.status || 'offline'})`}
                      className={`w-5 h-5 rounded-full ${bgClass} flex items-center justify-center font-bold text-[8px] border-2 border-white shadow-2xs`}
                    >
                      {initials}
                    </div>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-400 italic">No chauffeurs</span>
              )}
              {drivers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[8px] border-2 border-white shadow-2xs">
                  +{drivers.length - 3}
                </div>
              )}
            </div>
            <div className="opacity-15 -mr-1">
              <Car className="w-9 h-5 text-amber-600" strokeWidth={1.5} />
            </div>
          </div>

          <div className="pt-0.5">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 font-semibold text-[11px] py-1.5 px-3 transition-colors group/btn shadow-2xs"
            >
              <span>View Captain Roster</span>
              <ArrowRight className="w-3 h-3 text-amber-700 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Global Reservations Volume */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white via-white to-sky-50/20 border border-sky-100/90 shadow-[0_2px_12px_-2px_rgba(14,165,233,0.06)] hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Receipt className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800 truncate" title="Total Reservations">
                  Total Reservations
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold inline-flex items-center gap-0.5 shrink-0 shadow-2xs ${
                  (metrics.bookingsMoM ?? 0) >= 0
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                    : 'text-slate-700 bg-slate-50 border border-slate-200/70'
                }`}
              >
                {metrics.bookingsMoM !== null ? (
                  <>
                    {metrics.bookingsMoM >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-slate-500" />
                    )}
                    {metrics.bookingsMoM >= 0 ? `+${metrics.bookingsMoM.toFixed(1)}%` : `${metrics.bookingsMoM.toFixed(1)}%`} MoM
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-sky-600" />
                    {metrics.activeTrips} Active
                  </>
                )}
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {metrics.totalBookings} Total
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                {metrics.totalBookings > 0
                  ? `${metrics.activeTrips} active trips en route • ${metrics.completedTrips} safely arrived.`
                  : 'No reservation records found in database.'}
              </p>
            </div>
          </div>

          {/* Dynamic database-driven equalizer graphic */}
          <div className="h-6 w-full my-1 flex items-end gap-1 pb-0.5">
            {metrics.equalizerBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-sky-200/80 transition-all duration-300 hover:bg-sky-400"
                style={{ height: `${h}%` }}
                title={`Activity day ${i + 1}`}
              />
            ))}
          </div>

          <div className="pt-0.5">
            <Link
              href="/dispatcher/queue"
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200/90 bg-sky-50/50 hover:bg-sky-100/70 text-sky-800 font-semibold text-[11px] py-1.5 px-3 transition-colors group/btn shadow-2xs"
            >
              <span>Open Live Queue</span>
              <ArrowRight className="w-3 h-3 text-sky-700 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Registered Accounts & Verified Pilgrims */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white via-white to-purple-50/20 border border-purple-100/90 shadow-[0_2px_12px_-2px_rgba(168,85,247,0.06)] hover:shadow-md hover:border-purple-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-xs font-semibold text-slate-800 truncate" title="Registered Accounts">
                  Registered Accounts
                </span>
              </div>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5 text-[10.5px] font-bold inline-flex items-center gap-1 shrink-0 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {metrics.totalAccounts > 0 ? `${metrics.verifiedRate}% Verified` : '0 Users'}
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {metrics.totalAccounts} Users
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                {metrics.totalAccounts > 0
                  ? `${metrics.customerAccounts} verified pilgrims • ${metrics.dispatcherAccounts} dispatchers • ${metrics.driverAccounts} drivers.`
                  : 'No user profiles registered in database.'}
              </p>
            </div>
          </div>

          {/* Dynamic real registered users avatar chips & watermark */}
          <div className="h-6 w-full my-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {usersList.length > 0 ? (
                usersList.slice(0, 3).map((u, i) => {
                  const initials = getInitials(u.full_name || u.email || 'User');
                  const isDriver = u.role === 'driver';
                  const isStaff = u.role === 'dispatcher' || u.role === 'admin';
                  const chipColor = isStaff
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : isDriver
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                  return (
                    <span
                      key={u.id || i}
                      title={`${u.full_name || 'User'} (${u.role || 'customer'}${u.email_verified ? ' • Verified' : ''})`}
                      className={`w-5 h-5 rounded-full ${chipColor} text-[8px] font-bold flex items-center justify-center border shadow-2xs`}
                    >
                      {initials}
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-400 italic">No users</span>
              )}
              {usersList.length > 3 && (
                <span className="text-[8.5px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded-full border border-slate-200 shadow-2xs">
                  +{usersList.length - 3}
                </span>
              )}
            </div>
            <div className="opacity-15 -mr-1">
              <Users className="w-8 h-5 text-purple-700" />
            </div>
          </div>

          <div className="pt-0.5">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/90 bg-purple-50/50 hover:bg-purple-100/70 text-purple-800 font-semibold text-[11px] py-1.5 px-3 transition-colors group/btn shadow-2xs"
            >
              <span>Manage User Access</span>
              <ArrowRight className="w-3 h-3 text-purple-700 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Operational Quick Filter Status Strip (5 Cards Matching Blueprint) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Pending Card */}
        <button
          onClick={() => handleFilterChange('pending')}
          className={`p-4 rounded-2xl bg-white border text-left transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-md ${
            statusFilter === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200/90 hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800">Pending</span>
            </div>
            <span className="font-bold text-base text-slate-900 tabular-nums">{pendingBookings}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] text-slate-500">Awaiting confirmation</p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-b-2xl" />
        </button>

        {/* Confirmed Card */}
        <button
          onClick={() => handleFilterChange('confirmed')}
          className={`p-4 rounded-2xl bg-white border text-left transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-md ${
            statusFilter === 'confirmed'
              ? 'border-sky-500 ring-2 ring-sky-500/20'
              : 'border-slate-200/90 hover:border-sky-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-50 text-sky-600 border border-sky-200/70 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800">Confirmed</span>
            </div>
            <span className="font-bold text-base text-slate-900 tabular-nums">{confirmedBookings}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] text-slate-500">Ready for match</p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 to-sky-300 rounded-b-2xl" />
        </button>

        {/* Active En Route Card */}
        <button
          onClick={() => handleFilterChange('active_trips')}
          className={`p-4 rounded-2xl bg-white border text-left transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-md ${
            statusFilter === 'active_trips'
              ? 'border-purple-500 ring-2 ring-purple-500/20'
              : 'border-slate-200/90 hover:border-purple-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800">Active En Route</span>
            </div>
            <span className="font-bold text-base text-slate-900 tabular-nums">{activeTrips}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] text-slate-500">On Saudi highways</p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-purple-300 rounded-b-2xl" />
        </button>

        {/* Completed Card */}
        <button
          onClick={() => handleFilterChange('completed')}
          className={`p-4 rounded-2xl bg-white border text-left transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-md ${
            statusFilter === 'completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200/90 hover:border-emerald-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800">Completed</span>
            </div>
            <span className="font-bold text-base text-slate-900 tabular-nums">{completedTrips}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] text-slate-500">Safely concluded</p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-b-2xl" />
        </button>

        {/* Cancelled Card */}
        <button
          onClick={() => handleFilterChange('cancelled')}
          className={`p-4 rounded-2xl bg-white border text-left transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-md ${
            statusFilter === 'cancelled'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-200/90 hover:border-rose-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-800">Cancelled</span>
            </div>
            <span className="font-bold text-base text-slate-900 tabular-nums">{cancelledBookings}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-0.5">
            <p className="text-[11px] text-slate-500">Discontinued</p>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-rose-300 rounded-b-2xl" />
        </button>
      </div>

      {/* ── 3B. Blueprint Footer Bar ───────────────────────────────────────── */}
      <div className="pt-2 pb-1 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-700">Al Harmain Travels</span>
          <span className="text-slate-300">|</span>
          <span>Trusted &bull; Safe &bull; Professional</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Last updated: {lastUpdated}</span>
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* ── 4. Operational Breakdown: Fleet Utilization & Sacred Corridors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vehicle Class Utilization Card */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>Vehicle Fleet Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active booking distribution across MOT licensed vehicle categories.
              </p>
            </div>
            <Link
              href="/admin/rates"
              className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Rates</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {Object.entries(vehicleStats).map(([key, item]) => {
              const pct = totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0;
              return (
                <div key={key} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {item.count} trips ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sacred Journey Hubs Card */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <span>Primary Sacred Transfer Corridors</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                High-volume corridors serving Umrah pilgrims and international delegations.
              </p>
            </div>
            <Link
              href="/dispatcher/radar"
              className="text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Fleet Radar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
                  <Plane className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Jeddah Airport (JED) &rarr; Makkah Haram</div>
                  <div className="text-[10.5px] text-slate-500">98 km express highway transfer</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                High Priority
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Makkah Al-Mukarramah &rarr; Madinah Al-Munawwarah</div>
                  <div className="text-[10.5px] text-slate-500">442 km intercity VIP pilgrimage</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                Intercity
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Holy Sites Ziyarat (Mina, Arafat, Taif)</div>
                  <div className="text-[10.5px] text-slate-500">Multi-point historical sacred tours</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/80">
                Full Day
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Global Bookings Management Section with Server-Side Pagination ── */}
      <AdminTableCard
        title="Global Bookings Registry"
        subtitle="Complete cross-role reservation log with live status tracking and passenger details"
        badge={`${totalFilteredCount} Bookings`}
        headerAction={
          <div className="flex items-center gap-2">
            <Link
              href="/dispatcher/queue"
              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
            >
              <span>Dispatcher Live Queue</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      >
        {/* Search, Status Tabs & Sort Toolbar */}
        <div className="p-4 border-b border-base bg-surface/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All (${totalBookings})` },
              { id: 'pending', label: `Pending (${pendingBookings})` },
              { id: 'confirmed', label: `Confirmed (${confirmedBookings})` },
              { id: 'active_trips', label: `Active (${activeTrips})` },
              { id: 'completed', label: `Completed (${completedTrips})` },
              { id: 'cancelled', label: `Cancelled (${cancelledBookings})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-card text-secondary hover:text-primary hover:bg-elevated border border-base'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Sort */}
          <div className="flex items-center gap-2">
            <div className="relative md:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, passenger, route..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs cursor-pointer font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="fare_high">Fare: High to Low</option>
              <option value="fare_low">Fare: Low to High</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Passenger</th>
                <th className="py-3.5 px-4">Journey Route</th>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Fare</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isTableLoading ? (
                <TableSkeletonRows cols={7} rows={pageSize > 10 ? 10 : pageSize} />
              ) : paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-800">No bookings found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try clearing search filters to see all reservations.'
                          : 'No reservations have been recorded in the system yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Reference */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                        {b.booking_reference}
                      </span>
                    </td>

                    {/* Passenger */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.passenger_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{b.passenger_phone || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div
                        className="flex items-center gap-1.5 text-slate-800 font-medium truncate"
                        title={b.pickup_address}
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="truncate">{b.pickup_address}</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-slate-500 truncate text-[11px] mt-0.5"
                        title={b.destination_address}
                      >
                        <span className="text-amber-600 shrink-0">&rarr;</span>
                        <span className="truncate">{b.destination_address}</span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold uppercase text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
                        <Car className="w-3.5 h-3.5 text-emerald-600" />
                        {b.vehicle_type?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <AdminStatusBadge status={b.status} />
                    </td>

                    {/* Fare */}
                    <td className="py-3.5 px-4 text-right font-extrabold tabular-nums text-slate-900 font-sans text-sm">
                      {formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                    </td>

                    {/* Action Buttons: View -> More (Dispatcher queue) */}
                    <td className="py-3.5 px-4 text-center">
                      <AdminActionGroup>
                        <AdminActionButton
                          variant="view"
                          tooltip="Inspect complete booking dossier"
                          onClick={() => setSelectedBooking(b)}
                        />
                        <Link href="/dispatcher/queue" title="Open Dispatcher Queue">
                          <AdminActionButton
                            variant="more"
                            tooltip="Manage in Live Dispatcher Queue"
                          />
                        </Link>
                      </AdminActionGroup>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Pagination Navigation (High Contrast Light Tokens) ─────────── */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/40 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Record Counter */}
          <div className="text-xs text-slate-600">
            Showing <span className="font-bold text-slate-900">{startRecord}</span>–
            <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
            <span className="font-bold text-slate-900">{totalFilteredCount}</span> bookings
          </div>

          {/* Navigation Controls */}
          <nav aria-label="Page navigation" className="flex items-center space-x-3">
            <ul className="flex -space-x-px text-sm">
              {/* Previous Button */}
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isTableLoading}
                  className={`flex items-center justify-center text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold rounded-l-xl text-xs px-3 h-8.5 focus:outline-none cursor-pointer transition-colors ${
                    currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Previous
                </button>
              </li>

              {/* Dynamic Page Numbers */}
              {visiblePageNumbers.map((num) => {
                const isActive = num === currentPage;
                return (
                  <li key={num}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      disabled={isTableLoading}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'flex items-center justify-center text-white bg-emerald-600 border border-emerald-600 font-bold text-xs w-8.5 h-8.5 focus:outline-none cursor-pointer shadow-2xs'
                          : 'flex items-center justify-center text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold text-xs w-8.5 h-8.5 focus:outline-none cursor-pointer transition-colors'
                      }
                    >
                      {num}
                    </button>
                  </li>
                );
              })}

              {/* Next Button */}
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0 || isTableLoading}
                  className={`flex items-center justify-center text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold rounded-r-xl text-xs px-3 h-8.5 focus:outline-none cursor-pointer transition-colors ${
                    currentPage === totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </li>
            </ul>

            {/* Per-Page Selector Form */}
            <form className="w-28" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="countries" className="sr-only">
                Select an option
              </label>
              <select
                id="countries"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="block w-full px-2.5 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs cursor-pointer font-medium"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </form>
          </nav>
        </div>
      </AdminTableCard>

      {/* ── 7. Detailed Booking Dossier Modal ──────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shadow-2xs">
                  <Receipt className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Booking #{selectedBooking.booking_reference}
                    </h3>
                    <AdminStatusBadge status={selectedBooking.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500">Complete trip reservation record &amp; audit profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Route Card */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Pickup Location</span>
                    <span className="text-slate-900 font-medium text-xs">{selectedBooking.pickup_address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Destination Location</span>
                    <span className="text-slate-900 font-medium text-xs">{selectedBooking.destination_address}</span>
                  </div>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-slate-500 block">Passenger Name</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedBooking.passenger_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-slate-500 block">Contact Phone</span>
                  <span className="font-mono font-bold text-amber-800 text-xs">
                    {selectedBooking.passenger_phone || 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-slate-500 block">Vehicle Class</span>
                  <span className="font-bold uppercase text-emerald-800 text-xs">
                    {selectedBooking.vehicle_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-2xs">
                  <span className="text-[10.5px] font-semibold text-slate-500 block">Total Settled Fare</span>
                  <span className="font-bold text-slate-900 font-sans text-sm">
                    {formatCurrency(
                      selectedBooking.final_fare || selectedBooking.estimated_fare,
                      settings.currency
                    )}
                  </span>
                </div>
              </div>

              {/* Timestamp & System IDs */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 font-mono text-[11px] text-slate-600 space-y-1">
                <div>Created At: {formatDateTime(selectedBooking.created_at)}</div>
                <div>Internal UUID: {selectedBooking.id}</div>
                {selectedBooking.assigned_driver_id && (
                  <div>Assigned Driver ID: {selectedBooking.assigned_driver_id}</div>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <Link
                href="/dispatcher/queue"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100/70 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open in Dispatcher Queue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
