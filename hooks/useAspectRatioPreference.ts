'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AspectRatioMode,
  DEFAULT_ASPECT_RATIO_MODE,
  getNextAspectRatioMode,
  isAspectRatioMode,
} from '@/lib/player/aspectRatio';

const STORAGE_KEY = 'dinustream_aspect_ratio_mode';

/**
 * Persisted video presentation mode.
 *
 * Stored per-device rather than per-profile on purpose: the right choice depends
 * on the screen you are watching on (a phone in landscape wants Fill, a 16:9 TV
 * is fine on Fit), so syncing it across devices would be actively unhelpful.
 *
 * Follows the same shape as useDolbyIntroPreference, including the `storage`
 * listener so changing the setting in one tab updates any other open tab.
 */
export function useAspectRatioPreference() {
  const [mode, setModeState] = useState<AspectRatioMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_ASPECT_RATIO_MODE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Validated rather than cast: a stale value from an older build (or a
      // hand-edited one) would otherwise produce an invalid `object-fit`.
      if (isAspectRatioMode(stored)) return stored;
    } catch {
      // Private browsing / storage disabled.
    }
    return DEFAULT_ASPECT_RATIO_MODE;
  });

  const setMode = useCallback((next: AspectRatioMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice simply will not survive a reload.
    }
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((current) => {
      const next = getNextAspectRatioMode(current);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Non-fatal.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isAspectRatioMode(e.newValue)) {
        setModeState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { aspectRatioMode: mode, setAspectRatioMode: setMode, cycleAspectRatioMode: cycleMode };
}
