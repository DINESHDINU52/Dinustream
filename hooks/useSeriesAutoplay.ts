'use client';

import { useState, useEffect, useCallback } from 'react';
import { Episode } from '@/types/cinema';

const STORAGE_KEY = 'dinustream_autoplay_next_episode';
const COUNTDOWN_START_SECONDS = 8;

interface UseSeriesAutoplayOptions {
  currentTime: number;
  duration: number;
  currentEpisode?: Episode;
  nextEpisode?: Episode;
  onNextEpisode?: () => void;
  /** Distance from end of media in seconds to start the Next Episode prompt (default 20s) */
  triggerThresholdSeconds?: number;
}

export function useSeriesAutoplay({
  currentTime,
  duration,
  currentEpisode,
  nextEpisode,
  onNextEpisode,
  triggerThresholdSeconds = 20,
}: UseSeriesAutoplayOptions) {
  // Autoplay setting persisted in localStorage (default true)
  const [autoplayNextEpisode, setAutoplayNextEpisodeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // Ignore localStorage error
      }
    }
    return true;
  });

  const [countdown, setCountdown] = useState<number>(COUNTDOWN_START_SECONDS);
  const [cancelledEpisodeId, setCancelledEpisodeId] = useState<string | null>(null);
  const [prevEpisodeId, setPrevEpisodeId] = useState<string | undefined>(currentEpisode?.id);
  const [prevIsNearEnd, setPrevIsNearEnd] = useState<boolean>(false);

  // Synchronize across tabs and storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setAutoplayNextEpisodeState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setAutoplayNextEpisode = useCallback((enabled: boolean) => {
    setAutoplayNextEpisodeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }, []);

  // Determine if playback is near end
  const remainingTime = duration > 0 ? duration - currentTime : 999;
  const isNearEnd = Boolean(
    duration > 0 &&
      remainingTime <= triggerThresholdSeconds &&
      remainingTime >= 0 &&
      nextEpisode
  );

  // Reset state during render when episode changes or playback seeks away from near-end
  if (currentEpisode?.id !== prevEpisodeId) {
    setPrevEpisodeId(currentEpisode?.id);
    setCancelledEpisodeId(null);
    setCountdown(COUNTDOWN_START_SECONDS);
  }

  if (isNearEnd !== prevIsNearEnd) {
    setPrevIsNearEnd(isNearEnd);
    if (!isNearEnd) {
      setCancelledEpisodeId(null);
      setCountdown(COUNTDOWN_START_SECONDS);
    }
  }

  const isCancelled = Boolean(
    currentEpisode?.id
      ? cancelledEpisodeId === currentEpisode.id
      : cancelledEpisodeId === 'current'
  );

  // Countdown timer effect
  useEffect(() => {
    // Only run countdown if near end, next episode exists, not cancelled, and autoplay enabled
    if (!isNearEnd || !nextEpisode || isCancelled || !autoplayNextEpisode) {
      return;
    }

    let hasFired = false;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasFired && onNextEpisode) {
            hasFired = true;
            onNextEpisode();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isNearEnd, nextEpisode, isCancelled, autoplayNextEpisode, onNextEpisode]);

  const handlePlayNow = useCallback(() => {
    if (onNextEpisode) {
      onNextEpisode();
    }
  }, [onNextEpisode]);

  const handleCancel = useCallback(() => {
    setCancelledEpisodeId(currentEpisode?.id || 'current');
  }, [currentEpisode?.id]);

  const shouldShowPrompt = Boolean(isNearEnd && nextEpisode && !isCancelled);

  return {
    autoplayNextEpisode,
    setAutoplayNextEpisode,
    countdown,
    shouldShowPrompt,
    isCancelled,
    handlePlayNow,
    handleCancel,
  };
}
