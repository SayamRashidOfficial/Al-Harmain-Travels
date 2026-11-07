import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null, currency: string = 'SAR'): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `${num.toFixed(2)} ${currency}`;
}

export const SAUDI_TIMEZONE = 'Asia/Riyadh';

/**
 * Standardized ISO 8601 pickup timestamp builder with explicit Saudi Arabia timezone offset (+03:00).
 * Prevents UTC drift when users select dates and times for journeys in Saudi Arabia.
 */
export function createScheduledPickupTimestamp(dateStr: string, timeStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const cleanTime = timeStr && timeStr.trim().length >= 4 ? timeStr.trim() : '12:00';
  const timeWithSeconds = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  return `${dateStr}T${timeWithSeconds}+03:00`;
}

/**
 * Returns current date formatted as YYYY-MM-DD in Saudi Arabia timezone (Asia/Riyadh).
 * Use for datepicker min attributes and initial date values.
 */
export function getSaudiCurrentDateString(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAUDI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns current time formatted as HH:mm in Saudi Arabia timezone (Asia/Riyadh),
 * optionally offset by specified minutes.
 */
export function getSaudiCurrentTimeString(offsetMinutes: number = 60, now: Date = new Date()): string {
  const target = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(target);
}

/**
 * Extract YYYY-MM-DD in Saudi Arabia timezone (Asia/Riyadh) from an ISO timestamp string.
 * Falls back to current Saudi date if missing or invalid.
 */
export function getSaudiDateFromISO(isoString?: string | null): string {
  if (!isoString) return getSaudiCurrentDateString();
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return getSaudiCurrentDateString();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAUDI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Extract HH:mm in Saudi Arabia timezone (Asia/Riyadh) from an ISO timestamp string.
 * Falls back to current Saudi time (+60m) if missing or invalid.
 */
export function getSaudiTimeFromISO(isoString?: string | null): string {
  if (!isoString) return getSaudiCurrentTimeString(60);
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return getSaudiCurrentTimeString(60);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTime(
  isoString?: string | null,
  options?: Intl.DateTimeFormatOptions & { timeZone?: string }
): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAUDI_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date);
  return formatted.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

/**
 * Formats time-only clock string (e.g. "02:30 PM") in Saudi Arabia timezone (Asia/Riyadh).
 */
export function formatPickupClock(isoString?: string | null): string {
  if (!isoString) return 'Immediate';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Immediate';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return formatted.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

/**
 * Formats date-only string (e.g. "30 Oct 2026") in Saudi Arabia timezone (Asia/Riyadh).
 */
export function formatPickupDate(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SAUDI_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function generateBookingReference(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AHT-${y}${m}${d}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `INV-${date.getFullYear()}-${rand}`;
}
