'use client';

import { useCallback, useEffect } from 'react';
import {
  playNotificationSound,
  unlockNotificationAudio,
  initNotificationAudio,
  isNotificationAudioUnlocked,
  NotificationSoundOptions,
  NOTIFICATION_AUDIO_SOURCE,
} from '@/lib/notification-sound';

export type { NotificationSoundOptions };

/**
 * Shared React hook for notification sound effects
 */
export function useNotificationSound() {
  useEffect(() => {
    const cleanup = initNotificationAudio();
    return cleanup;
  }, []);

  const playSound = useCallback((options?: NotificationSoundOptions) => {
    return playNotificationSound(options);
  }, []);

  const unlockAudio = useCallback(() => {
    return unlockNotificationAudio();
  }, []);

  return {
    playSound,
    unlockAudio,
    isUnlocked: isNotificationAudioUnlocked(),
    audioSource: NOTIFICATION_AUDIO_SOURCE,
  };
}
