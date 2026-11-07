'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Driver } from '@/types';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar,
  Clock,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
  Car,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  createScheduledPickupTimestamp,
  formatDateTime,
  getSaudiCurrentDateString,
  getSaudiCurrentTimeString,
  getSaudiDateFromISO,
  getSaudiTimeFromISO,
} from '@/lib/utils';
import { checkDriverOverlap } from '@/lib/assignment-utils';
import { toast } from 'sonner';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess?: (updatedBookingId: string) => void;
}

const PRESET_REASONS = [
  'Customer flight delayed / rescheduled',
  'Customer requested via WhatsApp',
  'Hotel check-out delay in Makkah/Madinah',
  'Customer requested earlier pickup',
  'Ziyarat itinerary rescheduled by pilgrim',
];

export default function EditScheduleModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: EditScheduleModalProps) {
  const { bookings, drivers, updateBookingSchedule } = useApp();

  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [hasReturn, setHasReturn] = useState<boolean>(false);
  const [returnDate, setReturnDate] = useState<string>('');
  const [returnTime, setReturnTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form state when modal opens or booking changes
  useEffect(() => {
    if (booking && isOpen) {
      const initialDate = booking.scheduled_at
        ? getSaudiDateFromISO(booking.scheduled_at)
        : getSaudiCurrentDateString();
      const initialTime = booking.scheduled_at
        ? getSaudiTimeFromISO(booking.scheduled_at)
        : getSaudiCurrentTimeString(60);

      setDate(initialDate);
      setTime(initialTime);

      const isRoundTrip = Boolean(booking.return_scheduled_at || booking.trip_type === 'round_trip');
      setHasReturn(isRoundTrip);

      if (booking.return_scheduled_at) {
        setReturnDate(getSaudiDateFromISO(booking.return_scheduled_at));
        setReturnTime(getSaudiTimeFromISO(booking.return_scheduled_at));
      } else {
        setReturnDate(initialDate);
        setReturnTime(getSaudiCurrentTimeString(180));
      }

      setReason('');
    }
  }, [booking, isOpen]);

  // Compute calculated new ISO timestamp
  const newScheduledIso = useMemo(() => {
    if (!date) return '';
    return createScheduledPickupTimestamp(date, time || '12:00');
  }, [date, time]);

  const newReturnScheduledIso = useMemo(() => {
    if (!hasReturn || !returnDate) return null;
    return createScheduledPickupTimestamp(returnDate, returnTime || '14:00');
  }, [hasReturn, returnDate, returnTime]);

  // Check driver overlap / conflict if a driver is currently assigned
  const assignedDriver = useMemo(() => {
    if (!booking?.assigned_driver_id) return null;
    return drivers.find((d) => d.id === booking.assigned_driver_id) || null;
  }, [booking?.assigned_driver_id, drivers]);

  const driverOverlapWarning = useMemo(() => {
    if (!booking || !assignedDriver || !newScheduledIso) return null;

    const existingDriverBookings = bookings.filter(
      (b) =>
        b.assigned_driver_id === assignedDriver.id &&
        b.id !== booking.id &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected' &&
        b.status !== 'trip_completed' &&
        b.status !== 'completed'
    );

    const checkResult = checkDriverOverlap(
      existingDriverBookings,
      {
        id: booking.id,
        scheduled_at: newScheduledIso,
        estimated_duration_min: booking.estimated_duration_min || 60,
        booking_reference: booking.booking_reference,
      },
      30
    );

    if (checkResult.hasOverlap && checkResult.conflictingBooking) {
      const driverDisplayName = assignedDriver.full_name || assignedDriver.profile?.full_name || 'Captain';
      return {
        conflictingBooking: checkResult.conflictingBooking,
        message:
          checkResult.message ||
          `Captain ${driverDisplayName} has conflicting ride ${checkResult.conflictingBooking.booking_reference}.`,
      };
    }
    return null;
  }, [booking, assignedDriver, newScheduledIso, bookings]);

  if (!booking) return null;

  const minDate = getSaudiCurrentDateString();
  const driverDisplayName = assignedDriver?.full_name || assignedDriver?.profile?.full_name || 'Captain';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error('Please specify both pickup date and time.');
      return;
    }

    if (hasReturn && returnDate && returnDate < date) {
      toast.error('Return date cannot be earlier than pickup date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateBookingSchedule(
        booking.id,
        newScheduledIso,
        hasReturn ? newReturnScheduledIso : null,
        reason.trim()
      );

      if (success) {
        onSuccess?.(booking.id);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary leading-tight">
              Edit Schedule Date &amp; Time
            </h2>
            <p className="text-[11px] text-muted">
              Adjust journey timing according to customer or flight schedule wishes
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Booking Context Banner */}
        <div className="bg-surface rounded-2xl p-3.5 border border-base space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-base/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-950 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-[11px]">
                {booking.booking_reference}
              </span>
              <span className="font-semibold text-primary">{booking.passenger_name}</span>
            </div>
            <span className="text-[11px] text-muted">{booking.passenger_phone}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-[11px]">
            <div className="flex items-start gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="truncate">
                <span className="text-muted block text-[10px]">Pickup:</span>
                <span className="font-medium text-primary truncate block" title={booking.pickup_address}>
                  {booking.pickup_address}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <div className="truncate">
                <span className="text-muted block text-[10px]">Destination:</span>
                <span className="font-medium text-primary truncate block" title={booking.destination_address}>
                  {booking.destination_address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-base/40 text-[11px]">
            <span className="text-muted">Current Schedule:</span>
            <span className="font-bold text-slate-800">
              {booking.booking_type === 'immediate'
                ? 'Immediate / ASAP'
                : booking.scheduled_at
                ? formatDateTime(booking.scheduled_at)
                : 'Not Set'}
            </span>
          </div>
        </div>

        {/* Primary Schedule Pickers */}
        <div className="bg-card border border-base rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              New Scheduled Pickup (AST - Saudi Time)
            </label>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Asia/Riyadh (UTC+3)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-secondary mb-1">
                Travel Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-secondary mb-1">
                Pickup Time *
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Real-time schedule preview */}
          {newScheduledIso && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Updated Pickup Preview:
              </span>
              <strong className="text-emerald-950 font-bold tabular-nums">
                {formatDateTime(newScheduledIso)}
              </strong>
            </div>
          )}
        </div>

        {/* Optional Return Schedule for Round Trips */}
        <div className="border border-base rounded-2xl p-3.5 bg-card space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-primary flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasReturn}
                onChange={(e) => setHasReturn(e.target.checked)}
                className="rounded border-base text-brand-primary focus:ring-brand-primary"
              />
              <span>Includes Return Journey Schedule</span>
            </label>
            {hasReturn && (
              <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                Round-Trip
              </span>
            )}
          </div>

          {hasReturn && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-200">
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">
                  Return Date
                </label>
                <input
                  type="date"
                  min={date || minDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">
                  Return Time
                </label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Assigned Driver Notification & Overlap Warning */}
        {assignedDriver && (
          <div className="space-y-2">
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="text-[10px] text-amber-800 font-medium block">
                    Assigned Chauffeur
                  </span>
                  <span className="font-bold text-amber-950">{driverDisplayName}</span>
                </div>
              </div>
              <span className="text-[10px] text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded font-semibold">
                Will receive push notification
              </span>
            </div>

            {driverOverlapWarning && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Chauffeur Schedule Conflict Warning</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  {driverOverlapWarning.message}
                </p>
                <span className="text-[10px] text-muted block mt-0.5">
                  You can proceed to reschedule, but consider reassigning a different chauffeur afterwards.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Customer Request Reason / Notes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-primary flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
            Customer Request Notes / Reason for Reschedule
          </label>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                  reason === p
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs'
                    : 'bg-surface text-secondary border-base hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Guest called via WhatsApp; flight Saudia SV-120 delayed by 2 hours..."
            className="w-full bg-surface border border-base rounded-xl p-2.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-base">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-surface border border-base transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !date || !time}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating Schedule...</span>
              </>
            ) : (
              <>
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Save &amp; Update Schedule</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
