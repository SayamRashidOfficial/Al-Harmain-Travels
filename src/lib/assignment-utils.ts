import { Booking, BookingStatus } from '@/types';

/**
 * Extract a reliable timestamp for a booking.
 * Prefers `scheduled_at`; falls back to `created_at` or current time.
 */
export function getBookingPickupTimestamp(booking: Booking | Partial<Booking>): number {
  if (booking.scheduled_at) {
    const t = new Date(booking.scheduled_at).getTime();
    if (!isNaN(t)) return t;
  }
  if (booking.created_at) {
    const t = new Date(booking.created_at).getTime();
    if (!isNaN(t)) return t;
  }
  return Date.now();
}

/**
 * Sort bookings chronologically by scheduled pickup time (ascending).
 */
export function sortAssignmentsChronological<T extends Booking | Partial<Booking>>(bookings: T[]): T[] {
  return [...bookings].sort((a, b) => getBookingPickupTimestamp(a) - getBookingPickupTimestamp(b));
}

/**
 * Check if two dates fall on the same calendar day in local time.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if a date is "Tomorrow" relative to a base date (default today).
 */
export function isTomorrow(date: Date, baseDate: Date = new Date()): boolean {
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Active statuses indicating that a driver is currently in an active mission stage.
 */
export const ACTIVE_MISSION_STATUSES: BookingStatus[] = [
  'accepted',
  'driver_accepted',
  'on_the_way',
  'driver_arriving',
  'arrived',
  'driver_arrived',
  'started',
  'trip_started',
  'ride_started',
];

/**
 * Completed statuses for historical records.
 */
export const COMPLETED_MISSION_STATUSES: BookingStatus[] = [
  'completed',
  'trip_completed',
  'ride_completed',
  'payment_completed',
];

/**
 * Inactive / terminal non-successful statuses.
 */
export const CANCELLED_MISSION_STATUSES: BookingStatus[] = [
  'cancelled',
  'rejected',
  'payment_rejected',
  'no_show',
];

/**
 * Check if a booking is currently considered "active" (driver accepted or in transit).
 */
export function isBookingActive(status: BookingStatus): boolean {
  return ACTIVE_MISSION_STATUSES.includes(status);
}

/**
 * Check if a booking is completed.
 */
export function isBookingCompleted(status: BookingStatus): boolean {
  return COMPLETED_MISSION_STATUSES.includes(status);
}

/**
 * Check if a booking is cancelled or rejected.
 */
export function isBookingCancelled(status: BookingStatus): boolean {
  return CANCELLED_MISSION_STATUSES.includes(status);
}

/**
 * Reliably checks if a booking belongs to a given customer profile.
 * Performs direct user ID match, normalized phone match, or email match.
 */
export function isBookingForCustomer(
  booking: Booking | Partial<Booking>,
  user?: import('@/types').Profile | null
): boolean {
  if (!user || !booking || !user.id || user.id === 'guest') return false;
  // 1. Strict customer_id match
  if (booking.customer_id) {
    return booking.customer_id === user.id;
  }
  // 2. Only for legacy records without customer_id, fallback to matching customer email
  if (user.email && (booking as any)?.customer?.email) {
    return (booking as any).customer.email.trim().toLowerCase() === user.email.trim().toLowerCase();
  }
  return false;
}

/**
 * Standard 6-Stage Assignment Workflow
 * 1. Assigned -> 2. Accepted -> 3. Heading to Pickup -> 4. Arrived at Pickup -> 5. Trip Started -> 6. Trip Completed
 */
export interface WorkflowStepInfo {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  badgeClass: string;
  nextActionLabel: string | null;
  nextStatus: BookingStatus | null;
}

export function getWorkflowStep(status: BookingStatus): WorkflowStepInfo {
  switch (status) {
    case 'driver_assigned':
      return {
        step: 1,
        label: 'Assigned',
        badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        nextActionLabel: 'Accept Assignment',
        nextStatus: 'driver_accepted',
      };
    case 'driver_accepted':
    case 'accepted':
      return {
        step: 2,
        label: 'Accepted',
        badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        nextActionLabel: 'Start Heading to Pickup',
        nextStatus: 'driver_arriving',
      };
    case 'driver_arriving':
    case 'on_the_way':
      return {
        step: 3,
        label: 'Heading to Pickup',
        badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        nextActionLabel: 'Mark Arrived at Pickup',
        nextStatus: 'driver_arrived',
      };
    case 'driver_arrived':
    case 'arrived':
      return {
        step: 4,
        label: 'Arrived at Pickup',
        badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        nextActionLabel: 'Passenger Boarded • Start Trip',
        nextStatus: 'trip_started',
      };
    case 'trip_started':
    case 'started':
    case 'ride_started':
      return {
        step: 5,
        label: 'Trip Started',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        nextActionLabel: 'Complete Trip Successfully',
        nextStatus: 'trip_completed',
      };
    case 'trip_completed':
    case 'completed':
    case 'ride_completed':
    case 'payment_completed':
      return {
        step: 6,
        label: 'Trip Completed',
        badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        nextActionLabel: null,
        nextStatus: null,
      };
    default:
      return {
        step: 1,
        label: 'Assigned',
        badgeClass: 'bg-surface text-muted border-base',
        nextActionLabel: 'Accept Assignment',
        nextStatus: 'driver_accepted',
      };
  }
}

/**
 * Schedule Overlap Detection:
 * Prevent overlapping assignments for the same driver.
 * Buffer accounts for turnaround/travel between trips (default 30 mins).
 */
export function checkDriverOverlap(
  existingDriverBookings: Booking[],
  candidateBooking: {
    id?: string;
    scheduled_at?: string | null;
    created_at?: string;
    estimated_duration_min?: number;
    booking_reference?: string;
  },
  bufferMinutes = 30
): { hasOverlap: boolean; conflictingBooking?: Booking; message?: string } {
  const candidateStart = getBookingPickupTimestamp(candidateBooking);
  const candidateDuration = (candidateBooking.estimated_duration_min && candidateBooking.estimated_duration_min > 0)
    ? candidateBooking.estimated_duration_min
    : 60; // default 60 min if unspecified
  const candidateEnd = candidateStart + (candidateDuration + bufferMinutes) * 60 * 1000;

  for (const b of existingDriverBookings) {
    // Ignore the same booking (when re-assigning/editing)
    if (candidateBooking.id && b.id === candidateBooking.id) continue;
    // Ignore cancelled or completed bookings
    if (isBookingCancelled(b.status) || isBookingCompleted(b.status)) continue;

    const existingStart = getBookingPickupTimestamp(b);
    const existingDuration = (b.estimated_duration_min && b.estimated_duration_min > 0)
      ? b.estimated_duration_min
      : 60;
    const existingEnd = existingStart + (existingDuration + bufferMinutes) * 60 * 1000;

    // Check if the time intervals overlap
    if (Math.max(candidateStart, existingStart) < Math.min(candidateEnd, existingEnd)) {
      const startTimeFormatted = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }).format(new Date(existingStart));

      const endTimeFormatted = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(existingEnd));

      return {
        hasOverlap: true,
        conflictingBooking: b,
        message: `Overlaps with assignment #${b.booking_reference} (${startTimeFormatted} - ${endTimeFormatted} with ${bufferMinutes}m turnaround).`,
      };
    }
  }

  return { hasOverlap: false };
}

export interface CategorizedDriverAssignments {
  today: Booking[];
  tomorrow: Booking[];
  upcoming: Booking[];
  completed: Booking[];
  activeAssignment: Booking | null;
  actionableAssignmentId: string | null;
}

/**
 * Categorize all assignments for a driver:
 * - Sorted chronologically
 * - Grouped into Today, Tomorrow, Upcoming, Completed
 * - Single active assignment identified
 * - Single actionable assignment determined
 */
export function categorizeDriverAssignments(
  driverId: string,
  allBookings: Booking[],
  now: Date = new Date()
): CategorizedDriverAssignments {
  // Filter bookings for this driver
  const driverBookings = allBookings.filter((b) => b.assigned_driver_id === driverId);

  // Separate completed/cancelled vs pending/in-progress
  const completed: Booking[] = [];
  const activeOrUpcoming: Booking[] = [];

  for (const b of driverBookings) {
    if (isBookingCompleted(b.status)) {
      completed.push(b);
    } else if (!isBookingCancelled(b.status)) {
      activeOrUpcoming.push(b);
    }
  }

  // Sort upcoming chronologically ascending
  const sortedUpcoming = sortAssignmentsChronological(activeOrUpcoming);

  // Sort completed descending (most recent first)
  completed.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at).getTime();
    const timeB = new Date(b.updated_at || b.created_at).getTime();
    return timeB - timeA;
  });

  // Find active assignment if any (status in ACTIVE_MISSION_STATUSES)
  const activeAssignment = sortedUpcoming.find((b) => isBookingActive(b.status)) || null;

  // Single actionable assignment rule:
  // If there is an active assignment, ONLY that active assignment is actionable.
  // If no assignment is active, the earliest uncompleted assignment (first in sorted list) is actionable.
  let actionableAssignmentId: string | null = null;
  if (activeAssignment) {
    actionableAssignmentId = activeAssignment.id;
  } else if (sortedUpcoming.length > 0) {
    actionableAssignmentId = sortedUpcoming[0].id;
  }

  // Date partition
  const today: Booking[] = [];
  const tomorrow: Booking[] = [];
  const upcoming: Booking[] = [];

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 60 * 60 * 1000;

  for (const b of sortedUpcoming) {
    const pickupTime = getBookingPickupTimestamp(b);
    if (pickupTime < startOfTomorrow) {
      // Anything today or past due that is still uncompleted belongs in Today
      today.push(b);
    } else if (pickupTime >= startOfTomorrow && pickupTime < startOfDayAfter) {
      tomorrow.push(b);
    } else {
      upcoming.push(b);
    }
  }

  return {
    today,
    tomorrow,
    upcoming,
    completed,
    activeAssignment,
    actionableAssignmentId,
  };
}

/**
 * Determine if a booking is configured for Cash on Pickup collection.
 */
export function isCashBooking(booking?: Booking | Partial<Booking> | null): boolean {
  if (!booking) return false;
  if (booking.payment_method === 'cash') return true;
  if (booking.payment?.method === 'cash') return true;
  if (booking.payment_screenshot_url) return false;
  if (booking.payment_method === 'online' || booking.payment_method === 'card') return false;
  if (booking.payment?.method === 'online' || booking.payment?.method === 'card') return false;
  // Default for Al Harmain bookings without screenshot is cash
  return true;
}

/**
 * Determine if the cash payment has been confirmed/paid.
 */
export function isCashPaid(booking?: Booking | Partial<Booking> | null): boolean {
  if (!booking) return false;
  return (
    booking.payment_status === 'paid' ||
    booking.payment_status === 'confirmed' ||
    booking.payment?.status === 'paid' ||
    booking.payment?.status === 'confirmed' ||
    booking.status === 'payment_completed'
  );
}

