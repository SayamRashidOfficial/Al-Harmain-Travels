'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Booking, Driver } from '@/types';
import {
  Compass,
  Car,
  Clock,
  Navigation,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  UserCheck,
  Radio,
  MapPin,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminTableCard,
} from '@/components/admin/AdminUIComponents';
import { EmptyStateView } from '@/components/ui/DataStateSkeletons';

const FleetRadar = dynamic(() => import('@/components/dispatcher/FleetRadar'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full rounded-2xl bg-slate-50 border border-slate-200 animate-pulse flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
      <Radio className="w-8 h-8 text-amber-500 animate-spin" />
      <span>Initializing Central Real-Time Fleet Radar Telemetry...</span>
    </div>
  ),
});

export default function AdminDispatchPage() {
  const {
    bookings,
    drivers,
    assignDriver,
    reassignDriver,
    autoAssignDriver,
    refreshData,
  } = useApp();

  const [manualAssignModalBooking, setManualAssignModalBooking] = useState<Booking | null>(null);
  const [isReassignMode, setIsReassignMode] = useState<boolean>(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [radarSelectedDriverId, setRadarSelectedDriverId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status groupings
  const pendingVerificationBookings = bookings.filter((b) => b.status === 'pending_verification');
  const readyForAssignmentBookings = bookings.filter((b) => b.status === 'confirmed');
  const activeRides = bookings.filter(
    (b) =>
      b.status === 'driver_assigned' ||
      b.status === 'driver_accepted' ||
      b.status === 'on_the_way' ||
      b.status === 'driver_arriving' ||
      b.status === 'arrived' ||
      b.status === 'driver_arrived' ||
      b.status === 'started' ||
      b.status === 'trip_started' ||
      b.status === 'ride_started'
  );

  const onlineDrivers = drivers.filter((d) => d.status !== 'offline');
  const availableDrivers = drivers.filter((d) => d.status === 'available');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Dispatch & Fleet data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAutoAssign = async (bookingId: string) => {
    try {
      const ok = await autoAssignDriver(bookingId);
      if (ok) {
        toast.success(`Chauffeur assigned successfully.`);
      } else {
        toast.error('Failed to auto-assign chauffeur.');
      }
    } catch {
      toast.error('An unexpected error occurred during auto-assignment.');
    }
  };

  const handleManualAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAssignModalBooking || !selectedDriverId) {
      toast.error('Please select a driver to assign.');
      return;
    }

    try {
      let ok: boolean;
      if (isReassignMode) {
        ok = await reassignDriver(manualAssignModalBooking.id, selectedDriverId);
      } else {
        ok = await assignDriver(manualAssignModalBooking.id, selectedDriverId);
      }

      if (ok) {
        toast.success(`Chauffeur assigned successfully.`);
        setManualAssignModalBooking(null);
        setSelectedDriverId('');
        setIsReassignMode(false);
      } else {
        toast.error('Failed to assign chauffeur.');
      }
    } catch {
      toast.error('Assignment failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Live Dispatch & Fleet Command"
        description="Monitor real-time chauffeur telemetry, manage assignment queues, and dispatch VIP Umrah & City transfers."
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dispatcher"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Open Dispatcher Desk
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Radar
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard
          title="Active Chauffeurs"
          value={onlineDrivers.length}
          subtitle={`${availableDrivers.length} available for dispatch`}
          icon={<Car className="w-5 h-5 text-emerald-600" />}
          tone="green"
        />
        <AdminStatCard
          title="Ready For Dispatch"
          value={readyForAssignmentBookings.length}
          subtitle="Confirmed bookings pending driver"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          tone="amber"
        />
        <AdminStatCard
          title="Active Missions"
          value={activeRides.length}
          subtitle="En-route or in-transit"
          icon={<Navigation className="w-5 h-5 text-blue-600" />}
          tone="blue"
        />
        <AdminStatCard
          title="Pending Verification"
          value={pendingVerificationBookings.length}
          subtitle="Payments awaiting review"
          icon={<AlertCircle className="w-5 h-5 text-purple-600" />}
          tone="purple"
        />
      </div>

      {/* Real-time Fleet Radar Map */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="font-semibold text-slate-900 text-sm">Live GPS Telemetry & Chauffeur Radar</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {drivers.filter((d) => d.status !== 'offline').length} vehicles transmitting coordinates
          </span>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-100">
          <FleetRadar
            drivers={drivers}
            bookings={bookings}
            selectedDriverId={radarSelectedDriverId}
            onSelectDriver={(id) => setRadarSelectedDriverId(id)}
          />
        </div>
      </div>

      {/* Ready for Assignment Queue */}
      <AdminTableCard
        title="Unassigned Dispatch Queue"
        subtitle="Bookings that are confirmed and ready for automated or manual chauffeur assignment."
        totalCount={readyForAssignmentBookings.length}
      >
        {readyForAssignmentBookings.length === 0 ? (
          <EmptyStateView
            icon={Inbox}
            title="Dispatch Queue Clear"
            description="All confirmed bookings have been assigned to chauffeurs or are currently in transit."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref & Passenger</th>
                  <th className="py-3 px-4">Route & Service</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Fare</th>
                  <th className="py-3 px-4 text-right">Quick Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readyForAssignmentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{booking.booking_reference}</div>
                      <div className="text-slate-500">{booking.passenger_name}</div>
                      <div className="text-[11px] text-slate-400">{booking.passenger_phone}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{booking.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                        <Navigation className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{booking.destination_address}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {formatDateTime(booking.scheduled_at || booking.created_at)}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Vehicle: {booking.vehicle_type || 'Standard'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatCurrency(booking.final_fare || booking.estimated_fare || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAutoAssign(booking.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Auto Dispatch
                        </button>
                        <button
                          onClick={() => {
                            setManualAssignModalBooking(booking);
                            setIsReassignMode(false);
                            setSelectedDriverId('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          <UserCheck className="w-3 h-3 text-slate-500" />
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      {/* Active Missions in Transit */}
      <AdminTableCard
        title="Active Missions & In-Progress Trips"
        subtitle="Real-time status of trips currently undergoing chauffeur pickup, arrival, or active passenger transit."
        totalCount={activeRides.length}
      >
        {activeRides.length === 0 ? (
          <EmptyStateView
            icon={Inbox}
            title="No In-Progress Rides"
            description="There are currently no active passenger journeys in transit."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref & Passenger</th>
                  <th className="py-3 px-4">Assigned Chauffeur</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pickup → Dropoff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRides.map((booking) => {
                  const assignedDriver = drivers.find((d) => d.id === booking.assigned_driver_id);
                  const driverName = assignedDriver?.full_name || assignedDriver?.profile?.full_name || 'Driver Assigned';
                  const driverVehicle = assignedDriver?.vehicle?.model || assignedDriver?.assigned_vehicle?.model || 'Vehicle';

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{booking.booking_reference}</div>
                        <div className="text-slate-500">{booking.passenger_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{driverName}</div>
                        <div className="text-[11px] text-slate-400">
                          {assignedDriver?.phone || 'No phone'} • {driverVehicle}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <AdminStatusBadge status={booking.status} />
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate text-slate-800 font-medium">
                          {booking.pickup_address}
                        </div>
                        <div className="truncate text-slate-500 text-[11px]">
                          → {booking.destination_address}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {assignedDriver && (
                            <button
                              onClick={() => setRadarSelectedDriverId(assignedDriver.id)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Track on Map
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setManualAssignModalBooking(booking);
                              setIsReassignMode(true);
                              setSelectedDriverId(booking.assigned_driver_id || '');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            Reassign
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      {/* Manual Chauffeur Assignment Modal */}
      {manualAssignModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isReassignMode ? 'Reassign Chauffeur' : 'Assign Chauffeur'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booking Ref: {manualAssignModalBooking.booking_reference}
                </p>
              </div>
              <button
                onClick={() => setManualAssignModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Chauffeur
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                >
                  <option value="">-- Choose a Chauffeur --</option>
                  {drivers.map((driver) => {
                    const name = driver.full_name || driver.profile?.full_name || 'Chauffeur';
                    const vehicle = driver.vehicle?.model || driver.assigned_vehicle?.model || 'Vehicle';
                    return (
                      <option key={driver.id} value={driver.id}>
                        {name} ({vehicle}) - {driver.status}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700">Passenger:</span>{' '}
                  {manualAssignModalBooking.passenger_name} ({manualAssignModalBooking.passenger_phone})
                </div>
                <div className="text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">Pickup:</span>{' '}
                  {manualAssignModalBooking.pickup_address}
                </div>
                <div className="text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">Dropoff:</span>{' '}
                  {manualAssignModalBooking.destination_address}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManualAssignModalBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
