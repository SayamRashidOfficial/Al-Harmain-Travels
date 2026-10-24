'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Booking, Driver, BookingStatus } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CalendarCheck,
  Search,
  X,
  RefreshCw,
  Eye,
  ChevronDown,
  MapPin,
  User,
  Phone,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  ArrowUpDown,
  Filter,
  UserCheck,
  Receipt,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
  AdminTableCard,
  AdminPagination,
} from '@/components/admin/AdminUIComponents';
import { TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

// Status groups for filter buttons
const STATUS_FILTERS = [
  { value: 'all', label: 'All Bookings' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active_trips', label: 'Active Trips' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'fare_high', label: 'Fare: High to Low' },
  { value: 'fare_low', label: 'Fare: Low to High' },
];

function BookingDetailModal({
  booking,
  drivers,
  onClose,
  onAssignDriver,
  onCancelBooking,
  settings,
}: {
  booking: Booking;
  drivers: Driver[];
  onClose: () => void;
  onAssignDriver: (bookingId: string, driverId: string) => Promise<void>;
  onCancelBooking: (bookingId: string, reason: string) => Promise<void>;
  settings: { currency: string };
}) {
  const [selectedDriverId, setSelectedDriverId] = useState(booking.assigned_driver_id || '');
  const [cancelReason, setCancelReason] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);

  const canAssign =
    booking.status === 'pending' ||
    booking.status === 'confirmed' ||
    booking.status === 'searching';
  const canCancel =
    booking.status !== 'cancelled' &&
    booking.status !== 'trip_completed' &&
    booking.status !== 'ride_completed' &&
    booking.status !== 'payment_completed';

  const availableDrivers = drivers.filter(
    (d) => d.status === 'available' || d.id === booking.assigned_driver_id
  );

  const handleAssign = async () => {
    if (!selectedDriverId) return;
    setIsAssigning(true);
    try {
      await onAssignDriver(booking.id, selectedDriverId);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.');
      return;
    }
    setIsCancelling(true);
    try {
      await onCancelBooking(booking.id, cancelReason);
      onClose();
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-mono">
                {booking.booking_reference}
              </span>
              <AdminStatusBadge status={booking.status} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Booking Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Passenger Info */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Passenger Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Full Name</span>
                <p className="text-sm font-semibold text-slate-900">{booking.passenger_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Phone</span>
                <p className="text-sm font-semibold text-slate-900">{booking.passenger_phone}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Passengers</span>
                <p className="text-sm font-semibold text-slate-900">{booking.passenger_count}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Vehicle Type</span>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {booking.vehicle_type?.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </section>

          {/* Route Info */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Route Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Pickup</span>
                  <p className="text-xs text-slate-900 font-medium">{booking.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Destination</span>
                  <p className="text-xs text-slate-900 font-medium">{booking.destination_address}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Distance</span>
                <p className="text-sm font-bold text-slate-900">{booking.estimated_distance_km?.toFixed(1) || '—'} km</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Duration</span>
                <p className="text-sm font-bold text-slate-900">{booking.estimated_duration_min || '—'} min</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Booked At</span>
                <p className="text-xs font-semibold text-slate-900">{formatDateTime(booking.created_at)}</p>
              </div>
            </div>
          </section>

          {/* Payment Info */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Payment Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Payment Method</span>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {booking.payment_method || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Payment Status</span>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {booking.payment_status || 'pending'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Estimated Fare</span>
                <p className="text-sm font-bold text-emerald-700">
                  {formatCurrency(booking.estimated_fare, settings.currency)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Final Fare</span>
                <p className="text-sm font-bold text-slate-900">
                  {booking.final_fare
                    ? formatCurrency(booking.final_fare, settings.currency)
                    : '—'}
                </p>
              </div>
            </div>
            {booking.payment_screenshot_url && (
              <div className="mt-2">
                <span className="text-[10px] text-slate-400 font-medium block mb-1">Payment Screenshot</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={booking.payment_screenshot_url}
                  alt="Payment proof"
                  className="max-h-40 rounded-lg border border-slate-200 object-contain"
                />
              </div>
            )}
          </section>

          {/* Driver Assignment */}
          {canAssign && (
            <section className="bg-sky-50 rounded-xl p-4 border border-sky-200 space-y-3">
              <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Driver Assignment
              </h3>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">— Select Available Driver —</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.profile?.full_name || d.full_name || 'Driver'} —{' '}
                      {d.status} — {d.total_rides} trips
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedDriverId || isAssigning}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Assign
                </button>
              </div>
            </section>
          )}

          {/* Driver Info (if assigned) */}
          {booking.driver && (
            <section className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 space-y-2">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                Assigned Driver
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700">
                  {(booking.driver.profile?.full_name || booking.driver.full_name || 'D')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {booking.driver.profile?.full_name || booking.driver.full_name || 'Driver'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {booking.driver.profile?.phone || booking.driver.phone || 'No phone'} •{' '}
                    {booking.driver.total_rides} trips • {booking.driver.rating?.toFixed(1) || 'N/A'}★
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Notes */}
          {(booking.notes || booking.dispatcher_notes) && (
            <section className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-2">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Notes
              </h3>
              {booking.notes && (
                <p className="text-xs text-slate-700"><strong>Passenger:</strong> {booking.notes}</p>
              )}
              {booking.dispatcher_notes && (
                <p className="text-xs text-slate-700"><strong>Dispatcher:</strong> {booking.dispatcher_notes}</p>
              )}
            </section>
          )}

          {/* Cancellation */}
          {booking.cancellation_reason && (
            <section className="bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-2">
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Cancellation
              </h3>
              <p className="text-xs text-slate-700">{booking.cancellation_reason}</p>
            </section>
          )}

          {/* Cancel Booking Action */}
          {canCancel && (
            <div className="border-t border-slate-200 pt-4">
              {!showCancelForm ? (
                <button
                  onClick={() => setShowCancelForm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel This Booking
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-rose-700">Cancellation Reason</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter cancellation reason..."
                    rows={3}
                    className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-400 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm Cancel
                    </button>
                    <button
                      onClick={() => setShowCancelForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const { bookings, drivers, settings, refreshData } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'fare_high' | 'fare_low'>('newest');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // KPI metrics
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
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
  const totalRevenue = bookings
    .filter(
      (b) =>
        b.status === 'trip_completed' ||
        b.status === 'ride_completed' ||
        b.status === 'payment_completed'
    )
    .reduce((sum, b) => sum + (b.final_fare || b.estimated_fare || 0), 0);

  // Server-side pagination with local fallback
  const fetchBookingsPage = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let query = supabase.from('bookings').select(
        `*, driver:drivers(*, profile:profiles(*)), payments(*)`,
        { count: 'exact' }
      );

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

      if (searchQuery.trim()) {
        const term = `%${searchQuery.trim()}%`;
        query = query.or(
          `booking_reference.ilike.${term},passenger_name.ilike.${term},passenger_phone.ilike.${term},pickup_address.ilike.${term},destination_address.ilike.${term}`
        );
      }

      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      else if (sortBy === 'fare_high') query = query.order('final_fare', { ascending: false });
      else if (sortBy === 'fare_low') query = query.order('final_fare', { ascending: true });
      else query = query.order('created_at', { ascending: false });

      const from = (currentPage - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      setPaginatedBookings((data as Booking[]) || []);
      setTotalFilteredCount(count ?? 0);
    } catch {
      // Fallback to local state
      const filtered = bookings.filter((b) => {
        if (statusFilter !== 'all') {
          const active = ['driver_assigned', 'driver_accepted', 'driver_arriving', 'driver_arrived', 'trip_started', 'ride_started'];
          const done = ['trip_completed', 'ride_completed', 'payment_completed'];
          if (statusFilter === 'active_trips' && !active.includes(b.status)) return false;
          if (statusFilter === 'completed' && !done.includes(b.status)) return false;
          if (!['active_trips', 'completed'].includes(statusFilter) && b.status !== statusFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            b.booking_reference?.toLowerCase().includes(q) ||
            b.passenger_name?.toLowerCase().includes(q) ||
            b.passenger_phone?.includes(q) ||
            b.pickup_address?.toLowerCase().includes(q) ||
            b.destination_address?.toLowerCase().includes(q)
          );
        }
        return true;
      });

      filtered.sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'fare_high') return (b.final_fare || b.estimated_fare || 0) - (a.final_fare || a.estimated_fare || 0);
        if (sortBy === 'fare_low') return (a.final_fare || a.estimated_fare || 0) - (b.final_fare || b.estimated_fare || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTotalFilteredCount(filtered.length);
      const from = (currentPage - 1) * pageSize;
      setPaginatedBookings(filtered.slice(from, from + pageSize));
    } finally {
      setIsTableLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchQuery, sortBy, bookings]);

  useEffect(() => {
    fetchBookingsPage();
  }, [fetchBookingsPage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchBookingsPage()]);
      toast.success('Bookings synchronized.');
    } catch {
      toast.error('Failed to refresh bookings.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleAssignDriver = async (bookingId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          assigned_driver_id: driverId,
          status: 'driver_assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) throw error;
      toast.success('Driver assigned successfully.');
      await fetchBookingsPage();
      if (selectedBooking?.id === bookingId) {
        const updated = paginatedBookings.find((b) => b.id === bookingId);
        if (updated) setSelectedBooking(updated);
      }
    } catch (err) {
      toast.error('Failed to assign driver.');
      console.error(err);
    }
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) throw error;
      toast.success('Booking cancelled.');
      setSelectedBooking(null);
      await fetchBookingsPage();
    } catch (err) {
      toast.error('Failed to cancel booking.');
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Reference', 'Passenger', 'Phone', 'Vehicle', 'Pickup', 'Destination', 'Status', 'Fare (SAR)', 'Created'];
    const rows = paginatedBookings.map((b) => [
      b.booking_reference,
      `"${b.passenger_name}"`,
      b.passenger_phone,
      b.vehicle_type,
      `"${b.pickup_address}"`,
      `"${b.destination_address}"`,
      b.status,
      b.final_fare || b.estimated_fare || 0,
      b.created_at,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported.');
  };

  return (
    <div className="page-shell space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        eyebrow="Operations Management"
        badge="Global Registry"
        title="Bookings Management"
        description="Search, filter, and manage all booking records. Assign drivers, manage cancellations, and track booking lifecycles across all service types."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard
          title="Total Bookings"
          value={totalBookings}
          subtitle="All time"
          icon={<CalendarCheck className="w-4.5 h-4.5" />}
          tone="neutral"
        />
        <AdminStatCard
          title="Pending"
          value={pendingBookings}
          subtitle="Awaiting confirmation"
          icon={<Clock className="w-4.5 h-4.5" />}
          tone="amber"
        />
        <AdminStatCard
          title="Active Trips"
          value={activeTrips}
          subtitle="In progress"
          icon={<Car className="w-4.5 h-4.5" />}
          tone="blue"
        />
        <AdminStatCard
          title="Completed"
          value={completedTrips}
          subtitle="Successfully done"
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          tone="green"
        />
        <AdminStatCard
          title="Cancelled"
          value={cancelledBookings}
          subtitle="Cancelled bookings"
          icon={<XCircle className="w-4.5 h-4.5" />}
          tone="red"
        />
        <AdminStatCard
          title="Revenue"
          value={formatCurrency(totalRevenue, settings.currency)}
          subtitle="From completed trips"
          icon={<Receipt className="w-4.5 h-4.5" />}
          tone="green"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, name, phone..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 pr-8 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <AdminTableCard
        title="Booking Registry"
        subtitle="All booking records with status, driver, and fare information."
        totalCount={totalFilteredCount}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={totalFilteredCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            isLoading={isTableLoading}
            itemLabel="bookings"
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Reference</th>
              <th className="py-3.5 px-4 font-semibold">Passenger</th>
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Route</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Vehicle</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Driver</th>
              <th className="py-3.5 px-4 font-semibold text-right hidden sm:table-cell">Fare</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Created</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isTableLoading ? (
              <TableSkeletonRows rows={10} cols={9} />
            ) : paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16">
                  <EmptyStateView
                    icon={CalendarCheck}
                    title="No Bookings Found"
                    description={
                      searchQuery || statusFilter !== 'all'
                        ? 'No bookings match your search or filter criteria.'
                        : 'No bookings have been recorded yet.'
                    }
                    actionLabel={searchQuery || statusFilter !== 'all' ? 'Clear Filters' : undefined}
                    onAction={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  />
                </td>
              </tr>
            ) : (
              paginatedBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {b.booking_reference}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 truncate max-w-[120px]">
                      {b.passenger_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{b.passenger_phone}</div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="text-slate-600 truncate max-w-[160px] text-[11px]">
                      <span className="text-emerald-600 font-medium">↑</span>{' '}
                      {b.pickup_address?.split(',')[0]}
                    </div>
                    <div className="text-slate-400 truncate max-w-[160px] text-[10px]">
                      <span className="text-rose-500 font-medium">↓</span>{' '}
                      {b.destination_address?.split(',')[0]}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-[11px] font-semibold text-emerald-700 capitalize">
                      {b.vehicle_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <AdminStatusBadge status={b.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {b.driver ? (
                      <div className="text-[11px] text-slate-700 font-medium truncate max-w-[100px]">
                        {b.driver.profile?.full_name || b.driver.full_name || 'Assigned'}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(b.created_at)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View booking details"
                      onClick={() => setSelectedBooking(b)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          drivers={drivers}
          onClose={() => setSelectedBooking(null)}
          onAssignDriver={handleAssignDriver}
          onCancelBooking={handleCancelBooking}
          settings={settings}
        />
      )}
    </div>
  );
}
