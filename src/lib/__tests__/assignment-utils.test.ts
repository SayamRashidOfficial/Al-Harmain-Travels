import { describe, it, expect } from 'vitest';
import { categorizeDriverAssignments } from '../assignment-utils';
import { Booking } from '@/types';

const baseBooking = (overrides: Partial<Booking>): Booking => ({
  id: 'b-1',
  booking_reference: 'AH-1001',
  customer_id: 'cust-1',
  pickup_address: 'Jeddah Airport',
  destination_address: 'Makkah Clock Royal Tower',
  pickup_latitude: 21.6796,
  pickup_longitude: 39.1565,
  destination_latitude: 21.4187,
  destination_longitude: 39.8256,
  booking_type: 'scheduled',
  vehicle_type: 'vip_gmc',
  scheduled_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 min from now (today)
  status: 'driver_assigned',
  payment_method: 'cash',
  payment_status: 'pending',
  estimated_distance_km: 85,
  estimated_duration_min: 75,
  estimated_fare: 350,
  final_fare: 350,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  passenger_name: 'Brother Ahmad',
  passenger_phone: '+966500000001',
  passenger_count: 3,
  assigned_driver_id: 'driver-1',
  ...overrides,
});

describe('categorizeDriverAssignments - Accepted Ride Visibility', () => {
  const driverId = 'driver-1';

  it('shows unaccepted rides in the roster with the first being actionable', () => {
    const ride1 = baseBooking({ id: 'b-1', booking_reference: 'AH-001', scheduled_at: new Date(Date.now() + 3600000).toISOString() });
    const ride2 = baseBooking({ id: 'b-2', booking_reference: 'AH-002', scheduled_at: new Date(Date.now() + 7200000).toISOString() });

    const result = categorizeDriverAssignments(driverId, [ride1, ride2]);

    expect(result.activeAssignment).toBeNull();
    expect(result.today).toHaveLength(2);
    expect(result.today.map((r) => r.id)).toEqual(['b-1', 'b-2']);
    // First ride is actionable
    expect(result.actionableAssignmentId).toBe('b-1');
  });

  it('immediately removes accepted ride from the roster and places it only in activeAssignment', () => {
    // Driver accepts ride1
    const ride1 = baseBooking({
      id: 'b-1',
      booking_reference: 'AH-001',
      status: 'driver_accepted',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    });
    const ride2 = baseBooking({
      id: 'b-2',
      booking_reference: 'AH-002',
      status: 'driver_assigned',
      scheduled_at: new Date(Date.now() + 7200000).toISOString(),
    });

    const result = categorizeDriverAssignments(driverId, [ride1, ride2]);

    // Active assignment is ride1
    expect(result.activeAssignment?.id).toBe('b-1');

    // Ride 1 MUST NOT be in today / tomorrow / upcoming
    expect(result.today.find((r) => r.id === 'b-1')).toBeUndefined();
    expect(result.tomorrow.find((r) => r.id === 'b-1')).toBeUndefined();
    expect(result.upcoming.find((r) => r.id === 'b-1')).toBeUndefined();

    // Only ride2 is in the roster
    expect(result.today).toHaveLength(1);
    expect(result.today[0].id).toBe('b-2');

    // Because ride1 is active, ride2 must be LOCKED (actionableAssignmentId is null for the roster)
    expect(result.actionableAssignmentId).toBeNull();
  });

  it('does not duplicate rides when status advances (e.g., driver_arriving, arrived, trip_started)', () => {
    const statuses = ['driver_arriving', 'driver_arrived', 'trip_started', 'accepted', 'on_the_way'] as const;

    for (const status of statuses) {
      const activeRide = baseBooking({
        id: 'b-active',
        booking_reference: 'AH-ACTIVE',
        status,
        scheduled_at: new Date(Date.now() + 1800000).toISOString(),
      });
      const queuedRide = baseBooking({
        id: 'b-queued',
        booking_reference: 'AH-QUEUED',
        status: 'driver_assigned',
        scheduled_at: new Date(Date.now() + 5400000).toISOString(),
      });

      const result = categorizeDriverAssignments(driverId, [activeRide, queuedRide]);

      expect(result.activeAssignment?.id).toBe('b-active');
      expect(result.today.find((r) => r.id === 'b-active')).toBeUndefined();
      expect(result.today).toHaveLength(1);
      expect(result.today[0].id).toBe('b-queued');
      expect(result.actionableAssignmentId).toBeNull();
    }
  });

  it('unlocks next ride when active mission completes', () => {
    const completedRide = baseBooking({
      id: 'b-1',
      booking_reference: 'AH-001',
      status: 'completed',
      scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    });
    const nextRide = baseBooking({
      id: 'b-2',
      booking_reference: 'AH-002',
      status: 'driver_assigned',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    });

    const result = categorizeDriverAssignments(driverId, [completedRide, nextRide]);

    expect(result.activeAssignment).toBeNull();
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].id).toBe('b-1');

    // nextRide is now in today and is actionable
    expect(result.today).toHaveLength(1);
    expect(result.today[0].id).toBe('b-2');
    expect(result.actionableAssignmentId).toBe('b-2');
  });

  it('does not leak rides assigned to other drivers', () => {
    const myRide = baseBooking({ id: 'b-mine', assigned_driver_id: 'driver-1', status: 'driver_assigned' });
    const otherRide = baseBooking({ id: 'b-other', assigned_driver_id: 'driver-2', status: 'driver_assigned' });

    const result = categorizeDriverAssignments(driverId, [myRide, otherRide]);

    expect(result.today).toHaveLength(1);
    expect(result.today[0].id).toBe('b-mine');
  });
});
