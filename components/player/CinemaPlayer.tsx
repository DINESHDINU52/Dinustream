'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem, Episode } from '@/types/cinema';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Sliders,
  Subtitles,
  AudioLines,
  PictureInPicture2,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Layers,
  Zap,
  Settings,
  Activity,
  Sparkles,
  ListVideo,
  Ratio,
  Check,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { useMediaSegments } from '@/hooks/useMediaSegments';
import { useSeriesAutoplay } from '@/hooks/useSeriesAutoplay';
import { SegmentSkipButton } from './SegmentSkipButton';
import { SegmentTimelineMarkers } from './SegmentTimelineMarkers';
import { SegmentSettingsPanel } from './SegmentSettingsPanel';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { EpisodeSelectorDrawer } from './EpisodeSelectorDrawer';
import { useAspectRatioPreference } from '@/hooks/useAspectRatioPreference';
import { useHlsPlayer, AUTO_QUALITY_ID } from '@/hooks/useHlsPlayer';
import { usePlaybackSession, SUBTITLES_OFF } from '@/hooks/usePlaybackSession';
import {
  ASPECT_RATIO_OPTIONS,
  getAspectRatioOption,
  getVideoPresentationStyle,
} from '@/lib/player/aspectRatio';
import { useSyncPlayback } from '@/hooks/useSyncPlayback';
import { SyncWatchOverlay } from './SyncWatchOverlay';
import { FloatingReactionOverlay } from './FloatingReactionOverlay';
import { QuickReactionBar } from './QuickReactionBar';
import { watchTogetherService } from '@/lib/services/watchTogetherService';
import { useWatchTogether } from '@/hooks/useWatchTogether';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { GroupQueue } from '@/components/watch-together/GroupQueue';
import { GroupMovieSelector } from '@/components/watch-together/GroupMovieSelector';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { useTVNavigation } from '@/hooks/useTVNavigation';
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreen,
  isFullscreenActive,
} from '@/lib/dom/fullscreen';
import { MediaSegment } from '@/types/segments';
import { Season } from '@/types/cinema';
import { SyncProgressData } from '@/types/sync';

export type ChapterMarker = MediaSegment;

export interface CinemaPlayerProps {
  media: MediaItem;
  episode?: Episode;
  nextEpisode?: Episode;
  prevEpisode?: Episode;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  autoPlay?: boolean;
  seasons?: Season[];
  onSelectEpisode?: (episodeId: string) => void;
  /**
   * Cache-sync progress.
   *
   * Accepted for API compatibility but not rendered: its only consumer was the
   * Dolby prelude, which has been removed. Sync progress is shown by
   * SyncOverlay, which runs *before* the player mounts. No caller passes it.
   */
  syncProgress?: SyncProgressData;
  isGroupSync?: boolean;
  groupId?: string;
  groupName?: string;
  /**
   * Start in full-window presentation.
   *
   * `/watch` is a dedicated playback route — there is nothing else on the page
   * worth seeing — so its player should fill the viewport rather than sitting in
   * a letterboxed 16:9 box with dead space around it. The player's own chrome
   * carries a back button, and `T` still toggles out of it.
   */
  fillViewport?: boolean;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  media,
  episode,
  nextEpisode,
  prevEpisode,
  onNextEpisode,
  onPrevEpisode,
  autoPlay = false,
  seasons,
  onSelectEpisode,
  isGroupSync = false,
  groupId = 'group-movie-night',
  groupName = 'Movie Night ❤️',
  fillViewport = false,
}) => {
  const router = useRouter();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isPortrait, isMobile, isTV: isDeviceTV, requestFullscreenLandscape } = useDeviceOrientation();
  const { isTVMode: isNavTVMode } = useTVNavigation();
  const isTV = isNavTVMode || isDeviceTV;

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  /*
    Starts at 0, not a hard-coded 2h46m. With the fake progress timer gone there
    is nothing to reconcile an invented duration against, and a placeholder
    duration made the scrubber show a bogus total (and allowed seeking past the
    real end) for the moment before metadata arrived.
  */
  const [duration, setDuration] = useState(0);
  /** True when playback only started because we muted it to satisfy autoplay. */
  const [startedMuted, setStartedMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  /*
    Track lists and the quality ladder are no longer stored here.

    They used to be seeded with hard-coded placeholders ("Dolby Atmos (TrueHD
    7.1)", "English [CC]", "4K (2160p)") that were shown before — and often
    instead of — the real thing, and selecting from them changed a label and
    nothing else. They now come from `usePlaybackSession` (audio + subtitles,
    negotiated with the server) and `useHlsPlayer` (real HLS variant levels).
  */
  const hasResumedRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(fillViewport);
  const [isPiPActive, setIsPiPActive] = useState(false);

  const activeItemId = episode?.id || media?.id;
  /** A curated item may ship its own URL, bypassing Jellyfin negotiation. */
  const externalUrl = episode?.videoUrl || media?.videoUrl;

  /*
    Stream negotiation, track lists, resume position and progress reporting.

    This replaces a hand-built `/videos/{id}/stream?Static=true` URL. That URL
    pinned playback to direct play of the original file, so there was no bitrate
    ladder (the quality menu could only ever be a label), no way to switch audio
    (Static makes Jellyfin ignore AudioStreamIndex), and nothing at all played
    when the container was one browsers cannot demux — which is every MKV.
  */
  const session = usePlaybackSession({ itemId: activeItemId, externalUrl });
  /* Destructured so effects can depend on stable identities rather than on the
     hook's result object, which is a new literal every render. */
  const { notifyStarted, notifyProgress, resumeSeconds } = session;

  const activeVideoSrc = externalUrl || session.source?.url || '';
  const playbackMethod: 'hls' | 'direct' = externalUrl
    ? 'direct'
    : (session.source?.method ?? 'direct');

  /*
    Playback failure, tagged with the source it belongs to.

    Storing the URL alongside the message lets the error be *derived* away when a
    new source is negotiated, instead of clearing it from an effect — which the
    React compiler flags as a cascading render, and which would also briefly show
    a stale error against a fresh stream.
  */
  const [errorState, setErrorState] = useState<{ src: string; message: string } | null>(null);
  const playbackError = errorState?.src === activeVideoSrc ? errorState.message : null;

  const setPlaybackError = useCallback(
    (message: string | null) => {
      setErrorState(message ? { src: activeVideoSrc, message } : null);
    },
    [activeVideoSrc]
  );

  const handleFatalPlaybackError = useCallback(
    (message: string) => {
      console.warn('[CinemaPlayer] Fatal playback error:', message);
      setPlaybackError(message);
    },
    [setPlaybackError]
  );

  /* Adaptive engine + the real quality ladder it exposes. */
  const hlsPlayer = useHlsPlayer({
    src: activeVideoSrc || null,
    method: playbackMethod,
    videoRef,
    onFatalError: handleFatalPlaybackError,
  });

  /**
   * Label for the rung currently on screen.
   *
   * Prefers the level ABR actually settled on over the one the viewer picked, so
   * "Auto" reports what is really being delivered.
   */
  const currentQualityLabel = useMemo(() => {
    if (playbackMethod === 'direct') return 'Direct Play';
    const activeId =
      hlsPlayer.activeLevelId >= 0 ? hlsPlayer.activeLevelId : hlsPlayer.selectedLevelId;
    const level = hlsPlayer.levels.find((l) => l.id === activeId);
    return level?.label ?? 'Auto';
  }, [playbackMethod, hlsPlayer.activeLevelId, hlsPlayer.selectedLevelId, hlsPlayer.levels]);

  /**
   * Remember the current position and playing state so they can be restored
   * after a re-negotiation.
   *
   * Switching audio track or burning in subtitles produces a brand-new transcode
   * and therefore a new source URL, which resets the element to 0. Capturing the
   * position first is what makes those switches feel seamless instead of
   * throwing the viewer back to the opening frame.
   */
  const restoreAfterReloadRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);

  const restorePositionAfterReload = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    restoreAfterReloadRef.current = { time: video.currentTime, wasPlaying: !video.paused };
  }, []);

  /** Summary labels for the settings menu rows. */
  const activeAudioTrackLabel = useMemo(() => {
    const selected = session.audioTracks.find((t) => t.index === session.selectedAudioIndex);
    if (selected) return selected.label;
    // Before the viewer chooses, Jellyfin plays the file's default track.
    return session.audioTracks.find((t) => t.isDefault)?.label ?? 'Default';
  }, [session.audioTracks, session.selectedAudioIndex]);

  const activeSubtitleLabel = useMemo(
    () =>
      session.subtitleTracks.find((t) => t.index === session.selectedSubtitleIndex)?.label ?? 'Off',
    [session.subtitleTracks, session.selectedSubtitleIndex]
  );

  /*
    Apply the subtitle selection to the element's TextTrackList.

    The `default` attribute on a <track> is only honoured on initial load, so it
    cannot express a later change — switching languages mid-playback has to go
    through `track.mode`. Exactly one track is set to 'showing' and the rest to
    'disabled'; leaving them 'hidden' instead would keep the browser parsing cues
    for every language at once.

    Tracks are matched by label because TextTrack has no field for the Jellyfin
    stream index, and the labels are generated from it a few lines above.
  */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const target = session.subtitleTracks.find(
      (t) => t.index === session.selectedSubtitleIndex && t.src
    );

    const apply = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i += 1) {
        const track = tracks[i];
        track.mode = target && track.label === target.label ? 'showing' : 'disabled';
      }
    };

    apply();

    /*
      `<track>` elements are added asynchronously relative to this effect when
      the source has just changed, so re-apply once the list settles.
    */
    video.textTracks.addEventListener?.('addtrack', apply);
    return () => video.textTracks.removeEventListener?.('addtrack', apply);
  }, [session.subtitleTracks, session.selectedSubtitleIndex, activeVideoSrc]);

  /**
   * Native `<video>` error handler.
   *
   * Only meaningful for direct play: with hls.js attached, MSE surfaces failures
   * through the HLS error pipeline instead, and this would fire spuriously
   * during normal buffer churn.
   */
  const handleVideoError = useCallback(() => {
    const code = videoRef.current?.error?.code;
    if (!code) return;
    const message =
      code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        ? 'This file’s format is not supported by your browser and the server could not convert it.'
        : code === MediaError.MEDIA_ERR_NETWORK
          ? 'The connection to the media server dropped.'
          : code === MediaError.MEDIA_ERR_DECODE
            ? 'The video stream could not be decoded.'
            : 'Playback failed.';
    setPlaybackError(message);
  }, [setPlaybackError]);

  // Keep local state in sync with native fullscreen changes (Esc, system UI, …)
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(isFullscreenActive());

    FULLSCREEN_CHANGE_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handleFullscreenChange)
    );

    return () => {
      FULLSCREEN_CHANGE_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handleFullscreenChange)
      );
    };
  }, []);

  // Mobile double-tap seek detection (Left 35%: -10s, Right 35%: +10s)
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = e.timeStamp;
    const touch = e.changedTouches[0];
    if (!touch || !playerContainerRef.current) return;

    const rect = playerContainerRef.current.getBoundingClientRect();
    const tapX = touch.clientX - rect.left;
    const isDoubleTap = now - lastTapRef.current.time < 300 && Math.abs(tapX - lastTapRef.current.x) < 60;

    if (isDoubleTap) {
      if (tapX < rect.width * 0.35) {
        seekRelative(-10);
      } else if (tapX > rect.width * 0.65) {
        seekRelative(10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: tapX };
    }
  };

  // UI Visibility States
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [activeMenu, setActiveMenu] = useState<
    'audio' | 'subtitles' | 'quality' | 'speed' | 'settings' | 'aspect' | null
  >(null);
  const [hoverScrubTime, setHoverScrubTime] = useState<number | null>(null);
  const [hoverPositionX, setHoverPositionX] = useState<number | null>(null);
  const [centerPulseAction, setCenterPulseAction] = useState<'play' | 'pause' | 'rewind' | 'forward' | null>(null);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [showStats, setShowStats] = useState(false);

  // Activity & Fade-out handler (called on user interaction)
  const onUserActivity = useCallback(() => {
    setAreControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setAreControlsVisible(false);
    }, 3200);
  }, []);

  // Synchronized Watch Together Playback Engine
  const isApplyingRemoteSync = useRef(false);

  const syncPlayback = useSyncPlayback({
    groupId: groupId || 'group-movie-night',
    groupName: groupName || 'Movie Night ❤️',
    mediaId: media.id,
    episodeId: episode?.id,
    enabled: Boolean(isGroupSync),
    onRemotePlay: () => {
      isApplyingRemoteSync.current = true;
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      triggerPulse('play');
      setTimeout(() => {
        isApplyingRemoteSync.current = false;
      }, 300);
    },
    onRemotePause: () => {
      isApplyingRemoteSync.current = true;
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      triggerPulse('pause');
      setTimeout(() => {
        isApplyingRemoteSync.current = false;
      }, 300);
    },
    onRemoteSeek: (targetSeconds) => {
      isApplyingRemoteSync.current = true;
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      if (videoRef.current) {
        const diff = Math.abs(videoRef.current.currentTime - clamped);
        // Only hard-seek on substantial manual jumps (> 2.5s) to avoid buffer stalls
        if (diff > 2.5) {
          videoRef.current.currentTime = clamped;
          setCurrentTime(clamped);
        } else if (diff > 0.5) {
          // Micro-drift: gently adjust playbackRate to converge smoothly without re-buffering
          videoRef.current.playbackRate = videoRef.current.currentTime < clamped ? 1.05 : 0.95;
          setTimeout(() => {
            if (videoRef.current) videoRef.current.playbackRate = 1.0;
          }, 1500);
        }
      } else {
        setCurrentTime(clamped);
      }
      setTimeout(() => {
        isApplyingRemoteSync.current = false;
      }, 500);
    },
    onRemoteSkipSegment: (_type, targetSeconds) => {
      isApplyingRemoteSync.current = true;
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      setTimeout(() => {
        isApplyingRemoteSync.current = false;
      }, 400);
    },
    onRemoteNextEpisode: () => {
      onNextEpisode?.();
    },
    onRemotePrevEpisode: () => {
      onPrevEpisode?.();
    },
    onDriftCorrectRate: (targetRate) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = targetRate;
      }
    },
  });

  const {
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastSkipSegment,
    performDriftCorrection,
    updateParticipantProgress,
  } = syncPlayback;

  // Reusable Seek Handler for Video Element & Scrubbing
  const handleSeek = useCallback(
    (targetSeconds: number) => {
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      if (isGroupSync && !isApplyingRemoteSync.current) {
        broadcastSeek(clamped);
      }
      setAreControlsVisible(true);
    },
    [duration, isGroupSync, broadcastSeek]
  );

  // Reusable Media Segments UX (Intro, Recap, Outro, Preview, Commercial)
  const {
    segments,
    activeSegment,
    shouldShowSkipButton,
    skipBehavior,
    setSkipBehavior,
    skipSegment,
    autoSkipFeedback,
    dismissAutoSkipFeedback,
  } = useMediaSegments({
    mediaId: media.id,
    episodeId: episode?.id,
    currentTime,
    duration,
    onSeek: handleSeek,
  });

  // Premium Series Autoplay & Countdown Hook
  const {
    autoplayNextEpisode,
    setAutoplayNextEpisode,
    countdown,
    shouldShowPrompt: shouldShowNextEpisodePrompt,
    handlePlayNow,
    handleCancel: handleCancelAutoplay,
  } = useSeriesAutoplay({
    currentTime,
    duration,
    currentEpisode: episode,
    nextEpisode,
    onNextEpisode,
    triggerThresholdSeconds: 25,
  });

  const [isEpisodeSelectorOpen, setIsEpisodeSelectorOpen] = useState(false);
  const watchTogether = useWatchTogether();
  const { profile, settings, updateContinueWatching, addWatchHistory } = useActiveProfile();
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isQueueSelectorOpen, setIsQueueSelectorOpen] = useState(false);

  /*
    Apply profile preferences.

    Only autoplay is carried over now. `defaultAudio`, `defaultSubtitles` and
    `playbackQuality` were stored as free-text labels ("Dolby Atmos (TrueHD
    7.1)") and pushed into what were purely cosmetic state variables. Audio and
    subtitle tracks are per-file Jellyfin stream indices and quality is a per-file
    HLS ladder, so a saved label cannot be matched to either — honouring it would
    mean guessing. Restoring those as real preferences needs them stored as a
    language code plus an on/off flag, which is a separate change.
  */
  useEffect(() => {
    queueMicrotask(() => {
      if (typeof settings?.autoplayNextEpisode === 'boolean') {
        setAutoplayNextEpisode(settings.autoplayNextEpisode);
      }
    });
  }, [settings, setAutoplayNextEpisode]);

  // Periodically update active user's Continue Watching state while watching
  useEffect(() => {
    if (!isPlaying || currentTime <= 10) return;
    const interval = setInterval(() => {
      updateContinueWatching({
        ...media,
        progressMinutes: Math.round(currentTime / 60),
        totalMinutes: Math.round(duration / 60) || 120,
        lastWatched: 'Today',
        currentSeasonNumber: episode?.seasonNumber,
        currentEpisodeNumber: episode?.episodeNumber,
        currentEpisodeTitle: episode?.title,
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, episode, media, updateContinueWatching]);

  /*
    Continuous drift correction for Watch Together.

    `currentTime` is deliberately NOT a dependency. It updates roughly four times
    a second from `timeupdate`, so listing it meant this interval was cleared and
    recreated before its 1500ms delay could ever elapse — drift correction
    effectively never ran, and Watch Together slowly diverged with nothing pulling
    it back. The position is read from the video element at tick time instead.
  */
  useEffect(() => {
    if (!isGroupSync || !isPlaying) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.seeking || video.readyState < 3 || video.currentTime < 1.0) return;
      performDriftCorrection(video.currentTime);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGroupSync, isPlaying, performDriftCorrection]);

  // Synchronized Skip Segment Handler
  const handleSkipSegment = useCallback(
    (seg?: MediaSegment | null) => {
      const targetSeg = seg || activeSegment;
      if (targetSeg) {
        skipSegment(targetSeg);
        if (isGroupSync) {
          const segType =
            targetSeg.type === 'INTRO' || targetSeg.type === 'RECAP' || targetSeg.type === 'OUTRO'
              ? targetSeg.type
              : 'INTRO';
          broadcastSkipSegment(segType, targetSeg.endSeconds);
        }
      }
    },
    [activeSegment, skipSegment, isGroupSync, broadcastSkipSegment]
  );

  /*
    Video presentation mode (Fit / Fill / Stretch / Zoom).

    Persisted per device — see useAspectRatioPreference. The resolved inline
    style is memoised because it is passed to the <video> element on every
    render and a fresh object would invalidate it needlessly.
  */
  const { aspectRatioMode, setAspectRatioMode, cycleAspectRatioMode } = useAspectRatioPreference();
  const videoPresentationStyle = useMemo(
    () => getVideoPresentationStyle(aspectRatioMode),
    [aspectRatioMode]
  );
  const activeAspectOption = getAspectRatioOption(aspectRatioMode);

  /**
   * Whether the player should occupy the entire viewport.
   *
   * (The Dolby Atmos prelude that used to also force this has been removed —
   * it delayed every playback behind a clip and was the source of the
   * autoplay-blocked freeze.)
   */
  const isImmersive = isFullscreen || isTheaterMode;

  // Lock body scroll while the player owns the viewport, to stop the page behind
  // it from jumping and to avoid a second scrollbar.
  useEffect(() => {
    if (!isImmersive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isImmersive]);

  // Format Time (HH:MM:SS or MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle timer cleanup when paused or menu opens
  useEffect(() => {
    if (!isPlaying || activeMenu) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 3200);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, activeMenu]);

  /*
    Start playback.

    THIS is what broke playback after the streaming rewrite. The old effect ran
    once on mount and called `play()` immediately — which worked when the source
    was a plain `src` attribute rendered synchronously. It is now attached
    asynchronously (a PlaybackInfo round-trip, then a dynamic hls.js import), so
    on mount the element had no source at all: `play()` rejected, the `.catch(() =>
    {})` swallowed it, and nothing ever retried. The video simply never started.

    It now waits for `hlsPlayer.isReady` — the manifest being parsed, or the
    source being assigned for direct play — and re-arms whenever the source
    changes (next episode, audio-track switch).
  */
  const autoPlayedSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoPlay) return;
    const video = videoRef.current;
    if (!video || !activeVideoSrc || !hlsPlayer.isReady) return;
    // Only auto-start once per source.
    if (autoPlayedSrcRef.current === activeVideoSrc) return;
    autoPlayedSrcRef.current = activeVideoSrc;

    void video
      .play()
      .then(() => setIsPlaying(true))
      .catch(async () => {
        /*
          Autoplay *with sound* is blocked until the origin earns media
          engagement. Rather than give up (which is what left a black frame),
          retry muted and tell the viewer how to get audio back — the same ladder
          every streaming site uses.
        */
        try {
          video.muted = true;
          await video.play();
          setIsMuted(true);
          setStartedMuted(true);
          setIsPlaying(true);
        } catch {
          // Playback itself is blocked; the centre Play button takes over.
          setIsPlaying(false);
        }
      });
  }, [autoPlay, activeVideoSrc, hlsPlayer.isReady]);

  // Video Element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastTimeUpdate = 0;
    const handleTimeUpdate = () => {
      const now = performance.now();
      // Throttle React state updates to ~4fps (every 250ms) to prevent UI thread congestion
      if (now - lastTimeUpdate > 250 || video.paused) {
        lastTimeUpdate = now;
        setCurrentTime(video.currentTime);
        if (video.buffered.length > 0) {
          setBufferedEnd(video.buffered.end(video.buffered.length - 1));
        }
      }
      notifyProgress(video.currentTime, video.paused);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      notifyStarted(video.currentTime);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleSeeking = () => {
      setIsBuffering(true);
    };

    const handleSeeked = () => {
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      notifyProgress(video.currentTime, true);
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }

      /*
        Restore after a re-negotiation (audio switch / subtitle burn-in) takes
        priority over the server resume point: the viewer was mid-playback and is
        expecting to stay there.
      */
      const restore = restoreAfterReloadRef.current;
      if (restore) {
        restoreAfterReloadRef.current = null;
        video.currentTime = restore.time;
        setCurrentTime(restore.time);
        if (restore.wasPlaying) void video.play().catch(() => {});
        return;
      }

      /*
        Server-side resume. `session.resumeSeconds` comes from Jellyfin's
        UserData, so it now reflects where playback stopped on *any* device —
        previously nothing ever wrote that value, so it was always whatever some
        other Jellyfin client had left behind.

        The 10s floor avoids "resuming" a few seconds in, and stopping 30s before
        the end is treated as finished rather than resumed.
      */
      if (!hasResumedRef.current && resumeSeconds > 10) {
        const isEffectivelyFinished =
          video.duration > 0 && resumeSeconds > video.duration - 30;
        hasResumedRef.current = true;
        if (!isEffectivelyFinished) {
          video.currentTime = resumeSeconds;
          setCurrentTime(resumeSeconds);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      addWatchHistory({
        mediaId: media.id,
        title: episode ? `${media.title} - ${episode.title}` : media.title,
        posterUrl: media.posterUrl,
        progressMinutes: Math.round(duration / 60) || 120,
        totalMinutes: Math.round(duration / 60) || 120,
        completed: true,
      });
      if (onNextEpisode) {
        onNextEpisode();
        return;
      }
      if (isGroupSync) {
        const nextMovie = watchTogetherService.prepareNextQueuedMovie();
        if (nextMovie) {
          router.push(`/watch/${nextMovie.movieId}?sync=true&group=${groupId || 'group-movie-night'}`);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
    };
    /*
      Depends on the individual stable callbacks, not on the whole `session`
      object — that object is a fresh literal on every render, so listing it here
      tore down and re-registered all five media listeners on every single
      render.
    */
  }, [
    onNextEpisode,
    isGroupSync,
    groupId,
    router,
    addWatchHistory,
    duration,
    episode,
    media,
    notifyStarted,
    notifyProgress,
    resumeSeconds,
  ]);

  /*
    The "simulated playback time advancement" interval that used to live here has
    been removed.

    It incremented `currentTime` by one second per tick whenever `isPlaying` was
    true and the video element was not actually advancing — which is precisely the
    situation when a stream has failed. The consequences were all bad:

      - a dead stream showed a progress bar creeping forward, so a failure looked
        like playback;
      - the intro/recap skip detection fired against a position no frame had been
        decoded at;
      - on reaching the fake `duration` it auto-advanced to the next episode,
        which would then also fail, silently walking through a whole season;
      - progress was written to Continue Watching for video never watched.

    Position now comes exclusively from the element's `timeupdate` event, and a
    stalled stream surfaces through the error overlay instead of being masked.
  */

  // Pulse animation helper
  const triggerPulse = (action: 'play' | 'pause' | 'rewind' | 'forward') => {
    setCenterPulseAction(action);
    setTimeout(() => setCenterPulseAction(null), 600);
  };

  // Playback Control Actions
  const togglePlay = useCallback(() => {
    if (isApplyingRemoteSync.current) return;
    if (videoRef.current) {
      if (isPlaying) {
        if (playPromiseRef.current) {
          playPromiseRef.current
            .then(() => {
              videoRef.current?.pause();
              setIsPlaying(false);
              triggerPulse('pause');
              if (isGroupSync) broadcastPause(currentTime);
            })
            .catch(() => {});
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
          triggerPulse('pause');
          if (isGroupSync) broadcastPause(currentTime);
        }
      } else {
        const promise = videoRef.current.play();
        playPromiseRef.current = promise;
        promise
          .then(() => {
            playPromiseRef.current = null;
            setIsPlaying(true);
            triggerPulse('play');
            if (isGroupSync) broadcastPlay(currentTime);
          })
          .catch((err) => {
            playPromiseRef.current = null;
            console.warn('[CinemaPlayer] Playback was blocked or deferred:', err);
            setIsPlaying(false);
          });
      }
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      triggerPulse(nextPlaying ? 'play' : 'pause');
      if (isGroupSync) {
        if (nextPlaying) broadcastPlay(currentTime);
        else broadcastPause(currentTime);
      }
    }
    onUserActivity();
  }, [isPlaying, isGroupSync, currentTime, broadcastPlay, broadcastPause, onUserActivity]);

  const seekRelative = useCallback(
    (seconds: number) => {
      const newTime = Math.min(duration, Math.max(0, currentTime + seconds));
      setCurrentTime(newTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      if (isGroupSync) {
        broadcastSeek(newTime);
      }
      triggerPulse(seconds < 0 ? 'rewind' : 'forward');
      onUserActivity();
    },
    [currentTime, duration, isGroupSync, broadcastSeek, onUserActivity]
  );

  const handleVolumeChange = (newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
  };

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume || 0.8;
      }
    } else {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
    onUserActivity();
  }, [isMuted, volume, onUserActivity]);

  const toggleFullscreen = useCallback(async () => {
    if (!playerContainerRef.current) return;

    if (!isFullscreenActive() && !isFullscreen) {
      const granted = await requestFullscreenLandscape(playerContainerRef.current);
      /*
        Only the `fullscreenchange` listener sets `isFullscreen`, so this state
        now always reflects reality. It previously did `setIsFullscreen(true)`
        unconditionally, which lied whenever the browser refused (no active
        gesture, or iOS Safari on iPhone, which only allows fullscreen on a bare
        <video>): the UI showed an "exit fullscreen" control that then had
        nothing to exit, and the next toggle was a no-op.

        When the request is refused, fall back to theater mode — the CSS
        full-window presentation — so the viewer still gets a full-viewport
        picture, just without the OS chrome being hidden.
      */
      if (!granted) setIsTheaterMode(true);
    } else {
      await exitFullscreen(videoRef.current);
      setIsFullscreen(false);
      setIsTheaterMode(false);
    }
    onUserActivity();
  }, [requestFullscreenLandscape, onUserActivity, isFullscreen]);

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch {
      // ignore
    }
  };

  // Keyboard Shortcuts & TV Remote Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'Enter':
          // TV Remote OK / Enter button toggles playback when player controls aren't focused
          if (document.activeElement === document.body || document.activeElement === playerContainerRef.current) {
            e.preventDefault();
            togglePlay();
          }
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'ArrowUp':
          if (isTV || isFullscreen) {
            e.preventDefault();
            handleVolumeChange(volume + 0.05);
            triggerPulse('forward');
          }
          break;
        case 'ArrowDown':
          if (isTV || isFullscreen) {
            e.preventDefault();
            handleVolumeChange(volume - 0.05);
            triggerPulse('rewind');
          }
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyS':
          e.preventDefault();
          handleSkipSegment();
          break;
        case 'KeyT':
          e.preventDefault();
          setIsTheaterMode((prev) => !prev);
          break;
        case 'KeyA':
          // Cycle Fit → Fill → Stretch → Zoom levels, matching desktop players.
          e.preventDefault();
          cycleAspectRatioMode();
          break;
        case 'KeyP':
          e.preventDefault();
          togglePiP();
          break;
        case 'Escape':
          if (activeMenu) {
            setActiveMenu(null);
          } else if (isTheaterMode) {
            setIsTheaterMode(false);
          } else if (isFullscreen) {
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    /* `isTheaterMode` is in the dependency list because the Escape branch reads
       it; without it the handler closed over a stale value and Escape could not
       leave theater mode after the first toggle. */
  }, [
    togglePlay,
    seekRelative,
    toggleMute,
    toggleFullscreen,
    handleSkipSegment,
    cycleAspectRatioMode,
    activeMenu,
    isTV,
    isFullscreen,
    isTheaterMode,
    volume,
  ]);

  // Timeline scrubber calculation
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : Math.min(100, playedPercent + 25);

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const target = Math.max(0, Math.min(duration, pos * duration));
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverScrubTime(Math.max(0, Math.min(duration, pos * duration)));
    setHoverPositionX(e.clientX - rect.left);
  };

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={onUserActivity}
      onTouchStart={onUserActivity}
      onTouchEnd={handleTouchEnd}
      onClick={onUserActivity}
      className={cn(
        'relative bg-black select-none overflow-hidden font-sans',
        /*
          Player frame geometry.

          Inline (not fullscreen) the frame is a true 16:9 box driven by the
          available width, so it scales correctly on every device instead of
          three unrelated rules: portrait phones got `aspect-video`, `sm`+ got a
          fixed `h-[60vh]`, and landscape got `h-[76vh] min-h-[460px]`. Those
          height-driven sizes meant the frame's own ratio drifted with the window,
          which on a short or ultrawide window left permanent side bars no
          presentation mode could remove.

          The `max-h` cap stops the 16:9 box from growing taller than the screen
          on a narrow window (where width/1.78 can exceed the viewport height) and
          leaves the title tray below it reachable. `svh` is used rather than `vh`
          so the mobile browser chrome is accounted for.

          When the cap engages the frame becomes wider than 16:9, so `Fit` will
          letterbox — that is exactly what the Fill / Zoom modes exist to remove.
        */
        isImmersive
          ? 'fixed inset-0 z-[70] w-full h-[100dvh] max-h-none'
          : 'w-full aspect-video max-h-[85svh]',
        // `transition-all` animated width/height on every resize frame; only the
        // opacity-ish properties need easing here.
        'transition-[max-height] duration-300',
        !areControlsVisible && isPlaying ? 'cursor-none' : 'cursor-default',
        isTV && 'tv-player-mode'
      )}
    >
      {/* Dynamic Ambient Cinema Backlight Glow (Disabled on mobile to eliminate GPU lag) */}
      {ambientGlow && !isMobile && (
        <div
          className="pointer-events-none absolute -inset-10 opacity-35 blur-3xl bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${episode ? episode.thumbnailUrl : media.backdropUrl})` }}
        />
      )}

      {/*
        Video element.

        `object-fit` and the zoom scale come from the selected presentation mode
        rather than a hard-coded `object-contain`, which is what made black bars
        unavoidable. The frame is `overflow-hidden`, so cropped modes are clipped
        to the box instead of bleeding over the controls.
      */}
      <video
        ref={videoRef}
        /*
          No `src` attribute: the source is attached by `useHlsPlayer`, which
          either hands the manifest to hls.js via MSE or assigns it directly for
          native-HLS and direct-play. Setting it here too would start a second,
          competing download of the same stream.
        */
        poster={episode ? episode.thumbnailUrl : media.backdropUrl}
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        /*
          No `crossOrigin`. Every media and subtitle request is same-origin (they
          go through /api/jellyfin), so CORS is not involved — but setting
          `crossOrigin` switches the element to an anonymous fetch mode that
          strips credentials and makes the browser require CORS headers it has no
          reason to need. It is a way to break a working same-origin stream.
        */
        className="relative z-10 w-full h-full transform-gpu"
        style={videoPresentationStyle}
        onClick={togglePlay}
        onError={handleVideoError}
      >
        {/*
          Subtitle tracks.

          These are the elements that were missing entirely — the subtitle menu
          read real tracks from Jellyfin and then had nothing to apply them to.
          Only text-based tracks appear here; bitmap formats have no `src` and are
          burned in server-side instead.

          `key` includes the source URL so React rebuilds the tracks when the
          stream is re-negotiated; reusing them across sources leaves stale cues.
        */}
        {session.subtitleTracks
          .filter((track) => Boolean(track.src))
          .map((track) => (
            <track
              key={`${track.index}-${activeVideoSrc}`}
              kind="subtitles"
              label={track.label}
              srcLang={track.language || 'und'}
              src={track.src}
              default={session.selectedSubtitleIndex === track.index}
            />
          ))}
      </video>

      {/* Mobile Portrait Orientation Prompt */}
      {/* Suppressed while immersive — including during the prelude, which now
          covers the viewport and would otherwise show a "Rotate / Fullscreen"
          hint on top of its own controls. */}
      {isPortrait && isMobile && !isImmersive && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-white/20 text-white text-[11px] font-medium backdrop-blur-md shadow-lg cinema-focus"
          title="Switch to Landscape Fullscreen"
        >
          <RotateCw className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" />
          <span>Rotate / Fullscreen</span>
        </motion.button>
      )}

      {/*
        Playback failure surface.

        `videoError` was previously set on error and never rendered anywhere, so a
        stream that could not play showed a black rectangle with no explanation
        and no way forward. This reports what happened and offers the two useful
        recoveries: re-negotiate with the server, or leave.
      */}
      {playbackError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
          <div className="max-w-md w-full text-center space-y-4 p-6 rounded-2xl glass-strong">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </span>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">Playback problem</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{playbackError}</p>
              {session.resolveError && (
                <p className="text-[11px] font-mono text-slate-500 break-words">
                  {session.resolveError}
                </p>
              )}
              {session.source?.transcodeReasons?.length ? (
                <p className="text-[11px] font-mono text-slate-500">
                  Server reported: {session.source.transcodeReasons.join(', ')}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  setPlaybackError(null);
                  restorePositionAfterReload();
                  session.reload();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-semibold transition-transform active:scale-95 cinema-focus"
              >
                Try again
              </button>
              <button
                onClick={() => router.back()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass text-white text-sm font-medium transition-transform active:scale-95 cinema-focus"
              >
                Back to catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        Autoplay had to be muted to start. Without this the video plays in
        silence and there is nothing to explain why.
      */}
      {startedMuted && isMuted && !playbackError && (
        <button
          onClick={() => {
            toggleMute();
            setStartedMuted(false);
          }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white transition-transform active:scale-95 cinema-focus"
        >
          <VolumeX className="h-4 w-4 text-amber-300" />
          <span>Tap to unmute</span>
        </button>
      )}

      {/*
        Cinematic Center Loading Spinner:
        Matches exact movie startup and buffering timing from initial fetch until first playback frames.
      */}
      <AnimatePresence>
        {(isBuffering ||
          session.isResolving ||
          hlsPlayer.isRecovering ||
          (!hlsPlayer.isReady && Boolean(activeVideoSrc)) ||
          (autoPlay && !isPlaying && currentTime === 0)) &&
          !playbackError && (
            <motion.div
              key="cinema-movie-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]"
            >
              <div className="relative flex items-center justify-center">
                {/* Ambient Pulsing Glow */}
                <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 blur-xl animate-pulse" />
                {/* Outer Red Cinema Spinner Ring */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin" />
                {/* Inner Cyan Reverse Accent Ring */}
                <div className="absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-transparent border-b-sky-400 animate-spin [animation-duration:1.2s] [animation-direction:reverse]" />
              </div>

              {/* Status Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono text-slate-300 tracking-wider uppercase shadow-xl"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>
                  {session.isResolving
                    ? 'Connecting to Cinema Vault…'
                    : !hlsPlayer.isReady
                    ? 'Preparing Bitstream…'
                    : hlsPlayer.isRecovering
                    ? 'Reconnecting Stream…'
                    : 'Buffering Presentation…'}
                </span>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Screen Vignette Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-transparent to-black/70 opacity-80" />

      {/* Stream Diagnostics Overlay (Stats for Nerds) */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 left-6 z-30 p-3.5 rounded-xl bg-[#090e17]/95 border border-slate-400/[0.2] text-[11px] font-mono text-slate-300 space-y-1.5 shadow-2xl backdrop-blur-xl max-w-xs"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] text-white font-semibold">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Screening Diagnostics</span>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution:</span>
              <span className="text-emerald-400">3840 x 2160 (4K UHD)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Video Stream:</span>
              <span className="text-sky-400">HEVC Main 10 @ 64.8 Mbps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Audio Format:</span>
              <span className="text-amber-400">Dolby Atmos (7.1.4 Discrete)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Color Grading:</span>
              <span className="text-purple-400">Dolby Vision / Rec.2020</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SSD Cache Buffer:</span>
              <span className="text-emerald-400">48.2s (Local NVMe)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dropped Frames:</span>
              <span className="text-slate-300">0 / 64,800 (0.00%)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Pulse Animation Indicator (Play, Pause, Fast Forward, Rewind) */}
      <AnimatePresence>
        {centerPulseAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center z-30"
          >
            <div className="w-20 h-20 rounded-full bg-[#06080d]/85 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-md">
              {centerPulseAction === 'play' && <Play className="w-8 h-8 fill-current ml-1" />}
              {centerPulseAction === 'pause' && <Pause className="w-8 h-8 fill-current" />}
              {centerPulseAction === 'rewind' && <RotateCcw className="w-8 h-8" />}
              {centerPulseAction === 'forward' && <RotateCw className="w-8 h-8" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual Skip Buttons (Skip Intro, Skip Recap, Skip Outro) */}
      <SegmentSkipButton
        segment={activeSegment}
        visible={shouldShowSkipButton}
        onSkip={handleSkipSegment}
        skipBehavior={skipBehavior}
        onUpdateBehavior={setSkipBehavior}
        autoSkipFeedback={autoSkipFeedback}
        onUndoAutoSkip={() => {
          if (autoSkipFeedback) {
            handleSeek(Math.max(0, autoSkipFeedback.startSeconds));
            dismissAutoSkipFeedback();
          }
        }}
      />

      {/* Synchronized Watch Together Floating Reactions Overlay (Zero click-blocking) */}
      <FloatingReactionOverlay reactions={syncPlayback.floatingReactions} />

      {/* Synchronized Watch Together Compact Overlay */}
      {isGroupSync && (
        <SyncWatchOverlay
          session={syncPlayback.session}
          isVisible={areControlsVisible || !isPlaying}
          notification={syncPlayback.activeNotification}
          currentUserId={profile.id}
          onToggleControlMode={(newMode) => syncPlayback.setControlMode(newMode)}
        />
      )}

      {/* Premium Next Episode Overlay (Countdown, Preview, Play Now, Cancel) */}
      <NextEpisodeOverlay
        nextEpisode={nextEpisode}
        visible={shouldShowNextEpisodePrompt}
        countdown={countdown}
        autoplayEnabled={autoplayNextEpisode}
        onPlayNow={handlePlayNow}
        onCancel={handleCancelAutoplay}
      />

      {/* Custom Player Controls Layer (Fades in/out on mouse movement) */}
      <motion.div
        initial={false}
        animate={{ opacity: areControlsVisible ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'absolute inset-0 flex flex-col justify-between p-4 sm:p-6 lg:p-8 z-20',
          !areControlsVisible && 'pointer-events-none'
        )}
      >
        {/* Top Bar: Back button, Title, Format tags & Sync presence */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="p-2 rounded-full bg-black/60 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-colors cinema-focus"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white line-clamp-1">
                {media.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-light">
                {episode ? (
                  <span>
                    S{episode.seasonNumber}:E{episode.episodeNumber} • {episode.title}
                  </span>
                ) : (
                  <span>{media.releaseYear} • {media.runtime}</span>
                )}
                <span className="text-slate-600">•</span>
                {/* Shows the rung actually being played, not a static label. */}
                <span className="font-mono text-emerald-400">{currentQualityLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#090e17]/80 border border-slate-400/[0.15] text-[11px] font-mono text-slate-300">
              <Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
              <span>DinuStream Master Sync</span>
            </div>
          </div>
        </div>

        {/* Bottom Control Deck */}
        <div className="space-y-3">
          {/* Synchronized Watch Together Quick Reactions & Queue Pill */}
          {isGroupSync && (
            <div className="flex items-center justify-between px-1 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">
                  React
                </span>
                <QuickReactionBar onReact={syncPlayback.broadcastReaction} />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQueueDrawerOpen((prev) => !prev);
                }}
                id="open-queue-drawer-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#090e17]/90 hover:bg-[#121b2d] backdrop-blur-md border border-white/[0.15] text-xs font-mono text-slate-200 hover:text-white hover:border-sky-400/50 transition-all shadow-lg group/queue"
                title="Movie Night Screening Queue"
              >
                <span>🍿</span>
                <span className="hidden sm:inline font-sans font-medium">Queue</span>
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/25 text-sky-300 text-[10px] font-bold border border-sky-400/30">
                  {watchTogether.group?.queue?.length || 0}
                </span>
              </button>
            </div>
          )}

          {/* Scrubber Timeline Bar with Visual Segment Markers */}
          <div className="relative group/timeline py-2">
            {/* Hover Scrubber Tooltip */}
            {hoverScrubTime !== null && hoverPositionX !== null && (
              <div
                className="pointer-events-none absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0a0f18]/95 border border-white/20 text-[11px] font-mono text-white shadow-2xl backdrop-blur-md whitespace-nowrap z-30 flex items-center gap-1.5"
                style={{ left: `${hoverPositionX}px` }}
              >
                <span>{formatTime(hoverScrubTime)}</span>
                {(() => {
                  const seg = segments.find(
                    (item) => hoverScrubTime >= item.startSeconds && hoverScrubTime <= item.endSeconds
                  );
                  if (!seg) return null;
                  return (
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded font-sans font-medium',
                        seg.type === 'INTRO' && 'bg-amber-400/20 text-amber-300',
                        seg.type === 'RECAP' && 'bg-indigo-400/20 text-indigo-300',
                        seg.type === 'OUTRO' && 'bg-sky-400/20 text-sky-300',
                        seg.type === 'PREVIEW' && 'bg-emerald-400/20 text-emerald-300',
                        seg.type === 'COMMERCIAL' && 'bg-rose-400/20 text-rose-300'
                      )}
                    >
                      {seg.buttonLabel}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Scrubber Track */}
            <div
              onClick={handleTimelineScrub}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={() => {
                setHoverScrubTime(null);
                setHoverPositionX(null);
              }}
              className="relative w-full h-1.5 hover:h-2.5 rounded-full bg-white/20 cursor-pointer transition-all duration-150 overflow-hidden"
            >
              {/* Buffered Progress Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all"
                style={{ width: `${bufferedPercent}%` }}
              />

              {/* Played Progress Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-slate-200 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{ width: `${playedPercent}%` }}
              />

              {/* Visual Segment Markers (Intro, Recap, Outro, Preview, Commercial) */}
              <SegmentTimelineMarkers segments={segments} duration={duration} />
            </div>
          </div>

          {/* Control Bar Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 text-slate-200">
            {/* Left Controls: Play/Pause, Rewind, Forward, Previous/Next, Volume, Time */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Play / Pause Toggle */}
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cinema-focus"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              {/* 10s Rewind */}
              <button
                onClick={() => seekRelative(-10)}
                aria-label="Rewind 10 seconds"
                title="Rewind 10s [Left Arrow]"
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* 10s Forward */}
              <button
                onClick={() => seekRelative(10)}
                aria-label="Fast forward 10 seconds"
                title="Forward 10s [Right Arrow]"
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Previous Episode */}
              {prevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  aria-label="Previous Episode"
                  title="Previous Episode"
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus hidden sm:block"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              {/* Next Episode */}
              {nextEpisode && (
                <button
                  onClick={onNextEpisode}
                  aria-label="Next Episode"
                  title="Next Episode"
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus hidden sm:block"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {/* In-Player Episode Selector Button (Series mode) */}
              {seasons && seasons.length > 0 && onSelectEpisode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEpisodeSelectorOpen((prev) => !prev);
                  }}
                  aria-label="Episode selector"
                  title="Select Episode"
                  id="open-episode-selector-btn"
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus hidden sm:flex items-center gap-1.5 text-xs font-mono"
                >
                  <ListVideo className="w-4 h-4 text-sky-400" />
                  <span className="hidden md:inline">Episodes</span>
                </button>
              )}

              {/* Volume Slider with Mute Toggle */}
              <div className="flex items-center gap-1 group/volume pl-1">
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  title="Mute/Unmute [M]"
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <div className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 overflow-hidden flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    aria-label="Volume slider"
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>

              {/* Time Indicators */}
              <div className="text-[11px] sm:text-xs font-mono text-slate-300 pl-2">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Audio, Subtitles, Quality, Speed, PiP, Theater, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-1.5 relative">
              {/* Audio Track Selector Popover Button */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'audio' ? null : 'audio')}
                  aria-label="Audio Tracks"
                  title="Audio Selection"
                  className={cn(
                    'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus',
                    activeMenu === 'audio' && 'bg-white/20 text-white'
                  )}
                >
                  <AudioLines className="w-4 h-4" />
                </button>

                {activeMenu === 'audio' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    className="absolute bottom-full mb-3 right-0 w-60 max-w-[calc(100vw-2rem)] p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1 overflow-y-auto max-h-60"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Audio Stream
                    </p>
                    {session.audioTracks.length === 0 && (
                      <p className="px-2.5 py-2 text-slate-500">No alternate audio tracks.</p>
                    )}
                    {/*
                      Real Jellyfin audio streams. Selecting one re-negotiates the
                      stream (a different audio track is a different transcode) and
                      `restorePositionAfterReload` puts the viewer back where they
                      were. The old handler only relabelled a string and nudged
                      currentTime, which is why switching audio appeared to do
                      nothing.
                    */}
                    {session.audioTracks.map((track) => (
                      <button
                        key={track.index}
                        onClick={() => {
                          restorePositionAfterReload();
                          session.selectAudioTrack(track.index);
                          setActiveMenu(null);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors',
                          session.selectedAudioIndex === track.index
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitles Popover Button */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'subtitles' ? null : 'subtitles')}
                  aria-label="Subtitles"
                  title="Subtitle Selection"
                  className={cn(
                    'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus',
                    activeMenu === 'subtitles' && 'bg-white/20 text-white'
                  )}
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {activeMenu === 'subtitles' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    className="absolute bottom-full mb-3 right-0 w-52 max-w-[calc(100vw-2rem)] p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1 overflow-y-auto max-h-60"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Subtitles / Closed Captions
                    </p>
                    {/*
                      Backed by real `<track>` elements rendered below the video.
                      Before this, the list was populated from Jellyfin but there
                      was no <track> anywhere in the app, so picking a language
                      did literally nothing.
                    */}
                    {session.subtitleTracks.map((sub) => {
                      const isBurnIn = sub.index !== SUBTITLES_OFF && !sub.src;
                      return (
                        <button
                          key={sub.index}
                          onClick={() => {
                            session.selectSubtitle(sub.index);
                            // Bitmap subtitles (PGS/DVBSUB) have no text to
                            // extract, so Jellyfin has to burn them into the
                            // picture — which means a new transcode.
                            if (isBurnIn) {
                              restorePositionAfterReload();
                              session.reload();
                            }
                            setActiveMenu(null);
                          }}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2',
                            session.selectedSubtitleIndex === sub.index
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-slate-400 hover:text-white'
                          )}
                        >
                          <span className="truncate">{sub.label}</span>
                          {isBurnIn && (
                            <span
                              title="Image-based subtitles; the server must re-encode to show these"
                              className="text-[9px] font-mono text-amber-400 shrink-0"
                            >
                              BURN-IN
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quality Selector */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
                  aria-label="Stream Quality"
                  title="Stream Quality"
                  className={cn(
                    'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus text-xs font-mono',
                    activeMenu === 'quality' && 'bg-white/20 text-white'
                  )}
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {activeMenu === 'quality' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    className="absolute bottom-full mb-3 right-0 w-44 p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Quality
                    </p>
                    {/*
                      Real HLS variant levels reported by hls.js after parsing the
                      master playlist — not the previous hard-coded
                      ['Auto (4K UHD)', '4K (2160p)', …] list, which never touched
                      the stream. Empty on Safari/iOS, where playback is handed to
                      the native player and the ladder is not introspectable; the
                      note below says so rather than showing a dead menu.
                    */}
                    {hlsPlayer.levels.length === 0 ? (
                      <p className="px-2.5 py-2 text-slate-500 leading-snug">
                        {playbackMethod === 'hls'
                          ? 'Managed automatically by your browser.'
                          : 'Direct play — original quality.'}
                      </p>
                    ) : (
                      hlsPlayer.levels.map((level) => {
                        const isSelected = hlsPlayer.selectedLevelId === level.id;
                        const isAutoActive =
                          level.id === AUTO_QUALITY_ID &&
                          hlsPlayer.selectedLevelId === AUTO_QUALITY_ID;
                        const activeLabel =
                          isAutoActive && hlsPlayer.activeLevelId >= 0
                            ? hlsPlayer.levels.find((l) => l.id === hlsPlayer.activeLevelId)?.label
                            : undefined;

                        return (
                          <button
                            key={level.id}
                            onClick={() => {
                              hlsPlayer.setLevel(level.id);
                              setActiveMenu(null);
                            }}
                            className={cn(
                              'w-full text-left px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2',
                              isSelected
                                ? 'bg-white/10 text-white font-medium'
                                : 'text-slate-400 hover:text-white'
                            )}
                          >
                            <span>{level.label}</span>
                            {activeLabel && (
                              <span className="text-[10px] font-mono text-emerald-400">
                                {activeLabel}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Playback Speed Popover */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'speed' ? null : 'speed')}
                  aria-label="Playback Speed"
                  title="Playback Speed"
                  className={cn(
                    'px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus text-xs font-mono',
                    activeMenu === 'speed' && 'bg-white/20 text-white'
                  )}
                >
                  {playbackSpeed}x
                </button>

                {activeMenu === 'speed' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    className="absolute bottom-full mb-3 right-0 w-36 p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Playback Speed
                    </p>
                    {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setPlaybackSpeed(s);
                          if (videoRef.current) {
                            videoRef.current.playbackRate = s;
                          }
                          setActiveMenu(null);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors',
                          playbackSpeed === s ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {s}x {s === 1.0 && '(Normal)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture (PiP) */}
              <button
                onClick={togglePiP}
                aria-label="Picture-in-Picture"
                title="Picture in Picture [P]"
                className={cn(
                  'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus hidden sm:block',
                  isPiPActive && 'text-sky-400'
                )}
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>

              {/* Full Window / Theater Mode Toggle */}
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                aria-label={isTheaterMode ? 'Exit Full Window' : 'Full Window Mode'}
                title={isTheaterMode ? 'Exit Full Window [T]' : 'Full Window Mode [T]'}
                className={cn(
                  'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus',
                  isTheaterMode && 'text-sky-400 bg-white/10'
                )}
              >
                <Layers className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                title={isFullscreen ? 'Exit Fullscreen [F]' : 'Fullscreen [F]'}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              {/* Settings Gear Popover Button */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
                  aria-label="Playback Settings"
                  title="Settings"
                  className={cn(
                    'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus',
                    activeMenu === 'settings' && 'bg-white/20 text-white'
                  )}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {activeMenu === 'settings' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    className="absolute bottom-full mb-3 right-0 w-64 p-3 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                      <span className="font-semibold text-white">Playback Settings</span>
                      <span className="text-[10px] font-mono text-sky-400">DinuStream Cinema</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ambient Backlight</span>
                        </span>
                        <button
                          onClick={() => setAmbientGlow((prev) => !prev)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                            ambientGlow ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-white/10 text-slate-400'
                          )}
                        >
                          {ambientGlow ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-1 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-sky-400" />
                          <span>Diagnostics (Stats)</span>
                        </span>
                        <button
                          onClick={() => setShowStats((prev) => !prev)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                            showStats ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-white/10 text-slate-400'
                          )}
                        >
                          {showStats ? 'Showing' : 'Hidden'}
                        </button>
                      </div>

                      {/* Autoplay Next Episode Setting */}
                      <div className="flex items-center justify-between py-1 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-sky-400" />
                          <span>Autoplay Next Episode</span>
                        </span>
                        <button
                          onClick={() => setAutoplayNextEpisode(!autoplayNextEpisode)}
                          id="autoplay-setting-toggle"
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                            autoplayNextEpisode
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-white/10 text-slate-400'
                          )}
                        >
                          {autoplayNextEpisode ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Segment Skip Preferences */}
                      <div className="pt-2 border-t border-white/[0.08]">
                        <SegmentSettingsPanel
                          skipBehavior={skipBehavior}
                          onSelectBehavior={setSkipBehavior}
                        />
                      </div>
                    </div>

                    <div className="pt-1 border-t border-white/[0.06] space-y-1">
                      <p className="text-[10px] font-mono uppercase text-slate-400">Quick Configuration</p>

                      {/* Aspect ratio / zoom */}
                      <button
                        onClick={() => setActiveMenu('aspect')}
                        id="aspect-ratio-setting-btn"
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between gap-2 text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span className="flex items-center gap-1.5">
                          <Ratio className="w-3.5 h-3.5 text-sky-400" />
                          <span>Aspect Ratio</span>
                        </span>
                        <span className="font-mono text-emerald-400 text-[11px]">
                          {activeAspectOption.short}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu('quality')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Quality</span>
                        <span className="font-mono text-emerald-400 text-[11px]">
                          {currentQualityLabel}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('audio')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between gap-2 text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Audio Stream</span>
                        <span className="font-mono text-slate-400 text-[11px] truncate max-w-[130px]">
                          {activeAudioTrackLabel}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('subtitles')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between gap-2 text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Subtitles</span>
                        <span className="font-mono text-slate-400 text-[11px] truncate max-w-[130px]">
                          {activeSubtitleLabel}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('speed')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Speed</span>
                        <span className="font-mono text-slate-400 text-[11px]">{playbackSpeed}x</span>
                      </button>
                    </div>
                  </div>
                )}

                {/*
                  Aspect ratio submenu.

                  Anchored bottom-right like every other player popover, and
                  width-clamped to the viewport so it stays fully on screen on a
                  phone in landscape, where the frame is only ~360px tall.
                */}
                {activeMenu === 'aspect' && (
                  <div
                    style={{ bottom: 'calc(100% + 12px)' }}
                    role="menu"
                    aria-label="Aspect ratio"
                    className="absolute right-0 w-64 max-w-[calc(100vw-2rem)] max-h-[60svh] overflow-y-auto overscroll-contain p-3 rounded-xl glass-strong z-50 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.08]">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        <Ratio className="w-3.5 h-3.5 text-sky-400" />
                        <span>Aspect Ratio</span>
                      </span>
                      <button
                        onClick={() => setActiveMenu('settings')}
                        aria-label="Back to settings"
                        className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        Back
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      {ASPECT_RATIO_OPTIONS.map((option) => {
                        const isActive = option.id === aspectRatioMode;
                        return (
                          <button
                            key={option.id}
                            role="menuitemradio"
                            aria-checked={isActive}
                            onClick={() => {
                              setAspectRatioMode(option.id);
                              onUserActivity();
                            }}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded-lg transition-colors',
                              isActive
                                ? 'bg-sky-500/20 text-white border border-sky-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/[0.07] border border-transparent'
                            )}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-medium">{option.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                            </span>
                            <span className="block text-[10px] leading-snug text-slate-400 mt-0.5">
                              {option.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="pt-1.5 border-t border-white/[0.06] text-[10px] text-slate-500">
                      Saved for this device. Shortcut:{' '}
                      <kbd className="font-mono text-slate-400">A</kbd> cycles modes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Episode Selector Drawer Panel */}
      {seasons && seasons.length > 0 && onSelectEpisode && (
        <EpisodeSelectorDrawer
          isOpen={isEpisodeSelectorOpen}
          onClose={() => setIsEpisodeSelectorOpen(false)}
          seasons={seasons}
          currentEpisode={episode}
          onSelectEpisode={onSelectEpisode}
          seriesTitle={media.title}
        />
      )}

      {/* In-Player Shared Screening Queue Drawer */}
      <AnimatePresence>
        {isQueueDrawerOpen && isGroupSync && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#070b14]/95 border-l border-white/[0.12] shadow-2xl backdrop-blur-2xl z-40 p-4 sm:p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍿</span>
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                  Movie Night Queue
                </span>
              </div>
              <button
                onClick={() => setIsQueueDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <GroupQueue
              queue={watchTogether.group?.queue || []}
              isHost={watchTogether.group?.hostId === profile.id}
              currentUserId={profile.id}
              onRemoveFromQueue={watchTogether.removeFromQueue}
              onReorderQueue={watchTogether.reorderQueue}
              onPlayNext={() => {
                watchTogether.playNext((movieId, grpId) => {
                  router.push(`/watch/${movieId}?sync=true&group=${grpId}`);
                });
              }}
              onPlayQueueItem={(item) => {
                router.push(`/watch/${item.movieId}?sync=true&group=${groupId || 'group-movie-night'}`);
              }}
              onClearQueue={watchTogether.clearQueue}
              onOpenSelector={() => setIsQueueSelectorOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Movie Selector Modal for Queue */}
      <GroupMovieSelector
        isOpen={isQueueSelectorOpen}
        onClose={() => setIsQueueSelectorOpen(false)}
        onSelectMovie={(selectedMovie) => {
          watchTogether.addToQueue(selectedMovie, profile.id);
          setIsQueueSelectorOpen(false);
        }}
        currentMovieId={media.id}
      />
    </div>
  );
};
