import { Booking, BookingStatus, Driver, RateVehicleType, Vehicle, VehicleType } from '@/types';
import { SAUDI_TIMEZONE } from './utils';

/**
 * Extract a reliable timestamp for a booking.
 * For scheduled rides, prefers `scheduled_at`.
 * For immediate rides or fallback, uses `created_at` or current time.
 */
export function getBookingPickupTimestamp(booking: Booking | Partial<Booking>): number {
  if (booking.booking_type !== 'immediate' && booking.scheduled_at) {
    const t = new Date(booking.scheduled_at).getTime();
    if (!isNaN(t)) return t;
  }
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
 * Returns midnight bounds for Today, Tomorrow, and Day After in Saudi Arabia timezone (Asia/Riyadh).
 * Guarantees that drivers and dispatchers everywhere experience the exact same operational calendar days.
 */
export function getSaudiDayBounds(now: Date = new Date()): {
  startOfToday: number;
  startOfTomorrow: number;
  startOfDayAfter: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SAUDI_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  // Midnight (00:00:00 AST) in UTC milliseconds (AST is UTC+3)
  const midnightTodayUtc = Date.UTC(year, month - 1, day, 0, 0, 0) - 3 * 60 * 60 * 1000;
  const startOfTomorrow = midnightTodayUtc + 24 * 60 * 60 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 60 * 60 * 1000;

  return {
    startOfToday: midnightTodayUtc,
    startOfTomorrow,
    startOfDayAfter,
  };
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
        timeZone: SAUDI_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        hour12: true,
      }).format(new Date(existingStart)).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

      const endTimeFormatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: SAUDI_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(existingEnd)).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

      return {
        hasOverlap: true,
        conflictingBooking: b,
        message: `Overlaps with assignment #${b.booking_reference} (${startTimeFormatted} - ${endTimeFormatted} AST with ${bufferMinutes}m turnaround).`,
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

  // The roster (today, tomorrow, upcoming in Assigned VIP Journeys) should only display
  // rides that are awaiting driver acceptance or locked, NEVER an active/accepted mission.
  // Accepted and active missions appear exclusively in the Active VIP Mission section.
  const rosterAssignments = sortedUpcoming.filter(
    (b) => !isBookingActive(b.status) && b.id !== activeAssignment?.id
  );

  // Single actionable assignment rule:
  // If there is an active assignment, ONLY that active assignment is actionable (no roster trips may be accepted/started).
  // If no assignment is active, the earliest uncompleted assignment in the roster is actionable for acceptance.
  let actionableAssignmentId: string | null = null;
  if (activeAssignment) {
    actionableAssignmentId = null;
  } else if (rosterAssignments.length > 0) {
    actionableAssignmentId = rosterAssignments[0].id;
  }

  // Date partition (only unaccepted / locked assignments belong in the roster tabs)
  const today: Booking[] = [];
  const tomorrow: Booking[] = [];
  const upcoming: Booking[] = [];

  const { startOfTomorrow, startOfDayAfter } = getSaudiDayBounds(now);

  for (const b of rosterAssignments) {
    if (b.booking_type === 'immediate') {
      // Immediate on-demand trips awaiting driver acceptance belong in Today
      today.push(b);
      continue;
    }
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

/**
 * Resolves a normalized canonical category string ('sedan' | 'staria' | 'gmc' | 'hiroof' | string)
 * from any arbitrary vehicle category, type, or make/model name.
 */
export function normalizeVehicleCategory(
  val?: string | null,
  textHint?: string | null
): string {
  const v = (val || '').toLowerCase().trim();
  const text = ((textHint || '') + ' ' + v).toLowerCase();

  // 1. Direct canonical categories
  if (v === 'sedan') return 'sedan';
  if (v === 'staria') return 'staria';
  if (v === 'gmc' || v === 'vip_gmc') return 'gmc';
  if (v === 'hiroof') return 'hiroof';

  // 2. Text heuristics matching known fleet makes/models
  if (
    text.includes('hiroof') ||
    text.includes('hiace') ||
    text.includes('minibus') ||
    text.includes('bus') ||
    text.includes('tourismo') ||
    text.includes('coach')
  ) {
    return 'hiroof';
  }
  if (text.includes('staria') || text.includes('mpv')) {
    return 'staria';
  }
  if (
    text.includes('gmc') ||
    text.includes('yukon') ||
    text.includes('suburban') ||
    text.includes('denali') ||
    text.includes('suv') ||
    text.includes('palisade') ||
    text.includes('tahoe') ||
    text.includes('escalade')
  ) {
    return 'gmc';
  }
  if (
    text.includes('sedan') ||
    text.includes('camry') ||
    text.includes('sonata') ||
    text.includes('accord') ||
    text.includes('lexus es') ||
    text.includes('crown')
  ) {
    return 'sedan';
  }

  // 3. Fallback vehicle_type mappings
  if (v === 'van') return 'staria';
  if (v === 'suv') return 'gmc';
  if (v === 'bus') return 'hiroof';

  return v || 'sedan';
}

export interface ResolvedDriverVehicleInfo {
  id: string;
  name: string;
  category: string;
  vehicle_type: VehicleType;
  plate_number: string;
  make: string;
  model: string;
}

/**
 * Resolves the assigned vehicle details for a driver.
 * Returns null if the driver has NO vehicle assigned.
 */
export function getDriverAssignedVehicle(
  driver: Driver | Partial<Driver> | null | undefined,
  rateVehicles: RateVehicleType[] = [],
  vehicles: Vehicle[] = []
): ResolvedDriverVehicleInfo | null {
  if (!driver) return null;

  // 1. If driver has an assigned_vehicle object
  const av = (driver as any).assigned_vehicle;
  if (av && typeof av === 'object') {
    // Could be RateVehicleType
    if (av.category || av.name) {
      const cat = normalizeVehicleCategory(av.category || av.id, av.name);
      return {
        id: av.id || 'veh-assigned',
        name: av.name || av.category || 'Fleet Vehicle',
        category: cat,
        vehicle_type: (av.vehicle_type || (cat === 'gmc' ? 'vip_gmc' : cat === 'hiroof' ? 'bus' : cat === 'staria' ? 'van' : 'sedan')) as VehicleType,
        plate_number: av.plate_number || av.category?.toUpperCase() || 'VIP',
        make: av.make || av.name || 'Fleet',
        model: av.model || `(${av.seating_capacity || 4} Seats)`,
      };
    }
    // Could be physical Vehicle
    if (av.vehicle_type || av.plate_number || av.make) {
      const cat = normalizeVehicleCategory(av.vehicle_type, `${av.make || ''} ${av.model || ''}`);
      return {
        id: av.id || 'veh-assigned',
        name: `${av.make || 'Fleet'} ${av.model || ''}`.trim(),
        category: cat,
        vehicle_type: av.vehicle_type || 'sedan',
        plate_number: av.plate_number || 'VIP',
        make: av.make || 'Fleet',
        model: av.model || '',
      };
    }
  }

  // 2. If driver has a vehicle object
  const vObj = (driver as any).vehicle;
  if (vObj && typeof vObj === 'object' && (vObj.make || vObj.vehicle_type || vObj.plate_number)) {
    const cat = normalizeVehicleCategory(vObj.vehicle_type, `${vObj.make || ''} ${vObj.model || ''}`);
    return {
      id: vObj.id || 'veh-assigned',
      name: `${vObj.make || 'Fleet'} ${vObj.model || ''}`.trim(),
      category: cat,
      vehicle_type: vObj.vehicle_type || 'sedan',
      plate_number: vObj.plate_number || 'VIP',
      make: vObj.make || 'Fleet',
      model: vObj.model || '',
    };
  }

  // 3. If driver has assigned_vehicle_id
  const assignedId = driver.assigned_vehicle_id;
  if (assignedId && typeof assignedId === 'string' && assignedId.trim() !== '') {
    // Check in rateVehicles
    const rateVeh = rateVehicles.find(
      (rv) => rv.id === assignedId || rv.category === assignedId
    );
    if (rateVeh) {
      const cat = normalizeVehicleCategory(rateVeh.category, rateVeh.name);
      return {
        id: rateVeh.id,
        name: rateVeh.name,
        category: cat,
        vehicle_type: (cat === 'gmc' ? 'vip_gmc' : cat === 'hiroof' ? 'bus' : cat === 'staria' ? 'van' : 'sedan') as VehicleType,
        plate_number: rateVeh.category.toUpperCase(),
        make: rateVeh.name,
        model: `(${rateVeh.seating_capacity} Seats)`,
      };
    }

    // Check in physical vehicles
    const physVeh = vehicles.find((v) => v.id === assignedId);
    if (physVeh) {
      const cat = normalizeVehicleCategory(physVeh.vehicle_type, `${physVeh.make} ${physVeh.model}`);
      return {
        id: physVeh.id,
        name: `${physVeh.make} ${physVeh.model}`.trim(),
        category: cat,
        vehicle_type: physVeh.vehicle_type,
        plate_number: physVeh.plate_number,
        make: physVeh.make,
        model: physVeh.model,
      };
    }

    // Direct category identifier string (e.g. 'sedan', 'staria', 'gmc', 'hiroof')
    const cat = normalizeVehicleCategory(assignedId);
    return {
      id: assignedId,
      name: cat.toUpperCase(),
      category: cat,
      vehicle_type: (cat === 'gmc' ? 'vip_gmc' : cat === 'hiroof' ? 'bus' : cat === 'staria' ? 'van' : 'sedan') as VehicleType,
      plate_number: cat.toUpperCase(),
      make: 'Fleet',
      model: cat.toUpperCase(),
    };
  }

  // Driver has NO assigned vehicle
  return null;
}

/**
 * Returns true only if a driver has a valid assigned vehicle.
 */
export function isDriverAssignedToVehicle(
  driver: Driver | Partial<Driver> | null | undefined,
  rateVehicles: RateVehicleType[] = [],
  vehicles: Vehicle[] = []
): boolean {
  return getDriverAssignedVehicle(driver, rateVehicles, vehicles) !== null;
}

/**
 * Extracts the demanded vehicle category from a customer booking.
 */
export function getBookingDemandedVehicleCategory(
  booking?: Booking | Partial<Booking> | null
): string {
  if (!booking) return 'sedan';

  if (booking.vehicle_category) {
    return normalizeVehicleCategory(booking.vehicle_category);
  }

  if (booking.vehicle_type) {
    const vType = booking.vehicle_type;
    // For van: check if notes or passenger count indicates hiroof/bus
    if (vType === 'van') {
      const notes = `${booking.notes || ''} ${booking.special_instructions || ''}`.toLowerCase();
      if (
        notes.includes('hiroof') ||
        notes.includes('hiace') ||
        (booking.passenger_count && booking.passenger_count > 7)
      ) {
        return 'hiroof';
      }
      return 'staria';
    }
    return normalizeVehicleCategory(vType);
  }

  return 'sedan';
}

/**
 * Checks whether a driver's assigned vehicle matches the customer's demanded vehicle.
 * Strictly returns false if the driver has NO vehicle assigned.
 */
export function doesDriverVehicleMatchBooking(
  driver: Driver | Partial<Driver> | null | undefined,
  booking: Booking | Partial<Booking> | null | undefined,
  rateVehicles: RateVehicleType[] = [],
  vehicles: Vehicle[] = []
): boolean {
  if (!driver || !booking) return false;

  const driverVeh = getDriverAssignedVehicle(driver, rateVehicles, vehicles);
  // Driver without vehicle NEVER matches
  if (!driverVeh) return false;

  const demandedCategory = getBookingDemandedVehicleCategory(booking);

  // 1. Direct canonical category match
  if (driverVeh.category === demandedCategory) return true;

  // 2. Direct booking category / id match
  if (booking.vehicle_category) {
    const rawCat = booking.vehicle_category.toLowerCase();
    if (driverVeh.id.toLowerCase() === rawCat || driverVeh.category.toLowerCase() === rawCat) {
      return true;
    }
  }

  // 3. Compatible vehicle_type match if booking vehicle_type was requested directly
  if (booking.vehicle_type) {
    if (booking.vehicle_type === 'sedan' && driverVeh.category === 'sedan') return true;
    if (
      (booking.vehicle_type === 'vip_gmc' || booking.vehicle_type === 'suv') &&
      driverVeh.category === 'gmc'
    )
      return true;
    if (booking.vehicle_type === 'bus' && driverVeh.category === 'hiroof') return true;
    if (
      booking.vehicle_type === 'van' &&
      (driverVeh.category === 'staria' || driverVeh.category === 'hiroof')
    )
      return true;
  }

  return false;
}

/**
 * Filters the drivers list to only include active drivers who:
 * 1. Are not offline/unavailable and not suspended.
 * 2. Have a vehicle assigned.
 * 3. Whose assigned vehicle matches the booking's demanded vehicle category.
 */
export function getEligibleDriversForBooking(
  booking: Booking | Partial<Booking> | null | undefined,
  drivers: Driver[],
  rateVehicles: RateVehicleType[] = [],
  vehicles: Vehicle[] = []
): Driver[] {
  if (!booking || !Array.isArray(drivers)) return [];

  return drivers.filter((d) => {
    // 1. Availability & account status
    if (d.status === 'offline' || d.status === 'unavailable') return false;
    if (d.profile?.status === 'deactivated' || d.profile?.status === 'suspended') return false;

    // 2. Driver must have vehicle assigned
    if (!isDriverAssignedToVehicle(d, rateVehicles, vehicles)) return false;

    // 3. Driver vehicle must match booking vehicle demand
    return doesDriverVehicleMatchBooking(d, booking, rateVehicles, vehicles);
  });
}

