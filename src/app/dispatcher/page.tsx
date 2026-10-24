'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Booking, Driver } from '@/types';
import {
  Compass,
  Users,
  Car,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Phone,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { checkDriverOverlap } from '@/lib/assignment-utils';

const FleetRadar = dynamic(() => import('@/components/dispatcher/FleetRadar'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full rounded-3xl bg-surface animate-pulse flex items-center justify-center text-muted text-sm border border-base">
      Initializing Central Real-Time Fleet Radar Telemetry...
    </div>
  ),
});

export default function DispatcherRadarPage() {
  const {
    bookings,
    drivers,
    assignDriver,
    reassignDriver,
    autoAssignDriver,
    updateBookingStatus,
    settings,
    isDataLoading,
  } = useApp();

  const [manualAssignModalBooking, setManualAssignModalBooking] = useState<Booking | null>(null);
  const [isReassignMode, setIsReassignMode] = useState<boolean>(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [radarSelectedDriverId, setRadarSelectedDriverId] = useState<string | null>(null);

  // Bookings awaiting payment verification
  const pendingVerificationBookings = bookings.filter((b) => b.status === 'pending_verification');

  // Bookings verified & confirmed, ready for driver assignment
  const readyForAssignmentBookings = bookings.filter((b) => b.status === 'confirmed');

  // Active in-progress rides
  const activeRides = bookings.filter(
    (b) =>
      b.status === 'driver_assigned' ||
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

  // Available drivers & on-duty fleet drivers (excluding inactive/deactivated drivers)
  const isDriverAccountActive = (d: Driver) => {
    const s = d.profile?.status;
    return s !== 'deactivated' && s !== 'suspended';
  };
  const availableDrivers = drivers.filter((d) => d.status === 'available' && isDriverAccountActive(d));
  const activeFleetDrivers = drivers.filter(
    (d) => d.status !== 'offline' && d.status !== 'unavailable' && isDriverAccountActive(d)
  );

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAssignModalBooking || !selectedDriverId) return;

    if (isReassignMode) {
      await reassignDriver(manualAssignModalBooking.id, selectedDriverId);
    } else {
      await assignDriver(manualAssignModalBooking.id, selectedDriverId);
    }

    setManualAssignModalBooking(null);
    setSelectedDriverId('');
    setIsReassignMode(false);
  };

  const handleAutoDispatch = async (bookingId: string) => {
    const success = await autoAssignDriver(bookingId);
    if (success) {
      toast.success('Automatic AI Dispatch: Nearest suitable driver matched & assigned!');
    } else {
      toast.error('No suitable available driver found for auto-matching.');
    }
  };

  if (isDataLoading) {
    return (
      <div className="page-shell space-y-6 animate-pulse">
        <div className="bg-card border border-base p-6 rounded-3xl shadow-xl h-24" />
        <div className="bg-card border border-base p-4 rounded-3xl shadow-2xl h-[450px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-card border border-base rounded-3xl p-6 shadow-xl h-64" />
          <div className="lg:col-span-6 bg-card border border-base rounded-3xl p-6 shadow-xl h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      {/* Dispatch Header */}
      <div className="bg-card border border-base p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Operations Control</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h2 className="type-page-title mt-1">Live Fleet Dispatch Radar</h2>
          <p className="text-xs text-secondary">
            Real-time telemetry across Makkah, Madinah, and King Abdulaziz Airport corridors.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-base text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-secondary font-medium">{availableDrivers.length} Drivers Available</span>
          </div>
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-base text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span className="text-secondary font-medium">{readyForAssignmentBookings.length} Ready for Driver</span>
          </div>
        </div>
      </div>

      {/* Pending Payment Verification Banner Alert */}
      {pendingVerificationBookings.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-950">
                {pendingVerificationBookings.length} Booking{pendingVerificationBookings.length > 1 ? 's' : ''} Pending Payment Verification
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                Payment receipts submitted by customers require staff audit before chauffeur assignment.
              </p>
            </div>
          </div>
          <Link
            href="/dispatcher/queue"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow self-end sm:self-auto shrink-0"
          >
            Review &amp; Verify in Queue &rarr;
          </Link>
        </div>
      )}

      {/* Central Real-Time Fleet Radar */}
      <FleetRadar
        drivers={drivers}
        bookings={bookings}
        selectedDriverId={radarSelectedDriverId}
        onSelectDriver={(id) => setRadarSelectedDriverId(id)}
        onAssignBooking={(driverId) => {
          if (readyForAssignmentBookings.length > 0) {
            setManualAssignModalBooking(readyForAssignmentBookings[0]);
            setIsReassignMode(false);
            setSelectedDriverId(driverId);
          } else {
            toast.info('No unassigned confirmed bookings available for assignment at this moment.');
          }
        }}
        className="h-[520px] w-full"
      />

      {/* Two Columns: Ready for Driver Assignment & Active Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Confirmed Bookings Ready for Chauffeur Assignment */}
        <div className="lg:col-span-6 bg-card border border-base rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
              <h3 className="type-card-title">Ready For Chauffeur ({readyForAssignmentBookings.length})</h3>
            </div>
            <span className="text-xs text-muted">Payment Verified</span>
          </div>

          {readyForAssignmentBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p>No confirmed bookings awaiting driver assignment.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {readyForAssignmentBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-surface border border-base p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-950">{b.booking_reference}</span>
                    <span className="text-xs text-emerald-800 font-extrabold">
                      {formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-secondary">
                    <p><strong>Passenger:</strong> {b.passenger_name} ({b.passenger_phone})</p>
                    <p className="line-clamp-1"><strong>From:</strong> {b.pickup_address}</p>
                    <p className="line-clamp-1"><strong>To:</strong> {b.destination_address}</p>
                    <p className="text-[11px] text-muted">
                      Vehicle Required: <strong className="text-amber-950 font-extrabold uppercase">{b.vehicle_type?.replace('_', ' ')}</strong> &bull; {b.passenger_count} Pax
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-base">
                    <button
                      onClick={() => handleAutoDispatch(b.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" /> Auto-Dispatch
                    </button>
                    <button
                      onClick={() => {
                        setManualAssignModalBooking(b);
                        setIsReassignMode(false);
                        setSelectedDriverId(activeFleetDrivers[0]?.id || '');
                      }}
                      className="py-2 px-3 rounded-xl bg-card hover:bg-elevated text-secondary text-xs font-semibold border border-base transition-colors"
                    >
                      Manual Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Dispatched Missions */}
        <div className="lg:col-span-6 bg-card border border-base rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="type-card-title">Active Missions ({activeRides.length})</h3>
            </div>
            <span className="text-xs text-muted">Live In-Transit</span>
          </div>

          {activeRides.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No rides currently active in transit.
            </div>
          ) : (
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {activeRides.map((r) => {
                const driver = drivers.find((d) => d.id === r.assigned_driver_id) || r.driver;
                return (
                  <div
                    key={r.id}
                    className="bg-surface border border-base p-4 rounded-2xl space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-950">{r.booking_reference}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] uppercase font-extrabold">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-secondary">
                      <div>
                        <span className="text-[10px] text-muted block uppercase">Chauffeur</span>
                        <span className="font-bold text-primary">
                          {driver?.profile?.full_name || driver?.full_name || 'Captain Assigned'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted block uppercase">Vehicle</span>
                        <span className="font-mono font-bold text-amber-950">
                          {driver?.vehicle?.plate_number || driver?.assigned_vehicle?.plate_number || 'VIP KSA'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-muted text-[11px] pt-1 border-t border-base">
                      <p className="line-clamp-1">&bull; {r.pickup_address} &rarr; {r.destination_address}</p>
                    </div>

                    {/* Reassign option */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-base">
                      <button
                        onClick={() => {
                          setManualAssignModalBooking(r);
                          setIsReassignMode(true);
                          setSelectedDriverId(activeFleetDrivers[0]?.id || '');
                        }}
                        className="text-[11px] text-amber-900 font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reassign Chauffeur
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Driver Assignment & Reassignment Modal */}
      {manualAssignModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualAssign}
            className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-primary">
              {isReassignMode ? 'Reassign VIP Chauffeur' : 'Manual Chauffeur Assignment'}
            </h3>
            <p className="text-xs text-secondary">
              Assign a certified chauffeur to trip <strong>#{manualAssignModalBooking.booking_reference}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-secondary font-semibold">
                Select Fleet Chauffeur ({activeFleetDrivers.length} on duty)
              </label>
              {activeFleetDrivers.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium">
                  No drivers currently on duty in the fleet pool.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeFleetDrivers.map((d) => {
                    const conflict = manualAssignModalBooking
                      ? checkDriverOverlap(
                          bookings.filter((bk) => bk.assigned_driver_id === d.id),
                          manualAssignModalBooking
                        )
                      : { hasOverlap: false };
                    const isSelected = selectedDriverId === d.id;

                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDriverId(d.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? conflict.hasOverlap
                              ? 'bg-rose-50 border-rose-500 text-rose-950 font-semibold'
                              : 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : conflict.hasOverlap
                            ? 'bg-surface/50 border-rose-300 text-rose-800 hover:border-rose-500'
                            : 'bg-surface border-base text-secondary hover:border-emerald-500/50'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-primary flex items-center gap-1.5">
                            {conflict.hasOverlap && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            {d.profile?.full_name || d.full_name || 'Captain'}
                          </p>
                          <p className="text-[10px] text-muted">
                            {d.vehicle?.make || d.assigned_vehicle?.make || 'Fleet'} {d.vehicle?.model || d.assigned_vehicle?.model || 'Car'} (
                            {d.vehicle?.plate_number || d.assigned_vehicle?.plate_number || 'VIP'})
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            conflict.hasOverlap
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {conflict.hasOverlap ? 'Conflict' : d.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conflict warning banner */}
              {(() => {
                if (!manualAssignModalBooking || !selectedDriverId) return null;
                const conflict = checkDriverOverlap(
                  bookings.filter((bk) => bk.assigned_driver_id === selectedDriverId),
                  manualAssignModalBooking
                );
                if (!conflict.hasOverlap) return null;
                return (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1 font-medium">
                    <p className="font-bold flex items-center gap-1 text-rose-950">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Schedule Collision Detected
                    </p>
                    <p>{conflict.message}</p>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setManualAssignModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !selectedDriverId ||
                  activeFleetDrivers.length === 0 ||
                  Boolean(
                    manualAssignModalBooking &&
                      selectedDriverId &&
                      checkDriverOverlap(
                        bookings.filter((bk) => bk.assigned_driver_id === selectedDriverId),
                        manualAssignModalBooking
                      ).hasOverlap
                  )
                }
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isReassignMode ? 'Confirm Reassignment' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
