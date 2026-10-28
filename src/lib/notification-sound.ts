/**
 * Notification Sound System for Al Harmain Travels
 *
 * Requirements satisfied:
 * 1. Audio source: '/reality-notification-message-622573.mp3'
 * 2. Plays only for genuinely newly received notifications (Supabase Realtime & active user addNotification)
 * 3. Never plays on page refresh, navigation, or loading historical notifications
 * 4. Deduplication by notification ID and fingerprint (bookingId + title + message)
 * 5. Debounce / cooldown to prevent overlapping or stuttering audio
 * 6. Browser autoplay policy handling: graceful fallback and unlock on first user gesture
 * 7. Singleton audio instance to prevent memory leaks and duplicate DOM objects
 */

export const NOTIFICATION_AUDIO_SOURCE = '/soundreality-notification-message-622573.mp3';
export const NOTIFICATION_AUDIO_FALLBACK = '/reality-notification-message-622573.mp3';

export interface NotificationSoundOptions {
  id?: string;
  bookingId?: string | null;
  title?: string;
  message?: string;
  force?: boolean;
}

interface PendingSoundRequest {
  timestamp: number;
  options?: NotificationSoundOptions;
}

// Module-level state (client-side only)
let audioElement: HTMLAudioElement | null = null;
let isAudioUnlocked = false;
let isAudioInitializing = false;
let lastPlayTimestamp = 0;
let pendingSound: PendingSoundRequest | null = null;

// Deduplication cache: key -> timestamp when played
const recentPlays = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 10000; // 10 seconds
const PLAY_COOLDOWN_MS = 400; // 400ms minimum interval between sounds to prevent audio clipping
const PENDING_EXPIRY_MS = 15000; // 15 seconds validity for pending autoplay sound

/**
 * Prune stale entries from the deduplication map
 */
function pruneRecentPlays(): void {
  const now = Date.now();
  for (const [key, timestamp] of recentPlays.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      recentPlays.delete(key);
    }
  }
}

/**
 * Generate a fingerprint key for deduplication
 */
function getNotificationFingerprint(options?: NotificationSoundOptions): string | null {
  if (!options) return null;
  const parts: string[] = [];
  if (options.bookingId) parts.push(`b:${options.bookingId}`);
  if (options.title) parts.push(`t:${options.title.trim()}`);
  if (options.message) parts.push(`m:${options.message.trim()}`);
  return parts.length > 0 ? parts.join('|') : null;
}

/**
 * Get or create the singleton HTMLAudioElement
 */
export function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!audioElement) {
    try {
      audioElement = new Audio(NOTIFICATION_AUDIO_SOURCE);
      audioElement.preload = 'auto';
      audioElement.volume = 0.85;

      // Handle loading error by falling back to alternate mp3 filename if needed
      audioElement.addEventListener('error', () => {
        if (audioElement && audioElement.src.includes('soundreality-notification-message-622573.mp3')) {
          try {
            audioElement.src = NOTIFICATION_AUDIO_FALLBACK;
            audioElement.load();
          } catch {
            // Silently ignore secondary fallback errors
          }
        }
      });
    } catch (err) {
      console.warn('Failed to initialize notification audio instance:', err);
      audioElement = null;
    }
  }

  return audioElement;
}

/**
 * Plays the notification chime if valid and not duplicate
 */
export async function playNotificationSound(options?: NotificationSoundOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const now = Date.now();

  // Deduplication check
  if (!options?.force) {
    pruneRecentPlays();

    // Check by ID
    if (options?.id && recentPlays.has(`id:${options.id}`)) {
      return false;
    }

    // Check by fingerprint (bookingId + title + message)
    const fingerprint = getNotificationFingerprint(options);
    if (fingerprint && recentPlays.has(`fp:${fingerprint}`)) {
      return false;
    }

    // Cooldown check (prevent overlapping audio within PLAY_COOLDOWN_MS)
    if (now - lastPlayTimestamp < PLAY_COOLDOWN_MS) {
      return false;
    }
  }

  // Record into deduplication cache
  if (options?.id) {
    recentPlays.set(`id:${options.id}`, now);
  }
  const fp = getNotificationFingerprint(options);
  if (fp) {
    recentPlays.set(`fp:${fp}`, now);
  }

  const audio = getNotificationAudio();
  if (!audio) return false;

  try {
    // Reset playback position
    audio.pause();
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      isAudioUnlocked = true;
      lastPlayTimestamp = Date.now();
      pendingSound = null;
      return true;
    }
    return false;
  } catch (err: any) {
    // Autoplay restrictions handle
    if (err?.name === 'NotAllowedError') {
      // Browser blocked autoplay — schedule pending playback on user interaction
      pendingSound = {
        timestamp: Date.now(),
        options,
      };
      // Ensure gesture listeners are active to unlock as soon as user interacts
      ensureUnlockListeners();
      return false;
    }

    if (err?.name === 'AbortError') {
      // Playback was interrupted by a new request or pause
      return false;
    }

    console.warn('Notification audio playback failed:', err);
    return false;
  }
}

/**
 * Unlock audio when user interacts with document
 */
export async function unlockNotificationAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const audio = getNotificationAudio();
  if (!audio) return false;

  try {
    // Muted brief play/pause to unlock audio context in restricted browsers
    const prevMuted = audio.muted;
    audio.muted = true;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      audio.pause();
      audio.currentTime = 0;
      audio.muted = prevMuted;
    }
    isAudioUnlocked = true;

    // Check if there was a pending notification sound waiting for unlock
    if (pendingSound) {
      const isFresh = Date.now() - pendingSound.timestamp <= PENDING_EXPIRY_MS;
      const opts = pendingSound.options;
      pendingSound = null;

      if (isFresh) {
        // Small delay to allow audio context to fully resume
        setTimeout(() => {
          playNotificationSound({ ...opts, force: true });
        }, 50);
      }
    }

    return true;
  } catch {
    return false;
  }
}

// User interaction event handler for unlocking
function handleUserInteraction() {
  unlockNotificationAudio();
  removeUnlockListeners();
}

const GESTURE_EVENTS = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;

function ensureUnlockListeners() {
  if (typeof window === 'undefined' || isAudioUnlocked || isAudioInitializing) return;
  isAudioInitializing = true;

  GESTURE_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleUserInteraction, { once: true, passive: true });
  });
}

function removeUnlockListeners() {
  if (typeof window === 'undefined') return;
  isAudioInitializing = false;

  GESTURE_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, handleUserInteraction);
  });
}

/**
 * Initializes listeners to unlock audio on first interaction.
 * Returns a cleanup function for component unmounts.
 */
export function initNotificationAudio(): () => void {
  if (typeof window === 'undefined') return () => {};

  ensureUnlockListeners();

  return () => {
    removeUnlockListeners();
  };
}

/**
 * Check if notification audio has been unlocked by a user gesture
 */
export function isNotificationAudioUnlocked(): boolean {
  return isAudioUnlocked;
}

/**
 * Reset state (useful for test isolation)
 */
export function __resetNotificationAudioForTests() {
  audioElement = null;
  isAudioUnlocked = false;
  isAudioInitializing = false;
  lastPlayTimestamp = 0;
  pendingSound = null;
  recentPlays.clear();
}
