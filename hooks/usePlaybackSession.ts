'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { jfFetch, jfUrl, getJellyfinBaseUrl, TICKS_PER_SECOND } from '@/lib/jellyfin/client';
import { buildDeviceProfile } from '@/lib/player/deviceProfile';
import { JellyfinPlaybackInfoResponse, JellyfinMediaSource, JellyfinMediaStream, JellyfinBaseItem } from '@/lib/jellyfin/types';

export interface SubtitleTrackOption {
  index: number;
  label: string;
  language?: string;
  src?: string;
  isDefault?: boolean;
}

export interface AudioTrackOption {
  index: number;
  label: string;
  language?: string;
  isDefault?: boolean;
}

export const SUBTITLES_OFF = -1;

export interface UsePlaybackSessionOptions {
  itemId: string | undefined;
  externalUrl?: string;
  enabled?: boolean;
}

export interface UsePlaybackSessionResult {
  source: {
    url: string;
    method: 'direct' | 'hls';
    directPlay: boolean;
    playSessionId: string;
    transcodingUrl?: string;
    transcodeReasons?: string[];
  } | null;
  isResolving: boolean;
  resolveError: string | null;
  resumeSeconds: number;
  reload: () => void;
  audioTracks: AudioTrackOption[];
  selectedAudioIndex: number | undefined;
  setAudioTrack: (index: number) => void;
  selectAudioTrack: (index: number) => void;
  subtitleTracks: SubtitleTrackOption[];
  selectedSubtitleIndex: number;
  setSubtitleTrack: (index: number) => void;
  selectSubtitle: (index: number) => void;
  selectedSubtitleSrc: string | null;
  reportProgress: (positionSeconds: number, isPaused: boolean) => void;
  reportStart: (positionSeconds: number) => void;
  reportStop: (positionSeconds: number) => void;
  notifyStarted: (positionSeconds: number) => void;
  notifyProgress: (positionSeconds: number, isPaused: boolean) => void;
}

function isTextSubtitle(stream: JellyfinMediaStream): boolean {
  // Only Encode (burn-in) subtitles lack a fetchable text URL.
  return stream.DeliveryMethod !== 'Encode';
}

export function usePlaybackSession(options: UsePlaybackSessionOptions): UsePlaybackSessionResult {
  const { itemId, externalUrl, enabled = true } = options;

  const [source, setSource] = useState<UsePlaybackSessionResult['source'] | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackOption[]>([]);
  const [selectedAudioIndex, setAudioIndexState] = useState<number | undefined>(undefined);
  const [selectedSubtitleIndex, setSubtitleIndexState] = useState<number>(SUBTITLES_OFF);
  const [reloadCounter, setReloadCounter] = useState(0);

  // Overrides for re-negotiation (audio/subtitle switch).
  const audioIndexRef = useRef<number | undefined>(undefined);
  const subtitleIndexRef = useRef<number>(SUBTITLES_OFF);

  const mediaSourceRef = useRef<JellyfinMediaSource | null>(null);
  const playSessionIdRef = useRef<string>(`dinustream-${crypto?.randomUUID?.() ?? 'session'}`);
  const lastReportedRef = useRef<{ ticks: number; at: number }>({ ticks: 0, at: 0 });

  const setAudioTrack = useCallback((index: number) => {
    audioIndexRef.current = index;
    setAudioIndexState(index);
    setReloadCounter((c) => c + 1);
  }, []);

  const setSubtitleTrack = useCallback((index: number) => {
    subtitleIndexRef.current = index;
    setSubtitleIndexState(index);
    setReloadCounter((c) => c + 1);
  }, []);

  const reload = useCallback(() => setReloadCounter((c) => c + 1), []);

  useEffect(() => {
    if (!enabled) return;
    if (!itemId) {
      setSource(null);
      return;
    }

    if (externalUrl) {
      // Curated/demo item: bypass negotiation entirely.
      setSource({
        url: externalUrl,
        method: 'direct',
        directPlay: true,
        playSessionId: playSessionIdRef.current,
      });
      setResumeSeconds(0);
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsResolving(true);
      setResolveError(null);
      try {
        // Cap the transcode ladder so a small VM (1 OCPU) can keep up. Defaults
        // to 20 Mbps; set NEXT_PUBLIC_DEFAULT_MAX_BITRATE lower (e.g. 8-10 Mbps
        // ≈ 1080p) on constrained hosts for smoother streaming.
        const maxBitrate = Number(process.env.NEXT_PUBLIC_DEFAULT_MAX_BITRATE) || undefined;
        const deviceProfile = buildDeviceProfile(maxBitrate ? { maxBitrate } : undefined);
        const audioIndex = audioIndexRef.current;
        const subtitleIndex = subtitleIndexRef.current;

        const [info, item] = await Promise.all([
          jfFetch<JellyfinPlaybackInfoResponse>(`/Items/${itemId}/PlaybackInfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              DeviceProfile: deviceProfile,
              AudioStreamIndex: audioIndex ?? null,
              SubtitleStreamIndex: subtitleIndex !== SUBTITLES_OFF ? subtitleIndex : null,
              MaxStreamingBitrate: null,
              StartTimeTicks: 0,
              EnableDirectPlay: true,
              EnableDirectStream: true,
              EnableTranscoding: true,
            }),
          }).catch(() => null),
          jfFetch<JellyfinBaseItem>(`/Items/${itemId}`).catch(() => null),
        ]);

        if (cancelled) return;

        const mediaSource = info?.MediaSources?.[0] ?? null;
        if (!mediaSource) {
          setSource(null);
          setResolveError('No playable media source was returned by the server.');
          return;
        }

        mediaSourceRef.current = mediaSource;
        if (info?.PlaySessionId) playSessionIdRef.current = info.PlaySessionId;

        const streams = mediaSource.MediaStreams ?? [];
        const audio = streams
          .filter((s) => s.Type === 'Audio')
          .map((s) => ({
            index: s.Index ?? 0,
            label: s.DisplayTitle ?? s.Language ?? `Audio ${(s.Index ?? 0) + 1}`,
            language: s.Language,
            isDefault: s.IsDefault,
          }));
        const subs = streams
          .filter((s) => s.Type === 'Subtitle')
          .map((s) => ({
            index: s.Index ?? 0,
            label: s.DisplayTitle ?? s.Language ?? `Subtitle ${(s.Index ?? 0) + 1}`,
            language: s.Language,
            isDefault: s.IsDefault,
            src: isTextSubtitle(s)
              ? jfUrl(`/Videos/${itemId}/${mediaSource.Id}/Subtitles/${s.Index}/Stream.vtt`)
              : undefined,
          }));

        setAudioTracks(audio);
        setSubtitleTracks(subs);

        // Default audio track selection.
        if (audioIndexRef.current === undefined) {
          const defaultIndex = mediaSource.DefaultAudioStreamIndex ?? audio[0]?.index ?? 0;
          setAudioIndexState(defaultIndex);
          audioIndexRef.current = defaultIndex;
        }

        let url: string;
        let method: 'direct' | 'hls';
        let directPlay: boolean;
        let transcodingUrl: string | undefined;
        const transcodeReasons = mediaSource.TranscodingUrl ? ['Container or codec requires transcoding'] : [];

        if (mediaSource.TranscodingUrl) {
          method = 'hls';
          directPlay = false;
          transcodingUrl = mediaSource.TranscodingUrl;
          url = getJellyfinBaseUrl() + mediaSource.TranscodingUrl;
        } else {
          method = 'direct';
          directPlay = Boolean(mediaSource.SupportsDirectPlay);
          url = jfUrl(
            `/Videos/${itemId}/stream?Static=true&MediaSourceId=${mediaSource.Id}`
          );
        }

        setSource({
          url,
          method,
          directPlay,
          playSessionId: playSessionIdRef.current,
          transcodingUrl,
          transcodeReasons,
        });

        const positionTicks = item?.UserData?.PlaybackPositionTicks ?? 0;
        setResumeSeconds(Math.round(positionTicks / TICKS_PER_SECOND));
      } catch (err) {
        if (!cancelled) {
          setSource(null);
          setResolveError(err instanceof Error ? err.message : 'Failed to negotiate playback');
        }
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId, externalUrl, enabled, reloadCounter]);

  // -------------------------------------------------------------------------
  // Playstate reporting (debounced progress, immediate start/stop)
  // -------------------------------------------------------------------------
  const postPlaystate = useCallback(
    (path: string, body: Record<string, unknown>) => {
      const ms = mediaSourceRef.current;
      if (!itemId) return;
      jfFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ItemId: itemId,
          MediaSourceId: ms?.Id ?? null,
          PlaySessionId: playSessionIdRef.current,
          PlayMethod: source?.method === 'hls' ? 'Transcode' : 'DirectPlay',
          ...body,
        }),
      }).catch(() => {});
    },
    [itemId, source?.method]
  );

  const reportStart = useCallback(
    (positionSeconds: number) => {
      postPlaystate('/Sessions/Playing', {
        PositionTicks: Math.round(positionSeconds * TICKS_PER_SECOND),
        CanSeek: true,
        IsPaused: false,
      });
    },
    [postPlaystate]
  );

  const reportStop = useCallback(
    (positionSeconds: number) => {
      postPlaystate('/Sessions/Playing/Stopped', {
        PositionTicks: Math.round(positionSeconds * TICKS_PER_SECOND),
      });
    },
    [postPlaystate]
  );

  const reportProgress = useCallback(
    (positionSeconds: number, isPaused: boolean) => {
      const ticks = Math.round(positionSeconds * TICKS_PER_SECOND);
      const now = Date.now();
      const last = lastReportedRef.current;
      // Throttle to once per 5s, always flush on pause.
      if (!isPaused && now - last.at < 5000) return;
      lastReportedRef.current = { ticks, at: now };
      postPlaystate('/Sessions/Playing/Progress', {
        PositionTicks: ticks,
        IsPaused: isPaused,
        EventName: 'timeupdate',
      });
    },
    [postPlaystate]
  );

  const selectedSubtitleSrc = useMemo(() => {
    const track = subtitleTracks.find((t) => t.index === selectedSubtitleIndex);
    return track?.src ?? null;
  }, [subtitleTracks, selectedSubtitleIndex]);

  return {
    source,
    isResolving,
    resolveError,
    resumeSeconds,
    reload,
    audioTracks,
    selectedAudioIndex,
    setAudioTrack,
    selectAudioTrack: setAudioTrack,
    subtitleTracks,
    selectedSubtitleIndex,
    setSubtitleTrack,
    selectSubtitle: setSubtitleTrack,
    selectedSubtitleSrc,
    reportProgress,
    reportStart,
    reportStop,
    notifyStarted: reportStart,
    notifyProgress: reportProgress,
  };
}
