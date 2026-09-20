'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const requestFullscreenLandscape = useCallback(async (element?: HTMLElement | null): Promise<boolean> => {
    try {
      const target = element || document.documentElement;
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      }

      // Try locking screen orientation to landscape where supported
      if ('screen' in window && 'orientation' in window.screen) {
        const screenOrientation = window.screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (typeof screenOrientation.lock === 'function') {
          try {
            await screenOrientation.lock('landscape');
          } catch {
            // Screen orientation lock might be restricted or rejected; gracefully ignore
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }, []);

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
