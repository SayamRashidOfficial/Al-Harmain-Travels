import { toast } from 'sonner';

/**
 * Notification Toast & Deduplication System for Al Harmain Travels
 *
 * Ensures:
 * 1. Only ONE toast notification appears per activity / event.
 * 2. Activity-based deduplication (booking ref/id + activity category).
 * 3. Time-window debounce to collapse duplicate real-time inserts, React StrictMode renders,
 *    and multi-channel events for the same action.
 * 4. Automatic ID mapping so Sonner replaces/updates in place instead of creating multiple cards.
 * 5. Clean separation for distinct activities (e.g., booking created -> chauffeur assigned -> trip started).
 */

export interface DedupedToastOptions {
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error' | 'ride';
  bookingId?: string | null;
  bookingRef?: string | null;
  activityKey?: string;
  duration?: number;
  force?: boolean;
}

// In-memory cache for debouncing: activityKey -> timestamp
const recentToastTimestamps = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 6000; // 6 seconds debounce window

/**
 * Extracts a booking reference (e.g., AHT-20261028-6989) from text
 */
export function extractBookingReference(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/AHT-[\dA-Za-z]+(?:-[\dA-Za-z]+)*/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Normalizes title & message to categorize the underlying activity
 */
export function categorizeNotificationActivity(title?: string, message?: string): string {
  const combined = `${title || ''} ${message || ''}`.toLowerCase();

  if (combined.includes('confirm')) return 'booking_confirmed';
  if (combined.includes('reassign')) return 'driver_reassigned';
  if (combined.includes('assign') || combined.includes('captain') || combined.includes('chauffeur')) return 'driver_assigned';
  if (
    combined.includes('cash') ||
    combined.includes('payment') ||
    combined.includes('settle') ||
    combined.includes('receipt') ||
    combined.includes('paid')
  ) {
    return 'payment_status';
  }
  if (combined.includes('cancel') || combined.includes('decline') || combined.includes('reject')) return 'booking_cancelled';
  if (
    combined.includes('arrived') ||
    combined.includes('on the way') ||
    combined.includes('picked up') ||
    combined.includes('boarded') ||
    combined.includes('in progress') ||
    combined.includes('completed') ||
    combined.includes('journey')
  ) {
    return 'ride_status';
  }
  if (
    combined.includes('quote') ||
    combined.includes('custom route') ||
    combined.includes('new booking') ||
    combined.includes('booking request') ||
    combined.includes('registered') ||
    combined.includes('created')
  ) {
    return 'booking_created';
  }

  // Fallback: normalized clean title
  const cleanTitle = (title || 'general').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);
  return cleanTitle || 'general';
}

/**
 * Generates a deterministic activity key.
 * Two notifications for the same booking and same action (even with slightly different wording
 * across staff and customer templates) yield the EXACT SAME activity key.
 */
export function getNotificationActivityKey(options: {
  title?: string;
  message?: string;
  bookingId?: string | null;
  bookingRef?: string | null;
  activityKey?: string;
}): string {
  if (options.activityKey) return options.activityKey;

  const bookingRef =
    options.bookingRef ||
    extractBookingReference(options.message) ||
    extractBookingReference(options.title) ||
    options.bookingId ||
    'global';

  const category = categorizeNotificationActivity(options.title, options.message);
  return `activity:${bookingRef}:${category}`;
}

/**
 * Prunes expired entries from the toast deduplication map
 */
function pruneRecentToasts(): void {
  const now = Date.now();
  for (const [key, timestamp] of recentToastTimestamps.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      recentToastTimestamps.delete(key);
    }
  }
}

/**
 * Displays a toast notification with strict deduplication and in-place updates.
 * Returns true if a toast was displayed/updated, or false if it was suppressed as a duplicate.
 */
export function showDedupedToast(options: DedupedToastOptions): boolean {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  pruneRecentToasts();

  const activityKey = getNotificationActivityKey(options);

  // If already shown within the deduplication window and not forced, suppress duplicate popup
  if (!options.force && recentToastTimestamps.has(activityKey)) {
    return false;
  }

  // Record timestamp for this activity
  recentToastTimestamps.set(activityKey, now);

  const rawType = options.type || 'info';
  const toastType = rawType === 'ride' ? 'info' : rawType;

  const toastFn = toast[toastType] || toast.info;

  // Passing id ensures Sonner maintains only ONE toast card for this activity key
  toastFn(options.title, {
    id: activityKey,
    description: options.message,
    duration: options.duration || 4500,
  });

  return true;
}

/**
 * Reset internal state for test isolation
 */
export function __resetToastDeduplicationForTests(): void {
  recentToastTimestamps.clear();
}
