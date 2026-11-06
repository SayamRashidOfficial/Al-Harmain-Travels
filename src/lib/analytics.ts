/**
 * Google Analytics 4 (GA4) Integration Utility
 *
 * Implements official gtag.js measurement for Al Harmain Travels.
 * Measurement ID is loaded from process.env.NEXT_PUBLIC_GA_ID.
 *
 * Privacy Notice:
 * - NO personal identifiable information (PII) such as passenger names,
 *   phone numbers, email addresses, passwords, or payment receipts are
 *   ever sent to Google Analytics.
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/**
 * Dispatch an official page_view event to GA4.
 */
export const pageview = (url: string, title?: string): void => {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) return;

  try {
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');
    const pageLocation = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: pageLocation,
        page_path: url,
        send_to: GA_TRACKING_ID,
      });
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'page_view',
        page_title: pageTitle,
        page_location: pageLocation,
        page_path: url,
        send_to: GA_TRACKING_ID,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA4] Failed to send pageview event:', err);
    }
  }
};

/**
 * Generic GA4 custom event dispatcher with automatic parameter sanitization.
 */
export const event = (
  action: string,
  params: Record<string, string | number | boolean | undefined | null> = {}
): void => {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) return;

  try {
    // Sanitize parameters: remove undefined/null values
    const cleanParams: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleanParams[key] = value;
      }
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', action, cleanParams);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: action,
        ...cleanParams,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[GA4] Failed to send event "${action}":`, err);
    }
  }
};

/**
 * Track "book_now_click" event when a user clicks a booking CTA.
 */
export interface BookNowClickParams {
  location?: string;
  label?: string;
  vehicle_type?: string;
}

export const trackBookNowClick = (params: BookNowClickParams = {}): void => {
  event('book_now_click', {
    cta_location: params.location || 'unknown',
    cta_label: params.label || 'Book Now',
    vehicle_type: params.vehicle_type,
  });
};

/**
 * Track "booking_started" event when a customer initiates the booking flow.
 * Note: Strictly non-PII parameters only.
 */
export interface BookingStartedParams {
  service_type?: string;
  vehicle_type?: string;
  booking_method?: 'fixed' | 'custom' | string;
  trip_type?: 'one_way' | 'round_trip' | string;
}

export const trackBookingStarted = (params: BookingStartedParams = {}): void => {
  event('booking_started', {
    service_type: params.service_type || 'unspecified',
    vehicle_type: params.vehicle_type,
    booking_method: params.booking_method || 'fixed',
    trip_type: params.trip_type,
  });
};

/**
 * Track "booking_submitted" event when a booking is successfully placed.
 * Note: Under GDPR/PDPL and Google guidelines, NO passenger names, phone numbers,
 * email addresses, payment receipts, or card details are included.
 */
export interface BookingSubmittedParams {
  booking_reference: string;
  service_type?: string;
  vehicle_category?: string;
  vehicle_type?: string;
  booking_type?: 'immediate' | 'scheduled' | string;
  booking_method?: 'fixed' | 'custom' | string;
  total_fare?: number;
  currency?: string;
}

export const trackBookingSubmitted = (params: BookingSubmittedParams): void => {
  event('booking_submitted', {
    booking_reference: params.booking_reference,
    service_type: params.service_type || 'general',
    vehicle_category: params.vehicle_category,
    vehicle_type: params.vehicle_type,
    booking_type: params.booking_type || 'immediate',
    booking_method: params.booking_method || 'fixed',
    value: typeof params.total_fare === 'number' ? params.total_fare : undefined,
    currency: params.currency || 'SAR',
  });
};

