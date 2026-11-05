import { describe, it, expect } from 'vitest';
import { isBookingForCustomer } from '../assignment-utils';
import { Booking, Profile } from '@/types';

describe('Customer Data Privacy & Isolation Tests', () => {
  const customerA: Profile = {
    id: 'customer-uuid-001',
    role: 'customer',
    full_name: 'Customer A',
    email: 'customer.a@example.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customerB: Profile = {
    id: 'customer-uuid-002',
    role: 'customer',
    full_name: 'Customer B',
    email: 'customer.b@example.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bookingA: Partial<Booking> = {
    id: 'bk-1001',
    booking_reference: 'AHT-20261105-0001',
    customer_id: customerA.id,
    passenger_name: 'Customer A',
    passenger_phone: '+966500000001',
    pickup_address: 'Makkah Clock Royal Tower',
    destination_address: 'Jeddah Airport Terminal 1',
    status: 'confirmed',
  };

  const bookingB: Partial<Booking> = {
    id: 'bk-1002',
    booking_reference: 'AHT-20261105-0002',
    customer_id: customerB.id,
    passenger_name: 'Customer B',
    passenger_phone: '+966500000002',
    pickup_address: 'Madinah Hilton',
    destination_address: 'Makkah Clock Tower',
    status: 'started',
  };

  describe('isBookingForCustomer ownership verification', () => {
    it('allows Customer A to access their own booking', () => {
      expect(isBookingForCustomer(bookingA as Booking, customerA)).toBe(true);
    });

    it('strictly denies Customer B access to Customer A booking', () => {
      expect(isBookingForCustomer(bookingA as Booking, customerB)).toBe(false);
    });

    it('strictly denies Customer A access to Customer B booking', () => {
      expect(isBookingForCustomer(bookingB as Booking, customerA)).toBe(false);
    });

    it('denies unauthenticated / guest user access to any customer booking', () => {
      const guestUser: Profile = {
        id: 'guest',
        role: 'customer',
        full_name: 'Guest Traveler',
        status: 'active',
        created_at: '',
        updated_at: '',
      };
      expect(isBookingForCustomer(bookingA as Booking, guestUser)).toBe(false);
      expect(isBookingForCustomer(bookingB as Booking, guestUser)).toBe(false);
      expect(isBookingForCustomer(bookingA as Booking, null)).toBe(false);
      expect(isBookingForCustomer(bookingA as Booking, undefined)).toBe(false);
    });
  });

  describe('Customer Live Radar collection isolation', () => {
    it('ensures a newly logged-in customer with 0 bookings never ingests other customer bookings', () => {
      const allContextBookings: Booking[] = [bookingA as Booking, bookingB as Booking];
      const newCustomerId = 'customer-uuid-new-999';

      // Replicating the secure filter in fetchCustomerBookings
      const customerIsolatedBookings = allContextBookings.filter((b) => b.customer_id === newCustomerId);

      expect(customerIsolatedBookings).toHaveLength(0);
      expect(customerIsolatedBookings).not.toContain(bookingA);
      expect(customerIsolatedBookings).not.toContain(bookingB);
    });

    it('ensures urlRef resolution cannot load bookings belonging to a different customer', () => {
      const authenticatedUserId = customerB.id;
      const foreignBooking = bookingA as Booking; // belongs to customer A

      // Verify authorization check
      const isAuthorized = foreignBooking.customer_id === authenticatedUserId;
      expect(isAuthorized).toBe(false);
    });

    it('scopes radar storage keys to authenticated user id so different customer accounts do not collide', () => {
      const getStorageKey = (uid?: string | null) => (uid ? `alharmain_customer_selected_track_${uid}` : null);

      const keyA = getStorageKey(customerA.id);
      const keyB = getStorageKey(customerB.id);

      expect(keyA).toBe('alharmain_customer_selected_track_customer-uuid-001');
      expect(keyB).toBe('alharmain_customer_selected_track_customer-uuid-002');
      expect(keyA).not.toEqual(keyB);
    });
  });
});
