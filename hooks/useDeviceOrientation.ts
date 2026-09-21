'use client';

import { useState, useEffect, useCallback } from 'react';
import { isFullscreenActive, lockOrientation, requestFullscreen } from '@/lib/dom/fullscreen';

export interface DeviceOrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isTV: boolean;
  orientation: 'portrait' | 'landscape';
  requestFullscreenLandscape: (element?: HTMLElement | null) => Promise<boolean>;
}

export function useDeviceOrientation(): DeviceOrientationState {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const portrait = height > width;

      setOrientation(portrait ? 'portrait' : 'landscape');
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      // Large TV screen detection: 4K/wide screens or smart TV browser user agents
      const userAgent = navigator.userAgent.toLowerCase();
      const isTVBrowser =
        userAgent.includes('smart-tv') ||
        userAgent.includes('tizen') ||
        userAgent.includes('webos') ||
        userAgent.includes('googletv') ||
        userAgent.includes('appletv') ||
        (width >= 2560 && height >= 1440);

      setIsTV(isTVBrowser);
    };

    updateDimensions();

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = (e: MediaQueryListEvent) => {
      setOrientation(e.matches ? 'portrait' : 'landscape');
    };

    window.addEventListener('resize', updateDimensions);
    try {
      mediaQuery.addEventListener('change', handleOrientationChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      try {
        mediaQuery.removeEventListener('change', handleOrientationChange);
      } catch {
        mediaQuery.removeListener(handleOrientationChange);
      }
    };
  }, []);

  /**
   * Enter fullscreen and, where the platform allows it, lock to landscape.
   *
   * Both steps now go through lib/dom/fullscreen, which centralises the
   * vendor-prefixed API surface (this function used to reimplement it with
   * `any` casts). Orientation lock failure is non-fatal: desktop browsers and
   * iOS Safari always reject it, so fullscreen alone is still a success.
   */
  const requestFullscreenLandscape = useCallback(
    async (element?: HTMLElement | null): Promise<boolean> => {
      const target = element || document.documentElement;

      const entered = isFullscreenActive() ? true : await requestFullscreen(target);
      await lockOrientation('landscape');

      return entered;
    },
    []
  );

  return {
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isMobile,
    isTablet,
    isTV,
    orientation,
    requestFullscreenLandscape,
  };
}
