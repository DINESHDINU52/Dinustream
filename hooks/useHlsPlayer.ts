'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Hls from 'hls.js';
import type { ErrorData, Level, ManifestParsedData } from 'hls.js';

/** One selectable rung of the adaptive ladder. */
export interface QualityLevel {
  /** hls.js level index, or -1 for automatic. */
  id: number;
  /** e.g. `1080p`, or `Auto`. */
  label: string;
  height?: number;
  bitrate?: number;
}

export const AUTO_QUALITY_ID = -1;

export interface UseHlsPlayerOptions {
  /** Resolved source URL. `null` while it is still being negotiated. */
  src: string | null;
  /** `hls` attaches hls.js; `direct` assigns the URL to the element. */
  method: 'hls' | 'direct';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Raised for unrecoverable failures, after hls.js has exhausted recovery. */
  onFatalError?: (message: string) => void;
}

export interface UseHlsPlayerResult {
  levels: QualityLevel[];
  /** Currently selected level id (`-1` = auto). */
  selectedLevelId: number;
  /** Level actually being played — differs from the selection while on auto. */
  activeLevelId: number;
  setLevel: (id: number) => void;
  isReady: boolean;
  /** True while hls.js is recovering from a network or media error. */
  isRecovering: boolean;
}

function labelForLevel(level: Level): string {
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
  return 'Unknown';
}

/**
 * Attach an adaptive HLS stream to a video element.
 *
 * Three playback paths, in preference order:
 *
 *  1. **Native HLS** (Safari, iOS). Assigning an `.m3u8` to `video.src` gives
 *     hardware-accelerated HEVC and AirPlay, neither of which MSE can offer.
 *     hls.js is deliberately not used here even though it would work.
 *  2. **hls.js via MSE** (Chrome, Firefox, Edge), which also exposes the level
 *     ladder that the quality menu needs.
 *  3. **Direct assignment** for progressive direct-play sources.
 *
 * Error handling is explicit because this is the layer that used to fail
 * silently: a dead stream previously left a black rectangle with no message.
 */
export function useHlsPlayer({
  src,
  method,
  videoRef,
  onFatalError,
}: UseHlsPlayerOptions): UseHlsPlayerResult {
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(AUTO_QUALITY_ID);
  const [activeLevelId, setActiveLevelId] = useState<number>(AUTO_QUALITY_ID);
  const [isReady, setIsReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  /* Kept in a ref so the effect below does not need it as a dependency — a new
     callback identity must not tear down and rebuild the whole HLS pipeline. */
  const onFatalErrorRef = useRef(onFatalError);
  useEffect(() => {
    onFatalErrorRef.current = onFatalError;
  }, [onFatalError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let hls: Hls | null = null;

    const cleanUp = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      hlsRef.current = null;
    };

    const attach = async () => {
      // Progressive / direct play: nothing to negotiate.
      if (method === 'direct') {
        video.src = src;
        if (!cancelled) {
          setLevels([]);
          setIsReady(true);
        }
        return;
      }

      const nativeHls =
        video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
        video.canPlayType('application/x-mpegURL') !== '';

      /*
        Prefer the platform player on Safari/iOS. MSE on those engines cannot
        decode HEVC and cannot hand off to AirPlay, so routing through hls.js
        would be a downgrade. The cost is that the level ladder is not
        introspectable — the menu falls back to Auto only, which is why
        `levels` is cleared here.
      */
      if (nativeHls) {
        video.src = src;
        if (!cancelled) {
          setLevels([]);
          setIsReady(true);
        }
        return;
      }

      // Dynamically imported so hls.js stays out of the initial page bundle.
      const { default: HlsCtor } = await import('hls.js');
      if (cancelled) return;

      if (!HlsCtor.isSupported()) {
        onFatalErrorRef.current?.(
          'This browser cannot play adaptive streams. Try Chrome, Edge, Firefox or Safari.'
        );
        return;
      }

      hls = new HlsCtor({
        // Keep a modest forward buffer: Jellyfin transcodes on demand, so
        // buffering far ahead just burns server CPU on video that may be skipped.
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        // Start conservatively, then let ABR climb. Opening on the top rung is
        // the classic cause of a stall in the first few seconds.
        startLevel: -1,
        capLevelToPlayerSize: true,
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.on(HlsCtor.Events.MANIFEST_PARSED, (_evt, data: ManifestParsedData) => {
        if (cancelled) return;
        setLevels(
          data.levels.map((level, index) => ({
            id: index,
            label: labelForLevel(level),
            height: level.height,
            bitrate: level.bitrate,
          }))
        );
        setIsReady(true);
      });

      hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_evt, data) => {
        if (!cancelled) setActiveLevelId(data.level);
      });

      hls.on(HlsCtor.Events.ERROR, (_evt, data: ErrorData) => {
        if (cancelled) return;

        if (!data.fatal) {
          // Non-fatal errors are routine (a single 404 segment, a gap in the
          // buffer); hls.js retries them itself.
          return;
        }

        switch (data.type) {
          case HlsCtor.ErrorTypes.NETWORK_ERROR:
            /*
              Jellyfin returns 404 for a segment that its transcoder has not
              produced yet. Reloading the playlist picks up the newly written
              segments, so this is recoverable and common on a fresh seek.
            */
            setIsRecovering(true);
            hls?.startLoad();
            break;

          case HlsCtor.ErrorTypes.MEDIA_ERROR:
            setIsRecovering(true);
            hls?.recoverMediaError();
            break;

          default:
            setIsRecovering(false);
            onFatalErrorRef.current?.(
              data.reason || data.details || 'Playback failed and could not be recovered.'
            );
            cleanUp();
        }
      });

      hls.on(HlsCtor.Events.FRAG_BUFFERED, () => {
        if (!cancelled) setIsRecovering(false);
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    };

    void attach();

    return () => {
      cancelled = true;
      cleanUp();
      // Release the element so a stale source cannot keep downloading.
      video.removeAttribute('src');
      video.load();
    };
  }, [src, method, videoRef]);

  /**
   * Select a rung, or `-1` for automatic.
   *
   * `nextLevel` is used rather than `currentLevel`: it switches at the next
   * segment boundary instead of flushing the buffer, so the picture does not
   * blink when the viewer changes quality.
   */
  const setLevel = useCallback((id: number) => {
    setSelectedLevelId(id);
    const hls = hlsRef.current;
    if (!hls) return;
    hls.nextLevel = id;
  }, []);

  /** Auto plus every discovered rung, highest quality first. */
  const qualityOptions = useMemo<QualityLevel[]>(() => {
    if (levels.length === 0) return [];
    const sorted = [...levels].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
    return [{ id: AUTO_QUALITY_ID, label: 'Auto' }, ...sorted];
  }, [levels]);

  return {
    levels: qualityOptions,
    selectedLevelId,
    activeLevelId,
    setLevel,
    isReady,
    isRecovering,
  };
}
