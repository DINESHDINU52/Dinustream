'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  reportPlaybackProgress,
  reportPlaybackStart,
  reportPlaybackStopped,
} from '@/lib/api/jellyfin';
import {
  ResolvedStreamSource,
  buildFallbackSource,
  buildSubtitleUrl,
  getDeviceId,
  resolveStreamSource,
} from '@/lib/player/streamSource';

/** A subtitle track the viewer can select. */
export interface SubtitleTrackOption {
  /** Jellyfin stream index, or `-1` for Off. */
  index: number;
  label: string;
  language?: string;
  /** WebVTT URL, absent for burned-in (bitmap) tracks and for Off. */
  src?: string;
  isDefault?: boolean;
}

/** An audio track the viewer can select. */
export interface AudioTrackOption {
  index: number;
  label: string;
  language?: string;
  isDefault?: boolean;
}

export const SUBTITLES_OFF = -1;

/** How often to report position to Jellyfin while playing. */
const PROGRESS_REPORT_INTERVAL_MS = 10_000;

/** Bitmap subtitle codecs cannot become text, so they are burned into the video. */
const BITMAP_SUBTITLE_CODECS = new Set(['pgssub', 'pgs', 'dvdsub', 'dvbsub', 'dvb_subtitle', 'xsub']);

export interface UsePlaybackSessionOptions {
  /** The Jellyfin item being played (episode id for series). */
  itemId: string | undefined;
  /** Skip everything when the item already carries a direct video URL. */
  externalUrl?: string;
  enabled?: boolean;
}

export interface UsePlaybackSessionResult {
  source: ResolvedStreamSource | null;
  isResolving: boolean;
  resolveError: string | null;
  /** Re-negotiate, e.g. after switching audio track. */
  reload: () => void;

  audioTracks: AudioTrackOption[];
  selectedAudioIndex: number | undefined;
  selectAudioTrack: (index: number) => void;

  subtitleTracks: SubtitleTrackOption[];
  selectedSubtitleIndex: number;
  selectSubtitle: (index: number) => void;

  /** Server-side resume position in seconds (0 when none). */
  resumeSeconds: number;

  /** Progress reporting — call these from the player's transport. */
  notifyStarted: (positionSeconds: number) => void;
  notifyProgress: (positionSeconds: number, isPaused: boolean) => void;
  notifyStopped: (positionSeconds: number) => void;
}

const secondsToTicks = (seconds: number) => Math.max(0, Math.floor(seconds * 10_000_000));

/**
 * Owns everything that has to be negotiated with Jellyfin for one playback:
 * which stream URL to use, which audio/subtitle tracks exist, where to resume
 * from, and reporting position back.
 *
 * It lives outside CinemaPlayer because all four are coupled — changing the
 * audio track requires a new transcode, which means a new source URL, a new
 * play session id, and therefore new progress reports against that id.
 */
export function usePlaybackSession({
  itemId,
  externalUrl,
  enabled = true,
}: UsePlaybackSessionOptions): UsePlaybackSessionResult {
  const [negotiated, setNegotiated] = useState<ResolvedStreamSource | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(SUBTITLES_OFF);
  const [resumeSeconds, setResumeSeconds] = useState(0);

  const deviceId = useMemo(() => getDeviceId(), []);

  /**
   * The source to expose.
   *
   * Derived rather than stored so that disabling the hook, or an item that
   * carries its own URL, resolves to `null` without writing state from an effect.
   */
  const source = enabled && itemId && !externalUrl ? negotiated : null;

  /* Latest source in a ref so the progress reporters and the unmount cleanup can
     read it without being re-created on every negotiation. */
  const sourceRef = useRef<ResolvedStreamSource | null>(null);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const lastReportRef = useRef(0);
  const hasStartedRef = useRef(false);

  /*
    Negotiate the stream.

    Re-runs when the item, the chosen audio track, or `reloadToken` changes.
    Notably it does NOT re-run when the subtitle selection changes: external VTT
    tracks are attached client-side, so switching them must not restart the
    transcode. Burned-in tracks are the exception and are handled by an explicit
    `reload()` from the caller.
  */
  useEffect(() => {
    // Nothing to negotiate. Deliberately does not clear `source` from the effect
    // body — that is a cascading render; the exported value is derived instead.
    if (!enabled || !itemId || externalUrl) return;

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsResolving(true);
      setResolveError(null);

      try {
        const resolved = await resolveStreamSource(itemId, {
          deviceId,
          audioStreamIndex: selectedAudioIndex,
        });
        if (cancelled) return;
        setNegotiated(resolved);
      } catch (err) {
        if (cancelled) return;
        console.error('[PlaybackSession] Stream negotiation failed:', err);
        /*
          Fall back to direct play rather than showing nothing. An MP4 will often
          still work, and if it does not the player's error surface reports it —
          which is strictly better than the previous silent black frame.
        */
        setNegotiated(buildFallbackSource(itemId, deviceId));
        setResolveError(
          err instanceof Error ? err.message : 'Could not negotiate a stream with the media server'
        );
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, itemId, externalUrl, deviceId, selectedAudioIndex, reloadToken]);

  /* Server-side resume position. */
  useEffect(() => {
    if (!enabled || !itemId) return;
    let cancelled = false;

    void fetch(`/api/jellyfin/items/${encodeURIComponent(itemId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((item) => {
        if (cancelled || !item) return;
        const ticks = item?.UserData?.PlaybackPositionTicks ?? 0;
        setResumeSeconds(Math.floor(ticks / 10_000_000));
      })
      .catch(() => {
        /* No resume information available. */
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, itemId]);

  /** Derive the selectable audio tracks from the negotiated source. */
  const audioTracks = useMemo<AudioTrackOption[]>(() => {
    const streams = source?.mediaStreams ?? [];
    return streams
      .filter((s) => s.Type === 'Audio')
      .map((s) => ({
        index: s.Index,
        label: s.DisplayTitle || s.Title || s.Language?.toUpperCase() || `Audio ${s.Index}`,
        language: s.Language,
        isDefault: s.IsDefault,
      }));
  }, [source]);

  /**
   * Subtitle options, always led by Off.
   *
   * Text-based tracks get a WebVTT URL that becomes a `<track>` element. Bitmap
   * tracks (PGS on Blu-ray rips, DVBSUB on broadcast captures) have no text to
   * extract, so they carry no `src` — the player marks them as requiring a
   * restart and re-negotiates with Jellyfin burning them into the picture.
   */
  const subtitleTracks = useMemo<SubtitleTrackOption[]>(() => {
    const off: SubtitleTrackOption = { index: SUBTITLES_OFF, label: 'Off' };
    if (!source || !itemId) return [off];

    const tracks = source.mediaStreams
      .filter((s) => s.Type === 'Subtitle')
      .map<SubtitleTrackOption>((s) => {
        const codec = (s.Codec || '').toLowerCase();
        const isBitmap = BITMAP_SUBTITLE_CODECS.has(codec);
        return {
          index: s.Index,
          label: s.DisplayTitle || s.Title || s.Language?.toUpperCase() || `Subtitle ${s.Index}`,
          language: s.Language,
          isDefault: s.IsDefault,
          src: isBitmap ? undefined : buildSubtitleUrl(itemId, source.mediaSourceId, s.Index),
        };
      });

    return [off, ...tracks];
  }, [source, itemId]);

  const selectAudioTrack = useCallback((index: number) => {
    // Triggers re-negotiation: a different audio track is a different transcode.
    setSelectedAudioIndex(index);
  }, []);

  const selectSubtitle = useCallback((index: number) => {
    setSelectedSubtitleIndex(index);
  }, []);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const notifyStarted = useCallback(
    (positionSeconds: number) => {
      const current = sourceRef.current;
      if (!itemId || !current || hasStartedRef.current) return;
      hasStartedRef.current = true;
      void reportPlaybackStart({
        itemId,
        positionTicks: secondsToTicks(positionSeconds),
        playSessionId: current.playSessionId,
        mediaSourceId: current.mediaSourceId,
        audioStreamIndex: selectedAudioIndex,
        subtitleStreamIndex: selectedSubtitleIndex >= 0 ? selectedSubtitleIndex : undefined,
      });
    },
    [itemId, selectedAudioIndex, selectedSubtitleIndex]
  );

  const notifyProgress = useCallback(
    (positionSeconds: number, isPaused: boolean) => {
      const current = sourceRef.current;
      if (!itemId || !current) return;

      // Throttled: `timeupdate` fires ~4x/second and Jellyfin does not need that.
      const now = Date.now();
      if (!isPaused && now - lastReportRef.current < PROGRESS_REPORT_INTERVAL_MS) return;
      lastReportRef.current = now;

      void reportPlaybackProgress(
        itemId,
        secondsToTicks(positionSeconds),
        isPaused,
        current.playSessionId,
        current.mediaSourceId
      );
    },
    [itemId]
  );

  const notifyStopped = useCallback(
    (positionSeconds: number) => {
      const current = sourceRef.current;
      if (!itemId || !current) return;
      hasStartedRef.current = false;
      void reportPlaybackStopped(itemId, secondsToTicks(positionSeconds), current.playSessionId);
    },
    [itemId]
  );

  /*
    Tear the server-side session down on unmount.

    Read from refs because this must run exactly once, at unmount, with whatever
    the final position was — adding them as dependencies would fire a "stopped"
    report on every position change.
  */
  const finalPositionRef = useRef(0);
  const notifyStoppedRef = useRef(notifyStopped);
  useEffect(() => {
    notifyStoppedRef.current = notifyStopped;
  }, [notifyStopped]);

  useEffect(() => {
    return () => {
      notifyStoppedRef.current(finalPositionRef.current);
    };
  }, []);

  /* Expose a setter for the latest position without causing renders. */
  const trackFinalPosition = useCallback((positionSeconds: number) => {
    finalPositionRef.current = positionSeconds;
  }, []);

  const notifyProgressAndTrack = useCallback(
    (positionSeconds: number, isPaused: boolean) => {
      trackFinalPosition(positionSeconds);
      notifyProgress(positionSeconds, isPaused);
    },
    [notifyProgress, trackFinalPosition]
  );

  return {
    source,
    isResolving,
    resolveError,
    reload,
    audioTracks,
    selectedAudioIndex,
    selectAudioTrack,
    subtitleTracks,
    selectedSubtitleIndex,
    selectSubtitle,
    resumeSeconds,
    notifyStarted,
    notifyProgress: notifyProgressAndTrack,
    notifyStopped,
  };
}
