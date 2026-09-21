'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncProgressData } from '@/types/sync';
import {
  AtmosClip,
  FALLBACK_ATMOS_CLIPS,
  fetchHostedDolbyClips,
  getNextRandomAtmosClip,
} from '@/lib/atmos-clips';
import { Headphones, SkipForward, HardDrive, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AtmosIntroProps {
  movie?: MediaItem;
  syncProgress?: SyncProgressData;
  onReady: () => void;
  onSkip?: () => void;
  mockDurationSeconds?: number;
}

export const AtmosIntro: React.FC<AtmosIntroProps> = ({
  movie,
  syncProgress: externalSyncProgress,
  onReady,
  onSkip,
}) => {
  // Start with a fallback clip immediately to prevent delay, then load server hosted clips
  const [selectedClip, setSelectedClip] = useState<AtmosClip>(() =>
    getNextRandomAtmosClip(FALLBACK_ATMOS_CLIPS)
  );
  const [videoSrc, setVideoSrc] = useState<string>(selectedClip.localPath);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasTriggeredReady, setHasTriggeredReady] = useState(false);

  // Sync Progress state driven by the full video duration
  const [progressPct, setProgressPct] = useState<number>(0);
  const [transferSpeed, setTransferSpeed] = useState<number>(142);
  const [etaSeconds, setEtaSeconds] = useState<number>(0);
  const [isSyncComplete, setIsSyncComplete] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Fetch hosted Dolby videos from /opt/dinustream/cache/dolby
  useEffect(() => {
    let isMounted = true;
    fetchHostedDolbyClips().then((hostedClips) => {
      if (!isMounted) return;
      if (hostedClips && hostedClips.length > 0) {
        const randomHosted = getNextRandomAtmosClip(hostedClips);
        setSelectedClip(randomHosted);
        setVideoSrc(randomHosted.localPath);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFinish = useCallback(() => {
    if (hasTriggeredReady) return;
    setHasTriggeredReady(true);
    if (onSkip) {
      onSkip();
    } else {
      onReady();
    }
  }, [hasTriggeredReady, onSkip, onReady]);

  // 2. Drive the sync progress bar seamlessly matching the full video playback
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const duration = video.duration;
    const fraction = Math.min(1, current / duration);
    const pct = Math.min(100, Math.round(fraction * 100));

    setProgressPct(pct);

    const remaining = Math.max(0, Math.ceil(duration - current));
    setEtaSeconds(remaining);

    // Realistic fluctuating NVMe SSD transfer speed (138 - 158 MB/s)
    const dynamicSpeed = Math.round(145 + Math.sin(fraction * Math.PI * 3) * 12);
    setTransferSpeed(dynamicSpeed);

    if (fraction >= 0.98) {
      setIsSyncComplete(true);
    }
  };

  // 3. Complete strictly when video finishes playing fully (or skip clicked)
  const handleVideoEnded = () => {
    setIsSyncComplete(true);
    setProgressPct(100);
    setEtaSeconds(0);
    // Smooth cinematic pause before handing off to feature film
    setTimeout(() => {
      handleFinish();
    }, 450);
  };

  // Fallback to sample URL if video file stream encounters error
  const handleVideoError = () => {
    if (videoSrc !== selectedClip.fallbackUrl) {
      console.warn('[AtmosIntro] Falling back to sample clip for:', selectedClip.title);
      setVideoSrc(selectedClip.fallbackUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="absolute inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
      id="atmos-pre-play-system"
    >
      {/* Fullscreen Background Cinematic Video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted={false}
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          onTimeUpdate={handleTimeUpdate}
          onError={handleVideoError}
          onEnded={handleVideoEnded}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-700',
            isVideoLoaded ? 'opacity-90' : 'opacity-20'
          )}
        />
        {/* Cinematic Vignette & Dynamic Shadow Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-transparent to-[#05070c]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,5,10,0.85)_100%)]" />
      </div>

      {/* Top Header: Brand & Skip Button */}
      <div className="relative z-20 px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono tracking-widest uppercase backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>DOLBY ATMOS CINEMA</span>
          </div>
          <span className="hidden sm:inline text-xs font-mono text-slate-300">
            {selectedClip.title}
          </span>
          {selectedClip.isHosted && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              <Sparkles className="w-2.5 h-2.5" />
              SSD Local Cache
            </span>
          )}
        </div>

        <button
          onClick={handleFinish}
          id="skip-atmos-intro-btn"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-slate-200 hover:text-white text-xs font-mono font-medium tracking-wide transition-all backdrop-blur-md cinema-focus shadow-lg"
        >
          <span>SKIP INTRO</span>
          <SkipForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Center Cinematic Overlay Typography */}
      <div className="relative z-20 px-6 sm:px-12 text-center max-w-2xl mx-auto space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="space-y-2.5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-2xl backdrop-blur-xl">
            <Headphones className="w-4 h-4 text-cyan-400 animate-bounce" />
            <span className="text-xs sm:text-sm font-semibold text-white tracking-widest uppercase font-mono">
              PREMIUM DOLBY ATMOS EXPERIENCE
            </span>
          </div>

          <p className="text-sm sm:text-base text-slate-200 font-light max-w-lg mx-auto leading-relaxed drop-shadow-lg">
            &ldquo;Playing discrete multi-channel height and spatial audio channels.&rdquo;
          </p>
        </motion.div>
      </div>

      {/* Bottom Syncing Status Card: Full Video Sync Progress */}
      <div className="relative z-20 px-6 sm:px-10 pb-8 sm:pb-10 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="p-4 sm:p-5 rounded-2xl bg-[#090e1a]/90 border border-slate-400/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-3"
          id="syncing-movie-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-white font-mono">
                {isSyncComplete
                  ? 'Oracle SSD Local Cache Synchronized'
                  : `Syncing ${movie ? `"${movie.title}"` : 'Feature'} with SSD Cache...`}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              {isSyncComplete ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Present
                </span>
              ) : (
                <span className="text-cyan-400 font-semibold">{progressPct}%</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 rounded-full"
              style={{ width: `${progressPct}%` }}
              transition={{ ease: 'easeOut', duration: 0.15 }}
            />
          </div>

          {/* Metrics Row: Progress, Speed, ETA */}
          <div className="grid grid-cols-3 pt-1 text-[11px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Storage</span>
              <span className="text-slate-200 font-semibold">Oracle NVMe</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Cache Speed</span>
              <span className="text-slate-200 font-semibold">{transferSpeed} MB/s</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Remaining</span>
              <span className="text-slate-200 font-semibold">
                {isSyncComplete ? '0s' : `${etaSeconds}s`}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
