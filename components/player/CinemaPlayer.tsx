'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  X,
} from 'lucide-react';
import { useMediaSegments } from '@/hooks/useMediaSegments';
import { useSeriesAutoplay } from '@/hooks/useSeriesAutoplay';
import { SegmentSkipButton } from './SegmentSkipButton';
import { SegmentTimelineMarkers } from './SegmentTimelineMarkers';
import { SegmentSettingsPanel } from './SegmentSettingsPanel';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { EpisodeSelectorDrawer } from './EpisodeSelectorDrawer';
import { AtmosIntro } from './AtmosIntro';
import { useDolbyIntroPreference } from '@/hooks/useDolbyIntroPreference';
import { mediaService } from '@/lib/services/mediaService';
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
  syncProgress?: SyncProgressData;
  isGroupSync?: boolean;
  groupId?: string;
  groupName?: string;
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
  syncProgress,
  isGroupSync = false,
  groupId = 'group-movie-night',
  groupName = 'Movie Night ❤️',
}) => {
  const router = useRouter();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(166 * 60); // 2h 46m in seconds default
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('4K (2160p)');
  const [audioTrack, setAudioTrack] = useState('Dolby Atmos (TrueHD 7.1)');
  const [subtitle, setSubtitle] = useState('Off');
  const [availableAudioTracks, setAvailableAudioTracks] = useState<Array<{ id: string; label: string }>>([
    { id: '1', label: 'Dolby Atmos (TrueHD 7.1)' },
    { id: '2', label: 'Dolby Digital Plus 5.1' },
    { id: '3', label: 'French Stereo' },
  ]);
  const [availableSubtitleTracks, setAvailableSubtitleTracks] = useState<Array<{ id: string; label: string }>>([
    { id: 'off', label: 'Off' },
    { id: '1', label: 'English [CC]' },
    { id: '2', label: 'Spanish' },
    { id: '3', label: 'French' },
  ]);
  const hasResumedRef = useRef(false);

  // Load live Jellyfin audio & subtitle tracks on media change
  useEffect(() => {
    mediaService.getAudioTracks(media.id).then((tracks) => {
      if (tracks && tracks.length > 0) {
        setAvailableAudioTracks(tracks);
      }
    }).catch(() => {});

    mediaService.getSubtitleTracks(media.id).then((subs) => {
      if (subs && subs.length > 0) {
        setAvailableSubtitleTracks(subs);
      }
    }).catch(() => {});

    mediaService.getResumePosition(media.id).then((resumeSeconds) => {
      if (!hasResumedRef.current && resumeSeconds > 10) {
        hasResumedRef.current = true;
        setCurrentTime(resumeSeconds);
        if (videoRef.current) {
          videoRef.current.currentTime = resumeSeconds;
        }
      }
    }).catch(() => {});
  }, [media.id]);

  const { isPortrait, isMobile, isTV: isDeviceTV, requestFullscreenLandscape } = useDeviceOrientation();
  const { isTVMode: isNavTVMode } = useTVNavigation();
  const isTV = isNavTVMode || isDeviceTV;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Dynamic Stream Source with resilient fallback
  const fallbackVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const defaultStreamUrl = episode?.videoUrl || media?.videoUrl || fallbackVideoUrl;
  const [videoError, setVideoError] = useState(false);
  const activeVideoSrc = videoError ? fallbackVideoUrl : defaultStreamUrl;

  const handleVideoError = useCallback(() => {
    if (!videoError) {
      console.warn('[CinemaPlayer] Primary stream failed, switching to fallback sample video');
      setVideoError(true);
    }
  }, [videoError]);

  // Sync fullscreen state with native browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
  const [activeMenu, setActiveMenu] = useState<'audio' | 'subtitles' | 'quality' | 'speed' | 'settings' | null>(null);
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
  const syncPlayback = useSyncPlayback({
    groupId: groupId || 'group-movie-night',
    groupName: groupName || 'Movie Night ❤️',
    mediaId: media.id,
    episodeId: episode?.id,
    enabled: Boolean(isGroupSync),
    onRemotePlay: () => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      triggerPulse('play');
    },
    onRemotePause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      triggerPulse('pause');
    },
    onRemoteSeek: (targetSeconds) => {
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
    },
    onRemoteSkipSegment: (_type, targetSeconds) => {
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
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

  // Reusable Seek Handler for Video Element & Scrubbing
  const handleSeek = useCallback(
    (targetSeconds: number) => {
      const clamped = Math.min(duration, Math.max(0, targetSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      if (isGroupSync) {
        syncPlayback.broadcastSeek(clamped);
      }
      setAreControlsVisible(true);
    },
    [duration, isGroupSync, syncPlayback]
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

  // Sync active user profile preferences to player state
  useEffect(() => {
    queueMicrotask(() => {
      if (settings?.defaultAudio) setAudioTrack(settings.defaultAudio);
      if (settings?.defaultSubtitles) setSubtitle(settings.defaultSubtitles);
      if (settings?.playbackQuality) setQuality(settings.playbackQuality);
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

  // Continuous Drift Correction loop for Watch Together
  useEffect(() => {
    if (!isGroupSync || !isPlaying) return;
    const interval = setInterval(() => {
      syncPlayback.performDriftCorrection(currentTime);
    }, 1500);
    return () => clearInterval(interval);
  }, [isGroupSync, isPlaying, currentTime, syncPlayback]);

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
          syncPlayback.broadcastSkipSegment(segType, targetSeg.endSeconds);
        }
      }
    },
    [activeSegment, skipSegment, isGroupSync, syncPlayback]
  );

  // Dolby Atmos Cinematic Prelude Intro State
  const { isDolbyIntroEnabled, setDolbyIntroEnabled } = useDolbyIntroPreference();
  const [isPlayingDolbyIntro, setIsPlayingDolbyIntro] = useState<boolean>(() => isDolbyIntroEnabled);

  const handleDolbyIntroComplete = useCallback(() => {
    setIsPlayingDolbyIntro(false);
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, []);

  const handleReplayDolbyIntro = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setIsPlayingDolbyIntro(true);
    setActiveMenu(null);
  }, [setActiveMenu]);

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

  // AutoPlay effect on mount
  useEffect(() => {
    if (autoPlay && videoRef.current && !isPlayingDolbyIntro) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [autoPlay, isPlayingDolbyIntro]);

  // Video Element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        setDuration(video.duration);
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

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onNextEpisode, isGroupSync, groupId, router, addWatchHistory, duration, episode, media]);

  // Simulated playback time advancement (coexists gracefully with HTML5 video)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime > 0) {
          return;
        }
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            if (onNextEpisode) {
              onNextEpisode();
            } else if (isGroupSync) {
              const nextMovie = watchTogetherService.prepareNextQueuedMovie();
              if (nextMovie) {
                router.push(`/watch/${nextMovie.movieId}?sync=true&group=${groupId || 'group-movie-night'}`);
              }
            }
            return duration;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, playbackSpeed, onNextEpisode, isGroupSync, groupId, router]);

  // Pulse animation helper
  const triggerPulse = (action: 'play' | 'pause' | 'rewind' | 'forward') => {
    setCenterPulseAction(action);
    setTimeout(() => setCenterPulseAction(null), 600);
  };

  // Playback Control Actions
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        triggerPulse('pause');
        if (isGroupSync) syncPlayback.broadcastPause(currentTime);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        triggerPulse('play');
        if (isGroupSync) syncPlayback.broadcastPlay(currentTime);
      }
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      triggerPulse(nextPlaying ? 'play' : 'pause');
      if (isGroupSync) {
        if (nextPlaying) syncPlayback.broadcastPlay(currentTime);
        else syncPlayback.broadcastPause(currentTime);
      }
    }
    onUserActivity();
  }, [isPlaying, isGroupSync, currentTime, syncPlayback, onUserActivity]);

  const seekRelative = useCallback(
    (seconds: number) => {
      const newTime = Math.min(duration, Math.max(0, currentTime + seconds));
      setCurrentTime(newTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      if (isGroupSync) {
        syncPlayback.broadcastSeek(newTime);
      }
      triggerPulse(seconds < 0 ? 'rewind' : 'forward');
      onUserActivity();
    },
    [currentTime, duration, isGroupSync, syncPlayback, onUserActivity]
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
    if (!document.fullscreenElement) {
      await requestFullscreenLandscape(playerContainerRef.current);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    onUserActivity();
  }, [requestFullscreenLandscape, onUserActivity]);

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
        case 'KeyP':
          e.preventDefault();
          togglePiP();
          break;
        case 'Escape':
          if (activeMenu) {
            setActiveMenu(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleMute, toggleFullscreen, handleSkipSegment, activeMenu, isTV, isFullscreen, volume]);

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
        'relative bg-black select-none overflow-hidden font-sans transition-all duration-300',
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen'
          : isPortrait
            ? 'w-full aspect-video sm:aspect-auto sm:h-[60vh] max-h-[75vh]'
            : isTheaterMode
              ? 'w-full h-screen'
              : 'w-full h-[76vh] min-h-[460px] max-h-[820px]',
        !areControlsVisible && isPlaying ? 'cursor-none' : 'cursor-default',
        isTV && 'tv-player-mode'
      )}
    >
      {/* Dynamic Ambient Cinema Backlight Glow */}
      {ambientGlow && (
        <div
          className="pointer-events-none absolute -inset-10 opacity-35 blur-3xl bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${episode ? episode.thumbnailUrl : media.backdropUrl})` }}
        />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={activeVideoSrc}
        poster={episode ? episode.thumbnailUrl : media.backdropUrl}
        playsInline
        className="relative z-10 w-full h-full object-contain"
        onClick={togglePlay}
        onError={handleVideoError}
      />

      {/* Mobile Portrait Orientation Prompt */}
      {isPortrait && isMobile && !isFullscreen && (
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

      {/* Atmos Cinematic Pre-Play & Sync System */}
      <AnimatePresence>
        {isPlayingDolbyIntro && (
          <AtmosIntro
            movie={media}
            syncProgress={syncProgress}
            onReady={handleDolbyIntroComplete}
            onSkip={handleDolbyIntroComplete}
            mockDurationSeconds={5}
          />
        )}
      </AnimatePresence>

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
                <span className="font-mono text-emerald-400">{quality}</span>
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
                    className="absolute bottom-full mb-3 right-0 w-60 p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Audio Stream (Dolby Atmos)
                    </p>
                    {availableAudioTracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setAudioTrack(track.label);
                          setActiveMenu(null);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors',
                          audioTrack === track.label ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:text-white'
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
                    className="absolute bottom-full mb-3 right-0 w-52 p-2 rounded-xl bg-[#0a0f18]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-xl z-50 text-xs space-y-1"
                  >
                    <p className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.06]">
                      Subtitles / Closed Captions
                    </p>
                    {availableSubtitleTracks.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setSubtitle(sub.label);
                          setActiveMenu(null);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors',
                          subtitle === sub.label ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
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
                      Bitrate Resolution
                    </p>
                    {['Auto (4K UHD)', '4K (2160p)', '1080p Full HD', '720p HD'].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setQuality(q);
                          setActiveMenu(null);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors',
                          quality === q ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {q}
                      </button>
                    ))}
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

              {/* Theater Mode Toggle */}
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                aria-label="Theater Mode"
                title="Theater Mode [T]"
                className={cn(
                  'p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cinema-focus hidden md:block',
                  isTheaterMode && 'text-sky-400'
                )}
              >
                <Layers className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                title="Fullscreen [F]"
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

                      {/* Dolby Atmos Intro Setting */}
                      <div className="flex items-center justify-between py-1 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Dolby Atmos Intro</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDolbyIntroEnabled(!isDolbyIntroEnabled)}
                            id="dolby-intro-toggle"
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                              isDolbyIntroEnabled
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-slate-400'
                            )}
                          >
                            {isDolbyIntroEnabled ? 'ON' : 'OFF'}
                          </button>
                          <button
                            onClick={handleReplayDolbyIntro}
                            id="replay-dolby-intro-btn"
                            title="Play Dolby Atmos Intro Now"
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                          >
                            Play
                          </button>
                        </div>
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
                      <button
                        onClick={() => setActiveMenu('quality')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Quality</span>
                        <span className="font-mono text-emerald-400 text-[11px]">{quality}</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('audio')}
                        className="w-full text-left py-1 px-1.5 rounded flex items-center justify-between text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <span>Audio Stream</span>
                        <span className="font-mono text-slate-400 text-[11px] truncate max-w-[120px]">{audioTrack}</span>
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
