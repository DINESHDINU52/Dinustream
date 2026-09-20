'use client';

import { useState, useEffect, useCallback } from 'react';
import { SkipBehavior } from '@/types/segments';

const STORAGE_KEY = 'dinustream_segment_skip_behavior';

export function useSegmentSkipSettings() {
  const [skipBehavior, setSkipBehaviorState] = useState<SkipBehavior>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'auto' || saved === 'ask' || saved === 'never') {
          return saved as SkipBehavior;
        }
      } catch {
        // Ignore localStorage error
      }
    }
    return 'ask';
  });

  // Listen for storage events across tabs & custom events intra-page
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (e.newValue === 'auto' || e.newValue === 'ask' || e.newValue === 'never') {
          setSkipBehaviorState(e.newValue as SkipBehavior);
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as SkipBehavior;
      if (detail && ['auto', 'ask', 'never'].includes(detail)) {
        setSkipBehaviorState(detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dinustream:skip-behavior-change', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dinustream:skip-behavior-change', handleCustomEvent);
    };
  }, []);

  const setSkipBehavior = useCallback((behavior: SkipBehavior) => {
    setSkipBehaviorState(behavior);
    try {
      localStorage.setItem(STORAGE_KEY, behavior);
      window.dispatchEvent(new CustomEvent('dinustream:skip-behavior-change', { detail: behavior }));
    } catch {
      // Ignore
    }
  }, []);

  return {
    skipBehavior,
    setSkipBehavior,
    isAutoSkip: skipBehavior === 'auto',
    isAskToSkip: skipBehavior === 'ask',
    isNeverSkip: skipBehavior === 'never',
  };
}
