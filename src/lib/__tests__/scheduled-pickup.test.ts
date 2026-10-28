import { describe, it, expect } from 'vitest';
import {
  SAUDI_TIMEZONE,
  createScheduledPickupTimestamp,
  formatDateTime,
  formatPickupClock,
  formatPickupDate,
  getSaudiCurrentDateString,
  getSaudiCurrentTimeString,
} from '../utils';
import {
  categorizeDriverAssignments,
  getBookingPickupTimestamp,
  checkDriverOverlap,
  getSaudiDayBounds,
} from '../assignment-utils';
import { Booking } from '@/types';

const baseBooking = (overrides: Partial<Booking>): Booking => ({
  id: 'b-1',
  booking_reference: 'AHT-20261028-1001',
  passenger_name: 'Haji Ahmad',
  passenger_phone: '+966500000001',
  pickup_address: 'King Abdulaziz International Airport, Terminal 1, Jeddah',
  destination_address: 'Abraj Al Bait Clock Tower, Makkah',
  pickup_latitude: 21.6826,
  pickup_longitude: 39.1564,
  destination_latitude: 21.4187,
  destination_longitude: 39.8256,
  booking_type: 'scheduled',
  vehicle_type: 'vip_gmc',
  scheduled_at: '2026-10-30T14:30:00+03:00',
  status: 'confirmed',
  payment_method: 'cash',
  payment_status: 'pending',
  estimated_distance_km: 98,
  estimated_duration_min: 75,
  estimated_fare: 450,
  final_fare: 450,
  created_at: '2026-10-28T10:00:00+03:00',
  updated_at: '2026-10-28T10:00:00+03:00',
  passenger_count: 3,
  assigned_driver_id: 'driver-1',
  ...overrides,
});

describe('Scheduled Pickup Time — Standardization & Timezone Consistency', () => {
  it('builds an ISO 8601 timestamp with explicit Saudi Arabia (+03:00) offset', () => {
    const timestamp = createScheduledPickupTimestamp('2026-10-30', '14:30');
    expect(timestamp).toBe('2026-10-30T14:30:00+03:00');
  });

  it('handles 4-character or trimmed times properly in timestamp builder', () => {
    const timestamp = createScheduledPickupTimestamp('2026-11-05', '04:00');
    expect(timestamp).toBe('2026-11-05T04:00:00+03:00');
  });

  it('guarantees identical pickup date and time formatting in Asia/Riyadh across different client environments', () => {
    // 14:30 AST (UTC+3) is 11:30 UTC
    const astTimestamp = '2026-10-30T14:30:00+03:00';
    const utcTimestamp = '2026-10-30T11:30:00.000Z';

    const formattedAST = formatDateTime(astTimestamp);
    const formattedUTC = formatDateTime(utcTimestamp);

    // Both must match exactly: 30 Oct 2026, 02:30 PM
    expect(formattedAST).toBe('30 Oct 2026, 02:30 PM');
    expect(formattedUTC).toBe('30 Oct 2026, 02:30 PM');
    expect(formattedAST).toBe(formattedUTC);
  });

  it('formats morning pickup time with correct uppercase AM indicator', () => {
    const morningTimestamp = '2026-10-30T04:00:00+03:00';
    expect(formatDateTime(morningTimestamp)).toBe('30 Oct 2026, 04:00 AM');
    expect(formatPickupClock(morningTimestamp)).toBe('04:00 AM');
    expect(formatPickupDate(morningTimestamp)).toBe('30 Oct 2026');
  });

  it('returns graceful fallback dashes for null or invalid dates without throwing', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('invalid-date')).toBe('—');
    expect(formatPickupClock(null)).toBe('Immediate');
    expect(formatPickupDate(null)).toBe('—');
  });
});

describe('Scheduled vs Immediate (Book Now) Workflow Differentiation', () => {
  const driverId = 'driver-1';

  it('clearly distinguishes immediate and scheduled bookings in driver assignment partitioning', () => {
    // Immediate ride (no scheduled_at, booking_type = 'immediate')
    const immediateRide = baseBooking({
      id: 'bk-imm',
      booking_reference: 'AHT-IMM-001',
      booking_type: 'immediate',
      scheduled_at: null,
      status: 'driver_assigned',
    });

    // Scheduled ride for tomorrow
    const tomorrowDate = new Date(Date.now() + 28 * 3600 * 1000);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    const tomorrowRide = baseBooking({
      id: 'bk-sched',
      booking_reference: 'AHT-SCH-002',
      booking_type: 'scheduled',
      scheduled_at: createScheduledPickupTimestamp(tomorrowStr, '16:00'),
      status: 'driver_assigned',
    });

    const result = categorizeDriverAssignments(driverId, [immediateRide, tomorrowRide]);

    // Immediate ride should be in Today and actionable
    expect(result.today).toHaveLength(1);
    expect(result.today[0].id).toBe('bk-imm');
    expect(result.today[0].booking_type).toBe('immediate');
    expect(result.actionableAssignmentId).toBe('bk-imm');
  });

  it('preserves scheduled pickup time after driver acceptance and across workflow steps', () => {
    const scheduledTime = '2026-10-30T09:00:00+03:00';
    const ride = baseBooking({
      id: 'bk-lifecycle',
      booking_type: 'scheduled',
      scheduled_at: scheduledTime,
      status: 'driver_assigned',
    });

    // Step 1: Assigned
    const stateAssigned = categorizeDriverAssignments(driverId, [ride]);
    expect(stateAssigned.actionableAssignmentId).toBe('bk-lifecycle');

    // Step 2: Driver accepts -> moves exclusively to activeAssignment
    const acceptedRide = { ...ride, status: 'driver_accepted' as const };
    const stateAccepted = categorizeDriverAssignments(driverId, [acceptedRide]);
    expect(stateAccepted.activeAssignment?.id).toBe('bk-lifecycle');
    expect(stateAccepted.activeAssignment?.scheduled_at).toBe(scheduledTime);
    expect(formatDateTime(stateAccepted.activeAssignment?.scheduled_at)).toBe('30 Oct 2026, 09:00 AM');

    // Step 3: En route / Arrived / In progress
    const startedRide = { ...ride, status: 'trip_started' as const };
    const stateStarted = categorizeDriverAssignments(driverId, [startedRide]);
    expect(stateStarted.activeAssignment?.scheduled_at).toBe(scheduledTime);
    expect(formatDateTime(stateStarted.activeAssignment?.scheduled_at)).toBe('30 Oct 2026, 09:00 AM');

    // Step 4: Completed
    const completedRide = { ...ride, status: 'completed' as const };
    const stateCompleted = categorizeDriverAssignments(driverId, [completedRide]);
    expect(stateCompleted.completed).toHaveLength(1);
    expect(stateCompleted.completed[0].scheduled_at).toBe(scheduledTime);
    expect(formatDateTime(stateCompleted.completed[0].scheduled_at)).toBe('30 Oct 2026, 09:00 AM');
  });

  it('detects scheduling overlap with timezone-aware time comparison', () => {
    // Driver already assigned to trip at 10:00 AM AST (duration 60 min, buffer 30 min -> busy until 11:30 AM AST)
    const existingRide = baseBooking({
      id: 'bk-existing',
      booking_reference: 'AHT-EXISTING',
      scheduled_at: '2026-10-30T10:00:00+03:00',
      estimated_duration_min: 60,
      status: 'confirmed',
    });

    // Candidate 1: Conflicting trip at 10:45 AM AST
    const candidateConflict = {
      id: 'bk-cand-1',
      booking_reference: 'AHT-CONFLICT',
      scheduled_at: '2026-10-30T10:45:00+03:00',
      estimated_duration_min: 60,
    };

    const overlapResult = checkDriverOverlap([existingRide], candidateConflict);
    expect(overlapResult.hasOverlap).toBe(true);
    expect(overlapResult.message).toContain('AST');

    // Candidate 2: Non-conflicting trip at 12:30 PM AST
    const candidateSafe = {
      id: 'bk-cand-2',
      booking_reference: 'AHT-SAFE',
      scheduled_at: '2026-10-30T12:30:00+03:00',
      estimated_duration_min: 60,
    };

    const safeResult = checkDriverOverlap([existingRide], candidateSafe);
    expect(safeResult.hasOverlap).toBe(false);
  });
});
