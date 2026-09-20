'use client';

import { useEffect, useState, useCallback } from 'react';

const TV_MODE_STORAGE_KEY = 'dinustream_tv_mode';

export function useTVNavigation(isEnabled = true) {
  const [isTVMode, setIsTVMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TV_MODE_STORAGE_KEY);
      if (stored !== null) return stored === 'true';
      // Auto-detect wide TV screen or TV browser
      const userAgent = navigator.userAgent.toLowerCase();
      const isTVBrowser =
        userAgent.includes('smart-tv') ||
        userAgent.includes('tizen') ||
        userAgent.includes('webos') ||
        userAgent.includes('googletv') ||
        userAgent.includes('appletv') ||
        window.innerWidth >= 2560;
      return isTVBrowser;
    }
    return false;
  });

  // Apply data-tv-mode to <html> element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isTVMode) {
        document.documentElement.setAttribute('data-tv-mode', 'true');
        document.body.classList.add('tv-mode-active');
      } else {
        document.documentElement.removeAttribute('data-tv-mode');
        document.body.classList.remove('tv-mode-active');
      }
    }
  }, [isTVMode]);

  const setTVMode = useCallback((enabled: boolean) => {
    setIsTVMode(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TV_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('dinustream-tv-mode-changed', { detail: enabled }));
    }
  }, []);

  const toggleTVMode = useCallback(() => {
    setTVMode(!isTVMode);
  }, [isTVMode, setTVMode]);

  // Listen to external toggle events
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') {
        setIsTVMode(detail);
      }
    };
    window.addEventListener('dinustream-tv-mode-changed', handleSync);
    return () => window.removeEventListener('dinustream-tv-mode-changed', handleSync);
  }, []);

  // Spatial / D-pad keyboard remote navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEnabled) return;

      const tvKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

      if (tvKeys.includes(e.key) && !isTyping) {
        if (!isTVMode) {
          // Switch to TV mode on remote D-pad input
          setTVMode(true);
        }

        // If no element is focused or body is focused, focus first focusable element
        if (
          !document.activeElement ||
          document.activeElement === document.body ||
          document.activeElement === document.documentElement
        ) {
          const focusable = document.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
            e.preventDefault();
          }
        }
      }
    },
    [isEnabled, isTVMode, setTVMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isTVMode, setTVMode, toggleTVMode };
}
