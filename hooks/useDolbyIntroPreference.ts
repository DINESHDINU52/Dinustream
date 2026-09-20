'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dinustream_enable_dolby_intro';

export function useDolbyIntroPreference() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val !== null) {
          return val === 'true';
        }
      } catch {
        // Ignore
      }
    }
    return true;
  });

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setEnabledState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    isDolbyIntroEnabled: enabled,
    setDolbyIntroEnabled: setEnabled,
  };
}
