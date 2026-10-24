'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Booking } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Car,
  Users,
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(0);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);

  // ── Executive Metrics (Derived from global state) ─────────────────────────
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const activeTrips = bookings.filter(
    (b) =>
      b.status === 'driver_assigned' ||
      b.status === 'driver_accepted' ||
      b.status === 'driver_arriving' ||
      b.status === 'driver_arrived' ||
      b.status === 'trip_started' ||
      b.status === 'ride_started'
  ).length;
  const completedTrips = bookings.filter(
    (b) =>
      b.status === 'trip_completed' ||
      b.status === 'ride_completed' ||
      b.status === 'payment_completed'
  ).length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

  const totalCustomers = usersList.filter((u) => u.role === 'customer').length;
  const totalStaff = usersList.filter((u) => u.role === 'dispatcher').length;
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter((d) => d.status === 'available').length;

  const totalRevenue = bookings
    .filter(
      (b) =>
        b.status === 'trip_completed' ||
        b.status === 'ride_completed' ||
        b.status === 'payment_completed'
    )
    .reduce((sum, b) => sum + (b.final_fare || b.estimated_fare || 0), 0);

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
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          title="Refresh headquarters data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Sync Data</span>
        </button>

        <Link
          href="/admin/users"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>Manage Users</span>
        </Link>

        <Link
          href="/admin/reviews"
          className="px-4 py-2.5 rounded-xl bg-card hover:bg-elevated border border-base text-primary font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Reviews &amp; Ratings ({ratings.length})</span>
        </Link>
      </AdminPageHeader>

      {/* ── 2. Primary 4 High-Level Summary Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Revenue */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs hover:border-emerald-500/40 hover:shadow-sm transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Gross Pilgrimage Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/25">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight">
            {formatCurrency(totalRevenue, settings.currency)}
          </div>
          <p className="text-[11.5px] text-muted">
            Settled journey fares including 15% KSA VAT &amp; airport tolls.
          </p>
          <div className="pt-1">
            <Link
              href="/admin/reports"
              className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Inspect Financial Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Chauffeur Fleet Readiness */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs hover:border-amber-500/40 hover:shadow-sm transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Chauffeur Fleet</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/25">
              <Car className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight">
            {availableDrivers} / {totalDrivers} Ready
          </div>
          <p className="text-[11.5px] text-muted">
            Licensed chauffeurs available for dispatch in Makkah, Madinah &amp; Jeddah.
          </p>
          <div className="pt-1">
            <Link
              href="/admin/users"
              className="text-xs font-bold text-amber-600 hover:underline inline-flex items-center gap-1"
            >
              <span>View Captain Roster</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Reservations Volume */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs hover:border-sky-500/40 hover:shadow-sm transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Reservations</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center border border-sky-500/25">
              <Receipt className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight">
            {totalBookings} Total
          </div>
          <p className="text-[11.5px] text-muted">
            {activeTrips} active trips en route &bull; {completedTrips} safely arrived.
          </p>
          <div className="pt-1">
            <Link
              href="/dispatcher/queue"
              className="text-xs font-bold text-sky-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Open Live Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Verified Pilgrims & Dispatch Staff */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs hover:border-purple-500/40 hover:shadow-sm transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Registered Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/25">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight">
            {totalCustomers + totalStaff} Users
          </div>
          <p className="text-[11.5px] text-muted">
            {totalCustomers} verified pilgrims &bull; {totalStaff} control room dispatchers.
          </p>
          <div className="pt-1">
            <Link
              href="/admin/users"
              className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Manage User Access</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Operational Quick Filter Status Strip ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Pending Card */}
        <button
          onClick={() => handleFilterChange('pending')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-100 border-amber-500 shadow-sm'
              : 'bg-card border-base hover:bg-slate-50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-950 font-extrabold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending
            </span>
            <span className="font-mono text-sm">{pendingBookings}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">Awaiting confirmation</p>
        </button>

        {/* Confirmed Card */}
        <button
          onClick={() => handleFilterChange('confirmed')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'confirmed'
              ? 'bg-sky-100 border-sky-500 shadow-sm'
              : 'bg-card border-base hover:bg-slate-50 hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-950 font-extrabold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" /> Confirmed
            </span>
            <span className="font-mono text-sm">{confirmedBookings}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">Ready for match</p>
        </button>

        {/* Active Trips Card */}
        <button
          onClick={() => handleFilterChange('active_trips')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'active_trips'
              ? 'bg-purple-100 border-purple-500 shadow-sm'
              : 'bg-card border-base hover:bg-slate-50 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-950 font-extrabold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-700" /> Active En Route
            </span>
            <span className="font-mono text-sm">{activeTrips}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">On Saudi highways</p>
        </button>

        {/* Completed Card */}
        <button
          onClick={() => handleFilterChange('completed')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-100 border-emerald-500 shadow-sm'
              : 'bg-card border-base hover:bg-slate-50 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-950 font-extrabold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Completed
            </span>
            <span className="font-mono text-sm">{completedTrips}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">Safely concluded</p>
        </button>

        {/* Cancelled Card */}
        <button
          onClick={() => handleFilterChange('cancelled')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'cancelled'
              ? 'bg-rose-100 border-rose-500 shadow-sm'
              : 'bg-card border-base hover:bg-slate-50 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-950 font-extrabold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-700" /> Cancelled
            </span>
            <span className="font-mono text-sm">{cancelledBookings}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">Discontinued</p>
        </button>
      </div>

      {/* ── 4. Operational Breakdown: Fleet Utilization & Sacred Corridors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vehicle Class Utilization Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-primary flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-500" />
                <span>Vehicle Fleet Distribution</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Active booking distribution across MOT licensed vehicle categories.
              </p>
            </div>
            <Link
              href="/admin/rates"
              className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Rates</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {Object.entries(vehicleStats).map(([key, item]) => {
              const pct = totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0;
              return (
                <div key={key} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-secondary">{item.name}</span>
                    <span className="font-mono font-bold text-primary">
                      {item.count} trips ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-base overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sacred Journey Hubs Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-primary flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-500" />
                <span>Primary Sacred Transfer Corridors</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                High-volume corridors serving Umrah pilgrims and international delegations.
              </p>
            </div>
            <Link
              href="/dispatcher/radar"
              className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Fleet Radar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-surface/50 border border-base flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                  <Plane className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-primary">Jeddah Airport (JED) &rarr; Makkah Haram</div>
                  <div className="text-[10.5px] text-muted">98 km express highway transfer</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                High Priority
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface/50 border border-base flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-primary">Makkah Al-Mukarramah &rarr; Madinah Al-Munawwarah</div>
                  <div className="text-[10.5px] text-muted">442 km intercity VIP pilgrimage</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Intercity
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface/50 border border-base flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-primary">Holy Sites Ziyarat (Mina, Arafat, Taif)</div>
                  <div className="text-[10.5px] text-muted">Multi-point historical sacred tours</div>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
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
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, passenger, route..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-input border border-default-medium rounded-xl pl-10 pr-8 py-2 text-xs text-heading placeholder:text-body focus:outline-none focus:border-brand"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-xs rounded-xl focus:ring-brand focus:border-brand shadow-xs"
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
          <table className="w-full text-left text-xs text-secondary">
            <thead className="bg-surface/80 text-muted uppercase font-bold text-[10.5px] tracking-wider border-b border-base">
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
            <tbody className="divide-y divide-base">
              {isTableLoading ? (
                <TableSkeletonRows cols={7} rows={pageSize > 10 ? 10 : pageSize} />
              ) : paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="w-8 h-8 text-muted/50" />
                      <p className="text-sm font-semibold text-primary">No bookings found</p>
                      <p className="text-xs text-muted">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try clearing search filters to see all reservations.'
                          : 'No reservations have been recorded in the system yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-elevated/50 transition-colors group">
                    {/* Reference */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-extrabold text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
                        {b.booking_reference}
                      </span>
                    </td>

                    {/* Passenger */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary">{b.passenger_name}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted" />
                        <span>{b.passenger_phone || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div
                        className="flex items-center gap-1.5 text-primary font-medium truncate"
                        title={b.pickup_address}
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="truncate">{b.pickup_address}</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-muted truncate text-[11px] mt-0.5"
                        title={b.destination_address}
                      >
                        <span className="text-amber-500 shrink-0">&rarr;</span>
                        <span className="truncate">{b.destination_address}</span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold uppercase text-[11px] text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                        <Car className="w-3 h-3 text-emerald-500" />
                        {b.vehicle_type?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <AdminStatusBadge status={b.status} />
                    </td>

                    {/* Fare */}
                    <td className="py-3.5 px-4 text-right font-extrabold tabular-nums text-primary font-sans text-sm">
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

        {/* ── 6. Pagination Navigation (Matches User Code Specification) ─────── */}
        <div className="p-4 border-t border-base bg-surface/30 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Record Counter */}
          <div className="text-xs text-muted">
            Showing <span className="font-bold text-heading">{startRecord}</span>–
            <span className="font-bold text-heading">{endRecord}</span> of{' '}
            <span className="font-bold text-heading">{totalFilteredCount}</span> bookings
          </div>

          {/* Navigation Controls */}
          <nav aria-label="Page navigation example" className="flex items-center space-x-4">
            <ul className="flex -space-x-px text-sm">
              {/* Previous Button */}
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isTableLoading}
                  className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-s-base text-sm px-3 h-9 focus:outline-none cursor-pointer ${
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
                          ? 'flex items-center justify-center text-fg-brand bg-neutral-tertiary-medium box-border border border-default-medium hover:text-fg-brand font-medium text-sm w-9 h-9 focus:outline-none cursor-pointer font-bold'
                          : 'flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 text-sm w-9 h-9 focus:outline-none cursor-pointer'
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
                  className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-e-base text-sm px-3 h-9 focus:outline-none cursor-pointer ${
                    currentPage === totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </li>
            </ul>

            {/* Per-Page Selector Form matching User Code */}
            <form className="w-32 mx-auto" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="countries" className="sr-only">
                Select an option
              </label>
              <select
                id="countries"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm leading-4 rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body cursor-pointer"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </form>
          </nav>
        </div>
      </AdminTableCard>

      {/* ── 7. Detailed Booking Dossier Modal ──────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="type-card-title text-base font-bold text-primary">
                      Booking #{selectedBooking.booking_reference}
                    </h3>
                    <AdminStatusBadge status={selectedBooking.status} size="sm" />
                  </div>
                  <p className="text-xs text-muted">Complete trip reservation record &amp; audit profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-muted hover:text-primary transition-colors p-1 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Route Card */}
              <div className="p-4 rounded-2xl bg-surface border border-base space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted block">Pickup Location</span>
                    <span className="text-primary font-medium text-xs">{selectedBooking.pickup_address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-base/60">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted block">Destination Location</span>
                    <span className="text-primary font-medium text-xs">{selectedBooking.destination_address}</span>
                  </div>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-card border border-base space-y-1">
                  <span className="text-[10.5px] font-semibold text-muted block">Passenger Name</span>
                  <span className="font-bold text-primary text-xs">{selectedBooking.passenger_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-base space-y-1">
                  <span className="text-[10.5px] font-semibold text-muted block">Contact Phone</span>
                  <span className="font-mono font-bold text-amber-700 text-xs">
                    {selectedBooking.passenger_phone || 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-base space-y-1">
                  <span className="text-[10.5px] font-semibold text-muted block">Vehicle Class</span>
                  <span className="font-bold uppercase text-emerald-800 text-xs">
                    {selectedBooking.vehicle_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-base space-y-1">
                  <span className="text-[10.5px] font-semibold text-muted block">Total Settled Fare</span>
                  <span className="font-bold text-primary font-sans text-sm">
                    {formatCurrency(
                      selectedBooking.final_fare || selectedBooking.estimated_fare,
                      settings.currency
                    )}
                  </span>
                </div>
              </div>

              {/* Timestamp & System IDs */}
              <div className="p-3 rounded-xl bg-surface/50 border border-base font-mono text-[11px] text-muted space-y-1">
                <div>Created At: {formatDateTime(selectedBooking.created_at)}</div>
                <div>Internal UUID: {selectedBooking.id}</div>
                {selectedBooking.assigned_driver_id && (
                  <div>Assigned Driver ID: {selectedBooking.assigned_driver_id}</div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-base">
              <Link
                href="/dispatcher/queue"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
              >
                <span>Open in Dispatcher Queue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-elevated border border-base text-primary cursor-pointer transition-colors"
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
