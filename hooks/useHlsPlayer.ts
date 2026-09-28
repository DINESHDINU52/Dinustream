'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type HlsType from 'hls.js';

export interface QualityLevel {
  id: number;
  label: string;
  height?: number;
  bitrate?: number;
}

export const AUTO_QUALITY_ID = -1;

export interface UseHlsPlayerOptions {
  src: string | null;
  method: 'hls' | 'direct';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFatalError?: (message: string) => void;
}

export interface UseHlsPlayerResult {
  levels: QualityLevel[];
  selectedLevelId: number;
  activeLevelId: number;
  setLevel: (id: number) => void;
  isReady: boolean;
  isRecovering: boolean;
}

function isNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export function useHlsPlayer({ src, method, videoRef, onFatalError }: UseHlsPlayerOptions): UseHlsPlayerResult {
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(AUTO_QUALITY_ID);
  const [activeLevelId, setActiveLevelId] = useState<number>(AUTO_QUALITY_ID);
  const [isReady, setIsReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const hlsRef = useRef<HlsType | null>(null);

  const destroy = useCallback(() => {
    const hls = hlsRef.current;
    if (hls) {
      try {
        hls.destroy();
      } catch {
        /* ignore */
      }
      hlsRef.current = null;
    }
  }, []);

  const setLevel = useCallback(
    (id: number) => {
      setSelectedLevelId(id);
      const hls = hlsRef.current;
      if (!hls) return;
      if (id === AUTO_QUALITY_ID) {
        hls.currentLevel = -1;
      } else {
        const idx = levels.findIndex((l) => l.id === id);
        if (idx >= 0) hls.currentLevel = idx;
      }
    },
    [levels]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setIsReady(false);
      setLevels([]);
      return;
    }

    let cancelled = false;
    destroy();
    setLevels([]);
    setSelectedLevelId(AUTO_QUALITY_ID);
    setActiveLevelId(AUTO_QUALITY_ID);
    setIsReady(false);

    const attachNative = () => {
      if (video.src !== src) {
        video.src = src;
        video.load();
      }
      setIsReady(true);
    };

    if (method === 'direct') {
      attachNative();
      return () => {
        cancelled = true;
      };
    }

    // HLS: prefer native support (Safari), otherwise MSE via hls.js.
    if (isNativeHls(video)) {
      attachNative();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const { default: Hls } = await import('hls.js');
        if (cancelled || !Hls.isSupported()) {
          // No MSE at all — fall back to native assignment and hope the browser
          // can play the direct stream.
          attachNative();
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startFragPrefetch: true,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
        });
        hlsRef.current = hls;
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          if (cancelled) return;
          const mapped: QualityLevel[] = [
            { id: AUTO_QUALITY_ID, label: 'Auto' },
            ...data.levels.map((lvl, i) => ({
              id: i,
              label: lvl.height ? `${lvl.height}p` : `Level ${i + 1}`,
              height: lvl.height,
              bitrate: lvl.bitrate,
            })),
          ];
          setLevels(mapped);
          setIsReady(true);
          hls.startLoad();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          if (!cancelled) setActiveLevelId(data.level);
        });

        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (cancelled) return;
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            setIsRecovering(true);
            hls.recoverMediaError();
            return;
          }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // One retry, then surface.
            if (!hlsRef.current) return;
            hls.startLoad();
            return;
          }
          destroy();
          onFatalError?.(data.details ?? 'Playback failed');
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => setIsRecovering(false));
      } catch (err) {
        if (!cancelled) {
          onFatalError?.(err instanceof Error ? err.message : 'Could not initialise HLS playback');
        }
      }
    })();

    return () => {
      cancelled = true;
      destroy();
    };
  }, [src, method, videoRef, destroy, onFatalError]);

  return {
    levels,
    selectedLevelId,
    activeLevelId,
    setLevel,
    isReady,
    isRecovering,
  };
}
