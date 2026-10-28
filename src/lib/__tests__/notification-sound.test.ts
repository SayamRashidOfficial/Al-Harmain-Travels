import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  playNotificationSound,
  unlockNotificationAudio,
  isNotificationAudioUnlocked,
  NOTIFICATION_AUDIO_SOURCE,
  __resetNotificationAudioForTests,
} from '../notification-sound';

describe('notification-sound utility', () => {
  let mockPlay: ReturnType<typeof vi.fn>;
  let mockPause: ReturnType<typeof vi.fn>;
  let mockLoad: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    __resetNotificationAudioForTests();

    mockPlay = vi.fn().mockImplementation(() => Promise.resolve());
    mockPause = vi.fn();
    mockLoad = vi.fn();
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();

    // Mock window & Audio in test environment
    (global as any).window = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    };

    class MockAudio {
      src: string;
      preload = '';
      volume = 1;
      muted = false;
      currentTime = 0;
      constructor(src: string) {
        this.src = src;
      }
      play = mockPlay;
      pause = mockPause;
      load = mockLoad;
      addEventListener = mockAddEventListener;
      removeEventListener = mockRemoveEventListener;
    }

    (global as any).Audio = MockAudio;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (global as any).window;
    delete (global as any).Audio;
  });

  it('uses the canonical audio source soundreality-notification-message-622573.mp3', () => {
    expect(NOTIFICATION_AUDIO_SOURCE).toBe('/soundreality-notification-message-622573.mp3');
  });

  it('plays notification audio successfully on first call', async () => {
    const played = await playNotificationSound({
      id: 'notif-1',
      title: 'Booking Confirmed',
      message: 'Your ride is confirmed',
    });

    expect(played).toBe(true);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(isNotificationAudioUnlocked()).toBe(true);
  });

  it('deduplicates notifications by ID within deduplication window', async () => {
    const first = await playNotificationSound({ id: 'notif-abc' });
    expect(first).toBe(true);

    // Fast-forward past the 400ms cooldown, but within the 10s deduplication window
    vi.advanceTimersByTime(500);

    const second = await playNotificationSound({ id: 'notif-abc' });
    expect(second).toBe(false);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('deduplicates notifications by fingerprint (bookingId, title, message)', async () => {
    const first = await playNotificationSound({
      bookingId: 'bk-123',
      title: 'Captain Assigned',
      message: 'Driver is on the way',
    });
    expect(first).toBe(true);

    // Fast-forward past the 400ms cooldown, but within the 10s deduplication window
    vi.advanceTimersByTime(500);

    const second = await playNotificationSound({
      bookingId: 'bk-123',
      title: 'Captain Assigned',
      message: 'Driver is on the way',
    });
    expect(second).toBe(false);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('enforces cooldown interval to prevent overlapping rapid audio', async () => {
    const first = await playNotificationSound({ id: 'notif-1' });
    expect(first).toBe(true);

    // Call immediately with different ID (100ms later)
    vi.advanceTimersByTime(100);
    const second = await playNotificationSound({ id: 'notif-2' });
    expect(second).toBe(false);
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Advance past cooldown (450ms total)
    vi.advanceTimersByTime(350);
    const third = await playNotificationSound({ id: 'notif-3' });
    expect(third).toBe(true);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('handles browser autoplay restriction gracefully and plays pending sound on user gesture unlock', async () => {
    // Simulate browser blocking autoplay with NotAllowedError
    const notAllowedError = new Error("play() failed because user hasn't interacted");
    notAllowedError.name = 'NotAllowedError';
    mockPlay.mockRejectedValueOnce(notAllowedError);

    const played = await playNotificationSound({
      id: 'notif-pending',
      title: 'New Trip',
      message: 'You have a trip',
    });

    expect(played).toBe(false);

    // Now simulate user interaction unlock
    mockPlay.mockResolvedValue(undefined);
    await unlockNotificationAudio();

    // Advance timer by the 50ms delay used for resuming audio context
    vi.advanceTimersByTime(60);

    // Initial failed (1) + unlock gesture play (1) + pending sound playback (1) = 3 total
    expect(mockPlay).toHaveBeenCalledTimes(3);
  });

  it('discards pending autoplay notification sound if expired (> 15 seconds)', async () => {
    const notAllowedError = new Error('autoplay blocked');
    notAllowedError.name = 'NotAllowedError';
    mockPlay.mockRejectedValueOnce(notAllowedError);

    await playNotificationSound({ id: 'notif-stale' });

    // Wait 20 seconds before user interacts
    vi.advanceTimersByTime(20000);

    mockPlay.mockResolvedValue(undefined);
    await unlockNotificationAudio();
    vi.advanceTimersByTime(60);

    // Initial failed (1) + unlock gesture play (1) + no pending playback because it is expired = 2 total
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('allows bypass of deduplication when force is true', async () => {
    await playNotificationSound({ id: 'forced-notif' });
    expect(mockPlay).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100); // within cooldown and dedup window

    const forced = await playNotificationSound({ id: 'forced-notif', force: true });
    expect(forced).toBe(true);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });
});
