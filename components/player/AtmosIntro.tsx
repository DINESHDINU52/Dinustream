'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncProgressData } from '@/types/sync';
import {
  AtmosClip,
  FALLBACK_ATMOS_CLIPS,
  fetchHostedDolbyClips,
  getNextRandomAtmosClip,
} from '@/lib/atmos-clips';
import {
  SkipForward,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AtmosIntroProps {
  /**
   * The title the prelude runs in front of, and the live cache-sync progress.
   * Accepted so call sites can pass their full context; the prelude renders
   * neither (it is a fixed clip with no title card).
   */
  movie?: MediaItem;
  syncProgress?: SyncProgressData;
  onReady: () => void;
  onSkip?: () => void;
  mockDurationSeconds?: number;

  /** Fullscreen state and toggle, owned by the parent player. */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void | Promise<void>;
  /**
   * Whether fullscreen should be requested as soon as the prelude starts.
   * Browsers only grant `requestFullscreen` while a user gesture is still
   * active, so this is best-effort — the manual button is always available.
   */
  autoFullscreen?: boolean;

  /** Lets the viewer turn the prelude off from inside it. */
  isIntroEnabled?: boolean;
  onSetIntroEnabled?: (enabled: boolean) => void;
}

/** Idle delay before the control bar fades out during playback. */
const CONTROLS_HIDE_MS = 2800;

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Dolby Atmos cinematic prelude.
 *
 * Previously this rendered a bare `<video autoPlay muted={false}>` with a single
 * "Skip Intro" button and nothing else — no play/pause, no volume, no
 * fullscreen, no settings. Two concrete problems came out of that:
 *
 *  1. Chrome, Safari and Firefox all block autoplay *with sound*. The `play()`
 *     promise rejected, the clip never started, `onEnded` never fired, and the
 *     only way out was the Skip button. The prelude looked broken.
 *  2. Once it did start there was no way to pause it, mute it, or stop it ever
 *     happening again.
 *
 * It is now a real, if minimal, player: a three-stage autoplay ladder
 * (unmuted → muted → paused-with-Play-button), full transport controls, a
 * settings popover, and an optional fullscreen request.
 */
export const AtmosIntro: React.FC<AtmosIntroProps> = ({
  onReady,
  onSkip,
  isFullscreen = false,
  onToggleFullscreen,
  autoFullscreen = true,
  isIntroEnabled = true,
  onSetIntroEnabled,
}) => {
  const [selectedClip, setSelectedClip] = useState<AtmosClip>(() =>
    getNextRandomAtmosClip(FALLBACK_ATMOS_CLIPS)
  );
  const [videoSrc, setVideoSrc] = useState<string>(selectedClip.localPath);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const hasFinishedRef = useRef(false);

  // Transport state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);

  /**
   * Set when the browser refused to autoplay even muted, meaning playback needs
   * an explicit tap. Distinct from "paused by the viewer" so the UI can explain
   * itself instead of just sitting there.
   */
  const [needsGesture, setNeedsGesture] = useState(false);
  /** Set when autoplay only succeeded because we muted; surfaces an Unmute CTA. */
  const [wasForcedMuted, setWasForcedMuted] = useState(false);

  const [progressPct, setProgressPct] = useState(0);
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (onSkip) onSkip();
    else onReady();
  }, [onSkip, onReady]);

  /* Reveal the controls and restart the idle timer. */
  const registerActivity = useCallback(() => {
    setAreControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setAreControlsVisible(false), CONTROLS_HIDE_MS);
  }, []);

  /*
    Controls auto-hide only while playback is actually running with no menu open.

    `keepPinned` is derived rather than pushed into state, so the effect never
    calls setState synchronously in its body — that is a cascading render, and
    the visible state is a pure function of these three flags anyway.
  */
  const keepControlsPinned = !isPlaying || isSettingsOpen || needsGesture;
  const showControls = keepControlsPinned || areControlsVisible;

  useEffect(() => {
    if (keepControlsPinned) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    hideTimerRef.current = setTimeout(() => setAreControlsVisible(false), CONTROLS_HIDE_MS);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [keepControlsPinned]);

  /* Prefer a server-hosted clip from /opt/dinustream/cache/dolby when present. */
  useEffect(() => {
    let isMounted = true;
    fetchHostedDolbyClips().then((hostedClips) => {
      if (!isMounted) return;
      if (hostedClips?.length && hostedClips[0].isHosted) {
        const nextClip = getNextRandomAtmosClip(hostedClips);
        setSelectedClip(nextClip);
        setVideoSrc(nextClip.localPath);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  /*
    Autoplay ladder.

    Every current browser blocks autoplay with audio unless the origin has
    earned the media-engagement privilege. Rather than assume it will work (the
    old behaviour, which left the prelude frozen on its first frame), try the
    ideal case first and degrade in two documented steps.
  */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const attemptPlayback = async () => {
      video.volume = volume;
      video.muted = false;

      try {
        await video.play();
        if (!cancelled) setIsPlaying(true);
        return;
      } catch {
        // Step 2: audio is what is being blocked, so drop it and retry.
      }

      if (cancelled) return;

      try {
        video.muted = true;
        await video.play();
        if (cancelled) return;
        setIsMuted(true);
        setWasForcedMuted(true);
        setIsPlaying(true);
        return;
      } catch {
        // Step 3: playback itself is blocked. Wait for a tap.
      }

      if (!cancelled) {
        setNeedsGesture(true);
        setIsPlaying(false);
      }
    };

    void attemptPlayback();

    return () => {
      cancelled = true;
    };
    // Intentionally mount-only: `volume` is read as the initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    Native fullscreen, attempted twice.

    Pass 1 — on mount. This normally fails: `requestFullscreen` is only granted
    while a user gesture is active, and the prelude mounts from a route load, not
    a click. It is still worth trying, because when the viewer *did* arrive via a
    direct tap on Play the gesture can still be live.

    The prelude is laid out edge-to-edge by the parent regardless (see
    `isImmersive` in CinemaPlayer), so a refusal costs nothing visually — it only
    means the browser's own chrome stays on screen.
  */
  useEffect(() => {
    if (!autoFullscreen || isFullscreen || !onToggleFullscreen) return;
    void onToggleFullscreen();
    // Mount-only: re-requesting on every state change would fight the viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    Pass 2 — the first genuine pointer gesture inside the prelude. This is the
    only moment a browser will reliably grant fullscreen, so the first tap or
    click upgrades to it. One-shot via a ref: if the viewer then deliberately
    leaves fullscreen, tapping again must not drag them back in.
  */
  const hasAttemptedGestureFullscreenRef = useRef(false);

  const upgradeToNativeFullscreen = useCallback(() => {
    if (hasAttemptedGestureFullscreenRef.current) return;
    if (!autoFullscreen || !onToggleFullscreen || isFullscreen) return;
    hasAttemptedGestureFullscreenRef.current = true;
    void onToggleFullscreen();
  }, [autoFullscreen, onToggleFullscreen, isFullscreen]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // A tap is a user gesture, so unmute if we were only muted to get started.
      if (wasForcedMuted) {
        video.muted = false;
        video.volume = volume;
        setIsMuted(false);
        setWasForcedMuted(false);
      }
      void video
        .play()
        .then(() => {
          setIsPlaying(true);
          setNeedsGesture(false);
        })
        .catch(() => setNeedsGesture(true));
    } else {
      video.pause();
      setIsPlaying(false);
    }
    registerActivity();
  }, [wasForcedMuted, volume, registerActivity]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    if (!next && video.volume === 0) {
      video.volume = 0.9;
      setVolume(0.9);
    }
    setIsMuted(next);
    setWasForcedMuted(false);
    registerActivity();
  }, [registerActivity]);

  const changeVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    const video = videoRef.current;
    setVolume(clamped);
    if (video) {
      video.volume = clamped;
      video.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
    setWasForcedMuted(false);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const target = Math.min(video.duration, Math.max(0, seconds));
    video.currentTime = target;
    setCurrentTime(target);
  }, []);

  /* Keyboard parity with the main player. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          void onToggleFullscreen?.();
          break;
        case 'KeyS':
          e.preventDefault();
          finish();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo((videoRef.current?.currentTime ?? 0) - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo((videoRef.current?.currentTime ?? 0) + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
      }
      registerActivity();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, finish, seekTo, changeVolume, volume, onToggleFullscreen, registerActivity]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const fraction = Math.min(1, video.currentTime / video.duration);
    setCurrentTime(video.currentTime);
    setProgressPct(Math.round(fraction * 100));
    if (fraction >= 0.98) setIsSyncComplete(true);
  };

  const handleEnded = () => {
    setIsSyncComplete(true);
    setProgressPct(100);
    setIsPlaying(false);
    setTimeout(finish, 400);
  };

  const handleError = () => {
    // Local clip missing → fall back to the remote sample once.
    if (videoSrc !== selectedClip.fallbackUrl) {
      setVideoSrc(selectedClip.fallbackUrl);
      return;
    }
    // Both sources failed; do not trap the viewer behind a dead prelude.
    finish();
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="absolute inset-0 z-50 bg-black overflow-hidden select-none"
      id="atmos-pre-play-system"
      onMouseMove={registerActivity}
      /*
        `pointerdown` rather than `mousemove`: moving a mouse is not a gesture
        that unlocks the Fullscreen API, a press is. This fires for touch, pen
        and mouse alike.
      */
      onPointerDown={() => {
        upgradeToNativeFullscreen();
        registerActivity();
      }}
      role="region"
      aria-label="Dolby Atmos prelude"
    >
      {/* Clip */}
      <video
        ref={videoRef}
        src={videoSrc}
        preload="auto"
        playsInline
        onLoadedData={() => setIsVideoLoaded(true)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
        onEnded={handleEnded}
        onClick={togglePlay}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
          isVideoLoaded ? 'opacity-95' : 'opacity-20'
        )}
      />

      {/* Scrims: only where chrome sits, so the clip itself stays clean */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Buffering spinner */}
      {isBuffering && !needsGesture && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-white/70 animate-spin" />
        </div>
      )}

      {/*
        Centre play affordance. Shown when playback is blocked or paused — this
        is the control that was entirely missing, and the reason a blocked
        autoplay looked like a broken player.
      */}
      {(needsGesture || (!isPlaying && !isBuffering)) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <button
            onClick={togglePlay}
            id="atmos-intro-play-btn"
            aria-label={isPlaying ? 'Pause prelude' : 'Play prelude'}
            className="w-20 h-20 rounded-full glass-strong glass-sheen flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 cinema-focus"
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 fill-current" />
            ) : (
              <Play className="w-9 h-9 fill-current ml-1" />
            )}
          </button>
          {needsGesture && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs">
              Your browser blocked autoplay. Tap to start the Dolby prelude, or skip straight to the
              feature.
            </p>
          )}
        </div>
      )}

      {/* Top bar: forced-mute notice + skip */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 px-4 sm:px-8 pt-4 sm:pt-6 pt-safe-flush">
        {wasForcedMuted ? (
          <button
            onClick={toggleMute}
            id="atmos-intro-unmute-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-white text-xs font-medium transition-transform active:scale-95 cinema-focus"
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-300" />
            <span>Tap to unmute</span>
          </button>
        ) : (
          <span />
        )}

        <button
          onClick={finish}
          id="skip-atmos-intro-btn"
          className="group flex items-center gap-2 px-4 py-2 rounded-full glass text-white text-xs font-medium tracking-wide transition-transform active:scale-95 cinema-focus shrink-0"
          title="Skip intro (S)"
        >
          <span>Skip Intro</span>
          <SkipForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 fill-current" />
        </button>
      </div>

      {/* Control bar */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 12 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'absolute inset-x-0 bottom-0 z-40 px-4 sm:px-8 pb-4 sm:pb-6 pb-safe-flush space-y-2.5',
          !showControls && 'pointer-events-none'
        )}
      >
        {/* Seek bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-300 tabular-nums w-9 text-right shrink-0">
            {formatClock(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Prelude position"
            className="flex-1 h-1.5 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400 tabular-nums w-9 shrink-0">
            {formatClock(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Transport */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="p-2.5 rounded-full glass text-white transition-transform active:scale-95 cinema-focus touch-target flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            {/* Mute + volume. The slider is pointer-only; touch devices get the
                mute toggle, which is the control that actually matters there. */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                className="p-2.5 rounded-full glass text-white transition-transform active:scale-95 cinema-focus touch-target flex items-center justify-center"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Prelude volume"
                className="hidden md:block w-20 h-1.5 accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Sync status pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full glass-subtle min-w-0">
              {isSyncComplete ? (
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Ready to Play
                </span>
              ) : (
                <>
                  <span className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                    <span className="absolute inset-0 rounded-full bg-cyan-400/40 animate-ping" />
                    <span className="relative w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  </span>
                  <span className="text-xs font-medium text-slate-200 tabular-nums">
                    Syncing • {progressPct}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Settings + fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                aria-label="Prelude settings"
                aria-expanded={isSettingsOpen}
                title="Prelude settings"
                className={cn(
                  'p-2.5 rounded-full glass text-white transition-transform active:scale-95 cinema-focus touch-target flex items-center justify-center',
                  isSettingsOpen && 'bg-white/20'
                )}
              >
                <Settings className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    aria-label="Prelude settings"
                    className="absolute bottom-full mb-3 right-0 w-60 max-w-[calc(100vw-2rem)] p-3 rounded-xl glass-strong text-xs space-y-2.5"
                  >
                    <p className="font-semibold text-white pb-1.5 border-b border-white/[0.08]">
                      Dolby Prelude
                    </p>

                    <div className="flex items-center justify-between gap-2 text-slate-300">
                      <span>Audio</span>
                      <button
                        onClick={toggleMute}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                          isMuted
                            ? 'bg-white/10 text-slate-400'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        )}
                      >
                        {isMuted ? 'Muted' : 'On'}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Volume</span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {Math.round((isMuted ? 0 : volume) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                        aria-label="Prelude volume"
                        className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    {/* The setting that was genuinely missing: a way to stop the
                        prelude happening at all, offered at the moment it is
                        being experienced. */}
                    {onSetIntroEnabled && (
                      <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-slate-300">
                          <span>Play before every title</span>
                          <button
                            onClick={() => onSetIntroEnabled(!isIntroEnabled)}
                            id="atmos-intro-enabled-toggle"
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors',
                              isIntroEnabled
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-slate-400'
                            )}
                          >
                            {isIntroEnabled ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            onSetIntroEnabled(false);
                            finish();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.07] transition-colors"
                        >
                          Turn off and skip to feature
                        </button>
                      </div>
                    )}

                    <p className="pt-1.5 border-t border-white/[0.06] text-[10px] text-slate-500 leading-relaxed">
                      <kbd className="font-mono text-slate-400">Space</kbd> play/pause ·{' '}
                      <kbd className="font-mono text-slate-400">M</kbd> mute ·{' '}
                      <kbd className="font-mono text-slate-400">F</kbd> fullscreen ·{' '}
                      <kbd className="font-mono text-slate-400">S</kbd> skip
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {onToggleFullscreen && (
              <button
                onClick={() => void onToggleFullscreen()}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
                className="p-2.5 rounded-full glass text-white transition-transform active:scale-95 cinema-focus touch-target flex items-center justify-center"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
