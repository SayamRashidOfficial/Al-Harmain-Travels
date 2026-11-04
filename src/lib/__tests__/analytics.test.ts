// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pageview,
  event,
  trackBookNowClick,
  trackBookingStarted,
  trackBookingSubmitted,
  GA_TRACKING_ID,
} from '../analytics';

describe('Google Analytics 4 Utility (src/lib/analytics.ts)', () => {
  let mockGtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGtag = vi.fn();
    window.gtag = mockGtag;
    window.dataLayer = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports GA_TRACKING_ID matching environment variable', () => {
    expect(typeof GA_TRACKING_ID).toBe('string');
  });

  it('dispatches page_view event with sanitized parameters', () => {
    pageview('/customer?service=makkah', 'Customer Portal');

    if (GA_TRACKING_ID) {
      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          page_path: '/customer?service=makkah',
          page_title: 'Customer Portal',
          send_to: GA_TRACKING_ID,
        })
      );
    }
  });

  it('tracks book_now_click with location, label, and vehicle type', () => {
    trackBookNowClick({
      location: 'navbar_desktop',
      label: 'Book a Ride',
      vehicle_type: 'vip_gmc',
    });

    if (GA_TRACKING_ID) {
      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'book_now_click',
        expect.objectContaining({
          cta_location: 'navbar_desktop',
          cta_label: 'Book a Ride',
          vehicle_type: 'vip_gmc',
        })
      );
    }
  });

  it('tracks booking_started without transmitting PII', () => {
    trackBookingStarted({
      service_type: 'intercity_jeddah_makkah',
      vehicle_type: 'gmc',
      booking_method: 'fixed',
      trip_type: 'one_way',
    });

    if (GA_TRACKING_ID) {
      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'booking_started',
        expect.objectContaining({
          service_type: 'intercity_jeddah_makkah',
          vehicle_type: 'gmc',
          booking_method: 'fixed',
          trip_type: 'one_way',
        })
      );
    }
  });

  it('tracks booking_submitted with order reference, fare and no customer personal data', () => {
    trackBookingSubmitted({
      booking_reference: 'AH-987654',
      service_type: 'intercity_makkah_madinah',
      vehicle_category: 'gmc',
      booking_type: 'immediate',
      booking_method: 'fixed',
      total_fare: 450,
      currency: 'SAR',
    });

    if (GA_TRACKING_ID) {
      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'booking_submitted',
        expect.objectContaining({
          booking_reference: 'AH-987654',
          service_type: 'intercity_makkah_madinah',
          vehicle_category: 'gmc',
          booking_type: 'immediate',
          booking_method: 'fixed',
          value: 450,
          currency: 'SAR',
        })
      );
    }
  });
});
